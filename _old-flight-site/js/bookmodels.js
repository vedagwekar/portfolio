// The books. Real bindings, built as cross-sections swept along the length of the book:
//   round     hardback with a rounded spine, a joint groove and a hollow fore-edge
//   flat      square-backed hardback
//   quarter   cloth spine with plain card boards
//   leather   thick rounded book with raised bands across the spine
//   paperback thin card wrap, no overhang
// Plain on purpose: one colour and a good surface. No lettering on the outside of any book.
import * as THREE from "three";
import { clothCanvas } from "./cloth.js?v=31";

export const CLOTH = { forest: "#3c5a49", oxblood: "#7d2f2b", navy: "#2c3c58", mustard: "#bd9440", plum: "#553a50", teal: "#34625f", charcoal: "#3b3c37", clay: "#a65d41", slate: "#66737a", sand: "#cdbf9e" };
const FONT = '"Schibsted Grotesk", system-ui, sans-serif';

export function tex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ---------- surfaces ----------
// world units per tile, how far the bump pushes, how shiny
const SURFACE = {
  linen: { tile: 12, bump: 0.05, rough: 0.92 },
  buckram: { tile: 10, bump: 0.04, rough: 0.82 },
  leather: { tile: 26, bump: 0.12, rough: 0.58 },
  card: { tile: 34, bump: 0.02, rough: 0.9 },
  pages: { tile: 9, bump: 0.05, rough: 1 },
};
let useBump = true;
export const setBump = (on) => { useBump = on; };
const tiles = new Map(), mats = new Map();
function tile(kind) {
  if (!tiles.has(kind)) {
    const t = new THREE.CanvasTexture(clothCanvas(kind));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.repeat.setScalar(1 / SURFACE[kind].tile);
    tiles.set(kind, t);
  }
  return tiles.get(kind);
}
function surface(kind, color) {
  const key = kind + color;
  if (!mats.has(key)) {
    const s = SURFACE[kind], map = tile(kind);
    mats.set(key, new THREE.MeshStandardMaterial({ color, map, roughness: s.rough, vertexColors: true, ...(useBump ? { bumpMap: map, bumpScale: s.bump } : {}) }));
  }
  return mats.get(key);
}

// ---------- sweep: closed 2D outline (counter-clockwise), pushed along z ----------
// outline points are [x, y, wear]; wear lightens the surface, as on rubbed corners.
// pick(midX, midY) can send a stretch of the outline to a second material.
function sweep(outline, L, { pick, capIsPages = false, wearEnds = 1 } = {}) {
  const n = outline.length, pos = [], nor = [], uv = [], col = [], groups = [[], []];
  const normals = outline.map((p, i) => {
    const q = outline[(i + 1) % n], dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy) || 1;
    return [dy / len, -dx / len, len];
  });
  const blend = (a, b) => {
    if (a[0] * b[0] + a[1] * b[1] < 0.72) return null;
    const x = a[0] + b[0], y = a[1] + b[1], l = Math.hypot(x, y) || 1;
    return [x / l, y / l];
  };
  const inset = Math.min(0.5, L * 0.02);
  const stations = [[-L / 2, 1], [-L / 2 + inset, 0], [L / 2 - inset, 0], [L / 2, 1]];
  const shade = (w) => 0.88 + 0.3 * w;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const a = outline[i], b = outline[(i + 1) % n], f = normals[i];
    const na = blend(normals[(i - 1 + n) % n], f) || f, nb = blend(f, normals[(i + 1) % n]) || f;
    const base = pos.length / 3;
    for (const [z, end] of stations) {
      for (const [p, nn, u] of [[a, na, s], [b, nb, s + f[2]]]) {
        pos.push(p[0], p[1], z); nor.push(nn[0], nn[1], 0); uv.push(u, z);
        const c = shade(Math.max(p[2] || 0, end * wearEnds * 0.7));
        col.push(c, c, c);
      }
    }
    const g = groups[pick && pick((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) ? 1 : 0];
    for (let j = 0; j < stations.length - 1; j++) {
      const v = base + j * 2;
      g.push(v, v + 1, v + 3, v, v + 3, v + 2);
    }
    s += f[2];
  }
  // end caps: the stack of pages reads as lines running across the head of the book
  const cont = outline.map((p) => new THREE.Vector2(p[0], p[1]));
  const faces = THREE.ShapeUtils.triangulateShape(cont, []);
  const capG = [];
  for (const sign of [1, -1]) {
    const base = pos.length / 3;
    for (const p of outline) {
      pos.push(p[0], p[1], (sign * L) / 2); nor.push(0, 0, sign);
      if (capIsPages) uv.push(p[1], p[0]); else uv.push(p[0], p[1]);
      const c = capIsPages ? 1 : shade(0.55);
      col.push(c, c, c);
    }
    for (const [a, b, c] of faces) {
      const A = outline[a], B = outline[b], C = outline[c];
      const area = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
      if ((area > 0) === (sign > 0)) capG.push(base + a, base + b, base + c); else capG.push(base + a, base + c, base + b);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  const all = [...groups[0], ...capG, ...groups[1]];
  geo.setIndex(all);
  geo.addGroup(0, groups[0].length + capG.length, 0);
  if (groups[1].length) geo.addGroup(groups[0].length + capG.length, groups[1].length, 1);
  return geo;
}

// ---------- cross-sections ----------
const spineX = (x0, b, y, T) => x0 - b * (1 - (2 * y / T) ** 2);
function spineArc(x0, b, T, n = 12) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const y = T / 2 - (i / n) * T;
    out.push([spineX(x0, b, y, T), y, i === 0 || i === n ? 0.6 : 0.12]);
  }
  return out;
}

