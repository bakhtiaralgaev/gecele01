"use client";

import { useEffect, useState } from "react";
import { IconHeart } from "./Icons";

// İlk girişdə brend animasiyası. Sessiya boyu bir dəfə göstərilir,
// reduced-motion seçimində tamamilə ötürülür.
export default function IntroSplash() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const seen = window.sessionStorage.getItem("gecele_intro");
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (seen || reduced) return;
    window.sessionStorage.setItem("gecele_intro", "1");
    setShow(true);
    const t = setTimeout(() => setShow(false), 3250);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  const letters = ["g", "e", "c", "ə", "l", "ə"];

  return (
    <div className="intro-overlay" aria-hidden="true">
      <span className="intro-aurora intro-aurora-1" />
      <span className="intro-aurora intro-aurora-2" />
      <span className="intro-grid" />
      <div className="intro-inner">
        <div className="intro-word-wrap">
          <div className="intro-word font-serif font-extrabold text-white text-6xl sm:text-8xl tracking-tight leading-none">
            {letters.map((ch, i) => (
              <span
                key={i}
                className="intro-letter"
                style={{ animationDelay: `${180 + i * 70}ms` }}
              >
                {ch}
              </span>
            ))}
            <span className="intro-dot" style={{ animationDelay: "720ms" }}>
              <IconHeart filled className="w-[0.5em] h-[0.5em] intro-heart-beat" />
            </span>
          </div>
          <span className="intro-sheen" />
        </div>
        <span className="intro-line" />
        <p className="intro-tagline font-serif mt-7 text-white/55 text-sm sm:text-lg">
          istirahətin yeni ünvanı
        </p>
      </div>
    </div>
  );
}
