import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const PORT = process.env.PORT || 5000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const MAX_MESSAGE_LENGTH = 500;
const RATE_LIMIT = 20;
const RATE_WINDOW = 60_000;
const LIVE_METRICS_RATE_LIMIT = Number(process.env.LIVE_METRICS_RATE_LIMIT || 180);
const PARTNER_PRESENCE_RATE_LIMIT = Number(
  process.env.PARTNER_PRESENCE_RATE_LIMIT || 180
);
const OTP_RATE_LIMIT = Number(process.env.OTP_RATE_LIMIT || 20);
const CACHE_TTL = 5 * 60_000;
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
const CLAIM_RADIUS_KM = 3;
const PARTNER_RESERVATION_MS = 10 * 60_000;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "sahadebjit357@gmail.com";
const MIN_ONLINE_PARTNERS = Number(process.env.MIN_ONLINE_PARTNERS || 2);
const OTP_TTL_MS = 10 * 60_000;
const OTP_MAX_ATTEMPTS = 5;
const FIREBASE_WEB_API_KEY =
  process.env.FIREBASE_WEB_API_KEY || "AIzaSyCqNo_01sglnl5Fh5atIaOYa--rWTCAyYA";
const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://oedmcntahzowpxebgjlv.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "";
const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID || "";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_API_KEY_SID = process.env.TWILIO_API_KEY_SID || "";
const TWILIO_API_KEY_SECRET = process.env.TWILIO_API_KEY_SECRET || "";
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "";
const DEV_OTP_FALLBACK =
  process.env.NODE_ENV !== "production" &&
  String(process.env.ALLOW_DEV_OTP_FALLBACK || "true").toLowerCase() !== "false";
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
const DATA_DIR = path.join(__dirname, "data");
const PARTNER_SECURITY_DIR = path.join(DATA_DIR, "partner-security");
const SHOP_OPERATIONS_FILE = path.join(DATA_DIR, "shop-operations.json");
const PAYMENT_RECORDS_FILE = path.join(DATA_DIR, "payment-records.json");
const PARTNER_OTP_FILE = path.join(DATA_DIR, "partner-otp-sessions.json");
const ORDER_SECURITY_FILE = path.join(DATA_DIR, "order-security.json");

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;
const model = genAI ? genAI.getGenerativeModel({ model: "gemini-pro" }) : null;
const app = express();
const rateLimitStores = new Map();
const cache = new Map();
const onlinePartners = new Map();
const shopOperations = new Map();
const paymentRecords = new Map();
const partnerOtpSessions = new Map();
const orderSecurityRecords = new Map();
let shopOpsPersistPromise = Promise.resolve();
let paymentPersistPromise = Promise.resolve();
let otpPersistPromise = Promise.resolve();
let orderSecurityPersistPromise = Promise.resolve();
const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

const configuredOrigins = ALLOWED_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  if (configuredOrigins.includes("*") || configuredOrigins.includes(origin)) {
    return true;
  }

  return [
    /^http:\/\/localhost:\d+$/i,
    /^http:\/\/127\.0\.0\.1:\d+$/i,
    /^https:\/\/[a-z0-9-]+-\d+\.inc\d+\.devtunnels\.ms$/i,
    /^https:\/\/[a-z0-9-]+\.devtunnels\.ms$/i,
  ].some((pattern) => pattern.test(origin));
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin ${origin}`));
    },
  })
);
app.use(
  express.json({
    limit: "8mb",
    verify(req, _res, buffer) {
      if (req.originalUrl === "/api/payments/razorpay/webhook") {
        req.rawBody = buffer.toString("utf8");
      }
    },
  })
);

function sanitizeMessage(value = "") {
  return value.replace(/\s+/g, " ").replace(/[<>]/g, "").trim();
}

function isBlockedMessage(message) {
  const text = message.toLowerCase();
  return SAFETY_BLOCKLIST.some((term) => text.includes(term));
}

function createRateLimiter({
  limit = RATE_LIMIT,
  windowMs = RATE_WINDOW,
  keyPrefix = "default",
} = {}) {
  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const key = `${keyPrefix}:${ip}`;
    const entry = rateLimitStores.get(key);

    if (!entry || now > entry.resetAt) {
      rateLimitStores.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= limit) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((entry.resetAt - now) / 1000)
      );
      res.set("Retry-After", String(retryAfterSeconds));
      return res
        .status(429)
        .json({ error: "Too many requests. Please wait a moment." });
    }

    entry.count += 1;
    return next();
  };
}

const rateLimit = createRateLimiter();
const partnerPresenceRateLimit = createRateLimiter({
  limit: PARTNER_PRESENCE_RATE_LIMIT,
  keyPrefix: "partner-presence",
});
const liveMetricsRateLimit = createRateLimiter({
  limit: LIVE_METRICS_RATE_LIMIT,
  keyPrefix: "live-metrics",
});
const otpRateLimit = createRateLimiter({
  limit: OTP_RATE_LIMIT,
  keyPrefix: "partner-shift-otp",
});

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

async function verifyFirebaseIdToken(idToken) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  return payload?.users?.[0] || null;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversine(coord1, coord2) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLng = toRadians(coord2.lng - coord1.lng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(coord1.lat)) *
      Math.cos(toRadians(coord2.lat)) *
      Math.sin(dLng / 2) ** 2;

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function estimateTravelMinutes(distanceKm) {
  if (typeof distanceKm !== "number" || !Number.isFinite(distanceKm)) {
    return null;
  }

  return Math.max(5, Math.round((distanceKm / 18) * 60));
}

const STORE_LOCATIONS = {
  mio: { lat: 23.609938, lng: 88.383813, label: "Mio Amore - Bethuadahari" },
  monginis: { lat: 23.610062, lng: 88.384438, label: "Monginis" },
};
const KNOWN_SHOP_IDS = Object.keys(STORE_LOCATIONS);

function normalizeShopId(value = "") {
  const normalized = sanitizeMessage(value).toLowerCase();
  return KNOWN_SHOP_IDS.includes(normalized) ? normalized : "mio";
}

function getStoreLocation(storeKey) {
  return STORE_LOCATIONS[normalizeShopId(storeKey)] || STORE_LOCATIONS.mio;
}

function sanitizeLocation(location) {
  if (
    !location ||
    typeof location !== "object" ||
    typeof location.lat !== "number" ||
    typeof location.lng !== "number"
  ) {
    return null;
  }

  return {
    lat: location.lat,
    lng: location.lng,
  };
}

function isAdminUser(firebaseUser) {
  return Boolean(firebaseUser?.email && firebaseUser.email === ADMIN_EMAIL);
}

function createInitialShopOpsState(shopId) {
  return {
    shopId,
    announcement: "",
    menuOverrides: {},
    security: {
      customerCodeRequired: true,
      partnerVerificationRequired: true,
      proofCaptureRequired: true,
    },
    verifications: {},
    updatedAt: null,
    updatedBy: "",
  };
}

function getShopOpsState(shopId) {
  const normalizedShopId = normalizeShopId(shopId);
  const existing = shopOperations.get(normalizedShopId);

  if (existing) {
    return existing;
  }

  const initialState = createInitialShopOpsState(normalizedShopId);

  shopOperations.set(normalizedShopId, initialState);
  return initialState;
}

async function persistShopOperations() {
  const payload = Object.fromEntries(shopOperations.entries());
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(SHOP_OPERATIONS_FILE, JSON.stringify(payload, null, 2), "utf8");
}

function queueShopOperationsPersist() {
  shopOpsPersistPromise = shopOpsPersistPromise
    .then(() => persistShopOperations())
    .catch((error) => {
      console.error("Could not persist shop operations:", error?.message || error);
    });

  return shopOpsPersistPromise;
}

async function loadShopOperations() {
  try {
    const raw = await fs.readFile(SHOP_OPERATIONS_FILE, "utf8");
    const parsed = JSON.parse(raw);

    for (const shopId of KNOWN_SHOP_IDS) {
      const savedState = parsed?.[shopId];
      if (!savedState) continue;

      shopOperations.set(shopId, {
        ...createInitialShopOpsState(shopId),
        ...savedState,
        shopId,
      });
    }
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.error("Could not load persisted shop operations:", error?.message || error);
    }
  }
}

function markShopOpsUpdated(state, firebaseUser) {
  state.updatedAt = new Date().toISOString();
  state.updatedBy = firebaseUser.email || firebaseUser.localId;
}

async function persistMapToFile(filePath, sourceMap) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const payload = Object.fromEntries(sourceMap.entries());
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
}

function queuePersist(filePath, sourceMap, currentPromiseRefSetter) {
  currentPromiseRefSetter((currentPromise) =>
    currentPromise
      .then(() => persistMapToFile(filePath, sourceMap))
      .catch((error) => {
        console.error(`Could not persist ${path.basename(filePath)}:`, error?.message || error);
      })
  );
}

function queuePaymentPersist() {
  paymentPersistPromise = paymentPersistPromise
    .then(() => persistMapToFile(PAYMENT_RECORDS_FILE, paymentRecords))
    .catch((error) => {
      console.error("Could not persist payment records:", error?.message || error);
    });

  return paymentPersistPromise;
}

function queueOtpPersist() {
  otpPersistPromise = otpPersistPromise
    .then(() => persistMapToFile(PARTNER_OTP_FILE, partnerOtpSessions))
    .catch((error) => {
      console.error("Could not persist partner OTP sessions:", error?.message || error);
    });

  return otpPersistPromise;
}

function queueOrderSecurityPersist() {
  orderSecurityPersistPromise = orderSecurityPersistPromise
    .then(() => persistMapToFile(ORDER_SECURITY_FILE, orderSecurityRecords))
    .catch((error) => {
      console.error("Could not persist order security records:", error?.message || error);
    });

  return orderSecurityPersistPromise;
}

async function loadMapFromFile(filePath, targetMap) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    Object.entries(parsed || {}).forEach(([key, value]) => {
      targetMap.set(key, value);
    });
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.error(`Could not load ${path.basename(filePath)}:`, error?.message || error);
    }
  }
}

function maskEmail(value = "") {
  const [name = "", domain = ""] = String(value).split("@");
  if (!name || !domain) return value;
  return `${name.slice(0, 2)}***@${domain}`;
}

function maskPhone(value = "") {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return value;
  const lastFour = digits.slice(-4);
  return `******${lastFour}`;
}

function normalizeIndianPhoneForOtp(value = "") {
  const digits = String(value).replace(/\D/g, "");

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  if (digits.length === 13 && String(value).trim().startsWith("+")) {
    return String(value).trim();
  }

  return "";
}

function getTwilioAuthHeader() {
  const username = TWILIO_API_KEY_SID || TWILIO_ACCOUNT_SID;
  const password = TWILIO_API_KEY_SECRET || TWILIO_AUTH_TOKEN;

  if (!username || !password || !TWILIO_VERIFY_SERVICE_SID) {
    return null;
  }

  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

function getRazorpayAuthHeader() {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return null;
  }

  return `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")}`;
}

