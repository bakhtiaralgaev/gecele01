import type { Config } from "tailwindcss";

// Gecələ — Airbnb-səviyyə minimal dizayn tokenləri
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        qum: "#FFFFFF", // fon — təmiz ağ
        gece: "#222222", // əsas mətn
        nar: {
          DEFAULT: "#E31C5F", // CTA aksenti
          dark: "#C1134E",
          soft: "#FFE9F0",
        },
        mese: {
          DEFAULT: "#1F4D3A", // yalnız etibar/escrow elementləri
          dark: "#153627",
          soft: "#E8F2ED",
        },
        xezer: {
          DEFAULT: "#2E7E8C",
          soft: "#E2F0F3",
        },
        kraft: "#F7F7F7", // yumşaq boz panel fonu
      },
      fontFamily: {
        serif: ["var(--font-serif)", "system-ui", "sans-serif"], // başlıqlar (Manrope)
        sans: ["var(--font-sans)", "system-ui", "sans-serif"], // mətn (Inter)
        slogan: ["var(--font-slogan)", "Georgia", "serif"], // slogan (Lora italik)
      },
      borderRadius: {
        yurd: "1rem",
      },
      boxShadow: {
        yurd: "0 1px 2px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)",
        lift: "0 6px 16px rgba(0,0,0,0.12)",
        pill: "0 3px 12px rgba(0,0,0,0.10)",
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
