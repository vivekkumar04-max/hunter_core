import mongoose from "mongoose";

const milestoneSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  targetDay: { type: Number, default: 1 }
}, { _id: true });

const taskSchema = new mongoose.Schema({
  dayNumber: { type: Number, required: true },
  date: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  estimatedMinutes: { type: Number, default: 30 },
  category: { type: String, default: "Core task" },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date, default: null }
}, { _id: true });

const goalPlanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  goalType: { type: String, enum: ["study", "workout", "skill"], required: true },
  goal: { type: String, required: true, trim: true, maxlength: 300 },
  startingPoint: { type: String, default: "Beginner" },
  targetDays: { type: Number, min: 1, max: 365, default: 30 },
  minutesPerDay: { type: Number, min: 10, max: 600, default: 60 },
  daysPerWeek: { type: Number, min: 1, max: 7, default: 5 },
  constraints: { type: String, default: "", maxlength: 1000 },
  planTitle: { type: String, required: true },
  overview: { type: String, default: "" },
  milestones: [milestoneSchema],
  dailyTasks: [taskSchema],
  status: { type: String, enum: ["active", "completed", "paused"], default: "active" }
}, { timestamps: true });

export default mongoose.model("GoalPlan", goalPlanSchema);
