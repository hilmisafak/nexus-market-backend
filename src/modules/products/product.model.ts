import { Schema, model } from "mongoose";

export type ProductDocument = {
  sellerId: string;
  title: string;
  description?: string;
  category: string;
  price: number;
  stock: number;
  reservedStock: number;
  attributes: Record<string, unknown>;
  images: string[];
  ratingAvg: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
};

const productSchema = new Schema<ProductDocument>(
  {
    sellerId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: String, required: true, index: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0 },
    reservedStock: { type: Number, required: true, min: 0, default: 0 },
    attributes: { type: Schema.Types.Mixed, default: {} },
    images: { type: [String], default: [] },
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

productSchema.index({ title: "text", category: 1 });

const Product = model<ProductDocument>("Product", productSchema);

export default Product;
