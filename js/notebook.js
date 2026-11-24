// The notebook list and the essay reader, used on the shelf page (/shelf).
// Essays live in js/books.js + notes/<id>.md; a link to "#note/<id>" opens one.
import { ENTRIES } from "./books.js?v=101";
import { esc, dlg } from "./popup.js?v=101";

const $ = (id) => document.getElementById(id);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

// colours for the essay reader's opening cover
const COVERS = ["#3c5a49", "#7d2f2b", "#2c3c58", "#bd9440", "#553a50", "#34625f"];

// ---------- notebook ----------
const entries = ENTRIES.filter((e) => e.id && e.title && e.essay !== false);
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const nice = (d) => { if (!d) return ""; const [y, m] = d.split("-"); return `${MONTHS[+m - 1] || ""} ${y}`.trim(); };

const typeOf = (e) => e.type || (e.kind === "book" ? "essay" : "braindump");
function list() {
  const TABS = [["essay", "mini essays", "no mini essays yet."], ["braindump", "braindumps", "nothing here yet."]];
  let tab = entries.some((e) => typeOf(e) === "essay") ? "essay" : "braindump";
  const chips = $("chips"), list = $("entries");
  const draw = () => {
    chips.innerHTML = TABS.map(([t, label]) => `<button type="button" aria-pressed="${t === tab}" data-t="${t}">${label}</button>`).join("");
    const shown = entries.filter((e) => typeOf(e) === tab);
    list.innerHTML = shown.length ? shown.map((e) => `<li><a href="#note/${e.id}">
      <time>${nice(e.date)}</time><b>${esc(e.title)}</b><span>${esc(e.blurb)}</span></a></li>`).join("")
      : `<li class="empty">${TABS.find(([t]) => t === tab)[2]}</li>`;
  };
  draw();
  chips.addEventListener("click", (e) => { const c = e.target.closest("button"); if (c) { tab = c.dataset.t; draw(); } });
}

function md(src) {
  const inline = (t) => esc(t)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt, url) =>
      url.startsWith("#note/") ? `<a href="${url}">${txt}</a>` : `<a href="${url}" target="_blank" rel="noopener">${txt} ↗</a>`);
  return src.replace(/<!--[\s\S]*?-->/g, "").trim().split(/\n\s*\n/).map((block) => {
    const lines = block.split("\n");
    if (/^#{2,3} /.test(block)) return `<h3>${inline(block.replace(/^#{2,3} /, ""))}</h3>`;
    if (lines.every((l) => l.startsWith(">"))) return `<blockquote>${inline(lines.map((l) => l.replace(/^>\s?/, "")).join(" "))}</blockquote>`;
    if (lines.every((l) => /^\s*[-*] /.test(l))) return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-*] /, ""))}</li>`).join("")}</ul>`;
    return `<p>${inline(lines.join(" "))}</p>`;
  }).join("");
}

// ---------- the reader is an actual book: columns are pages, arrows turn them ----------
const reader = $("reader"), flow = $("flow"), leaf = $("leaf"), viewport = $("viewport");
const cache = new Map();
let page = 0, pagesTotal = 1, opener = null, flipping = false;

const perSpread = () => (getComputedStyle(flow).columnCount === "2" ? 2 : 1);
const gap = () => parseFloat(getComputedStyle(flow).columnGap) || 0;

function measure() {
  flow.style.transform = "";
  const step = flow.clientWidth + gap();
  pagesTotal = Math.max(1, Math.round((flow.scrollWidth + gap()) / step));
  page = Math.min(page, pagesTotal - 1);
  place();
}
function place() {
  flow.style.transform = `translateX(${-page * (flow.clientWidth + gap())}px)`;
  const n = perSpread(), first = page * n + 1;
  $("folio").textContent = n === 2 ? `pages ${first}–${first + 1}` : `page ${first}`;
  $("prev").disabled = page === 0;
  $("next").disabled = page >= pagesTotal - 1;
}
function turn(dir) {
  const to = page + dir;
  if (flipping || to < 0 || to >= pagesTotal) return;
  if (reduced) { page = to; place(); return; }
  flipping = true;
  leaf.className = `leaf go ${dir > 0 ? "fwd" : "back"}`;
  setTimeout(() => { page = to; place(); }, 210);
  setTimeout(() => { leaf.className = "leaf"; flipping = false; }, 430);
}

