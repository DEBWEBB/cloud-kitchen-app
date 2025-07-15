// src/components/ChatBot.jsx
import { useState, useRef } from "react";
import { FaRobot, FaTimes } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const QUICK_SUGGESTIONS = [
  "How to order",
  "Track my order",
  "Where’s my delivery?",
  "Refund policy"
];

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hi! I'm your food assistant. Ask me anything!", typing: false }
  ]);
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false);
  const messagesEndRef = useRef();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async (text = null) => {
    const userText = text || input.trim();
    if (!userText || waiting) return;

    setMessages(prev => [...prev, { from: "user", text: userText }]);
    setInput("");
    scrollToBottom();

    setWaiting(true);
    setMessages(prev => [...prev, { from: "bot", text: "Typing...", typing: true }]);
    scrollToBottom();

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText })
      });
      const data = await res.json();
      const botReply = data.reply || "Sorry, I didn’t get that.";

      setMessages(prev => [
        ...prev.slice(0, -1),
        { from: "bot", text: botReply, typing: false }
      ]);
      scrollToBottom();

    } catch (err) {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { from: "bot", text: "Oops, something went wrong.", typing: false }
      ]);
      console.error(err);
    } finally {
      setWaiting(false);
    }
  };

  const handleEnter = e => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 bg-blue-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-xl z-50 hover:scale-110 transition"
      >
        {open ? <FaTimes size={20} /> : <FaRobot size={24} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-20 right-5 bg-white/80 dark:bg-black/60 backdrop-blur-lg border border-gray-200 dark:border-gray-700 w-80 h-[450px] rounded-xl flex flex-col z-50"
          >
            <div className="bg-blue-600 text-white p-3 rounded-t-xl text-sm font-bold">
              Food Assistant Chat
            </div>
            <div className="flex-1 p-3 overflow-y-auto space-y-2 text-sm">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.from === "bot" && (
                    <img src="/robot-avatar.png" className="w-6 h-6 rounded-full mr-2" alt="bot" />
                  )}
                  <div className={`px-3 py-2 rounded-xl max-w-[80%] whitespace-pre-line
                    ${msg.from === "user" ? "bg-blue-100 dark:bg-blue-800 text-right" : "bg-gray-100 dark:bg-gray-700 text-left"}`}>
                    {msg.text}
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-2 border-t flex dark:border-gray-600">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleEnter}
                placeholder="Ask something..."
                className="flex-1 border p-2 text-sm rounded-l dark:bg-gray-900 dark:text-white dark:border-gray-600"
              />
              <button
                onClick={() => sendMessage()}
                className="bg-blue-600 text-white px-3 text-sm rounded-r hover:bg-blue-700"
              >
                Send
              </button>
            </div>

            <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-wrap gap-2">
              {QUICK_SUGGESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="bg-gray-200 dark:bg-gray-800 px-3 py-1 rounded-full text-xs hover:bg-gray-300 dark:hover:bg-gray-700"
                >
                  {q}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
