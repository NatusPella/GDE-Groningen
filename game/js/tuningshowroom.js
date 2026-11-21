import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { buildVehicleMesh, releaseVehicleGeometries, updateVehicleWheelSpin } from './models3d_vehicles.js';
import { previewVehicle } from './garagepics.js';
import { tickVehicleLook } from './vehiclelook3d.js';
import {
  envFor, viewPreset, nextView, orbitPosition, stepCamera, turntableAz, clamp, ZOOM_MIN, ZOOM_MAX, EL_MIN, EL_MAX, effectLevel, EFFECT_MS, flashSpot,
  splitViewports, SHOWROOM_BUDGET,
} from './showroomplan.js';

// De showroom van de pimp-werkplaats (epic Autotuning, #1155, ronde 3): één renderer en één scène met een draaitafel, studiolicht
// (key, fill, rim), een spiegelende vloer (een omgekeerde kopie met lage alpha), een garagewand met neonlijnen en halogeenstrips
// (goedkope MeshBasic-materialen), camerastanden en effecten bij een wissel. De regels (standen, sfeer, effecten) staan in
// showroomplan.js en zijn getest; dit bestand tekent alleen. Budget: SHOWROOM_BUDGET (geen schaduwkaarten, 5 lichten).

const disposeMesh = (m) => {
  releaseVehicleGeometries(m);
  m.traverse((o) => {
    const g = o.geometry;
    if (g && !(g.userData && g.userData.shared)) g.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const mat of mats) if (!mat.userData || !mat.userData.shared) { if (mat.map) mat.map.dispose(); mat.dispose(); }
  });
};

