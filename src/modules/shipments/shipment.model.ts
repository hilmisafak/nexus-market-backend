import { Schema, model } from "mongoose";

type ShipmentEvent = {
  status: "SHIPPED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
  note?: string;
  at: Date;
};

export type ShipmentDocument = {
  orderId: string;
  buyerId: string;
  sellerId?: string;
  carrier?: string;
  trackingNumber?: string;
  status: "SHIPPED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
  events: ShipmentEvent[];
  createdAt: Date;
  updatedAt: Date;
};

const shipmentEventSchema = new Schema<ShipmentEvent>(
  {
    status: { type: String, required: true },
    note: { type: String, default: "" },
    at: { type: Date, required: true, default: () => new Date() },
  },
  { _id: false },
);

const shipmentSchema = new Schema<ShipmentDocument>(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    buyerId: { type: String, required: true, index: true },
    sellerId: { type: String, default: null, index: true },
    carrier: { type: String, default: "" },
    trackingNumber: { type: String, default: "" },
    status: { type: String, required: true, index: true },
    events: { type: [shipmentEventSchema], default: [] },
  },
  { timestamps: true },
);

const Shipment = model<ShipmentDocument>("Shipment", shipmentSchema);

export default Shipment;
