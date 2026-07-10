"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetForm() {
  const token = useSearchParams().get("token");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const input =
    "mt-1 w-full rounded-xl border border-gece/20 px-3.5 py-3 text-[15px] focus:border-gece outline-none";

  const requestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setMsg({
        ok: true,
        text: "Əgər bu e-mail ilə hesab varsa, bərpa linki göndərildi. Poçtunuzu yoxlayın.",
      });
    } catch {
      setMsg({ ok: false, text: "Şəbəkə xətası — yenidən cəhd edin" });
    } finally {
      setBusy(false);
    }
  };

  const setNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: data.error ?? "Alınmadı" });
        return;
      }
      setMsg({
        ok: true,
        text: "Parol yeniləndi! İndi yeni parolunuzla daxil ola bilərsiniz.",
      });
    } catch {
      setMsg({ ok: false, text: "Şəbəkə xətası — yenidən cəhd edin" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 mt-10 pb-16">
      <h1 className="font-serif font-bold text-2xl text-gece tracking-tight">
        Parolun bərpası
      </h1>

      {msg && (
        <p
          className={`mt-4 text-sm font-semibold rounded-xl px-3 py-2.5 ${
            msg.ok ? "text-mese bg-mese-soft" : "text-nar bg-nar-soft"
          }`}
        >
          {msg.text}
        </p>
      )}

      {token ? (
        msg?.ok ? (
          <Link
            href="/giris"
            className="mt-5 inline-block bg-nar hover:bg-nar-dark text-white font-semibold px-7 py-3.5 rounded-full"
          >
            Daxil ol
          </Link>
        ) : (
          <form onSubmit={setNewPassword} className="mt-5 space-y-3">
            <p className="text-sm text-gece/60">Yeni parolunuzu təyin edin.</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Yeni parol (ən azı 6 simvol)"
              required
              className={input}
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-nar hover:bg-nar-dark text-white font-semibold py-3 rounded-xl disabled:opacity-50"
            >
              {busy ? "Yenilənir..." : "Parolu yenilə"}
            </button>
          </form>
        )
      ) : (
        <form onSubmit={requestLink} className="mt-5 space-y-3">
          <p className="text-sm text-gece/60">
            Hesabınızın e-mailini yazın — bərpa linki göndərəcəyik.
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ad@example.com"
            required
            className={input}
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-nar hover:bg-nar-dark text-white font-semibold py-3 rounded-xl disabled:opacity-50"
          >
            {busy ? "Göndərilir..." : "Bərpa linki göndər"}
          </button>
          <Link
            href="/giris"
            className="block text-center text-sm font-semibold text-gece/60"
          >
            ← Girişə qayıt
          </Link>
        </form>
      )}
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 mt-10 text-center text-gece/50">
          Yüklənir…
        </div>
      }
    >
      <ResetForm />
    </Suspense>
  );
}
