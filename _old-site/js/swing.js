// 3D web-swinging experience.
// An original masked web-slinger (built in Blender by blender/build_hero.py on the three.js "Xbot" rig,
// clips from blender/animate_hero.py), driven by real pendulum physics down an endless night avenue.
//
// Controls: hold mouse / touch / space = shoot web, release = let go, move mouse = steer.
// Autopilot takes over after a few idle seconds.

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { createCity } from "./city.js";
import { createFloaters } from "./floaters.js";

// Built in Blender by blender/build_hero.py (baked suit + modelled lenses). Falls back to the raw rig.
const MODEL_URL = "assets/hero.glb";
const FALLBACK_URL = "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r170/examples/models/gltf/Xbot.glb";

const stage = document.getElementById("stage");
const canvas = document.getElementById("scene");
const loaderEl = document.getElementById("loader");
const loaderPct = document.getElementById("loader-pct");
const hud = {
  speed: document.getElementById("hud-speed"),
  alt: document.getElementById("hud-alt"),
  dist: document.getElementById("hud-dist"),
  mode: document.getElementById("hud-mode"),
};

const isMobile = matchMedia("(max-width: 700px), (pointer: coarse)").matches;

// ---------------- renderer / scene ----------------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 600);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.5, 0.72);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// lights
scene.add(new THREE.HemisphereLight("#8f9cff", "#2a1518", 1.4));
const moonLight = new THREE.DirectionalLight("#b9c6ff", 1.6);
moonLight.position.set(-40, 80, -60);
scene.add(moonLight);
const key = new THREE.PointLight("#ffe2c4", 75, 22, 1.5); // follows the hero so he reads against the dark
const rimLight = new THREE.DirectionalLight("#8fb0ff", 3.2);   // cool backlight outlines the silhouette
scene.add(rimLight, rimLight.target);
scene.add(key);

// moon + stars
const moon = new THREE.Mesh(new THREE.SphereGeometry(9, 32, 16), new THREE.MeshBasicMaterial({ color: "#fff4dc" }));
scene.add(moon);
{
  const g = new THREE.BufferGeometry();
  const n = 900, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI * 0.45;
    p.set([Math.cos(th) * Math.sin(ph) * 400, Math.cos(ph) * 400, Math.sin(th) * Math.sin(ph) * 400], i * 3);
  }
  g.setAttribute("position", new THREE.BufferAttribute(p, 3));
  const stars = new THREE.Points(g, new THREE.PointsMaterial({ color: "#cfd6ff", size: 1.1, sizeAttenuation: false, fog: false }));
  stars.name = "stars";
  scene.add(stars);
}

// ---------------- city ----------------
const STREET = 16;            // half-width of the avenue (facades at x = ±STREET)
const SPAN = 420;             // how much avenue exists around the hero at once
const city = createCity(scene, renderer, { STREET, SPAN });
const buildingAt = city.buildingAt;
const fillCity = city.fill;

// ---------------- hero ----------------
const hero = new THREE.Group();
scene.add(hero);
const bones = {};
let modelReady = false;

const web = new THREE.Mesh(
  new THREE.CylinderGeometry(0.022, 0.022, 1, 6, 1, true).translate(0, 0.5, 0).rotateX(Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: "#a9b0c4", transparent: true, opacity: 0.85 })
);
web.visible = false;
scene.add(web);

const S = {
  p: new THREE.Vector3(0, 34, 0),
  v: new THREE.Vector3(0, 0, -22),
  anchor: null,
  L: 0,
  flip: 0,         // radians remaining in a mid-air flip
  startZ: 0,
  side: 1,
};