function randomOtp() {
  return String(crypto.randomInt(100000, 999999));
}

function hashValue(value = "") {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function safeEqualHex(left = "", right = "") {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function cleanupOtpSessions() {
  const now = Date.now();
  for (const [uid, session] of partnerOtpSessions.entries()) {
    if (!session?.expiresAt || session.expiresAt < now) {
      partnerOtpSessions.delete(uid);
    }
  }
}

async function sendResendOtpEmail({ to, code }) {
  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    throw new Error("Email OTP is not configured on the server.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [to],
      subject: "HungryBox Partner OTP",
      html: `<p>Your HungryBox partner shift OTP is <strong>${code}</strong>.</p><p>This code expires in 10 minutes.</p>`,
      text: `Your HungryBox partner shift OTP is ${code}. This code expires in 10 minutes.`,
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Email OTP send failed: ${payload || response.status}`);
  }
}

async function sendTwilioOtpSms({ to }) {
  const authHeader = getTwilioAuthHeader();
  if (!authHeader) {
    throw new Error("SMS OTP is not configured on the server.");
  }

  const response = await fetch(
    `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/Verifications`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        Channel: "sms",
      }),
    }
  );

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`SMS OTP send failed: ${payload || response.status}`);
  }
}

async function verifyTwilioOtpSms({ to, code }) {
  const authHeader = getTwilioAuthHeader();
  if (!authHeader) {
    throw new Error("SMS OTP is not configured on the server.");
  }

  const response = await fetch(
    `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/VerificationCheck`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        Code: code,
      }),
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || "SMS OTP verification failed.");
  }

  return payload?.status === "approved";
}

function getPaymentRecord(merchantOrderId) {
  return paymentRecords.get(merchantOrderId) || null;
}

function findPaymentByGatewayOrderId(gatewayOrderId) {
  for (const record of paymentRecords.values()) {
    if (record?.gatewayOrderId === gatewayOrderId) {
      return record;
    }
  }
  return null;
}

function upsertPaymentRecord(merchantOrderId, patch) {
  const existing = getPaymentRecord(merchantOrderId) || {
    merchantOrderId,
    gateway: "razorpay",
    webhookEvents: [],
    createdAt: new Date().toISOString(),
  };

  const nextRecord = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  paymentRecords.set(merchantOrderId, nextRecord);
  return nextRecord;
}

function getFeatureManifest() {
  return {
    shopConnect: true,
    shopMenuImageUpload: Boolean(supabaseAdmin),
    partnerAssignment: true,
    partnerShiftOtp: true,
    avatarUpload: Boolean(supabaseAdmin),
    deliveryProofUpload: Boolean(supabaseAdmin),
    partnerSecurityUpload: true,
    aiChat: true,
    smsOtp: Boolean(getTwilioAuthHeader()),
    emailOtp: Boolean(RESEND_API_KEY && RESEND_FROM_EMAIL),
    devOtpFallback: DEV_OTP_FALLBACK,
    onlinePayments: Boolean(getRazorpayAuthHeader()),
    orderSecurity: true,
  };
}

function cleanupOrderSecurityRecords() {
  const now = Date.now();

  for (const [orderId, record] of orderSecurityRecords.entries()) {
    const completedAt = Number(record?.completedAt || 0);
    const createdAt = Number(record?.createdAt || 0);

    if (
      (completedAt && now - completedAt > 7 * 24 * 60 * 60 * 1000) ||
      (createdAt && now - createdAt > 30 * 24 * 60 * 60 * 1000)
    ) {
      orderSecurityRecords.delete(orderId);
    }
  }
}

async function getPartnerCapacity(storeKey) {
  cleanupPartnerRegistry();

  const storeLocation = getStoreLocation(storeKey);
  const nearbyPartners = [];

  for (const partner of onlinePartners.values()) {
    if (
      !partner?.isOnline ||
      !partner?.isVerified ||
      !partner?.location ||
      partner?.currentOrderId
    ) {
      continue;
    }

    const metrics = await getRouteMetrics(partner.location, storeLocation);
    if ((metrics?.distanceKm ?? Infinity) <= CLAIM_RADIUS_KM) {
      nearbyPartners.push(partner);
    }
  }

  const availabilityAlert =
    nearbyPartners.length < MIN_ONLINE_PARTNERS
      ? `Low partner availability near ${storeLocation.label}. Delivery may take longer than usual.`
      : "";

  return {
    nearbyOnlinePartners: nearbyPartners.length,
    availabilityAlert,
  };
}

function cleanupPartnerRegistry() {
  const now = Date.now();

  for (const [uid, partner] of onlinePartners.entries()) {
    if (!partner.isOnline) {
      onlinePartners.delete(uid);
      continue;
    }

    if (partner.reservedUntil && partner.reservedUntil < now) {
      onlinePartners.set(uid, {
        ...partner,
        currentOrderId: null,
        reservedUntil: null,
      });
    }
  }
}

function buildFallbackRouteMetrics(from, to) {
  const lineDistanceKm = Number(haversine(from, to).toFixed(2));

  return {
    distanceKm: lineDistanceKm,
    lineDistanceKm,
    travelMinutes: estimateTravelMinutes(lineDistanceKm),
    source: "haversine-fallback",
    geometry: [from, to],
  };
}

async function getGeoapifyRouteMetrics(from, to) {
  if (!GEOAPIFY_API_KEY) {
    return null;
  }

  const url = new URL("https://api.geoapify.com/v1/routing");
  url.searchParams.set("waypoints", `${from.lat},${from.lng}|${to.lat},${to.lng}`);
  url.searchParams.set("mode", "drive");
  url.searchParams.set("units", "metric");
  url.searchParams.set("apiKey", GEOAPIFY_API_KEY);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Geoapify routing failed with ${response.status}`);
  }

  const payload = await response.json();
  const feature = payload?.features?.[0];
  const meters = feature?.properties?.distance;
  if (typeof meters !== "number") {
    return null;
  }

  const distanceKm = Number((meters / 1000).toFixed(2));
  const timeSeconds = feature?.properties?.time;
  const geometry = Array.isArray(feature?.geometry?.coordinates)
    ? feature.geometry.coordinates
        .map((point) =>
          Array.isArray(point) && point.length >= 2
            ? { lat: Number(point[1]), lng: Number(point[0]) }
            : null
        )
        .filter(
          (point) =>
            point &&
            Number.isFinite(point.lat) &&
            Number.isFinite(point.lng)
        )
    : [from, to];

  return {
    distanceKm,
    lineDistanceKm: Number(haversine(from, to).toFixed(2)),
    travelMinutes:
      typeof timeSeconds === "number"
        ? Math.max(5, Math.round(timeSeconds / 60))
        : estimateTravelMinutes(distanceKm),
    source: "geoapify-route",
    geometry: geometry.length >= 2 ? geometry : [from, to],
  };
}

async function getRouteMetrics(from, to) {
  try {
    const routeMetrics = await getGeoapifyRouteMetrics(from, to);
    if (routeMetrics) {
      return routeMetrics;
    }
  } catch (error) {
    console.warn("Geoapify routing unavailable, falling back to haversine:", error.message);
  }

  return buildFallbackRouteMetrics(from, to);
}

function decodeDataUrl(imageData = "") {
  const match = imageData.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i);
  if (!match) return null;

  const buffer = Buffer.from(match[2], "base64");
  return { mimeType: match[1].toLowerCase(), buffer };
}

