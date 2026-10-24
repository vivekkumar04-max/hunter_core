import mongoose from "mongoose";

const focusSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  questId: { type: mongoose.Schema.Types.ObjectId, ref: "Quest", default: null },
  startedAt: { type: Date, required: true },
  endedAt: { type: Date, default: null },
  activeSeconds: { type: Number, default: 0 },
  status: { type: String, enum: ["running", "paused", "completed", "cancelled"], default: "running" },
  tokenAwarded: { type: Boolean, default: false },
  lastResumedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model("FocusSession", focusSessionSchema);
