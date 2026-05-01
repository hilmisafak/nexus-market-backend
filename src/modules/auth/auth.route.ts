import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
  authCredentialLimiter,
  authRefreshLimiter,
} from "../../middlewares/rateLimit.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  loginHandler,
  logoutAllHandler,
  logoutHandler,
  meHandler,
  refreshHandler,
  registerHandler,
} from "./auth.controller.js";
import { loginSchema, registerSchema } from "./auth.schema.js";

const authRouter = Router();

authRouter.post(
  "/register",
  authCredentialLimiter,
  validate(registerSchema),
  asyncHandler(registerHandler),
);
authRouter.post(
  "/login",
  authCredentialLimiter,
  validate(loginSchema),
  asyncHandler(loginHandler),
);
authRouter.post("/refresh", authRefreshLimiter, asyncHandler(refreshHandler));
authRouter.post("/logout", asyncHandler(logoutHandler));
authRouter.post("/logout-all", requireAuth, asyncHandler(logoutAllHandler));
authRouter.get("/me", requireAuth, asyncHandler(meHandler));

export default authRouter;
