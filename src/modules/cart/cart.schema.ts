import { z } from "zod";

export const addItemSchema = z.object({
  body: z.object({
    productId: z.string().min(1),
    quantity: z.number().int().positive().default(1),
  }),
});

export const updateItemSchema = z.object({
  params: z.object({
    productId: z.string().min(1),
  }),
  body: z.object({
    quantity: z.number().int().positive(),
  }),
});

export const cartItemParamSchema = z.object({
  params: z.object({
    productId: z.string().min(1),
  }),
});
