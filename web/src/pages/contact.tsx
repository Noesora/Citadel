import Head from "next/head";

import { ContactForm } from "@/components/contact-form";
import { HeroBand } from "@/components/hero-band";
import {
  BAND_IN,
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
import { ISSUES_HREF, MAINTAINER_NAME } from "@/lib/site";

const SOURCE_HREF = "https://github.com/Noesora/Citadel";

/* The self-hosted export only. The Cloudflare Pages build has no backend, so
 * strip-private-pages.mjs removes contact.html (and this page's chunk) from it
 * and check-pages-export.mjs rejects either one coming back. */
export default function Contact() {
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
