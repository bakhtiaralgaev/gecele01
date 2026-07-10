"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ListingDto } from "@/lib/data";
import { IconHeart, IconStar } from "./Icons";

const WISHLIST_KEY = "gecele_wishlist";

function readWishlist(): string[] {
  try {
    return JSON.parse(window.localStorage.getItem(WISHLIST_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export default function ListingCard({ listing }: { listing: ListingDto }) {
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    setLiked(readWishlist().includes(listing.id));
  }, [listing.id]);

  const toggleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const list = readWishlist();
    const next = list.includes(listing.id)
      ? list.filter((x) => x !== listing.id)
      : [...list, listing.id];
    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(next));
    setLiked(next.includes(listing.id));
  };

  return (
    <Link href={`/ev/${listing.slug}`} className="group block">
      <div className="relative aspect-square rounded-xl overflow-hidden bg-kraft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={listing.photo}
          alt={listing.title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
        />
        <button
          onClick={toggleLike}
          aria-label={liked ? "Seçilmişlərdən çıxar" : "Seçilmişlərə əlavə et"}
          className="absolute top-0.5 right-0.5 p-2.5 hover:scale-110 transition-transform"
        >
          <IconHeart filled={liked} className="w-6 h-6 drop-shadow" />
        </button>
        {listing.rating >= 4.8 && listing.reviews >= 10 ? (
          <span className="absolute top-3 left-3 bg-white/95 text-gece text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
            Super ev sahibi
          </span>
        ) : (
          listing.pool && (
            <span className="absolute top-3 left-3 bg-white/95 text-gece text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
              Hovuzlu
            </span>
          )
        )}
      </div>

      <div className="mt-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-[15px] leading-snug text-gece">
            {listing.region} — {listing.title}
          </h3>
          {listing.reviews > 0 ? (
            <span className="shrink-0 flex items-center gap-1 text-sm text-gece">
              <IconStar className="w-3.5 h-3.5" />
              {listing.rating.toFixed(1)}
            </span>
          ) : (
            <span className="shrink-0 text-xs font-semibold text-mese">
              Yeni
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-gece/60">
          {listing.type} · {listing.maxGuests} qonaq · {listing.bedrooms} yataq
          otağı
        </p>
        <p className="mt-1 text-[15px] text-gece">
          {listing.previousPrice ? (
            <span className="text-gece/40 line-through mr-1.5">
              {listing.previousPrice} ₼
            </span>
          ) : null}
          <span className="font-semibold">{listing.pricePerNight} ₼</span>{" "}
          <span className="text-gece/60">gecə</span>
        </p>
      </div>
    </Link>
  );
}
