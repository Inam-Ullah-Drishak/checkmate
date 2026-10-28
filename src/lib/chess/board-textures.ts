/**
 * Painted board squares, drawn on a small canvas and used as the 3D squares'
 * texture: one look per site theme. Each look paints a light square and a `deep`
 * (dark) one, with a little randomness so every square differs. These are
 * material parameters for three.js, not page styling.
 */

import { CanvasTexture, SRGBColorSpace } from "three";

export type BoardLook = "galaxy" | "ice" | "blossom" | "sea" | "leaf";

type Paint = (g: CanvasRenderingContext2D, deep: boolean) => void;

const SIZE = 256;
const TAU = Math.PI * 2;
const between = (low: number, high: number): number => low + Math.random() * (high - low);

const fill = (g: CanvasRenderingContext2D, color: string): void => {
  g.fillStyle = color;
  g.fillRect(0, 0, SIZE, SIZE);
};

/** A soft round cloud of colour. */
const cloud = (g: CanvasRenderingContext2D, rgb: string, alpha: number, radius: [number, number]): void => {
  const x = Math.random() * SIZE;
  const y = Math.random() * SIZE;
  const r = between(radius[0], radius[1]);
  const gradient = g.createRadialGradient(x, y, 0, x, y, r);
  gradient.addColorStop(0, `rgba(${rgb},${alpha})`);
  gradient.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gradient;
  g.fillRect(0, 0, SIZE, SIZE);
};

/** Tiny dots: stars, sparkle, grain. */
const specks = (g: CanvasRenderingContext2D, count: number, rgb: string, alpha: [number, number], size: [number, number]): void => {
  for (let k = 0; k < count; k += 1) {
    g.fillStyle = `rgba(${rgb},${between(alpha[0], alpha[1])})`;
    const s = between(size[0], size[1]);
    g.fillRect(Math.random() * SIZE, Math.random() * SIZE, s, s);
  }
};

/** A small pointed oval (petal or leaf), rotated at random. */
const leaf = (g: CanvasRenderingContext2D, rgb: string, alpha: number, length: number, vein: boolean): void => {
  g.save();
  g.translate(Math.random() * SIZE, Math.random() * SIZE);
  g.rotate(Math.random() * TAU);
  g.fillStyle = `rgba(${rgb},${alpha})`;
  g.beginPath();
  g.moveTo(0, -length);
  g.quadraticCurveTo(length * 0.7, 0, 0, length);
  g.quadraticCurveTo(-length * 0.7, 0, 0, -length);
  g.fill();
  if (vein) {
    g.strokeStyle = "rgba(60,25,10,0.35)";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, -length);
    g.lineTo(0, length);
    g.stroke();
  }
  g.restore();
};

/** Thin branching frost lines. */
const frost = (g: CanvasRenderingContext2D, rgb: string, alpha: number, count: number): void => {
  g.strokeStyle = `rgba(${rgb},${alpha})`;
  g.lineWidth = 1.2;
  for (let k = 0; k < count; k += 1) {
    const x = Math.random() * SIZE;
    const y = Math.random() * SIZE;
    const angle = Math.random() * TAU;
    const length = between(20, 70);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    for (const side of [-1, 1]) {
      const at = between(0.3, 0.8);
      const bx = x + Math.cos(angle) * length * at;
      const by = y + Math.sin(angle) * length * at;
      g.moveTo(bx, by);
      g.lineTo(bx + Math.cos(angle + side * 0.8) * length * 0.35, by + Math.sin(angle + side * 0.8) * length * 0.35);
    }
    g.stroke();
  }
};

