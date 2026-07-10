# Gecələ — Deploy təlimatı

Layihə lokalda **SQLite**, canlıda **Postgres (Neon) + Vercel** üçün hazırdır.

## 1. Verilənlər bazası (Neon Postgres)
1. https://neon.tech-də pulsuz layihə yarat, `DATABASE_URL`-i kopyala.
2. `prisma/schema.prisma`-da provider-i dəyiş:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Sxemi tətbiq et və nümunə data yüklə:
   ```bash
   npx prisma db push
   npm run db:seed
   ```

## 2. Vercel
1. Reponu GitHub-a push et, Vercel-də **Import Project**.
2. **Environment Variables** — `.env.example`-dakı açarları doldur. Minimum:
   - `DATABASE_URL` (Neon)
   - `AUTH_SECRET` → `openssl rand -hex 32`
   - `ADMIN_PASSWORD` → güclü parol
   - `NEXT_PUBLIC_SITE_URL` → `https://sizin-domeniniz`
3. Deploy et. Build əmri `prisma generate && next build` avtomatik işləyir.

## 3. Real xidmətlər (istəyə bağlı — açar qoşulan kimi işə düşür)
| Xidmət | Açar(lar) | Effekt |
|---|---|---|
| Payriff | `PAYRIFF_MERCHANT_ID`, `PAYRIFF_SECRET_KEY` | Real ödəniş (hosted checkout) |
| Vercel Blob | `BLOB_READ_WRITE_TOKEN` | Host foto yükləmə (canlı) |
| Resend | `RESEND_API_KEY` | Email bildirişləri |
| SMS | `SMS_API_KEY`, `SMS_API_URL` | Real OTP + SMS |
| Google/Apple | `GOOGLE_*`, `APPLE_*` | Sosial giriş |
| GA4 / Meta | `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_META_PIXEL_ID` | Analitika / reklam izləmə |

Açar boş olduqda həmin funksiya **demo/test rejimdə** işləyir — sayt tam işlək qalır.

## 4. Şəkil saxlama (vacib qeyd)
Canlıda host foto yükləməsi üçün **Vercel Blob** lazımdır (Vercel → Storage → Blob → `BLOB_READ_WRITE_TOKEN`). Token olmadan canlıda foto yükləmə 503 qaytarır (serverless fayl sistemi read-only-dir).

## 5. Deploy sonrası yoxlama
- [ ] `/` açılır, elanlar görünür
- [ ] `/sitemap.xml`, `/robots.txt` düzgün domenlə cavab verir
- [ ] Qeydiyyat → rezerv → ödəniş (TEST) → kod alınır
- [ ] `/admin` girişi işləyir (ADMIN_PASSWORD)
