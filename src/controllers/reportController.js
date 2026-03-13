import { isAfter } from "date-fns";
import { prisma } from "../config/prisma.js";
import { reportCreateSchema, reportUpdateSchema, reportStatusChangeSchema } from "../validators/reportValidators.js";
import { createAuditLog } from "../utils/audit.js";
import { sendEmail } from "../services/emailService.js";

async function ensureIndicatorsComplete(reportId) {
  const disaggCount = await prisma.disaggregatedData.count({
    where: { reportId },
  });
  // Simple rule: at least one disaggregated data record per report
  return disaggCount > 0;
}

export async function listReports(req, res, next) {
  try {
    const where = {};
    if (req.user.role === "PROJECT_LEAD") {
      where.leadId = req.user.id;
    }

    const reports = await prisma.report.findMany({
      where,
      include: { project: true, lead: true },
    });
    res.json(reports);
  } catch (err) {
    next(err);
  }
}

export async function getReport(req, res, next) {
  try {
    const id = Number(req.params.id);
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        project: true,
        lead: true,
        disaggregatedData: true,
      },
    });
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    if (req.user.role === "PROJECT_LEAD" && report.leadId !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json(report);
  } catch (err) {
    next(err);
  }
}

export async function createReport(req, res, next) {
  try {
    const parsed = reportCreateSchema.safeParse({
      ...req.body,
      projectId: Number(req.body.projectId),
    });
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
    }
    const data = parsed.data;

    const project = await prisma.project.findUnique({ where: { id: data.projectId } });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    if (req.user.role === "PROJECT_LEAD" && project.leadId !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Deadline enforcement
    if (project.nextDueDate && isAfter(new Date(), project.nextDueDate)) {
      return res.status(400).json({ message: "Reporting deadline has passed for this period" });
    }

    const report = await prisma.report.create({
      data: {
        title: data.title,
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
        status: "DRAFT",
        projectId: data.projectId,
        leadId: req.user.id,
      },
    });

    await createAuditLog({
      userId: req.user.id,
      entity: "Report",
      entityId: report.id,
      action: "CREATE",
      oldValues: null,
      newValues: report,
    });

    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
}

export async function updateReport(req, res, next) {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.report.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Report not found" });
    }
    if (req.user.role === "PROJECT_LEAD" && existing.leadId !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (["PUBLISHED", "COMPLETED"].includes(existing.status)) {
      return res.status(400).json({ message: "Cannot edit a published or completed report" });
    }

    const parsed = reportUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
    }

    const data = parsed.data;
    const updated = await prisma.report.update({
      where: { id },
      data: {
        title: data.title ?? existing.title,
        learningSummary: data.learningSummary ?? existing.learningSummary,
      },
    });

    await createAuditLog({
      userId: req.user.id,
      entity: "Report",
      entityId: id,
      action: "UPDATE",
      oldValues: existing,
      newValues: updated,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function changeReportStatus(req, res, next) {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.report.findUnique({
      where: { id },
      include: { project: true, lead: true },
    });
    if (!existing) {
      return res.status(404).json({ message: "Report not found" });
    }

    const parsed = reportStatusChangeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
    }

    const { action } = parsed.data;
    let newStatus = existing.status;
    const now = new Date();

    if (action === "SUBMIT") {
      if (req.user.role !== "PROJECT_LEAD" || existing.leadId !== req.user.id) {
        return res.status(403).json({ message: "Only the assigned Project Lead can submit this report" });
      }
      if (existing.project.nextDueDate && isAfter(now, existing.project.nextDueDate)) {
        return res.status(400).json({ message: "Cannot submit after due date" });
      }
      newStatus = "SUBMITTED";
    } else if (action === "REQUEST_EDIT") {
      if (req.user.role !== "ADMIN") {
        return res.status(403).json({ message: "Only Admin can request edits" });
      }
      newStatus = "EDIT_REQUESTED";
    } else if (action === "APPROVE_EDIT") {
      if (req.user.role !== "ADMIN") {
        return res.status(403).json({ message: "Only Admin can approve edits" });
      }
      newStatus = "UNDER_REVIEW";
    } else if (action === "PUBLISH") {
      if (req.user.role !== "ADMIN") {
        return res.status(403).json({ message: "Only Admin can publish" });
      }
      const indicatorsComplete = await ensureIndicatorsComplete(id);
      if (!indicatorsComplete) {
        return res.status(400).json({ message: "Cannot publish: indicators/disaggregated data incomplete" });
      }
      newStatus = "PUBLISHED";
    } else if (action === "COMPLETE") {
      if (req.user.role !== "ADMIN") {
        return res.status(403).json({ message: "Only Admin can mark report as completed" });
      }
      if (existing.status !== "PUBLISHED") {
        return res.status(400).json({ message: "Report must be published before completion" });
      }
      newStatus = "COMPLETED";
    }

    const updated = await prisma.report.update({
      where: { id },
      data: {
        status: newStatus,
        submittedAt: newStatus === "SUBMITTED" ? now : existing.submittedAt,
        publishedAt: newStatus === "PUBLISHED" ? now : existing.publishedAt,
        completedAt: newStatus === "COMPLETED" ? now : existing.completedAt,
      },
    });

    await createAuditLog({
      userId: req.user.id,
      entity: "Report",
      entityId: id,
      action: "STATUS_CHANGE",
      oldValues: existing,
      newValues: updated,
    });

    // Basic email notifications
    if (action === "SUBMIT") {
      // notify admin(s) - here we just fetch all admins
      const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true } });
      await Promise.all(
        admins.map((admin) =>
          sendEmail({
            to: admin.email,
            subject: `Report submitted: ${updated.title}`,
            htmlContent: `<p>Report "<strong>${updated.title}</strong>" has been submitted by ${existing.lead.name}.</p>`,
          })
        )
      );
    } else if (action === "PUBLISH") {
      await sendEmail({
        to: existing.lead.email,
        subject: `Report published: ${updated.title}`,
        htmlContent: `<p>Your report "<strong>${updated.title}</strong>" has been published.</p>`,
      });
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

