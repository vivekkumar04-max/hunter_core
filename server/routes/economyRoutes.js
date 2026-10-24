import { Router } from "express";
import User from "../models/User.js";
import TokenTransaction from "../models/TokenTransaction.js";
import { auth } from "../middleware/auth.js";
import { WALLET_CAP, levelFor } from "../config/economy.js";

const router = Router();
router.use(auth);

router.get("/", async (req, res, next) => {
  try {
    const [user, transactions] = await Promise.all([
      User.findById(req.userId).select("-password"),
      TokenTransaction.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(50)
    ]);
    res.json({ success: true, user, transactions, walletCap: WALLET_CAP, currentLevel: levelFor(user.level), nextLevel: levelFor(user.level + 1) });
  } catch (e) { next(e); }
});

router.post("/spend", async (req, res, next) => {
  try {
    const amount = Number(req.body.amount);
    const activity = String(req.body.activity || "").trim();
    if (!Number.isInteger(amount) || amount < 1 || amount > 6 || !activity) return res.status(400).json({ success: false, message: "Choose a valid token amount and activity." });
    const user = await User.findById(req.userId);
    const today = new Date(); today.setHours(0,0,0,0);
    const spentToday = await TokenTransaction.aggregate([{ $match: { userId: user._id, type: "Leisure spending", createdAt: { $gte: today } } }, { $group: { _id: null, total: { $sum: { $abs: "$amount" } } } }]);
    const cap = levelFor(user.level).dailyCap;
    const alreadySpent = spentToday[0]?.total || 0;
    if (user.tokens < amount) return res.status(400).json({ success: false, message: "Not enough tokens." });
    if (alreadySpent + amount > cap) return res.status(400).json({ success: false, message: `Daily spending cap is ${cap} tokens; ${Math.max(0, cap-alreadySpent)} remain.` });
    const previousBalance = user.tokens; user.tokens -= amount; user.tokensSpent += amount; await user.save();
    await TokenTransaction.create({ userId: user._id, type: "Leisure spending", amount: -amount, previousBalance, newBalance: user.tokens, description: `${amount * 10} minutes for ${activity}` });
    res.json({ success: true, tokens: user.tokens, leisureMinutes: amount * 10, message: `Unlocked ${amount * 10} minutes for ${activity}.` });
  } catch (e) { next(e); }
});

router.post("/level-up", async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    const nextLevel = levelFor(user.level + 1);
    if (user.tokens < nextLevel.cost) return res.status(400).json({ success: false, message: `You need ${nextLevel.cost} tokens to level up.` });
    const previousBalance = user.tokens;
    user.tokens -= nextLevel.cost; user.tokensInvested += nextLevel.cost; user.level += 1; user.highestLevel = Math.max(user.highestLevel, user.level);
    await user.save();
    await TokenTransaction.create({ userId: user._id, type: "Level-up investment", amount: -nextLevel.cost, previousBalance, newBalance: user.tokens, description: `Reached level ${user.level}: ${nextLevel.name}` });
    res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, level: user.level, tokens: user.tokens, lifetimeTokens: user.lifetimeTokens, tokensSpent: user.tokensSpent, tokensInvested: user.tokensInvested, totalFocusMinutes: user.totalFocusMinutes, highestLevel: user.highestLevel }, message: `Level up! Welcome to ${nextLevel.name}.` });
  } catch (e) { next(e); }
});

export default router;