// x along the board (spine on the left), y through the thickness.
// With hinged:true the top board is left off so it can be built separately and swing open.
function caseOutline({ W, T, k, b, g, gw, e, q = 0, hinged = false }) {
  const x0 = -W / 2, xi = x0 + k * 1.2, xf = W / 2, B = -T / 2, H = T / 2;
  const pts = [...spineArc(x0, b, T)];
  if (g) pts.push([x0 + gw * 0.35, B + g, 0], [x0 + gw * 0.7, B + g, 0]);
  pts.push([x0 + gw, B, 0.1]);
  if (q) pts.push([x0 + gw + q, B, 0]);
  pts.push([xf - e, B, 0.8], [xf, B + e, 1], [xf, B + k - e, 1], [xf - e, B + k, 0.6], [xi, B + k, 0], [xi, H - k, 0]);
  if (hinged) {
    pts.push([x0 + gw, H - k, 0]);
  } else {
    pts.push([xf - e, H - k, 0.6], [xf, H - k + e, 1], [xf, H - e, 1], [xf - e, H, 0.8]);
    if (q) pts.push([x0 + gw + q, H, 0]);
  }
  pts.push([x0 + gw, H, 0.1]);
  if (g) pts.push([x0 + gw * 0.7, H - g, 0], [x0 + gw * 0.35, H - g, 0]);
  return pts;
}

function blockOutline({ W, H, xs, xf, f }) {
  const pts = [[xs, -H], [xf, -H]];
  const n = 8;
  for (let i = 1; i < n; i++) {
    const t = -1 + (2 * i) / n;
    pts.push([xf - f * (1 - t * t), t * H]);
  }
  pts.push([xf, H], [xs, H]);
  return pts;
}

const BINDING = {
  round: (T) => ({ cloth: "linen", k: Math.min(1.1, T * 0.09), b: T * 0.17, g: 0.5, gw: 2.6, e: 0.14, sq: 1.1 }),
  flat: (T) => ({ cloth: "buckram", k: Math.min(1, T * 0.09), b: 0.08, g: 0.42, gw: 2.2, e: 0.12, sq: 1 }),
  quarter: (T) => ({ cloth: "linen", boards: "card", k: Math.min(1, T * 0.09), b: T * 0.09, g: 0.42, gw: 2.2, e: 0.12, sq: 1, q: 9 }),
  leather: (T) => ({ cloth: "leather", k: Math.min(1.3, T * 0.1), b: T * 0.2, g: 0.6, gw: 3, e: 0.28, sq: 1.2, bands: 4 }),
  paperback: () => ({ cloth: "card", k: 0.2, b: 0.05, g: 0.1, gw: 1.5, e: 0.04, sq: 0.04 }),
};
const PAPER = ["#efe6cf", "#f2ebd9", "#e7dabb", "#f6f1e3"];

// raised band across a leather spine
function band(x0, b, T, width) {
  const out = spineArc(x0 - 0.32, b, T * 0.98, 10).map(([x, y]) => [x, y, 0.5]);
  const back = spineArc(x0 + 0.5, b, T * 0.98, 10).reverse().map(([x, y]) => [x, y, 0]);
  return sweep([...out, ...back], width, { wearEnds: 0.5 });
}