function mimeTypeToExtension(mimeType = "") {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/jpeg":
    case "image/jpg":
    default:
      return "jpg";
  }
}

async function savePartnerSecurityAsset({ uid, kind, decoded }) {
  const extension = mimeTypeToExtension(decoded?.mimeType);
  const fileName = `${kind}-${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const userDir = path.join(PARTNER_SECURITY_DIR, uid);
  await fs.mkdir(userDir, { recursive: true });
  await fs.writeFile(path.join(userDir, fileName), decoded.buffer);

  return {
    assetId: path.posix.join(uid, fileName),
    storedAt: new Date().toISOString(),
  };
}

async function uploadImageToBucket({ bucket, filePath, decoded }) {
  const { error } = await supabaseAdmin.storage.from(bucket).upload(filePath, decoded.buffer, {
    cacheControl: "3600",
    upsert: true,
    contentType: "image/jpeg",
  });

  if (error) {
    throw new Error(error.message || "Upload failed.");
  }

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath);
  return data?.publicUrl || "";
}

app.post("/api/upload-avatar", rateLimit, async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({
      error: "Avatar upload is not configured on the server.",
    });
  }

  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!idToken) {
    return res.status(401).json({ error: "Missing Firebase auth token." });
  }

  const firebaseUser = await verifyFirebaseIdToken(idToken);
  if (!firebaseUser?.localId) {
    return res.status(401).json({ error: "Invalid Firebase auth token." });
  }

  const requestedUserId = sanitizeMessage(req.body?.userId || "");
  if (!requestedUserId || requestedUserId !== firebaseUser.localId) {
    return res.status(403).json({ error: "You cannot upload an avatar for another user." });
  }

  const decoded = decodeDataUrl(req.body?.imageData || "");
  if (!decoded) {
    return res.status(400).json({ error: "Avatar must be a valid base64 image payload." });
  }

  if (decoded.buffer.byteLength > MAX_AVATAR_SIZE_BYTES) {
    return res.status(400).json({ error: "Avatar image is too large." });
  }

  try {
    const filePath = `partners/${requestedUserId}/${Date.now()}.jpg`;
    const publicUrl = await uploadImageToBucket({
      bucket: "avatars",
      filePath,
      decoded,
    });
    return res.json({ publicUrl });
  } catch (error) {
    console.error("Avatar upload failed:", error?.message || error);
    return res.status(500).json({ error: "Avatar upload failed." });
  }
});

app.post("/api/upload-partner-security", rateLimit, async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!idToken) {
    return res.status(401).json({ error: "Missing Firebase auth token." });
  }

  const firebaseUser = await verifyFirebaseIdToken(idToken);
  if (!firebaseUser?.localId) {
    return res.status(401).json({ error: "Invalid Firebase auth token." });
  }

  const requestedUserId = sanitizeMessage(req.body?.userId || "");
  if (!requestedUserId || requestedUserId !== firebaseUser.localId) {
    return res.status(403).json({ error: "You cannot upload security assets for another user." });
  }

  const kind = sanitizeMessage(req.body?.kind || "").toLowerCase();
  const allowedKinds = new Set(["aadhaar-card", "shift-selfie"]);
  if (!allowedKinds.has(kind)) {
    return res.status(400).json({ error: "Unsupported partner security upload type." });
  }

  const decoded = decodeDataUrl(req.body?.imageData || "");
  if (!decoded) {
    return res.status(400).json({ error: "Security image must be a valid base64 image payload." });
  }

  if (decoded.buffer.byteLength > MAX_AVATAR_SIZE_BYTES) {
    return res.status(400).json({ error: "Security image is too large." });
  }

  try {
    const stored = await savePartnerSecurityAsset({
      uid: requestedUserId,
      kind,
      decoded,
    });

    return res.json({
      ok: true,
      kind,
      assetId: stored.assetId,
      storedAt: stored.storedAt,
    });
  } catch (error) {
    console.error("Partner security asset upload failed:", error?.message || error);
    return res.status(500).json({ error: "Partner security upload failed." });
  }
});

app.post("/api/partner-presence", partnerPresenceRateLimit, async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!idToken) {
    return res.status(401).json({ error: "Missing Firebase auth token." });
  }

  const firebaseUser = await verifyFirebaseIdToken(idToken);
  if (!firebaseUser?.localId) {
    return res.status(401).json({ error: "Invalid Firebase auth token." });
  }

  cleanupPartnerRegistry();

  const uid = firebaseUser.localId;
  const isOnline = Boolean(req.body?.isOnline);
  const location = sanitizeLocation(req.body?.location);

  if (!isOnline) {
    onlinePartners.delete(uid);
    return res.json({ ok: true, isOnline: false });
  }

  onlinePartners.set(uid, {
    uid,
    email: firebaseUser.email || "",
    name: sanitizeMessage(req.body?.name || firebaseUser.displayName || ""),
    phone: sanitizeMessage(req.body?.phone || ""),
    isVerified: Boolean(req.body?.isVerified),
    isOnline: true,
    location,
    currentOrderId: sanitizeMessage(req.body?.currentOrderId || "") || null,
    updatedAt: Date.now(),
    reservedUntil: null,
  });

  return res.json({
    ok: true,
    isOnline: true,
    location,
  });
});

app.post("/api/partner-shift/send-otp", otpRateLimit, async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!idToken) {
    return res.status(401).json({ error: "Missing Firebase auth token." });
  }

  const firebaseUser = await verifyFirebaseIdToken(idToken);
  if (!firebaseUser?.localId) {
    return res.status(401).json({ error: "Invalid Firebase auth token." });
  }

  cleanupOtpSessions();

  const channel = sanitizeMessage(req.body?.channel || "").toLowerCase();
  const recipient =
    channel === "sms"
      ? normalizeIndianPhoneForOtp(req.body?.phone || "")
      : sanitizeMessage(req.body?.email || firebaseUser.email || "");

  if (!["sms", "email"].includes(channel)) {
    return res.status(400).json({ error: "OTP channel must be sms or email." });
  }

  if (!recipient) {
    return res.status(400).json({ error: `Missing ${channel === "sms" ? "phone number" : "email address"} for OTP.` });
  }

  const smsConfigured = Boolean(getTwilioAuthHeader());
  const emailConfigured = Boolean(RESEND_API_KEY && RESEND_FROM_EMAIL);

  try {
    if (channel === "sms" && smsConfigured) {
      await sendTwilioOtpSms({ to: recipient });
      partnerOtpSessions.set(firebaseUser.localId, {
        uid: firebaseUser.localId,
        channel,
        recipient,
        provider: "twilio-verify",
        expiresAt: Date.now() + OTP_TTL_MS,
        attempts: 0,
        sentAt: Date.now(),
      });
    } else if (channel === "email" && emailConfigured) {
      const otpCode = randomOtp();
      await sendResendOtpEmail({ to: recipient, code: otpCode });
      partnerOtpSessions.set(firebaseUser.localId, {
        uid: firebaseUser.localId,
        channel,
        recipient,
        provider: "resend-email",
        codeHash: hashValue(otpCode),
        expiresAt: Date.now() + OTP_TTL_MS,
        attempts: 0,
        sentAt: Date.now(),
      });
    } else if (DEV_OTP_FALLBACK) {
      const otpCode = randomOtp();
      partnerOtpSessions.set(firebaseUser.localId, {
        uid: firebaseUser.localId,
        channel,
        recipient,
        provider: "dev-direct",
        codeHash: hashValue(otpCode),
        expiresAt: Date.now() + OTP_TTL_MS,
        attempts: 0,
        sentAt: Date.now(),
      });
      console.log(
        `[DEV OTP] Partner ${firebaseUser.localId} ${channel} OTP for ${recipient}: ${otpCode}`
      );
      await queueOtpPersist();
      return res.json({
        ok: true,
        channel,
        sentTo: channel === "sms" ? maskPhone(recipient) : maskEmail(recipient),
        expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
        devOtpPreview: otpCode,
      });
    } else {
      return res.status(503).json({
        error:
          channel === "sms"
            ? "SMS OTP is not configured on the server."
            : "Email OTP is not configured on the server.",
      });
    }

    await queueOtpPersist();
    return res.json({
      ok: true,
      channel,
      sentTo: channel === "sms" ? maskPhone(recipient) : maskEmail(recipient),
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
    });
  } catch (error) {
    return res.status(503).json({
      error: error?.message || "Could not send partner OTP.",
    });
  }
});

app.post("/api/partner-shift/verify-otp", otpRateLimit, async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!idToken) {
    return res.status(401).json({ error: "Missing Firebase auth token." });
  }

  const firebaseUser = await verifyFirebaseIdToken(idToken);
  if (!firebaseUser?.localId) {
    return res.status(401).json({ error: "Invalid Firebase auth token." });
  }

  cleanupOtpSessions();

  const session = partnerOtpSessions.get(firebaseUser.localId);
  if (!session) {
    return res.status(400).json({ error: "No active OTP session. Send OTP again." });
  }

  const otp = sanitizeMessage(req.body?.otp || "");
  if (!otp) {
    return res.status(400).json({ error: "Enter the OTP code." });
  }

  if (session.expiresAt < Date.now()) {
    partnerOtpSessions.delete(firebaseUser.localId);
    await queueOtpPersist();
    return res.status(400).json({ error: "OTP expired. Send a new OTP." });
  }

  if ((session.attempts || 0) >= OTP_MAX_ATTEMPTS) {
    partnerOtpSessions.delete(firebaseUser.localId);
    await queueOtpPersist();
    return res.status(429).json({ error: "Too many OTP attempts. Send a new OTP." });
  }

  let verified = false;

  try {
    if (session.provider === "twilio-verify") {
      verified = await verifyTwilioOtpSms({
        to: session.recipient,
        code: otp,
      });
    } else {
      verified = safeEqualHex(hashValue(otp), session.codeHash || "");
    }
  } catch (error) {
    return res.status(503).json({ error: error?.message || "OTP verification failed." });
  }

  if (!verified) {
    session.attempts = Number(session.attempts || 0) + 1;
    partnerOtpSessions.set(firebaseUser.localId, session);
    await queueOtpPersist();
    return res.status(403).json({ error: "Incorrect OTP." });
  }

  partnerOtpSessions.delete(firebaseUser.localId);
  await queueOtpPersist();

  return res.json({
    ok: true,
    verified: true,
    verifiedDate: new Date().toISOString().slice(0, 10),
    channel: session.channel,
    recipient: session.channel === "sms" ? maskPhone(session.recipient) : maskEmail(session.recipient),
  });
});

app.post("/api/order-security/register", rateLimit, async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!idToken) {
    return res.status(401).json({ error: "Missing Firebase auth token." });
  }

  const firebaseUser = await verifyFirebaseIdToken(idToken);
  if (!firebaseUser?.localId) {
    return res.status(401).json({ error: "Invalid Firebase auth token." });
  }

  const orderId = sanitizeMessage(req.body?.orderId || "");
  const secretCode = sanitizeMessage(req.body?.secretCode || "").toUpperCase();
  if (!orderId || !secretCode) {
    return res.status(400).json({ error: "Order id and secret code are required." });
  }

  cleanupOrderSecurityRecords();
  orderSecurityRecords.set(orderId, {
    orderId,
    userId: firebaseUser.localId,
    code: secretCode,
    codeHash: hashValue(secretCode),
    createdAt: Date.now(),
    completedAt: null,
  });
  await queueOrderSecurityPersist();

  return res.json({
    ok: true,
    protected: true,
    orderId,
  });
});

app.post("/api/order-security/reveal", rateLimit, async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!idToken) {
    return res.status(401).json({ error: "Missing Firebase auth token." });
  }

  const firebaseUser = await verifyFirebaseIdToken(idToken);
  if (!firebaseUser?.localId) {
    return res.status(401).json({ error: "Invalid Firebase auth token." });
  }

  const orderId = sanitizeMessage(req.body?.orderId || "");
  if (!orderId) {
    return res.status(400).json({ error: "Order id is required." });
  }

  cleanupOrderSecurityRecords();
  const record = orderSecurityRecords.get(orderId);
  if (!record?.code) {
    return res.status(404).json({ error: "No secure code is available for this order." });
  }

  const canReveal =
    record.userId === firebaseUser.localId || isAdminUser(firebaseUser);

  if (!canReveal) {
    return res.status(403).json({ error: "You are not allowed to view this code." });
  }

  return res.json({
    ok: true,
    secretCode: record.code,
  });
});

app.post("/api/order-security/verify", rateLimit, async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!idToken) {
    return res.status(401).json({ error: "Missing Firebase auth token." });
  }

  const firebaseUser = await verifyFirebaseIdToken(idToken);
  if (!firebaseUser?.localId) {
    return res.status(401).json({ error: "Invalid Firebase auth token." });
  }

  const orderId = sanitizeMessage(req.body?.orderId || "");
  const code = sanitizeMessage(req.body?.code || "").toUpperCase();
  if (!orderId || !code) {
    return res.status(400).json({ error: "Order id and code are required." });
  }

  cleanupOrderSecurityRecords();
  const record = orderSecurityRecords.get(orderId);
  if (!record?.codeHash) {
    return res.status(404).json({ error: "No secure delivery code is registered for this order." });
  }

  if (!safeEqualHex(hashValue(code), record.codeHash)) {
    return res.status(403).json({ error: "Incorrect customer code." });
  }

  return res.json({
    ok: true,
    verified: true,
  });
});

app.post("/api/order-security/complete", rateLimit, async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!idToken) {
    return res.status(401).json({ error: "Missing Firebase auth token." });
  }

  const firebaseUser = await verifyFirebaseIdToken(idToken);
  if (!firebaseUser?.localId) {
    return res.status(401).json({ error: "Invalid Firebase auth token." });
  }

  const orderId = sanitizeMessage(req.body?.orderId || "");
  if (!orderId) {
    return res.status(400).json({ error: "Order id is required." });
  }

  const existing = orderSecurityRecords.get(orderId);
  if (existing) {
    orderSecurityRecords.set(orderId, {
      ...existing,
      completedAt: Date.now(),
    });
    await queueOrderSecurityPersist();
  }

  return res.json({ ok: true });
});

app.get("/api/partner-capacity/:storeKey", liveMetricsRateLimit, async (req, res) => {
  const storeKey = normalizeShopId(req.params.storeKey || "");
  const capacity = await getPartnerCapacity(storeKey);
  return res.json({
    storeKey,
    ...capacity,
  });
});

app.post("/api/partner-dashboard-metrics", liveMetricsRateLimit, async (req, res) => {
  const requestedStores = Array.isArray(req.body?.stores)
    ? req.body.stores.map((storeKey) => normalizeShopId(storeKey)).filter(Boolean)
    : KNOWN_SHOP_IDS;
  const uniqueStores = [...new Set(requestedStores)].filter(Boolean);
  const location = sanitizeLocation(req.body?.location);

  const storeEntries = await Promise.all(
    uniqueStores.map(async (storeKey) => {
      const storeLocation = getStoreLocation(storeKey);
      const [capacity, routeMetrics] = await Promise.all([
        getPartnerCapacity(storeKey),
        location ? getRouteMetrics(location, storeLocation) : Promise.resolve(null),
      ]);

      return [
        storeKey,
        {
          store: storeLocation,
          capacity,
          routeMetrics,
        },
      ];
    })
  );

  return res.json({
    generatedAt: new Date().toISOString(),
    stores: Object.fromEntries(storeEntries),
  });
});

app.post("/api/route-metrics", liveMetricsRateLimit, async (req, res) => {
  const from = sanitizeLocation(req.body?.from);
  const to = sanitizeLocation(req.body?.to);

  if (!from || !to) {
    return res.status(400).json({
      error: "Both from and to locations are required.",
    });
  }

  const metrics = await getRouteMetrics(from, to);
  return res.json(metrics);
});

app.post("/api/assign-partner", rateLimit, async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!idToken) {
    return res.status(401).json({ error: "Missing Firebase auth token." });
  }

  const firebaseUser = await verifyFirebaseIdToken(idToken);
  if (!firebaseUser?.localId) {
    return res.status(401).json({ error: "Invalid Firebase auth token." });
  }

  const orderId = sanitizeMessage(req.body?.orderId || "");
  const storeKey = normalizeShopId(req.body?.storeKey || "");
  if (!orderId) {
    return res.status(400).json({ error: "Missing order id." });
  }

  cleanupPartnerRegistry();

  const storeLocation = getStoreLocation(storeKey);
  const capacity = await getPartnerCapacity(storeKey);
  const candidates = [];

  for (const partner of onlinePartners.values()) {
    if (!partner?.isOnline || !partner?.isVerified || !partner?.location || partner?.currentOrderId) {
      continue;
    }

    const metrics = await getRouteMetrics(partner.location, storeLocation);
    if ((metrics?.distanceKm ?? Infinity) <= CLAIM_RADIUS_KM) {
      candidates.push({
        ...partner,
        distanceKm: metrics.distanceKm,
        travelMinutes: metrics.travelMinutes,
        distanceSource: metrics.source,
        lineDistanceKm: metrics.lineDistanceKm,
      });
    }
  }

  candidates.sort((a, b) => a.distanceKm - b.distanceKm);
  const selectedPartner = candidates[0] || null;

  if (!selectedPartner) {
    return res.json({
      assignmentPending: true,
      partner: null,
      note: `No verified online partner found within ${CLAIM_RADIUS_KM} km.`,
      ...capacity,
    });
  }

  onlinePartners.set(selectedPartner.uid, {
    ...selectedPartner,
    currentOrderId: orderId,
    reservedUntil: Date.now() + PARTNER_RESERVATION_MS,
    updatedAt: Date.now(),
  });

  return res.json({
    assignmentPending: false,
    ...capacity,
    partner: {
      uid: selectedPartner.uid,
      name: selectedPartner.name || "Delivery Partner",
      phone: selectedPartner.phone || "",
      isVerified: Boolean(selectedPartner.isVerified),
      distanceKm: selectedPartner.distanceKm,
      travelMinutes: selectedPartner.travelMinutes,
      distanceSource: selectedPartner.distanceSource,
      lineDistanceKm: selectedPartner.lineDistanceKm,
    },
  });
});

app.post("/api/payments/razorpay/create-order", rateLimit, async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!idToken) {
    return res.status(401).json({ error: "Missing Firebase auth token." });
  }

  const firebaseUser = await verifyFirebaseIdToken(idToken);
  if (!firebaseUser?.localId) {
    return res.status(401).json({ error: "Invalid Firebase auth token." });
  }

  const razorpayAuth = getRazorpayAuthHeader();
  if (!razorpayAuth) {
    return res.status(503).json({ error: "Razorpay is not configured on the server." });
  }

  const merchantOrderId = sanitizeMessage(req.body?.merchantOrderId || "");
  const amount = Number(req.body?.amount || 0);
  const currency = sanitizeMessage(req.body?.currency || "INR").toUpperCase();
  const receipt = sanitizeMessage(req.body?.receipt || merchantOrderId);

  if (!merchantOrderId) {
    return res.status(400).json({ error: "Missing merchant order id." });
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: "Amount must be greater than zero." });
  }

  try {
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: razorpayAuth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency,
        receipt,
        notes: {
          merchantOrderId,
          userId: firebaseUser.localId,
          customerName: sanitizeMessage(req.body?.customer?.name || ""),
          customerEmail: sanitizeMessage(req.body?.customer?.email || firebaseUser.email || ""),
          customerPhone: sanitizeMessage(req.body?.customer?.phone || ""),
        },
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.id) {
      return res.status(502).json({
        error: payload?.error?.description || "Could not create Razorpay order.",
      });
    }

    const record = upsertPaymentRecord(merchantOrderId, {
      gateway: "razorpay",
      gatewayOrderId: payload.id,
      amount,
      amountPaise: payload.amount,
      currency: payload.currency,
      receipt,
      status: "created",
      userId: firebaseUser.localId,
      customer: {
        name: sanitizeMessage(req.body?.customer?.name || ""),
        email: sanitizeMessage(req.body?.customer?.email || firebaseUser.email || ""),
        phone: sanitizeMessage(req.body?.customer?.phone || ""),
      },
      webhookEvents: [],
    });
    await queuePaymentPersist();

    return res.json({
      ok: true,
      keyId: RAZORPAY_KEY_ID,
      merchantOrderId,
      gatewayOrderId: record.gatewayOrderId,
      amountPaise: record.amountPaise,
      currency: record.currency,
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Razorpay order creation failed.",
    });
  }
});

app.post("/api/payments/razorpay/verify-client", rateLimit, async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!idToken) {
    return res.status(401).json({ error: "Missing Firebase auth token." });
  }

  const firebaseUser = await verifyFirebaseIdToken(idToken);
  if (!firebaseUser?.localId) {
    return res.status(401).json({ error: "Invalid Firebase auth token." });
  }

  if (!RAZORPAY_KEY_SECRET) {
    return res.status(503).json({ error: "Razorpay is not configured on the server." });
  }

  const merchantOrderId = sanitizeMessage(req.body?.merchantOrderId || "");
  const gatewayOrderId = sanitizeMessage(req.body?.razorpay_order_id || "");
  const gatewayPaymentId = sanitizeMessage(req.body?.razorpay_payment_id || "");
  const gatewaySignature = sanitizeMessage(req.body?.razorpay_signature || "");

  if (!merchantOrderId || !gatewayOrderId || !gatewayPaymentId || !gatewaySignature) {
    return res.status(400).json({ error: "Missing Razorpay verification fields." });
  }

  const record = getPaymentRecord(merchantOrderId);
  if (!record) {
    return res.status(404).json({ error: "Payment record not found." });
  }

  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${gatewayOrderId}|${gatewayPaymentId}`)
    .digest("hex");

  if (!safeEqualHex(expectedSignature, gatewaySignature)) {
    return res.status(403).json({ error: "Payment signature verification failed." });
  }

  const nextRecord = upsertPaymentRecord(merchantOrderId, {
    ...record,
    gatewayOrderId,
    gatewayPaymentId,
    gatewaySignature,
    status: record.status === "paid_verified" ? "paid_verified" : "client_verified",
    clientVerifiedAt: new Date().toISOString(),
  });
  await queuePaymentPersist();

  return res.json({
    ok: true,
    merchantOrderId,
    status: nextRecord.status,
    gatewayOrderId: nextRecord.gatewayOrderId,
    gatewayPaymentId: nextRecord.gatewayPaymentId,
  });
});

