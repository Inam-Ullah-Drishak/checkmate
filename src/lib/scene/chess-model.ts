/**
 * Loads `chess.glb` and normalises it into something the scene can fly around.
 *
 * The authored model is a *board setup*: every piece carries its own rotation,
 * scale and square position, and each mesh's origin sits wherever Blender left
 * it. None of that survives contact with an orbit. So each piece is baked once
 * — world matrix applied to the vertices, then recentred — which leaves a
 * geometry that is upright (+Y), pivots about its own centre, and can be
 * uniformly scaled to a target height. The scene then only ever touches
 * `position`, `rotation` and one `scale` number.
 *
 * The Draco decoder is served from `public/draco/`, never a CDN — a CDN
 * round-trip on the critical path is exactly what the model is waiting on.
 *
 * 📖 Docs: obsidian/frontend/chess-scene.md
 */

import { BufferGeometry, Mesh, Object3D } from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import {
  CHESS_MODEL_URL,
  DRACO_DECODER_PATH,
  KING_NODE,
  PIECE_NODES,
} from "@/lib/scene/chess-defaults";

export interface ChessPart {
  geometry: BufferGeometry;
  /** World height of the baked geometry — the divisor for height normalisation. */
  height: number;
  /**
   * Widest distance from the piece's own vertical axis — its true half-width.
   *
   * Pieces collide as capsules, not spheres: a chess piece is several times
   * taller than it is wide, so a bounding sphere either stops two of them a
   * whole piece-width apart or lets them lap through each other end-on. This is
   * the capsule's radius before `CONTACT_FIT` trims it.
   */
  crossSection: number;
}

export interface ChessModel {
  king: ChessPart;
  pieces: ChessPart[];
}

const isMesh = (object: Object3D): object is Mesh => (object as Mesh).isMesh === true;

const collectMeshes = (root: Object3D, name: string): Mesh[] => {
  const target = root.getObjectByName(name);
  if (!target) return [];

  const meshes: Mesh[] = [];
  target.traverse((child) => {
    if (isMesh(child)) meshes.push(child);
  });
  return meshes;
};

/** Bake the mesh's world transform into its vertices, then pivot about the centre. */
const bake = (mesh: Mesh): BufferGeometry => {
  const geometry = mesh.geometry.clone();
  geometry.applyMatrix4(mesh.matrixWorld);
  geometry.center();
  geometry.computeBoundingBox();
  return geometry;
};

/** Widest radius about the geometry's Y axis. Baked geometry is already Y-up and centred. */
const crossSectionOf = (geometry: BufferGeometry): number => {
  const position = geometry.getAttribute("position");
  let widest = 0;

  for (let index = 0; index < position.count; index += 1) {
    const radius = Math.hypot(position.getX(index), position.getZ(index));
    if (radius > widest) widest = radius;
  }

  return widest;
};

const toPart = (mesh: Mesh): ChessPart => {
  const geometry = bake(mesh);
  const box = geometry.boundingBox;
  return {
    geometry,
    height: box ? box.max.y - box.min.y : 1,
    crossSection: crossSectionOf(geometry),
  };
};

/** The baked copies are what the scene keeps; the loaded originals are dead weight. */
const releaseSource = (root: Object3D): void => {
  root.traverse((child) => {
    if (!isMesh(child)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => material.dispose());
  });
};

const extract = (root: Object3D): ChessModel => {
  // Positions are baked from `matrixWorld`, so it must be current first.
  root.updateMatrixWorld(true);

  const kingMesh = collectMeshes(root, KING_NODE)[0];
  if (!kingMesh) throw new Error(`chess.glb is missing the "${KING_NODE}" node`);

  return {
    king: toPart(kingMesh),
    pieces: PIECE_NODES.map((name) => collectMeshes(root, name)[0])
      .filter((mesh): mesh is Mesh => Boolean(mesh))
      .map(toPart),
  };
};

export const loadChessModel = async (): Promise<ChessModel> => {
  const draco = new DRACOLoader().setDecoderPath(DRACO_DECODER_PATH);
  const loader = new GLTFLoader().setDRACOLoader(draco);

  try {
    const gltf = await loader.loadAsync(CHESS_MODEL_URL);
    const model = extract(gltf.scene);
    releaseSource(gltf.scene);
    return model;
  } finally {
    draco.dispose();
  }
};

export const disposeChessModel = (model: ChessModel): void => {
  model.king.geometry.dispose();
  model.pieces.forEach((part) => part.geometry.dispose());
};
