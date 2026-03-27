import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: [
        "http://localhost:8080",
        "https://mel-client-gdjq.vercel.app",
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // JWT authentication middleware for socket connections
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");

    if (!token) {
      return next(new Error("Authentication error: token missing"));
    }

    try {
      const payload = jwt.verify(token, env.jwtSecret);
      socket.user = {
        id: payload.id,
        role: payload.role,
        email: payload.email,
        name: payload.name,
      };
      next();
    } catch {
      next(new Error("Authentication error: invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user.id;
    // Each user joins their own private room
    socket.join(`user:${userId}`);
    console.log(`[WS] User ${userId} connected (socket: ${socket.id})`);

    socket.on("disconnect", () => {
      console.log(`[WS] User ${userId} disconnected (socket: ${socket.id})`);
    });
  });

  return io;
}

export function getIO() {
  return io;
}

/**
 * Emit a real-time event to a specific user's room.
 * Silently no-ops if WebSocket server is not yet initialised.
 */
export function emitToUser(userId, event, data) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}
