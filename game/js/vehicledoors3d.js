// Voertuigdeuren tekenen (#225): scharnierende of schuivende panelen op de carrosserie.
// Regels en data staan in vehicledoors.js. Een deur is een dunne doos met gedeelde
// geometrie per maat; een gesloten deur wordt niet getekend (de carrosserie heeft het
// paneel al), dus een rijdende auto kost niets extra. Deuren worden pas aangemaakt als er
// er een open moet of los is. Geen physics.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { markShared } from './pixelart3d.js';
import { wantsCabin } from './cabin3d.js';
import {
  doorsFor, deurVoorRol, ensureDoors, wantDoor, stepDoors, deurStand, reconcileDoors,
  deurDoelVoorAnim, stilstandDeurOpen, DEUR_HOUD_TIJD, MAX_LOSSE_DEUREN,
} from './vehicledoors.js';

const geoCache = new Map();
const matCache = new Map();
const panelGeo = (w, h) => {
  const key = w.toFixed(2) + 'x' + h.toFixed(2);
  let g = geoCache.get(key);
  if (!g) { g = markShared(new THREE.BoxGeometry(w, h, 0.05)); geoCache.set(key, g); }
  return g;
};
const boxGeo = (x, y, z) => {
  const key = 'b' + [x, y, z].map((n) => n.toFixed(2)).join('x');
  let g = geoCache.get(key);
  if (!g) { g = markShared(new THREE.BoxGeometry(x, y, z)); geoCache.set(key, g); }
  return g;
};
// Het onderste, dichte deel van een hoge deur (cabine van vrachtwagen of trekker): paneel in lak, de ruit erboven is een apart blok.
const lowerGeo = (w, h) => {
  const key = 'l' + w.toFixed(2) + 'x' + h.toFixed(2);
  let g = geoCache.get(key);
  if (!g) { g = markShared(new THREE.BoxGeometry(w, h, 0.05)); geoCache.set(key, g); }
  return g;
};
// Wat je door een open portier ziet bij een voertuig zonder echte cabine (cabin3d.js): geen zwart vlak maar het interieur in
// vertexkleuren, in voertuigcoördinaten (+x is voor): de dorpel met instaplijst, de vloer in stofgrijs, de zitting en de leuning
// van de stoel met zijwangen, de binnenkant van de B-stijl achter en de A-stijl of de rug van de voorstoel voor, en bij een
// voordeur de rand van het dashboard met een ventilatierooster. Eén gedeelde geometrie per maat, kant en soort deur.
const INTERIEUR_MAT = (() => { const m = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }); m.userData.shared = true; return m; })();
const interieurGeo = (w, h, side, voor) => {
  const key = 'i' + w.toFixed(2) + 'x' + h.toFixed(2) + side + (voor ? 'v' : 'a');
  let g = geoCache.get(key);
  if (g) return g;
  const pos = [], col = [];
  const c = new THREE.Color();
  // fracties: fx -0.5..0.5 over de breedte (voor = +), fy 0..1 van onder naar boven
  const quad = (fx0, fy0, fx1, fy1, laag, hex) => {
    c.setHex(hex);
    const x0 = fx0 * w, x1 = fx1 * w, y0 = -h / 2 + fy0 * h, y1 = -h / 2 + fy1 * h, z = laag * 0.0007 * side;
    for (const [x, y] of [[x0, y0], [x1, y0], [x1, y1], [x0, y0], [x1, y1], [x0, y1]]) { pos.push(x, y, z); col.push(c.r, c.g, c.b); }
  };
  quad(-0.5, 0, 0.5, 1, 0, 0x34363c);                 // diepte: de andere kant van de cabine, donkergrijs
  quad(-0.5, 0.14, 0.5, 0.3, 1, 0x4a4b4e);            // vloer, stofgrijs
  quad(-0.5, 0, 0.5, 0.14, 2, 0x7d8086);              // dorpel
  quad(-0.5, 0.115, 0.5, 0.14, 3, 0xa9adb3);          // instaplijst
  const s0 = voor ? -0.42 : -0.38, s1 = voor ? 0.22 : 0.3;
  quad(s0, 0.3, s1, 0.52, 2, 0x5b5f69);               // zitting
  quad(s0, 0.5, s1, 0.55, 3, 0x70747f);               // voorrand van de zitting (licht)
  quad(s0, 0.55, s0 + 0.24, 1, 2, 0x535761);          // rugleuning
  quad(s0 + 0.2, 0.55, s0 + 0.26, 1, 3, 0x656a75);    // zijwang van de leuning
  quad(-0.5, 0, -0.44, 1, 4, 0x45474d);               // binnenkant van de B-stijl (achter)
  if (voor) {
    quad(0.3, 0.62, 0.5, 1, 3, 0x26282c);             // dashboardrand
    quad(0.33, 0.78, 0.47, 0.86, 4, 0x3d4046);        // ventilatierooster
    quad(0.44, 0, 0.5, 0.62, 4, 0x3a3c41);            // A-stijl en schopplaat
  } else {
    quad(0.3, 0.3, 0.5, 1, 3, 0x4d515a);              // rug van de voorstoel
  }
  g = markShared(new THREE.BufferGeometry());
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geoCache.set(key, g);
  return g;
};
const LINER_HEX = 0x2a2c30;
const panelMat = (hex, glas) => {
  const key = hex + (glas ? 'g' : '');
  let m = matCache.get(key);
  if (!m) {
    m = glas
      ? new THREE.MeshStandardMaterial({ color: 0x2b3740, roughness: 0.28, metalness: 0, transparent: true, opacity: 0.55, depthWrite: false })
      : new THREE.MeshStandardMaterial({ color: hex, roughness: 0.5, metalness: 0.1 });
    m.userData.shared = true;
    matCache.set(key, m);
  }
  return m;
};
// de open deur van een bus kijkt in een verlichte bus (grijsblauw), niet in een zwart gat (#385)
const BUS_HOLE_MAT = (() => { const m = new THREE.MeshBasicMaterial({ color: 0x59636d }); m.userData.shared = true; return m; })();
// De opening van een portier (#389), in twee stappen met een stencil: eerst een onzichtbaar vlak op de plek van het portier
// dat alleen daar stencil 1 zet waar het portiergat het dichtstbijzijnde is (dus niet achter een persoon of het deurblad),
// dan een donker vlak dat binnen die stencil de diepte terugzet naar het verste punt. De cabine (cabin3d.js, renderOrder 11)
// daarna tekent zich erdoorheen: een echte opening in plaats van een zwart vlak op een dichte carrosserie.
const CABIN_MARK_MAT = (() => {
  const m = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp });
  m.userData.shared = true;
  return m;
})();
const CABIN_HOLE_MAT = (() => {
  const m = new THREE.ShaderMaterial({
    // 23-11: het interieur in vertexkleuren (interieurGeo) in plaats van één zwarte kleur; zolang de cabine er niet is (verder weg,
    // of buiten het LOD van cabin3d.js) zie je dus stoel, dorpel en dashboard, en de echte cabine tekent er daarna overheen
    vertexColors: true,
    vertexShader: 'varying vec3 vC; void main() { vC = color; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vC; void main() { gl_FragColor = vec4(pow(vC, vec3(0.4545)), 1.0); gl_FragDepth = 1.0; }',
    fog: false, toneMapped: false, depthFunc: THREE.AlwaysDepth,
    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.EqualStencilFunc, stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp,
  });
  m.userData.shared = true;
  return m;
})();
const HOLE_MAT = (() => { const m = new THREE.MeshBasicMaterial({ color: 0x121214 }); m.userData.shared = true; return m; })();

