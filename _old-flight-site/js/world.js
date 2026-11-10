// The flyable bit: you're a paper plane in a sky full of giant books.
// Five big books are chapters of the site; they fall open when you fly over them.
// Loose pages hang along the dotted route and hold little margin notes.
import * as THREE from "three";
import { CLOTH, solidBook, openableBook, tex, setBump } from "./bookmodels.js?v=31";

const INK = 0x20231f;
const COLORS = { oxblood: "#8a2f2b", ochre: "#c4923a", cream: "#f6efdd" };

// seeded so the sky is the same every visit
let seed = 7;
const rnd = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + ((seed - 1) / 2147483646) * (b - a); };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = THREE.MathUtils.clamp;
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

// ---------- toon materials: three flat tones, like a risograph print ----------
const ramp = new THREE.DataTexture(new Uint8Array([188, 232, 255]), 3, 1, THREE.RedFormat);
ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
ramp.needsUpdate = true;
const toon = (o) => new THREE.MeshToonMaterial({ gradientMap: ramp, ...o });

function paperPlane(color = COLORS.oxblood) {
  const v = (x, y, z) => [x, y, z];
  // a folded dart: long nose, wings raised either side of a centre crease
  const nose = v(0, 0, -8), tl = v(-2.7, 1.2, 3.2), tr = v(2.7, 1.2, 3.2), c = v(0, -0.2, 3.2), keel = v(0, -1, 2.6);
  const tris = [nose, c, tl, nose, tr, c, nose, keel, c, nose, c, keel].flat();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(tris, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, toon({ color, side: THREE.DoubleSide }));
  m.scale.setScalar(1.05);
  m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), new THREE.LineBasicMaterial({ color: INK })));
  return m;
}

