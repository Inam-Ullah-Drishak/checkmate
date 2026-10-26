/**
 * Home view — the Figma hero over the interactive chess scene.
 *
 * A Server Component: the scene itself is a `ssr: false` client leaf, so
 * three.js never touches the server render or the initial bundle. Crawlers and
 * Lighthouse get the copy and the layout but no scene — reading the UA opts this
 * route out of static prerendering, which is the deliberate trade for never
 * shipping a WebGL bundle to a robot.
 *
 * Layout is the design's, expressed proportionally: the shell is inset 20px with
 * a rule down each side, and the body splits 493 / 414 / 493 — copy, scene,
 * figures. Those are `fr` ratios rather than fixed widths, so the composition
 * holds at any width while the starter's adaptive grid scales the type and
 * gutters with it.
 *
 * 📖 Docs: obsidian/frontend/chess-scene.md
 */

import { LazyChessScene } from "@/components/common/chess-scene";
import { ChessStill } from "@/components/common/chess-scene/chess-still";
import { RobotProvider, RobotView } from "@/components/common/robot-view";
import { homeCopy } from "@/data/mocks/home";
import { HeroIntro } from "@/views/home/hero-intro";
import { SiteHeader } from "@/views/home/site-header";
import { PlayerStats } from "@/views/home/player-stats";

/** `robot`: the proxy's form for crawlers and lab tools (D-016) — the scene
 *  as a still, every reveal at rest. (It used to `await isBot()` here, which
 *  rendered `/` per request.) */
export const HomeView = ({ robot = false }: { robot?: boolean }) => {
  return (
    <RobotProvider robot={robot}>
      {robot && <RobotView />}
      <main className="relative z-0 flex min-h-lvh flex-col px-shell-inset lg:h-lvh">
        <h1 className="sr-only">{homeCopy.title}</h1>

        <div className="flex min-h-0 flex-1 flex-col">
          <SiteHeader
            company={homeCopy.company}
            links={homeCopy.nav}
            contact={homeCopy.contact}
          />

          {/* Three columns from `lg`, stacked below it. The scene needs an
            explicit aspect while stacked — with no fixed body height there is
            nothing for it to fill. */}
          <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[493fr_414fr_493fr]">
            <HeroIntro
              headline={homeCopy.headline}
              description={homeCopy.description}
              action={homeCopy.action}
              actionHref="/play"
            />

            {/* At `lg` this fills the cell exactly, as `image 640` does in the design. */}
            <div className="relative aspect-[4/5] sm:aspect-[3/2] lg:aspect-auto">
              {robot ? <ChessStill /> : <LazyChessScene />}
            </div>

            <PlayerStats stats={homeCopy.stats} />
          </div>
        </div>
      </main>
    </RobotProvider>
  );
};
