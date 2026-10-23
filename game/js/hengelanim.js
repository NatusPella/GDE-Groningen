// De hengel in beeld (#437): een laag-poly hengel in de hand, een lijn met doorhang, een rood-wit dobbertje dat dobbert, zakt en
// trilt bij een beet, een plons als hij landt en een vis die even springt en terug het water in gaat. De houding per fase staat in
// hengelpose.js (puur, getest); dit tekent het. Werkt vanaf de kant en vanuit een boot.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { WATER_Y } from './util.js';
import { hengelPose, vangstBoog, dobberPositie, lijnPunten, REIK } from './hengelpose.js';

const LIJN_N = 10;
const ROD_LEN = 2.1;
const OMHOOG = new THREE.Vector3(0, 1, 0);

export function maakHengelAnim() {
  const scene = getScene();
  if (!scene) return null;
  const g = new THREE.Group();
  g.name = 'hengelanim';
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.03, ROD_LEN, 5), mat(0x5a3b1e));
  rod.geometry.translate(0, ROD_LEN / 2, 0);
  const dobber = new THREE.Group();
  dobber.add(
    new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xd8312a)),
    new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0xf4f0e6)),
  );
  const lijnGeo = new THREE.BufferGeometry();
  lijnGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((LIJN_N + 1) * 3), 3));
  const lijn = new THREE.Line(lijnGeo, new THREE.LineBasicMaterial({ color: 0xeeeeee }));
  lijn.frustumCulled = false;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.22, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  const vis = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 5), mat(0x8fa6b8));
  vis.rotation.z = Math.PI / 2;
  g.add(rod, dobber, lijn, ring, vis);
  rod.visible = dobber.visible = lijn.visible = ring.visible = vis.visible = false;
  scene.add(g);

  const s = { phase: 'idle', t: 0, splashT: -1, splashAt: null, vangstT: -1 };
  return {
    // events: de gebeurtenissen van stepHengel van deze stap; st: de toestand (phase, bite); plek: het water waar je naartoe hengelt.
    update(dt, w, st, events, plek) {
      const nieuweFase = st.phase !== s.phase;
      if (nieuweFase) { s.phase = st.phase; s.t = 0; } else s.t += dt;
      const p = w.player, v = p.inVehicle;
      const px = v ? v.x : p.x, py = v ? v.y : p.y;
      let ang = v ? v.angle : p.angle || 0;
      const dx = plek.x - px, dy = plek.y - py, afstandPlek = Math.hypot(dx, dy);
      if (afstandPlek > 1.5) ang = Math.atan2(dy, dx);
      const ux = Math.cos(ang), uy = Math.sin(ang);
      const grond = v ? WATER_Y + 0.75 : (Number.isFinite(p.z) ? p.z : (w.map && w.map.groundHeightAt ? (w.map.groundHeightAt(px, py, 0) || 0) : 0));
      const hand = { x: px + ux * 0.45, y: py + uy * 0.45, h: grond + 1.05 };
      const bijt = st.phase === 'bite' ? Math.max(0, Math.min(1, (st.bite || 0) / Math.max(0.2, (st.fish && st.fish.window) || 1))) : 0;
      const o = hengelPose(st.phase, s.t, bijt);
      const sr = Math.sin(o.rod), cr = Math.cos(o.rod);
      const tip = { x: hand.x + ux * sr * ROD_LEN, y: hand.y + uy * sr * ROD_LEN, h: hand.h + cr * ROD_LEN };
      rod.visible = true;
      rod.position.set(hand.x, hand.h, hand.y);
      rod.quaternion.setFromUnitVectors(OMHOOG, new THREE.Vector3(ux * sr, cr, uy * sr).normalize());
      const afstand = afstandPlek > 1.5 ? Math.min(REIK, afstandPlek) : REIK;
      const doel = { x: px + ux * afstand, y: py + uy * afstand, h: WATER_Y + 0.02 };
      for (const e of events || []) {
        if (e.type === 'catch') { s.vangstT = 0; s.splashAt = { ...doel }; s.splashT = 0; }
        if (e.type === 'lost' || e.type === 'early') { s.splashAt = { ...doel }; s.splashT = 0; }
      }
      // de plons als het dobbertje landt
      if (nieuweFase && st.phase === 'wait') { s.splashAt = { ...doel }; s.splashT = 0; }
      const d = dobberPositie(tip, doel, o.uit, o.boog);
      d.h += o.bob - o.dip;
      if (o.trilling) d.x += Math.sin(s.t * 40) * 0.02;
      dobber.visible = lijn.visible = o.zichtbaar;
      dobber.position.set(d.x, d.h, d.y);
      if (o.zichtbaar) {
        const a = lijnGeo.attributes.position;
        lijnPunten(tip, d, o.hang, o.spanning, LIJN_N).forEach((q, i) => a.setXYZ(i, q.x, q.h, q.y));
        a.needsUpdate = true;
      }
      if (s.splashT >= 0 && s.splashAt) {
        s.splashT += dt;
        const u = s.splashT / 0.9;
        if (u >= 1) { s.splashT = -1; ring.visible = false; } else {
          ring.visible = true; ring.position.set(s.splashAt.x, WATER_Y + 0.04, s.splashAt.y);
          ring.scale.setScalar(1 + u * 5); ring.material.opacity = 0.65 * (1 - u);
        }
      }
      // de gevangen vis springt en gaat terug het water in
      if (s.vangstT >= 0) {
        s.vangstT += dt;
        const b = vangstBoog(s.vangstT);
        if (!b) { s.vangstT = -1; vis.visible = false; } else {
          vis.visible = true;
          vis.position.set(doel.x + (hand.x - doel.x) * b.p * 0.5, WATER_Y + b.hoogte, doel.y + (hand.y - doel.y) * b.p * 0.5);
          vis.rotation.y = -ang; vis.rotation.x = b.terug ? 0.9 : -0.9;
        }
      }
    },
    dispose() {
      if (g.parent) g.parent.remove(g);
      g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    },
  };
}