const toHex = (c, fb) => (typeof c === 'number' ? c : typeof c === 'string' ? new THREE.Color(c).getHex() : fb);

function paintOf(v) {
  if (v.wrecked) return 0x1f1d1b;
  if (v.isPolice && !v._commandeered && !(v.model && v.model.resprayed)) return 0xeceae4;
  if (v.isAmbulance) return 0xf1d21c;
  return toHex(v.model && v.model.color, 0xc7c9cc);
}

// Op de bodem liggende losse deuren, oudste eerst weg boven het maximum.
const loseDeuren = [];
const wereld = { n: 0 };

// Een romp met echte deuropeningen (models3d_vehicles.js zet userData.echtGat): geen vlak in de opening, de dichte deuren staan
// zolang er geen rig is in één statische mesh (userData.deurenDicht) en daarna in de rig zelf.
const LEEG_GEO = (() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([], 3)); g.userData.shared = true; return g; })();
const DRAGER_MAT = (() => { const m = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }); m.userData.shared = true; return m; })();

function buildRig(mesh, v, defs) {
  const echtSet = mesh.userData.echtGat; // de deuren (id) die een echte opening in de romp hebben
  const group = new THREE.Group();
  group.name = 'deuren';
  // de getekende maat (een hybride romp kan van de botsmaat afwijken, models3d_vehicles.js userData.deurLen)
  const wid = mesh.userData.deurWid || v.model.wid, hw = wid / 2, len = mesh.userData.deurLen || v.model.len;
  const doors = {};
  const paint = paintOf(v);
  for (const d0 of defs) {
    // een hybride romp kan een deur korter maken voor de wielkast (models3d_vehicles.js userData.deurMaat): de rig volgt dat gat
    const d = mesh.userData.deurMaat && mesh.userData.deurMaat[d0.id] ? { ...d0, ...mesh.userData.deurMaat[d0.id] } : d0;
    const cx = d.x * len;
    // smalle cabine of limousine: de deur zit op zijn eigen zijkant (d.zij); bij een romp met een gebogen flank (de hybride proef-auto)
    // geeft het model zelf de flank per deur (userData.deurZ)
    const hwD = (mesh.userData.deurZ && mesh.userData.deurZ[d.id]) || (d.zij ? d.zij * wid : hw);
    const pivot = new THREE.Group();
    const echt = !!(echtSet && echtSet.has(d.id));
    let panel, hole, baseX, baseZ = 0;
    if (d.soort === 'kap' || d.soort === 'klep') {
      // horizontaal plaatwerk: scharnier achter (kap) of voor (kofferbak), klapt omhoog
      const breed = v.model.wid * 0.78, kap = d.soort === 'kap';
      baseX = kap ? cx - d.w / 2 : cx + d.w / 2;
      pivot.position.set(baseX, d.y0, 0);
      panel = new THREE.Mesh(boxGeo(d.w, 0.035, breed), panelMat(paint, false));
      panel.position.set(kap ? d.w / 2 : -d.w / 2, 0.02, 0);
      hole = new THREE.Mesh(boxGeo(d.w * 0.92, 0.02, breed * 0.92), HOLE_MAT);
      hole.position.set(cx, d.y0 + 0.005, 0);
      panel.userData.flat = true;
    } else if (d.soort === 'achterdeur') {
      // laadklep/achterdeur: scharnier links, zwaait naar achteren
      baseX = cx - 0.02; baseZ = -d.w / 2;
      pivot.position.set(baseX, d.y0 + d.h / 2, baseZ);
      panel = new THREE.Mesh(boxGeo(0.035, d.h, d.w), panelMat(paint, false));
      panel.position.set(0, 0, d.w / 2);
      hole = new THREE.Mesh(boxGeo(0.02, d.h * 0.92, d.w * 0.92), HOLE_MAT);
      hole.position.set(cx + 0.01, d.y0 + d.h / 2, 0);
    } else {
      const glas = d.h > 1.05;
      baseX = d.soort === 'scharnier' ? cx + d.w / 2 : d.soort === 'achterscharnier' ? cx - d.w / 2 : cx;
      // echt gat (23-11, eis eigenaar): de romp heeft een opening en de dichte deur vult die, dus het deurblad ligt in de flank
      // (buitenkant gelijk met het plaatwerk) in plaats van ervoor
      baseZ = d.side * (hwD + (echt ? -0.025 : 0.02));
      pivot.position.set(baseX, d.y0 + d.h / 2, baseZ);
      const schil = echt && mesh.userData.deurPanelen && mesh.userData.deurPanelen[d.id];
      if (schil) {
        // de hybride: het deurblad is het stuk van hun gebogen romp dat uit de flank geknipt is (met binnenkant en dikte);
        // het blokje eronder is alleen de drager (onzichtbaar) waar de bekleding aan hangt
        panel = new THREE.Mesh(panelGeo(d.w, d.h), DRAGER_MAT);
        const s2 = new THREE.Mesh(schil, (mesh.userData.body || mesh.userData.deurBody).material);
        s2.position.set(-(baseX + (d.soort === 'scharnier' ? -d.w / 2 : d.soort === 'schuif' ? 0 : d.w / 2)), -(d.y0 + d.h / 2), -baseZ);
        const dec = mesh.userData.deurDecals && mesh.userData.deurDecals[d.id];
        if (dec) s2.add(new THREE.Mesh(dec, mesh.userData.nadenMat)); // strepen op het deurblad (politie)
        panel.add(s2);
      } else if (glas && d.soort !== 'schuif') {
        // hoge cabinedeur: een dicht onderpaneel in lak en erboven de ruit, samen één deur die om de scharnier draait
        const hl2 = d.h * 0.42;
        panel = new THREE.Mesh(lowerGeo(d.w, hl2), panelMat(paint, false));
        panel.position.y = -d.h / 2 + hl2 / 2;
        const ruit = new THREE.Mesh(panelGeo(d.w, d.h - hl2), panelMat(paint, true));
        ruit.position.y = d.h / 2; // het onderpaneel zit op -h/2 + hl2/2, de ruit erboven
        panel.add(ruit);
      } else {
        panel = new THREE.Mesh(panelGeo(d.w, d.h), panelMat(paint, glas));
      }
      if (d.soort !== 'schuif' && !schil) { // een uitgeknipt deurblad (schil) heeft zijn eigen binnenkant, rand en handvat
        // de binnenkant van het deurblad (zichtbaar als de deur open staat): bekleding, armsteun met trekgreep, opbergvak en
        // bij een lage deur de raamlijst erboven met de ruit, zodat een open deur een portier is en geen gekleurde plaat
        const ph = Math.min(d.h, 0.62), yb = -d.h / 2 - panel.position.y, zi = -d.side * 0.03;
        const liner = new THREE.Mesh(panelGeo(d.w * 0.9, ph * 0.84), panelMat(LINER_HEX, false));
        liner.position.set(0, yb + ph * 0.5, zi);
        const arm = new THREE.Mesh(boxGeo(d.w * 0.55, 0.05, 0.07), panelMat(0x45474d, false));
        arm.position.set(0, yb + ph * 0.62, zi - d.side * 0.035);
        const vak = new THREE.Mesh(boxGeo(d.w * 0.6, 0.08, 0.03), panelMat(0x1f2023, false));
        vak.position.set(0, yb + ph * 0.2, zi - d.side * 0.02);
        const greep = new THREE.Mesh(boxGeo(0.1, 0.03, 0.02), panelMat(0xb9bcbf, false));
        greep.position.set((d.soort === 'scharnier' ? -1 : 1) * d.w * 0.32, yb + ph * 0.78, zi - d.side * 0.02);
        panel.add(liner, arm, vak, greep);
        if (!glas && !schil) {
          const rh = 0.42, top = yb + d.h + rh;
          for (const sx of [-1, 1]) {
            const stijl = new THREE.Mesh(boxGeo(0.04, rh, 0.04), panelMat(paint, false));
            stijl.position.set(sx * (d.w / 2 - 0.02), yb + d.h + rh / 2, 0);
            panel.add(stijl);
          }
          const boven = new THREE.Mesh(boxGeo(d.w, 0.04, 0.04), panelMat(paint, false));
          boven.position.set(0, top - 0.02, 0);
          const ruit = new THREE.Mesh(boxGeo(d.w - 0.08, rh - 0.04, 0.012), panelMat(paint, true));
          ruit.position.set(0, yb + d.h + rh / 2 - 0.02, 0);
          panel.add(boven, ruit);
          // bij een echt gat zit de zijruit dicht in het bovenhuis; de raamlijst komt pas mee als de deur open gaat
          if (echt) panel.userData.raam = [boven, ruit, ...panel.children.filter((c) => c.geometry === boxGeo(0.04, rh, 0.04))];
        }
      }
      panel.position.x = d.soort === 'scharnier' ? -d.w / 2 : d.soort === 'achterscharnier' ? d.w / 2 : 0;
      const cabine = !v.isBus && (d.soort === 'scharnier' || d.soort === 'achterscharnier') && wantsCabin(v);
      hole = echt ? new THREE.Mesh(LEEG_GEO, HOLE_MAT) : new THREE.Mesh(v.isBus ? panelGeo(d.w * 0.92, d.h * 0.92) : interieurGeo(d.w * 0.94, d.h * 0.94, d.side, d.seat !== 'achter'), v.isBus ? BUS_HOLE_MAT : cabine ? CABIN_HOLE_MAT : INTERIEUR_MAT);
      if (cabine && !echt) {
        hole.renderOrder = 10;
        // de merkplaat: hetzelfde vlak, een stap eerder (renderOrder 9), volgt de zichtbaarheid van de opening
        const merk = new THREE.Mesh(hole.geometry, CABIN_MARK_MAT);
        merk.renderOrder = 9;
        merk.visible = false;
        group.add(merk);
        hole.userData.merk = merk;
      }
      // schuifdeuren (bus): het deurblad zit al in het model op hw+0.014, de opening moet daar vóór liggen
      hole.position.set(cx, d.y0 + d.h / 2, d.side * (hwD + (d.soort === 'schuif' ? 0.02 : 0.006)));
      if (hole.userData.merk) hole.userData.merk.position.copy(hole.position);
    }
    pivot.add(panel);
    hole.visible = false;
    pivot.visible = false;
    group.add(pivot, hole);
    doors[d.id] = { def: d, pivot, panel, hole, baseX, baseZ, echt, home: panel.position.clone() };
  }
  const body = mesh.userData.body || mesh;
  body.add(group);
  if (mesh.userData.deurenDicht) mesh.userData.deurenDicht.visible = false; // vanaf nu tekent de rig alle deuren, ook de dichte
  mesh.userData.doorRig = { group, doors, paint, bus: !!v.isBus };
  return mesh.userData.doorRig;
}

