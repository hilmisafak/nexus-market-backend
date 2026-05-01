import rateLimit from "express-rate-limit";

const jsonMessage = { success: false, message: "Cok fazla istek, lutfen bekleyin" };

/** Kayit / giris brute-force korumasi */
export const authCredentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage,
});

/** Refresh token endpoint (cookie + rotation) */
export const authRefreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage,
});
