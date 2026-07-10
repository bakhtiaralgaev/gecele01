import { format } from "date-fns";
import { az } from "date-fns/locale";

/**
 * Chrome-un Intl `az` locale-ində ay adları yoxdur — `toLocaleDateString`
 * "M07" qaytarır. Ona görə bütün ay adları date-fns `az` locale-indən gəlir.
 */

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "2026-08-21" → Date (lokal saat qurşağı, gecə yarısı). */
export function parseDay(s: string): Date | undefined {
  if (!DAY_RE.test(s)) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Date → "2026-08-21". */
export function toDayStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** "2026-08-21" → "21 Avq". Yanlış giriş üçün boş sətir. */
export function formatDayShort(s: string): string {
  const d = parseDay(s);
  return d ? format(d, "d MMM", { locale: az }) : "";
}

/** Date → "Avqust". */
export function formatMonthLong(d: Date): string {
  return format(d, "LLLL", { locale: az });
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

export function startOfToday(): Date {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}
