import { LazyBoard3D } from "@/components/common/board-3d";

/** The game page: start menu and 3D board, client-only (see `components/common/board-3d`). */
export const PlayView = () => (
  <main className="relative z-0 h-lvh">
    <h1 className="sr-only">Play Checkmate</h1>
    <LazyBoard3D />
  </main>
);
