import crypto from "node:crypto";
import { CouponType } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../lib/api-error.js";
import { Role } from "../../lib/roles.js";
import { env } from "../../lib/env.js";
import Cart from "../cart/cart.model.js";
import Product from "../products/product.model.js";
import Shipment from "../shipments/shipment.model.js";
import OrderAuditLog from "./order-audit.model.js";
import { assertOrderStatusTransition, type NextManagedStatus } from "./order-policy.js";

const roundMoney = (value: number) => Number(value.toFixed(2));
const normalizeCouponCode = (code?: string) => code?.trim().toUpperCase();

const reserveProductStocks = async (
  items: Array<{ productId: string; quantity: number }>,
) => {
  const reserved: Array<{ productId: string; quantity: number }> = [];

  try {
    for (const item of items) {
      const updated = await Product.findOneAndUpdate(
        {
          _id: item.productId,
          $expr: {
            $gte: [{ $subtract: ["$stock", "$reservedStock"] }, item.quantity],
          },
        },
        { $inc: { reservedStock: item.quantity } },
        { returnDocument: "after" },
      );

      if (!updated) {
        throw new ApiError(400, `Yetersiz stok veya urun bulunamadi: ${item.productId}`);
      }
      reserved.push({ productId: item.productId, quantity: item.quantity });
    }
  } catch (error) {
    await Promise.all(
      reserved.map((r) =>
        Product.updateOne({ _id: r.productId }, { $inc: { reservedStock: -r.quantity } }),
      ),
    );
    throw error;
  }
};

export const createOrderFromCart = async (buyerId: string, payload: CreateOrderInput) => {
  const cart = await Cart.findOne({ userId: buyerId });
  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, "Siparis olusturmak icin sepet bos olamaz");
  }

  const productIds = cart.items.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: productIds } }).lean();
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  for (const item of cart.items) {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new ApiError(400, `Sepetteki urun bulunamadi: ${item.productId}`);
    }
  }

  const itemsToReserve = cart.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
  }));
  await reserveProductStocks(itemsToReserve);

  const subtotalAmount = roundMoney(
    cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
  );

  try {
    const buyer = await prisma.user.findUnique({
      where: { id: buyerId },
      select: { firstName: true, lastName: true, email: true },
    });
    if (!buyer) {
      throw new ApiError(404, "Kullanici bulunamadi");
    }

    const address = await prisma.address.findFirst({
      where: { id: payload.addressId, userId: buyerId },
    });
    if (!address) {
      throw new ApiError(404, "Gecerli teslimat adresi bulunamadi");
    }

    const couponCode = normalizeCouponCode(payload.couponCode);
    let discountAmount = 0;
    let couponId: string | null = null;

    if (couponCode) {
      const now = new Date();
      const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
      if (!coupon || !coupon.isActive) {
        throw new ApiError(400, "Kupon gecersiz veya pasif");
      }
      if (coupon.startsAt && coupon.startsAt > now) {
        throw new ApiError(400, "Kupon suresi henuz baslamamis");
      }
      if (coupon.endsAt && coupon.endsAt < now) {
        throw new ApiError(400, "Kupon suresi dolmus");
      }
      if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
        throw new ApiError(400, "Kupon kullanim limiti dolmus");
      }
      if (coupon.minOrderAmount && subtotalAmount < Number(coupon.minOrderAmount)) {
        throw new ApiError(400, "Kupon minimum sepet tutari kosulunu saglamiyor");
      }

      if (coupon.type === CouponType.PERCENT) {
        discountAmount = roundMoney((subtotalAmount * Number(coupon.amount)) / 100);
        if (coupon.maxDiscount) {
          discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
        }
      } else {
        discountAmount = Math.min(subtotalAmount, Number(coupon.amount));
      }
      couponId = coupon.id;
    }

    const discountedSubtotal = Math.max(0, roundMoney(subtotalAmount - discountAmount));
    const taxAmount = roundMoney((discountedSubtotal * env.DEFAULT_TAX_RATE_PERCENT) / 100);
    const shippingAmount = discountedSubtotal > 0 ? roundMoney(env.DEFAULT_SHIPPING_FEE) : 0;
    const totalAmount = roundMoney(discountedSubtotal + taxAmount + shippingAmount);

    const order = await prisma.order.create({
      data: {
        buyerId,
        subtotalAmount,
        taxAmount,
        shippingAmount,
        discountAmount,
        totalAmount,
        couponCode: couponCode ?? null,
        shippingAddressSnapshot: {
          label: address.label,
          fullName: address.fullName,
          phone: address.phone,
          country: address.country,
          city: address.city,
          district: address.district,
          line1: address.line1,
          line2: address.line2,
          postalCode: address.postalCode,
          buyerEmail: buyer.email,
        },
        items: {
          create: cart.items.map((item) => ({
            quantity: item.quantity,
            unitPrice: roundMoney(item.unitPrice),
            mongoProductId: item.productId,
          })),
        },
      },
      include: {
        items: true,
        payments: true,
      },
    });

    if (couponId) {
      await prisma.coupon.update({
        where: { id: couponId },
        data: { usedCount: { increment: 1 } },
      });
    }

    // Order after cart checkout: clear cart
    cart.items = [];
    cart.total = 0;
    await cart.save();

    return order;
  } catch (error) {
    await Promise.all(
      itemsToReserve.map((item) =>
        Product.updateOne(
          { _id: item.productId, reservedStock: { $gte: item.quantity } },
          { $inc: { reservedStock: -item.quantity } },
        ),
      ),
    );
    throw error;
  }
};