app.post("/api/payments/razorpay/webhook", async (req, res) => {
  if (!RAZORPAY_WEBHOOK_SECRET) {
    return res.status(503).json({ error: "Razorpay webhook secret is not configured." });
  }

  const rawBody = req.rawBody || "";
  const webhookSignature = req.headers["x-razorpay-signature"];
  const eventId = sanitizeMessage(req.headers["x-razorpay-event-id"] || "");

  if (!rawBody || !webhookSignature) {
    return res.status(400).json({ error: "Missing webhook signature." });
  }

  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  if (!safeEqualHex(expectedSignature, String(webhookSignature))) {
    return res.status(403).json({ error: "Invalid webhook signature." });
  }

  const payload = typeof req.body === "object" ? req.body : {};
  const eventName = sanitizeMessage(payload?.event || "");
  const paymentEntity = payload?.payload?.payment?.entity || {};
  const gatewayOrderId = sanitizeMessage(paymentEntity.order_id || "");
  const record = findPaymentByGatewayOrderId(gatewayOrderId);

  if (!record) {
    return res.json({ ok: true, ignored: true });
  }

  const webhookEvents = Array.isArray(record.webhookEvents) ? [...record.webhookEvents] : [];
  if (eventId && webhookEvents.some((event) => event.id === eventId)) {
    return res.json({ ok: true, duplicate: true });
  }

  webhookEvents.push({
    id: eventId || crypto.randomUUID(),
    event: eventName,
    receivedAt: new Date().toISOString(),
  });

  const successfulEvents = new Set(["payment.captured", "order.paid"]);
  const failedEvents = new Set(["payment.failed"]);

  const nextRecord = upsertPaymentRecord(record.merchantOrderId, {
    ...record,
    gatewayPaymentId: sanitizeMessage(paymentEntity.id || record.gatewayPaymentId || ""),
    status: successfulEvents.has(eventName)
      ? "paid_verified"
      : failedEvents.has(eventName)
        ? "failed"
        : record.status || "created",
    webhookEvents,
    webhookVerifiedAt: new Date().toISOString(),
  });
  await queuePaymentPersist();

  return res.json({
    ok: true,
    merchantOrderId: nextRecord.merchantOrderId,
    status: nextRecord.status,
  });
});

