import { Router } from "express";
import addressRouter from "../modules/addresses/address.route.js";
import authRouter from "../modules/auth/auth.route.js";
import cartRouter from "../modules/cart/cart.route.js";
import couponRouter from "../modules/coupons/coupon.route.js";
import orderRouter from "../modules/orders/order.route.js";
import paymentRouter from "../modules/payments/payment.route.js";
import productRouter from "../modules/products/product.route.js";

const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.status(200).json({ success: true, message: "NexusMarket API ayakta" });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/addresses", addressRouter);
apiRouter.use("/coupons", couponRouter);
apiRouter.use("/products", productRouter);
apiRouter.use("/cart", cartRouter);
apiRouter.use("/orders", orderRouter);
apiRouter.use("/payments", paymentRouter);

export default apiRouter;
