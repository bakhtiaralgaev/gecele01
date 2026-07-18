// Env sağlamlıq yoxlaması.
//
// TƏLƏ: getGateway()/smsLive()/oauthLive() sadəcə "dəyər varmı?" deyə soruşur.
// Ona görə .env-də placeholder ("your_key_here", "xxx", "changeme") qalsa,
// tətbiq özünü CANLI sayır və bütün ödənişlər/SMS sınır — heç bir xəbərdarlıq
// olmadan. Bu modul həmin vəziyyəti erkən tutur.

const PLACEHOLDER = /^(your[_-]?|xxx+$|todo$|changeme$|placeholder$|<.*>$|example$)/i;

export interface EnvIssue {
  key: string;
  level: "error" | "warn";
  message: string;
}

/** Dəyər real görünürmü? (dəyərin özü heç vaxt qaytarılmır/loglanmır) */
function looksReal(v: string | undefined, minLen = 8): boolean {
  if (!v || v.trim() === "") return false;
  if (PLACEHOLDER.test(v.trim())) return false;
  return v.trim().length >= minLen;
}

/** Cütlük: ya HƏR İKİSİ dolu, ya heç biri — yarımçıq konfiqurasiya ən pisidir. */
function checkPair(
  issues: EnvIssue[],
  a: string,
  b: string,
  what: string
): void {
  const av = process.env[a];
  const bv = process.env[b];
  const aSet = looksReal(av);
  const bSet = looksReal(bv);
  if (aSet !== bSet) {
    issues.push({
      key: `${a}/${b}`,
      level: "error",
      message: `${what}: yalnız biri doldurulub — ya hər ikisi, ya heç biri olmalıdır`,
    });
  }
  if ((av && !aSet && av.trim() !== "") || (bv && !bSet && bv.trim() !== "")) {
    issues.push({
      key: `${a}/${b}`,
      level: "error",
      message: `${what}: dəyər placeholder-ə oxşayır — tətbiq özünü CANLI sayacaq və sınacaq`,
    });
  }
}

export function checkEnv(): EnvIssue[] {
  const issues: EnvIssue[] = [];
  const isProd = process.env.NODE_ENV === "production";

  if (!looksReal(process.env.AUTH_SECRET, 16)) {
    issues.push({
      key: "AUTH_SECRET",
      level: isProd ? "error" : "warn",
      message: "ən azı 16 simvol təsadüfi dəyər olmalıdır (sessiya imzası)",
    });
  }
  if (!looksReal(process.env.ADMIN_PASSWORD, 12)) {
    issues.push({
      key: "ADMIN_PASSWORD",
      level: isProd ? "error" : "warn",
      message: "ən azı 12 simvol olmalıdır",
    });
  }
  if (!process.env.DATABASE_URL) {
    issues.push({ key: "DATABASE_URL", level: "error", message: "təyin edilməyib" });
  } else if (isProd && process.env.DATABASE_URL.startsWith("file:")) {
    issues.push({
      key: "DATABASE_URL",
      level: "error",
      message:
        "prod-da SQLite İŞLƏMİR — Vercel faylı efemerdir, hər yazı itir (Postgres lazımdır)",
    });
  }

  checkPair(issues, "PAYRIFF_MERCHANT_ID", "PAYRIFF_SECRET_KEY", "Payriff");
  checkPair(issues, "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "Google OAuth");
  checkPair(issues, "APPLE_CLIENT_ID", "APPLE_KEY_ID", "Apple OAuth");

  if (isProd && !looksReal(process.env.CRON_SECRET, 16)) {
    issues.push({
      key: "CRON_SECRET",
      level: "error",
      message: "prod-da cron qorunmasız qalır",
    });
  }
  if (isProd && !looksReal(process.env.BLOB_READ_WRITE_TOKEN)) {
    issues.push({
      key: "BLOB_READ_WRITE_TOKEN",
      level: "warn",
      message: "foto yükləmə prod-da işləməyəcək",
    });
  }

  return issues;
}

/** İnsan üçün oxunaqlı hesabat — DƏYƏRLƏR heç vaxt çap olunmur. */
export function formatEnvReport(issues: EnvIssue[]): string {
  if (issues.length === 0) return "ENV: ✓ problem yoxdur";
  return issues
    .map((i) => `${i.level === "error" ? "✗" : "!"} ${i.key}: ${i.message}`)
    .join("\n");
}
