"use client";

/**
 * The full-screen menu below `sm` (owner review, 2026-10-06 — the burger used
 * to unfold the links inline under the bar).
 *
 * A deeper brand blue drops over the page as a smooth circle growing
 * from the toggle's corner. The links then rise one after another out of line
 * masks in the display face, large, each over a rule drawn from the left, and
 * the contact pill settles in at the bottom. Closing pulls the columns back up
 * into the corner, faster.
 *
 * Portalled to `<body>`: `<main>` is its own stacking context (`relative z-0`),
 * and inside it nothing could rise over the cookie banner or the 3D cursor.
 *
 * While open: page scroll is stopped through the scroll layout's own switch
 * (Lenis + the root's overflow), focus moves to the ✕ and stays in the menu,
 * Escape closes, and focus returns to the toggle. A link closes the menu, then
 * scrolls to its target. Closed, the layer is `inert` and hidden. Reduced
 * motion: react-spring's global `skipAnimation` (`ReducedMotion`) makes every
 * spring jump. The chess scene behind keeps its state — covered, never
 * remounted.
 *
 * 📖 Docs: obsidian/frontend/home-hero.md
 */

import { animated, to, useSpring, useSprings, type SpringValue } from "@react-spring/web";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

import { iceCta } from "@/components/common/board-3d/ui";
import type { NavLink } from "@/data/mocks/home";
import { useScroll } from "@/hooks/smooth-scroll/use-scroll";
import { MENU_CURTAIN, MENU_EXIT, MENU_ITEM, MENU_TOGGLE } from "@/lib/springs/config";

export const MOBILE_MENU_ID = "mobile-menu";

/** First link after the curtain starts, then one beat per link. */
const LINK_DELAY_MS = 200;
const LINK_STAGGER_MS = 55;

/** The curtain's outline at progress `p`: a smooth circle growing from the toggle's corner. */
const staircase = (p: number): string => `circle(${(Math.max(0, p) * 150).toFixed(2)}% at 100% 0%)`;

/** Three bars that fold into an ✕ — the toggle's icon, in the bar and in the menu. */
export const MenuBars = ({ open }: { open: boolean }) => {
  const { t } = useSpring({ t: open ? 1 : 0, config: MENU_TOGGLE });
  const bar = "absolute left-0 block h-[1.5px] w-full bg-current";
  return (
    <span aria-hidden="true" className="relative block size-4">
      <animated.span
        className={bar}
        style={{
          top: "calc(50% - 0.75px)",
          transform: t.to((v) => `translateY(${(1 - v) * -5.5}px) rotate(${v * 45}deg)`),
        }}
      />
      <animated.span
        className={bar}
        style={{
          top: "calc(50% - 0.75px)",
          opacity: t.to((v) => 1 - v),
          transform: t.to((v) => `scaleX(${1 - v})`),
        }}
      />
      <animated.span
        className={bar}
        style={{
          top: "calc(50% - 0.75px)",
          transform: t.to((v) => `translateY(${(1 - v) * 5.5}px) rotate(${v * -45}deg)`),
        }}
      />
    </span>
  );
};

/** The hairline under a link, drawn from the left as the link rises. */
const Rule = ({ progress }: { progress: SpringValue<number> }) => (
  <animated.span
    aria-hidden="true"
    className="bg-rule absolute right-0 bottom-0 left-0 block h-px origin-left"
    style={{ transform: to(progress, (p) => `scaleX(${p})`) }}
  />
);

export interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  company: string;
  links: NavLink[];
  contact: NavLink;
  /** The bar's toggle — focus goes back to it on close. */
  toggleSelector: string;
  /** Handles a chosen link itself (return true), e.g. switching a tab; otherwise it scrolls or navigates. */
  onSelect?: (href: string) => boolean;
}

