import { PipelineDiagram } from "@/components/pipeline-diagram";
import {
  ArchitectureLayout,
  ArchitectureSection,
  ARCHITECTURE_DOCS,
} from "@/components/architecture-layout";
import { BTN, CARD_P, Card, CTA, LEDE, SecHead } from "@/components/ui";

export default function ArchitectureIndex() {
  return (
    <ArchitectureLayout
      current="/architecture"
      title="How Citadel keeps memory in scope"
      eyebrow="Architecture · system map"
      description="A technical guide to Citadel's private Nodes, shared Central, capture hooks, and explicitly shared session traces."
    >
      <ArchitectureSection tone="grey">
        <SecHead kicker="01 · System map" title="Capture, scope, and retrieval" />
        <p className={LEDE}>
          Each seat has a private Node. Central holds shared organization knowledge. Shared Session
          Traces use a separate dataset and require an explicit share action.
        </p>

        <PipelineDiagram />

        <div className="grid grid-cols-3 gap-px bg-border max-[900px]:grid-cols-1">
          <div className="bg-surface px-6 py-5 max-[620px]:px-4">
            <h3 className="mb-2 text-base font-semibold">One private Node per seat</h3>
            <p className={CARD_P}>
              Seat-scoped capture writes to that seat&apos;s Node. A normal seat read can include its
              own Node and Central, subject to the caller&apos;s token scope.
            </p>
          </div>
          <div className="bg-surface px-6 py-5 max-[620px]:px-4">
            <h3 className="mb-2 text-base font-semibold">Central is shared</h3>
            <p className={CARD_P}>
              Central holds organization knowledge. Org sync and governed promotion update it. Seat
              writes do not directly target Central.
            </p>
          </div>
          <div className="bg-surface px-6 py-5 max-[620px]:px-4">
            <h3 className="mb-2 text-base font-semibold">Traces are volunteered</h3>
            <p className={CARD_P}>
              Shared Session Traces live outside both Node and Central. A person shares one through
              an in-session MCP action.
            </p>
          </div>
        </div>
        <p className="mt-5 text-[13.5px] leading-[1.6] text-ink-3">
          Search results carry a dataset and source locator when the stored record provides them.
          Admin and service identities can have broader access than a seat token.
        </p>
      </ArchitectureSection>

      <ArchitectureSection tone="white">
        <SecHead kicker="02 · Detail" title="Follow one part at a time" />
        <p className={LEDE}>
          These pages describe memory boundaries, capture, promotion, and self-hosting. Each links
          to the decisions and setup notes behind the summary.
        </p>
        <div className="grid grid-cols-3 gap-3.5 max-[900px]:grid-cols-1">
          <Card title="Memory and sharing">
            <p className={CARD_P}>
              Compare a private Node, Central, and a Shared Session Trace. See how seat and admin
              scopes differ.
            </p>
            <a className={`${BTN} mt-4`} href="/architecture/memory">
              Read memory model
            </a>
          </Card>
          <Card title="Capture and promotion">
            <p className={CARD_P}>
              Follow git and session hooks into a Node, then read how governed promotion works as
              a separate path.
            </p>
            <a className={`${BTN} mt-4`} href="/architecture/capture">
              Read capture flow
            </a>
          </Card>
          <Card title="Self-hosting">
            <p className={CARD_P}>
              Clone the source, inspect the CLI, and follow the deployment and data-scope docs.
            </p>
            <a className={`${BTN} mt-4`} href="/architecture/self-hosting">
              Read setup steps
            </a>
          </Card>
        </div>
        <div className={`${CTA} mt-6`}>
          <a className={BTN} href={ARCHITECTURE_DOCS.architecture}>
            Architecture notes
          </a>
          <a className={BTN} href="/">
            Citadel home
          </a>
        </div>
      </ArchitectureSection>
    </ArchitectureLayout>
  );
}
