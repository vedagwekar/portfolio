// Everything on the page that isn't the 3D sky. Essays live in js/books.js + notes/<id>.md.
import { ENTRIES } from "./books.js?v=31";
import { mountShelf } from "./shelf.js?v=31";
import { esc, card, dlg, popup } from "./popup.js?v=31";

const $ = (id) => document.getElementById(id);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobile = matchMedia("(max-width: 700px), (pointer: coarse)").matches;

const isGit = (u) => u?.includes("github.com");
const linkText = (u) => (isGit(u) ? "github ↗" : undefined);

// ---------- ✏️ the words ----------
const WORK = [
  { name: "waterloo aerial robotics", what: "embedded flight software", when: "nov 2026 →", more: "writing sensor drivers in c/c++ for our drone autopilot." },
  { name: "sustainable physical ai society", what: "perception and vision", when: "sep 2026 →", more: "computer vision for a strawberry-farm robot, telling crops from weeds. also looking at thermal sensing to catch frost early." },
  { name: "youth policy council", what: "full stack developer", when: "sep 2025 →", url: "https://youthpolicycouncil.ca", more: "i built the site and maintain it on my own. next.js, supabase and 190+ tests." },
];
const BUILT = [
  { name: "lightning response", what: "hackathon winner", when: "sep 2026", url: "https://github.com/shan-d-louis/formulatechhacks", more: "an ai pit wall for f1 tyres, trained on 138,683 laps. run against hamilton's silverstone 2020 failure, it gave a warning 15 laps early." },
  { name: "cetr index", what: "open source", when: "python", url: "https://github.com/vedagwekar/cetr-index", more: "ranks which canadian provinces are most exposed to the move off fossil fuels, and tests whether the ranking holds up under different methods." },
  { name: "home ml server", what: "homelab", when: "2026 →", more: "an old gaming laptop wiped and running headless debian. the goal is to have it training models around the clock." },
];
const CHAPTERS = [
  { title: "about", lines: ["calgary, then waterloo", "math and robots"], to: "#about", text: "i study math and cs at waterloo and i'm from calgary." },
  { title: "work", lines: ["drones", "strawberries"], to: "#experience", items: WORK },
  { title: "projects", lines: ["f1 tyres", "ten provinces"], to: "#experience", items: BUILT },
  { title: "notebook", lines: ["essays and", "braindumps"], to: "#notebook", text: "essays on books i've read, and braindumps on everything else." },
  { title: "contact", lines: ["email", "or linkedin"], to: "#contact", text: "vedagwekar@gmail.com" },
];
// what each loose page holds when you fly through it
const LOOSE = [
  ...WORK.map((x) => ({ kicker: x.what, title: x.name, body: x.more, url: x.url, urlText: linkText(x.url) })),
  ...BUILT.map((x) => ({ kicker: x.what, title: x.name, body: x.more, url: x.url, urlText: linkText(x.url) })),
  { kicker: "school", title: "university of waterloo", body: "studying math and cs. originally from calgary." },
  { kicker: "outside of work", title: "basketball, guitar, anime", body: "i play pickup basketball and i'm learning guitar." },
  { kicker: "reading", title: "the shelf", body: "nine books i've read and plan to write about. they're further down the page." },
];
const COVERS = ["#3c5a49", "#7d2f2b", "#2c3c58", "#bd9440", "#553a50", "#34625f"];

// ---------- experience: each row opens a popup ----------
function toc() {
  const row = (x, group) => `<li${isGit(x.url) ? ' class="linked"' : ""}>
    <button class="row" type="button" aria-haspopup="dialog" data-g="${group}" data-i="${x.i}">
      <span class="nm">${esc(x.name)}</span><span class="wh">${esc(x.what)}</span><span class="dots" aria-hidden="true"></span><span class="pg">${esc(x.when)}</span>
    </button>${isGit(x.url) ? `<a class="git" href="${x.url}" rel="noopener">github ↗</a>` : ""}
  </li>`;
  $("toc-work").innerHTML = WORK.map((x, i) => row({ ...x, i }, "w")).join("");
  $("toc-built").innerHTML = BUILT.map((x, i) => row({ ...x, i }, "b")).join("");
  document.querySelector(".toc").addEventListener("click", (e) => {
    const b = e.target.closest(".row");
    if (!b) return;
    const x = (b.dataset.g === "w" ? WORK : BUILT)[+b.dataset.i];
    popup({ kicker: `${x.what} · ${x.when}`, title: x.name, body: x.more, url: x.url, urlText: linkText(x.url) });
  });
}

