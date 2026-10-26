/**
 * Load-curtain state.
 *
 * Flags, not a progress number: the count the curtain shows is a local
 * animation, but *when it is allowed to finish* is real — it waits for the
 * chess scene to report that it is running. So the counter can never hit 100
 * over an empty canvas.
 *
 * `sceneReady` is also set when the scene **fails**. A curtain that hangs
 * forever because WebGL was unavailable is worse than one that lifts on a
 * blank page.
 *
 * **`lifting` and `done` are different moments and both matter.** `lifting`
 * fires when the curtain *starts* fading, `done` when it has gone — 0.7s apart.
 * Anything that should be seen happening *through* the fade hangs off `lifting`;
 * anything that should land on a clear page hangs off `done`.
 *
 * 📖 Docs: obsidian/frontend/components/common.md
 */

import { create } from "zustand";

interface PreloaderStore {
  /** The scene has been built, or has failed and never will be. */
  sceneReady: boolean;
  /** The curtain has begun to fade, but is still on screen. */
  lifting: boolean;
  /** The curtain has gone. */
  done: boolean;
  markSceneReady: () => void;
  beginLift: () => void;
  finish: () => void;
}

export const usePreloader = create<PreloaderStore>()((set) => ({
  sceneReady: false,
  lifting: false,
  done: false,
  markSceneReady: () => set({ sceneReady: true }),
  beginLift: () => set({ lifting: true }),
  // Never leaves `lifting` behind: the reduced-motion path finishes without ever
  // playing a fade, and a consumer watching only `lifting` would wait forever.
  finish: () => set({ lifting: true, done: true }),
}));
