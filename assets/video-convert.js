/* Video and audio format converter. Uses ffmpeg.wasm, loaded on demand from jsDelivr. The ESM core is required by its module worker.
   The file never leaves the device; only the converter program is downloaded (about 30 MB, once). */
(() => {
  const $ = (id) => document.getElementById(id);
  const V = "https://cdn.jsdelivr.net/npm/";
  const URLS = {
    lib: V + "@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js",
    worker: V + "@ffmpeg/ffmpeg@0.12.10/dist/umd/814.ffmpeg.js",
    util: V + "@ffmpeg/util@0.12.1/dist/umd/index.js",
    core: V + "@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js",
    wasm: V + "@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm",
  };
  const WARN_BYTES = 200 * 1024 * 1024;

  /* crf by quality choice */
  const Q = { small: { x264: 30, vp9: 40, mpeg4: 8 }, balanced: { x264: 25, vp9: 34, mpeg4: 5 }, best: { x264: 20, vp9: 28, mpeg4: 3 } };

  const FORMATS = {
    mp4:  { label: "MP4 (H.264 video, AAC sound)", ext: "mp4", mime: "video/mp4", video: true },
    webm: { label: "WebM (VP9 video, Opus sound)", ext: "webm", mime: "video/webm", video: true },
    mkv:  { label: "MKV (H.264 video, AAC sound)", ext: "mkv", mime: "video/x-matroska", video: true },
    mov:  { label: "MOV (H.264 video, AAC sound)", ext: "mov", mime: "video/quicktime", video: true },
    avi:  { label: "AVI (MPEG-4 video, MP3 sound)", ext: "avi", mime: "video/x-msvideo", video: true },
    gif:  { label: "GIF (silent animation)", ext: "gif", mime: "image/gif", video: false, image: true },
    mp3:  { label: "MP3 (sound only)", ext: "mp3", mime: "audio/mpeg", audio: true },
    m4a:  { label: "M4A / AAC (sound only)", ext: "m4a", mime: "audio/mp4", audio: true },
    wav:  { label: "WAV (sound only, large)", ext: "wav", mime: "audio/wav", audio: true },
    ogg:  { label: "OGG (sound only)", ext: "ogg", mime: "audio/ogg", audio: true },
    flac: { label: "FLAC (sound only, lossless)", ext: "flac", mime: "audio/flac", audio: true },
  };

  const FORMAT_HINTS = {
    mp4: "Recommended for most phones, computers, browsers and online forms.",
    webm: "Good for websites and smaller web videos; some apps may not accept WebM.",
    mkv: "A flexible video container; some devices and upload forms do not support it.",
    mov: "A common choice for Apple apps and video editing.",
    avi: "An older format that can create larger files.",
    gif: "Makes a silent animation from the full file. Long clips create large files and may take a while.",
    mp3: "A small audio file that plays on almost every device.",
    m4a: "Compact audio with good quality on most modern devices.",
    wav: "Uncompressed audio. Choose this when editing quality matters more than file size.",
    ogg: "An open audio format; support varies by app and device.",
    flac: "Lossless audio that preserves sound quality, usually at a larger size than MP3."
  };

  function buildArgs(fmt, quality, height, inName, outName, fast) {
    const q = Q[quality] || Q.balanced;
    const scale = height ? "scale=-2:" + height : "";
    const vf = (extra) => { const f = [scale, extra].filter(Boolean).join(","); return f ? ["-vf", f] : []; };
    const inArgs = ["-i", inName];
    if (fast && (fmt === "mp4" || fmt === "mov" || fmt === "mkv")) {
      return [...inArgs, "-map", "0:v:0", "-map", "0:a:0?", "-sn", "-c", "copy", ...(fmt === "mkv" ? [] : ["-movflags", "+faststart"]), outName];
    }
    switch (fmt) {
      case "mp4": case "mov": case "mkv":
        return [...inArgs, ...vf(), "-c:v", "libx264", "-preset", "veryfast", "-crf", String(q.x264), "-pix_fmt", "yuv420p",
          "-c:a", "aac", "-b:a", "128k", ...(fmt === "mkv" ? [] : ["-movflags", "+faststart"]), outName];
      case "webm":
        return [...inArgs, ...vf(), "-c:v", "libvpx-vp9", "-crf", String(q.vp9), "-b:v", "0", "-deadline", "realtime", "-cpu-used", "8",
          "-pix_fmt", "yuv420p", "-c:a", "libopus", "-b:a", "96k", outName];
      case "avi":
        return [...inArgs, ...vf(), "-c:v", "mpeg4", "-q:v", String(q.mpeg4), "-c:a", "libmp3lame", "-q:a", "4", outName];
      case "gif": {
        const w = height ? Math.round(height * 16 / 9) : 480;
        const widthScale = "scale='min(" + Math.min(w, 640) + ",iw)':-2:flags=lanczos";
        return [...inArgs, "-vf", "fps=12," + widthScale + ",split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse", "-loop", "0", outName];
      }
      case "mp3":  return [...inArgs, "-vn", "-c:a", "libmp3lame", "-q:a", quality === "best" ? "0" : quality === "small" ? "5" : "2", outName];
      case "m4a":  return [...inArgs, "-vn", "-c:a", "aac", "-b:a", quality === "best" ? "256k" : quality === "small" ? "96k" : "160k", outName];
      case "wav":  return [...inArgs, "-vn", "-c:a", "pcm_s16le", outName];
      case "ogg":  return [...inArgs, "-vn", "-c:a", "libvorbis", "-q:a", quality === "best" ? "7" : quality === "small" ? "3" : "5", outName];
      case "flac": return [...inArgs, "-vn", "-c:a", "flac", outName];
    }
    throw new Error("Unknown format.");
  }

  const size = (n) => (n < 1048576 ? (n / 1024).toFixed(1) + " KB" : (n / 1048576).toFixed(2) + " MB");
  const formatTime = seconds => { const n=Math.max(0,Math.round(seconds||0)),h=Math.floor(n/3600),m=Math.floor(n%3600/60),s=n%60;return h?`${h}h ${String(m).padStart(2,"0")}m`:m?`${m}m ${String(s).padStart(2,"0")}s`:`${s}s`; };
  const status = (t, k) => { const e = $("vcStatus"); e.textContent = t; e.className = "tool-msg" + (k ? " " + k : ""); };
  let conversionStartedAt = 0;
  const progress = (v) => {
    const p = $("vcProgress"), label = $("vcProgressText");
    if (v == null) { p.classList.add("hidden"); label.classList.add("hidden"); return; }
    p.classList.remove("hidden"); label.classList.remove("hidden");
    p.value = Math.max(0, Math.min(1, v));
    const elapsed=conversionStartedAt?(performance.now()-conversionStartedAt)/1000:0,remaining=v>0.03?elapsed*(1-p.value)/p.value:null;
    label.textContent = v < 0.02 ? "Starting the converter…" : "Converting · " + Math.round(p.value * 100) + "%" + (remaining==null?" · estimating time":" · about "+formatTime(remaining)+" left");
  };

  let file = null, ffmpeg = null, outUrl = null, running = false, cancelled = false, lastLog = [], formatPicked = false;

  function updateGoButton() {
    const format = FORMATS[$("vcFormat").value];
    $("vcGo").disabled = !file || running;
    $("vcGo").textContent = running ? "Converting…" : file ? "Convert to " + format.ext.toUpperCase() : "Choose a file to start";
  }

  function isAudioFile(f) {
    return (f.type || "").startsWith("audio/") || /\.(mp3|m4a|aac|wav|ogg|flac|opus)$/i.test(f.name);
  }

  function refreshFastHint() {
    const fast = $("vcFast").checked;
    $("vcFullSettings").classList.toggle("hidden", fast);
    $("vcFastHint").textContent = fast
      ? "Fast mode tries a quick copy first. If the selected format cannot use the original codecs, it automatically retries with Full conversion. Choose Full conversion to set quality or resolution yourself."
      : "Full conversion re-encodes the media and applies the quality and resolution choices below. It takes longer than Fast mode.";
  }
  function loadScript(src) {
    return new Promise((res, rej) => {
      if (document.querySelector('script[data-vc="' + src + '"]')) return res();
      const s = document.createElement("script");
      s.src = src; s.dataset.vc = src; s.onload = res;
      s.onerror = () => rej(new Error("Could not download the converter. Check your internet connection and try again."));
      document.head.appendChild(s);
    });
  }

  /* Try the matching ESM core first, then older ones, so one unavailable version cannot block the tool. */
  const CORES = [
    "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/",
    "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.9/dist/esm/",
    "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/",
    "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/",
  ];
  async function getFFmpeg() {
    if (ffmpeg) return ffmpeg;
    status("Loading converter. The first download is about 30 MB; keep this tab open.");
    await loadScript(URLS.lib);
    await loadScript(URLS.util);
    const { FFmpeg } = window.FFmpegWASM, { toBlobURL } = window.FFmpegUtil;
    const workerURL = await toBlobURL(URLS.worker, "text/javascript");
    let lastErr = null;
    for (const base of CORES) {
      const f = new FFmpeg();
      f.on("log", ({ message }) => { lastLog.push(message); if (lastLog.length > 40) lastLog.shift(); });
      f.on("progress", ({ progress: p }) => { if (running && Number.isFinite(p)) progress(p); });
      try {
        await f.load({
          classWorkerURL: workerURL,
          coreURL: await toBlobURL(base + "ffmpeg-core.js", "text/javascript"),
          wasmURL: await toBlobURL(base + "ffmpeg-core.wasm", "application/wasm"),
        });
        ffmpeg = f;
        return f;
      } catch (err) {
        lastErr = err;
        try { f.terminate(); } catch (_) {}
        if (cancelled) throw err;
      }
    }
    throw lastErr || new Error("failed to import ffmpeg-core.js");
  }

  function reset() {
    $("vcResult").classList.add("hidden");
    if (outUrl) { URL.revokeObjectURL(outUrl); outUrl = null; }
    for (const id of ["vcPreview", "vcAudioPreview", "vcImagePreview"]) {
      const el = $(id); el.removeAttribute("src"); el.classList.add("hidden");
      if (id !== "vcImagePreview" && typeof el.load === "function") el.load();
    }
  }

  $("vcFile").addEventListener("change", (e) => {
    reset(); file = e.target.files[0] || null;
    $("vcLargeHint").classList.add("hidden"); status("");
    if (!file) {
      $("vcInfo").textContent = "MP4, MOV, MKV, AVI, WebM, MP3, WAV and more · supported formats vary by browser";
      updateGoButton(); return;
    }

    if (!formatPicked) $("vcFormat").value = isAudioFile(file) ? "mp3" : "mp4";
    $("vcInfo").textContent = file.name + " · " + size(file.size);
    if (file.size > WARN_BYTES) {
      $("vcLargeHint").textContent = isAudioFile(file)
        ? "Large audio file selected. Conversion may take several minutes; progress and time estimates update while it runs."
        : "Large video selected. Full conversion may take a while. Progress and a time estimate will appear after conversion starts. Fast mode is quickest when the original codecs are already compatible.";
      $("vcLargeHint").classList.remove("hidden");
    }
    updateFormatUI(); updateGoButton();
  });

  function updateFormatUI() {
    const key = $("vcFormat").value, fmt = FORMATS[key];
    $("vcVideoOnly").classList.toggle("hidden", !fmt.video);
    const canRemux = ["mp4", "mov", "mkv"].includes(key);
    if (!canRemux && $("vcFast").checked) $("vcFull").checked = true;
    $("vcFastWrap").classList.toggle("hidden", !canRemux);
    $("vcModeAvailability").classList.toggle("hidden", canRemux);
    $("vcQualityWrap").classList.toggle("hidden", ["gif", "wav", "flac"].includes(key));
    $("vcFormatHint").textContent = FORMAT_HINTS[key];
    if (file && isAudioFile(file) && fmt.video) {
      $("vcFormatHint").textContent = "This is an audio-only file. Choose an audio format such as MP3, M4A, WAV, OGG or FLAC.";
    }
    refreshFastHint();
  }

  $("vcFormat").addEventListener("change", (e) => {
    if (e.isTrusted) formatPicked = true;
    updateFormatUI(); updateGoButton();
  });
  $("vcFast").addEventListener("change", refreshFastHint);
  $("vcFull").addEventListener("change", refreshFastHint);

  $("vcCancel").addEventListener("click", () => {
    if (!running || !ffmpeg) return;
    cancelled = true; ffmpeg.terminate(); ffmpeg = null;
  });

  $("vcGo").addEventListener("click", async () => {
    if (!file || running) return;
    const fmtKey = $("vcFormat").value, fmt = FORMATS[fmtKey];
    if (file && isAudioFile(file) && fmt.video) { status("Choose an audio-only output format for this file.", "error"); return; }
    reset(); running = true; cancelled = false; lastLog = []; conversionStartedAt = performance.now();
    updateGoButton(); $("vcGo").textContent = "Preparing…"; $("vcCancel").classList.remove("hidden"); status("Preparing your conversion..."); progress(0);
    const inExt = (file.name.match(/\.([A-Za-z0-9]{1,5})$/) || [, "bin"])[1].toLowerCase();
    const inName = "input." + inExt, outName = "output." + fmt.ext;
    try {
      const f = await getFFmpeg();
      if (cancelled) throw new Error("Stopped.");
      status("Opening your file...");
      let inPath = inName, mounted = false;
      try {
        try { await f.createDir("/vcin"); } catch (_) {}
        const renamed = new File([file], inName, { type: file.type });
        await f.mount("WORKERFS", { files: [renamed] }, "/vcin");
        inPath = "/vcin/" + inName; mounted = true;
      } catch (_) {
        await f.writeFile(inName, new Uint8Array(await file.arrayBuffer()));
      }
      $("vcGo").textContent = "Converting…"; status("Converting on this device. Progress and an estimated remaining time will update below; keep this tab open.");
      const fastSelected = $("vcFast").checked;
      let code = await f.exec(buildArgs(fmtKey, $("vcQuality").value, fmt.video ? Number($("vcHeight").value) || 0 : 0, inPath, outName, fastSelected));
      if (cancelled) throw new Error("Stopped.");
      let automaticFallback = false;
      if (code !== 0 && fastSelected) {
        try { await f.deleteFile(outName); } catch (_) {}
        $("vcFull").checked = true;
        refreshFastHint();
        status("Fast mode could not copy these codecs. Retrying with Full conversion; this will take longer.");
        $("vcGo").textContent = "Full conversion…";
        automaticFallback = true;
        progress(0);
        code = await f.exec(buildArgs(fmtKey, $("vcQuality").value, fmt.video ? Number($("vcHeight").value) || 0 : 0, inPath, outName, false));
      }
      if (cancelled) throw new Error("Stopped.");
      if (code !== 0) throw new Error("This file could not be converted. It may be damaged or use an unsupported codec.");
      const data = await f.readFile(outName);
      if (!data || !data.length) throw new Error("The converter produced an empty file. Try a different format.");
      const blob = new Blob([data.buffer], { type: fmt.mime });
      outUrl = URL.createObjectURL(blob);
      const base = file.name.replace(/\.[^.]+$/, "") || "converted";
      const dl = $("vcDownload"); dl.href = outUrl; dl.download = base + "." + fmt.ext;
      dl.textContent = "Download " + fmt.ext.toUpperCase();
      const difference = file.size ? Math.round(Math.abs(1 - blob.size / file.size) * 100) : 0;
      const sizeNote = blob.size < file.size ? " · " + difference + "% smaller" : blob.size > file.size ? " · " + difference + "% larger" : "";
      $("vcSummary").textContent = "Ready to download · " + size(blob.size) + " (original " + size(file.size) + sizeNote + ") · completed in " + formatTime((performance.now()-conversionStartedAt)/1000) + "." + (automaticFallback ? " Fast mode was incompatible, so Full conversion completed the file." : "");
      const videoPreview = $("vcPreview"), audioPreview = $("vcAudioPreview"), imagePreview = $("vcImagePreview");
      if (fmt.video && videoPreview.canPlayType(fmt.mime)) { videoPreview.src = outUrl; videoPreview.classList.remove("hidden"); }
      else if (fmt.audio && audioPreview.canPlayType(fmt.mime)) { audioPreview.src = outUrl; audioPreview.classList.remove("hidden"); }
      else if (fmt.image) { imagePreview.src = outUrl; imagePreview.classList.remove("hidden"); }
      $("vcResult").classList.remove("hidden"); status("");
      try { if (mounted) await f.unmount("/vcin"); else await f.deleteFile(inName); await f.deleteFile(outName); } catch (_) {}
    } catch (err) {
      const raw = typeof err === "string" ? err : (err && err.message) || "";
      const tail = lastLog.join(" ");
      let msg = cancelled ? "Conversion stopped." : raw || "Conversion failed.";
      if (!cancelled && /failed to import ffmpeg-core\.js/i.test(raw)) {
        msg = "The converter could not start. Refresh this page and try again. If it keeps failing, check your connection and try a recent version of Chrome or Edge.";
      } else if (!cancelled && (/memory|abort|OOM|RangeError|allocation|Array buffer/i.test(tail + " " + raw) || !raw)) {
        msg = "The browser ran short on working memory. Close other heavy tabs and retry. Fast mode uses less processing when the source codecs already match the output container; very high-resolution files need more device memory.";
      } else if (!cancelled && /Could not find codec|Unknown encoder|not supported/i.test(tail)) {
        msg = "This video uses a format the converter cannot handle. Try a different output format.";
      }
      status(msg, cancelled ? "" : "error");
      if (!cancelled) { ffmpeg = null; }
    } finally {
      running = false; progress(null); $("vcCancel").classList.add("hidden"); updateGoButton();
    }
  });
  refreshFastHint();
  $("vcFormat").dispatchEvent(new Event("change"));
  window.__vcReady = true;
})();
