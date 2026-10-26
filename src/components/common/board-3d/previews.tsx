"use client";

/**
 * Small pictures for the settings page: a flat view of each board look, and a
 * pair of kings (one per team) for each piece design, shaded to hint at the
 * material. Drawn as SVG from the same colours the 3D scene uses, so the
 * preview cannot drift from what you get in a match.
 */

import { useEffect, useId, useState } from "react";

import { fade } from "@/components/common/board-3d/ui";
import type { Diagram } from "@/data/rules";
import { BOARD_THEMES } from "@/lib/chess/board-themes";
import { KING_PATHS } from "@/lib/king-mark";
import { kingImages, type KingImages } from "@/lib/chess/piece-previews";
import { PIECE_SETS, type Finish, type PieceSetId } from "@/lib/chess/piece-sets";
import type { ThemeId } from "@/lib/chess/storage";

/** Mixes a #rrggbb colour towards white (amount > 0) or black (amount < 0). */
const shade = (hex: string, amount: number): string => {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  const target = amount > 0 ? 255 : 0;
  const mixed = channels.map((value) => Math.round(value + (target - value) * Math.abs(amount)));
  return `#${mixed.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
};

export const BoardPreview = ({ theme }: { theme: ThemeId }) => {
  const { light, dark, frame } = BOARD_THEMES[theme];
  return (
    <svg viewBox="0 0 72 72" className="h-full" aria-hidden="true">
      <rect width="72" height="72" fill={frame} />
      {Array.from({ length: 36 }, (_, index) => {
        const column = index % 6;
        const row = Math.floor(index / 6);
        return <rect key={index} x={6 + column * 10} y={6 + row * 10} width="10" height="10" fill={(row + column) % 2 === 0 ? light : dark} />;
      })}
    </svg>
  );
};

/** One king, filled with a gradient that reads as the finish: bright top, deeper bottom, sharper for metals. */
const King = ({ finish, x, id }: { finish: Finish; x: number; id: string }) => {
  const shiny = finish.metalness > 0.4;
  return (
    <g transform={`translate(${x} 0)`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={shade(finish.color, shiny ? -0.35 : -0.2)} />
          <stop offset={shiny ? 0.3 : 0.4} stopColor={shade(finish.color, shiny ? 0.55 : 0.2)} />
          <stop offset="0.65" stopColor={finish.color} />
          <stop offset="1" stopColor={shade(finish.color, -0.45)} />
        </linearGradient>
      </defs>
      <path d={KING_PATHS.cross} fill={`url(#${id})`} />
      <path d={KING_PATHS.head} fill={`url(#${id})`} />
      <path d={KING_PATHS.collar} fill={shade(finish.color, -0.3)} />
      <path d={KING_PATHS.base} fill={`url(#${id})`} />
    </g>
  );
};

