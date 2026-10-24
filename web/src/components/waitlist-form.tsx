import { useRef, useState, type FormEvent } from "react";

import { FIELD_INPUT, FIELD_LABEL, SUBMIT } from "@/components/ui";

const GENERIC_FAILURE = "We could not save your email. Please try again.";
const SAVED = "Your email is saved for waitlist and access updates. Joining does not create an account.";

type Status = { kind: "pending" | "success" | "error"; text: string } | null;

export async function submitWaitlist(email: string, website: string): Promise<void> {
  const response = await fetch("/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, website }),
  });

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (response.status !== 200 || !/^application\/json(?:\s*;|$)/i.test(contentType)) {
    throw new Error(GENERIC_FAILURE);
  }

  const body: unknown = await response.json().catch(() => null);
  const stored = body && typeof body === "object" && !Array.isArray(body)
    ? (body as { stored?: unknown }).stored
    : undefined;
  if (stored !== true) throw new Error(GENERIC_FAILURE);
}

export function WaitlistForm() {
  const [status, setStatus] = useState<Status>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;

    inFlight.current = true;
    setSubmitting(true);
    setStatus({ kind: "pending", text: "Saving your email…" });

    const fields = new FormData(event.currentTarget);
    try {
      await submitWaitlist(String(fields.get("email") ?? ""), String(fields.get("website") ?? ""));
      setStatus({ kind: "success", text: SAVED });
    } catch {
      setStatus({ kind: "error", text: GENERIC_FAILURE });
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  const statusRole = status?.kind === "error" ? "alert" : "status";

  return (
    <form method="post" action="/waitlist" onSubmit={onSubmit} className="flex w-full flex-col gap-2.5">
      <label className={FIELD_LABEL} htmlFor="waitlist-email">
        Email address
      </label>
      <input
        className={FIELD_INPUT}
        id="waitlist-email"
        name="email"
        type="email"
        required
        maxLength={320}
        autoComplete="email"
        inputMode="email"
        placeholder="you@company.com"
      />

      <div className="sr-only" aria-hidden="true">
        <label htmlFor="waitlist-website">Leave this field empty</label>
        <input id="waitlist-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <p
        className={`min-h-[1.6em] text-[13px] leading-[1.6] ${status?.kind === "error" ? "text-warn" : "text-good"}`}
        role={statusRole}
        aria-live={status?.kind === "error" ? "assertive" : "polite"}
        aria-atomic="true"
        aria-busy={submitting}
      >
        {status?.text ?? ""}
      </p>
      <button type="submit" disabled={submitting} aria-busy={submitting} className={`${SUBMIT} w-full`}>
        {submitting ? "Saving" : "Join waitlist"}
      </button>
    </form>
  );
}
