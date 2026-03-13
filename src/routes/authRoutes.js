import express from "express";
import { login, logout, getInviteDetails, acceptInvite } from "../controllers/authController.js";

export const router = express.Router();

router.post("/login", login);
router.post("/logout", logout);
router.get("/invite/:token", getInviteDetails);
router.post("/invite/:token", acceptInvite);