export const MobileMenu = ({
  open,
  onClose,
  company,
  links,
  contact,
  toggleSelector,
  onSelect,
}: MobileMenuProps) => {
  /** Shown from the first open frame until the close spring rests. */
  const [shown, setShown] = useState(false);
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  /** A navigation to run once the page can scroll again. */
  const pending = useRef<string | null>(null);
  /** Whether this menu stopped the scroll (so it only restarts its own stop). */
  const stoppedScroll = useRef(false);

  useEffect(() => setPortal(document.body), []);
  useEffect(() => {
    if (open) setShown(true);
  }, [open]);

  const curtain = useSpring({
    p: open ? 1 : 0,
    config: open ? MENU_CURTAIN : MENU_EXIT,
    onRest: () => {
      if (!open) setShown(false);
    },
  });

  const [items] = useSprings(
    links.length,
    (index) => ({
      y: open ? 0 : 110,
      line: open ? 1 : 0,
      delay: open ? LINK_DELAY_MS + index * LINK_STAGGER_MS : 0,
      config: open ? MENU_ITEM : MENU_EXIT,
    }),
    [open],
  );

  const footer = useSpring({
    y: open ? 0 : 110,
    delay: open ? LINK_DELAY_MS + links.length * LINK_STAGGER_MS + 40 : 0,
    config: open ? MENU_ITEM : MENU_EXIT,
  });

  // Scroll lock, focus in, Escape — while open.
  useEffect(() => {
    if (!open) return;
    const scroll = useScroll.getState();
    if (scroll.isEnableScroll) {
      scroll.stop();
      stoppedScroll.current = true;
    }
    panelRef.current
      ?.querySelector<HTMLElement>("[data-menu-close]")
      ?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // On close: scroll back on, then focus back to the toggle — or the link's target.
  useEffect(() => {
    if (open || !shown) return;
    if (stoppedScroll.current) {
      stoppedScroll.current = false;
      useScroll.getState().start();
    }
    const target = pending.current;
    pending.current = null;
    if (!target) {
      document.querySelector<HTMLElement>(toggleSelector)?.focus({ preventScroll: true });
      return;
    }
    if (onSelect?.(target)) return;
    // A link to another page (/play, /play?tab=…) is a real navigation, not a scroll.
    if (!target.startsWith("#") && !target.startsWith("/#")) {
      router.push(target);
      return;
    }
    // After the scroll layout has re-enabled scrolling (its effect commits with
    // this render).
    const frame = requestAnimationFrame(() => {
      const hash = target.split("#")[1];
      const element = hash ? document.getElementById(hash) : null;
      if (hash && !element) {
        window.location.hash = hash;
        return;
      }
      const lenis = useScroll.getState().lenis;
      if (lenis) lenis.scrollTo(element ?? 0, { duration: 1.2 });
      else if (element) element.scrollIntoView({ behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [open, shown, toggleSelector, router, onSelect]);

  const onNavigate = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      pending.current = event.currentTarget.getAttribute("href");
      onClose();
    },
    [onClose],
  );

  // Keep Tab inside the open menu.
  const onPanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || !panelRef.current) return;
    const focusable = panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const clip = curtain.p.to(staircase);
  const hover = "ease-entrance transition-colors duration-[var(--duration-fast)]";

  const panel = (
    <animated.div
      ref={panelRef}
      id={MOBILE_MENU_ID}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      inert={!open}
      // `open` too: the frame that opens it must already be focusable.
      hidden={!open && !shown}
      onKeyDown={onPanelKeyDown}
      style={{ clipPath: clip, WebkitClipPath: clip }}
      className="bg-menu-ground text-foreground px-shell-inset fixed inset-0 z-[55] h-dvh overflow-y-auto overscroll-contain sm:hidden"
    >
      {/* The page's frame, drawn again: the shell's side rules and the bar. */}
      <div className="border-rule flex min-h-full flex-col border-x">
        <div className="border-rule bg-veil grid h-topbar grid-cols-[1fr_auto] border-b">
          <span className="text-logo px-shell-gutter flex items-center">{company}</span>
          <button
            type="button"
            data-menu-close=""
            aria-label="Close menu"
            onClick={onClose}
            className={`flex size-topbar items-center justify-center ${hover}`}
          >
            <MenuBars open={open} />
          </button>
        </div>

        <nav aria-label="Primary" className="px-shell-gutter pt-10">
          <ul className="flex list-none flex-col">
            {links.map((link, index) => {
              const spring = items[index];
              return (
                <li key={link.href} className="relative">
                  <span className="block overflow-hidden">
                    <animated.span
                      className="block"
                      style={{ transform: spring.y.to((y) => `translateY(${y}%)`) }}
                    >
                      <a
                        href={link.href}
                        onClick={onNavigate}
                        className={`flex items-baseline justify-between py-3 ${hover}`}
                      >
                        <span className="font-display text-menu leading-display">{link.label}</span>
                        <span aria-hidden="true" className="text-body text-foreground/80">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </a>
                    </animated.span>
                  </span>
                  <Rule progress={spring.line} />
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-auto overflow-hidden pb-shell-inset">
          <animated.div style={{ transform: footer.y.to((y) => `translateY(${y}%)`) }}>
            <a
              href={contact.href}
              onClick={onNavigate}
              className={`${iceCta} text-body flex h-action items-center justify-center gap-2`}
            >
              {contact.label}
              <svg viewBox="0 0 9 9" aria-hidden="true" className="size-2 shrink-0 fill-current">
                <rect y="5" width="3.5" height="3.5" />
                <rect x="4.5" width="4.5" height="4.5" />
              </svg>
            </a>
          </animated.div>
        </div>
      </div>
    </animated.div>
  );

  return portal ? createPortal(panel, portal) : null;
};
