/**
 * @fileoverview Configuration file for Spring animation components
 *
 * Global configuration for all Spring components.
 * Controls behavior and features across the entire application.
 *
 * disableOnMobile: Controls which spring animations are disabled on mobile devices
 * - hover: Disable hover animations on mobile (default: true since no hover on mobile)
 * - inview: Disable in-view animations on mobile
 * - spring: Disable basic spring animations on mobile
 * - springtrigger: Disable scroll-triggered animations on mobile
 */
import type { SpringConfig } from "@react-spring/web";

/**
 * The mobile menu (`views/home/mobile-menu.tsx`). The curtain covers the whole
 * screen, so it moves slower than a control; critically damped, so no column
 * overshoots the bottom edge. Its links rise a touch quicker, and everything
 * leaves faster than it came.
 */
export const MENU_CURTAIN: SpringConfig = { tension: 80, friction: 18 };
export const MENU_ITEM: SpringConfig = { tension: 190, friction: 26 };
export const MENU_EXIT: SpringConfig = { tension: 320, friction: 36 };
/** The burger folding into an ✕. */
export const MENU_TOGGLE: SpringConfig = { tension: 300, friction: 26 };

interface SpringsConfig {
  mobileWidth: number;
  disableOnMobile: {
    hover: boolean;
    inview: boolean;
    spring: boolean;
    springtrigger: boolean;
  };
}

export const springsConfig: SpringsConfig = {
  mobileWidth: 768,
  disableOnMobile: {
    hover: true,
    inview: false,
    spring: false,
    springtrigger: false,
  },
} as const;

/**
 * @param value - whether the animation opts into mobile-disabling
 * @param viewportWidth - optional explicit width (px); pass a React-tracked
 *   value here so callers re-evaluate on resize. Falls back to `window.innerWidth`.
 */
export const isMobileDisabled = (value: boolean, viewportWidth?: number) => {
  if (typeof window === "undefined") return false;
  if (!value) return false;
  const width =
    viewportWidth && viewportWidth > 0 ? viewportWidth : window.innerWidth;
  return width <= springsConfig.mobileWidth;
};
