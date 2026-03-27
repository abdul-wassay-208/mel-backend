import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { getConfig, upsertConfig } from "../controllers/configController.js";

export const router = express.Router();

router.use(authenticate);

// Readable by any authenticated user (admins/leads/super admins)
router.get("/:key", getConfig);
// Writable only by SUPER_ADMIN
router.put("/:key", authorize(["SUPER_ADMIN"]), upsertConfig);

