import mongoose from "mongoose";

const questSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, default: "", maxlength: 1000 },
  category: { type: String, default: "Programming" },
  priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
  difficulty: { type: String, enum: ["Easy", "Normal", "Hard", "Boss Quest"], default: "Normal" },
  status: { type: String, enum: ["Available", "Accepted", "In Progress", "Completed", "Failed", "Archived"], default: "Available" },
  deadline: { type: Date, default: null },
  notes: { type: String, default: "" },
  focusMinutes: { type: Number, default: 0 },
  completedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model("Quest", questSchema);
