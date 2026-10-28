/**
 * The animated layer of the page backdrop, one per site theme. Each effect draws
 * only on top of the theme's gradient (`PixelWaves` fills that first), and is
 * stateless: positions come from a hash of the particle index plus the time, so
 * there is nothing to seed or reset when the window resizes.
 */

export type EffectId = "snow" | "petals" | "sun" | "leaves" | "space";

export type Effect = (c: CanvasRenderingContext2D, w: number, h: number, t: number) => void;

const TAU = Math.PI * 2;
/** Deterministic pseudo-random in 0..1. */
const rnd = (i: number, k = 0): number => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
/** How many particles a window of this size gets, at one per `area` square pixels. */
const count = (w: number, h: number, area: number): number => Math.round((w * h) / area);

const glow = (c: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void => {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
};

const snow: Effect = (c, w, h, t) => {
  c.fillStyle = "#fff";
  for (let i = 0, n = count(w, h, 9000); i < n; i++) {
    const d = rnd(i);
    c.globalAlpha = 0.35 + d * 0.5;
    c.beginPath();
    c.arc(rnd(i, 2) * w + Math.sin(t * 0.6 + i) * 14, (rnd(i, 1) * h + t * (18 + d * 50)) % h, 1 + d * 3, 0, TAU);
    c.fill();
  }
  c.globalAlpha = 1;
};

/** A spring day: clouds, sun glow, pollen, falling blossom petals and butterflies. */
const petals: Effect = (c, w, h, t) => {
  // Soft clouds drifting across the top.
  c.fillStyle = "rgba(255,255,255,.22)";
  for (let i = 0; i < 4; i++) {
    const cx = ((t * (5 + i * 2) + rnd(i, 1) * w * 1.4) % (w * 1.4)) - w * 0.2;
    const cy = h * (0.08 + rnd(i, 2) * 0.22);
    const r = Math.min(w, h) * (0.05 + rnd(i, 3) * 0.04);
    [-1.4, -0.5, 0.5, 1.4].forEach((dx, k) => {
      c.beginPath();
      c.arc(cx + dx * r, cy - (k % 2) * r * 0.5, r * (k % 2 ? 1.1 : 0.85), 0, TAU);
      c.fill();
    });
  }

  // Sun glow from the top-left.
  c.globalCompositeOperation = "lighter";
  glow(c, w * 0.15, -h * 0.05, Math.max(w, h) * 0.7, "rgba(255,240,170,.35)");

  // Pollen: tiny warm sparkles rising slowly.
  for (let i = 0, n = count(w, h, 14000); i < n; i++) {
    const y = h - ((rnd(i, 1) * h + t * (6 + rnd(i, 2) * 12)) % h);
    const x = rnd(i, 3) * w + Math.sin(t * 0.7 + i) * 16;
    glow(c, x, y, 3 + rnd(i, 4) * 5, `rgba(255,245,170,${0.35 + 0.4 * Math.abs(Math.sin(t + i))})`);
  }
  c.globalCompositeOperation = "source-over";

  // Petals: two depths, tumbling and turning.
  for (let i = 0, n = count(w, h, 22000); i < n; i++) {
    const size = 5 + rnd(i) * 8;
    c.save();
    c.translate((rnd(i, 1) * w + Math.sin(t * 0.5 + i) * 34 + t * 9) % w, (rnd(i, 2) * h + t * (20 + rnd(i, 3) * 34)) % h);
    c.rotate(t * (0.6 + rnd(i, 4)) + i);
    c.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(t * 0.8 + i)));
    c.fillStyle = `rgba(255,${185 + Math.round(rnd(i, 5) * 45)},${205 + Math.round(rnd(i, 6) * 35)},${0.6 + rnd(i, 7) * 0.35})`;
    c.beginPath();
    c.ellipse(0, 0, size, size * 0.6, 0, 0, TAU);
    c.fill();
    c.restore();
  }

  // Butterflies wandering across the page, wings beating.
  const wings = ["255,214,64", "120,190,255", "255,150,190", "255,255,255"];
  for (let i = 0; i < 4; i++) {
    const x = ((t * (14 + i * 5) + rnd(i, 1) * w) % (w + 80)) - 40;
    const y = h * (0.25 + rnd(i, 2) * 0.4) + Math.sin(t * 0.8 + i * 2) * 40;
    const flap = Math.abs(Math.sin(t * 9 + i * 3));
    c.save();
    c.translate(x, y);
    c.rotate(Math.sin(t * 0.8 + i * 2) * 0.3);
    c.fillStyle = `rgba(${wings[i]},.9)`;
    for (const side of [-1, 1]) {
      c.save();
      c.scale(side * (0.25 + 0.75 * flap), 1);
      c.beginPath();
      c.ellipse(7, -4, 8, 11, 0.4, 0, TAU);
      c.ellipse(6, 8, 5, 7, -0.3, 0, TAU);
      c.fill();
      c.restore();
    }
    c.fillStyle = "rgba(40,30,30,.8)";
    c.fillRect(-1, -9, 2, 20);
    c.restore();
  }
};

