// src/components/ChatBot.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaRobot, FaTimes, FaPaperPlane, FaRedoAlt } from "react-icons/fa";

const STORAGE_KEY = "hungrybox_chat_messages";
const MAX_INPUT_LENGTH = 500;

const DEFAULT_SUGGESTIONS = [
  "How do I place an order?",
  "Track my order",
  "What's the delivery charge?",
  "Refund policy",
  "Available stores",
  "Payment options",
];

const QUICK_ACTIONS = [
  { label: "🍕 Menu", value: "Show me the menu" },
  { label: "📦 Orders", value: "Track my order" },
  { label: "💳 Payments", value: "Payment options" },
  { label: "🔥 Offers", value: "Tell me today's offers" },
];

const INITIAL_MESSAGES = [
  {
    id: "welcome-message",
    from: "bot",
    text: "👋 Hi! I'm your HungryBox food assistant. I can help you with orders, delivery, refunds, stores, and payment options.",
    source: "rule",
    time: new Date().toISOString(),
  },
];

function normalizeMessages(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return INITIAL_MESSAGES;

  return raw.map((msg, index) => ({
    id: msg.id ?? `msg-${index}-${Date.now()}`,
    from: msg.from === "user" ? "user" : "bot",
    text: typeof msg.text === "string" ? msg.text : "",
    source: msg.source || undefined,
    time: msg.time || new Date().toISOString(),
    isError: Boolean(msg.isError),
    originalText:
      typeof msg.originalText === "string" ? msg.originalText : undefined,
    actions: Array.isArray(msg.actions) ? msg.actions : undefined,
  }));
}

function loadStoredMessages() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return INITIAL_MESSAGES;
    return normalizeMessages(JSON.parse(stored));
  } catch {
    return INITIAL_MESSAGES;
  }
}

