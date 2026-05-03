# 🚀 Production Deployment Checklist

Bu doküman, NexusMarket uygulamasının yerel geliştirme (local development) ortamından canlı ortama (production) güvenli, performanslı ve sorunsuz bir şekilde taşınmasını sağlamak için oluşturulmuştur.

## 🛡️ 1. Güvenlik (Security)
- [ ] **Environment Variables:** `.env` dosyasındaki tüm test şifreleri, JWT secret key'leri ve veritabanı bağlantı metinleri (connection strings) production için güvenli, güçlü ve tahmin edilemez değerlerle değiştirildi.
- [ ] **CORS Konfigürasyonu:** Sadece izin verilen alan adlarından (frontend domain'i) gelen isteklere yanıt verecek şekilde `cors` ayarları kısıtlandı.
- [ ] **Rate Limiting:** Kaba kuvvet (brute-force) saldırılarını ve DDoS girişimlerini engellemek için `express-rate-limit` entegre edildi (Örn: IP başına 15 dakikada 100 istek).
- [ ] **HTTP Headers:** `helmet` kütüphanesi ile güvenlik başlıkları (security headers) aktif hale getirildi (XSS koruması, clickjacking önleme).
- [ ] **Token Güvenliği:** JWT token süreleri (expiration) mantıklı sınırlandırmalara çekildi.

## 💾 2. Veritabanı ve ORM (Database & ORM)
- [ ] **Migration Kontrolü:** `npx prisma migrate deploy` komutu CI/CD pipeline'ında sorunsuz çalışıyor ve PostgreSQL şeması güncel.
- [ ] **Bağlantı Havuzlaması (Connection Pooling):** Serverless veya container tabanlı ortamlarda DB bağlantılarının tükenmemesi için Neon veritabanı üzerinde pooling (pgbouncer/pooler) aktif edildi.
- [ ] **İndeksleme (Indexing):** MongoDB ve PostgreSQL üzerinde sık sorgulanan alanlar (örneğin; email, storeName) için gerekli indeksler oluşturuldu.
- [ ] **Yedekleme (Backup):** Bulut veritabanı sağlayıcılarında (Neon & Atlas) otomatik günlük yedekleme özellikleri aktif edildi.

## 🐳 3. Docker ve Altyapı (Docker & Infrastructure)
- [ ] **Multi-stage Build:** Docker imajı multi-stage (builder ve runtime) mimarisi ile oluşturuldu, böylece imaj boyutu optimize edildi.
- [ ] **Non-root User:** Docker container'ı güvenlik amacıyla `root` yetkileriyle değil, düşük yetkili `node` kullanıcısı ile çalıştırılıyor.
- [ ] **Restart Policy:** `docker-compose` veya canlı sunucu ortamında uygulamanın çökme durumuna karşı `restart: always` veya `unless-stopped` kuralı tanımlandı.
- [ ] **Volume Yönetimi:** Container silinse dahi kaybolmaması gereken kritik veriler (varsa) docker volume'lerine bağlandı.

## ⚙️ 4. Performans ve Optimizasyon
- [ ] **Logging:** Geliştirme ortamındaki (development) aşırı detaylı konsol logları kapatıldı. Bunun yerine `Winston` veya `Morgan` kullanılarak loglar izlenebilir ve yapılandırılmış (JSON formatında) hale getirildi.
- [ ] **Compression:** HTTP yanıt boyutlarını küçültmek ve ağ trafiğini azaltmak için `compression` middleware'i projeye dahil edildi.
- [ ] **Hata Yakalama (Error Handling):** Sistemin çökmesini engellemek için `uncaughtException` ve `unhandledRejection` durumları yakalanıp güvenli bir şekilde kapatılma (graceful shutdown) mekanizması eklendi.

## 🚀 5. CI/CD Pipeline (GitHub Actions)
- [ ] **Otomatik Testler:** Pipeline üzerinde `npm test`, Linting ve Audit kontrolleri başarıyla geçmeden canlıya alım yapılmıyor.
- [ ] **Image Tagging:** GHCR'a push edilen Docker imajları sadece `latest` tag'i ile değil, spesifik versiyon tag'leri (örn: `v1.0.3`) ve commit hash'leri ile etiketlendi.
- [ ] **Health Check:** CI/CD süreçlerinin ve Load Balancer'ın uygulamanın ayakta olup olmadığını anlayabilmesi için bir `/api/health` endpoint'i oluşturuldu.
