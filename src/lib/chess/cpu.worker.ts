/**
 * Computer opponent: alpha-beta search over `chess.js`, run in a Worker so the
 * 3D scene never stalls while it thinks.
 *
 * Used for the easy, medium and hard levels. Stockfish (`engine.ts`) plays the
 * stronger levels and gives hints.
 *
 * shortcut: material + centre-control evaluation, no quiescence search, so it
 * can blunder into captures past its horizon; that is what keeps these levels
 * beatable.
 */

import { Chess, type Move, type PieceSymbol } from "chess.js";

export interface CpuRequest {
  id: number;
  fen: string;
  depth: number;
}

export interface CpuReply {
  id: number;
  from: string;
  to: string;
  promotion?: PieceSymbol;
}

const VALUE: Record<PieceSymbol, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const MATE = 100000;

/** Score from the side to move's point of view. */
const evaluate = (game: Chess): number => {
  let score = 0;
  game.board().forEach((rank, row) =>
    rank.forEach((cell, col) => {
      if (!cell) return;
      const centre = 3.5 - Math.max(Math.abs(col - 3.5), Math.abs(row - 3.5));
      const value = VALUE[cell.type] + (cell.type === "k" ? 0 : centre * 4);
      score += cell.color === "w" ? value : -value;
    }),
  );
  return game.turn() === "w" ? score : -score;
};

const ordered = (game: Chess): Move[] =>
  game.moves({ verbose: true }).sort((a, b) => {
    const gain = (move: Move) => (move.captured ? VALUE[move.captured] * 10 - VALUE[move.piece] : 0) + (move.promotion ? 800 : 0);
    return gain(b) - gain(a);
  });

const negamax = (game: Chess, depth: number, alpha: number, beta: number): number => {
  if (depth === 0) return evaluate(game);

  const moves = ordered(game);
  // Prefer the faster mate; stalemate is a draw.
  if (moves.length === 0) return game.inCheck() ? -MATE - depth : 0;

  let best = -Infinity;
  for (const move of moves) {
    game.move(move);
    best = Math.max(best, -negamax(game, depth - 1, -beta, -alpha));
    game.undo();
    alpha = Math.max(alpha, best);
    if (alpha >= beta) break;
  }
  return best;
};

self.onmessage = (event: MessageEvent<CpuRequest>) => {
  const { id, fen, depth } = event.data;
  const game = new Chess(fen);

  const scored = ordered(game).map((move) => {
    game.move(move);
    const score = -negamax(game, depth - 1, -Infinity, Infinity);
    game.undo();
    return { move, score };
  });
  scored.sort((a, b) => b.score - a.score);

  // Depth 1 is the "easy" level: pick among the top few so it is beatable.
  const pool = depth === 1 ? scored.slice(0, 3) : scored.filter((entry) => entry.score === scored[0].score);
  const pick = pool[Math.floor(Math.random() * pool.length)].move;
  const reply: CpuReply = { id, from: pick.from, to: pick.to, promotion: pick.promotion };
  (self as unknown as Worker).postMessage(reply);
};