/** A summer day: a blazing sun with slow rays, glints on the air and rolling sea waves along the bottom. */
const sun: Effect = (c, w, h, t) => {
  const sx = w * 0.82;
  const sy = h * 0.3;
  const reach = Math.max(w, h);
  c.globalCompositeOperation = "lighter";
  glow(c, sx, sy, reach * 0.55, "rgba(255,225,120,.44)");
  glow(c, sx, sy, reach * 0.16, "rgba(255,250,210,.56)");
  // Rays fanning out from the sun, turning very slowly.
  for (let i = 0; i < 12; i++) {
    const a = t * 0.04 + (i / 12) * TAU;
    const g = c.createLinearGradient(sx, sy, sx + Math.cos(a) * reach, sy + Math.sin(a) * reach);
    g.addColorStop(0, "rgba(255,235,150,.17)");
    g.addColorStop(1, "rgba(255,235,150,0)");
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(sx, sy);
    c.lineTo(sx + Math.cos(a - 0.05) * reach, sy + Math.sin(a - 0.05) * reach);
    c.lineTo(sx + Math.cos(a + 0.05) * reach, sy + Math.sin(a + 0.05) * reach);
    c.fill();
  }
  // Glints twinkling in the warm air.
  for (let i = 0, n = count(w, h, 26000); i < n; i++) {
    glow(c, rnd(i, 1) * w, rnd(i, 2) * h, 3 + rnd(i, 3) * 6, `rgba(255,248,200,${0.4 * Math.abs(Math.sin(t * (0.6 + rnd(i)) + i))})`);
  }
  c.globalCompositeOperation = "source-over";
  // Sea waves rolling along the bottom, three layers.
  [0, 1, 2].forEach((layer) => {
    c.fillStyle = `rgba(255,255,255,${0.07 + layer * 0.04})`;
    c.beginPath();
    c.moveTo(0, h);
    for (let x = 0; x <= w; x += 12) {
      c.lineTo(x, h - 28 - layer * 18 + Math.sin(x * 0.012 + t * (0.7 + layer * 0.25) + layer * 2) * (10 + layer * 3));
    }
    c.lineTo(w, h);
    c.fill();
  });
};

