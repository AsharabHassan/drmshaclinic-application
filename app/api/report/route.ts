import { NextResponse } from "next/server";
import {
  upsertContact,
  uploadMedia,
  setContactReportUrl,
  getContact,
  sendEmail,
  addContactTag,
} from "@/lib/ghlApi";
import { reportEmail } from "@/lib/reportEmail";

export const runtime = "nodejs";
export const maxDuration = 30;

const SENT_TAG = "facial-report-emailed";

/**
 * Captures the customer's report PDF into GHL at results time and — once the
 * report is finalised — emails it to the customer with a "book your free
 * consultation" CTA. Sent BEFORE booking, by the app; GHL handles its own
 * booking-confirmation emails separately. De-duped by a contact tag so the
 * customer is emailed at most once. Best-effort: never surfaces a failure.
 */
export async function POST(req: Request) {
  let body: {
    email?: unknown;
    pdfBase64?: unknown;
    name?: unknown;
    sendEmail?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const pdfBase64 = typeof body.pdfBase64 === "string" ? body.pdfBase64 : "";
  const name = typeof body.name === "string" ? body.name : undefined;
  // The client sets this true once the report is complete (after-image and map
  // have settled), so the emailed PDF is the final version.
  const shouldEmail = body.sendEmail === true;
  if (!email || !pdfBase64) {
    return NextResponse.json(
      { error: "email and pdfBase64 are required." },
      { status: 400 },
    );
  }
  if (!process.env.GHL_API_KEY) {
    console.warn("[report] GHL_API_KEY not set — skipping report capture.");
    return NextResponse.json({ ok: true });
  }

  try {
    const contactId = await upsertContact({ email, name });
    const url = await uploadMedia(
      Buffer.from(pdfBase64, "base64"),
      "DrMSha-Skin-Consultation.pdf",
    );
    await setContactReportUrl(contactId, url);

    // Email the finished report (with the book-now CTA), once per contact.
    if (shouldEmail) {
      const contact = await getContact(contactId);
      if (!contact.tags.includes(SENT_TAG)) {
        const firstName = (name ?? "").trim().split(/\s+/)[0] ?? "";
        const { subject, html } = reportEmail(firstName);
        await sendEmail({ contactId, subject, html, attachments: [url] });
        await addContactTag(contactId, SENT_TAG);
      }
    }
  } catch (err) {
    // Log and swallow — the customer's results page must never be affected.
    console.error("[report] GHL capture/send failed:", err);
  }
  return NextResponse.json({ ok: true });
}
