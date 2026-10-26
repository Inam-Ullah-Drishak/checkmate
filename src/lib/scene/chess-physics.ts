/**
 * Rigid-body simulation for the black pieces.
 *
 * Replaces the original scripted-orbit model, which looked wrong for three
 * reasons the eye picks up immediately: pieces passed through each other, the
 * "magnetism" was a sine on the orbital radius rather than a force (so nothing
 * ever accelerated toward the king or overshot on the way out), and the cursor
 * push was a stiff spring back to a fixed path, so pieces stopped the instant
 * the pointer left instead of coasting. ADR: [[decisions-log]] ADR-0019.
 *
 * Every piece now carries real linear and angular velocity, and the only thing
 * that moves it is a force:
 *
 * - **Magnet** — an oscillator per piece drives a radial force that alternates
 *   sign. Positive half pulls it toward the king; it accelerates, overshoots the
 *   shell on momentum, and the negative half throws it back out.
 * - **Shell** — a soft spring toward the piece's preferred radius. This is what
 *   keeps the swarm a composition instead of a diffusion, and it is deliberately
 *   weak enough that the magnet wins in the short term.
 * - **King capsule** — a hard barrier. The king is tall and thin, so a sphere
 *   test either lets pieces clip its crown or holds them absurdly far off; the
 *   segment test is what makes a near miss look like a near miss.
 * - **Contact** — pairwise impulse resolution with restitution, plus a spin kick
 *   from the tangential component, so a glancing hit sets a piece tumbling.
 * - **Cursor** — an impulse, not a displacement. Drag is low, so a scattered
 *   piece coasts for seconds and settles back under the shell spring.
 *
 * Tangential velocity is *regulated* toward an orbital target while radial
 * velocity stays completely free. That split is the whole trick: it gives
 * momentum exactly where the eye reads it (in/out surges, cursor scatter,
 * collisions) while guaranteeing the swarm never spins up or drifts away.
 *
 * All vector maths uses module-scope scratch objects — allocating per piece per
 * frame is a GC stall.
 *
 * 📖 Docs: obsidian/frontend/chess-scene.md
 */

import { Camera, Object3D, Quaternion, Ray, Vector3 } from "three";

import { pointer } from "@/lib/pointer";
import type { MotionSettings } from "@/types/scene";

/** Radial acceleration per unit of `magnetAmount`. */
const MAGNET_GAIN = 9;
/**
 * Restoring pull toward the piece's preferred radius.
 *
 * Weak enough that the magnet clearly wins on the inward stroke, stiff enough
 * that the outward stroke does not throw the swarm past the frame — at 2.4 the
 * composition emptied out completely on every repel phase.
 */
const SHELL_STIFFNESS = 3.2;
/** How fast tangential velocity is steered back to the orbital target (per second). */
const TANGENT_TRACK = 0.85;
/** Spin imparted by the tangential part of a contact impulse. */
const SPIN_GAIN = 1.4;
const ANGULAR_DRAG = 0.5;
const MAX_SPEED = 16;
const MAX_SPIN = 4;
/**
 * Substeps, and relaxation passes per substep.
 *
 * A sequential-impulse solver needs iterations to settle a *pile*: one pass per
 * frame is fine for two bodies glancing off each other, but once pieces are
 * packed tightly enough to hold three or four simultaneous contacts, a single
 * pass leaves residual overlap that the next frame inherits, and they sink
 * through one another. 4 × 2 is what stops that at this density.
 */
const SUBSTEPS = 4;
const CONTACT_PASSES = 2;
/** Fraction of an overlap removed per pass — full correction fights itself and jitters. */
const CONTACT_RELAX = 0.8;

const UP = new Vector3(0, 1, 0);
const _ray = new Ray();
const _dir = new Vector3();
const _tangent = new Vector3();
const _normal = new Vector3();
const _relative = new Vector3();
const _closest = new Vector3();
const _push = new Vector3();
const _spinAxis = new Vector3();
const _spin = new Quaternion();
const _axis = new Vector3();
const _contactA = new Vector3();
const _contactB = new Vector3();
const _deltaA = new Vector3();
const _deltaB = new Vector3();
const _offset = new Vector3();
const _kingStart = new Vector3();
const _kingEnd = new Vector3();

/** Per-body capsule endpoints, rebuilt each relaxation pass. */
const _starts: Vector3[] = [];
const _ends: Vector3[] = [];

const clamp01 = (value: number): number => (value < 0 ? 0 : value > 1 ? 1 : value);