function pose(rig, id, open, dmg) {
  const e = rig.doors[id];
  if (!e) return;
  const d = e.def, a = deurStand(d, open, dmg);
  e.pivot.visible = e.echt || a > 0.002;
  if (e.panel.userData.raam) for (const r of e.panel.userData.raam) r.visible = a > 0.05;
  e.hole.visible = !e.echt && (a > 0.002 || !!e.lost);
  if (e.hole.userData.merk) e.hole.userData.merk.visible = e.hole.visible;
  if (!e.pivot.visible) return;
  if (d.soort === 'schuif') {
    e.pivot.position.x = e.baseX + (d.dir || 1) * a;
    // een busdeur schuift het lichaam in (het blad verdwijnt achter de romp); buiten langs de bus gleed het als een grijs
    // vlak over het wiel en voorbij de neus (#385). Een tram laat zijn deuren buitenlangs schuiven.
    e.pivot.position.z = e.baseZ + d.side * (rig.bus ? -0.06 : 0.07) * Math.min(1, a / 0.2);
    e.pivot.rotation.y = 0;
  } else if (d.soort === 'kap') {
    e.pivot.rotation.z = a;
  } else if (d.soort === 'klep') {
    e.pivot.rotation.z = -a;
  } else if (d.soort === 'achterdeur') {
    e.pivot.rotation.y = -a;
  } else {
    e.pivot.rotation.y = (d.soort === 'achterscharnier' ? -1 : 1) * d.side * a;
  }
}

