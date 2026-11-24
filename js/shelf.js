// Draws the shelf of plain spines on /shelf: one spine per book read, wrapping onto a new shelf when a row is full.
// A new line in js/books.js adds a spine. Passing `rows` instead fills that many shelves, with dashed placeholders
// at the end.
import { ENTRIES } from "./books.js?v=101";
import { spine } from "./spines.js?v=101";
import { esc, popup } from "./popup.js?v=101";

const SLOT = 46;   // 42px spine + 4px gap
const all = ENTRIES.filter((e) => e.kind === "book" && e.title);

export function mountShelf(el, { limit = Infinity, rows = 0, noteBase = "" } = {}) {
  const books = all.slice(0, limit);
  const perRow = () => {
    const cs = getComputedStyle(el), inner = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    return Math.max(1, Math.floor((inner + 4) / SLOT));
  };
  let drawn = 0;
  const draw = () => {
    const n = perRow();
    if (n === drawn) return;
    drawn = n;
    // at least `rows` shelves, and only as many more as the books need
    const total = rows ? Math.max(rows, Math.ceil(books.length / n)) * n : books.length;
    let html = "";
    for (let i = 0; i < total; i++) {
      const b = books[i];
      html += b
        ? `<div class="slot"><button type="button" class="spine" data-i="${i}" aria-haspopup="dialog" aria-label="${esc(b.title)}">${spine(b, i)}</button></div>`
        : `<div class="slot" aria-hidden="true">${spine({}, i)}</div>`;
    }
    el.innerHTML = html;
  };
  draw();
  if (rows) new ResizeObserver(draw).observe(el);
  el.addEventListener("click", (e) => {
    const s = e.target.closest(".spine");
    if (!s) return;
    const b = books[+s.dataset.i], ready = b.essay !== false;
    popup({ kicker: b.author, title: b.title, body: ready ? b.blurb : "no mini essay yet.", url: ready ? `${noteBase}#note/${b.id}` : "", urlText: "read the mini essay" });
  });
}
