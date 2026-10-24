import {
  ArchitectureLayout,
  ArchitectureSection,
  ARCHITECTURE_DOCS,
} from "@/components/architecture-layout";
import { BTN, CARD_P, Card, CODE, LEDE, SecHead } from "@/components/ui";

export default function ArchitectureSelfHosting() {
  return (
    <ArchitectureLayout
      current="/architecture/self-hosting"
      title="Run the source yourself"
      eyebrow="Architecture · self-hosting"
      description="Clone the public repository and inspect the CLI. Service deployment and live memory require infrastructure that you operate."
    >
      <ArchitectureSection tone="grey" id="setup">
        <SecHead kicker="01 · Source setup" title="Clone, sync, inspect" />
        <p className={LEDE}>
          These commands prepare the source checkout and show the CLI help. They do not create a
          hosted account, issue a token, or deploy a service.
        </p>
        <pre className="m-0 overflow-x-auto border border-border bg-surface px-5 py-4 font-mono text-[13px] leading-[1.8] text-ink max-[620px]:px-3">
          <code>{`git clone https://github.com/Noesora/Citadel.git
cd Citadel
uv sync --locked --dev
uv run citadel --help`}</code>
        </pre>
        <p className="mt-5 text-[14.5px] leading-[1.6] text-ink-2">
          A live service needs operator-managed configuration and infrastructure. Use the deployment
          guide for service setup and environment requirements.
        </p>
        <a className={`${BTN} mt-4`} href={ARCHITECTURE_DOCS.operations}>
          Read deployment guide
        </a>
      </ArchitectureSection>

      <ArchitectureSection tone="white" id="scope">
        <SecHead
          kicker="02 · License and data scope"
          title="Code is public. Vault data stays with its operator."
        />
        <div className="grid grid-cols-2 gap-3.5 max-[760px]:grid-cols-1">
          <Card title="Apache License 2.0">
            <p className={CARD_P}>
              Citadel is distributed under Apache-2.0. Read the license before you adapt or
              redistribute the source.
            </p>
            <a
              className="mt-3 inline-block text-[13.5px] text-accent-ink underline underline-offset-4"
              href={ARCHITECTURE_DOCS.license}
            >
              Read LICENSE
            </a>
          </Card>
          <Card title="Source and live data have different scopes">
            <p className={CARD_P}>
              The repository contains application code and docs. A running vault stores its own
              memory and access credentials. Do not commit tokens, environment files, or vault
              exports to the public repository.
            </p>
          </Card>
        </div>
        <p className="mt-5 text-[13.5px] leading-[1.6] text-ink-3">
          See the <a href={ARCHITECTURE_DOCS.publicPrivate}>public and private data guide</a>, the{" "}
          <a href={ARCHITECTURE_DOCS.mcp}>MCP integration guide</a>, and the{" "}
          <a href={ARCHITECTURE_DOCS.teammateSetup}>teammate setup guide</a>.
        </p>
        <p className="mt-4 text-[13.5px] leading-[1.6] text-ink-3">
          <code className={CODE}>uv sync --locked --dev</code> uses the project lockfile for this
          source setup. Service operations have separate requirements in the deployment guide.
        </p>
        <div className="mt-6 border-t border-border pt-5">
          <p className="m-0 text-[13.5px] leading-[1.6] text-ink-3">
            <strong>Architecture pages:</strong> <a href="/architecture">system map</a>,{" "}
            <a href="/architecture/memory">memory model</a>, and{" "}
            <a href="/architecture/capture">capture flow</a>. Return to <a href="/">Citadel home</a>.
          </p>
        </div>
      </ArchitectureSection>
    </ArchitectureLayout>
  );
}