app.get("/api/payments/status/:merchantOrderId", rateLimit, async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!idToken) {
    return res.status(401).json({ error: "Missing Firebase auth token." });
  }

  const firebaseUser = await verifyFirebaseIdToken(idToken);
  if (!firebaseUser?.localId) {
    return res.status(401).json({ error: "Invalid Firebase auth token." });
  }

  const merchantOrderId = sanitizeMessage(req.params.merchantOrderId || "");
  const record = getPaymentRecord(merchantOrderId);

  if (!record) {
    return res.status(404).json({ error: "Payment record not found." });
  }

  if (record.userId && record.userId !== firebaseUser.localId && !isAdminUser(firebaseUser)) {
    return res.status(403).json({ error: "You cannot access this payment record." });
  }

  return res.json({
    merchantOrderId,
    gateway: record.gateway,
    status: record.status,
    amount: record.amount,
    currency: record.currency,
    gatewayOrderId: record.gatewayOrderId || "",
    gatewayPaymentId: record.gatewayPaymentId || "",
    updatedAt: record.updatedAt || record.createdAt || "",
  });
});

app.post("/api/upload-delivery-proof", rateLimit, async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({
      error: "Delivery proof upload is not configured on the server.",
    });
  }

  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!idToken) {
    return res.status(401).json({ error: "Missing Firebase auth token." });
  }

  const firebaseUser = await verifyFirebaseIdToken(idToken);
  if (!firebaseUser?.localId) {
    return res.status(401).json({ error: "Invalid Firebase auth token." });
  }

  const requestedUserId = sanitizeMessage(req.body?.userId || "");
  const orderId = sanitizeMessage(req.body?.orderId || "");
  const stage = sanitizeMessage(req.body?.stage || "").toLowerCase();

  if (!requestedUserId || requestedUserId !== firebaseUser.localId) {
    return res.status(403).json({ error: "You cannot upload proof for another user." });
  }

  if (!orderId) {
    return res.status(400).json({ error: "Missing order id." });
  }

  if (!["pickup", "delivery", "pickup-selfie", "delivery-selfie"].includes(stage)) {
    return res.status(400).json({
      error: "Proof stage must be pickup, delivery, pickup-selfie, or delivery-selfie.",
    });
  }

  const decoded = decodeDataUrl(req.body?.imageData || "");
  if (!decoded) {
    return res.status(400).json({ error: "Proof must be a valid base64 image payload." });
  }

  if (decoded.buffer.byteLength > MAX_AVATAR_SIZE_BYTES) {
    return res.status(400).json({ error: "Proof image is too large." });
  }

  try {
    const filePath = `delivery-proofs/${orderId}/${stage}-${requestedUserId}-${Date.now()}.jpg`;
    const publicUrl = await uploadImageToBucket({
      bucket: "avatars",
      filePath,
      decoded,
    });
    return res.json({ publicUrl });
  } catch (error) {
    console.error("Delivery proof upload failed:", error?.message || error);
    return res.status(500).json({ error: "Delivery proof upload failed." });
  }
});

