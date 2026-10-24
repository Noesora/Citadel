import {
  ArchitectureLayout,
  ArchitectureSection,
  ARCHITECTURE_DOCS,
} from "@/components/architecture-layout";
import {
  CARD_P,
  Card,
  CODE,
  DEEP_B,
  LEDE,
  PLAINLIST,
  Row,
  SecHead,
} from "@/components/ui";

export default function ArchitectureCapture() {
  return (
    <ArchitectureLayout
      current="/architecture/capture"
      title="Capture lands in a Node"
      eyebrow="Architecture · capture and promotion"
      description="Approved capture roots and session hooks send work to a seat's Node. Governed promotion is a separate path into Central."
    >
      <ArchitectureSection tone="grey" id="capture">
        <SecHead kicker="01 · Capture" title="Hooks write to the seat Node" />
        <p className={LEDE}>
          Capture is configured on the machine and uses the seat&apos;s access token. Git capture
          runs only in an Approved Capture Root. The SessionEnd hook sends a short session note to
          the configured Node.
        </p>
        <div className="grid grid-cols-2 gap-3.5 max-[760px]:grid-cols-1">
          <Card title="Git pre-push hook">
            <p className={CARD_P}>
              The hook snapshots pushed commits in an approved root and sends them to the Node. A
              missing or unmatched root skips capture.
            </p>
          </Card>
          <Card title="SessionEnd hook">
            <p className={CARD_P}>
              The client distills a short note from the session transcript and posts it to the
              Node. It does not share a Shared Session Trace.
            </p>
          </Card>
        </div>
        <ul className={PLAINLIST}>
          <li>Capture roots are selected during `citadel setup` or `citadel onboard`.</li>
          <li>Hooks send writes through the configured HTTPS Node endpoint.</li>
          <li>
            Hook failures do not block a git push or session close. A receipt can report an
            unconfirmed send.
          </li>
        </ul>
      </ArchitectureSection>

      <ArchitectureSection tone="white" id="promotion">
        <SecHead kicker="02 · Governed sharing" title="Promotion is a separate decision" />
        <p className={LEDE}>
          A capture stays on its Node unless a governed process creates a separate copy in Central.
          Seat capture cannot route a write directly to Central.
        </p>
        <div className="grid grid-cols-2 gap-3.5 max-[760px]:grid-cols-1">
          <Card title="Review candidate">
            <p className={CARD_P}>
              The promotion policy checks for secrets, capture-root tags, source references, and
              whether content is relevant and safe to share.
            </p>
          </Card>
          <Card title="Choose the route">
            <p className={CARD_P}>
              Eligible organization work can be copied to Central. A new project can wait for
              approval. Other material stays on the Node.
            </p>
          </Card>
        </div>
        <div className="mt-6 border-t border-border pt-5">
          <Row
            label={<span className="font-mono text-[11px] text-ink-3">01</span>}
            title="The copy keeps its origin"
          >
            Promotion adds a governed copy. The original remains in the seat&apos;s Node, and the
            Central record carries promotion metadata.
          </Row>
          <Row
            label={<span className="font-mono text-[11px] text-ink-3">02</span>}
            title="Shared traces follow another rule"
          >
            A person can volunteer a trace through <code className={CODE}>citadel_share_session</code>.
            Shared traces stay reference-only and do not enter Central promotion.
          </Row>
        </div>
        <p className="mt-5 text-[13.5px] leading-[1.6] text-ink-3">
          Review the <a href={ARCHITECTURE_DOCS.capture}>capture and promotion policy</a> and the{" "}
          <a href={ARCHITECTURE_DOCS.teammateSetup}>teammate setup guide</a>.
        </p>
        <p className="mt-3 text-[13.5px] leading-[1.6] text-ink-3">
          <strong className={DEEP_B}>Need to run Citadel?</strong> See{" "}
          <a href="/architecture/self-hosting">self-hosting setup</a>.
        </p>
      </ArchitectureSection>
    </ArchitectureLayout>
  );
}
