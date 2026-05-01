import type { CouponType } from "@prisma/client";
import { prisma } from "../../config/prisma.js";

type CreateCouponInput = {
  code: string;
  type: CouponType;
  amount: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  startsAt?: string;
  endsAt?: string;
  usageLimit?: number;
  isActive?: boolean;
};

export const createCoupon = async (createdById: string, payload: CreateCouponInput) => {
  return prisma.coupon.create({
    data: {
      code: payload.code.trim().toUpperCase(),
      type: payload.type,
      amount: payload.amount,
      minOrderAmount: payload.minOrderAmount,
      maxDiscount: payload.maxDiscount,
      startsAt: payload.startsAt ? new Date(payload.startsAt) : null,
      endsAt: payload.endsAt ? new Date(payload.endsAt) : null,
      usageLimit: payload.usageLimit,
      isActive: payload.isActive ?? true,
      createdById,
    },
  });
};

export const listActiveCoupons = async () => {
  const now = new Date();
  return prisma.coupon.findMany({
    where: {
      isActive: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: { createdAt: "desc" },
  });
};

export const updateCouponStatus = async (code: string, isActive: boolean) => {
  return prisma.coupon.update({
    where: { code: code.trim().toUpperCase() },
    data: { isActive },
  });
};
