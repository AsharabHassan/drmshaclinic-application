import { TREATMENT_URL, WHATSAPP_URL } from "./booking";
import { DISCLAIMER_FULL } from "./legal";

/**
 * Subject + HTML body for the report email the app sends as soon as the
 * customer's analysis is ready — delivering their report PDF and encouraging
 * them to book (the CTAs open a WhatsApp chat with the clinic, or the
 * online treatment booking portal).
 */
export function reportEmail(firstName: string): {
  subject: string;
  html: string;
} {
  const hi = firstName ? `Hi ${firstName},` : "Hi,";
  return {
    subject: firstName
      ? `Your personalised skin report is ready, ${firstName}`
      : "Your personalised skin report is ready",
    html: `
<div style="font-family:Helvetica,Arial,sans-serif;color:#2b2b2b;line-height:1.6;font-size:15px">
  <p>${hi}</p>
  <p>Thank you for taking your complimentary AI skin scan with
  <strong>Dr.M.Sha Wellness &amp; Aesthetics Clinic</strong>. Your personalised
  skin report is attached as a PDF — it includes your skin analysis, treatment
  map, and a before/after preview.</p>
  <p>The best next step is a <strong>consultation</strong>, where we&rsquo;ll walk
  you through your results together and recommend the right plan for your skin
  — whether that&rsquo;s Veluria or something else. Message us on WhatsApp to
  arrange one, or if you already know what you want, book a treatment online.</p>
  <p style="margin:26px 0">
    <a href="${WHATSAPP_URL}" target="_blank"
       style="display:inline-block;padding:14px 34px;background:#212121;color:#ffffff;
              font-weight:bold;font-size:14px;letter-spacing:0.5px;border-radius:999px;
              text-decoration:none">Book consultation &rarr;</a>
    &nbsp;&nbsp;
    <a href="${TREATMENT_URL}" target="_blank"
       style="display:inline-block;padding:13px 30px;background:#ffffff;color:#212121;
              border:1.5px solid #212121;font-weight:bold;font-size:14px;letter-spacing:0.5px;
              border-radius:999px;text-decoration:none">Book a treatment</a>
    <br/><span style="font-size:12px;color:#9e9e9e">No obligation</span>
  </p>
  <p style="font-size:12px;color:#8a6d3b;background:#fcf6e8;border:1px solid #e6cf8f;border-radius:8px;padding:10px 12px">
    ${DISCLAIMER_FULL}
  </p>
  <p>We look forward to speaking with you.<br/>— Dr.M.Sha Wellness &amp; Aesthetics Clinic</p>
</div>`.trim(),
  };
}
