import express from "express";
import { router as authRouter } from "./authRoutes.js";
import { router as projectRouter } from "./projectRoutes.js";
import { router as reportRouter } from "./reportRoutes.js";
import { router as disaggRouter } from "./disaggregatedDataRoutes.js";
import { router as auditLogRouter } from "./auditLogRoutes.js";
import { router as analyticsRouter } from "./analyticsRoutes.js";
import { router as notificationRouter } from "./notificationRoutes.js";
import { router as userRouter } from "./userRoutes.js";
import { router as configRouter } from "./configRoutes.js";
import { router as editRequestRouter } from "./editRequestRoutes.js";

export const router = express.Router();

router.use("/auth", authRouter);
router.use("/projects", projectRouter);
router.use("/reports", reportRouter);
router.use("/disaggregated-data", disaggRouter);
router.use("/audit-logs", auditLogRouter);
router.use("/analytics", analyticsRouter);
router.use("/notifications", notificationRouter);
router.use("/users", userRouter);
router.use("/config", configRouter);
router.use("/edit-requests", editRequestRouter);

