import { z } from "zod";

export const simulatePaymentSchema = z.object({
  body: z.object({
    orderId: z.string().uuid(),
    outcome: z.enum(["SUCCESS", "FAILED"]).default("SUCCESS"),
    providerRef: z.string().min(1).optional(),
  }),
});

export const retryPaymentSchema = z.object({
  body: z.object({
    orderId: z.string().uuid(),
    outcome: z.enum(["SUCCESS", "FAILED"]).default("SUCCESS"),
    providerRef: z.string().min(1).optional(),
  }),
});
