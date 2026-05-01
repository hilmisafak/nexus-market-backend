import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  addCartItemHandler,
  getCartHandler,
  removeCartItemHandler,
  updateCartItemHandler,
} from "./cart.controller.js";
import { addItemSchema, cartItemParamSchema, updateItemSchema } from "./cart.schema.js";

const cartRouter = Router();

cartRouter.use(requireAuth);
cartRouter.get("/", asyncHandler(getCartHandler));
cartRouter.post("/items", validate(addItemSchema), asyncHandler(addCartItemHandler));
cartRouter.patch(
  "/items/:productId",
  validate(updateItemSchema),
  asyncHandler(updateCartItemHandler),
);
cartRouter.delete(
  "/items/:productId",
  validate(cartItemParamSchema),
  asyncHandler(removeCartItemHandler),
);

export default cartRouter;
