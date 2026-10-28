(() => {
  const $ = id => document.getElementById(id);
  const tools = [
    { key: "audio", file: "audioFile", media: "audioPreview", wrap: "audioTimelineWrap", timeline: "audioTimeline", track: "audioTimelineTrack", selection: "audioSelection", seek: "audioSeek", startRange: "audioRangeStart", endRange: "audioRangeEnd", startField: "audioStart", endField: "audioEnd", startLabel: "audioRangeInTime", endLabel: "audioRangeOutTime", help: "audioTimelineHelp" },
    { key: "video", file: "videoFile", media: "videoPreview", wrap: "videoTimelineWrap", timeline: "videoTimeline", track: "videoTimelineTrack", selection: "videoSelection", seek: "videoSeek", startRange: "videoRangeStart", endRange: "videoRangeEnd", startField: "videoStart", endField: "videoEnd", startLabel: "videoRangeInTime", endLabel: "videoRangeOutTime", help: "videoTimelineHelp" },
    { key: "extract", file: "extractVideoFile", media: "extractPreview", wrap: "extractTimelineWrap", timeline: "extractTimeline", track: "extractTimelineTrack", selection: "extractSelection", seek: "extractSeek", startRange: "extractRangeStart", endRange: "extractRangeEnd", startField: "extractStart", endField: "extractEnd", startLabel: "extractRangeInTime", endLabel: "extractRangeOutTime", help: "extractTimelineHelp" }
  ];

  function formatTime(value) {
    const time = Math.max(0, Number(value) || 0);
    const centiseconds = Math.round(time * 100);
    const whole = Math.floor(centiseconds / 100);
    const seconds = String(whole % 60).padStart(2, "0") + "." + String(centiseconds % 100).padStart(2, "0");
    const minutes = Math.floor(whole / 60) % 60;
    const hours = Math.floor(whole / 3600);
    return hours ? hours + ":" + String(minutes).padStart(2, "0") + ":" + seconds : String(Math.floor(whole / 60)).padStart(2, "0") + ":" + seconds;
  }

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  for (const config of tools) {
    const file = $(config.file), media = $(config.media), wrap = $(config.wrap), timeline = $(config.timeline);
    const selection = $(config.selection), seek = $(config.seek);
    const startHandle = $(config.startRange), endHandle = $(config.endRange);
    const startField = $(config.startField), endField = $(config.endField);
    const startLabel = $(config.startLabel), endLabel = $(config.endLabel);
    let duration = 0, drag = null;

    function timeFromX(clientX) {
      const rect = timeline.getBoundingClientRect();
      const pad = 9, width = Math.max(1, rect.width - pad * 2);
      return clamp((clientX - rect.left - pad) / width * duration, 0, duration);
    }

    function updateSliderA11y(handle, value, label) {
      handle.value = String(value);
      handle.setAttribute("aria-valuemin", "0");
      handle.setAttribute("aria-valuemax", String(duration));
      handle.setAttribute("aria-valuenow", String(value));
      handle.setAttribute("aria-valuetext", label + " " + formatTime(value));
    }

    function drawSelection() {
      if (!duration || !timeline.clientWidth) return;
      const start = clamp(Number(startField.value) || 0, 0, duration);
      const end = clamp(Number(endField.value) || duration, start, duration);
      const pad = 9, width = Math.max(1, timeline.clientWidth - pad * 2);
      selection.style.left = (pad + width * start / duration) + "px";
      selection.style.width = (width * (end - start) / duration) + "px";
      startHandle.style.left = (pad + width * start / duration) + "px";
      endHandle.style.left = (pad + width * end / duration) + "px";
      updateSliderA11y(startHandle, start, "Start");
      updateSliderA11y(endHandle, end, "End");
    }

    function updatePlayhead(time = Number(media.currentTime) || 0) {
      if (!duration) return;
      const value = clamp(time, 0, duration);
      const pad = 9, width = Math.max(1, timeline.clientWidth - pad * 2);
      seek.style.left = (pad + width * value / duration) + "px";
      seek.title = "Preview position · " + formatTime(value);
      seek.setAttribute("aria-valuemin", "0");
      seek.setAttribute("aria-valuemax", String(duration));
      seek.setAttribute("aria-valuenow", String(value));
      seek.setAttribute("aria-valuetext", "Preview position " + formatTime(value));
    }

    function seekTo(value) {
      if (!duration) return;
      const time = clamp(value, 0, duration);
      try { media.currentTime = time; } catch (_) {}
      updatePlayhead(time);
    }

    function setRange(which, rawValue) {
      if (!duration) return;
      const gap = Math.min(0.05, duration);
      let start = clamp(Number(startField.value) || 0, 0, duration);
      let end = clamp(Number(endField.value) || duration, 0, duration);
      const value = Number(rawValue);
      if (which === "start") start = clamp(Number.isFinite(value) ? value : start, 0, Math.max(0, end - gap));
      else if (which === "end") end = clamp(Number.isFinite(value) ? value : end, Math.min(duration, start + gap), duration);
      else {
        start = clamp(Number.isFinite(value) ? value : start, 0, Math.max(0, duration - gap));
        end = clamp(end, start + gap, duration);
      }
      startField.value = start.toFixed(2);
      endField.value = end.toFixed(2);
      drawSelection();
      startLabel.textContent = "START  " + formatTime(start);
      endLabel.textContent = "END  " + formatTime(end);
    }

    function setRangeAndNotify(which, value) {
      setRange(which, value);
      const handle = which === "start" ? startHandle : endHandle;
      handle.dispatchEvent(new Event("input", { bubbles: true }));
    }

    function initialize() {
      const total = Number(media.duration);
      if (!Number.isFinite(total) || total <= 0) {
        duration = 0;
        wrap.classList.add("is-disabled");
        for (const control of [seek, startHandle, endHandle]) control.disabled = true;
        $(config.help).textContent = file.files && file.files.length
          ? "This file does not provide a usable duration. Try MP3, WAV, MP4 or MOV."
          : "Choose a file to enable the timeline.";
        return;
      }
      duration = total;
      const gap = Math.min(0.05, duration);
      for (const control of [seek, startHandle, endHandle]) control.disabled = false;
      startField.min = "0"; startField.max = String(total);
      endField.min = "0"; endField.max = String(total);
      startField.value = "0";
      endField.value = total.toFixed(2);
      startLabel.textContent = "START  " + formatTime(0);
      endLabel.textContent = "END  " + formatTime(total);
      wrap.classList.remove("is-disabled");
      $(config.help).textContent = "Drag the left and right handles separately. Drag the selected bar to move both. Move the gold handle to preview. You can also enter exact times below.";
      setRange("both", 0);
      updatePlayhead();
    }

    file.addEventListener("change", () => {
      duration = 0; drag = null; wrap.classList.add("is-disabled");
      seek.disabled = true; startHandle.disabled = true; endHandle.disabled = true;
      startLabel.textContent = "START --:--"; endLabel.textContent = "END --:--";
      $(config.help).textContent = file.files && file.files.length ? "Loading file…" : "Choose a file to enable the timeline.";
    });
    media.addEventListener("loadedmetadata", initialize);
    media.addEventListener("durationchange", () => { if (Number(media.duration) !== duration) initialize(); });
    media.addEventListener("error", () => {
      if (file.files && file.files.length) $(config.help).textContent = config.key === "audio" ? "This audio format cannot be previewed here. Try MP3, WAV or M4A." : "This video format cannot be previewed here. Try MP4 or MOV.";
    });
    media.addEventListener("timeupdate", () => updatePlayhead());
    media.addEventListener("seeked", () => updatePlayhead());
    timeline.addEventListener("pointerdown", event => {
      if (!duration || event.button !== 0) return;
      const target = event.target.closest(".media-range-handle, .media-range-playhead, .media-range-selection");
      if (target === startHandle) drag = { type: "start", pointerId: event.pointerId };
      else if (target === endHandle) drag = { type: "end", pointerId: event.pointerId };
      else if (target === seek) drag = { type: "seek", pointerId: event.pointerId };
      else if (target === selection) drag = { type: "move", pointerId: event.pointerId, x: event.clientX, start: Number(startField.value), end: Number(endField.value) };
      else drag = { type: "seek", pointerId: event.pointerId };
      if (!target || !target.classList.contains('media-range-control')) event.preventDefault();
      timeline.setPointerCapture(event.pointerId);
      if (drag.type === "start") setRangeAndNotify("start", timeFromX(event.clientX));
      else if (drag.type === "end") setRangeAndNotify("end", timeFromX(event.clientX));
      else if (drag.type === "seek") seekTo(timeFromX(event.clientX));
    });
    timeline.addEventListener("pointermove", event => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (drag.type === "start") setRangeAndNotify("start", timeFromX(event.clientX));
      else if (drag.type === "end") setRangeAndNotify("end", timeFromX(event.clientX));
      else if (drag.type === "seek") seekTo(timeFromX(event.clientX));
      else if (drag.type === "move") {
        const rect = timeline.getBoundingClientRect();
        const width = Math.max(1, rect.width - 18);
        const delta = (event.clientX - drag.x) / width * duration;
        const length = drag.end - drag.start;
        const start = clamp(drag.start + delta, 0, duration - length);
        startField.value = start.toFixed(2);
        endField.value = (start + length).toFixed(2);
        drawSelection();
        startLabel.textContent = "START  " + formatTime(Number(startField.value));
        endLabel.textContent = "END  " + formatTime(Number(endField.value));
        startHandle.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    const endDrag = event => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (drag.type === "start") startHandle.dispatchEvent(new Event("change", { bubbles: true }));
      if (drag.type === "end") endHandle.dispatchEvent(new Event("change", { bubbles: true }));
      drag = null;
      if (timeline.hasPointerCapture(event.pointerId)) timeline.releasePointerCapture(event.pointerId);
    };
    timeline.addEventListener("pointerup", endDrag);
    timeline.addEventListener("pointercancel", endDrag);

    function keyAdjust(control, which, event) {
      if (!duration) return;
      const start = Number(startField.value) || 0, end = Number(endField.value) || duration;
      const current = which === "start" ? start : which === "end" ? end : Number(media.currentTime) || 0;
      const step = duration <= 60 ? 0.1 : 0.5;
      let value = current;
      if (event.key === "ArrowLeft" || event.key === "ArrowDown") value -= step * (event.shiftKey ? 10 : 1);
      else if (event.key === "ArrowRight" || event.key === "ArrowUp") value += step * (event.shiftKey ? 10 : 1);
      else if (event.key === "PageDown") value -= Math.max(1, duration / 20);
      else if (event.key === "PageUp") value += Math.max(1, duration / 20);
      else if (event.key === "Home") value = 0;
      else if (event.key === "End") value = duration;
      else return;
      event.preventDefault();
      if (which === "seek") seekTo(value);
      else setRangeAndNotify(which, value);
    }
    startHandle.addEventListener("keydown", event => keyAdjust(startHandle, "start", event));
    endHandle.addEventListener("keydown", event => keyAdjust(endHandle, "end", event));
    seek.addEventListener("keydown", event => keyAdjust(seek, "seek", event));
    function commitTimeField(which) {
      const start = Number(startField.value), end = Number(endField.value), gap = Math.min(0.05, duration);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > duration || end - start < gap) {
        $(config.help).textContent = "Start must be before End. Edit the other time if needed; neither value will be moved for you.";
        return;
      }
      setRange(which, which === "start" ? start : end);
      $(config.help).textContent = "Drag the left and right handles separately. Drag the selected bar to move both. Move the gold handle to preview. You can also enter exact times below.";
    }
    startField.addEventListener("change", () => commitTimeField("start"));
    endField.addEventListener("change", () => commitTimeField("end"));
    window.addEventListener("resize", () => { drawSelection(); updatePlayhead(); }, { passive: true });
  }
})();