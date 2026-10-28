"use client";

/**
 * The hero's "Start a match" call to action. Returning players go straight to
 * /play; a first-time player gets the welcome popup first (see `isFirstTimePlayer`).
 */

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Welcome, type WelcomeChoice } from "@/components/common/board-3d/welcome";
import { isFirstTimePlayer, markTutorialSeen } from "@/lib/chess/storage";
import { Reveal } from "@/views/home/reveal";

export const StartMatch = ({ className, children }: { className: string; children: ReactNode }) => {
  const router = useRouter();
  const [asking, setAsking] = useState(false);

  const choose = (choice: WelcomeChoice) => {
    markTutorialSeen();
    router.push(choice === "tutorial" ? "/play?tutorial=1" : "/play?start=1");
  };

  return (
    <>
      <Reveal tag="button" type="button" delay={800} x={-22} y={0} onClick={() => (isFirstTimePlayer() ? setAsking(true) : router.push("/play"))} className={className}>
        {children}
      </Reveal>
      {asking && <Welcome onChoose={choose} />}
    </>
  );
};
