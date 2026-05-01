import { Types } from "mongoose";
import { ApiError } from "../../lib/api-error.js";
import Product from "./product.model.js";

type CreateProductInput = {
  sellerId: string;
  title: string;
  description?: string;
  category: string;
  price: number;
  stock: number;
  attributes?: Record<string, unknown>;
  images?: string[];
};

type UpdateProductInput = Partial<Omit<CreateProductInput, "sellerId">>;

type ListFilter = {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  sellerId?: string;
};

export const createProduct = async (payload: CreateProductInput) => {
  return Product.create(payload);
};

export const updateProduct = async (
  productId: string,
  sellerId: string,
  payload: UpdateProductInput,
) => {
  if (!Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, "Gecersiz product id");
  }

  const updated = await Product.findOneAndUpdate(
    { _id: productId, sellerId },
    payload,
    { new: true },
  );

  if (!updated) {
    throw new ApiError(404, "Urun bulunamadi veya sahiplik hatasi");
  }

  return updated;
};

export const deleteProduct = async (productId: string, sellerId: string) => {
  if (!Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, "Gecersiz product id");
  }

  const deleted = await Product.findOneAndDelete({ _id: productId, sellerId });
  if (!deleted) {
    throw new ApiError(404, "Urun bulunamadi veya sahiplik hatasi");
  }
};

export const getProductById = async (productId: string) => {
  if (!Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, "Gecersiz product id");
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Urun bulunamadi");
  }

  return product;
};

export const listProducts = async (filter: ListFilter) => {
  const query: Record<string, unknown> = {};

  if (filter.category) {
    query.category = filter.category;
  }
  if (filter.sellerId) {
    query.sellerId = filter.sellerId;
  }
  if (filter.rating !== undefined) {
    query.ratingAvg = { $gte: filter.rating };
  }
  if (filter.minPrice !== undefined || filter.maxPrice !== undefined) {
    query.price = {};
    if (filter.minPrice !== undefined) {
      (query.price as Record<string, number>).$gte = filter.minPrice;
    }
    if (filter.maxPrice !== undefined) {
      (query.price as Record<string, number>).$lte = filter.maxPrice;
    }
  }

  return Product.find(query).sort({ createdAt: -1 });
};
