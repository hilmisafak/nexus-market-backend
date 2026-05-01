import { Schema, model } from "mongoose";

export type OrderAuditDocument = {
  orderId: string;
  actorId: string;
  actorRole: string;
  action: string;
  reasonCode?: string;
  note?: string;
  meta?: Record<string, unknown>;
  prevHash?: string;
  hash: string;
  createdAt: Date;
};

const orderAuditSchema = new Schema<OrderAuditDocument>(
  {
    orderId: { type: String, required: true, index: true },
    actorId: { type: String, required: true, index: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true, index: true },
    reasonCode: { type: String, default: "" },
    note: { type: String, default: "" },
    meta: { type: Schema.Types.Mixed, default: {} },
    prevHash: { type: String, default: "" },
    hash: { type: String, required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const OrderAuditLog = model<OrderAuditDocument>("OrderAuditLog", orderAuditSchema);

export default OrderAuditLog;
