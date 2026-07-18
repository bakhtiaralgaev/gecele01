"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconHeart } from "./Icons";
import Avatar from "./Avatar";
import NotificationsBell from "./NotificationsBell";
import { ThemeToggle, LanguageSwitcher } from "./HeaderPrefs";
import { useI18n } from "./LocaleProvider";
import { playSound } from "@/lib/sound";
import { syncWishlist } from "@/lib/wishlist";

interface Me {
  id: string;
  role: string;
  name: string;
}

export default function Header() {
  const { t } = useI18n();
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const prevUnreadRef = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setMe(d.user))
      .catch(() => setMe(null));
  }, []);

  // Oxunmamış mesaj sayğacı — daxil olanda periodik yenilənir
  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    const load = () =>
      fetch("/api/messages")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (cancelled || !d) return;
          const n = d.totalUnread ?? 0;
          // Yeni oxunmamış mesaj gələndə bildiriş səsi (ilk yükləmədə yox)
          if (prevUnreadRef.current !== null && n > prevUnreadRef.current) {
            playSound("notify");
          }
          prevUnreadRef.current = n;
          setUnread(n);
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 20000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [me]);

  // Giriş edəndə seçilmişləri hesabla sinxronla (cihazlar arası)
  useEffect(() => {
    if (me) syncWishlist();
  }, [me]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const logout = async () => {
    await fetch("/api/auth/me", { method: "DELETE" });
    window.location.href = "/";
  };

  // App Store 5.1.1(v) / Play: hesabın tətbiq daxilində silinməsi
  const deleteAccount = async () => {
    if (
      !window.confirm(
        "Hesabınız və şəxsi məlumatlarınız birdəfəlik silinəcək. Davam edilsin?"
      )
    ) {
      return;
    }
    const res = await fetch("/api/auth/me?mode=delete", { method: "DELETE" });
    if (res.ok) window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-40 bg-qum border-b border-gece/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-end gap-1 shrink-0">
          <span className="font-serif font-extrabold text-[24px] tracking-tight text-nar leading-none">
            gecələ
          </span>
          <IconHeart filled className="w-3.5 h-3.5 mb-0.5" />
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/ev-sahibi"
            className="hidden sm:block text-sm font-semibold text-gece hover:bg-kraft px-3 py-2.5 rounded-full transition-colors"
          >
            {t("nav.becomeHost")}
          </Link>

          <Link
            href="/secilmisler"
            aria-label={t("nav.wishlist")}
            className="hidden sm:flex items-center justify-center w-10 h-10 text-gece hover:bg-kraft rounded-full transition-colors"
          >
            <IconHeart className="w-5 h-5" />
          </Link>

          <LanguageSwitcher />
          <ThemeToggle />

          {me && <NotificationsBell />}

          {me && (
            <Link
              href="/mesajlar"
              aria-label={
                unread > 0 ? `${t("nav.messages")} (${unread})` : t("nav.messages")
              }
              className="relative flex items-center justify-center w-10 h-10 text-gece hover:bg-kraft rounded-full transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
                <path
                  d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
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
            </Link>
          )}

          {me === undefined ? (
            <div className="w-24 h-10 bg-kraft rounded-full animate-pulse" />
          ) : me === null ? (
            <Link
              href="/giris"
              className="bg-nar hover:bg-nar-dark text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors"
            >
              {t("nav.login")}
            </Link>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setOpen((o) => !o)}
                aria-label={t("nav.accountMenu")}
                aria-expanded={open}
                className="flex items-center gap-2 border border-gece/20 hover:shadow-yurd rounded-full pl-3 pr-1.5 py-1.5 transition-shadow"
              >
                <span className="text-sm font-semibold text-gece max-w-[100px] truncate hidden sm:block">
                  {me.name}
                </span>
                <Avatar name={me.name} size={32} />
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-56 bg-qum border border-gece/10 rounded-xl shadow-lift py-2 text-sm">
                  <div className="px-4 py-2 border-b border-gece/10">
                    <div className="font-semibold text-gece truncate">
                      {me.name}
                    </div>
                    <div className="text-xs text-gece/50">
                      {me.role === "host" ? t("nav.hostAccount") : t("nav.guestAccount")}
                    </div>
                  </div>
                  <Link
                    href="/profil"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2.5 text-gece hover:bg-kraft"
                  >
                    {t("nav.profile")}
                  </Link>
                  <Link
                    href="/rezervlerim"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2.5 text-gece hover:bg-kraft"
                  >
                    {t("nav.bookings")}
                  </Link>
                  <Link
                    href="/secilmisler"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2.5 text-gece hover:bg-kraft"
                  >
                    {t("nav.wishlist")}
                  </Link>
                  <Link
                    href="/ev-sahibi"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2.5 text-gece hover:bg-kraft"
                  >
                    {t("nav.hostPanel")}
                  </Link>
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2.5 text-gece hover:bg-kraft border-t border-gece/10"
                  >
                    {t("nav.logout")}
                  </button>
                  <button
                    onClick={deleteAccount}
                    className="w-full text-left px-4 py-2.5 text-nar hover:bg-nar-soft border-t border-gece/10"
                  >
                    {t("nav.deleteAccount")}
                  </button>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