/**
 * Closest points between two line segments (Ericson, *Real-Time Collision
 * Detection* §5.1.9). Degenerate zero-length segments fall through to the
 * point-vs-segment and point-vs-point cases.
 */
const closestBetweenSegments = (
  startA: Vector3,
  endA: Vector3,
  startB: Vector3,
  endB: Vector3,
  outA: Vector3,
  outB: Vector3,
): void => {
  _deltaA.subVectors(endA, startA);
  _deltaB.subVectors(endB, startB);
  _offset.subVectors(startA, startB);

  const lengthA = _deltaA.dot(_deltaA);
  const lengthB = _deltaB.dot(_deltaB);
  const projection = _deltaB.dot(_offset);
  const epsilon = 1e-8;

  let alpha = 0;
  let beta = 0;

  if (lengthA <= epsilon && lengthB <= epsilon) {
    // Both degenerate — the segments are points.
  } else if (lengthA <= epsilon) {
    beta = clamp01(projection / lengthB);
  } else {
    const along = _deltaA.dot(_offset);
    if (lengthB <= epsilon) {
      alpha = clamp01(-along / lengthA);
    } else {
      const between = _deltaA.dot(_deltaB);
      const denominator = lengthA * lengthB - between * between;
      alpha =
        denominator !== 0 ? clamp01((between * projection - along * lengthB) / denominator) : 0;
      beta = (between * alpha + projection) / lengthB;

      if (beta < 0) {
        beta = 0;
        alpha = clamp01(-along / lengthA);
      } else if (beta > 1) {
        beta = 1;
        alpha = clamp01((between - along) / lengthA);
      }
    }
  }

  outA.copy(startA).addScaledVector(_deltaA, alpha);
  outB.copy(startB).addScaledVector(_deltaB, beta);
};

export interface PieceBody {
  object: Object3D;
  velocity: Vector3;
  angularVelocity: Vector3;
  /** Capsule radius in world units. */
  radius: number;
  /** Half the capsule's straight section — its total length is `2 * half + 2 * radius`. */
  half: number;
  /**
   * Preferred distance from the king, as a multiple of `motion.orbitRadius`.
   *
   * A ratio rather than an absolute distance so the panel's orbit-radius slider
   * keeps working — baking the absolute value at construction silently froze the
   * shell at whatever the radius happened to be on load.
   */
  homeScale: number;
  magnetPhase: number;
  magnetRate: number;
  orbitDirection: number;
  orbitRate: number;
}

/** Deterministic PRNG — the opening composition must be identical on every load. */
const seededRandom = (seed: number) => {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return value / 2147483647;
  };
};

export interface BodyLayout {
  position: Vector3;
  velocity: Vector3;
  homeScale: number;
  magnetPhase: number;
  magnetRate: number;
  orbitDirection: number;
  orbitRate: number;
  partIndex: number;
  size: number;
}

/**
 * Seeds positions on a shell around the king, already moving tangentially so the
 * first second of the simulation looks settled rather than dropped.
 */
export const buildLayout = (count: number, partCount: number, radius: number): BodyLayout[] => {
  const random = seededRandom(9241);
  const range = (min: number, max: number) => min + random() * (max - min);

  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2 + range(-0.35, 0.35);
    // A narrow band of preferred radii, and a shallow spread of heights: the
    // swarm should read as a cluster pressed around the king, not a cloud.
    const homeScale = range(0.9, 1.18);
    const home = radius * homeScale;
    const height = range(-1.55, 1.65);
    const planar = Math.sqrt(Math.max(home * home - height * height, home * 0.35));
    const direction = random() > 0.3 ? 1 : -1;
    const orbitRate = range(0.65, 1.4);

    const position = new Vector3(Math.cos(angle) * planar, height, Math.sin(angle) * planar);
    const velocity = new Vector3(-Math.sin(angle), 0, Math.cos(angle)).multiplyScalar(
      direction * orbitRate * planar * 0.2,
    );

    return {
      position,
      velocity,
      homeScale,
      magnetPhase: range(0, Math.PI * 2),
      magnetRate: range(0.6, 1.55),
      orbitDirection: direction,
      orbitRate,
      partIndex: index % partCount,
      size: range(0.82, 1.2),
    };
  });
};

/**
 * One-shot inward impulse — every piece is thrown straight at the king.
 *
 * Used once, when the load curtain lifts: the swarm collapses onto the king from
 * all sides, packs against its capsule and against itself, and is then pushed
 * back out by the shell spring into the ordinary orbit. Nothing has to switch it
 * off, because it is momentum rather than a mode — the existing forces absorb it
 * on their own, which is why it reads as a snap rather than a state change.
 *
 * The velocity is *set*, not added: the seeded tangential velocity would
 * otherwise bend the collapse into a sweeping curve, and the whole point is that
 * it looks magnetic — a straight line to the centre.
 *
 * `rate` is per second and scales with distance, so every piece would reach the
 * king at the same moment. That is what makes it land as one impact instead of a
 * trickle; the far pieces simply set off faster.
 */
