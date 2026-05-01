import { Router } from "express";
import { Role } from "../../lib/roles.js";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createCouponHandler,
  listActiveCouponsHandler,
  updateCouponStatusHandler,
} from "./coupon.controller.js";
import { createCouponSchema, updateCouponStatusSchema } from "./coupon.schema.js";

const couponRouter = Router();

couponRouter.get("/active", asyncHandler(listActiveCouponsHandler));
couponRouter.post(
  "/",
  requireAuth,
  requireRole(Role.ADMIN),
  validate(createCouponSchema),
  asyncHandler(createCouponHandler),
);
couponRouter.patch(
  "/:code/status",
  requireAuth,
  requireRole(Role.ADMIN),
  validate(updateCouponStatusSchema),
  asyncHandler(updateCouponStatusHandler),
);

export default couponRouter;
