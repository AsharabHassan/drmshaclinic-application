"use client";

import { useRef, useState } from "react";
import SelfieCapture from "@/components/SelfieCapture";
import LeadForm from "@/components/LeadForm";
import Processing from "@/components/Processing";
import AnalysisReport from "@/components/AnalysisReport";
import VeluriaEducation from "@/components/VeluriaEducation";
import type { SkinAnalysis, LeadPayload } from "@/lib/types";
import { analyseSkinPhoto, createAfterPreview } from "@/lib/afterPreview";
import type { GhlMeta } from "@/lib/ghl";
import { heroFirst, heroZone, type HeroZone } from "@/lib/hero";
import { DISCLAIMER_SHORT, DISCLAIMER_FULL } from "@/lib/legal";

type Step = "welcome" | "capture" | "form" | "processing" | "result" | "error";

export default function Home() {
  const [step, setStep] = useState<Step>("welcome");
  const [selfie, setSelfie] = useState<string | null>(null);
  const [lead, setLead] = useState<LeadPayload | null>(null);
  const [leadMeta, setLeadMeta] = useState<GhlMeta | null>(null);
  const [analysis, setAnalysis] = useState<SkinAnalysis | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [afterPending, setAfterPending] = useState(false);
  const [mapImage, setMapImage] = useState<string | null>(null);
  const [mapPending, setMapPending] = useState(false);
  // The single area the preview leads on — see lib/hero.ts. Held here rather
  // than recomputed in the report so the image and the on-page zoom are
  // guaranteed to be talking about the same part of the face.
  const [hero, setHero] = useState<HeroZone | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const analysisPromise = useRef<Promise<SkinAnalysis> | null>(null);
  const previewPromise = useRef<Promise<string | null> | null>(null);

  const startPipeline = (image: string): Promise<SkinAnalysis> => {
    const analysisRequest = analyseSkinPhoto(image);
    analysisRequest.catch(() => {});
    analysisPromise.current = analysisRequest;
    previewPromise.current = analysisRequest
      .then((result) => createAfterPreview(image, result))
      .catch(() => null);
    return analysisRequest;
  };

  const reset = () => {
    analysisPromise.current = null;
    previewPromise.current = null;
    setSelfie(null);
    setLead(null);
    setLeadMeta(null);
    setAnalysis(null);
    setAfterImage(null);
    setAfterPending(false);
    setMapImage(null);
    setMapPending(false);
    setHero(null);
    setErrorMsg("");
    setStep("welcome");
  };

  const fetchAfter = (
    image: string,
    quality: "low" | "medium",
    areas: { area: string; concern: string }[] = [],
    annotate = false,
    hero: HeroZone | null = null,
  ) =>
    fetch("/api/transform", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image,
        quality,
        areas,
        annotate,
        hero: hero ? { area: hero.area, concern: hero.concern } : null,
      }),
    })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        return r.ok ? (d.image as string) : null;
      })
      .catch(() => null);

  const runAnalysis = async (
    image: string,
    leadData?: LeadPayload | null,
    metaData?: GhlMeta | null,
  ) => {
    const activeLead = leadData ?? lead;
    const activeMeta = metaData ?? leadMeta;
    setStep("processing");
    setAfterImage(null);
    setMapImage(null);
    setHero(null);
    setAfterPending(true);
    setMapPending(true);

    let analysisResult: SkinAnalysis;
    try {
      analysisResult = await (analysisPromise.current ?? startPipeline(image));
      setAnalysis(analysisResult);
      setStep("result");
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "We couldn't complete your analysis.",
      );
      setStep("error");
      return;
    }

    if (activeLead) {
      fetch("/api/lead/concerns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...activeLead,
          analysis: analysisResult,
          meta: activeMeta ?? undefined,
        }),
      }).catch(() => {});
    }

    // The headline area, and it must lead the concern list: the prompt weights
    // its first bullet most heavily and the route caps the list at six.
    const heroArea = heroZone(
      analysisResult.annotations,
      analysisResult.categories,
    );
    setHero(heroArea);

    const concerns = heroFirst(
      analysisResult.annotations?.map((a) => ({
        area: a.area,
        concern: a.concern,
      })) ?? [],
      heroArea,
    );

    const mapZones =
      analysisResult.annotations?.map((a) => ({
        area: a.area,
        severity: a.severity,
      })) ?? [];

    // Reuse the production-quality render that began as soon as analysis
    // finished. This removes the redundant low-quality generation and overlaps
    // the expensive work with form completion without lowering image quality.
    const afterPromise = (
      previewPromise.current ?? createAfterPreview(image, analysisResult)
    ).then((afterImg) => {
      if (afterImg) setAfterImage(afterImg);
      setAfterPending(false);
      return afterImg;
    });
    fetch("/api/map", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image, areas: mapZones }),
    })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        return r.ok ? (d.image as string) : null;
      })
      .catch(() => null)
      .then((mapImg) => {
        if (mapImg) setMapImage(mapImg);
        setMapPending(false);
      });
  };

  const retryPreview = () => {
    if (!selfie || !analysis || afterPending) return;
    setAfterImage(null);
    setAfterPending(true);
    const request = createAfterPreview(selfie, analysis);
    previewPromise.current = request;
    request
      .then((generated) => {
        if (generated) setAfterImage(generated);
      })
      .finally(() => setAfterPending(false));
  };

  return (
    <main className="relative min-h-dvh">
      <header className="relative z-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-1 px-6 pt-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/drsha-logo.jpg"
            alt="Dr.M.Sha Wellness and Aesthetics Clinic"
            className="h-14 w-auto"
            draggable={false}
          />
          <p className="text-[0.6rem] uppercase tracking-couture text-plum-mute">
            AI Skin Consultation
          </p>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 py-12 sm:py-16">
        {step === "welcome" && (
          <section key="welcome" className="relative mx-auto max-w-2xl text-center">
            <p className="eyebrow animate-fade-scale" style={{ animationDelay: "60ms" }}>
              Complimentary AI Skin Consultation
            </p>
            <h1
              className="display mt-6 animate-fade-scale text-5xl text-plum sm:text-7xl"
              style={{ animationDelay: "140ms" }}
            >
              Reveal the skin
              <br />
              <span className="serum-text italic">you deserve.</span>
            </h1>
            <p
              className="mx-auto mt-7 max-w-md animate-fade-scale text-balance text-plum-soft"
              style={{ animationDelay: "240ms" }}
            >
              One photograph. A doctor-grade skin analysis, a professional
              treatment map, and a personalised preview of your results — from{" "}
              <span className="font-medium text-plum">Dr.M.Sha Wellness &amp; Aesthetics Clinic</span>.
            </p>
            <div
              className="mt-10 flex animate-fade-scale flex-col items-center gap-4"
              style={{ animationDelay: "340ms" }}
            >
              <button onClick={() => setStep("capture")} className="btn-serum">
                Begin my analysis
              </button>
              <p className="text-[0.7rem] uppercase tracking-[0.16em] text-plum-mute">
                Under a minute · Processed privately · Never stored
              </p>
              {/* Prominent disclaimer so expectations are set before starting. */}
              <div className="mx-auto mt-2 max-w-md rounded-2xl border border-plum/20 bg-white/60 px-4 py-3">
                <p className="text-xs font-medium leading-relaxed text-plum-soft">
                  <span className="font-semibold text-plum">Please note: </span>
                  {DISCLAIMER_SHORT} Always consult a clinician before any
                  treatment.
                </p>
              </div>
            </div>

            <div
              className="mx-auto mt-14 grid max-w-lg animate-fade-scale grid-cols-3 gap-3"
              style={{ animationDelay: "440ms" }}
            >
              {[
                ["01", "Deep analysis"],
                ["02", "Treatment map"],
                ["03", "Before / after"],
              ].map(([n, label]) => (
                <div key={n} className="glass-soft px-4 py-5 text-center">
                  <p className="font-display text-2xl text-plum-mute">{n}</p>
                  <p className="mt-1 text-[0.65rem] uppercase tracking-[0.14em] text-plum-soft">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            <div className="mx-auto mt-14 max-w-2xl animate-fade-scale" style={{ animationDelay: "540ms" }}>
              <VeluriaEducation
                clinicName="Dr. M. Sha Wellness & Aesthetics Clinic"
                cta={<button onClick={() => setStep("capture")} className="btn-ghost">See what may suit my skin</button>}
              />
            </div>
          </section>
        )}

        {step === "capture" && (
          <section key="capture" className="w-full animate-fade-scale">
            <div className="mb-8 text-center">
              <p className="eyebrow">Step 01 — Your Photograph</p>
              <h2 className="display mt-3 text-4xl text-plum sm:text-5xl">
                Let&rsquo;s see your skin
              </h2>
            </div>
            <SelfieCapture
              onCaptured={(url) => {
                setSelfie(url);
                startPipeline(url);
                setStep("form");
              }}
            />
          </section>
        )}

        {step === "form" && selfie && (
          <section key="form" className="w-full animate-fade-scale">
            <LeadForm
              selfie={selfie}
              onSubmitted={(submittedLead, submittedMeta) => {
                setLead(submittedLead);
                setLeadMeta(submittedMeta);
                runAnalysis(selfie, submittedLead, submittedMeta);
              }}
            />
          </section>
        )}

        {step === "processing" && <Processing key="processing" />}

        {step === "result" && analysis && selfie && (
          <AnalysisReport
            key="result"
            before={selfie}
            after={afterImage}
            afterPending={afterPending}
            mapImage={mapImage}
            mapPending={mapPending}
            hero={hero}
            analysis={analysis}
            email={lead?.email ?? null}
            name={lead?.name ?? null}
            phone={lead?.phone ?? null}
            onRetryPreview={retryPreview}
            onRestart={reset}
          />
        )}

        {step === "error" && (
          <section key="error" className="mx-auto max-w-md animate-fade-scale text-center">
            <p className="eyebrow">Something interrupted us</p>
            <h2 className="display mt-3 text-4xl text-plum">Let&rsquo;s try that again</h2>
            <p className="mt-3 text-plum-soft">{errorMsg}</p>
            <div className="mt-8 flex flex-col items-center gap-4">
              <button onClick={() => selfie && runAnalysis(selfie)} className="btn-serum">
                Retry
              </button>
              <button
                onClick={reset}
                className="text-sm text-plum-mute underline-offset-4 hover:text-plum hover:underline"
              >
                Start over
              </button>
            </div>
          </section>
        )}
      </div>

      <footer className={`relative z-10 mx-auto max-w-5xl px-6 text-center text-[0.65rem] uppercase tracking-[0.14em] text-plum-mute/70 ${step === "result" ? "pb-24" : "pb-10"}`}>
        © {new Date().getFullYear()} Dr.M.Sha Wellness &amp; Aesthetics Clinic · A
        cosmetic, non-diagnostic AI simulation · Not medical advice
      </footer>
    </main>
  );
}
