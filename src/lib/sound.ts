export type SoundName = "pop" | "success" | "like" | "error" | "tick";

const MUTED_KEY = "gecele_muted";

let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let hasInteracted = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  const AudioContextConstructor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextConstructor) return null;

  if (!audioContext) {
    try {
      const context = new AudioContextConstructor();
      const gain = context.createGain();
      gain.gain.value = 0.15;
      gain.connect(context.destination);
      audioContext = context;
      masterGain = gain;
    } catch {
      return null;
    }
  }

  return audioContext;
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTED_KEY) === "true";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MUTED_KEY, String(muted));
  } catch {
    // Məxfilik rejimində yaddaş əlçatan olmaya bilər.
  }
}

/** İlk istifadəçi jestində AudioContext-i oyadır. */
export function primeSound(): void {
  hasInteracted = true;
  const context = getAudioContext();
  if (context?.state === "suspended") {
    void context.resume().catch(() => undefined);
  }
}

interface Tone {
  frequency: number;
  duration: number;
  delay?: number;
  volume?: number;
  wave?: OscillatorType;
}

function playTone(context: AudioContext, tone: Tone): void {
  const start = context.currentTime + (tone.delay ?? 0);
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = tone.wave ?? "sine";
  oscillator.frequency.setValueAtTime(tone.frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(tone.volume ?? 0.12, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);

  oscillator.connect(gain);
  gain.connect(masterGain ?? context.destination);
  oscillator.start(start);
  oscillator.stop(start + tone.duration + 0.02);
}

const SOUND_TONES: Record<SoundName, Tone[]> = {
  pop: [{ frequency: 660, duration: 0.09, volume: 0.055, wave: "sine" }],
  success: [
    { frequency: 523.25, duration: 0.13, volume: 0.075, wave: "sine" },
    { frequency: 659.25, duration: 0.14, delay: 0.1, volume: 0.07, wave: "sine" },
    { frequency: 783.99, duration: 0.18, delay: 0.2, volume: 0.065, wave: "sine" },
  ],
  like: [{ frequency: 440, duration: 0.11, volume: 0.065, wave: "triangle" }],
  error: [
    { frequency: 180, duration: 0.18, volume: 0.055, wave: "triangle" },
    { frequency: 150, duration: 0.16, delay: 0.1, volume: 0.045, wave: "triangle" },
  ],
  tick: [{ frequency: 900, duration: 0.045, volume: 0.025, wave: "sine" }],
};

/** Xarici faylsız, yumşaq Web Audio bildiriş səsləri. */
export function playSound(name: SoundName): void {
  if (isMuted() || !hasInteracted) return;

  const context = getAudioContext();
  if (!context) return;

  if (context.state === "suspended") {
    void context.resume().catch(() => undefined);
  }

  SOUND_TONES[name].forEach((tone) => playTone(context, tone));
}
