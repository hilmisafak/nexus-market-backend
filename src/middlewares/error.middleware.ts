import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ApiError } from "../lib/api-error.js";
import { env } from "../lib/env.js";

type ErrorShape = {
  statusCode?: number;
  message?: string;
  details?: unknown;
};

export const errorHandler = (
  err: ErrorShape,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    console.error("Prisma hatasi:", err.code);
    return res.status(400).json({
      success: false,
      message: "Veritabani istegi gecersiz",
      details: null,
    });
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    console.error("Prisma validation hatasi");
    return res.status(400).json({
      success: false,
      message: "Veritabani validasyon hatasi",
      details: null,
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details:
        env.NODE_ENV === "production" && err.statusCode >= 500
          ? null
          : (err.details ?? null),
    });
  }

  const statusCode = err.statusCode ?? 500;
  const isProd = env.NODE_ENV === "production";
  const serverError = statusCode >= 500;
  const message =
    serverError && isProd
      ? "Beklenmeyen sunucu hatasi"
      : err.message ?? "Istek islenemedi";

  if (serverError) {
    if (isProd) {
      console.error("Sunucu hatasi:", err instanceof Error ? err.message : String(err));
    } else {
      console.error(err);
    }
  }

  return res.status(statusCode).json({
    success: false,
    message,
    details: serverError && isProd ? null : (err.details ?? null),
  });
};
