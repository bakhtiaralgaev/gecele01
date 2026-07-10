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
    const t = setTimeout(() => setShow(false), 2850);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  const letters = ["g", "e", "c", "ə", "l", "ə"];

  return (
    <div className="intro-overlay" aria-hidden="true">
      <div className="intro-inner">
        <div className="intro-word font-serif font-extrabold text-gece text-6xl sm:text-8xl tracking-tight leading-none">
          {letters.map((ch, i) => (
            <span
              key={i}
              className="intro-letter"
              style={{ animationDelay: `${140 + i * 75}ms` }}
            >
              {ch}
            </span>
          ))}
          <span className="intro-dot" style={{ animationDelay: "760ms" }}>
            <IconHeart filled className="w-[0.5em] h-[0.5em]" />
          </span>
        </div>
        <p
          className="intro-tagline font-slogan italic mt-6 text-gece/60 text-lg sm:text-2xl"
          style={{ animationDelay: "1150ms" }}
        >
          istirahətin yeni ünvanı
        </p>
        <div className="intro-bar">
          <span className="intro-bar-fill" />
        </div>
      </div>
    </div>
  );
}
