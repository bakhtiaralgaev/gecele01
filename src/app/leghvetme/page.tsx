import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ləğvetmə və qaytarma şərtləri — Gecələ",
  description:
    "Rezervasiyanın ləğvi, beh qaytarılması qaydaları və Beh Qoruması şərtləri.",
};

export default function CancellationPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 sm:px-6 py-12">
      <h1 className="font-serif font-bold text-3xl text-gece tracking-tight">
        Ləğvetmə və qaytarma
      </h1>
      <p className="mt-2 text-sm text-gece/50">Son yenilənmə: 6 iyul 2026</p>

      <div className="mt-8 space-y-7 text-[15px] leading-relaxed text-gece/80">
        <section>
          <h2 className="font-semibold text-lg text-gece">Qonaq üçün ləğvetmə</h2>
          <ul className="mt-2 space-y-2 list-disc pl-5">
            <li>
              Girişə <b>48 saatdan çox</b> qalıbsa rezervasiyanı onlayn ləğv edə
              bilərsiniz — ödənilmiş beh tam qaytarılır.
            </li>
            <li>
              Girişə <b>48 saatdan az</b> qalıbsa onlayn ləğv mümkün deyil; belə
              hallarda ev sahibi və ya dəstək xidməti ilə əlaqə saxlayın.
            </li>
            <li>
              Ödənişi tamamlanmamış (pending) rezervlər 15 dəqiqədən sonra
              avtomatik olaraq ləğv olunur və tarixlər boşaldılır.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="font-semibold text-lg text-gece">Beh Qoruması ilə qaytarma</h2>
          <p className="mt-2">
            Ev elanda göstərilən təsvirə uyğun gəlmirsə, ev sahibi rezervasiyanı
            təsdiqləmirsə və ya giriş baş tutmursa, ödədiyiniz beh Beh Qoruması
            çərçivəsində <b>tam geri qaytarılır</b>. Qaytarma ödəniş kartınıza
            eyni kanal üzərindən icra olunur.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-lg text-gece">Ev sahibi üçün</h2>
          <p className="mt-2">
            Təsdiqlənmiş rezervasiyanı əsassız ləğv edən ev sahibinin reytinqi
            aşağı düşür və təkrar hallarda elanları dayandırıla bilər.
          </p>
        </section>
        <p className="text-sm text-gece/50">
          Sualınız var?{" "}
          <a href="/elaqe" className="underline font-semibold text-gece">
            Dəstək xidməti
          </a>{" "}
          ilə əlaqə saxlayın.
        </p>
      </div>
    </main>
  );
}
