import { z } from "zod";

export const createOrderSchema = z.object({
  body: z.object({
    addressId: z.string().uuid(),
    couponCode: z.string().min(3).max(32).optional(),
  }),
});

export const orderIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const updateOrderStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    status: z.enum(["SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]),
    carrier: z.string().min(2).optional(),
    trackingNumber: z.string().min(3).optional(),
    reasonCode: z.string().min(3).optional(),
    note: z.string().min(2).optional(),
  }),
});

export const appendShipmentEventSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    status: z.enum(["IN_TRANSIT", "DELIVERED", "CANCELLED"]),
    reasonCode: z.string().min(3).optional(),
    note: z.string().min(2).optional(),
  }),
});