// Suit: two-tone red/navy with a procedural web-line pattern, computed from the
// bind-pose (T-pose) object-space position so it sticks to the body while it moves.
// Fallback if assets/hero.glb is missing: plain graphite suit on the raw rig, two red eye slits.
function suitMaterial() {
  return new THREE.MeshPhysicalMaterial({ color: "#1a1c22", roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.4 });
}
function addEyes(model) {
  const head = bones.Head;
  if (!head) return;
  model.updateMatrixWorld(true);
  const unit = 1 / head.getWorldScale(new THREE.Vector3()).x * model.scale.x;
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.4, 0.3), toneMapped: false });
  for (const s of [1, -1]) {
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.03 * unit, 0.008 * unit, 0.006 * unit), mat);
    slit.position.set(s * 0.035 * unit, 0.09 * unit, 0.09 * unit);
    slit.rotation.z = s * 0.25;
    head.add(slit);
  }
}

function onModel(gltf, baked) {
  const model = gltf.scene;
  model.traverse((o) => {
    if (o.isMesh) {
      o.frustumCulled = false;
      if (!baked) o.material = suitMaterial();          // raw rig: procedural suit at runtime
      else if (o.material.normalMap) o.material.normalScale.set(1.2, 1.2);
    }
    if (o.isBone) bones[o.name.replace("mixamorig", "").replace(":", "")] = o;
  });
  model.scale.setScalar(1.15);
  model.position.y = -1.05;  // pivot around the chest-ish so swings look right
  hero.add(model);
  if (!baked) addEyes(model);
  if (gltf.animations?.length) setupClips(model, gltf.animations);
  modelReady = true;
  intro = 1;                 // start the establishing shot once he's actually on screen
  loaderEl.classList.add("done");
  stage.classList.add("ready");
}
const progress = (e) => { if (e.total) loaderPct.textContent = Math.min(99, Math.round((e.loaded / e.total) * 100)) + "%"; };
const gltfLoader = new GLTFLoader();
gltfLoader.load(MODEL_URL, (g) => onModel(g, true), progress, () =>
  gltfLoader.load(FALLBACK_URL, (g) => onModel(g, false), progress, () => { loaderPct.textContent = "couldn't load the suit"; })
);

// ---------------- authored clips (blender/animate_hero.py) ----------------
// swingR/swingL are scrubbed by the pendulum angle, flip by the somersault progress, fall loops.
let mixer = null;
const clips = {}, weights = { swingR: 0, swingL: 0, flip: 0, fall: 1 };
function setupClips(model, animations) {
  mixer = new THREE.AnimationMixer(model);
  for (const clip of animations) {
    const action = mixer.clipAction(clip);
    action.play();
    action.setEffectiveWeight(clip.name === "fall" ? 1 : 0);
    action.timeScale = clip.name === "fall" ? 1 : 0;   // the others are scrubbed by hand
    clips[clip.name] = action;
  }
}
function driveClips(dt) {
  const target = { swingR: 0, swingL: 0, flip: 0, fall: 0 };
  if (S.anchor) {
    // pendulum angle in the direction of travel: -1 rad (behind the anchor) .. +1 rad (past it)
    const d = tmpV.copy(S.p).sub(S.anchor);
    const theta = Math.atan2(-d.z, -d.y);
    const phase = THREE.MathUtils.clamp((theta + 0.95) / 1.9, 0, 1);
    const name = S.anchorSide > 0 ? "swingR" : "swingL";
    target[name] = 1;
    if (clips[name]) clips[name].time = phase * clips[name].getClip().duration * 0.999;
  } else if (S.flip > 0) {
    target.flip = 1;
    if (clips.flip) clips.flip.time = (1 - S.flip / (Math.PI * 2)) * clips.flip.getClip().duration * 0.999;
  } else {
    target.fall = 1;
  }
  const k = 1 - Math.exp(-dt * 10);   // ~0.1 s crossfades
  for (const n in weights) {
    weights[n] += (target[n] - weights[n]) * k;
    clips[n]?.setEffectiveWeight(weights[n]);
  }
  mixer.update(dt);
}

