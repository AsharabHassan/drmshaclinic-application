# GHL setup — email the skin report on booking

When a customer views their results, the app captures their report PDF into GHL
(media library) and stores its URL on the contact's **Facial Report Pdf** field.
When they then book the consultation, a GHL workflow calls the app, which emails
the customer their report as a PDF attachment via the GHL API.

## 1. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (and in
`.env.local` for local dev). Never commit the real token.

| Variable | Value |
| --- | --- |
| `GHL_API_KEY` | The Private Integration token (`pit-…`). |
| `GHL_LOCATION_ID` | `XnwkbaimNt2dfzDG3w4K` |
| `GHL_REPORT_FIELD_KEY` | `facial_report_pdf` |
| `GHL_REPORT_FIELD_ID` | `Glut0DNmtFHMAvhwuHbn` (the id of the Facial Report Pdf field) |
| `GHL_WEBHOOK_SECRET` | A long random string of your choosing (used in the webhook URL below). |

The Private Integration token needs scopes: **Contacts** (read + write),
**Medias** (write), and **Conversations / Conversations Messages** (write).

> If the "Facial Report Pdf" custom field is ever recreated, its id changes —
> update `GHL_REPORT_FIELD_ID` to match.

## 2. The GHL workflow

Create one workflow in the sub-account:

1. **Trigger:** *Customer Booked Appointment* — filter it to the
   **free-online-phone-consultation** calendar
   (`https://link.drmshaclinic.com/widget/bookings/free-online-phone-consultation`).
2. **Action:** *Webhook* — method **POST**, URL:

   ```
   https://app.drmshaclinic.com/api/appointment-booked?key=<GHL_WEBHOOK_SECRET>
   ```

   In the webhook payload, include at least the contact **id** (`contactId`) and,
   if available, **firstName** (used to personalise the greeting).
3. **Save & publish.**

That's all — the report is captured automatically while the customer views their
results, so by booking time their contact already has the PDF, and the email
goes out with it attached. If a booking somehow arrives before the report was
captured, the email still sends (without the attachment) and is logged.

## 3. How to test

1. Run a real analysis on the live site with a test email you control.
2. In GHL, confirm that contact's **Facial Report Pdf** field is populated with a
   `assets.cdn.filesafe.space/…​.pdf` URL.
3. Book a test appointment on the calendar (or fire the workflow manually).
4. Confirm the email arrives with the PDF attached, and the contact gains the
   `facial-report-emailed` tag (which prevents duplicate sends).
