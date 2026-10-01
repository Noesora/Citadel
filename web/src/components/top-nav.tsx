import { Mark } from "@/components/mark";
import { NoesoraEndorsement } from "@/components/noetic-gate";
import { ThemeButton } from "@/components/theme-button";
import { MEASURE } from "@/components/ui";
import { PUBLIC_PAGES } from "@/lib/site";

const LINKS: Array<{ href: string; label: string }> = [
  { href: "/", label: "Home" },
  { href: "/info", label: "Status" },
  { href: "/use-cases", label: "Use cases" },
  { href: "/contact", label: "Contact" },
];

/* whitespace-nowrap: with room to spare it changes nothing, and on phones it
   stops flex shrinking a link to its longest word ("Use\ncases", "Sign\nin"
   two-line lumps). Below 470px the bar wraps into two rows instead (see the
   max-[470px] variants on the container), so nowrap never overflows. */
const LINK =
  "whitespace-nowrap px-[11px] py-2 font-mono text-xs uppercase tracking-[.06em] underline decoration-1 underline-offset-[6px] transition-[color,text-decoration-color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent max-[620px]:px-2 max-[620px]:text-[11px] max-[620px]:tracking-[.03em] max-[470px]:px-1.5 max-[470px]:py-2.5";

const LINK_IDLE = "text-ink-2 decoration-transparent hover:text-ink hover:decoration-current";
const LINK_CURRENT = "text-ink decoration-current";

/* Sign in is the one destination in the nav that is a door rather than a page,
   so it carries a border. */
const SIGN_IN =
  "ml-1.5 whitespace-nowrap px-3 py-[7px] font-mono text-xs font-bold uppercase tracking-[.05em] text-ink no-underline border border-ink transition-[color,background-color] duration-150 hover:bg-ink hover:text-ground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent max-[620px]:px-2 max-[620px]:text-[11px] max-[470px]:ml-0 max-[470px]:px-1.5 max-[470px]:py-[9px]";

/* The Pages build has no backend to sign in to. Not a link, not a button: a
   dashed, muted label, so nothing in the bar looks like a working door. */
const SIGN_IN_OFF =
  "ml-1.5 whitespace-nowrap px-3 py-[7px] font-mono text-xs uppercase tracking-[.05em] text-ink-2 border border-dashed border-border-2 max-[620px]:px-2 max-[620px]:text-[11px] max-[470px]:ml-0 max-[470px]:px-1 max-[470px]:py-[5px] max-[470px]:text-[10.5px] max-[470px]:tracking-normal max-[400px]:whitespace-normal max-[400px]:text-center max-[400px]:leading-tight";

/* The shared top navigation. Sticky at the page edge, filled so scrolled
 * content does not show through. Square, like the rest of the chrome. Labels
 * are mono caps and the current page is underlined, as on the Noesora landing.
 *
 * Every link points at a hand-written page, so these are plain <a> and not
 * next/link: they are full document loads by definition, and a client-side
 * router would only be able to prefetch a route it does not own. The one
 * exception is Home, which is where the visitor already is.
 *
 * `topnav` is the class the cross-document view transition keys off, so the bar
 * holds still while the rest of the page cross-fades.
 */
export function TopNav({
  current,
  embedded,
}: {
  current?: string;
  /** Parent StickyChrome already sticks. Drop the second sticky offset. */
  embedded?: boolean;
}) {
  return (
    <nav
      className={
        embedded
          ? "border-b border-border bg-ground"
          : "topnav sticky top-0 z-20 border-b border-border bg-ground"
      }
      aria-label="Main"
    >
      {/* Below 470px the single row cannot hold everything (it needs ~395px),
          so the bar wraps: brand + theme toggle on the first row, the links
          spread across a full-width second row. */}
      <div className={`${MEASURE} flex items-center gap-3.5 py-[11px] max-[620px]:gap-2 max-[620px]:py-[9px] max-[470px]:flex-wrap max-[470px]:gap-y-0.5`}>
        <a
          href="/"
          aria-label="Citadel home"
          className="mr-auto flex items-center gap-2.5 text-inherit no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent min-[1000px]:mr-0"
        >
          <Mark />
          <span className="font-display text-[22px] leading-[1.1] tracking-[-.02em] max-[660px]:hidden">
            Citadel
          </span>
        </a>
        {/* The secondary mark: endorsement, not identity. From 1000px it sits
            beside the wordmark; below that the hero carries it instead (see
            HeroBand), so exactly one is on screen at any width. */}
        <NoesoraEndorsement className="mr-auto ml-1 hidden border-l border-border-2 pl-3.5 min-[1000px]:flex" />
        <div className="flex items-center gap-0.5 max-[470px]:order-3 max-[470px]:w-full max-[470px]:justify-between max-[470px]:gap-0 max-[360px]:flex-wrap">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={link.href === current ? "page" : undefined}
              className={`${LINK} ${link.href === current ? LINK_CURRENT : LINK_IDLE}`}
            >
              {link.label}
            </a>
          ))}
          {PUBLIC_PAGES ? (
            <span className={SIGN_IN_OFF}>Sign in unavailable</span>
          ) : (
            <a href="/login" className={SIGN_IN}>
              Sign in
            </a>
          )}
        </div>
        <ThemeButton />
        <a
          href="https://github.com/Noesora/Citadel"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub repository"
          className="ml-1 flex size-[30px] items-center justify-center text-ink-2 transition-colors duration-150 hover:text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent max-[620px]:size-11"
        >
          <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
        </a>
      </div>
    </nav>
  );
}
