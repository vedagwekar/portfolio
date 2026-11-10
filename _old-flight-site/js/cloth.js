// Surface textures for the books, generated pixel by pixel so there are no image files to load.
// Every one is a seamless greyscale tile: the book's colour multiplies it, and the same tile
// doubles as the bump map, so the weave catches light when you fly close.

function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

// value noise that wraps at the tile edge
function noise(cells, rand) {
  const g = Float32Array.from({ length: cells * cells }, rand);
  const s = (t) => t * t * (3 - 2 * t);
  return (u, v) => {
    const x = u * cells, y = v * cells, i = Math.floor(x), j = Math.floor(y), fx = s(x - i), fy = s(y - j);
    const at = (a, b) => g[((a + cells) % cells) + ((b + cells) % cells) * cells];
    return (at(i, j) * (1 - fx) + at(i + 1, j) * fx) * (1 - fy) + (at(i, j + 1) * (1 - fx) + at(i + 1, j + 1) * fx) * fy;
  };
}

const threads = (n, rand, slub) => Float32Array.from({ length: n }, () => (rand() - 0.5) * 0.09 + (rand() < slub ? 0.1 : 0));

// each maker returns brightness 0..1 for a pixel, given pixel coords and tile size
const MAKERS = {
  // plain weave with the odd thicker thread, like bookcloth
  linen(size, rand) {
    const p = 4, n = size / p, warp = threads(n, rand, 0.07), weft = threads(n, rand, 0.07);
    const fine = noise(size >> 1, rand), mottle = noise(9, rand);
    return (x, y) => {
      const ix = x >> 2, iy = y >> 2, fx = ((x % p) + 0.5) / p, fy = ((y % p) + 0.5) / p;
      const over = (ix + iy) & 1;
      const a = Math.sin(Math.PI * fx), b = Math.sin(Math.PI * fy);
      const h = over ? a * (0.55 + 0.45 * b) : b * (0.55 + 0.45 * a);
      return 0.68 + 0.27 * h + (over ? warp[ix] : weft[iy]) + (fine(x / size, y / size) - 0.5) * 0.08 + (mottle(x / size, y / size) - 0.5) * 0.08;
    };
  },
  // diagonal rib: a tighter, stiffer cloth
  buckram(size, rand) {
    const p = 4, n = size / p, warp = threads(n, rand, 0.03);
    const fine = noise(size >> 1, rand), mottle = noise(7, rand);
    return (x, y) => {
      const d = (x + y) % (p * 2), h = Math.sin((Math.PI * (d + 0.5)) / (p * 2));
      return 0.7 + 0.22 * h + warp[((x - y + size) % size) >> 2] * 0.7 + (fine(x / size, y / size) - 0.5) * 0.09 + (mottle(x / size, y / size) - 0.5) * 0.07;
    };
  },
  // pebbled grain: distance to the two nearest random cell points gives the creases
  leather(size, rand) {
    const c = 44, pts = Float32Array.from({ length: c * c * 2 }, rand), fine = noise(size >> 1, rand), mottle = noise(6, rand);
    return (x, y) => {
      const u = (x / size) * c, v = (y / size) * c, i = Math.floor(u), j = Math.floor(v);
      let a = 9, b = 9;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const ci = (i + di + c) % c, cj = (j + dj + c) % c, k = (ci + cj * c) * 2;
        const d = Math.hypot(i + di + pts[k] - u, j + dj + pts[k + 1] - v);
        if (d < a) { b = a; a = d; } else if (d < b) b = d;
      }
      const crease = Math.min(1, (b - a) / 0.26);
      return 0.62 + 0.3 * crease * crease * (3 - 2 * crease) + (fine(x / size, y / size) - 0.5) * 0.05 + (mottle(x / size, y / size) - 0.5) * 0.12;
    };
  },
  // uncoated card: fibres and a soft cloudiness
  card(size, rand) {
    const a = noise(size >> 1, rand), b = noise(size >> 3, rand), c = noise(11, rand);
    return (x, y) => {
      const u = x / size, v = y / size;
      return 0.95 + (a(u, v) - 0.5) * 0.06 + (b(u, v) - 0.5) * 0.05 + (c(u, v) - 0.5) * 0.02;
    };
  },
  // the stack of pages: one line per sheet, darker gaps where the sewn sections meet
  pages(size, rand) {
    const sheets = Float32Array.from({ length: size }, () => 0.83 + rand() * 0.17);
    let next = 0;
    for (let x = 0; x < size; x++) {
      if (x >= next) { sheets[x] *= 0.62; if (x + 1 < size) sheets[x + 1] *= 0.8; next = x + 18 + Math.floor(rand() * 12); }
    }
    const along = noise(32, rand);
    return (x, y) => sheets[x] + (along(x / size, y / size) - 0.5) * 0.06;
  },
};

const made = new Map();
export function clothCanvas(kind, size = 512) {
  const key = `${kind}${size}`;
  if (made.has(key)) return made.get(key);
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d", { willReadFrequently: true }), img = g.createImageData(size, size), px = img.data;
  const f = MAKERS[kind](size, rng(4217 + kind.length * 991));
  for (let y = 0, o = 0; y < size; y++) for (let x = 0; x < size; x++, o += 4) {
    const v = Math.max(0, Math.min(1, f(x, y))) * 255;
    px[o] = px[o + 1] = px[o + 2] = v; px[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  made.set(key, c);
  return c;
}
