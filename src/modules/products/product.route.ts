import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { Role } from "../../lib/roles.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createProductHandler,
  deleteProductHandler,
  getProductHandler,
  listProductsHandler,
  updateProductHandler,
} from "./product.controller.js";
import {
  createProductSchema,
  listProductQuerySchema,
  productIdParamSchema,
  updateProductSchema,
} from "./product.schema.js";

const productRouter = Router();

productRouter.get("/", validate(listProductQuerySchema), asyncHandler(listProductsHandler));
productRouter.get("/:id", validate(productIdParamSchema), asyncHandler(getProductHandler));

productRouter.post(
  "/",
  requireAuth,
  requireRole(Role.SELLER),
  validate(createProductSchema),
  asyncHandler(createProductHandler),
);
productRouter.patch(
  "/:id",
  requireAuth,
  requireRole(Role.SELLER),
  validate(updateProductSchema),
  asyncHandler(updateProductHandler),
);
productRouter.delete(
  "/:id",
  requireAuth,
  requireRole(Role.SELLER),
  validate(productIdParamSchema),
  asyncHandler(deleteProductHandler),
);

export default productRouter;
