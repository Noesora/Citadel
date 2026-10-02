import { BAND, BAND_IN, CODE, FOOT_NOTE } from "@/components/ui";
import { ISSUES_HREF, MAINTAINER_HREF, MAINTAINER_NAME, PUBLIC_PAGES } from "@/lib/site";

const LICENSE_HREF =
  "https://github.com/Noesora/Citadel/blob/main/LICENSE";
const SOURCE_HREF = "https://github.com/Noesora/Citadel";
const WINDOW = "window v0.2.0 → v0.5.1.";

const COL_K =
  "mb-2 text-[11px] font-semibold uppercase tracking-[.16em] text-ink-3";
const COL_V = "m-0 text-[14.5px] text-ink-2";
const COLS =
  "grid grid-cols-5 gap-8 border-t border-border pt-8 max-[900px]:grid-cols-3 max-[620px]:grid-cols-1 max-[620px]:gap-5";

/* The footer is ink on both themes (see .site-footer in globals.css). A closing
   footer that is itself a band is full-bleed, so it carries no top
   margin: the gap an in-column footer wants would show as a stripe of --ground
   between two bands. */
export function SiteFooter({ note }: { note?: string | null }) {
  return (
    <footer className={`${BAND} site-footer bg-surface`}>
      <div className={BAND_IN}>
        <div className={COLS}>
          <div>
            <p className={COL_K}>Check</p>
            <p className={COL_V}>
              <code className={CODE}>citadel status</code>
            </p>
          </div>
          <div>
            <p className={COL_K}>Source</p>
            <p className="m-0 text-[14.5px]">
              <a href={SOURCE_HREF}>github.com/Noesora/Citadel</a>
            </p>
          </div>
          <div>
            <p className={COL_K}>License</p>
            <p className="m-0 text-[14.5px]">
              <a href={LICENSE_HREF}>Apache-2.0</a>
            </p>
          </div>
          <div>
            <p className={COL_K}>Maintainer</p>
            <p className={COL_V}>
              <a href={MAINTAINER_HREF}>{MAINTAINER_NAME}</a>
            </p>
          </div>
          <div>
            <p className={COL_K}>{PUBLIC_PAGES ? "Issues" : "Contact"}</p>
            <p className="m-0 text-[14.5px]">
              {PUBLIC_PAGES ? (
                <a href={ISSUES_HREF}>Public issue tracker</a>
              ) : (
                <a href="/contact">Contact</a>
              )}
            </p>
          </div>
        </div>
        <p className={FOOT_NOTE}>
          {PUBLIC_PAGES ? "No live node is connected to this site" : note || WINDOW}
        </p>
      </div>
    </footer>
  );
}
