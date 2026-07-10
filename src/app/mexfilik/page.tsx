import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Məxfilik siyasəti — Gecələ",
  description:
    "Gecələ şəxsi məlumatlarınızı necə toplayır, istifadə edir və qoruyur.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 sm:px-6 py-12">
      <h1 className="font-serif font-bold text-3xl text-gece tracking-tight">
        Məxfilik siyasəti
      </h1>
      <p className="mt-2 text-sm text-gece/50">Son yenilənmə: 6 iyul 2026</p>

      <div className="mt-8 space-y-7 text-[15px] leading-relaxed text-gece/80">
        <section>
          <h2 className="font-semibold text-lg text-gece">1. Topladığımız məlumatlar</h2>
          <p className="mt-2">
            Hesab yaradarkən və rezervasiya edərkən ad, telefon nömrəsi, e-poçt
            (əgər verilibsə) və rezervasiya təfərrüatlarını toplayırıq. Ödəniş
            kartı məlumatları serverlərimizdə saxlanılmır — ödənişlər lisenziyalı
            ödəniş provayderi vasitəsilə emal olunur.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-lg text-gece">2. Məlumatlardan istifadə</h2>
          <p className="mt-2">
            Məlumatlar yalnız rezervasiyanın icrası, tərəflər arasında əlaqə,
            təhlükəsizlik və xidmətin təkmilləşdirilməsi üçün istifadə olunur.
            Rezervasiya baş tutduqda ev sahibi ilə qonağın əlaqə məlumatları
            qarşılıqlı paylaşıla bilər.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-lg text-gece">3. Paylaşım</h2>
          <p className="mt-2">
            Məlumatlarınızı üçüncü tərəflərə satmırıq. Yalnız xidmətin işləməsi
            üçün zəruri provayderlərlə (ödəniş, SMS/e-poçt bildirişi, hostinq)
            paylaşırıq.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-lg text-gece">4. Kukilər</h2>
          <p className="mt-2">
            Sessiyanın davam etdirilməsi üçün zəruri kukilərdən istifadə edirik.
            Analitika kukiləri xidmətin təkmilləşdirilməsi məqsədilə anonim
            şəkildə tətbiq oluna bilər.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-lg text-gece">5. Hüquqlarınız</h2>
          <p className="mt-2">
            İstənilən vaxt hesabınızın məlumatlarının düzəldilməsini və ya
            silinməsini tələb edə bilərsiniz. Bunun üçün{" "}
            <a href="/elaqe" className="underline font-semibold text-gece">
              Əlaqə
            </a>{" "}
            səhifəsindən bizə yazın.
          </p>
        </section>
      </div>
    </main>
  );
}
