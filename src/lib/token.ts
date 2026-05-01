import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { Role } from "./roles.js";
import type { SignOptions } from "jsonwebtoken";
import { env } from "./env.js";

type AccessPayload = {
  userId: string;
  role: Role;
  email: string;
};

type RefreshPayload = {
  sid: string;
  userId: string;
};

export const signAccessToken = (payload: AccessPayload) => {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
};

export const signRefreshToken = (payload: RefreshPayload) => {
  const options: SignOptions = {
    expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, options);
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, env.REFRESH_TOKEN_SECRET) as RefreshPayload;
};

export const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");
