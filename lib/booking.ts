import type { HeroZone } from "./hero";
import type { VeluriaProduct } from "./veluria";

/**
 * Where the two booking buttons send people.
 *
 * "Book consultation" opens a WhatsApp chat with the clinic. "Book a
 * treatment" opens the clinic's online treatment booking portal. Both are
 * public, so they ship to the browser as NEXT_PUBLIC_* and fall back to the
 * clinic's live links when the env var is unset.
 */
export const WHATSAPP_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_URL ??
  "https://api.whatsapp.com/send/?phone=447305030793";

export const TREATMENT_URL =
  process.env.NEXT_PUBLIC_TREATMENT_URL ??
  "https://portal.aestheticnursesoftware.com/book-online/4977";

/** Where on the page the click came from, so we can see which CTA converts. */
export type CtaPlacement =
  | "score"
  | "hero-zoom"
  | "preview"
  | "stack"
  | "rejuvenation"
  | "case-study"
  | "sticky"
  | "footer";

export interface BookingContext {
  plan: VeluriaProduct[];
  hero?: HeroZone | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  placement: CtaPlacement;
}

/**
 * "Veluria Ultra Lift, Veluria Silk Skin"
 *
 * Product names only. This string goes into the client's opening WhatsApp
 * message, which they read before sending — so it must not carry a session
 * count. It used to ("Ultra Lift x5"), which quoted the client a course
 * length before the doctor had seen them. The clinic knows its own protocol;
 * what it needs from us is which products the skin matched.
 */
export function planSummary(plan: VeluriaProduct[]): string {
  return plan.map((p) => p.name).join(", ");
}

/**
 * Builds the WhatsApp link so the plan travels with the click.
 *
 * WHY. The old calendar link arrived as an anonymous slot request and the
 * clinic opened the call knowing nothing the app had already worked out. With
 * WhatsApp the client's first message can say it for them: who they are, which
 * products their skin matched, and which area they were looking at when they
 * decided to get in touch. The client sees and can edit the message before it
 * sends, so nothing is claimed on their behalf.
 */
export function whatsappUrl(base: string, ctx: BookingContext): string {
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    // A malformed NEXT_PUBLIC_WHATSAPP_URL must not break the only CTA on the
    // page — send them to the unadorned link instead.
    return base;
  }

  const lines = [
    "Hi Dr Sha, I've just completed the AI skin scan and would like to book a consultation.",
  ];
  const name = (ctx.name ?? "").trim();
  if (name) lines.push(`Name: ${name}`);
  const plan = planSummary(ctx.plan);
  if (plan) lines.push(`Matched: ${plan}`);
  const focus = (ctx.hero?.area ?? "").trim();
  if (focus) lines.push(`Main concern: ${focus}`);

  // Percent-encode by hand: URLSearchParams turns spaces into "+", which some
  // WhatsApp clients show literally instead of as a space.
  const text = encodeURIComponent(lines.join("\n"));
  const sep = url.search ? "&" : "?";
  return `${url.origin}${url.pathname}${url.search}${sep}text=${text}`;
}
