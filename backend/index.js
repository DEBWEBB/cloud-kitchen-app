// backend/index.js

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { OpenAI } from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ POST /api/ai-chat – Chat endpoint
app.post("/api/ai-chat", async (req, res) => {
  const { message } = req.body;
  console.log("📩 Received message:", message);

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message is required." });
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4", // or "gpt-3.5-turbo"
      messages: [
        {
          role: "system",
          content: "You are a friendly AI assistant for a cloud kitchen. Help users with food orders, delivery, and FAQs.",
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.7,
    });

    const aiReply = response.choices[0]?.message?.content?.trim();
    res.json({ reply: aiReply || "Sorry, I couldn't respond properly." });
  } catch (error) {
    console.error("❌ OpenAI Error:", error);
    res.status(500).json({ error: "AI service failed. Please try again later." });
  }
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 AI Backend running at: http://localhost:${PORT}/api/ai-chat`)
);