// ---------- notebook ----------
const entries = ENTRIES.filter((e) => e.id && e.title && e.essay !== false);
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const nice = (d) => { if (!d) return ""; const [y, m] = d.split("-"); return `${MONTHS[+m - 1] || ""} ${y}`.trim(); };

const typeOf = (e) => e.type || (e.kind === "book" ? "essay" : "braindump");
function notebook() {
  const TABS = [["essay", "essays", "no essays yet."], ["braindump", "braindumps", "nothing here yet."]];
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
  flow.innerHTML = `<header><small>${nice(e.date)} · ${typeOf(e)}</small>
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

// ---------- sky ----------
async function sky() {
  const body = document.documentElement;   // scroll locks while flying
  const fonts = ['600 100px "Schibsted Grotesk"', '400 60px "Schibsted Grotesk"'];
  await Promise.race([Promise.all(fonts.map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 2000))]);
  const { createWorld } = await import("./world.js?v=31");
  const noteEl = $("note"), chEl = $("chapter");
  let seen = new Set(), noteT = 0, world;

  world = createWorld($("sky"), {
    chapters: CHAPTERS, pages: LOOSE, mobile, reduced,
    onChapter(i) {
      if (i === null) { chEl.hidden = true; return; }
      const c = CHAPTERS[i];
      seen.add(i);
      $("c-ch").textContent = seen.size;
      const list = c.items ? `<ul>${c.items.map((x) => `<li><b>${esc(x.name)}</b> ${esc(x.what)}</li>`).join("")}</ul>` : "";
      chEl.innerHTML = `${card({ kicker: `chapter ${i + 1} of ${CHAPTERS.length}`, title: c.title, body: c.text, extra: list })}<p><a href="${c.to}">go to this section</a></p>`;
      chEl.hidden = false;
      $("hint").classList.add("gone");
    },
    onPage(p, n) {
      $("c-pg").textContent = n;
      $("pg-body").innerHTML = card(p);
      noteEl.hidden = false;
      clearTimeout(noteT);
      noteT = setTimeout(() => { noteEl.hidden = true; }, 8000);
    },
  });
  noteEl.addEventListener("click", (e) => { if (e.target.closest("[data-pop-close]")) { clearTimeout(noteT); noteEl.hidden = true; } });
  $("c-cht").textContent = world.total.chapters;
  $("c-pgt").textContent = world.total.pages;

  const assistBtns = [...document.querySelectorAll("[data-assist]")];
  assistBtns.forEach((b) => b.addEventListener("click", () => {
    world.setAssist(!world.assist);
    assistBtns.forEach((x) => { x.setAttribute("aria-pressed", String(world.assist)); x.querySelector("b").textContent = world.assist ? "on" : "off"; });
  }));
  const land = () => { body.classList.remove("flying"); world.land(); chEl.hidden = true; noteEl.hidden = true; };
  $("go").addEventListener("click", () => {
    scrollTo({ top: 0, behavior: "instant" });
    body.classList.add("flying");
    world.start();
    if (mobile) $("hint").textContent = "drag to steer. let go and it flies itself";
    $("sky").focus?.();
  });
  // leaving flight goes straight back to the top of the page
  const exit = () => { land(); scrollTo({ top: 0, behavior: "instant" }); $("go").focus({ preventScroll: true }); };
  $("land").addEventListener("click", exit);
  addEventListener("keydown", (e) => { if (e.key === "Escape" && body.classList.contains("flying")) exit(); });
  // following a chapter's link leaves the sky, so land first
  chEl.addEventListener("click", (e) => { if (e.target.closest("a")) land(); });
  addEventListener("keydown", (e) => { if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") $("hint").classList.add("gone"); });
}

// ---------- boot ----------
history.scrollRestoration = "manual";
mountShelf($("shelf"), { limit: 9 });
toc();
notebook();
route();
Promise.resolve().then(sky).catch((err) => { console.warn("sky unavailable", err); document.documentElement.classList.add("no-gl"); });
