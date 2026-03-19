import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const PORT = process.env.PORT || 5000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const MAX_MESSAGE_LENGTH = 500;
const RATE_LIMIT = 20;
const RATE_WINDOW = 60_000;
const CACHE_TTL = 5 * 60_000;
const SAFETY_BLOCKLIST = [
  "bomb",
  "explosive",
  "kill",
  "suicide",
  "self harm",
  "hack",
  "fraud",
  "illegal",
  "credit card theft",
  "hack account",
  "malware",
  "drug recipe",
];

if (!process.env.GEMINI_API_KEY) {
  console.error("Missing GEMINI_API_KEY in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });
const app = express();
const rateLimitMap = new Map();
const cache = new Map();

app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json({ limit: "10kb" }));

function sanitizeMessage(value = "") {
  return value.replace(/\s+/g, " ").replace(/[<>]/g, "").trim();
}

function isBlockedMessage(message) {
  const text = message.toLowerCase();
  return SAFETY_BLOCKLIST.some((term) => text.includes(term));
}

function rateLimit(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return next();
  }

  if (entry.count >= RATE_LIMIT) {
    return res.status(429).json({ error: "Too many requests. Please wait a moment." });
  }

  entry.count += 1;
  return next();
}

function getCached(message) {
  const key = message.toLowerCase();
  const entry = cache.get(key);

  if (entry && Date.now() < entry.expiresAt) {
    return entry.payload;
  }

  return null;
}

function setCache(message, payload) {
  cache.set(message.toLowerCase(), {
    payload,
    expiresAt: Date.now() + CACHE_TTL,
  });
}

function getRuleBasedReply(message) {
  const msg = message.toLowerCase();

  if (msg.includes("order")) {
    return {
      reply: "To place an order: browse a store, add items to your cart, and continue to checkout.",
      source: "rule",
      actions: [{ label: "Browse Stores", type: "navigate", value: "/" }],
    };
  }

  if (msg.includes("payment") || msg.includes("upi") || msg.includes("cod")) {
    return {
      reply: "We currently support UPI QR and cash on delivery, depending on the checkout flow.",
      source: "rule",
    };
  }

  if (msg.includes("hello") || msg.includes("hi")) {
    return {
      reply: "Hi! I can help with menu suggestions, payments, order tracking, and delivery questions.",
      source: "rule",
    };
  }

  return null;
}

app.post("/api/ai-chat", rateLimit, async (req, res) => {
  if (!req.body || typeof req.body.message !== "string") {
    return res.status(400).json({ error: "Invalid message" });
  }

  const trimmed = sanitizeMessage(req.body.message);

  if (!trimmed) {
    return res.status(400).json({ error: "Message cannot be empty" });
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer` });
  }

  if (isBlockedMessage(trimmed)) {
    return res.status(400).json({
      error: "That request is not supported. Please ask about food, orders, payments, or delivery.",
      source: "safety",
    });
  }

  const cached = getCached(trimmed);
  if (cached) {
    return res.json({ ...cached, source: "cache" });
  }

  const rule = getRuleBasedReply(trimmed);
  if (rule) {
    setCache(trimmed, rule);
    return res.json(rule);
  }

  try {
    const prompt = [
      "You are a safe food delivery assistant for HungryBox.",
      "Only answer questions about food, ordering, delivery, payments, refunds, and app guidance.",
      "Decline anything harmful, illegal, unsafe, abusive, or unrelated.",
      "Keep responses short, useful, and customer-friendly.",
      `User message: ${trimmed}`,
    ].join("\n");

    const result = await model.generateContent(prompt);
    const reply = sanitizeMessage(result.response.text()).slice(0, 700);
    const payload = {
      reply: reply || "You can browse menu items, place an order, or track delivery here.",
      source: "ai",
    };

    setCache(trimmed, payload);
    return res.json(payload);
  } catch (error) {
    console.error("Gemini failed, serving fallback:", error?.message || error);
    const fallback = getRuleBasedReply(trimmed) || {
      reply: "I can help with menu suggestions, orders, tracking, and payment questions.",
      source: "fallback",
    };

    return res.json(fallback);
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Gemini backend running at http://localhost:${PORT}`);
});
