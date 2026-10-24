import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js";
import questRoutes from "./routes/questRoutes.js";
import focusRoutes from "./routes/focusRoutes.js";
import economyRoutes from "./routes/economyRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import planRoutes from "./routes/planRoutes.js";

dotenv.config();
const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "8mb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ success: true, app: "Hunter Core API" }));
app.use("/api/auth", authRoutes);
app.use("/api/quests", questRoutes);
app.use("/api/focus", focusRoutes);
app.use("/api/economy", economyRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/plans", planRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ success: false, message: err.message || "Server error" });
});

const port = process.env.PORT || 5000;
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(port, () => console.log(`Hunter Core API running on http://localhost:${port}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
