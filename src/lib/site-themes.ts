/**
 * The site's colour themes, chosen in Settings. "blue" (shown as the Winter theme: icy
 * blue with falling snow) is the default: it sets nothing, so the tokens in `globals.css` apply. Every
 * other theme overrides those tokens on `<html>` (the same variables the whole
 * site already reads), so no component needs to know which theme is active.
 *
 * A theme changes colours only: fonts, layout and the pixel-wave background
 * stay as they are (the waves take the theme's two background shades).
 *
 * The values are literals because they are the themes' data; they are applied
 * by `applySiteTheme` and, before first paint, by the inline script in the root
 * layout (which is built from this same table).
 */

import type { EffectId } from "@/lib/backdrop-effects";
import type { ThemeId } from "@/lib/chess/storage";
import { useChessSettings } from "@/lib/scene/chess-settings";

export type SiteThemeId = "blue" | "spring" | "summer" | "autumn" | "space";
export const SITE_THEME_IDS: SiteThemeId[] = ["blue", "spring", "summer", "autumn", "space"];

export interface SiteTheme {
  label: string;
  /** The animated backdrop layer this theme gets. */
  effect: EffectId;
  /** The 3D board look that goes with this theme. */
  board: ThemeId;
  /** CSS custom properties set on `<html>`; empty for the default theme. */
  vars: Record<string, string>;
  /** Background of the home page's 3D scene. */
  stage: string;
  /** Colours for the Settings card. */
  preview: { bg: string; ink: string; accent: string };
}

export const SITE_THEMES: Record<SiteThemeId, SiteTheme> = {
  blue: { label: "Winter theme", effect: "snow", board: "ice", vars: {}, stage: "#071d4d", preview: { bg: "#1f4585", ink: "#ffffff", accent: "#b9dcf7" } },
  spring: {
    board: "blossom",
    effect: "petals",
    stage: "#1f5a45",
    label: "Spring",
    preview: { bg: "#4aa38a", ink: "#ffffff", accent: "#ffd6e3" },
    vars: {
      "--ice-top": "#fff3f7",
      "--ice-bottom": "#f6b9cf",
      "--ice-ink": "#14392c",
      "--ice-glow": "inset 0 1px 0 rgb(255 255 255 / 0.95), inset 0 -2px 6px rgb(230 110 150 / 0.38), 0 0 16px rgb(255 185 210 / 0.45)",
      "--background": "#2f7a62",
      "--foreground": "#ffffff",
      "--surface-invert": "#ffe3ec",
      "--ink": "#14392c",
      "--rule": "rgba(255,255,255,0.28)",
      "--veil": "rgba(255,255,255,0.14)",
      "--menu-ground": "#1f5a45",
      "--backdrop-wave-low": "#17554f",
      "--backdrop-wave-high": "#5b9a5c",
    },
  },
  summer: {
    board: "sea",
    effect: "sun",
    stage: "#0f4a7a",
    label: "Summer",
    preview: { bg: "#1f7fb0", ink: "#ffffff", accent: "#ffd84a" },
    vars: {
      "--ice-top": "#fff8dc",
      "--ice-bottom": "#ffd066",
      "--ice-ink": "#0b3b4f",
      "--ice-glow": "inset 0 1px 0 rgb(255 255 255 / 0.95), inset 0 -2px 6px rgb(230 160 40 / 0.38), 0 0 16px rgb(255 215 120 / 0.45)",
      "--background": "#145a96",
      "--foreground": "#ffffff",
      "--surface-invert": "#fff3c4",
      "--ink": "#0b3b4f",
      "--rule": "rgba(255,255,255,0.28)",
      "--veil": "rgba(255,255,255,0.13)",
      "--menu-ground": "#0f4a7a",
      "--backdrop-wave-low": "#14558f",
      "--backdrop-wave-high": "#2a9aa8",
    },
  },
  autumn: {
    board: "leaf",
    effect: "leaves",
    stage: "#2a1208",
    label: "Autumn",
    preview: { bg: "#7a3a14", ink: "#fff4e4", accent: "#ffb347" },
    vars: {
      "--ice-top": "#ffeccb",
      "--ice-bottom": "#f1a24d",
      "--ice-ink": "#3b1d0e",
      "--ice-glow": "inset 0 1px 0 rgb(255 255 255 / 0.95), inset 0 -2px 6px rgb(200 110 30 / 0.38), 0 0 16px rgb(255 175 90 / 0.45)",
      "--background": "#3b1d0e",
      "--foreground": "#fff4e4",
      "--surface-invert": "#ffd9a0",
      "--ink": "#3b1d0e",
      "--rule": "rgba(255,244,228,0.22)",
      "--veil": "rgba(255,244,228,0.1)",
      "--menu-ground": "#2a1208",
      "--backdrop-wave-low": "#33190c",
      "--backdrop-wave-high": "#9a4a1a",
    },
  },
  space: {
    board: "cosmos",
    effect: "space",
    stage: "#02030c",
    label: "Space",
    preview: { bg: "#0b0a2a", ink: "#eaf0ff", accent: "#9db4ff" },
    vars: {
      "--ice-top": "#eaeeff",
      "--ice-bottom": "#8f8af0",
      "--ice-ink": "#0a0f2e",
      "--ice-glow": "inset 0 1px 0 rgb(255 255 255 / 0.95), inset 0 -2px 6px rgb(110 100 230 / 0.38), 0 0 16px rgb(150 140 255 / 0.45)",
      "--background": "#06051a",
      "--foreground": "#eaf0ff",
      "--surface-invert": "#b8c7ff",
      "--ink": "#0a0f2e",
      "--rule": "rgba(234,240,255,0.26)",
      "--veil": "rgba(234,240,255,0.12)",
      "--menu-ground": "#03020f",
      "--backdrop-wave-low": "#03020c",
      "--backdrop-wave-high": "#1a1250",
    },
  },
};

const ALL_VARS = [...new Set(Object.values(SITE_THEMES).flatMap((theme) => Object.keys(theme.vars)))];

/** Put a theme on the page (client only). */
export const applySiteTheme = (id: SiteThemeId): void => {
  const root = document.documentElement;
  ALL_VARS.forEach((name) => root.style.removeProperty(name));
  const theme = SITE_THEMES[id];
  useChessSettings.getState().setStage("color", theme.stage);
  if (!theme || id === "blue") {
    delete root.dataset.theme;
  } else {
    Object.entries(theme.vars).forEach(([name, value]) => root.style.setProperty(name, value));
    root.dataset.theme = id;
  }
  window.dispatchEvent(new Event("checkmate:theme"));
};

/** Runs before first paint so a saved theme does not flash the default blue. */
export const themeBootScript = `(function(){try{var T=${JSON.stringify(
  Object.fromEntries(Object.entries(SITE_THEMES).map(([id, theme]) => [id, theme.vars])),
)};var s=JSON.parse(localStorage.getItem("checkmate:settings")||"{}").site;var v=T[s];if(!v||s==="blue")return;var r=document.documentElement;for(var k in v)r.style.setProperty(k,v[k]);r.dataset.theme=s}catch(e){}})();`;
