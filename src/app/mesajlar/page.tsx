"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Convo {
  bookingId: string;
  title: string;
  photo: string;
  otherName: string;
  role: "guest" | "host";
  lastBody: string | null;
  lastAt: string | null;
  unread: number;
}
interface Msg {
  id: string;
  sender: string;
  body: string;
  mine: boolean;
  createdAt: string;
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("az", { hour: "2-digit", minute: "2-digit" });
}

export default function MessagesPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [convos, setConvos] = useState<Convo[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [thread, setThread] = useState<Msg[]>([]);
  const [otherName, setOtherName] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadInbox = useCallback(async () => {
    const r = await fetch("/api/messages");
    if (r.status === 401) {
      setAuthed(false);
      return;
    }
    setAuthed(true);
    const d = await r.json();
    setConvos(d.conversations ?? []);
  }, []);

  const loadThread = useCallback(async (bookingId: string) => {
    const r = await fetch(`/api/bookings/${bookingId}/messages`);
    if (!r.ok) return;
    const d = await r.json();
    setThread(d.messages ?? []);
    setOtherName(d.otherName ?? "");
  }, []);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  // Aktiv söhbət və inbox-u hər 5 saniyədən bir təzələ (sadə polling)
  useEffect(() => {
    if (!authed) return;
    const t = setInterval(() => {
      loadInbox();
      if (active) loadThread(active);
    }, 5000);
    return () => clearInterval(t);
  }, [authed, active, loadInbox, loadThread]);

  useEffect(() => {
    if (active) loadThread(active);
  }, [active, loadThread]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [thread]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !active || sending) return;
    setSending(true);
    try {
      const r = await fetch(`/api/bookings/${active}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (r.ok) {
        const m: Msg = await r.json();
        setThread((t) => [...t, m]);
        setInput("");
        loadInbox();
      }
    } finally {
      setSending(false);
    }
  };

  if (authed === false) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-serif font-bold text-2xl text-gece">Mesajlar</h1>
        <p className="mt-2 text-gece/60">
          Mesajlaşma rezervasiyadan sonra aktivləşir. Söhbətlərinizi görmək üçün
          daxil olun.
        </p>
        <Link
          href="/giris"
          className="mt-5 inline-block bg-nar text-white font-semibold px-6 py-3 rounded-xl"
        >
          Daxil ol
        </Link>
      </main>
    );
  }

  const activeConvo = convos.find((c) => c.bookingId === active);

  return (
    <main className="mx-auto max-w-6xl px-0 sm:px-6">
      <h1 className="font-serif font-bold text-2xl text-gece px-4 sm:px-0 pt-6">
        Mesajlar
      </h1>
      <p className="text-sm text-gece/50 px-4 sm:px-0 mt-1">
        Söhbətlər yalnız rezervasiya edilmiş evlər üçün aktivdir.
      </p>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-[320px_1fr] gap-0 sm:gap-6 border-t border-gece/10">
        {/* Söhbət siyahısı */}
        <aside
          className={`border-r border-gece/10 ${active ? "hidden sm:block" : "block"}`}
        >
          {authed === null && (
            <div className="p-4 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 bg-kraft rounded-xl animate-pulse" />
              ))}
            </div>
          )}
          {authed && convos.length === 0 && (
            <p className="p-6 text-sm text-gece/50">
              Hələ söhbətiniz yoxdur. Ev rezerv edəndə ev sahibi ilə burada
              yazışa bilərsiniz.
            </p>
          )}
          <ul>
            {convos.map((c) => (
              <li key={c.bookingId}>
                <button
                  onClick={() => setActive(c.bookingId)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-kraft transition-colors ${
                    active === c.bookingId ? "bg-kraft" : ""
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.photo}
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-gece truncate">
                        {c.otherName}
                      </span>
                      {c.unread > 0 && (
                        <span className="shrink-0 bg-nar text-white text-[11px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                          {c.unread}
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-gece/50 truncate">
                      {c.title}
                    </span>
                    <span className="block text-xs text-gece/60 truncate mt-0.5">
                      {c.lastBody ?? "Söhbətə başlayın"}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Thread */}
        <section className={`${active ? "flex" : "hidden sm:flex"} flex-col h-[70vh]`}>
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-gece/40 text-sm">
              Söhbət seçin
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gece/10">
                <button
                  onClick={() => setActive(null)}
                  className="sm:hidden text-gece/60"
                  aria-label="Geri"
                >
                  ←
                </button>
                <div>
                  <div className="font-semibold text-gece">{otherName}</div>
                  <div className="text-xs text-gece/50">{activeConvo?.title}</div>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                {thread.length === 0 && (
                  <p className="text-center text-sm text-gece/40 mt-8">
                    İlk mesajı yazın — məsələn giriş vaxtı və ya ünvan sualı.
                  </p>
                )}
                {thread.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-sm ${
                        m.mine
                          ? "bg-nar text-white rounded-br-md"
                          : "bg-kraft text-gece rounded-bl-md"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <span
                        className={`block text-[10px] mt-1 ${
                          m.mine ? "text-white/70" : "text-gece/40"
                        }`}
                      >
                        {timeLabel(m.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <form
                onSubmit={send}
                className="flex items-center gap-2 p-3 border-t border-gece/10"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Mesaj yazın…"
                  maxLength={2000}
                  className="flex-1 rounded-full border border-gece/20 px-4 py-2.5 text-sm outline-none focus:border-gece"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  className="shrink-0 bg-nar text-white font-semibold px-5 py-2.5 rounded-full disabled:opacity-40"
                >
                  Göndər
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
