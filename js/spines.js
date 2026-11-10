// Hand-drawn book spines. Each doodle sits in a 46x46 box; the shared "rough" SVG filter
// makes every line wobble a bit so it looks drawn rather than plotted.
// A new book: add its id here. Anything without an entry just gets a star on plain paper.

const INK = "#20231f";

const butterfly = (x, y, s, r) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})">
  <path d="M0 0C-9-10-14-3-9 1-14 4-8 10 0 2 8 10 14 4 9 1 14-3 9-10 0 0Z" fill="#f2c733"/><path d="M0-3V6"/></g>`;

const ART = {
  "thus-spoke-zarathustra": {
    bg: "#efe4c8", lines: ["thus spoke", "zarathustra"], by: "nietzsche",
    draw: `<circle cx="33" cy="11" r="6" fill="#f2c733"/><path d="M33 1v2M43 11h-2M40 4l-2 2M26 4l2 2M40 18l-2-2"/>
      <path d="M2 43 16 16l7 13 6-9 15 23Z" fill="#fff"/><path d="m12 24 4 3 3-2 3 3"/>`,
  },
  "count-of-monte-cristo": {
    bg: "#86a9bd", lines: ["the count of", "monte cristo"], by: "dumas",
    draw: `<path d="M6 34c5-11 28-11 34 0Z" fill="#d9b77c"/><path d="M18 26V11h-2V6h4v3h2V6h3v3h2V6h4v5h-2v15Z" fill="#efe4c8"/>
      <path d="M21 26v-6c0-3 5-3 5 0v6" fill="${INK}"/><path d="M2 38c4-4 7-4 10 0s7 4 10 0 7-4 10 0 7 4 11 0M6 44c4-3 7-3 10 0s6 3 10 0 7-3 11 0"/>`,
  },
  "one-hundred-years-of-solitude": {
    bg: "#9dbb95", lines: ["one hundred", "years of", "solitude"], by: "márquez",
    draw: `${butterfly(14, 14, 0.82, -18)}${butterfly(33, 26, 0.7, 20)}${butterfly(14, 37, 0.5, -30)}
      <path d="M36 5c3 2 3 5 1 8M25 36c3 2 6 3 9 3" stroke-dasharray="1 4"/>`,
  },
  "picture-of-dorian-gray": {
    bg: "#c79ab5", lines: ["the picture", "of dorian", "gray"], by: "wilde",
    draw: `<rect x="6" y="1" width="34" height="44" rx="2" fill="#d9b77c"/><rect x="11" y="6" width="24" height="34" fill="#efe4c8"/>
      <circle cx="23" cy="20" r="8" fill="#fff"/><path d="M23 12c-1 5 2 11 0 16" /><path d="M23 12c5 0 8 4 8 8s-3 8-8 8c2-5-1-11 0-16Z" fill="#6f7468"/>
      <path d="M18 18h2M26 18h2M18 24c1 1 3 1 4 0M25 25l1-2 2 2M23 28v5M15 38c1-3 4-5 8-5s7 2 8 5"/>`,
  },
  "crime-and-punishment": {
    bg: "#d9cfae", lines: ["crime and", "punishment"], by: "dostoevsky",
    draw: `<path d="M9 44 31 9" stroke-width="3.2"/><path d="M24 3c7-2 19 5 19 15-5-2-11-4-16-8l2-3Z" fill="#a9afa6"/>
      <path d="M9 13c-5 7-5 11 0 11s5-4 0-11Z" fill="#c9423a"/><path d="M36 33c-3 4-3 6 0 6s3-2 0-6Z" fill="#c9423a"/>`,
  },
  "red-rising": {
    bg: "#d97b5f", lines: ["red rising"], by: "brown",
    draw: `<circle cx="23" cy="24" r="15" fill="#a93a2a"/><circle cx="17" cy="19" r="3"/><circle cx="29" cy="30" r="4"/><circle cx="30" cy="16" r="1.6"/>
      <path d="M11 30c5 2 9 1 12-1"/><path d="M6 6l1 3 3 1-3 1-1 3-1-3-3-1 3-1ZM40 5v5M37.500 7.500h5M41 40v4M39 42h4"/>`,
  },
  "beyond-good-and-evil": {
    bg: "#e6bd52", lines: ["beyond good", "and evil"], by: "nietzsche",
    draw: `<path d="M23 3v39M13 44h20M5 15 41 8" stroke-width="2.2"/><path d="M5 15 1 28M5 15l8 12M41 8l-5 12M41 8l5 11"/>
      <path d="M0 28c1 6 13 6 14-1Z" fill="#fff"/><path d="M35 20c1 6 11 6 12-1Z" fill="${INK}"/>`,
  },
  "animal-farm": {
    bg: "#cf9a68", lines: ["animal farm"], by: "orwell",
    draw: `<path d="M16 44 19 21h8l3 23Z" fill="#efe4c8"/><path d="M21 44v-7h4v7"/>
      <path d="m23 19-13-13 4-4 12 13ZM23 19l13-13 4 4-13 13Z" fill="#fff"/><path d="m23 19-12 12 4 4 11-13ZM23 19l13 12-4 4-12-13Z" fill="#fff"/>
      <circle cx="23" cy="19" r="2.200" fill="${INK}"/><path d="M1 44h44M4 44v-7M10 44v-7M38 44v-7M43 44v-7M1 40h12M36 40h9"/>`,
  },
  exhalation: {
    bg: "#7fb0a6", lines: ["exhalation"], by: "ted chiang",
    draw: `<path d="M22 2v13M22 15l-6 6M22 15l6 6"/><path d="M15 12C8 13 3 25 3 36c0 7 11 6 14 2 2-4 1-16 0-20Z" fill="#f0a9a0"/>
      <path d="M29 12c7 1 11 12 11 21 0 7-9 7-12 3-2-4-1-14 0-18Z" fill="#f0a9a0"/><path d="M9 25l4 3M9 32l5 1M34 24l-4 3M34 31l-5 2"/>
      <path d="M38 8c3-3 8-1 6 2s-6 0-3-2"/>`,
  },
};

const FALLBACK = { bg: "#efe4c8", draw: `<path d="m23 7 4 11 12 1-9 7 3 12-10-7-10 7 3-12-9-7 12-1Z" fill="#f2c733"/>` };
const HEIGHTS = [226, 198, 216, 206, 220, 190, 230, 200, 210];

// seeded so the wobble is the same every visit
const jitter = (i) => { let s = 97 * (i + 3); return (amt) => { s = (s * 7919 + 17) % 1009; return ((s / 1009 - 0.5) * 2 * amt).toFixed(1); }; };

export function spineSvg(book, i) {
  const H = HEIGHTS[i % HEIGHTS.length], j = jitter(i);
  if (!book.title) {
    return `<svg viewBox="0 0 62 ${H}" width="62" height="${H}" aria-hidden="true"><path filter="url(#rough)" d="M4 4H58V${H - 2}H4Z" fill="none" stroke="#9a9c8f" stroke-width="1.4" stroke-dasharray="5 5"/></svg>`;
  }
  const art = ART[book.id] || FALLBACK;
  const lines = art.lines || [book.title.toLowerCase()];
  const box = `M${3 + +j(1.5)} ${3 + +j(1.5)}C20 ${2 + +j(2)} 42 ${4 + +j(2)} ${59 + +j(1.5)} ${3 + +j(1.5)}C${60 + +j(1)} ${H * 0.35} ${58 + +j(1)} ${H * 0.7} ${59 + +j(1.5)} ${H - 2}C42 ${H - 1 + +j(1)} 20 ${H - 3 + +j(1)} ${3 + +j(1.5)} ${H - 2}C${2 + +j(1)} ${H * 0.7} ${4 + +j(1)} ${H * 0.3} ${3 + +j(1.5)} ${3 + +j(1.5)}Z`;
  let scribble = "";
  for (let y = 30; y < H - 4; y += 7) scribble += `M8 ${y + +j(1.5)}L54 ${y - 16 + +j(2)}`;
  const start = 70, room = H - start - 28;
  const longest = Math.max(...lines.map((l) => l.length));
  const size = Math.min(15, room / (longest * 0.64)).toFixed(1);
  const gap = +size + 2;
  const title = lines.map((l, n) => `<text x="${room / 2}" y="${((n - (lines.length - 1) / 2) * gap + +size * 0.32).toFixed(1)}" text-anchor="middle" style="font-size:${size}px">${l}</text>`).join("");
  return `<svg viewBox="0 0 62 ${H}" width="62" height="${H}" aria-hidden="true">
    <g filter="url(#rough)" fill="none" stroke="${INK}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <path d="${box}" fill="${art.bg}" stroke-width="2"/>
      <path d="${scribble}" stroke="#fff" stroke-opacity=".2" stroke-width="2.4"/>
      <path d="M6 ${H - 26}c14 2 34-2 50 0"/>
      <g transform="translate(8 15)">${art.draw}</g>
    </g>
    <g class="spine-title" fill="${INK}" transform="translate(31 ${start}) rotate(90)">${title}</g>
    <text class="spine-by" x="31" y="${H - 11}" text-anchor="middle" fill="${INK}">${art.by || (book.author || "").toLowerCase()}</text>
  </svg>`;
}
