import { useState } from "react";
import { FaRobot, FaTimes } from "react-icons/fa";

const faqResponses = {
  hi: "Hi there! 👋 How can I help you today?",
  hello: "Hello! I'm your food assistant. Ask me anything.",
  "how to order": "1. Browse food 🏠\n2. Add to Cart 🛒\n3. Checkout with UPI or COD.",
  "how to pay": "Pay via UPI QR or Cash on Delivery (COD).",
  upi: "Scan the QR during checkout to pay via any UPI app.",
  cod: "Pay when the courier delivers your order.",
  delivery: "We deliver within 30–45 minutes in your locality 🚚.",
  refund: "Message us here or via Profile → Orders → Report Issue.",
  order: "Visit Profile → Orders to track your order live.",
  "order status": "Go to Profile → Orders to see real-time updates.",
  profile: "You can update your name, email, and address in Profile.",
  help: "Try: 'how to order', 'upi', 'refund', 'delivery', 'cod'.",
  bye: "Goodbye! Have a tasty day! 🍕"
};

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hi! I'm your food assistant. Ask me anything! 🤖" }
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages((prev) => [...prev, { from: "user", text: userMsg }]);

    const lowerMsg = userMsg.toLowerCase();
    const reply = faqResponses[lowerMsg] || "Sorry, I didn’t get that. Try: 'order', 'delivery', 'upi'.";
    setTimeout(() => {
      setMessages((prev) => [...prev, { from: "bot", text: reply }]);
    }, 600);

    setInput("");
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 bg-blue-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-xl z-50"
      >
        {open ? <FaTimes size={20} /> : <FaRobot size={24} />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 bg-white/70 dark:bg-black/30 backdrop-blur-md border shadow-xl w-80 h-[450px] rounded-xl flex flex-col z-50 text-black dark:text-white">
          <div className="bg-blue-600 text-white p-3 rounded-t-xl text-sm font-bold">Food Assistant Chat</div>
          <div className="flex-1 p-3 overflow-y-auto text-sm space-y-2">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`p-2 rounded-lg max-w-[80%] ${
                  msg.from === "user" ? "ml-auto bg-blue-100 dark:bg-blue-800" : "mr-auto bg-gray-100 dark:bg-gray-700"
                }`}
              >
                {msg.text.split("\n").map((line, idx) => (
                  <div key={idx}>{line}</div>
                ))}
              </div>
            ))}
          </div>
          <div className="p-2 border-t flex dark:border-gray-600">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask something..."
              className="flex-1 border p-2 text-sm rounded-l dark:bg-gray-900 dark:text-white dark:border-gray-600"
            />
            <button
              onClick={handleSend}
              className="bg-blue-600 text-white px-3 text-sm rounded-r"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
