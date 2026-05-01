import type { NextFunction, Request, Response } from "express";
import type { Role } from "../lib/roles.js";
import { ApiError } from "../lib/api-error.js";

export const requireRole = (...roles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, "Kimlik dogrulamasi gerekli"));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, "Bu islem icin yetkiniz yok"));
    }

    return next();
  };
};
