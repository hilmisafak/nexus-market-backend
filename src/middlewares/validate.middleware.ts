import type { Request, Response, NextFunction } from "express";
import { ZodError, type ZodTypeAny } from "zod";

export const validate =
  (schema: ZodTypeAny) =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      }) as {
        body: Request["body"];
        params: Request["params"];
        query: Request["query"];
      };
      req.body = parsed.body;
      req.params = parsed.params;
      Object.assign(req.query, parsed.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next({
          statusCode: 400,
          message: "Validasyon hatasi",
          details: error.flatten(),
        });
        return;
      }
      next(error);
    }
  };
