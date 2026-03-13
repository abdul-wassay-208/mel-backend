import express from "express";
import { authenticate } from "../middleware/auth.js";
import { submitDisaggregatedData } from "../controllers/disaggregatedDataController.js";

export const router = express.Router();

router.use(authenticate);

router.post("/", submitDisaggregatedData);

