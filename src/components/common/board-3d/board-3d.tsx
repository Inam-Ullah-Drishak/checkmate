"use client";

/**
 * The playable 3D board: game rules from `chess.js`, the 3D view from
 * `lib/chess/board-scene.ts`, the computer from `lib/chess/engine.ts`. One
 * component runs three kinds of session:
 *
 * - **play**: you against the computer (undo, hints, resign, draw offers,
 *   a move timer that skips your turn, results saved in the browser);
 * - **puzzle**: a position with a scripted solution;
 * - **review**: stepping through a finished game move by move.
 *
 * Limits: the computer always plays the other team; a draw offer is accepted on
 * a material rule, not by judging the position.
 */

import { Chess, type Color as Side, type Move, type PieceSymbol, type Square } from "chess.js";
import { useEffect, useRef, useState } from "react";

import { choice, ruled, solid } from "@/components/common/board-3d/ui";
import { createBoardScene, type BoardCell, type BoardScene } from "@/lib/chess/board-scene";
import { createEngine, type EngineMove } from "@/lib/chess/engine";
import { PIECE_SETS, type PieceSetId } from "@/lib/chess/piece-sets";
import { openingName } from "@/lib/chess/openings";
import type { Puzzle } from "@/lib/chess/puzzles";
import { playSound, type Sound } from "@/lib/chess/sound";
import {
  clearGame,
  loadSettings,
  markSolved,
  recordGame,
  saveGame,
  saveSettings,
  type Level,
  type Outcome,
  type Team,
  type ThemeId,
} from "@/lib/chess/storage";
import { loadChessModel } from "@/lib/scene/chess-model";

