import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "İstifadə şərtləri — Gecələ",
  description:
    "Gecələ platformasından istifadə qaydaları, tərəflərin öhdəlikləri, komissiya və Beh Qoruması şərtləri.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 sm:px-6 py-12">
      <h1 className="font-serif font-bold text-3xl text-gece tracking-tight">
        İstifadə şərtləri
      </h1>
      <p className="mt-2 text-sm text-gece/50">Son yenilənmə: 6 iyul 2026</p>

      <div className="mt-8 space-y-7 text-[15px] leading-relaxed text-gece/80">
        <section>
          <h2 className="font-semibold text-lg text-gece">1. Ümumi müddəalar</h2>
          <p className="mt-2">
            Gecələ (bundan sonra “Platforma”) Azərbaycanda istirahət evlərinin
            onlayn rezervasiyası üçün vasitəçi xidmətdir. Platforma ev sahibi
            (icarəyə verən) ilə qonaq (icarəçi) arasında əlaqəni təmin edir,
            özü daşınmaz əmlakın sahibi və ya icarəyə verəni deyil. Saytdan
            istifadə etməklə bu şərtləri qəbul etmiş olursunuz.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-lg text-gece">2. Rezervasiya və ödəniş</h2>
          <p className="mt-2">
            Qonaq rezervasiya zamanı ümumi məbləğin bir hissəsini (beh) onlayn
            ödəyir. Beh <b>Beh Qoruması</b> çərçivəsində Platformada saxlanılır;
            qalıq məbləğ girişdə ev sahibinə ödənilir. Platforma xidmət haqqı
            tutur; komissiya yalnız uğurlu rezervasiyadan hesablanır.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-lg text-gece">3. Beh Qoruması</h2>
          <p className="mt-2">
            Ödənilmiş beh evə giriş baş tutana qədər Platformada saxlanılır. Ev
            elanda göstərilən təsvirə əsaslı şəkildə uyğun gəlmirsə və ya ev
            sahibi rezervasiyanı təsdiqləmirsə, beh qonağa tam qaytarılır.
            Mübahisələr Platforma tərəfindən yoxlanılır.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-lg text-gece">4. Ev sahibinin öhdəlikləri</h2>
          <p className="mt-2">
            Ev sahibi elandakı məlumatların (foto, qiymət, imkanlar, ünvan)
            doğruluğuna cavabdehdir. Yanlış və ya aldadıcı məlumat verən elanlar
            moderasiyadan keçirilmir və ya silinir.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-lg text-gece">5. Qadağan olunan davranış</h2>
          <p className="mt-2">
            Saxta rezervasiya, ödəniş fırıldağı, başqasının adından çıxış və
            platformadankənar ödənişə yönləndirmə qadağandır və hesabın
            bağlanması ilə nəticələnə bilər.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-lg text-gece">6. Məsuliyyətin məhdudlaşdırılması</h2>
          <p className="mt-2">
            Platforma vasitəçi qismində çıxış edir və tərəflər arasındakı
            icarə münasibətinin birbaşa tərəfi deyil. Bununla belə, Beh Qoruması
            çərçivəsində qonağın ödədiyi beh yuxarıdakı şərtlərlə qorunur.
          </p>
        </section>
        <p className="text-sm text-gece/50">
          Ləğvetmə və qaytarma qaydaları üçün{" "}
          <a href="/leghvetme" className="underline font-semibold text-gece">
            Ləğvetmə şərtləri
          </a>{" "}
          səhifəsinə baxın.
        </p>
      </div>
    </main>
  );
}
