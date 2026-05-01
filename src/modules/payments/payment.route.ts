import { Router } from "express";
import express from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  paymentWebhookHandler,
  retryPaymentHandler,
  simulatePaymentHandler,
} from "./payment.controller.js";
import { retryPaymentSchema, simulatePaymentSchema } from "./payment.schema.js";

const paymentRouter = Router();

paymentRouter.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  asyncHandler(paymentWebhookHandler),
);

paymentRouter.use(requireAuth);
paymentRouter.post("/simulate", validate(simulatePaymentSchema), asyncHandler(simulatePaymentHandler));
paymentRouter.post("/retry", validate(retryPaymentSchema), asyncHandler(retryPaymentHandler));

export default paymentRouter;
