"use client";

import { heroZone } from "@/lib/hero";
import type { FaceAnnotation, SkinAnalysis } from "@/lib/types";

function dullSkinProfile(analysis: SkinAnalysis) {
  const annotations: FaceAnnotation[] = [...analysis.annotations];
  const qualityScores = analysis.categories
    .filter((category) => /(hydration|radiance)/i.test(category.label))
    .map((category) => category.score);
  const visibleQualityRoom = qualityScores.length > 0 && Math.min(...qualityScores) <= 75;

  if (visibleQualityRoom) {
    const existingIndex = annotations.findIndex((annotation) =>
      /(hydrat|radiance|dull|glow|luminos)/i.test(`${annotation.area} ${annotation.concern}`),
    );
    if (existingIndex >= 0) {
      const existing = annotations.splice(existingIndex, 1)[0];
      annotations.unshift({
        ...existing,
        severity: "notable",
        imagePrompt:
          "Show a strong but photographic improvement in surface hydration and light reflection across both cheeks: supple, smoother and naturally luminous, with real pores and skin grain still visible and no whitening.",
      });
    } else {
      annotations.unshift({
        x: 50,
        y: 56,
        area: "Cheek hydration & radiance",
        concern: "dull, dehydrated-looking mid-face with reduced surface luminosity",
        treatment:
          "A completed Veluria Silk Skin course can make the skin look visibly more supple, hydrated and luminous while keeping the same natural skin colour.",
        scope: "veluria",
        severity: "notable",
        imagePrompt:
          "Show a strong but photographic improvement in surface hydration and light reflection across both cheeks: supple, smoother and naturally luminous, with real pores and skin grain still visible and no whitening.",
      });
    }
  }

  const afterImagePrompt = visibleQualityRoom
    ? `${analysis.afterImagePrompt ?? ""}\n\nVISIBLE SKIN-QUALITY PRIORITY — HYDRATION & RADIANCE\nMake the completed-course skin-quality change immediately visible: the dull, flat-looking mid-face becomes noticeably more supple, smooth and naturally luminous. Keep real pores and skin grain; keep exactly the same skin colour and depth. This hydration-and-radiance improvement is the first difference a viewer notices.`
    : analysis.afterImagePrompt;
  return { annotations, afterImagePrompt };
}

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
  const profile = dullSkinProfile(analysis);
  const hero = heroZone(profile.annotations, analysis.categories);
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
  const timeout = window.setTimeout(() => controller.abort(), 125_000);

  try {
    const response = await fetch("/api/transform", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        image,
        responseMode: "json",
        afterImagePrompt: profile.afterImagePrompt,
        preserve,
        concerns: profile.annotations.map((annotation) => ({
          area: annotation.area,
          concern: annotation.concern,
          scope: annotation.scope,
          x: annotation.x,
          y: annotation.y,
          severity: annotation.severity,
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
