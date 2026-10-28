/**
 * The three.js side of the board: the modelled board, the 3D pieces (baked from
 * `chess.glb` by `loadChessModel`), animation, highlights and picking. It knows
 * nothing about the rules; `components/common/board-3d` feeds it moves from
 * `chess.js`. Scene data (colours, sizes) are WebGL parameters, in the same way
 * `lib/scene/chess-defaults.ts` holds the hero's.
 */

import type { Color as Side, PieceSymbol, Square } from "chess.js";
import {
  AmbientLight,
  BoxGeometry,
  CircleGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PlaneGeometry,
  PMREMGenerator,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { boardTexture } from "@/lib/chess/board-textures";
import { BOARD_THEMES } from "@/lib/chess/board-themes";
import { PIECE_SETS, type Finish, type PieceSetId } from "@/lib/chess/piece-sets";
import type { Team, ThemeId } from "@/lib/chess/storage";
import { getDeviceProfile } from "@/lib/scene/device";
import { disposeChessModel, type ChessModel } from "@/lib/scene/chess-model";

export interface BoardCell {
  type: PieceSymbol;
  color: Side;
  square: string;
}

export interface Target {
  square: string;
  capture: boolean;
}

export interface BoardScene {
  /** Hands over the loaded piece geometry; the scene disposes it. */
  setModel: (model: ChessModel) => void;
  /** Clears every piece (and the captured ones) and sets up `cells`. */
  reset: (cells: BoardCell[]) => void;
  /** While on, moves land at once instead of animating (used to replay a game). */
  setInstant: (on: boolean) => void;
  move: (from: string, to: string) => void;
  capture: (square: string) => void;
  promote: (square: string, type: PieceSymbol, color: Side) => void;
  select: (square: string | null, targets: Target[]) => void;
  setLast: (from: string | null, to: string | null) => void;
  setCheck: (square: string | null) => void;
  setHint: (from: string | null, to: string | null) => void;
  /** The square the keyboard cursor is on, or `null` when it is hidden. */
  setCursor: (square: string | null) => void;
  setMovable: (on: boolean) => void;
  /** Close view: fills a narrow screen with the squares, cropping the frame and the sides. */
  setZoom: (on: boolean) => void;
  resetView: () => void;
  /** Slowly circles the camera round the board (the home page's showcase). */
  setAutoRotate: (on: boolean) => void;
  dispose: () => void;
}

/** Piece type → index in `ChessModel.pieces` (king is `model.king`), and its height in squares. */
const PIECES: Record<PieceSymbol, { part?: number; height: number }> = {
  k: { height: 1.55 },
  q: { part: 0, height: 1.4 },
  b: { part: 1, height: 1.2 },
  r: { part: 5, height: 0.95 },
  n: { part: 6, height: 1.05 },
  p: { part: 2, height: 0.85 },
};

const TILE_HEIGHT = 0.25;
/** Captured pieces stand on the frame, in a row along their own side's edge of the board. */
const BORDER_TOP = -0.24;
const BORDER_Z = 4.45;
/** Full-size pieces: widest gap between them, and the row length they are squeezed into. */
const BORDER_STEP = 0.85;
const BORDER_ROW = 8.4;
/** The model's knight points along its own X; this turns it to face the opponent. */
const KNIGHT_TURN = -Math.PI / 2;
/** Seconds a piece takes to cross the board. */
const MOVE_SECONDS = 0.45;
const BASE_FOV = 35;

const toXZ = (square: string): { x: number; z: number } => ({
  x: square.charCodeAt(0) - 97 - 3.5,
  z: 8 - Number(square[1]) - 3.5,
});

const ease = (t: number): number => t * t * (3 - 2 * t);

export const createBoardScene = (
  host: HTMLElement,
  options: { side: Team; theme: ThemeId; pieces: PieceSetId; onSquare: (square: Square) => void },
): BoardScene => {
  const { side, theme, pieces, onSquare } = options;
  const palette = BOARD_THEMES[theme];

  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  // Phones get a lower pixel ratio: a 3x screen would draw nine times the pixels for little gain.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, getDeviceProfile().tier === "mobile" ? 1.5 : 2));
  host.appendChild(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(BASE_FOV, 1, 0.1, 100);
  // Look from the player's side of the board.
  camera.position.set(0, 11, side === "w" ? 11 : -11);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enabled = false;
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 8;
  controls.maxDistance = 22;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.saveState();
  // The scene is drawn only when something changed, not 60 times a second for a still board.
  let dirty = true;
  const invalidate = () => {
    dirty = true;
  };
  controls.addEventListener("change", invalidate);

  // Metal only reads as metal when it has something to reflect.
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  scene.add(new HemisphereLight(0xffffff, 0x445566, 0.5));
  scene.add(new AmbientLight(0xffffff, 0.1));
  const sun = new DirectionalLight(0xffffff, 2.4);
  sun.position.set(6, 12, 8);
  scene.add(sun);

  const surface = (color: string, roughness: number, clearcoat: number, reflect: number) =>
    new MeshPhysicalMaterial({
      color: new Color(color),
      roughness,
      clearcoat,
      clearcoatRoughness: 0.25,
      envMapIntensity: reflect,
    });
  const textures: CanvasTexture[] = [];
  const painted = (map: CanvasTexture, reflect: number) => {
    textures.push(map);
    return new MeshPhysicalMaterial({ map, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15, envMapIntensity: reflect });
  };
  // A few different nebulae, dealt out across the light squares.
  const nebulae = palette.look ? Array.from({ length: 5 }, () => painted(boardTexture(palette.look!, false), palette.reflect[0])) : [];
  const light = palette.look ? nebulae[0] : surface(palette.light, 0.25, 1, palette.reflect[0]);
  const shades = palette.look ? Array.from({ length: 5 }, () => painted(boardTexture(palette.look!, true), palette.reflect[1])) : [];
  const dark = palette.look ? shades[0] : surface(palette.dark, 0.35, 0.15, palette.reflect[1]);
  const frame = surface(palette.frame, 0.4, 0.1, palette.reflect[2]);
  const finish = ({ color, metalness, roughness, clearcoat, opacity }: Finish) =>
    new MeshPhysicalMaterial({ color: new Color(color), metalness, roughness, clearcoat, clearcoatRoughness: 0.2, opacity: opacity ?? 1, transparent: (opacity ?? 1) < 1 });
  const whitePieces = finish(PIECE_SETS[pieces].w);
  const blackPieces = finish(PIECE_SETS[pieces].b);

  const tileGeometry = new BoxGeometry(1, TILE_HEIGHT, 1);
  const rimGeometry = new BoxGeometry(9.8, 1.1, 9.8);
  const board = new Group();
  const tiles: Mesh[] = [];
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const tile = new Mesh(tileGeometry, (row + col) % 2 === 0 ? (nebulae.length ? nebulae[(row * 8 + col) % nebulae.length] : light) : shades.length ? shades[(row * 8 + col) % shades.length] : dark);
      tile.position.set(col - 3.5, -TILE_HEIGHT / 2, row - 3.5);
      tile.userData.square = "abcdefgh"[col] + (8 - row);
      board.add(tile);
      tiles.push(tile);
    }
  }
  const rim = new Mesh(rimGeometry, frame);
  rim.position.y = -TILE_HEIGHT - 0.55 + 0.01;
  board.add(rim);
  scene.add(board);

  // ---- highlights -------------------------------------------------------------

  const discGeometries = new Map<number, CircleGeometry>();
  const discGeometry = (radius: number) => {
    if (!discGeometries.has(radius)) discGeometries.set(radius, new CircleGeometry(radius, 32));
    return discGeometries.get(radius)!;
  };
  const squareGeometry = new PlaneGeometry(1, 1);
  const paints = new Map<string, MeshBasicMaterial>();
  const paint = (color: string, opacity: number) => {
    const key = `${color}/${opacity}`;
    if (!paints.has(key)) paints.set(key, new MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
    return paints.get(key)!;
  };

  const layers = {
    selection: new Group(),
    last: new Group(),
    check: new Group(),
    hint: new Group(),
    cursor: new Group(),
  };
  Object.values(layers).forEach((layer) => scene.add(layer));

  const place = (mesh: Mesh, square: string, height: number) => {
    const { x, z } = toXZ(square);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, height, z);
    return mesh;
  };
  const fill = (layer: Group, squares: (string | null)[], color: string, opacity: number, height: number) => {
    layer.clear();
    squares.forEach((square) => square && layer.add(place(new Mesh(squareGeometry, paint(color, opacity)), square, height)));
  };

  // ---- pieces -----------------------------------------------------------------

  let model: ChessModel | null = null;
  const meshes = new Map<string, Mesh>();
  const graveyard: Mesh[] = [];
  let instant = false;
  const timers = new Set<number>();

  const geometryOf = (type: PieceSymbol): { geometry: BufferGeometry; height: number } => {
    const { part } = PIECES[type];
    const source = part === undefined ? model!.king : model!.pieces[part];
    return { geometry: source.geometry, height: source.height };
  };

  /** Sends a mesh to `to`; unless replaying, it travels there over `MOVE_SECONDS`, arcing by `lift`. */
  const travel = (mesh: Mesh, to: Vector3, lift: number) => {
    const target = mesh.userData.target as Vector3;
    mesh.userData.from = mesh.position.clone();
    target.copy(to);
    mesh.userData.lift = lift;
    mesh.userData.t = instant ? 1 : 0;
    if (instant) mesh.position.copy(to);
  };

  const spawn = (type: PieceSymbol, colour: Side, square: string): Mesh => {
    const { geometry, height } = geometryOf(type);
    const size = PIECES[type].height;
    const mesh = new Mesh(geometry, colour === "w" ? whitePieces : blackPieces);
    const { x, z } = toXZ(square);
    mesh.scale.setScalar(size / height);
    mesh.position.set(x, size / 2, z);
    mesh.userData = { target: mesh.position.clone(), from: mesh.position.clone(), t: 1, lift: 0, side: colour, size, type };
    mesh.rotation.y = (type === "n" ? KNIGHT_TURN : 0) + (colour === "w" ? 0 : Math.PI);
    scene.add(mesh);
    meshes.set(square, mesh);
    return mesh;
  };

  const remove = (square: string) => {
    const mesh = meshes.get(square);
    if (!mesh) return;
    scene.remove(mesh);
    meshes.delete(square);
  };

  const clearPieces = () => {
    timers.forEach((id) => window.clearTimeout(id));
    timers.clear();
    [...meshes.keys()].forEach(remove);
    graveyard.forEach((mesh) => scene.remove(mesh));
    graveyard.length = 0;
  };

  // ---- picking ----------------------------------------------------------------

  const raycaster = new Raycaster();
  const pointer = new Vector2();
  // Piece meshes move between squares, so their square is looked up rather than stored.
  const squareOf = (mesh: Mesh): string | null => {
    for (const [square, other] of meshes) if (other === mesh) return square;
    return null;
  };
  const pickSquare = (event: PointerEvent): Square | null => {
    const box = renderer.domElement.getBoundingClientRect();
    pointer.set(((event.clientX - box.left) / box.width) * 2 - 1, -((event.clientY - box.top) / box.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects([...meshes.values(), ...tiles], false)[0];
    if (!hit) return null;
    return ((hit.object.userData.square as Square | undefined) ?? squareOf(hit.object as Mesh)) as Square | null;
  };

  let down: { x: number; y: number } | null = null;
  const onDown = (event: PointerEvent) => {
    down = { x: event.clientX, y: event.clientY };
  };
  const onUp = (event: PointerEvent) => {
    const start = down;
    down = null;
    // A drag (orbiting the view) is not a click.
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) return;
    const square = pickSquare(event);
    if (square) onSquare(square);
  };
  const canvas = renderer.domElement;
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);

  // ---- sizing and loop --------------------------------------------------------

  let fit = 1;
  const resize = () => {
    const { clientWidth: width, clientHeight: height } = host;
    if (!width || !height) return;
    renderer.setSize(width, height);
    invalidate();
    camera.aspect = width / height;
    // A tall, narrow window (a phone) would crop the sides of the board: widen the view.
    const needed = Math.max(1, fit / camera.aspect);
    camera.fov = (2 * Math.atan(Math.tan((BASE_FOV * Math.PI) / 360) * needed) * 180) / Math.PI;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  let frameId = 0;
  let last = performance.now();
  /** Moves a travelling piece along; says whether it is still on its way. */
  const animate = (mesh: Mesh, dt: number): boolean => {
    const t = mesh.userData.t as number;
    if (t >= 1) return false;
    const next = Math.min(1, t + dt / MOVE_SECONDS);
    mesh.userData.t = next;
    mesh.position.lerpVectors(mesh.userData.from as Vector3, mesh.userData.target as Vector3, ease(next));
    mesh.position.y += Math.sin(Math.PI * next) * (mesh.userData.lift as number);
    return true;
  };
  const tick = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    let moving = false;
    meshes.forEach((mesh) => {
      if (animate(mesh, dt)) moving = true;
    });
    graveyard.forEach((mesh) => {
      if (animate(mesh, dt)) moving = true;
    });
    controls.update();
    if (dirty || moving) {
      dirty = false;
      renderer.render(scene, camera);
    }
    frameId = requestAnimationFrame(tick);
  };
  frameId = requestAnimationFrame(tick);

  // ---- public API -------------------------------------------------------------

  return {
    setModel: (loaded) => {
      model = loaded;
      invalidate();
    },

    reset: (cells) => {
      clearPieces();
      cells.forEach((cell) => spawn(cell.type, cell.color, cell.square));
      invalidate();
      layers.selection.clear();
      layers.last.clear();
      layers.check.clear();
      layers.hint.clear();
      layers.cursor.clear();
    },

    setInstant: (on) => {
      instant = on;
    },

    move: (from, to) => {
      const mesh = meshes.get(from);
      if (!mesh) return;
      invalidate();
      meshes.delete(from);
      meshes.set(to, mesh);
      const { x, z } = toXZ(to);
      // Knights hop over the others; everything else lifts just enough to clear the board.
      travel(mesh, new Vector3(x, mesh.position.y, z), mesh.userData.type === "n" ? 0.9 : 0.35);
    },

    capture: (square) => {
      const mesh = meshes.get(square);
      if (!mesh) return;
      invalidate();
      meshes.delete(square);
      const owner = mesh.userData.side as Side;
      graveyard.push(mesh);

      // Same-size pieces share one row; the gap tightens as it fills (up to 15 pieces).
      const row = graveyard.filter((other) => other.userData.side === owner);
      const step = Math.min(BORDER_STEP, BORDER_ROW / Math.max(1, row.length - 1));
      row.forEach((piece, index) => {
        travel(
          piece,
          new Vector3(-BORDER_ROW / 2 + index * step, BORDER_TOP + (piece.userData.size as number) / 2, owner === "w" ? BORDER_Z : -BORDER_Z),
          piece === mesh ? 0.8 : 0,
        );
      });
    },

    promote: (square, type, colour) => {
      const swap = () => {
        remove(square);
        spawn(type, colour, square);
        invalidate();
      };
      if (instant) return swap();
      // Let the pawn arrive first, then trade it for the new piece.
      const id = window.setTimeout(() => {
        timers.delete(id);
        swap();
      }, MOVE_SECONDS * 1000);
      timers.add(id);
    },

    select: (square, targets) => {
      invalidate();
      layers.selection.clear();
      if (!square) return;
      layers.selection.add(place(new Mesh(discGeometry(0.48), paint("#4da3ff", 0.7)), square, 0.02));
      targets.forEach(({ square: target, capture }) =>
        layers.selection.add(place(new Mesh(discGeometry(capture ? 0.42 : 0.2), paint(capture ? "#ff5a5a" : "#35d07f", 0.7)), target, 0.02)),
      );
    },

    setLast: (from, to) => {
      fill(layers.last, [from, to], "#f2d34a", 0.38, 0.01);
      invalidate();
    },
    setCheck: (square) => {
      fill(layers.check, [square], "#ff2d2d", 0.55, 0.015);
      invalidate();
    },
    setHint: (from, to) => {
      fill(layers.hint, [from, to], "#37e0c4", 0.6, 0.025);
      invalidate();
    },
    setCursor: (square) => {
      fill(layers.cursor, [square], "#ffffff", 0.45, 0.03);
      invalidate();
    },

    setMovable: (on) => {
      controls.enabled = on;
    },
    setZoom: (on) => {
      fit = on ? 0.8 : 1;
      resize();
    },
    resetView: () => controls.reset(),
    setAutoRotate: (on) => {
      controls.autoRotate = on;
      controls.autoRotateSpeed = 0.8;
    },

    dispose: () => {
      cancelAnimationFrame(frameId);
      timers.forEach((id) => window.clearTimeout(id));
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      observer.disconnect();
      controls.dispose();
      if (model) disposeChessModel(model);
      discGeometries.forEach((geometry) => geometry.dispose());
      squareGeometry.dispose();
      paints.forEach((material) => material.dispose());
      [tileGeometry, rimGeometry].forEach((geometry) => geometry.dispose());
      [light, dark, frame, whitePieces, blackPieces, ...nebulae, ...shades].forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      scene.environment?.dispose();
      pmrem.dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    },
  };
};
