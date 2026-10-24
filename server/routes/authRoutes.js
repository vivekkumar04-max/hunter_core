import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";

const router = Router();
const safeUser = (u) => ({ id: u._id, name: u.name, email: u.email, level: u.level, tokens: u.tokens, lifetimeTokens: u.lifetimeTokens, tokensSpent: u.tokensSpent, tokensInvested: u.tokensInvested, totalFocusMinutes: u.totalFocusMinutes, currentStreak: u.currentStreak, highestLevel: u.highestLevel });

function setToken(res, user) {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.cookie("token", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 7 * 24 * 60 * 60 * 1000 });
}

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password || password.length < 8) return res.status(400).json({ success: false, message: "Name, email and a password of at least 8 characters are required." });
    if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ success: false, message: "An account with this email already exists." });
    const user = await User.create({ name: name.trim(), email: email.toLowerCase().trim(), password: await bcrypt.hash(password, 12) });
    setToken(res, user);
    res.status(201).json({ success: true, user: safeUser(user) });
  } catch (e) { next(e); }
});

router.post("/login", async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email?.toLowerCase().trim() });
    if (!user || !(await bcrypt.compare(req.body.password || "", user.password))) return res.status(401).json({ success: false, message: "Invalid email or password." });
    setToken(res, user);
    res.json({ success: true, user: safeUser(user) });
  } catch (e) { next(e); }
});

router.get("/me", auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: "Account not found." });
    res.json({ success: true, user: safeUser(user) });
  } catch (e) { next(e); }
});

router.post("/logout", (_req, res) => {
  res.clearCookie("token", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  res.json({ success: true });
});

export default router;
