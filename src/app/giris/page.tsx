"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconApple, IconGoogle } from "@/components/Icons";
import { useToast } from "@/components/Toast";

type Role = "guest" | "host";
type Method = "phone" | "email";
type EmailMode = "login" | "register";

export default function LoginPage() {
  const { toast } = useToast();
  const [role, setRole] = useState<Role>("guest");
  const [method, setMethod] = useState<Method>("phone");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (errorMsg) toast({ type: "error", message: errorMsg });
  }, [errorMsg, toast]);

  // Telefon axını
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [otp, setOtp] = useState("");
  const [phoneName, setPhoneName] = useState("");

  // E-mail axını
  const [emailMode, setEmailMode] = useState<EmailMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailName, setEmailName] = useState("");

  const finish = (userRole: string) => {
    window.location.href = userRole === "host" ? "/ev-sahibi" : "/";
  };

  const oauth = async (provider: "apple" | "google") => {
    setBusy(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/auth/oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Xəta baş verdi");
        return;
      }
      finish(data.user.role);
    } catch {
      setErrorMsg("Şəbəkə xətası — yenidən cəhd edin");
    } finally {
      setBusy(false);
    }
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/auth/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Xəta baş verdi");
        return;
      }
      setIsNewUser(Boolean(data.isNewUser));
      setOtpSent(true);
    } catch {
      setErrorMsg("Şəbəkə xətası — yenidən cəhd edin");
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/auth/phone", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp, name: phoneName, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Xəta baş verdi");
        return;
      }
      finish(data.user.role);
    } catch {
      setErrorMsg("Şəbəkə xətası — yenidən cəhd edin");
    } finally {
      setBusy(false);
    }
  };

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/auth/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: emailMode,
          email,
          password,
          name: emailName,
          role,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Xəta baş verdi");
        return;
      }
      finish(data.user.role);
    } catch {
      setErrorMsg("Şəbəkə xətası — yenidən cəhd edin");
    } finally {
      setBusy(false);
    }
  };

  const input =
    "mt-1 w-full rounded-xl border border-gece/20 px-3.5 py-3 text-[15px] focus:border-gece outline-none";
  const label = "text-xs font-semibold text-gece/60";

  return (
    <main className="mx-auto max-w-md px-4 mt-8 pb-16">
      <div className="border border-gece/15 rounded-2xl shadow-yurd overflow-hidden">
        <div className="px-6 py-4 border-b border-gece/10 text-center font-semibold text-gece">
          Daxil ol və ya qeydiyyat
        </div>

        <div className="p-6">
          <h1 className="font-serif font-bold text-[22px] text-gece">
            Gecələ-yə xoş gəlmisiniz
          </h1>

          {/* Rol seçimi */}
          <div className="mt-4 grid grid-cols-2 gap-2 bg-kraft rounded-xl p-1">
            {(
              [
                ["guest", "Kirayəçiyəm"],
                ["host", "Ev sahibiyəm"],
              ] as [Role, string][]
            ).map(([r, t]) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  role === r
                    ? "bg-qum text-gece shadow-sm"
                    : "text-gece/50 hover:text-gece"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* OAuth */}
          <div className="mt-5 space-y-2.5">
            <button
              onClick={() => oauth("apple")}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2.5 bg-gece text-qum font-semibold py-3 rounded-xl disabled:opacity-50"
            >
              <IconApple className="w-5 h-5" />
              Apple ilə davam et
            </button>
            <button
              onClick={() => oauth("google")}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2.5 border border-gece/25 text-gece font-semibold py-3 rounded-xl hover:bg-kraft disabled:opacity-50"
            >
              <IconGoogle className="w-5 h-5" />
              Google ilə davam et
            </button>
          </div>

          <div className="my-5 flex items-center gap-3 text-xs text-gece/40">
            <span className="flex-1 h-px bg-gece/10" />
            və ya
            <span className="flex-1 h-px bg-gece/10" />
          </div>

          {/* Metod seçimi */}
          {method === "phone" ? (
            !otpSent ? (
              <form onSubmit={sendOtp} className="space-y-3">
                <label className="block">
                  <span className={label}>Mobil nömrə</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+994 50 123 45 67"
                    required
                    className={input}
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-nar hover:bg-nar-dark text-white font-semibold py-3 rounded-xl disabled:opacity-50"
                >
                  {busy ? "Göndərilir..." : "Davam et"}
                </button>
                <button
                  type="button"
                  onClick={() => setMethod("email")}
                  className="w-full text-sm font-semibold text-gece underline"
                >
                  E-mail ilə davam et
                </button>
              </form>
            ) : (
              <form onSubmit={verifyOtp} className="space-y-3">
                <p className="text-sm text-gece/60">
                  <b className="text-gece">{phone}</b> nömrəsinə kod göndərildi.
                </p>
                <p className="text-xs font-semibold text-gece/50 bg-kraft rounded-lg px-3 py-2">
                  SINAQ REJİMİ — SMS qoşulana qədər kod: <b>1234</b>
                </p>
                <label className="block">
                  <span className={label}>Təsdiq kodu</span>
                  <input
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    placeholder="••••"
                    required
                    className={`${input} tracking-[0.5em] text-center font-bold`}
                  />
                </label>
                {isNewUser && (
                  <label className="block">
                    <span className={label}>Adınız</span>
                    <input
                      value={phoneName}
                      onChange={(e) => setPhoneName(e.target.value)}
                      placeholder="Ad Soyad"
                      required
                      className={input}
                    />
                  </label>
                )}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-nar hover:bg-nar-dark text-white font-semibold py-3 rounded-xl disabled:opacity-50"
                >
                  {busy ? "Yoxlanılır..." : "Təsdiqlə"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtp("");
                  }}
                  className="w-full text-sm font-semibold text-gece/60"
                >
                  ← Nömrəni dəyiş
                </button>
              </form>
            )
          ) : (
            <form onSubmit={submitEmail} className="space-y-3">
              {emailMode === "register" && (
                <label className="block">
                  <span className={label}>Adınız</span>
                  <input
                    value={emailName}
                    onChange={(e) => setEmailName(e.target.value)}
                    placeholder="Ad Soyad"
                    required
                    className={input}
                  />
                </label>
              )}
              <label className="block">
                <span className={label}>E-mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ad@example.com"
                  required
                  className={input}
                />
              </label>
              <label className="block">
                <span className={label}>Şifrə</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ən azı 6 simvol"
                  required
                  className={input}
                />
              </label>
              {emailMode === "login" && (
                <Link
                  href="/parol-yenile"
                  className="block text-right text-xs font-semibold text-gece/60 hover:text-gece"
                >
                  Parolu unutmusunuz?
                </Link>
              )}
              <button
                type="submit"
                disabled={busy}
                className="w-full bg-nar hover:bg-nar-dark text-white font-semibold py-3 rounded-xl disabled:opacity-50"
              >
                {busy
                  ? "Gözləyin..."
                  : emailMode === "login"
                    ? "Daxil ol"
                    : "Qeydiyyatdan keç"}
              </button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() =>
                    setEmailMode(emailMode === "login" ? "register" : "login")
                  }
                  className="font-semibold text-gece underline"
                >
                  {emailMode === "login"
                    ? "Hesabın yoxdur? Qeydiyyat"
                    : "Hesabın var? Daxil ol"}
                </button>
                <button
                  type="button"
                  onClick={() => setMethod("phone")}
                  className="font-semibold text-gece/60"
                >
                  Nömrə ilə davam et
                </button>
              </div>
            </form>
          )}

          {errorMsg && (
            <p className="mt-4 text-sm font-semibold text-nar bg-nar-soft rounded-xl px-3 py-2.5">
              {errorMsg}
            </p>
          )}

          <p className="mt-5 text-[11px] text-gece/50 leading-relaxed">
            Davam etməklə{" "}
            <Link href="/qaydalar" className="underline">
              İstifadə şərtləri
            </Link>{" "}
            və{" "}
            <Link href="/mexfilik" className="underline">
              Məxfilik siyasəti
            </Link>
            ni qəbul edirsiniz. Apple/Google girişi App Store dərcində real
            OAuth ilə əvəzlənəcək (hazırda demo).
          </p>
        </div>
      </div>
    </main>
  );
}
