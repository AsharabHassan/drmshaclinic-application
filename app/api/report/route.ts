import { NextResponse } from "next/server";
import { upsertContact, uploadMedia, setContactReportUrl } from "@/lib/ghlApi";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Captures the customer's report PDF into GHL at results time: upsert the
 * contact, upload the PDF to the media library, and store its URL on the
 * contact's report field — so a later "appointment booked" webhook can email
 * it as an attachment. Best-effort: never surfaces a failure to the client.
 */
export async function POST(req: Request) {
  let body: { email?: unknown; pdfBase64?: unknown; name?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const pdfBase64 = typeof body.pdfBase64 === "string" ? body.pdfBase64 : "";
  const name = typeof body.name === "string" ? body.name : undefined;
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
  } catch (err) {
    // Log and swallow — the customer's results page must never be affected.
    console.error("[report] GHL capture failed:", err);
  }
  return NextResponse.json({ ok: true });
}
