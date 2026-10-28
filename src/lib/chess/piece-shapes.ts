/**
 * Piece shapes: the same pieces drawn in different styles. "classic" is the baked
 * chess.glb; the others are built here from lathes, spheres, boxes and helix tubes.
 * The knight cannot be turned on a lathe, so every style keeps the glb knight.
 * Pieces are returned in the `ChessModel` layout the board scene already reads
 * (indices: q 0, b 1, p 2, r 5, n 6; the king is separate).
 */

import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  LatheGeometry,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import type { ChessModel, ChessPart } from "@/lib/scene/chess-model";

export type ShapeId = "classic" | "modern" | "twisted" | "vase" | "stepped" | "column" | "hourglass" | "faceted";
export const SHAPE_IDS: ShapeId[] = ["classic", "modern", "twisted", "vase", "stepped", "column", "hourglass", "faceted"];
export const SHAPE_LABEL: Record<ShapeId, string> = {
  classic: "Classic",
  modern: "Modern (smooth, tapered)",
  twisted: "Twisted (spiral stem)",
  vase: "Vase (round belly)",
  stepped: "Stepped (tiers)",
  column: "Column (ringed stem)",
  hourglass: "Hourglass",
  faceted: "Faceted (angular)",
};

interface Style {
  stem: "cone" | "twist" | "hourglass" | "rings" | "vase" | "steps" | "baluster" | "column" | "obelisk";
  /** Sideways stretch of the whole piece. */
  width: number;
  /** Sides around the piece; 6 reads as cut facets. */
  sides: number;
  /** King and queen wear a crown instead of the plain top. */
  crown?: boolean;
  /** Stacked tiers with curved roofs instead of a stem and head. */
  pagoda?: boolean;
  /** Temple pieces: fluted column, capital, and a pediment or arch on top. */
  roman?: boolean;
  /** Obelisk bodies with pyramid tops, a sun disc for the queen and an ankh for the king. */
  egypt?: boolean;
}
const STYLES: Record<Exclude<ShapeId, "classic">, Style> = {
  modern: { stem: "cone", width: 1, sides: 32 },
  twisted: { stem: "twist", width: 1, sides: 32 },
  vase: { stem: "vase", width: 1, sides: 32 },
  stepped: { stem: "steps", width: 1, sides: 32 },
  column: { stem: "rings", width: 1, sides: 32 },
  hourglass: { stem: "hourglass", width: 1, sides: 32 },
  faceted: { stem: "hourglass", width: 1, sides: 6 },
};

type Kind = "p" | "r" | "b" | "q" | "k";
/** Height of the stem above the 0.14-high base, per piece. */
const STEM: Record<Kind, number> = { p: 0.45, r: 0.6, b: 0.7, q: 0.8, k: 0.9 };
const BASE_TOP = 0.14;

/** Merging needs matching attributes; positions and normals are all the pieces use. */
const plain = (geometry: BufferGeometry): BufferGeometry => {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  flat.deleteAttribute("uv");
  return flat;
};

