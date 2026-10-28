/**
 * Browser-only persistence. `localStorage` keeps what outlives the tab
 * (settings, record, stats, past games, solved puzzles); `sessionStorage` keeps
 * the game in progress, so a refresh resumes it and a new tab starts fresh.
 * Every access is wrapped: the stores throw or come back empty in private
 * windows or with site data blocked.
 */

import { PIECE_SET_IDS, type PieceSetId } from "@/lib/chess/piece-sets";
import { SHAPE_IDS, type ShapeId } from "@/lib/chess/piece-shapes";
import { SITE_THEME_IDS, type SiteThemeId } from "@/lib/site-themes";

export type { PieceSetId };

export type Level = "easy" | "medium" | "hard" | "master" | "grandmaster";
export const LEVELS: Level[] = ["easy", "medium", "hard", "master", "grandmaster"];

/** The player's team: white is silver, black is gold. */
export type Team = "w" | "b";

export type ThemeId = "classic" | "wood" | "marble" | "ocean" | "slate" | "rose" | "violet" | "sunset" | "cosmos" | "ice" | "blossom" | "sea" | "leaf";
export const THEMES: ThemeId[] = ["classic", "wood", "marble", "ocean", "slate", "rose", "violet", "sunset", "cosmos", "ice", "blossom", "sea", "leaf"];

export interface Settings {
  level: Level;
  side: Team;
  /** Seconds the player has for each move before the turn is skipped; 0 means unlimited. */
  moveSeconds: number;
  sound: boolean;
  theme: ThemeId;
  pieces: PieceSetId;
  shape: ShapeId;
  /** Colour theme of the whole site. */
  site: SiteThemeId;
  /** Show the dots for where the selected piece can go. */
  showLegal: boolean;
  /** Mark the squares of the last move. */
  showLast: boolean;
  /** Promote a pawn to a queen without asking. */
  autoQueen: boolean;
}

/** Wins / losses / draws, from the player's side. */
export interface Tally {
  win: number;
  loss: number;
  draw: number;
}

export type Outcome = keyof Tally;

export interface Stats {
  byLevel: Record<Level, Tally>;
  /** Most moves (by both sides) in any finished game. */
  longest: number;
}

/** A finished game, kept so it can be stepped through again. */
export interface PastGame {
  id: number;
  date: string;
  outcome: Outcome;
  reason: string;
  level: Level;
  side: Team;
  /** SAN, as `chess.js` writes it (a skipped turn is `--`). */
  moves: string[];
}

export interface SavedGame {
  level: Level;
  side: Team;
  moveSeconds: number;
  /** Moves in SAN, replayed on resume. */
  moves: string[];
  /** Set for puzzles: the position the moves are replayed from. */
  puzzleId?: string;
}

export const MOVE_SECONDS = [0, 15, 30, 60];
const MAX_PAST_GAMES = 10;

const KEYS = {
  settings: "checkmate:settings",
  record: "checkmate:record",
  stats: "checkmate:stats",
  games: "checkmate:games",
  puzzles: "checkmate:puzzles",
  game: "checkmate:game",
  tutorial: "checkmate:tutorial",
} as const;

type Store = "localStorage" | "sessionStorage";

const read = <T>(store: Store, key: string): T | null => {
  try {
    const raw = window[store].getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const write = (store: Store, key: string, value: unknown): void => {
  try {
    window[store].setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable or full: the game still works, it just won't be remembered.
  }
};

const emptyTally = (): Tally => ({ win: 0, loss: 0, draw: 0 });

export const loadSettings = (): Settings => {
  const stored = read<Partial<Settings>>("localStorage", KEYS.settings);
  const settings: Settings = {
    level: "medium",
    side: "w",
    moveSeconds: 30,
    sound: true,
    theme: "classic",
    pieces: "gold-silver",
    shape: "classic",
    site: "blue",
    showLegal: true,
    showLast: true,
    autoQueen: false,
    ...stored,
  };
  // A level or theme from an older version may no longer exist.
  if (!LEVELS.includes(settings.level)) settings.level = "medium";
  if (!THEMES.includes(settings.theme)) settings.theme = "classic";
  if (!PIECE_SET_IDS.includes(settings.pieces)) settings.pieces = "gold-silver";
  if (!SHAPE_IDS.includes(settings.shape)) settings.shape = "classic";
  if (!SITE_THEME_IDS.includes(settings.site)) settings.site = "blue";
  return settings;
};
export const saveSettings = (settings: Settings): void => write("localStorage", KEYS.settings, settings);

export const loadRecord = (): Tally => ({ ...emptyTally(), ...read<Tally>("localStorage", KEYS.record) });

export const loadStats = (): Stats => {
  const stored = read<Partial<Stats>>("localStorage", KEYS.stats);
  const byLevel = Object.fromEntries(LEVELS.map((level) => [level, { ...emptyTally(), ...stored?.byLevel?.[level] }])) as Record<Level, Tally>;
  return { byLevel, longest: stored?.longest ?? 0 };
};

export const loadPastGames = (): PastGame[] => read<PastGame[]>("localStorage", KEYS.games) ?? [];

/** Count a finished game in the record and the stats, and keep it for review. */
export const recordGame = (game: Omit<PastGame, "id" | "date">): void => {
  const record = loadRecord();
  record[game.outcome] += 1;
  write("localStorage", KEYS.record, record);

  const stats = loadStats();
  stats.byLevel[game.level][game.outcome] += 1;
  stats.longest = Math.max(stats.longest, game.moves.filter((move) => move !== "--").length);
  write("localStorage", KEYS.stats, stats);

  const entry: PastGame = { ...game, id: Date.now(), date: new Date().toISOString() };
  write("localStorage", KEYS.games, [entry, ...loadPastGames()].slice(0, MAX_PAST_GAMES));
};

/** Forget every finished game, the record, the stats and the solved puzzles. Settings stay. */
export const resetProgress = (): void => {
  try {
    [KEYS.record, KEYS.stats, KEYS.games, KEYS.puzzles].forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Nothing to reset.
  }
};

/** Remove everything this game stored in the browser (settings, record, games, tutorial flag, game in progress). */
export const clearAllData = (): void => {
  (["localStorage", "sessionStorage"] as const).forEach((store) => {
    try {
      Object.keys(window[store])
        .filter((key) => key.startsWith("checkmate:"))
        .forEach((key) => window[store].removeItem(key));
    } catch {
      // Storage unavailable: nothing to clear.
    }
  });
};

export const tutorialSeen = (): boolean => read<boolean>("localStorage", KEYS.tutorial) === true;
export const markTutorialSeen = (): void => write("localStorage", KEYS.tutorial, true);

/** Never chose in the welcome popup and has no finished games: a genuinely new player. */
export const isFirstTimePlayer = (): boolean => {
  const { win, loss, draw } = loadRecord();
  return !tutorialSeen() && win + loss + draw === 0;
};

export const loadSolved =(): string[] => read<string[]>("localStorage", KEYS.puzzles) ?? [];
export const markSolved = (id: string): void => {
  const solved = loadSolved();
  if (!solved.includes(id)) write("localStorage", KEYS.puzzles, [...solved, id]);
};

export const loadGame = (): SavedGame | null => read<SavedGame>("sessionStorage", KEYS.game);
export const saveGame = (game: SavedGame): void => write("sessionStorage", KEYS.game, game);
export const clearGame = (): void => {
  try {
    window.sessionStorage.removeItem(KEYS.game);
  } catch {
    // Nothing to clear.
  }
};
