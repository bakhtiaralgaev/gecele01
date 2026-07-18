"use client";

import { useEffect, useRef, useState } from "react";
import { REGIONS } from "@/lib/data";
import { formatDayShort } from "@/lib/dates";
import { IconSearch } from "./Icons";
import CalendarPanel from "./CalendarPanel";
import GuestsPicker, {
  EMPTY_GUESTS,
  guestsLabel,
  totalGuests,
  type GuestCounts,
} from "./GuestsPicker";

export interface SearchQuery {
  region: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  flex: number;
}

type Segment = "where" | "when" | "who";

function IconPin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export default function SearchPill({
  onSearch,
}: {
  onSearch: (q: SearchQuery) => void;
}) {
  const [open, setOpen] = useState<Segment | null>(null);
  const [region, setRegion] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [flex, setFlex] = useState(0);
  const [guests, setGuests] = useState<GuestCounts>(EMPTY_GUESTS);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const submit = () => {
    setOpen(null);
    onSearch({ region, checkIn, checkOut, guests: totalGuests(guests), flex });
  };

  const dateText =
    checkIn && checkOut
      ? `${formatDayShort(checkIn)} – ${formatDayShort(checkOut)}${
          flex ? ` ±${flex} gün` : ""
        }`
      : checkIn
        ? formatDayShort(checkIn)
        : "";

  // Airbnb davranışı: bir seqment açılanda pill fonu bozarır, aktiv seqment ağ qalır.
  const seg = (key: Segment) =>
    [
      "relative flex flex-col justify-center text-left rounded-full px-6 py-3.5 min-w-0 transition-colors",
      open === key
        ? "bg-qum shadow-pill"
        : open
          ? "hover:bg-gece/5"
          : "hover:bg-kraft",
    ].join(" ");

  const label = "text-xs font-semibold text-gece";
  const valueCls = "mt-0.5 text-sm truncate";

  const divider = (before: Segment, after: Segment) => (
    <div
      aria-hidden="true"
      className={`hidden sm:block w-px h-7 self-center shrink-0 ${
        open === before || open === after ? "bg-transparent" : "bg-gece/15"
      }`}
    />
  );

  return (
    <div ref={wrapRef} className="relative mx-auto max-w-3xl">
      <div
        className={`rounded-3xl sm:rounded-full border border-gece/15 shadow-pill flex flex-col sm:flex-row sm:items-center p-2 transition-colors ${
          open ? "bg-gece/5" : "bg-qum"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen(open === "where" ? null : "where")}
          className={`${seg("where")} sm:flex-[1.1]`}
        >
          <span className={label}>Hara</span>
          <span
            className={`${valueCls} ${region ? "text-gece" : "text-gece/50"}`}
          >
            {region || "İstiqamət axtarın"}
          </span>
        </button>

        {divider("where", "when")}

        <button
          type="button"
          onClick={() => setOpen(open === "when" ? null : "when")}
          className={`${seg("when")} sm:flex-[1.2]`}
        >
          <span className={label}>Nə vaxt?</span>
          <span
            className={`${valueCls} ${dateText ? "text-gece" : "text-gece/50"}`}
          >
            {dateText || "Tarix əlavə edin"}
          </span>
        </button>

        {divider("when", "who")}

        <div className="flex items-center sm:flex-[1.1] min-w-0">
          <button
            type="button"
            onClick={() => setOpen(open === "who" ? null : "who")}
            className={`${seg("who")} flex-1`}
          >
            <span className={label}>Kimlər</span>
            <span
              className={`${valueCls} ${
                totalGuests(guests) ? "text-gece" : "text-gece/50"
              }`}
            >
              {guestsLabel(guests) || "Qonaq əlavə edin"}
            </span>
          </button>

          <button
            type="button"
            onClick={submit}
            aria-label="Axtar"
            className={`shrink-0 bg-nar hover:bg-nar-dark text-white rounded-full h-12 flex items-center justify-center gap-2 font-semibold transition-all mr-1 ${
              open ? "px-5" : "w-12 px-0"
            }`}
          >
            <IconSearch className="w-4 h-4 shrink-0" />
            <span className={open ? "inline" : "hidden"}>Axtar</span>
          </button>
        </div>
      </div>

      {/* Hara */}
      {open === "where" && (
        <div className="absolute z-40 mt-3 left-0 w-full sm:w-[420px] bg-qum rounded-3xl shadow-lift border border-gece/10 p-5 animate-fade-up">
          <p className="text-xs font-semibold text-gece">
            Bölgə üzrə axtarın
          </p>
          <div className="mt-3 grid grid-cols-2 gap-1">
            {["", ...REGIONS].map((r) => (
              <button
                key={r || "all"}
                type="button"
                onClick={() => {
                  setRegion(r);
                  setOpen("when");
                }}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors ${
                  region === r ? "bg-kraft" : "hover:bg-kraft"
                }`}
              >
                <span className="w-10 h-10 rounded-xl bg-kraft border border-gece/10 flex items-center justify-center shrink-0">
                  <IconPin className="w-5 h-5 text-gece/70" />
                </span>
                <span className="text-sm font-medium text-gece truncate">
                  {r || "Bütün bölgələr"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Nə vaxt */}
      {open === "when" && (
        <div className="absolute z-40 mt-3 left-1/2 -translate-x-1/2 w-[92vw] sm:w-auto bg-qum rounded-3xl shadow-lift border border-gece/10 p-6 animate-fade-up">
          <CalendarPanel
            checkIn={checkIn}
            checkOut={checkOut}
            flex={flex}
            onChange={(ci, co) => {
              setCheckIn(ci);
              setCheckOut(co);
            }}
            onFlexChange={setFlex}
          />
          <div className="mt-5 pt-4 border-t border-gece/10 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setCheckIn("");
                setCheckOut("");
                setFlex(0);
              }}
              className="text-sm font-semibold text-gece underline"
            >
              Tarixləri sil
            </button>
            <button
              type="button"
              onClick={() => setOpen("who")}
              className="bg-gece text-qum text-sm font-semibold px-5 py-2.5 rounded-lg"
            >
              Növbəti
            </button>
          </div>
        </div>
      )}

      {/* Kimlər */}
      {open === "who" && (
        <div className="absolute z-40 mt-3 right-0 w-full sm:w-[420px] bg-qum rounded-3xl shadow-lift border border-gece/10 p-6 animate-fade-up">
          <GuestsPicker value={guests} onChange={setGuests} />
          <button
            type="button"
            onClick={submit}
            className="mt-5 w-full bg-nar hover:bg-nar-dark text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Axtar
          </button>
        </div>
      )}
    </div>
  );
}