app.get("/api/shop-connect/:shopId", rateLimit, (req, res) => {
  const state = getShopOpsState(req.params.shopId);
  return res.json({
    shopId: state.shopId,
    announcement: state.announcement,
    menuOverrides: state.menuOverrides,
    security: state.security,
    updatedAt: state.updatedAt,
    updatedBy: state.updatedBy,
  });
});

app.get("/api/shop-connect", rateLimit, (_req, res) => {
  const shops = KNOWN_SHOP_IDS.map((shopId) => {
    const state = getShopOpsState(shopId);
    return {
      shopId,
      announcement: state.announcement,
      updatedAt: state.updatedAt,
      updatedBy: state.updatedBy,
      security: state.security,
      overrideCount: Object.keys(state.menuOverrides || {}).length,
      verificationCount: Object.keys(state.verifications || {}).length,
    };
  });

  return res.json({ shops });
});

app.get("/api/shop-connect/:shopId/verifications", rateLimit, (req, res) => {
  const state = getShopOpsState(req.params.shopId);
  return res.json({
    shopId: state.shopId,
    verifications: state.verifications,
  });
});

async function requireAdmin(req, res) {
  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!idToken) {
    res.status(401).json({ error: "Missing Firebase auth token." });
    return null;
  }

  const firebaseUser = await verifyFirebaseIdToken(idToken);
  if (!firebaseUser?.localId) {
    res.status(401).json({ error: "Invalid Firebase auth token." });
    return null;
  }

  if (!isAdminUser(firebaseUser)) {
    res.status(403).json({ error: "Only shop admins can perform this action." });
    return null;
  }

  return firebaseUser;
}

