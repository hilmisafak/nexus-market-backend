# NexusMarket Backend

NexusMarket Backend, cok saticili bir pazar yeri uygulamasinin sunucu tarafini saglar.  
Kimlik dogrulama, urun yonetimi, sepet, siparis, odeme, kargo, kupon ve iade/ledger akislarini tek bir API altinda toplar.

## Neler Yapar?

- Buyer, Seller, Admin rolleri ile kullanici kayit/giris yonetimi yapar.
- Seller kullanicilarin urun olusturma, guncelleme ve silme islemlerini yonetir.
- Buyer kullanicilarin sepet ve siparis akislarini stok guvencesi ile calistirir.
- Odeme simulasyonu ve webhook tabanli asenkron odeme sonuclari isler.
- Kupon olusturma ve uygulama kurallarini uygular.
- Kargo durumlari, shipment event timeline ve siparis status gecislerini takip eder.
- Audit log hash-chain ve wallet ledger ile islemlerin izlenebilirligini artirir.

## Temel Ozellikler

### 1) Kimlik Dogrulama ve Oturum Guvenligi

- JWT access token + refresh token mimarisi
- Refresh token rotation
- Reuse/replay tespitinde tum oturumlari revoke etme
- Login/register/refresh endpointleri icin brute-force/rate limit korumasi

### 2) Siparis ve Stok Yonetimi

- Sepetten siparis olusturma
- Siparis aninda stok rezervasyonu (`reservedStock`)
- Odeme basariliysa stok kesinlestirme, odeme final-fail ise rezerv stok salma
- Rol tabanli siparis status gecis kurallari

### 3) Odeme ve Webhook Guvenligi

- Simule odeme + retry mekanizmasi
- Webhook imza dogrulamasi (HMAC)
- Timestamp toleransi ile replay protection
- Idempotent webhook isleme

### 4) Operasyonel Izlenebilirlik

- Shipment event gecmisi
- Siparis audit log (hash-chain)
- Audit chain dogrulama endpointi
- Wallet ledger hareketleri

## Teknoloji Yigini

- Node.js + Express + TypeScript
- Prisma + PostgreSQL
- Mongoose + MongoDB
- Zod validasyon
- Vitest + Supertest
- Docker + Docker Compose
- GitHub Actions tabanli CI

## Mimari Ozet

- `src/server.ts`: uygulama bootstrap (Mongo + Prisma connect + HTTP server)
- `src/app.ts`: middleware zinciri, `/api` mount, global error handler
- `src/routes/index.ts`: route module baglantilari
- `src/modules/*`: route/controller/service/model/schema katmanlari

Veritabani mimarisi hibrittir:

- PostgreSQL (Prisma): `User`, `Order`, `PaymentTransaction`, `Wallet`, `Address`, `Coupon`, `RefreshSession`, `WalletLedgerEntry`
- MongoDB (Mongoose): `Product`, `Cart`, `Shipment`, `OrderAuditLog`

## API Modulleri

- `/api/auth`
- `/api/addresses`
- `/api/coupons`
- `/api/products`
- `/api/cart`
- `/api/orders`
- `/api/payments`
- `/api/health`

Daha detayli endpoint ve akis aciklamasi icin `docs/onboarding.md` dosyasina bak.

## DevOps ve CI/CD

Bu proje, CV'de gosterebilecegin production-benzeri bir DevOps katmani ile gelir.

### Docker

- `Dockerfile`: multi-stage build (dependency -> build -> runtime)
- `docker-compose.yml`: `app`, `postgres`, `mongo` servisleri
- Uygulama konteyneri acilisinda `prisma migrate deploy` calistirir
- `.dockerignore` ile image boyutu ve build suresi optimize edilir

Calistirmak icin:

```bash
docker compose up --build
```

### GitHub Actions CI

`/.github/workflows/ci.yml` pipeline'i su adimlari calistirir:

1. Postgres ve Mongo servislerini ayağa kaldirir
2. `npm ci`
3. `prisma generate` + `prisma migrate deploy`
4. `npm run build`
5. `npm test`
6. Docker image build dogrulamasi (`docker build`)
7. `npm audit --audit-level=high`

Bu sayede hem kod kalitesi hem de deploya hazirlik (container build) tek pipeline'da dogrulanir.

## Hizli Baslangic

### Gereksinimler

- Node.js 20+
- PostgreSQL
- MongoDB

### Kurulum

```bash
npm install
```

`.env.example` dosyasini kopyalayip `.env` olusturun ve degerleri doldurun.

### Prisma Hazirlama

```bash
npm run prisma:generate
npm run prisma:migrate
```

### Calistirma

Gelistirme:

```bash
npm run dev
```

Uretim:

```bash
npm run build
npm start
```

### Test

```bash
npm test
```

Not: Entegrasyon testleri dis baglanti kullanan veritabani konfigurasyonlarinda (ornegin Atlas IP whitelist) ortama bagli olarak skip/fail davranisi gosterebilir.
CI pipeline'inda ise local service container'lari kullanildigi icin testler daha deterministik calisir.

## Guvenlik Notlari

- Tum gizli anahtarlar `.env` uzerinden yonetilir.
- Uretimde guclu secret degerleri kullanin.
- `CORS_ORIGIN` degerini whitelist mantigi ile acikca tanimlayin.
- Webhook secret ve audit signing secret degerlerini ayri tutun.

## Lisans

Bu proje su an `ISC` lisans bilgisi ile tanimlidir (`package.json`).
