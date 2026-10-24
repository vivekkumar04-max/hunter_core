import { Router } from "express";
import mongoose from "mongoose";
import GoalPlan from "../models/GoalPlan.js";
import { auth } from "../middleware/auth.js";

const router = Router();
router.use(auth);

const allowedTypes = new Set(["study", "workout", "skill"]);

function parseJsonText(text) {
  const cleaned = String(text || "").trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try { return JSON.parse(cleaned); } catch {}
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first >= 0 && last > first) return JSON.parse(cleaned.slice(first, last + 1));
  throw new Error("Gemma returned an unexpected response format. Please try again.");
}

router.get("/latest", async (req, res, next) => {
  try {
    const plan = await GoalPlan.findOne({ userId: req.userId }).sort({ updatedAt: -1 });
    res.json({ success: true, plan });
  } catch (error) { next(error); }
});

router.get("/", async (req, res, next) => {
  try {
    const plans = await GoalPlan.find({ userId: req.userId }).sort({ updatedAt: -1 }).limit(20);
    res.json({ success: true, plans });
  } catch (error) { next(error); }
});

router.post("/generate", async (req, res, next) => {
  try {
    const { goalType, goal, startingPoint = "Beginner", targetDays = 30, minutesPerDay = 60, daysPerWeek = 5, constraints = "" } = req.body;
    if (!allowedTypes.has(goalType)) return res.status(400).json({ success: false, message: "Choose Study, Workout, or Skill." });
    if (!goal?.trim()) return res.status(400).json({ success: false, message: "Describe the goal you want to achieve." });
    const days = Math.min(365, Math.max(1, Number(targetDays) || 30));
    const minutes = Math.min(600, Math.max(10, Number(minutesPerDay) || 60));
    const weeklyDays = Math.min(7, Math.max(1, Number(daysPerWeek) || 5));
    const apiKey = process.env.GEMMA_API_KEY;
    if (!apiKey) return res.status(503).json({ success: false, message: "Gemma 4 is not configured yet. Add GEMMA_API_KEY to server/.env and restart the backend." });

    const model = process.env.GEMMA_MODEL || "gemma-4-26b-a4b-it";
    const prompt = `You are a practical, supportive personal coach. Create a realistic, detailed goal plan for this user.
Goal category: ${goalType}
Specific goal: ${goal.trim()}
Current starting point: ${startingPoint}
Time available: ${days} calendar days
Daily time budget: ${minutes} minutes
Days available per week: ${weeklyDays}
Constraints or preferences: ${constraints || "None provided"}

Requirements:
- Make a safe, realistic progression with rest/recovery where appropriate.
- For workouts, avoid extreme or medical advice; include warm-up, gradual progression, recovery days, and a reminder to adapt to pain/injury.
- For study or skills, include deliberate practice, revision, practice tasks, and small measurable outcomes.
- Create a daily task list for the full plan, but keep each day to 1-4 manageable tasks and keep total estimated minutes within the daily budget (rest days can be shorter).
- Dates should be ISO date strings starting from today (${new Date().toISOString().slice(0,10)}), with dayNumber starting at 1.
- Provide measurable milestones. Avoid vague tasks like "keep learning"; state exactly what to do and what completion means.
- Return ONLY valid JSON, no markdown, with this shape:
{
  "planTitle": "short motivating title",
  "overview": "2-4 sentence explanation",
  "milestones": [{"title":"...", "description":"...", "targetDay": 7}],
  "dailyTasks": [{"dayNumber":1,"date":"YYYY-MM-DD","title":"specific action","description":"steps and measurable finish condition","estimatedMinutes":30,"category":"Learn|Practice|Review|Workout|Recovery|Project"}]
}
Return a maximum of ${days} daily entries, and include a task or recovery item for every day.`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6, responseMimeType: "application/json" }
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.error?.message || "Gemma 4 request failed. Check your API key, model access, and quota.";
      return res.status(response.status === 429 ? 429 : 502).json({ success: false, message });
    }
    const generatedText = payload?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("\n");
    const generated = parseJsonText(generatedText);
    if (!Array.isArray(generated.dailyTasks) || generated.dailyTasks.length === 0) {
      return res.status(502).json({ success: false, message: "Gemma did not return a usable daily task list. Please try again." });
    }

    const dailyTasks = generated.dailyTasks.slice(0, days).map((task, index) => {
      const dayNumber = Math.min(days, Math.max(1, Number(task.dayNumber) || index + 1));
      const fallbackDate = new Date(Date.now() + (dayNumber - 1) * 86400000).toISOString().slice(0, 10);
      return {
        dayNumber,
        date: /^\d{4}-\d{2}-\d{2}$/.test(task.date || "") ? task.date : fallbackDate,
        title: String(task.title || `Day ${dayNumber} task`).slice(0, 180),
        description: String(task.description || "").slice(0, 1500),
        estimatedMinutes: Math.min(minutes, Math.max(0, Number(task.estimatedMinutes) || minutes)),
        category: String(task.category || "Core task").slice(0, 60),
        completed: false
      };
    });
    const plan = await GoalPlan.create({
      userId: req.userId, goalType, goal: goal.trim(), startingPoint,
      targetDays: days, minutesPerDay: minutes, daysPerWeek: weeklyDays,
      constraints, planTitle: String(generated.planTitle || goal).slice(0, 180),
      overview: String(generated.overview || "").slice(0, 2000),
      milestones: (Array.isArray(generated.milestones) ? generated.milestones : []).slice(0, 30).map(m => ({
        title: String(m.title || "Milestone").slice(0, 180),
        description: String(m.description || "").slice(0, 1000),
        targetDay: Math.min(days, Math.max(1, Number(m.targetDay) || 1))
      })),
      dailyTasks
    });
    res.status(201).json({ success: true, plan });
  } catch (error) {
    if (error instanceof SyntaxError) return res.status(502).json({ success: false, message: "Gemma returned invalid JSON. Please try generating the plan again." });
    next(error);
  }
});

router.patch("/:planId/tasks/:taskId", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.planId) || !mongoose.isValidObjectId(req.params.taskId)) {
      return res.status(400).json({ success: false, message: "Invalid plan or task ID." });
    }
    const plan = await GoalPlan.findOne({ _id: req.params.planId, userId: req.userId });
    if (!plan) return res.status(404).json({ success: false, message: "Goal plan not found." });
    const task = plan.dailyTasks.id(req.params.taskId);
    if (!task) return res.status(404).json({ success: false, message: "Task not found." });
    task.completed = Boolean(req.body.completed);
    task.completedAt = task.completed ? new Date() : null;
    if (plan.dailyTasks.length && plan.dailyTasks.every(item => item.completed)) plan.status = "completed";
    else if (plan.status === "completed") plan.status = "active";
    await plan.save();
    res.json({ success: true, plan });
  } catch (error) { next(error); }
});

router.patch("/:planId/status", async (req, res, next) => {
  try {
    if (!["active", "paused"].includes(req.body.status)) return res.status(400).json({ success: false, message: "Choose active or paused." });
    const plan = await GoalPlan.findOneAndUpdate(
      { _id: req.params.planId, userId: req.userId },
      { status: req.body.status },
      { new: true, runValidators: true }
    );
    if (!plan) return res.status(404).json({ success: false, message: "Goal plan not found." });
    res.json({ success: true, plan });
  } catch (error) { next(error); }
});

export default router;
