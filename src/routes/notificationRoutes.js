import express from "express";
import { authenticate } from "../middleware/auth.js";
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "../controllers/notificationController.js";

export const router = express.Router();

router.use(authenticate);

router.get("/", listNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);
