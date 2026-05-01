# NexusMarket Backend Onboarding

Bu dokuman, projeye yeni katilan bir gelistiricinin sistemi hizli anlamasi ve local ortamda calistirmasi icin hazirlanmistir.

## 1. Projeyi Anlamak

NexusMarket backend, cok satili e-ticaret akislarina odakli bir REST API servisidir.

Temel domainler:

- Authentication (register/login/refresh/logout)
- Products (seller urun yonetimi)
- Cart (buyer sepet)
- Orders (checkout + status management)
- Payments (simulate/retry/webhook)
- Coupons (admin kampanya yonetimi)
- Addresses (teslimat adresleri)
- Shipping + Audit + Ledger (izlenebilir operasyon)

## 2. Katmanli Yapi

Her modulde genel akis:

1. `*.route.ts`: endpoint ve middleware baglantisi
2. `*.controller.ts`: HTTP request/response mapping
3. `*.service.ts`: business logic
4. `*.schema.ts`: zod validasyon
5. `*.model.ts`: (varsa) mongoose modeli

Ornek:

- `src/modules/orders/order.route.ts`
- `src/modules/orders/order.controller.ts`
- `src/modules/orders/order.service.ts`
- `src/modules/orders/order.schema.ts`

## 3. Veritabani Tasarimi (Hibrit)

### PostgreSQL + Prisma

Islemsel ve iliskisel veriler:

- `User`, `Store`
- `Order`, `OrderItem`
- `PaymentTransaction`
- `Wallet`, `WalletLedgerEntry`
- `Address`
- `Coupon`
- `RefreshSession`

Schema: `prisma/schema.prisma`

### MongoDB + Mongoose

Yuksek degisimli ve dokuman odakli veriler:

- `Product`
- `Cart`
- `Shipment`
- `OrderAuditLog`

## 4. Baslatma Akisi

`src/server.ts`:

1. `connectMongo()`
2. `prisma.$connect()`
3. `app.listen(env.PORT)`

`src/app.ts`:

- `helmet`, `cors`, `cookie-parser`, `express.json`
- `/api/payments/webhook` icin `rawBody` yakalama
- `/api` route mount
- global `errorHandler`

## 5. Ortam Degiskenleri

Kaynak: `.env.example` ve `src/lib/env.ts`

Kritik degiskenler:

- `DATABASE_URL`
- `MONGO_URI`
- `JWT_SECRET`
- `REFRESH_TOKEN_SECRET`
- `PAYMENT_WEBHOOK_SECRET`
- `AUDIT_LOG_SIGNING_SECRET`
- `CORS_ORIGIN`

`src/lib/env.ts`, zod ile tum degiskenleri dogrular; eksik/yanlis degerde uygulama baslamaz.

## 6. Yetkilendirme ve Guvenlik

### Auth

- Bearer JWT ile `requireAuth` middleware
- Role bazli kontrol `requireRole`
- Roller: `BUYER`, `SELLER`, `ADMIN`

### Refresh Token Guvenligi

- Refresh token DB'de hashli saklanir (`RefreshSession`)
- Rotation uygulanir
- Reuse/replay tespitinde tum aktif sessionlar revoke edilir

### Rate Limit

- `authCredentialLimiter`: login/register brute-force korumasi
- `authRefreshLimiter`: refresh endpoint korumasi

### Webhook Guvenligi

- HMAC imza kontrolu
- timestamp zorunlulugu
- tolerance penceresi ile replay korumasi
- timing-safe compare

## 7. Siparis ve Odeme Is Kurallari

### Checkout

- Sepet bos olamaz
- Sepet urunleri icin stok uygunluguna bakilir
- `reservedStock` artirilir (rezerv)
- kupon/indirim/tax/shipping hesaplanir
- order + order item kayitlari olusur
- sepet temizlenir

### Odeme

- `simulate`: PENDING siparis icin odeme sonucu uretir
- `retry`: en az bir FAILED denemesi varsa tekrar dener
- SUCCESS:
  - rezerv stok dusurulur
  - stok kalici azaltilir
  - order -> `PAID`
- payment_failed_final webhook:
  - rezerv stok salinir
  - order -> `CANCELLED`

### Status Policy

`src/modules/orders/order-policy.ts`:

- `SHIPPED`: sadece uygun seller/admin, mevcut status `PAID`
- `DELIVERED`: admin veya siparis sahibi buyer, mevcut `SHIPPED`
- `CANCELLED`: admin veya belirli kosulda buyer
- `REFUNDED`: sadece admin, uygun status setinde

## 8. Audit, Shipment, Ledger

### Shipment

- Kargo olaylari (`IN_TRANSIT`, `DELIVERED`, `CANCELLED`) timeline olarak saklanir

### Audit Log

- Her kritik order aksiyonu `OrderAuditLog`'a yazilir
- HMAC hash-chain: her kayit onceki hash'i referanslar
- Admin audit zinciri dogrulama endpointi ile manipule edilmedigi kontrol edilir

### Ledger

- Iade gibi finansal islemlerde cift tarafli kayit (escrow debit + wallet credit)
- `WalletLedgerEntry` ile order bazli finans hareketleri izlenir

## 9. Local Kurulum

### Gereksinimler

- Node.js 20+
- PostgreSQL calisan instance
- MongoDB calisan instance

### Adimlar

```bash
npm install
```

`.env.example` -> `.env` kopyalayin ve local degerleri girin.

```bash
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

## 10. Test Stratejisi

Komut:

```bash
npm test
```

Test dosyalari:

- `tests/integration/security.test.ts`
- `tests/integration/api.test.ts`

Kapsanan senaryolar:

- security headers
- auth ve token rotation
- role-based authorization
- stock/cart/order akislari
- payment retry + webhook idempotency + replay korumasi
- shipment/refund/audit/ledger akislari

Not: Harici/veri merkezi baglantilarina bagli ortamlarda (ozellikle Atlas whitelist) integration suite erisime bagli skip/fail verebilir.

## 11. Faydali Komutlar

```bash
npm run dev
npm run build
npm start
npm test
npm run prisma:generate
npm run prisma:migrate
```

## 12. Docker ile Calistirma

Proje root'unda hazir bir `docker-compose.yml` vardir.

Calistirmak icin:

```bash
docker compose up --build
```

Servisler:

- `app` (Node.js backend)
- `postgres` (Prisma datasouce)
- `mongo` (Mongoose datasouce)

`app` container acilisinda otomatik olarak `prisma migrate deploy` calisir ve sonra server ayaga kalkar.

## 13. CI/CD Ozeti

CI workflow: `/.github/workflows/ci.yml`

Pipeline adimlari:

1. Checkout + Node setup
2. Postgres/Mongo service container
3. Dependency install
4. Prisma generate + migrate deploy
5. Build + test
6. Docker build verification
7. Security gate (`npm audit --audit-level=high`)

Bu akis, "kod calisiyor mu?" sorusunun yanina "container olarak deploy edilebilir mi?" sorusunu da ekler.

## 14. Gelistirme Oncelik Onerileri

Yeni katilan bir gelistirici icin oncelikli okuma sirası:

1. `src/app.ts`
2. `src/routes/index.ts`
3. `src/modules/auth/*`
4. `src/modules/orders/*`
5. `src/modules/payments/*`
6. `prisma/schema.prisma`
7. `tests/integration/api.test.ts`

Bu siralama, sistemi en hizli sekilde mental modele oturtur.
