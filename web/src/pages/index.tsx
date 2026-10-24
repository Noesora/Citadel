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
        <section className="product-hero product-measure" aria-labelledby="hero-title">
          <div className="product-pitch">
            <p className="product-eyebrow">Memory for teams and their agents</p>
            <h1 id="hero-title" aria-label="Your team learns. Citadel remembers.">
              <span className="heading-lead" aria-hidden="true">Your team learns.</span>
              <span className="headline-row" aria-hidden="true">Citadel <span className="word-window"><span className="word-track">{WORDS.map((word, i) => <span key={i}>{word}</span>)}</span></span></span>
            </h1>
            <p className="product-lede">Your agent should know what your team already learned. Citadel brings company knowledge and private working memory into the same conversation.</p>
            <div className="product-cta"><a className="product-primary" href="#central">Explore the memory</a><a href="/architecture">Explore the architecture <span aria-hidden="true">↗</span></a></div>
            <p className="product-hero-hint">Move through the scene. Pick up a card. See where context goes.</p>
          </div>
          <MemoryScene />
        </section>

        <section id="central" className="product-chapter product-measure" aria-labelledby="central-title">
          <div className="product-chapter-copy">
            <p className="product-eyebrow">01 / Central</p>
            <h2 id="central-title">The reason behind the decision.<br /><em>Still within reach.</em></h2>
            <p>Your team already worked through the trade-offs. Central keeps shared company knowledge available to people and their agents, with references back to the source.</p>
            <p>Find the earlier decision before starting the discussion again.</p>
            <a className="product-text-link" href="/architecture/memory#central">Explore shared memory <span aria-hidden="true">↗</span></a>
            <div className="product-example"><span>Ask your agent</span><p>“Why did we choose this approach?”</p><small>Illustrative question. Inspect the source behind the answer.</small></div>
          </div>
          <MemoryScene variant="central" />
        </section>

        <section id="nodes" className="product-chapter product-chapter--reverse product-measure" aria-labelledby="nodes-title">
          <div className="product-chapter-copy">
            <p className="product-eyebrow">02 / Your Node</p>
            <h2 id="nodes-title">Your work in progress.<br /><em>Your own memory.</em></h2>
            <p>Every team member has a private Node. Their working context stays separate from other members' Nodes, while their agents can use the context they are allowed to read.</p>
            <p>Keep the unfinished thought, the local investigation, and the detail that only matters to your next task.</p>
            <a className="product-text-link" href="/architecture/memory#nodes">Explore the memory boundary <span aria-hidden="true">↗</span></a>
          </div>
          <MemoryScene variant="node" />
        </section>

        <section id="traces" className="product-chapter product-measure" aria-labelledby="traces-title">
          <div className="product-chapter-copy">
            <p className="product-eyebrow">03 / Shared Session Traces</p>
            <h2 id="traces-title">Someone already tried it.<br /><em>Start from there.</em></h2>
            <p>A useful session is more than its final answer. Share a distilled record of the task, the approaches tried, and the dead ends.</p>
            <p>Other members and their agents can consult that prior work. You choose what to volunteer. A shared trace stays separate from curated Central knowledge.</p>
            <a className="product-text-link" href="/architecture/memory#traces">Explore deliberate sharing <span aria-hidden="true">↗</span></a>
            <div className="product-example"><span>Try the boundary</span><p>Drag a session card from your drawer to the tray.</p><small>The example copy is shared. Your private context remains.</small></div>
          </div>
          <MemoryScene variant="traces" />
        </section>

        <section id="hooks" className="product-chapter product-chapter--reverse product-measure" aria-labelledby="hooks-title">
          <div className="product-chapter-copy">
            <p className="product-eyebrow">04 / Capture hooks</p>
            <h2 id="hooks-title">Do the work.<br /><em>Keep the context.</em></h2>
            <p>Supported session hooks can capture a summary when a session ends. A git hook can capture push metadata from approved repositories.</p>
            <p>That context goes into your private Node. Capturing it and sharing it with the team are separate actions.</p>
            <a className="product-text-link" href="/architecture/capture">Explore capture hooks <span aria-hidden="true">↗</span></a>
          </div>
          <MemoryScene variant="hooks" />
        </section>

        <section id="start" className="product-close product-measure" aria-labelledby="start-title">
          <p className="product-eyebrow">Keep the context behind the work</p>
          <h2 id="start-title">Give the next task<br /><em>a better starting point.</em></h2>
          <p>Inspect the source. Explore the architecture. Run Citadel on infrastructure you operate.</p>
          <div className="product-cta"><a className="product-primary" href="/architecture/self-hosting">Start with self-hosting</a><a href="https://github.com/Noesora/Citadel">Read the source <span aria-hidden="true">↗</span></a></div>
          <p className="product-availability">This site offers no hosted node or seat token.</p>
        </section>
      </main>
      <footer className="product-footer product-measure">
        <a className="product-footer-wordmark" href="/">Citadel</a>
        <div><a href="/architecture">Architecture</a><a href="/architecture/memory">Memory &amp; sharing</a><a href="/architecture/capture">Capture hooks</a><a href="/architecture/self-hosting">Self-hosting</a><a href={ISSUES_HREF}>Questions &amp; issues</a></div>
        <p>Open source. Maintained by <a href="https://github.com/Sarthib7">@Sarthib7</a>.</p>
      </footer>
    </div>
  );
}
