import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Manrope, Lora } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import IntroSplash from "@/components/IntroSplash";

// Hər iki şrift Azərbaycan əlifbasını (ə, ı, ğ, ş, ç, ö, ü) tam dəstəkləyir.
const display = Manrope({
  subsets: ["latin", "latin-ext"],
  variable: "--font-serif",
});

const body = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
});

// Slogan üçün elegant italik serif — Lora, Azərbaycan "ə" hərfini əsl dəstəkləyir
const slogan = Lora({
  subsets: ["latin", "latin-ext"],
  style: "italic",
  weight: ["500"],
  variable: "--font-slogan",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://gecele.az"
  ),
  title: "Gecələ — Azərbaycanda istirahət evləri. Beh qorunur.",
  description:
    "Qəbələdən Nabrana bağ evləri, villalar və dağ evləri. Onlayn rezervasiya, qorunan beh, təsdiqlənmiş rəylər. Gecələ — istirahətin yeni ünvanı.",
  openGraph: {
    title: "Gecələ — Azərbaycanda istirahət evləri",
    description:
      "Qəbələdən Nabrana bağ evləri, villalar və dağ evləri. Qorunan beh ilə onlayn rezervasiya.",
    locale: "az_AZ",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    title: "Gecələ",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  return (
    <html lang="az" className={`${display.variable} ${body.variable} ${slogan.variable}`}>
      <body className="min-h-screen flex flex-col">
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="ga4" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`}
            </Script>
          </>
        )}
        {pixelId && (
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`}
          </Script>
        )}
        <IntroSplash />
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
