import { DISCLAIMER_FULL } from "./legal";

/** Subject + HTML body for the report email sent when a customer books. */
export function reportEmail(firstName: string): {
  subject: string;
  html: string;
} {
  const hi = firstName ? `Hi ${firstName},` : "Hi,";
  return {
    subject:
      "Your personalised skin report — Dr.M.Sha Wellness & Aesthetics Clinic",
    html: `
<div style="font-family:Helvetica,Arial,sans-serif;color:#2b2b2b;line-height:1.6;font-size:15px">
  <p>${hi}</p>
  <p>Thank you for booking your free online phone consultation with
  <strong>Dr.M.Sha Wellness &amp; Aesthetics Clinic</strong>. Your personalised
  skin report is attached as a PDF for you to keep — it includes your skin
  analysis, treatment map, and a before/after preview.</p>
  <p style="font-size:12px;color:#8a6d3b;background:#fcf6e8;border:1px solid #e6cf8f;border-radius:8px;padding:10px 12px">
    ${DISCLAIMER_FULL}
  </p>
  <p>We look forward to speaking with you.<br/>— Dr.M.Sha Wellness &amp; Aesthetics Clinic</p>
</div>`.trim(),
  };
}
