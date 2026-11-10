// Floating things hung over the avenue, each one a piece of Ved's story.
// Swing close and it pops: the story card shows, the object bursts into sparks and re-hangs further on.

import * as THREE from "three";

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.2, ...o });
const glow = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), toneMapped: false });

function drone() {
  const g = new THREE.Group();
  const body = std("#1d2230", { metalness: 0.6, roughness: 0.3 });
  g.add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 1.1), body));
  const cam = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), std("#0a0a0a", { metalness: 0.9, roughness: 0.1 }));
  cam.position.set(0, -0.25, 0.45); g.add(cam);
  const rotors = [];
  for (const [x, z, c] of [[1, 1, glow(0.2, 3, 0.6)], [-1, 1, glow(0.2, 3, 0.6)], [1, -1, glow(3, 0.2, 0.2)], [-1, -1, glow(3, 0.2, 0.2)]]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 1.5), body);
    arm.position.set(x * 0.55, 0, z * 0.55); arm.rotation.y = Math.atan2(x, z); g.add(arm);
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.25, 12), body);
    motor.position.set(x * 1.05, 0.1, z * 1.05); g.add(motor);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), c);
    led.position.set(x * 1.05, -0.07, z * 1.05); g.add(led);
    const rotor = new THREE.Mesh(new THREE.CircleGeometry(0.7, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: "#c9d4ff", transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
    rotor.position.set(x * 1.05, 0.25, z * 1.05); g.add(rotor);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.02, 0.1), std("#2a2f3d"));
    blade.position.copy(rotor.position); g.add(blade); rotors.push(blade);
  }
  g.userData.spin = (dt) => rotors.forEach((r, i) => (r.rotation.y += dt * (i % 2 ? 40 : -40)));
  g.userData.calm = true; // drones hover level instead of tumbling
  return g;
}

function strawberry() {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push(new THREE.Vector2(Math.sin(t * Math.PI) ** 0.8 * (0.35 + 0.65 * t) * 1.0, -1.1 + t * 2.0)); }
  const berry = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), std("#c3121e", { roughness: 0.25, metalness: 0.05 }));
  g.add(berry);
  const seedMat = std("#f2d36b", { roughness: 0.5 });
  const seed = new THREE.SphereGeometry(0.045, 6, 4);
  for (let i = 0; i < 70; i++) {
    const t = 0.15 + Math.random() * 0.75, a = Math.random() * Math.PI * 2;
    const r = Math.sin(t * Math.PI) ** 0.8 * (0.35 + 0.65 * t), y = -1.1 + t * 2.0;
    const s = new THREE.Mesh(seed, seedMat); s.position.set(Math.cos(a) * r, y, Math.sin(a) * r); g.add(s);
  }
  const leaf = std("#2f8a3a", { roughness: 0.6, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const l = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.8, 4), leaf);
    const a = (i / 7) * Math.PI * 2;
    l.position.set(Math.cos(a) * 0.3, 0.95, Math.sin(a) * 0.3); l.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2); g.add(l);
  }
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.4, 6), leaf); stem.position.y = 1.15; g.add(stem);
  g.scale.setScalar(1.3);
  return g;
}

function tyre() {
  const g = new THREE.Group();
  const rubber = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.5, 20, 48), std("#111216", { roughness: 0.85 }));
  g.add(rubber);
  for (const z of [-0.28, 0.28]) {   // soft-compound red band on both sidewalls
    const band = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.035, 6, 64), glow(3, 0.15, 0.2));
    band.position.z = z * 1.6; g.add(band);
  }
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.55, 28, 1, true).rotateX(Math.PI / 2), std("#9aa0ad", { metalness: 0.95, roughness: 0.25, side: THREE.DoubleSide }));
  g.add(rim);
  for (let i = 0; i < 10; i++) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.3, 0.06), std("#9aa0ad", { metalness: 0.95, roughness: 0.25 }));
    sp.rotation.z = (i / 10) * Math.PI; g.add(sp);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.7, 16).rotateX(Math.PI / 2), std("#e2262f", { metalness: 0.5 })); g.add(hub);
  return g;
}

