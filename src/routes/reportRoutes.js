import express from "express";
import { authenticate } from "../middleware/auth.js";
import { listReports, getReport, createReport, updateReport, changeReportStatus } from "../controllers/reportController.js";

export const router = express.Router();

router.use(authenticate);

router.get("/", listReports);
router.get("/:id", getReport);
router.post("/", createReport);
router.put("/:id", updateReport);
router.post("/:id/status", changeReportStatus);

