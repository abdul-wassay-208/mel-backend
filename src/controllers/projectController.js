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
        projectObjectives: {
          include: {
            objective: {
              include: {
                outcomes: {
                  include: {
                    indicators: true,
                  },
                },
              },
            },
          },
          orderBy: { objectiveId: "asc" },
        },
      },
    });

    // Normalize: expose objectives as a flat array for API consumers
    const normalized = projects.map((p) => ({
      ...p,
      objectives: p.projectObjectives.map((po) => po.objective),
      projectObjectives: undefined,
    }));

    res.json(normalized);
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
        projectObjectives: {
          include: {
            objective: {
              include: {
                outcomes: {
                  include: {
                    indicators: true,
                  },
                },
              },
            },
          },
          orderBy: { objectiveId: "asc" },
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

    // Normalize: expose objectives as a flat array for API consumers
    const normalized = {
      ...project,
      objectives: project.projectObjectives.map((po) => po.objective),
      projectObjectives: undefined,
    };

    res.json(normalized);
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

    const objectiveIds = Array.isArray(data.objectiveIds)
      ? data.objectiveIds.map((x) => Number(x)).filter(Number.isFinite)
      : [];

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
        projectObjectives: {
          create: objectiveIds.map((objectiveId) => ({ objectiveId })),
        },
      },
      include: {
        lead: true,
        leads: { include: { user: true } },
        reports: true,
        projectObjectives: {
          include: {
            objective: {
              include: {
                outcomes: {
                  include: { indicators: true },
                },
              },
            },
          },
          orderBy: { objectiveId: "asc" },
        },
      },
    });

    // Normalize response
    const createdProject = {
      ...project,
      objectives: project.projectObjectives.map((po) => po.objective),
      projectObjectives: undefined,
    };

    await createAuditLog({
      userId: req.user.id,
      entity: "Project",
      entityId: createdProject.id,
      action: "CREATE",
      oldValues: null,
      newValues: createdProject,
    });

    const frontendBase = (env.frontendUrl || "http://localhost:8080").replace(/\/+$/, "");
    const leadLink = `${frontendBase}/lead?projectId=${createdProject.id}`;

    await createNotificationForMany(uniqueLeadIds, {
      type: "PROJECT_ASSIGNED",
      title: "You have been assigned to a project",
      message: `You have been assigned as Project Lead for "${createdProject.name}".`,
      data: { projectId: createdProject.id, projectName: createdProject.name },
      emailSubject: `Project Assigned: ${createdProject.name}`,
      emailHtml: `<p>Hello,</p>
<p>You have been assigned as <strong>Project Lead</strong> for the project <strong>${createdProject.name}</strong>.</p>
<p><a href="${leadLink}">Open project in MEL</a></p>`,
    });

    res.status(201).json(createdProject);
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
        reports: { select: { id: true } },
      },
    });

    if (!project) return res.status(404).json({ message: "Project not found" });

    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const reportIds = project.reports.map((r) => r.id);

    // Delete disaggregated data for this project and its reports
    await prisma.disaggregatedData.deleteMany({ where: { projectId: id } });
    if (reportIds.length > 0) {
      await prisma.disaggregatedData.deleteMany({ where: { reportId: { in: reportIds } } });
    }

    // Delete reports
    await prisma.report.deleteMany({ where: { projectId: id } });

    // Delete project — cascades: ProjectLeadAssignment, ProjectObjective
    await prisma.project.delete({ where: { id } });

    await createAuditLog({
      userId: req.user.id,
      entity: "Project",
      entityId: id,
      action: "DELETE",
      oldValues: { id, name: project.name },
      newValues: null,
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

