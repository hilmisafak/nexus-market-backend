import { z } from "zod";

export const createProductSchema = z.object({
  body: z.object({
    title: z.string().min(3),
    description: z.string().optional(),
    category: z.string().min(2),
    price: z.number().nonnegative(),
    stock: z.number().int().nonnegative(),
    attributes: z.record(z.string(), z.unknown()).default({}),
    images: z.array(z.url()).default([]),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    title: z.string().min(3).optional(),
    description: z.string().optional(),
    category: z.string().min(2).optional(),
    price: z.number().nonnegative().optional(),
    stock: z.number().int().nonnegative().optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
    images: z.array(z.url()).optional(),
  }),
});

export const productIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const listProductQuerySchema = z.object({
  query: z.object({
    category: z.string().optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    rating: z.coerce.number().min(0).max(5).optional(),
    sellerId: z.string().optional(),
  }),
});