async function openNote(id) {
  const i = entries.findIndex((e) => e.id === id);
  if (i < 0) { closeNote(); return; }
  const e = entries[i];
  if (dlg.open) dlg.close();
  if (reader.hidden) opener = document.activeElement;
  if (!cache.has(id)) {
    try {
      const r = await fetch(`notes/${id}.md`, { cache: "no-cache" });
      if (!r.ok) throw 0;
      cache.set(id, await r.text());
    } catch { cache.set(id, "couldn't load this one."); }
  }
  const threads = (e.threads || []).map((t) => entries.find((x) => x.id === t)).filter(Boolean);
  flow.innerHTML = `<header><small>${nice(e.date)} · ${typeOf(e) === "essay" ? "mini essay" : typeOf(e)}</small>
      <h2 id="r-title">${esc(e.title)}</h2>${e.author ? `<p class="by">${esc(e.author)}</p>` : ""}</header>
    <div class="body">${md(cache.get(id))}</div>
    ${threads.length ? `<aside class="threads"><small>see also</small>${threads.map((t) => `<a href="#note/${t.id}">${esc(t.title)}</a>`).join("")}</aside>` : ""}
    `;
  const wasHidden = reader.hidden;
  reader.hidden = false;
  document.documentElement.classList.add("reading");
  page = 0;
  await (document.fonts.ready);
  measure();
  $("book").focus?.({ preventScroll: true });
  if (wasHidden) {
    reader.querySelector(".close").focus({ preventScroll: true });
    if (!reduced) {
      leaf.style.setProperty("--cover", COVERS[i % COVERS.length]);
      leaf.className = "leaf cover";
      setTimeout(() => { leaf.className = "leaf"; }, 720);
    }
  }
}
function closeNote() {
  if (reader.hidden) return;
  reader.hidden = true;
  document.documentElement.classList.remove("reading");
  opener?.focus?.({ preventScroll: true });
}
function route() {
  const m = location.hash.match(/^#note\/(.+)$/);
  if (m) openNote(decodeURIComponent(m[1])); else closeNote();
}
function leaveNote() {
  // keep the reader's position in the page instead of jumping to the top
  if (history.length > 1 && reader.dataset.pushed !== "0") history.replaceState(null, "", location.pathname + location.search);
  closeNote();
}

reader.addEventListener("click", (e) => {
  if (e.target.closest("[data-close]")) { leaveNote(); return; }
  if (e.target.closest("a,button")) return;
  if (!e.target.closest(".viewport")) return;
  const r = viewport.getBoundingClientRect(), x = (e.clientX - r.left) / r.width;
  if (getSelection().toString()) return;
  if (x > 0.68) turn(1); else if (x < 0.32) turn(-1);
});
$("prev").addEventListener("click", () => turn(-1));
$("next").addEventListener("click", () => turn(1));
addEventListener("keydown", (e) => {
  if (reader.hidden) return;
  if (e.key === "Escape") leaveNote();
  if (e.key === "ArrowRight") turn(1);
  if (e.key === "ArrowLeft") turn(-1);
});
let touchX = null;
viewport.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
viewport.addEventListener("touchend", (e) => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  touchX = null;
  if (Math.abs(dx) > 44) turn(dx < 0 ? 1 : -1);
});
// a focused link on a later page shouldn't scroll the clipped viewport sideways
viewport.addEventListener("scroll", () => { viewport.scrollLeft = 0; });
viewport.addEventListener("focusin", (e) => {
  const step = flow.clientWidth + gap();
  const left = e.target.getBoundingClientRect().left - viewport.getBoundingClientRect().left;
  const shift = Math.floor(left / step);
  if (shift) { page = Math.max(0, Math.min(pagesTotal - 1, page + shift)); place(); }
});
addEventListener("resize", () => { if (!reader.hidden) measure(); });
addEventListener("hashchange", route);


export function notebook() {
  list();
  route();
}
