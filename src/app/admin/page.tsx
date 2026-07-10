"use client";

import { useCallback, useEffect, useState } from "react";

interface PendingListing {
  id: string;
  title: string;
  region: string;
  type: string;
  pricePerNight: number;
  maxGuests: number;
  hostName: string;
  hostPhone: string;
  createdAt: string;
}

interface AdminBooking {
  id: string;
  code: string;
  title: string;
  guestName: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  total: number;
  deposit: number;
  status: string;
}

interface AdminData {
  stats: {
    confirmedBookings: number;
    pendingBookings: number;
    grossVolume: number;
    depositsHeld: number;
    pendingListings: number;
  };
  pendingListings: PendingListing[];
  bookings: AdminBooking[];
}

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Təsdiqlənib",
  pending: "Ödəniş gözlənilir",
  cancelled: "Ləğv edilib",
};

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/data");
    if (res.status === 401) {
      setNeedLogin(true);
      setData(null);
      return;
    }
    setNeedLogin(false);
    setData(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setErrorMsg("Şifrə yanlışdır");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  };

  const act = async (
    kind: "listing" | "booking",
    id: string,
    action: string
  ) => {
    setBusy(true);
    try {
      await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id, action }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (needLogin) {
    return (
      <main className="mx-auto max-w-sm px-4 mt-16">
        <h1 className="font-serif font-extrabold text-2xl tracking-tight text-center">
          İdarəetmə paneli
        </h1>
        <form
          onSubmit={login}
          className="mt-6 bg-white rounded-yurd shadow-yurd p-5 space-y-4"
        >
          <label className="block">
            <span className="text-xs font-bold uppercase text-gece/50">
              Şifrə
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border-2 border-gece/10 px-3.5 py-3 font-semibold focus:border-mese outline-none"
            />
          </label>
          {errorMsg && (
            <p className="text-sm font-bold text-nar bg-nar-soft rounded-xl px-3 py-2.5">
              {errorMsg}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-mese text-white font-bold py-3.5 rounded-yurd disabled:opacity-50"
          >
            Daxil ol
          </button>
        </form>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-4xl px-4 mt-8">
        <div className="h-40 bg-white rounded-yurd shadow-yurd animate-pulse" />
      </main>
    );
  }

  const s = data.stats;
  const statCards = [
    { label: "Təsdiqlənmiş rezerv", value: s.confirmedBookings },
    { label: "Ödəniş gözləyən", value: s.pendingBookings },
    { label: "Ümumi dövriyyə", value: `${s.grossVolume} ₼` },
    { label: "Qorunan beh", value: `${s.depositsHeld} ₼` },
    { label: "Gözləyən elan", value: s.pendingListings },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 mt-8 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="font-serif font-extrabold text-2xl tracking-tight">
          İdarəetmə paneli
        </h1>
        <button
          onClick={async () => {
            await fetch("/api/admin/login", { method: "DELETE" });
            setNeedLogin(true);
          }}
          className="text-sm font-bold text-gece/50 hover:text-gece"
        >
          Çıxış
        </button>
      </div>

      {/* Statistika */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-3">
        {statCards.map((c) => (
          <div key={c.label} className="bg-white rounded-yurd shadow-yurd p-4">
            <div className="text-2xl font-extrabold text-mese">{c.value}</div>
            <div className="mt-0.5 text-[11px] font-bold text-gece/50 uppercase leading-tight">
              {c.label}
            </div>
          </div>
        ))}
      </div>

      {/* Gözləyən elanlar */}
      <h2 className="mt-8 font-bold text-lg">
        Moderasiya gözləyən elanlar ({data.pendingListings.length})
      </h2>
      {data.pendingListings.length === 0 ? (
        <p className="mt-2 text-sm text-gece/50 font-medium">
          Gözləyən elan yoxdur.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {data.pendingListings.map((l) => (
            <div
              key={l.id}
              className="bg-white rounded-yurd shadow-yurd p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="font-bold">{l.title}</div>
                <div className="text-sm text-gece/60 font-medium">
                  {l.region} · {l.type} · {l.pricePerNight} ₼/gecə ·{" "}
                  {l.maxGuests} qonaq
                </div>
                <div className="text-sm text-gece/60 font-medium">
                  Sahib: {l.hostName} · {l.hostPhone} · {l.createdAt}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => act("listing", l.id, "approve")}
                  disabled={busy}
                  className="bg-mese text-white font-bold px-4 py-2.5 rounded-xl text-sm disabled:opacity-50"
                >
                  Təsdiqlə
                </button>
                <button
                  onClick={() => act("listing", l.id, "reject")}
                  disabled={busy}
                  className="bg-nar-soft text-nar-dark font-bold px-4 py-2.5 rounded-xl text-sm disabled:opacity-50"
                >
                  Rədd et
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rezervasiyalar */}
      <h2 className="mt-8 font-bold text-lg">Son rezervasiyalar</h2>
      <div className="mt-3 overflow-x-auto bg-white rounded-yurd shadow-yurd">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase text-gece/50 border-b border-gece/10">
              <th className="px-4 py-3">Kod</th>
              <th className="px-4 py-3">Ev</th>
              <th className="px-4 py-3">Qonaq</th>
              <th className="px-4 py-3">Tarixlər</th>
              <th className="px-4 py-3">Məbləğ</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {data.bookings.map((b) => (
              <tr key={b.id} className="border-b border-gece/5 font-medium">
                <td className="px-4 py-3 font-bold tabular-nums">{b.code}</td>
                <td className="px-4 py-3">{b.title}</td>
                <td className="px-4 py-3">
                  {b.guestName}
                  <div className="text-gece/50 text-xs">{b.guestPhone}</div>
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {b.checkIn} → {b.checkOut}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {b.total} ₼
                  <div className="text-mese text-xs font-bold">
                    beh {b.deposit} ₼
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-[11px] font-bold px-2 py-1 rounded-full ${
                      b.status === "confirmed"
                        ? "bg-mese-soft text-mese"
                        : b.status === "pending"
                          ? "bg-nar-soft text-nar-dark"
                          : "bg-gece/10 text-gece/50"
                    }`}
                  >
                    {STATUS_LABEL[b.status] ?? b.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {b.status !== "cancelled" && (
                    <button
                      onClick={() => act("booking", b.id, "cancel")}
                      disabled={busy}
                      className="text-xs font-bold text-nar hover:underline disabled:opacity-50"
                    >
                      Ləğv et
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {data.bookings.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gece/50">
                  Hələ rezervasiya yoxdur.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