/** Wavy lines, like ripples or sand. */
const waves = (g: CanvasRenderingContext2D, rgb: string, alpha: number, count: number): void => {
  g.strokeStyle = `rgba(${rgb},${alpha})`;
  g.lineWidth = 1.5;
  for (let k = 0; k < count; k += 1) {
    const y = (k / count) * SIZE + between(-6, 6);
    const phase = Math.random() * TAU;
    const amplitude = between(3, 8);
    g.beginPath();
    for (let x = 0; x <= SIZE; x += 8) {
      const yy = y + Math.sin(x * 0.05 + phase) * amplitude;
      if (x === 0) g.moveTo(x, yy);
      else g.lineTo(x, yy);
    }
    g.stroke();
  }
};

const PAINT: Record<BoardLook, Paint> = {
  // Resin galaxy: purple, pink and blue clouds with stars; the dark squares are the same, much deeper.
  galaxy: (g, deep) => {
    fill(g, deep ? "#020107" : "#140b2e");
    const clouds = ["120,60,220", "235,80,185", "50,150,255", "160,95,255", "70,200,255"];
    for (let k = 0; k < 10; k += 1) cloud(g, clouds[k % clouds.length], deep ? 0.11 : 0.7, [60, 150]);
    specks(g, 110, "255,255,255", deep ? [0.15, 0.65] : [0.5, 1], [0.6, 2]);
  },
  // Frozen lake: frosted white-blue, with frost ferns and sparkle; the dark squares are deep ice.
  ice: (g, deep) => {
    fill(g, deep ? "#1d4a78" : "#e6f3fb");
    for (let k = 0; k < 8; k += 1) cloud(g, deep ? "90,160,225" : "170,210,240", deep ? 0.4 : 0.5, [50, 120]);
    frost(g, deep ? "190,225,255" : "255,255,255", deep ? 0.35 : 0.9, 22);
    specks(g, 60, "255,255,255", [0.5, 1], [0.8, 2.2]);
  },
  // Blossom: pale pink with petals; the dark squares are fresh green leaves with a few petals.
  blossom: (g, deep) => {
    fill(g, deep ? "#2f6a46" : "#fbe7ee");
    for (let k = 0; k < 8; k += 1) cloud(g, deep ? "70,150,90" : "255,190,210", deep ? 0.45 : 0.5, [50, 110]);
    for (let k = 0; k < (deep ? 14 : 22); k += 1) {
      leaf(g, deep ? "50,120,70" : `255,${between(170, 215)},${between(195, 225)}`, deep ? 0.7 : 0.85, between(9, 18), false);
    }
    if (deep) for (let k = 0; k < 8; k += 1) leaf(g, "255,205,222", 0.85, between(6, 11), false);
  },
  // Beach: warm sand with fine grain; the dark squares are the sea with rolling wave lines.
  sea: (g, deep) => {
    fill(g, deep ? "#145d8a" : "#f2e0b5");
    for (let k = 0; k < 8; k += 1) cloud(g, deep ? "60,170,205" : "255,235,180", deep ? 0.45 : 0.55, [50, 110]);
    if (deep) {
      waves(g, "210,240,255", 0.4, 9);
      specks(g, 50, "255,255,255", [0.3, 0.8], [0.8, 2]);
    } else {
      specks(g, 380, "170,130,80", [0.2, 0.6], [0.6, 1.4]);
      waves(g, "205,170,110", 0.25, 4);
    }
  },
  // Autumn: pale amber paper with fine veins; the dark squares are brown earth covered in fallen leaves.
  leaf: (g, deep) => {
    fill(g, deep ? "#3a1f0e" : "#f3dcae");
    for (let k = 0; k < 8; k += 1) cloud(g, deep ? "120,60,20" : "240,180,100", deep ? 0.5 : 0.5, [50, 120]);
    const colors = ["214,84,28", "232,140,36", "190,52,36", "240,184,60"];
    for (let k = 0; k < (deep ? 20 : 8); k += 1) leaf(g, colors[k % colors.length], deep ? 0.85 : 0.5, between(10, 20), true);
  },
};

export const boardTexture = (look: BoardLook, deep: boolean): CanvasTexture => {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const g = canvas.getContext("2d");
  if (g) PAINT[look](g, deep);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
};
