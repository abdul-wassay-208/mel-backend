import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { createAuditLog } from "../utils/audit.js";
import { sendEmail } from "../services/emailService.js";
import { env } from "../config/env.js";
import { randomUUID } from "crypto";

export async function listUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

export async function createUser(req, res, next) {
  try {
    const { name, email, role } = req.body;
    if (!name || !email || !role) {
      return res.status(400).json({ message: "name, email and role are required" });
    }
    if (!["ADMIN", "PROJECT_LEAD"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const inviteToken = randomUUID();
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    // Store a random temporary password hash; user sets a real one via invite link
    const tempPassword = randomUUID();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        isActive: false,
        inviteToken,
        inviteExpiresAt,
      },
    });

    await createAuditLog({
      userId: req.user.id,
      entity: "User",
      entityId: user.id,
      action: "CREATE",
      oldValues: null,
      newValues: user,
    });

    const frontendBase = env.frontendUrl || "http://localhost:8080";
    const inviteLink = `${frontendBase.replace(/\/+$/, "")}/invite/${inviteToken}`;

    await sendEmail({
      to: email,
      subject: "You have been invited to the MEL Platform",
      htmlContent: `<p>Hello ${name},</p>
<p>You have been invited to access the <strong>MEL Platform</strong>.</p>
<p>Please click the button below to set your password and activate your account:</p>
<p><a href="${inviteLink}" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;">Set your password</a></p>
<p>If the button does not work, copy and paste this link into your browser:</p>
<p><a href="${inviteLink}">${inviteLink}</a></p>
<p>If you did not expect this invitation, you can ignore this email.</p>`,
    });

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req, res, next) {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "User not found" });
    }

    const { name, role, isActive } = req.body;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        role: role && ["ADMIN", "PROJECT_LEAD"].includes(role) ? role : existing.role,
        isActive: typeof isActive === "boolean" ? isActive : existing.isActive,
      },
    });

    await createAuditLog({
      userId: req.user.id,
      entity: "User",
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

