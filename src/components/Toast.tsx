"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { IconAlert, IconCheck, IconInfo } from "@/components/Icons";
import { playSound, primeSound, type SoundName } from "@/lib/sound";

export type ToastType = "success" | "info" | "error";

interface ToastOptions {
  type: ToastType;
  message: string;
  sound?: SoundName | false;
}

interface ToastItem extends ToastOptions {
  id: number;
  leaving: boolean;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const defaultSounds: Record<ToastType, SoundName> = {
  success: "success",
  info: "pop",
  error: "error",
};

function ToastMessage({ item, dismiss }: { item: ToastItem; dismiss: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(dismiss, 3500);
    return () => window.clearTimeout(timer);
  }, [dismiss]);

  const styles: Record<ToastType, { accent: string; Icon: typeof IconCheck }> = {
    success: { accent: "text-mese bg-mese-soft", Icon: IconCheck },
    info: { accent: "text-gece bg-kraft", Icon: IconInfo },
    error: { accent: "text-nar bg-nar-soft", Icon: IconAlert },
  };
  const { accent, Icon } = styles[item.type];

  return (
    <button
      type="button"
      onClick={dismiss}
      className={`gecele-toast mx-auto sm:ml-auto w-full max-w-sm text-left bg-white border border-gece/10 shadow-lift rounded-2xl px-3.5 py-3 flex items-center gap-3 transition-opacity ${
        item.leaving ? "gecele-toast-leaving" : ""
      }`}
      aria-label="Bildirişi bağla"
    >
      <span className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${accent}`}>
        <Icon className="w-4 h-4" />
      </span>
      <span className="text-sm font-semibold leading-snug text-gece">{item.message}</span>
    </button>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    const prepare = () => primeSound();
    window.addEventListener("pointerdown", prepare, { once: true, passive: true });
    window.addEventListener("keydown", prepare, { once: true });
    return () => {
      window.removeEventListener("pointerdown", prepare);
      window.removeEventListener("keydown", prepare);
    };
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((current) =>
      current.map((item) => (item.id === id ? { ...item, leaving: true } : item))
    );
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 180);
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    // toast() həmişə istifadəçi jesti (onClick) daxilində çağırılır — audio-nu
    // məhz burada açırıq ki, ilk toast-da səs etibarlı işləsin (bəzi mühitlərdə
    // ilk klik pointerdown yaratmır və qlobal primer işə düşmür).
    primeSound();
    const id = nextId.current++;
    setToasts((current) => [...current, { ...options, id, leaving: false }].slice(-4));
    const sound = options.sound === undefined ? defaultSounds[options.type] : options.sound;
    if (sound) playSound(sound);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed z-[80] top-[max(1rem,env(safe-area-inset-top))] right-4 left-4 sm:left-auto sm:w-96 space-y-2 pointer-events-none"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((item) => (
          <div key={item.id} className="pointer-events-auto">
            <ToastMessage item={item} dismiss={() => dismiss(item.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast ToastProvider daxilində istifadə edilməlidir");
  }
  return context;
}