export const pullToKing = (bodies: PieceBody[], kingCenter: Vector3, rate: number): void => {
  for (const body of bodies) {
    _push.subVectors(kingCenter, body.object.position);
    if (_push.lengthSq() <= 1e-8) continue;

    body.velocity.copy(_push).multiplyScalar(rate);
    body.angularVelocity.set(0, 0, 0);
  }
};

export interface SolveOptions {
  bodies: PieceBody[];
  motion: MotionSettings;
  camera: Camera;
  time: number;
  delta: number;
  /** Centre of the king's collision capsule, in world space. */
  kingCenter: Vector3;
  /** Unit direction of the king's capsule — it leans and precesses, so this moves. */
  kingAxis: Vector3;
  /** Half the king capsule's straight section. */
  kingHalf: number;
  /** Radius of the king's collision capsule. */
  kingRadius: number;
  usePointer: boolean;
}

const applyCursorImpulse = (bodies: PieceBody[], motion: MotionSettings, delta: number): void => {
  for (const body of bodies) {
    _ray.closestPointToPoint(body.object.position, _closest);
    _push.subVectors(body.object.position, _closest);
    const distance = _push.length();
    if (distance <= 1e-4 || distance >= motion.cursorRadius) continue;

    // Squared falloff — a linear one pops as pieces cross the boundary.
    const falloff = 1 - distance / motion.cursorRadius;
    const strength = motion.cursorForce * falloff * falloff * pointer.ease;
    body.velocity.addScaledVector(_push, (strength * delta) / distance);
    body.angularVelocity.addScaledVector(_push, (strength * delta * 0.12) / distance);
  }
};

/** Rebuild every body's world-space capsule segment from its current orientation. */
const buildSegments = (bodies: PieceBody[]): void => {
  while (_starts.length < bodies.length) {
    _starts.push(new Vector3());
    _ends.push(new Vector3());
  }

  for (let index = 0; index < bodies.length; index += 1) {
    const body = bodies[index];
    _axis.copy(UP).applyQuaternion(body.object.quaternion);
    _starts[index].copy(body.object.position).addScaledVector(_axis, -body.half);
    _ends[index].copy(body.object.position).addScaledVector(_axis, body.half);
  }
};

const resolvePair = (first: PieceBody, second: PieceBody, index: number, other: number, restitution: number): void => {
  closestBetweenSegments(
    _starts[index],
    _ends[index],
    _starts[other],
    _ends[other],
    _contactA,
    _contactB,
  );

  _normal.subVectors(_contactB, _contactA);
  const distance = _normal.length();
  const contact = first.radius + second.radius;
  if (distance >= contact) return;

  if (distance <= 1e-5) {
    // Exactly coincident axes — fall back to the line between centres so the
    // pair still has a direction to separate along.
    _normal.subVectors(second.object.position, first.object.position);
    if (_normal.lengthSq() <= 1e-8) _normal.set(0, 1, 0);
    _normal.normalize();
  } else {
    _normal.divideScalar(distance);
  }

  // Positional correction first: bodies that are only impulse-corrected keep
  // their overlap into the next frame and sink through each other.
  const overlap = (contact - distance) * 0.5 * CONTACT_RELAX;
  first.object.position.addScaledVector(_normal, -overlap);
  second.object.position.addScaledVector(_normal, overlap);

  _relative.subVectors(second.velocity, first.velocity);
  const approach = _relative.dot(_normal);
  if (approach >= 0) return;

  // Equal masses, so the impulse splits evenly.
  const impulse = (-(1 + restitution) * approach) / 2;
  first.velocity.addScaledVector(_normal, -impulse);
  second.velocity.addScaledVector(_normal, impulse);

  // Whatever of the relative motion was *not* along the normal becomes spin.
  _relative.addScaledVector(_normal, -approach);
  _spinAxis.crossVectors(_normal, _relative).multiplyScalar(SPIN_GAIN);
  first.angularVelocity.addScaledVector(_spinAxis, -1);
  second.angularVelocity.add(_spinAxis);
};