// ---------------- posing ----------------
const Y = new THREE.Vector3(0, 1, 0);
const tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3();
// Rotate a bone so it points along dirWorld. Uses the bone's *real* rest axis (the direction
// to its child joint, which on this rig is -Y for legs and ±X for arms) and keeps its rest twist.
const restQ = new Map(), restAxis = new Map();
const tmpQ2 = new THREE.Quaternion(), restDir = new THREE.Vector3();
function aim(bone, dirWorld) {
  if (!bone) return;
  if (!restQ.has(bone)) {
    const child = bone.children.find((c) => c.isBone);
    restQ.set(bone, bone.quaternion.clone());
    restAxis.set(bone, child ? child.position.clone().normalize() : new THREE.Vector3(0, 1, 0));
  }
  bone.parent.getWorldQuaternion(tmpQ).invert();
  tmpV.copy(dirWorld).applyQuaternion(tmpQ).normalize();            // target, in parent space
  restDir.copy(restAxis.get(bone)).applyQuaternion(restQ.get(bone)); // rest pointing, in parent space
  tmpQ2.setFromUnitVectors(restDir, tmpV);
  bone.quaternion.copy(tmpQ2).multiply(restQ.get(bone));
  bone.updateMatrixWorld(true);
}
// body-space direction (x = hero's left, y = up, z = forward) -> world
const bodyDir = (x, y, z) => new THREE.Vector3(x, y, z).normalize().applyQuaternion(hero.quaternion);

function pose(t, dt) {
  if (!modelReady) return;
  if (mixer) {
    driveClips(dt);
    hero.updateMatrixWorld(true);
    if (S.anchor) {            // the clip has the body; the web arm still locks onto the real anchor
      const webArm = S.anchorSide > 0 ? "Right" : "Left";
      const toAnchor = S.anchor.clone().sub(S.p).normalize();
      aim(bones[webArm + "Arm"], toAnchor);
      aim(bones[webArm + "ForeArm"], toAnchor);
      aim(bones[webArm + "Hand"], toAnchor);
    }
    return;
  }
  hero.updateMatrixWorld(true);
  const k = Math.sin(t * 6) * 0.08;   // a little life in the limbs

  if (S.anchor) {
    // web arm locked straight to the anchor; free arm out for balance; legs long, slight scissor
    const webArm = S.anchorSide > 0 ? "Right" : "Left";
    const free = webArm === "Left" ? "Right" : "Left";
    const fs = free === "Left" ? 1 : -1;
    const toAnchor = S.anchor.clone().sub(S.p).normalize();
    aim(bones[webArm + "Arm"], toAnchor);
    aim(bones[webArm + "ForeArm"], toAnchor);
    aim(bones[webArm + "Hand"], toAnchor);
    aim(bones[free + "Arm"], bodyDir(fs * 0.9, -0.35, 0.2));
    aim(bones[free + "ForeArm"], bodyDir(fs * 0.75, -0.15, 0.45));
    aim(bones.LeftUpLeg, bodyDir(0.1, -0.95, 0.32 + k));
    aim(bones.LeftLeg, bodyDir(0.06, -0.98, 0.0));
    aim(bones.RightUpLeg, bodyDir(-0.1, -0.98, -0.12 - k));
    aim(bones.RightLeg, bodyDir(-0.06, -0.94, -0.36));
  } else {
    // free flight: open, spread-eagle silhouette
    aim(bones.LeftArm, bodyDir(0.95, -0.12 + k, 0.2));
    aim(bones.LeftForeArm, bodyDir(0.9, 0.08, 0.35));
    aim(bones.RightArm, bodyDir(-0.95, -0.12 - k, 0.2));
    aim(bones.RightForeArm, bodyDir(-0.9, 0.08, 0.35));
    aim(bones.LeftUpLeg, bodyDir(0.22, -0.95, 0.12));
    aim(bones.LeftLeg, bodyDir(0.18, -0.95, -0.22));
    aim(bones.RightUpLeg, bodyDir(-0.22, -0.95, -0.05));
    aim(bones.RightLeg, bodyDir(-0.18, -0.92, -0.38));
  }
  if (bones.Head) aim(bones.Head, bodyDir(0, 0.75, 0.66));
}

// ---------------- physics ----------------
let holding = false, lastInput = -1e9, steer = 0, assist = true;
const G = 26;

