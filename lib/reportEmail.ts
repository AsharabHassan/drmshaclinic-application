import { DISCLAIMER_FULL } from "./legal";

/** The clinic's online booking calendar for the free phone consultation. */
const CALENDAR_URL =
  process.env.GHL_BOOKING_URL ??
  "https://link.drmshaclinic.com/widget/bookings/free-online-phone-consultation";

/**
 * Subject + HTML body for the report email the app sends as soon as the
 * customer's analysis is ready — delivering their report PDF and encouraging
 * them to book (the CTA links straight to the booking calendar).
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
  <p>The best next step is a <strong>free, no-obligation phone consultation</strong>,
  where we&rsquo;ll walk you through your results together and recommend the right
  plan for your skin — whether that&rsquo;s Veluria or something else.</p>
  <p style="margin:26px 0">
    <a href="${CALENDAR_URL}" target="_blank"
       style="display:inline-block;padding:14px 34px;background:#212121;color:#ffffff;
              font-weight:bold;font-size:14px;letter-spacing:0.5px;border-radius:999px;
              text-decoration:none">Book your free consultation &rarr;</a>
    <br/><span style="font-size:12px;color:#9e9e9e">Under 20 minutes &middot; No obligation</span>
  </p>
  <p style="font-size:12px;color:#8a6d3b;background:#fcf6e8;border:1px solid #e6cf8f;border-radius:8px;padding:10px 12px">
    ${DISCLAIMER_FULL}
  </p>
  <p>We look forward to speaking with you.<br/>— Dr.M.Sha Wellness &amp; Aesthetics Clinic</p>
</div>`.trim(),
  };
}