const build = (kind: Kind, { stem, width, sides, crown, pagoda, roman, egypt }: Style): ChessPart => {
  const lathe = (points: [number, number][]) => new LatheGeometry(points.map(([r, y]) => new Vector2(r, y)), sides);
  const ball = (radius: number, y: number, stretch = 1) =>
    new SphereGeometry(radius, sides, Math.max(3, sides / 2)).scale(1, stretch, 1).translate(0, y, 0);
  const box = (w: number, h: number, d: number, x: number, y: number, z: number) => new BoxGeometry(w, h, d).translate(x, y, z);

  const around = (n: number, r: number, make: (x: number, z: number) => BufferGeometry) =>
    Array.from({ length: n }, (_, i) => make(Math.cos((i / n) * Math.PI * 2) * r, Math.sin((i / n) * Math.PI * 2) * r));

  // Four sides, turned so the flat faces point along the board's axes.
  const square = (points: [number, number][]) => new LatheGeometry(points.map(([r, y]) => new Vector2(r, y)), 4).rotateY(Math.PI / 4);

  const h = STEM[kind];
  const top = BASE_TOP + h;

  const stemGeometry = (): BufferGeometry => {
    switch (stem) {
      case "cone":
        return lathe([[0.34, BASE_TOP], [0.2, top], [0, top]]);
      case "hourglass":
        return lathe([[0.36, BASE_TOP], [0.2, BASE_TOP + h * 0.35], [0.14, BASE_TOP + h * 0.6], [0.22, BASE_TOP + h * 0.85], [0.3, top], [0, top]]);
      case "column": {
        // Square plinth, fluted shaft (a core ringed by thin ridges) and a capital with a square top slab.
        const shaft = top - 0.14;
        return mergeGeometries(
          [
            box(0.66, 0.06, 0.66, 0, BASE_TOP + 0.03, 0),
            lathe([[0.18, BASE_TOP], [0.17, shaft], [0, shaft]]),
            ...around(10, 0.18, (x, z) => new CylinderGeometry(0.035, 0.035, shaft - BASE_TOP, 8).translate(x, (BASE_TOP + shaft) / 2, z)),
            lathe([[0.19, shaft], [0.26, top - 0.07], [0.3, top - 0.05], [0, top - 0.05]]),
            box(0.64, 0.07, 0.64, 0, top - 0.035, 0),
          ].map(plain),
        )!;
      }
      case "obelisk":
        return mergeGeometries([box(0.66, 0.06, 0.66, 0, BASE_TOP + 0.03, 0), square([[0.28, BASE_TOP + 0.06], [0.16, top], [0, top]])].map(plain))!;
      case "baluster":
        return lathe([[0.36, BASE_TOP], [0.2, BASE_TOP + h * 0.15], [0.13, BASE_TOP + h * 0.4], [0.12, BASE_TOP + h * 0.7], [0.2, top - 0.04], [0.28, top - 0.04], [0.28, top], [0, top]]);
      case "vase":
        return lathe([...Array.from({ length: 9 }, (_, i): [number, number] => [0.16 + 0.2 * Math.sin((Math.PI * i) / 8), BASE_TOP + (h * i) / 8]), [0, top]]);
      case "steps": {
        const points: [number, number][] = [];
        [0, 1, 2, 3].forEach((tier) => {
          const r = 0.36 - tier * 0.06;
          points.push([r, BASE_TOP + (h * tier) / 4], [r, BASE_TOP + (h * (tier + 1)) / 4]);
        });
        points.push([0, top]);
        return lathe(points);
      }
      case "rings": {
        const points: [number, number][] = [[0.22, BASE_TOP]];
        [1, 3, 5].forEach((slot) => {
          const y = BASE_TOP + (h * slot) / 6;
          points.push([0.22, y - 0.04], [0.3, y - 0.04], [0.3, y + 0.04], [0.22, y + 0.04]);
        });
        points.push([0.22, top], [0, top]);
        return lathe(points);
      }
      case "twist": {
        const strands = [0, 1, 2].map((strand) => {
          const points = Array.from({ length: 24 }, (_, i) => {
            const t = i / 23;
            const angle = (strand / 3) * Math.PI * 2 + t * Math.PI * 3;
            return new Vector3(Math.cos(angle) * 0.2, BASE_TOP + t * h, Math.sin(angle) * 0.2);
          });
          return new TubeGeometry(new CatmullRomCurve3(points), 64, 0.05, 8);
        });
        // Caps that hide where the strands meet the base and the head.
        const cap = (y: number) => lathe([[0, y], [0.3, y], [0.3, y + 0.04], [0, y + 0.04]]);
        return mergeGeometries([...strands, cap(BASE_TOP), cap(top - 0.04)].map(plain))!;
      }
    }
  };

  const head = (): BufferGeometry[] => {
    if (egypt) {
      const tip = (r: number, rise: number) => square([[r * 0.75, top], [0, top + rise]]);
      switch (kind) {
        case "r":
          return [square([[0.3, top], [0.3, top + 0.1], [0, top + 0.1]])];
        case "p":
          return [tip(0.22, 0.2)];
        case "b":
          return [tip(0.22, 0.3), ball(0.05, top + 0.34)];
        case "q":
          return [tip(0.2, 0.18), new TorusGeometry(0.15, 0.04, 8, 24).translate(0, top + 0.34, 0)]; // sun disc
        default:
          // Ankh: a loop on a stem with a crossbar.
          return [new TorusGeometry(0.14, 0.045, 8, 20).translate(0, top + 0.5, 0), box(0.08, 0.42, 0.08, 0, top + 0.19, 0), box(0.38, 0.08, 0.08, 0, top + 0.26, 0)];
      }
    }
    if (roman && kind !== "r") {
      const pediment = (r: number) => new CylinderGeometry(r, r, 0.5, 3).rotateX(-Math.PI / 2).scale(1, 0.7, 1).translate(0, top + r * 0.35, 0);
      switch (kind) {
        case "p":
          return [ball(0.2, top + 0.12, 0.85)];
        case "b":
          return [pediment(0.34), ball(0.05, top + 0.36)];
        case "q":
          return [new TorusGeometry(0.2, 0.06, 8, 20, Math.PI).translate(0, top + 0.04, 0), ball(0.07, top + 0.3)];
        default:
          return [pediment(0.4), box(0.06, 0.22, 0.06, 0, top + 0.4, 0), box(0.16, 0.06, 0.06, 0, top + 0.44, 0)];
      }
    }
    if (crown && (kind === "k" || kind === "q")) {
      return [
        lathe([[0, top], [0.3, top], [0.34, top + 0.06], [0.34, top + 0.14], [0.3, top + 0.16], [0, top + 0.16]]),
        ball(0.3, top + 0.16, 0.9).scale(1, 1, 1),
        ball(0.07, top + 0.46),
        ...(kind === "k" ? [box(0.06, 0.2, 0.06, 0, top + 0.6, 0), box(0.16, 0.06, 0.06, 0, top + 0.63, 0)] : []),
      ];
    }
    switch (kind) {
      case "p":
        return [ball(0.2, top + 0.16)];
      case "r":
        return [
          lathe([[0, top], [0.32, top], [0.32, top + 0.26], [0, top + 0.26]]),
          ...[-1, 1].flatMap((x) => [-1, 1].map((z) => box(0.14, 0.12, 0.14, x * 0.19, top + 0.32, z * 0.19))),
        ];
      case "b":
        return [ball(0.2, top + 0.26, 1.5), ball(0.06, top + 0.62)];
      case "q":
        return [lathe([[0, top], [0.18, top], [0.36, top + 0.34], [0.3, top + 0.38], [0, top + 0.3]]), ball(0.08, top + 0.44)];
      case "k":
        return [
          lathe([[0, top], [0.18, top], [0.36, top + 0.34], [0.3, top + 0.38], [0, top + 0.3]]),
          box(0.08, 0.3, 0.08, 0, top + 0.52, 0),
          box(0.22, 0.08, 0.08, 0, top + 0.55, 0),
        ];
    }
  };

  /** A Japanese pagoda: square tiers with open walls (corner posts round a core), wide roofs, a ringed spire. */
  const pagodaParts = (): BufferGeometry[] => {
    const tiers: Record<Kind, number> = { p: 1, r: 2, b: 2, q: 3, k: 3 };
    const parts: BufferGeometry[] = [lathe([[0.4, BASE_TOP], [0.36, BASE_TOP + 0.1], [0.3, BASE_TOP + 0.12], [0, BASE_TOP + 0.12]])];
    let y = BASE_TOP + 0.1;
    for (let tier = 0; tier < tiers[kind]; tier += 1) {
      const s = 1 - tier * 0.16;
      const post = 0.17 * s;
      parts.push(
        ...[-1, 1].flatMap((x) => [-1, 1].map((z) => box(0.08 * s, 0.28, 0.08 * s, x * post, y + 0.14, z * post))),
        box(0.2 * s, 0.26, 0.2 * s, 0, y + 0.13, 0), // core, set back so the walls read as open
        box(0.42 * s, 0.03, 0.42 * s, 0, y + 0.015, 0), // balcony
      );
      y += 0.28;
      const r = 0.56 * s;
      parts.push(square([[0, y - 0.04], [r, y - 0.04], [r, y + 0.07], [r * 0.6, y + 0.1], [r * 0.3, y + 0.17], [0, y + 0.27]]));
      y += 0.12;
    }
    const mast = kind === "k" ? 0.5 : kind === "q" ? 0.4 : 0.32;
    parts.push(new ConeGeometry(0.025, mast, 8).translate(0, y + 0.1 + mast / 2, 0), ball(0.04, y + 0.1 + mast));
    [0, 1, 2, 3].forEach((i) => parts.push(new TorusGeometry(0.075 - i * 0.012, 0.012, 6, sides).rotateX(Math.PI / 2).translate(0, y + 0.1 + i * (mast / 5), 0)));
    return parts;
  };

  const base = lathe([[0, 0], [0.5, 0], [0.5, 0.08], [0.42, BASE_TOP], [0, BASE_TOP]]);
  const geometry = mergeGeometries((pagoda ? [base, ...pagodaParts()] : [base, stemGeometry(), ...head()]).map(plain))!;
  // Few sides should read as cut facets, so shade each face flat.
  if (sides <= 8) geometry.computeVertexNormals();
  geometry.scale(width, 1, width);
  geometry.center();
  geometry.computeBoundingBox();
  const box3 = geometry.boundingBox!;
  return { geometry, height: box3.max.y - box3.min.y, crossSection: Math.max(box3.max.x, box3.max.z) };
};

export const buildShapeModel = (shape: ShapeId, glb: ChessModel): ChessModel => {
  if (shape === "classic") return glb;
  const style = STYLES[shape];
  const pawn = build("p", style);
  return {
    king: build("k", style),
    pieces: [build("q", style), build("b", style), pawn, pawn, pawn, build("r", style), glb.pieces[6]],
  };
};
