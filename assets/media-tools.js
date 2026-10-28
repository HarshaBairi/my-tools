(() => {
  const $ = id => document.getElementById(id);
  const urls = new Set();
  const status = (id, text, kind) => {
    const element = $(id);
    element.textContent = text;
    element.className = "tool-msg" + (kind ? " " + kind : "");
  };
  const size = bytes => bytes < 1048576 ? (bytes / 1024).toFixed(1) + " KB" : (bytes / 1048576).toFixed(2) + " MB";
  const formatTime = value => {
    const time = Math.max(0, Number(value) || 0);
    const centiseconds = Math.round(time * 100);
    const whole = Math.floor(centiseconds / 100);
    
    const seconds = String(whole % 60).padStart(2, "0") + "." + String(centiseconds % 100).padStart(2, "0");
    const minutes = Math.floor(whole / 60) % 60;
    const hours = Math.floor(whole / 3600);
    return hours ? hours + ":" + String(minutes).padStart(2, "0") + ":" + seconds : String(Math.floor(whole / 60)).padStart(2, "0") + ":" + seconds;
  };

  function makeClipQueue(key, startId, endId) {
    const clips = [];
    const addButton = $(key + "AddClip");
    const list = $(key + "ClipList");
    const panel = $(key + "ClipQueue");
    const countLabel = $(key + "ClipCount");
    const hint = $(key + "QueueHint");
    const exportButton = $(key === "audio" ? "trimAudio" : key === "video" ? "trimVideo" : "extractAudio");
    const defaultLabel = exportButton.textContent;
    let ready = false, mediaDuration = 0;

    function render() {
      list.replaceChildren();
      if (!clips.length) {
        const empty = document.createElement("li");
        empty.className = "clip-empty";
        empty.textContent = "No parts added. Export uses your current selection.";
        list.append(empty);
      } else {
        clips.forEach((clip, index) => {
          const row = document.createElement("li");
          row.className = "clip-row";
          const label = document.createElement("span");
          label.className = "clip-row-label";
          label.textContent = "Part " + (index + 1) + " · " + formatTime(clip.start) + " – " + formatTime(clip.end) + " · " + (clip.end - clip.start).toFixed(2) + " sec";
          const actions = document.createElement("span");
          actions.className = "clip-row-actions";
          const up = document.createElement("button");
          up.type = "button"; up.className = "clip-order"; up.textContent = "↑";
          up.title = "Move part up"; up.setAttribute("aria-label", "Move part " + (index + 1) + " up");
          up.disabled = index === 0; up.addEventListener("click", () => move(index, -1));
          const down = document.createElement("button");
          down.type = "button"; down.className = "clip-order"; down.textContent = "↓";
          down.title = "Move part down"; down.setAttribute("aria-label", "Move part " + (index + 1) + " down");
          down.disabled = index === clips.length - 1; down.addEventListener("click", () => move(index, 1));
          const remove = document.createElement("button");
          remove.type = "button"; remove.className = "clip-remove"; remove.textContent = "Remove";
          remove.setAttribute("aria-label", "Remove part " + (index + 1));
          remove.addEventListener("click", () => { clips.splice(index, 1); render(); });
          actions.append(up, down, remove);
          row.append(label, actions);
          list.append(row);
        });
      }
      countLabel.textContent = clips.length + (clips.length === 1 ? " part" : " parts");
      panel.classList.toggle("has-clips", clips.length > 0);
      exportButton.textContent = clips.length ? "Export " + clips.length + (clips.length === 1 ? " part" : " parts") : defaultLabel;
      addButton.disabled = !ready;
      hint.textContent = !ready
        ? "Choose a file to start."
        : clips.length
          ? "Choose any range. Parts can overlap; use the arrows to change their order."
          : "Drag the start and end handles to choose a part, then add it.";
    }

    function move(index, offset) {
      const to = index + offset;
      if (to < 0 || to >= clips.length) return;
      [clips[index], clips[to]] = [clips[to], clips[index]];
      render();
    }

    addButton.addEventListener("click", () => {
      const start = Number($(startId).value);
      const end = Number($(endId).value);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || end > mediaDuration) {
        status(key + "Status", "Set a valid start and end inside the file first.", "error");
        return;
      }
      clips.push({ start, end });
      $(""+key+"Download").classList.add("hidden");
      status(key + "Status", "Part added. Choose another range, then add it. You can overlap, repeat, or reorder parts.", "success");
      render();
    });

    render();
    return {
      clips,
      setReady(value, duration) {
        const total = Number(duration);
        ready = Boolean(value && Number.isFinite(total) && total > 0);
        mediaDuration = ready ? total : 0;
        render();
      },
      clear() { clips.length = 0; ready = false; mediaDuration = 0; render(); },
      selection(start, end) { return clips.length ? clips.map(clip => ({ ...clip })) : [{ start, end }]; }
    };
  }
  const audioQueue = makeClipQueue("audio", "audioStart", "audioEnd");
  const videoQueue = makeClipQueue("video", "videoStart", "videoEnd");
  const extractQueue = makeClipQueue("extract", "extractStart", "extractEnd");
  let audioFile = null, audioUrl = null, videoUrl = null, extractUrl = null;

  $("audioFile").addEventListener("change", event => {
    audioFile = event.target.files[0] || null;
    audioQueue.clear();
    $("trimAudio").disabled = true;
    $("audioDownload").classList.add("hidden");
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    if (!audioFile) return;
    audioUrl = URL.createObjectURL(audioFile);
    $("audioPreview").src = audioUrl;
    $("audioPreview").classList.remove("hidden");
    $("audioPreview").onloadedmetadata = () => {
      const duration = $("audioPreview").duration;
      if (!Number.isFinite(duration) || duration <= 0) {
        $("audioInfo").textContent = "This file does not provide a usable duration. Try saving it as MP3, WAV, M4A or AAC.";
        audioQueue.setReady(false, 0);
        status("audioStatus", "Could not read this audio file’s length. Choose a different file or export it in a standard audio format.", "error");
        return;
      }
      $("audioEnd").value = duration.toFixed(2);
      $("audioStart").max = duration;
      $("audioEnd").max = duration;
      $("audioInfo").textContent = audioFile.name + " · " + duration.toFixed(2) + " seconds · " + size(audioFile.size);
      $("trimAudio").disabled = false;
      audioQueue.setReady(true, duration);
    };
  });

  async function wavBlob(buffer, ranges, targetRate, channels, onProgress) {
    const sourceRate = buffer.sampleRate;
    const prepared = ranges.map(range => {
      const startFrame = Math.max(0, Math.floor(range.start * sourceRate));
      const endFrame = Math.min(buffer.length, Math.floor(range.end * sourceRate));
      return { startFrame, endFrame, frames: Math.floor((endFrame - startFrame) / sourceRate * targetRate) };
    }).filter(range => range.frames > 0);
    const frames = prepared.reduce((sum, range) => sum + range.frames, 0);
    if (frames < 1) throw new Error("Selected clips are empty.");
    const dataSize = frames * channels * 2;
    const rf64 = dataSize > 0xffffffff - 36;
    const header = new ArrayBuffer(rf64 ? 80 : 44);
    const view = new DataView(header);
    const write = (offset, text) => { for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i)); };
    const set64 = (offset, value) => {
      const n = BigInt(Math.round(value));
      view.setUint32(offset, Number(n & 0xffffffffn), true);
      view.setUint32(offset + 4, Number(n >> 32n), true);
    };
    if (rf64) {
      write(0, "RF64"); view.setUint32(4, 0xffffffff, true); write(8, "WAVE");
      write(12, "ds64"); view.setUint32(16, 28, true); set64(20, dataSize + 72); set64(28, dataSize); set64(36, frames); view.setUint32(44, 0, true);
      write(48, "fmt "); view.setUint32(52, 16, true);
      view.setUint16(56, 1, true); view.setUint16(58, channels, true); view.setUint32(60, targetRate, true);
      view.setUint32(64, targetRate * channels * 2, true); view.setUint16(68, channels * 2, true); view.setUint16(70, 16, true);
      write(72, "data"); view.setUint32(76, 0xffffffff, true);
    } else {
      write(0, "RIFF"); view.setUint32(4, 36 + dataSize, true); write(8, "WAVE"); write(12, "fmt ");
      view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true);
      view.setUint32(24, targetRate, true); view.setUint32(28, targetRate * channels * 2, true);
      view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true); write(36, "data"); view.setUint32(40, dataSize, true);
    }
    const parts = [header];
    const channelData = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
    const chunkFrames = 131072;
    let completed = 0;
    for (const range of prepared) {
      for (let offset = 0; offset < range.frames; offset += chunkFrames) {
        const count = Math.min(chunkFrames, range.frames - offset);
        const chunk = new ArrayBuffer(count * channels * 2), output = new DataView(chunk);
        for (let i = 0; i < count; i++) {
          const position = range.startFrame + (offset + i) * sourceRate / targetRate;
          const lo = Math.min(range.endFrame - 1, Math.floor(position)), hi = Math.min(range.endFrame - 1, lo + 1), mix = position - Math.floor(position);
          for (let channel = 0; channel < channels; channel++) {
            let sample = 0;
            if (channels === 1) {
              for (const data of channelData) sample += (data[lo] || 0) * (1 - mix) + (data[hi] || 0) * mix;
              sample /= channelData.length;
            } else {
              const data = channelData[Math.min(channel, channelData.length - 1)];
              sample = (data[lo] || 0) * (1 - mix) + (data[hi] || 0) * mix;
            }
            sample = Math.max(-1, Math.min(1, sample));
            output.setInt16((i * channels + channel) * 2, sample < 0 ? sample * 32768 : sample * 32767, true);
          }
        }
        parts.push(chunk); completed += count;
        if (onProgress) onProgress(completed / frames);
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    return new Blob(parts, { type: "audio/wav" });
  }
  $("trimAudio").addEventListener("click", async () => {
    if (!audioFile) return;
    const button = $("trimAudio"), progress = $("audioProgress"), startedAt = performance.now();
    button.disabled = true;
    progress.classList.remove("hidden"); progress.removeAttribute("value");
    let context;
    try {
      const duration = $("audioPreview").duration;
      if (!Number.isFinite(duration) || duration <= 0) {
        $("audioInfo").textContent = "This file does not provide a usable duration. Try saving it as MP3, WAV, M4A or AAC.";
        audioQueue.setReady(false, 0);
        status("audioStatus", "Could not read this audio file’s length. Choose a different file or export it in a standard audio format.", "error");
        return;
      }
      const ranges = audioQueue.selection(Number($("audioStart").value), Number($("audioEnd").value));
      validateRanges(ranges, duration, "Audio");
      const seconds = ranges.reduce((sum, range) => sum + range.end - range.start, 0);
      const targetRate = Number($("audioSampleRate").value), channels = Number($("audioChannels").value);
      const estimatedBytes = seconds * targetRate * channels * 2 + 80;
      status("audioStatus", "Decoding " + size(audioFile.size) + " of audio. Estimated WAV size: " + size(estimatedBytes) + ". Long selections can take several minutes and use substantial memory; progress will appear during export.");
      context = new (window.AudioContext || window.webkitAudioContext)();
      const decoded = await context.decodeAudioData(await audioFile.arrayBuffer());
      progress.value = 0;
      status("audioStatus", "Writing WAV · 0%. This may take a few minutes for a long selection; keep this page open.");
      const blob = await wavBlob(decoded, ranges, targetRate, channels, fraction => {
        progress.value = fraction;
        status("audioStatus", "Writing WAV · " + Math.round(fraction * 100) + "% · " + size(estimatedBytes) + " estimated.");
      });
      const url = URL.createObjectURL(blob); urls.add(url);
      $("audioDownload").href = url;
      $("audioDownload").download = (audioFile.name.replace(/\.[^.]+$/, "") || "audio") + (ranges.length > 1 ? "-clips-joined.wav" : "-trimmed.wav");
      $("audioDownload").classList.remove("hidden");
      status("audioStatus", "WAV ready · " + ranges.length + (ranges.length === 1 ? " clip · " : " clips joined · ") + seconds.toFixed(1) + " seconds · " + size(blob.size) + " · completed in " + formatTime((performance.now() - startedAt) / 1000) + ".", "success");
    } catch (error) {
      status("audioStatus", error.message || "This browser could not decode the audio. Try MP3, WAV or M4A.", "error");
    } finally {
      if (context) await context.close().catch(() => {});
      progress.classList.add("hidden"); progress.removeAttribute("value");
      button.disabled = false;
    }
  });
  function recorderType(audioOnly = false) {
    const options = audioOnly ? ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"] : ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    return options.find(type => MediaRecorder.isTypeSupported(type)) || "";
  }
  async function waitFor(element, eventName) {
    return new Promise((resolve, reject) => {
      const success = () => { clean(); resolve(); };
      const failure = () => { clean(); reject(new Error("Could not load or seek the media.")); };
      const clean = () => { element.removeEventListener(eventName, success); element.removeEventListener("error", failure); };
      element.addEventListener(eventName, success, { once: true });
      element.addEventListener("error", failure, { once: true });
    });
  }
  function validateRanges(ranges, duration, label) {
    if (!ranges.length) throw new Error("Add at least one clip or choose a trim range.");
    for (const range of ranges) {
      if (!Number.isFinite(range.start) || !Number.isFinite(range.end) || range.start < 0 || range.end <= range.start || range.end > duration) {
        throw new Error("Every " + label.toLowerCase() + " clip must have a valid start and end inside the media duration.");
      }
    }
    return ranges.reduce((sum, range) => sum + range.end - range.start, 0);
  }

  $("videoFile").addEventListener("change", event => {
    const file = event.target.files[0] || null;
    videoQueue.clear();
    $("trimVideo").disabled = true;
    $("videoDownload").classList.add("hidden");
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (!file) return;
    videoUrl = URL.createObjectURL(file);
    const preview = $("videoPreview");
    preview.src = videoUrl;
    preview.classList.remove("hidden");
    preview.onloadedmetadata = () => {
      if (!Number.isFinite(preview.duration) || preview.duration <= 0) {
        $("videoInfo").textContent = "This file does not provide a usable duration. Try saving it as MP4 or MOV.";
        videoQueue.setReady(false, 0);
        status("videoStatus", "Could not read this video’s length. Choose a different file or save it as MP4 or MOV.", "error");
        return;
      }
      $("videoEnd").value = preview.duration.toFixed(1);
      $("videoEnd").max = preview.duration;
      $("videoStart").max = preview.duration;
      $("videoInfo").textContent = file.name + " · " + preview.duration.toFixed(1) + " seconds · " + size(file.size);
      $("trimVideo").disabled = false;
      videoQueue.setReady(true, preview.duration);
    };
  });

  function recordMedia(video, stream, ranges, recorder, progress, stopId, statusId, taskName) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      let animation = 0, stoppedByUser = false, settled = false, rejectAfterStop = null, cancelSegment = null;
      const total = ranges.reduce((sum, range) => sum + range.end - range.start, 0);
      const startedAt = performance.now();
      let lastStatus = startedAt, completed = 0;

      const cleanup = () => {
        video.pause();
        if (animation) cancelAnimationFrame(animation);
        stream.getTracks().forEach(track => track.stop());
        if (progress) $(stopId).classList.add("hidden");
        window.activeMediaStop = null;
      };
      const fail = error => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };
      const stop = () => {
        stoppedByUser = true;
        video.pause();
        if (animation) cancelAnimationFrame(animation);
        if (cancelSegment) cancelSegment();
        if (recorder.state !== "inactive") recorder.stop();
      };
      window.activeMediaStop = stop;
      recorder.ondataavailable = event => { if (event.data && event.data.size) chunks.push(event.data); };
      recorder.onerror = () => {
        rejectAfterStop = new Error("Media recording failed.");
        if (recorder.state !== "inactive") recorder.stop();
        else fail(rejectAfterStop);
      };
      recorder.onstop = () => {
        if (settled) return;
        settled = true;
        const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
        cleanup();
        if (rejectAfterStop) reject(rejectAfterStop);
        else resolve({ blob, stopped: stoppedByUser, elapsed: (performance.now() - startedAt) / 1000 });
      };

      const run = async () => {
        try {
          if (video.readyState < 2) await waitFor(video, "loadeddata");
          if (progress) {
            progress.value = 0;
            progress.classList.remove("hidden");
            $(stopId).classList.remove("hidden");
          }
          const canvas = video._captureCanvas;
          const context = canvas ? canvas.getContext("2d") : null;
          recorder.start(250);
          for (let index = 0; index < ranges.length && !stoppedByUser; index++) {
            const range = ranges[index];
            if (Math.abs(video.currentTime - range.start) > 0.025) {
              const seeked = waitFor(video, "seeked");
              video.currentTime = range.start;
              await seeked;
            }
            if (stoppedByUser) break;
            if (recorder.state === "paused") recorder.resume();
            await new Promise((resolveSegment, rejectSegment) => {
              let done = false;
              const finish = () => {
                if (done) return;
                done = true;
                cancelSegment = null;
                resolveSegment();
              };
              cancelSegment = finish;
              const draw = () => {
                if (stoppedByUser) { finish(); return; }
                try {
                  if (context && video.videoWidth && video.videoHeight) {
                    context.fillStyle = "#000";
                    context.fillRect(0, 0, canvas.width, canvas.height);
                    const scale = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
                    const width = video.videoWidth * scale, height = video.videoHeight * scale;
                    context.drawImage(video, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
                  }
                  const elapsed = Math.min(range.end - range.start, Math.max(0, video.currentTime - range.start));
                  if (progress) progress.value = Math.min(100, 100 * (completed + elapsed) / total);
                  const now = performance.now();
                  if (statusId && now - lastStatus >= 4000) {
                    const elapsedWall = (now - startedAt) / 1000;
                    const remaining = Math.max(0, total - completed - elapsed);
                    status(statusId, taskName + " · " + formatTime(elapsedWall) + " elapsed · about " + formatTime(remaining) + " remaining. Estimate assumes real-time playback.");
                    lastStatus = now;
                  }
                  if (video.currentTime >= range.end || video.ended) {
                    video.pause();
                    finish();
                    return;
                  }
                  animation = requestAnimationFrame(draw);
                } catch (error) {
                  if (done) return;
                  done = true;
                  cancelSegment = null;
                  rejectSegment(error);
                }
              };
              video.play().then(() => {
                if (stoppedByUser) { finish(); return; }
                animation = requestAnimationFrame(draw);
              }).catch(error => {
                if (done) return;
                done = true;
                cancelSegment = null;
                rejectSegment(error);
              });
            });
            if (stoppedByUser) break;
            completed += range.end - range.start;
            video.pause();
            if (index < ranges.length - 1 && recorder.state === "recording") recorder.pause();
          }
          if (recorder.state !== "inactive") recorder.stop();
        } catch (error) {
          rejectAfterStop = error;
          if (recorder.state !== "inactive") recorder.stop();
          else fail(error);
        }
      };
      run();
    });
  }
  $("trimVideo").addEventListener("click", async () => {
    const file = $("videoFile").files[0], video = $("videoPreview"), button = $("trimVideo");
    if (!file) return;
    button.disabled = true;
    $("videoDownload").classList.add("hidden");
    let stream;
    try {
      const ranges = videoQueue.selection(Number($("videoStart").value), Number($("videoEnd").value));
      const total = validateRanges(ranges, video.duration, "Video");
      if (!video.captureStream && !video.mozCaptureStream) throw new Error("This browser does not support video capture. Use a recent Chrome, Edge or Firefox.");
      const type = recorderType(false);
      if (!type) throw new Error("This browser cannot record WebM video.");
      status("videoStatus", "Selected duration: " + formatTime(total) + ". Estimated minimum time is about " + formatTime(total) + " because the video is encoded at real-time speed; high-resolution clips can take longer. Keep this tab open.");
      const widthChoice = $("videoWidth").value;
      const maxWidth = widthChoice === "original" ? video.videoWidth : widthChoice === "custom" ? Number($("videoCustomWidth").value) : Number(widthChoice);
      const bitrateChoice = $("videoBitrate").value;
      const videoBitrate = bitrateChoice === "custom" ? Math.round(Number($("videoCustomBitrate").value) * 1000000) : Number(bitrateChoice);
      if (!Number.isFinite(maxWidth) || maxWidth < 2 || !Number.isFinite(videoBitrate) || videoBitrate < 100000) throw new Error("Enter a valid output width and bitrate.");
      const scale = Math.min(1, maxWidth / video.videoWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(2, Math.round(video.videoWidth * scale / 2) * 2);
      canvas.height = Math.max(2, Math.round(video.videoHeight * scale / 2) * 2);
      video._captureCanvas = canvas;
      stream = canvas.captureStream(30);
      const sourceStream = (video.captureStream || video.mozCaptureStream).call(video);
      sourceStream.getAudioTracks().forEach(track => stream.addTrack(track));
      const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: videoBitrate });
      const result = await recordMedia(video, stream, ranges, recorder, $("videoProgress"), "stopVideo", "videoStatus", "Encoding video");
      const blob = result.blob, url = URL.createObjectURL(blob); urls.add(url);
      $("videoDownload").href = url;
      $("videoDownload").download = (file.name.replace(/\.[^.]+$/, "") || "video") + (ranges.length > 1 ? "-clips-joined.webm" : "-compressed.webm");
      $("videoDownload").classList.remove("hidden");
      status("videoStatus", result.stopped ? "Stopped early · partial WebM ready · " + size(blob.size) + " · elapsed " + formatTime(result.elapsed) + ". Inspect video and audio before sharing." : "WebM ready · " + ranges.length + (ranges.length === 1 ? " clip · " : " clips joined · ") + total.toFixed(1) + " seconds · " + size(blob.size) + " · completed in " + formatTime(result.elapsed) + ". Inspect video and audio before sharing.", "success");
    } catch (error) {
      if (stream) stream.getTracks().forEach(track => track.stop());
      status("videoStatus", error.message || "Could not record this video.", "error");
    } finally {
      button.disabled = false;
    }
  });

  $("extractVideoFile").addEventListener("change", event => {
    const file = event.target.files[0] || null;
    extractQueue.clear();
    $("extractAudio").disabled = true;
    $("extractDownload").classList.add("hidden");
    if (extractUrl) URL.revokeObjectURL(extractUrl);
    if (!file) return;
    extractUrl = URL.createObjectURL(file);
    const preview = $("extractPreview");
    preview.src = extractUrl;
    preview.classList.remove("hidden");
    preview.onloadedmetadata = () => {
      if (!Number.isFinite(preview.duration) || preview.duration <= 0) {
        extractQueue.setReady(false, 0);
        status("extractStatus", "Could not read this video’s length. Choose a different file or save it as MP4 or MOV.", "error");
        return;
      }
      $("extractEnd").value = preview.duration.toFixed(1);
      $("extractEnd").max = preview.duration;
      $("extractStart").max = preview.duration;
      $("extractAudio").disabled = false;
      extractQueue.setReady(true, preview.duration);
    };
  });

  $("extractAudio").addEventListener("click", async () => {
    const file = $("extractVideoFile").files[0], video = $("extractPreview"), button = $("extractAudio");
    if (!file) return;
    button.disabled = true;
    let stream;
    try {
      const ranges = extractQueue.selection(Number($("extractStart").value), Number($("extractEnd").value));
      const total = validateRanges(ranges, video.duration, "Audio extraction");
      if (!video.captureStream && !video.mozCaptureStream) throw new Error("This browser cannot capture audio from video.");
      const type = recorderType(true);
      if (!type) throw new Error("This browser cannot record WebM/Opus audio.");
      const raw = (video.captureStream || video.mozCaptureStream).call(video);
      const tracks = raw.getAudioTracks();
      if (!tracks.length) throw new Error("No audio track was found in this video.");
      stream = new MediaStream(tracks);
      status("extractStatus", "Selected duration: " + formatTime(total) + ". Estimated minimum time is about " + formatTime(total) + " at real-time speed. Keep this tab open.");
      const recorder = new MediaRecorder(stream, { mimeType: type, audioBitsPerSecond: 128000 });
      const result = await recordMedia(video, stream, ranges, recorder, $("extractProgress"), "stopExtract", "extractStatus", "Recording audio");
      const url = URL.createObjectURL(result.blob); urls.add(url);
      $("extractDownload").href = url;
      $("extractDownload").download = (file.name.replace(/\.[^.]+$/, "") || "video") + (ranges.length > 1 ? "-audio-clips.webm" : "-audio.webm");
      $("extractDownload").classList.remove("hidden");
      status("extractStatus", result.stopped ? "Stopped early · partial audio ready · " + size(result.blob.size) + " · elapsed " + formatTime(result.elapsed) + "." : "Audio ready · " + ranges.length + (ranges.length === 1 ? " clip · " : " clips joined · ") + total.toFixed(1) + " seconds · " + size(result.blob.size) + " · completed in " + formatTime(result.elapsed) + ".", "success");
    } catch (error) {
      if (stream) stream.getTracks().forEach(track => track.stop());
      status("extractStatus", error.message || "Could not extract audio.", "error");
    } finally {
      button.disabled = false;
    }
  });

  function updateCustomVideoSettings() {
    $("videoCustomWidthWrap").classList.toggle("hidden", $("videoWidth").value !== "custom");
    $("videoCustomBitrateWrap").classList.toggle("hidden", $("videoBitrate").value !== "custom");
  }
  $("videoWidth").addEventListener("change", updateCustomVideoSettings);
  $("videoBitrate").addEventListener("change", updateCustomVideoSettings);
  updateCustomVideoSettings();
  $("stopVideo").addEventListener("click", () => window.activeMediaStop && window.activeMediaStop());
  $("stopExtract").addEventListener("click", () => window.activeMediaStop && window.activeMediaStop());
  addEventListener("beforeunload", () => {
    urls.forEach(URL.revokeObjectURL);
    [audioUrl, videoUrl, extractUrl].filter(Boolean).forEach(URL.revokeObjectURL);
  });
})();
