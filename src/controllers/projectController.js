import { prisma } from "../config/prisma.js";
import { projectCreateSchema, projectUpdateSchema, assignLeadSchema } from "../validators/projectValidators.js";
import { createAuditLog } from "../utils/audit.js";
import { createNotificationForMany } from "../services/notificationService.js";
import { env } from "../config/env.js";

function toPrismaReportingInterval(value) {
  if (!value) return undefined;
  const v = String(value).toUpperCase();
  if (v === "MONTHLY") return "MONTHLY";
  if (v === "QUARTERLY") return "QUARTERLY";
  if (v === "YEARLY") return "YEARLY";
  return undefined;
}

function parseDateOrNull(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function listProjects(req, res, next) {
  try {
    const where = {};
    if (req.user.role === "PROJECT_LEAD") {
      where.OR = [
        { leadId: req.user.id }, // legacy single-lead field
        { leads: { some: { userId: req.user.id } } }, // new multi-lead assignments
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        lead: true,
        leads: { include: { user: true } },
        reports: {
          include: {
            disaggregatedData: true,
          },
          orderBy: { id: "desc" },
        },
        objectives: {
          include: {
            outcomes: {
              include: {
                indicators: true,
              },
            },
          },
        },
      },
    });

    res.json(projects);
  } catch (err) {
    next(err);
  }
}

export async function getProject(req, res, next) {
  try {
    const id = Number(req.params.id);
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        lead: true,
        leads: { include: { user: true } },
        reports: {
          include: {
            disaggregatedData: true,
          },
          orderBy: { id: "desc" },
        },
        objectives: {
          include: {
            outcomes: {
              include: {
                indicators: true,
              },
            },
          },
        },
      },
    });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (
      req.user.role === "PROJECT_LEAD" &&
      project.leadId !== req.user.id &&
      !(project.leads || []).some((a) => a.userId === req.user.id)
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json(project);
  } catch (err) {
    next(err);
  }
}

export async function createProject(req, res, next) {
  try {
    const parseResult = projectCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid payload", errors: parseResult.error.flatten() });
    }

    const data = parseResult.data;

    const reportingInterval = toPrismaReportingInterval(data.reportingInterval);
    if (!reportingInterval) {
      return res.status(400).json({ message: "Invalid reportingInterval" });
    }

    const startDate = parseDateOrNull(data.startDate);
    if (!startDate) {
      return res.status(400).json({ message: "Invalid startDate" });
    }
    const endDate = parseDateOrNull(data.endDate);

    const leadIdsFromPayload = Array.isArray(data.leadIds) && data.leadIds.length > 0
      ? data.leadIds.map((x) => Number(x)).filter((x) => Number.isFinite(x))
      : (data.leadId != null ? [Number(data.leadId)] : []);

    const uniqueLeadIds = Array.from(new Set(leadIdsFromPayload));
    if (uniqueLeadIds.length === 0) {
      return res.status(400).json({ message: "At least one Project Lead is required" });
    }

    const leads = await prisma.user.findMany({
      where: { id: { in: uniqueLeadIds } },
      select: { id: true, role: true },
    });
    const invalid = leads.find((u) => u.role !== "PROJECT_LEAD");
    if (leads.length !== uniqueLeadIds.length || invalid) {
      return res.status(400).json({ message: "All leads must be valid Project Lead users" });
    }

    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category ?? data.generalCategory ?? null,
        programLead: data.programLead ?? null,
        projectSupport: data.projectSupport ?? null,
        generalCategory: data.generalCategory ?? null,
        specificCategory: data.specificCategory ?? null,
        expectedUsers: typeof data.expectedUsers === "number" ? data.expectedUsers : null,
        startDate,
        endDate,
        reportingInterval,
        // keep legacy leadId for backward compatibility (use first lead)
        leadId: uniqueLeadIds[0] ?? null,
        leads: {
          create: uniqueLeadIds.map((userId) => ({ userId })),
        },
        objectives: {
          create: (data.objectives ?? []).map((obj) => ({
            title: obj.name,
            description: obj.description ?? null,
            outcomes: {
              create: (obj.outcomes ?? []).map((out) => ({
                title: out.name,
                description: out.description ?? null,
                indicators: {
                  create: (out.indicators ?? []).map((ind) => ({
                    name: ind.name,
                    description: ind.description ?? null,
                  })),
                },
              })),
            },
          })),
        },
      },
      include: {
        lead: true,
        leads: { include: { user: true } },
        reports: true,
        objectives: {
          include: {
            outcomes: {
              include: {
                indicators: true,
              },
            },
          },
        },
      },
    });

    await createAuditLog({
      userId: req.user.id,
      entity: "Project",
      entityId: project.id,
      action: "CREATE",
      oldValues: null,
      newValues: project,
    });

    const frontendBase = (env.frontendUrl || "http://localhost:8080").replace(/\/+$/, "");
    const leadLink = `${frontendBase}/lead?projectId=${project.id}`;

    await createNotificationForMany(uniqueLeadIds, {
      type: "PROJECT_ASSIGNED",
      title: "You have been assigned to a project",
      message: `You have been assigned as Project Lead for "${project.name}".`,
      data: { projectId: project.id, projectName: project.name },
      emailSubject: `Project Assigned: ${project.name}`,
      emailHtml: `<p>Hello,</p>
<p>You have been assigned as <strong>Project Lead</strong> for the project <strong>${project.name}</strong>.</p>
<p><a href="${leadLink}">Open project in MEL</a></p>`,
    });

    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
}

