import { Chess } from "chess.js";
import { beforeEach, describe, expect, it } from "vitest";

import { RULES, type Diagram } from "@/data/rules";
import { BOARD_THEMES } from "@/lib/chess/board-themes";
import { openingName } from "@/lib/chess/openings";
import { PIECE_SET_IDS, PIECE_SETS } from "@/lib/chess/piece-sets";
import { GUIDED_TUTORIAL, PUZZLES } from "@/lib/chess/puzzles";
import {
  loadPastGames,
  loadRecord,
  loadSettings,
  loadStats,
  recordGame,
  resetProgress,
  saveSettings,
  THEMES,
} from "@/lib/chess/storage";

/** A tiny in-memory stand-in for the browser's storage, so the saving code can run under Node. */
const fakeStorage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    clear: () => data.clear(),
  };
};

beforeEach(() => {
  (globalThis as unknown as { window: unknown }).window = { localStorage: fakeStorage(), sessionStorage: fakeStorage() };
});

/** Can the side to move force checkmate within `n` of its own moves? */
const forcesMate = (game: Chess, n: number): boolean => {
  if (n === 0) return false;
  for (const move of game.moves({ verbose: true })) {
    game.move(move);
    let mates: boolean;
    if (game.isCheckmate()) mates = true;
    else if (game.isGameOver()) mates = false;
    else mates = game.moves({ verbose: true }).every((reply) => {
      game.move(reply);
      const result = forcesMate(game, n - 1);
      game.undo();
      return result;
    });
    game.undo();
    if (mates) return true;
  }
  return false;
};

describe("puzzles", () => {
  for (const puzzle of PUZZLES) {
    it(`${puzzle.id}: the scripted line is legal, forces mate and ends in checkmate`, () => {
      const n = Number(/mate in (\d)/.exec(puzzle.goal)?.[1]);
      expect(n).toBeGreaterThan(0);

      // The first move must really force mate in `n`, not just look plausible.
      const first = puzzle.solution[0];
      const probe = new Chess(puzzle.fen);
      probe.move({ from: first.slice(0, 2), to: first.slice(2, 4), promotion: first[4] });
      const forced = probe.isCheckmate() || probe.moves({ verbose: true }).every((reply) => {
        probe.move(reply);
        const result = forcesMate(probe, n - 1);
        probe.undo();
        return result;
      });
      expect(forced).toBe(true);

      const game = new Chess(puzzle.fen);
      for (const uci of puzzle.solution) game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      expect(game.isCheckmate()).toBe(true);
    });
  }

  it("has unique ids", () => {
    expect(new Set(PUZZLES.map((puzzle) => puzzle.id)).size).toBe(PUZZLES.length);
  });
});

describe("openings", () => {
  it("names the most specific line played", () => {
    expect(openingName(["e4", "e5", "Nf3", "Nc6", "Bb5", "a6"])).toBe("Ruy Lopez: Morphy Defence");
    expect(openingName(["e4", "c5"])).toBe("Sicilian Defence");
    expect(openingName(["d4", "d5", "c4", "e6", "Nc3"])).toBe("Queen's Gambit Declined");
  });

  it("returns nothing once the game has left the table, or before a move", () => {
    expect(openingName([])).toBeNull();
    expect(openingName(["a3", "a6"])).toBeNull();
  });
});

describe("rules page diagrams", () => {
  const SQUARE = /^[a-h][1-8]$/;
  const PIECE = /^[wb][KQRBNP]@[a-h][1-8]$/;
  const diagrams: { where: string; diagram: Diagram }[] = RULES.flatMap((section) =>
    (section.items ?? []).flatMap((item) => [
      ...(item.diagram ? [{ where: `${section.title} / ${item.name}`, diagram: item.diagram }] : []),
      ...(item.then ? [{ where: `${section.title} / ${item.name} (after)`, diagram: item.then }] : []),
    ]),
  );

  it("has diagrams", () => {
    expect(diagrams.length).toBeGreaterThan(15);
  });

  for (const { where, diagram } of diagrams) {
    it(`${where}: every square and piece is valid, and no two pieces share a square`, () => {
      [...(diagram.dots ?? []), ...(diagram.rings ?? []), ...(diagram.marks ?? []), ...(diagram.arrows ?? []).flat()].forEach((name) => expect(name).toMatch(SQUARE));
      [...diagram.pieces, ...(diagram.ghosts ?? [])].forEach((code) => expect(code).toMatch(PIECE));
      const squares = diagram.pieces.map((code) => code.slice(3));
      expect(new Set(squares).size).toBe(squares.length);
    });
  }
});

