import { GITHUB } from "./github-data.js";
import { ENTRIES } from "./books.js";

// ---------- github: stat tiles ----------
const days = GITHUB.days;
const total = days.reduce((s, [, n]) => s + n, 0);
const active = days.filter(([, n]) => n > 0).length;
let best = 0, run = 0;
for (const [, n] of days) { run = n > 0 ? run + 1 : 0; best = Math.max(best, run); }

const LANG_COLORS = { Python: "#3572A5", Rust: "#dea584", TypeScript: "#3178c6", C: "#555555", "C++": "#f34b7d", JavaScript: "#f1e05a" };

function tiles(repoCount, topLang) {
  const items = [
    [GITHUB.profileTotal ?? total, "contributions, last 12 months"],
    [repoCount, "public repos"],
    [topLang, "most-used language"],
    [GITHUB.joined || "—", "on github since"],
  ];
  document.getElementById("gh-tiles").innerHTML = items
    .map(([v, l]) => `<div class="tile"><b>${v}</b><span class="mono">${l}</span></div>`).join("");
}

// ---------- github: contribution heatmap ----------
function heatmap() {
  const el = document.getElementById("heat");
  const max = Math.max(1, ...days.map(([, n]) => n));
  const first = new Date(days[0][0] + "T00:00:00");
  const pad = first.getDay();                       // align to sunday columns
  const cells = Array(pad).fill('<i class="pad"></i>');
  for (const [d, n] of days) {
    const lvl = n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4));
    cells.push(`<i class="l${lvl}" title="${n} on ${d}"></i>`);
  }
  el.innerHTML = cells.join("");
  const fmt = (s) => new Date(s + "T00:00:00").toLocaleDateString("en-CA", { month: "short", year: "numeric" });
  const hidden = (GITHUB.profileTotal ?? total) - total;
  document.getElementById("heat-range").textContent =
    `${fmt(days[0][0])} – ${fmt(days[days.length - 1][0])}` + (hidden > 0 ? ` · public repos only, ${hidden} private not shown` : "");
}

// ---------- github: repos (live, with snapshot fallback) ----------
function renderRepos(repos) {
  document.getElementById("repos").innerHTML = repos.map((r) => `
    <li>
      <a href="https://github.com/${GITHUB.user}/${r.name}" target="_blank" rel="noopener">
        <span class="repo-name">${r.name}</span>
        <span class="repo-desc">${r.desc || "&nbsp;"}</span>
        <span class="repo-meta mono">
          ${r.lang ? `<i style="background:${LANG_COLORS[r.lang] || "#888"}"></i>${r.lang.toLowerCase()}` : "—"}
          ${r.pushed ? ` · updated ${r.pushed}` : ""}
        </span>
      </a>
    </li>`).join("");
}
function topLanguage(repos) {
  const c = {};
  repos.forEach((r) => r.lang && (c[r.lang] = (c[r.lang] || 0) + 1));
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0]?.toLowerCase() || "—";
}

renderRepos(GITHUB.repos);
tiles(4, topLanguage(GITHUB.repos));
heatmap();

fetch(`https://api.github.com/users/${GITHUB.user}/repos?sort=pushed&per_page=12`)
  .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
  .then((list) => {
    const own = list.filter((r) => !r.fork).map((r) => ({
      name: r.name, lang: r.language, desc: r.description || "",
      pushed: new Date(r.pushed_at).toLocaleDateString("en-CA", { month: "short", day: "numeric" }).toLowerCase(),
    }));
    if (!own.length) return;
    renderRepos(own);
    tiles(list.length, topLanguage(own));
  })
  .catch(() => {}); // snapshot already on screen

// ---------- reveal-on-scroll ----------
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
}, { threshold: 0.12 });
document.querySelectorAll(".sec").forEach((s) => io.observe(s));

// ---------- cursor glow on project cards ----------
document.querySelectorAll(".card").forEach((c) => c.addEventListener("pointermove", (e) => {
  const r = c.getBoundingClientRect();
  c.style.setProperty("--mx", `${e.clientX - r.left}px`);
  c.style.setProperty("--my", `${e.clientY - r.top}px`);
}));

// ---------- shelf + notebook ----------
const esc = (t = "") => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const live = ENTRIES.filter((e) => e.id && e.title);
const byId = Object.fromEntries(live.map((e) => [e.id, e]));
const fmtDate = (d) => d ? new Date(d + "-01T00:00:00").toLocaleDateString("en-CA", { month: "short", year: "numeric" }).toLowerCase() : "";

// tiny markdown: paragraphs, ## / ###, > quotes, - lists, **b**, *i*, `code`, [a](b). Strips <!-- comments -->.
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

