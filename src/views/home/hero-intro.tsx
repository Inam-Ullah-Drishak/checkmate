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

import { Headline } from "@/views/home/headline";
import { Reveal } from "@/views/home/reveal";

export interface HeroIntroProps {
  /** Rendered one line per entry, as in the design. */
  headline: string[];
  description: string;
  action: string;
  actionHref: string;
}

export const HeroIntro = ({ headline, description, action, actionHref }: HeroIntroProps) => (
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
      <Reveal
        tag="a"
        delay={800}
        x={-22}
        y={0}
        href={actionHref}
        className="bg-surface-invert text-ink hover:bg-ink hover:text-surface-invert ease-entrance group flex h-action items-center justify-between pr-1 pl-6 transition-colors duration-[var(--duration-fast)]"
      >
        <span className="text-body flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-marker bg-ink group-hover:bg-surface-invert ease-entrance rounded-full transition-colors duration-[var(--duration-fast)]"
          />
          {action}
        </span>

        <span className="bg-background group-hover:bg-surface-invert ease-entrance flex size-action-icon items-center justify-center transition-colors duration-[var(--duration-fast)]">
          <svg
            viewBox="0 0 19 19"
            aria-hidden="true"
            className="text-foreground group-hover:text-ink ease-entrance size-5 fill-none stroke-current stroke-[1.5] transition-colors duration-[var(--duration-fast)]"
          >
            <path d="M6.5 3.5 13 9.5l-6.5 6" strokeLinecap="square" />
          </svg>
        </span>
      </Reveal>
    </div>
  </section>
);
