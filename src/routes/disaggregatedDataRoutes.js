import express from "express";
import { authenticate } from "../middleware/auth.js";
import { replaceDisaggregatedData, submitDisaggregatedData } from "../controllers/disaggregatedDataController.js";

export const router = express.Router();

router.use(authenticate);

router.post("/", submitDisaggregatedData);
router.post("/replace", replaceDisaggregatedData);

