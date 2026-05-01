import crypto from "node:crypto";
import { PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../lib/api-error.js";
import { env } from "../../lib/env.js";
import Product from "../products/product.model.js";

type SimulatePaymentInput = {
  orderId: string;
  outcome: "SUCCESS" | "FAILED";
  providerRef?: string;
};

type WebhookPayload = {
  orderId: string;
  event: "payment_succeeded" | "payment_failed_final";
  providerRef?: string;
};

const releaseReservedStock = async (orderId: string) => {
  const orderWithItems = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!orderWithItems) {
    throw new ApiError(404, "Siparis bulunamadi");
  }

  await Promise.all(
    orderWithItems.items.map((item) =>
      Product.updateOne(
        { _id: item.mongoProductId, reservedStock: { $gte: item.quantity } },
        { $inc: { reservedStock: -item.quantity } },
      ),
    ),
  );
};

const applySuccessfulPayment = async (orderId: string) => {
  const orderWithItems = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!orderWithItems) {
    throw new ApiError(404, "Siparis bulunamadi");
  }

  for (const item of orderWithItems.items) {
    const updated = await Product.findOneAndUpdate(
      {
        _id: item.mongoProductId,
        reservedStock: { $gte: item.quantity },
        stock: { $gte: item.quantity },
      },
      { $inc: { reservedStock: -item.quantity, stock: -item.quantity } },
    );
    if (!updated) {
      throw new ApiError(409, "Stok kesinlestirme basarisiz oldu");
    }
  }
};

const createPaymentAttempt = async (
  userId: string,
  orderId: string,
  amount: Prisma.Decimal | number | string,
  outcome: "SUCCESS" | "FAILED",
  providerRef?: string,
) => {
  const paymentStatus =
    outcome === "SUCCESS" ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;
  return prisma.paymentTransaction.create({
    data: {
      amount,
      status: paymentStatus,
      providerRef,
      userId,
      orderId,
    },
  });
};

export const simulatePayment = async (userId: string, payload: SimulatePaymentInput) => {
  const order = await prisma.order.findFirst({
    where: { id: payload.orderId, buyerId: userId },
  });

  if (!order) {
    throw new ApiError(404, "Siparis bulunamadi");
  }

  if (order.status !== "PENDING") {
    throw new ApiError(400, "Sadece PENDING siparisler odeme alabilir");
  }

  const payment = await createPaymentAttempt(
    userId,
    order.id,
    order.totalAmount,
    payload.outcome,
    payload.providerRef,
  );

  if (payload.outcome === "SUCCESS") {
    await applySuccessfulPayment(order.id);
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "PAID" },
    });
  }

  return payment;
};

export const retryPayment = async (userId: string, payload: SimulatePaymentInput) => {
  const order = await prisma.order.findFirst({
    where: { id: payload.orderId, buyerId: userId },
    include: { payments: true },
  });
  if (!order) {
    throw new ApiError(404, "Siparis bulunamadi");
  }
  if (order.status !== "PENDING") {
    throw new ApiError(400, "Sadece PENDING siparislerde retry yapilabilir");
  }

  const hasFailedAttempt = order.payments.some((p) => p.status === PaymentStatus.FAILED);
  if (!hasFailedAttempt) {
    throw new ApiError(400, "Retry icin once en az bir FAILED odeme olmali");
  }

  return simulatePayment(userId, payload);
};

export const signWebhookPayload = (rawBody: string) =>
  crypto.createHmac("sha256", env.PAYMENT_WEBHOOK_SECRET).update(rawBody).digest("hex");

const signWebhookWithTimestamp = (timestamp: string, rawBody: string) =>
  crypto
    .createHmac("sha256", env.PAYMENT_WEBHOOK_SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

const safeCompareHex = (a: string, b: string) => {
  const aBuf = Buffer.from(a, "hex");
  const bBuf = Buffer.from(b, "hex");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
};

export const processPaymentWebhook = async (
  rawBody: string,
  signature: string | undefined,
  timestampHeader: string | undefined,
) => {
  if (!signature) {
    throw new ApiError(401, "Webhook imzasi eksik");
  }
  if (!timestampHeader) {
    throw new ApiError(401, "Webhook timestamp eksik");
  }

  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp)) {
    throw new ApiError(401, "Webhook timestamp gecersiz");
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - timestamp) > env.PAYMENT_WEBHOOK_TOLERANCE_SEC) {
    throw new ApiError(401, "Webhook timestamp suresi dolmus");
  }

  const expected = signWebhookWithTimestamp(timestampHeader, rawBody);
  if (!safeCompareHex(signature, expected)) {
    throw new ApiError(401, "Webhook imzasi gecersiz");
  }

  const payload = JSON.parse(rawBody) as WebhookPayload;
  const order = await prisma.order.findUnique({ where: { id: payload.orderId } });
  if (!order) {
    throw new ApiError(404, "Siparis bulunamadi");
  }

  if (payload.event === "payment_succeeded") {
    if (order.status === "PAID") {
      return { accepted: true, idempotent: true };
    }
    if (["CANCELLED", "REFUNDED"].includes(order.status)) {
      throw new ApiError(409, `${order.status} siparis odeme basarili olarak islenemez`);
    }
    await createPaymentAttempt(
      order.buyerId,
      order.id,
      order.totalAmount,
      "SUCCESS",
      payload.providerRef,
    );
    await applySuccessfulPayment(order.id);
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "PAID" },
    });
    return { accepted: true, idempotent: false };
  }

  if (payload.event === "payment_failed_final") {
    if (order.status === "CANCELLED") {
      return { accepted: true, idempotent: true };
    }
    if (["PAID", "REFUNDED"].includes(order.status)) {
      throw new ApiError(409, `${order.status} siparis final-failed olarak islenemez`);
    }
    await createPaymentAttempt(
      order.buyerId,
      order.id,
      order.totalAmount,
      "FAILED",
      payload.providerRef,
    );
    await releaseReservedStock(order.id);
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });
    return { accepted: true, idempotent: false };
  }

  throw new ApiError(400, "Desteklenmeyen webhook eventi");
};
