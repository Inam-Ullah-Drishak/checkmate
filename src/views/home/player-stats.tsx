"use client";

/**
 * The home page's four figures, as the player's own record against the computer.
 * The record lives in localStorage (`lib/chess/storage.ts`), which only exists
 * in the browser: the server render carries the zeros in `homeCopy.stats`, and
 * the real numbers replace them once the page has mounted.
 */

import { useEffect, useState } from "react";

import type { Stat } from "@/data/mocks/home";
import { loadRecord, loadSettings } from "@/lib/chess/storage";
import { StatGrid } from "@/views/home/stat-grid";

export const PlayerStats = ({ stats }: { stats: Stat[] }) => {
  const [values, setValues] = useState<string[]>(() => stats.map((stat) => stat.value));

  useEffect(() => {
    const { win, loss, draw } = loadRecord();
    const { level } = loadSettings();
    setValues([String(win), String(loss), String(draw), level[0].toUpperCase() + level.slice(1)]);
  }, []);

  return <StatGrid stats={stats.map((stat, index) => ({ ...stat, value: values[index] }))} />;
};
