"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ListingDto, ReviewDto, calcTotal, DEPOSIT_RATE } from "@/lib/data";
import { IconCheck, IconHeart, IconShield, IconStar } from "@/components/Icons";
import DateRangePicker from "@/components/DateRangePicker";
import GuestsPicker, {
  guestsLabel,
  totalGuests,
  type GuestCounts,
} from "@/components/GuestsPicker";
import MapView from "@/components/MapView";
import PhotoGallery from "@/components/PhotoGallery";
import { useToast } from "@/components/Toast";

const WISHLIST_KEY = "gecele_wishlist";

function IconShare({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3v13M12 3L8 7M12 3l4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconEye({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function IconTrend({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 17l6-6 4 4 8-8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 7h6v6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function readWishlist(): string[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(WISHLIST_KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function nightsBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export default function ListingPage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [listing, setListing] = useState<ListingDto | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reviews, setReviews] = useState<ReviewDto[]>([]);

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guestCounts, setGuestCounts] = useState<GuestCounts>({
    adults: 2,
    children: 0,
    infants: 0,
    pets: 0,
  });
  const [guestsOpen, setGuestsOpen] = useState(false);
  const guestsRef = useRef<HTMLDivElement>(null);
  const guests = totalGuests(guestCounts);
  const [saved, setSaved] = useState(false);
  const [savedPop, setSavedPop] = useState(false);
  const [shared, setShared] = useState(false);
  const [regionLeft, setRegionLeft] = useState<number | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Rəy forması
  const [revCode, setRevCode] = useState("");
  const [revPhone, setRevPhone] = useState("");
  const [revRating, setRevRating] = useState(5);
  const [revText, setRevText] = useState("");
  const [revBusy, setRevBusy] = useState(false);
  const [revMsg, setRevMsg] = useState<{ ok: boolean; text: string } | null>(
    null
  );
  const [showRevForm, setShowRevForm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setListing(null);
    setNotFound(false);

    fetch(`/api/listings/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d: ListingDto) => {
        if (cancelled) return;
        setListing(d);
        setReviews(d.reviewList ?? []);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });

    // Real baxış qeydi — "24 saatda N baxış" sosial sübutu üçün
    fetch(`/api/listings/${params.id}/view`, { method: "POST" }).catch(() => {});

    // Hesabdan ad/telefon prefill
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d.user) return;
        setGuestName((v) => v || d.user.name);
        if (d.user.phone) setGuestPhone((v) => v || d.user.phone);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  useEffect(() => {
    if (listing) setSaved(readWishlist().includes(listing.id));
  }, [listing]);

  // Qıtlıq siqnalı — seçilmiş tarixlərə bu bölgədə neçə ev boşdur (real say)
  useEffect(() => {
    if (!listing || !checkIn || !checkOut) {
      setRegionLeft(null);
      return;
    }
    let cancelled = false;
    const p = new URLSearchParams({
      region: listing.region,
      checkIn,
      checkOut,
    });
    fetch(`/api/listings?${p.toString()}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d: unknown[]) => {
        if (!cancelled) setRegionLeft(Array.isArray(d) ? d.length : null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [listing, checkIn, checkOut]);

  useEffect(() => {
    if (!guestsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (guestsRef.current && !guestsRef.current.contains(e.target as Node)) {
        setGuestsOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGuestsOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [guestsOpen]);

  if (notFound) {
    return (
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-16 text-center">
        <p className="font-serif font-bold text-xl">Bu ev tapılmadı</p>
        <Link href="/" className="text-nar font-semibold underline mt-2 inline-block">
          Bütün evlərə bax
        </Link>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="mx-auto max-w-7xl px-4 sm:px-6 mt-6">
        <div className="h-[420px] bg-kraft rounded-2xl animate-pulse" />
      </main>
    );
  }

  const photos =
    listing.photos && listing.photos.length > 0
      ? listing.photos
      : [listing.photo];
  const nights = nightsBetween(checkIn, checkOut);
  const { base, fee, total, deposit } = calcTotal(
    listing.pricePerNight,
    nights || 1
  );
  const canBook =
    nights > 0 &&
    guests > 0 &&
    guests <= listing.maxGuests &&
    guestName.trim().length >= 2 &&
    guestPhone.trim().length >= 9 &&
    !submitting;

  const toggleSaved = () => {
    const list = readWishlist();
    const next = list.includes(listing.id)
      ? list.filter((x) => x !== listing.id)
      : [...list, listing.id];
    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(next));
    const isNowSaved = next.includes(listing.id);
    setSaved(isNowSaved);
    setSavedPop(true);
    window.setTimeout(() => setSavedPop(false), 280);
    toast(
      isNowSaved
        ? { type: "success", message: "Seçilmişlərə əlavə edildi", sound: "like" }
        : { type: "info", message: "Seçilmişlərdən çıxarıldı" }
    );
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: listing.title, url });
        return;
      } catch {
        // istifadəçi ləğv etdi — buferə kopyalamağa keçirik
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      toast({ type: "info", message: "Link kopyalandı" });
      window.setTimeout(() => setShared(false), 2000);
    } catch {
      const message = "Linki kopyalamaq alınmadı";
      setErrorMsg(message);
      toast({ type: "error", message });
    }
  };

  const reserve = async () => {
    if (!canBook) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          checkIn,
          checkOut,
          guests,
          guestName: guestName.trim(),
          guestPhone: guestPhone.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const message = data.error ?? "Xəta baş verdi";
        setErrorMsg(message);
        toast({ type: "error", message });
        return;
      }
      window.localStorage.setItem("gecele_phone", guestPhone.trim());
      toast({ type: "success", message: "Rezervasiya yaradıldı — ödənişə keçirsiniz" });
      window.location.href = `/odenis/${data.bookingId}`;
    } catch {
      const message = "Şəbəkə xətası — yenidən cəhd edin";
      setErrorMsg(message);
      toast({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setRevBusy(true);
    setRevMsg(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: listing.slug,
          code: revCode,
          phone: revPhone,
          rating: revRating,
          text: revText,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const message = data.error ?? "Xəta baş verdi";
        setRevMsg({ ok: false, text: message });
        toast({ type: "error", message });
        return;
      }
      setReviews((r) => [data as ReviewDto, ...r]);
      const message = "Rəyiniz dərc olundu — təşəkkürlər!";
      setRevMsg({ ok: true, text: message });
      toast({ type: "success", message });
      setRevCode("");
      setRevText("");
      setShowRevForm(false);
    } catch {
      const message = "Şəbəkə xətası — yenidən cəhd edin";
      setRevMsg({ ok: false, text: message });
      toast({ type: "error", message });
    } finally {
      setRevBusy(false);
    }
  };

  const inputCls =
    "w-full rounded-lg border border-gece/20 px-3 py-2.5 text-sm focus:border-gece outline-none";

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 pb-16">
      {/* Başlıq */}
      <div className="mt-6">
        <h1 className="font-serif font-bold text-2xl sm:text-[26px] text-gece tracking-tight">
          {listing.title}
        </h1>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm text-gece">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {listing.reviews > 0 && (
              <span className="flex items-center gap-1 font-semibold">
                <IconStar className="w-3.5 h-3.5" />
                {listing.rating.toFixed(1)}
                <span className="text-gece/60 font-normal">
                  · {listing.reviews} rəy
                </span>
              </span>
            )}
            <span className="text-gece/60">{listing.region}, Azərbaycan</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={share}
              className="flex items-center gap-2 px-3 py-2 rounded-lg font-semibold underline hover:bg-kraft transition-colors"
            >
              <IconShare className="w-4 h-4" />
              {shared ? "Kopyalandı" : "Paylaş"}
            </button>
            <button
              onClick={toggleSaved}
              aria-pressed={saved}
              className="flex items-center gap-2 px-3 py-2 rounded-lg font-semibold underline hover:bg-kraft transition-colors"
            >
              <IconHeart filled={saved} className={`w-4 h-4 ${savedPop ? "gecele-heart-pop" : ""}`} />
              {saved ? "Saxlanıldı" : "Saxla"}
            </button>
          </div>
        </div>
      </div>

      {/* Sosial sübut zolağı — yalnız real, sıfırdan böyük rəqəmlər */}
      {(listing.isSuperhost ||
        (listing.viewsLast24h ?? 0) >= 3 ||
        (listing.bookingsLast30d ?? 0) > 0 ||
        listing.lastBookedDaysAgo != null) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          {listing.isSuperhost && (
            <span className="flex items-center gap-1.5 font-semibold text-gece">
              <IconStar className="w-4 h-4 text-nar" />
              Super ev sahibi
            </span>
          )}
          {(listing.viewsLast24h ?? 0) >= 3 && (
            <span className="flex items-center gap-1.5 text-gece/70">
              <IconEye className="w-4 h-4 text-gece/50" />
              Son 24 saatda <b className="text-gece">{listing.viewsLast24h}</b> baxış
            </span>
          )}
          {(listing.bookingsLast30d ?? 0) > 0 && (
            <span className="flex items-center gap-1.5 text-gece/70">
              <IconTrend className="w-4 h-4 text-mese" />
              Bu ay <b className="text-gece">{listing.bookingsLast30d}</b> dəfə rezerv olundu
            </span>
          )}
          {listing.lastBookedDaysAgo != null && (
            <span className="text-gece/60">
              {listing.lastBookedDaysAgo === 0
                ? "Bu gün rezerv olundu"
                : `${listing.lastBookedDaysAgo} gün əvvəl rezerv olundu`}
            </span>
          )}
        </div>
      )}

      <PhotoGallery photos={photos} title={listing.title} />


      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Sol */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between pb-5 border-b border-gece/10">
            <div>
              <h2 className="font-semibold text-lg text-gece">
                Ev sahibi: {listing.hostName}
              </h2>
              <p className="text-sm text-gece/60">
                {listing.type} · {listing.maxGuests} qonaq ·{" "}
                {listing.bedrooms} yataq otağı
              </p>
            </div>
            <span className="w-12 h-12 rounded-full bg-gece text-white flex items-center justify-center font-serif font-bold text-lg shrink-0">
              {listing.hostName.charAt(0)}
            </span>
          </div>

          {/* Beh qoruması */}
          <div className="mt-5 flex gap-3 items-start bg-mese-soft rounded-xl p-4">
            <IconShield className="w-6 h-6 text-mese shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-mese text-sm">
                Beh Qoruması
              </h3>
              <p className="mt-0.5 text-sm text-gece/70 leading-relaxed">
                Beh ({Math.round(DEPOSIT_RATE * 100)}%) ev sahibinə deyil,
                platformada saxlanılır. Ev təsvirə uyğun deyilsə —{" "}
                <b>pulunuz tam geri qaytarılır</b>.
              </p>
            </div>
          </div>

          {/* İmkanlar */}
          <h2 className="mt-7 font-semibold text-lg text-gece">
            Bu evdə sizi nə gözləyir
          </h2>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {listing.amenities.map((a) => (
              <span key={a} className="flex items-center gap-2.5 text-[15px] text-gece">
                <IconCheck className="w-4 h-4 text-gece/60" />
                {a}
              </span>
            ))}
          </div>

          {/* Məkan */}
          <h2 className="mt-7 font-semibold text-lg text-gece">Məkan</h2>
          <p className="mt-1 text-sm text-gece/60">
            {listing.region}, Azərbaycan — təxmini ərazi (dəqiq ünvan
            rezervasiyadan sonra paylaşılır).
          </p>
          {listing.lat != null && listing.lng != null && (
            <MapView
              variant="single"
              points={[
                {
                  id: listing.id,
                  slug: listing.slug,
                  title: listing.title,
                  region: listing.region,
                  pricePerNight: listing.pricePerNight,
                  rating: listing.rating,
                  reviews: listing.reviews,
                  photo: listing.photo,
                  lat: listing.lat,
                  lng: listing.lng,
                },
              ]}
              className="mt-3 w-full h-72 rounded-2xl overflow-hidden border border-gece/15 z-0"
            />
          )}

          {/* Dolu tarixlər */}
          {listing.bookedRanges && listing.bookedRanges.length > 0 && (
            <>
              <h2 className="mt-7 font-semibold text-lg text-gece">
                Dolu tarixlər
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {listing.bookedRanges.map((r, i) => (
                  <span
                    key={`${r.checkIn}-${r.checkOut}-${i}`}
                    className="border border-gece/15 text-gece/60 text-xs font-semibold px-3 py-1.5 rounded-full line-through"
                  >
                    {r.checkIn} → {r.checkOut}
                  </span>
                ))}
              </div>
            </>
          )}

          {/* Rəylər */}
          <div className="mt-8 pt-6 border-t border-gece/10">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg text-gece flex items-center gap-2">
                {listing.reviews > 0 ? (
                  <>
                    <IconStar className="w-4 h-4" />
                    {listing.rating.toFixed(1)} · {listing.reviews} rəy
                  </>
                ) : (
                  "Hələ rəy yoxdur"
                )}
              </h2>
              <button
                onClick={() => setShowRevForm((s) => !s)}
                className="text-sm font-semibold text-gece underline"
              >
                Rəy yaz
              </button>
            </div>

            {showRevForm && (
              <form
                onSubmit={submitReview}
                className="mt-4 border border-gece/15 rounded-xl p-4 space-y-3"
              >
                <p className="text-xs text-gece/60">
                  Rəy yalnız bu evdə qalmış qonaqlar üçündür — rezervasiya kodu
                  və telefonunuzla təsdiqlənir.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={revCode}
                    onChange={(e) => setRevCode(e.target.value)}
                    placeholder="Rezervasiya kodu (GCL-...)"
                    required
                    className={inputCls}
                  />
                  <input
                    type="tel"
                    value={revPhone}
                    onChange={(e) => setRevPhone(e.target.value)}
                    placeholder="Telefon"
                    required
                    className={inputCls}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRevRating(n)}
                      aria-label={`${n} ulduz`}
                      className={
                        n <= revRating ? "text-gece" : "text-gece/20"
                      }
                    >
                      <IconStar className="w-6 h-6" />
                    </button>
                  ))}
                </div>
                <textarea
                  value={revText}
                  onChange={(e) => setRevText(e.target.value)}
                  placeholder="Təcrübənizi bölüşün (ən azı 10 simvol)"
                  required
                  rows={3}
                  className={inputCls}
                />
                <button
                  type="submit"
                  disabled={revBusy}
                  className="bg-gece text-white font-semibold px-5 py-2.5 rounded-lg text-sm disabled:opacity-50"
                >
                  {revBusy ? "Göndərilir..." : "Rəyi dərc et"}
                </button>
              </form>
            )}

            {revMsg && (
              <p
                className={`mt-3 text-sm font-semibold rounded-xl px-3 py-2.5 ${
                  revMsg.ok
                    ? "text-mese bg-mese-soft"
                    : "text-nar bg-nar-soft"
                }`}
              >
                {revMsg.text}
              </p>
            )}

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {reviews.map((r, i) => (
                <div key={i}>
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-full bg-kraft text-gece flex items-center justify-center font-serif font-bold">
                      {r.guestName.charAt(0)}
                    </span>
                    <div>
                      <div className="font-semibold text-sm text-gece">
                        {r.guestName}
                      </div>
                      <div className="text-xs text-gece/50">{r.date}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-0.5 text-gece">
                    {Array.from({ length: r.rating }).map((_, j) => (
                      <IconStar key={j} className="w-3 h-3" />
                    ))}
                  </div>
                  <p className="mt-1.5 text-[15px] text-gece/80 leading-relaxed">
                    {r.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sağ — rezervasiya paneli */}
        <div className="lg:sticky lg:top-24 h-fit">
          <div className="border border-gece/15 rounded-2xl shadow-lift p-6">
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className="text-[22px] text-gece">
                {listing.previousPrice ? (
                  <span className="text-gece/40 line-through font-medium text-lg mr-1.5">
                    {listing.previousPrice} ₼
                  </span>
                ) : null}
                <span className="font-bold">{listing.pricePerNight} ₼</span>
                <span className="text-gece/60 text-base"> gecə</span>
              </p>
              {listing.previousPrice ? (
                <span className="bg-nar-soft text-nar text-xs font-bold px-2 py-1 rounded-full">
                  Qiymət düşdü
                </span>
              ) : null}
            </div>

            <div className="mt-4 border border-gece/20 rounded-xl">
              <DateRangePicker
                checkIn={checkIn}
                checkOut={checkOut}
                onChange={(ci, co) => {
                  setCheckIn(ci);
                  setCheckOut(co);
                }}
              />
              <div ref={guestsRef} className="relative border-t border-gece/20">
                <button
                  type="button"
                  onClick={() => setGuestsOpen((o) => !o)}
                  aria-expanded={guestsOpen}
                  className="w-full text-left p-3"
                >
                  <span className="block text-[10px] font-bold uppercase text-gece">
                    Qonaq
                  </span>
                  <span className="block text-sm text-gece/70 truncate mt-0.5">
                    {guestsLabel(guestCounts) || "Qonaq əlavə edin"}
                  </span>
                </button>
                {guestsOpen && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-lift border border-gece/10 p-5">
                    <GuestsPicker
                      value={guestCounts}
                      onChange={setGuestCounts}
                      maxGuests={listing.maxGuests}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Qıtlıq siqnalı — real say, yalnız az qalanda göstərilir */}
            {regionLeft != null && regionLeft > 0 && regionLeft <= 4 && (
              <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-nar bg-nar-soft rounded-lg px-3 py-2.5">
                <IconEye className="w-4 h-4 shrink-0" />
                {listing.region}də bu tarixlərə cəmi {regionLeft} ev boşdur —
                tez dolur
              </p>
            )}

            <div className="mt-3 space-y-2">
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Adınız"
                aria-label="Adınız"
                className={inputCls}
              />
              <input
                type="tel"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="+994 50 123 45 67"
                aria-label="Telefon nömrəniz"
                className={inputCls}
              />
            </div>

            {nights > 0 && (
              <div className="mt-4 space-y-1.5 text-sm text-gece/70">
                <div className="flex justify-between">
                  <span className="underline">
                    {listing.pricePerNight} ₼ × {nights} gecə
                  </span>
                  <span>{base} ₼</span>
                </div>
                <div className="flex justify-between">
                  <span className="underline">Xidmət haqqı</span>
                  <span>{fee} ₼</span>
                </div>
                <div className="flex justify-between font-semibold text-gece text-base pt-2 border-t border-gece/10">
                  <span>Cəmi</span>
                  <span>{total} ₼</span>
                </div>
                <div className="flex justify-between text-mese font-semibold">
                  <span>İndi ödənən beh</span>
                  <span>{deposit} ₼</span>
                </div>
              </div>
            )}

            {errorMsg && (
              <p className="mt-3 text-sm font-semibold text-nar bg-nar-soft rounded-xl px-3 py-2.5">
                {errorMsg}
              </p>
            )}

            <button
              onClick={reserve}
              disabled={!canBook}
              className={`mt-4 w-full py-3.5 rounded-xl font-semibold text-base transition-colors ${
                canBook
                  ? "bg-nar hover:bg-nar-dark text-white"
                  : "bg-gece/10 text-gece/40 cursor-not-allowed"
              }`}
            >
              {submitting
                ? "Göndərilir..."
                : nights > 0
                  ? "Rezerv et"
                  : "Tarixləri seçin"}
            </button>
            <p className="mt-2.5 text-xs text-center text-gece/50">
              Hələ heç nə çəkilmir — beh növbəti addımda ödənilir
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