// ---------- the world ----------
export function createWorld(canvas, { chapters, pages, mobile, reduced, onChapter, onPage, onAssist }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const HORIZON = 0xe6e2d1;
  scene.fog = new THREE.Fog(HORIZON, 190, 640);
  const camera = new THREE.PerspectiveCamera(mobile ? 68 : 58, 1, 2, 2600);

  scene.add(new THREE.HemisphereLight(0xfbf6e6, 0xa9bcae, 2.0));
  const sun = new THREE.DirectionalLight(0xfff3dc, 2.1);
  sun.position.set(120, 220, 90);
  if (!mobile) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -230, right: 230, top: 230, bottom: -230, near: 10, far: 620 });
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.6;
  }
  scene.add(sun);

  // sky: pale sage overhead, warm bone at the horizon, a low soft sun
  const skyBall = new THREE.Mesh(new THREE.SphereGeometry(1200, 32, 20), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `varying vec3 vP;
      void main(){
        vec3 d = normalize(vP);
        float h = clamp(d.y*1.7+.08, 0., 1.);
        vec3 c = mix(vec3(.902,.886,.82), vec3(.56,.69,.64), pow(h,.8));
        float s = max(dot(d, normalize(vec3(.55,.24,.35))), 0.);
        c += vec3(.16,.12,.05)*pow(s,14.) + vec3(.1,.08,.04)*pow(s,120.);
        gl_FragColor = vec4(c,1.);
      }`,
  }));
  skyBall.renderOrder = -1;
  scene.add(skyBall);

  const shadow = (o) => { o.traverse((m) => { if (m.isMesh && !(m.material.transparent)) { m.castShadow = true; m.receiveShadow = true; } }); return o; };

  // central tower: plain books stacked and slightly askew, a mix of bindings and page sizes
  setBump(!mobile);
  const palette = Object.values(CLOTH);
  const BINDINGS = ["round", "flat", "leather", "quarter", "round", "paperback", "flat"];
  const FORMATS = [0.68, 0.74, 0.8, 0.66, 0.84];   // width as a share of height: trade, royal, crown, pocket, quarto
  const tower = new THREE.Group();
  let y = -92;
  for (let i = 0; i < 13; i++) {
    const kind = BINDINGS[i % BINDINGS.length], t = kind === "paperback" ? rnd(7, 10) : kind === "leather" ? rnd(16, 20) : rnd(11, 16), shrink = 1 - i * 0.03;
    const l = rnd(86, 104) * shrink;
    const b = solidBook({ kind, w: l * FORMATS[i % FORMATS.length], l, t, color: palette[(i * 3) % palette.length], paper: i });
    b.position.y = y + t / 2;
    b.rotation.y = rnd(-0.4, 0.4) + (i % 3 === 2 ? 0 : Math.PI);   // most spines face the opening view
    y += t + 0.12;
    tower.add(b);
  }
  const TOWER_TOP = y;
  scene.add(shadow(tower));

  // chapter books around the tower, each resting on a small pile
  const R = 138;
  const chapterObjs = chapters.map((ch, i) => {
    const a = (i / chapters.length) * Math.PI * 2 - Math.PI / 2;
    const color = palette[i % 5];
    const made = openableBook({ w: 40, l: 54, t: 11, color, ribbonColor: COLORS.oxblood, title: ch.title, lines: ch.lines });
    const pos = new THREE.Vector3(Math.cos(a) * R, 6 + Math.sin(i * 2.1) * 14, Math.sin(a) * R);
    const g = made.group;
    g.position.copy(pos);
    g.rotation.y = -a + Math.PI / 2 + rnd(-0.25, 0.25);
    g.rotation.z = rnd(-0.05, 0.05);
    let py = -5.5;
    for (let n = 0; n < 3; n++) {
      const kind = BINDINGS[(i * 2 + n + 1) % BINDINGS.length], t = kind === "paperback" ? rnd(3.5, 5) : rnd(5.5, 8.5);
      const b = solidBook({ kind, w: 36 - n * 4, l: 48 - n * 5, t, color: palette[(i + n * 2 + 5) % palette.length], paper: i + n });
      py -= t / 2; b.position.y = py; py -= t / 2 + 0.05;
      b.rotation.y = rnd(-0.3, 0.3);
      g.add(b);
    }
    scene.add(shadow(g));
    return { ...made, pos, open: 0, phase: rnd(0, 6), floor: py };
  });

  // dotted route: over each chapter, drifting out between them
  const way = [];
  chapterObjs.forEach((c, i) => {
    const a = Math.atan2(c.pos.z, c.pos.x), step = (Math.PI * 2) / chapters.length;
    way.push(new THREE.Vector3(c.pos.x, c.pos.y + 30, c.pos.z));
    way.push(new THREE.Vector3(Math.cos(a + step / 2) * 188, 44 + Math.sin(i * 1.7) * 18, Math.sin(a + step / 2) * 188));
  });
  const route = new THREE.CatmullRomCurve3(way, true, "centripetal");
  const SAMPLES = 500;
  const pts = route.getSpacedPoints(SAMPLES);
  pts.pop();

  const dotPos = new THREE.Vector3();
  const DOTS = mobile ? 120 : 200;
  const dotMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 8, 6), new THREE.MeshBasicMaterial({ color: COLORS.oxblood, fog: true }), DOTS);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S3 = new THREE.Vector3(), E0 = new THREE.Euler();
  scene.add(dotMesh);

  // paper-ball clouds
  const CLOUDS = mobile ? 90 : 190;
  const cloudGeo = new THREE.IcosahedronGeometry(1, 1);
  cloudGeo.computeVertexNormals(); // non-indexed, so this gives crumpled-paper facets
  const clouds = new THREE.InstancedMesh(cloudGeo, toon({ color: 0xf6f2e7 }), CLOUDS);
  for (let i = 0; i < CLOUDS; i++) {
    const floor = i < CLOUDS * 0.72;
    const a = rnd(0, 6.283), r = floor ? Math.sqrt(rnd(0, 1)) * 620 : rnd(520, 700);
    const s = floor ? rnd(26, 62) : rnd(14, 34);
    M.compose(S3.set(Math.cos(a) * r, floor ? rnd(-138, -112) : rnd(-20, 130), Math.sin(a) * r),
      Q.setFromEuler(E0.set(rnd(0, 6), rnd(0, 6), rnd(0, 6))), new THREE.Vector3(s * rnd(1, 1.6), s, s * rnd(1, 1.5)));
    clouds.setMatrixAt(i, M);
  }
  scene.add(clouds);

  // smaller clouds right under the floating books, so each pile rests on something
  const puffs = (count, radius, size) => {
    const m = new THREE.InstancedMesh(cloudGeo, clouds.material, count);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * 6.283 + rnd(-0.3, 0.3), r = i === 0 ? 0 : radius * rnd(0.6, 1), s = size * (i === 0 ? 1.25 : rnd(0.65, 1));
      M.compose(S3.set(Math.cos(a) * r, rnd(-0.25, 0.12) * size, Math.sin(a) * r),
        Q.setFromEuler(E0.set(0, rnd(0, 6), 0)), new THREE.Vector3(s * rnd(1.1, 1.5), s * rnd(0.62, 0.8), s * rnd(1.1, 1.5)));
      m.setMatrixAt(i, M);
    }
    m.receiveShadow = true;
    return m;
  };
  const towerCloud = puffs(mobile ? 8 : 12, 62, 30);
  towerCloud.position.y = -108;
  scene.add(towerCloud);
  chapterObjs.forEach((c) => {
    const p = puffs(mobile ? 5 : 7, 20, 13);
    p.position.y = c.floor - 3;
    c.group.add(p);   // inside the group, so the cloud bobs along with its books
  });

  // sheets whirling around the top of the tower
  const SHEETS = mobile ? 40 : 90;
  const sheets = new THREE.InstancedMesh(new THREE.PlaneGeometry(3.4, 4.6), toon({ color: COLORS.cream, side: THREE.DoubleSide }), SHEETS);
  const sheetData = Array.from({ length: SHEETS }, () => ({ a: rnd(0, 6.283), r: rnd(50, 86), y: rnd(-30, 80), v: rnd(0.12, 0.34), s: rnd(0, 6) }));
  scene.add(sheets);

  // loose pages along the route
  const loose = pages.map((p, i) => {
    const t = tex(256, 340, (g, w, h) => {
      g.fillStyle = "#f6efdd"; g.fillRect(0, 0, w, h);
      g.fillStyle = "#20231f";
      for (let y = 44; y < h - 24; y += 26) g.fillRect(30, y, w - 60 - ((y * 13) % 60), 4);
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(7, 9.4), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }));
    const pt = pts[Math.floor(((i + 0.25) / pages.length) * pts.length)].clone();
    pt.y += rnd(-1.5, 1.5);
    m.position.copy(pt);
    const halo = new THREE.Mesh(new THREE.RingGeometry(7.3, 7.6, 40), new THREE.MeshBasicMaterial({ color: COLORS.ochre, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
    m.add(halo);
    scene.add(m);
    return { mesh: m, halo, data: p, home: pt, got: false, pop: 0, phase: rnd(0, 6) };
  });

  // the plane and its dotted trail
  const plane = paperPlane();
  plane.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(plane);
  const TRAIL = 46;
  const trail = new THREE.InstancedMesh(new THREE.SphereGeometry(0.3, 6, 5), new THREE.MeshBasicMaterial({ color: COLORS.oxblood }), TRAIL);
  trail.frustumCulled = false;
  scene.add(trail);
  const trailPts = Array.from({ length: TRAIL }, () => ({ p: new THREE.Vector3(0, -9999, 0), life: 0 }));
  let trailI = 0, trailT = 0;

  // ---------- other planes, circling the books at different heights and distances ----------
  const FLOCK = mobile ? 6 : 12, FLOCK_DOTS = 10;
  const TINTS = [COLORS.cream, COLORS.cream, COLORS.oxblood, COLORS.ochre];
  const flock = Array.from({ length: FLOCK }, (_, i) => {
    const band = i % 3;   // close to the tower, far out, or high over the chapter books
    const R = band === 0 ? rnd(84, 100) : band === 1 ? rnd(190, 275) : rnd(122, 158);
    const holder = new THREE.Group();
    const mesh = paperPlane(TINTS[i % TINTS.length]);
    mesh.scale.setScalar(rnd(2.4, 3.5));
    holder.add(mesh);
    scene.add(holder);
    return {
      holder, R, H: band === 0 ? rnd(-60, 80) : band === 1 ? rnd(-40, 90) : rnd(52, 105),
      A: band === 0 ? rnd(2, 5) : rnd(8, 24), B: rnd(6, 18), k: 2 + (i % 2), m: 1 + (i % 3),
      w: (rnd(18, 30) / R) * (i % 4 < 2 ? 1 : -1), th: rnd(0, 6.283), p: rnd(0, 6.283), q: rnd(0, 6.283),
    };
  });
  const flockDots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.8, 8, 6), new THREE.MeshBasicMaterial({ color: "#3e5a4b" }), FLOCK * FLOCK_DOTS);
  flockDots.frustumCulled = false;
  scene.add(flockDots);
  const fA = new THREE.Vector3(), fB = new THREE.Vector3(), fC = new THREE.Vector3(), fD = new THREE.Vector3();
  const flockPoint = (f, th, out) => {
    const r = f.R + f.A * Math.sin(f.k * th + f.p);
    return out.set(Math.cos(th) * r, f.H + f.B * Math.sin(f.m * th + f.q), Math.sin(th) * r);
  };
  function updateFlock() {
    flock.forEach((f, i) => {
      const th = f.th + time * f.w, d = 0.05 * Math.sign(f.w);
      flockPoint(f, th, fA); flockPoint(f, th + d, fB); flockPoint(f, th + 2 * d, fC);
      f.holder.position.copy(fA);
      f.holder.lookAt(fD.copy(fA).multiplyScalar(2).sub(fB));   // the nose points along -z
      // lean into the turn, the same way the plane you fly does
      const ax = fB.x - fA.x, az = fB.z - fA.z, bx = fC.x - fB.x, bz = fC.z - fB.z;
      const cross = (ax * bz - az * bx) / (Math.hypot(ax, az) * Math.hypot(bx, bz) || 1);
      f.holder.rotateZ(clamp((-cross / 0.05) * 0.9, -1.1, 1.1));
      for (let n = 0; n < FLOCK_DOTS; n++) {
        flockPoint(f, th - d * (1.4 + n * 0.8), fD);
        flockDots.setMatrixAt(i * FLOCK_DOTS + n, M.compose(fD, Q.identity(), S3.setScalar(1 - n / FLOCK_DOTS)));
      }
    });
    flockDots.instanceMatrix.needsUpdate = true;
  }

  // ---------- state ----------
  const S = { p: pts[0].clone(), yaw: 0, pitch: 0, roll: 0, speed: 26, idx: 0 };
  let started = false, assist = true, lastInput = -1e9, active = null, found = 0, time = 0;
  const keys = new Set();
  const drag = { on: false, x0: 0, y0: 0, x: 0, y: 0 };
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  const f = new THREE.Vector3();
  let snap = true;

  const nearestIdx = (around, span) => {
    let best = around, bd = Infinity;
    for (let k = -span; k <= span; k++) {
      const i = (around + k + pts.length) % pts.length, d = pts[i].distanceToSquared(S.p);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  };

  function step(dt) {
    const K = (...c) => c.some((x) => keys.has(x));
    const manual = started && (keys.size > 0 || drag.on);
    if (manual) lastInput = time;
    const auto = !started || (assist && time - lastInput > 2.5);
    let yawRate = 0, pitchT = S.pitch, speedT;
    if (auto) {
      S.idx = nearestIdx(S.idx, started ? pts.length >> 1 : 30);
      const target = pts[(S.idx + 22) % pts.length];
      f.copy(target).sub(S.p).normalize();
      yawRate = clamp(wrap(Math.atan2(-f.x, -f.z) - S.yaw) * 1.7, -1.0, 1.0);
      pitchT = clamp(Math.asin(f.y), -0.5, 0.5);
      speedT = 30;
    } else {
      yawRate = ((K("a", "arrowleft") ? 1 : 0) - (K("d", "arrowright") ? 1 : 0) - drag.x) * 1.3;
      const climb = (K(" ") ? 1 : 0) - (K("shift") ? 1 : 0) - drag.y;
      pitchT = climb ? clamp(climb, -1, 1) * 0.55 : (assist ? 0 : S.pitch);
      speedT = K("w", "arrowup") || drag.on ? 50 : K("s", "arrowdown") ? 13 : 22;
    }
    // stay in the sky: lean back toward the middle near the edges
    const r = Math.hypot(S.p.x, S.p.z);
    if (r > 320) yawRate += clamp(wrap(Math.atan2(S.p.x, S.p.z) - S.yaw) * 1.5, -1.3, 1.3) * clamp((r - 320) / 40, 0, 1);
    if (S.p.y > 130) pitchT = Math.min(pitchT, -0.25);
    if (S.p.y < -62) pitchT = Math.max(pitchT, 0.3);

    S.yaw = wrap(S.yaw + yawRate * dt);
    S.pitch = damp(S.pitch, pitchT, 3.2, dt);
    S.roll = damp(S.roll, clamp(yawRate * 0.72, -0.85, 0.85), 5, dt);
    S.speed = damp(S.speed, speedT, 1.8, dt);
    f.set(-Math.sin(S.yaw) * Math.cos(S.pitch), Math.sin(S.pitch), -Math.cos(S.yaw) * Math.cos(S.pitch));
    S.p.addScaledVector(f, S.speed * dt);

    // soft collisions: glance off the tower and the chapter piles
    const towerR = 58;
    if (r < towerR && S.p.y < TOWER_TOP + 6) {
      const n = Math.max(r, 0.01);
      S.p.x *= towerR / n; S.p.z *= towerR / n;
    }
    for (const c of chapterObjs) {
      if (Math.hypot(S.p.x - c.pos.x, S.p.z - c.pos.z) < 30 && S.p.y > c.pos.y - 28 && S.p.y < c.pos.y + 10) S.p.y = damp(S.p.y, c.pos.y + 12, 8, dt);
    }

    plane.position.copy(S.p);
    plane.position.y += Math.sin(time * 3.1) * 0.12;
    plane.rotation.set(S.pitch, S.yaw, S.roll + Math.sin(time * 5) * 0.025, "YXZ");

    trailT += dt;
    if (trailT > 0.05) {
      trailT = 0;
      const t = trailPts[trailI = (trailI + 1) % TRAIL];
      t.p.copy(S.p).addScaledVector(f, -3.5);
      t.life = 1;
    }
  }

  function updateWorld(dt) {
    // chapters: open when you're close
    let near = null, nd = 44;
    chapterObjs.forEach((c, i) => {
      const d = c.pos.distanceTo(S.p);
      const want = d < 66 ? 1 : 0;
      c.open = damp(c.open, want, want ? 2.6 : 1.6, dt);
      c.hinge.rotation.z = c.open * 2.5;
      if (!reduced) c.group.position.y = c.pos.y + Math.sin(time * 0.6 + c.phase) * 1.3;
      if (d < nd + 8) { nd = d; near = i; }
      // ribbon flutter
      const a = c.ribbon.geometry.attributes.position, b = c.base;
      for (let v = 0; v < a.count; v++) {
        const yy = b[v * 3 + 1];
        a.setZ(v, Math.sin(yy * 0.34 + time * 3 + c.phase) * (-yy / 26) * 2.4);
      }
      a.needsUpdate = true;
    });
    if (started && near !== active) { active = near; onChapter(near); }

    // loose pages
    loose.forEach((l) => {
      if (l.pop >= 1) return;
      if (!l.got) {
        l.mesh.position.y = l.home.y + Math.sin(time * 1.3 + l.phase) * 1.1;
        l.mesh.rotation.y = time * 0.9 + l.phase;
        l.mesh.rotation.z = Math.sin(time + l.phase) * 0.2;
        l.halo.scale.setScalar(1 + Math.sin(time * 3 + l.phase) * 0.06);
        if (started && l.mesh.position.distanceTo(S.p) < 11) {
          l.got = true; found++; onPage(l.data, found);
          l.halo.visible = false;
        }
      } else {
        l.pop = Math.min(1, l.pop + dt * 1.5);
        l.mesh.position.y += dt * 24;
        l.mesh.rotation.y += dt * 16;
        l.mesh.scale.setScalar(1 - l.pop);
        if (l.pop >= 1) l.mesh.visible = false;
      }
    });

    // moving dots on the route; the bright stretch runs just ahead of the plane
    for (let i = 0; i < DOTS; i++) {
      const pi = Math.floor((i / DOTS) * pts.length);
      const ahead = (pi - S.idx + pts.length) % pts.length;
      const behind = pts.length - ahead;
      const s = started && behind < 90 ? 0 : ahead < 70 ? 1.25 - ahead / 200 : 0.85;   // no dots looming at the lens
      dotPos.copy(pts[pi]); dotPos.y -= 5;   // hangs just under the flight line so it reads as a path
      dotMesh.setMatrixAt(i, M.compose(dotPos, Q.identity(), S3.setScalar(s + Math.sin(time * 3 - i * 0.5) * 0.14)));
    }
    dotMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < SHEETS; i++) {
      const d = sheetData[i], a = d.a + time * d.v;
      E0.set(time * 0.8 + d.s, a, Math.sin(time + d.s));
      Q.setFromEuler(E0);
      M.compose(S3.set(Math.cos(a) * d.r, d.y + Math.sin(time * 0.7 + d.s) * 5, Math.sin(a) * d.r), Q, new THREE.Vector3(1, 1, 1));
      sheets.setMatrixAt(i, M);
    }
    sheets.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < TRAIL; i++) {
      const t = trailPts[i];
      t.life = Math.max(0, t.life - dt * 1.1);
      trail.setMatrixAt(i, M.compose(t.p, Q.identity(), S3.setScalar(t.life)));
    }
    trail.instanceMatrix.needsUpdate = true;
  }

  // Before take-off the camera orbits the whole library with the scene nudged clear of the
  // intro text; after take-off it settles in behind the plane.
  let viewK = 1;
  function updateCamera(dt) {
    const fw = Math.sin(S.yaw), bw = Math.cos(S.yaw);
    let tx, ty, tz, lx, ly, lz;
    if (started) {
      tx = S.p.x + fw * 22; ty = S.p.y + 5; tz = S.p.z + bw * 22;
      lx = S.p.x - fw * 16; ly = S.p.y + 1; lz = S.p.z - bw * 16;
    } else {
      const a = time * 0.05 + 0.1;
      const dist = canvas.clientWidth / canvas.clientHeight > 1.2 ? 345 : 480;
      tx = Math.cos(a) * dist; ty = 62; tz = Math.sin(a) * dist;
      lx = 0; ly = 14; lz = 0;
    }
    if (snap) { camPos.set(tx, ty, tz); camLook.set(lx, ly, lz); snap = false; }
    const k = started ? 4 : 1.5;
    camPos.set(damp(camPos.x, tx, k, dt), damp(camPos.y, ty, k * 0.8, dt), damp(camPos.z, tz, k, dt));
    camLook.set(damp(camLook.x, lx, k * 1.5, dt), damp(camLook.y, ly, k * 1.3, dt), damp(camLook.z, lz, k * 1.5, dt));
    camera.position.copy(camPos);
    skyBall.position.copy(camPos);
    camera.lookAt(camLook);

    viewK = damp(viewK, started ? 0 : 1, 3, dt);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const wide = w / h > 1.2;
    camera.setViewOffset(w, h, wide ? -0.17 * w * viewK : 0, wide ? 0 : 0.03 * h * viewK, w, h);
  }

  // ---------- input ----------
  const wantsKeys = () => started && running && !document.documentElement.classList.contains("reading");
  const FLIGHT = new Set(["w", "a", "s", "d", " ", "shift", "arrowup", "arrowdown", "arrowleft", "arrowright"]);
  addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (!FLIGHT.has(k) || !wantsKeys() || e.metaKey || e.ctrlKey) return;
    if (e.target.closest?.("a,button,input,textarea") && k === " ") return;
    e.preventDefault();
    keys.add(k);
  });
  addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
  addEventListener("blur", () => keys.clear());

  canvas.addEventListener("pointerdown", (e) => {
    if (!started) return;
    canvas.setPointerCapture(e.pointerId);
    Object.assign(drag, { on: true, x0: e.clientX, y0: e.clientY, x: 0, y: 0 });
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag.on) return;
    drag.x = clamp((e.clientX - drag.x0) / 80, -1, 1);
    drag.y = clamp((e.clientY - drag.y0) / 80, -1, 1);
  });
  const endDrag = () => { drag.on = false; drag.x = drag.y = 0; };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  // ---------- loop ----------
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  let running = false, raf = 0, last = 0;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(1 / 30, (now - last) / 1000);
    last = now;
    if (!(reduced && !started)) { time += dt; step(dt); }
    updateWorld(dt);
    updateFlock();
    updateCamera(dt);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  const setRunning = (on) => {
    if (on === running) return;
    running = on;
    if (on) { last = performance.now(); raf = requestAnimationFrame(frame); } else cancelAnimationFrame(raf);
  };
  let inView = true;
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; setRunning(inView && !document.hidden); }, { threshold: 0.05 }).observe(canvas);
  document.addEventListener("visibilitychange", () => setRunning(inView && !document.hidden));

  S.yaw = Math.atan2(-(pts[10].x - pts[0].x), -(pts[10].z - pts[0].z));
  setRunning(true);

  return {
    start() { started = true; lastInput = time; },
    land() { started = false; keys.clear(); endDrag(); active = null; onChapter(null); S.idx = nearestIdx(S.idx, pts.length >> 1); },
    setAssist(v) { assist = v; onAssist?.(v); },
    get assist() { return assist; },
    total: { chapters: chapters.length, pages: pages.length },
  };
}
