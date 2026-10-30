---
tags: [frontend, scene, 3d, stable]
updated: 2026-07-31
---

# Chess Scene

The WebGL scene filling the hero's centre column (see [[home-hero]]): a white
king leaning at the centre, turning about its own axis and following the
pointer, black pieces orbiting it on real physics, and a flat backdrop colour
behind. The swarm collapses onto the king once as the page appears — see
[[chess-scene#Entering the scene]].

> [!note] There is no board
> The scene once carried the GLB's `deck` — a checkerboard plane, later
> reducible to a single flat fill. It was removed once that fill was all it was
> doing; `stage.color` is what remains of it. ADR: [[decisions-log]] ADR-0022.

Source model: `public/assets/chess.glb` (Draco-compressed, `KHR_materials_clearcoat`).

## Presentation — a card, not full-bleed

The canvas is **not** the viewport. It is a centred portrait card with rounded
corners, and the surround is the page's own void black:

```
width  = min(92vw, 92lvh × 0.7)      →  --scene-frame-width
aspect = 0.7                          →  --scene-aspect
```

Whichever axis runs out first wins, so the card always fits and the aspect ratio
never breaks. Tokens are in [[design-system]]; the markup is
`max-w-scene-frame rounded-scene-frame aspect-[var(--scene-aspect)] w-full`
inside a `fixed inset-0` flex centre.

Two consequences worth knowing:

- **The camera aspect is portrait**, so the horizontal field of view is much
  narrower than a full-bleed canvas would give. Vertical framing is unchanged
  (three's `fov` is the vertical one) — it is the sides that are cropped away.
  Retuning the composition means the camera settings, not the frame.
- **`lvh`, not `dvh`.** The card's height derives from the *large* viewport
  height, so a collapsing mobile URL bar never resizes it and therefore never
  re-allocates the WebGL framebuffer mid-scroll.

## Why plain three.js and not react-three-fiber

**This is the load-bearing constraint of the whole feature.** R3F v9 augments
`React.JSX.IntrinsicElements` with every three.js export, globally, for the whole
TypeScript program. Three's non-constructor exports map to JSX keys typed
`never`, which poisons `React.ElementType` — and the vendored spring engine
(`components/animation/springs/*`) resolves `animated[tag] as ElementType`, so
five `#do-not-modify` files stop type-checking the moment any file imports R3F.

No local shim fixes it (you cannot remove keys from an interface), and the engine
may not be edited without sign-off, so the scene is written against three.js
directly. ADR: [[decisions-log]] ADR-0018.

## Layout

```
src/lib/scene/
├── chess-defaults.ts      # the entire default look — one config module
├── chess-settings.ts      # zustand store the loop reads every frame
├── chess-model.ts         # GLB load + bake/normalise the geometries
├── chess-materials.ts     # the four MeshPhysicalMaterials
├── chess-lights.ts        # ambient + key spot + two rims + king core
├── chess-environment.ts   # PMREM environment built from emissive quads
├── chess-physics.ts       # rigid-body layout + per-frame solve (forces, contact)
├── chess-post.ts          # bloom / depth of field / vignette
├── chess-scene.ts         # assembles all of the above, drives the frame
├── device.ts              # tiering — DPR, frame budget, pointer, post
└── (pointer lives one level up — see below)

src/lib/
└── pointer.ts             # app-wide pointer singleton, reference-counted

src/components/common/chess-scene/
├── index.tsx              # dynamic(ssr:false) — keeps three out of first load
└── chess-scene.tsx        # React host: owns the canvas and the scene's lifetime
```

The React layer owns **only** the canvas element and the scene's lifetime.
Rendering never touches React.

## The model is a board setup, not a set of props

Every piece in the GLB carries its own rotation, scale and square position, and
each mesh's origin sits wherever Blender left it. None of that survives contact
with an orbit. `chess-model.ts` therefore **bakes** each piece once: world matrix
applied to the vertices, then `geometry.center()`. What comes out is upright
(+Y), pivots about its own centre, and takes one uniform scale to reach a target
height (`PIECE_HEIGHTS`). Downstream code only ever sets `position`, `rotation`
and one `scale` number.

The GLB also contains a `deck` — the board, a flat plane split across two
primitives. `chess-model.ts` no longer loads it; see the note at the top.

## Motion — `chess-physics.ts`

Pieces are **rigid bodies with real linear and angular velocity**. This replaced
an earlier scripted-orbit model that looked wrong for three reasons the eye
catches immediately: pieces passed through each other, the "magnetism" was a
sine on the orbital radius rather than a force (so nothing ever accelerated
toward the king or overshot coming out), and the cursor push was a stiff spring
back to a fixed path, so pieces stopped dead the instant the pointer left.
ADR: [[decisions-log]] ADR-0019.

The only thing that moves a piece now is a force:

- **Magnet** — a per-piece oscillator drives a radial force that alternates
  sign. The positive half draws the piece toward the king; it accelerates,
  carries past the shell on momentum, and the negative half throws it back out.
- **Shell** — a restoring spring toward the piece's preferred radius. Weak
  enough that the magnet clearly wins on the inward stroke, stiff enough that
  the outward stroke does not empty the frame.
- **King capsule** — a hard barrier. The king is tall and thin, so a sphere test
  either lets pieces clip its crown or holds them absurdly far off; the segment
  test is what makes a near miss look like a near miss.
- **Contact** — pieces collide as **capsules following their own axis**, not
  spheres. A chess piece is several times taller than it is wide, so a bounding
  sphere either holds two of them a whole piece-width apart or lets them lap
  through each other end-on; neither survives being looked at once the pieces
  are large and packed. Resolution is a sequential impulse with restitution and
  positional correction, plus a spin kick from the tangential component, so a
  glancing hit sets a piece tumbling. ADR: [[decisions-log]] ADR-0020.
- **Cursor** — an *impulse*, not a displacement. `drag` is low (0.42/s), so a
  scattered piece coasts for seconds before the shell spring reels it in.

**The key structural choice:** tangential velocity is *regulated* toward an
orbital target while radial velocity stays completely free. That split gives
momentum exactly where the eye reads it — in/out surges, cursor scatter,
collisions — while guaranteeing the swarm can never spin up or drift away.

Cursor repulsion is measured against the cursor **ray**, not a plane at `z = 0`:
the pieces sit at very different depths, and a plane projection shoves a piece
three units behind the king as hard as one directly under the pointer.

The pointer singleton is `lib/pointer.ts`, **not** `lib/scene/` — it stopped
being scene-specific once [[components/common]]'s `PixelWaves` wanted it too.
`attachPointer()` is reference-counted for the same reason: without the count,
whichever consumer unmounted first would tear the listener out from under the
other and reset `moved` to false.

**Four substeps × two relaxation passes.** One pass per frame is fine for two
bodies glancing off each other, but once pieces are packed tightly enough to
hold three or four simultaneous contacts, a single pass leaves residual overlap
that the next frame inherits and they sink through one another. Orientation is
integrated *inside* the substep, because the capsule segments are built from it
— a stale quaternion tests contacts against where each piece was.

### The king

Three nested groups, outside in — **`kingAim` → `kingLean` → `kingSpin`** — and
the order of all three is the behaviour.

- **`kingAim` outermost** leans the assembly toward the pointer, up to
  `motion.kingAim` (**0.45rad ≈ 26°**) at the edge of the viewport — so ~50° of
  roll from one side of the screen to the other. Further in, the lean would be
  expressed in axes that are themselves turning, so a *stationary* pointer would
  produce a wobble going round and round instead of a fixed attitude.

  The aim is symmetric, but the *absolute* angle is not: `kingTilt` (0.22rad)
  leans the king toward −X whatever the pointer does, so the swing runs from
  ~38° left at one edge to ~12° right at the other. That is the base tilt
  showing through, not a sign error. At 38° the crown sits ~0.95 world units off
  centre against a horizontal half-extent of ~1.47 at z=0 — it fits, but that is
  the margin to check before raising `kingAim` again.
- **`kingSpin` inside `kingLean`** turns the king about its own, already-tilted
  axis. It keeps one attitude and turns in place; it does **not** precess about
  world Y.

> [!note] This nesting has been both ways round, deliberately
> Spin *outside* the lean sweeps the lean direction around the vertical and the
> king wanders like a top — far more visible motion, which is why the scene ran
> that way for most of its life. The cost is that the king never holds an
> attitude, so a pointer lean has nothing stable to read against. Once the aim
> existed to carry the movement, the nesting was flipped back on request.
>
> The consequence to know: **`motion.kingSpin` now shows far less than its
> number suggests.** The king is nearly a solid of revolution, so turning about
> its own axis is visible only in the crown. It is 1.1rad/s — a value tuned for
> precession, where it was very legible.

The aim chases the pointer on a frame-rate-independent exponential
(`1 - exp(-delta * KING_AIM_FOLLOW)`, 2.6/s) rather than a fixed lerp factor, so
the follow feels the same on a throttled tier as at 60fps. It is deliberately
slow — the king is heavy and already moving on two other clocks, and tracking
the pointer exactly reads as the mouse dragging a lightweight prop around.

Both signs are **negative** (`rotation.z = -aimX * kingAim`,
`rotation.x = -aimY * kingAim`): rotating about +Z tips the crown toward −X and
about +X tips it toward the camera, so the signs flip for the king to lean *at*
the pointer rather than away from it.

**`kingLean` carries the bob, the scale and the capsule reference**, not
`kingSpin`. Three things follow from the nesting and all three are easy to get
wrong:

- `position` is read in the *parent's* space, so a `.y` written on `kingSpin`
  would drift the king along its own leaning axis rather than straight up.
- `kingCenter` and `kingAxis` both come off `kingLean`. `kingSpin` turns about
  that same axis, so it contributes nothing to the capsule but noise.
- Both are read in **world** space via `getWorldPosition()` /
  `getWorldQuaternion()`. `kingLean` is not a direct child of the scene, so
  local and world stopped being the same thing when the aim group went in.

> [!note] Measuring the king through the swarm
> The bright-pixel cloud on the canvas includes the orbiting pieces, so the
> principal axis of that cloud is a *diluted* proxy for the king's roll — a 12.6°
> roll shows up as ~6°. Two things it still resolves cleanly:
>
> - **The pointer lean.** Hold the pointer at one edge, average, then the other:
>   81.82° → 98.12°, a 16.3° swing at `kingAim` 0.45 (it was 5.5° at 0.12).
>   Drive the pointer with a dispatched `pointermove` rather than a synthetic
>   mouse move — the browser pane's input mapping does not match screenshot
>   coordinates, so a hover lands somewhere other than where it is aimed.
> - **Whether the king precesses.** Least-squares fit at the precession
>   frequency (2π/1.1 = 5.712s) over 43.8s: amplitude **2.27°**, against controls
>   of 2.20° at 3s, 1.79° at 8s and 1.43° at 2s. A flat spectrum — no periodic
>   component, so nothing is precessing. Fit at the known frequency rather than
>   eyeballing the spread: the swarm's own noise (sd 7.6°) is larger than the
>   signal, but it is broadband and the precession would not have been.

## Lighting

A glossy near-black clearcoat material is almost entirely reflection — under
point lights alone the black pieces are flat silhouettes. So the rig is two rigs:

- **Environment** (`chess-environment.ts`) — three emissive quads (cold left,
  warm right, key above) in a black room, pre-filtered through `PMREMGenerator`.
  This is what the clearcoat reflects and what draws the pieces' edges. Rebuilt
  only when a colour or intensity changes, never per frame.
- **Real lights** (`chess-lights.ts`) — ambient, a key spot, two rim points, and
  a point *inside* the king that makes it read as the light source.

> [!note] `cold` and `warm` are role names, not colour promises
> They are the two rim slots, left and right. The current preset drives *both*
> cool (cyan `#52fff3` and blue `#001eff`), which is a perfectly valid look —
> don't rename the settings to match a palette that will change again.

Two things that cost real time to find:

- **Light ranges are deliberately short.** They were tuned when a 35-unit board
  plane sat behind the pieces and any light reaching it turned it into a lit
  grey wall. The board is gone, so the ranges are now only shaping the pieces —
  worth re-tuning if the rig is ever revisited.
- **Rim lights sit well outside the orbit shell.** Intensity falls off with
  distance², so a rim inside the shell blows out whichever piece swings past it.

Light *count* is fixed for the session — adding or removing one recompiles every
material in the scene.

## Settings

There is no longer a controls panel — it was removed once the look was settled
(ADR-0023). `chess-defaults.ts` is the source of truth for the look; edit it.

The **store stayed** even though nothing writes to it any more, and that is
deliberate: materials are mutated imperatively via `useChessSettings.subscribe`,
so a settings change is applied in place, mid-flight, without re-rendering or
restarting the canvas tree. Anything that wants to art-direct the scene at
runtime — a future panel, a route, a debug hook — has a working seam.

## Entering the scene

`pullToKing(bodies, kingCenter, rate)` throws every piece straight at the king
and is fired **once**, off `usePreloader`'s `lifting` flag, so the swarm
collapses onto the king as the load curtain fades.

- It hangs off **`lifting`, not `done`** — those are 0.7s apart (see
  [[components/common]]). On `done` the whole gesture began a beat after the
  page was already visible: the swarm sat still, then remembered to move.
  Measured, the two now fire 1ms apart, 628ms before the curtain unmounts.
- Not the scene's own load either. The scene has been running behind the
  curtain for seconds by then, and firing there spends the gesture where nobody
  can see it at all.
- It **sets** velocity rather than adding to it — the seeded tangential motion
  would otherwise bend the collapse into a sweeping curve instead of a straight
  line to the centre.
- `rate` scales with distance, so every piece would arrive at the same moment.
  That is what lands it as one impact rather than a trickle.
- Nothing switches it off. It is momentum, not a mode: the king's capsule and the
  piece-to-piece contacts stop it, and the shell spring pushes the swarm back
  out into the ordinary orbit on its own.

Measured on the canvas (mean distance of lit pixels from their centroid), the
swarm contracts by ~28% and bottoms out ~300–500ms after the curtain goes —
tighter than any point in the idle magnet cycle that follows.

## Things that will bite you

- **`clearcoat` must never reach 0.** Three derives `USE_CLEARCOAT` from
  `clearcoat > 0`, so crossing zero recompiles the shader mid-session. Treat
  `0.001` as the floor, not `0`.
- **`fog` is fixed at construction** — it is a define too. Nothing uses fog now
  that the board is gone (the pieces always opted out), but if anything ever
  needs it again, set it at construction rather than flipping it later.
- **Pointer interactivity is gated on pointer *capability*, not viewport width.**
  Tying it to the desktop tier silently killed the cursor effect in every browser
  window narrower than 1180px — including the one it was being developed in.
- **The composer owns its own render targets.** Sizing only the renderer leaves
  the effect passes drawing into a smaller rectangle of the canvas.
- **Anything that is part of the look belongs in the store, not in a module
  constant.** Camera framing (fov, distance, height, aim) was a `CAMERA`
  constant for most of this scene's life, which made it invisible to everything
  that read the look — it silently fell out of every saved preset. Only the clip
  planes (`CAMERA_CLIP`) are still constants, because nothing should be tuning
  them by eye.
- **Anything a setting drives must be read per frame, not baked at
  construction.** Each body's preferred radius was first stored as an absolute
  distance computed from `orbitRadius` at load, which silently froze it — the
  value changed and nothing happened. It is a *ratio* now, multiplied by the live
  setting every frame. Check any new per-body value against this.

## Performance

Follows `.claude/skills/optimize-3d-scene`:

| Rule | Where |
|------|-------|
| §1 no scene for bots | `views/home.tsx` — `isBot()`, plus `dynamic(ssr:false)` |
| §2 tier once at construction | `lib/scene/device.ts` |
| §3 prewarm | `renderer.compile()` + one composer frame before the loop starts |
| §4/§5 shared ticker + frame budget | `subscribeToTicker` — no per-scene rAF |
| §6 clamped DPR | `device.ts` → `dpr`, applied to renderer *and* composer |
| §7 tiered post | depth of field off on mobile **and whenever `bokehScale` is 0** — at zero it rendered a full-screen no-op; `multisampling: 0` |
| §8 few lights, IBL | four lights + PMREM environment |
| §12 Draco, local decoder | `public/draco/` — never a CDN |
| §13 `lvh`-derived frame, own layer, clamped `dt`, full dispose | `chess-scene.tsx`, `chess-scene.ts` |

**Not yet measured on a real device.** The tiering and budgets are ported from
the skill's canonical values, not tuned against numbers from this scene — run
§0 before trusting them.

## Related

[[system-overview]] · [[tech-stack]] · [[design-system]] · [[optimize-3d-scene]] ·
[[components/common]] · [[decisions-log]]

## Piece shape "set2020" (2026-10-30)

`src/lib/chess/set-2020.ts` loads `public/assets/chess-set-2020.3ds` with `TDSLoader` and bakes it into a `ChessModel` (cached promise). `buildShapeModel` in `piece-shapes.ts` is async because of it; callers are `board-3d.tsx` and `piece-previews.ts`. See the changelog entry of 2026-10-30.
