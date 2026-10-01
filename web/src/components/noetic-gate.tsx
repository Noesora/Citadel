/* The Noesora Noetic Gate, drawn at its source geometry (the `noetic-gate`
 * symbol on the public Noesora landing): two open brackets, a diagonal, one
 * square dot, on a 96-unit grid. It is Citadel's secondary mark: it endorses
 * ("A Noesora product") and never replaces the Pixel Bastion. Provisional with
 * the rest of the Noesora brand.
 */
export function NoeticGate({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={`shrink-0 ${className}`} viewBox="0 0 96 96" aria-hidden="true" focusable="false">
      <path
        d="M30 16H16V80H30M66 16H80V80H66M30 70L66 26"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <rect x="45" y="45" width="6" height="6" fill="currentColor" />
    </svg>
  );
}

const NOESORA_HREF = "https://noesora.xyz";

/** "A Noesora product" endorsement. A link, so the mark has a destination. */
export function NoesoraEndorsement({ className = "" }: { className?: string }) {
  return (
    <a
      href={NOESORA_HREF}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 font-mono text-[11px] uppercase leading-none tracking-[.06em] text-ink-2 no-underline transition-colors duration-150 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${className}`}
    >
      <NoeticGate className="size-5 text-ink" />
      <span>A Noesora product</span>
    </a>
  );
}
