import type { Request, Response } from "express";
import {
  addItemToCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from "./cart.service.js";

export const getCartHandler = async (req: Request, res: Response) => {
  const cart = await getCart(req.user!.userId);
  res.status(200).json({ success: true, data: cart });
};

export const addCartItemHandler = async (req: Request, res: Response) => {
  const cart = await addItemToCart(req.user!.userId, req.body);
  res.status(200).json({ success: true, data: cart });
};

export const updateCartItemHandler = async (req: Request, res: Response) => {
  const cart = await updateCartItem(
    req.user!.userId,
    String(req.params.productId),
    req.body.quantity,
  );
  res.status(200).json({ success: true, data: cart });
};

export const removeCartItemHandler = async (req: Request, res: Response) => {
  const cart = await removeCartItem(req.user!.userId, String(req.params.productId));
  res.status(200).json({ success: true, data: cart });
};
