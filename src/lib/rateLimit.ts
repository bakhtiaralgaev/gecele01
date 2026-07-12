import { NextRequest } from "next/server";

// Sadə, asılılıqsız sabit-pəncərə rate limiter.
// DEV / tək-instans üçün in-memory Map kifayətdir. PROD-da (serverless, çox
// instans) paylaşılan store lazımdır (Upstash Redis) — interfeys eynidir,
// yalnız `hit()` funksiyasını dəyişmək kifayətdir.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

// Vaxtı keçmiş bucket-ləri təmizlə (yaddaş sızmasın)
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  buckets.forEach((b, k) => {
    if (b.resetAt <= now) buckets.delete(k);
  });
}

export interface RateResult {
  ok: boolean;
  retryAfterSec: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateResult {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count++;
  return { ok: true, retryAfterSec: 0 };
}

/** Sorğudan müştəri açarı: forwarded-for ilk IP, yoxdursa sabit fallback. */
export function clientKey(req: NextRequest, route: string): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]!.trim() || "local";
  return `${ip}:${route}`;
}

/** Limit aşılıbsa hazır 429 cavabı (Retry-After başlığı ilə), yoxsa null. */
export function rateLimit(
  req: NextRequest,
  route: string,
  limit: number,
  windowMs: number,
  extra?: string
): Response | null {
  const key = extra ? `${clientKey(req, route)}:${extra}` : clientKey(req, route);
  const r = checkRateLimit(key, limit, windowMs);
  if (r.ok) return null;
  return new Response(
    JSON.stringify({ error: "Çox sayda cəhd — bir az sonra yenidən yoxlayın" }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(r.retryAfterSec),
      },
    }
  );
}
