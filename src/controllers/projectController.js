import { prisma } from "../config/prisma.js";
import { projectCreateSchema, projectUpdateSchema, assignLeadSchema } from "../validators/projectValidators.js";
import { createAuditLog } from "../utils/audit.js";

export async function listProjects(req, res, next) {
  try {
    const where = {};
    if (req.user.role === "PROJECT_LEAD") {
      where.leadId = req.user.id;
    }

    const projects = await prisma.project.findMany({
      where,
      include: { lead: true },
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

    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        reportingInterval: data.reportingInterval,
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
    const updated = await prisma.project.update({
      where: { id },
      data: {
        name: data.name ?? existing.name,
        description: data.description ?? existing.description,
        category: data.category ?? existing.category,
        startDate: data.startDate ? new Date(data.startDate) : existing.startDate,
        endDate: data.endDate ? new Date(data.endDate) : existing.endDate,
        reportingInterval: data.reportingInterval ?? existing.reportingInterval,
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

