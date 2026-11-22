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
export const kickPeriod = (sq) => 2.4 + 1.2 * ((Math.abs(Math.round(sq.x * 7 + sq.y * 13)) % 10) / 10);
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
    // kick(sq, x, y): een trap van de ploeg (elke 2,4 tot 3,6 s per veld, op een vaste maat); de aanroeper kiest het geluid (voetbal.js: sfxEvent) en let op de afstand tot de speler.
    tik(t, kick) {
      for (const g of groups.values()) {
        const { sq } = g, ruim = Math.max(4, Math.min(sq.r || 12, 18)) * 0.5;
        for (let i = 0; i < sq.n; i++) {
          const hoek = t * (0.35 + 0.1 * (i % 3)) + (i * 2 * Math.PI) / sq.n, straal = ruim * (0.55 + 0.45 * (i % 2));
          pos.set(sq.x + Math.cos(hoek) * straal, g.y, sq.y + Math.sin(hoek) * straal);
          m.compose(pos, q, sc); g.mesh.setMatrixAt(i, m);
        }
        g.mesh.instanceMatrix.needsUpdate = true;
        g.ball.position.set(sq.x + Math.cos(t * 0.9) * ruim * 0.3, g.y + 0.2, sq.y + Math.sin(t * 0.7) * ruim * 0.3);
        const maat = Math.floor(t / kickPeriod(sq));
        if (g.maat === undefined) g.maat = maat;       // het eerste meetmoment zet alleen de maat: geen trap bij het neerzetten
        else if (maat !== g.maat) { g.maat = maat; if (kick) kick(sq, sq.x, sq.y); }
      }
    },
    dispose() { for (const g of groups.values()) weg(g); groups.clear(); geo.dispose(); ballGeo.dispose(); ballMat.dispose(); },
  };
}

// ---- reclameborden langs de zijlijnen (#1118): de verzonnen namen van de geaccepteerde sponsors (voetbalsponsors.js boardNames), hooguit drie, vier borden per kant op een plek in het gras-randje (1,1 m buiten de lijn) ----
// Alleen tekst op een effen vlak (geen logo, geen echt merk). Materialen en teksturen zijn gedeeld tussen wedstrijden (userData.shared), de geometrie hoort bij de wedstrijd en gaat mee met de groep.
const adMats = new Map();
const AD_KLEUR = { bord: 0x17301f, rand: 0xf4c430, tekst: 0xf0ede4 };   // dezelfde donkergroene bord- en gele randkleur als het bord bij de poort (voetbal.js)
const css = (v) => `#${(v >>> 0).toString(16).padStart(6, '0')}`;
function adMat(naam) {
  let m = adMats.get(naam);
  if (m) return m;
  let map = null;
  try {
    const c = document.createElement('canvas'); c.width = 512; c.height = 80;
    const g = c.getContext('2d');
    g.fillStyle = css(AD_KLEUR.bord); g.fillRect(0, 0, 512, 80);
    g.strokeStyle = css(AD_KLEUR.rand); g.lineWidth = 4; g.strokeRect(4, 4, 504, 72);
    g.fillStyle = css(AD_KLEUR.tekst); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = "bold 46px 'Bebas Neue','Arial Narrow',Arial,sans-serif";
    g.fillText(String(naam).toUpperCase(), 256, 42, 480);
    map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
  } catch (e) { map = null; }
  m = new THREE.MeshBasicMaterial(map ? { map } : { color: AD_KLEUR.bord });
  m.userData.shared = true;
  if (adMats.size > 24) adMats.clear();
  adMats.set(naam, m);
  return m;
}
export const AD_BOARDS = { max: 3, perKant: 4, breed: 5, hoog: 0.8, rand: 1.1 };
export function buildAdBoards(root, { names, B, L, toLocal }) {
  const lijst = (names || []).filter((n) => typeof n === 'string' && n.trim()).slice(0, AD_BOARDS.max);
  if (!lijst.length || !(B > 0) || !(L > 0)) return null;
  const groep = new THREE.Group();
  groep.name = 'reclameborden';
  const geo = new THREE.PlaneGeometry(AD_BOARDS.breed, AD_BOARDS.hoog);
  let i = 0;
  for (const kant of [-1, 1]) {
    for (let k = 0; k < AD_BOARDS.perKant; k++) {
      const along = (k - (AD_BOARDS.perKant - 1) / 2) * (L * 0.2), q = toLocal(kant * (B / 2 + AD_BOARDS.rand), along);
      const bord = new THREE.Mesh(geo, adMat(lijst[i++ % lijst.length]));
      bord.position.set(q.x, AD_BOARDS.hoog / 2 + 0.05, q.y);
      bord.rotation.y = -kant * Math.PI / 2;      // met het gezicht naar het veld
      groep.add(bord);
    }
  }
  root.add(groep);
  return { groep, namen: lijst };
}
