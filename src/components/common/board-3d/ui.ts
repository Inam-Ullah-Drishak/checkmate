/**
 * Class strings shared by the play menu, the home page and the in-game controls.
 * Winter look: buttons are icy (pale frost gradient, glow, white edge).
 * Class names are written out in full so Tailwind can see them.
 */

export const fade = "ease-entrance transition-colors duration-[var(--duration-fast)]";

/** The icy face itself: frosted gradient, glow and a white edge. Pressed or switched on turns it deep blue. */
export const iceLook = "relative bg-linear-to-b from-ice-top to-ice-bottom text-ice-ink shadow-ice";
const iceFace = `${iceLook} active:from-ice-ink active:to-ice-ink active:text-ice-top aria-pressed:from-ice-ink aria-pressed:to-ice-ink aria-pressed:text-ice-top ${fade}`;

export const ice = `${iceFace} ring-1 ring-ice-top/70`;

/** An icy button. */
export const solid = `${ice} text-body cursor-pointer rounded-xl`;

/** The call to action: same ice. */
export const iceCta = `${ice} rounded-full`;

/** A block on the page colour, ruled like the stat cells. */
export const ruled = `border-rule bg-background text-foreground rounded-xl border text-body`;

/** Every option that is not chosen: frosted glass, no colour. */
export const glass = "bg-veil text-foreground ring-ice-top/30 shadow-ice ring-1 backdrop-blur-md";

/** One option of a segmented choice; `on` is the selected one. */
export const choice = (on: boolean) =>
  `text-body h-action min-w-32 cursor-pointer rounded-xl ${fade} ${on ? iceLook : glass}`;

/** A soft panel on the blue field: the home page's veil tint, used instead of ruled boxes. */
export const veil = `bg-veil text-foreground rounded-2xl backdrop-blur-md text-body`;

/** One choice button in a row of choices; `on` is the selected one (icy). */
export const chip = (on: boolean) =>
  `text-body h-action min-w-32 cursor-pointer rounded-full px-6 ${fade} ${on ? iceLook : glass}`;
