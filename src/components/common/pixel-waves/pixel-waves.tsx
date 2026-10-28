"use client";

/**
 * Page backdrop: the theme's two-colour gradient with that theme's own animated
 * effect on top (snow for Winter, gold dust for the Tournament hall, stars for
 * Winter night, and so on; see `lib/backdrop-effects.ts` and each theme's
 * `effect` in `lib/site-themes.ts`). Continuous per-frame motion, so it runs on
 * the shared ticker at a 30fps budget — no CSS keyframes.
 *
 * Colours are the resolved `--backdrop-wave-*` tokens; the effect is re-read on
 * a site-theme change. (Component keeps its old name so the layout import is
 * untouched.)
 */

import { useEffect, useRef } from "react";

import { subscribeToTicker } from "@/lib/animation/ticker";
import { resolveColor, type Rgb } from "@/lib/css-color";
import { EFFECTS, type Effect } from "@/lib/backdrop-effects";
import { SITE_THEMES, type SiteThemeId } from "@/lib/site-themes";

const FRAME_BUDGET = 1000 / 30;

const css = (color: Rgb): string => `rgb(${color[0]} ${color[1]} ${color[2]})`;

export const PixelWaves = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !context) return;

    let top = "";
    let bottom = "";
    let effect: Effect = EFFECTS.snow;
    const readTheme = (): void => {
      top = css(resolveColor("--backdrop-wave-low", [0, 58, 158]));
      bottom = css(resolveColor("--backdrop-wave-high", [15, 93, 223]));
      // The default (Winter) theme sets no `data-theme`.
      const id = (document.documentElement.dataset.theme ?? "blue") as SiteThemeId;
      effect = EFFECTS[(SITE_THEMES[id] ?? SITE_THEMES.blue).effect];
    };

    const draw = (seconds: number): void => {
      const { width, height } = canvas;
      const gradient = context.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, top);
      gradient.addColorStop(1, bottom);
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
      effect(context, width, height, seconds);
    };

    const resize = (): void => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      draw(performance.now() * 0.001);
    };

    readTheme();
    resize();
    window.addEventListener("resize", resize, { passive: true });

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onTheme = (): void => {
      readTheme();
      draw(reduced ? 0 : performance.now() * 0.001);
    };
    window.addEventListener("checkmate:theme", onTheme);

    // Reduced motion: one settled frame, no ticker.
    const unsubscribe = reduced ? null : subscribeToTicker((time) => draw(time * 0.001), () => FRAME_BUDGET);

    return () => {
      unsubscribe?.();
      window.removeEventListener("resize", resize);
      window.removeEventListener("checkmate:theme", onTheme);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="fixed inset-0 -z-10 size-full" />;
};
