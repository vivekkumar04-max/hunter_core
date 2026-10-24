import { Router } from "express";
import Quest from "../models/Quest.js";
import { auth } from "../middleware/auth.js";

const router = Router();
router.use(auth);

router.get("/", async (req, res, next) => {
  try { res.json({ success: true, quests: await Quest.find({ userId: req.userId }).sort({ createdAt: -1 }) }); }
  catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const { title, description, category, priority, difficulty, deadline } = req.body;
    if (!title?.trim()) return res.status(400).json({ success: false, message: "Quest title is required." });
    const quest = await Quest.create({ userId: req.userId, title: title.trim(), description, category, priority, difficulty, deadline: deadline || null, status: "Available" });
    res.status(201).json({ success: true, quest });
  } catch (e) { next(e); }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const allowed = ["title", "description", "category", "priority", "difficulty", "status", "deadline", "notes"];
    const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    if (update.status === "Completed") update.completedAt = new Date();
    const quest = await Quest.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, update, { new: true, runValidators: true });
    if (!quest) return res.status(404).json({ success: false, message: "Quest not found." });
    res.json({ success: true, quest });
  } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const quest = await Quest.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!quest) return res.status(404).json({ success: false, message: "Quest not found." });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;