function findAnchor(prefSide) {
  let best = null, bestScore = Infinity;
  for (const side of [prefSide, -prefSide]) {
    for (const ahead of [14, 18, 22, 26, 30]) {
      const z = S.p.z - ahead;
      const b = buildingAt(side, z);
      if (!b || b.h < S.p.y + 8) continue;
      const y = Math.min(b.h - 1.5, Math.max(S.p.y + 14, 50));
      const a = new THREE.Vector3(side * STREET, y, z);
      const len = a.distanceTo(S.p);
      if (len < 14 || len > 52) continue;
      const score = Math.abs(ahead - 20) + (side === prefSide ? 0 : 12);
      if (score < bestScore) { bestScore = score; best = a; best.side = side; }
    }
    if (best) break;
  }
  return best;
}
function attach() {
  const pref = Math.abs(steer) > 0.25 ? Math.sign(steer) : -S.side; // alternate sides by default
  const a = findAnchor(pref);
  if (!a) return false;
  S.anchor = a; S.anchorSide = a.side; S.side = a.side;
  S.L = a.distanceTo(S.p);
  if (S.v.z > -28) S.v.z = -28;     // thwip
  return true;
}
function release() {
  if (!S.anchor) return;
  S.anchor = null;
  S.v.y += 6;
  if (S.v.length() > 30 && Math.random() < 0.55) S.flip = Math.PI * 2;
}

function step(dt) {
  const auto = assist && performance.now() - lastInput > 3500;
  if (auto) {
    if (!S.anchor && S.v.y < 0 && S.p.y < 36) attach();
    if (S.anchor && S.v.y > 2 && S.anchor.z - S.p.z > S.L * 0.42) release();
  } else if (holding && !S.anchor) attach();

  S.v.y -= G * dt;
  S.v.x += steer * 14 * dt * (S.anchor ? 0.3 : 1);
  S.v.multiplyScalar(1 - 0.06 * dt);
  S.p.addScaledVector(S.v, dt);

  if (S.anchor) {
    // stylised: swings mostly carry you down the avenue, not into the walls
    S.v.x *= 1 - 1.6 * dt;
    S.v.x -= S.p.x * 0.5 * dt;
    if (S.p.z > S.anchor.z) S.v.z -= 9 * dt;   // pump on the downswing
    S.L = Math.max(12, S.L - 3 * dt);   // reel in a touch: pumps the swing
    tmpV.copy(S.p).sub(S.anchor);
    const d = tmpV.length();
    if (d > S.L) {
      tmpV.divideScalar(d);
      S.p.copy(S.anchor).addScaledVector(tmpV, S.L);
      const vr = S.v.dot(tmpV);
      if (vr > 0) S.v.addScaledVector(tmpV, -vr);
    }
    if (S.anchor.z > S.p.z + 45) S.anchor = null;
  }

  // keep inside the avenue
  const lim = STREET - 1.6;
  if (Math.abs(S.p.x) > lim) { S.p.x = Math.sign(S.p.x) * lim; S.v.x *= -0.3; }
  // street: kick back up
  if (S.p.y < 1.4) { S.p.y = 1.4; S.v.y = 17; S.anchor = null; }
  if (S.p.y > 85) S.v.y = Math.min(S.v.y, 0);
  if (S.v.z > -9) S.v.z -= 18 * dt;          // always moving down the avenue
  const sp = S.v.length(); if (sp > 48) S.v.multiplyScalar(48 / sp);
}

// ---------------- orientation + camera ----------------
const up = new THREE.Vector3(), fwd = new THREE.Vector3(), right = new THREE.Vector3(), m4 = new THREE.Matrix4();
const flipQ = new THREE.Quaternion();
function orient(dt) {
  if (S.anchor) up.copy(S.anchor).sub(S.p).normalize();
  else up.set(steer * 0.25, 1, 0).normalize().lerp(tmpV.copy(S.v).normalize().negate().setY(0.8).normalize(), 0.25).normalize();
  fwd.copy(S.v).addScaledVector(up, -S.v.dot(up)).normalize();
  if (fwd.lengthSq() < 0.01) fwd.set(0, 0, -1);
  right.crossVectors(up, fwd).normalize();   // = hero's left (model faces +z)
  fwd.crossVectors(right, up);
  m4.makeBasis(right, up, fwd);
  const target = new THREE.Quaternion().setFromRotationMatrix(m4);
  if (S.flip > 0) {
    const d = Math.min(S.flip, dt * 9);
    S.flip -= d;
    flipQ.setFromAxisAngle(right, -(Math.PI * 2 - S.flip));
    target.premultiply(flipQ);
    hero.quaternion.copy(target);
  } else {
    hero.quaternion.slerp(target, 1 - Math.exp(-dt * 10));
  }
  hero.position.copy(S.p);
}

