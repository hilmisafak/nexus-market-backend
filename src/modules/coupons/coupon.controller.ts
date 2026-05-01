import type { Request, Response } from "express";
import { createCoupon, listActiveCoupons, updateCouponStatus } from "./coupon.service.js";

export const createCouponHandler = async (req: Request, res: Response) => {
  const coupon = await createCoupon(req.user!.userId, req.body);
  res.status(201).json({ success: true, data: coupon });
};

export const listActiveCouponsHandler = async (_req: Request, res: Response) => {
  const coupons = await listActiveCoupons();
  res.status(200).json({ success: true, data: coupons });
};

export const updateCouponStatusHandler = async (req: Request, res: Response) => {
  const coupon = await updateCouponStatus(String(req.params.code), req.body.isActive);
  res.status(200).json({ success: true, data: coupon });
};
