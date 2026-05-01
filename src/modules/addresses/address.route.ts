import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createAddressHandler,
  deleteAddressHandler,
  listMyAddressesHandler,
  updateAddressHandler,
} from "./address.controller.js";
import { addressIdParamSchema, createAddressSchema, updateAddressSchema } from "./address.schema.js";

const addressRouter = Router();

addressRouter.use(requireAuth);
addressRouter.get("/my", asyncHandler(listMyAddressesHandler));
addressRouter.post("/", validate(createAddressSchema), asyncHandler(createAddressHandler));
addressRouter.patch("/:id", validate(updateAddressSchema), asyncHandler(updateAddressHandler));
addressRouter.delete("/:id", validate(addressIdParamSchema), asyncHandler(deleteAddressHandler));

export default addressRouter;
