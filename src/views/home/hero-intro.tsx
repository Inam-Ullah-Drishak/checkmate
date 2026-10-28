/**
 * Hero left column — headline above the rule, copy and call to action below it.
 *
 * The 534 / 211 row split is the design's, and only applies from `lg`: the rule
 * sits at y=589 of a body that runs 55 → 800. Inside the lower row,
 * `justify-between` reproduces the 62px gap between copy and button without
 * hard-coding it — that gap is whatever is left once both blocks and the 30px
 * gutters are placed. Below `lg` the column is ordinary stacked flow, since
 * there is no fixed body height to divide.
 *
 * 📖 Docs: obsidian/frontend/home-hero.md
 */

import { iceCta } from "@/components/common/board-3d/ui";
import { Headline } from "@/views/home/headline";
import { Reveal } from "@/views/home/reveal";
import { StartMatch } from "@/views/home/start-match";

export interface HeroIntroProps {
  /** Rendered one line per entry, as in the design. */
  headline: string[];
  description: string;
  action: string;
  actionHref: string;
}

export const HeroIntro = ({ headline, description, action }: HeroIntroProps) => (
  <section
    aria-labelledby="hero-headline"
    className="flex flex-col lg:grid lg:grid-rows-[534fr_211fr]"
  >
    <div className="px-shell-gutter pt-shell-gutter pb-10 lg:pb-0">
      <Headline lines={headline} />
    </div>

    <div className="flex flex-col justify-between gap-10 p-shell-gutter lg:gap-0">
      <Reveal tag="p" delay={620} y={18} className="text-body max-w-100">
        {description}
      </Reveal>

      {/* Comes in from the left, against the copy above it: the two blocks
          arriving on the same vector read as one fade, which is the thing this
          is trying not to be. */}
      <StartMatch className={`${iceCta} group flex h-action w-full cursor-pointer items-center justify-between rounded-full pr-1 pl-6`}>
        <span className="text-body flex items-center gap-2">
          <span aria-hidden="true" className="size-marker bg-ice-ink group-active:bg-ice-top rounded-full" />
          {action}
        </span>

        <span className="bg-background flex size-action-icon items-center justify-center rounded-full">
          <svg
            viewBox="0 0 19 19"
            aria-hidden="true"
            className="text-foreground size-5 fill-none stroke-current stroke-[1.5]"
          >
            <path d="M6.5 3.5 13 9.5l-6.5 6" strokeLinecap="square" />
          </svg>
        </span>
      </StartMatch>
    </div>
  </section>
);