app.post("/api/shop-connect/:shopId/menu", rateLimit, async (req, res) => {
  const firebaseUser = await requireAdmin(req, res);
  if (!firebaseUser) return;

  const state = getShopOpsState(req.params.shopId);
  const itemId = sanitizeMessage(req.body?.itemId || "");
  if (!itemId) {
    return res.status(400).json({ error: "Missing item id." });
  }

  const existing = state.menuOverrides[itemId] || {};
  state.menuOverrides[itemId] = {
    ...existing,
    itemId,
    price:
      typeof req.body?.price === "number" && req.body.price >= 0
        ? req.body.price
        : existing.price,
    stockCount:
      typeof req.body?.stockCount === "number" && req.body.stockCount >= 0
        ? req.body.stockCount
        : existing.stockCount ?? 0,
    inStock:
      typeof req.body?.inStock === "boolean"
        ? req.body.inStock
        : existing.inStock ?? true,
    prepTime:
      typeof req.body?.prepTime === "number" && req.body.prepTime >= 0
        ? req.body.prepTime
        : existing.prepTime ?? 20,
    note: sanitizeMessage(req.body?.note || existing.note || ""),
    image: sanitizeMessage(req.body?.image || existing.image || ""),
    autoHideWhenOutOfStock:
      typeof req.body?.autoHideWhenOutOfStock === "boolean"
        ? req.body.autoHideWhenOutOfStock
        : Boolean(existing.autoHideWhenOutOfStock),
    availableAgainAt: sanitizeMessage(
      req.body?.availableAgainAt || existing.availableAgainAt || ""
    ),
    updatedAt: new Date().toISOString(),
    updatedBy: firebaseUser.email || firebaseUser.localId,
  };
  markShopOpsUpdated(state, firebaseUser);
  await queueShopOperationsPersist();

  return res.json({ ok: true, item: state.menuOverrides[itemId] });
});