// Laat een deur los: het paneel verlaat het voertuig en valt als los object op straat.
function laatLos(mesh, rig, id, v) {
  const e = rig.doors[id];
  if (!e || e.lost) return;
  e.lost = true;
  e.hole.visible = true;
  if (e.hole.userData.merk) e.hole.userData.merk.visible = true;
  const parent = mesh.parent;
  if (parent && e.pivot) {
    e.pivot.visible = true;
    pose(rig, id, 0.35, null);
    mesh.updateMatrixWorld(true);
    const obj = e.panel;
    obj.updateWorldMatrix(true, false);
    const wp = new THREE.Vector3(), wq = new THREE.Quaternion();
    obj.getWorldPosition(wp); obj.getWorldQuaternion(wq);
    e.pivot.remove(obj);
    obj.position.copy(wp); obj.quaternion.copy(wq);
    obj.userData.fall = { vy: 1.2, vx: Math.cos(v.angle) * (v.speed || 0) * 0.4, vz: Math.sin(v.angle) * (v.speed || 0) * 0.4, spin: (e.def.side || 1) * 3, life: 25, floor: (v.z || 0) + 0.06 };
    parent.add(obj);
    loseDeuren.push(obj);
    while (loseDeuren.length > MAX_LOSSE_DEUREN) removeLoose(loseDeuren.shift());
  }
  e.pivot.visible = false;
}

