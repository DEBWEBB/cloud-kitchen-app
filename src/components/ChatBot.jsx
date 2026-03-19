import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaRobot, FaTimes, FaPaperPlane, FaRedoAlt } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useCart } from "../context/CartContext";
import { menuItems } from "../data/menu";
import {
  buildRecommendationResponse,
  isRecommendationQuery,
  saveUserPreferences,
} from "../utils/recommendFood";

const STORAGE_KEY = "hungrybox_chat_messages";
const MAX_INPUT_LENGTH = 500;

const DEFAULT_SUGGESTIONS = [
  "How do I place an order?",
  "Track my order",
  "Recommend a cake",
  "What should I eat?",
  "Payment options",
  "Available stores",
];

const QUICK_ACTIONS = [
  { label: "Menu", value: "Show me the menu" },
  { label: "Recommend", value: "Recommend something sweet" },
  { label: "Orders", value: "Track my order" },
  { label: "Payments", value: "Payment options" },
];

const INITIAL_MESSAGES = [
  {
    id: "welcome-message",
    from: "bot",
    text: "Hi! I'm your HungryBox food assistant. I can recommend items, help with orders, and add food directly to your cart.",
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

  if (text.includes("recommend") || text.includes("suggest")) {
    return ["Recommend a cake", "Show snack options", "What should I eat?"];
  }

  if (text.includes("order")) {
    return ["Track my order", "Cancel my order", "Payment options"];
  }

  if (text.includes("payment") || text.includes("upi") || text.includes("card")) {
    return ["Do you accept COD?", "Refund policy", "Available stores"];
  }

  if (text.includes("delivery")) {
    return ["Delivery charge", "Track my order", "Available stores"];
  }

  if (text.includes("menu") || text.includes("cake") || text.includes("food")) {
    return ["Best selling cakes", "Show snack options", "Recommend something sweet"];
  }

  return DEFAULT_SUGGESTIONS;
}

function getSourceLabel(source) {
  switch (source) {
    case "rule":
      return "Instant";
    case "cache":
      return "Cached";
    case "ai":
      return "AI";
    case "fallback":
      return "Fallback";
    default:
      return "";
  }
}

export default function ChatBot() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart } = useCart();
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

  const appendBotMessage = (payload) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `bot-${Date.now()}`,
        from: "bot",
        text: payload.reply,
        source: payload.source,
        time: new Date().toISOString(),
        actions: Array.isArray(payload.actions) ? payload.actions : undefined,
      },
    ]);
  };

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
    saveUserPreferences({ lastSearch: userText });

    if (isRecommendationQuery(userText)) {
      appendBotMessage(buildRecommendationResponse(menuItems, userText));
      setIsTyping(false);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          context: location.pathname,
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

      appendBotMessage({
        reply:
          typeof data.reply === "string" && data.reply.trim()
            ? data.reply.trim()
            : "I'm not sure about that. Please try rephrasing.",
        source: data.source,
        actions: data.actions,
      });
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
          text: `Warning: ${errorText}`,
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
      navigate(action.value);
      return;
    }

    if (action.type === "add_to_cart" && action.value) {
      addToCart(action.value);
      saveUserPreferences({
        lastOrder: action.value.name,
        favoriteCategory: action.value.category,
      });
      toast.success("Item added to cart");
      appendBotMessage({
        reply: `Added ${action.value.name} to your cart.`,
        source: "rule",
      });
      return;
    }

    if (action.type === "message" && action.value) {
      sendMessage(action.value);
      return;
    }

    if (action.type === "search" && action.value) {
      sendMessage(action.value);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
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
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-orange-400 text-white shadow-xl ring-4 ring-white/80 dark:ring-gray-950/80"
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
          <span className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-white bg-red-500" />
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-24 right-6 z-50 flex max-h-[80vh] w-[360px] flex-col overflow-hidden rounded-[28px] border border-gray-200 bg-white/95 shadow-2xl backdrop-blur dark:border-gray-700 dark:bg-gray-900/95"
          >
            <div className="flex items-center justify-between border-b border-gray-100 bg-white/90 p-4 dark:border-gray-800 dark:bg-gray-900/90">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-orange-400 text-white shadow-sm">
                  <FaRobot size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold leading-tight text-gray-900 dark:text-white">
                    Food Assistant
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isTyping ? "Typing..." : hasError ? "Needs attention" : "Online"}
                  </p>
                </div>
              </div>

              <button
                onClick={clearChat}
                className="btn-ghost px-3 py-1.5 text-xs"
                title="Clear chat"
              >
                Clear
              </button>
            </div>

            <div className="overflow-x-auto border-b border-gray-100 px-3 pb-2 pt-3 dark:border-gray-800">
              <div className="flex gap-2" style={{ width: "max-content" }}>
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.value)}
                    disabled={isTyping}
                    className="btn-ghost whitespace-nowrap px-3 py-1.5 text-xs disabled:opacity-50"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
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
                  className="flex items-end gap-2"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-orange-300 text-xs text-white">
                    AI
                  </div>
                  <div className="rounded-2xl rounded-bl-sm border border-gray-100 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex h-4 items-center gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-gray-400"
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

            <div className="overflow-x-auto border-t border-gray-100 px-3 py-2 dark:border-gray-800">
              <div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
                {suggestions.map((question) => (
                  <button
                    key={question}
                    onClick={() => sendMessage(question)}
                    disabled={isTyping}
                    className="whitespace-nowrap rounded-full border border-pink-200 bg-pink-50 px-3 py-1.5 text-xs text-pink-600 transition hover:bg-pink-100 disabled:opacity-50 dark:border-pink-800 dark:bg-pink-900/20 dark:text-pink-300 dark:hover:bg-pink-900/40"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>

            <div className="shrink-0 border-t border-gray-100 p-3 dark:border-gray-800">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask me what to eat..."
                    disabled={isTyping}
                    maxLength={MAX_INPUT_LENGTH}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-400 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <div className="mt-1 pr-1 text-right text-[10px] text-gray-400">
                    {input.length}/{MAX_INPUT_LENGTH}
                  </div>
                </div>

                <motion.button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isTyping || input.length > MAX_INPUT_LENGTH}
                  className="shrink-0 rounded-2xl bg-gradient-to-br from-pink-500 to-orange-400 p-3 text-white shadow disabled:opacity-40"
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
  const recommendationActions = (msg.actions || []).filter(
    (action) => typeof action !== "string" && action?.type === "add_to_cart" && action?.value
  );
  const regularActions = (msg.actions || []).filter(
    (action) => typeof action === "string" || action?.type !== "add_to_cart"
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-orange-300 text-xs text-white">
          AI
        </div>
      )}

      <div className={`flex max-w-[82%] flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
            isUser
                ? "rounded-br-sm bg-gradient-to-br from-pink-500 to-orange-400 text-white shadow-sm"
                : msg.isError
                ? "rounded-bl-sm border border-red-100 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300"
                : "rounded-bl-sm border border-gray-100 bg-white text-gray-800 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
          }`}
        >
          {msg.text}
        </div>

        <div
          className={`mt-1 flex items-center gap-2 px-1 ${
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

        {recommendationActions.length > 0 && !isUser && (
          <div className="mt-3 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
            {recommendationActions.map((action, index) => {
              const item = action.value;

              return (
                <motion.div
                  key={`${item.id}-${index}`}
                  whileHover={{ y: -2, scale: 1.01 }}
                  className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-10 w-10 rounded-xl object-cover shadow-sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.category} · Rs.{item.price}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onAction(action)}
                    className="mt-3 w-full rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:from-pink-600 hover:to-orange-500"
                  >
                    Add to Cart
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

        {regularActions.length > 0 && !isUser && (
          <div className="mt-2 flex flex-wrap gap-2">
            {regularActions.map((action, index) => {
              const label =
                typeof action === "string" ? action : action?.label || "Action";

              return (
                <button
                  key={`${label}-${index}`}
                  onClick={() => onAction(action)}
                  className="rounded-full bg-pink-100 px-3 py-1 text-xs text-pink-600 transition hover:opacity-90 dark:bg-pink-900/30 dark:text-pink-300"
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
