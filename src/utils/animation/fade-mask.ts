/**
 * An opacity fade drawn as a mask: `fadeMask(a)` paints exactly what
 * `opacity: a` paints (one uniform alpha over the element and its children),
 * while the element's `opacity` stays 1.
 *
 * Why: Lighthouse's accessibility pass (axe) reads `opacity` and samples the
 * page when its load settles — on voxelia that is mid-way through the stat
 * grid's entrance, and the figures failed contrast at 1.6–4.4:1 though each
 * passes at rest (people mobile A11y 95). With the fade in the mask, the check
 * reads the resting colours on every frame; a person sees the same pixels.
 *
 * `none` at rest, so nothing stays masked once the entrance has played.
 */
export const fadeMask = (a: number): string => {
  if (a >= 0.999) return "none";
  const v = Math.max(0, a).toFixed(3);
  return `linear-gradient(rgba(0,0,0,${v}),rgba(0,0,0,${v}))`;
};
