// Gecə/gündüz rejimi. Sinif `<html>` elementinə qoyulur (`darkMode: "class"`),
// rənglər isə CSS dəyişənlərindən gəlir — ona görə bir sinif dəyişikliyi bütün
// interfeysi çevirir.

export type Theme = "light" | "dark" | "system";

export const THEME_KEY = "gecele_theme";
export const THEME_EVENT = "gecele-theme-change";

export function readTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" || v === "system" ? v : "system";
  } catch {
    return "system";
  }
}

/** "system" seçimini cari cihaz seçiminə görə həll edir. */
export function resolveTheme(t: Theme): "light" | "dark" {
  if (t !== "system") return t;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyTheme(t: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolveTheme(t) === "dark");
}

export function setTheme(t: Theme): void {
  try {
    window.localStorage.setItem(THEME_KEY, t);
  } catch {
    // məxfilik rejimi — yaddaş yoxdur, yalnız cari sessiyada işləyir
  }
  applyTheme(t);
  window.dispatchEvent(new Event(THEME_EVENT));
}

/**
 * `<head>`-ə qoyulan inline skript: səhifə boyanmazdan ƏVVƏL sinfi təyin edir.
 * Bu olmasa qaranlıq rejimdə istifadəçi bir anlıq ağ ekran görür (FOUC).
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');var d=t==='dark'||((t===null||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark')}}catch(e){}})();`;
