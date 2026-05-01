import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { env } from "../lib/env.js";

const { Pool } = pg;

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prismaOptions = {
  adapter,
  log: ["info", "warn", "error"] as const,
} satisfies Prisma.PrismaClientOptions;

export const prisma = new PrismaClient(prismaOptions);
