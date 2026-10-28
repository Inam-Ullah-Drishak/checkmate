"use client";

/**
 * The playable page: a menu (play, puzzles, past games, stats) over the 3D
 * board. You always play against the computer. Settings, the record, stats,
 * past games and solved puzzles live in localStorage; a game in progress lives
 * in sessionStorage, so a refresh resumes it (see `lib/chess/storage.ts`).
 */

import { Chess } from "chess.js";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Board3D } from "@/components/common/board-3d/board-3d";
import { SITE_THEMES, SITE_THEME_IDS, applySiteTheme, type SiteThemeId } from "@/lib/site-themes";
import { PieceLabel, SiteThemePreview, BoardPreview, ClockPreview, MovesPreview, Picker, PiecesPreview, ShapePreview, PromotionPreview, RuleDiagram, SoundPreview } from "@/components/common/board-3d/previews";
import { chip, fade, iceCta, solid, veil } from "@/components/common/board-3d/ui";
import { MOBILE_MENU_ID, MenuBars, MobileMenu } from "@/views/home/mobile-menu";
import { RULES } from "@/data/rules";
import { BOARD_THEMES } from "@/lib/chess/board-themes";
import { PIECE_SET_IDS, PIECE_SETS, type PieceSetId } from "@/lib/chess/piece-sets";
import { SHAPE_IDS, SHAPE_LABEL, type ShapeId } from "@/lib/chess/piece-shapes";
import { GUIDED_TUTORIAL, PUZZLES, type Puzzle } from "@/lib/chess/puzzles";
import {
  clearAllData,
  clearGame,
  LEVELS,
  loadGame,
  loadPastGames,
  loadRecord,
  loadSettings,
  loadSolved,
  loadStats,
  MOVE_SECONDS,
  resetProgress,
  saveSettings,
  THEMES,
  type Level,
  type PastGame,
  type Settings,
  type Stats,
  type Tally,
  type Team,
  type ThemeId,
} from "@/lib/chess/storage";

const LEVEL_LABEL: Record<Level, string> = { easy: "Easy", medium: "Medium", hard: "Hard", master: "Master", grandmaster: "GM" };
const TABS = ["Play", "Puzzles", "History", "Stats", "Rules", "Settings"] as const;
type Tab = (typeof TABS)[number];

/** What the phone menu lists: every tab, then Tutorial and Privacy. `#…` links are handled here. */
const MENU_LINKS = [...TABS.map((name) => ({ label: name, href: `#${name}` })), { label: "Tutorial", href: "#tutorial" }, { label: "Privacy", href: "/privacy-policy" }];

type Session =
  | { kind: "play"; level: Level; side: Team; moveSeconds: number; resume?: string[] }
  | { kind: "puzzle"; puzzle: Puzzle; resume?: string[] }
  | { kind: "review"; moves: string[]; title: string; side: Team };

/** A labelled group of choices. */
const Group = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-3">
    <p className="text-body opacity-60">{label}</p>
    {children}
  </div>
);

/** A row of buttons; the one that matches `value` is on. */
const Chips = <T extends string | number>({
  label,
  options,
  value,
  onChange,
  show,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  show: (option: T) => string;
}) => (
  <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
    {options.map((option) => (
      <button key={option} type="button" aria-pressed={value === option} onClick={() => onChange(option)} className={chip(value === option)}>
        {show(option)}
      </button>
    ))}
  </div>
);

/** An on/off choice shown as two picture cards. */
const PictureToggle = ({ label, value, onChange, preview }: { label: string; value: boolean; onChange: (next: boolean) => void; preview: (on: boolean) => React.ReactNode }) => (
  <Picker label={label} options={["on", "off"] as const} value={value ? "on" : "off"} onChange={(next) => onChange(next === "on")} preview={(option) => preview(option === "on")} name={(option) => (option === "on" ? "On" : "Off")} />
);

/** An on/off choice. */
const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (next: boolean) => void }) => (
  <Chips label={label} options={["on", "off"] as const} value={value ? "on" : "off"} onChange={(next) => onChange(next === "on")} show={(option) => (option === "on" ? "On" : "Off")} />
);

