import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { listAuditLogs } from "../controllers/auditLogController.js";

export const router = express.Router();

router.use(authenticate);
router.use(authorize(["ADMIN"]));

router.get("/", listAuditLogs);

