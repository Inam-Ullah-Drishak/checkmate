---
tags: [meta, performance, seo]
updated: 2026-10-06
---

# Optimization history — Voxelia

What the optimization pipeline did to this project, why, and what must not be
undone. Maintained by the optimization pipeline
(`getlayers-pipeline/optimization-pipeline`, full record with every run in
`obsidian/Projects/voxelia.md` there; D-numbers refer to its
`obsidian/Meta/decisions-log.md`). This file is the condensed version for an
agent editing the project. The narrative per change is in [[changelog]]; the
author's architecture decisions (ADR-0018 plain three.js chess scene,
ADR-0024 page assembles after the curtain, ADR-0025 native cursor) are in
[[decisions-log]]. Last updated 2026-10-06.

The page is one screen: headline, a three.js chess scene with physics (Draco
GLB, `LazyChessScene`), a stat grid, a pixel-wave canvas backdrop, a 3D
cursor, and a counting curtain in the root layout.

## Current state

| | value | date / source |
|---|---|---|
| Status | **optimized** | 2026-09-30 (pass 1); re-confirmed D-029 (2026-10-04) and D-031 (2026-10-06) |
| Lighthouse mobile | **97** / A11y 100 / BP 100 / SEO 100 | 2026-10-04, D-029 hosted record (`opt-voxelia`, merged `f014e00`) |
| Lighthouse desktop | **99** / 100 / 100 / 100 | 2026-10-04, same |
| Robot form (PSI UA) | 100/100 | 2026-10-04, same |
| Scroll PC / mobile | **ideal** (0 %, max 10 ms) / **ideal** (0 %, max 18 ms) | 2026-10-06, D-031 production sweep |
| After pass-2 (D-033 menu) | local A/B: mobile 96 / desktop 99, A11y/BP/SEO 100 — no hosted record | 2026-10-06 |
| Live URL | https://getlayers-voxelia-sdbflksahjf.vercel.app (Vercel, textura-agency) | `main` |

## Invariants — do not undo

- **`HomeView` is synchronous; no `await isBot()` in a view.** The proxy
  decides: `src/proxy.ts` + `src/utils/bot-ua.ts` (incl. GPTBot, ClaudeBot,
  PerplexityBot…) rewrite robots to `src/app/robot-view/` (D-016). `isBot()`
  reads `headers()` and made `/` dynamic for everyone (cache MISS → now
  `PRERENDER`).
- **Robot form** — same content, no motion: the scene cell is
  `ChessStill` (`src/components/common/chess-scene/chess-still.tsx`, two
  captured stills by breakpoint: a tall column at `lg`, a landscape band
  below); the root-layout curtain (`src/components/common/preloader/`,
  `src/lib/preloader.ts`) is hidden before paint and `finish()`ed in a layout
  effect; `Spring` / `TextEngine` → robot twins. Robot 99/92 → 100/100.
- **Consent banner is server-rendered** (under the z-40 curtain). It was the
  phone LCP: mobile 88 → 96, LCP 3.2 → 1.4 s.
- **Fonts are Latin-subset WOFF2** (`src/app/fonts/*-latin.woff2`, 188 →
  38 KB). The original `.otf` / `.ttf` files **stay**: `opengraph-image.tsx`
  (and the icon routes) read them — do not delete them.
- **Reveals fade through a uniform mask at opacity 1**
  (`src/utils/animation/fade-mask.ts`), removed at rest; robot plain. axe
  sampled the stat grid mid-fade at 1.6–4.4:1 on `#004ac7` and the "Say
  hello" pill at 2.49:1. Mobile A11y 95 → 100 ×3, axe-sweep 5 → 0. No colour
  was changed.
- **Native cursor is never hidden** (D-024, ADR-0025); the 3D cursor follows
  on a spring (tension 260, friction 28, ~0.2 s; first move places it).
- **Full-screen mobile menu** (`src/views/home/mobile-menu.tsx`, D-033) is
  portalled to `<body>` (`<main>` is a `relative z-0` stacking context),
  z-55 over the z-50 banner/cursor; `inert` + `hidden` when closed, with
  `hidden={!open && !shown}` — otherwise focus stayed on the toggle on open.
  Escape closes, focus returns to the toggle, Lenis stopped while open.
