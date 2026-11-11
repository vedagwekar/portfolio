// Plain book spines: a coloured block with the title running down it.
// Colours and heights cycle through the lists below, so a new book in js/books.js needs nothing here.
const COLOURS = [
  ["#3e5a4b", "#efe8da"],   // moss
  ["#8a2f2b", "#efe8da"],   // oxblood
  ["#2c3c58", "#efe8da"],   // navy
  ["#c4923a", "#20231f"],   // ochre
  ["#c9d4c6", "#20231f"],   // sage
  ["#553a50", "#efe8da"],   // plum
  ["#d9cdb3", "#20231f"],   // sand
  ["#34625f", "#efe8da"],   // teal
  ["#20231f", "#efe8da"],   // ink
];
const HEIGHTS = [214, 190, 206, 198, 220, 186, 224, 194, 210];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function spine(book, i) {
  const h = HEIGHTS[i % HEIGHTS.length];
  if (!book.title) return `<span class="spine-empty" style="height:${h}px"></span>`;
  const [bg, fg] = COLOURS[i % COLOURS.length];
  return `<span class="spine-face" style="height:${h}px;background:${bg};color:${fg}">${esc(book.title.toLowerCase())}</span>`;
}
