import { z } from "zod";

export const createCouponSchema = z.object({
  body: z.object({
    code: z.string().min(3).max(32),
    type: z.enum(["PERCENT", "FIXED"]),
    amount: z.number().positive(),
    minOrderAmount: z.number().nonnegative().optional(),
    maxDiscount: z.number().nonnegative().optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
    usageLimit: z.number().int().positive().optional(),
    isActive: z.boolean().optional().default(true),
  }),
});

export const updateCouponStatusSchema = z.object({
  params: z.object({
    code: z.string().min(3).max(32),
  }),
  body: z.object({
    isActive: z.boolean(),
    reasonCode: z.string().min(3),
  }),
});