/** The king is immovable, so the whole correction lands on the piece. */
const resolveKing = (body: PieceBody, index: number, restitution: number): void => {
  closestBetweenSegments(_starts[index], _ends[index], _kingStart, _kingEnd, _contactA, _contactB);

  _normal.subVectors(_contactA, _contactB);
  const distance = _normal.length();
  const contact = body.radius + _kingRadius;
  if (distance >= contact) return;

  if (distance <= 1e-5) {
    _normal.subVectors(body.object.position, _kingStart);
    if (_normal.lengthSq() <= 1e-8) _normal.set(1, 0, 0);
    _normal.normalize();
  } else {
    _normal.divideScalar(distance);
  }

  body.object.position.addScaledVector(_normal, (contact - distance) * CONTACT_RELAX);

  const approach = body.velocity.dot(_normal);
  if (approach >= 0) return;
  body.velocity.addScaledVector(_normal, -(1 + restitution) * approach);
};

/** Set by `solveBodies` once per frame; the king's capsule is static within a frame. */
let _kingRadius = 0;

const resolveContacts = (bodies: PieceBody[], restitution: number): void => {
  for (let pass = 0; pass < CONTACT_PASSES; pass += 1) {
    buildSegments(bodies);

    for (let index = 0; index < bodies.length; index += 1) {
      resolveKing(bodies[index], index, restitution);

      for (let other = index + 1; other < bodies.length; other += 1) {
        resolvePair(bodies[index], bodies[other], index, other, restitution);
      }
    }
  }
};

export const solveBodies = ({
  bodies,
  motion,
  camera,
  time,
  delta,
  kingCenter,
  kingAxis,
  kingHalf,
  kingRadius,
  usePointer,
}: SolveOptions): void => {
  if (usePointer) {
    _ray.origin.setFromMatrixPosition(camera.matrixWorld);
    _ray.direction.set(pointer.x, pointer.y, 0.5).unproject(camera).sub(_ray.origin).normalize();
    applyCursorImpulse(bodies, motion, delta);
  }

  // The king leans and precesses, so its capsule is rebuilt from the live axis
  // every frame rather than assumed vertical.
  _kingRadius = kingRadius;
  _kingStart.copy(kingCenter).addScaledVector(kingAxis, -kingHalf);
  _kingEnd.copy(kingCenter).addScaledVector(kingAxis, kingHalf);

  const step = delta / SUBSTEPS;
  const drag = Math.exp(-motion.drag * step);
  const angularDrag = Math.exp(-ANGULAR_DRAG * step);

  for (let iteration = 0; iteration < SUBSTEPS; iteration += 1) {
    for (const body of bodies) {
      const position = body.object.position;
      const home = motion.orbitRadius * body.homeScale;
      const distance = position.length();
      if (distance <= 1e-4) {
        position.set(0, home, 0);
        continue;
      }
      _dir.copy(position).divideScalar(distance);

      // Magnet: alternates sign, so the piece is drawn in, carries through on
      // momentum, and is thrown back out.
      const swing = Math.sin(time * motion.magnetSpeed * body.magnetRate + body.magnetPhase);
      let radial = -swing * motion.magnetAmount * MAGNET_GAIN;

      // Shell: weak restoring pull toward this piece's preferred radius.
      radial += (home - distance) * SHELL_STIFFNESS;
      body.velocity.addScaledVector(_dir, radial * step);

      // Tangential regulation: the one part of the motion that is steered rather
      // than simulated, so the swarm can never spin up or wander off.
      _tangent.crossVectors(UP, _dir);
      const tangentLength = _tangent.length();
      if (tangentLength > 1e-3) {
        _tangent.divideScalar(tangentLength);
        const target = motion.orbitSpeed * body.orbitRate * home * body.orbitDirection;
        const current = body.velocity.dot(_tangent);
        body.velocity.addScaledVector(_tangent, (target - current) * TANGENT_TRACK * step);
      }

      body.velocity.multiplyScalar(drag);
      body.angularVelocity.multiplyScalar(angularDrag);
      body.velocity.clampLength(0, MAX_SPEED);
      body.angularVelocity.clampLength(0, MAX_SPIN);

      position.addScaledVector(body.velocity, step);

      // Orientation is integrated inside the substep, not once at the end: the
      // capsule segments are built from it, so a stale quaternion would test
      // contacts against where each piece *was*.
      const rate = body.angularVelocity.length();
      if (rate > 1e-4) {
        _spinAxis.copy(body.angularVelocity).divideScalar(rate);
        _spin.setFromAxisAngle(_spinAxis, rate * step);
        body.object.quaternion.premultiply(_spin).normalize();
      }
    }

    resolveContacts(bodies, motion.bounce);
  }
};
