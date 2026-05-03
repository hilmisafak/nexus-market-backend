import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

const configDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  schema: path.join(configDir, "prisma", "schema.prisma"),
  migrations: {
    path: path.join(configDir, "prisma", "migrations"),
  },
  datasource: {
    // Prisma 7 reads the URL from config. Fallback keeps `docker build` and
    // `prisma generate` working when DATABASE_URL is not set (no DB connection at generate time).
    url:
      process.env.DATABASE_URL ??
      "postgresql://nexus:nexus@localhost:5432/nexusmarket",
  },
});
