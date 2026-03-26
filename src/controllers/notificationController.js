import { prisma } from "../config/prisma.js";
import { emitToUser } from "../services/socketService.js";

/**
 * GET /api/notifications
 * Returns all notifications for the authenticated user, newest first.
 * Supports ?unreadOnly=true to filter unread only.
 */
export async function listNotifications(req, res, next) {
  try {
    const unreadOnly = req.query.unreadOnly === "true";

    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user.id,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(notifications);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/notifications/unread-count
 * Returns the count of unread notifications for the authenticated user.
 */
export async function getUnreadCount(req, res, next) {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });
    res.json({ count });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read.
 */
export async function markAsRead(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid notification id" });
    }

    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Notification not found" });
    }
    if (existing.userId !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });

    // Emit updated unread count back to the user in real-time
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });
    emitToUser(req.user.id, "notification:unread-count", { count: unreadCount });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/notifications/read-all
 * Mark all unread notifications as read for the authenticated user.
 */
export async function markAllAsRead(req, res, next) {
  try {
    const now = new Date();
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true, readAt: now },
    });

    emitToUser(req.user.id, "notification:unread-count", { count: 0 });

    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    next(err);
  }
}