const SPINE_COLORS = ["#7a1c22", "#1d2a5c", "#2c3a2a", "#5a4630", "#3b2a4d", "#23464a", "#6b2f1f"];
function shelf() {
  const el = document.getElementById("shelf-books");
  const books = ENTRIES.filter((e) => e.kind === "book");
  el.innerHTML = books.map((b, i) => {
    const empty = !b.title;
    const h = 150 + ((i * 37) % 5) * 9;
    return `<button class="spine${empty ? " empty" : ""}${b.status === "reading" ? " reading" : ""}" ${empty ? "disabled" : `data-id="${b.id}"`}
      style="--h:${h}px; --c:${SPINE_COLORS[i % SPINE_COLORS.length]}" aria-label="${empty ? "open slot" : esc(b.title)}">
      ${b.status === "reading" ? '<span class="tab mono">now</span>' : ""}
      <span class="spine-title">${empty ? "next book" : esc(b.title)}</span>
      <span class="spine-author mono">${empty ? "" : esc(b.author)}</span>
    </button>`;
  }).join("");
  el.addEventListener("click", (e) => { const s = e.target.closest(".spine[data-id]"); if (s) location.hash = "note/" + s.dataset.id; });
}

let filter = "all";
function notebook() {
  const tags = ["all", ...new Set(live.flatMap((e) => e.tags || []))];
  const bar = document.getElementById("nb-filters");
  bar.innerHTML = tags.map((t) => `<button type="button" data-t="${t}" aria-pressed="${t === filter}">${t}</button>`).join("");
  bar.onclick = (e) => { const b = e.target.closest("button"); if (b) { filter = b.dataset.t; notebook(); } };
  const rows = live.filter((e) => filter === "all" || (e.tags || []).includes(filter));
  document.getElementById("nb-list").innerHTML = rows.map((e) => `
    <li><a href="#note/${e.id}">
      <span class="nb-date mono">${fmtDate(e.date)}</span>
      <span class="nb-main">
        <span class="nb-title">${esc(e.title)}${e.kind === "book" ? ` <em>· ${esc(e.author)}</em>` : ""}</span>
        <span class="nb-blurb">${esc(e.blurb || "")}</span>
      </span>
      <span class="nb-tags mono">${(e.tags || []).join(" · ")}</span>
    </a></li>`).join("") || `<li class="nb-empty mono">nothing tagged ${esc(filter)} yet</li>`;
}

// reader: #note/<id> opens it, so every essay has a link you can send someone
const reader = document.getElementById("reader");
const cache = {};
let lastFocus = null;
async function openNote(id) {
  const e = byId[id];
  if (!e) return closeNote(false);
  lastFocus = lastFocus || document.activeElement;
  document.getElementById("reader-meta").textContent =
    [e.kind === "book" ? (e.status === "reading" ? "reading now" : e.status) : "note", fmtDate(e.date), ...(e.tags || [])].filter(Boolean).join(" · ");
  document.getElementById("reader-title").textContent = e.title;
  document.getElementById("reader-by").textContent = e.kind === "book" ? e.author : "";
  const body = document.getElementById("reader-body");
  body.innerHTML = `<p class="mono reader-loading">opening…</p>`;
  const th = (e.threads || []).map((t) => byId[t]).filter(Boolean);
  document.getElementById("reader-threads").innerHTML = th.length
    ? `<span class="mono">threads</span>${th.map((t) => `<a href="#note/${t.id}">${esc(t.title)} →</a>`).join("")}` : "";
  reader.hidden = false;
  document.documentElement.classList.add("reading");
  requestAnimationFrame(() => reader.classList.add("open"));
  reader.querySelector(".reader-sheet").scrollTop = 0;
  reader.querySelector(".reader-close").focus({ preventScroll: true });
  try {
    cache[id] ??= await fetch(`notes/${id}.md`).then((r) => (r.ok ? r.text() : Promise.reject(r.status)));
    body.innerHTML = md(cache[id]);
  } catch {
    body.innerHTML = `<p class="mono">couldn't find notes/${esc(id)}.md</p>`;
  }
}
function closeNote(clearHash = true) {
  if (reader.hidden) return;
  reader.classList.remove("open");
  document.documentElement.classList.remove("reading");
  setTimeout(() => { reader.hidden = true; }, 250);
  if (clearHash && location.hash.startsWith("#note/")) history.pushState(null, "", location.pathname + "#shelf");
  lastFocus?.focus?.({ preventScroll: true }); lastFocus = null;
}
const route = () => { const m = location.hash.match(/^#note\/(.+)$/); m ? openNote(decodeURIComponent(m[1])) : closeNote(false); };
addEventListener("hashchange", route);
reader.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeNote(); });
addEventListener("keydown", (e) => { if (e.key === "Escape") closeNote(); });

shelf();
notebook();
route();
