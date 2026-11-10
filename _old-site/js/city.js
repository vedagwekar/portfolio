// The night city: an endless avenue that builds itself ahead of the hero and recycles behind.
// Everything is procedural (canvas textures + merged geometry), so there are no asset downloads.
//
//   const city = createCity(scene, renderer, { STREET, SPAN });
//   city.fill(heroZ); city.buildingAt(side, z); city.update(dt, t, heroPos, camera);
//
// A building's `h` is the height of its flush street facade: webs only stick below that.
// Setback towers, crowns and spires rise above it.

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

let seed = 1234;
const rnd = (a = 0, b = 1) => a + ((seed = (seed * 16807) % 2147483647) / 2147483647) * (b - a);
const pick = (arr) => arr[Math.floor(rnd(0, arr.length))];

// ------------------------------------------------------------------ facade textures
// One tile = 8 bays x 16 floors. UVs are in world metres / tile size, so every building shares
// a material per style and windows stay the same size whatever the building's dimensions.
const BAY = 3.2, FLOOR = 3.6, BAYS = 8, FLOORS = 16;
const TILE_W = BAY * BAYS, TILE_H = FLOOR * FLOORS;
const PX = 1024, CW = PX / BAYS, CH = PX / FLOORS; // cell size in px (128 x 64)

const STYLES = {
  glass:    { wall: "#1b2234", glass: [205, 30, 14], lit: 0.3, warm: 0.35, rough: 0.9, metal: 0.25 },
  brick:    { wall: "#3b2522", glass: [220, 25, 9], lit: 0.42, warm: 0.9, rough: 0.95, metal: 0.0 },
  deco:     { wall: "#34323a", glass: [215, 20, 10], lit: 0.34, warm: 0.75, rough: 0.85, metal: 0.05 },
  concrete: { wall: "#262a33", glass: [210, 25, 11], lit: 0.3, warm: 0.55, rough: 0.9, metal: 0.05 },
};

function windowRects(style, bx, fy) {
  // returns the window rectangles inside one bay/floor cell, in px
  const x = bx * CW, y = fy * CH;
  switch (style) {
    case "glass":    return [[x + 3, y + 3, CW - 6, CH - 14]];
    case "brick":    return [[x + 22, y + 12, 34, 40], [x + 72, y + 12, 34, 40]];
    case "deco":     return [[x + 40, y + 8, 48, 48]];
    case "concrete": return [[x + 2, y + 20, 60, 26], [x + 66, y + 20, 60, 26]];
  }
}

