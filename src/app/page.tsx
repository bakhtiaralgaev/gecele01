"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ListingDto } from "@/lib/data";
import ListingCard from "@/components/ListingCard";
import MapView from "@/components/MapView";
import SearchPill, { SearchQuery } from "@/components/SearchPill";
import FiltersModal, {
  Filters,
  EMPTY_FILTERS,
  activeFilterCount,
  applyFiltersToParams,
} from "@/components/FiltersModal";
import {
  IconGarden,
  IconGrid,
  IconHistoric,
  IconLake,
  IconMountain,
  IconPool,
  IconSea,
  IconShield,
  IconSki,
} from "@/components/Icons";

// Kateqoriya sırası — Airbnb üslubunda ikon + etiket
const CATEGORIES = [
  { key: "", label: "Hamısı", Icon: IconGrid },
  { key: "Qəbələ", label: "Qəbələ", Icon: IconMountain },
  { key: "Quba", label: "Quba", Icon: IconGarden },
  { key: "İsmayıllı", label: "İsmayıllı", Icon: IconHistoric },
  { key: "Şahdağ", label: "Şahdağ", Icon: IconSki },
  { key: "Nabran", label: "Nabran", Icon: IconSea },
  { key: "Lənkəran", label: "Lənkəran", Icon: IconGarden },
  { key: "Abşeron", label: "Abşeron", Icon: IconSea },
  { key: "Göygöl", label: "Göygöl", Icon: IconLake },
  { key: "__pool", label: "Hovuzlu", Icon: IconPool },
];

