import type { SkinAnalysis } from "./types";
import { expectedImprovement } from "./expectations";

/**
 * Trigger a browser download of a data URL (e.g. a generated PNG). Large
 * data: URLs on an <a download> are unreliable (Safari caps them), so the
 * payload is converted to a Blob and downloaded via a short object URL.
 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  let href = dataUrl;
  let objectUrl: string | null = null;
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (match) {
    const bin = atob(match[2]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    objectUrl = URL.createObjectURL(new Blob([bytes], { type: match[1] }));
    href = objectUrl;
  }
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
}

/**
 * Re-encode any image data URL to JPEG via canvas. jsPDF's built-in PNG
 * decoder rejects some perfectly valid PNGs (including gpt-image-2 output),
 * so every image is normalised to JPEG before being embedded — this also
 * keeps the PDF a fraction of the size of embedding raw PNG.
 */
async function toJpegDataUrl(src: string, quality = 0.85): Promise<string> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;
  // White backdrop in case the source has transparency (JPEG has none).
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL("image/jpeg", quality);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

/** Draw an image cover-cropped (centered) into a destination rectangle. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  const scale = Math.max(dw / img.width, dh / img.height);
  const sw = dw / scale;
  const sh = dh / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  bg: string,
  fg: string,
): void {
  ctx.font = "600 34px Helvetica, Arial, sans-serif";
  const padX = 26;
  const h = 64;
  const w = ctx.measureText(text).width + padX * 2;
  const r = h / 2;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + padX, y + h / 2 + 2);
}

/**
 * Stitch the REAL (untouched) before selfie and the generated after into one
 * labelled side-by-side PNG, so the downloadable / PDF artifact is a genuine
 * before/after rather than a re-rendered collage. Returns a PNG data URL.
 */
export async function composeBeforeAfter(
  before: string,
  after: string,
): Promise<string> {
  const PANEL = 1024;
  const W = PANEL * 2;
  const H = PANEL;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return after;

  const [b, a] = await Promise.all([loadImage(before), loadImage(after)]);
  drawCover(ctx, b, 0, 0, PANEL, H);
  drawCover(ctx, a, PANEL, 0, PANEL, H);

  // Divider between the two panels.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(PANEL - 3, 0, 6, H);

  drawPill(ctx, "BEFORE", 32, 32, "rgba(255,255,255,0.9)", "#212121");
  drawPill(ctx, "AFTER", PANEL + 32, 32, "#212121", "#ffffff");

  // JPEG: photographic content, a fraction of the PNG size, and safe for
  // jsPDF (its PNG decoder chokes on some encoder output).
  return canvas.toDataURL("image/jpeg", 0.85);
}

/**
 * Build and download a branded PDF of the full analysis. jsPDF is imported
 * dynamically so it stays out of the initial bundle.
 */
