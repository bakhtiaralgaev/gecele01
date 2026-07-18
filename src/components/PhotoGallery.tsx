"use client";

import { useCallback, useEffect, useState } from "react";
import { IconGrid } from "./Icons";

/* eslint-disable @next/next/no-img-element */

function IconChevron({
  dir,
  className,
}: {
  dir: "left" | "right";
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconClose({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function PhotoGallery({
  photos,
  title,
}: {
  photos: string[];
  title: string;
}) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const count = photos.length;

  const step = useCallback(
    (delta: number) =>
      setLightbox((i) => (i === null ? i : (i + delta + count) % count)),
    [count]
  );

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightbox, step]);

  // Qrid həmişə 5 xana gözləyir — az şəkil varsa dövr edirik.
  const cell = (i: number) => photos[i % count];

  return (
    <>
      {/* Masaüstü: 1 böyük + 2×2 kiçik (Airbnb qalereyası) */}
      <div className="relative mt-4 hidden sm:block">
        <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[420px] rounded-2xl overflow-hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <button
              key={i}
              onClick={() => setLightbox(i % count)}
              aria-label={`${i + 1}-ci şəkli böyüt`}
              className={`group relative overflow-hidden ${
                i === 0 ? "col-span-2 row-span-2" : ""
              }`}
            >
              <img
                src={cell(i)}
                alt={i === 0 ? title : ""}
                loading={i === 0 ? "eager" : "lazy"}
                className="w-full h-full object-cover transition-[filter] duration-200 group-hover:brightness-90"
              />
            </button>
          ))}
        </div>

        <button
          onClick={() => setLightbox(0)}
          className="absolute bottom-5 right-5 flex items-center gap-2 bg-qum border border-gece text-gece text-sm font-semibold px-4 py-2.5 rounded-lg shadow-yurd hover:bg-kraft transition-colors"
        >
          <IconGrid className="w-4 h-4" />
          Bütün şəkilləri göstər
        </button>
      </div>

      {/* Mobil: tək şəkil + sayğac */}
      <div className="relative mt-4 sm:hidden rounded-2xl overflow-hidden h-64">
        <button
          onClick={() => setLightbox(0)}
          className="w-full h-full"
          aria-label="Şəkilləri böyüt"
        >
          <img
            src={photos[0]}
            alt={title}
            className="w-full h-full object-cover"
          />
        </button>
        <span className="absolute bottom-3 right-3 bg-qum/95 text-gece text-xs font-semibold px-2.5 py-1 rounded-full">
          1 / {count}
        </span>
      </div>

      {lightbox !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} — şəkil qalereyası`}
          className="fixed inset-0 z-[60] bg-gece flex flex-col"
        >
          <div className="flex items-center justify-between p-4 text-white shrink-0">
            <button
              onClick={() => setLightbox(null)}
              autoFocus
              aria-label="Qalereyanı bağla"
              className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-qum/10 transition-colors"
            >
              <IconClose className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium tabular-nums">
              {lightbox + 1} / {count}
            </span>
            <span className="w-11" aria-hidden="true" />
          </div>

          <div className="flex-1 min-h-0 flex items-center justify-center px-2 sm:px-16 pb-8">
            <img
              src={photos[lightbox]}
              alt={`${title} — şəkil ${lightbox + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>

          {count > 1 && (
            <>
              <button
                onClick={() => step(-1)}
                aria-label="Əvvəlki şəkil"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-qum text-gece flex items-center justify-center shadow-lift hover:scale-105 transition-transform"
              >
                <IconChevron dir="left" className="w-5 h-5" />
              </button>
              <button
                onClick={() => step(1)}
                aria-label="Növbəti şəkil"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-qum text-gece flex items-center justify-center shadow-lift hover:scale-105 transition-transform"
              >
                <IconChevron dir="right" className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