function facadeTextures(name) {
  const st = STYLES[name];
  const mk = () => { const c = document.createElement("canvas"); c.width = c.height = PX; return [c, c.getContext("2d")]; };
  const [cA, a] = mk(), [cE, e] = mk(), [cR, r] = mk();
  // base wall + grain
  a.fillStyle = st.wall; a.fillRect(0, 0, PX, PX);
  for (let i = 0; i < 9000; i++) {
    a.fillStyle = `rgba(${rnd() < 0.5 ? "255,255,255" : "0,0,0"},${rnd(0.01, 0.05)})`;
    a.fillRect(rnd(0, PX), rnd(0, PX), rnd(1, 3), rnd(1, 3));
  }
  e.fillStyle = "#000"; e.fillRect(0, 0, PX, PX);
  r.fillStyle = `rgb(0,${Math.round(st.rough * 255)},${Math.round(st.metal * 255)})`; r.fillRect(0, 0, PX, PX);

  // style structure: slabs, piers, brick courses
  if (name === "brick") {
    a.globalAlpha = 0.12; a.fillStyle = "#000";
    for (let y = 0; y < PX; y += 6) for (let x = (y / 6) % 2 ? 0 : 7; x < PX; x += 14) a.fillRect(x, y, 1, 6);
    for (let y = 0; y < PX; y += 6) a.fillRect(0, y, PX, 1);
    a.globalAlpha = 1;
  }
  if (name === "deco") {
    a.fillStyle = "rgba(255,240,220,.07)";
    for (let bx = 0; bx < BAYS; bx++) a.fillRect(bx * CW + 14, 0, 18, PX), a.fillRect(bx * CW + 96, 0, 18, PX);
  }
  for (let fy = 0; fy < FLOORS; fy++) {
    // floor slab line
    a.fillStyle = "rgba(0,0,0,.35)"; a.fillRect(0, fy * CH + CH - 8, PX, 3);
    a.fillStyle = "rgba(255,255,255,.04)"; a.fillRect(0, fy * CH + CH - 5, PX, 2);
    // lit runs: whole floors of an office tend to be on together
    const floorBias = rnd() < 0.22 ? 0.45 : rnd() < 0.3 ? -0.2 : 0;
    const warmFloor = rnd() < st.warm;
    for (let bx = 0; bx < BAYS; bx++) {
      for (const [wx, wy, ww, wh] of windowRects(name, bx, fy)) {
        // glass + frame
        const [hh, ss, ll] = st.glass;
        const g = a.createLinearGradient(0, wy, 0, wy + wh);
        g.addColorStop(0, `hsl(${hh},${ss}%,${ll + rnd(2, 9)}%)`);
        g.addColorStop(1, `hsl(${hh},${ss}%,${ll}%)`);
        a.fillStyle = "rgba(0,0,0,.55)"; a.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
        a.fillStyle = g; a.fillRect(wx, wy, ww, wh);
        if (name === "brick" || name === "deco") { a.fillStyle = "rgba(220,210,190,.18)"; a.fillRect(wx - 4, wy + wh + 2, ww + 8, 4); }
        if (name === "glass") { a.fillStyle = "rgba(160,190,255,.06)"; a.fillRect(wx, wy, ww * 0.35, wh); }
        r.fillStyle = "rgb(0,40,210)"; r.fillRect(wx, wy, ww, wh);
        // lit?
        if (rnd() < st.lit + floorBias) {
          const warm = rnd() < 0.8 ? warmFloor : !warmFloor;
          const col = warm ? pick(["255,196,120", "255,214,150", "255,170,90"]) : pick(["190,215,255", "220,235,255", "150,190,255"]);
          const k = rnd(0.45, 1);
          const lg = e.createLinearGradient(0, wy, 0, wy + wh);
          lg.addColorStop(0, `rgba(${col},${k})`);
          lg.addColorStop(1, `rgba(${col},${k * 0.55})`);
          e.fillStyle = lg; e.fillRect(wx, wy, ww, wh);
          a.fillStyle = `rgba(${col},.35)`; a.fillRect(wx, wy, ww, wh);
          // blinds / furniture / the occasional person
          const deco = rnd();
          e.fillStyle = "rgba(0,0,0,.45)";
          if (deco < 0.3) for (let yy = wy + 2; yy < wy + wh * rnd(0.3, 0.9); yy += 4) e.fillRect(wx, yy, ww, 2);
          else if (deco < 0.45) e.fillRect(wx + rnd(0, ww - 10), wy + wh * 0.35, rnd(5, 9), wh * 0.65);
          else if (deco < 0.6) e.fillRect(wx, wy + wh * 0.7, ww, wh * 0.3);
        }
      }
      if (name === "glass") { a.fillStyle = "#2c3854"; a.fillRect(bx * CW, 0, 2, PX); }
    }
  }
  // keep the left edge column plain wall: roofs/sides sample it
  a.fillStyle = "#11131c"; a.fillRect(0, 0, 2, 2);

  const tex = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    return t;
  };
  return new THREE.MeshStandardMaterial({
    map: tex(cA, true), emissiveMap: tex(cE, true), emissive: "#ffffff", emissiveIntensity: 1.25,
    roughnessMap: tex(cR), metalnessMap: tex(cR), roughness: 1, metalness: 1, envMapIntensity: 1.4,
  });
}