export async function downloadAnalysisPdf(opts: {
  analysis: SkinAnalysis;
  before: string;
  after: string | null;
  map: string | null;
}): Promise<void> {
  const { analysis, before, after, map } = opts;
  // Build the labelled side-by-side before/after (real selfie + generated after).
  const beforeAfter = after ? await composeBeforeAfter(before, after) : null;
  // Normalise the map to JPEG — jsPDF's PNG decoder rejects some valid PNGs
  // (gpt-image-2 output among them), which used to fail the whole download.
  const mapJpeg = map ? await toJpegDataUrl(map) : null;
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const cw = pageW - margin * 2;
  let y = margin;

  const ensure = (h: number) => {
    if (y + h > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };
  const heading = (text: string, size = 13) => {
    ensure(size + 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    doc.setTextColor(33, 29, 22);
    doc.text(text, margin, y);
    y += size + 4;
  };
  const body = (text: string, size = 11, color: [number, number, number] = [60, 55, 45]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, cw) as string[];
    ensure(lines.length * (size + 3));
    doc.text(lines, margin, y);
    y += lines.length * (size + 3) + 8;
  };

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(33, 33, 33);
  doc.text("DR.M.SHA WELLNESS & AESTHETICS CLINIC", margin, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(107, 159, 164);
  doc.text("AI Skin Consultation · drmshaclinic.com", margin, y);
  y += 16;
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, pageW - margin, y);
  y += 22;

  heading("Your Skin Consultation", 18);
  body(analysis.summary);

  // Draws a small rounded "pill" badge and returns its width, so the PDF
  // report carries the same Expected / consult flags the web report shows.
  const pill = (
    text: string,
    px: number,
    py: number,
    bg: [number, number, number],
    fg: [number, number, number],
  ): number => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const padX = 6;
    const h = 13;
    const w = doc.getTextWidth(text) + padX * 2;
    doc.setFillColor(...bg);
    doc.roundedRect(px, py, w, h, h / 2, h / 2, "F");
    doc.setTextColor(...fg);
    doc.text(text, px + padX, py + h / 2 + 2.6);
    return w;
  };

  // Scores
  heading("Skin scores");
  analysis.categories.forEach((c) => {
    ensure(34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(33, 33, 33);
    doc.text(c.label, margin, y);
    doc.text(`${c.score}/100`, pageW - margin - 44, y);
    const barY = y + 4;
    doc.setFillColor(232, 232, 232);
    doc.rect(margin, barY, cw, 5, "F");
    doc.setFillColor(33, 33, 33);
    doc.rect(margin, barY, (cw * Math.max(0, Math.min(100, c.score))) / 100, 5, "F");
    y += 18;
    doc.setFontSize(9);
    doc.setTextColor(120, 110, 90);
    // Expectation / out-of-scope flag — mirrors the web report exactly.
    const expected = expectedImprovement(c);
    // Reserve room on the note's first line for a right-aligned pill so the
    // badge sits beside its own note (same layout as the web report) rather
    // than floating between two categories.
    const noteWidth = expected ? cw - 150 : cw;
    const note = doc.splitTextToSize(c.note, noteWidth) as string[];
    ensure(note.length * 11 + 6);
    const noteY = y;
    doc.text(note, margin, noteY);
    if (expected) {
      const label =
        expected.kind === "consult"
          ? expected.label
          : expected.kind === "softened"
            ? `Lines ${expected.label}`
            : `Expected ${expected.label}`;
      const [bg, fg]: [[number, number, number], [number, number, number]] =
        expected.kind === "consult"
          ? [[247, 236, 219], [150, 101, 42]]
          : [[225, 239, 240], [58, 122, 128]];
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      const w = doc.getTextWidth(label) + 12;
      pill(label, pageW - margin - w, noteY - 9.5, bg, fg);
    }
    y += note.length * 11 + 12;
  });
  y += 4;

  // Before/after — labelled side-by-side composite (2:1).
  if (beforeAfter) {
    heading("Before & After — your treatment preview");
    const h = cw * 0.5;
    ensure(h + 4);
    doc.addImage(beforeAfter, "JPEG", margin, y, cw, h);
    y += h + 16;
  }

  // Assessment map (square)
  if (mapJpeg) {
    heading("Your assessment map");
    const size = Math.min(cw, 340);
    ensure(size + 4);
    doc.addImage(mapJpeg, "JPEG", margin, y, size, size);
    y += size + 16;
  }

  heading("How Dr Sha can help");
  body(analysis.veluriaRecommendation);

  ensure(30);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(140, 130, 110);
  const dis = doc.splitTextToSize(analysis.disclaimer, cw) as string[];
  ensure(dis.length * 10);
  doc.text(dis, margin, y);

  try {
    doc.save("DrMSha-Skin-Consultation.pdf");
  } catch {
    // Some mobile/in-app browsers block programmatic downloads — opening the
    // PDF in a new tab lets the user view and share it instead.
    window.open(doc.output("bloburl"), "_blank");
  }
}