function removeLoose(o) {
  if (o.parent) o.parent.remove(o);
}

// Eén keer per frame: losse deuren vallen en liggen een tijd op straat.
export function tickLooseDoors(dt) {
  for (let i = loseDeuren.length - 1; i >= 0; i--) {
    const o = loseDeuren[i], f = o.userData.fall;
    f.life -= dt;
    if (f.life <= 0 || !o.parent) { removeLoose(o); loseDeuren.splice(i, 1); wereld.n = Math.max(0, wereld.n - 1); continue; }
    if (o.position.y > f.floor + 0.02) {
      f.vy -= 9.8 * dt;
      o.position.x += f.vx * dt; o.position.z += f.vz * dt; o.position.y += f.vy * dt;
      o.rotation.z += f.spin * dt;
      if (o.position.y <= f.floor + 0.02) { o.position.y = f.floor + 0.02; if (o.userData.flat) o.rotation.set(0, o.rotation.y, 0); else o.rotation.set(Math.PI / 2, o.rotation.y, 0); f.vx = f.vz = 0; }
    }
  }
}

// Eén voertuig bijwerken. vraag: { id, open } van een in-/uitstapanimatie of null.
export function syncVehicleDoors(mesh, v, dt, vraag = null) {
  if (!mesh) return;
  const defs = doorsFor(v);
  if (!defs.length) return;
  let st = v.doors;
  if (!st && !vraag && !stilstandDeurOpen(v) && !(v.dentLog && v.dentLog.length)) return;
  st = ensureDoors(v);
  const dlen = v.dentLog ? v.dentLog.length : 0;
  let rig = mesh.userData.doorRig;
  if (st.dlen !== dlen || v.wrecked !== st.wr) {
    st.dlen = dlen; st.wr = v.wrecked;
    const los = reconcileDoors(v, defs, wereld);
    if (los.length || Object.keys(st.loose).length) {
      rig = rig || buildRig(mesh, v, defs);
      for (const id of los) laatLos(mesh, rig, id, v);
      for (const id of Object.keys(st.loose)) if (rig.doors[id] && !rig.doors[id].lost) laatLos(mesh, rig, id, v);
    }
    if (!Object.keys(st.loose).length && rig) for (const e of Object.values(rig.doors)) { e.lost = false; if (!e.panel.parent) e.pivot.add(e.panel); }
    if (!Object.keys(st.loose).length && rig) for (const e of Object.values(rig.doors)) { e.panel.position.copy(e.home); e.panel.quaternion.identity(); e.hole.visible = false; if (e.hole.userData.merk) e.hole.userData.merk.visible = false; }
  }
  if (vraag) {
    const d = deurVoorRol(defs, vraag.rol, st, vraag.side || 0);
    if (d) wantDoor(st, d.id, vraag.open, DEUR_HOUD_TIJD);
  } else if (stilstandDeurOpen(v)) {
    for (const d of defs) if (d.soort === 'schuif') wantDoor(st, d.id, true, DEUR_HOUD_TIJD);
  }
  const bewegend = stepDoors(st, dt, { speed: v.speed, wrecked: v.wrecked });
  if (!bewegend && !Object.keys(st.dmg).length && !rig) return;
  rig = rig || buildRig(mesh, v, defs);
  for (const d of defs) {
    if (!rig.doors[d.id] || rig.doors[d.id].lost) continue;
    pose(rig, d.id, st.open[d.id] || 0, st.dmg[d.id] || null);
  }
}

// Voor scene3d: een lopende animatie omzetten in een deurvraag. De rol volgt de deur
// waar iemand instapt (links de bestuurder, rechts de bijrijder, #459).
export function vraagVoorAnim(a, rol) {
  return a ? { v: a.v, rol: (a.instap && a.instap.rol) || rol, open: deurDoelVoorAnim(a) === 1 } : null;
}

// Eén keer per frame: alle voertuigen in de buurt (open/dichte deuren, schade, bussen bij de halte).
// vragen: Map(voertuig -> { rol, open }) uit de in-/uitstapanimaties van speler en metgezel.
export function syncDoorsNear(world, meshes, px, py, dt, vragen) {
  tickLooseDoors(dt);
  for (const v of world.vehicles) {
    if (Math.abs(v.x - px) > 45 || Math.abs(v.y - py) > 45) continue;
    const q = vragen && vragen.get(v);
    if (!q && !v.doors && !v.isBus && !(v.dentLog && v.dentLog.length)) continue;
    const mesh = meshes.get(v.id);
    if (mesh) syncVehicleDoors(mesh, v, dt, q || null);
  }
}
