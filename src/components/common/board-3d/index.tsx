"use client";

import dynamic from "next/dynamic";

export const LazyBoard3D = dynamic(
  () => import("@/components/common/board-3d/game").then((m) => m.Game),
  { ssr: false },
);
