import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 40 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  level: { type: Number, default: 1 },
  tokens: { type: Number, default: 0, min: 0, max: 30 },
  lifetimeTokens: { type: Number, default: 0 },
  tokensSpent: { type: Number, default: 0 },
  tokensInvested: { type: Number, default: 0 },
  totalFocusMinutes: { type: Number, default: 0 },
  currentStreak: { type: Number, default: 0 },
  highestLevel: { type: Number, default: 1 }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
