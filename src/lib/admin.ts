import { createHash, createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

export const ADMIN_COOKIE = "gecele_admin";
const SESSION_HOURS = 12;

// TƏHLÜKƏSİZLİK TARİXÇƏSİ:
// Əvvəl token = sha256("gecele:" + parol) idi — yəni SABİT dəyər.
// Kukidəki maxAge yalnız brauzerə işarə idi; server heç vaxt müddət yoxlamırdı.
// Nəticə: kuki bir dəfə ələ keçsə (log, ortaq kompüter, backup) — ƏBƏDİ admin.
// İndi: exp.HMAC formatı, imza açarı parolun hash-ı ilə bağlıdır →
//  (1) müddət SERVER tərəfdə yoxlanılır,
//  (2) parol dəyişən kimi bütün köhnə tokenlər avtomatik etibarsız olur.

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (s && s.length > 0) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET təyin edilməyib — admin sessiya imzası üçün mütləqdir"
    );
  }
  return "gecele-dev-secret";
}

/** İmza açarı parola bağlıdır — parol rotasiyası köhnə sessiyaları öldürür. */
function signingKey(): string {
  const pwHash = createHash("sha256")
    .update(process.env.ADMIN_PASSWORD ?? "")
    .digest("hex");
  return `${secret()}:admin:${pwHash}`;
}

function sign(payload: string): string {
  return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

/** Yeni admin sessiya tokeni: <expiryMs>.<HMAC> */
export function makeAdminToken(): string {
  const exp = Date.now() + SESSION_HOURS * 3_600_000;
  const payload = String(exp);
  return `${payload}.${sign(payload)}`;
}

export function verifyAdmin(req: NextRequest): boolean {
  if (!process.env.ADMIN_PASSWORD) return false;

  const token = req.cookies.get(ADMIN_COOKIE)?.value ?? "";
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [expStr, sig] = parts;
  if (!/^\d+$/.test(expStr)) return false;

  const expected = Buffer.from(sign(expStr));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length) return false;
  if (!timingSafeEqual(expected, actual)) return false;

  // Müddət SERVER tərəfdə yoxlanılır — kukinin maxAge-inə güvənmirik
  return Number(expStr) > Date.now();
}

/** Parol yoxlaması — sabit vaxtlı müqayisə. */
export function verifyAdminPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return a.length === b.length && timingSafeEqual(a, b);
}

export const ADMIN_SESSION_SECONDS = SESSION_HOURS * 3600;
