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
  ["#d9d0f5", "#14121c"],   // lavender
];
const HEIGHTS = [168, 150, 162, 156, 174, 148, 178, 154, 166];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// tall enough for the title on one line, or on two lines for a long one, so it's never cut off
const fit = (title, base) => {
  const one = title.length * 6.8 + 26;
  return Math.round(Math.max(base, one <= 205 ? one : Math.ceil(title.length / 2) * 6.8 + 34));
};

export function spine(book, i) {
  const base = HEIGHTS[i % HEIGHTS.length], h = book.title ? fit(book.title, base) : base;
  if (!book.title) return `<span class="spine-empty" style="height:${h}px"></span>`;
  const [bg, fg] = COLOURS[i % COLOURS.length];
  return `<span class="spine-face" style="height:${h}px;background:${bg};color:${fg}">${esc(book.title.toLowerCase())}</span>`;
}
