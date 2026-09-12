# Veluria Skin Studio — Sirona Aesthetics

A complimentary AI skin-consultation lead magnet. A visitor takes one photo and
receives a consultant-grade written analysis (Claude vision), a treatment map of
their face, and a luminous before/after preview of their results with Veluria
Silk Skin by PB Serum (OpenAI image edit). Leads are pushed to GoHighLevel with
Meta Conversions API attribution.

Built with **Next.js 15 (App Router)** and **Tailwind CSS**. Zero-config on Vercel.

## Tech

- Next.js 15 / React 19 / TypeScript
- Tailwind CSS
- `@anthropic-ai/sdk` — `claude-sonnet-4-6` vision for the written analysis
- `openai` — `gpt-image-2` edits for the before/after + treatment map
- GoHighLevel inbound webhook for CRM lead capture

## Local development

```bash
npm install
cp .env.local.example .env.local   # then fill in your keys
npm run dev                        # http://localhost:3000
```

> Don't run `next build` while `next dev` is running — they share the `.next`
> directory and the running dev server will break. Stop dev first.

## Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (and in
`.env.local` for local dev). See `.env.local.example` for the full template.

| Variable | Required | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Yes | Claude vision — the written skin analysis. |
| `OPENAI_API_KEY` | Yes | `gpt-image-2` — the before/after + treatment-map image. |
| `GHL_WEBHOOK_URL` | Yes* | GoHighLevel inbound webhook; leads are POSTed here. If unset, the lead is logged and the user still reaches results. |
| `NEXT_PUBLIC_WHATSAPP_URL` | No | WhatsApp click-to-chat link behind every "Book consultation" button. Defaults to the clinic's number. |
| `NEXT_PUBLIC_TREATMENT_URL` | No | Online booking portal behind every "Book a treatment" button. Defaults to the clinic's portal. |
| `NEXT_PUBLIC_META_PIXEL_ID` | No | Meta Pixel ID for PageView/Lead events + CAPI matching. Leave unset for the demo; set the real Sirona pixel before any campaign. |

## Deploying on Vercel

1. Push this repo to GitHub (already done if you're reading this on GitHub).
2. In the [Vercel dashboard](https://vercel.com/new), **Import** the repository.
3. Framework preset: **Next.js** (auto-detected, no config needed).
4. Add the environment variables from the table above.
5. **Deploy.**

## Optional: Veluria reference images

Drop 3–6 real, consented Veluria "after" skin-crop photos in
`public/references/veluria/` to make the AI before/afters more credible. The app
falls back to a text-only prompt automatically when the folder is empty. See
`public/references/veluria/README.md` for the rules and consent requirements.

---

A cosmetic, non-diagnostic AI simulation. Not medical advice.