// ------------------------------------------------------------------ signs
const SIGNS = [
  ["ZEROPILOT", "flight software that stays up", "#3df2ff"],
  ["STOIC COFFEE", "amor fati · open late", "#ffb347"],
  ["PIT WALL", "box, box, box", "#ff3d6e"],
  ["MEMENTO MORI", "so make it count", "#e8e8ff"],
  ["CETR INDEX", "who pays for the transition", "#9dff7a"],
  ["THWIP & CO.", "web fluid, wholesale", "#ff4b4b"],
  ["WATERLOO", "math · since 1957", "#ffd84a"],
  ["NIGHT SHIFT", "ramen · 24h", "#b18cff"],
];
const BLADES = [["HOTEL", "#ff3d6e"], ["BOOKS", "#ffb347"], ["RAMEN", "#3df2ff"], ["ARCADE", "#b18cff"], ["JAZZ", "#ffd84a"], ["OPEN", "#ff4b4b"], ["DINER", "#9dff7a"]];
const NEON = ["#ff3d6e", "#3df2ff", "#ffb347", "#b18cff", "#ff4b4b", "#ffd84a"];

function drawBillboard(c, [title, sub, col]) {
  const g = c.getContext("2d");
  g.fillStyle = "#07080d"; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = col; g.lineWidth = 6; g.globalAlpha = 0.5; g.strokeRect(14, 14, c.width - 28, c.height - 28); g.globalAlpha = 1;
  g.textAlign = "center"; g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 24;
  g.font = `700 ${title.length > 10 ? 76 : 92}px Inter, Helvetica, Arial, sans-serif`;
  g.fillText(title, c.width / 2, c.height * 0.56);
  g.shadowBlur = 0; g.globalAlpha = 0.75; g.fillStyle = "#f2f2f2";
  g.font = `500 30px "JetBrains Mono", Menlo, monospace`;
  g.fillText(sub, c.width / 2, c.height * 0.82);
  g.globalAlpha = 1;
}
function drawBlade(c, [word, col]) {
  const g = c.getContext("2d");
  g.fillStyle = "#08080c"; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 20; g.textAlign = "center";
  g.font = `800 92px Inter, Helvetica, Arial, sans-serif`;
  const step = (c.height - 60) / word.length;
  [...word].forEach((ch, i) => g.fillText(ch, c.width / 2, 92 + i * step));
}
function signMaterials(list, w, h, draw) {
  return list.map((s) => {
    const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c, s);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const m = new THREE.MeshBasicMaterial({ map: t, toneMapped: false, color: new THREE.Color(1.5, 1.5, 1.5) });
    m.userData.redraw = () => { draw(c, s); t.needsUpdate = true; };
    return m;
  });
}

// ------------------------------------------------------------------ geometry helpers
function box(w, h, d, x, y, z) { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; }
function facadeBox(w, h, d, x, y, z, uOff) {
  const g = box(w, h, d, x, y, z);
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const nx = n.getX(i), ny = n.getY(i);
    if (Math.abs(ny) > 0.5) uv.setXY(i, 0.0005, 0.0005);
    else if (Math.abs(nx) > 0.5) uv.setXY(i, p.getZ(i) / TILE_W + uOff, p.getY(i) / TILE_H);
    else uv.setXY(i, p.getX(i) / TILE_W + uOff, p.getY(i) / TILE_H);
  }
  return g;
}
function tint(g, hex, k = 1) {
  const c = new THREE.Color(hex).multiplyScalar(k), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  g.setAttribute("color", new THREE.BufferAttribute(a, 3));
  return g;
}
const cyl = (rt, rb, h, x, y, z, seg = 12) => { const g = new THREE.CylinderGeometry(rt, rb, h, seg); g.translate(x, y, z); return g; };

