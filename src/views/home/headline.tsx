"use client";

/**
 * The hero headline, set letter by letter.
 *
 * One `TextEngine` per data line rather than one for the whole string: the
 * design's break is content, not a consequence of the column width, and giving
 * each line its own engine is also what lets `whitespace-nowrap` hold a line
 * together from `sm` up without the other one being dragged along.
 *
 * Two details that are load-bearing here:
 *
 * - **No `overflow`.** The clip is the usual way to hide letters before they
 *   slide in, but it clips to the *line-height* box, and this headline is set at
 *   80% leading on purpose. Under `overflow` that shaves the glyphs — see
 *   [[text-engine]]. Fading and translating without a clip gets the same read at
 *   this size and stays honest about the leading.
 * - **`enabled` is the curtain's `done` flag.** The engine would otherwise play
 *   its whole stagger while the load curtain is still opaque, and the headline
 *   would simply be *there* when the curtain lifted.
 *
 * 📖 Docs: obsidian/frontend/home-hero.md
 */

import { RobotText as TextEngine } from "@/components/common/robot-text";

import { usePreloader } from "@/lib/preloader";

export interface HeadlineProps {
  /** One entry per line, as in the design. */
  lines: string[];
}

/** Milliseconds between two letters, and between one line and the next. */
const LETTER_STAGGER = 26;
const LINE_DELAY = 260;
/** After the curtain has gone, before the first letter moves. */
const LEAD_IN = 120;

export const Headline = ({ lines }: HeadlineProps) => {
  const done = usePreloader((state) => state.done);

  return (
    <p id="hero-headline" className="text-display wide:text-display-wide font-display">
      {lines.map((line, index) => (
        <TextEngine
          key={line}
          tag="span"
          mode="once"
          enabled={done}
          // The engine's container is a flex row, so a line breaks when its
          // *words* wrap — `white-space` has nothing to say about it and only
          // `flex-wrap` does. It has to be `!important`: the engine writes
          // `flex-wrap: wrap` as an inline style, which a plain utility cannot
          // beat. Below `sm` that default is left alone, because there the
          // display face is far larger against the column and one line will not
          // fit however much it is told to.
          className="sm:flex-nowrap!"
          letterOut={{ opacity: 0, y: "0.28em" }}
          letterIn={{ opacity: 1, y: "0em" }}
          letterStagger={LETTER_STAGGER}
          letterConfig={{ tension: 260, friction: 30 }}
          delayIn={LEAD_IN + index * LINE_DELAY}
        >
          {line}
        </TextEngine>
      ))}
    </p>
  );
};
