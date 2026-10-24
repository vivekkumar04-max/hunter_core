import { Router } from "express";
import FocusSession from "../models/FocusSession.js";
import Quest from "../models/Quest.js";
import User from "../models/User.js";
import TokenTransaction from "../models/TokenTransaction.js";
import { auth } from "../middleware/auth.js";
import { FOCUS_DURATION_SECONDS, WALLET_CAP } from "../config/economy.js";

const router = Router();
router.use(auth);

router.get("/current", async (req, res, next) => {
  try {
    const session = await FocusSession.findOne({ userId: req.userId, status: { $in: ["running", "paused"] } }).sort({ createdAt: -1 });
    res.json({ success: true, session, durationSeconds: FOCUS_DURATION_SECONDS });
  } catch (e) { next(e); }
});

router.post("/start", async (req, res, next) => {
  try {
    const existing = await FocusSession.findOne({ userId: req.userId, status: { $in: ["running", "paused"] } });
    if (existing) return res.status(409).json({ success: false, message: "You already have an active focus session.", session: existing });
    if (req.body.questId && !(await Quest.findOne({ _id: req.body.questId, userId: req.userId }))) return res.status(404).json({ success: false, message: "Quest not found." });
    const session = await FocusSession.create({ userId: req.userId, questId: req.body.questId || null, startedAt: new Date(), lastResumedAt: new Date(), status: "running" });
    res.status(201).json({ success: true, session, durationSeconds: FOCUS_DURATION_SECONDS });
  } catch (e) { next(e); }
});

router.post("/:id/pause", async (req, res, next) => {
  try {
    const s = await FocusSession.findOne({ _id: req.params.id, userId: req.userId, status: "running" });
    if (!s) return res.status(404).json({ success: false, message: "Running session not found." });
    s.activeSeconds += Math.max(0, Math.floor((Date.now() - new Date(s.lastResumedAt).getTime()) / 1000));
    s.status = "paused"; s.lastResumedAt = null;
    await s.save();
    res.json({ success: true, session: s });
  } catch (e) { next(e); }
});

router.post("/:id/resume", async (req, res, next) => {
  try {
    const s = await FocusSession.findOne({ _id: req.params.id, userId: req.userId, status: "paused" });
    if (!s) return res.status(404).json({ success: false, message: "Paused session not found." });
    s.status = "running"; s.lastResumedAt = new Date();
    await s.save();
    res.json({ success: true, session: s });
  } catch (e) { next(e); }
});

router.post("/:id/cancel", async (req, res, next) => {
  try {
    const s = await FocusSession.findOne({ _id: req.params.id, userId: req.userId, status: { $in: ["running", "paused"] } });
    if (!s) return res.status(404).json({ success: false, message: "Active session not found." });
    if (s.status === "running") s.activeSeconds += Math.max(0, Math.floor((Date.now() - new Date(s.lastResumedAt).getTime()) / 1000));
    s.status = "cancelled"; s.endedAt = new Date();
    await s.save();
    res.json({ success: true, session: s });
  } catch (e) { next(e); }
});

router.post("/:id/complete", async (req, res, next) => {
  try {
    const s = await FocusSession.findOne({ _id: req.params.id, userId: req.userId });
    if (!s) return res.status(404).json({ success: false, message: "Session not found." });
    if (s.tokenAwarded) return res.status(409).json({ success: false, message: "This session has already been rewarded." });
    if (s.status !== "running") return res.status(400).json({ success: false, message: "Resume the session before completing it." });
    s.activeSeconds += Math.max(0, Math.floor((Date.now() - new Date(s.lastResumedAt).getTime()) / 1000));
    if (s.activeSeconds < FOCUS_DURATION_SECONDS) {
      await s.save();
      return res.status(400).json({ success: false, message: "The 40-minute focus round is not complete yet.", activeSeconds: s.activeSeconds });
    }
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: "Account not found." });
    const previousBalance = user.tokens;
    // Keep wallet at or below cap; do not silently discard a reward.
    if (user.tokens >= WALLET_CAP) {
      return res.status(409).json({ success: false, message: "Wallet is full. Invest tokens before completing another rewarded round.", walletFull: true });
    }
    user.tokens += 1;
    user.lifetimeTokens += 1;
    user.totalFocusMinutes += 40;
    await user.save();
    s.status = "completed"; s.endedAt = new Date(); s.tokenAwarded = true; s.activeSeconds = Math.max(s.activeSeconds, FOCUS_DURATION_SECONDS);
    await s.save();
    await TokenTransaction.create({ userId: user._id, type: "Focus reward", amount: 1, previousBalance, newBalance: user.tokens, description: "Completed a 40-minute focus round", referenceId: String(s._id) });
    if (s.questId) await Quest.findOneAndUpdate({ _id: s.questId, userId: user._id }, { $inc: { focusMinutes: 40 } });
    res.json({ success: true, session: s, tokens: user.tokens, lifetimeTokens: user.lifetimeTokens, message: "+1 token earned." });
  } catch (e) { next(e); }
});

export default router;
