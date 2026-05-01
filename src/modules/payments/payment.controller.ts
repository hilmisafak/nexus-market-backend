import type { Request, Response } from "express";
import { processPaymentWebhook, retryPayment, simulatePayment } from "./payment.service.js";

export const simulatePaymentHandler = async (req: Request, res: Response) => {
  const payment = await simulatePayment(req.user!.userId, req.body);
  res.status(201).json({ success: true, data: payment });
};

export const retryPaymentHandler = async (req: Request, res: Response) => {
  const payment = await retryPayment(req.user!.userId, req.body);
  res.status(201).json({ success: true, data: payment });
};

export const paymentWebhookHandler = async (req: Request, res: Response) => {
  const rawBody =
    req.rawBody ??
    (Buffer.isBuffer(req.body) ? req.body.toString("utf8") : JSON.stringify(req.body ?? {}));
  const result = await processPaymentWebhook(
    rawBody,
    req.header("x-webhook-signature"),
    req.header("x-webhook-timestamp"),
  );
  res.status(200).json({ success: true, data: result });
};