function book() {
  const g = new THREE.Group();
  const cover = std("#7a1c22", { roughness: 0.55 });
  const pages = std("#efe6d2", { roughness: 0.9 });
  for (const s of [-1, 1]) {   // open book, two halves at an angle
    const half = new THREE.Group();
    const c = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 2.1), cover); c.position.set(0.75, 0, 0); half.add(c);
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.22, 2.0), pages); p.position.set(0.74, 0.14, 0); half.add(p);
    half.rotation.z = s > 0 ? 0.32 : Math.PI - 0.32;
    if (s < 0) half.scale.y = -1;
    g.add(half);
  }
  // a page mid-turn
  const page = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.95, 8, 1), new THREE.MeshStandardMaterial({ color: "#fff6e2", side: THREE.DoubleSide, roughness: 0.9 }));
  const pp = page.geometry.attributes.position;
  for (let i = 0; i < pp.count; i++) { const x = pp.getX(i) + 0.7; pp.setXYZ(i, Math.cos(x * 1.1) * x * 0.9, Math.sin(x * 1.1) * x * 0.9 + 0.3, pp.getY(i)); }
  page.geometry.computeVertexNormals(); g.add(page);
  g.scale.setScalar(1.3);
  return g;
}

function basketball() {
  const c = document.createElement("canvas"); c.width = 512; c.height = 256; const x = c.getContext("2d");
  x.fillStyle = "#d4621f"; x.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; x.fillRect(Math.random() * 512, Math.random() * 256, 1.5, 1.5); }
  x.strokeStyle = "#1a0d06"; x.lineWidth = 7;
  x.beginPath(); x.moveTo(0, 128); x.lineTo(512, 128); x.stroke();
  for (const cx of [128, 384]) { x.beginPath(); x.moveTo(cx, 0); x.lineTo(cx, 256); x.stroke(); }
  for (const cx of [0, 256, 512]) { x.beginPath(); x.ellipse(cx, 128, 70, 128, 0, 0, Math.PI * 2); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.SphereGeometry(1.3, 40, 24), new THREE.MeshStandardMaterial({ map: t, roughness: 0.75 }));
}

function pick() {
  const s = new THREE.Shape();
  s.moveTo(0, -1.25);
  s.bezierCurveTo(0.5, -0.7, 1.15, 0.2, 1.05, 0.75);
  s.bezierCurveTo(0.9, 1.15, -0.9, 1.15, -1.05, 0.75);
  s.bezierCurveTo(-1.15, 0.2, -0.5, -0.7, 0, -1.25);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3 });
  geo.center();
  return new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: "#e2262f", roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 }));
}

function column() {
  const g = new THREE.Group();
  const marble = std("#e8e4dc", { roughness: 0.35 });
  const shaft = new THREE.CylinderGeometry(0.5, 0.56, 2.6, 20, 1);
  const p = shaft.attributes.position;   // flutes
  for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)); const r = Math.hypot(p.getX(i), p.getZ(i)); const k = 1 - 0.06 * (Math.cos(a * 20) * 0.5 + 0.5); p.setX(i, Math.cos(a) * r * k); p.setZ(i, Math.sin(a) * r * k); }
  shaft.computeVertexNormals();
  g.add(new THREE.Mesh(shaft, marble));
  const cap = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.26, 1.4), marble); cap.position.y = 1.43; g.add(cap);
  const echinus = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.5, 0.2, 20), marble); echinus.position.y = 1.2; g.add(echinus);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.7, 0.24, 20), marble); base.position.y = -1.42; g.add(base);
  // broken top edge: Seneca's been gone a while
  const chip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.5), marble); chip.position.set(0.55, 1.62, 0.4); chip.rotation.set(0.4, 0.3, 0.6); g.add(chip);
  return g;
}

