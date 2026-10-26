import type { Metadata } from "next";

import { PlayView } from "@/views/play";

export const metadata: Metadata = {
  title: "Play Checkmate",
  description: "Play chess on a 3D board: two players on one screen, or against the computer.",
};

export default function PlayPage() {
  return <PlayView />;
}