- **`/privacy-policy`** exists (the banner link 404'd; BP 96 → 100).
- **No empty `loading.tsx`** — with it a no-JS crawler reads the `<h1>`
  inside `<div hidden>` (fleet fix 2026-10-03).
- **Origin** — `siteConfig.url` = `NEXT_PUBLIC_SITE_URL` → Vercel production
  domain → localhost (D-019).
- `src/utils/math.ts` typed without `any` (`verify.sh` 1 FAIL → 0).

## Owner decisions

- **D-016** (2026-09-29) robots get a static page, same content, no motion.
- **D-024** (2026-10-01) native cursor stays; custom cursor only as a
  follower. The spring follow was flagged "owner to confirm".
- **D-017 / D-026 / D-028 / D-029** A11y/BP/SEO 100 on every device and form,
  performance ≥ 90 both.
- **D-031** (2026-10-05) scroll ideal both devices.
- **D-033** (2026-10-06) owner: "make proper full screen mobile menu which
  smoothly appears with immersive animation" → pixel-staircase curtain
  (`a461733`). Voxelia's other items were approved as-is.
- **D-034** (2026-10-06) merge pass-2 to main; iOS toolbar / phone frame caps
  only once the owner notices (#50).

## History by pass

- **Pass 1** (2026-09-30, `optimize/pass-1`, `b784579`) — hosted baseline PC
  99 / mobile 88, mobile A11y 95, BP 96, scroll ideal/ideal.
  - robot path, `HomeView` sync → robot 100/100, `/` MISS → PRERENDER
  - consent banner SSR → mobile 88 → 96, LCP 3.2 → 1.4 s, A11y 95 → 100
  - Latin WOFF2 fonts, `/privacy-policy`, D-019 origin → BP 100
  - after: PC 99 / mobile 96, 100s; robot 100 across; PSI 99/92
- **Owner review** (2026-10-01) — `a0a81f3` native cursor kept, 3D cursor on
  a spring; `c42622d` `math.ts` typed.
- Fleet: `4a1f177` AI crawlers → robot form (2026-10-02); `27728a7` empty
  `loading.tsx` deleted (2026-10-03).
- **D-029** (2026-10-04, `f014e00`) — production sweep had read mobile A11y 95
  (stat grid mid-fade); reveals through `fade-mask.ts`. Hosted PC 99 /
  mobile 97, A11y 100, axe-sweep 0, scroll ideal both.
- **D-031** sweep (2026-10-06) — scroll ideal both (0 % dropped).
- **Pass 2 / D-033** (2026-10-06, `optimize/pass-2`, `a461733`, on main) —
  full-screen menu: `--menu-ground` (brand-700) dropping as a six-column
  pixel staircase (clip-path polygon, `MENU_CURTAIN` 80/18, exit
  `MENU_EXIT` 320/36), Jersey links rising from masks, burger → ✕ in place
  (`MenuBars`, `MENU_TOGGLE`); `site-header.tsx` bar nav `hidden sm:flex`.
  Tokens three-tier (`--raw-text-menu` → `--menu` → `--text-menu`). Lighthouse
  A/B mobile 96 = 96, desktop 99 = 99. Scroll not re-run (no scene change).

## Tried and reverted / didn't help

- Nothing reverted on this project. One noise trap: a single local
  Lighthouse run at load 47 read 71/72 — gone in the back-to-back A/B. Judge
  with an A/B, not one run.

## Open items / leads

- **Mobile frame budget**: `src/lib/scene/device.ts` sets `frameBudget`
  1000/30 on mobile, 1000/45 on tablet (a ms-budget throttle); the pixel-wave
  backdrop subscribes at a 30 fps budget. The fleet rule since D-036/D-037 is
  no fixed phone cap (a budget throttle drew ~15 fps on evolve); voxelia is a
  listed candidate. Per D-034 (#50) change it only once the owner notices;
  measure with `fps-probe`.
- Not verified on iOS Safari: the menu's `dvh` panel under the URL bar and the
  clip-path's smoothness at 120 Hz.
- The menu's `#pieces` link has no target section on the page (unchanged
  from before).
- No hosted record after pass-2.

## How to measure

```sh
cd getlayers-pipeline/optimization-pipeline
node tools/measure.mjs voxelia                 # local build: Lighthouse + scroll, PC + mobile ×3
node tools/measure.mjs voxelia --hosted        # production URL (+ --psi when public)
node tools/axe-sweep.mjs <url> --device both   # contrast through the entrance fades
node tools/fps-probe.mjs <url>                 # phone frame rate (the 30 fps budget)
node tools/capture-still.mjs …                 # re-capture ChessStill (--canvas --clip) if the scene changes
```
`tools/verify.sh` must stay at 0 FAIL.
