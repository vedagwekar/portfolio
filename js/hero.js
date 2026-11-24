// The front of the page: the photo drawn as coloured text characters.
// Brighter parts of the photo get denser characters. It types itself in on load, and the
// characters near the cursor get pushed aside and spring back (a finger drag does it on phones).

const RAMP = " .,:;i1tfLCG08@";       // ✏️ dark → bright. Swap for any characters you like
const CONTRAST = 0.85;           // below 1 brings out the dark parts, above 1 hides them
const FOCUS_X = 0.54;           // keeps the person in frame when a narrow screen crops the sides
const RADIUS = 100;              // px around the cursor that gets pushed (grows with the characters on big screens)
const PUSH = 1.5;                // how hard the cursor pushes
const SPRING = 0.075;            // how hard characters pull back home
const DAMP = 0.8;                // lower settles faster
const BG = "#000";
const FONT = `ui-monospace, "SF Mono", Menlo, Consolas, monospace`;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export async function asciiHero(canvas, { reduced }) {
  const img = new Image();
  await new Promise((ok, fail) => { img.onload = ok; img.onerror = fail; img.src = "assets/hero-photo.jpg?v=99"; });

  const g = canvas.getContext("2d");
  const base = document.createElement("canvas"), b = base.getContext("2d");
  const off = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const frame = canvas.parentElement;
  let W = 0, H = 0, dpr = 1, fs = 11, cw = 7, ch = 13, cols = 0, rows = 0, reach = RADIUS;
  let glyph, colour, ox, oy, vx, vy;
  const active = new Set();

  // measure the grid and turn the photo into one character + colour per cell
  function fit() {
    W = frame.clientWidth; H = frame.clientHeight;
    if (!W || !H) return false;
    // very large screens: keep the canvas under ~12 million pixels (browsers refuse or crawl past ~16M)
    dpr = Math.min(2, devicePixelRatio || 1, Math.sqrt(12e6 / (W * H)));
    // ✏️ character size in px: smaller shows more of the photo. Past 1440px wide it grows with the screen,
    // so a 4K or ultrawide display draws about the same number of characters as a laptop instead of 4x more
    fs = W < 700 ? 5.5 : W < 1200 ? 6.5 : Math.max(7, W / 205);
    reach = RADIUS * Math.max(1, fs / 7);
    for (const c of [canvas, base]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
    g.font = `${fs}px ${FONT}`;
    cw = g.measureText("M").width; ch = fs * 1.15;
    cols = Math.ceil(W / cw); rows = Math.ceil(H / ch);

    // cover-crop the photo, then shrink it so each cell is one pixel
    off.canvas.width = cols; off.canvas.height = rows;
    const s = Math.max(W / img.width, H / img.height), dw = img.width * s, dh = img.height * s;
    // on wide screens the text panel covers the left, so the person sits further right
    const dx = W >= 900 ? clamp(W * 0.7 - dw * FOCUS_X, W - dw, W * 0.42) : clamp(W / 2 - dw * FOCUS_X, W - dw, 0), dy = (H - dh) / 2;
    off.drawImage(img, dx / cw, dy / ch, dw / cw, dh / ch);
    const px = off.getImageData(0, 0, cols, rows).data;

    const n = cols * rows;
    glyph = new Uint8Array(n); colour = new Array(n);
    ox = new Float32Array(n); oy = new Float32Array(n); vx = new Float32Array(n); vy = new Float32Array(n);
    active.clear();
    // the photo is a dark sunset, so stretch its brightness to use the whole ramp
    const lum = new Float32Array(n);
    for (let i = 0, p = 0; i < n; i++, p += 4) lum[i] = (0.2126 * px[p] + 0.7152 * px[p + 1] + 0.0722 * px[p + 2]) / 255;
    const sorted = Float32Array.from(lum).sort();
    const lo = sorted[(n * 0.03) | 0], hi = sorted[(n * 0.995) | 0];
    for (let i = 0, p = 0; i < n; i++, p += 4) {
      const L = Math.pow(clamp((lum[i] - lo) / (hi - lo || 1), 0, 1), CONTRAST);
      glyph[i] = Math.min(RAMP.length - 1, Math.round(L * (RAMP.length - 1)));
      // characters only cover part of their cell, so brighten each one while keeping its hue
      const r = px[p], gr = px[p + 1], bl = px[p + 2], top = Math.max(r, gr, bl, 1);
      const k = ((0.42 + 0.58 * L) * 255) / top;
      const c = (v) => Math.min(255, v * k) & ~7;
      colour[i] = `rgb(${c(r)},${c(gr)},${c(bl)})`;
    }
    return true;
  }

  function prep(ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `${fs}px ${FONT}`;
    ctx.textBaseline = "top";
  }

  // the resting picture, drawn once and copied every frame
  function drawBase() {
    prep(b);
    b.fillStyle = BG; b.fillRect(0, 0, W, H);
    let last = "";
    for (let j = 0, i = 0; j < rows; j++) for (let k = 0; k < cols; k++, i++) {
      if (!glyph[i]) continue;
      if (colour[i] !== last) { last = colour[i]; b.fillStyle = last; }
      b.fillText(RAMP[glyph[i]], k * cw, j * ch);
    }
  }
  const blit = () => { g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(base, 0, 0); };

  if (!fit()) return;
  drawBase();

  // ---------- typing in, top to bottom with a ragged edge ----------
  if (!reduced) {
    const n = cols * rows, when = new Float32Array(n);
    for (let j = 0, i = 0; j < rows; j++) for (let k = 0; k < cols; k++, i++) when[i] = (j / rows) * 0.65 + Math.random() * 0.35;
    await new Promise((done) => {
      const start = performance.now(), DUR = 1100;
      const step = (now) => {
        const t = (now - start) / DUR;
        if (t >= 1.1) { done(); return; }
        prep(g);
        g.fillStyle = BG; g.fillRect(0, 0, W, H);
        let last = "";
        for (let j = 0, i = 0; j < rows; j++) for (let k = 0; k < cols; k++, i++) {
          const w = when[i];
          if (t < w - 0.12) continue;
          const settled = t >= w;
          if (settled && !glyph[i]) continue;
          const c = settled ? colour[i] : "rgba(255,255,255,.35)";
          if (c !== last) { last = c; g.fillStyle = c; }
          g.fillText(settled ? RAMP[glyph[i]] : RAMP[1 + ((Math.random() * (RAMP.length - 1)) | 0)], k * cw, j * ch);
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
  blit();

  let size = `${frame.clientWidth}x${frame.clientHeight}`;
  new ResizeObserver(() => {
    const now = `${frame.clientWidth}x${frame.clientHeight}`;
    if (now !== size && fit()) { size = now; drawBase(); blit(); }
  }).observe(frame);
  if (reduced) return;

  // ---------- the push ----------
  let mx = 0, my = 0, cx = -1e4, cy = -1e4, on = false, raf = 0;
  function tick() {
    const r = canvas.getBoundingClientRect();
    mx = cx - r.left; my = cy - r.top;
    const inside = on && mx >= 0 && my >= 0 && mx < W && my < H;

    if (inside) {
      const k0 = Math.max(0, ((mx - reach) / cw) | 0), k1 = Math.min(cols - 1, ((mx + reach) / cw) | 0);
      const j0 = Math.max(0, ((my - reach) / ch) | 0), j1 = Math.min(rows - 1, ((my + reach) / ch) | 0);
      for (let j = j0; j <= j1; j++) for (let k = k0; k <= k1; k++) {
        const i = j * cols + k;
        const dx = k * cw + cw / 2 + ox[i] - mx, dy = j * ch + ch / 2 + oy[i] - my, d = Math.hypot(dx, dy);
        if (d >= reach || d < 0.01) continue;
        const f = (1 - d / reach) ** 2 * PUSH * (reach / RADIUS);
        vx[i] += (dx / d) * f; vy[i] += (dy / d) * f;
        active.add(i);
      }
    }

    blit();
    if (active.size) {
      prep(g);
      // clear each moving character's home cell, then draw it where it's been pushed to
      g.fillStyle = BG;
      for (const i of active) g.fillRect((i % cols) * cw, ((i / cols) | 0) * ch, cw, ch);
      let last = "";
      for (const i of active) {
        vx[i] = (vx[i] - ox[i] * SPRING) * DAMP; vy[i] = (vy[i] - oy[i] * SPRING) * DAMP;
        ox[i] += vx[i]; oy[i] += vy[i];
        const moved = Math.hypot(ox[i], oy[i]);
        if (moved < 0.05 && Math.abs(vx[i]) + Math.abs(vy[i]) < 0.05) { ox[i] = oy[i] = vx[i] = vy[i] = 0; active.delete(i); }
        // pushed characters get a little denser, so even the dark water stirs
        const gi = Math.min(RAMP.length - 1, glyph[i] + Math.round(Math.min(1, moved / 14) * 3));
        if (!gi) continue;
        if (colour[i] !== last) { last = colour[i]; g.fillStyle = last; }
        g.fillText(RAMP[gi], (i % cols) * cw + ox[i], ((i / cols) | 0) * ch + oy[i]);
      }
    }
    raf = inside || active.size ? requestAnimationFrame(tick) : 0;
  }
  const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };
  addEventListener("pointermove", (e) => { cx = e.clientX; cy = e.clientY; on = true; wake(); }, { passive: true });
  addEventListener("pointerup", (e) => { if (e.pointerType !== "mouse") { on = false; wake(); } });
  addEventListener("pointercancel", () => { on = false; wake(); });
  document.documentElement.addEventListener("pointerleave", () => { on = false; wake(); });
  addEventListener("scroll", () => { if (on) wake(); }, { passive: true });
}