// a closed book. kind picks the binding; w across the board, l head to tail, t thick.
export function solidBook({ kind = "round", w, l, t, color, paper = 0 }) {
  const c = BINDING[kind](t), x0 = -w / 2, g = new THREE.Group();
  const main = c.boards ? surface(c.boards, "#d9cfb6") : surface(c.cloth, color);
  const shellMats = c.q ? [main, surface(c.cloth, color)] : [main];
  const outline = caseOutline({ W: w, T: t, ...c });
  const pick = c.q ? (x) => x < x0 + c.gw + c.q : undefined;
  const shell = new THREE.Mesh(sweep(outline, l, { pick }), shellMats);
  const H = t / 2 - c.k, xs = x0 + c.k * 1.2 + 0.01, xf = w / 2 - c.sq;
  const edge = surface("pages", PAPER[paper % PAPER.length]);
  const block = new THREE.Mesh(sweep(blockOutline({ W: w, H, xs, xf, f: c.b * 0.75 }), l - 2 * c.sq, { capIsPages: true, wearEnds: 0 }), edge);
  g.add(shell, block);
  if (c.bands) for (let i = 1; i <= c.bands; i++) {
    const m = new THREE.Mesh(band(x0, c.b, t, 1.1), surface(c.cloth, color));
    m.position.z = (i / (c.bands + 1) - 0.5) * l;
    g.add(m);
  }
  return g;
}

function pagePrint(title, lines) {
  return tex(800, 1050, (g, w, h) => {
    g.drawImage(clothCanvas("card"), 0, 0, w, h);
    g.globalCompositeOperation = "multiply";
    g.fillStyle = "#f6efdd"; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "source-over";
    g.fillStyle = "#2a2b27"; g.textAlign = "center"; g.textBaseline = "alphabetic";
    g.font = `600 92px ${FONT}`; g.fillText(title, w / 2, 400);
    g.font = `400 52px ${FONT}`;
    lines.forEach((l, i) => g.fillText(l, w / 2, 510 + i * 76));
  });
}

// the five big chapter books: same construction, but the top board is on a hinge
export function openableBook({ w, l, t, color, ribbonColor, title, lines }) {
  const c = BINDING.round(t), x0 = -w / 2, g = new THREE.Group();
  const cloth = surface(c.cloth, color), { k } = c;
  g.add(new THREE.Mesh(sweep(caseOutline({ W: w, T: t, ...c, hinged: true }), l), cloth));

  const H = t / 2 - k, xs = x0 + k * 1.2 + 0.01, xf = w / 2 - c.sq, blockL = l - 2 * c.sq;
  const edge = surface("pages", PAPER[0]);
  g.add(new THREE.Mesh(sweep(blockOutline({ W: w, H, xs, xf, f: c.b * 0.75 }), blockL, { capIsPages: true, wearEnds: 0 }), edge));
  const pageW = xf - xs - 1.4;
  const print = new THREE.Mesh(new THREE.PlaneGeometry(pageW, blockL - 0.2), new THREE.MeshStandardMaterial({ map: pagePrint(title, lines), roughness: 1 }));
  print.rotation.x = -Math.PI / 2;
  print.position.set(xs + 1.4 + pageW / 2, H + 0.03, 0);
  g.add(print);

  // the hinged board, drawn from the groove outwards
  const Wb = w - c.gw, e = c.e, y = k / 2;
  const hinge = new THREE.Group();
  hinge.position.set(x0 + c.gw, t / 2 - k / 2, 0);
  const board = new THREE.Mesh(sweep([[0, -y, 0], [Wb - e, -y, 0.6], [Wb, -y + e, 1], [Wb, y - e, 1], [Wb - e, y, 0.8], [0, y, 0]], l), cloth);
  hinge.add(board);
  // plain endpaper on the inside of the board
  const inside = new THREE.Mesh(new THREE.PlaneGeometry(Wb - 1.2, l - 1.6), surface("card", "#f6efdd"));
  inside.geometry.setAttribute("color", new THREE.Float32BufferAttribute(new Array(inside.geometry.attributes.position.count * 3).fill(1), 3));
  inside.rotation.x = Math.PI / 2;
  inside.position.set(Wb / 2, -y - 0.03, 0);
  hinge.add(inside);
  g.add(hinge);

  const ribbonGeo = new THREE.PlaneGeometry(2.2, 26, 1, 14);
  const ribbon = new THREE.Mesh(ribbonGeo, new THREE.MeshLambertMaterial({ color: ribbonColor, side: THREE.DoubleSide }));
  ribbon.position.set(4, -2, blockL / 2 + 0.3);
  g.add(ribbon);
  ribbonGeo.translate(0, -13, 0);
  return { group: g, hinge, ribbon, base: ribbonGeo.attributes.position.array.slice() };
}
