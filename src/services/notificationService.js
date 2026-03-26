import { prisma } from "../config/prisma.js";
import { emitToUser } from "./socketService.js";
import { sendEmail } from "./emailService.js";

export async function createNotification({
  userId,
  type,
  title,
  message,
  data = null,
  emailSubject = null,
  emailHtml = null,
}) {
  // 1. Persist to DB
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      data: data ?? undefined,
    },
  });

  // 2. Push real-time event to the user's socket room
  emitToUser(userId, "notification:new", {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    data: notification.data,
    isRead: notification.isRead,
    createdAt: notification.createdAt,
  });

  // 3. Send email (best-effort – failure does NOT throw)
  if (emailSubject && emailHtml) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      if (user?.email) {
        await sendEmail({ to: user.email, subject: emailSubject, htmlContent: emailHtml });
      }
    } catch (emailErr) {
      console.error(`[Notification] Email failed for user ${userId}:`, emailErr.message);
    }
  }

  return notification;
}

/**
 * Convenience: create one notification per user in an array.
 */
export async function createNotificationForMany(userIds, opts) {
  return Promise.all(userIds.map((userId) => createNotification({ ...opts, userId })));
}

