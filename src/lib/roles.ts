/**
 * Prisma `enum Role` (prisma/schema.prisma) ile aynı değerler.
 * Runtime'da `@prisma/client` enum re-export'una güvenmek yerine buradan kullan
 * (TS/IDE bazen `Role` / `$Enums` üyelerini çözümleyemiyor).
 */
export const Role = {
  BUYER: "BUYER",
  SELLER: "SELLER",
  ADMIN: "ADMIN",
} as const;

export type Role = (typeof Role)[keyof typeof Role];
