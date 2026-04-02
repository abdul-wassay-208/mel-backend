import express from "express";
import { authenticate } from "../middleware/auth.js";
import { listEditRequests, createEditRequest, updateEditRequestStatus } from "../controllers/editRequestController.js";

export const router = express.Router();

router.use(authenticate);

router.get("/", listEditRequests);
router.post("/", createEditRequest);
router.patch("/:id/status", updateEditRequestStatus);

