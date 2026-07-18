// Seçilmişlər (wishlist) — localStorage + hesab sinxronizasiyası.
// Anonim istifadəçi: yalnız localStorage. Giriş edən: server mənbədir, lokal
// seçimlər serverlə birləşdirilir və localStorage serverdən doldurulur.

export const WISHLIST_KEY = "gecele_wishlist";
// localStorage server-lə sinxrondan sonra atılan hadisə — komponentlər dinləyir
export const WISHLIST_SYNCED_EVENT = "wishlist-synced";

export function readLocalWishlist(): string[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(WISHLIST_KEY) ?? "[]");
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export function writeLocalWishlist(ids: string[]) {
  try {
    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
  } catch {
    // localStorage əlçatan deyil — səssiz keç
  }
}

// Tək toggle nəticəsini serverə göndər (fire-and-forget).
// Giriş yoxdursa server 401 verir — səssizcə localStorage-da qalır.
export function pushWishlistChange(listingId: string, added: boolean) {
  fetch("/api/wishlist", {
    method: added ? "POST" : "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId }),
  }).catch(() => {});
}

// Giriş edəndə çağırılır: lokal seçimləri serverə yüklə, sonra serverdəki
// tam siyahını localStorage ilə birləşdirib yaz və komponentlərə xəbər ver.
export async function syncWishlist(): Promise<void> {
  const local = readLocalWishlist();
  try {
    if (local.length) {
      await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingIds: local }),
      });
    }
    const r = await fetch("/api/wishlist");
    if (!r.ok) return;
    const d = await r.json();
    if (!d.authed || !Array.isArray(d.ids)) return;
    const merged = Array.from(new Set<string>([...local, ...d.ids]));
    writeLocalWishlist(merged);
    window.dispatchEvent(new Event(WISHLIST_SYNCED_EVENT));
  } catch {
    // şəbəkə xətası — lokal vəziyyət qalır
  }
}
