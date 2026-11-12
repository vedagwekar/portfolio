// Draws the shelf of plain spines on /shelf. It uses as many shelves as the books need (at least one), and fills
// the end of the last shelf with dashed placeholders. A new line in js/books.js takes the next empty slot, and a
// new shelf appears once the last one is full.
import { ENTRIES } from "./books.js?v=82";
import { spine } from "./spines.js?v=82";
import { esc, popup } from "./popup.js?v=82";

const SLOT = 50;   // 46px spine + 4px gap
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
    popup({ kicker: b.author, title: b.title, body: ready ? b.blurb : "no essay yet.", url: ready ? `${noteBase}#note/${b.id}` : "", urlText: "read the essay" });
  });
}
