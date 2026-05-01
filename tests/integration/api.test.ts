import "dotenv/config";
import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import connectMongo from "../../src/config/mongo.js";
import { prisma } from "../../src/config/prisma.js";
import Product from "../../src/modules/products/product.model.js";
import Cart from "../../src/modules/cart/cart.model.js";
import OrderAuditLog from "../../src/modules/orders/order-audit.model.js";
import Shipment from "../../src/modules/shipments/shipment.model.js";

type AuthState = {
  sellerToken: string;
  sellerCookie: string;
  buyerToken: string;
  adminToken: string;
  sellerId: string;
  buyerId: string;
  adminId: string;
  productId: string;
  addressId: string;
};

const now = Date.now();
const sellerEmail = `it_seller_${now}@test.com`;
const buyerEmail = `it_buyer_${now}@test.com`;
const adminEmail = `it_admin_${now}@test.com`;
const password = "StrongPass123!";

const state: AuthState = {
  sellerToken: "",
  sellerCookie: "",
  buyerToken: "",
  adminToken: "",
  sellerId: "",
  buyerId: "",
  adminId: "",
  productId: "",
  addressId: "",
};

const getRefreshCookie = (setCookie: string | string[] | undefined) => {
  const values = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const raw = values.find((line) => line.startsWith("nm_refresh_token="));
  return raw ? raw.split(";")[0]! : "";
};

const signWebhook = (payload: string, timestamp: number) =>
  crypto
    .createHmac("sha256", process.env.PAYMENT_WEBHOOK_SECRET!)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

