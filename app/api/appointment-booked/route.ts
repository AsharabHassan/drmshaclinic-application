import { NextResponse } from "next/server";
import { getContact, sendEmail, addContactTag } from "@/lib/ghlApi";
import { reportEmail } from "@/lib/reportEmail";

export const runtime = "nodejs";
export const maxDuration = 30;

const SENT_TAG = "facial-report-emailed";

/** Pull the contact id out of the various shapes GHL webhooks can send. */
function pickContactId(body: Record<string, unknown>): string {
  const flat = [body.contactId, body.contact_id, body.id];
  for (const c of flat) if (typeof c === "string" && c) return c;
  const nested = body.contact as { id?: unknown } | undefined;
  if (nested && typeof nested.id === "string") return nested.id;
  return "";
}

/**
 * Fired by a GHL "Appointment Booked" workflow webhook. Emails the customer
 * their skin-report PDF (stored on the contact during their results view) as a
 * true attachment via the GHL Conversations API. De-duped by a contact tag so a
 * customer is emailed at most once. Always returns 200 so GHL does not retry.
 */
export async function POST(req: Request) {
  // Shared-secret guard: only GHL (which includes ?key=) may trigger a send.
  const url = new URL(req.url);
  const secret = process.env.GHL_WEBHOOK_SECRET;
  if (secret && url.searchParams.get("key") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: true }); // don't make GHL retry a bad body
  }

  const contactId = pickContactId(body);
  if (!contactId || !process.env.GHL_API_KEY) {
    console.warn("[booking] missing contactId or GHL_API_KEY — nothing to send.");
    return NextResponse.json({ ok: true });
  }

  try {
    const contact = await getContact(contactId);
    if (contact.tags.includes(SENT_TAG)) {
      return NextResponse.json({ ok: true, deduped: true }); // already emailed
    }
    const firstName = typeof body.firstName === "string" ? body.firstName : "";
    const { subject, html } = reportEmail(firstName);
    await sendEmail({
      contactId,
      subject,
      html,
      attachments: contact.reportUrl ? [contact.reportUrl] : undefined,
    });
    await addContactTag(contactId, SENT_TAG);
    if (!contact.reportUrl) {
      console.warn(
        `[booking] contact ${contactId} had no report URL — sent without attachment.`,
      );
    }
  } catch (err) {
    console.error("[booking] send failed:", err);
  }
  return NextResponse.json({ ok: true });
}
