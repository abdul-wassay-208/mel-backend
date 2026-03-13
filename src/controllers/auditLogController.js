import { prisma } from "../config/prisma.js";

export async function listAuditLogs(req, res, next) {
  try {
    const { entity, userId, action, limit = 50 } = req.query;

    const where = {};
    if (entity) where.entity = entity;
    if (userId) where.userId = Number(userId);
    if (action) where.action = action;

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: Number(limit),
      include: { user: true },
    });

    res.json(logs);
  } catch (err) {
    next(err);
  }
}

