import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "../lib/roles.js";
import { env } from "../lib/env.js";
import { ApiError } from "../lib/api-error.js";

type JwtPayload = {
  userId: string;
  role: Role;
  email: string;
};

export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(new ApiError(401, "Yetkisiz erisim"));
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = payload;
    return next();
  } catch {
    return next(new ApiError(401, "Gecersiz token"));
  }
};
