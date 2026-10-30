/**
 * The "Chess set 2020" piece shape: a 3DS model (`public/assets/chess-set-2020.3ds`) read
 * with three's TDSLoader and baked into the `ChessModel` layout the board scene reads
 * (indices: q 0, b 1, p 2, r 5, n 6; the king is separate). The file holds the six piece
 * types and no board, and its textures are ignored: the piece design supplies the materials.
 */

import { BufferGeometry, Mesh } from "three";
import { TDSLoader } from "three/examples/jsm/loaders/TDSLoader.js";

import type { ChessModel, ChessPart } from "@/lib/scene/chess-model";

const URL = "/assets/chess-set-2020.3ds";

/** Mesh names in the file (it was never given sensible ones). */
const NAMES = { k: "king", q: "queen", b: "Cylinder.000", r: "Cylinder.010", p: "pawn 1", n: "kn base.002" };

/** Turn the knight (Y rotation, radians) so it faces the front like the classic knight; tuned by eye. */
const KNIGHT_TURN = 0;

const toPart = (mesh: Mesh, turn = 0): ChessPart => {
  const geometry: BufferGeometry = mesh.geometry.clone();
  geometry.applyMatrix4(mesh.matrixWorld);
  geometry.rotateX(-Math.PI / 2); // the file is Z-up
  geometry.rotateY(turn);
  geometry.center();
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const position = geometry.getAttribute("position");
  let widest = 0;
  for (let i = 0; i < position.count; i += 1) widest = Math.max(widest, Math.hypot(position.getX(i), position.getZ(i)));
  return { geometry, height: box.max.y - box.min.y, crossSection: widest };
};

let cached: Promise<ChessModel> | undefined;

export const loadSet2020 = (): Promise<ChessModel> => {
  cached ??= fetch(URL)
    .then((response) => {
      if (!response.ok) throw new Error("chess set 2020 not found");
      return response.arrayBuffer();
    })
    .then((buffer) => {
      const root = new TDSLoader().parse(buffer, "");
      root.updateMatrixWorld(true);
      const part = (name: string, turn?: number) => {
        const mesh = root.getObjectByName(name) as Mesh | undefined;
        if (!mesh?.isMesh) throw new Error(`chess set 2020: no "${name}"`);
        return toPart(mesh, turn);
      };
      const pawn = part(NAMES.p);
      return {
        king: part(NAMES.k),
        pieces: [part(NAMES.q), part(NAMES.b), pawn, pawn, pawn, part(NAMES.r), part(NAMES.n, KNIGHT_TURN)],
      };
    });
  cached.catch(() => (cached = undefined));
  return cached;
};
