import type { ReactNode } from "react";
import type { VeluriaProduct } from "@/lib/veluria";

const FOCUS: Record<string, string> = {
  "silk-skin": "Visible texture, radiance, firmness and elasticity.",
  "ultra-lift": "The appearance of firmness, tone, elasticity and luminosity.",
  "pearl-tone": "Visible brightness, clarity and a more uniform-looking tone.",
};

export default function VeluriaEducation({
  clinicName,
  programme,
  report = false,
  cta,
}: {
  clinicName: string;
  programme?: VeluriaProduct[];
  report?: boolean;
  cta?: ReactNode;
}) {
  const products = programme?.length
    ? programme
    : [
        { id: "silk-skin", name: "Veluria Silk Skin" },
        { id: "ultra-lift", name: "Veluria Ultra Lift" },
        { id: "pearl-tone", name: "Veluria Pearl Tone" },
      ];

  return (
    <div className="overflow-hidden rounded-[1.8rem] border border-white/70 bg-white/55 p-6 text-left backdrop-blur-sm sm:p-8">
      <p className="eyebrow">{report ? "Understand your plan" : "The treatment · Veluria"}</p>
      <h2 className="display mt-2 text-2xl text-plum sm:text-3xl">
        {report ? "Why this Veluria plan matched your scan" : "What Veluria actually is"}
      </h2>
      <p className="mt-4 text-sm leading-relaxed text-plum-soft sm:text-base">
        Veluria is a professional cosmetic bioremodelling range focused on the
        <strong className="font-semibold text-plum"> visible quality of skin</strong> —
        texture, firmness, tone, luminosity and vitality — while preserving natural
        facial features rather than changing facial shape.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          ["01", "Assess", "A clinician reviews your skin, priorities, medical history and suitability."],
          ["02", "Select", "The formula is matched only to concerns that can realistically respond."],
          ["03", "Apply", `At ${clinicName}, it may be integrated into a microneedling-led protocol when clinically appropriate.`],
        ].map(([number, title, copy]) => (
          <div key={number} className="rounded-2xl border border-white/70 bg-pearl-deep/70 p-4">
            <p className="font-display text-xl text-plum-mute">{number}</p>
            <h3 className="mt-2 text-sm font-semibold text-plum">{title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-plum-soft">{copy}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 rounded-2xl border border-serum/15 bg-serum/[0.05] p-4 sm:grid-cols-3 sm:p-5">
        {products.map((product) => (
          <div key={product.id}>
            <p className="text-sm font-semibold text-plum">{product.name.replace("Veluria ", "")}</p>
            <p className="mt-1 text-xs leading-relaxed text-plum-soft">{FOCUS[product.id]}</p>
          </div>
        ))}
      </div>

      <details className="group mt-5 rounded-2xl border border-white/70 bg-white/45 px-4 py-3.5">
        <summary className="cursor-pointer list-none text-sm font-semibold text-plum marker:hidden">
          <span className="flex items-center justify-between gap-4">
            Different from filler or wrinkle-relaxing injections
            <span className="text-lg font-normal text-plum-mute transition group-open:rotate-45" aria-hidden="true">+</span>
          </span>
        </summary>
        <div className="mt-4 grid gap-3 border-t border-plum/10 pt-4 text-xs leading-relaxed text-plum-soft sm:grid-cols-3">
          <p><strong className="text-plum">Filler</strong><br />Primarily restores volume and contour.</p>
          <p><strong className="text-plum">Wrinkle-relaxing injections</strong><br />Reduce selected muscle movement.</p>
          <p><strong className="text-plum">Veluria</strong><br />Focuses on the appearance of the skin itself and may complement other treatments.</p>
        </div>
      </details>

      <p className="mt-4 text-xs leading-relaxed text-plum-mute">
        Results are progressive and individual. Protocol and session spacing follow clinical
        assessment. Veluria does not diagnose or treat lesions, active skin disease, visible
        vessels or structural volume loss.
      </p>
      {cta && <div className="mt-6 flex justify-center">{cta}</div>}
    </div>
  );
}
