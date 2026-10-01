import { useState, type FormEvent } from "react";

import { FIELD_HINT, FIELD_INPUT, FIELD_LABEL, SUBMIT } from "@/components/ui";

const DELIVERED = "Thanks. Your message reached us.";
const STORED = "Thanks. Your message was saved for review.";
const GENERIC_FAILURE = "That did not go through. Please try again.";

type Note = { text: string; ok: boolean } | null;

export async function submitContact(data: FormData): Promise<"delivered" | "stored"> {
  const response = await fetch("/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: data.get("name") || "",
      email: data.get("email") || "",
      organization: data.get("organization") || "",
      message: data.get("message") || "",
      website: data.get("website") || "",
    }),
  });
  const body: unknown = response.headers.get("content-type")?.toLowerCase().startsWith("application/json")
    ? await response.json().catch(() => null)
    : null;
  const receipt = body && typeof body === "object"
    ? body as { detail?: unknown; stored?: unknown; delivered?: unknown }
    : null;
  if (!response.ok) {
    throw new Error(typeof receipt?.detail === "string" ? receipt.detail : GENERIC_FAILURE);
  }
  if (receipt?.stored !== true && receipt?.delivered !== true) {
    throw new Error(GENERIC_FAILURE);
  }
  return receipt.delivered === true ? "delivered" : "stored";
}

/* The website field is a honeypot. Only a JSON receipt can show submission success. */
export function ContactForm() {
  const [note, setNote] = useState<Note>(null);
  const [sending, setSending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setNote(null);
    setSending(true);

    const data = new FormData(form);
    try {
      const result = await submitContact(data);
      form.reset();
      setNote({ text: result === "delivered" ? DELIVERED : STORED, ok: true });
    } catch (error) {
      setNote({ text: error instanceof Error ? error.message : GENERIC_FAILURE, ok: false });
    } finally {
      setSending(false);
    }
  }

  return (
    <form method="post" action="/contact" onSubmit={onSubmit} className="relative mx-auto flex w-full flex-col gap-4">
      <div className="grid grid-cols-2 gap-3.5 max-[620px]:grid-cols-1">
        <div className="flex flex-col gap-[7px]">
          <label className={FIELD_LABEL} htmlFor="cf-name">
            Your name
          </label>
          <input
            className={FIELD_INPUT}
            id="cf-name"
            name="name"
            type="text"
            maxLength={120}
            required
            autoComplete="name"
          />
        </div>
        <div className="flex flex-col gap-[7px]">
          <label className={FIELD_LABEL} htmlFor="cf-email">
            Email
          </label>
          <input
            className={FIELD_INPUT}
            id="cf-email"
            name="email"
            type="email"
            maxLength={200}
            required
            autoComplete="email"
          />
        </div>
      </div>
      <div className="flex flex-col gap-[7px]">
        <label className={FIELD_LABEL} htmlFor="cf-org">
          Organisation
        </label>
        <input
          className={FIELD_INPUT}
          id="cf-org"
          name="organization"
          type="text"
          maxLength={160}
          autoComplete="organization"
        />
      </div>
      <div className="flex flex-col gap-[7px]">
        <label className={FIELD_LABEL} htmlFor="cf-msg">
          What you need
        </label>
        <textarea
          className={`${FIELD_INPUT} min-h-[130px] resize-y leading-[1.6]`}
          id="cf-msg"
          name="message"
          rows={6}
          maxLength={4000}
          required
        />
        <p className={FIELD_HINT}>
          Writing about a call? Include the call identifier, the topic, and the gap you need covered.
        </p>
      </div>

      {/* Honeypot. Off-screen rather than display:none, which some bots skip. */}
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="cf-web">Leave this field empty</label>
        <input id="cf-web" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <p
        className={`text-[13px] leading-[1.6] ${note?.ok ? "text-good" : "text-warn"}`}
        role="status"
      >
        {note?.text ?? ""}
      </p>
      <button type="submit" disabled={sending} aria-busy={sending} className={`${SUBMIT} w-full`}>
        {sending ? "Sending" : "Send enquiry"}
      </button>
    </form>
  );
}
