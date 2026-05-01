import { Schema, model } from "mongoose";

type CartItem = {
  productId: string;
  title: string;
  unitPrice: number;
  quantity: number;
  image?: string;
};

export type CartDocument = {
  userId: string;
  items: CartItem[];
  total: number;
  updatedAt: Date;
  createdAt: Date;
};

const cartItemSchema = new Schema<CartItem>(
  {
    productId: { type: String, required: true },
    title: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String, default: null },
  },
  { _id: false },
);

const cartSchema = new Schema<CartDocument>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    items: { type: [cartItemSchema], default: [] },
    total: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

const Cart = model<CartDocument>("Cart", cartSchema);

export default Cart;
