import express from "express";
import { authenticate } from "../middleware/auth.js";
import { getReportAnalytics } from "../controllers/analyticsController.js";

export const router = express.Router();

router.use(authenticate);

router.get("/reports", getReportAnalytics);

