import { prisma } from "../config/prisma.js";
import { createAuditLog } from "../utils/audit.js";
import { editRequestCreateSchema, editRequestStatusSchema } from "../validators/editRequestValidators.js";
import { createNotificationForMany } from "../services/notificationService.js";
import { env } from "../config/env.js";

export async function listEditRequests(req, res, next) {
  try {
    const where = {};

    // Project leads only see their own requests
    if (req.user.role === "PROJECT_LEAD") {
      where.requestedById = req.user.id;
    }

    const requests = await prisma.editRequest.findMany({
      where,
      orderBy: { requestedAt: "desc" },
    });

    res.json(requests);
  } catch (err) {
    next(err);
  }
}

export async function createEditRequest(req, res, next) {
  try {
    const parsed = editRequestCreateSchema.safeParse({
      ...req.body,
      projectId: Number(req.body.projectId),
      reportId: Number(req.body.reportId),
      indicatorId: Number(req.body.indicatorId),
    });

    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid payload", errors: parsed.error.flatten() });
    }

    const data = parsed.data;

    // Basic guards: project & report should exist
    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
    });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const report = await prisma.report.findUnique({
      where: { id: data.reportId },
    });
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // Only the assigned project lead (or an admin) can request edits
    if (
      req.user.role === "PROJECT_LEAD" &&
      project.leadId != null &&
      project.leadId !== req.user.id
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const created = await prisma.editRequest.create({
      data: {
        projectId: data.projectId,
        reportId: data.reportId,
        indicatorId: data.indicatorId,
        projectName: data.projectName,
        indicatorName: data.indicatorName,
        fieldsToEdit: JSON.stringify(data.fieldsToEdit),
        reason: data.reason,
        status: "PENDING",
        requestedById: req.user.id,
        requestedByName: req.user.name,
      },
    });

    await createAuditLog({
      userId: req.user.id,
      entity: "EditRequest",
      entityId: created.id,
      action: "CREATE",
      oldValues: null,
      newValues: created,
    });

    const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
    const adminIds = admins.map((a) => a.id);
    await createNotificationForMany(adminIds, {
      type: "EDIT_REQUESTED",
      title: "Edit Request Submitted",
      message: `${req.user.name} requested an edit for report "${report.title}" on project "${project.name}".`,
      data: {
        editRequestId: created.id,
        reportId: report.id,
        projectId: project.id,
        indicatorId: created.indicatorId,
      },
      emailSubject: `Edit Request: ${report.title}`,
      emailHtml: `<p>Hello,</p>
<p><strong>${req.user.name}</strong> has requested an edit for the report <strong>"${report.title}"</strong> on project <strong>"${project.name}"</strong>.</p>
<p>Reason: ${created.reason}</p>
<p>Please log in to the MEL Platform to review and approve or reject the request.</p>`,
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

export async function updateEditRequestStatus(req, res, next) {
  try {
    const id = Number(req.params.id);

    const existing = await prisma.editRequest.findUnique({
      where: { id },
    });
    if (!existing) {
      return res.status(404).json({ message: "Edit request not found" });
    }

    // Only admins can approve/reject requests
    if (req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ message: "Only Admin can approve or reject edit requests" });
    }

    const parsed = editRequestStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid payload", errors: parsed.error.flatten() });
    }

    const { status } = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.editRequest.update({
        where: { id },
        data: {
          status,
          resolvedAt: new Date(),
          resolvedById: req.user.id,
        },
      });

      // If approved, unlock report for editing by setting it to UNDER_REVIEW.
      // This avoids schema migrations (no UNLOCKED enum) while allowing leads to edit.
      if (status === "APPROVED") {
        await tx.report.update({
          where: { id: existing.reportId },
          data: { status: "UNDER_REVIEW" },
        });
      }

      // If rejected, keep report in PUBLISHED state (do not change).
      return next;
    });

    await createAuditLog({
      userId: req.user.id,
      entity: "EditRequest",
      entityId: id,
      action: "STATUS_CHANGE",
      oldValues: existing,
      newValues: updated,
    });

    // Notify the requesting lead (in-app + email if configured)
    const frontendBase = (env.frontendUrl || "http://localhost:8080").replace(/\/+$/, "");
    const leadLink =
      status === "APPROVED"
        ? `${frontendBase}/lead/report/${existing.projectId}/${existing.reportId}`
        : `${frontendBase}/lead`;

    await createNotificationForMany([existing.requestedById], {
      type: "EDIT_REQUESTED",
      title: status === "APPROVED" ? "Edit Request Approved" : "Edit Request Rejected",
      message:
        status === "APPROVED"
          ? `Your edit request for "${existing.indicatorName}" was approved. The report is now unlocked for editing.`
          : `Your edit request for "${existing.indicatorName}" was rejected.`,
      data: {
        editRequestId: existing.id,
        reportId: existing.reportId,
        projectId: existing.projectId,
        indicatorId: existing.indicatorId,
        resolution: status,
      },
      emailSubject: status === "APPROVED" ? "Edit Request Approved" : "Edit Request Rejected",
      emailHtml:
        status === "APPROVED"
          ? `<p>Hello,</p><p>Your edit request for <strong>${existing.indicatorName}</strong> was approved.</p><p><a href="${leadLink}">Open report in MEL</a></p>`
          : `<p>Hello,</p><p>Your edit request for <strong>${existing.indicatorName}</strong> was rejected.</p>`,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

