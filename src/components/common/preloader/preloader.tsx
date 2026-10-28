"use client";

/**
 * Load curtain: a plain brand-blue field that fades out (with a soft blur) once
 * the home page's chess scene reports in. No pixel wave, no counter.
 *
 * The page is rendered opaque from the first paint (fading `<main>` in would
 * leave content at `opacity: 0` in the server render — see [[seo-metadata]]);
 * the blur is a `backdrop-filter` on a fixed overlay, never a `filter` on an
 * ancestor, which would break `position: fixed` descendants.
 *
 * 📖 Docs: obsidian/frontend/components/common.md
 */

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { subscribeToTicker } from "@/lib/animation/ticker";
import { resolveColor } from "@/lib/css-color";
import { isRobotView } from "@/components/common/robot-view";
import { usePreloader } from "@/lib/preloader";

/** Shortest the curtain is ever on screen, seconds. */
const MIN_DURATION = 0.8;
/** Seconds spent fading out. */
const CLEAR_DURATION = 0.7;
/** Peak blur behind the curtain, px. */
const BLUR = 26;

export const Preloader = () => {
  const curtainRef = useRef<HTMLDivElement>(null);
  const blurRef = useRef<HTMLDivElement>(null);
  const done = usePreloader((state) => state.done);
  const [mounted, setMounted] = useState(true);
  // Only the home page has a scene to wait for.
  const skip = usePathname() !== "/";
  // The robot form (D-016) has no curtain: `globals.css` hides the served copy
  // before paint; this finishes the store so every reveal is released.
  useLayoutEffect(() => {
    // Coming back with the browser's back button is not a first visit: no curtain, and a restored page must never wait on one.
    const back = performance.getEntriesByType("navigation").some((entry) => (entry as PerformanceNavigationTiming).type === "back_forward");
    if (skip || back || isRobotView()) usePreloader.getState().finish();
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) usePreloader.getState().finish();
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [skip]);

  useEffect(() => {
    if (skip || usePreloader.getState().done) return;
    const curtain = curtainRef.current;
    if (!curtain) return;

    const finish = usePreloader.getState().finish;

    // An accessibility promise: no curtain at all, nothing to sit through.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      setMounted(false);
      return;
    }

    curtain.style.background = `rgb(${resolveColor("--backdrop-wave-low", [0, 58, 158]).join(",")})`;

    let elapsed = 0;
    let clearing = 0;
    let lastTime = performance.now();

    const unsubscribe = subscribeToTicker((time) => {
      const delta = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      elapsed += delta;

      if (elapsed < MIN_DURATION) return;

      if (!clearing) usePreloader.getState().beginLift();

      clearing += delta;
      const cleared = Math.min(1, clearing / CLEAR_DURATION);
      const eased = 1 - Math.pow(1 - cleared, 3);

      curtain.style.opacity = String(1 - eased);
      if (blurRef.current) {
        blurRef.current.style.backdropFilter = `blur(${(1 - eased) * BLUR}px)`;
        blurRef.current.style.opacity = String(1 - eased);
      }

      if (cleared < 1) return;
      unsubscribe();
      finish();
      setMounted(false);
    }, () => 0);

    return unsubscribe;
  }, [skip]);

  if (skip || !mounted || done) return null;

  return (
    <div
      aria-hidden="true"
      data-preloader=""
      className="pointer-events-none fixed inset-0 z-40"
    >
      <div ref={blurRef} className="absolute inset-0" />
      <div ref={curtainRef} className="absolute inset-0" />
    </div>
  );
};
