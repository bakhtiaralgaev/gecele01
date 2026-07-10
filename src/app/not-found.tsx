import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Səhifə tapılmadı — Gecələ",
};

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center">
      <div className="font-serif font-extrabold text-gece text-7xl tracking-tight leading-none">
        404<span className="text-nar">.</span>
      </div>
      <h1 className="mt-6 font-serif font-bold text-xl text-gece">
        Bu ünvanda ev yoxdur
      </h1>
      <p className="mt-2 text-gece/60 leading-relaxed">
        Axtardığınız səhifə köçürülüb və ya heç vaxt olmayıb. Narahat olmayın —
        Azərbaycanın ən gözəl guşələri sizi gözləyir.
      </p>
      <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/"
          className="bg-nar hover:bg-nar-dark text-white font-semibold px-7 py-3.5 rounded-full"
        >
          Ana səhifəyə qayıt
        </Link>
        <Link
          href="/rezervlerim"
          className="border border-gece/20 hover:border-gece text-gece font-semibold px-7 py-3.5 rounded-full"
        >
          Rezervlərim
        </Link>
      </div>
    </main>
  );
}
