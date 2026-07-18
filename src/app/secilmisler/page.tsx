"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ListingCard from "@/components/ListingCard";
import type { ListingDto } from "@/lib/data";
import { readLocalWishlist, WISHLIST_SYNCED_EVENT } from "@/lib/wishlist";

export default function Wishlist() {
  const [items, setItems] = useState<ListingDto[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      const ids = readLocalWishlist();
      if (ids.length === 0) {
        if (!cancelled) setItems([]);
        return;
      }
      fetch("/api/listings")
        .then((r) => r.json())
        .then((all: ListingDto[]) => {
          if (cancelled) return;
          const wanted = new Set(ids);
          setItems(all.filter((l) => wanted.has(l.id)));
        })
        .catch(() => {
          if (!cancelled) setItems([]);
        });
    };
    load();
    // Hesab sinxronundan sonra siyahını yenilə (cihazlar arası)
    window.addEventListener(WISHLIST_SYNCED_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(WISHLIST_SYNCED_EVENT, load);
    };
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 mt-8 pb-16">
      <h1 className="font-serif font-bold text-2xl text-gece tracking-tight">
        Seçilmişlər
      </h1>
      <p className="mt-1 text-sm text-gece/60">
        Bəyəndiyiniz evlər — istənilən vaxt geri qayıdın.
      </p>

      {items === null && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square bg-kraft rounded-xl animate-pulse"
            />
          ))}
        </div>
      )}

      {items && items.length === 0 && (
        <div className="mt-14 text-center">
          <p className="font-semibold text-gece">Hələ seçilmişiniz yoxdur</p>
          <p className="mt-1 text-sm text-gece/60">
            Evlərin üzərindəki ürək işarəsinə toxunub yadda saxlayın.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block bg-nar hover:bg-nar-dark text-white font-semibold px-6 py-3 rounded-full"
          >
            Evlərə bax
          </Link>
        </div>
      )}

      {items && items.length > 0 && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
          {items.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </main>
  );
}
