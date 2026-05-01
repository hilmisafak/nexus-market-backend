import { z } from "zod";

export const createAddressSchema = z.object({
  body: z.object({
    label: z.string().min(2),
    fullName: z.string().min(3),
    phone: z.string().min(7),
    country: z.string().min(2),
    city: z.string().min(2),
    district: z.string().min(2),
    line1: z.string().min(3),
    line2: z.string().optional(),
    postalCode: z.string().min(3),
    isDefault: z.boolean().optional().default(false),
  }),
});

export const updateAddressSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    label: z.string().min(2).optional(),
    fullName: z.string().min(3).optional(),
    phone: z.string().min(7).optional(),
    country: z.string().min(2).optional(),
    city: z.string().min(2).optional(),
    district: z.string().min(2).optional(),
    line1: z.string().min(3).optional(),
    line2: z.string().optional(),
    postalCode: z.string().min(3).optional(),
    isDefault: z.boolean().optional(),
  }),
});

export const addressIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
