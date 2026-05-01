import Product from "../products/product.model.js";
import Cart from "./cart.model.js";
import { ApiError } from "../../lib/api-error.js";

const recalculateTotal = (items: Array<{ unitPrice: number; quantity: number }>) =>
  items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

const getOrCreateCart = async (userId: string) => {
  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = await Cart.create({ userId, items: [], total: 0 });
  }
  return cart;
};

export const getCart = async (userId: string) => getOrCreateCart(userId);

export const addItemToCart = async (
  userId: string,
  payload: { productId: string; quantity: number },
) => {
  const product = await Product.findById(payload.productId);
  if (!product) {
    throw new ApiError(404, "Urun bulunamadi");
  }

  const availableStock = product.stock - (product.reservedStock ?? 0);
  if (availableStock < payload.quantity) {
    throw new ApiError(400, "Yeterli stok yok");
  }

  const cart = await getOrCreateCart(userId);
  const existing = cart.items.find((item) => item.productId === payload.productId);
  const nextQuantity = (existing?.quantity ?? 0) + payload.quantity;

  if (availableStock < nextQuantity) {
    throw new ApiError(400, "Yeterli stok yok");
  }

  if (existing) {
    existing.quantity = nextQuantity;
  } else {
    cart.items.push({
      productId: String(product._id),
      title: product.title,
      unitPrice: product.price,
      quantity: payload.quantity,
      image: product.images[0],
    });
  }

  cart.total = recalculateTotal(cart.items);
  await cart.save();
  return cart;
};

export const updateCartItem = async (
  userId: string,
  productId: string,
  quantity: number,
) => {
  const cart = await getOrCreateCart(userId);
  const item = cart.items.find((entry) => entry.productId === productId);
  if (!item) {
    throw new ApiError(404, "Sepette urun bulunamadi");
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Urun bulunamadi");
  }
  const availableStock = product.stock - (product.reservedStock ?? 0);
  if (availableStock < quantity) {
    throw new ApiError(400, "Stok yetersiz");
  }

  item.quantity = quantity;
  cart.total = recalculateTotal(cart.items);
  await cart.save();
  return cart;
};

export const removeCartItem = async (userId: string, productId: string) => {
  const cart = await getOrCreateCart(userId);
  cart.items = cart.items.filter((entry) => entry.productId !== productId);
  cart.total = recalculateTotal(cart.items);
  await cart.save();
  return cart;
};