export async function updateProject(req, res, next) {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Project not found" });
    }

    const parseResult = projectUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid payload", errors: parseResult.error.flatten() });
    }

    const data = parseResult.data;
    const nextReportingInterval =
      data.reportingInterval != null ? toPrismaReportingInterval(data.reportingInterval) : undefined;
    if (data.reportingInterval != null && !nextReportingInterval) {
      return res.status(400).json({ message: "Invalid reportingInterval" });
    }

    const nextStartDate = data.startDate ? parseDateOrNull(data.startDate) : undefined;
    if (data.startDate && !nextStartDate) {
      return res.status(400).json({ message: "Invalid startDate" });
    }
    const nextEndDate = data.endDate ? parseDateOrNull(data.endDate) : undefined;
    if (data.endDate && !nextEndDate) {
      return res.status(400).json({ message: "Invalid endDate" });
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        name: data.name ?? existing.name,
        description: data.description ?? existing.description,
        category: data.category ?? existing.category,
        programLead: data.programLead ?? existing.programLead,
        projectSupport: data.projectSupport ?? existing.projectSupport,
        generalCategory: data.generalCategory ?? existing.generalCategory,
        specificCategory: data.specificCategory ?? existing.specificCategory,
        expectedUsers: data.expectedUsers ?? existing.expectedUsers,
        startDate: nextStartDate ?? existing.startDate,
        endDate: nextEndDate ?? existing.endDate,
        reportingInterval: nextReportingInterval ?? existing.reportingInterval,
      },
    });

    await createAuditLog({
      userId: req.user.id,
      entity: "Project",
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

export async function assignProjectLead(req, res, next) {
  try {
    const id = Number(req.params.id);
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const parseResult = assignLeadSchema.safeParse({
      leadIds: Array.isArray(req.body.leadIds) ? req.body.leadIds.map((x) => Number(x)) : [],
    });
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid payload", errors: parseResult.error.flatten() });
    }

    const leadIds = Array.from(new Set(parseResult.data.leadIds.map((x) => Number(x)).filter(Number.isFinite)));
    if (leadIds.length === 0) {
      return res.status(400).json({ message: "At least one Project Lead is required" });
    }

    const leads = await prisma.user.findMany({
      where: { id: { in: leadIds } },
      select: { id: true, role: true },
    });
    const invalid = leads.find((u) => u.role !== "PROJECT_LEAD");
    if (leads.length !== leadIds.length || invalid) {
      return res.status(400).json({ message: "All leads must be valid Project Lead users" });
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        leadId: leadIds[0] ?? null,
        leads: {
          deleteMany: {},
          create: leadIds.map((userId) => ({ userId })),
        },
      },
      include: { lead: true, leads: { include: { user: true } } },
    });

    await createAuditLog({
      userId: req.user.id,
      entity: "Project",
      entityId: id,
      action: "STATUS_CHANGE",
      oldValues: project,
      newValues: updated,
    });

    // Notify every assigned lead
    const frontendBase = (env.frontendUrl || "http://localhost:8080").replace(/\/+$/, "");
    const leadLink = `${frontendBase}/lead?projectId=${updated.id}`;

    await createNotificationForMany(leadIds, {
      type: "PROJECT_ASSIGNED",
      title: "You have been assigned to a project",
      message: `You have been assigned as Project Lead for "${updated.name}".`,
      data: { projectId: updated.id, projectName: updated.name },
      emailSubject: `Project Assigned: ${updated.name}`,
      emailHtml: `<p>Hello,</p>
<p>You have been assigned as <strong>Project Lead</strong> for the project <strong>${updated.name}</strong>.</p>
<p><a href="${leadLink}">Open project in MEL</a></p>`,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function deleteProject(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid project id" });

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        reports: { select: { id: true, status: true } },
        objectives: {
          include: {
            outcomes: {
              include: {
                indicators: { select: { id: true } },
              },
            },
          },
        },
      },
    });

    if (!project) return res.status(404).json({ message: "Project not found" });

    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const objectiveIds = project.objectives.map(o => o.id);
    const outcomeIds = project.objectives.flatMap(o => o.outcomes.map(out => out.id));
    const reportIds = project.reports.map(r => r.id);
    const indicatorIds = project.objectives.flatMap(o =>
      o.outcomes.flatMap(out => out.indicators.map(i => i.id))
    );

    await prisma.disaggregatedData.deleteMany({
      where: { projectId: id },
    });

    if (reportIds.length > 0) {
      await prisma.disaggregatedData.deleteMany({
        where: { reportId: { in: reportIds } },
      });
    }

    if (indicatorIds.length > 0) {
      await prisma.disaggregatedData.deleteMany({
        where: { indicatorId: { in: indicatorIds } },
      });
    }

    if (outcomeIds.length > 0) {
      await prisma.indicator.deleteMany({
        where: { outcomeId: { in: outcomeIds } },
      });
    }

    if (objectiveIds.length > 0) {
      await prisma.outcome.deleteMany({
        where: { objectiveId: { in: objectiveIds } },
      });
      await prisma.objective.deleteMany({
        where: { projectId: id },
      });
    }

    if (reportIds.length > 0) {
      await prisma.report.deleteMany({
        where: { id: { in: reportIds } },
      });
    } else {
      await prisma.report.deleteMany({
        where: { projectId: id },
      });
    }

    await prisma.project.delete({
      where: { id },
    });

    await createAuditLog({
      userId: req.user.id,
      entity: "Project",
      entityId: id,
      action: "DELETE",
      oldValues: project,
      newValues: null,
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