function formatTime(value) {
  try {
    return new Date(value).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function getSmartSuggestions(lastBotMessage) {
  if (!lastBotMessage?.text) return DEFAULT_SUGGESTIONS;

  const text = lastBotMessage.text.toLowerCase();

  if (text.includes("order")) {
    return ["Track my order", "Cancel my order", "Payment options"];
  }

  if (text.includes("payment") || text.includes("upi") || text.includes("card")) {
    return ["Do you accept COD?", "Refund policy", "Available stores"];
  }

  if (text.includes("delivery")) {
    return ["Delivery charge", "Track my order", "Available stores"];
  }

  if (text.includes("refund")) {
    return ["How long does refund take?", "Payment options", "Track my order"];
  }

  if (text.includes("menu") || text.includes("cake") || text.includes("food")) {
    return ["Best selling cakes", "Available stores", "How do I place an order?"];
  }

  return DEFAULT_SUGGESTIONS;
}

function getSourceLabel(source) {
  switch (source) {
    case "rule":
      return "⚡ Instant";
    case "cache":
      return "🧠 Cached";
    case "ai":
      return "🤖 AI";
    case "fallback":
      return "🛟 Fallback";
    default:
      return "";
  }
}

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => loadStoredMessages());
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasError, setHasError] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const lastBotMessage = useMemo(
    () => [...messages].reverse().find((msg) => msg.from === "bot"),
    [messages]
  );

  const suggestions = useMemo(
    () => getSmartSuggestions(lastBotMessage),
    [lastBotMessage]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore storage write errors
    }
  }, [messages]);

  const sendMessage = async (text) => {
    const userText = (text || input).trim();

    if (!userText || isTyping || userText.length > MAX_INPUT_LENGTH) return;

    setInput("");
    setHasError(false);

    const now = new Date().toISOString();
    const userMsg = {
      id: `user-${Date.now()}`,
      from: "user",
      text: userText,
      time: now,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          context: window.location.pathname,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        throw new Error(data.error || `Server error (${res.status})`);
      }

      const reply =
        typeof data.reply === "string" && data.reply.trim()
          ? data.reply.trim()
          : "I'm not sure about that. Please try rephrasing.";

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          from: "bot",
          text: reply,
          source: data.source,
          time: new Date().toISOString(),
          actions: Array.isArray(data.actions) ? data.actions : undefined,
        },
      ]);
    } catch (err) {
      setHasError(true);

      const errorText =
        err?.name === "AbortError"
          ? "Response took too long. Please try again."
          : err?.message || "Something went wrong. Please try again.";

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-error-${Date.now()}`,
          from: "bot",
          text: `⚠️ ${errorText}`,
          isError: true,
          originalText: userText,
          source: "fallback",
          time: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleRetry = (originalText) => {
    if (!originalText || isTyping) return;
    sendMessage(originalText);
  };

  const handleAction = (action) => {
    if (!action) return;

    if (typeof action === "string") {
      sendMessage(action);
      return;
    }

    if (action.type === "navigate" && action.value) {
      window.location.href = action.value;
      return;
    }

    if (action.type === "message" && action.value) {
      sendMessage(action.value);
      return;
    }

    if (action.type === "search" && action.value) {
      sendMessage(action.value);
      return;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages(INITIAL_MESSAGES);
    setHasError(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage remove errors
    }
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 bg-gradient-to-br from-pink-500 to-orange-400 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg z-50"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        aria-label={open ? "Close chat" : "Open chat"}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <FaTimes size={18} />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <FaRobot size={22} />
            </motion.span>
          )}
        </AnimatePresence>

        {!open && messages.length > 1 && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-24 right-6 w-[340px] max-h-[80vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col z-50 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-pink-500 to-orange-400 p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <FaRobot size={16} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm leading-tight">
                    Food Assistant
                  </p>
                  <p className="text-white/80 text-xs">
                    {isTyping ? "Typing..." : hasError ? "Needs attention" : "Online"}
                  </p>
                </div>
              </div>

              <button
                onClick={clearChat}
                className="text-white/80 hover:text-white text-xs transition"
                title="Clear chat"
              >
                Clear
              </button>
            </div>

            <div className="px-3 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
              <div className="flex gap-2" style={{ width: "max-content" }}>
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.value)}
                    disabled={isTyping}
                    className="whitespace-nowrap text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-50"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  msg={msg}
                  onRetry={handleRetry}
                  onAction={handleAction}
                />
              ))}

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2 items-end"
                >
                  <div className="w-7 h-7 bg-gradient-to-br from-pink-400 to-orange-300 rounded-full flex items-center justify-center text-white text-xs shrink-0">
                    🤖
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1.5 items-center h-4">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{
                            duration: 0.6,
                            delay: i * 0.15,
                            repeat: Infinity,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800 overflow-x-auto">
              <div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
                {suggestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    disabled={isTyping}
                    className="whitespace-nowrap text-xs bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-300 border border-pink-200 dark:border-pink-800 px-3 py-1.5 rounded-full hover:bg-pink-100 dark:hover:bg-pink-900/40 transition disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask me anything..."
                    disabled={isTyping}
                    maxLength={MAX_INPUT_LENGTH}
                    className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-400 disabled:opacity-50"
                  />
                  <div className="text-[10px] text-gray-400 text-right pr-1 mt-1">
                    {input.length}/{MAX_INPUT_LENGTH}
                  </div>
                </div>

                <motion.button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isTyping || input.length > MAX_INPUT_LENGTH}
                  className="bg-gradient-to-br from-pink-500 to-orange-400 text-white rounded-xl p-2.5 disabled:opacity-40 shrink-0"
                  whileTap={{ scale: 0.9 }}
                  aria-label="Send message"
                >
                  <FaPaperPlane size={14} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ChatMessage({ msg, onRetry, onAction }) {
  const isUser = msg.from === "user";
  const sourceLabel = getSourceLabel(msg.source);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-2 items-end ${isUser ? "flex-row-reverse" : ""}`}
    >
      {!isUser && (
        <div className="w-7 h-7 bg-gradient-to-br from-pink-400 to-orange-300 rounded-full flex items-center justify-center text-white text-xs shrink-0">
          🤖
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`text-sm px-4 py-2.5 rounded-2xl whitespace-pre-line leading-relaxed ${
            isUser
              ? "bg-gradient-to-br from-pink-500 to-orange-400 text-white rounded-br-sm"
              : msg.isError
              ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-bl-sm"
              : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-sm"
          }`}
        >
          {msg.text}
        </div>

        <div
          className={`flex items-center gap-2 mt-1 px-1 ${
            isUser ? "justify-end" : "justify-start"
          }`}
        >
          {sourceLabel && !isUser && (
            <span className="text-[10px] text-gray-400">{sourceLabel}</span>
          )}
          {msg.time && (
            <span className="text-[10px] text-gray-400">{formatTime(msg.time)}</span>
          )}
        </div>

        {msg.actions?.length > 0 && !isUser && (
          <div className="flex flex-wrap gap-2 mt-2">
            {msg.actions.map((action, index) => {
              const label =
                typeof action === "string" ? action : action?.label || "Action";

              return (
                <button
                  key={`${label}-${index}`}
                  onClick={() => onAction(action)}
                  className="text-xs bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-300 px-3 py-1 rounded-full hover:opacity-90 transition"
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {msg.isError && msg.originalText && (
          <button
            onClick={() => onRetry(msg.originalText)}
            className="mt-2 inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
          >
            <FaRedoAlt size={10} />
            Retry
          </button>
        )}
      </div>
    </motion.div>
  );
}