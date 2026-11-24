// A quiet ascii texture behind every page except home, a different one on each page:
//   about    - drifting haze, with a soft ripple every so often, like a ball bouncing somewhere off the page
//   projects - a contour map scrolling slowly underneath, the way the ground looks from a drone
// It's sparse, kept mostly to the edges of the screen so the middle stays clear for text,
// and holds still for reduced motion. Add ?art=<name> to an address to try another page's texture.
const CW = 14, CH = 20;
const PURPLE = "167,139,250", WHITE = "255,255,255";

// smooth 3d value noise, 0..1
const P = new Uint8Array(512);
{
  const p = [...Array(256).keys()];
  let s = 11;
  for (let i = 255; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) P[i] = p[i & 255];
}
const sm = (t) => t * t * (3 - 2 * t);
const mix = (a, b, t) => a + (b - a) * t;
function noise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const u = sm(x - xi), v = sm(y - yi), w = sm(z - zi);
  const X = xi & 255, Y = yi & 255, Z = zi & 255;
  const h = (a, b, c) => P[P[P[X + a] + Y + b] + Z + c] / 255;
  return mix(mix(mix(h(0, 0, 0), h(1, 0, 0), u), mix(h(0, 1, 0), h(1, 1, 0), u), v),
    mix(mix(h(0, 0, 1), h(1, 0, 1), u), mix(h(0, 1, 1), h(1, 1, 1), u), v), w);
}
const fbm = (x, y, z) => .6 * noise(x, y, z) + .3 * noise(x * 2.1, y * 2.1, z) + .1 * noise(x * 4.2, y * 4.2, z);

// how much of a scene shows at a cell: full at the sides, faint behind the text column in the middle
function edges(cols) {
  const wide = cols > 70;
  return (c) => {
    if (!wide) return .45;
    const d = Math.abs(c / cols - .5) * 2; // 0 in the middle, 1 at the sides
    return .18 + .82 * sm(Math.min(1, Math.max(0, (d - .45) / .4)));
  };
}

function haze(put, cols, rows, t) {
  const edge = edges(cols);
  // a ripple every 3.2 seconds from a spot low on the right
  const ox = cols * (cols > 70 ? .86 : .7), oy = rows * .72, period = 3.2;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const e = edge(c);
    let ring = 0;
    for (let k = 0; k < 2; k++) { // the two newest rings
      const age = (t % period) + k * period, R = age * 6;
      const d = Math.abs(Math.hypot((c - ox) * CW / CH, r - oy) - R);
      if (d < 1.2) ring = Math.max(ring, (1 - d / 1.2) * Math.max(0, 1 - age / (period * 2)));
    }
    if (ring > .08) { put(c, r, ring > .5 ? "o" : "·", PURPLE, (.1 + .4 * ring) * Math.max(e, .5)); continue; }
    const n = fbm(c * .06 + t * .04, r * .09, t * .05);
    if (n < .5) continue;
    put(c, r, n > .62 ? ":" : n > .56 ? "·" : ".", WHITE, (.08 + (n - .5) * .9) * e);
  }
}

function contours(put, cols, rows, t) {
  const edge = edges(cols), y0 = t * .9;
  const h = (x, y) => fbm(x * .045, (y + y0) * .07, 1.7);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const v = h(c, r) * 9, f = v - Math.floor(v);
    if (f > .1 && f < .9) continue; // only draw close to a contour line
    const gx = h(c + 1, r) - h(c - 1, r), gy = h(c, r + 1) - h(c, r - 1);
    // the line runs across the slope, so turn the slope's direction a quarter turn
    const a = Math.atan2(gy, gx * CH / CW) * 4 / Math.PI;
    const ch = "-\\|/-\\|/"[(Math.round(a) + 10) % 8];
    const major = Math.floor(v + .5) % 4 === 0;
    put(c, r, ch, major ? PURPLE : WHITE, (major ? .34 : .13) * edge(c));
  }
}

const SCENES = { haze, contours };
const PICK = { about: "haze", projects: "contours", shelf: "haze" };

export function asciiBackdrop(page) {
  if (document.documentElement.classList.contains("home")) return;
  const asked = new URLSearchParams(location.search).get("art");
  const paint = SCENES[asked in SCENES ? asked : PICK[page]];

  const cv = document.createElement("canvas");
  cv.className = "backdrop";
  cv.setAttribute("aria-hidden", "true");
  document.body.prepend(cv);
  const ctx = cv.getContext("2d");
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W, H, cols, rows;

  const put = (c, r, ch, rgb, a) => {
    if (a < .02) return;
    ctx.fillStyle = `rgba(${rgb},${Math.min(1, a)})`;
    ctx.fillText(ch, c * CW + CW / 2, r * CH + CH / 2);
  };
  const size = () => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(W / CW) + 1; rows = Math.ceil(H / CH) + 1;
  };
  const draw = (t) => {
    ctx.clearRect(0, 0, W, H);
    ctx.font = "13px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    paint(put, cols, rows, t);
  };

  let last = 0, raf = 0;
  const loop = (ms) => {
    raf = requestAnimationFrame(loop);
    if (ms - last < 66) return; // about 15 frames a second is plenty for something this slow
    last = ms;
    draw(ms / 1000);
  };

  size();
  addEventListener("resize", () => { size(); if (still) draw(20); });
  if (still) { draw(20); return; }
  document.addEventListener("visibilitychange", () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) raf = requestAnimationFrame(loop);
  });
  raf = requestAnimationFrame(loop);
}
