# Checkmate

A chess game for the browser, played on a 3D board against the computer. It is a
front-end-only portfolio project: there is no backend, and everything the game
remembers (settings, record, past games, puzzle progress) is kept in the
visitor's own browser with `localStorage` and `sessionStorage`.

## What it does

- Play against the computer: five levels (easy, medium, hard with a small search
  engine of our own; master and GM with Stockfish 19), as silver or gold.
- 3D board and pieces rendered with three.js: 8 board looks, 8 piece designs, a
  settings page with picture previews.
- Undo, hints, resign, draw offers, an optional per-move timer (your turn is
  skipped when it runs out), promotion choice, sound, legal-move dots,
  last-move highlight, check glow.
- Opening names, a move list, PGN copy and import, a history of the last ten
  games with a step-through replay, win/loss stats.
- Puzzles (mate in one and two) and a full illustrated rules page for beginners.
- Playable with the keyboard: Tab to the board, arrow keys to move the cursor,
  Enter or Space to pick a square.

## Run it

Node 22.13 or newer.

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # rules, puzzles and data checks
npm run build    # production build
```

The game is on `/play`. The home page links to it.

## How it is built

| Part | Where |
|------|-------|
| Pages | `src/app` (routes) delegate to `src/views` |
| Game screen and menu | `src/components/common/board-3d` (`game.tsx` menu, `board-3d.tsx` play/puzzle/review) |
| 3D board | `src/lib/chess/board-scene.ts` (three.js), pieces from `public/assets/chess.glb` |
| Rules and move checking | `chess.js` |
| Computer | `src/lib/chess/engine.ts`, `cpu.worker.ts`, Stockfish in `public/stockfish` |
| Saved data | `src/lib/chess/storage.ts` |
| Rules page copy and puzzles | `src/data/rules.ts`, `src/lib/chess/puzzles.ts` |

The home page is the Textura `next16-claude-starter` (spring animations, pixel
backdrop, hero scene). Its conventions are in `AGENTS.md`.

## Deploying

It is a static Next.js app with no server code. On Vercel, import the repository
and set `NEXT_PUBLIC_SITE_URL` to the public address so links, the sitemap and
the share card point at the right place. Any host that serves a Next.js build
works.

## Licences

- Stockfish 19 (`public/stockfish`) is GPL-3.0, and its licence text is shipped
  next to it. Publishing the site with it can oblige you to publish the site's
  source under the GPL as well. To avoid that, remove the Master and GM levels
  and the hint button (`src/lib/chess/engine.ts`) and delete `public/stockfish`.
- The 3D chess model and fonts come from the starter; check their licences
  before commercial use.
