"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookingDto } from "@/lib/data";

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Təsdiqlənib",
  pending: "Ödəniş gözlənilir",
  expired: "Müddəti bitib",
  cancelled: "Ləğv edilib",
};

export default function MyBookings() {
  const [me, setMe] = useState<{ name: string } | null | undefined>(undefined);
  const [phone, setPhone] = useState("");
  const [items, setItems] = useState<BookingDto[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [cancelling, setCancelling] = useState<string | null>(null);

  const cancelBooking = async (id: string) => {
    if (!window.confirm("Rezervasiyanı ləğv etmək istədiyinizə əminsiniz?")) {
      return;
    }
    setCancelling(id);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          phone: phone.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Ləğv edilmədi");
        return;
      }
      setItems((prev) =>
        prev
          ? prev.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b))
          : prev
      );
    } catch {
      setErrorMsg("Şəbəkə xətası — yenidən cəhd edin");
    } finally {
      setCancelling(null);
    }
  };

  const lookup = async (url: string) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Xəta baş verdi");
        setItems(null);
        return;
      }
      setItems(data as BookingDto[]);
    } catch {
      setErrorMsg("Şəbəkə xətası — yenidən cəhd edin");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setMe(d.user);
        if (d.user) {
          // Hesaba bağlı rezervlər avtomatik yüklənir
          lookup("/api/bookings");
        } else {
          const saved = window.localStorage.getItem("gecele_phone");
          if (saved) {
            setPhone(saved);
            lookup(`/api/bookings?phone=${encodeURIComponent(saved)}`);
          }
        }
      })
      .catch(() => setMe(null));
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 mt-8 pb-16">
      <h1 className="font-serif font-bold text-2xl text-gece tracking-tight">
        Rezervlərim
      </h1>

      {me === null && (
        <>
          <p className="mt-1 text-sm text-gece/60">
            <Link href="/giris" className="underline font-semibold text-gece">
              Daxil olun
            </Link>{" "}
            və ya rezervasiya zamanı istifadə etdiyiniz telefon nömrəsi ilə
            axtarın.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (phone.trim()) {
                window.localStorage.setItem("gecele_phone", phone.trim());
                lookup(`/api/bookings?phone=${encodeURIComponent(phone.trim())}`);
              }
            }}
            className="mt-4 flex gap-2"
          >
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+994 50 123 45 67"
              className="flex-1 rounded-xl border border-gece/20 px-4 py-3 text-[15px] focus:border-gece outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-gece text-white font-semibold px-6 rounded-xl disabled:opacity-50"
            >
              {loading ? "..." : "Axtar"}
            </button>
          </form>
        </>
      )}

      {errorMsg && (
        <p className="mt-3 text-sm font-semibold text-nar bg-nar-soft rounded-xl px-3 py-2.5">
          {errorMsg}
        </p>
      )}

      {loading && items === null && (
        <div className="mt-6 space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-28 bg-kraft rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {items && items.length === 0 && (
        <div className="mt-14 text-center">
          <p className="font-semibold text-gece">Hələ rezervasiyanız yoxdur</p>
          <p className="mt-1 text-sm text-gece/60">
            Yay tarixləri tez dolur — indi baxın.
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
        <div className="mt-6 space-y-4">
          {items.map((b) => (
            <div
              key={b.id}
              className="border border-gece/15 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.photo}
                  alt={b.title}
                  className="w-20 h-16 rounded-xl object-cover shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="font-semibold text-gece leading-snug truncate">
                    {b.title}
                  </h3>
                  <p className="mt-0.5 text-sm text-gece/60">
                    {b.region} · {b.checkIn} → {b.checkOut} · {b.guests} qonaq
                  </p>
                  <p className="mt-0.5 text-sm text-gece">
                    Beh <b>{b.deposit} ₼</b> · Cəmi <b>{b.total} ₼</b>
                  </p>
                  <span
                    className={`mt-1.5 inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      b.status === "confirmed"
                        ? "bg-mese-soft text-mese"
                        : b.status === "pending"
                          ? "bg-nar-soft text-nar-dark"
                          : "bg-kraft text-gece/50"
                    }`}
                  >
                    {STATUS_LABEL[b.status] ?? b.status}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
                {b.status === "confirmed" && (
                  <div className="text-center bg-mese-soft rounded-xl px-5 py-3">
                    <div className="text-[10px] font-bold text-gece/50 uppercase">
                      Kod
                    </div>
                    <div className="text-lg font-bold tracking-widest text-mese">
                      {b.code}
                    </div>
                  </div>
                )}
                {b.status === "pending" && (
                  <Link
                    href={`/odenis/${b.id}`}
                    className="bg-nar hover:bg-nar-dark text-white font-semibold px-5 py-3 rounded-xl text-sm text-center"
                  >
                    Ödənişi tamamla
                  </Link>
                )}
                {(b.status === "pending" || b.status === "confirmed") && (
                  <button
                    onClick={() => cancelBooking(b.id)}
                    disabled={cancelling === b.id}
                    className="text-xs font-semibold text-gece/50 hover:text-nar underline disabled:opacity-50"
                  >
                    {cancelling === b.id ? "Ləğv edilir..." : "Ləğv et"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