type CreateOrderInput = {
  addressId: string;
  couponCode?: string;
};

type Actor = {
  userId: string;
  role: Role;
};

const writeOrderAudit = async (
  orderId: string,
  actor: Actor,
  action: string,
  reasonCode?: string,
  note?: string,
  meta?: Record<string, unknown>,
) => {
  const prev = await OrderAuditLog.findOne({ orderId }).sort({ createdAt: -1, _id: -1 }).lean();
  const prevHash = prev?.hash ?? "";
  const payload = JSON.stringify({
    orderId,
    actorId: actor.userId,
    actorRole: actor.role,
    action,
    reasonCode: reasonCode ?? "",
    note: note ?? "",
    meta: meta ?? {},
    prevHash,
  });
  const hash = crypto
    .createHmac("sha256", env.AUDIT_LOG_SIGNING_SECRET)
    .update(payload)
    .digest("hex");

  await OrderAuditLog.create({
    orderId,
    actorId: actor.userId,
    actorRole: actor.role,
    action,
    reasonCode,
    note,
    meta,
    prevHash,
    hash,
  });
};

export const listMyOrders = async (buyerId: string) => {
  return prisma.order.findMany({
    where: { buyerId },
    include: {
      items: true,
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

export const getOrderByIdForBuyer = async (buyerId: string, orderId: string) => {
  const order = await prisma.order.findFirst({
    where: { id: orderId, buyerId },
    include: {
      items: true,
      payments: true,
    },
  });
  if (!order) {
    throw new ApiError(404, "Siparis bulunamadi");
  }
  return order;
};

const actorCanShipOrder = async (actor: Actor, mongoProductIds: string[]) => {
  if (actor.role === Role.ADMIN) return true;
  if (actor.role !== Role.SELLER) return false;
  const products = await Product.find({ _id: { $in: mongoProductIds } }).lean();
  if (products.length !== mongoProductIds.length) return false;
  return products.every((p) => p.sellerId === actor.userId);
};

export const updateOrderStatus = async (
  actor: Actor,
  orderId: string,
  nextStatus: NextManagedStatus,
  meta?: { carrier?: string; trackingNumber?: string; note?: string; reasonCode?: string },
) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) {
    throw new ApiError(404, "Siparis bulunamadi");
  }

  const current = order.status;
  const isBuyerOwner = actor.userId === order.buyerId;
  const canShip = await actorCanShipOrder(
    actor,
    order.items.map((i) => i.mongoProductId),
  );

  if (actor.role === Role.ADMIN && !meta?.reasonCode) {
    throw new ApiError(400, "Admin islemleri icin reasonCode zorunludur");
  }
  assertOrderStatusTransition({
    current,
    next: nextStatus,
    actorRole: actor.role,
    isBuyerOwner,
    canShipByOwnership: canShip,
  });

  if (nextStatus === "SHIPPED") {
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: "SHIPPED" },
      include: { items: true, payments: true },
    });
    await Shipment.findOneAndUpdate(
      { orderId },
      {
        $set: {
          orderId,
          buyerId: order.buyerId,
          sellerId: actor.role === Role.SELLER ? actor.userId : null,
          carrier: meta?.carrier ?? "",
          trackingNumber: meta?.trackingNumber ?? "",
          status: "SHIPPED",
        },
        $push: { events: { status: "SHIPPED", note: meta?.note ?? "Kargoya verildi", at: new Date() } },
      },
      { upsert: true, returnDocument: "after" },
    );
    await writeOrderAudit(orderId, actor, "ORDER_STATUS_CHANGED", meta?.reasonCode, meta?.note, {
      from: current,
      to: "SHIPPED",
      carrier: meta?.carrier,
      trackingNumber: meta?.trackingNumber,
    });
    return updated;
  }

  if (nextStatus === "DELIVERED") {
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: "DELIVERED" },
      include: { items: true, payments: true },
    });
    await Shipment.findOneAndUpdate(
      { orderId },
      {
        $set: { status: "DELIVERED" },
        $push: { events: { status: "DELIVERED", note: meta?.note ?? "Teslim edildi", at: new Date() } },
      },
      { upsert: true, returnDocument: "after" },
    );
    await writeOrderAudit(orderId, actor, "ORDER_STATUS_CHANGED", meta?.reasonCode, meta?.note, {
      from: current,
      to: "DELIVERED",
    });
    return updated;
  }

  if (nextStatus === "CANCELLED") {
    await Promise.all(
      order.items.map((item) =>
        Product.updateOne(
          { _id: item.mongoProductId, reservedStock: { $gte: item.quantity } },
          { $inc: { reservedStock: -item.quantity } },
        ),
      ),
    );
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
      include: { items: true, payments: true },
    });
    await Shipment.findOneAndUpdate(
      { orderId },
      {
        $set: { status: "CANCELLED" },
        $push: { events: { status: "CANCELLED", note: meta?.note ?? "Siparis iptal edildi", at: new Date() } },
      },
      { upsert: true, returnDocument: "after" },
    );
    await writeOrderAudit(orderId, actor, "ORDER_STATUS_CHANGED", meta?.reasonCode, meta?.note, {
      from: current,
      to: "CANCELLED",
    });
    return updated;
  }

  if (nextStatus === "REFUNDED") {
    const existingRefund = await prisma.paymentTransaction.findFirst({
      where: { orderId, status: "REFUNDED" },
    });
    if (existingRefund) {
      throw new ApiError(409, "Bu siparis icin refund zaten uygulanmis");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const refundTx = await tx.paymentTransaction.create({
        data: {
          amount: order.totalAmount,
          status: "REFUNDED",
          providerRef: `refund-${Date.now()}`,
          userId: order.buyerId,
          orderId: order.id,
        },
      });
      await tx.walletLedgerEntry.createMany({
        data: [
          {
            transactionId: refundTx.id,
            orderId: order.id,
            userId: null,
            accountType: "PLATFORM_ESCROW",
            entryType: "DEBIT",
            amount: order.totalAmount,
            reasonCode: meta?.reasonCode ?? "ADMIN_REFUND",
          },
          {
            transactionId: refundTx.id,
            orderId: order.id,
            userId: order.buyerId,
            accountType: "USER_WALLET",
            entryType: "CREDIT",
            amount: order.totalAmount,
            reasonCode: meta?.reasonCode ?? "ADMIN_REFUND",
          },
        ],
      });
      await tx.wallet.update({
        where: { userId: order.buyerId },
        data: { balance: { increment: order.totalAmount } },
      });
      return tx.order.update({
        where: { id: orderId },
        data: { status: "REFUNDED" },
        include: { items: true, payments: true },
      });
    });
    await writeOrderAudit(orderId, actor, "ORDER_REFUNDED", meta?.reasonCode, meta?.note, {
      from: current,
      to: "REFUNDED",
      amount: String(order.totalAmount),
    });
    return updated;
  }

  throw new ApiError(400, "Gecersiz status guncellemesi");
};