export default function Home() {
  const [query, setQuery] = useState<SearchQuery>({
    region: "",
    checkIn: "",
    checkOut: "",
    guests: 0,
    flex: 0,
  });
  const [poolOnly, setPoolOnly] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [listings, setListings] = useState<ListingDto[] | null>(null);
  const [error, setError] = useState(false);

  // Baza sorğu (region/tarix/qonaq/hovuz) + verilmiş filtrlərdən URL params qur.
  // Həm əsas siyahı fetch-i, həm də filtr modalındakı canlı say bunu paylaşır.
  const buildParams = useCallback(
    (f: Filters) => {
      const params = new URLSearchParams();
      if (query.region) params.set("region", query.region);
      if (poolOnly) params.set("pool", "1");
      if (query.guests > 0) params.set("guests", String(query.guests));
      if (query.checkIn && query.checkOut) {
        params.set("checkIn", query.checkIn);
        params.set("checkOut", query.checkOut);
        if (query.flex > 0) params.set("flex", String(query.flex));
      }
      applyFiltersToParams(f, params);
      return params;
    },
    [query, poolOnly]
  );

  useEffect(() => {
    let cancelled = false;
    setListings(null);
    setError(false);
    fetch(`/api/listings?${buildParams(filters).toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => {
        if (!cancelled) setListings(d);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [buildParams, filters]);

  const fcount = useMemo(() => activeFilterCount(filters), [filters]);
  const activeCat = poolOnly ? "__pool" : query.region;

  return (
    <main>
      {/* Sənəd iyerarxiyası üçün başlıq — vizual hero axtarış panelidir */}
      <h1 className="sr-only">
        Gecələ — Azərbaycanda istirahət evləri, bağ evləri və villalar
      </h1>

      {/* Axtarış */}
      <section className="px-4 pt-5 pb-2 border-b border-gece/10">
        <SearchPill
          onSearch={(q) => {
            setPoolOnly(false);
            setQuery(q);
          }}
        />
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[13px] text-gece/60">
          <IconShield className="w-4 h-4 text-mese" />
          <span>
            <b className="text-mese font-semibold">Beh Qoruması</b> — ödəniş evə
            girənə qədər platformada qalır
          </span>
        </p>
      </section>

      {/* Kateqoriyalar */}
      <section className="border-b border-gece/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex gap-1 overflow-x-auto no-scrollbar">
          {CATEGORIES.map(({ key, label, Icon }) => {
            const active = activeCat === key;
            return (
              <button
                key={key || "all"}
                onClick={() => {
                  if (key === "__pool") {
                    setPoolOnly((p) => !p);
                  } else {
                    setPoolOnly(false);
                    setQuery((q) => ({ ...q, region: key }));
                  }
                }}
                className={`shrink-0 flex flex-col items-center gap-1.5 px-4 pt-4 pb-3 border-b-2 transition-colors ${
                  active
                    ? "border-gece text-gece"
                    : "border-transparent text-gece/50 hover:text-gece hover:border-gece/30"
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-semibold whitespace-nowrap">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Elanlar */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 mt-8">
        {error && (
          <p className="mt-10 text-center text-nar font-semibold">
            Elanlar yüklənmədi — səhifəni yeniləyin.
          </p>
        )}
        {!error && listings === null && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-square bg-kraft rounded-xl animate-pulse" />
                <div className="mt-3 h-4 bg-kraft rounded animate-pulse w-3/4" />
                <div className="mt-2 h-3 bg-kraft rounded animate-pulse w-1/2" />
              </div>
            ))}
          </div>
        )}
        {listings && (
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-gece/60">
              {listings.length} nəticə
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFiltersOpen(true)}
                className="flex items-center gap-2 border border-gece/25 hover:border-gece text-sm font-semibold text-gece px-4 py-2.5 rounded-full transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="w-4 h-4"
                  aria-hidden="true"
                >
                  <path
                    d="M4 6h16M7 12h10M10 18h4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                Filtrlər
                {fcount > 0 && (
                  <span className="bg-gece text-qum text-[11px] font-bold rounded-full min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center">
                    {fcount}
                  </span>
                )}
              </button>
              {listings.length > 0 && (
                <button
                  onClick={() => setShowMap((s) => !s)}
                  className="flex items-center gap-2 bg-gece text-qum text-sm font-semibold px-4 py-2.5 rounded-full hover:bg-gece/90 transition-colors"
                >
                  {showMap ? "Siyahı" : "Xəritə"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Xəritə açıq: masaüstündə yan-yana split (sol siyahı + sağ yapışqan
            xəritə), mobalda tam xəritə */}
        {listings && listings.length > 0 && showMap && (
          <div className="lg:grid lg:grid-cols-2 lg:gap-6">
            <div className="hidden lg:block lg:overflow-y-auto lg:max-h-[calc(100vh-13rem)] pr-1 -mr-1">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-4 gap-y-8">
                {listings.map((l) => (
                  <ListingCard key={l.id} listing={l} />
                ))}
              </div>
            </div>
            <MapView
              variant="home"
              points={listings.map((l) => ({
                id: l.id,
                slug: l.slug,
                title: l.title,
                region: l.region,
                pricePerNight: l.pricePerNight,
                rating: l.rating,
                reviews: l.reviews,
                photo: l.photo,
                lat: l.lat ?? 40.6,
                lng: l.lng ?? 48.5,
              }))}
              className="w-full h-[70vh] lg:h-[calc(100vh-13rem)] lg:sticky lg:top-24 rounded-2xl overflow-hidden border border-gece/15 z-0"
            />
          </div>
        )}

        {listings && listings.length > 0 && !showMap && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}

        {listings && listings.length === 0 && (
          <div className="mt-16 text-center">
            <p className="font-semibold text-gece">
              Bu axtarışa uyğun ev tapılmadı
            </p>
            <p className="mt-1 text-sm text-gece/60">
              Tarixləri, bölgəni və ya filtrləri dəyişməyi yoxlayın.
            </p>
            {fcount > 0 && (
              <button
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="mt-4 text-sm font-semibold text-nar underline underline-offset-4"
              >
                Filtrləri təmizlə
              </button>
            )}
          </div>
        )}
      </section>

      {/* Etibar bölməsi */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 mt-16">
        <h2 className="font-serif font-bold text-[22px] text-gece">
          Niyə elan saytı yox, Gecələ?
        </h2>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              title: "Beh Qoruması",
              text: "Naməlum karta beh göndərmək yoxdur. Ödəniş platformada qalır, ev sahibinə yalnız siz evə girəndən sonra keçir.",
            },
            {
              title: "Canlı təqvim",
              text: "“O tarixə artıq vermişəm” sürprizi yoxdur — sistem eyni tarixə ikinci rezervasiyanı qəbul etmir.",
            },
            {
              title: "Təsdiqlənmiş rəylər",
              text: "Rəy yalnız həqiqətən qalmış qonaqdan gəlir — rezervasiya kodu ilə yoxlanılır.",
            },
          ].map((c) => (
            <div key={c.title} className="border border-gece/10 rounded-yurd p-5">
              <IconShield className="w-6 h-6 text-mese" />
              <h3 className="mt-3 font-semibold text-gece">{c.title}</h3>
              <p className="mt-1.5 text-sm text-gece/60 leading-relaxed">
                {c.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <FiltersModal
        open={filtersOpen}
        initial={filters}
        buildParams={buildParams}
        onClose={() => setFiltersOpen(false)}
        onApply={(f) => {
          setFilters(f);
          setFiltersOpen(false);
        }}
      />
    </main>
  );
}
