import type { Request, Response } from "express";
import {
  appendShipmentEvent,
  createOrderFromCart,
  getOrderByIdForBuyer,
  getOrderLedgerForActor,
  getShipmentTrackingForBuyer,
  listOrderAuditLogs,
  listMyOrders,
  updateOrderStatus,
  verifyOrderAuditLogChain,
} from "./order.service.js";

export const createOrderHandler = async (req: Request, res: Response) => {
  const order = await createOrderFromCart(req.user!.userId, req.body);
  res.status(201).json({ success: true, data: order });
};

export const listMyOrdersHandler = async (req: Request, res: Response) => {
  const orders = await listMyOrders(req.user!.userId);
  res.status(200).json({ success: true, data: orders });
};

export const getMyOrderHandler = async (req: Request, res: Response) => {
  const order = await getOrderByIdForBuyer(req.user!.userId, String(req.params.id));
  res.status(200).json({ success: true, data: order });
};

export const updateOrderStatusHandler = async (req: Request, res: Response) => {
  const order = await updateOrderStatus(
    { userId: req.user!.userId, role: req.user!.role },
    String(req.params.id),
    req.body.status,
    {
      carrier: req.body.carrier,
      trackingNumber: req.body.trackingNumber,
      reasonCode: req.body.reasonCode,
      note: req.body.note,
    },
  );
  res.status(200).json({ success: true, data: order });
};

export const getMyOrderTrackingHandler = async (req: Request, res: Response) => {
  const tracking = await getShipmentTrackingForBuyer(req.user!.userId, String(req.params.id));
  res.status(200).json({ success: true, data: tracking });
};

export const appendShipmentEventHandler = async (req: Request, res: Response) => {
  const shipment = await appendShipmentEvent(
    { userId: req.user!.userId, role: req.user!.role },
    String(req.params.id),
    req.body,
  );
  res.status(200).json({ success: true, data: shipment });
};

export const listOrderAuditLogsHandler = async (req: Request, res: Response) => {
  const logs = await listOrderAuditLogs(
    { userId: req.user!.userId, role: req.user!.role },
    String(req.params.id),
  );
  res.status(200).json({ success: true, data: logs });
};

export const verifyOrderAuditLogsHandler = async (req: Request, res: Response) => {
  const result = await verifyOrderAuditLogChain(
    { userId: req.user!.userId, role: req.user!.role },
    String(req.params.id),
  );
  res.status(200).json({ success: true, data: result });
};

export const getOrderLedgerHandler = async (req: Request, res: Response) => {
  const entries = await getOrderLedgerForActor(
    { userId: req.user!.userId, role: req.user!.role },
    String(req.params.id),
  );
  res.status(200).json({ success: true, data: entries });
};
