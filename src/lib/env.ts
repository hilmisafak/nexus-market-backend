import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL zorunludur"),
  MONGO_URI: z.string().min(1, "MONGO_URI zorunludur"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET en az 16 karakter olmalı"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_SECRET: z
    .string()
    .min(16, "REFRESH_TOKEN_SECRET en az 16 karakter olmali"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("30d"),
  REFRESH_TOKEN_COOKIE_NAME: z.string().default("nm_refresh_token"),
  PAYMENT_WEBHOOK_SECRET: z
    .string()
    .min(16, "PAYMENT_WEBHOOK_SECRET en az 16 karakter olmali"),
  PAYMENT_WEBHOOK_TOLERANCE_SEC: z.coerce.number().int().positive().default(300),
  DEFAULT_TAX_RATE_PERCENT: z.coerce.number().min(0).max(100).default(20),
  DEFAULT_SHIPPING_FEE: z.coerce.number().nonnegative().default(39.9),
  AUDIT_LOG_SIGNING_SECRET: z
    .string()
    .min(16, "AUDIT_LOG_SIGNING_SECRET en az 16 karakter olmali"),
  CORS_ORIGIN: z.string().optional().default(""),
  JSON_BODY_LIMIT: z.string().default("100kb"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Env doğrulama hatası:", parsed.error.flatten().fieldErrors);
  throw new Error("Geçersiz environment değişkenleri");
}

export const env = parsed.data;
