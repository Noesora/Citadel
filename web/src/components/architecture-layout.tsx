import Head from "next/head";
import type { ReactNode } from "react";

import { HeroBand } from "@/components/hero-band";
import { SiteFooter } from "@/components/site-footer";
import {
  BAND,
  BAND_IN,
  EYEBROW,
  H1_WIDE,
  HERO_P,
  SECTION,
  TONE,
  type Tone,
} from "@/components/ui";

const REPOSITORY = "https://github.com/Noesora/Citadel";

export const ARCHITECTURE_DOCS = {
  access: `${REPOSITORY}/blob/main/docs/agent-access-model.md`,
  architecture: `${REPOSITORY}/blob/main/docs/architecture.md`,
  capture: `${REPOSITORY}/blob/main/docs/adr/0007-seat-capture-promotion-write-policy.md`,
  license: `${REPOSITORY}/blob/main/LICENSE`,
  mcp: `${REPOSITORY}/blob/main/docs/mcp/README.md`,
  memory: `${REPOSITORY}/blob/main/docs/adr/0003-seat-node-central-private-memory.md`,
  operations: `${REPOSITORY}/blob/main/docs/operations.md`,
  publicPrivate: `${REPOSITORY}/blob/main/docs/public-and-private.md`,
  sharedTraces: `${REPOSITORY}/blob/main/docs/adr/0011-shared-session-traces.md`,
  teammateSetup: `${REPOSITORY}/blob/main/docs/onboarding/teammate-rollout.md`,
};

const ARCHITECTURE_PAGES = [
  { href: "/architecture", label: "System map" },
  { href: "/architecture/memory", label: "Memory and sharing" },
  { href: "/architecture/capture", label: "Capture and promotion" },
  { href: "/architecture/self-hosting", label: "Self-hosting" },
];

export function ArchitectureLayout({
  current,
  title,
  eyebrow,
  description,
  children,
}: {
  current: string;
  title: string;
  eyebrow: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="product-site">
      <Head>
        <title>{title} | Citadel</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <HeroBand current={current} wide decoration={false}>
        <p className={EYEBROW}>{eyebrow}</p>
        <h1 className={H1_WIDE}>{title}</h1>
        <p className={HERO_P}>{description}</p>
      </HeroBand>

      <nav
        className="architecture-links border-b border-border bg-ground"
        aria-label="Architecture pages"
      >
        <div className={`${BAND_IN} flex items-stretch gap-0 overflow-x-auto`}>
          {ARCHITECTURE_PAGES.map((page) => {
            const selected = page.href === current;
            return (
              <a
                key={page.href}
                href={page.href}
                aria-current={selected ? "page" : undefined}
                className={`inline-flex shrink-0 items-center border-b-2 px-3 py-3 text-[12px] font-mono uppercase tracking-[.05em] no-underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent max-[620px]:px-2 max-[620px]:text-[10.5px] ${
                  selected
                    ? "border-accent text-ink"
                    : "border-transparent text-ink-2 hover:border-border-2 hover:text-ink"
                }`}
              >
                {page.label}
              </a>
            );
          })}
        </div>
      </nav>

      <main className="architecture-page">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function ArchitectureSection({
  id,
  tone,
  children,
}: {
  id?: string;
  tone: Tone;
  children: ReactNode;
}) {
  return (
    <section className={`${id ? SECTION : BAND} ${TONE[tone]}`} id={id}>
      <div className={`${BAND_IN} architecture-content`}>{children}</div>
    </section>
  );
}
