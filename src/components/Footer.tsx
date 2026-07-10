import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-gece/10 bg-kraft">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8 text-sm">
        <div>
          <span className="font-serif font-extrabold text-nar text-lg">
            gecələ
          </span>
          <p className="mt-2 text-gece/60 leading-relaxed">
            Azərbaycanda istirahət evlərinin onlayn rezervasiya platforması.
            Qəbələdən Nabrana — beh qoruması ilə.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-gece">Qonaqlar üçün</h4>
          <ul className="mt-2 space-y-1.5 text-gece/60">
            <li>
              <Link href="/qaydalar" className="hover:text-gece">
                Beh Qoruması necə işləyir
              </Link>
            </li>
            <li>
              <Link href="/leghvetme" className="hover:text-gece">
                Ləğvetmə şərtləri
              </Link>
            </li>
            <li>
              <Link href="/elaqe" className="hover:text-gece">
                Dəstək
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-gece">Ev sahibləri üçün</h4>
          <ul className="mt-2 space-y-1.5 text-gece/60">
            <li>
              <Link href="/ev-sahibi" className="hover:text-gece">
                Evini yerləşdir — pulsuz
              </Link>
            </li>
            <li>
              <Link href="/qaydalar" className="hover:text-gece">
                Komissiya yalnız rezervasiyadan
              </Link>
            </li>
            <li>
              <Link href="/qaydalar" className="hover:text-gece">
                Ödənişlərin təhlükəsizliyi
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gece/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gece/50">
          <span>© 2026 Gecələ · Bütün hüquqlar qorunur.</span>
          <div className="flex items-center gap-4">
            <Link href="/qaydalar" className="hover:text-gece">
              İstifadə şərtləri
            </Link>
            <Link href="/mexfilik" className="hover:text-gece">
              Məxfilik
            </Link>
            <Link href="/elaqe" className="hover:text-gece">
              Əlaqə
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
