// The github contribution grid. Data comes from a free public API that reads your github profile,
// so there's nothing to update by hand: commit, and the squares fill in.
const USER = "vedagwekar";   // ✏️ your github username
const WEEKS = 52;           // ✏️ how many weeks the grid shows (26 is about six months)
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const day = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const nice = (s) => { const t = day(s); return `${MONTHS[t.getUTCMonth()]} ${t.getUTCDate()}, ${t.getUTCFullYear()}`; };
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

export async function githubGraph({ head, graph, caption }) {
  // hold the grid's space while it loads, so the text below it doesn't jump
  const w = graph.clientWidth, wk = WEEKS;
  graph.style.minHeight = `${18 + 7 * ((w - (wk - 1) * 3) / wk) + 18}px`;
  let days;
  try {
    const r = await fetch(`https://github-contributions-api.jogruber.de/v4/${USER}?y=last`);
    if (!r.ok) throw new Error(r.status);
    days = (await r.json()).contributions;
  } catch (err) {
    head.innerHTML = `couldn't load the grid right now. <a href="https://github.com/${USER}" rel="noopener">see it on github ↗</a>`;
    graph.hidden = true;
    graph.style.minHeight = "";
    caption.parentElement.hidden = true;
    return;
  }

  let shownWeeks = 0;
  const draw = () => {
    const weeks = WEEKS;
    if (weeks === shownWeeks) return;
    shownWeeks = weeks;

    // keep whole weeks, Sunday on top, ending today
    const last = days.length - 1;
    const endPad = 6 - day(days[last].date).getUTCDay();
    const cells = days.slice(Math.max(0, days.length - (weeks * 7 - endPad)));
    const startPad = day(cells[0].date).getUTCDay();
    const total = cells.reduce((n, c) => n + c.count, 0);
    head.textContent = `${plural(total, "contribution")} in the last six months`;

    // month names over the week where each month starts
    let months = "", lastCol = -9;
    cells.forEach((c, i) => {
      const t = day(c.date), col = Math.floor((i + startPad) / 7);
      if (t.getUTCDate() === 1 && col - lastCol > 2) {
        months += `<span style="grid-column:${col + 1}">${MONTHS[t.getUTCMonth()]}</span>`;
        lastCol = col;
      }
    });

    let squares = "<i></i>".repeat(startPad);
    for (const c of cells) {
      const label = `${c.count ? plural(c.count, "contribution") : "no contributions"} on ${nice(c.date)}`;
      squares += `<i data-l="${c.level}" data-t="${label}"></i>`;
    }
    graph.style.setProperty("--weeks", weeks);
    graph.innerHTML = `<div class="gh-months" aria-hidden="true">${months}</div><div class="gh-cells">${squares}</div>`;
    graph.setAttribute("aria-label", head.textContent);
  };
  draw();
  graph.style.minHeight = "";
  new ResizeObserver(draw).observe(graph);

  if (matchMedia("(hover: none)").matches) caption.textContent = "tap a square to see that day.";
  const idle = caption.textContent;
  const show = (e) => { const t = e.target.dataset?.t; caption.textContent = t || idle; };
  graph.addEventListener("pointerover", show);
  graph.addEventListener("pointerleave", () => { caption.textContent = idle; });
  graph.addEventListener("click", show);   // tap on phones
}
