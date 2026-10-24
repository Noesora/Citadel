import {
  ArchitectureLayout,
  ArchitectureSection,
  ARCHITECTURE_DOCS,
} from "@/components/architecture-layout";
import { CARD_P, Card, CODE, DEEP_B, LEDE, PLAINLIST, SecHead } from "@/components/ui";

export default function ArchitectureMemory() {
  return (
    <ArchitectureLayout
      current="/architecture/memory"
      title="Three memory scopes"
      eyebrow="Architecture · memory and sharing"
      description="Citadel keeps seat memory, curated organization knowledge, and volunteered session traces in separate scopes."
    >
      <ArchitectureSection tone="grey" id="nodes">
        <SecHead kicker="01 · Private working memory" title="A Node belongs to a seat" />
        <p className={LEDE}>
          A Node is the default target for a seat&apos;s working notes and capture. A seat-scoped
          caller can read its own Node and Central when its token permits those reads.
        </p>
        <div className="grid grid-cols-2 gap-3.5 max-[760px]:grid-cols-1">
          <Card title="Seat scope">
            <p className={CARD_P}>
              The Node is the storage boundary. A normal seat token cannot read another seat&apos;s
              Node. A token&apos;s role and allowed datasets still control each request.
            </p>
          </Card>
          <Card title="Privileged access">
            <p className={CARD_P}>
              Admin and service identities can have broader access, with audit. Node isolation does
              not mean an operator can never inspect a Node.
            </p>
          </Card>
        </div>
      </ArchitectureSection>

      <ArchitectureSection tone="white" id="central">
        <SecHead kicker="02 · Shared organization memory" title="Central has a governed write path" />
        <p className={LEDE}>
          Central is the organization-wide dataset. Seat-scoped callers read it under their token
          scope, but seat capture does not write directly into it.
        </p>
        <ul className={PLAINLIST}>
          <li>Organization sync can add source material to Central.</li>
          <li>A separate promotion process can copy eligible material from a Node.</li>
          <li>The original stays on the Node when a promotion creates a Central copy.</li>
        </ul>
      </ArchitectureSection>

      <ArchitectureSection tone="grey" id="traces">
        <SecHead kicker="03 · Voluntary sharing" title="A Shared Session Trace stays separate" />
        <p className={LEDE}>
          A Session Trace records a task, approaches, dead ends, and files touched. It is a
          reference to prior work, not a claim that the result is true.
        </p>
        <div className="grid grid-cols-2 gap-3.5 max-[760px]:grid-cols-1">
          <Card title="Explicit share action">
            <p className={CARD_P}>
              The author chooses to share through <code className={CODE}>citadel_share_session</code>
              . SessionEnd capture does not auto-share a trace.
            </p>
          </Card>
          <Card title="Separate dataset">
            <p className={CARD_P}>
              Shared traces live in <code className={CODE}>session-traces</code>, outside both Node
              and Central. Search marks them as reference-only. They are not promoted into Central.
            </p>
          </Card>
        </div>
        <p className="mt-5 text-[14.5px] leading-[1.6] text-ink-2">
          Search resolves its scope from the caller&apos;s role and token. Results include a dataset
          and source locator when the retained record has that information. Treat retrieved content
          as material to check, including content from Central.
        </p>
        <p className="mt-4 text-[13.5px] leading-[1.6] text-ink-3">
          Read the <a href={ARCHITECTURE_DOCS.memory}>Node and Central decision</a>, the{" "}
          <a href={ARCHITECTURE_DOCS.sharedTraces}>Shared Session Trace decision</a>, and the{" "}
          <a href={ARCHITECTURE_DOCS.access}>agent access model</a>.
        </p>
        <p className="mt-3 text-[13.5px] leading-[1.6] text-ink-3">
          <strong className={DEEP_B}>Need the capture path?</strong> Read{" "}
          <a href="/architecture/capture">Capture and promotion</a>.
        </p>
      </ArchitectureSection>
    </ArchitectureLayout>
  );
}
