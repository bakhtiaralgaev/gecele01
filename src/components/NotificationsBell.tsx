"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { playSound } from "@/lib/sound";

interface NotifItem {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string;
  at: string;
}

const SEEN_KEY = "gecele_notif_seen";

function readSeen(): number {
  try {
    return Number(window.localStorage.getItem(SEEN_KEY) || 0);
  } catch {
    return 0;
  }
}
function writeSeen(ts: number) {
  try {
    window.localStorage.setItem(SEEN_KEY, String(ts));
  } catch {
    // localStorage yoxdur — səssiz keç
  }
}

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "indicə";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} dəq öncə`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} saat öncə`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} gün öncə`;
  return new Date(iso).toLocaleDateString("az");
}

// Tip → sol nöqtə rəngi
function dotClass(type: string): string {
  if (type === "booking_confirmed" || type === "new_booking") return "bg-mese";
  if (type === "booking_cancelled" || type === "guest_cancelled")
    return "bg-gece/30";
  return "bg-nar"; // payment_due, price_drop — diqqət
}

export default function NotificationsBell() {
  const [items, setItems] = useState<NotifItem[]>([]);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const prevNewestRef = useRef<number | null>(null);

  useEffect(() => {
    setSeen(readSeen());
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch("/api/notifications")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (cancelled || !d || !Array.isArray(d.items)) return;
          const newest = d.items.reduce(
            (m: number, i: NotifItem) => Math.max(m, new Date(i.at).getTime()),
            0
          );
          // Yeni bildiriş gələndə səs (ilk yükləmədə yox)
          if (prevNewestRef.current !== null && newest > prevNewestRef.current) {
            playSound("notify");
          }
          prevNewestRef.current = newest;
          setItems(d.items);
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = items.filter((i) => new Date(i.at).getTime() > seen).length;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      // Açan kimi hamısını "görülüb" say
      const now = Date.now();
      writeSeen(now);
      setSeen(now);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        aria-label={
          unread > 0 ? `Bildirişlər (${unread} yeni)` : "Bildirişlər"
        }
        aria-expanded={open}
        className="relative flex items-center justify-center w-10 h-10 text-gece hover:bg-kraft rounded-full transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
          <path
            d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M13.7 21a2 2 0 0 1-3.4 0"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute top-1 right-1 bg-nar text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] px-1 flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-qum border border-gece/10 rounded-xl shadow-lift overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-gece/10 font-semibold text-gece">
            Bildirişlər
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-sm text-gece/50 text-center">
              Hələ bildiriş yoxdur.
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((i) => (
                <li key={i.id}>
                  <Link
                    href={i.href}
                    onClick={() => setOpen(false)}
                    className="flex gap-3 px-4 py-3 hover:bg-kraft transition-colors border-b border-gece/5 last:border-0"
                  >
                    <span
                      className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${dotClass(
                        i.type
                      )}`}
                    />
                    <span className="min-w-0">
                      <span className="block font-semibold text-sm text-gece">
                        {i.title}
                      </span>
                      <span className="block text-sm text-gece/60 truncate">
                        {i.body}
                      </span>
                      <span className="block text-xs text-gece/40 mt-0.5">
                        {timeAgo(i.at)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
