/**
 * Assembles and drives the chess scene.
 *
 * Plain three.js rather than react-three-fiber: R3F v9 augments
 * `React.JSX.IntrinsicElements` with every three.js export, and that global
 * widening breaks the vendored spring engine's `animated[tag] as ElementType`
 * pattern — files that are `#do-not-modify`. See [[decisions-log]] ADR-0018.
 *
 * Nothing here starts its own `requestAnimationFrame`: the scene subscribes to
 * the app-wide ticker, which reference-counts and throttles per subscriber, so
 * the frame budget for a phone does not also slow the DOM springs sharing the
 * loop.
 *
 * 📖 Docs: obsidian/frontend/chess-scene.md
 */

import {
  Color,
  Group,
  Mesh,
  PerspectiveCamera,
  Quaternion,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";

import { subscribeToTicker } from "@/lib/animation/ticker";
import { CAMERA_CLIP, CONTACT_FIT, PIECE_HEIGHTS } from "@/lib/scene/chess-defaults";
import {
  buildEnvironment,
  environmentSignature,
  type EnvironmentHandle,
} from "@/lib/scene/chess-environment";
import { createLightRig } from "@/lib/scene/chess-lights";
import { createMaterials, disposeMaterials, syncMaterials } from "@/lib/scene/chess-materials";
import type { ChessModel } from "@/lib/scene/chess-model";
import { buildLayout, pullToKing, solveBodies, type PieceBody } from "@/lib/scene/chess-physics";
import { createPostChain } from "@/lib/scene/chess-post";
import { useChessSettings } from "@/lib/scene/chess-settings";
import type { DeviceProfile } from "@/lib/scene/device";
import { easePointer, pointer } from "@/lib/pointer";
import { usePreloader } from "@/lib/preloader";
import type { ChessSceneSettings } from "@/types/scene";

/** A tab-switch return otherwise hands the scene a multi-second delta. */
const MAX_DELTA = 0.05;

/**
 * How hard the swarm collapses onto the king the moment the curtain lifts, as a
 * fraction of the distance travelled per second — so ~4 means the pieces would
 * cover the gap in a quarter second if nothing stopped them. Plenty do: the
 * king's capsule and each other.
 */
const REVEAL_PULL = 8;

/**
 * How fast the king's lean chases the pointer, per second.
 *
 * Deliberately slow. The king is heavy and already moving on two other clocks
 * (spin and bob); a lean that tracked the pointer exactly would read as the
 * mouse dragging a lightweight prop around rather than as a large object
 * noticing something.
 */
const KING_AIM_FOLLOW = 2.6;

const UP_AXIS = new Vector3(0, 1, 0);
const _kingAxis = new Vector3();
const _kingCenter = new Vector3();
const _kingTurn = new Quaternion();

export const createChessScene = (
  canvas: HTMLCanvasElement,
  model: ChessModel,
  profile: DeviceProfile,
): (() => void) => {
  const settings = useChessSettings.getState();

  const renderer = new WebGLRenderer({
    canvas,
    antialias: profile.antialias,
    alpha: false,
    stencil: false,
    powerPreference: profile.tier === "desktop" ? "high-performance" : "default",
  });
  const [minDpr, maxDpr] = profile.dpr;
  renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio, minDpr), maxDpr));

  const scene = new Scene();
  // What used to be the board is now just this. No fog either: it existed to
  // dissolve the board's far edge, and the pieces always opted out of it.
  const background = new Color(settings.stage.color);
  scene.background = background;

  const camera = new PerspectiveCamera(
    settings.camera.fov,
    1,
    CAMERA_CLIP.near,
    CAMERA_CLIP.far,
  );
  // Seeded here as well as per frame, so the prewarm render below sees the real
  // framing rather than the origin.
  camera.position.set(0, settings.camera.height, settings.camera.distance);
  camera.lookAt(0, settings.camera.target, 0);

  const materials = createMaterials(settings);
  const lightRig = createLightRig();
  lightRig.sync(settings.lights);
  scene.add(lightRig.root);

  // King, three nested groups from the outside in — `kingAim` → `kingLean` →
  // `kingSpin`. The order is the whole behaviour:
  //
  // - `kingAim` leans the assembly toward the pointer, and has to be outermost.
  //   Further in, the lean would be expressed in axes that are themselves
  //   turning, so a *stationary* pointer would produce a wobble going round and
  //   round rather than a fixed attitude.
  // - `kingLean` holds the tilt, and `kingSpin` turns **inside** it — about the
  //   king's own, already-tilted axis. So the king keeps one attitude and turns
  //   in place; it does not precess about world Y.
  //
  // The other nesting (spin outside the lean) sweeps the lean direction around
  // the vertical and makes the king wander like a top. That is what this scene
  // did until the pointer lean existed to carry the motion instead, and it is
  // the reason `motion.kingSpin` now reads as far less movement than its number
  // suggests: the king is nearly a solid of revolution, so turning about its own
  // axis shows up only in the crown.
  const kingAim = new Group();
  const kingLean = new Group();
  const kingSpin = new Group();
  kingSpin.add(new Mesh(model.king.geometry, materials.king));
  kingLean.add(kingSpin);
  kingAim.add(kingLean);
  scene.add(kingAim);

  const layout = buildLayout(
    settings.motion.pieceCount,
    model.pieces.length,
    settings.motion.orbitRadius,
  );
  const pieceRoot = new Group();
  const bodies: PieceBody[] = layout.map((seed) => {
    const part = model.pieces[seed.partIndex];
    const scale = ((PIECE_HEIGHTS[seed.partIndex] ?? 1.8) * seed.size) / part.height;

    const mesh = new Mesh(part.geometry, materials.pieces);
    mesh.scale.setScalar(scale);

    const object = new Group();
    object.add(mesh);
    object.position.copy(seed.position);
    pieceRoot.add(object);

    return {
      object,
      velocity: seed.velocity,
      angularVelocity: new Vector3(),
      radius: part.crossSection * scale * CONTACT_FIT,
      // Straight section only — the capsule's caps add `radius` at each end, so
      // subtracting it here makes the capsule match the piece's real height.
      half: Math.max(0, (part.height * scale) / 2 - part.crossSection * scale * CONTACT_FIT),
      homeScale: seed.homeScale,
      magnetPhase: seed.magnetPhase,
      magnetRate: seed.magnetRate,
      orbitDirection: seed.orbitDirection,
      orbitRate: seed.orbitRate,
    };
  });
  scene.add(pieceRoot);

  let environment: EnvironmentHandle = buildEnvironment(renderer, settings.lights);
  let envSignature = environmentSignature(settings.lights);
  scene.environment = environment.texture;
  scene.environmentIntensity = settings.lights.envIntensity;

  const post = createPostChain(
    renderer,
    scene,
    camera,
    profile.depthOfField,
    settings.post,
  );

  let viewportWidth = 0;
  let viewportHeight = 0;

  const resize = (): void => {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    if (width === viewportWidth && height === viewportHeight) return;

    viewportWidth = width;
    viewportHeight = height;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    // The composer owns its own render targets — sizing only the renderer
    // leaves the effect passes drawing into a smaller rectangle of the canvas.
    post.setSize(width, height);
  };
  resize();

  // Prewarm: compile every program and run one full frame through the composer
  // before the scene is ever animated, so nothing links mid-motion.
  renderer.compile(scene, camera);
  post.render(0);

  let previous = settings;
  const unsubscribeSettings = useChessSettings.subscribe((state) => {
    syncMaterials(materials, state, previous);
    if (state.lights !== previous.lights) {
      lightRig.sync(state.lights);
      scene.environmentIntensity = state.lights.envIntensity;

      const signature = environmentSignature(state.lights);
      if (signature !== envSignature) {
        envSignature = signature;
        environment.dispose();
        environment = buildEnvironment(renderer, state.lights);
        scene.environment = environment.texture;
      }
    }
    if (state.post !== previous.post) post.sync(state.post);
    if (state.stage !== previous.stage) background.set(state.stage.color);
    previous = state;
  });

  let elapsed = 0;
  let lastTime = performance.now();
  /** Smoothed pointer, in normalised device coordinates — drives the king's lean. */
  let aimX = 0;
  let aimY = 0;

  const frame = (time: number): void => {
    const delta = Math.min((time - lastTime) / 1000, MAX_DELTA);
    lastTime = time;

    const state: ChessSceneSettings = useChessSettings.getState();
    const { motion } = state;
    if (!profile.reducedMotion) elapsed += delta;

    // Framing is live from the panel. `fov` is the only part that needs the
    // projection matrix rebuilt, so it is guarded; position and target are
    // plain writes and cost nothing to apply every frame.
    if (camera.fov !== state.camera.fov) {
      camera.fov = state.camera.fov;
      camera.updateProjectionMatrix();
    }
    camera.position.set(0, state.camera.height, state.camera.distance);
    camera.lookAt(0, state.camera.target, 0);

    const kingScale = motion.kingSize / model.king.height;
    // Bob and scale sit on `kingLean`, not on `kingSpin`: `position` is read in
    // the *parent's* space, and `kingSpin` now hangs inside the tilt — a `.y`
    // written there would drift the king along its own leaning axis instead of
    // straight up.
    kingLean.position.y = Math.sin(elapsed * 0.34) * 0.12;
    kingLean.scale.setScalar(kingScale);
    kingLean.rotation.z = motion.kingTilt;
    if (!profile.reducedMotion) kingSpin.rotation.y += delta * motion.kingSpin;

    const kingCapsuleRadius = model.king.crossSection * kingScale * CONTACT_FIT;
    const kingHalfSection = Math.max(0, motion.kingSize / 2 - kingCapsuleRadius);

    const usePointer = profile.pointer && !profile.reducedMotion && pointer.moved;
    if (usePointer) easePointer(delta);

    // The king leans toward the pointer, chasing it on a frame-rate-independent
    // exponential rather than a fixed lerp factor — the same follow has to feel
    // the same on a throttled tier as at 60fps.
    if (usePointer) {
      const chase = 1 - Math.exp(-delta * KING_AIM_FOLLOW);
      aimX += (pointer.x * pointer.ease - aimX) * chase;
      aimY += (pointer.y * pointer.ease - aimY) * chase;
      // Negative on both: rotating about +Z tips the crown toward −X and about
      // +X tips it toward the camera, so the signs have to flip for the king to
      // lean *at* the pointer rather than away from it.
      kingAim.rotation.z = -aimX * motion.kingAim;
      kingAim.rotation.x = -aimY * motion.kingAim;
    }

    if (!profile.reducedMotion) {
      solveBodies({
        bodies,
        motion,
        camera,
        time: elapsed,
        delta,
        // Measured from the king mesh rather than guessed, and rebuilt each
        // frame from `kingLean`'s live world transform — the tilt and the
        // pointer lean both move the capsule, so it is never vertical and never
        // still. `kingSpin` is deliberately *not* the reference: it turns about
        // this same axis, so it contributes nothing but noise.
        //
        // Read in **world** space. `kingLean` is no longer a direct child of the
        // scene, so its local position and its world position stopped being the
        // same thing when the aim group went in.
        kingCenter: kingLean.getWorldPosition(_kingCenter),
        kingAxis: _kingAxis.copy(UP_AXIS).applyQuaternion(kingLean.getWorldQuaternion(_kingTurn)),
        kingHalf: kingHalfSection,
        kingRadius: kingCapsuleRadius,
        usePointer,
      });
    }


    post.render(delta);
  };

  const unsubscribeTicker = subscribeToTicker(frame, () => profile.frameBudget);

  /**
   * The swarm collapses onto the king as the curtain lifts, so the scene is
   * *entered* rather than discovered mid-orbit.
   *
   * It hangs off `lifting`, not `done`. The fade takes 0.7s, and firing at the
   * end of it put the whole gesture a beat after the page was already visible —
   * the swarm sat still, then remembered to move. On `lifting` the collapse
   * peaks 300–500ms in, by which point the curtain is ~85% gone, so it is seen
   * happening *through* the fade as one movement.
   *
   * Not the scene's own load either: the scene has been running behind the
   * curtain for seconds by then, and firing there spends the gesture where
   * nobody can see it at all.
   */
  const reveal = (): void => {
    if (!profile.reducedMotion) {
      pullToKing(bodies, kingLean.getWorldPosition(_kingCenter), REVEAL_PULL);
    }
  };

  const unsubscribeCurtain = usePreloader.subscribe((state, before) => {
    if (state.lifting && !before.lifting) reveal();
  });
  // Reduced motion and the bot path both skip straight past the fade.
  if (usePreloader.getState().lifting) reveal();

  // A ResizeObserver on the container rather than a window `resize` listener.
  // iOS Safari fires `resize` every time the URL bar collapses during scroll,
  // and rebuilding the framebuffer mid-scroll reads as a whole-scene flash —
  // but the container's size derives from `lvh` (never `dvh`), which the URL
  // bar does not change, so the observer stays quiet through exactly that case.
  // It also catches the first correct measurement, which a window listener
  // misses, and the card resizing without the window doing so.
  let resizeFrame = 0;
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(resize);
  });
  observer.observe(canvas);

  return () => {
    unsubscribeTicker();
    unsubscribeSettings();
    unsubscribeCurtain();
    observer.disconnect();
    cancelAnimationFrame(resizeFrame);

    post.dispose();
    lightRig.dispose();
    disposeMaterials(materials);
    environment.dispose();
    renderer.dispose();
  };
};
