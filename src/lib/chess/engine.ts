/**
 * The computer opponent and the hint engine.
 *
 * Easy / medium / hard use our own small alpha-beta search (`cpu.worker.ts`).
 * Master / grandmaster use Stockfish 19 (the "lite, single-threaded" build, about
 * 1.7 MB, served from `public/stockfish/`; it needs no special server headers),
 * limited by its Skill Level and a thinking time. Stockfish is loaded only when
 * it is first needed. If it fails to load, its requests fall back to the small
 * engine at its strongest depth.
 *
 * Stockfish is GPL-3.0: its licence text ships next to it in `public/stockfish/`.
 */

import type { PieceSymbol } from "chess.js";

import type { CpuReply, CpuRequest } from "@/lib/chess/cpu.worker";
import type { Level } from "@/lib/chess/storage";

export interface EngineMove {
  from: string;
  to: string;
  promotion?: PieceSymbol;
}

export interface Engine {
  /** The computer's move for this position at the given strength. */
  bestMove: (fen: string, level: Level) => Promise<EngineMove>;
  /** The strongest move Stockfish can find quickly, for the hint button. */
  hint: (fen: string) => Promise<EngineMove>;
  dispose: () => void;
}

const STOCKFISH_URL = "/stockfish/stockfish-19-lite-single.js";

/** Own engine: search depth per level. */
const DEPTH: Partial<Record<Level, number>> = { easy: 1, medium: 2, hard: 3 };
/** Stockfish: Skill Level (0-20) and thinking time per level. */
const STOCKFISH: Partial<Record<Level, { skill: number; ms: number }>> = {
  master: { skill: 9, ms: 400 },
  grandmaster: { skill: 20, ms: 1200 },
};
const HINT = { skill: 20, ms: 700 };

const parseUci = (uci: string): EngineMove => ({
  from: uci.slice(0, 2),
  to: uci.slice(2, 4),
  promotion: uci.length > 4 ? (uci[4] as PieceSymbol) : undefined,
});

export const createEngine = (): Engine => {
  let own: Worker | null = null;
  let nextId = 0;
  const pending = new Map<number, (move: EngineMove) => void>();

  const ownSearch = (fen: string, depth: number): Promise<EngineMove> => {
    if (!own) {
      own = new Worker(new URL("./cpu.worker.ts", import.meta.url));
      own.onmessage = (event: MessageEvent<CpuReply>) => {
        const { id, ...move } = event.data;
        pending.get(id)?.(move);
        pending.delete(id);
      };
    }
    return new Promise((resolve) => {
      const id = (nextId += 1);
      pending.set(id, resolve);
      const request: CpuRequest = { id, fen, depth };
      own?.postMessage(request);
    });
  };

  let stockfish: Worker | null = null;
  let ready: Promise<Worker> | null = null;
  // Stockfish handles one search at a time; requests queue behind each other.
  let queue: Promise<unknown> = Promise.resolve();

  const start = (): Promise<Worker> => {
    ready ??= new Promise<Worker>((resolve, reject) => {
      const worker = new Worker(STOCKFISH_URL);
      stockfish = worker;
      worker.onerror = () => reject(new Error("Stockfish failed to load"));
      worker.onmessage = (event: MessageEvent<string>) => {
        if (String(event.data).includes("uciok")) resolve(worker);
      };
      worker.postMessage("uci");
    });
    return ready;
  };

  const stockfishSearch = (fen: string, { skill, ms }: { skill: number; ms: number }): Promise<EngineMove> => {
    const run = async (): Promise<EngineMove> => {
      const worker = await start();
      return new Promise<EngineMove>((resolve) => {
        worker.onmessage = (event: MessageEvent<string>) => {
          const match = /^bestmove (\S+)/.exec(String(event.data));
          if (match) resolve(parseUci(match[1]));
        };
        worker.postMessage(`setoption name Skill Level value ${skill}`);
        worker.postMessage(`position fen ${fen}`);
        worker.postMessage(`go movetime ${ms}`);
      });
    };
    const result = queue.then(run);
    queue = result.catch(() => undefined);
    return result;
  };

  const withFallback = (fen: string, settings: { skill: number; ms: number }): Promise<EngineMove> =>
    stockfishSearch(fen, settings).catch(() => ownSearch(fen, 3));

  return {
    bestMove: (fen, level) => {
      const depth = DEPTH[level];
      if (depth) return ownSearch(fen, depth);
      return withFallback(fen, STOCKFISH[level] ?? STOCKFISH.master!);
    },
    hint: (fen) => withFallback(fen, HINT),
    dispose: () => {
      own?.terminate();
      stockfish?.terminate();
      pending.clear();
    },
  };
};
