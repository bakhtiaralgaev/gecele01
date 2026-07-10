"use client";

import { useState } from "react";
import { REGIONS } from "@/lib/data";
import { IconSearch } from "./Icons";
import DateRangePicker from "./DateRangePicker";

export interface SearchQuery {
  region: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

// Airbnb üslubunda axtarış paneli — region, tarixlər, qonaq sayı.
export default function SearchPill({
  onSearch,
}: {
  onSearch: (q: SearchQuery) => void;
}) {
  const [region, setRegion] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ region, checkIn, checkOut, guests });
  };

  const cell =
    "flex flex-col px-5 py-2.5 min-w-0 hover:bg-kraft rounded-full transition-colors";
  const label = "text-[11px] font-bold text-gece";
  const input =
    "bg-transparent text-sm text-gece placeholder:text-gece/40 outline-none w-full font-medium";

  return (
    <form
      onSubmit={submit}
      className="mx-auto max-w-3xl bg-white border border-gece/15 rounded-full shadow-pill flex flex-col sm:flex-row sm:items-center p-1.5 gap-1"
    >
      <div className={`${cell} sm:flex-[1.2]`}>
        <span className={label}>Hara</span>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className={`${input} cursor-pointer`}
        >
          <option value="">Bütün bölgələr</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <div className="hidden sm:block w-px h-8 bg-gece/10" />
      <div className="sm:flex-[1.6] min-w-0">
        <DateRangePicker
          checkIn={checkIn}
          checkOut={checkOut}
          onChange={(ci, co) => {
            setCheckIn(ci);
            setCheckOut(co);
          }}
        />
      </div>
      <div className="hidden sm:block w-px h-8 bg-gece/10" />
      <div className={`${cell} sm:w-32`}>
        <span className={label}>Qonaq</span>
        <input
          type="number"
          min={1}
          max={30}
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          className={input}
        />
      </div>
      <button
        type="submit"
        aria-label="Axtar"
        className="shrink-0 bg-nar hover:bg-nar-dark text-white rounded-full w-full sm:w-12 h-12 flex items-center justify-center gap-2 font-semibold transition-colors m-0.5"
      >
        <IconSearch className="w-4 h-4" />
        <span className="sm:hidden">Axtar</span>
      </button>
    </form>
  );
}
