/* Compress a PDF to a size window or render its pages at higher resolution.
   Each page is drawn to a picture (pdf.js), saved as JPEG at the best quality that fits,
   and put back into a new PDF (pdf-lib). Everything runs in the browser. */
import * as pdfjsLib from "../vendor/pdfjs/pdf.min.mjs";

const here = (p) => new URL(p, import.meta.url).href;
pdfjsLib.GlobalWorkerOptions.workerSrc = here("../vendor/pdfjs/pdf.worker.min.mjs");
const PDFJS_OPTS = {
  wasmUrl: here("../vendor/pdfjs/wasm/"),
  standardFontDataUrl: here("../vendor/pdfjs/standard_fonts/"),
  iccUrl: here("../vendor/pdfjs/iccs/"),
};

const SITE = document.documentElement.dataset.site || "Variuno Tools";
const $ = (id) => document.getElementById(id);
const LEVELS = [1, 0.85, 0.72, 0.6, 0.5, 0.42, 0.35, 0.3];

let srcSize = 0, srcDoc = null, srcName = "document";
let busy = false, outURL = null, prevURL = null, steps = 0, jobStartedAt = 0;

const kb = (n) => (n / 1024).toFixed(1) + " KB";
const tick = () => new Promise((r) => setTimeout(r, 0));
const formatElapsed = () => { const seconds=Math.max(0,Math.floor((performance.now()-(jobStartedAt||performance.now()))/1000)); return seconds<60?seconds+' sec':Math.floor(seconds/60)+' min '+String(seconds%60).padStart(2,'0')+' sec'; };

function setStatus(text, cls) {
  const s = $("status");
  s.className = "msg" + (cls ? " " + cls : "");
  s.textContent = text;
}
function setProgress(v) {
  const p = $("prog");
  if (v == null) { p.classList.add("hidden"); return; }
  p.classList.remove("hidden");
  p.value = Math.max(0, Math.min(1, v));
}
function resetOutput() {
  $("out").classList.add("hidden");
  if (outURL) { URL.revokeObjectURL(outURL); outURL = null; }
  if (prevURL) { URL.revokeObjectURL(prevURL); prevURL = null; }
}

function updateResolutionHint() {
  const upscale = $("resolution").value === "upscale";
  const targetDpi = upscale ? Number($("targetDpi").value) : 200;
  if (!Number.isFinite(targetDpi) || targetDpi < 36) { setStatus("Enter a target DPI of 36 or higher.", "err"); return; }
  const count = srcDoc ? srcDoc.numPages : 0;
  const mode = upscale ? "High-resolution mode renders at your chosen " + $("targetDpi").value + " DPI" : "Standard mode renders pages at about 200 DPI";
  $("dpiControl").classList.toggle("hidden", !upscale);
  $("resolutionHint").textContent = mode + ". All pages are processed in order. High resolution and large documents may take several minutes and use more browser memory; progress and elapsed time update as each page is processed.";
}
/* ---------- choosing a file ---------- */
async function openFile(f) {
  resetOutput();
  $("go").disabled = true;
  $("fileinfo").textContent = "";
  setStatus("Reading your PDF...");
  try {
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(await f.arrayBuffer()), ...PDFJS_OPTS }).promise;
    if (srcDoc) (srcDoc.loadingTask||srcDoc).destroy();
    srcSize = f.size; srcDoc = doc;
    srcName = f.name.replace(/\.pdf$/i, "") || "document";
    $("fileinfo").textContent = f.name + ": " + doc.numPages + " page" + (doc.numPages === 1 ? "" : "s") + ", " + kb(f.size) + (doc.numPages > 60 || f.size > 100 * 1024 * 1024 ? ". Large files are processed a page at a time and may take several minutes." : "");
    $("go").disabled = false;
    updateResolutionHint();
    setStatus("");
  } catch (err) {
    srcSize = 0; srcDoc = null;
    updateResolutionHint();
    if (err && err.name === "PasswordException") setStatus("This PDF is password protected. Remove the password first, then try again.", "err");
    else if (err && err.name === "InvalidPDFException") setStatus("This file could not be read as a PDF.", "err");
    else setStatus((err && err.message) || "This file could not be read as a PDF.", "err");
  }
}