const cleanupUsers = async () => {
  const users = await prisma.user.findMany({
    where: { email: { in: [sellerEmail, buyerEmail, adminEmail] } },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  if (ids.length === 0) return;
  const orders = await prisma.order.findMany({
    where: { buyerId: { in: ids } },
    select: { id: true },
  });
  const orderIds = orders.map((o) => o.id);

  await Promise.all([
    Cart.deleteMany({ userId: { $in: ids } }),
    Product.deleteMany({ sellerId: { $in: ids } }),
  ]);
  await OrderAuditLog.deleteMany({ actorId: { $in: ids } });
  await Shipment.deleteMany({ buyerId: { $in: ids } });
  await prisma.paymentTransaction.deleteMany({ where: { userId: { in: ids } } });
  await prisma.orderItem.deleteMany({ where: { order: { buyerId: { in: ids } } } });
  await prisma.order.deleteMany({ where: { buyerId: { in: ids } } });
  await prisma.refreshSession.deleteMany({ where: { userId: { in: ids } } });
  await prisma.store.deleteMany({ where: { userId: { in: ids } } });
  await prisma.wallet.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
};

let canRunApiIntegration = false;
let setupError: unknown;

try {
  await connectMongo();
  await prisma.$connect();
  await cleanupUsers();
  canRunApiIntegration = true;
} catch (error) {
  setupError = error;
  console.warn(
    "[api.integration] Skipping suite because required databases are unreachable.",
    error,
  );
}

afterAll(async () => {
  if (!canRunApiIntegration) return;
  await cleanupUsers();
  await prisma.$disconnect();
});

const apiSuite = canRunApiIntegration ? describe.sequential : describe.sequential.skip;
const preflightSuite = canRunApiIntegration ? describe.sequential.skip : describe.sequential;

apiSuite("API integration and security smoke tests", () => {
  it("responds with health status", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("rejects invalid register payload", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "bad-email",
      password: "123",
      firstName: "A",
      lastName: "B",
      role: "BUYER",
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Validasyon hatasi");
  });

  it("registers seller and buyer accounts", async () => {
    const sellerRes = await request(app).post("/api/auth/register").send({
      email: sellerEmail,
      password,
      firstName: "Seller",
      lastName: "Test",
      role: "SELLER",
      storeName: `IT Store ${now}`,
      taxNumber: "123456",
    });
    expect(sellerRes.status).toBe(201);
    expect(sellerRes.body.accessToken).toBeTruthy();
    state.sellerToken = sellerRes.body.accessToken;
    state.sellerId = sellerRes.body.user.id;
    state.sellerCookie = getRefreshCookie(sellerRes.headers["set-cookie"]);
    expect(state.sellerCookie).toContain("nm_refresh_token=");

    const buyerRes = await request(app).post("/api/auth/register").send({
      email: buyerEmail,
      password,
      firstName: "Buyer",
      lastName: "Test",
      role: "BUYER",
    });
    expect(buyerRes.status).toBe(201);
    state.buyerToken = buyerRes.body.accessToken;
    state.buyerId = buyerRes.body.user.id;

    const adminRes = await request(app).post("/api/auth/register").send({
      email: adminEmail,
      password,
      firstName: "Admin",
      lastName: "Test",
      role: "ADMIN",
    });
    expect(adminRes.status).toBe(201);
    state.adminToken = adminRes.body.accessToken;
    state.adminId = adminRes.body.user.id;

    const addressRes = await request(app)
      .post("/api/addresses")
      .set("Authorization", `Bearer ${state.buyerToken}`)
      .send({
        label: "Ev",
        fullName: "Buyer Test",
        phone: "5550001122",
        country: "TR",
        city: "Istanbul",
        district: "Kadikoy",
        line1: "Moda Cad. 1",
        postalCode: "34710",
        isDefault: true,
      });
    expect(addressRes.status).toBe(201);
    state.addressId = addressRes.body.data.id;
  });

  it("allows admin coupon operations", async () => {
    const code = `ADMIN${Date.now()}`;
    const created = await request(app)
      .post("/api/coupons")
      .set("Authorization", `Bearer ${state.adminToken}`)
      .send({
        code,
        type: "PERCENT",
        amount: 10,
        usageLimit: 100,
      });
    expect(created.status).toBe(201);
    expect(created.body.data.code).toBe(code);

    const disabled = await request(app)
      .patch(`/api/coupons/${code}/status`)
      .set("Authorization", `Bearer ${state.adminToken}`)
      .send({ isActive: false, reasonCode: "SECURITY_POLICY" });
    expect(disabled.status).toBe(200);
    expect(disabled.body.data.isActive).toBe(false);
  });

  it("blocks duplicate storeName and does not leak Prisma internals", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: `it_duplicate_${now}@test.com`,
      password,
      firstName: "Seller",
      lastName: "Dup",
      role: "SELLER",
      storeName: `IT Store ${now}`,
      taxNumber: "999999",
    });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Bu magaza adi zaten kullaniliyor");
    expect(String(res.body.message)).not.toContain("Invalid `prisma");
  });

  it("authorizes seller-only product creation and blocks buyer", async () => {
    const denied = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${state.buyerToken}`)
      .send({
        title: "No Access",
        category: "test",
        price: 20,
        stock: 1,
      });
    expect(denied.status).toBe(403);

    const created = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${state.sellerToken}`)
      .send({
        title: "Integration Product",
        description: "integration",
        category: "test",
        price: 100,
        stock: 3,
        attributes: { sku: "it-1" },
        images: ["https://example.com/p.png"],
      });
    expect(created.status).toBe(201);
    state.productId = created.body.data._id;
    expect(state.productId).toBeTruthy();
  });

  it("enforces stock checks for cart operations", async () => {
    const overStock = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${state.buyerToken}`)
      .send({ productId: state.productId, quantity: 10 });
    expect(overStock.status).toBe(400);

    const add = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${state.buyerToken}`)
      .send({ productId: state.productId, quantity: 2 });
    expect(add.status).toBe(200);

    const overflowUpdate = await request(app)
      .patch(`/api/cart/items/${state.productId}`)
      .set("Authorization", `Bearer ${state.buyerToken}`)
      .send({ quantity: 4 });
    expect(overflowUpdate.status).toBe(400);
  });

  it("creates order, fails payment first, then retries successfully", async () => {
    const createOrder = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${state.buyerToken}`)
      .send({ addressId: state.addressId });
    expect(createOrder.status).toBe(201);
    expect(createOrder.body.data.id).toBeTruthy();
    expect(createOrder.body.data.status).toBe("PENDING");

    const orderId = createOrder.body.data.id as string;

    const myOrders = await request(app)
      .get("/api/orders/my")
      .set("Authorization", `Bearer ${state.buyerToken}`);
    expect(myOrders.status).toBe(200);
    expect(Array.isArray(myOrders.body.data)).toBe(true);
    expect(myOrders.body.data[0].id).toBe(orderId);

    const firstPayment = await request(app)
      .post("/api/payments/simulate")
      .set("Authorization", `Bearer ${state.buyerToken}`)
      .send({
        orderId,
        outcome: "FAILED",
        providerRef: `sim-${Date.now()}`,
      });
    expect(firstPayment.status).toBe(201);
    expect(firstPayment.body.data.status).toBe("FAILED");

    const orderAfterFailedPayment = await request(app)
      .get(`/api/orders/${orderId}`)
      .set("Authorization", `Bearer ${state.buyerToken}`);
    expect(orderAfterFailedPayment.status).toBe(200);
    expect(orderAfterFailedPayment.body.data.status).toBe("PENDING");

    const retry = await request(app)
      .post("/api/payments/retry")
      .set("Authorization", `Bearer ${state.buyerToken}`)
      .send({
        orderId,
        outcome: "SUCCESS",
        providerRef: `retry-${Date.now()}`,
      });
    expect(retry.status).toBe(201);
    expect(retry.body.data.status).toBe("SUCCESS");

    const orderAfterRetry = await request(app)
      .get(`/api/orders/${orderId}`)
      .set("Authorization", `Bearer ${state.buyerToken}`);
    expect(orderAfterRetry.status).toBe(200);
    expect(orderAfterRetry.body.data.status).toBe("PAID");
  });

  it("handles async webhook confirmation and cancellation with signature", async () => {
    const addAgain = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${state.buyerToken}`)
      .send({ productId: state.productId, quantity: 1 });
    expect(addAgain.status).toBe(200);

    const createOrder = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${state.buyerToken}`)
      .send({ addressId: state.addressId });
    expect(createOrder.status).toBe(201);
    const orderId = createOrder.body.data.id as string;

    const productAfterReserve = await Product.findById(state.productId).lean();
    expect(productAfterReserve).toBeTruthy();
    expect(productAfterReserve!.reservedStock).toBeGreaterThan(0);

    const failedEventPayload = {
      orderId,
      event: "payment_failed_final",
      providerRef: `wh-fail-${Date.now()}`,
    };
    const failedEvent = JSON.stringify(failedEventPayload);
    const timestamp = Math.floor(Date.now() / 1000);
    const failedSignature = signWebhook(failedEvent, timestamp);
    const failedWebhook = await request(app)
      .post("/api/payments/webhook")
      .set("x-webhook-signature", failedSignature)
      .set("x-webhook-timestamp", String(timestamp))
      .set("Content-Type", "application/json")
      .send(failedEventPayload);
    expect(failedWebhook.status).toBe(200);

    const cancelledOrder = await request(app)
      .get(`/api/orders/${orderId}`)
      .set("Authorization", `Bearer ${state.buyerToken}`);
    expect(cancelledOrder.status).toBe(200);
    expect(cancelledOrder.body.data.status).toBe("CANCELLED");

    const productAfterRelease = await Product.findById(state.productId).lean();
    expect(productAfterRelease).toBeTruthy();
    expect(productAfterRelease!.reservedStock).toBe(0);
  });

  it("handles payment_succeeded webhook idempotently", async () => {
    const addAgain = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${state.buyerToken}`)
      .send({ productId: state.productId, quantity: 1 });
    expect(addAgain.status).toBe(200);

    const createOrder = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${state.buyerToken}`)
      .send({ addressId: state.addressId });
    expect(createOrder.status).toBe(201);
    const orderId = createOrder.body.data.id as string;

    const productBefore = await Product.findById(state.productId).lean();
    expect(productBefore).toBeTruthy();
    const stockBefore = productBefore!.stock;
    const reservedBefore = productBefore!.reservedStock;
    expect(reservedBefore).toBeGreaterThan(0);

    const successPayload = {
      orderId,
      event: "payment_succeeded",
      providerRef: `wh-success-${Date.now()}`,
    };
    const successJson = JSON.stringify(successPayload);
    const timestamp = Math.floor(Date.now() / 1000);
    const successSignature = signWebhook(successJson, timestamp);

    const firstCall = await request(app)
      .post("/api/payments/webhook")
      .set("x-webhook-signature", successSignature)
      .set("x-webhook-timestamp", String(timestamp))
      .set("Content-Type", "application/json")
      .send(successPayload);
    expect(firstCall.status).toBe(200);
    expect(firstCall.body.data.idempotent).toBe(false);

    const orderAfterFirst = await request(app)
      .get(`/api/orders/${orderId}`)
      .set("Authorization", `Bearer ${state.buyerToken}`);
    expect(orderAfterFirst.status).toBe(200);
    expect(orderAfterFirst.body.data.status).toBe("PAID");

    const productAfterFirst = await Product.findById(state.productId).lean();
    expect(productAfterFirst).toBeTruthy();
    expect(productAfterFirst!.reservedStock).toBe(0);
    expect(productAfterFirst!.stock).toBe(stockBefore - 1);

    const secondCall = await request(app)
      .post("/api/payments/webhook")
      .set("x-webhook-signature", successSignature)
      .set("x-webhook-timestamp", String(timestamp))
      .set("Content-Type", "application/json")
      .send(successPayload);
    expect(secondCall.status).toBe(200);
    expect(secondCall.body.data.idempotent).toBe(true);

    const productAfterSecond = await Product.findById(state.productId).lean();
    expect(productAfterSecond).toBeTruthy();
    expect(productAfterSecond!.reservedStock).toBe(0);
    expect(productAfterSecond!.stock).toBe(stockBefore - 1);

    const paymentAttempts = await prisma.paymentTransaction.count({ where: { orderId } });
    expect(paymentAttempts).toBe(1);
  });

  it("rejects expired webhook timestamp (replay protection)", async () => {
    const freshProduct = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${state.sellerToken}`)
      .send({
        title: `Replay Product ${Date.now()}`,
        description: "replay-test",
        category: "test",
        price: 50,
        stock: 5,
        attributes: {},
        images: [],
      });
    expect(freshProduct.status).toBe(201);
    const freshProductId = freshProduct.body.data._id as string;

    const addAgain = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${state.buyerToken}`)
      .send({ productId: freshProductId, quantity: 1 });
    expect(addAgain.status).toBe(200);

    const createOrder = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${state.buyerToken}`)
      .send({ addressId: state.addressId });
    expect(createOrder.status).toBe(201);
    const orderId = createOrder.body.data.id as string;

    const expiredTs = Math.floor(Date.now() / 1000) - 3600;
    const payload = {
      orderId,
      event: "payment_succeeded",
      providerRef: `wh-expired-${Date.now()}`,
    };
    const payloadJson = JSON.stringify(payload);
    const signature = signWebhook(payloadJson, expiredTs);

    const res = await request(app)
      .post("/api/payments/webhook")
      .set("x-webhook-signature", signature)
      .set("x-webhook-timestamp", String(expiredTs))
      .set("Content-Type", "application/json")
      .send(payload);
    expect(res.status).toBe(401);
  });

  it("rotates refresh token and blocks reuse", async () => {
    const refreshed = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", state.sellerCookie);
    expect(refreshed.status).toBe(200);
    const rotatedCookie = getRefreshCookie(refreshed.headers["set-cookie"]);
    expect(rotatedCookie).toContain("nm_refresh_token=");

    const reused = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", state.sellerCookie);
    expect(reused.status).toBe(401);
    state.sellerCookie = rotatedCookie;
  });

  it("applies login brute-force rate limit", async () => {
    let hitLimit = false;
    for (let i = 0; i < 30; i += 1) {
      const res = await request(app).post("/api/auth/login").send({
        email: buyerEmail,
        password: "WrongPassword123!",
      });
      if (res.status === 429) {
        hitLimit = true;
        break;
      }
    }
    expect(hitLimit).toBe(true);
  });

  it("supports shipment events, refund accounting, and order audit logs", async () => {
    const product = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${state.sellerToken}`)
      .send({
        title: `Refund Product ${Date.now()}`,
        description: "refund-flow",
        category: "test",
        price: 140,
        stock: 5,
        attributes: {},
        images: [],
      });
    expect(product.status).toBe(201);
    const productId = product.body.data._id as string;

    const add = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${state.buyerToken}`)
      .send({ productId, quantity: 1 });
    expect(add.status).toBe(200);

    const createdOrder = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${state.buyerToken}`)
      .send({ addressId: state.addressId });
    expect(createdOrder.status).toBe(201);
    const orderId = createdOrder.body.data.id as string;

    const pay = await request(app)
      .post("/api/payments/simulate")
      .set("Authorization", `Bearer ${state.buyerToken}`)
      .send({ orderId, outcome: "SUCCESS", providerRef: `refund-sim-${Date.now()}` });
    expect(pay.status).toBe(201);

    const ship = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${state.sellerToken}`)
      .send({ status: "SHIPPED", carrier: "Yurtici", trackingNumber: "TRK12345" });
    expect(ship.status).toBe(200);
    expect(ship.body.data.status).toBe("SHIPPED");

    const inTransit = await request(app)
      .post(`/api/orders/${orderId}/shipment/events`)
      .set("Authorization", `Bearer ${state.sellerToken}`)
      .send({ status: "IN_TRANSIT", note: "Dagitim merkezinde" });
    expect(inTransit.status).toBe(200);
    expect(inTransit.body.data.status).toBe("IN_TRANSIT");

    const walletBefore = await prisma.wallet.findUnique({ where: { userId: state.buyerId } });
    const refund = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${state.adminToken}`)
      .send({ status: "REFUNDED", reasonCode: "CUSTOMER_REQUEST", note: "Musteri talebi" });
    expect(refund.status).toBe(200);
    expect(refund.body.data.status).toBe("REFUNDED");

    const walletAfter = await prisma.wallet.findUnique({ where: { userId: state.buyerId } });
    expect(walletBefore).toBeTruthy();
    expect(walletAfter).toBeTruthy();
    expect(Number(walletAfter!.balance)).toBeGreaterThan(Number(walletBefore!.balance));

    const logs = await request(app)
      .get(`/api/orders/${orderId}/audit-logs`)
      .set("Authorization", `Bearer ${state.adminToken}`);
    expect(logs.status).toBe(200);
    expect(Array.isArray(logs.body.data)).toBe(true);
    expect(logs.body.data.some((l: { action: string }) => l.action === "ORDER_REFUNDED")).toBe(
      true,
    );

    const verify = await request(app)
      .get(`/api/orders/${orderId}/audit-logs/verify`)
      .set("Authorization", `Bearer ${state.adminToken}`);
    expect(verify.status).toBe(200);
    expect(verify.body.data.valid).toBe(true);

    const ledger = await request(app)
      .get(`/api/orders/${orderId}/ledger`)
      .set("Authorization", `Bearer ${state.adminToken}`);
    expect(ledger.status).toBe(200);
    expect(Array.isArray(ledger.body.data)).toBe(true);
    expect(ledger.body.data.length).toBeGreaterThanOrEqual(2);
    expect(
      ledger.body.data.some(
        (e: { accountType: string; entryType: string }) =>
          e.accountType === "PLATFORM_ESCROW" && e.entryType === "DEBIT",
      ),
    ).toBe(true);
    expect(
      ledger.body.data.some(
        (e: { accountType: string; entryType: string }) =>
          e.accountType === "USER_WALLET" && e.entryType === "CREDIT",
      ),
    ).toBe(true);
  });
});

preflightSuite("API integration preflight", () => {
  it("skips when Mongo/Postgres are unreachable", () => {
    expect(setupError).toBeTruthy();
  });
});
