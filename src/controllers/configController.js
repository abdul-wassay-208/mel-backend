import { prisma } from "../config/prisma.js";
import { createAuditLog } from "../utils/audit.js";

const ALLOWED_KEYS = new Set([
  "projectCategories",
  "indicatorOverrides",
  // Visual MEL Config Builder
  "melConfigDraft",
  "melConfigLive",
]);

export async function getConfig(req, res, next) {
  try {
    const key = String(req.params.key || "");
    if (!ALLOWED_KEYS.has(key)) {
      return res.status(404).json({ message: "Config key not found" });
    }

    const existing = await prisma.appConfig.findUnique({ where: { key } });
    if (!existing) {
      return res.json({ key, value: null });
    }

    return res.json({ key: existing.key, value: existing.value, updatedAt: existing.updatedAt });
  } catch (err) {
    next(err);
  }
}

export async function upsertConfig(req, res, next) {
  try {
    const key = String(req.params.key || "");
    if (!ALLOWED_KEYS.has(key)) {
      return res.status(404).json({ message: "Config key not found" });
    }

    if (!req.body || typeof req.body !== "object" || !("value" in req.body)) {
      return res.status(400).json({ message: "Payload must be { value: ... }" });
    }

    const value = req.body.value;
    const before = await prisma.appConfig.findUnique({ where: { key } });

    const saved = await prisma.appConfig.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });

    await createAuditLog({
      userId: req.user.id,
      entity: "AppConfig",
      entityId: saved.id,
      action: before ? "UPDATE" : "CREATE",
      oldValues: before ? before.value : null,
      newValues: saved.value,
    });

    return res.json({ key: saved.key, value: saved.value, updatedAt: saved.updatedAt });
  } catch (err) {
    next(err);
  }
}

