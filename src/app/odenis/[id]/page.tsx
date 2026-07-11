"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { IconCheck } from "@/components/Icons";
import { useToast } from "@/components/Toast";

interface Summary {
  id: string;
  title: string;
  region: string;
  photo: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  guestName: string;
  total: number;
  deposit: number;
  status: string;
  expiresAt: number | null;
  code: string | null;
  testMode: boolean;
}

function fmtCard(v: string): string {
  return v
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}

function fmtExpiry(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export default function PaymentPage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [paying, setPaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [paidCode, setPaidCode] = useState<string | null>(null);

  useEffect(() => {
    if (errorMsg) toast({ type: "error", message: errorMsg });
  }, [errorMsg, toast]);

  useEffect(() => {
    fetch(`/api/bookings/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d: Summary) => {
        setSummary(d);
        if (d.code) setPaidCode(d.code);
      })
      .catch(() => setNotFound(true));
  }, [params.id]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (notFound) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="font-serif font-bold text-xl">Rezervasiya tapılmadı</p>
        <Link href="/" className="text-nar font-bold underline mt-2 inline-block">
          Ana səhifəyə qayıt
        </Link>
      </main>
    );
  }

  if (!summary) {
    return (
      <main className="mx-auto max-w-md px-4 mt-8">
        <div className="h-72 bg-white rounded-yurd shadow-yurd animate-pulse" />
      </main>
    );
  }

  const expired =
    !paidCode &&
    (summary.status === "cancelled" ||
      (summary.expiresAt !== null && summary.expiresAt < now));

  const remaining = summary.expiresAt
    ? Math.max(0, Math.floor((summary.expiresAt - now) / 1000))
    : 0;
  const mm = Math.floor(remaining / 60)
    .toString()
    .padStart(2, "0");
  const ss = (remaining % 60).toString().padStart(2, "0");

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaying(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: summary.id,
          cardNumber,
          cardExpiry,
          cardCvv,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Ödəniş alınmadı");
        return;
      }
      if (data.redirectUrl) {
        // Payriff hosted checkout — ödəniş səhifəsinə yönləndir
        window.location.href = data.redirectUrl as string;
        return;
      }
      setPaidCode(data.code as string);
    } catch {
      setErrorMsg("Şəbəkə xətası — yenidən cəhd edin");
    } finally {
      setPaying(false);
    }
  };

  // Uğur ekranı
  if (paidCode) {
    return (
      <main className="gecele-confirmation-reveal mx-auto max-w-md px-4 mt-10 pb-10 text-center">
        <span className="mx-auto mb-3 w-11 h-11 rounded-full bg-mese-soft text-mese flex items-center justify-center">
          <IconCheck className="w-6 h-6" />
        </span>
        <h1 className="font-serif font-extrabold text-2xl tracking-tight">
          Rezervasiya təsdiqləndi
        </h1>
        <p className="mt-1.5 text-sm text-gece/60 font-medium">
          {summary.title} · {summary.checkIn} → {summary.checkOut}
        </p>
        <div className="mt-5 border-2 border-dashed border-mese/30 bg-mese-soft rounded-yurd py-6">
          <div className="text-[11px] font-bold text-gece/50 uppercase">
            Rezervasiya kodu
          </div>
          <div className="text-4xl font-extrabold tracking-widest text-mese">
            {paidCode}
          </div>
        </div>
        <p className="mt-4 text-sm text-gece/60 font-medium leading-relaxed">
          Beh <b>{summary.deposit} ₼</b> Beh Qorumasına alındı — evə girənə
          qədər bizdə qalır. Qalıq məbləği (
          {summary.total - summary.deposit} ₼) girişdə ev sahibinə ödəyirsiniz.
        </p>
        <Link
          href="/rezervlerim"
          className="mt-5 inline-block bg-mese text-white font-bold px-6 py-3 rounded-full"
        >
          Rezervlərimə bax
        </Link>
      </main>
    );
  }

  // Müddət bitib
  if (expired) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-serif font-bold text-xl">
          Ödəniş müddəti bitdi
        </h1>
        <p className="mt-2 text-sm text-gece/60 font-medium">
          Tarixlər boşaldıldı — yenidən rezervasiya edə bilərsiniz.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block bg-nar text-white font-bold px-6 py-3 rounded-full"
        >
          Evlərə qayıt
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 mt-8 pb-10">
      <h1 className="font-serif font-extrabold text-2xl tracking-tight">
        Beh ödənişi
      </h1>

      {/* Sifariş xülasəsi */}
      <div className="mt-4 bg-white rounded-yurd shadow-yurd p-4 flex gap-4 items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={summary.photo}
          alt={summary.title}
          className="w-24 h-20 rounded-xl object-cover shrink-0"
        />
        <div className="min-w-0">
          <h2 className="font-serif font-bold leading-snug truncate">
            {summary.title}
          </h2>
          <p className="text-sm text-gece/60 font-medium">
            {summary.region} · {summary.checkIn} → {summary.checkOut} ·{" "}
            {summary.nights} gecə
          </p>
          <p className="mt-1 text-sm font-bold">
            Cəmi {summary.total} ₼ · <span className="text-mese">beh {summary.deposit} ₼</span>
          </p>
        </div>
      </div>

      {/* Vaxt sayğacı */}
      <div className="mt-3 flex items-center justify-between bg-nar-soft rounded-xl px-4 py-2.5">
        <span className="text-sm font-bold text-nar-dark">
          Tarixlər sizin üçün tutulub
        </span>
        <span className="font-extrabold tabular-nums text-nar-dark">
          {mm}:{ss}
        </span>
      </div>

      {summary.testMode && (
        <p className="mt-3 text-[11px] font-bold text-gece/50 bg-white rounded-xl px-3 py-2 shadow-yurd">
          SINAQ REJİMİ — real ödəniş çıxılmır. İstənilən 16 rəqəmli kart işləyir
          (0000 ilə bitən kart imtina ssenarisini yoxlayır).
        </p>
      )}

      {/* Kart forması */}
      <form
        onSubmit={pay}
        className="mt-4 bg-white rounded-yurd shadow-yurd p-5 space-y-4"
      >
        <label className="block">
          <span className="text-xs font-bold uppercase text-gece/50">
            Kart nömrəsi
          </span>
          <input
            inputMode="numeric"
            value={cardNumber}
            onChange={(e) => setCardNumber(fmtCard(e.target.value))}
            placeholder="0000 0000 0000 0000"
            required
            className="mt-1 w-full rounded-xl border-2 border-gece/10 px-3.5 py-3 font-semibold tracking-wider focus:border-mese outline-none"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-bold uppercase text-gece/50">
              Bitmə tarixi
            </span>
            <input
              inputMode="numeric"
              value={cardExpiry}
              onChange={(e) => setCardExpiry(fmtExpiry(e.target.value))}
              placeholder="AA/İİ"
              required
              className="mt-1 w-full rounded-xl border-2 border-gece/10 px-3.5 py-3 font-semibold focus:border-mese outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase text-gece/50">
              CVV
            </span>
            <input
              inputMode="numeric"
              type="password"
              value={cardCvv}
              onChange={(e) =>
                setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 3))
              }
              placeholder="•••"
              required
              className="mt-1 w-full rounded-xl border-2 border-gece/10 px-3.5 py-3 font-semibold focus:border-mese outline-none"
            />
          </label>
        </div>

        {errorMsg && (
          <p className="text-sm font-bold text-nar bg-nar-soft rounded-xl px-3 py-2.5">
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={paying}
          className="w-full bg-nar hover:bg-nar-dark text-white font-bold text-lg py-4 rounded-yurd transition-colors disabled:opacity-50"
        >
          {paying ? "Ödənilir..." : `${summary.deposit} ₼ ödə və təsdiqlə`}
        </button>
        <p className="text-[11px] text-center text-gece/50 font-medium">
          Beh Qoruması: ödəniş ev sahibinə deyil, platformada saxlanılır.
        </p>
      </form>
    </main>
  );
}
