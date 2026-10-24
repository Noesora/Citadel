import Head from "next/head";

import { WaitlistForm } from "@/components/waitlist-form";
import { SiteFooter } from "@/components/site-footer";
import { TopNav } from "@/components/top-nav";
import { EYEBROW } from "@/components/ui";
import { PUBLIC_PAGES } from "@/lib/site";

function ClosedWaitlist() {
  return (
    <p className="waitlist-note border border-border-2 bg-surface px-4 py-3" role="status">
      Waitlist registration is not open on this site yet.
    </p>
  );
}

export default function Waitlist() {
  return (
    <>
      <Head>
        <title>Join the waitlist · Citadel</title>
        <meta
          name="description"
          content="Join the Citadel waitlist for updates about access. Joining does not create an account."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="product-site">
        <a className="product-skip" href="#main">Skip to content</a>
        <TopNav current="/waitlist" />
        <main id="main" className="waitlist-copy" aria-labelledby="waitlist-title">
          <p className={EYEBROW}>Join the waitlist</p>
          <h1 id="waitlist-title">
            Your next task deserves better context.
          </h1>
          <p>
            Join the Citadel waitlist. Leave your email for updates about access.
          </p>

          {PUBLIC_PAGES ? <ClosedWaitlist /> : <WaitlistForm />}

          <p className="waitlist-note">
            For waitlist and access updates. Joining does not create an account.
          </p>
          <p className="waitlist-note">
            Already have a seat? <a href="/login">Sign in</a>.
          </p>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
