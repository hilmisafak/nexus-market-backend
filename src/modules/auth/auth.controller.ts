import type { Request, Response } from "express";
import { env } from "../../lib/env.js";
import {
  login,
  logout,
  logoutAllDevices,
  me,
  refresh,
  register,
} from "./auth.service.js";

const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/auth",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

export const registerHandler = async (req: Request, res: Response) => {
  const result = await register(req.body, {
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  res.cookie(env.REFRESH_TOKEN_COOKIE_NAME, result.refreshToken, refreshCookieOptions);
  res.status(201).json({
    success: true,
    accessToken: result.accessToken,
    user: result.user,
  });
};

export const loginHandler = async (req: Request, res: Response) => {
  const result = await login(req.body, {
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  res.cookie(env.REFRESH_TOKEN_COOKIE_NAME, result.refreshToken, refreshCookieOptions);
  res.status(200).json({
    success: true,
    accessToken: result.accessToken,
    user: result.user,
  });
};

export const meHandler = async (req: Request, res: Response) => {
  const profile = await me(req.user!.userId);
  res.status(200).json({ success: true, data: profile });
};

export const refreshHandler = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.[env.REFRESH_TOKEN_COOKIE_NAME];
  if (!refreshToken) {
    res.status(401).json({ success: false, message: "Refresh token gerekli" });
    return;
  }

  const result = await refresh(refreshToken, {
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  res.cookie(env.REFRESH_TOKEN_COOKIE_NAME, result.refreshToken, refreshCookieOptions);
  res.status(200).json({
    success: true,
    accessToken: result.accessToken,
    user: result.user,
  });
};

export const logoutHandler = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.[env.REFRESH_TOKEN_COOKIE_NAME];
  if (refreshToken) {
    await logout(refreshToken);
  }

  res.clearCookie(env.REFRESH_TOKEN_COOKIE_NAME, {
    ...refreshCookieOptions,
    maxAge: undefined,
  });
  res.status(200).json({ success: true, message: "Cikis yapildi" });
};

export const logoutAllHandler = async (req: Request, res: Response) => {
  await logoutAllDevices(req.user!.userId);

  res.clearCookie(env.REFRESH_TOKEN_COOKIE_NAME, {
    ...refreshCookieOptions,
    maxAge: undefined,
  });
  res.status(200).json({
    success: true,
    message: "Tum cihazlardan cikis yapildi",
  });
};
