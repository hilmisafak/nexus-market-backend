import type { Express } from "express";
import swaggerUi from "swagger-ui-express";
import { openApiSpec } from "./openapi.js";

export function mountSwagger(app: Express): void {
  app.get("/api/docs/openapi.json", (_req, res) => {
    res.json(openApiSpec);
  });

  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "NexusMarket API",
    }),
  );
}
