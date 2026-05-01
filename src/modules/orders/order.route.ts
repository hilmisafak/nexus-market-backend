import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  appendShipmentEventHandler,
  createOrderHandler,
  getOrderLedgerHandler,
  getMyOrderHandler,
  getMyOrderTrackingHandler,
  listOrderAuditLogsHandler,
  listMyOrdersHandler,
  updateOrderStatusHandler,
  verifyOrderAuditLogsHandler,
} from "./order.controller.js";
import {
  appendShipmentEventSchema,
  createOrderSchema,
  orderIdParamSchema,
  updateOrderStatusSchema,
} from "./order.schema.js";

const orderRouter = Router();

orderRouter.use(requireAuth);
orderRouter.post("/", validate(createOrderSchema), asyncHandler(createOrderHandler));
orderRouter.get("/my", asyncHandler(listMyOrdersHandler));
orderRouter.get("/:id", validate(orderIdParamSchema), asyncHandler(getMyOrderHandler));
orderRouter.get("/:id/tracking", validate(orderIdParamSchema), asyncHandler(getMyOrderTrackingHandler));
orderRouter.get("/:id/audit-logs", validate(orderIdParamSchema), asyncHandler(listOrderAuditLogsHandler));
orderRouter.get(
  "/:id/audit-logs/verify",
  validate(orderIdParamSchema),
  asyncHandler(verifyOrderAuditLogsHandler),
);
orderRouter.get("/:id/ledger", validate(orderIdParamSchema), asyncHandler(getOrderLedgerHandler));
orderRouter.patch("/:id/status", validate(updateOrderStatusSchema), asyncHandler(updateOrderStatusHandler));
orderRouter.post(
  "/:id/shipment/events",
  validate(appendShipmentEventSchema),
  asyncHandler(appendShipmentEventHandler),
);

export default orderRouter;
