/* Guided application workspace. Progress is a small local checklist; files are never stored here. */
(function () {
  const sel = document.getElementById("exam");
  const box = document.getElementById("checklist");
  const storageKey = "variuno.application-workspace.v1";
  const groups = new Map();
  let storageAvailable = true;
  let progress = readProgress();

  EXAMS.forEach((exam) => {
    const groupName = exam.group || "Other applications";
    if (!groups.has(groupName)) {
      const group = document.createElement("optgroup");
      group.label = groupName;
      groups.set(groupName, group);
      sel.appendChild(group);
    }
    const option = document.createElement("option");
    option.value = exam.id;
    option.textContent = exam.name;
    groups.get(groupName).appendChild(option);
  });

  function readProgress() {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch (_) {
      storageAvailable = false;
      return {};
    }
  }
  function saveProgress() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(progress));
      storageAvailable = true;
    } catch (_) {
      storageAvailable = false;
    }
  }
  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }
  function specText(p) {
    if (!p || p.custom || !Number.isFinite(p.w) || !Number.isFinite(p.h)) {
      return "Use the dimensions and file-size limits shown on your current form.";
    }
    const size = p.minKB > 0 ? p.minKB + "–" + p.maxKB + " KB" : "Confirm the current upload-size rule.";
    return (p.pixelApprox ? "Suggested canvas " : "Canvas ") + p.w + " × " + p.h + " px · " + size;
  }
  function taskFor(exam, item, index) {
    const preset = PRESETS.find((entry) => entry.id === item.preset);
    const kind = item.kind || (preset && preset.kind) || "photo";
    if (item.kind === "live") {
      return {
        key: "item-" + index,
        title: item.label,
        detail: "Capture this directly in the official form. A prepared image cannot replace a live-capture step.",
        href: "/application-prep#live-photo",
        action: "Live photo guidance",
        freshness: "Capture in the official portal",
      };
    }
    if (item.kind === "guide") {
      return {
        key: "item-" + index,
        title: item.label,
        detail: "Review the current document instructions and prepare the requested files.",
        href: "/application-prep#documents",
        action: "Document guidance",
        freshness: "Check the current form",
      };
    }
    const params = new URLSearchParams();
    params.set("preset", item.preset || "custom");
    if (kind) params.set("kind", kind);
    const isCurrent = !!(preset && preset.verified && preset.checked);
    return {
      key: "item-" + index,
      title: item.label,
      detail: specText(preset),
      href: "/photo?" + params.toString(),
      action: "Prepare file",
      freshness: isCurrent ? "Named cycle · checked " + preset.checked : "Confirm the active notice",
      source: (preset && preset.source) || exam.source || "",
      sourceLabel: (preset && preset.sourceLabel) || exam.sourceLabel || "Official source",
      current: isCurrent,
    };
  }
  function finalTask(key, title, detail, href, action, freshness) {
    return { key, title, detail, href, action, freshness: freshness || "Final review" };
  }
  function appendTask(exam, task, saved, index, total, updateCount) {
    const row = el("article", "workspace-task");
    const label = el("label", "workspace-check");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = !!saved[task.key];
    input.setAttribute("aria-label", "Mark " + task.title + " as prepared or reviewed");
    const copy = el("span", "workspace-copy");
    copy.appendChild(el("strong", null, task.title));
    copy.appendChild(el("span", "spec", task.detail));
    const status = el("span", "workspace-freshness" + (task.current ? " is-current" : ""), task.freshness);
    copy.appendChild(status);
    label.append(input, copy);
    row.appendChild(label);

    const actions = el("div", "workspace-actions");
    const link = el("a", "btn ghost", task.action);
    link.href = task.href;
    actions.appendChild(link);
    if (task.source) {
      const source = el("a", "workspace-source", "Official source ↗");
      source.href = task.source;
      source.target = "_blank";
      source.rel = "noopener noreferrer";
      source.setAttribute("aria-label", "Open " + task.sourceLabel + " (opens in a new tab)");
      actions.appendChild(source);
    }
    row.appendChild(actions);
    input.addEventListener("change", () => {
      saved[task.key] = input.checked;
      progress[exam.id] = saved;
      saveProgress();
      updateCount();
    });
    return row;
  }
  function render() {
    const exam = EXAMS.find((entry) => entry.id === sel.value) || EXAMS[0];
    if (!exam) return;
    box.textContent = "";
    const saved = progress[exam.id] && typeof progress[exam.id] === "object" ? progress[exam.id] : {};
    if (exam.note) box.appendChild(el("p", "workspace-note spec", exam.note));

    const taskList = el("div", "workspace-list");
    const tasks = exam.items.map((item, index) => taskFor(exam, item, index));
    tasks.push(finalTask("documents", "Prepare required certificates and scans", "Check the form's PDF limits, then organize, rotate or compress only the documents it requests.", "/pdf-tools", "Open PDF tools", "Check the current form"));
    tasks.push(finalTask("review-files", "Review every prepared file", "Check each preview, format, dimensions and file size against the active instructions.", "/application-prep", "Review submission guidance"));
    tasks.push(finalTask("review-portal", "Follow the live application portal", "Use live capture there when requested, upload each file to the matching field and save the final confirmation.", "/application-prep", "Final submission guide"));

    const count = el("p", "workspace-progress");
    count.setAttribute("aria-live", "polite");
    function updateCount() {
      const done = tasks.filter((task) => !!saved[task.key]).length;
      count.textContent = done + " of " + tasks.length + " steps marked ready. " + (storageAvailable ? "Progress is saved in this browser on this device; files are not stored here." : "Browser storage is unavailable, so progress may reset when you leave.");
    }
    tasks.forEach((task, index) => taskList.appendChild(appendTask(exam, task, saved, index, tasks.length, updateCount)));
    box.appendChild(taskList);

    const footer = el("div", "workspace-footer");
    footer.appendChild(count);
    const reset = el("button", "ghost small", "Reset this checklist");
    reset.type = "button";
    reset.addEventListener("click", () => {
      progress[exam.id] = {};
      saveProgress();
      render();
    });
    footer.appendChild(reset);
    box.appendChild(footer);
    if (exam.source) {
      const reference = el("p", "workspace-reference");
      const link = el("a", "text-link", "Open " + (exam.sourceLabel || "official instructions") + " ↗");
      link.href = exam.source;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      reference.appendChild(link);
      const report = el("a", "text-link", "Suggest a correction");
      const address = typeof SITE_EMAIL === "string" ? SITE_EMAIL.trim() : "";
      if (/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address)) {
        const subject = "Correction to " + exam.name + " guidance";
        const body = "Please review the guidance for " + exam.name + ".\n\nOfficial source: " + exam.source + "\n\nSuggested correction:\n";
        report.href = "mailto:" + address + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      } else {
        report.href = "/contact#contact-email";
        report.setAttribute("aria-label", "Suggest a correction; contact email is not configured yet");
      }
      reference.appendChild(document.createTextNode(" · "));
      reference.appendChild(report);
      box.appendChild(reference);
    }
    updateCount();
  }
  sel.addEventListener("change", render);
  render();
})();
