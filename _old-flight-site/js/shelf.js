// Draws a shelf of drawn spines. The home page shows the first row; shelf.html shows every book
// and fills the rest of the shelves with dashed placeholders. A new line in js/books.js takes the next empty slot.
import { ENTRIES } from "./books.js?v=31";
import { spineSvg } from "./spines.js?v=31";
import { esc, popup } from "./popup.js?v=31";

const SLOT = 64;   // 62px spine + 2px gap
const all = ENTRIES.filter((e) => e.kind === "book" && e.title);

export function mountShelf(el, { limit = Infinity, rows = 0, noteBase = "" } = {}) {
  const books = all.slice(0, limit);
  const perRow = () => {
    const cs = getComputedStyle(el), inner = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    return Math.max(1, Math.floor((inner + 2) / SLOT));
  };
  let drawn = 0;
  const draw = () => {
    const n = perRow();
    if (n === drawn) return;
    drawn = n;
    // always at least `rows` shelves, and always one empty shelf past the last book
    const total = rows ? Math.max(rows, Math.ceil(books.length / n) + 1) * n : books.length;
    let html = "";
    for (let i = 0; i < total; i++) {
      const b = books[i];
      html += b
        ? `<div class="slot"><button type="button" class="spine" data-i="${i}" aria-haspopup="dialog" aria-label="${esc(b.title)}">${spineSvg(b, i)}</button></div>`
        : `<div class="slot" aria-hidden="true">${spineSvg({}, i)}</div>`;
    }
    el.innerHTML = html;
  };
  draw();
  if (rows) new ResizeObserver(draw).observe(el);
  el.addEventListener("click", (e) => {
    const s = e.target.closest(".spine");
    if (!s) return;
    const b = books[+s.dataset.i], ready = b.essay !== false;
    popup({ kicker: b.author, title: b.title, body: ready ? b.blurb : "no essay yet.", url: ready ? `${noteBase}#note/${b.id}` : "", urlText: "read the essay" });
  });
}
