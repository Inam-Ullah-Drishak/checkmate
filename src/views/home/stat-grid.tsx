/**
 * Hero right column — a 2 × 2 grid of figures, hanging from a rule partway down.
 *
 * The empty first row is the design's: the grid starts at y=378 of a body that
 * runs 55 → 800, so the rows are 323 / 211 / 211 and only the last two carry
 * cells. Expressed as `fr` ratios rather than fixed heights so it scales with
 * the viewport like everything else.
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
 * single element rather than nesting one. A wrapper stretches to the row but
 * leaves the cell only as tall as its content, and `justify-between` then has
 * nothing to distribute: the label rides up under the figure instead of sitting
 * on the cell's bottom gutter.
 */
const StatCell = ({ value, label, divided, order }: Stat & { divided: boolean; order: number }) => (
  <Reveal
    delay={FIRST_CELL_DELAY + order * CELL_STAGGER}
    x={18}
    y={0}
    className="bg-veil flex min-h-36 flex-col justify-between p-shell-gutter"
  >
    <p className="text-display font-display">{value}</p>
    <p className="text-body">{label}</p>
  </Reveal>
);

export const StatGrid = ({ stats }: StatGridProps) => (
  <section
    aria-label="By the numbers"
    className="flex flex-col gap-2 p-2 lg:grid lg:grid-rows-[323fr_211fr_211fr]"
  >
    {/* The empty first row is the design's — the grid hangs from a rule partway
        down the column. There is no such drop below `lg`, where the section just
        follows the scene. */}
    <div aria-hidden="true" className="hidden lg:block" />

    {[stats.slice(0, 2), stats.slice(2, 4)].map((row, index) => (
      <div key={index} className="grid grid-cols-2 gap-2">
        {row.map((stat, column) => (
          <StatCell
            key={stat.label}
            {...stat}
            divided={column === 1}
            order={index * 2 + column}
          />
        ))}
      </div>
    ))}
  </section>
);