export const PiecesPreview = ({ set }: { set: PieceSetId }) => {
  const id = useId();
  const { w, b } = PIECE_SETS[set];
  // The real 3D kings, rendered once from the game's own model; the flat drawing stands in until then.
  const [images, setImages] = useState<KingImages | null>(null);
  useEffect(() => {
    let alive = true;
    kingImages()
      .then((rendered) => alive && setImages(rendered))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (images) {
    return (
      <span className="flex h-full items-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- small generated data URLs */}
        <img src={images[set].w} alt="" className="h-full" />
        {/* eslint-disable-next-line @next/next/no-img-element -- small generated data URLs */}
        <img src={images[set].b} alt="" className="h-full" />
      </span>
    );
  }

  return (
    <svg viewBox="0 0 136 64" className="h-full" aria-hidden="true">
      <King finish={w} x={0} id={`${id}w`} />
      <King finish={b} x={72} id={`${id}b`} />
    </svg>
  );
};

const STROKE = "#ffffff";

/** A clock face with the share of a minute filled in; no limit is an infinity sign. */
export const ClockPreview = ({ seconds }: { seconds: number }) => {
  if (!seconds) {
    return (
      <svg viewBox="0 0 64 64" className="h-full" aria-hidden="true">
        <path d="M32 32c-5-8-14-8-14 0s9 8 14 0 14-8 14 0-9 8-14 0z" fill="none" stroke={STROKE} strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }
  const angle = (Math.min(seconds, 60) / 60) * Math.PI * 2;
  const x = 32 + 24 * Math.sin(angle);
  const y = 32 - 24 * Math.cos(angle);
  return (
    <svg viewBox="0 0 64 64" className="h-full" aria-hidden="true">
      <circle cx="32" cy="32" r="26" fill="none" stroke={STROKE} strokeOpacity="0.35" strokeWidth="3" />
      {seconds >= 60 ? (
        <circle cx="32" cy="32" r="24" fill={STROKE} fillOpacity="0.85" />
      ) : (
        <path d={`M32 32V8A24 24 0 ${angle > Math.PI ? 1 : 0} 1 ${x} ${y}Z`} fill={STROKE} fillOpacity="0.85" />
      )}
    </svg>
  );
};

/** A loudspeaker with sound waves, or crossed out. */
export const SoundPreview = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 64 64" className="h-full" aria-hidden="true">
    <path d="M10 24h10l14-12v40L20 40H10z" fill={STROKE} />
    {on ? (
      <>
        <path d="M42 24c4 4 4 12 0 16" fill="none" stroke={STROKE} strokeWidth="4" strokeLinecap="round" />
        <path d="M49 17c8 8 8 22 0 30" fill="none" stroke={STROKE} strokeWidth="4" strokeLinecap="round" />
      </>
    ) : (
      <path d="M44 24l14 16M58 24L44 40" fill="none" stroke={STROKE} strokeWidth="4" strokeLinecap="round" />
    )}
  </svg>
);

/** A tiny board, with the dots for legal moves and/or the last-move squares drawn on it. */
export const MovesPreview = ({ dots = false, last = false }: { dots?: boolean; last?: boolean }) => (
  <svg viewBox="0 0 64 64" className="h-full" aria-hidden="true">
    {Array.from({ length: 16 }, (_, index) => {
      const column = index % 4;
      const row = Math.floor(index / 4);
      return <rect key={index} x={column * 16} y={row * 16} width="16" height="16" fill={(row + column) % 2 === 0 ? "#ecebe6" : "#2c2c2c"} />;
    })}
    {last && (
      <>
        <rect x="16" y="32" width="16" height="16" fill="#f2d34a" fillOpacity="0.75" />
        <rect x="16" y="16" width="16" height="16" fill="#f2d34a" fillOpacity="0.75" />
      </>
    )}
    {dots && (
      <>
        <circle cx="40" cy="24" r="4" fill="#35d07f" />
        <circle cx="40" cy="40" r="4" fill="#35d07f" />
        <circle cx="56" cy="8" r="4" fill="#ff5a5a" />
      </>
    )}
  </svg>
);

/** A pawn reaching the end of the board: it becomes a queen at once, or asks first. */
export const PromotionPreview = ({ auto }: { auto: boolean }) => (
  <svg viewBox="0 0 96 64" className="h-full" aria-hidden="true">
    <circle cx="20" cy="26" r="9" fill={STROKE} />
    <path d="M10 56c0-12 4-16 10-16s10 4 10 16z" fill={STROKE} />
    <path d="M38 32h20m-7-7 7 7-7 7" fill="none" stroke={STROKE} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    {auto ? (
      <path d="M68 18l5 14 7-10 7 10 5-14v34H68z" fill={STROKE} />
    ) : (
      <text x="80" y="46" textAnchor="middle" fontSize="36" fontWeight="700" fill={STROKE}>
        ?
      </text>
    )}
  </svg>
);

/** A row of picture cards: the picked one turns white. */
export const Picker = <T extends string | number>({
  label,
  options,
  value,
  onChange,
  preview,
  name,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  preview: (option: T) => React.ReactNode;
  name: (option: T) => string;
}) => (
  <div className="flex flex-wrap gap-3" role="group" aria-label={label}>
    {options.map((option) => {
      const on = value === option;
      return (
        <button
          key={option}
          type="button"
          aria-pressed={on}
          onClick={() => onChange(option)}
          className={`flex w-[16.5rem] max-w-full cursor-pointer flex-col text-left ${fade} ${on ? "bg-surface-invert text-ink" : "bg-veil hover:bg-foreground/15"}`}
        >
          <span className="bg-ink flex h-36 items-center justify-center p-4">{preview(option)}</span>
          <span className="text-body p-3">{name(option)}</span>
        </button>
      );
    })}
  </div>
);

// ---- rules diagrams -----------------------------------------------------------------

const GLYPH: Record<string, string> = { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" };
const FILES = "abcdefgh";

/** Square name to the top-left corner of its cell, in a board drawn 8 x 10 units wide, a1 at the bottom left. */
const cell = (name: string): { x: number; y: number } => ({ x: FILES.indexOf(name[0]) * 10, y: (8 - Number(name[1])) * 10 });
const centre = (name: string): { x: number; y: number } => ({ x: cell(name).x + 5, y: cell(name).y + 5 });

/** "wK@e4": the piece's colour, kind and square. */
const parse = (code: string): { white: boolean; kind: string; at: string } => ({ white: code[0] === "w", kind: code[1], at: code.slice(3) });

const Piece = ({ code, faded = false }: { code: string; faded?: boolean }) => {
  const { white, kind, at } = parse(code);
  const { x, y } = centre(at);
  return (
    <text
      x={x}
      y={y + 4.4}
      textAnchor="middle"
      fontSize="13.5"
      fontFamily="'Segoe UI Symbol','Noto Sans Symbols 2','Apple Symbols','DejaVu Sans',serif"
      fill={white ? "#ffffff" : "#15161a"}
      stroke={white ? "#15161a" : "#ffffff"}
      strokeWidth="0.5"
      paintOrder="stroke"
      opacity={faded ? 0.45 : 1}
    >
      {GLYPH[kind]}
    </text>
  );
};

/** A small board that shows one rule: where a piece can go, what it can capture, what check looks like. */
export const RuleDiagram = ({ diagram }: { diagram: Diagram }) => {
  const id = useId();
  return (
    <svg viewBox="0 0 80 80" className="w-full" role="img" aria-label="Chess diagram">
      <defs>
        <marker id={`${id}a`} viewBox="0 0 6 6" refX="4.5" refY="3" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0 0l6 3-6 3z" fill="#ffd23f" />
        </marker>
      </defs>
      {Array.from({ length: 64 }, (_, index) => {
        const file = index % 8;
        const row = Math.floor(index / 8);
        return <rect key={index} x={file * 10} y={row * 10} width="10" height="10" fill={(file + row) % 2 === 0 ? "#e9e7df" : "#5b7bb0"} />;
      })}
      {diagram.coords &&
        FILES.split("").map((file, index) => (
          <text key={file} x={index * 10 + 9.2} y="79" fontSize="2.8" textAnchor="middle" fill="#2c3f66" fontWeight="700">
            {file}
          </text>
        ))}
      {diagram.coords &&
        [1, 2, 3, 4, 5, 6, 7, 8].map((rank) => (
          <text key={rank} x="0.8" y={(8 - rank) * 10 + 3.2} fontSize="2.8" fill="#2c3f66" fontWeight="700">
            {rank}
          </text>
        ))}
      {diagram.marks?.map((name) => (
        <rect key={name} x={cell(name).x} y={cell(name).y} width="10" height="10" fill="#ff3b3b" fillOpacity="0.6" />
      ))}
      {diagram.dots?.map((name) => (
        <circle key={name} cx={centre(name).x} cy={centre(name).y} r="2" fill="#1fbf6d" />
      ))}
      {diagram.rings?.map((name) => (
        <circle key={name} cx={centre(name).x} cy={centre(name).y} r="4.4" fill="none" stroke="#ff3b3b" strokeWidth="1.2" />
      ))}
      {diagram.arrows?.map(([from, to]) => (
        <line
          key={from + to}
          x1={centre(from).x}
          y1={centre(from).y}
          x2={centre(to).x}
          y2={centre(to).y}
          stroke="#ffd23f"
          strokeWidth="1.3"
          strokeOpacity="0.9"
          strokeLinecap="round"
          markerEnd={`url(#${id}a)`}
        />
      ))}
      {diagram.ghosts?.map((code) => (
        <Piece key={code} code={code} faded />
      ))}
      {diagram.pieces.map((code) => (
        <Piece key={code} code={code} />
      ))}
    </svg>
  );
};
