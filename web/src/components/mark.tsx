/* The Pixel Bastion: a 7x7 crenellated castle, one <i> per cell.
 *
 * The hand-written pages paint this from JavaScript because they had no way to
 * express 49 elements without writing 49 tags. Here it is just markup, so it is
 * in the exported HTML and never depends on a script running.
 *
 * The bitmask is the canonical one (kb/banner.py, pinned by tests/test_banner.py).
 * Only the paint is provisional: ink cells with the four keep windows in the
 * Noesora blue, so the mark reads on paper and on ink without a gradient.
 */
const GRID = [
  "1010101",
  "1111111",
  "1111111",
  "1111111",
  "1101011",
  "1101011",
  "1101011",
].join("");

/* Row 2 and 3, columns 2 and 4: the four windows the CLI and favicon blink. */
const WINDOWS = new Set([16, 18, 23, 25]);

export function Mark({ className = "size-[22px] gap-px" }: { className?: string }) {
  return (
    <span className={`grid shrink-0 grid-cols-7 grid-rows-7 ${className}`} aria-hidden="true">
      {GRID.split("").map((cell, i) => (
        <i key={i} className={cell !== "1" ? undefined : WINDOWS.has(i) ? "bg-accent" : "bg-ink"} />
      ))}
    </span>
  );
}
