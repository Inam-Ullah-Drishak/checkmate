"use client";

/**
 * Hero top bar — logo, nav, and the contact pill.
 *
 * Two layouts, one `<nav>`. From `sm` everything sits on a single row: a
 * `1fr auto 1fr` track centres the nav on the *shell*, which is where the design
 * puts it (its 342px frame sits at x=549 of a 1400px shell — dead centre). Below
 * `sm` the nav and the pill collapse into a burger that opens a full-screen menu
 * (`mobile-menu.tsx`, owner review 2026-10-06).
 *
 * `sm` is the right seam because it is exactly where the adaptive grid changes
 * base: above it the root font-size is a viewport fraction of 1024/1440/1920, so
 * the row's contents keep the same *proportion* of the width at every size and a
 * fit at one width is a fit at all of them. Below it the base drops to 360 and
 * the type jumps up relative to the shell, which is what breaks the row.
 *
 * The menu carries its own "Primary" `<nav>`; the bar's is `display: none` below
 * `sm` and the menu's is hidden from `sm` up, so only one is ever in the tree.
 *
 * 📖 Docs: obsidian/frontend/home-hero.md
 */

import { useCallback, useState } from "react";

import { iceCta } from "@/components/common/board-3d/ui";
import type { NavLink } from "@/data/mocks/home";
import { MOBILE_MENU_ID, MenuBars, MobileMenu } from "@/views/home/mobile-menu";
import { Reveal } from "@/views/home/reveal";

/** The bar drops in from above, in reading order, before anything below it. */
const ENTRANCE = { y: -16, config: { tension: 210, friction: 24 } };

export interface SiteHeaderProps {
  company: string;
  links: NavLink[];
  contact: NavLink;
}

const hover = "ease-entrance transition-colors duration-[var(--duration-fast)]";

/**
 * The mark on the contact pill: a small square stepping up to a larger one.
 *
 * Reads as the same up-and-right movement the arrow it replaced did, drawn on
 * the grid the display face is built on — no diagonal, no curve, and it survives
 * being rendered at 8px because every edge lands on a whole pixel.
 */
const StepMark = () => (
  <svg viewBox="0 0 9 9" aria-hidden="true" className="size-2 shrink-0 fill-current">
    <rect y="5" width="3.5" height="3.5" />
    <rect x="4.5" width="4.5" height="4.5" />
  </svg>
);

const ContactPill = ({ contact, className }: { contact: NavLink; className: string }) => (
  <a
    href={contact.href}
    className={`${iceCta} text-body flex items-center justify-center gap-2 ${className}`}
  >
    {contact.label}
    <StepMark />
  </a>
);

export const SiteHeader = ({ company, links, contact }: SiteHeaderProps) => {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    // `h-topbar` sits on the header itself, not the inner grid: with border-box
    // the 1px bottom rule has to be *inside* the 55px, or the whole body below
    // starts a pixel late and every measured coordinate drifts. Only from `sm`,
    // since an open burger has to be free to make the header taller.
    <header className="bg-veil mt-2 rounded-3xl backdrop-blur-md sm:h-topbar">
      {/* No `items-center` on the grid: it would collapse every cell to its text
          height, leaving the pill's `h-full` nothing to fill. Cells stretch, and
          each one centres its own content. */}
      <div className="grid grid-cols-[1fr_auto] sm:h-full sm:grid-cols-[1fr_auto_1fr]">
        <Reveal
          tag="span"
          {...ENTRANCE}
          className="text-logo px-shell-gutter flex h-topbar items-center sm:h-full"
        >
          {company}
        </Reveal>

        <Reveal
          tag="button"
          {...ENTRANCE}
          delay={100}
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls={MOBILE_MENU_ID}
          className={`flex size-topbar items-center justify-center sm:hidden ${hover}`}
        >
          <span className="sr-only">Open menu</span>
          <MenuBars open={open} />
        </Reveal>

        <Reveal {...ENTRANCE} delay={200} className="order-3 hidden justify-end sm:flex">
          <ContactPill contact={contact} className="h-topbar w-contact sm:h-full" />
        </Reveal>

        <nav
          id="primary-nav"
          aria-label="Primary"
          className="order-2 hidden sm:flex sm:flex-row sm:items-center"
        >
          <ul className="text-body flex list-none flex-row justify-center gap-10">
            {links.map((link, index) => (
              <Reveal key={link.href} tag="li" {...ENTRANCE} delay={60 + index * 70}>
                <a href={link.href} className={`${hover}`}>
                  {link.label}
                </a>
              </Reveal>
            ))}
          </ul>
        </nav>
      </div>

      {/* Below `sm` the links and the pill (its 189px frame and the logo leave
          no room for the toggle in the bar) live in the full-screen menu. */}
      <MobileMenu
        open={open}
        onClose={close}
        company={company}
        links={links}
        contact={contact}
        toggleSelector={`[aria-controls="${MOBILE_MENU_ID}"]`}
      />
    </header>
  );
};
