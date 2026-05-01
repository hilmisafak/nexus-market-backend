import { z } from "zod";
import { Role } from "../../lib/roles.js";

const roleTuple = [Role.BUYER, Role.SELLER, Role.ADMIN] as const;

export const registerSchema = z.object({
  body: z
    .object({
      email: z.email(),
      password: z.string().min(8),
      firstName: z.string().min(2),
      lastName: z.string().min(2),
      role: z.enum(roleTuple).default(Role.BUYER),
      storeName: z.string().min(3).optional(),
      taxNumber: z.string().min(6).optional(),
    })
    .refine(
      (data) => {
        if (data.role !== Role.SELLER) {
          return true;
        }
        return Boolean(data.storeName);
      },
      {
        message: "SELLER kaydi icin storeName zorunludur",
        path: ["storeName"],
      },
    ),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.email(),
    password: z.string().min(8),
  }),
});
