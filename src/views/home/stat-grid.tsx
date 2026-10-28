/**
 * Hero right column — a compact 2 × 2 grid of figures, sitting at the bottom of
 * the column.
 *
 * 📖 Docs: obsidian/frontend/components/common.md
 */

import type { Stat } from "@/data/mocks/home";
import { Reveal } from "@/views/home/reveal";

export interface StatGridProps {
  stats: Stat[];
}

/** The column is the last thing to arrive, one cell at a time. */
const FIRST_CELL_DELAY = 900;
const CELL_STAGGER = 110;

/**
 * The cell is the grid child itself, with no wrapper — `Reveal` renders the same
 * single element rather than nesting one, so `justify-between` can pin the label
 * to the cell's bottom.
 */
const StatCell = ({ value, label, order }: Stat & { order: number }) => (
  <Reveal
    delay={FIRST_CELL_DELAY + order * CELL_STAGGER}
    x={18}
    y={0}
    className="bg-veil flex min-h-24 min-w-0 flex-col justify-between rounded-3xl p-4 backdrop-blur-md"
  >
    {/* Smaller on phones so a word like "Medium" stays inside the tile. */}
    <p className="text-display font-display max-sm:text-3xl">{value}</p>
    <p className="text-body">{label}</p>
  </Reveal>
);

export const StatGrid = ({ stats }: StatGridProps) => (
  <section aria-label="By the numbers" className="flex flex-col justify-end gap-2 p-2">
    {[stats.slice(0, 2), stats.slice(2, 4)].map((row, index) => (
      <div key={index} className="grid grid-cols-2 gap-2">
        {row.map((stat, column) => (
          <StatCell key={stat.label} {...stat} order={index * 2 + column} />
        ))}
      </div>
    ))}
  </section>
);
