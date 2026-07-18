import "dotenv/config";
import { execSync } from "child_process";

// Testlər İZOLƏ edilmiş Neon branch-ında ("test") işləyir — production-a
// heç vaxt toxunmur. Hər qaçışdan əvvəl sxem sıfırdan qurulur.

/** Bağlantı sətrindən yalnız "hansı baza" hissəsini çıxarır (parolsuz). */
function databaseIdentity(url: string): string | null {
  try {
    const u = new URL(url);
    // Eyni branch həm pooler-li, həm pooler-siz göstərilə bilər — eyni bazadır.
    return `${u.hostname.replace("-pooler", "")}${u.pathname}`;
  } catch {
    return null;
  }
}

export default function setup() {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    throw new Error(
      "TEST_DATABASE_URL yoxdur. .env-ə Neon `test` branch-ının URL-ini yazın."
    );
  }

  const testId = databaseIdentity(testUrl);
  if (!testId) {
    throw new Error("TEST_DATABASE_URL düzgün bağlantı sətri deyil.");
  }

  // ⛔ Aşağıdakı əmr bazanı TAMAMİLƏ silir. Fayl silməkdən fərqli olaraq bu,
  // şəbəkə üzərindən istənilən bazaya çata bilər — .env-ə səhvən production
  // URL-i düşsə bütün rezervlər gedərdi. Ona görə əvvəlcə yoxlayırıq.
  const prodId = process.env.DATABASE_URL
    ? databaseIdentity(process.env.DATABASE_URL)
    : null;
  if (prodId && prodId === testId) {
    throw new Error(
      "TEST_DATABASE_URL production bazası ilə eynidir — testlər onu silərdi. " +
        "Neon-da ayrıca `test` branch yaradıb URL-ini .env-ə yazın."
    );
  }

  // `db push` YOX, `migrate reset` — çünki push sxemi yalnız schema.prisma-dan
  // çıxarır və migration-lardakı xam SQL-i (ikiqat rezervasiya EXCLUDE bloku)
  // tətbiq etmir. Reset bütün migration-ları sıra ilə oynadır, yəni test bazası
  // production ilə HƏRFİ eyni olur.
  execSync("npx prisma migrate reset --force --skip-seed --skip-generate", {
    env: { ...process.env, DATABASE_URL: testUrl, DIRECT_URL: testUrl },
    stdio: "ignore",
  });
}
