# Sell the end result, not the protocol — Veluria report redesign

**Date:** 2026-07-27
**Apps:** Dr M Sha, OD Aesthetics, Skin Booster HSA, Aesthetics Central, Veluria for Clinics

## The problem

Leads arrive and consultations are not booked. Clients reach the results page,
look at their before/after, and do not click through to the calendar.

Reading the current code, three things undersell the result at the same time:

1. **The numbers cap the story.** `lib/expectations.ts` ceilings every claim so
   the largest badge the UI can render is `+25–30%`, and firmness — the concern
   most people actually book for — is capped at `+20%`. A client reads
   "+10–20%" beside their own face and hears "barely worth it".

2. **Only one product changes their skin.** `planFor()` derives the plan from
   flagged annotations only, so most clients see the effect of a single Veluria
   product. The range's own value is that the three skin products overlap and
   compound — all three act on luminosity and firmness — and that story is
   never told.

3. **One crop, not crop-by-crop.** `HeroZoom` magnifies a single headline area.
   Every other flagged concern is a text row with a small percentage next to
   it. There is exactly one piece of visual proof on the page.

A fourth problem is the ask itself: four CTAs, all identical, all reading
"Free Online Phone Consultation" — a description of the call's format, not a
reason to take it.

## Constraint added by the clinic owner

**The report must not prescribe.** No session counts, no course lengths, no
timelines, no protocol of any kind in client-facing copy. Deciding how many
sessions someone needs is the doctor's job and happens at the consultation.

The report's only job is to show **the end result the client can reach**, and
then get them onto the calendar.

This is a hard constraint and it removes copy that exists today:

| Currently rendered | Becomes |
| --- | --- |
| `Expected +10–20% after 5 sessions` | `Firmness 48 → 68` |
| `Ultra Lift — 5 sessions` | `Veluria Ultra Lift` |
| `Session 3` / `Full course of 5` | `Today` / `As it builds` / `Your full result` |
| `Silk Skin — 3 sessions, Pearl Tone — 3 sessions` | `Veluria Silk Skin with Veluria Pearl Tone` |
| `after 3 sessions` (score badges) | *(no timeline at all)* |

`VeluriaProduct.sessions` stays in `lib/veluria.ts` — the image prompt and the
CRM still use it — but nothing client-facing renders it, and the `xN` suffix is
stripped from the plan string that rides on the booking link, since that can
surface in a prefilled calendar field.

## Product grounding

From PB Serum's own VELURIA page. Hair Force+ is excluded — this is a facial
report.

| Product | Actives (manufacturer) | Acts on |
| --- | --- | --- |
| Silk Skin | Collagenase G&H, PDRN | Texture, elasticity, firmness, luminosity |
| Ultra Lift | Collagenase G&H, DMAE, vitamins C & E | Tone, firmness, vitality, luminosity |
| Pearl Tone | Collagenase G&H, glutathione, HA | Uneven tone, clarity, luminosity |

Claim wording is the manufacturer's throughout, because it is already
appearance-level and is the safest form of every claim: "refines skin texture",
"enhances radiance", "improves the appearance of skin firmness", "boosts
luminosity", "helps reduce the appearance of uneven tone".

**Exosomes are still not claimed.** PB Serum's marketing lists them for Silk
Skin; the INCI does not. Existing decision, unchanged.

## Design

### 1. One programme, not one product — `lib/veluria.ts`