/* ---------- rendering and encoding ---------- */
async function renderPages(targetDpi) {
  const n = srcDoc.numPages, out = [];
  for (let i = 1; i <= n; i++) {
    setStatus("Rendering page " + i + " of " + n + " · elapsed " + formatElapsed() + "...");
    setProgress((i - 1) / n * 0.4);
    const page = await srcDoc.getPage(i);
    const v1 = page.getViewport({ scale: 1 });
    const k = targetDpi / 72;
    const vp = page.getViewport({ scale: k });
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.ceil(vp.width));
    c.height = Math.max(1, Math.ceil(vp.height));
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, canvas: c, viewport: vp }).promise;
    const blob = await toJpeg(c, 0.96);
    page.cleanup();
    if (!blob) throw new Error("The browser could not render page " + i + ".");
    out.push({ blob, pixelWidth: c.width, pixelHeight: c.height, wPt: v1.width, hPt: v1.height, dpi: k * 72 });
    c.width = 0; c.height = 0;
    await tick();
  }
  return out;
}

const toJpeg = (c, q) => new Promise((res) => c.toBlob(res, "image/jpeg", q));

async function encodeAll(pages, f, q) {
  const blobs = []; let total = 0;
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    setStatus("Optimizing page " + (i + 1) + " of " + pages.length + " · elapsed " + formatElapsed() + "...");
    const bitmap = await createImageBitmap(p.blob);
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(p.pixelWidth * f));
    c.height = Math.max(1, Math.round(p.pixelHeight * f));
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, c.width, c.height);
    bitmap.close();
    const blob = await toJpeg(c, q);
    c.width = 0; c.height = 0;
    if (!blob) throw new Error("The browser could not optimize page " + (i + 1) + ".");
    blobs.push(blob); total += blob.size;
    setProgress(0.4 + Math.min(0.5, (steps + (i + 1) / pages.length) * 0.07));
    await tick();
  }
  steps++;
  return { blobs, total };
}

/* Highest resolution that still allows decent quality, then the best quality that fits. */
async function search(pages, hi) {
  const n = pages.length, over = 700 * n + 2500;
  const fits = (r) => r.total + over <= hi;
  async function tuneQuality(f, qLo, qHi, first) {
    let best = { f, q: qLo, r: first };
    const top = await encodeAll(pages, f, qHi);
    if (fits(top)) return { f, q: qHi, r: top };
    let a = qLo, b = qHi;
    for (let k = 0; k < 5; k++) {
      const m = (a + b) / 2;
      const t = await encodeAll(pages, f, m);
      if (fits(t)) { best = { f, q: m, r: t }; a = m; } else { b = m; }
    }
    return best;
  }

  setStatus("Finding the best quality for your size limit...");
  let r = await encodeAll(pages, 1, 0.5);
  if (fits(r)) return tuneQuality(1, 0.5, 0.92, r);

  const need = Math.sqrt(Math.max(1, hi - over) / r.total);
  let li = LEVELS.findIndex((f) => f <= need * 1.1);
  if (li < 1) li = 1;
  for (; li < LEVELS.length; li++) {
    r = await encodeAll(pages, LEVELS[li], 0.5);
    if (fits(r)) return tuneQuality(LEVELS[li], 0.5, 0.92, r);
  }
  /* Last resort: smallest size, lower quality. */
  const f = LEVELS[LEVELS.length - 1];
  const low = await encodeAll(pages, f, 0.15);
  if (!fits(low)) return null;
  return tuneQuality(f, 0.15, 0.5, low);
}

async function buildPdf(pages, blobs, padChars) {
  const pdf = await PDFLib.PDFDocument.create();
  pdf.setProducer(SITE);
  pdf.setCreator(SITE);
  pdf.setTitle(srcName);
  for (let i = 0; i < pages.length; i++) {
    const img = await pdf.embedJpg(new Uint8Array(await blobs[i].arrayBuffer()));
    const pg = pdf.addPage([pages[i].wPt, pages[i].hPt]);
    pg.drawImage(img, { x: 0, y: 0, width: pages[i].wPt, height: pages[i].hPt });
  }
  if (padChars > 0) pdf.setKeywords(["x".repeat(padChars)]);
  return pdf.save({ useObjectStreams: false });
}

