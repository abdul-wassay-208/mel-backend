import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { listUsers, createUser, updateUser } from "../controllers/userController.js";

export const router = express.Router();

router.use(authenticate);
router.use(authorize(["ADMIN"]));

router.get("/", listUsers);
router.post("/", createUser);
router.patch("/:id", updateUser);

