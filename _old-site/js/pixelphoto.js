// The hero photo, redrawn as chunky dithered pixels. It starts as big blocks and resolves on load.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const STEP = 30;   // colour steps per channel; bigger is more posterised

const cellFor = (width) => (width < 700 ? 4 : 6);

export async function pixelPhoto(canvas, { reduced }) {
  const img = new Image();
  await new Promise((ok, fail) => { img.onload = ok; img.onerror = fail; img.src = "assets/hero-photo.jpg?v=2"; });
  const g = canvas.getContext("2d", { willReadFrequently: true });
  const stage = canvas.parentElement;

  function draw(cell) {
    const W = stage.clientWidth, H = stage.clientHeight;
    if (!W || !H) return;
    const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
    canvas.width = cols; canvas.height = rows;
    canvas.style.width = `${cols * cell}px`; canvas.style.height = `${rows * cell}px`;
    // cover the stage; on tall screens stay centred on the bench
    const tall = W / H < 1, scale = Math.max(cols / img.width, rows / img.height);
    const dw = img.width * scale, dh = img.height * scale;
    const x = Math.min(0, Math.max(cols - dw, cols / 2 - dw * (tall ? 0.33 : 0.5))), y = (rows - dh) * 0.66;
    g.drawImage(img, x, y, dw, dh);
    const frame = g.getImageData(0, 0, cols, rows), d = frame.data;
    for (let py = 0, o = 0; py < rows; py++) for (let px = 0; px < cols; px++, o += 4) {
      const t = (BAYER[(px & 3) + (py & 3) * 4] / 16 - 0.47) * STEP;
      for (let c = 0; c < 3; c++) d[o + c] = Math.max(0, Math.min(255, Math.round((d[o + c] + t) / STEP) * STEP));
    }
    g.putImageData(frame, 0, 0);
  }

  const final = () => cellFor(stage.clientWidth);

  if (!reduced) {
    for (const cell of [56, 36, 22, 13]) {
      draw(cell);
      await new Promise((r) => setTimeout(r, 120));
    }
  }
  draw(final());
  let last = stage.clientWidth + "x" + stage.clientHeight;
  new ResizeObserver(() => {
    const now = stage.clientWidth + "x" + stage.clientHeight;
    if (now !== last) { last = now; draw(final()); }
  }).observe(stage);
}
