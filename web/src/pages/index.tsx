import Head from "next/head";

import { MemoryScene } from "@/components/memory-scene";
import { TopNav } from "@/components/top-nav";
import { ISSUES_HREF } from "@/lib/site";

const WORDS = ["remembers.", "learns.", "recalls.", "remembers."];

export default function Home() {
  return (
    <div className="product-site">
      <Head>
        <title>Citadel | Memory for your team and its agents</title>
        <meta name="description" content="Shared company knowledge, private working memory, and useful session traces shared by choice. Citadel keeps context available to your team and its coding agents." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <a className="product-skip" href="#main">Skip to content</a>
      <TopNav current="/" />
      <main id="main">
        <MemoryScene>
          <p className="product-eyebrow">Memory for teams and their agents</p>
          <h1 id="hero-title" aria-label="Your team learns. Citadel remembers.">
            <span className="heading-lead" aria-hidden="true">Your team learns.</span>
            <span className="headline-row" aria-hidden="true">Citadel <span className="word-window"><span className="word-track">{WORDS.map((word, i) => <span key={i}>{word}</span>)}</span></span></span>
          </h1>
          <p className="product-lede">Your agent should know what your team already learned. Citadel brings company knowledge and private working memory into the same conversation.</p>
          <div className="product-cta"><a className="product-primary" href="/waitlist">Join waitlist</a><a href="/architecture">Explore the architecture <span aria-hidden="true">↗</span></a></div>
        </MemoryScene>

        <section className="product-benefits product-measure" aria-label="Memory that carries work forward">
          <div id="central">
            <h2>Shared knowledge</h2>
            <p>Ask about earlier decisions. Central keeps shared company knowledge available to people and their agents, with references back to the source.</p>
            <a className="product-text-link" href="/architecture/memory#central">Explore Central <span aria-hidden="true">↗</span></a>
          </div>
          <div id="nodes">
            <h2>A Node of your own</h2>
            <p>Every team member has a private Node. Keep working context separate from other members' Nodes, while agents read what their scope allows.</p>
            <a className="product-text-link" href="/architecture/memory#nodes">Explore private memory <span aria-hidden="true">↗</span></a>
          </div>
          <div id="traces">
            <h2>Share useful traces</h2>
            <p>Volunteer a distilled session record so others can consult the work you tried. Keep your private context. Shared traces stay separate from Central.</p>
            <a className="product-text-link" href="/architecture/memory#traces">Explore deliberate sharing <span aria-hidden="true">↗</span></a>
          </div>
          <div id="hooks">
            <h2>Capture as you work</h2>
            <p>Supported session hooks capture summaries. A git hook captures push metadata from approved repositories. That context goes into your private Node.</p>
            <a className="product-text-link" href="/architecture/capture">Explore capture hooks <span aria-hidden="true">↗</span></a>
          </div>
        </section>

        <section id="start" className="product-close product-measure" aria-labelledby="start-title">
          <p className="product-eyebrow">Keep the context behind the work</p>
          <h2 id="start-title">Give the next task<br /><em>a better starting point.</em></h2>
          <p>Join the Citadel waitlist for updates about access, or inspect the source and run Citadel on infrastructure you operate.</p>
          <div className="product-cta"><a className="product-primary" href="/waitlist">Join waitlist</a><a href="/architecture/self-hosting">Explore self-hosting <span aria-hidden="true">↗</span></a></div>
        </section>
      </main>
      <footer className="product-footer product-measure">
        <a className="product-footer-wordmark" href="/">Citadel</a>
        <div><a href="/architecture">Architecture</a><a href="/architecture/memory">Memory &amp; sharing</a><a href="/architecture/capture">Capture hooks</a><a href="/waitlist">Join waitlist</a><a href={ISSUES_HREF}>Questions &amp; issues</a></div>
        <p>Open source. Maintained by <a href="https://github.com/Sarthib7">@Sarthib7</a>.</p>
      </footer>
    </div>
  );
}
