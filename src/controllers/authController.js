import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { forgotPasswordSchema, loginSchema, resetPasswordSchema } from "../validators/authValidators.js";
import { sendEmail } from "../services/emailService.js";

export async function login(req, res, next) {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid payload", errors: parseResult.error.flatten() });
    }

    const { email, password } = parseResult.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        email: user.email,
        name: user.name,
      },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

// For JWT-based auth, logout is handled client-side by discarding the token.
export async function logout(req, res) {
  return res.json({ message: "Logged out (client should discard JWT)" });
}

export async function getInviteDetails(req, res, next) {
  try {
    const { token } = req.params;
    const now = new Date();

    const user = await prisma.user.findFirst({
      where: {
        inviteToken: token,
        inviteExpiresAt: { gt: now },
        isActive: false,
      },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired invite link" });
    }

    return res.json({
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    next(err);
  }
}

export async function acceptInvite(req, res, next) {
  try {
    const { token } = req.params;
    const { password } = req.body;
    if (!password || typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    const now = new Date();
    const user = await prisma.user.findFirst({
      where: {
        inviteToken: token,
        inviteExpiresAt: { gt: now },
        isActive: false,
      },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired invite link" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        isActive: true,
        inviteToken: null,
        inviteExpiresAt: null,
      },
    });

    const tokenJwt = jwt.sign(
      {
        id: updated.id,
        role: updated.role,
        email: updated.email,
        name: updated.name,
      },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    return res.json({
      token: tokenJwt,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

function buildResetLink(resetToken) {
  const frontendBase = env.frontendUrl || "http://localhost:8080";
  const base = frontendBase.replace(/\/+$/, "");
  return `${base}/reset-password?token=${encodeURIComponent(resetToken)}`;
}

function resetEmailHtml({ name, resetLink }) {
  return `<p>Hello ${name || "there"},</p>
<p>We received a request to reset your password for the <strong>MEL Platform</strong>.</p>
<p>Click the button below to set a new password:</p>
<p><a href="${resetLink}" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;">Reset password</a></p>
<p>If the button does not work, copy and paste this link into your browser:</p>
<p><a href="${resetLink}">${resetLink}</a></p>
<p>If you did not request a password reset, you can ignore this email.</p>`;
}

export async function forgotPassword(req, res, next) {
  try {
    const parseResult = forgotPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid payload", errors: parseResult.error.flatten() });
    }

    const email = parseResult.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    // Avoid account enumeration: always return 200.
    if (!user || !user.isActive) {
      return res.json({ ok: true });
    }

    const resetToken = jwt.sign(
      { sub: user.id, purpose: "password_reset" },
      env.jwtSecret,
      { expiresIn: "15m" }
    );

    const resetLink = buildResetLink(resetToken);
    const emailResult = await sendEmail({
      to: user.email,
      subject: "Reset your MEL Platform password",
      htmlContent: resetEmailHtml({ name: user.name, resetLink }),
    });

    return res.json({ ok: true, email: emailResult });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const parseResult = resetPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid payload", errors: parseResult.error.flatten() });
    }

    const { token, password } = parseResult.data;

    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret);
    } catch {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    if (!payload || payload.purpose !== "password_reset" || !payload.sub) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    const userId = Number(payload.sub);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