describe("design data", () => {
  it("has a board look for every theme and a unique name for each piece design", () => {
    expect(Object.keys(BOARD_THEMES).sort()).toEqual([...THEMES].sort());
    const labels = PIECE_SET_IDS.map((id) => PIECE_SETS[id].label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("uses valid colours and distinct team names in every piece design", () => {
    const HEX = /^#[0-9a-f]{6}$/i;
    for (const id of PIECE_SET_IDS) {
      const set = PIECE_SETS[id];
      expect(set.w.color).toMatch(HEX);
      expect(set.b.color).toMatch(HEX);
      expect(set.names.w).not.toBe(set.names.b);
    }
    for (const theme of Object.values(BOARD_THEMES)) {
      [theme.light, theme.dark, theme.frame].forEach((colour) => expect(colour).toMatch(HEX));
    }
  });
});

describe("saved data", () => {
  it("falls back to defaults, and repairs a design or board that no longer exists", () => {
    expect(loadSettings().level).toBe("medium");
    saveSettings({ ...loadSettings(), pieces: "bronze-steel" as never, theme: "gone" as never });
    const repaired = loadSettings();
    expect(repaired.pieces).toBe("gold-silver");
    expect(repaired.theme).toBe("classic");
  });

  it("counts a finished game in the record, the stats and the history", () => {
    recordGame({ outcome: "win", reason: "Checkmate", level: "hard", side: "w", moves: ["e4", "e5", "Qh5", "--", "Qxf7#"] });
    recordGame({ outcome: "loss", reason: "Resigned", level: "easy", side: "b", moves: ["e4"] });
    expect(loadRecord()).toEqual({ win: 1, loss: 1, draw: 0 });
    expect(loadStats().byLevel.hard.win).toBe(1);
    expect(loadStats().byLevel.easy.loss).toBe(1);
    // A skipped turn is not a move: the longest game here has four.
    expect(loadStats().longest).toBe(4);
    expect(loadPastGames()).toHaveLength(2);
  });

  it("keeps only the last ten games, newest first", () => {
    for (let index = 0; index < 12; index += 1) {
      recordGame({ outcome: "draw", reason: `game ${index}`, level: "medium", side: "w", moves: ["e4"] });
    }
    const games = loadPastGames();
    expect(games).toHaveLength(10);
    expect(games[0].reason).toBe("game 11");
  });

  it("resets the record, stats and history but keeps the settings", () => {
    saveSettings({ ...loadSettings(), level: "master" });
    recordGame({ outcome: "win", reason: "Checkmate", level: "master", side: "w", moves: ["e4"] });
    resetProgress();
    expect(loadRecord()).toEqual({ win: 0, loss: 0, draw: 0 });
    expect(loadPastGames()).toHaveLength(0);
    expect(loadSettings().level).toBe("master");
  });
});

describe("guided tutorial", () => {
  it("is a legal game that ends in checkmate for the player, with a line of guidance per player move", () => {
    const game = new Chess(GUIDED_TUTORIAL.fen);
    for (const move of GUIDED_TUTORIAL.solution) game.move({ from: move.slice(0, 2), to: move.slice(2, 4) });
    expect(game.isCheckmate()).toBe(true);
    expect(game.turn()).toBe("b");
    expect(GUIDED_TUTORIAL.guide).toHaveLength(Math.ceil(GUIDED_TUTORIAL.solution.length / 2));
  });
});
