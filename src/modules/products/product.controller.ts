import type { Request, Response } from "express";
import {
  createProduct,
  deleteProduct,
  getProductById,
  listProducts,
  updateProduct,
} from "./product.service.js";

export const createProductHandler = async (req: Request, res: Response) => {
  const product = await createProduct({
    ...req.body,
    sellerId: req.user!.userId,
  });
  res.status(201).json({ success: true, data: product });
};

export const updateProductHandler = async (req: Request, res: Response) => {
  const product = await updateProduct(String(req.params.id), req.user!.userId, req.body);
  res.status(200).json({ success: true, data: product });
};

export const deleteProductHandler = async (req: Request, res: Response) => {
  await deleteProduct(String(req.params.id), req.user!.userId);
  res.status(204).send();
};

export const getProductHandler = async (req: Request, res: Response) => {
  const product = await getProductById(String(req.params.id));
  res.status(200).json({ success: true, data: product });
};

export const listProductsHandler = async (req: Request, res: Response) => {
  const products = await listProducts({
    category: req.query.category as string | undefined,
    minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
    maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
    rating: req.query.rating ? Number(req.query.rating) : undefined,
    sellerId: req.query.sellerId as string | undefined,
  });
  res.status(200).json({ success: true, data: products });
};
