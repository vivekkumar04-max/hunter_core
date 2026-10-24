import { Router } from "express";
import { auth } from "../middleware/auth.js";

const router = Router();
router.use(auth);

// Gamma API access is intentionally server-side. Verify the endpoint and payload
// against the API documentation enabled for your Gamma account before production use.
router.post("/gamma", async (req, res) => {
  const apiKey = process.env.GAMMA_API_KEY;
  const baseUrl = (process.env.GAMMA_API_BASE_URL || "https://public-api.gamma.app/v1.0").replace(/\/$/, "");
  if (!apiKey) return res.status(503).json({ success: false, message: "Gamma API is not configured. Add GAMMA_API_KEY to server/.env." });
  const { topic, instructions = "", format = "presentation" } = req.body;
  if (!topic?.trim()) return res.status(400).json({ success: false, message: "A topic is required." });

  try {
    // Endpoint and payload are configurable scaffolding because Gamma API capabilities
    // and versions may vary by account. Update this path/body to match Gamma's current docs.
    const response = await fetch(`${baseUrl}/generations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
      body: JSON.stringify({
        inputText: `${topic.trim()}\n\n${instructions}`.trim(),
        textMode: "generate",
        format,
        exportAs: "pdf"
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(response.status).json({ success: false, message: data.message || data.error || "Gamma API request failed. Check your API endpoint, key, and account access.", details: data });
    res.json({ success: true, data });
  } catch (error) {
    res.status(502).json({ success: false, message: "Could not reach Gamma API. Check network access and GAMMA_API_BASE_URL.", details: error.message });
  }
});

export default router;