// ------------------------------------------------------------------ the city
export function createCity(scene, renderer, { STREET = 16, SPAN = 420 } = {}) {
  const facadeMats = Object.fromEntries(Object.keys(STYLES).map((k) => [k, facadeTextures(k)]));
  const trimMat = new THREE.MeshStandardMaterial({ color: "#151826", roughness: 0.8, metalness: 0.3 });
  const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const beaconMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.25, 0.2), toneMapped: false });
  const boards = signMaterials(SIGNS, 768, 288, drawBillboard);
  const blades = signMaterials(BLADES, 160, 640, drawBlade);
  document.fonts?.ready.then(() => [...boards, ...blades].forEach((m) => m.userData.redraw()));

  // ---- atmosphere ------------------------------------------------
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(520, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec3 vDir; uniform float uTime;
        void main(){
          float h = vDir.y;
          vec3 zen = vec3(0.012, 0.016, 0.045), mid = vec3(0.06, 0.06, 0.14), hor = vec3(0.24, 0.12, 0.22);
          vec3 c = mix(hor, mid, smoothstep(-0.02, 0.22, h));
          c = mix(c, zen, smoothstep(0.22, 0.85, h));
          c += vec3(1.0, 0.42, 0.22) * 0.22 * exp(-abs(h) * 11.0);           // sodium glow off the city
          c += vec3(0.4, 0.5, 1.0) * 0.05 * exp(-abs(h - 0.08) * 6.0);
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  sky.renderOrder = -10;
  scene.add(sky);
  scene.background = new THREE.Color("#05060d");
  scene.fog = new THREE.FogExp2("#1c1530", 0.0088);

  // environment map: the same sky plus a scatter of lit windows, so glass and the suit pick up reflections
  {
    const env = new THREE.Scene();
    env.add(sky.clone());
    const em = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.6, 1.1) });
    const ec = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 1.3, 2.4) });
    for (let i = 0; i < 70; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(rnd(2, 8), rnd(1, 4)), rnd() < 0.7 ? em : ec);
      const a = rnd(0, Math.PI * 2), y = rnd(-10, 30);
      m.position.set(Math.cos(a) * 60, y, Math.sin(a) * 60); m.lookAt(0, y, 0);
      env.add(m);
    }
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0.02).texture;
    scene.environmentIntensity = 0.55;
    pm.dispose();
  }

  // searchlights sweeping the cloud deck
  const beamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide,
    vertexShader: `varying float vY; varying vec3 vN; varying vec3 vV;
      void main(){ vY = uv.y; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vY; varying vec3 vN; varying vec3 vV;
      void main(){ float edge = pow(abs(dot(vN, vV)), 1.6); float a = (1.0 - vY) * (1.0 - vY) * 0.05 * edge; gl_FragColor = vec4(vec3(0.75,0.82,1.0) * a, a); }`,
  });
  const beams = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.CylinderGeometry(22, 1.2, 420, 24, 1, true);
    g.translate(0, 210, 0);
    const b = new THREE.Mesh(g, beamMat);
    b.userData = { x: (i - 1) * 170 + rnd(-20, 20), dz: -330 - i * 70, ph: rnd(0, 6), sp: rnd(0.12, 0.22) };
    scene.add(b); beams.push(b);
  }

  // drifting dust/embers around the camera
  const MOTES = 500, moteBox = new THREE.Vector3(70, 46, 110);
  const moteGeo = new THREE.BufferGeometry(), mp = new Float32Array(MOTES * 3), mv = [];
  for (let i = 0; i < MOTES; i++) { mp.set([rnd(-1, 1) * moteBox.x, rnd(0, 1) * moteBox.y, rnd(-1, 1) * moteBox.z], i * 3); mv.push(rnd(-0.3, 0.3), rnd(0.05, 0.4)); }
  moteGeo.setAttribute("position", new THREE.BufferAttribute(mp, 3));
  const dot = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d");
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.25, "rgba(255,255,255,.5)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t; })();
  const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({ map: dot, size: 0.35, color: "#ffd9b0", transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
  motes.frustumCulled = false;
  scene.add(motes);

  // ---- street ------------------------------------------------------
  const asphalt = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 512; const g = c.getContext("2d");
    g.fillStyle = "#16171d"; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 26000; i++) { const v = rnd(10, 48); g.fillStyle = `rgba(${v},${v},${v + 4},${rnd(0.15, 0.6)})`; g.fillRect(rnd(0, 512), rnd(0, 512), 1.5, 1.5); }
    g.strokeStyle = "rgba(0,0,0,.5)"; g.lineWidth = 1.2;
    for (let i = 0; i < 14; i++) { g.beginPath(); let x = rnd(0, 512), y = rnd(0, 512); g.moveTo(x, y); for (let k = 0; k < 6; k++) g.lineTo(x += rnd(-30, 30), y += rnd(-30, 30)); g.stroke(); }
    // puddles: darker + glossier patches (drawn into alpha of a second map below)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 80); t.anisotropy = 8; return t;
  })();
  const wet = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d");
    g.fillStyle = "rgb(0,170,120)"; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 18; i++) { const r = g.createRadialGradient(0, 0, 0, 0, 0, 1); g.save(); g.translate(rnd(0, 256), rnd(0, 256)); g.scale(rnd(14, 40), rnd(8, 22));
      r.addColorStop(0, "rgb(0,25,240)"); r.addColorStop(1, "rgba(0,170,120,0)"); g.fillStyle = r; g.beginPath(); g.arc(0, 0, 1, 0, 7); g.fill(); g.restore(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 40); return t;
  })();
  const road = new THREE.Mesh(new THREE.PlaneGeometry(STREET * 2, 1600),
    new THREE.MeshStandardMaterial({ map: asphalt, roughnessMap: wet, metalnessMap: wet, roughness: 1, metalness: 1, envMapIntensity: 1.6 }));
  road.rotation.x = -Math.PI / 2;
  scene.add(road);
  // sidewalks + curbs, and dark ground beyond so alleys don't show the void
  const walkMat = new THREE.MeshStandardMaterial({ color: "#2a2c34", roughness: 0.9 });
  const walks = [-1, 1].map((s) => { const m = new THREE.Mesh(box(4.2, 0.3, 1600, s * (STREET - 2.1), 0.15, 0), walkMat); scene.add(m); return m; });
  const under = new THREE.Mesh(new THREE.PlaneGeometry(600, 1600), new THREE.MeshStandardMaterial({ color: "#0a0b10", roughness: 1 }));
  under.rotation.x = -Math.PI / 2; under.position.y = -0.05; scene.add(under);
  // lane paint
  const paint = new THREE.MeshBasicMaterial({ color: "#8a8a7a", transparent: true, opacity: 0.55 });
  const yellow = new THREE.MeshBasicMaterial({ color: "#c89a2a", transparent: true, opacity: 0.7 });
  const centre = new THREE.Group();
  for (const x of [-0.18, 0.18]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 1600), yellow); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.02, 0); centre.add(l); }
  scene.add(centre);
  const DASHES = 140, dashes = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.18, 3.2).rotateX(-Math.PI / 2), paint, DASHES * 2);
  scene.add(dashes);

  // street lamps: pole + arm (trim), head (glow), pool of light on the ground
  const LAMP_GAP = 26, LAMPS = 30;
  const poleGeo = mergeGeometries([cyl(0.12, 0.16, 8, 0, 4, 0, 8), box(2.4, 0.14, 0.14, -1.1, 8, 0)]);
  const lampPoles = new THREE.InstancedMesh(poleGeo, trimMat, LAMPS);
  const lampHeads = new THREE.InstancedMesh(box(0.9, 0.18, 0.5, -2.1, 7.9, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.2, 1.3), toneMapped: false }), LAMPS);
  const poolTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, "rgba(255,190,120,.9)"); r.addColorStop(0.5, "rgba(255,160,90,.25)"); r.addColorStop(1, "rgba(255,160,90,0)");
    g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(13, 13).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 }), LAMPS);
  scene.add(lampPoles, lampHeads, pools);

  // traffic
  const CARS = 46;
  const carBody = new THREE.InstancedMesh(mergeGeometries([box(1.9, 0.7, 4.4, 0, 0.55, 0), box(1.6, 0.55, 2.2, 0, 1.15, 0.2)]),
    new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.7, envMapIntensity: 1.5 }), CARS);
  const lightGeo = mergeGeometries([box(0.4, 0.14, 0.05, -0.65, 0.65, 0), box(0.4, 0.14, 0.05, 0.65, 0.65, 0)]);
  const heads = new THREE.InstancedMesh(lightGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.6, 3), toneMapped: false }), CARS);
  const tails = new THREE.InstancedMesh(lightGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(3.5, 0.15, 0.1), toneMapped: false }), CARS);
  const carData = [];
  const paints = ["#0d0f14", "#1b2a4a", "#5a0f14", "#c8c8cc", "#2b2b30", "#e0b000", "#18322a"];
  for (let i = 0; i < CARS; i++) {
    const dir = i % 2 ? -1 : 1; // -1 = with the hero (down the avenue), +1 = oncoming
    const lane = dir < 0 ? pick([-3, -8.5]) : pick([3, 8.5]);
    carData.push({ x: lane, z: -rnd(-60, 900), v: dir * rnd(9, 17), dir });
    carBody.setColorAt(i, new THREE.Color(i % 9 === 0 ? "#e0b000" : pick(paints))); // the odd yellow cab
  }
  scene.add(carBody, heads, tails);

  // ---- buildings ---------------------------------------------------
  const buildings = [];   // front row (anchorable): {side, z0, z1, h, meshes[]}
  const backs = [];       // skyline row behind it
  const nextZ = { "-1": 30, "1": 30 }, nextBack = { "-1": 30, "1": 30 };

  function clear(b) {
    for (const m of b.meshes) { scene.remove(m); m.traverse((o) => o.geometry?.dispose()); }
    b.meshes.length = 0;
  }
  function emit(b, parts, mat) { if (!parts.length) return; const m = new THREE.Mesh(mergeGeometries(parts), mat); scene.add(m); b.meshes.push(m); }

  function build(b, side, zStart, back = false) {
    clear(b);
    const style = pick(back ? ["glass", "glass", "concrete", "deco"] : ["glass", "brick", "deco", "concrete", "brick"]);
    const len = back ? rnd(18, 34) : rnd(14, 28);
    const depth = back ? rnd(20, 36) : rnd(16, 26);
    const h = back ? rnd(90, 210) : style === "brick" ? rnd(40, 70) : rnd(55, 120);
    const x0 = side * (back ? STREET + rnd(34, 60) : STREET);   // street-facing face
    const cx = x0 + side * depth / 2, cz = zStart - len / 2, uOff = rnd(0, 1);
    b.side = side; b.z1 = zStart; b.z0 = zStart - len; b.h = h; b.style = style;

    const F = [], T = [], E = [], B = [];
    F.push(facadeBox(depth, h, len, cx, h / 2, cz, uOff));
    let top = h, tw = depth, tl = len, tx = cx;
    // setbacks: glass and deco towers step back as they rise
    const tiers = style === "deco" ? 2 : style === "glass" ? (rnd() < 0.6 ? 1 : 0) : 0;
    for (let i = 0; i < tiers; i++) {
      T.push(box(tw + 0.6, 0.8, tl + 0.6, tx, top + 0.4, cz));
      tw *= rnd(0.62, 0.78); tl *= rnd(0.62, 0.78); tx = x0 + side * (depth - tw / 2 - (depth - tw) * 0.3);
      const th = rnd(10, 30) * (back ? 1.4 : 1);
      F.push(facadeBox(tw, th, tl, tx, top + th / 2, cz, uOff + 0.37));
      top += th;
    }
    // cornices and floor ledges on the street face
    if (!back) {
      const every = style === "glass" ? 0 : Math.round(rnd(4, 7));
      if (every) for (let f = every; f * FLOOR < h - 4; f += every)
        T.push(box(0.5, 0.35, len, x0 - side * 0.25, f * FLOOR - 0.3, cz));
      T.push(box(1.2, 1.1, len + 0.6, x0 - side * 0.4, h - 0.2, cz));          // crown cornice
      // storefront: lit window band, awning, neon strip
      const sf = tint(box(0.1, 2.8, len - 1.5, x0 - side * 0.06, 1.75, cz), "#ffcf9a", 0.55);
      E.push(sf);
      T.push(box(1.6, 0.18, len - 1, x0 - side * 0.8, 3.55, cz));
      E.push(tint(box(0.08, 0.12, len - 1, x0 - side * 1.6, 3.5, cz), pick(NEON), 2.6));
    }
    // roof parapet
    const py = top + 0.6;
    T.push(box(tw, 1.2, 0.4, tx, py, cz - tl / 2 + 0.2), box(tw, 1.2, 0.4, tx, py, cz + tl / 2 - 0.2),
           box(0.4, 1.2, tl, tx - tw / 2 + 0.2, py, cz), box(0.4, 1.2, tl, tx + tw / 2 - 0.2, py, cz));
    // rooftop clutter
    if (style === "brick" || style === "concrete" || rnd() < 0.25) {          // water tower
      const wx = tx + rnd(-tw / 4, tw / 4), wz = cz + rnd(-tl / 4, tl / 4);
      for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) T.push(cyl(0.1, 0.1, 3, wx + lx, top + 1.5, wz + lz, 5));
      T.push(cyl(1.7, 1.7, 3.2, wx, top + 4.6, wz, 14), (() => { const g = new THREE.ConeGeometry(1.9, 1.3, 14); g.translate(wx, top + 6.85, wz); return g; })());
    }
    for (let i = 0, n = Math.floor(rnd(1, 4)); i < n; i++)                  // HVAC units
      T.push(box(rnd(1.5, 3), rnd(1, 1.8), rnd(1.5, 3), tx + rnd(-tw / 3, tw / 3), top + 0.7, cz + rnd(-tl / 3, tl / 3)));
    if (style === "deco" || (style === "glass" && rnd() < 0.5) || back) {   // spire / mast + beacon
      const mh = style === "deco" ? rnd(12, 24) : rnd(6, 16);
      if (style === "deco") { const g = new THREE.ConeGeometry(Math.min(tw, tl) * 0.22, mh, 8); g.translate(tx, top + mh / 2, cz); T.push(g); }
      else T.push(cyl(0.12, 0.2, mh, tx, top + mh / 2, cz, 6));
      B.push(box(0.6, 0.6, 0.6, tx, top + mh + 0.2, cz));
    }
    emit(b, F, facadeMats[style]);
    emit(b, T, trimMat);
    emit(b, E, glowMat);
    emit(b, B, beaconMat);

    // billboards on some roofs and blade signs on some facades
    if (!back && rnd() < 0.3 && len > 14) {
      const bw = Math.min(len - 2, 12), bh = bw * 0.375;
      const frame = new THREE.Mesh(mergeGeometries([
        box(0.3, bh + 0.4, bw + 0.4, x0 + side * 1.4, top + 2.5 + bh / 2, cz),
        cyl(0.12, 0.12, 2.5, x0 + side * 1.6, top + 1.25, cz - bw / 3, 5), cyl(0.12, 0.12, 2.5, x0 + side * 1.6, top + 1.25, cz + bw / 3, 5)]), trimMat);
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), pick(boards));
      panel.position.set(x0 + side * 1.2, top + 2.5 + bh / 2, cz); panel.rotation.y = -side * Math.PI / 2;
      scene.add(frame, panel); b.meshes.push(frame, panel);
    }
    if (!back && rnd() < 0.35) {
      const sh = rnd(7, 11), sy = rnd(7, Math.min(16, h - sh - 2)), sz = cz + rnd(-len / 3, len / 3);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, sh), pick(blades));
      sign.position.set(x0 - side * 1.3, sy + sh / 2, sz);
      const back2 = sign.clone(); back2.rotation.y = Math.PI;
      const g = new THREE.Group(); g.add(sign, back2);
      const arm = new THREE.Mesh(box(1.4, 0.12, 0.12, x0 - side * 0.7, sy + sh - 0.3, sz), trimMat);
      scene.add(g, arm); b.meshes.push(g, arm);
    }
    const gap = back ? rnd(1, 8) : rnd() < 0.3 ? rnd(9, 14) : rnd(0.5, 3);   // cross streets now and then
    return b.z0 - gap;
  }

  function fill(heroZ) {
    for (const [list, next, back] of [[buildings, nextZ, false], [backs, nextBack, true]]) {
      for (const side of [-1, 1]) {
        for (const b of list) if (b.side === side && b.z0 > heroZ + 70) { clear(b); next[side] = build(b, side, next[side], back); }
        while (next[side] > heroZ - SPAN * (back ? 1.15 : 1)) {
          const b = { meshes: [] };
          list.push(b);
          next[side] = build(b, side, next[side], back);
        }
      }
    }
  }
  function buildingAt(side, z) {
    for (const b of buildings) if (b.side === side && z <= b.z1 && z >= b.z0) return b;
    return null;
  }

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), flipY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
  function update(dt, t, hero, cam) {
    fill(hero.z);
    sky.position.copy(cam.position);
    // ground layers follow, snapped to their texture period so nothing swims
    road.position.z = Math.round(hero.z / 20) * 20 - 500;
    under.position.z = road.position.z;
    for (const w of walks) w.position.z = road.position.z;
    centre.position.z = road.position.z;
    const dz0 = Math.floor(hero.z / 8) * 8 + 60;
    for (let i = 0; i < DASHES; i++) for (const s of [0, 1]) {
      m4.makeTranslation(s ? STREET * 0.36 : -STREET * 0.36, 0.02, dz0 - i * 8);
      dashes.setMatrixAt(i * 2 + s, m4);
    }
    dashes.instanceMatrix.needsUpdate = true;
    const lz0 = Math.ceil(hero.z / LAMP_GAP) * LAMP_GAP + 60;
    for (let i = 0; i < LAMPS; i++) {
      const s = i % 2 ? 1 : -1, z = lz0 - Math.floor(i / 2) * LAMP_GAP - (s > 0 ? LAMP_GAP / 2 : 0);
      m4.compose(v3.set(s * (STREET - 0.8), 0, z), s > 0 ? q.identity() : flipY, one);
      lampPoles.setMatrixAt(i, m4); lampHeads.setMatrixAt(i, m4);
      m4.makeTranslation(s * (STREET - 3.2), 0.03, z); pools.setMatrixAt(i, m4);
    }
    lampPoles.instanceMatrix.needsUpdate = lampHeads.instanceMatrix.needsUpdate = pools.instanceMatrix.needsUpdate = true;

    carData.forEach((c, i) => {
      c.z += c.v * dt;
      if (c.z > hero.z + 70) c.z -= 760;
      if (c.z < hero.z - 690) c.z += 760;
      m4.compose(v3.set(c.x, 0, c.z), c.dir < 0 ? q.identity() : flipY, one); carBody.setMatrixAt(i, m4);
      m4.makeTranslation(c.x, 0, c.z - 2.21); (c.dir < 0 ? heads : tails).setMatrixAt(i, m4);
      m4.makeTranslation(c.x, 0, c.z + 2.21); (c.dir < 0 ? tails : heads).setMatrixAt(i, m4);
    });
    carBody.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = tails.instanceMatrix.needsUpdate = true;

    beaconMat.color.setRGB(Math.sin(t * 3) > 0.55 ? 3 : 0.25, 0.12, 0.1);
    for (const b of beams) {
      const u = b.userData;
      b.position.set(u.x, 0, hero.z + u.dz);
      b.rotation.set(Math.sin(t * u.sp + u.ph) * 0.45, 0, Math.cos(t * u.sp * 0.8 + u.ph) * 0.35);
    }
    // motes: drift, wrap around a box centred on the camera
    const p = moteGeo.attributes.position.array;
    for (let i = 0; i < MOTES; i++) {
      let x = p[i * 3] + mv[i * 2] * dt, y = p[i * 3 + 1] + mv[i * 2 + 1] * dt, z = p[i * 3 + 2];
      const ox = x - cam.position.x, oy = y - (cam.position.y - moteBox.y / 2), oz = z - cam.position.z;
      if (ox > moteBox.x) x -= 2 * moteBox.x; else if (ox < -moteBox.x) x += 2 * moteBox.x;
      if (oy > moteBox.y) y -= moteBox.y; else if (oy < 0) y += moteBox.y;
      if (oz > moteBox.z) z -= 2 * moteBox.z; else if (oz < -moteBox.z) z += 2 * moteBox.z;
      p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z;
    }
    moteGeo.attributes.position.needsUpdate = true;
  }

  return { buildings, fill, buildingAt, update, STREET };
}