/* ---------- the whole job ---------- */
async function run() {
  if (busy || !srcDoc) return;
  const minKB = Math.max(0, +$("minKB").value || 0);
  const maxKB = +$("maxKB").value || 0;
  const upscale = $("resolution").value === "upscale";
  const targetDpi = upscale ? Number($("targetDpi").value) : 200;
  if (!Number.isFinite(targetDpi) || targetDpi < 36) { setStatus("Enter a target DPI of 36 or higher.", "err"); return; }
  if (maxKB <= 0) { setStatus("Enter the maximum size in KB.", "err"); return; }
  if (maxKB <= minKB) { setStatus("The maximum size must be larger than the minimum.", "err"); return; }
  /* A safe window: right whether the portal counts 1 KB as 1000 or 1024 bytes. */
  const lo = minKB * 1024, hi = maxKB * 1000;

  if (!upscale && srcSize >= lo && srcSize <= hi) {
    setStatus("Your PDF is already " + kb(srcSize) + ", which is inside the limit. You can upload your original file as it is.", "ok");
    return;
  }

  busy = true; steps = 0;
  const startedAt = performance.now();
  jobStartedAt = startedAt;
  $("go").disabled = true;
  resetOutput();
  try {
    const n = srcDoc.numPages;
    const pages = await renderPages(targetDpi);

    let plan = await search(pages, hi);
    if (!plan) throw new Error("Could not get this PDF under " + maxKB + " KB without making it unreadable. Try removing some pages or raising the limit.");

    setStatus("Building your PDF...");
    setProgress(0.92);
    let bytes = null, tries = 0;
    for (;;) {
      bytes = await buildPdf(pages, plan.r.blobs, 0);
      if (bytes.length <= hi || tries >= 6) break;
      tries++;
      plan.q = Math.max(0.1, plan.q - 0.04);
      plan.r = await encodeAll(pages, plan.f, plan.q);
    }
    if (bytes.length > hi) throw new Error("Could not get this PDF under " + maxKB + " KB. Try a higher limit.");

    if (bytes.length < lo) {
      const base = bytes.length;
      const target = (hi - lo) > 4096 ? lo + (hi - lo) * 0.2 : (lo + hi) / 2;
      let chars = Math.max(1, Math.ceil((target - base) / 4));
      bytes = await buildPdf(pages, plan.r.blobs, chars);
      if (bytes.length < lo || bytes.length > hi) {
        const per = Math.max(0.5, (bytes.length - base) / chars);
        chars = Math.max(1, Math.ceil((target - base) / per));
        bytes = await buildPdf(pages, plan.r.blobs, chars);
      }
    }

    const blob = new Blob([bytes], { type: "application/pdf" });
    outURL = URL.createObjectURL(blob);
    prevURL = URL.createObjectURL(plan.r.blobs[0]);
    $("prev").src = prevURL;
    $("dl").href = outURL;
    $("dl").setAttribute("download", srcName + "-optimized.pdf");
    const outputDpi = Math.round(pages[0].dpi * plan.f);
    $("result").textContent = "Done: " + kb(bytes.length) + " (allowed " + minKB + "-" + maxKB + " KB), " + n + " page" + (n === 1 ? "" : "s") + ". Your original was " + kb(srcSize) + " · completed in " + Math.round((performance.now() - startedAt) / 1000) + " seconds.";
    const qualityHint = (plan.f < 0.5 || plan.q < 0.4)
      ? "Pages were made smaller to fit the limit. Check the preview: the text should still be readable."
      : "Check the preview of page 1 below.";
    $("hint").textContent = qualityHint + (upscale
      ? " High-resolution render: about " + outputDpi + " DPI" + (plan.f < 0.95 ? " after fitting the file-size limit." : ".") + " Upscaling cannot restore detail missing from a low-resolution scan."
      : " Approximate page resolution: " + outputDpi + " DPI.");
    $("out").classList.remove("hidden");
    setStatus("");
    pages.length = 0;
  } catch (err) {
    setStatus((err && err.message) || "Something went wrong.", "err");
  } finally {
    busy = false;
    $("go").disabled = false;
    setProgress(null);
  }
}

$("resolution").addEventListener("change", updateResolutionHint);
$("targetDpi").addEventListener("input", updateResolutionHint);
updateResolutionHint();
$("file").addEventListener("change", (e) => { const f = e.target.files[0]; if (f) openFile(f); });
$("go").addEventListener("click", run);
document.querySelectorAll("[data-kb]").forEach((b) =>
  b.addEventListener("click", () => { $("maxKB").value = b.dataset.kb; $("minKB").value = 0; })
);
window.__pdfCompressReady = true;
