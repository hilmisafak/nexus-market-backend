import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import type { Request } from "express";
import helmet from "helmet";
import apiRouter from "./routes/index.js";
import { env } from "./lib/env.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();

const resolveCorsOrigin = (): boolean | string | string[] => {
  if (env.NODE_ENV === "development" || env.NODE_ENV === "test") {
    return true;
  }
  const origins = env.CORS_ORIGIN.split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  if (origins.length === 0) {
    return false;
  }
  return origins.length === 1 ? origins[0]! : origins;
};

app.use(helmet());
app.use(
  cors({
    origin: resolveCorsOrigin(),
    credentials: true,
  }),
);
app.set("trust proxy", env.NODE_ENV === "production");
app.use(cookieParser());
app.use(
  express.json({
    limit: env.JSON_BODY_LIMIT,
    verify: (req, _res, buf) => {
      const expressReq = req as Request;
      if (expressReq.originalUrl === "/api/payments/webhook") {
        expressReq.rawBody = buf.toString("utf8");
      }
    },
  }),
);
app.use("/api", apiRouter);
app.use(errorHandler);

export default app;
