"use client";

import { heroZone } from "@/lib/hero";
import type { SkinAnalysis } from "@/lib/types";

export async function analyseSkinPhoto(image: string): Promise<SkinAnalysis> {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Analysis failed.");
  return data.analysis as SkinAnalysis;
}

/**
 * Run the production-quality After pipeline in the background while the lead
 * form is still being completed. The branded apps use a JSON response, but the
 * server still runs the same parallel candidates, grading, clinical
 * preservation checks and rescue pass as the streamed Veluria implementation.
 */
export async function createAfterPreview(
  image: string,
  analysis: SkinAnalysis,
): Promise<string | null> {
  const hero = heroZone(analysis.annotations, analysis.categories);
  const preserve = [
    ...new Set([
      ...(analysis.preserve ?? []),
      ...analysis.annotations
        .filter((annotation) => annotation.scope === "preserve")
        .map(
          (annotation) =>
            `${annotation.area}: ${annotation.concern} — leave unchanged`,
        ),
    ]),
  ];
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 255_000);

  try {
    const response = await fetch("/api/transform", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        image,
        responseMode: "json",
        afterImagePrompt: analysis.afterImagePrompt,
        preserve,
        concerns: analysis.annotations.map((annotation) => ({
          area: annotation.area,
          concern: annotation.concern,
          scope: annotation.scope,
        })),
        hero: hero ? { area: hero.area, concern: hero.concern } : null,
      }),
    });
    const data = await response.json().catch(() => ({}));
    return response.ok && typeof data.image === "string" ? data.image : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}