/** Autumn: golden light shafts, ground mist, bare branches with clinging leaves, embers, and leaves of every warm colour tumbling down on gusts of wind. */
const leaves: Effect = (c, w, h, t) => {
  c.globalCompositeOperation = "lighter";
  glow(c, w * 0.5, h * 1.05, Math.max(w, h) * 0.7, "rgba(255,150,60,.28)");
  // Soft shafts of low golden light slanting down through the trees.
  for (let i = 0; i < 4; i++) {
    const x = w * (0.1 + i * 0.27) + Math.sin(t * 0.12 + i) * w * 0.04;
    const g = c.createLinearGradient(x, 0, x - w * 0.18, h);
    g.addColorStop(0, "rgba(255,200,110,.16)");
    g.addColorStop(1, "rgba(255,200,110,0)");
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x + w * 0.07, 0);
    c.lineTo(x + w * 0.07 - w * 0.18, h);
    c.lineTo(x - w * 0.18, h);
    c.fill();
  }
  // Mist rolling slowly along the ground.
  for (let i = 0; i < 3; i++) {
    glow(c, ((t * (6 + i * 3) + i * w * 0.5) % (w * 1.6)) - w * 0.3, h * (0.82 + i * 0.07), Math.max(w, h) * 0.35, "rgba(255,225,190,.1)");
  }
  for (let i = 0, n = count(w, h, 30000); i < n; i++) {
    const y = h - ((rnd(i, 1) * h + t * (8 + rnd(i, 2) * 16)) % h);
    glow(c, rnd(i, 3) * w + Math.sin(t * 0.6 + i) * 14, y, 3 + rnd(i, 4) * 5, `rgba(255,190,100,${0.3 + 0.4 * Math.abs(Math.sin(t + i))})`);
  }
  c.globalCompositeOperation = "source-over";
  // Bare branches reaching in from the top corners, swaying a little, with leaves still clinging.
  const branch = (x0: number, dir: number, seed: number): void => {
    c.strokeStyle = "rgba(35,16,8,.85)";
    c.lineCap = "round";
    const twigs: [number, number][] = [];
    for (let k = 0; k < 4; k++) {
      const len = Math.min(w, h) * (0.5 - k * 0.09);
      const sway = Math.sin(t * 0.5 + seed + k) * 6;
      const ex = x0 + dir * len;
      const ey = h * (0.04 + k * 0.1) + sway;
      c.lineWidth = 7 - k * 1.4;
      c.beginPath();
      c.moveTo(x0, -10 + k * 8);
      c.quadraticCurveTo(x0 + dir * len * 0.5, h * 0.02 + k * 18 + sway * 0.5, ex, ey);
      c.stroke();
      twigs.push([ex, ey]);
    }
    twigs.forEach(([x, y], k) => {
      for (let m = 0; m < 4; m++) {
        c.save();
        c.translate(x - dir * m * 22, y + m * 4 + Math.sin(t * 0.9 + k + m) * 3);
        c.rotate(dir * (0.6 + m * 0.3) + Math.sin(t * 0.8 + m) * 0.15);
        c.fillStyle = `rgba(${["214,84,28", "232,140,36", "190,52,36", "240,184,60"][(k + m) % 4]},.9)`;
        c.beginPath();
        c.moveTo(0, 0);
        c.quadraticCurveTo(10, -6, 18, 0);
        c.quadraticCurveTo(10, 6, 0, 0);
        c.fill();
        c.restore();
      }
    });
  };
  branch(-10, 1, 0);
  branch(w + 10, -1, 3);

  // A gust now and then pushes every leaf sideways for a moment.
  const gust = Math.max(0, Math.sin(t * 0.25)) ** 3 * 90;
  const colors = ["214,84,28", "232,140,36", "190,52,36", "240,184,60", "150,84,36"];
  for (let i = 0, n = count(w, h, 20000); i < n; i++) {
    const size = 10 + rnd(i) * 14;
    c.save();
    c.translate((rnd(i, 1) * w + Math.sin(t * 0.45 + i) * 46 + t * 6 + gust * (0.5 + rnd(i, 6))) % w, (rnd(i, 2) * h + t * (22 + rnd(i, 3) * 32)) % h);
    c.rotate(Math.sin(t * 0.7 + i) * 0.9 + i + gust * 0.01);
    c.scale(1, 0.5 + 0.5 * Math.abs(Math.cos(t * 0.9 + i)));
    c.fillStyle = `rgba(${colors[i % colors.length]},${0.75 + rnd(i, 5) * 0.2})`;
    c.beginPath();
    c.moveTo(0, -size);
    c.quadraticCurveTo(size * 0.9, -size * 0.2, 0, size);
    c.quadraticCurveTo(-size * 0.9, -size * 0.2, 0, -size);
    c.fill();
    c.strokeStyle = "rgba(60,25,10,.45)";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, -size);
    c.lineTo(0, size * 1.2);
    c.stroke();
    c.restore();
  }
};

/** Roughly normal 0..1 random (centre-weighted), from a hash. */
const bell = (i: number, k: number): number => (rnd(i, k) + rnd(i, k + 1) + rnd(i, k + 2) + rnd(i, k + 3)) / 4;

let milkyWay: { size: number; canvas: HTMLCanvasElement } | null = null;

/**
 * Paints the Milky Way seen from above, face-on, once per size: a warm glowing
 * bulge with a short bar, four logarithmic spiral arms made of tens of thousands
 * of grains (cool blue-white outside, warm yellow inside), pink star-forming
 * knots along the arms, and dark dust lanes hugging their inner edges. Frames
 * only turn the picture, so the realism costs nothing per frame.
 */
