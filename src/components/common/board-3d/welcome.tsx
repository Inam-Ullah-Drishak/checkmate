"use client";

/** First-time popup shown after "Start a match": jump in, or be guided through a won game. */

import { useEffect, useRef } from "react";

import { iceCta, veil } from "@/components/common/board-3d/ui";

const OPTIONS = [
  { id: "start", label: "Start Now", text: "Already know how to play chess? Jump straight into a match and put your skills to the test." },
  { id: "tutorial", label: "Start Guided Tutorial", text: "New to chess or need a quick refresher? Follow a step-by-step tutorial to learn the basics before playing your first match." },
] as const;

export type WelcomeChoice = (typeof OPTIONS)[number]["id"];

export const Welcome = ({ onChoose }: { onChoose: (choice: WelcomeChoice) => void }) => {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const buttons = () => Array.from(panel.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
    buttons()[0]?.focus();
    // Keep Tab inside the dialog; Escape does nothing so the choice is deliberate.
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const all = buttons();
      const first = all[0];
      const last = all[all.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="welcome-title" className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-6">
      <div ref={panel} className={`${veil} flex w-full max-w-3xl flex-col gap-6 p-8`}>
        <h2 id="welcome-title" className="text-display font-display">
          Welcome to Checkmate
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {OPTIONS.map(({ id, label, text }) => (
            <div key={id} className="flex flex-col justify-between gap-5 rounded-2xl bg-veil p-6">
              <p className="opacity-90">{text}</p>
              <button
                type="button"
                onClick={() => onChoose(id)}
                className={id === "start" ? `${iceCta} text-body h-action cursor-pointer px-6` : "text-body h-action cursor-pointer rounded-full bg-foreground px-6 text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"}
              >
                {label}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
