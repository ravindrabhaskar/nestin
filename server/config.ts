import crypto from "node:crypto";
import path from "node:path";

const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

function requireSecret(name: string, fallbackForDev: () => string): string {
  const value = process.env[name];
  if (value && value.length >= 32) return value;
  if (isProduction) {
    throw new Error(`${name} must be set to a random string of at least 32 characters in production`);
  }
  return fallbackForDev();
}

// A per-process random secret is used in dev/test when none is configured. Tokens will not
// survive a restart, which is the desired behaviour for an unconfigured secret.
const devSecret = crypto.randomBytes(48).toString("base64url");

export const config = {
  env: process.env.NODE_ENV || "development",
  isProduction,
  isTest,
  port: Number(process.env.PORT || 3000),
  appUrl: process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`,

  databasePath: isTest ? ":memory:" : process.env.DATABASE_PATH || path.join(process.cwd(), "data", "nestin.db"),
  seedDemoData: process.env.SEED_DEMO_DATA !== "false",

  jwtSecret: requireSecret("JWT_SECRET", () => devSecret),
  jwtTtlSeconds: Number(process.env.JWT_TTL_SECONDS || 60 * 60 * 24 * 7),

  corsOrigins: (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  superAdmin: {
    email: (process.env.SUPER_ADMIN_EMAIL || "admin@nestin.io").toLowerCase(),
    password: process.env.SUPER_ADMIN_PASSWORD || (isProduction ? "" : "Admin@NestIn2026"),
    accessCode: process.env.SUPER_ADMIN_ACCESS_CODE || (isProduction ? "" : "NESTIN-SUPER-ADMIN-2026"),
  },

  demoPassword: process.env.DEMO_PASSWORD || "NestIn@2026",

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || "",
    keySecret: process.env.RAZORPAY_KEY_SECRET || "",
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "",
  },

  rateLimit: {
    authWindowMs: 15 * 60 * 1000,
    authMaxAttempts: Number(process.env.AUTH_MAX_ATTEMPTS || 20),
    apiWindowMs: 60 * 1000,
    apiMaxRequests: Number(process.env.API_MAX_REQUESTS_PER_MINUTE || 600),
  },
};

export type AppConfig = typeof config;
