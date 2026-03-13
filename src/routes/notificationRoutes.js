import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { sendTestNotification } from "../controllers/notificationController.js";

export const router = express.Router();

router.use(authenticate);
router.use(authorize(["ADMIN"]));

router.post("/send", sendTestNotification);

