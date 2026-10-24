import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: { type: String, enum: ["Focus reward", "Leisure spending", "Level-up investment", "Administrative adjustment", "Refund or reversal"], required: true },
  amount: { type: Number, required: true },
  previousBalance: { type: Number, required: true },
  newBalance: { type: Number, required: true },
  description: { type: String, default: "" },
  referenceId: { type: String, default: "" }
}, { timestamps: true });

export default mongoose.model("TokenTransaction", transactionSchema);
