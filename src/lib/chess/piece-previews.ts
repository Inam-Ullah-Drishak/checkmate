/**
 * Pictures of our real 3D king in each piece design, for the settings page.
 *
 * Renders the king from `chess.glb` once, off screen, with the same lights and
 * reflections as the board, in every design's materials, and keeps the result as
 * PNG data URLs. Nothing is rendered until the settings page asks for it, and
 * the answer is cached for the rest of the visit.
 */

import {
  AmbientLight,
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { PIECE_SET_IDS, PIECE_SETS, type Finish, type PieceSetId } from "@/lib/chess/piece-sets";
import { buildShapeModel, SHAPE_IDS, type ShapeId } from "@/lib/chess/piece-shapes";
import { disposeChessModel, loadChessModel, type ChessPart } from "@/lib/scene/chess-model";

type Pair = { w: string; b: string };
export interface KingImages {
  sets: Record<PieceSetId, Pair>;
  shapes: Record<ShapeId, Pair>;
}

const WIDTH = 240;
const HEIGHT = 300;
/** The king's height in board squares, as on the board. */
const KING_HEIGHT = 1.55;

let cached: Promise<KingImages> | null = null;

const render = async (): Promise<KingImages> => {
  const model = await loadChessModel();
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(WIDTH, HEIGHT);
  renderer.setPixelRatio(1);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new HemisphereLight(0xffffff, 0x445566, 0.5));
  scene.add(new AmbientLight(0xffffff, 0.1));
  const sun = new DirectionalLight(0xffffff, 2.4);
  sun.position.set(4, 6, 6);
  scene.add(sun);

  const camera = new PerspectiveCamera(28, WIDTH / HEIGHT, 0.1, 50);
  camera.position.set(0, 0.25, 3.7);
  camera.lookAt(0, 0, 0);

  const material = new MeshPhysicalMaterial({ clearcoatRoughness: 0.2 });
  const king = new Mesh(model.king.geometry, material);
  king.rotation.y = 0.5;
  scene.add(king);
  const show = (part: ChessPart) => {
    king.geometry = part.geometry;
    king.scale.setScalar(KING_HEIGHT / part.height);
  };
  show(model.king);

  const paint = ({ color, metalness, roughness, clearcoat }: Finish): string => {
    material.color = new Color(color);
    material.metalness = metalness;
    material.roughness = roughness;
    material.clearcoat = clearcoat;
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL("image/png");
  };

  const sets = Object.fromEntries(PIECE_SET_IDS.map((id) => [id, { w: paint(PIECE_SETS[id].w), b: paint(PIECE_SETS[id].b) }])) as Record<PieceSetId, Pair>;

  // Each shape's king, in the default silver and gold.
  const { w, b } = PIECE_SETS["gold-silver"];
  const shapes = Object.fromEntries(
    SHAPE_IDS.map((id) => {
      const built = buildShapeModel(id, model).king;
      show(built);
      const pair = { w: paint(w), b: paint(b) };
      if (built !== model.king) built.geometry.dispose();
      return [id, pair];
    }),
  ) as Record<ShapeId, Pair>;

  material.dispose();
  scene.environment?.dispose();
  pmrem.dispose();
  renderer.dispose();
  disposeChessModel(model);
  return { sets, shapes };
};

/** The pictures, rendered on the first call. Rejects if WebGL or the model is unavailable. */
export const kingImages = (): Promise<KingImages> => {
  cached ??= render().catch((error) => {
    cached = null;
    throw error;
  });
  return cached;
};
