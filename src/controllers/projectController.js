import { prisma } from "../config/prisma.js";
import { projectCreateSchema, projectUpdateSchema, assignLeadSchema } from "../validators/projectValidators.js";
import { createAuditLog } from "../utils/audit.js";

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
      where.leadId = req.user.id;
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        lead: true,
        reports: {
          include: {
            disaggregatedData: true,
          },
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
        reports: {
          include: {
            disaggregatedData: true,
          },
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

    if (req.user.role === "PROJECT_LEAD" && project.leadId !== req.user.id) {
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

    if (data.leadId != null) {
      const lead = await prisma.user.findUnique({ where: { id: Number(data.leadId) } });
      if (!lead || lead.role !== "PROJECT_LEAD") {
        return res.status(400).json({ message: "Lead must be a valid Project Lead user" });
      }
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
        leadId: data.leadId != null ? Number(data.leadId) : null,
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
      leadId: Number(req.body.leadId),
    });
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid payload", errors: parseResult.error.flatten() });
    }

    const { leadId } = parseResult.data;
    const lead = await prisma.user.findUnique({ where: { id: leadId } });
    if (!lead || lead.role !== "PROJECT_LEAD") {
      return res.status(400).json({ message: "Lead must be a valid Project Lead user" });
    }

    const updated = await prisma.project.update({
      where: { id },
      data: { leadId },
    });

    await createAuditLog({
      userId: req.user.id,
      entity: "Project",
      entityId: id,
      action: "STATUS_CHANGE",
      oldValues: project,
      newValues: updated,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