Add `programmeFor(categories, annotations)`. It starts from the products the
annotations match (today's `planFor`) and additionally admits a product when a
skin **category score** shows headroom that product answers — so Pearl Tone
enters the programme when Tone & redness has room, even if no annotation
happened to use the word "pigment".

Add a `contributes` line per product: what it adds *in combination*, for the
stack section.

`planFor` is kept as-is; `programmeFor` is the superset the report now shows.

### 2. Destination scores — `lib/expectations.ts`

The calibration table and its ceilings are **unchanged**. No claim is widened.

Add `projectedScore(category)` → `{ from, to }`, where `to = from + expected
gain`, clamped so nothing reaches an implausible 100. Add
`overallProjection(categories)` for the headline pair.

`ExpectedImprovement.label` drops its `after N sessions` suffix.

### 3. Crop by crop, every concern

`lib/hero.ts` generalises `heroZone()` into `concernZones()`, returning every
in-scope annotation ranked by severity then by expected gain, each carrying
x/y, matched product and score destination. The hero is simply the first.
Scope gating is unchanged — `expectedForArea` and `productFor` remain the two
gatekeepers, so an out-of-scope concern can never acquire a crop.

New `components/ConcernZooms.tsx` replaces `HeroZoom`: one magnified
before/after pair per in-scope concern, each with its area name, matched
product, score destination and a one-line note on what changes there. Reuses
`cropRegion`/`toSquare` from `lib/canvas.ts` — both panels are pixels taken
from identical coordinates in identically-normalised frames, so nothing is
re-rendered or re-graded and a treatment that did nothing shows that too.

Canvases draw lazily on scroll via `IntersectionObserver`; drawing seven pairs
at 780px on mount is a real cost on mobile.

Out-of-scope concerns keep their honest amber row in `AfterCallouts` and get no
crop.

### 4. The image becomes the programme endpoint — `lib/prompts.ts`

One generation, as today. A second generative pass is not added: `lib/glow.ts`
records that each pass preserves features only relative to its own input, and
the last time one was added, clients' active acne was visibly eroded.

Changes:
- The opening reframes from "twelve weeks after their course" to the completed
  Veluria programme.
- The plan block lists the whole programme (`programmeFor`), not just the
  annotation-matched subset.
- The hero still leads and still gets the largest change in the frame.

Every preservation rule is carried over verbatim: active acne counted and
untouched, vessels, moles, freckles, facial volume, and the skin-tone lock
(which is additionally enforced in code by `lockSkinTone`).

`components/CourseProgression.tsx` becomes four non-prescriptive stages —
Today, As it builds, Nearly there, Your full result — with the middle two
cross-faded between the two real endpoints. A blend cannot invent or delete
anything present in both endpoints, which is why the middle frames are derived
rather than generated.

### 5. The combination story — `components/VeluriaStack.tsx`

Three vials, one microneedled treatment, each doing a different job and all
three compounding on radiance and firmness. Explains that Veluria is
enzyme-driven — collagenase clears disorganised collagen so new collagen is
laid down — which is why the result builds rather than appears, and why the
endpoint shown is a destination rather than an overnight change. No session
counts, no timeline.

### 6. Push the consultation

Six changes, in rough order of expected impact:

1. **The sticky bar becomes a booking CTA.** Today it announces the preview is
   ready and offers "View ↑". Once the client has seen the preview it converts
   to a persistent "Book your free consultation" bar for the rest of the page.
   This is the single biggest lift available: on screen continuously instead of
   at four scroll positions.
2. **CTA at peak proof** — immediately after the crop reel, when the client has
   just watched every concern improve one at a time.
3. **CTA under the score-destination headline**, near the top, for the people
   who never scroll.
4. **Closing block** restating the result with the CTA, rather than a footer
   link.
5. **Outcome copy, not feature copy.** "Get this result — book your free
   consultation" rather than "Free Online Phone Consultation".
6. All CTAs keep existing tracking and continue to carry the matched plan and
   headline area into the booking record via `lib/booking.ts`.

### 7. Labelling

Preview caption, PDF (`lib/download.ts`) and report email
(`lib/reportEmail.ts`) all follow the same rule: name the result, name the
products, never name a session count or a timeline.

## Honesty properties preserved

- No calibration ceiling is raised. The destination score is the existing
  number in a different frame.
- Out-of-scope concerns are still refused, by the same two gatekeepers.
- The crops are unretouched pixels from the two images the client can see in
  full above them.
- The intermediate progression frames remain derived, not generated.
- The AI-simulation disclaimer stays at the top of the results, on the preview,
  and at the foot of the report.

## Rollout

Build in Dr M Sha, then port to OD Aesthetics, Skin Booster HSA and Aesthetics
Central with per-clinic branding. Veluria for Clinics (Sirona B2B demo) has no
live Vercel project and is updated in-repo only.