export const getShipmentTrackingForBuyer = async (buyerId: string, orderId: string) => {
  const order = await prisma.order.findFirst({ where: { id: orderId, buyerId } });
  if (!order) {
    throw new ApiError(404, "Siparis bulunamadi");
  }
  const shipment = await Shipment.findOne({ orderId }).lean();
  return shipment ?? null;
};

export const appendShipmentEvent = async (
  actor: Actor,
  orderId: string,
  payload: {
    status: "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
    note?: string;
    reasonCode?: string;
  },
) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) throw new ApiError(404, "Siparis bulunamadi");

  const canShip = await actorCanShipOrder(
    actor,
    order.items.map((i) => i.mongoProductId),
  );
  if (!canShip) throw new ApiError(403, "Kargo eventi ekleme yetkisi yok");
  if (actor.role === Role.ADMIN && !payload.reasonCode) {
    throw new ApiError(400, "Admin islemleri icin reasonCode zorunludur");
  }

  const shipment = await Shipment.findOneAndUpdate(
    { orderId },
    {
      $set: { status: payload.status },
      $push: { events: { status: payload.status, note: payload.note ?? "", at: new Date() } },
    },
    { upsert: true, returnDocument: "after" },
  );

  if (payload.status === "DELIVERED" && order.status === "SHIPPED") {
    await prisma.order.update({ where: { id: orderId }, data: { status: "DELIVERED" } });
  }
  if (payload.status === "CANCELLED" && ["PENDING", "PAID", "SHIPPED"].includes(order.status)) {
    await prisma.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
  }

  await writeOrderAudit(
    orderId,
    actor,
    "SHIPMENT_EVENT_APPENDED",
    payload.reasonCode,
    payload.note,
    {
      status: payload.status,
    },
  );

  return shipment;
};

