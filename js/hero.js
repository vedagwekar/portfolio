// The front of the page: the photo drawn as dithered pixels on a small canvas that the browser
// scales up. It sharpens into place on load, and on a computer a clear spot follows the cursor.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const STEP = 24;              // colour steps per channel; bigger is more posterised
const CELL = 3;               // on-screen size of the smallest pixel
const BLOCK = 2;              // the resting picture uses blocks of this many small pixels
const FOCUS_X = 0.54;         // keeps the person in frame when a narrow screen crops the sides
const LENS = 34;              // radius of the clear spot, in small pixels

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export async function pixelHero(canvas, { reduced }) {
  const img = new Image();
  await new Promise((ok, fail) => { img.onload = ok; img.onerror = fail; img.src = "assets/hero-photo.jpg?v=3"; });

  const g = canvas.getContext("2d");
  const off = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const frame = canvas.parentElement;
  let cols = 0, rows = 0, src, base, out, d;

  function fit() {
    const W = frame.clientWidth, H = frame.clientHeight;
    if (!W || !H) return false;
    cols = Math.ceil(W / CELL); rows = Math.ceil(H / CELL);
    canvas.width = off.canvas.width = cols;
    canvas.height = off.canvas.height = rows;
    canvas.style.width = `${cols * CELL}px`; canvas.style.height = `${rows * CELL}px`;
    const scale = Math.max(cols / img.width, rows / img.height), dw = img.width * scale, dh = img.height * scale;
    off.drawImage(img, clamp(cols / 2 - dw * FOCUS_X, cols - dw, 0), (rows - dh) * 0.5, dw, dh);
    src = off.getImageData(0, 0, cols, rows).data;
    out = g.createImageData(cols, rows); d = out.data;
    base = new Uint8ClampedArray(d.length);
    return true;
  }

  // the whole picture at one block size
  function paint(b) {
    for (let y = 0, o = 0; y < rows; y++) for (let x = 0; x < cols; x++, o += 4) {
      const bx = x & ~(b - 1), by = y & ~(b - 1);
      const p = (Math.min(by + (b >> 1), rows - 1) * cols + Math.min(bx + (b >> 1), cols - 1)) * 4;
      const t = (BAYER[(((bx / b) | 0) & 3) + (((by / b) | 0) & 3) * 4] / 16 - 0.47) * STEP;
      for (let c = 0; c < 3; c++) base[o + c] = (((src[p + c] + t) / STEP + 0.5) | 0) * STEP;
      base[o + 3] = 255;
    }
    d.set(base);
    g.putImageData(out, 0, 0);
  }

  if (!fit()) return;
  if (!reduced) {
    for (const b of [32, 16, 8, 4]) {
      paint(b);
      await new Promise((r) => setTimeout(r, 110));
    }
  }
  paint(BLOCK);

  let size = `${frame.clientWidth}x${frame.clientHeight}`;
  new ResizeObserver(() => {
    const now = `${frame.clientWidth}x${frame.clientHeight}`;
    if (now !== size && fit()) { size = now; paint(BLOCK); }
  }).observe(frame);
  if (reduced || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  // ---------- the clear spot ----------
  let on = false, a = 0, x = 0, y = 0, tx = 0, ty = 0, raf = 0, last = 0;
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    a += ((on ? 1 : 0) - a) * (1 - Math.exp(-dt * 8));
    const k = 1 - Math.exp(-dt * 14);
    x += (tx - x) * k; y += (ty - y) * k;
    d.set(base);
    const R = LENS * a, R2 = R * R;
    for (let j = Math.max(0, (y - R) | 0); j <= Math.min(rows - 1, y + R); j++)
      for (let i = Math.max(0, (x - R) | 0); i <= Math.min(cols - 1, x + R); i++) {
        const q = (i - x) ** 2 + (j - y) ** 2;
        // the edge of the spot breaks up on the same dither grid as the picture
        if (q < R2 && (1 - q / R2) * 2.4 > BAYER[(i & 3) + (j & 3) * 4] / 16) {
          const o = (j * cols + i) * 4;
          d[o] = src[o]; d[o + 1] = src[o + 1]; d[o + 2] = src[o + 2];
        }
      }
    g.putImageData(out, 0, 0);
    const settled = !on && a < 0.01;
    if (settled) { a = 0; d.set(base); g.putImageData(out, 0, 0); raf = 0; return; }
    raf = requestAnimationFrame(tick);
  }
  const wake = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };
  addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect(), px = (e.clientX - r.left) / CELL, py = (e.clientY - r.top) / CELL;
    const inside = px >= 0 && py >= 0 && px < cols && py < rows;
    if (inside) { if (!on && a < 0.01) { x = px; y = py; } tx = px; ty = py; }
    if (inside || on) { on = inside; wake(); }
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => { on = false; wake(); });
}
