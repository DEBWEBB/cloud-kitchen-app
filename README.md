# 🍰 HungryBox — Cloud Kitchen App

A full-stack cloud kitchen ordering platform with AI-powered chat support, real-time order tracking, and multi-role access (customers, delivery partners, and admins).

---

## ✨ Features

| Feature | Details |
|---|---|
| 🛍️ **Multi-store ordering** | Browse Mio Amore and Monginis — add to cart, checkout |
| 🤖 **AI Chat Assistant** | GPT-powered chatbot for order help, FAQs, and delivery queries |
| 📍 **Map-based delivery** | Interactive Leaflet map for precise drop location selection |
| 🔔 **Push Notifications** | Firebase Cloud Messaging for real-time order status updates |
| 👤 **Auth & Roles** | Firebase Auth with `user`, `delivery`, and `admin` roles |
| 🛵 **Delivery Partner Dashboard** | Accept/decline orders, update status, view earnings |
| 🧑‍💼 **Admin Dashboard** | Manage orders, partners, and menu items |
| 🌙 **Dark Mode** | Full dark mode with persistence via localStorage |
| 📱 **Responsive** | Mobile-first Tailwind CSS design |

---

## 🗂️ Project Structure

```
cloud-kitchen-app/
├── backend/           # Express + OpenAI AI chat API
│   └── index.js
├── functions/         # Firebase Cloud Functions
│   └── functions/
│       └── index.js
├── public/            # Static assets
├── src/
│   ├── assets/        # Images, Lottie JSON
│   ├── components/    # Reusable UI components
│   ├── context/       # Auth + Cart contexts
│   ├── data/          # Static menu data
│   ├── firebase/      # Firebase config & messaging
│   ├── lib/           # Supabase client
│   ├── pages/         # Route pages
│   │   └── partner/   # Delivery partner pages
│   └── utils/         # Helper functions
├── vite.config.js
└── tailwind.config.js
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Firebase project with Firestore, Auth, and FCM enabled
- OpenAI API key

### 1. Clone & Install

```bash
git clone https://github.com/DEBWEBB/cloud-kitchen-app.git
cd cloud-kitchen-app
npm install
```

### 2. Environment Variables

**Frontend** — create `.env` at project root:

```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_VAPID_KEY=your_vapid_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Backend** — create `backend/.env`:

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-3.5-turbo
PORT=5000
ALLOWED_ORIGIN=http://localhost:5173
```

### 3. Run Development

```bash
# Terminal 1 — Frontend
npm run dev

# Terminal 2 — AI Backend
cd backend
npm install
node index.js
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🏗️ Tech Stack

**Frontend**
- React 19 + Vite
- React Router v7
- Tailwind CSS v3
- Framer Motion
- Leaflet (maps)
- Chart.js + React-ChartJS-2
- Firebase SDK v11
- Supabase JS v2

**Backend**
- Node.js + Express
- OpenAI Node SDK
- Firebase Admin (Cloud Functions)

**Infrastructure**
- Firebase (Auth, Firestore, FCM, Hosting)
- Supabase (optional DB/Storage)
- GitHub Pages (static deployment)

---

## 🔐 User Roles

| Role | Access |
|---|---|
| `user` | Browse, order, track, profile |
| `delivery` | Partner dashboard, accept/update orders |
| `admin` | Full admin dashboard, order management |

---

## 📦 Deploy

```bash
# Build and deploy to GitHub Pages
npm run deploy
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit: `git commit -m "feat: add your feature"`
4. Push: `git push origin feat/your-feature`
5. Open a Pull Request

---

## 📄 License

MIT © [DEBWEBB](https://github.com/DEBWEBB)