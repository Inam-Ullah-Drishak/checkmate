"use client";

/**
 * Victory motion, all springs: the result panel pops in, and fireworks launch,
 * burst and fade in a loop for as long as the dialog is open (every button on
 * the dialog closes it, which unmounts this and stops the show).
 */

import { animated, useSpring, useSprings } from "@react-spring/web";
import { useState, type ReactNode } from "react";

const SPARKS = 22;
const REACH = 90;
/** Where each firework goes off, as a percentage of the board area. */
const BURSTS = [
  { left: 22, top: 30, colour: "bg-ice-top" },
  { left: 78, top: 28, colour: "bg-ice-bottom" },
  { left: 50, top: 18, colour: "bg-foreground" },
  { left: 32, top: 58, colour: "bg-ice-bottom" },
  { left: 68, top: 60, colour: "bg-ice-top" },
  { left: 50, top: 42, colour: "bg-foreground" },
] as const;
/** The share of one cycle spent rising; the rest is the burst. */
const RISE = 0.25;
const CYCLE_MS = 2600;

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Springs the panel in from small and transparent when it mounts. */
export const Pop = ({ children, className }: { children: ReactNode; className?: string }) => {
  const style = useSpring({ from: { s: 0.8, o: 0 }, to: { s: 1, o: 1 }, config: { tension: 220, friction: 16 } });
  return (
    <animated.div className={className} style={{ opacity: style.o, transform: style.s.to((s) => `scale(${s})`) }}>
      {children}
    </animated.div>
  );
};

export const Fireworks = () => {
  // Each spark's direction and strength, fixed once per mount.
  const [sparks] = useState(() =>
    BURSTS.map(() =>
      Array.from({ length: SPARKS }, (_, index) => ({
        angle: (index / SPARKS) * Math.PI * 2 + Math.random() * 0.2,
        reach: REACH * (0.55 + Math.random() * 0.45),
      })),
    ),
  );

  // One progress value per firework, 0 to 1, looping; everything else is derived from it.
  const [progress] = useSprings(BURSTS.length, (index) => ({
    from: { p: 0 },
    to: async (next: (props: { p?: number; immediate?: boolean; delay?: number; config?: { duration: number } }) => Promise<void>) => {
      while (true) {
        await next({ p: 0, immediate: true, delay: 250 + index * 330 });
        await next({ p: 1, config: { duration: CYCLE_MS } });
      }
    },
  }));

  if (reduced()) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {BURSTS.map(({ left, top, colour }, burst) => {
        const { p } = progress[burst];
        return (
          <div key={burst} className="absolute" style={{ left: `${left}%`, top: `${top}%` }}>
            <animated.span
              className={`absolute block h-6 w-0.5 rounded-full ${colour}`}
              style={{
                opacity: p.to((v) => (v < RISE ? 1 : 0)),
                transform: p.to((v) => `translate3d(0, ${(1 - Math.min(v / RISE, 1)) * 60}vh, 0)`),
              }}
            />
            {sparks[burst].map((spark, index) => (
              <animated.span
                key={index}
                className={`absolute block size-1.5 rounded-full ${colour}`}
                style={{
                  opacity: p.to((v) => (v < RISE ? 0 : 1 - ((v - RISE) / (1 - RISE)) ** 1.5)),
                  transform: p.to((v) => {
                    const e = Math.max(0, (v - RISE) / (1 - RISE));
                    const out = 1 - (1 - e) ** 3;
                    return `translate3d(${Math.cos(spark.angle) * spark.reach * out}px, ${Math.sin(spark.angle) * spark.reach * out + 70 * e * e}px, 0)`;
                  }),
                }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
};
