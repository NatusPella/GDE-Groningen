// Het publiek langs de lijn van een dorpspark (#1115): één InstancedMesh, kleur per figuur, een sprong bij een doelpunt (alleen als beweging mag). De beslissingen (aantal, plekken, sprong) staan puur in
// voetbalworld.js (scripts/voetbal_wereld_test.mjs); dit bestand tekent ze en is niet in beeld bekeken. Een tikje kost bij hooguit 140 figuren een paar matrixschrijfacties en alleen tijdens de viering.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { parkCrowdSeats, crowdBounce, CROWD_COLORS } from './voetbalworld.js';

const FIG_H = 1.55;
// root: de groep van het veld (eigen ruimte, toLocal zet veldpunten om); count en seed bepalen wie waar staat. Geeft null als er niets te tekenen valt (laagste kwaliteit).
export function buildCrowd(root, { count, seed, B, L, toLocal, uit = false }) {
  if (uit || !(count > 0)) return null;
  const seats = parkCrowdSeats(count, seed, { B, L });
  const geo = new THREE.CylinderGeometry(0.2, 0.26, FIG_H, 6).translate(0, FIG_H / 2, 0);
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const mesh = new THREE.InstancedMesh(geo, mat, seats.length);
  const col = new THREE.Color(), m = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
  const base = seats.map((s) => { const l = toLocal(s.x, s.y); return { x: l.x, z: l.y }; });
  const zet = (i, bounce) => { const s = seats[i], b = base[i]; pos.set(b.x, bounce, b.z); sc.set(1, s.hoogte, 1); m.compose(pos, q, sc); mesh.setMatrixAt(i, m); };
  seats.forEach((s, i) => { zet(i, 0); mesh.setColorAt(i, col.setHex(CROWD_COLORS[s.kleur % CROWD_COLORS.length])); });
  mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false; mesh.castShadow = false;
  root.add(mesh);
  return {
    mesh, seats, springT: -1, klaar: true, acc: 0,
    // t = seconden sinds het doelpunt (of -1): spring tot de viering voorbij is; `beweging` false (verminderde beweging) laat het publiek stil staan.
    tik(dt, t, beweging) {
      if (!beweging) return;
      this.acc += dt;
      if (t < 0 || t >= 4) { if (!this.klaar) { seats.forEach((_, i) => zet(i, 0)); mesh.instanceMatrix.needsUpdate = true; this.klaar = true; } return; }
      if (this.acc < 1 / 15) return;
      this.acc = 0; this.klaar = false;
      seats.forEach((s, i) => zet(i, crowdBounce(t, s.fase)));
      mesh.instanceMatrix.needsUpdate = true;
    },
    dispose() { root.remove(mesh); geo.dispose(); mat.dispose(); mesh.dispose(); },
  };
}

// ---- trainende teams op de velden binnen 150 m van de speler (voetbalworld.js trainingSquads): geen sim, alleen jogfiguren en een bal; niet in beeld bekeken ----
// Per ploeg één InstancedMesh (6 tot 10 figuren in het clubshirt, zonder logo) die rondjes lopen, en een bal in het midden. `sync` zet ze neer of ruimt ze op als de speler weg is, `tik(t)` beweegt ze.
export function makeTrainers(scene) {
  const groups = new Map();
  const geo = new THREE.CylinderGeometry(0.2, 0.26, FIG_H, 6).translate(0, FIG_H / 2, 0);
  const ballGeo = new THREE.SphereGeometry(0.2, 8, 6);
  const ballMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
  const weg = (g) => { scene.remove(g.mesh); scene.remove(g.ball); g.mesh.material.dispose(); g.mesh.dispose(); };
  return {
    groups,
    sync(squads, groundAt) {
      const keep = new Set();
      for (const sq of squads) {
        const key = `${sq.club}:${Math.round(sq.x)}:${Math.round(sq.y)}`;
        keep.add(key);
        if (groups.has(key)) continue;
        const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: sq.shirt }), sq.n);
        mesh.frustumCulled = false;
        const ball = new THREE.Mesh(ballGeo, ballMat);
        const y = groundAt ? groundAt(sq.x, sq.y) : 0;
        scene.add(mesh, ball);
        groups.set(key, { sq, mesh, ball, y });
      }
      for (const [k, g] of groups) if (!keep.has(k)) { weg(g); groups.delete(k); }
    },
    tik(t) {
      for (const g of groups.values()) {
        const { sq } = g, ruim = Math.max(4, Math.min(sq.r || 12, 18)) * 0.5;
        for (let i = 0; i < sq.n; i++) {
          const hoek = t * (0.35 + 0.1 * (i % 3)) + (i * 2 * Math.PI) / sq.n, straal = ruim * (0.55 + 0.45 * (i % 2));
          pos.set(sq.x + Math.cos(hoek) * straal, g.y, sq.y + Math.sin(hoek) * straal);
          m.compose(pos, q, sc); g.mesh.setMatrixAt(i, m);
        }
        g.mesh.instanceMatrix.needsUpdate = true;
        g.ball.position.set(sq.x + Math.cos(t * 0.9) * ruim * 0.3, g.y + 0.2, sq.y + Math.sin(t * 0.7) * ruim * 0.3);
      }
    },
    dispose() { for (const g of groups.values()) weg(g); groups.clear(); geo.dispose(); ballGeo.dispose(); ballMat.dispose(); },
  };
}
