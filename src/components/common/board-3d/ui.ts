/**
 * Class strings shared by the play menu and the in-game controls, built from
 * the same tokens as the home page: square white blocks on the brand blue,
 * 1px rules, and the ink/white swap on hover.
 */

export const fade = "ease-entrance transition-colors duration-[var(--duration-fast)]";

/** A white block: the home page's "Say hello" and "Start a match" treatment. Pressed, or switched on, it turns dark blue like on hover. */
export const solid = `bg-surface-invert text-ink hover:bg-ink hover:text-surface-invert active:bg-ink active:text-surface-invert aria-pressed:bg-ink aria-pressed:text-surface-invert text-body cursor-pointer ${fade}`;

/** A block on the page colour, ruled like the stat cells. */
export const ruled = `border-rule bg-background text-foreground border text-body`;

/** One option of a segmented choice; `on` is the selected one. */
export const choice = (on: boolean) =>
  `text-body h-action cursor-pointer ${fade} ${on ? "bg-surface-invert text-ink" : "hover:bg-veil"}`;

/** A soft panel on the blue field: the home page's veil tint, used instead of ruled boxes. */
export const veil = `bg-veil text-foreground text-body`;

/** One choice button in a row of choices; `on` is the selected one. */
export const chip = (on: boolean) =>
  `text-body h-action cursor-pointer px-6 ${fade} ${on ? "bg-surface-invert text-ink" : "bg-veil hover:bg-foreground/15"}`;
