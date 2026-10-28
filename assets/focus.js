/* When a tool page is opened from the catalog (?tool=...), show only that tool and apply its preset. */
(function () {
  const key = new URLSearchParams(location.search).get("tool");
  if (!key || typeof TOOL_CATALOG === "undefined") return;
  const t = TOOL_CATALOG.find((x) => x.id === key);
  const sec = t && t.section && document.getElementById(t.section);
  if (!sec) return;
  const cards = [...document.querySelectorAll("main .utility-card")];
  const body = document.body;
  body.classList.add("focus");
  cards.forEach((c) => c.classList.toggle("is-focus", c === sec));
  document.title = t.title + " | Variuno Tools";
  const h1 = document.querySelector(".page-hero h1"), sub = document.querySelector(".page-hero .sub");
  if (h1) h1.textContent = t.title;
  if (sub) sub.textContent = t.detail;
  const main = document.querySelector("main");
  const bar = document.createElement("div");
  bar.className = "focus-bar";
  bar.innerHTML = '<a href="index.html#toolbox">&larr; All tools</a>';
  const more = document.createElement("button");
  more.type = "button"; more.className = "ghost small";
  const label = () => (body.classList.contains("focus") ? "Show other tools on this page" : "Show only " + t.title.toLowerCase());
  more.textContent = label();
  more.addEventListener("click", () => { body.classList.toggle("focus"); more.textContent = label(); });
  bar.appendChild(more);
  main.insertBefore(bar, main.firstChild);
  window.scrollTo(0, 0);
  Object.entries(t.set || {}).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = val;
    ["input", "change"].forEach((ev) => el.dispatchEvent(new Event(ev, { bubbles: true })));
  });
})();
