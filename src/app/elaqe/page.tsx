import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Əlaqə və dəstək — Gecələ",
  description: "Gecələ dəstək xidməti ilə əlaqə — e-poçt, telefon və iş saatları.",
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 sm:px-6 py-12">
      <h1 className="font-serif font-bold text-3xl text-gece tracking-tight">
        Əlaqə və dəstək
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-gece/70">
        Rezervasiya, ödəniş və ya elanla bağlı sualınız var? Komandamız kömək
        etməyə hazırdır.
      </p>

      <div className="mt-8 space-y-4">
        <a
          href="mailto:destek@gecele.az"
          className="flex items-center justify-between border border-gece/15 rounded-2xl px-5 py-4 hover:border-gece/40 transition-colors"
        >
          <div>
            <div className="font-semibold text-gece">E-poçt</div>
            <div className="text-sm text-gece/60">destek@gecele.az</div>
          </div>
          <span className="text-nar font-semibold text-sm">Yaz →</span>
        </a>
        <a
          href="https://wa.me/994000000000"
          className="flex items-center justify-between border border-gece/15 rounded-2xl px-5 py-4 hover:border-gece/40 transition-colors"
        >
          <div>
            <div className="font-semibold text-gece">WhatsApp / Telefon</div>
            <div className="text-sm text-gece/60">+994 00 000 00 00</div>
          </div>
          <span className="text-nar font-semibold text-sm">Zəng et →</span>
        </a>
      </div>

      <p className="mt-6 text-sm text-gece/50">
        İş saatları: hər gün 09:00–21:00 (Bakı vaxtı). Adətən bir neçə saat
        ərzində cavab veririk.
      </p>
    </main>
  );
}