const camPos = new THREE.Vector3(0, 40, 14), camLook = new THREE.Vector3();
let intro = 1; // eases in from a wide establishing shot
let camSide = 1;
const camOff = new THREE.Vector3(18, 26, 40), lookOff = new THREE.Vector3(0, -0.7, -4);
function updateCamera(dt) {
  const speed = S.v.length();
  const close = window.__closeup ? 0.55 : 1;
  // three-quarter chase: sit off the hero's shoulder, away from the wall he's webbed to
  camSide += ((S.anchor ? -S.anchorSide : camSide) - camSide) * (1 - Math.exp(-dt * 0.8));
  const back = (4.6 + speed * 0.045) * close;
  const want = window.__sideview
    ? new THREE.Vector3(S.p.x + 4.5, S.p.y + 0.3, S.p.z)
    : new THREE.Vector3(
        S.p.x * 0.85 + camSide * 2.4 * close - steer * 1.5,
        S.p.y + 1.3 * close,
        S.p.z + back
      );
  if (intro > 0) {
    intro = Math.max(0, intro - dt * 0.35);
    want.lerp(new THREE.Vector3(18, S.p.y + 26, S.p.z + 40), intro * intro);
  }
  want.x = THREE.MathUtils.clamp(want.x, -STREET + 1, STREET - 1);
  want.y = Math.max(2.5, want.y);
  // smooth the *offset* from the hero, not the absolute position, so the camera never lags behind at speed
  camOff.lerp(want.sub(S.p), 1 - Math.exp(-dt * 3.5));
  camPos.copy(S.p).add(camOff);
  // look slightly ahead of him so he sits in the lower-middle third
  lookOff.lerp(window.__sideview ? new THREE.Vector3(0, 0, 0) : new THREE.Vector3(0, -0.7, -4), 1 - Math.exp(-dt * 8));
  camLook.copy(S.p).add(lookOff);
  camera.position.copy(camPos);
  camera.lookAt(camLook);
  camera.fov += (55 + Math.min(16, speed * 0.32) - camera.fov) * (1 - Math.exp(-dt * 3));
  camera.updateProjectionMatrix();
}

// ---------------- world follow ----------------
function followWorld(dt, t) {
  city.update(dt, t, S.p, camera);
  moon.position.set(-60, 120, S.p.z - 260);
  moonLight.target.position.copy(S.p);
  key.position.set(camera.position.x + 1.5, camera.position.y + 2, camera.position.z - 1);
  rimLight.position.set(S.p.x - 4, S.p.y + 8, S.p.z - 14);
  rimLight.target.position.copy(S.p);
  scene.getObjectByName("stars").position.z = S.p.z;

  if (S.anchor && modelReady) {
    const hand = bones[(S.anchorSide > 0 ? "Right" : "Left") + "Hand"];
    const from = hand ? hand.getWorldPosition(new THREE.Vector3()) : S.p;
    web.position.copy(from);
    web.lookAt(S.anchor);
    web.scale.set(1, 1, from.distanceTo(S.anchor));
    web.visible = true;
  } else web.visible = false;
}

