import type { OpenAPIV3 } from "openapi-types";

const bearerAuth: OpenAPIV3.SecuritySchemeObject = {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: "Authorization: Bearer <access_token>",
};

export const openApiSpec: OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "NexusMarket API",
    version: "1.0.0",
    description:
      "NexusMarket e-ticaret backend API. Korumalı uçlar için access token gönderin.",
  },
  servers: [{ url: "/", description: "İstekler mevcut host köküne göre çözülür" }],
  tags: [
    { name: "Sistem" },
    { name: "Kimlik" },
    { name: "Adresler" },
    { name: "Kuponlar" },
    { name: "Ürünler" },
    { name: "Sepet" },
    { name: "Siparişler" },
    { name: "Ödemeler" },
  ],
  components: {
    securitySchemes: {
      bearerAuth,
    },
    schemas: {
      ErrorMessage: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string" },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["email", "password", "firstName", "lastName"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8 },
          firstName: { type: "string", minLength: 2 },
          lastName: { type: "string", minLength: 2 },
          role: { type: "string", enum: ["BUYER", "SELLER", "ADMIN"] },
          storeName: { type: "string", minLength: 3 },
          taxNumber: { type: "string", minLength: 6 },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8 },
        },
      },
    },
  },
  paths: {
    "/api/health": {
      get: {
        tags: ["Sistem"],
        summary: "Sağlık kontrolü",
        responses: {
          "200": {
            description: "API ayakta",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/auth/register": {
      post: {
        tags: ["Kimlik"],
        summary: "Kayıt",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/RegisterRequest" } },
          },
        },
        responses: {
          "201": { description: "Kayıt başarılı" },
          "400": {
            description: "Doğrulama hatası",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorMessage" } },
            },
          },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Kimlik"],
        summary: "Giriş",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } },
          },
        },
        responses: {
          "200": { description: "Giriş başarılı" },
          "401": { description: "Geçersiz kimlik bilgileri" },
        },
      },
    },
    "/api/auth/refresh": {
      post: {
        tags: ["Kimlik"],
        summary: "Access token yenileme (refresh cookie)",
        responses: {
          "200": { description: "Yeni access token" },
          "401": { description: "Yetkisiz" },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Kimlik"],
        summary: "Çıkış",
        responses: { "200": { description: "Çıkış yapıldı" } },
      },
    },
    "/api/auth/logout-all": {
      post: {
        tags: ["Kimlik"],
        summary: "Tüm oturumları kapat",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Tamam" }, "401": { description: "Yetkisiz" } },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Kimlik"],
        summary: "Mevcut kullanıcı",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Kullanıcı bilgisi" }, "401": { description: "Yetkisiz" } },
      },
    },
    "/api/addresses/my": {
      get: {
        tags: ["Adresler"],
        summary: "Adreslerimi listele",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Liste" }, "401": { description: "Yetkisiz" } },
      },
    },
    "/api/addresses": {
      post: {
        tags: ["Adresler"],
        summary: "Adres oluştur",
        security: [{ bearerAuth: [] }],
        responses: { "201": { description: "Oluşturuldu" }, "401": { description: "Yetkisiz" } },
      },
    },
    "/api/addresses/{id}": {
      patch: {
        tags: ["Adresler"],
        summary: "Adres güncelle",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Güncellendi" }, "401": { description: "Yetkisiz" } },
      },
      delete: {
        tags: ["Adresler"],
        summary: "Adres sil",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Silindi" }, "401": { description: "Yetkisiz" } },
      },
    },
    "/api/coupons/active": {
      get: {
        tags: ["Kuponlar"],
        summary: "Aktif kuponlar",
        responses: { "200": { description: "Liste" } },
      },
    },
    "/api/coupons": {
      post: {
        tags: ["Kuponlar"],
        summary: "Kupon oluştur (ADMIN)",
        security: [{ bearerAuth: [] }],
        responses: { "201": { description: "Oluşturuldu" }, "403": { description: "Yetkisiz rol" } },
      },
    },
    "/api/coupons/{code}/status": {
      patch: {
        tags: ["Kuponlar"],
        summary: "Kupon durumu (ADMIN)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "code", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Güncellendi" }, "403": { description: "Yetkisiz rol" } },
      },
    },
    "/api/products": {
      get: {
        tags: ["Ürünler"],
        summary: "Ürün listesi",
        responses: { "200": { description: "Liste" } },
      },
      post: {
        tags: ["Ürünler"],
        summary: "Ürün oluştur (SELLER)",
        security: [{ bearerAuth: [] }],
        responses: { "201": { description: "Oluşturuldu" }, "403": { description: "Yetkisiz rol" } },
      },
    },
    "/api/products/{id}": {
      get: {
        tags: ["Ürünler"],
        summary: "Ürün detayı",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Ürün" }, "404": { description: "Bulunamadı" } },
      },
      patch: {
        tags: ["Ürünler"],
        summary: "Ürün güncelle (SELLER)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Güncellendi" }, "403": { description: "Yetkisiz rol" } },
      },
      delete: {
        tags: ["Ürünler"],
        summary: "Ürün sil (SELLER)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Silindi" }, "403": { description: "Yetkisiz rol" } },
      },
    },
    "/api/cart": {
      get: {
        tags: ["Sepet"],
        summary: "Sepeti getir",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Sepet" }, "401": { description: "Yetkisiz" } },
      },
    },
    "/api/cart/items": {
      post: {
        tags: ["Sepet"],
        summary: "Sepete ürün ekle",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Güncel sepet" }, "401": { description: "Yetkisiz" } },
      },
    },
    "/api/cart/items/{productId}": {
      patch: {
        tags: ["Sepet"],
        summary: "Sepet kalemi güncelle",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "productId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Güncel sepet" }, "401": { description: "Yetkisiz" } },
      },
      delete: {
        tags: ["Sepet"],
        summary: "Sepetten kaldır",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "productId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Güncel sepet" }, "401": { description: "Yetkisiz" } },
      },
    },
    "/api/orders": {
      post: {
        tags: ["Siparişler"],
        summary: "Sipariş oluştur",
        security: [{ bearerAuth: [] }],
        responses: { "201": { description: "Oluşturuldu" }, "401": { description: "Yetkisiz" } },
      },
    },
    "/api/orders/my": {
      get: {
        tags: ["Siparişler"],
        summary: "Siparişlerim",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Liste" }, "401": { description: "Yetkisiz" } },
      },
    },
    "/api/orders/{id}": {
      get: {
        tags: ["Siparişler"],
        summary: "Sipariş detayı",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Sipariş" }, "401": { description: "Yetkisiz" } },
      },
    },
    "/api/orders/{id}/tracking": {
      get: {
        tags: ["Siparişler"],
        summary: "Kargo takip",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Takip" }, "401": { description: "Yetkisiz" } },
      },
    },
    "/api/orders/{id}/audit-logs": {
      get: {
        tags: ["Siparişler"],
        summary: "Denetim günlükleri",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Loglar" }, "401": { description: "Yetkisiz" } },
      },
    },
    "/api/orders/{id}/audit-logs/verify": {
      get: {
        tags: ["Siparişler"],
        summary: "Denetim günlüğü doğrula",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Doğrulama sonucu" }, "401": { description: "Yetkisiz" } },
      },
    },
    "/api/orders/{id}/ledger": {
      get: {
        tags: ["Siparişler"],
        summary: "Sipariş defteri",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Defter" }, "401": { description: "Yetkisiz" } },
      },
    },
    "/api/orders/{id}/status": {
      patch: {
        tags: ["Siparişler"],
        summary: "Sipariş durumu güncelle",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Güncellendi" }, "401": { description: "Yetkisiz" } },
      },
    },
    "/api/orders/{id}/shipment/events": {
      post: {
        tags: ["Siparişler"],
        summary: "Kargo olayı ekle",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Eklendi" }, "401": { description: "Yetkisiz" } },
      },
    },
    "/api/payments/webhook": {
      post: {
        tags: ["Ödemeler"],
        summary: "Ödeme sağlayıcı webhook (ham JSON gövde)",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object" } } },
        },
        responses: { "200": { description: "İşlendi" }, "400": { description: "Geçersiz imza / gövde" } },
      },
    },
    "/api/payments/simulate": {
      post: {
        tags: ["Ödemeler"],
        summary: "Ödeme simülasyonu",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Sonuç" }, "401": { description: "Yetkisiz" } },
      },
    },
    "/api/payments/retry": {
      post: {
        tags: ["Ödemeler"],
        summary: "Ödemeyi yeniden dene",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Sonuç" }, "401": { description: "Yetkisiz" } },
      },
    },
  },
};
