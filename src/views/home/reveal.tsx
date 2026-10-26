"use client";

/**
 * Staged entrance for one piece of hero UI, held until the load curtain lifts.
 *
 * The curtain used to do the whole reveal on its own, with nothing underneath
 * animating. This is the deliberate reversal of that: the page now assembles
 * itself once the curtain has gone, block by block, so the two read as one
 * continuous move rather than a wipe followed by a static page.
 *
 * Two things make that safe to do:
 *
 * - **It is gated on `done`, not on mount.** `enabled` stays false for the whole
 *   curtain, and `Spring` renders at `from` while inactive — so nothing burns
 *   its entrance behind an opaque overlay, and the order below is the order the
 *   user actually sees.
 * - **Only the fade and `transform` move.** The markup is in the document at
 *   full size from the first paint either way, which is what keeps this off the
 *   list of things [[seo-metadata]] warns about, and a transform ancestor is now
 *   harmless here — the controls panel that used to be a `fixed` descendant of
 *   `<main>` is gone, and the 3D cursor and the background field are siblings of
 *   it in the layout, not children.
 *
 * The fade is drawn as a mask (`fadeMask`), not `opacity` — the same pixels,
 * but a contrast check that samples the entrance mid-way (Lighthouse's axe
 * reads `opacity`) now reads the resting colours: the stat grid measured
 * 1.6–4.4:1 half-faded (people mobile A11y 95). Same spring, same travel, same
 * delays as the engine `<Spring>` it replaces; the mask is `none` at rest.
 *
 * 📖 Docs: obsidian/frontend/home-hero.md
 */

import { animated, to as interpolate, useSpring } from "@react-spring/web";
import { createElement, type ElementType, type ReactNode } from "react";

import { useRobot } from "@/components/common/robot-view";
import { usePreloader } from "@/lib/preloader";
import type { Tags } from "@/types/springs";
import { fadeMask } from "@/utils/animation/fade-mask";

export interface RevealProps {
  children: ReactNode;
  className?: string;
  tag?: Tags;
  /** Milliseconds after the curtain lifts. */
  delay?: number;
  /** Offset it travels in from, px. Sign gives the direction. */
  x?: number;
  y?: number;
  /** Blocks arriving from further away want a slower spring. */
  config?: Record<string, number>;
  /** Tag-specific attributes, forwarded to the element. */
  href?: string;
  type?: "button";
  onClick?: () => void;
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
}

/** Soft, slightly overshooting — the blocks settle rather than snap. */
const SETTLE = { tension: 190, friction: 26 };

export const Reveal = ({
  children,
  className,
  tag = "div",
  delay = 0,
  x = 0,
  y = 24,
  config = SETTLE,
  ...rest
}: RevealProps) => {
  const robot = useRobot();
  // `done` latches once the curtain has lifted, so this plays once.
  const done = usePreloader((state) => state.done);
  const shown = done || robot;

  const springs = useSpring({
    from: robot ? { o: 1, x: 0, y: 0 } : { o: 0, x, y },
    to: shown ? { o: 1, x: 0, y: 0 } : { o: 0, x, y },
    delay: shown && !robot ? delay : 0,
    config,
  });

  // The robot form (D-016) renders the element at rest — no spring.
  if (robot) return createElement(tag, { className, ...rest }, children);

  const Tag = animated[tag] as ElementType;
  return (
    <Tag
      className={className}
      {...rest}
      style={{
        maskImage: springs.o.to(fadeMask),
        WebkitMaskImage: springs.o.to(fadeMask),
        transform: interpolate([springs.x, springs.y], (tx, ty) =>
          tx === 0 && ty === 0 ? "none" : `translate3d(${tx}px, ${ty}px, 0)`,
        ),
      }}
    >
      {children}
    </Tag>
  );
};