// ---------------- floating things ----------------
// Pieces of the story hung over the avenue. Swing close to one and it pops.
const floaters = createFloaters(scene);
let collected = 0, toastTimer = 0;
const toast = document.getElementById("toast");
const countEl = document.getElementById("hud-count");
function updateFloaters(dt, t) {
  const auto = assist && performance.now() - lastInput > 3500;
  const { found, steerX } = floaters.update(dt, t, S.p, auto);
  S.v.x += steerX * dt;   // autopilot drifts toward the next one so visitors who just watch still find them
  if (found) {
    collected++;
    toast.innerHTML = `<span class="mono">${String(collected).padStart(2, "0")} · found</span><b>${found.t}</b><p>${found.d}</p><a href="#${found.k}">read more ↓</a>`;
    // don't pop over the intro card; the HUD count still ticks
    if (card.classList.contains("gone")) { toast.classList.add("show"); toastTimer = 5.5; }
    countEl.textContent = collected;
  }
  if (toastTimer > 0 && (toastTimer -= dt) <= 0) toast.classList.remove("show");
}

// ---------------- intro card ----------------
const card = document.getElementById("intro-card");
document.getElementById("start-btn").addEventListener("click", () => {
  card.classList.add("gone");
  stage.classList.add("playing");
  lastInput = performance.now() - 2000;
  canvas.focus?.();
});
const assistBtn = document.getElementById("assist");
assistBtn.addEventListener("click", () => {
  assist = !assist;
  assistBtn.setAttribute("aria-pressed", String(assist));
  assistBtn.querySelector("b").textContent = assist ? "on" : "off";
});

// ---------------- loop ----------------
let last = performance.now(), running = false, visible = true, t = 0, hudT = 0;
function frame(now) {
  if (!running) return;
  const dt = Math.min(1 / 30, (now - last) / 1000);
  last = now; t += dt;
  if (modelReady) for (let i = 0; i < 3; i++) step(dt / 3);
  orient(dt);
  followWorld(dt, t);
  pose(t, dt);
  updateCamera(dt);
  if (modelReady) updateFloaters(dt, t);
  composer.render();

  hudT += dt;
  if (hudT > 0.12) {
    hudT = 0;
    hud.speed.textContent = Math.round(S.v.length() * 3.6);
    hud.alt.textContent = Math.round(S.p.y);
    hud.dist.textContent = ((S.startZ - S.p.z) / 1000).toFixed(2);
    hud.mode.textContent = assist && performance.now() - lastInput > 3500 ? "autopilot" : holding ? "thwip" : S.anchor ? "swinging" : "free fall";
  }
  if (window.__freeze) running = false;
  if (visible && running) requestAnimationFrame(frame); else running = false;
}
function start() { if (running) return; running = true; last = performance.now(); requestAnimationFrame(frame); }

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  bloom.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

// ---------------- input ----------------
function press() { lastInput = performance.now(); holding = true; attach(); }
function letGo() { if (!holding) return; lastInput = performance.now(); holding = false; release(); }
canvas.addEventListener("pointerdown", (e) => { if (e.button === 0) { canvas.setPointerCapture(e.pointerId); press(); } });
canvas.addEventListener("pointerup", letGo);
canvas.addEventListener("pointercancel", letGo);
canvas.addEventListener("pointermove", (e) => {
  if (e.pointerType !== "mouse" && !holding) return;
  const r = canvas.getBoundingClientRect();
  steer = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2.4));
});
canvas.addEventListener("pointerleave", () => { steer = 0; });
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
window.addEventListener("keydown", (e) => {
  if (!visible || document.documentElement.classList.contains("reading")) return;
  if (e.code === "Space" && !e.repeat) { e.preventDefault(); press(); }
  if (e.code === "ArrowLeft" || e.code === "KeyA") { steer = -1; lastInput = performance.now(); }
  if (e.code === "ArrowRight" || e.code === "KeyD") { steer = 1; lastInput = performance.now(); }
});
window.addEventListener("keyup", (e) => {
  if (e.code === "Space") letGo();
  if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD"].includes(e.code)) steer = 0;
});

// ---------------- boot ----------------
S.startZ = S.p.z;
fillCity(S.p.z);
resize();
window.addEventListener("resize", resize);
new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) start(); }, { threshold: 0.02 }).observe(stage);
start();

// debug handle (handy while tuning; harmless in production)
window.__swing = { S, camera, bones, start: () => { window.__freeze = false; start(); } };
