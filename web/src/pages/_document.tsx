import { Head, Html, Main, NextScript } from "next/document";

/* The document shell.
 *
 * Two things are worth knowing here.
 *
 * 1. The theme script URL is `${basePath}/theme.js`, with basePath passed in
 *    from next.config.ts as NEXT_PUBLIC_BASE_PATH, because <script src> in
 *    _document is emitted verbatim and Next does not prefix it. The FastAPI
 *    export says /next (kb/server.py serves it there); the Cloudflare Pages
 *    export (CF_PAGES=1) and `next dev` say "".
 *
 * 2. There is no inline <script> and no inline <style> anywhere in this tree,
 *    and none of Next's own output adds one either. The Pages Router serialises
 *    page data into <script id="__NEXT_DATA__" type="application/json">, which
 *    the HTML parser classifies as a data block and never executes, so the
 *    strict `script-src 'self'` the rest of the site sends applies here
 *    unchanged. Adding an inline handler, a styled-jsx block or a
 *    dangerouslySetInnerHTML script would be the thing that breaks it.
 */
export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Next dev serves web/public/static/favicon.svg at this path. FastAPI
            serves the same mark from kb/static/favicon.svg. Keep the two files
            byte-identical (test_banner.py pins the fortress bitmask). */}
        <link rel="icon" href="/static/favicon.svg" type="image/svg+xml" sizes="any" />
        {/* Not deferred: the attribute has to be on <html> before first paint,
            or someone who chose dark gets a white flash on every navigation.
            It costs one getItem and one setAttribute. */}
        <script src={`${process.env.NEXT_PUBLIC_BASE_PATH}/theme.js`} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