export function createShowroom(canvas, { active = () => true, pixelRatio = () => Math.min(SHOWROOM_BUDGET.maxPixelRatio, devicePixelRatio || 1), reduced = () => false } = {}) {
  const S = { renderer: null, scene: null, cam: null, raf: 0, last: 0, dead: false, env: null, kind: 'garage' };
  const cur = { az: 0.62, el: 0.2, dist: 7, target: [0, 0.6, 0] };
  let goal = { ...cur, target: [...cur.target] };
  let zoom = 1, idle = 0, viewId = 'schuin', drag = null, size = { L: 4, W: 1.8, H: 1.5 }, wheelPos = null;
  let pri = null, sec = null, refl = null, split = 0, offsetX = 0;
  let fx = null; // { kind, t0, spot, color }
  let spin = 0, neonT = 0;
  const parts = {};

  function setup() {
    S.renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true });
    S.renderer.outputColorSpace = THREE.SRGBColorSpace;
    S.scene = new THREE.Scene();
    S.cam = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
    parts.hemi = new THREE.HemisphereLight(0xf4f2ec, 0x1d1b17, 0.55);
    parts.key = new THREE.DirectionalLight(0xfff4e0, 2.3); parts.key.position.set(6, 8, 5);
    parts.fill = new THREE.DirectionalLight(0xbcd2ff, 0.7); parts.fill.position.set(-7, 3, 4);
    parts.rim = new THREE.DirectionalLight(0xffffff, 1.6); parts.rim.position.set(-3, 5, -8);
    parts.fx = new THREE.PointLight(0xffffff, 0, 6, 1.6); // het enige effectlicht: staat uit, geen herbouw van shaders
    S.scene.add(parts.hemi, parts.key, parts.fill, parts.rim, parts.fx);
    // vloer: een rond podium dat licht doorlaat (de omgekeerde kopie schijnt erdoor), met een lichte rand
    parts.floor = new THREE.Mesh(new THREE.CircleGeometry(7, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x0c140e, roughness: 0.25, metalness: 0.5, transparent: true, opacity: 0.78 }));
    parts.floor.renderOrder = 1;
    parts.ring = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.32, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf9c80e }));
    parts.ring.position.y = 0.01; parts.ring.renderOrder = 2;
    parts.ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x0c140e }));
    parts.ground.position.y = -0.02;
    S.scene.add(parts.floor, parts.ring, parts.ground);
    // de wand: een grote vlakke plaat met neonlijnen en een rij halogeenstrips (MeshBasic, geen lichten)
    parts.wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), new THREE.MeshLambertMaterial({ color: 0x17301f }));
    parts.wall.position.set(-12, 6, 0); parts.wall.rotation.y = Math.PI / 2;
    S.scene.add(parts.wall);
    parts.neon = [];
    for (let i = 0; i < SHOWROOM_BUDGET.neonStrips; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 16 - i * 1.6), new THREE.MeshBasicMaterial({ color: 0xf9c80e }));
      m.position.set(-11.9, 1.2 + i * 1.1, 0); parts.neon.push(m); S.scene.add(m);
    }
    parts.halogen = [];
    for (let i = -4; i <= 4; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.22), new THREE.MeshBasicMaterial({ color: 0xfff2cc })); m.position.set(-8, 8.4, i * 2.2); parts.halogen.push(m); S.scene.add(m); }
    // deeltjes voor de spuitbus (één Points, hergebruikt)
    const n = SHOWROOM_BUDGET.particles;
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
    parts.spray = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.12, color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false, sizeAttenuation: true }));
    parts.spray.visible = false; parts.spray.frustumCulled = false;
    S.scene.add(parts.spray);
    applyEnv(S.kind);
  }

  function applyEnv(kind) {
    S.kind = kind;
    if (!S.scene) return;
    const e = envFor(kind);
    S.env = e;
    parts.wall.material.color.setHex(e.wall);
    parts.floor.material.color.setHex(e.floor);
    parts.ground.material.color.setHex(e.floor);
    parts.ring.material.color.setHex(e.neon[0]);
    parts.rim.color.setHex(e.rim);
    parts.neon.forEach((m, i) => m.material.color.setHex(e.neon[i % e.neon.length]));
    parts.halogen.forEach((m) => m.material.color.setHex(e.halogen));
    S.scene.background = new THREE.Color(e.wall).multiplyScalar(0.55);
  }

  function clearMeshes() {
    for (const m of [pri, sec, refl]) if (m) { S.scene.remove(m); disposeMesh(m); }
    refl = null;
    pri = sec = null;
  }

  function build(spec) {
    const mesh = buildVehicleMesh(previewVehicle(spec));
    if (spec.tune) tickVehicleLook(mesh, 0, 1); // de underglow brandt in de showroom altijd
    return mesh;
  }

  function measure(mesh) {
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    const sz = box.getSize(new THREE.Vector3());
    size = { L: sz.x, W: sz.z, H: sz.y };
    const w = mesh.userData.wheels && mesh.userData.wheels[0];
    wheelPos = w ? { x: w.position.x, y: w.position.y, z: Math.abs(w.position.z) } : null;
  }

  // Zet het voertuig op de tafel. spec: een voorbeeldspec (vehiclepreview.js). before: de spec van "voor" voor de gesplitste weergave (of null).
  function show(spec, before = null) {
    if (!S.renderer) setup();
    const prevSize = size.L;
    clearMeshes();
    if (!spec) { stop(); return; }
    pri = build(spec);
    measure(pri);
    S.scene.add(pri);
    refl = build(spec); // een tweede exemplaar (gedeelde geometrie uit de cache), omgekeerd: de nepspiegeling
    refl.scale.y = -1;
    S.scene.add(refl);
    if (before) { sec = build(before); S.scene.add(sec); }
    split = before ? 1 : 0;
    layout();
    if (Math.abs(prevSize - size.L) > 0.01) setView(viewId, true);
    kick();
  }

  // De twee voertuigen naast elkaar bij een gesplitste weergave; anders staat het voertuig in het midden.
  function layout() {
    if (!pri) return;
    if (split && sec) { pri.position.set(0, 0, -size.W * 0.95); sec.position.set(0, 0, size.W * 0.95); } else pri.position.set(0, 0, 0);
    if (refl) refl.position.copy(pri.position);
    parts.ring.visible = !split;
  }

  function setView(id, snap = false) {
    viewId = id;
    const v = viewPreset(id, size, wheelPos);
    goal = { az: v.az, el: v.el, dist: v.dist, target: [...v.target] };
    zoom = 1; idle = 0;
    if (snap) { cur.az = goal.az; cur.el = goal.el; cur.dist = goal.dist; cur.target = [...goal.target]; }
  }

  // Een effect bij een wissel van onderdeel: kind uit showroomplan (spray, spin, neon, flash), field voor de plek, color voor de spuitbus.
  function effect(kind, field = '', color = 0xffffff) {
    if (!S.scene || !pri) return;
    const sp = flashSpot(field);
    fx = { kind, t0: performance.now(), spot: [sp[0] * size.L * 0.5, size.H * (0.1 + sp[1] * 0.8), sp[2] * size.W * 0.5], color };
    if (kind === 'spray') { parts.spray.material.color.set(color); parts.spray.visible = true; }
    if (kind === 'spin') spin = 1;
    if (kind === 'neon') neonT = performance.now();
    parts.fx.color.set(kind === 'spray' ? color : 0xffffff);
  }

  function frame(now) {
    S.raf = 0;
    if (S.dead || !pri || !active()) return;
    const dt = Math.min(0.1, (now - (S.last || now)) / 1000);
    S.last = now;
    const w = canvas.clientWidth, h = canvas.clientHeight, pr = pixelRatio();
    if (w && h && (canvas.width !== Math.round(w * pr) || canvas.height !== Math.round(h * pr))) S.renderer.setSize(w, h, false), S.renderer.setPixelRatio(pr);
    idle += dt;
    if (!drag) goal.az = turntableAz(goal.az, idle, dt, reduced());
    const c = stepCamera(cur, goal, dt, drag ? 14 : 5);
    cur.az = c.az; cur.el = c.el; cur.dist = c.dist; cur.target = c.target;
    const dist = cur.dist * zoom * (split ? 1.5 : 1); // gesplitst: elke helft is smaller, dus verder weg
    const p = orbitPosition(cur.az, cur.el, dist, cur.target);
    S.cam.position.set(p[0], p[1], p[2]);
    S.cam.lookAt(cur.target[0], cur.target[1], cur.target[2]);
    // effecten
    const age = fx ? now - fx.t0 : 1e9;
    const lvl = fx ? effectLevel(fx.kind, age) : 0;
    parts.fx.intensity = fx && (fx.kind === 'flash' || fx.kind === 'spray') ? lvl * 14 : 0;
    if (fx) parts.fx.position.set(pri.position.x + fx.spot[0], fx.spot[1] + 0.5, pri.position.z + fx.spot[2] + 0.6);
    if (fx && fx.kind === 'spray') updateSpray(age / EL_MS('spray'), lvl);
    else parts.spray.visible = false;
    if (spin > 0.01) { spin *= Math.exp(-2.2 * dt); updateVehicleWheelSpin(pri, spin * 24, dt, 0); if (sec) updateVehicleWheelSpin(sec, spin * 24, dt, 0); }
    if (pri.userData.lookGlow) { const k = clamp((now - neonT) / EL_MS('neon'), 0, 1); const s2 = 0.35 + 0.65 * (1 - (1 - k) ** 3); pri.userData.lookGlow.scale.set(s2, 1, s2); }
    tickVehicleLook(pri, now / 1000, 1, true);
    if (sec) tickVehicleLook(sec, now / 1000, 1, true);
    if (fx && lvl === 0 && age > EL_MS(fx.kind)) fx = null;
    render(w, h);
    S.raf = requestAnimationFrame(frame);
  }
  const EL_MS = (k) => EFFECT_MS[k] || 400;

  function updateSpray(t, lvl) {
    const a = parts.spray.geometry.attributes.position, n = a.count;
    parts.spray.visible = true;
    parts.spray.material.opacity = 0.2 + lvl * 0.6;
    for (let i = 0; i < n; i++) {
      const ph = (i * 0.618) % 1, ang = i * 2.4;
      const r = (0.3 + ph) * (0.4 + t * 1.2);
      a.setXYZ(i, pri.position.x + fx.spot[0] * 0.2 + Math.cos(ang) * r * size.L * 0.35, size.H * (0.15 + ph * 0.8) + t * 0.2, pri.position.z + Math.sin(ang) * r * size.W * 0.7);
    }
    a.needsUpdate = true;
  }

  function render(w, h) {
    const r = S.renderer;
    S.cam.aspect = w / h;
    if (offsetX) S.cam.setViewOffset(w, h, -offsetX, 0, w, h); else S.cam.clearViewOffset();
    S.cam.updateProjectionMatrix();
    if (!split || !sec) { r.setScissorTest(false); r.setViewport(0, 0, w, h); r.render(S.scene, S.cam); return; }
    // gesplitst: links "voor", rechts "na", elk met hetzelfde voertuigbeeld maar een eigen camera-aspect
    const [L, R] = splitViewports(w);
    r.setScissorTest(true);
    for (const [vp, which] of [[L, sec], [R, pri]]) {
      r.setViewport(vp.x, 0, vp.w, h); r.setScissor(vp.x, 0, vp.w, h);
      S.cam.aspect = vp.w / h; S.cam.clearViewOffset(); S.cam.updateProjectionMatrix();
      pri.visible = which === pri; sec.visible = which === sec; if (refl) refl.visible = which === pri;
      // het voertuig van deze helft in het midden zetten
      const keep = which.position.z; which.position.z = 0; if (refl && which === pri) refl.position.z = 0;
      r.render(S.scene, S.cam);
      which.position.z = keep; if (refl && which === pri) refl.position.z = keep;
    }
    pri.visible = sec.visible = true; if (refl) refl.visible = true;
    r.setScissorTest(false);
  }

  function kick() { if (!S.raf && !S.dead) { S.last = 0; S.raf = requestAnimationFrame(frame); } }
  function stop() { cancelAnimationFrame(S.raf); S.raf = 0; }

  // aanraking: slepen draait (horizontaal) en verandert de hoogte (verticaal), het wiel zoomt
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, az: goal.az, el: goal.el }; canvas.setPointerCapture(e.pointerId); idle = 0; });
  canvas.addEventListener('pointermove', (e) => { if (!drag) return; goal.az = drag.az - (e.clientX - drag.x) * 0.008; goal.el = clamp(drag.el + (e.clientY - drag.y) * 0.006, EL_MIN, EL_MAX); idle = 0; });
  const up = () => { drag = null; idle = 0; };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); e.stopPropagation(); zoom = clamp(zoom * (e.deltaY > 0 ? 1.08 : 0.92), ZOOM_MIN, ZOOM_MAX); idle = 0; }, { passive: false });

  return {
    show, effect, setEnv: applyEnv, setView, view: () => viewId,
    nextView: (dir = 1) => { setView(nextView(viewId, dir)); return viewId; },
    setOffset(px) { offsetX = px; },
    wake: kick, clear() { if (S.renderer) { clearMeshes(); stop(); } },
    isSplit: () => !!split,
    dispose() { S.dead = true; stop(); if (S.renderer) { clearMeshes(); S.renderer.dispose(); S.renderer.forceContextLoss(); S.renderer = null; } },
  };
}
