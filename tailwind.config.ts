import type { Config } from "tailwindcss";

// Gecələ — Airbnb-səviyyə minimal dizayn tokenləri
// Rənglər CSS dəyişənlərinə bağlıdır — gecə/gündüz rejimi bir yerdən idarə
// olunur. Beləliklə 617 mövcud sinif (`text-gece/60` kimi opacity daxil)
// dəyişmədən işləyir; dəyərlər globals.css-də :root və .dark altındadır.
// `<alpha-value>` Tailwind-ın opacity sintaksisini qoruyur.
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        qum: "rgb(var(--c-qum) / <alpha-value>)", // səhifə fonu
        gece: "rgb(var(--c-gece) / <alpha-value>)", // əsas mətn
        nar: {
          DEFAULT: "rgb(var(--c-nar) / <alpha-value>)", // CTA aksenti
          dark: "rgb(var(--c-nar-dark) / <alpha-value>)",
          soft: "rgb(var(--c-nar-soft) / <alpha-value>)",
        },
        mese: {
          DEFAULT: "rgb(var(--c-mese) / <alpha-value>)", // etibar/escrow
          dark: "rgb(var(--c-mese-dark) / <alpha-value>)",
          soft: "rgb(var(--c-mese-soft) / <alpha-value>)",
        },
        xezer: {
          DEFAULT: "rgb(var(--c-xezer) / <alpha-value>)",
          soft: "rgb(var(--c-xezer-soft) / <alpha-value>)",
        },
        kraft: "rgb(var(--c-kraft) / <alpha-value>)", // yumşaq panel fonu
      },
      fontFamily: {
        serif: ["var(--font-serif)", "system-ui", "sans-serif"], // başlıqlar (Manrope)
        sans: ["var(--font-sans)", "system-ui", "sans-serif"], // mətn (Inter)
        slogan: ["var(--font-slogan)", "Georgia", "serif"], // slogan (Lora italik)
      },
      borderRadius: {
        yurd: "1rem",
      },
      // Kölgələr də temaya bağlıdır — qaranlıqda açıq kölgə görünmür
      boxShadow: {
        yurd: "var(--s-yurd)",
        lift: "var(--s-lift)",
        pill: "var(--s-pill)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};
export default config;
