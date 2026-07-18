"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { REGIONS } from "@/lib/data";

const TYPES = ["Bağ evi", "Villa", "Dağ evi", "Kotec", "Həyət evi", "Şale"] as const;

interface Me {
  id: string;
  role: string;
  name: string;
  phone: string | null;
}

interface HostListing {
  id: string;
  slug: string;
  title: string;
  region: string;
  type: string;
  pricePerNight: number;
  status: string;
  photo: string;
  confirmedBookings: number;
  guests?: {
    id: string;
    guestName: string;
    guestPhone: string;
    checkIn: string;
    checkOut: string;
    people: number;
    total: number;
  }[];
}

const STATUS_LABEL: Record<string, string> = {
  approved: "Yayımda",
  pending: "Moderasiyada",
  rejected: "Rədd edilib",
  paused: "Dayandırılıb",
};

export default function HostPage() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [listings, setListings] = useState<HostListing[] | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState("");
  const [region, setRegion] = useState<string>("Qəbələ");
  const [type, setType] = useState<string>("Bağ evi");
  const [price, setPrice] = useState(120);
  const [guests, setGuests] = useState(6);
  const [bedrooms, setBedrooms] = useState(3);
  const [pool, setPool] = useState(false);
  const [hostPhone, setHostPhone] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const uploadPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setMsg(null);
    try {
      for (const file of Array.from(files).slice(0, 8)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) {
          setMsg({ ok: false, text: data.error ?? "Foto yüklənmədi" });
          continue;
        }
        setPhotos((p) => (p.length >= 8 ? p : [...p, data.url as string]));
      }
    } finally {
      setUploading(false);
    }
  };

  const loadListings = useCallback(async () => {
    const res = await fetch("/api/host/listings");
    if (res.ok) setListings(await res.json());
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setMe(d.user);
        if (d.user) {
          if (d.user.phone) setHostPhone(d.user.phone);
          loadListings();
        }
      })
      .catch(() => setMe(null));
  }, [loadListings]);

  const becomeHost = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "host" }),
      });
      const d = await res.json();
      if (res.ok) setMe(d.user);
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          region,
          type,
          pricePerNight: price,
          maxGuests: guests,
          bedrooms,
          pool,
          photos,
          hostName: me?.name,
          hostPhone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: data.error ?? "Xəta baş verdi" });
        return;
      }
      setMsg({
        ok: true,
        text: "Elan qəbul edildi — moderasiyadan sonra yayımlanacaq (24 saat).",
      });
      setTitle("");
      setPhotos([]);
      setShowForm(false);
      loadListings();
    } catch {
      setMsg({ ok: false, text: "Şəbəkə xətası — yenidən cəhd edin" });
    } finally {
      setBusy(false);
    }
  };

  const [actioning, setActioning] = useState<string | null>(null);

  const changePrice = async (l: HostListing) => {
    const val = window.prompt("Yeni qiymət (₼/gecə):", String(l.pricePerNight));
    if (val === null) return;
    const price = Number(val);
    if (!Number.isFinite(price) || price < 20) {
      setMsg({ ok: false, text: "Qiymət düzgün deyil (min 20 ₼)" });
      return;
    }
    setActioning(l.id);
    try {
      const res = await fetch(`/api/host/listings/${l.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pricePerNight: price }),
      });
      if (res.ok) loadListings();
      else setMsg({ ok: false, text: (await res.json()).error ?? "Alınmadı" });
    } finally {
      setActioning(null);
    }
  };

  const togglePause = async (l: HostListing) => {
    setActioning(l.id);
    try {
      const res = await fetch(`/api/host/listings/${l.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: l.status === "paused" ? "activate" : "pause",
        }),
      });
      if (res.ok) loadListings();
      else setMsg({ ok: false, text: (await res.json()).error ?? "Alınmadı" });
    } finally {
      setActioning(null);
    }
  };

  const deleteListing = async (l: HostListing) => {
    if (!window.confirm(`"${l.title}" elanını silmək istəyirsiniz?`)) return;
    setActioning(l.id);
    try {
      const res = await fetch(`/api/host/listings/${l.id}`, {
        method: "DELETE",
      });
      if (res.ok) loadListings();
      else setMsg({ ok: false, text: (await res.json()).error ?? "Silinmədi" });
    } finally {
      setActioning(null);
    }
  };

  const input =
    "mt-1 w-full rounded-xl border border-gece/20 px-3.5 py-3 text-[15px] focus:border-gece outline-none";
  const label = "text-xs font-semibold text-gece/60";

  // Daxil olmayıb
  if (me === null) {
    return (
      <main className="mx-auto max-w-md px-4 mt-16 pb-16 text-center">
        <h1 className="font-serif font-bold text-2xl text-gece tracking-tight">
          Evini Gecələ-də yerləşdir
        </h1>
        <p className="mt-2 text-gece/60 leading-relaxed">
          Boş dayanan eviniz pul qazansın. Elan pulsuz — komissiya yalnız
          uğurlu rezervasiyadan. Davam etmək üçün ev sahibi hesabı ilə daxil
          olun.
        </p>
        <Link
          href="/giris"
          className="mt-5 inline-block bg-nar hover:bg-nar-dark text-white font-semibold px-8 py-3.5 rounded-full"
        >
          Daxil ol / Qeydiyyat
        </Link>
      </main>
    );
  }

  if (me === undefined) {
    return (
      <main className="mx-auto max-w-4xl px-4 mt-8">
        <div className="h-40 bg-kraft rounded-2xl animate-pulse" />
      </main>
    );
  }

  // Qonaq hesabı — rol yüksəltmə
  if (me.role !== "host") {
    return (
      <main className="mx-auto max-w-md px-4 mt-16 pb-16 text-center">
        <h1 className="font-serif font-bold text-2xl text-gece tracking-tight">
          Ev sahibi olun
        </h1>
        <p className="mt-2 text-gece/60 leading-relaxed">
          Hazırda kirayəçi hesabındasınız. Elan yerləşdirmək üçün hesabınızı
          ev sahibi rejiminə keçirin — rezervasiyalarınız itmir.
        </p>
        <button
          onClick={becomeHost}
          disabled={busy}
          className="mt-5 bg-gece text-qum font-semibold px-8 py-3.5 rounded-full disabled:opacity-50"
        >
          {busy ? "Keçirilir..." : "Ev sahibi hesabına keç"}
        </button>
      </main>
    );
  }

  // Ev sahibi paneli
  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 mt-8 pb-16">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif font-bold text-2xl text-gece tracking-tight">
            Ev sahibi paneli
          </h1>
          <p className="mt-1 text-sm text-gece/60">
            Xoş gəlmisiniz, {me.name}. Komissiya yalnız uğurlu rezervasiyadan
            tutulur.
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="shrink-0 bg-nar hover:bg-nar-dark text-white font-semibold px-5 py-3 rounded-full text-sm"
        >
          {showForm ? "Bağla" : "+ Yeni elan"}
        </button>
      </div>

      {msg && (
        <p
          className={`mt-4 text-sm font-semibold rounded-xl px-3 py-2.5 ${
            msg.ok ? "text-mese bg-mese-soft" : "text-nar bg-nar-soft"
          }`}
        >
          {msg.text}
        </p>
      )}

      {/* Yeni elan forması */}
      {showForm && (
        <form
          onSubmit={submit}
          className="mt-5 border border-gece/15 rounded-2xl p-5 space-y-4"
        >
          <label className="block">
            <span className={label}>Elanın başlığı</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Məs: Hovuzlu bağ evi, çay kənarında"
              required
              className={input}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={label}>Region</span>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className={`${input} bg-qum`}
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={label}>Ev tipi</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={`${input} bg-qum`}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className={label}>Qiymət ₼/gecə</span>
              <input
                type="number"
                min={20}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className={input}
              />
            </label>
            <label className="block">
              <span className={label}>Maks qonaq</span>
              <input
                type="number"
                min={1}
                max={30}
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className={input}
              />
            </label>
            <label className="block">
              <span className={label}>Yataq otağı</span>
              <input
                type="number"
                min={1}
                max={15}
                value={bedrooms}
                onChange={(e) => setBedrooms(Number(e.target.value))}
                className={input}
              />
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <label className="flex items-center gap-2.5 font-medium text-sm text-gece shrink-0">
              <input
                type="checkbox"
                checked={pool}
                onChange={(e) => setPool(e.target.checked)}
                className="w-5 h-5 accent-xezer"
              />
              Hovuz var
            </label>
            <label className="block flex-1">
              <span className={label}>Əlaqə telefonu</span>
              <input
                type="tel"
                value={hostPhone}
                onChange={(e) => setHostPhone(e.target.value)}
                placeholder="+994 50 123 45 67"
                required
                className={input}
              />
            </label>
          </div>

          <div>
            <span className={label}>Fotolar (ən azı 1, maks 8)</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {photos.map((src) => (
                <div
                  key={src}
                  className="relative w-20 h-16 rounded-lg overflow-hidden"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotos((p) => p.filter((x) => x !== src))}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white text-xs leading-none"
                    aria-label="Fotonu sil"
                  >
                    ×
                  </button>
                </div>
              ))}
              {photos.length < 8 && (
                <label className="w-20 h-16 rounded-lg border-2 border-dashed border-gece/25 flex items-center justify-center text-gece/50 text-xs font-semibold cursor-pointer hover:border-gece/50">
                  {uploading ? "..." : "+ Foto"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={(e) => uploadPhotos(e.target.files)}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={busy || uploading || photos.length === 0}
            className="w-full bg-nar hover:bg-nar-dark text-white font-semibold text-base py-3.5 rounded-xl disabled:opacity-50"
          >
            {busy ? "Göndərilir..." : "Elanı göndər"}
          </button>
          <p className="text-[11px] text-center text-gece/50">
            Elan moderasiyadan sonra yayımlanır — foto və təfərrüatlar üçün
            sizinlə əlaqə saxlanılacaq.
          </p>
        </form>
      )}

      {/* Elanlarım */}
      <h2 className="mt-8 font-semibold text-lg text-gece">
        Elanlarım {listings ? `(${listings.length})` : ""}
      </h2>

      {listings === null && (
        <div className="mt-3 h-28 bg-kraft rounded-2xl animate-pulse" />
      )}

      {listings && listings.length === 0 && (
        <p className="mt-3 text-sm text-gece/60">
          Hələ elanınız yoxdur — "+ Yeni elan" ilə ilk evinizi yerləşdirin.
        </p>
      )}

      {listings && listings.length > 0 && (
        <div className="mt-3 space-y-3">
          {listings.map((l) => (
            <div key={l.id} className="border border-gece/15 rounded-2xl p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={l.photo}
                    alt={l.title}
                    className="w-20 h-16 rounded-xl object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gece truncate">
                      {l.title}
                    </h3>
                    <p className="text-sm text-gece/60">
                      {l.region} · {l.type} · {l.pricePerNight} ₼/gecə
                    </p>
                    <p className="text-sm text-gece/60">
                      {l.confirmedBookings} təsdiqlənmiş rezervasiya
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                      l.status === "approved"
                        ? "bg-mese-soft text-mese"
                        : l.status === "pending"
                          ? "bg-nar-soft text-nar-dark"
                          : "bg-kraft text-gece/50"
                    }`}
                  >
                    {STATUS_LABEL[l.status] ?? l.status}
                  </span>
                  <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-sm">
                    {l.status === "approved" && (
                      <Link
                        href={`/ev/${l.slug}`}
                        className="font-semibold text-gece underline"
                      >
                        Bax
                      </Link>
                    )}
                    {(l.status === "approved" || l.status === "paused") && (
                      <>
                        <button
                          onClick={() => changePrice(l)}
                          disabled={actioning === l.id}
                          className="font-semibold text-gece underline disabled:opacity-50"
                        >
                          Qiymət
                        </button>
                        <button
                          onClick={() => togglePause(l)}
                          disabled={actioning === l.id}
                          className="font-semibold text-gece underline disabled:opacity-50"
                        >
                          {l.status === "paused" ? "Aktivləşdir" : "Dayandır"}
                        </button>
                        <button
                          onClick={() => deleteListing(l)}
                          disabled={actioning === l.id}
                          className="font-semibold text-nar underline disabled:opacity-50"
                        >
                          Sil
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {l.guests && l.guests.length > 0 && (
                <div className="mt-4 border-t border-gece/10 pt-3">
                  <p className="text-xs font-semibold text-gece/60 mb-2">
                    Gələn qonaqlar ({l.guests.length})
                  </p>
                  <div className="space-y-2">
                    {l.guests.map((g) => (
                      <div
                        key={g.id}
                        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm bg-kraft rounded-xl px-3 py-2.5"
                      >
                        <span className="font-semibold text-gece">
                          {g.guestName}
                          <span className="font-normal text-gece/60">
                            {" "}
                            · {g.people} qonaq
                          </span>
                        </span>
                        <span className="text-gece/70">
                          {g.checkIn} → {g.checkOut}
                        </span>
                        <a
                          href={`tel:${g.guestPhone}`}
                          className="font-semibold text-xezer"
                        >
                          {g.guestPhone}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
