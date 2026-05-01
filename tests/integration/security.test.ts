import "dotenv/config";
import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

describe.sequential("Security baseline checks", () => {
  it("returns hardened security headers on health endpoint", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(res.headers["x-dns-prefetch-control"]).toBe("off");
    expect(res.headers["x-download-options"]).toBe("noopen");
    expect(res.headers["x-permitted-cross-domain-policies"]).toBe("none");
    expect(res.headers["referrer-policy"]).toBeTruthy();
  });

  it("rejects malformed bearer token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer definitely-not-a-jwt");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("rejects missing bearer token", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("requires auth on logout-all endpoint", async () => {
    const res = await request(app).post("/api/auth/logout-all");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
