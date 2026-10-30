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
  g.lineWidth = 0.8;
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
  g.lineWidth = 1;
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
  // Muted nebula colors keep the galaxy character without obscuring pieces.
  galaxy: (g, deep) => {
    fill(g, deep ? "#211f31" : "#47405f");
    const clouds = ["139,119,178", "171,111,151", "94,133,173"];
    for (let k = 0; k < 5; k += 1) cloud(g, clouds[k % clouds.length], 0.16, [70, 145]);
    specks(g, 35, "229,222,244", [0.2, 0.45], [0.6, 1.5]);
  },
  // Soft frost detail, with a clear difference between pale and deep ice.
  ice: (g, deep) => {
    fill(g, deep ? "#58788d" : "#d5e1e6");
    for (let k = 0; k < 4; k += 1) cloud(g, deep ? "139,178,197" : "255,255,255", 0.13, [55, 120]);
    frost(g, deep ? "205,224,233" : "126,163,180", 0.18, 12);
    specks(g, 24, "255,255,255", [0.2, 0.45], [0.6, 1.4]);
  },
  // Restrained petals and foliage keep the floral theme subtle at board scale.
  blossom: (g, deep) => {
    fill(g, deep ? "#65806b" : "#e8dadd");
    for (let k = 0; k < 4; k += 1) cloud(g, deep ? "127,157,126" : "212,162,176", 0.14, [50, 100]);
    for (let k = 0; k < (deep ? 8 : 6); k += 1) {
      leaf(g, deep ? "54,105,72" : "190,123,145", 0.32, between(8, 14), false);
    }
    if (deep) for (let k = 0; k < 4; k += 1) leaf(g, "235,195,205", 0.42, between(5, 9), false);
  },
  // Warm sand and soft surf lines, with sparse grain for texture.
  sea: (g, deep) => {
    fill(g, deep ? "#4b7889" : "#dfd3b8");
    for (let k = 0; k < 4; k += 1) cloud(g, deep ? "111,163,174" : "249,227,186", 0.14, [50, 110]);
    if (deep) {
      waves(g, "211,229,226", 0.2, 6);
      specks(g, 24, "255,255,255", [0.2, 0.45], [0.6, 1.4]);
    } else {
      specks(g, 110, "147,119,80", [0.12, 0.28], [0.5, 1]);
      waves(g, "186,159,117", 0.14, 4);
    }
  },
  // Amber and chestnut with a few subdued leaf and vein details.
  leaf: (g, deep) => {
    fill(g, deep ? "#765641" : "#dfcfaa");
    for (let k = 0; k < 4; k += 1) cloud(g, deep ? "153,106,73" : "240,203,139", 0.15, [50, 115]);
    const colors = ["176,93,57", "191,132,62", "155,74,57"];
    for (let k = 0; k < (deep ? 10 : 5); k += 1) leaf(g, colors[k % colors.length], 0.34, between(8, 15), true);
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
