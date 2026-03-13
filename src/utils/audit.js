import { prisma } from "../config/prisma.js";

export async function createAuditLog({ userId, entity, entityId, action, oldValues, newValues }) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        entity,
        entityId,
        action,
        oldValues: oldValues ? JSON.stringify(oldValues) : null,
        newValues: newValues ? JSON.stringify(newValues) : null,
      },
    });
  } catch (err) {
    // Do not block main flow on audit errors
    console.error("Failed to create audit log:", err);
  }
}

