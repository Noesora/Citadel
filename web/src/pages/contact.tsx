import Head from "next/head";

import { ContactForm } from "@/components/contact-form";
import { HeroBand } from "@/components/hero-band";
import {
  BAND_IN,
  BTN,
  BTN_PRIMARY,
  CTA,
  SECTION,
  EYEBROW,
  FOOT_NOTE,
  H1_WIDE,
  HERO_STRIP_3,
  HeroFact,
  LEDE,
  META,
  PILL,
  SecHead,
} from "@/components/ui";
import { ISSUES_HREF, MAINTAINER_HREF, MAINTAINER_NAME, PUBLIC_PAGES } from "@/lib/site";

const SOURCE_HREF = "https://github.com/Noesora/Citadel";

/* The Cloudflare Pages build has no backend: no /contact relay, no inbox, no
 * email route. So it renders a notice, with no form, no mailto and no field a
 * visitor could type into. Anything that collected input here would be
 * collecting it into nothing. The self-hosted export, which does run next to a
 * node, keeps the relay form below. */
function ContactClosed() {
  return (
    <>
      <Head>
        <title>Contact · Citadel</title>
        <meta
          name="description"
          content="Contact is closed on this site: it has no form, no inbox and no email route. Source and the public issue tracker are on GitHub."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <HeroBand current="/contact" wide>
        <p className={EYEBROW}>Contact</p>
        <h1 className={H1_WIDE}>
          Contact is closed <span className="grad">for now</span>.
        </h1>
        <div className={`${META} mb-8`}>
          <span className={PILL}>{MAINTAINER_NAME}</span>
          <span className={PILL}>No form · no email route</span>
        </div>
        <dl className={HERO_STRIP_3}>
          <HeroFact kicker="Source">
            Read the code and its history on <a href={SOURCE_HREF}>GitHub</a>. It is Apache-2.0.
          </HeroFact>
          <HeroFact kicker="Bugs and requests">
            Open an issue in the <a href={ISSUES_HREF}>public issue tracker</a>.
          </HeroFact>
          <HeroFact kicker="Status">
            Live status and sign-in are unavailable here: no node is connected to this site.
          </HeroFact>
        </dl>
      </HeroBand>

      <section className={`${SECTION} bg-surface`} id="closed">
        <div className={BAND_IN}>
          <div className="mx-auto max-w-[34rem]">
            <SecHead kicker="Why there is no form" title="Nothing here would be received" />
            <p className={LEDE}>
              This site is a static page. It has no server behind it, so a form would have nowhere
              to send what you typed, and there is no email address that is read for this project
              yet. This page has no form and sends nothing.
            </p>
            <div className={CTA}>
              <a className={BTN_PRIMARY} href={ISSUES_HREF}>
                Open an issue
              </a>
              <a className={BTN} href={SOURCE_HREF}>
                Read the source
              </a>
            </div>
            <footer className="mt-8 border-t border-border pt-5 text-[15px] text-ink-2">
              <p>
                Citadel is maintained by <a href={MAINTAINER_HREF}>{MAINTAINER_NAME}</a>.
              </p>
              <p className={FOOT_NOTE}>
                When a way to reach the project exists, it will be listed on this page.
              </p>
            </footer>
          </div>
        </div>
      </section>
    </>
  );
}


function ContactRelay() {
  return (
    <>
      <Head>
        <title>Contact · Citadel</title>
        <meta
          name="description"
          content="Send a message to the operator of a self-hosted Citadel node. Storage is outside the vault; alert delivery depends on the node configuration."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <HeroBand current="/contact" wide>
        <p className={EYEBROW}>Contact</p>
        <h1 className={H1_WIDE}>
          Tell us what you are building, <span className="grad">and what is missing</span>.
        </h1>
        <div className={`${META} mb-8`}>
          <span className={PILL}>{MAINTAINER_NAME}</span>
        </div>
        <dl className={HERO_STRIP_3}>
          <HeroFact kicker="Access">
            Ask the operator of this node for a seat token.
          </HeroFact>
          <HeroFact kicker="Team">
            Tell us where your knowledge currently lives and what you keep re-answering.
          </HeroFact>
          <HeroFact kicker="Question">
            Ask anything the <a href="/info">live status</a> or the <a href={SOURCE_HREF}>source</a>{" "}
            did not answer.
          </HeroFact>
        </dl>
      </HeroBand>

      <section className={`${SECTION} bg-surface`} id="form">
        <div className={BAND_IN}>
          <div className="mx-auto max-w-[34rem]">
            <SecHead kicker="Send a message" title="Kept outside the vault" />
            <p className={LEDE}>
              A configured node tries to store your message in a private contact file outside the
              vault. It sends an alert only when its operator has configured a relay. Contact text
              does not become agent-readable vault knowledge.
            </p>

            <ContactForm />

            <footer className="mt-8 border-t border-border pt-5 text-[15px] text-ink-2">
              <p className={FOOT_NOTE}>
                Bugs and feature requests belong in the{" "}
                <a href={ISSUES_HREF}>public issue tracker</a>. Already have a seat?{" "}
                <a href="/login">Sign in</a>.
              </p>
            </footer>
          </div>
        </div>
      </section>
    </>
  );
}

export default function Contact() {
  return PUBLIC_PAGES ? <ContactClosed /> : <ContactRelay />;
}