const paintMilkyWay = (size: number): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const c = canvas.getContext("2d");
  if (!c) return canvas;
  const R = size * 0.47;
  const inner = R * 0.13;
  const pitch = 1 / Math.tan(0.26);
  c.translate(size / 2, size / 2);
  c.globalCompositeOperation = "lighter";

  // The whole disc's faint glow, then the bulge and bar.
  glow(c, 0, 0, R, "rgba(150,170,255,.16)");
  glow(c, 0, 0, R * 0.38, "rgba(255,215,150,.5)");
  c.save();
  c.rotate(0.5);
  c.scale(1, 0.4);
  glow(c, 0, 0, R * 0.34, "rgba(255,225,170,.55)");
  c.restore();
  glow(c, 0, 0, R * 0.11, "rgba(255,245,220,.95)");

  const arm = (i: number, spread: number): { x: number; y: number; r: number; u: number } => {
    const u = Math.pow(rnd(i, 1), 0.75);
    const r = inner * Math.pow(R / inner, u);
    const turn = (i % 4) * (Math.PI / 2) + Math.log(r / inner) * pitch;
    const a = turn + (bell(i, 3) - 0.5) * spread * (1.3 - u * 0.6);
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, r, u };
  };

  // Grains along the arms; two arms are fuller than the other two.
  for (let i = 0; i < 60000; i++) {
    if (i % 4 === 1 || i % 4 === 3 ? rnd(i, 7) > 0.55 : false) continue;
    const { x, y, r, u } = arm(i, 1.1);
    const warm = rnd(i, 9) < 0.55 * (1 - u);
    c.fillStyle = `rgba(${warm ? "255,228,185" : "200,218,255"},${(0.12 + rnd(i, 10) * 0.45) * (1 - u * 0.55)})`;
    const g = 0.5 + rnd(i, 11) * 1.1;
    c.fillRect(x, y, g, g);
    if (r > 0 && rnd(i, 12) > 0.9985) glow(c, x, y, 6 + rnd(i, 13) * 6, "rgba(255,240,220,.35)");
  }

  // Star-forming knots: pink and blue-white, strung along the arms.
  for (let i = 0; i < 380; i++) {
    const { x, y, u } = arm(i + 90000, 0.5);
    glow(c, x, y, 2 + rnd(i, 14) * 4 + (1 - u) * 2, rnd(i, 15) > 0.45 ? "rgba(255,105,155,.5)" : "rgba(170,200,255,.55)");
  }

  // Dust lanes on the inner edge of each arm.
  c.globalCompositeOperation = "source-over";
  for (let i = 0; i < 700; i++) {
    const u = Math.pow(rnd(i, 21), 0.8);
    const r = inner * 0.9 * Math.pow(R / (inner * 0.9), u);
    const a = (i % 4) * (Math.PI / 2) + Math.log(r / inner) * pitch - 0.2 + (bell(i, 23) - 0.5) * 0.12;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    const rr = R * (0.012 + rnd(i, 27) * 0.022);
    const g = c.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, `rgba(5,4,14,${0.14 + (1 - u) * 0.14})`);
    g.addColorStop(1, "rgba(5,4,14,0)");
    c.fillStyle = g;
    c.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  return canvas;
};

/** Space: the Milky Way from above, slowly turning, over three layers of twinkling stars. */
const space: Effect = (c, w, h, t) => {
  const size = Math.min(1100, Math.round(Math.max(w, h) * 0.9));
  if (!milkyWay || milkyWay.size !== size) milkyWay = { size, canvas: paintMilkyWay(size) };
  const shown = Math.min(w, h) * 1.25;
  c.save();
  c.translate(w * 0.5, h * 0.5);
  c.rotate(t * 0.012);
  c.drawImage(milkyWay.canvas, -shown / 2, -shown / 2, shown, shown);
  c.restore();

  // Stars across the whole sky: far (tiny, slow), middle, near (bigger, faster).
  [
    { area: 6000, size: 1, speed: 1.2 },
    { area: 12000, size: 1.6, speed: 3 },
    { area: 34000, size: 2.4, speed: 6 },
  ].forEach((layer, k) => {
    for (let i = 0, n = count(w, h, layer.area); i < n; i++) {
      const hue = rnd(i, 9 + k) > 0.8 ? "190,210,255" : rnd(i, 10 + k) > 0.85 ? "255,220,180" : "255,255,255";
      c.fillStyle = `rgba(${hue},${0.25 + 0.75 * Math.abs(Math.sin(t * (0.4 + rnd(i, 5 + k)) + i))})`;
      const star = layer.size * (0.6 + rnd(i, 4 + k) * 0.8);
      c.fillRect((rnd(i, 1 + k * 7) * w + t * layer.speed) % w, rnd(i, 3 + k * 5) * h, star, star);
    }
  });
};

export const EFFECTS: Record<EffectId, Effect> = {
  snow,
  petals,
  sun,
  leaves,
  space,
};