export const Game = () => {
  // `undefined` until the stores have been read: they only exist in the browser.
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [tab, setTab] = useState<Tab>("Play");
  const [record, setRecord] = useState<Tally>({ win: 0, loss: 0, draw: 0 });
  const [stats, setStats] = useState<Stats | null>(null);
  const [games, setGames] = useState<PastGame[]>([]);
  const [solved, setSolved] = useState<string[]>([]);
  const [pgn, setPgn] = useState("");
  const [pgnError, setPgnError] = useState("");
  const [runs, setRuns] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  // Phones: the tabs and links live in the home page's full-screen menu.
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = useCallback(() => setNavOpen(false), []);
  const onMenuSelect = useCallback((href: string) => {
    const tab = TABS.find((name) => `#${name}` === href);
    if (tab) setTab(tab);
    else if (href === "#tutorial") {
      setRuns((count) => count + 1);
      setSession({ kind: "puzzle", puzzle: GUIDED_TUTORIAL });
    } else return false;
    return true;
  }, []);

  const loadAll = () => {
    setRecord(loadRecord());
    setStats(loadStats());
    setGames(loadPastGames());
    setSolved(loadSolved());
  };

  useEffect(() => {
    const saved = loadGame();
    const stored = loadSettings();
    setSettings(stored);
    loadAll();

    // `/play?tab=Puzzles` opens that tab (the home page links to it).
    const wanted = new URLSearchParams(window.location.search).get("tab")?.toLowerCase();
    const linked = TABS.find((name) => name.toLowerCase() === wanted);
    if (linked) setTab(linked);

    const puzzle = saved?.puzzleId ? [...PUZZLES, GUIDED_TUTORIAL].find((candidate) => candidate.id === saved.puzzleId) : undefined;
    // The home page's welcome popup sends first-time players here with `?start=1` or `?tutorial=1`.
    const params = new URLSearchParams(window.location.search);
    if (saved && puzzle) setSession({ kind: "puzzle", puzzle, resume: saved.moves });
    else if (saved) setSession({ kind: "play", level: saved.level, side: saved.side ?? "w", moveSeconds: saved.moveSeconds ?? 0, resume: saved.moves });
    else if (params.has("tutorial")) setSession({ kind: "puzzle", puzzle: GUIDED_TUTORIAL });
    else if (params.has("start")) setSession({ kind: "play", level: stored.level, side: stored.side, moveSeconds: stored.moveSeconds });
    else setSession(null);
  }, []);

  if (session === undefined) return null;

  const start = (next: Session) => {
    setRuns((count) => count + 1);
    setSession(next);
  };

  const toMenu = () => {
    clearGame();
    loadAll();
    setSession(null);
  };

  const update = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
    if (patch.site) applySiteTheme(patch.site);
  };

  if (session) {
    const common = {
      theme: SITE_THEMES[settings.site].board,
      pieces: settings.pieces,
      shape: settings.shape,
      showLegal: settings.showLegal,
      showLast: settings.showLast,
      autoQueen: settings.autoQueen,
      sound: settings.sound,
      onMenu: toMenu,
    } as const;

    if (session.kind === "review") {
      return <Board3D key={runs} {...common} level="medium" side={session.side} moveSeconds={0} review={{ moves: session.moves, title: session.title }} />;
    }
    if (session.kind === "puzzle") {
      const index = PUZZLES.indexOf(session.puzzle);
      const next = index >= 0 ? PUZZLES[index + 1] : undefined;
      return (
        <Board3D
          key={runs}
          {...common}
          level="medium"
          side={session.puzzle.fen.split(" ")[1] as Team}
          moveSeconds={0}
          puzzle={session.puzzle}
          resume={session.resume}
          onNextPuzzle={next ? () => start({ kind: "puzzle", puzzle: next }) : undefined}
        />
      );
    }
    return <Board3D key={runs} {...common} level={session.level} side={session.side} moveSeconds={session.moveSeconds} resume={session.resume} />;
  }

  const loadPgn = () => {
    try {
      const chess = new Chess();
      chess.loadPgn(pgn.trim());
      const headers = chess.getHeaders();
      if (headers.SetUp === "1" || chess.history().length === 0) throw new Error("empty");
      setPgnError("");
      start({ kind: "review", moves: chess.history(), title: "Imported game", side: "w" });
    } catch {
      setPgnError("That is not a game this page can read. Paste a PGN that starts from the standard position.");
    }
  };

  const played = record.win + record.loss + record.draw;
  const solvedCount = solved.filter((id) => PUZZLES.some((puzzle) => puzzle.id === id)).length;
  const outcomeLabel = (outcome: PastGame["outcome"]) => (outcome === "win" ? "Won" : outcome === "loss" ? "Lost" : "Drawn");
  const row = `${veil} flex w-full items-center justify-between gap-4 p-5 text-left`;

  return (
    // No boxes: the page is the blue field, with soft panels where something can be pressed.
    <div data-lenis-prevent className="flex size-full flex-col overflow-y-auto px-shell-inset">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-8 gap-y-2 py-4">
        <Link href="/" className="text-logo">
          Checkmate.
        </Link>
        <button type="button" aria-expanded={navOpen} aria-controls={MOBILE_MENU_ID} onClick={() => setNavOpen(true)} className={`flex size-topbar items-center justify-center sm:hidden ${fade}`}>
          <span className="sr-only">Open menu</span>
          <MenuBars open={navOpen} />
        </button>
        <nav
          id="play-nav"
          aria-label="Menu"
          className="text-body order-3 hidden w-full gap-x-5 gap-y-2 sm:order-none sm:flex sm:w-auto sm:flex-wrap sm:gap-8"
        >
          {TABS.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={tab === name}
              onClick={() => setTab(name)}
              className={`cursor-pointer underline-offset-8 ${fade} ${tab === name ? "underline decoration-2" : "opacity-60"}`}
            >
              {name}
            </button>
          ))}
        </nav>
        <span className="hidden gap-8 sm:flex">
          <button type="button" onClick={() => start({ kind: "puzzle", puzzle: GUIDED_TUTORIAL })} className={`text-body cursor-pointer opacity-60 hover:opacity-100 ${fade}`}>
            Tutorial
          </button>
          <Link href="/privacy-policy" className={`text-body opacity-60 hover:opacity-100 ${fade}`}>
            Privacy
          </Link>
          <Link href="/" className={`text-body opacity-60 hover:opacity-100 ${fade}`}>
            Back to home
          </Link>
        </span>
        <MobileMenu
          open={navOpen}
          onClose={closeNav}
          company="Checkmate."
          links={MENU_LINKS}
          contact={{ label: "Back to home", href: "/" }}
          toggleSelector={`[aria-controls="${MOBILE_MENU_ID}"]`}
          onSelect={onMenuSelect}
        />
      </header>

      {tab === "Play" && (
        <main className="mx-auto grid w-full max-w-6xl flex-1 content-center gap-12 py-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
          <section aria-label="Match settings" className="flex flex-col gap-10">
            <div>
              <h2 className="text-display font-display">New match</h2>
              <p className="text-body mt-3 max-w-md opacity-70">You against the computer. Choose how hard it plays and which team you take.</p>
            </div>
            <Group label="Difficulty">
              <Chips label="Difficulty" options={LEVELS} value={settings.level} onChange={(level) => update({ level })} show={(level) => LEVEL_LABEL[level]} />
            </Group>
            <Group label="You play">
              <Chips label="Your team" options={["w", "b"] as const} value={settings.side} onChange={(side) => update({ side })} show={(id) => PIECE_SETS[settings.pieces].names[id]} />
            </Group>
            <p className="text-body opacity-70">
              {BOARD_THEMES[SITE_THEMES[settings.site].board].label} board, {PIECE_SETS[settings.pieces].label.toLowerCase()}, {settings.moveSeconds ? `${settings.moveSeconds} s per move` : "no move timer"}.{" "}
              <button type="button" onClick={() => setTab("Settings")} className={`cursor-pointer underline underline-offset-4 ${fade}`}>
                Change in Settings
              </button>
            </p>
          </section>

          <aside aria-label="Your record" className="bg-foreground/10 text-foreground flex flex-col gap-8 rounded-3xl p-8 backdrop-blur-md">
            <div className="grid grid-cols-3 gap-4">
              {(
                [
                  ["Won", record.win],
                  ["Lost", record.loss],
                  ["Drawn", record.draw],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <p className="text-display font-display">{value}</p>
                  <p className="text-body opacity-70">{label}</p>
                </div>
              ))}
            </div>
            <p className="text-body opacity-70">
              {played ? `${Math.round((record.win / played) * 100)}% of your ${played} finished games won` : "No finished games yet"}
            </p>
            <button
              type="button"
              onClick={() => start({ kind: "play", level: settings.level, side: settings.side, moveSeconds: settings.moveSeconds })}
              className={`${iceCta} text-body group flex h-action w-full cursor-pointer items-center justify-between pr-1 pl-6`}
            >
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="size-marker bg-ice-ink group-active:bg-ice-top rounded-full" />
                Start a match
              </span>
              <span className="bg-background flex size-action-icon items-center justify-center rounded-full">
                <svg viewBox="0 0 19 19" aria-hidden="true" className="text-foreground size-5 fill-none stroke-current stroke-[1.5]">
                  <path d="M6.5 3.5 13 9.5l-6.5 6" strokeLinecap="square" />
                </svg>
              </span>
            </button>
            <p className="text-xs opacity-50">When the move timer runs out your turn is skipped. Master, GM and hints use the Stockfish 19 engine (GPL-3.0).</p>
          </aside>
        </main>
      )}

      {tab === "Puzzles" && (
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 py-8">
          <div>
            <h2 className="text-display font-display">Puzzles</h2>
            <p className="text-body mt-3 opacity-70">
              {solvedCount} of {PUZZLES.length} solved. Find the forced checkmate.
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {PUZZLES.map((puzzle) => (
              <li key={puzzle.id}>
                <button type="button" onClick={() => start({ kind: "puzzle", puzzle })} className={row}>
                  <span>
                    {puzzle.title}
                    <span className="opacity-60">: {puzzle.goal.replace("White to move: ", "")}</span>
                  </span>
                  <span>{solved.includes(puzzle.id) ? "Solved" : "Play"}</span>
                </button>
              </li>
            ))}
          </ul>
        </main>
      )}

      {tab === "History" && (
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 py-8">
          <div>
            <h2 className="text-display font-display">History</h2>
            <p className="text-body mt-3 opacity-70">Your last 10 finished games, ready to replay move by move.</p>
          </div>
          {games.length === 0 ? (
            <p className="text-body opacity-70">No finished games yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {games.map((past) => (
                <li key={past.id}>
                  <button
                    type="button"
                    onClick={() => start({ kind: "review", moves: past.moves, title: `${outcomeLabel(past.outcome)} vs ${LEVEL_LABEL[past.level]}`, side: past.side })}
                    className={row}
                  >
                    <span>
                      {outcomeLabel(past.outcome)} vs {LEVEL_LABEL[past.level]}
                      <span className="opacity-60">
                        {" "}
                        · {Math.ceil(past.moves.length / 2)} moves · {new Date(past.date).toLocaleDateString()}
                      </span>
                    </span>
                    <span>Review</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Group label="Import a game (PGN)">
            <textarea
              value={pgn}
              onChange={(event) => setPgn(event.target.value)}
              rows={4}
              placeholder="1. e4 e5 2. Nf3 Nc6 ..."
              className={`${veil} text-foreground w-full resize-none p-4 outline-none`}
            />
            {pgnError && <p className="text-body">{pgnError}</p>}
            <button type="button" onClick={loadPgn} disabled={!pgn.trim()} className={`${solid} h-action w-fit px-6 disabled:opacity-50`}>
              Review this game
            </button>
          </Group>
        </main>
      )}

      {tab === "Rules" && (
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 py-8">
          <div>
            <h2 className="text-display font-display">Rules</h2>
            <p className="text-body mt-3 opacity-70">How chess works, and what is particular to this game.</p>
          </div>
          {RULES.map((section) => (
            <section key={section.title} aria-label={section.title} className="flex flex-col gap-4">
              <h3 className="text-logo">{section.title}</h3>
              {section.intro && <p className="text-body max-w-3xl opacity-80">{section.intro}</p>}
              {section.items && (
                <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                  {section.items.map((item) => (
                    <li
                      key={item.name ?? item.text}
                      className={`${veil} flex flex-col gap-3 p-3 sm:gap-4 sm:p-5 ${item.wide ? "col-span-2 lg:col-span-3 md:flex-row md:items-center md:gap-8" : ""}`}
                    >
                      {item.diagram && item.then && (
                        <div className="mx-auto flex w-full max-w-80 items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <RuleDiagram diagram={item.diagram} />
                            <p className="mt-1 text-center text-xs opacity-60">Before</p>
                          </div>
                          <span aria-hidden="true" className="text-logo">
                            &rarr;
                          </span>
                          <div className="min-w-0 flex-1">
                            <RuleDiagram diagram={item.then} />
                            <p className="mt-1 text-center text-xs opacity-60">After</p>
                          </div>
                        </div>
                      )}
                      {item.diagram && !item.then && (
                        <div className={`mx-auto w-full ${item.wide ? "max-w-sm md:mx-0 md:shrink-0" : "max-w-64"}`}>
                          <RuleDiagram diagram={item.diagram} />
                        </div>
                      )}
                      <p className="text-xs opacity-90 sm:text-body">
                        {item.name && <strong className="font-bold">{item.name}: </strong>}
                        {item.text}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </main>
      )}

      {tab === "Settings" && (
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 py-8">
          <div>
            <h2 className="text-display font-display">Settings</h2>
            <p className="text-body mt-3 opacity-70">Saved in this browser. They apply from your next match.</p>
          </div>
          <Group label="Site theme (colours, background and board)">
            <Picker label="Site theme" options={SITE_THEME_IDS} value={settings.site} onChange={(site: SiteThemeId) => update({ site })} preview={(id) => <SiteThemePreview theme={id} />} name={(id) => SITE_THEMES[id].label} />
          </Group>
          <Group label="Piece shape">
            <Picker label="Piece shape" options={SHAPE_IDS} value={settings.shape} onChange={(shape: ShapeId) => update({ shape })} preview={(id) => <ShapePreview shape={id} />} name={(id) => SHAPE_LABEL[id]} />
          </Group>
          <Group label="Piece color">
            <Picker label="Piece color" options={PIECE_SET_IDS} value={settings.pieces} onChange={(pieces: PieceSetId) => update({ pieces })} preview={(id) => <PiecesPreview set={id} />} name={(id) => <PieceLabel set={id} />} />
            <p className="text-body opacity-60">
              Your side is {PIECE_SETS[settings.pieces].names.w}, the computer plays {PIECE_SETS[settings.pieces].names.b} (or the other way round if you choose that team).
            </p>
          </Group>
          <Group label="Move timer (your turn is skipped when it runs out)">
            <Picker label="Move timer" options={MOVE_SECONDS} value={settings.moveSeconds} onChange={(moveSeconds) => update({ moveSeconds })} preview={(value) => <ClockPreview seconds={value} />} name={(value) => (value ? `${value} seconds` : "No limit")} />
          </Group>
          <div className="grid gap-10 sm:grid-cols-2">
          <Group label="Sound">
            <PictureToggle label="Sound" value={settings.sound} onChange={(sound) => update({ sound })} preview={(on) => <SoundPreview on={on} />} />
          </Group>
          <Group label="Show where the selected piece can move">
            <PictureToggle label="Show legal moves" value={settings.showLegal} onChange={(showLegal) => update({ showLegal })} preview={(on) => <MovesPreview dots={on} />} />
          </Group>
          <Group label="Highlight the last move">
            <PictureToggle label="Highlight the last move" value={settings.showLast} onChange={(showLast) => update({ showLast })} preview={(on) => <MovesPreview last={on} />} />
          </Group>
          <Group label="Promote pawns to a queen without asking">
            <PictureToggle label="Auto queen" value={settings.autoQueen} onChange={(autoQueen) => update({ autoQueen })} preview={(on) => <PromotionPreview auto={on} />} />
          </Group>
          </div>
          <Group label="Your data">
            <div className="flex flex-wrap gap-2">
              {confirmReset ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      resetProgress();
                      loadAll();
                      setConfirmReset(false);
                    }}
                    className={`${iceCta} text-body h-action cursor-pointer px-6`}
                  >
                    Yes, erase my record and history
                  </button>
                  <button type="button" onClick={() => setConfirmReset(false)} className={`${iceCta} text-body h-action cursor-pointer px-6`}>
                    Cancel
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setConfirmReset(true)} className={`${iceCta} text-body h-action cursor-pointer px-6`}>
                  Reset record, history and puzzles
                </button>
              )}
              {confirmClear ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      clearAllData();
                      window.location.reload();
                    }}
                    className={`${iceCta} text-body h-action cursor-pointer px-6`}
                  >
                    Yes, clear everything and start over
                  </button>
                  <button type="button" onClick={() => setConfirmClear(false)} className={`${iceCta} text-body h-action cursor-pointer px-6`}>
                    Cancel
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setConfirmClear(true)} className={`${iceCta} text-body h-action cursor-pointer px-6`}>
                  Clear all browser data
                </button>
              )}
            </div>
          </Group>
        </main>
      )}

      {tab === "Stats" && stats && (
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 py-8">
          <div>
            <h2 className="text-display font-display">Stats</h2>
            <p className="text-body mt-3 opacity-70">
              {played ? `${Math.round((record.win / played) * 100)}% win rate over ${played} games.` : "Play a game to start your record."} Longest game: {stats.longest} moves.
              Puzzles solved: {solvedCount} of {PUZZLES.length}.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-body grid grid-cols-4 px-5 opacity-60">
              <span>Level</span>
              <span>Won</span>
              <span>Lost</span>
              <span>Drawn</span>
            </div>
            {LEVELS.map((level) => (
              <div key={level} className={`${veil} text-body grid grid-cols-4 p-5 tabular-nums`}>
                <span>{LEVEL_LABEL[level]}</span>
                <span>{stats.byLevel[level].win}</span>
                <span>{stats.byLevel[level].loss}</span>
                <span>{stats.byLevel[level].draw}</span>
              </div>
            ))}
          </div>
        </main>
      )}
    </div>
  );
};
