import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

// ─── CHECK ENV ─────────────────────────────────────────────
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ Missing GEMINI_API_KEY in .env");
  process.exit(1);
}

// ─── GEMINI SETUP ─────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// ─── APP ──────────────────────────────────────────────────
const app = express();

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*" }));
app.use(express.json({ limit: "10kb" }));

// ─── RATE LIMIT ───────────────────────────────────────────
const rateLimitMap = new Map();
const RATE_LIMIT = 20;
const RATE_WINDOW = 60_000;

function rateLimit(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress;
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return next();
  }

  if (entry.count >= RATE_LIMIT) {
    return res.status(429).json({ error: "Too many requests" });
  }

  entry.count++;
  next();
}

// ─── CACHE ────────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 5 * 60_000;

function getCached(message) {
  const entry = cache.get(message.toLowerCase().trim());
  if (entry && Date.now() < entry.expiresAt) return entry.reply;
  return null;
}

function setCache(message, reply) {
  cache.set(message.toLowerCase().trim(), {
    reply,
    expiresAt: Date.now() + CACHE_TTL,
  });
}

// ─── RULE ENGINE ──────────────────────────────────────────
function getRuleBasedReply(message) {
  const msg = message.toLowerCase();

  if (msg.includes("cake")) {
    return {
      reply: "🎂 Popular cakes you might like:",
      source: "rule",
      actions: [
        {
          label: "🍫 Chocolate Cake",
          type: "add_to_cart",
          value: {
            id: "cake_choco",
            name: "Chocolate Cake",
            price: 350,
            image: "/assets/mioamore.jpeg",
          },
        },
        {
          label: "❤️ Red Velvet",
          type: "add_to_cart",
          value: {
            id: "cake_red",
            name: "Red Velvet Cake",
            price: 400,
            image: "/assets/monginis.png",
          },
        },
      ],
    };
  }

  if (msg.includes("order")) {
    return {
      reply: "🛒 To order:\n1. Browse menu\n2. Add items\n3. Checkout",
      source: "rule",
      actions: [
        { label: "View Menu", type: "navigate", value: "/shop" },
      ],
    };
  }

  if (msg.includes("hi") || msg.includes("hello")) {
    return {
      reply: "👋 Hi! I'm your HungryBox assistant.",
      source: "rule",
    };
  }

  return null;
}

// ─── CHAT API ─────────────────────────────────────────────
app.post("/api/ai-chat", rateLimit, async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Invalid message" });
  }

  const trimmed = message.trim();

  // ✅ CACHE
  const cached = getCached(trimmed);
  if (cached) {
    return res.json({ reply: cached, source: "cache" });
  }

  // ✅ RULE
  const rule = getRuleBasedReply(trimmed);
  if (rule) {
    setCache(trimmed, rule.reply);
    return res.json(rule);
  }

  try {
    // ✅ GEMINI AI
    const result = await model.generateContent(trimmed);
    const reply = result.response.text();

    setCache(trimmed, reply);

    return res.json({
      reply,
      source: "ai",
    });
  } catch (error) {
    console.log("⚠️ Gemini failed → fallback");

    const fallback = getRuleBasedReply(trimmed);

    return res.json(
      fallback || {
        reply: "😊 You can browse menu or place an order.",
        source: "rule",
      }
    );
  }
});

// ─── HEALTH ───────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// ─── START ────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Gemini backend running at http://localhost:${PORT}`);
});