function maple() {
  const pts = [[0, 1.5], [0.18, 1.0], [0.55, 1.2], [0.45, 0.6], [1.15, 0.85], [0.95, 0.5], [1.35, 0.3], [0.7, 0.0], [0.85, -0.3], [0.12, -0.15], [0.1, -0.85]];
  const s = new THREE.Shape();
  s.moveTo(-0.1, -0.85);
  for (const [x, y] of [...pts].reverse().map(([x, y]) => [-x, y])) s.lineTo(x, y);
  for (const [x, y] of pts) s.lineTo(x, y);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
  geo.center();
  const m = new THREE.Mesh(geo, std("#d42a20", { roughness: 0.5, emissive: "#4a0805" }));
  m.scale.setScalar(1.25);
  return m;
}

function terminal() {
  const g = new THREE.Group();
  const shell = std("#151824", { metalness: 0.5, roughness: 0.35 });
  g.add(new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.7, 0.16), shell));
  const c = document.createElement("canvas"); c.width = 512; c.height = 320; const x = c.getContext("2d");
  x.fillStyle = "#04070a"; x.fillRect(0, 0, 512, 320);
  x.font = "26px 'JetBrains Mono', Menlo, monospace"; x.shadowBlur = 12;
  [["$ git commit -m \"swing\"", "#8bffa8"], ["[main 7c1e] swing", "#6f86ff"], ["$ git push", "#8bffa8"], ["→ github.com/vedagwekar", "#e8e8ff"], ["$ █", "#8bffa8"]]
    .forEach(([l, col], i) => { x.fillStyle = x.shadowColor = col; x.fillText(l, 22, 52 + i * 56); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), new THREE.MeshBasicMaterial({ map: t, toneMapped: false, color: new THREE.Color(1.6, 1.6, 1.6) }));
  screen.position.z = 0.085; g.add(screen);
  const back = screen.clone(); back.rotation.y = Math.PI; back.position.z = -0.085; g.add(back);
  g.userData.calm = true;
  return g;
}

export const FLOATERS = [
  { make: maple, k: "about", t: "Calgary → Waterloo", d: "Grew up in Calgary. Moved east for math, stayed for the robots." },
  { make: drone, k: "work", t: "Flight software @ WARG", d: "Sensor drivers for a drone autopilot. A bad pointer up here is an expensive crash." },
  { make: strawberry, k: "work", t: "Robot vision @ SPAIS", d: "Teaching a farm robot the difference between a strawberry and a weed." },
  { make: tyre, k: "work", t: "Lightning Response", d: "An AI pit wall that called a tyre failure 15 laps early. Won the hackathon." },
  { make: book, k: "shelf", t: "The shelf", d: "Books, and the essays they turned into. Tech, AI and the Stoics, colliding." },
  { make: column, k: "shelf", t: "Seneca, mostly", d: "Nothing is ours except time. Philosophy is how I try to spend it well." },
  { make: basketball, k: "about", t: "Pickup runs", d: "Basketball, guitar and anime: the parts of the week with no deadlines." },
  { make: pick, k: "about", t: "Guitar", d: "Still learning. Patience, like debugging, is mostly about not quitting." },
  { make: terminal, k: "github", t: "On GitHub", d: "Mostly private, slowly going public. Come look." },
];

