import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { loginSchema } from "../validators/authValidators.js";

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

