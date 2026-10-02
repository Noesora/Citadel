/* Which build this is.
 *
 * The Cloudflare Pages build (CF_PAGES=1, see next.config.ts) is a static
 * marketing site with no backend behind it: no /api/state, no /admin/session,
 * and no /contact page or relay (strip-private-pages.mjs removes it). Anything
 * that would POST or fetch to those has to say it is unavailable there instead
 * of rendering a control that cannot work, and nothing may link to /contact.
 *
 * The FastAPI export (kb/webui/, served at /next) runs next to a node, so it
 * keeps the live pill, the sign-in form and the contact relay.
 */
export const PUBLIC_PAGES = process.env.NEXT_PUBLIC_PAGES === "1";

/** Public identity. No company or legal entity is claimed. */
export const MAINTAINER_NAME = "Noesora by @Sarthib7";
export const MAINTAINER_HREF = "https://github.com/Sarthib7";
export const ISSUES_HREF = "https://github.com/Noesora/Citadel/issues";
