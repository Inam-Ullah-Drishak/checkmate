"use client";

/**
 * Throwaway test page: ten background / hero ideas, each a live canvas.
 * Pick a number; then delete this folder and `app/ideas`.
 */

import { useEffect, useRef } from "react";

import { subscribeToTicker } from "@/lib/animation/ticker";

type Draw = (c: CanvasRenderingContext2D, w: number, h: number, t: number) => void;

const TAU = Math.PI * 2;
/** Deterministic pseudo-random in 0..1, so every frame places the same particles. */
const rnd = (i: number, k = 0): number => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const sky = (c: CanvasRenderingContext2D, h: number, a: string, b: string): void => {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  c.fillStyle = g;
};

const blob = (c: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void => {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
};

const IDEAS: { name: string; note: string; draw: Draw }[] = [
  {
    name: "Snowfall",
    note: "Cold gradient, two depths of snow (current).",
    draw: (c, w, h, t) => {
      sky(c, h, "#0a2a6b", "#8fb8f0");
      c.fillRect(0, 0, w, h);
      c.fillStyle = "#fff";
      for (let i = 0; i < 70; i++) {
        const d = rnd(i);
        const y = (rnd(i, 1) * h + t * (15 + d * 45)) % h;
        const x = rnd(i, 2) * w + Math.sin(t * 0.6 + i) * 10;
        c.globalAlpha = 0.35 + d * 0.5;
        c.beginPath();
        c.arc(x, y, 1 + d * 2.5, 0, TAU);
        c.fill();
      }
      c.globalAlpha = 1;
    },
  },
  {
    name: "Aurora",
    note: "Soft green and violet light over a night sky.",
    draw: (c, w, h, t) => {
      sky(c, h, "#030b1f", "#0b1d3d");
      c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = "lighter";
      const cols = ["rgba(60,255,170,.35)", "rgba(110,120,255,.3)", "rgba(40,220,255,.25)"];
      cols.forEach((col, i) => {
        blob(c, w * (0.3 + 0.4 * Math.sin(t * 0.3 + i * 2)), h * (0.3 + 0.1 * Math.cos(t * 0.4 + i)), w * 0.55, col);
      });
      c.globalCompositeOperation = "source-over";
    },
  },
  {
    name: "Glass orbs",
    note: "Big translucent spheres floating up.",
    draw: (c, w, h, t) => {
      sky(c, h, "#0d2c73", "#1b57c4");
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < 7; i++) {
        const r = w * (0.08 + rnd(i) * 0.12);
        const x = rnd(i, 1) * w + Math.sin(t * 0.4 + i) * 20;
        const y = h + r - ((t * (8 + rnd(i, 2) * 14) + rnd(i, 3) * h * 2) % (h + r * 2));
        const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
        g.addColorStop(0, "rgba(255,255,255,.35)");
        g.addColorStop(1, "rgba(255,255,255,.04)");
        c.fillStyle = g;
        c.beginPath();
        c.arc(x, y, r, 0, TAU);
        c.fill();
      }
    },
  },
  {
    name: "Ice crystals",
    note: "Slowly turning snowflake outlines.",
    draw: (c, w, h, t) => {
      sky(c, h, "#071a40", "#17407f");
      c.fillRect(0, 0, w, h);
      c.strokeStyle = "rgba(210,235,255,.7)";
      c.lineWidth = 1.2;
      for (let i = 0; i < 9; i++) {
        const r = 10 + rnd(i) * 22;
        const x = rnd(i, 1) * w;
        const y = (rnd(i, 2) * h + t * 10 * (0.5 + rnd(i, 3))) % h;
        c.save();
        c.translate(x, y);
        c.rotate(t * 0.3 * (rnd(i, 4) - 0.5) + i);
        c.beginPath();
        for (let k = 0; k < 6; k++) {
          c.moveTo(0, 0);
          c.lineTo(0, -r);
          c.moveTo(0, -r * 0.6);
          c.lineTo(-r * 0.25, -r * 0.82);
          c.moveTo(0, -r * 0.6);
          c.lineTo(r * 0.25, -r * 0.82);
          c.rotate(TAU / 6);
        }
        c.stroke();
        c.restore();
      }
    },
  },
  {
    name: "Neon grid",
    note: "Perspective floor grid rolling toward you.",
    draw: (c, w, h, t) => {
      sky(c, h, "#070b2a", "#1a2a7a");
      c.fillRect(0, 0, w, h);
      const hz = h * 0.45;
      c.strokeStyle = "rgba(120,200,255,.55)";
      c.lineWidth = 1;
      c.beginPath();
      for (let i = -10; i <= 10; i++) {
        c.moveTo(w / 2 + i * 6, hz);
        c.lineTo(w / 2 + i * w * 0.18, h);
      }
      const p = (t * 0.4) % 1;
      for (let i = 0; i < 9; i++) {
        const y = hz + (h - hz) * ((i + p) / 9) ** 2.2;
        c.moveTo(0, y);
        c.lineTo(w, y);
      }
      c.stroke();
    },
  },
  {
    name: "Starfield",
    note: "Twinkling stars with a slow drift.",
    draw: (c, w, h, t) => {
      sky(c, h, "#02040f", "#0c1a44");
      c.fillRect(0, 0, w, h);
      c.fillStyle = "#fff";
      for (let i = 0; i < 90; i++) {
        c.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * (0.5 + rnd(i)) + i));
        const x = (rnd(i, 1) * w + t * (2 + rnd(i, 2) * 6)) % w;
        c.fillRect(x, rnd(i, 3) * h, 1 + rnd(i, 4) * 1.5, 1 + rnd(i, 4) * 1.5);
      }
      c.globalAlpha = 1;
    },
  },
  {
    name: "Gold dust",
    note: "Warm glowing particles rising from the dark.",
    draw: (c, w, h, t) => {
      sky(c, h, "#0b0a10", "#2a1c08");
      c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = "lighter";
      for (let i = 0; i < 40; i++) {
        const y = h - ((rnd(i, 1) * h + t * (10 + rnd(i, 2) * 25)) % h);
        const x = rnd(i, 3) * w + Math.sin(t * 0.5 + i) * 12;
        blob(c, x, y, 4 + rnd(i, 4) * 10, "rgba(255,200,90,.55)");
      }
      c.globalCompositeOperation = "source-over";
    },
  },
  {
    name: "Flow lines",
    note: "Thin contour lines gently undulating.",
    draw: (c, w, h, t) => {
      sky(c, h, "#0a2a6b", "#0f5ddf");
      c.fillRect(0, 0, w, h);
      c.lineWidth = 1;
      for (let i = 0; i < 14; i++) {
        c.strokeStyle = `rgba(255,255,255,${0.1 + i * 0.015})`;
        c.beginPath();
        for (let x = 0; x <= w; x += 6) {
          const y = h * (0.1 + i * 0.065) + Math.sin(x * 0.02 + t * 0.7 + i * 0.5) * 12 + Math.sin(x * 0.007 - t * 0.4) * 10;
          if (x === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.stroke();
      }
    },
  },
  {
    name: "Drifting pieces",
    note: "Faint chess glyphs floating and turning.",
    draw: (c, w, h, t) => {
      sky(c, h, "#0a2a6b", "#0f4cc0");
      c.fillRect(0, 0, w, h);
      const glyphs = "♔♕♖♗♘♙";
      c.textAlign = "center";
      c.textBaseline = "middle";
      for (let i = 0; i < 12; i++) {
        c.font = `${22 + rnd(i) * 36}px serif`;
        c.fillStyle = `rgba(255,255,255,${0.08 + rnd(i, 1) * 0.12})`;
        c.save();
        c.translate(rnd(i, 2) * w + Math.sin(t * 0.3 + i) * 15, (rnd(i, 3) * h - t * (6 + rnd(i, 4) * 10) + h * 4) % h);
        c.rotate(Math.sin(t * 0.3 + i) * 0.4);
        c.fillText(glyphs[i % 6], 0, 0);
        c.restore();
      }
    },
  },
  {
    name: "Mesh gradient",
    note: "Four colour blobs slowly trading places.",
    draw: (c, w, h, t) => {
      c.fillStyle = "#0b1f55";
      c.fillRect(0, 0, w, h);
      const cols = ["rgba(80,140,255,.8)", "rgba(150,90,255,.7)", "rgba(40,200,220,.7)", "rgba(255,120,170,.5)"];
      cols.forEach((col, i) => {
        blob(c, w * (0.5 + 0.38 * Math.sin(t * 0.25 + i * 1.7)), h * (0.5 + 0.38 * Math.cos(t * 0.21 + i * 2.3)), w * 0.6, col);
      });
    },
  },
];

// Tenth idea, defined after the list so it can reuse the helpers above.
IDEAS.push({
  name: "Light rays",
  note: "Slow beams sweeping down from above, like stage light.",
  draw: (c, w, h, t) => {
    sky(c, h, "#08163a", "#12306b");
    c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = "lighter";
    for (let i = 0; i < 5; i++) {
      const x = w * (0.15 + i * 0.18);
      const sway = Math.sin(t * 0.3 + i * 1.3) * w * 0.12;
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "rgba(180,215,255,.28)");
      g.addColorStop(1, "rgba(180,215,255,0)");
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(x - 6, 0);
      c.lineTo(x + 6, 0);
      c.lineTo(x + sway + w * 0.12, h);
      c.lineTo(x + sway - w * 0.12, h);
      c.fill();
    }
    c.globalCompositeOperation = "source-over";
  },
});

const Card = ({ index, name, note, draw }: { index: number } & (typeof IDEAS)[number]) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const c = canvas?.getContext("2d");
    if (!canvas || !c) return;
    const size = (): void => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    size();
    window.addEventListener("resize", size);
    const stop = subscribeToTicker((time) => draw(c, canvas.width, canvas.height, time / 1000), () => 30);
    return () => {
      stop();
      window.removeEventListener("resize", size);
    };
  }, [draw]);
  return (
    <figure className="border-rule overflow-hidden rounded-3xl border">
      <canvas ref={ref} aria-hidden="true" className="block aspect-[16/10] w-full" />
      <figcaption className="bg-veil p-4">
        <p className="text-logo">
          {index}. {name}
        </p>
        <p className="text-body opacity-75">{note}</p>
      </figcaption>
    </figure>
  );
};

export const IdeasView = () => (
  <main className="p-shell-inset">
    <h1 className="text-display font-display pb-4">Pick a background</h1>
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {IDEAS.map((idea, i) => (
        <li key={idea.name}>
          <Card index={i + 1} {...idea} />
        </li>
      ))}
    </ul>
  </main>
);
