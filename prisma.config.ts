import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma 7 reads the URL from config. Fallback keeps `docker build` and
    // `prisma generate` working when DATABASE_URL is not set (no DB connection at generate time).
    url:
      process.env.DATABASE_URL ??
      "postgresql://nexus:nexus@localhost:5432/nexusmarket",
  },
});
