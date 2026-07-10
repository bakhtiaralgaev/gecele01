"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center">
      <div className="font-serif font-extrabold text-gece text-5xl tracking-tight leading-none">
        Nəsə səhv getdi<span className="text-nar">.</span>
      </div>
      <p className="mt-5 text-gece/60 leading-relaxed">
        Gözlənilməz xəta baş verdi. Narahat olmayın — məlumatlarınız
        təhlükəsizdir. Yenidən cəhd edin və ya bir azdan qayıdın.
      </p>
      <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={reset}
          className="bg-nar hover:bg-nar-dark text-white font-semibold px-7 py-3.5 rounded-full"
        >
          Yenidən cəhd et
        </button>
        <a
          href="/"
          className="border border-gece/20 hover:border-gece text-gece font-semibold px-7 py-3.5 rounded-full"
        >
          Ana səhifə
        </a>
      </div>
    </main>
  );
}