const OTHER: Record<Side, Side> = { w: "b", b: "w" };
const PIECE_NAME: Record<string, string> = { q: "Queen", r: "Rook", b: "Bishop", n: "Knight" };
const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** m:ss, rounded up so a clock never shows 0:00 while it still has time. */
const format = (ms: number): string => {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

const describe = (game: Chess, names: Record<Side, string>): string => {
  if (game.isCheckmate()) return `Checkmate. ${names[OTHER[game.turn()]]} wins`;
  if (game.isStalemate()) return `Draw by stalemate: ${names[game.turn()]} has no legal move`;
  if (game.isInsufficientMaterial()) return "Draw: not enough pieces left to checkmate";
  if (game.isThreefoldRepetition()) return "Draw: same position three times";
  if (game.isDraw()) return "Draw: 50 moves without a capture or pawn move";
  return `${names[game.turn()]} to move${game.inCheck() ? " (check)" : ""}`;
};

const cellsOf = (game: Chess): BoardCell[] =>
  game.board().flatMap((rank) => rank.flatMap((cell) => (cell ? [{ type: cell.type, color: cell.color, square: cell.square }] : [])));

/** Material the side has on the board, in pawns. */
const material = (game: Chess, side: Side): number =>
  game
    .board()
    .reduce((sum, rank) => sum + rank.reduce((rankSum, cell) => rankSum + (cell && cell.color === side ? VALUE[cell.type] : 0), 0), 0);

interface Result {
  outcome: Outcome | "solved";
  text: string;
}

/** What the page can ask the running game to do. */
interface Actions {
  newGame: () => void;
  undo: () => void;
  resign: () => void;
  offerDraw: () => void;
  hint: () => void;
  promote: (type: PieceSymbol | null) => void;
  copyPgn: () => void;
  goTo: (index: number) => void;
}

const NOTHING: Actions = {
  newGame: () => undefined,
  undo: () => undefined,
  resign: () => undefined,
  offerDraw: () => undefined,
  hint: () => undefined,
  promote: () => undefined,
  copyPgn: () => undefined,
  goTo: () => undefined,
};

export interface Board3DProps {
  level: Level;
  /** Which team the player has; the computer plays the other. */
  side: Team;
  theme: ThemeId;
  pieces: PieceSetId;
  /** Show the dots for where the selected piece can go. */
  showLegal: boolean;
  /** Mark the squares of the last move. */
  showLast: boolean;
  /** Promote a pawn to a queen without asking. */
  autoQueen: boolean;
  /** Seconds the player has per move before the turn is skipped; 0 is unlimited. */
  moveSeconds: number;
  sound: boolean;
  /** Moves (SAN) of a game in progress to replay, e.g. after a page refresh. */
  resume?: string[];
  /** Step through these moves instead of playing. */
  review?: { moves: string[]; title: string };
  puzzle?: Puzzle;
  onMenu: () => void;
  onNextPuzzle?: () => void;
}

export const Board3D = ({ level, side, theme, pieces, showLegal, showLast, autoQueen, moveSeconds, sound, resume, review, puzzle, onMenu, onNextPuzzle }: Board3DProps) => {
  const host = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<BoardScene | null>(null);
  const actions = useRef<Actions>(NOTHING);
  const soundOn = useRef(sound);

  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("");
  // A short-lived message (a skipped turn, a declined draw) shown in place of the status.
  const [notice, setNotice] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [moveLeft, setMoveLeft] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [dialogHidden, setDialogHidden] = useState(false);
  const [promotion, setPromotion] = useState(false);
  const [hinting, setHinting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [movable, setMovable] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(sound);
  const [showMoves, setShowMoves] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);

  const reviewing = Boolean(review);
  const minKeep = side === "b" && !puzzle && !review ? 1 : 0;

  useEffect(() => {
    setShowMoves(window.innerWidth >= 900);
  }, []);

  useEffect(() => {
    sceneRef.current?.setMovable(movable);
  }, [movable]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    let cancelled = false;
    let noticeTimer: number | undefined;
    let hintTimer: number | undefined;
    const engine = createEngine();
    const timers = new Set<number>();
    const later = (callback: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        callback();
      }, ms);
      timers.add(id);
    };
    const snd = (sound: Sound) => playSound(sound, soundOn.current);
    const notify = (text: string) => {
      setNotice(text);
      window.clearTimeout(noticeTimer);
      noticeTimer = window.setTimeout(() => setNotice(""), 4000);
    };

    const game = new Chess();
    let selected: Square | null = null;
    let legal: Move[] = [];
    let pending: { from: Square; to: Square } | null = null;
    let thinking = false;
    let ended = false;
    let restoring = false;
    // Bumped on every new game, undo or restart, so replies to an older position are ignored.
    let epoch = 0;
    let moveStart = performance.now();
    let puzzleStep = 0;

    const names = PIECE_SETS[pieces].names;
    const scene = createBoardScene(el, { side, theme, pieces, onSquare: (square) => onSquare(square) });
    sceneRef.current = scene;

    // ---- showing the game on the board ---------------------------------------

    const kingSquare = (colour: Side): string | null => {
      for (const rank of game.board()) for (const cell of rank) if (cell && cell.type === "k" && cell.color === colour) return cell.square;
      return null;
    };

    const clearSelection = () => {
      selected = null;
      legal = [];
      scene.select(null, []);
    };

    const clearHint = () => {
      window.clearTimeout(hintTimer);
      scene.setHint(null, null);
    };

    /** Brings the status, move list and highlights in line with the game. */
    const sync = () => {
      setHistory(game.history());
      setStatus(review ? "" : describe(game, names));
      const verbose = game.history({ verbose: true });
      const last = verbose[verbose.length - 1];
      if (showLast && last && last.san !== "--") scene.setLast(last.from, last.to);
      else scene.setLast(null, null);
      scene.setCheck(game.inCheck() ? kingSquare(game.turn()) : null);
    };

    /** The moving of pieces for a move already made in `game`. */
    const show = (done: Move) => {
      if (done.isEnPassant()) scene.capture(done.to[0] + done.from[1]);
      else if (done.isCapture()) scene.capture(done.to);

      scene.move(done.from, done.to);
      if (done.promotion) scene.promote(done.to, done.promotion, done.color);

      const rank = done.from[1];
      if (done.isKingsideCastle()) scene.move("h" + rank, "f" + rank);
      if (done.isQueensideCastle()) scene.move("a" + rank, "d" + rank);
    };

    const sayMove = (done: Move) => snd(game.inCheck() ? "check" : done.isCapture() ? "capture" : "move");

    // ---- ending a game -------------------------------------------------------

    const finish = (outcome: Outcome, reason: string, headline?: string) => {
      ended = true;
      thinking = false;
      clearSelection();
      clearHint();
      clearGame();
      setMoveLeft(null);
      setStatus(reason);
      setDialogHidden(false);
      setResult({ outcome, text: headline ?? reason });
      snd(outcome === "win" ? "win" : outcome === "loss" ? "lose" : "draw");
      if (!restoring) recordGame({ outcome, reason, level, side, moves: game.history() });
    };

    /** After a move: is the game over? */
    const checkEnd = (): boolean => {
      if (game.isCheckmate()) {
        const youWon = game.turn() !== side;
        finish(youWon ? "win" : "loss", describe(game, names), youWon ? "You win by checkmate" : "You lose by checkmate");
        return true;
      }
      if (game.isDraw()) {
        finish("draw", describe(game, names));
        return true;
      }
      return false;
    };

    // ---- making moves --------------------------------------------------------

    const save = () => saveGame({ level, side, moveSeconds, moves: game.history(), puzzleId: puzzle?.id });

    const play = (from: string, to: string, promotion?: PieceSymbol) => {
      clearSelection();
      clearHint();
      moveStart = performance.now();
      const done = game.move({ from, to, promotion });
      show(done);
      sync();
      sayMove(done);
      save();
      checkEnd();
    };

    const maybeCpu = () => {
      if (puzzle || review || thinking || ended || game.isGameOver() || game.turn() === side) return;
      thinking = true;
      setStatus(`${names[OTHER[side]]} is thinking`);
      const mine = epoch;
      const startedAt = performance.now();
      void engine.bestMove(game.fen(), level).then((reply: EngineMove) => {
        // Move no faster than a person would, however quickly it was found.
        later(() => {
          if (cancelled || mine !== epoch) return;
          thinking = false;
          const moves = game.moves({ verbose: true });
          const pick = moves.find((m) => m.from === reply.from && m.to === reply.to && (m.promotion ?? "") === (reply.promotion ?? "")) ?? moves[0];
          if (pick) play(pick.from, pick.to, pick.promotion);
        }, Math.max(0, 450 - (performance.now() - startedAt)));
      });
    };

    /**
     * The player let the move timer run out: the turn passes to the opponent.
     * Chess has no pass, so this uses chess.js's null move, which it refuses
     * while in check; then a random legal move is played instead.
     */
    const skipTurn = () => {
      const skipped = game.turn();
      clearSelection();
      moveStart = performance.now();
      snd("skip");
      if (game.inCheck()) {
        const moves = game.moves({ verbose: true });
        const pick = moves[Math.floor(Math.random() * moves.length)];
        play(pick.from, pick.to, pick.promotion);
        notify(`${names[skipped]} ran out of time in check: a random move was played`);
      } else {
        game.move("--");
        sync();
        save();
        notify(`${names[skipped]} ran out of time: turn skipped`);
      }
      maybeCpu();
    };

    /** A puzzle move: right if it is the scripted one (or mates), otherwise taken back. */
    const puzzleMove = (from: string, to: string, promotion?: PieceSymbol) => {
      if (!puzzle) return;
      const expected = puzzle.solution[puzzleStep];
      const done = game.move({ from, to, promotion });
      if (done.lan !== expected && !game.isCheckmate()) {
        game.undo();
        snd("skip");
        notify("Not that one. Try again");
        return;
      }

      clearSelection();
      clearHint();
      show(done);
      sync();
      sayMove(done);
      save();
      puzzleStep += 1;

      if (game.isCheckmate() || puzzleStep >= puzzle.solution.length) {
        markSolved(puzzle.id);
        ended = true;
        clearGame();
        setResult({ outcome: "solved", text: "Puzzle solved" });
        setDialogHidden(false);
        snd("win");
        return;
      }

      const reply = puzzle.solution[puzzleStep];
      const mine = epoch;
      later(() => {
        if (cancelled || mine !== epoch) return;
        const answer = game.move({ from: reply.slice(0, 2), to: reply.slice(2, 4), promotion: reply[4] as PieceSymbol | undefined });
        puzzleStep += 1;
        show(answer);
        sync();
        sayMove(answer);
        save();
      }, 600);
    };

    const commit = (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (puzzle) puzzleMove(from, to, promotion);
      else {
        play(from, to, promotion);
        maybeCpu();
      }
    };

    // ---- clicks --------------------------------------------------------------

    const canAct = () => !review && !ended && !thinking && !pending && game.turn() === side && !game.isGameOver();

    const select = (square: Square) => {
      clearSelection();
      selected = square;
      legal = game.moves({ square, verbose: true });
      scene.select(square, showLegal ? legal.map((move) => ({ square: move.to, capture: move.isCapture() })) : []);
    };

    const onSquare = (square: Square) => {
      if (!canAct()) return;

      const options = legal.filter((candidate) => candidate.to === square);
      if (selected && options.length > 0) {
        if (options[0].promotion && autoQueen) {
          commit(selected, square, "q");
          return;
        }
        if (options[0].promotion) {
          // Ask which piece the pawn becomes before moving it.
          pending = { from: selected, to: square };
          clearSelection();
          setPromotion(true);
          return;
        }
        commit(selected, square);
        return;
      }

      const piece = game.get(square);
      if (piece && piece.color === game.turn()) select(square);
      else clearSelection();
    };

    // ---- starting, resuming, reviewing ---------------------------------------

    const replay = (moves: string[]) => {
      moves.forEach((san) => {
        if (san === "--") {
          game.move("--");
          return;
        }
        const move = game.moves({ verbose: true }).find((m) => m.san === san);
        if (move) show(game.move(move.san));
      });
    };

    /** Rebuilds the board from the start position (or the puzzle's) and replays `moves` at once. */
    const setup = (moves: string[] = []) => {
      epoch += 1;
      ended = false;
      thinking = false;
      pending = null;
      puzzleStep = moves.length;
      setPromotion(false);
      setConfirming(false);
      setResult(null);
      setDialogHidden(false);
      clearSelection();
      clearHint();

      if (puzzle) game.load(puzzle.fen);
      else game.reset();
      scene.reset(cellsOf(game));
      scene.setInstant(true);
      restoring = true;
      replay(moves);
      restoring = false;
      scene.setInstant(false);

      moveStart = performance.now();
      sync();
      maybeCpu();
    };

    actions.current = {
      newGame: () => {
        clearGame();
        setup();
      },

      undo: () => {
        if (review || puzzle || ended) return;
        const moves = game.history();
        // Take back the computer's reply as well, so it is your move again.
        const count = game.turn() === side ? 2 : 1;
        const keep = Math.max(minKeep, moves.length - count);
        if (keep >= moves.length) return;
        setup(moves.slice(0, keep));
        save();
      },

      resign: () => {
        if (review || puzzle || ended) return;
        setConfirming(false);
        finish("loss", "You resigned");
      },

      offerDraw: () => {
        if (!canAct()) return;
        // The computer takes a draw unless it is clearly ahead (by more than a pawn).
        if (material(game, OTHER[side]) - material(game, side) > 1) {
          notify(`${names[OTHER[side]]} declined the draw`);
          snd("skip");
        } else {
          finish("draw", "Draw agreed");
        }
      },

      hint: () => {
        if (!canAct()) return;
        setHinting(true);
        const mine = epoch;
        void engine.hint(game.fen()).then((move) => {
          setHinting(false);
          if (cancelled || mine !== epoch || ended) return;
          scene.setHint(move.from, move.to);
          snd("hint");
          window.clearTimeout(hintTimer);
          hintTimer = window.setTimeout(() => scene.setHint(null, null), 5000);
        });
      },

      promote: (type) => {
        const chosen = pending;
        pending = null;
        setPromotion(false);
        if (chosen && type) commit(chosen.from, chosen.to, type);
      },

      copyPgn: () => {
        game.setHeader("Event", "Checkmate");
        game.setHeader("White", side === "w" ? "Player" : `Computer (${level})`);
        game.setHeader("Black", side === "b" ? "Player" : `Computer (${level})`);
        navigator.clipboard
          .writeText(game.pgn())
          .then(() => notify("Game copied as PGN"))
          .catch(() => notify("Could not copy the game"));
      },

      goTo: (index) => {
        if (!review) return;
        const target = Math.max(0, Math.min(review.moves.length, index));
        setReviewIndex(target);
        setup(review.moves.slice(0, target));
      },
    };

    // ---- the move timer ------------------------------------------------------

    const timerId =
      moveSeconds && !review && !puzzle
        ? window.setInterval(() => {
            if (ended || game.isGameOver()) return;
            if (game.turn() !== side || thinking || pending) return setMoveLeft(null);
            const left = moveSeconds * 1000 - (performance.now() - moveStart);
            if (left <= 0) skipTurn();
            else setMoveLeft(left);
          }, 200)
        : undefined;

    // ---- go ------------------------------------------------------------------

    loadChessModel()
      .then((model) => {
        if (cancelled) return;
        scene.setModel(model);
        setReady(true);
        setup(review ? [] : resume);
      })
      .catch(() => setStatus("The 3D pieces failed to load"));

    return () => {
      cancelled = true;
      window.clearInterval(timerId);
      window.clearTimeout(noticeTimer);
      window.clearTimeout(hintTimer);
      timers.forEach((id) => window.clearTimeout(id));
      engine.dispose();
      scene.dispose();
      sceneRef.current = null;
      actions.current = NOTHING;
    };
    // The game is set up once per mount; changing what is played remounts via `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = actions.current;
  const opening = openingName(history);
  const over = result !== null;
  const canUndo = !reviewing && !puzzle && !over && history.length > minKeep;
  const button = `${solid} border-ink/20 h-action shrink-0 border-l px-3 whitespace-nowrap disabled:opacity-50`;

  const toggleSound = () => {
    const next = !soundEnabled;
    soundOn.current = next;
    setSoundEnabled(next);
    saveSettings({ ...loadSettings(), sound: next });
  };

  const movePairs: string[][] = [];
  history.forEach((san, index) => {
    if (index % 2 === 0) movePairs.push([san]);
    else movePairs[movePairs.length - 1].push(san);
  });

  return (
    <div className="relative size-full">
      <div ref={host} className="size-full" />

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className={`${ruled} flex h-action items-center px-shell-gutter`}>Loading the pieces</p>
        </div>
      )}

      <div className="absolute top-shell-gutter left-shell-gutter flex max-w-[55%] flex-col md:max-w-[30%]">
        <p className={`${ruled} flex min-h-action items-center px-shell-gutter`} aria-live="polite">
          {notice || (reviewing ? `${review?.title}: move ${reviewIndex} of ${review?.moves.length}` : puzzle ? `${puzzle.title}. ${puzzle.goal}` : status || "Loading")}
        </p>
        {moveLeft !== null && (
          <p className={`${moveLeft <= 5000 ? "bg-ink text-surface-invert" : ruled} text-body flex h-action w-48 items-center justify-between px-shell-gutter tabular-nums`}>
            <span>Your move</span>
            <span>{format(moveLeft)}</span>
          </p>
        )}
        {opening && !puzzle && <p className={`${ruled} flex min-h-action items-center px-shell-gutter`}>{opening}</p>}
      </div>

      {/* A scrolling strip along the bottom on phones; wrapped buttons at the top right from `md`. */}
      <div className="absolute inset-x-0 bottom-0 flex overflow-x-auto md:inset-x-auto md:top-shell-gutter md:right-shell-gutter md:bottom-auto md:max-w-[62%] md:flex-wrap md:justify-end md:overflow-visible">
        <button
          type="button"
          onClick={() => {
            clearGame();
            onMenu();
          }}
          className={button}
        >
          Menu
        </button>
        {!reviewing && (
          <button type="button" onClick={() => act.newGame()} className={button}>
            {puzzle ? "Restart" : "New game"}
          </button>
        )}
        {canUndo && (
          <button type="button" onClick={() => act.undo()} className={button}>
            Undo
          </button>
        )}
        {!reviewing && !over && (
          <button type="button" disabled={hinting} onClick={() => act.hint()} className={button}>
            {hinting ? "Thinking" : "Hint"}
          </button>
        )}
        {!reviewing && !puzzle && !over && (
          <>
            <button type="button" onClick={() => act.offerDraw()} className={button}>
              Offer draw
            </button>
            {confirming ? (
              <button type="button" onClick={() => act.resign()} className={`${button} bg-ink text-surface-invert`}>
                Confirm resign
              </button>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className={button}>
                Resign
              </button>
            )}
          </>
        )}
        {!puzzle && history.length > 0 && (
          <button type="button" onClick={() => act.copyPgn()} className={button}>
            Copy PGN
          </button>
        )}
        <button type="button" aria-pressed={showMoves} onClick={() => setShowMoves((value) => !value)} className={button}>
          Moves
        </button>
        <button type="button" aria-pressed={soundEnabled} onClick={toggleSound} className={button}>
          {soundEnabled ? "Sound on" : "Sound off"}
        </button>
        {movable && (
          <button type="button" onClick={() => sceneRef.current?.resetView()} className={button}>
            Reset view
          </button>
        )}
        <button
          type="button"
          aria-pressed={movable}
          onClick={() => setMovable((value) => !value)}
          className={movable ? "bg-ink text-surface-invert text-body h-action shrink-0 cursor-pointer border-l border-ink/20 px-3 whitespace-nowrap" : button}
        >
          {movable ? "Lock view" : "Move view"}
        </button>
      </div>

      {showMoves && (
        <div
          data-lenis-prevent
          className={`${ruled} absolute bottom-[calc(var(--spacing-action)+var(--spacing-shell-gutter))] left-shell-gutter max-h-40 w-[calc(100%-var(--spacing-shell-gutter)*2)] overflow-y-auto p-3 md:top-[calc(var(--spacing-shell-gutter)*3+var(--spacing-action)*3)] md:right-shell-gutter md:bottom-auto md:left-auto md:max-h-[35%] md:w-52`}
        >
          {movePairs.length === 0 ? (
            <p>No moves yet</p>
          ) : (
            <ol className="tabular-nums">
              {movePairs.map((pair, index) => (
                <li key={index} className="flex gap-3">
                  <span className="w-6 opacity-60">{index + 1}.</span>
                  <span className="w-16">{pair[0]}</span>
                  <span>{pair[1]}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {reviewing && (
        <div className="absolute bottom-[calc(var(--spacing-action)+var(--spacing-shell-gutter))] left-1/2 flex -translate-x-1/2 md:bottom-shell-gutter">
          {(
            [
              ["Start", 0],
              ["Back", reviewIndex - 1],
              ["Next", reviewIndex + 1],
              ["End", review?.moves.length ?? 0],
            ] as const
          ).map(([label, index]) => (
            <button key={label} type="button" onClick={() => act.goTo(index)} className={`${button} px-shell-gutter`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {promotion && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`${ruled} flex flex-col gap-3 p-shell-gutter`}>
            <p>Promote the pawn to</p>
            <div className="border-rule grid grid-cols-4 border">
              {(["q", "r", "b", "n"] as const).map((type, index) => (
                <button key={type} type="button" onClick={() => act.promote(type)} className={`${choice(false)} ${index > 0 ? "border-rule border-l" : ""} px-3`}>
                  {PIECE_NAME[type]}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => act.promote(null)} className={`${solid} h-action`}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {result && !dialogHidden && (
        <div className="absolute inset-0 flex items-center justify-center px-shell-inset">
          <div className="border-rule bg-background text-foreground w-full max-w-sm border">
            <h2 className="text-display font-display p-shell-gutter">
              {result.outcome === "win" || result.outcome === "solved" ? "Victory" : result.outcome === "loss" ? "Defeat" : "Draw"}
            </h2>
            <p className="border-rule border-t p-shell-gutter">{result.text}</p>
            <div className="border-rule flex flex-col gap-3 border-t p-shell-gutter">
              {result.outcome === "solved" && onNextPuzzle && (
                <button type="button" onClick={onNextPuzzle} className={`${solid} h-action`}>
                  Next puzzle
                </button>
              )}
              <button type="button" onClick={() => act.newGame()} className={`${solid} h-action`}>
                {puzzle ? "Try again" : "Play again"}
              </button>
              <button type="button" onClick={() => setDialogHidden(true)} className={`${ruled} h-action`}>
                View the board
              </button>
              <button type="button" onClick={onMenu} className={`${ruled} h-action`}>
                Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