export const listOrderAuditLogs = async (actor: Actor, orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) throw new ApiError(404, "Siparis bulunamadi");

  const isBuyerOwner = actor.userId === order.buyerId;
  const canShip = await actorCanShipOrder(
    actor,
    order.items.map((i) => i.mongoProductId),
  );
  if (!(actor.role === Role.ADMIN || isBuyerOwner || canShip)) {
    throw new ApiError(403, "Audit log goruntuleme yetkisi yok");
  }

  return OrderAuditLog.find({ orderId }).sort({ createdAt: -1 }).lean();
};

export const verifyOrderAuditLogChain = async (actor: Actor, orderId: string) => {
  if (actor.role !== Role.ADMIN) {
    throw new ApiError(403, "Audit dogrulama sadece admin icin acik");
  }

  const logs = await OrderAuditLog.find({ orderId }).sort({ createdAt: 1, _id: 1 }).lean();
  let prevHash = "";

  for (let i = 0; i < logs.length; i += 1) {
    const log = logs[i]!;
    const expectedPrevHash = log.prevHash ?? "";
    if (expectedPrevHash !== prevHash) {
      return {
        valid: false,
        checkedCount: i,
        brokenAt: String(log._id),
        reason: "prevHash mismatch",
      };
    }

    const payload = JSON.stringify({
      orderId: log.orderId,
      actorId: log.actorId,
      actorRole: log.actorRole,
      action: log.action,
      reasonCode: log.reasonCode ?? "",
      note: log.note ?? "",
      meta: log.meta ?? {},
      prevHash: expectedPrevHash,
    });
    const expectedHash = crypto
      .createHmac("sha256", env.AUDIT_LOG_SIGNING_SECRET)
      .update(payload)
      .digest("hex");

    if (expectedHash !== log.hash) {
      return {
        valid: false,
        checkedCount: i,
        brokenAt: String(log._id),
        reason: "hash mismatch",
      };
    }
    prevHash = log.hash;
  }

  return {
    valid: true,
    checkedCount: logs.length,
    brokenAt: null,
    reason: null,
  };
};

export const getOrderLedgerForActor = async (actor: Actor, orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) {
    throw new ApiError(404, "Siparis bulunamadi");
  }

  const isBuyerOwner = actor.userId === order.buyerId;
  const canShip = await actorCanShipOrder(
    actor,
    order.items.map((i) => i.mongoProductId),
  );
  if (!(actor.role === Role.ADMIN || isBuyerOwner || canShip)) {
    throw new ApiError(403, "Ledger goruntuleme yetkisi yok");
  }

  return prisma.$queryRaw<
    Array<{
      id: string;
      transactionId: string;
      orderId: string;
      userId: string | null;
      accountType: string;
      entryType: string;
      amount: string;
      currency: string;
      reasonCode: string;
      createdAt: Date;
    }>
  >`SELECT "id","transactionId","orderId","userId","accountType","entryType","amount","currency","reasonCode","createdAt" FROM "WalletLedgerEntry" WHERE "orderId" = ${orderId} ORDER BY "createdAt" DESC`;
};
