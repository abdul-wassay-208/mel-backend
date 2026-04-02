import express from "express";
import { login, logout, getInviteDetails, acceptInvite, forgotPassword, resetPassword } from "../controllers/authController.js";

export const router = express.Router();

router.post("/login", login);
router.post("/logout", logout);
router.get("/invite/:token", getInviteDetails);
router.post("/invite/:token", acceptInvite);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

