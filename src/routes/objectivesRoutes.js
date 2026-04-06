import express from "express";
import { authenticate } from "../middleware/auth.js";
import { getObjectives } from "../controllers/objectivesController.js";

export const router = express.Router();

router.use(authenticate);

router.get("/", getObjectives);
