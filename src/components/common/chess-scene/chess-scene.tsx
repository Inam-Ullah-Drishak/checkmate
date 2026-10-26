"use client";

/**
 * React host for the chess scene.
 *
 * The component owns nothing but the canvas element and the scene's lifetime —
 * all rendering lives in `lib/scene/`, driven by the shared ticker. Keeping the
 * two apart is what lets the settings panel re-render freely without ever
 * touching the render loop.
 *
 * Loaded only through `index.tsx`, which code-splits it behind `ssr: false`, so
 * three.js never lands in the initial bundle.
 *
 * 📖 Docs: obsidian/frontend/chess-scene.md
 */

import { useEffect, useRef, useState } from "react";

import { createChessScene } from "@/lib/scene/chess-scene";
import { disposeChessModel, loadChessModel, type ChessModel } from "@/lib/scene/chess-model";
import { getDeviceProfile } from "@/lib/scene/device";
import { attachPointer } from "@/lib/pointer";
import { usePreloader } from "@/lib/preloader";

export const ChessScene = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const profile = getDeviceProfile();
    const detachPointer = profile.pointer ? attachPointer() : null;

    let cancelled = false;
    let model: ChessModel | null = null;
    let disposeScene: (() => void) | null = null;

    loadChessModel()
      .then((loaded) => {
        // Strict Mode double-mounts in development: the first run's promise can
        // land after its own cleanup, and its model would otherwise leak.
        if (cancelled) {
          disposeChessModel(loaded);
          return;
        }
        model = loaded;
        disposeScene = createChessScene(canvas, loaded, profile);
        // Lets the load curtain finish. It waits on this so the counter can
        // never reach 100 over a canvas that is not running.
        usePreloader.getState().markSceneReady();
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
        // Also on failure: a curtain that never lifts is worse than a blank page.
        usePreloader.getState().markSceneReady();
      });

    return () => {
      cancelled = true;
      detachPointer?.();
      disposeScene?.();
      if (model) disposeChessModel(model);
    };
  }, []);

  // No WebGL, or the model never arrived: the page falls back to the copy the
  // view already renders.
  if (failed) return null;

  return (
    // The scene fills whatever cell the layout gives it — in the hero that is
    // the centre column, between the copy and the stats. Own compositor layer so
    // a repaint elsewhere cannot invalidate the WebGL composite on WebKit. The
    // canvas is sized by its parent, and the ResizeObserver in
    // `createChessScene` picks the change up.
    <div className="absolute inset-0 transform-gpu overflow-hidden backface-hidden will-change-transform">
      <canvas ref={canvasRef} className="block size-full" />
    </div>
  );
};
