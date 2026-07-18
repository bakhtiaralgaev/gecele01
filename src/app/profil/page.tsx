"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { useToast } from "@/components/Toast";

interface Me {
  id: string;
  role: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  provider?: string;
}

export default function ProfilePage() {
  const { toast } = useToast();
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setMe(d.user ?? null);
        if (d.user) setName(d.user.name);
      })
      .catch(() => setMe(null));
  }, []);

  const save = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2 || saving) return;
    setSaving(true);
    try {
      const r = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const d = await r.json();
      if (!r.ok) {
        toast({ type: "error", message: d.error ?? "Yadda saxlanmadı" });
        return;
      }
      setMe(d.user);
      toast({ type: "success", message: "Profil yeniləndi" });
    } catch {
      toast({ type: "error", message: "Şəbəkə xətası — yenidən cəhd edin" });
    } finally {
      setSaving(false);
    }
  };

  if (me === undefined) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="h-24 bg-kraft rounded-2xl animate-pulse" />
      </main>
    );
  }

  if (me === null) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-serif font-bold text-2xl text-gece">Profil</h1>
        <p className="mt-2 text-gece/60">Profilinizi görmək üçün daxil olun.</p>
        <Link
          href="/giris"
          className="mt-5 inline-block bg-nar text-white font-semibold px-6 py-3 rounded-xl"
        >
          Daxil ol
        </Link>
      </main>
    );
  }

  const dirty = name.trim() !== me.name && name.trim().length >= 2;

  const links = [
    {
      href: "/rezervlerim",
      label: "Rezervlərim",
      desc: "Rezervasiyalarınız və kodlar",
    },
    { href: "/secilmisler", label: "Seçilmişlər", desc: "Bəyəndiyiniz evlər" },
    { href: "/mesajlar", label: "Mesajlar", desc: "Ev sahibləri ilə yazışma" },
  ];
  if (me.role === "host") {
    links.push({
      href: "/ev-sahibi",
      label: "Ev sahibi paneli",
      desc: "Elanlarınızı idarə edin",
    });
  }

  return (
    <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
      <h1 className="font-serif font-bold text-2xl text-gece">Profil</h1>

      <section className="mt-6 flex items-center gap-4">
        <Avatar name={me.name} size={72} className="text-2xl" />
        <div className="min-w-0">
          <div className="font-semibold text-lg text-gece truncate">
            {me.name}
          </div>
          <div className="text-sm text-gece/50">
            {me.role === "host" ? "Ev sahibi hesabı" : "Kirayəçi hesabı"}
          </div>
          {me.phone ? (
            <div className="text-sm text-gece/50">{me.phone}</div>
          ) : null}
          {me.email ? (
            <div className="text-sm text-gece/50">{me.email}</div>
          ) : null}
        </div>
      </section>

      <section className="mt-7">
        <label
          htmlFor="profil-ad"
          className="block text-sm font-semibold text-gece mb-1.5"
        >
          Ad
        </label>
        <div className="flex gap-2">
          <input
            id="profil-ad"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            className="flex-1 rounded-xl border border-gece/20 px-3 py-2.5 text-sm outline-none focus:border-gece"
          />
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="shrink-0 bg-gece text-qum font-semibold px-5 py-2.5 rounded-xl disabled:opacity-40 transition-colors"
          >
            {saving ? "..." : "Yadda saxla"}
          </button>
        </div>
      </section>

      <section className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="border border-gece/15 rounded-xl p-4 hover:border-gece transition-colors"
          >
            <div className="font-semibold text-gece">{l.label}</div>
            <div className="text-sm text-gece/55 mt-0.5">{l.desc}</div>
          </Link>
        ))}
      </section>
    </main>
  );
}
