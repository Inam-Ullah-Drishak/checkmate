/**
 * A few hand-picked "mate in N" puzzles. `solution` alternates the player's
 * move and the opponent's reply, in UCI ("e2e4"). Every puzzle here was checked
 * by brute force with chess.js (see the note in CLAUDE.md): the first move
 * forces mate in the stated number of moves, and the scripted replies are legal.
 */

export interface Puzzle {
  id: string;
  title: string;
  /** What the player is asked to do. */
  goal: string;
  fen: string;
  solution: string[];
}

export const PUZZLES: Puzzle[] = [
  {
    id: "back-rank",
    title: "Back rank",
    goal: "White to move: mate in 1",
    fen: "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1",
    solution: ["a1a8"],
  },
  {
    id: "scholars",
    title: "Scholar's mate",
    goal: "White to move: mate in 1",
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
    solution: ["h5f7"],
  },
  {
    id: "rook-and-king",
    title: "Rook and king",
    goal: "White to move: mate in 1",
    fen: "k7/8/1K6/8/8/8/8/7R w - - 0 1",
    solution: ["h1h8"],
  },
  {
    id: "promotion",
    title: "Promote to mate",
    goal: "White to move: mate in 1",
    fen: "6k1/4P1pp/8/8/8/8/8/K7 w - - 0 1",
    solution: ["e7e8q"],
  },
  {
    id: "ladder",
    title: "The ladder",
    goal: "White to move: mate in 2",
    fen: "6k1/8/8/8/8/8/R7/1R4K1 w - - 0 1",
    solution: ["a2a7", "g8h8", "b1b8"],
  },
  {
    id: "queen-and-king",
    title: "Queen and king",
    goal: "White to move: mate in 2",
    fen: "7k/8/8/5K2/8/8/8/6Q1 w - - 0 1",
    solution: ["f5f6", "h8h7", "g1g7"],
  },
];