app.post("/api/shop-connect/:shopId/menu-image", rateLimit, async (req, res) => {
  const firebaseUser = await requireAdmin(req, res);
  if (!firebaseUser) return;

  if (!supabaseAdmin) {
    return res.status(503).json({
      error: "Shop image upload is not configured on the server.",
    });
  }

  const state = getShopOpsState(req.params.shopId);
  const itemId = sanitizeMessage(req.body?.itemId || "");
  if (!itemId) {
    return res.status(400).json({ error: "Missing item id." });
  }

  const decoded = decodeDataUrl(req.body?.imageData || "");
  if (!decoded) {
    return res.status(400).json({ error: "Image must be a valid base64 payload." });
  }

  if (decoded.buffer.byteLength > MAX_AVATAR_SIZE_BYTES) {
    return res.status(400).json({ error: "Image is too large." });
  }

  try {
    const filePath = `shop-menu/${state.shopId}/${itemId}-${Date.now()}.jpg`;
    const publicUrl = await uploadImageToBucket({
      bucket: "avatars",
      filePath,
      decoded,
    });

    const existing = state.menuOverrides[itemId] || {};
    state.menuOverrides[itemId] = {
      ...existing,
      itemId,
      image: publicUrl,
      updatedAt: new Date().toISOString(),
      updatedBy: firebaseUser.email || firebaseUser.localId,
    };
    markShopOpsUpdated(state, firebaseUser);
    await queueShopOperationsPersist();

    return res.json({
      ok: true,
      image: publicUrl,
      item: state.menuOverrides[itemId],
    });
  } catch (error) {
    console.error("Shop menu image upload failed:", error?.message || error);
    return res.status(500).json({ error: "Could not upload menu image." });
  }
});

app.post("/api/shop-connect/:shopId/announcement", rateLimit, async (req, res) => {
  const firebaseUser = await requireAdmin(req, res);
  if (!firebaseUser) return;

  const state = getShopOpsState(req.params.shopId);
  state.announcement = sanitizeMessage(req.body?.announcement || "");
  markShopOpsUpdated(state, firebaseUser);
  await queueShopOperationsPersist();

  return res.json({ ok: true, announcement: state.announcement });
});

app.post("/api/shop-connect/:shopId/security", rateLimit, async (req, res) => {
  const firebaseUser = await requireAdmin(req, res);
  if (!firebaseUser) return;

  const state = getShopOpsState(req.params.shopId);
  state.security = {
    customerCodeRequired:
      typeof req.body?.customerCodeRequired === "boolean"
        ? req.body.customerCodeRequired
        : state.security.customerCodeRequired,
    partnerVerificationRequired:
      typeof req.body?.partnerVerificationRequired === "boolean"
        ? req.body.partnerVerificationRequired
        : state.security.partnerVerificationRequired,
    proofCaptureRequired:
      typeof req.body?.proofCaptureRequired === "boolean"
        ? req.body.proofCaptureRequired
        : state.security.proofCaptureRequired,
  };
  markShopOpsUpdated(state, firebaseUser);
  await queueShopOperationsPersist();

  return res.json({ ok: true, security: state.security });
});

app.post("/api/shop-connect/:shopId/order-verify", rateLimit, async (req, res) => {
  const firebaseUser = await requireAdmin(req, res);
  if (!firebaseUser) return;

  const state = getShopOpsState(req.params.shopId);
  const orderId = sanitizeMessage(req.body?.orderId || "");
  if (!orderId) {
    return res.status(400).json({ error: "Missing order id." });
  }

  state.verifications[orderId] = {
    orderId,
    shopVerified: Boolean(req.body?.shopVerified),
    packedNote: sanitizeMessage(req.body?.packedNote || ""),
    verifiedAt: new Date().toISOString(),
    verifiedBy: firebaseUser.email || firebaseUser.localId,
  };
  markShopOpsUpdated(state, firebaseUser);
  await queueShopOperationsPersist();

  return res.json({ ok: true, verification: state.verifications[orderId] });
});

app.post("/api/ai-chat", rateLimit, async (req, res) => {
  if (!req.body || typeof req.body.message !== "string") {
    return res.status(400).json({ error: "Invalid message" });
  }

  const trimmed = sanitizeMessage(req.body.message);

  if (!trimmed) {
    return res.status(400).json({ error: "Message cannot be empty" });
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer`,
    });
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
    if (!model) {
      throw new Error("Gemini is not configured");
    }

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
  res.json({
    status: "ok",
    features: getFeatureManifest(),
    services: {
      geminiConfigured: Boolean(model),
      supabaseConfigured: Boolean(supabaseAdmin),
      razorpayConfigured: Boolean(getRazorpayAuthHeader()),
      smsOtpConfigured: Boolean(getTwilioAuthHeader()),
      emailOtpConfigured: Boolean(RESEND_API_KEY && RESEND_FROM_EMAIL),
      devOtpFallbackEnabled: DEV_OTP_FALLBACK,
    },
  });
});

app.use("/api", (req, res) => {
  res.status(404).json({
    error: `API route not found: ${req.method} ${req.originalUrl}`,
    hint: "Restart the backend if you recently added new API routes.",
    features: getFeatureManifest(),
  });
});

app.use((error, _req, res, _next) => {
  console.error("Unhandled backend error:", error?.message || error);
  res.status(500).json({
    error: "Internal server error",
  });
});

async function startServer() {
  await loadShopOperations();
  await loadMapFromFile(PAYMENT_RECORDS_FILE, paymentRecords);
  await loadMapFromFile(PARTNER_OTP_FILE, partnerOtpSessions);
  await loadMapFromFile(ORDER_SECURITY_FILE, orderSecurityRecords);
  cleanupOtpSessions();
  cleanupOrderSecurityRecords();

  app.listen(PORT, () => {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is missing. AI chat will use fallback replies, but delivery APIs remain available.");
    }
    console.log(`HungryBox backend running at http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Backend failed to start:", error?.message || error);
  process.exit(1);
});