// soft halo behind each object so it reads from far away
const haloTex = (() => {
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(255,220,170,.55)"); r.addColorStop(0.35, "rgba(255,170,110,.18)"); r.addColorStop(1, "rgba(255,150,100,0)");
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();

export function createFloaters(scene) {
  const items = FLOATERS.map((f, i) => {
    const obj = f.make();
    const g = new THREE.Group();
    g.add(obj);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    halo.scale.setScalar(9); g.add(halo);
    const light = new THREE.PointLight("#ffd2a0", 30, 14, 2); g.add(light);   // lights the hero as he passes
    g.userData = { ...f, obj, halo, light, ph: i * 1.7, pop: 0 };
    g.visible = false;
    scene.add(g);
    return g;
  });

  // sparks for the pop
  const SP = 90, spGeo = new THREE.BufferGeometry(), spPos = new Float32Array(SP * 3), spVel = new Float32Array(SP * 3);
  spGeo.setAttribute("position", new THREE.BufferAttribute(spPos, 3));
  const sparks = new THREE.Points(spGeo, new THREE.PointsMaterial({ map: haloTex, color: new THREE.Color(1.6, 1.2, 0.8), size: 0.9, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  sparks.visible = false; sparks.frustumCulled = false; scene.add(sparks);
  let sparkT = 0;
  function burst(at) {
    for (let i = 0; i < SP; i++) {
      spPos.set([at.x, at.y, at.z], i * 3);
      const v = new THREE.Vector3().randomDirection().multiplyScalar(6 + Math.random() * 10);
      spVel.set([v.x, v.y, v.z], i * 3);
    }
    sparkT = 1; sparks.visible = true;
  }

  let order = 0;                      // next story beat to hang
  const active = [];                  // items currently hanging over the avenue
  function hang(g, z) {
    g.position.set((Math.random() * 2 - 1) * 8, 20 + Math.random() * 14, z);
    g.userData.baseY = g.position.y;
    g.userData.pop = 0;
    g.scale.setScalar(1);
    g.visible = true;
    active.push(g);
  }
  function nextItem() { const g = items[order % items.length]; order++; return g; }
  for (let i = 0; i < 3; i++) hang(nextItem(), -120 - i * 150);

  // returns the story for a collected item (or null); steerX is the autopilot nudge toward the nearest one
  function update(dt, t, heroPos, autopilot) {
    let found = null, steerX = 0;
    for (const g of [...active]) {
      const u = g.userData;
      if (u.pop > 0) {                                  // shrinking out after a catch
        u.pop -= dt * 3; g.scale.setScalar(Math.max(0.001, u.pop));
        if (u.pop <= 0) { g.visible = false; active.splice(active.indexOf(g), 1); hang(nextItem(), heroPos.z - 440); }
        continue;
      }
      g.position.y = u.baseY + Math.sin(t * 1.3 + u.ph) * 0.8;
      if (u.calm) { u.obj.rotation.y = t * 0.6; u.obj.rotation.z = Math.sin(t * 1.1 + u.ph) * 0.08; }
      else { u.obj.rotation.y = t * 0.8 + u.ph; u.obj.rotation.x = Math.sin(t * 0.7 + u.ph) * 0.4; }
      u.obj.userData.spin?.(dt);
      u.halo.material.opacity = 0.75 + Math.sin(t * 3 + u.ph) * 0.2;
      const d = g.position.distanceTo(heroPos);
      if (autopilot && d < 45 && g.position.z < heroPos.z) steerX += Math.sign(g.position.x - heroPos.x) * 6;
      if (d < 5.5) { found = u; u.pop = 1; burst(g.position); }
      else if (g.position.z > heroPos.z + 25) { g.visible = false; active.splice(active.indexOf(g), 1); hang(g, heroPos.z - 440); }
    }
    if (sparkT > 0) {
      sparkT -= dt * 0.9;
      for (let i = 0; i < SP * 3; i += 3) {
        spVel[i + 1] -= 9 * dt;
        spPos[i] += spVel[i] * dt; spPos[i + 1] += spVel[i + 1] * dt; spPos[i + 2] += spVel[i + 2] * dt;
      }
      spGeo.attributes.position.needsUpdate = true;
      sparks.material.opacity = Math.max(0, sparkT);
      if (sparkT <= 0) sparks.visible = false;
    }
    return { found, steerX };
  }
  return { update, items };
}
