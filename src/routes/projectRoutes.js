import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  assignProjectLead,
} from "../controllers/projectController.js";

export const router = express.Router();

router.use(authenticate);

router.get("/", listProjects);
router.get("/:id", getProject);
router.post("/", authorize(["ADMIN"]), createProject);
router.put("/:id", authorize(["ADMIN"]), updateProject);
router.post("/:id/assign-lead", authorize(["ADMIN"]), assignProjectLead);

