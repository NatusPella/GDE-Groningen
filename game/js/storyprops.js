// De losse voorwerpen van de verhaalscènes (cutscenes): één bouwer per soort, laag-poly, met een eigen
// polygoonbudget (DECOR_BUDGET). Voertuigen en dieren komen uit de wereld (cutscenemodels.js), alleen
// "decor" wordt hier gebouwd. Elk model heeft zijn oorsprong op de grond en +x als voorkant; 2 tot 6
// materialen, een herkenbaar silhouet en geen NaN (scripts/verhaal_props_audit.mjs meet dat). De kwaliteitsnorm per voorwerp staat in
// PROP_NORM (cutscenemodels.js); een nieuw voorwerp komt hier en nergens anders (scripts/cutscene_assets_audit.mjs).
// Verplaatst uit cutscenehost.js (PROP_MAKERS) en uitgebreid met de voorwerpen die scènes noemden maar
// als "doos" of "bord" werden getekend (klomp, stempel, statief, krat, ...), #1121.
import * as THREE from 'three';
import { propGeometry } from './propmodels3d.js';
import { PROP_REGISTER, CUTSCENE_PROPS } from './propregister.js';

const MATS = {};
const mat = (c, o = {}) => (MATS[c + JSON.stringify(o)] ||= new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o }));
const put = (m, x, y, z) => { m.position.set(x, y, z); m.castShadow = true; return m; };
const box = (w, h, d, c, y = h / 2, x = 0, z = 0, o = {}) => put(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, o)), x, y, z);
const cyl = (r, h, c, y = h / 2, x = 0, z = 0, seg = 8, r2 = r) => put(new THREE.Mesh(new THREE.CylinderGeometry(r2, r, h, seg), mat(c)), x, y, z);
const ball = (r, c, y, x = 0, z = 0, sy = 1, detail = 1) => { const m = put(new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), mat(c)), x, y, z); m.scale.y = sy; return m; };
const grp = (...kids) => { const g = new THREE.Group(); g.add(...kids); return g; };
const tilt = (m, rx = 0, ry = 0, rz = 0) => { m.rotation.set(rx, ry, rz); return m; };

// De gedeelde props uit het register (propregister.js): dezelfde geometrie als op straat in de wereld, één mesh met vertexkleuren.
const VERTEXKLEUR = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.1 });
const registerProp = (id) => () => { const m = new THREE.Mesh(propGeometry(id), VERTEXKLEUR); m.castShadow = true; return grp(m); };

export const DECOR_MAKERS = {
  ...Object.fromEntries(CUTSCENE_PROPS.map((id) => [id, registerProp(id)])),
  // een matras met een bies en een kussen (de verhuisbeats van de opening)
  matras: () => grp(box(1.9, 0.2, 1.0, 0x6b8fb8, 0.1), box(1.9, 0.02, 0.05, 0xe8e3d6, 0.21), box(1.94, 0.04, 1.04, 0x4c6f96, 0.04), box(0.4, 0.1, 0.55, 0xf2efe6, 0.25, -0.7)),
  doos: () => grp(box(0.5, 0.38, 0.4, 0xb98d56), box(0.52, 0.04, 0.12, 0xe8d3a8, 0.38)),
  // een koffer met hoeken, een greep en twee sloten
  koffer: () => grp(box(0.55, 0.38, 0.2, 0x3b4a6b), box(0.2, 0.04, 0.05, 0x222222, 0.4), box(0.04, 0.05, 0.22, 0xc9a227, 0.28, 0.2), box(0.04, 0.05, 0.22, 0xc9a227, 0.28, -0.2), box(0.56, 0.03, 0.21, 0x2a3550, 0.02)),
  // a bag with a flap, a buckle and a handle (a plain red block read as a placeholder up close, M03.2)
  tas: () => grp(box(0.4, 0.3, 0.2, 0x9e3027), box(0.42, 0.1, 0.22, 0x7a231c, 0.27), box(0.06, 0.06, 0.02, 0xd8b45a, 0.2, 0.0, 0.11), box(0.22, 0.03, 0.03, 0x3a2a20, 0.34)),
  // een voetbal: witte bol met zes donkere vlakken (de bal van Jelle en Veendam)
  bal: () => {
    const g = grp(ball(0.15, 0xf4f1e8, 0.15));
    const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, -1], [0.7, 0.7, 0.1], [-0.6, 0.6, 0.5]];
    for (const d of dirs) {
      const n = new THREE.Vector3(...d).normalize();
      const p = new THREE.Mesh(new THREE.CircleGeometry(0.058, 5), mat(0x20232a));
      p.position.copy(n).multiplyScalar(0.156).y += 0.15;
      p.lookAt(p.position.clone().add(n));
      g.add(p);
    }
    return g;
  },
  bord: () => grp(box(0.05, 1.2, 0.05, 0x666666), box(0.7, 0.45, 0.04, 0xf2f0ea, 1.3), box(0.74, 0.49, 0.03, 0x3c3f45, 1.3)),
  radio: () => grp(box(0.4, 0.22, 0.14, 0x6b4a2e), box(0.12, 0.12, 0.02, 0xd8c88a, 0.12, 0.08, 0.08), box(0.02, 0.3, 0.02, 0xaaaaaa, 0.35, -0.15)),
  automaat: () => grp(box(0.8, 1.5, 0.6, 0x7a808a, 0.75), box(0.5, 0.3, 0.02, 0xaee0d8, 1.15, 0.0, 0.31), box(0.4, 0.04, 0.02, 0x15181c, 0.8, 0.0, 0.31)),
  duiventil: () => {
    // a loft on legs: planks, a pitched roof, small doorways
    const g = new THREE.Group();
    for (const x of [-0.55, 0.55]) for (const z of [-0.3, 0.3]) g.add(box(0.08, 1.0, 0.08, 0x5b4630, 0.5, x, z));
    g.add(box(1.4, 0.9, 0.8, 0x8a6a46, 1.45), box(1.6, 0.08, 1.0, 0x3c3f45, 1.95), box(1.2, 0.08, 0.9, 0x3c3f45, 2.08), box(0.02, 0.2, 0.2, 0x15181c, 1.5, 0.71, -0.2), box(0.02, 0.2, 0.2, 0x15181c, 1.5, 0.71, 0.2));
    return g;
  },
  zuil: () => grp(box(0.4, 1.25, 0.4, 0xb23a3a, 0.62), box(0.3, 0.2, 0.02, 0xe8d98a, 1.2, 0.0, 0.21), box(0.1, 0.06, 0.02, 0xf2f0ea, 0.9, 0.0, 0.21)),
  // een klembord met klem en regels
  klembord: () => grp(box(0.3, 0.02, 0.4, 0x8a6a46, 0.01), box(0.26, 0.012, 0.34, 0xf2f0ea, 0.026), box(0.12, 0.03, 0.04, 0x9aa0a8, 0.04, 0, -0.17), box(0.2, 0.004, 0.012, 0x5b4a36, 0.034, 0, 0.02), box(0.2, 0.004, 0.012, 0x5b4a36, 0.034, 0, 0.07)),
  // a bumper car for the fair (#864): a small cart with a rubber rim, not a full Escapade
  botsauto: () => grp(box(1.7, 0.26, 1.0, 0x222831, 0.17), box(1.35, 0.4, 0.85, 0xc4402c, 0.5), box(1.0, 0.34, 0.6, 0xe8e2d2, 0.82, -0.2), box(1.74, 0.14, 1.04, 0x2f5d9e, 0.3)),
  // een los briefje (#740: het dankbriefje op de klomp): een vel papier met één geschreven regel
  briefje: () => grp(box(0.21, 0.012, 0.15, 0xf7f4e8, 0.01), box(0.15, 0.006, 0.014, 0x5b4a36, 0.017)),

  // --- nieuw (#1121): voorwerpen die een scène noemt en die eerst als doos of bord stonden ---
  // de klomp van het dankbriefje en de overweg: een houten schoen met open boord en een hak
  klomp: () => {
    const g = new THREE.Group();
    g.add(box(0.32, 0.03, 0.12, 0xa8741f, 0.015), box(0.2, 0.09, 0.11, 0xd8a24a, 0.075, -0.05));
    const neus = ball(0.06, 0xd8a24a, 0.065, 0.13, 0, 0.9); neus.scale.x = 1.5; g.add(neus);
    g.add(box(0.12, 0.012, 0.08, 0x3a2a14, 0.122, -0.08), box(0.06, 0.04, 0.12, 0xa8741f, 0.03, -0.13));
    return g;
  },
  // het stempel van het Loket: houten knop, metalen schacht, rubberen blok en een inktkussen
  stempel: () => grp(box(0.18, 0.02, 0.12, 0x2a3a5a, 0.01, 0, 0.16), box(0.1, 0.04, 0.06, 0x7a1f1f, 0.02, 0, 0.16), cyl(0.04, 0.05, 0x6b4a2e, 0.045, 0, 0, 8), cyl(0.012, 0.06, 0x9aa0a8, 0.09), ball(0.04, 0x6b4a2e, 0.15)),
  // de pinpas: een te grote bankpas (leesbaar op een tafel) met chip en magneetstrip
  pinpas: () => grp(box(0.12, 0.006, 0.075, 0x2f5d9e, 0.003), box(0.12, 0.0065, 0.016, 0x15181c, 0.0033, 0, 0.02), box(0.022, 0.0075, 0.018, 0xd8b45a, 0.0038, -0.035, -0.012)),
  // een dossiermap met een tabblad en een rubber, papier steekt eruit
  map: () => grp(box(0.32, 0.02, 0.24, 0xc9a24a, 0.01), box(0.1, 0.02, 0.03, 0xb28a2e, 0.01, 0.0, -0.135), box(0.29, 0.012, 0.21, 0xf2f0ea, 0.026), box(0.012, 0.024, 0.24, 0x8a6a2e, 0.012, -0.16)),
  // een bierviltje: rond, met een rode rand
  bierviltje: () => grp(cyl(0.05, 0.008, 0xe8d6a8, 0.004, 0, 0, 14), cyl(0.036, 0.0095, 0x9e3027, 0.0045, 0, 0, 14)),
  // een ingelijste foto op een houten ezel (de prijs van 1953): twee poten met een steunpoot, lijst, foto en passe-partout
  fotolijst: () => {
    const g = new THREE.Group();
    for (const z of [-0.14, 0.14]) g.add(tilt(box(0.03, 1.2, 0.03, 0x5b4630, 0.6, 0, z), 0, 0, 0.12));
    g.add(tilt(box(0.03, 1.2, 0.03, 0x5b4630, 0.6, -0.22, 0), 0, 0, -0.25));
    g.add(tilt(box(0.03, 0.46, 0.36, 0x5b4630, 1.18, 0.02, 0), 0, 0, 0.12), tilt(box(0.012, 0.38, 0.28, 0xf0ead8, 1.18, 0.04, 0), 0, 0, 0.12), tilt(box(0.01, 0.28, 0.2, 0x6a5a48, 1.18, 0.05, 0), 0, 0, 0.12));
    return g;
  },
  // het statief van de streamer: drie poten, een telefoon en een ringlamp
  statief: () => {
    const g = new THREE.Group();
    for (const a of [0, 2.1, 4.2]) { const l = box(0.025, 1.25, 0.025, 0x1c1c1f, 0.6, Math.cos(a) * 0.22, Math.sin(a) * 0.22); l.rotation.set(Math.sin(a) * 0.18, 0, -Math.cos(a) * 0.18); g.add(l); }
    g.add(box(0.07, 0.12, 0.2, 0x2a2d33, 1.34), box(0.004, 0.1, 0.17, 0x7ab4d8, 1.34, 0.037));
    g.add(tilt(put(new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.018, 5, 14), mat(0xf6f3e6, { emissive: 0xf6f3e6, emissiveIntensity: 0.5 })), 0.05, 1.34, 0), 0, Math.PI / 2, 0));
    return g;
  },
  // een krat (eieren, Vet van Grunn): latten, hoekstijlen en een rij eieren erop
  krat: () => {
    const g = grp(box(0.5, 0.04, 0.34, 0x8a6238, 0.02), box(0.5, 0.05, 0.02, 0x8a6238, 0.1, 0, 0.16), box(0.5, 0.05, 0.02, 0x8a6238, 0.2, 0, 0.16), box(0.5, 0.05, 0.02, 0x8a6238, 0.1, 0, -0.16), box(0.5, 0.05, 0.02, 0x8a6238, 0.2, 0, -0.16));
    for (const [x, z] of [[-0.24, -0.15], [0.24, -0.15], [-0.24, 0.15], [0.24, 0.15]]) g.add(box(0.03, 0.26, 0.03, 0x5b4630, 0.13, x, z));
    for (let i = 0; i < 6; i++) g.add(ball(0.045, 0xf0e4c8, 0.09, -0.2 + (i % 3) * 0.2, i < 3 ? -0.07 : 0.07, 1.25, 0));
    return g;
  },
  // een kookpan met deksel en twee oren (frituurpannen; de krentjebrij van Oma)
  pan: () => grp(cyl(0.2, 0.22, 0x8a8f98, 0.11, 0, 0, 12), cyl(0.205, 0.04, 0x5a5f68, 0.24, 0, 0, 12), ball(0.03, 0x15181c, 0.285), box(0.1, 0.03, 0.04, 0x15181c, 0.18, 0, 0.23), box(0.1, 0.03, 0.04, 0x15181c, 0.18, 0, -0.23)),
  // een doos vuurwerk met drie pijlen (de overweg bij Zuidhorn)
  vuurwerk: () => {
    const g = grp(box(0.5, 0.2, 0.34, 0xc4402c, 0.1), box(0.52, 0.03, 0.36, 0xf2c94c, 0.2));
    for (const z of [-0.1, 0, 0.1]) g.add(cyl(0.02, 0.42, 0x2f5d9e, 0.4, 0, z, 6), cyl(0.0, 0.07, 0xc4402c, 0.64, 0, z, 6, 0.022));
    return g;
  },
  // een koelbox met wit deksel en greep (het picknickuitje van Geesje)
  koelbox: () => grp(box(0.6, 0.3, 0.4, 0x2f6fb0, 0.15), box(0.62, 0.06, 0.42, 0xf2f0ea, 0.33), box(0.22, 0.03, 0.04, 0x15181c, 0.4)),
  // een jas, opgevouwen over een tafel of arm: romp, twee mouwen en een kraag
  jas: () => grp(box(0.42, 0.08, 0.3, 0x3a4a6a), box(0.3, 0.07, 0.09, 0x33415e, 0.075, 0.02, 0.2), box(0.3, 0.07, 0.09, 0x33415e, 0.075, 0.02, -0.2), box(0.08, 0.05, 0.22, 0x1c2438, 0.105, 0.19)),
  // een aktetas met een bruin leren handvat en een goudkleurig slot
  aktetas: () => grp(box(0.46, 0.32, 0.12, 0x5b3a22, 0.16), box(0.16, 0.03, 0.04, 0x3a2412, 0.34), box(0.04, 0.05, 0.13, 0xc9a227, 0.22, 0.17)),
  // hesjes van de bouwploeg: gestapeld, oranje met een lichtgevende streep
  hesjes: () => grp(box(0.5, 0.08, 0.4, 0xe8742a, 0.04), box(0.5, 0.04, 0.06, 0xe8e8d8, 0.1, 0, 0.1), box(0.48, 0.08, 0.38, 0xe8742a, 0.12, 0.01, 0.01), box(0.5, 0.04, 0.06, 0xe8e8d8, 0.18, 0, -0.1)),
  // een zeecontainer (10 voet): gegolfde wanden, deurbalken en hoekstukken (de terminal van Lammert)
  container: () => {
    const g = grp(box(3.0, 2.4, 2.4, 0x9a3b2a, 1.4), box(3.1, 0.12, 2.5, 0x6e2a1e, 0.06), box(3.1, 0.12, 2.5, 0x6e2a1e, 2.66));
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) g.add(box(0.06, 2.2, 0.05, 0x7e2f21, 1.4, -1.25 + i * 0.5, s * 1.2));
    for (const z of [-0.45, 0.45]) g.add(box(0.05, 2.2, 0.06, 0x9aa0a8, 1.4, 1.52, z));
    return g;
  },
  // een scherm op een voet: zwart kader, lichtgevend vlak (het nummerscherm bij het Loket; de logs van Wiebelwerk)
  scherm: () => grp(box(0.3, 0.05, 0.3, 0x2a2d33, 0.025), box(0.06, 0.9, 0.06, 0x2a2d33, 0.5), box(0.06, 0.62, 0.9, 0x15181c, 1.3), box(0.01, 0.52, 0.8, 0x2a6a5a, 1.3, 0.036, 0, { emissive: 0x2a6a5a }), box(0.012, 0.12, 0.3, 0xe85a3a, 1.36, 0.04, -0.12)),
  // een prikbord op een ezel met vijf briefjes en rode punaises (het bord met de vijf vrienden, N8)
  prikbord: () => {
    const g = grp(box(0.04, 0.76, 1.0, 0x6b4a2e, 1.0), box(0.02, 0.68, 0.92, 0xc08f5a, 1.0, 0.012));
    for (const x of [-0.45, 0.45]) g.add(box(0.05, 1.35, 0.05, 0x5b4630, 0.67, 0, x * 1.1));
    [[-0.28, 1.15], [0.0, 1.2], [0.28, 1.12], [-0.14, 0.88], [0.18, 0.86]].forEach(([z, y], i) => {
      g.add(box(0.012, 0.2, 0.17, i % 2 ? 0xf2efe6 : 0xf3e6a8, y, 0.03, z));
      g.add(box(0.014, 0.025, 0.025, 0xc83a3a, y + 0.08, 0.04, z));
    });
    return g;
  },
  // het kantoor op wielen van Jelle (M15.5, TERPSTRA MOBIEL KANTOOR): een witte kist met een rij ramen, een deur, een bord in bedrijfsblauw,
  // een airco op het dak, een dissel voorop en twee assen. Laag-poly: veertien dozen en vier wielen.
  kantoorwagen: () => {
    const g = new THREE.Group();
    g.add(box(5.0, 0.18, 2.1, 0x3a3d42, 0.55), box(4.8, 2.0, 2.2, 0xe9e6dc, 1.65), box(4.9, 0.12, 2.3, 0x2c4a7a, 2.7), box(1.0, 0.3, 0.8, 0x9aa0a6, 2.9, -0.8, 0.3));
    for (const x of [-1.5, -0.2, 1.1]) for (const z of [-1.11, 1.11]) g.add(box(0.9, 0.7, 0.04, 0x2a3946, 2.0, x, z));
    g.add(box(0.9, 1.7, 0.04, 0x6b4a2e, 1.4, -2.0, 1.11), box(3.2, 0.4, 0.04, 0x2c4a7a, 1.15, 0.2, 1.11), box(3.0, 0.07, 0.05, 0xd8b45a, 1.15, 0.2, 1.12), box(3.2, 0.4, 0.04, 0x2c4a7a, 1.15, 0.2, -1.11));
    g.add(box(1.0, 0.1, 0.12, 0x3a3d42, 0.62, 2.9), box(0.12, 0.3, 0.12, 0x3a3d42, 0.5, 3.3));
    for (const x of [-1.6, -0.7]) for (const z of [-1.12, 1.12]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.25, 10), mat(0x1c1c1c));
      w.rotation.x = Math.PI / 2; w.position.set(x, 0.4, z); w.castShadow = true; g.add(w);
    }
    return g;
  },
  // de broodtrommel van Mem (akte 2, M11.3): een blikken trommel met een klepdeksel; 36 driehoeken
  broodtrommel: () => { const g = new THREE.Group(); g.add(box(0.28, 0.12, 0.18, 0x3b6aa0), box(0.29, 0.025, 0.19, 0xd9d4c4, 0.1325), box(0.04, 0.03, 0.01, 0xd8b45a, 0.09, 0.0, 0.095)); return g; },
  // F1: de verroeste frituuraanhanger aan het hek: romp, luik met klep, TE KOOP-bord, dissel en twee wielen (laag-poly, ca. 60 driehoeken per doos)
  frituuraanhanger: () => {
    const g = new THREE.Group();
    g.add(box(2.6, 1.3, 1.6, 0x9a6b4a, 0.95), box(2.7, 0.08, 1.7, 0x6f4b33, 1.64), box(1.3, 0.62, 0.05, 0x2b2622, 1.1, 0.1, 0.82), box(1.4, 0.05, 0.5, 0xb88a64, 1.45, 0.1, 1.05),
      box(0.05, 0.4, 0.05, 0x5a5048, 1.25, -0.5, 1.28), box(0.05, 0.4, 0.05, 0x5a5048, 1.25, 0.7, 1.28), box(1.5, 0.06, 0.08, 0x4a4540, 0.4, -2.0, 0), box(0.4, 0.3, 0.04, 0xf2efe4, 1.1, -0.85, 0.82));
    for (const z of [-0.95, 0.95]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.14, 10), mat(0x222428)); w.rotation.x = Math.PI / 2; w.position.set(0, 0.34, z); w.castShadow = true; g.add(w); }
    return g;
  },
  // F2: de friteuse: een rvs-kast met twee manden en een bedieningspaneel
  friteuse: () => { const g = new THREE.Group(); g.add(box(0.8, 0.9, 0.6, 0x9aa1a8, 0.45), box(0.3, 0.12, 0.4, 0x2a2d31, 0.95, -0.18, 0), box(0.3, 0.12, 0.4, 0x2a2d31, 0.95, 0.18, 0), box(0.5, 0.1, 0.02, 0xd8d2c0, 0.7, 0, 0.31), box(0.06, 0.06, 0.02, 0xc4402c, 0.7, 0.18, 0.32)); return g; },
  // F5: een deken om op de rand van het luik te zitten
  deken: () => { const g = new THREE.Group(); g.add(box(1.3, 0.03, 0.9, 0xc4402c, 0.02), box(1.3, 0.032, 0.12, 0xf2efe4, 0.021, 0, 0.2), box(1.3, 0.032, 0.12, 0xf2efe4, 0.021, 0, -0.2), box(0.12, 0.032, 0.9, 0xf2efe4, 0.021, 0.3, 0)); return g; },
  // F3: de soepketel van Beppe
  soepketel: () => { const g = new THREE.Group(); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.3, 12), mat(0x9aa1a8)); p.position.y = 0.15; p.castShadow = true; const l = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.03, 12), mat(0x7e858c)); l.position.y = 0.32; g.add(p, l, box(0.1, 0.03, 0.03, 0x3a3128, 0.34), box(0.12, 0.04, 0.04, 0x3a3128, 0.2, 0.27, 0)); return g; },
  // F4: de pot mosterd van 1953, met een lap eromheen
  mosterdpot: () => { const g = new THREE.Group(); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 10), mat(0xe2b93b)); p.position.y = 0.07; p.castShadow = true; const l = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 10), mat(0x7a5a2a)); l.position.y = 0.155; g.add(p, l, box(0.2, 0.01, 0.2, 0xe8e2d0, 0.17)); return g; },
  // F6: de kaart van de provincie op het luik: eenenveertig rode stippen (Us Mem Snacks) en één blauwe (de Vismarkt)
  kaart: () => {
    const g = new THREE.Group();
    g.add(box(0.9, 0.012, 0.65, 0xe8e0c4, 0.006));
    let s = 41;
    const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
    for (let i = 0; i < 41; i++) g.add(box(0.025, 0.012, 0.025, 0xc4302a, 0.016, (rnd() - 0.5) * 0.78, (rnd() - 0.5) * 0.54));
    g.add(box(0.04, 0.014, 0.04, 0x2f5d9e, 0.018, 0.04, 0.02));
    return g;
  },
  // F1: het hek waar de aanhanger aan staat: twee palen en twee latten
  hek: () => { const g = new THREE.Group(); for (const x of [-1.2, 1.2]) g.add(box(0.1, 1.1, 0.1, 0x6b5a3e, 0.55, x, 0)); g.add(box(2.5, 0.08, 0.05, 0x7e6a48, 0.9), box(2.5, 0.08, 0.05, 0x7e6a48, 0.5)); return g; },
  // H2: de pinautomaat die Durk en Douwe uit de muur trokken, rechtop op een aanhangertje: bak met randen, twee wielen, dissel,
  // een kast met scherm, toetsenbord en kaartgleuf (was een losse grijze doos op een plaat in missionstory.js)
  pinautomaat: () => grp(
    box(2.2, 0.08, 1.4, 0x3a3a3a, 0.42), box(2.2, 0.18, 0.05, 0x2a2a2b, 0.55, 0, 0.68), box(2.2, 0.18, 0.05, 0x2a2a2b, 0.55, 0, -0.68),
    box(0.05, 0.18, 1.4, 0x2a2a2b, 0.55, 1.08), box(0.05, 0.18, 1.4, 0x2a2a2b, 0.55, -1.08),
    tilt(cyl(0.22, 0.12, 0x1b1b1b, 0.22, 0, 0.78, 10), Math.PI / 2), tilt(cyl(0.22, 0.12, 0x1b1b1b, 0.22, 0, -0.78, 10), Math.PI / 2),
    box(0.9, 0.05, 0.06, 0x555555, 0.42, 1.55),
    box(0.7, 1.6, 0.6, 0x9aa0a6, 1.27, 0, 0, { metalness: 0.4, roughness: 0.5 }),
    box(0.4, 0.28, 0.02, 0x1e9e56, 1.62, 0, 0.31, { emissive: 0x0c4a28 }),
    box(0.3, 0.14, 0.03, 0x2a2a2b, 1.36, 0, 0.31), box(0.12, 0.02, 0.03, 0x111111, 1.5, 0.16, 0.31),
  ),
  // de jerrycan op de fatbike van Durk en Douwe: romp, greep en dop
  jerrycan: () => grp(box(0.22, 0.3, 0.14, 0xd8b01a, 0.15), box(0.12, 0.03, 0.04, 0xb08f12, 0.32, -0.03), cyl(0.022, 0.05, 0x222222, 0.32, 0.07)),
  // de gouden bal (M10): metaal met een naad
  goudbal: () => grp(
    put(new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 2), mat(0xf2c14e, { metalness: 0.9, roughness: 0.28, emissive: 0x3a2804 })), 0, 0.12, 0),
    tilt(put(new THREE.Mesh(new THREE.TorusGeometry(0.121, 0.006, 4, 24), mat(0xb88a2a, { metalness: 0.9, roughness: 0.35 })), 0, 0.12, 0), Math.PI / 2),
  ),
  // de polsstok van het fierljeppen (M24): één meter lang vanaf de voet (de scène schaalt hem naar de lengte), hout met een greepband
  polsstok: () => grp(cyl(0.05, 1, 0x8a6a3a, 0.5, 0, 0, 6, 0.045), cyl(0.052, 0.12, 0x2a2a2b, 0.88, 0, 0, 6)),
  // drie glazen voor de toosts (H11): oorsprong op de bodem (missionstory.js glassMesh legt het midden in de hand)
  bierglas: () => glassOf('beer'),
  jeneverglas: () => glassOf('jenever'),
  wijnglas: () => glassOf('wine'),
  // de snackkiosk die "VERKOCHT" krijgt (de opening, c2-raam): kast, dak met overstek, luik met toonbank
  kiosk: () => grp(box(2.6, 2.3, 2.0, 0xe0b04a, 1.15), box(2.9, 0.12, 2.4, 0xb4492f, 2.36), box(0.04, 0.8, 1.3, 0x3a2a20, 1.45, 1.31), box(0.3, 0.06, 1.4, 0xd8d2c4, 1.0, 1.42)),
  // de sticker VERKOCHT (rood met witte letters en een witte rand), plat; +z is de voorkant
  sticker: () => {
    const g = grp(box(1.56, 0.62, 0.005, 0xf4f1e8, 0.31));
    let face;
    if (typeof document !== 'undefined') {
      const cv = document.createElement('canvas');
      cv.width = 256; cv.height = 96;
      const c = cv.getContext('2d');
      c.fillStyle = '#c8261e'; c.fillRect(0, 0, 256, 96);
      c.fillStyle = '#ffffff'; c.font = '700 40px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('VERKOCHT', 128, 50);
      const tex = new THREE.CanvasTexture(cv);
      face = new THREE.MeshBasicMaterial({ map: tex });
    } else face = mat(0xc8261e);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.56), face);
    m.position.set(0, 0.31, 0.004);
    g.add(m);
    return g;
  },
};
export const DECOR_KIND_LIST = Object.keys(DECOR_MAKERS);

// De glazen van de toost: afmeting en kleur per soort (missionstory.js glassHold leest dezelfde tabel)
export const GLASS = {
  beer: { r: 0.038, h: 0.15, color: 0xd99a2b, top: 0xf4efe2, small: false },
  jenever: { r: 0.022, h: 0.07, color: 0xe8eef0, top: 0xe8eef0, small: true },
  wine: { r: 0.03, h: 0.11, color: 0x7a1f2b, top: 0x7a1f2b, small: false },
};
function glassOf(kind) {
  const g = GLASS[kind] || GLASS.beer;
  const body = put(new THREE.Mesh(new THREE.CylinderGeometry(g.r, g.r * 0.82, g.h, 10), mat(g.color, { roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.85 })), 0, g.h * 0.5, 0);
  const top = put(new THREE.Mesh(new THREE.CylinderGeometry(g.r * 1.02, g.r, g.h * 0.18, 10), mat(g.top === g.color ? g.top + 0x050505 : g.top, { roughness: 0.6 })), 0, g.h, 0);
  return grp(body, top);
}

// Gedeelde fabriek voor scènecode (cutscenehost.js, missionstory.js, intromontage.js): de schaduwvlek onder een figuur. Eén geometrie
// en één materiaal voor alle scènes (gemarkeerd als gedeeld, de opruimcode laat ze staan).
const SHADOW_DISC_GEO = new THREE.CircleGeometry(0.42, 16).rotateX(-Math.PI / 2);
const SHADOW_DISC_MAT = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false });
SHADOW_DISC_GEO.userData.shared = true;
SHADOW_DISC_MAT.userData.shared = true;
export function shadowDisc() {
  const sh = new THREE.Mesh(SHADOW_DISC_GEO, SHADOW_DISC_MAT);
  sh.userData.shared = true;
  return sh;
}

// Het polygoonbudget per soort: maximaal aantal driehoeken, het toegestane aantal materialen en de grootste afmeting (m).
// Ruim genoeg voor het silhouet, krap genoeg dat een scène er honderden van kan hebben.
export const DECOR_BUDGET = {
  default: { tris: 400, mats: [2, 6], maxDim: 3.2 },
  container: { tris: 600, mats: [2, 6], maxDim: 3.3 },
  matras: { tris: 300, mats: [2, 6], maxDim: 2.1 },
  statief: { tris: 400, mats: [2, 6], maxDim: 1.6 },
  duiventil: { tris: 400, mats: [2, 6], maxDim: 2.4 },
  botsauto: { tris: 300, mats: [2, 6], maxDim: 1.8 },
  prikbord: { tris: 400, mats: [2, 6], maxDim: 1.6 },
  // wagens van akte 3 en 5 (M15.5 het kantoor van Jelle, F1 de verroeste aanhanger): groot als een kleine caravan, 8 materialen
  // F6: de kaart van de provincie met 41 stippen van Us Mem Snacks (516 driehoeken)
  kaart: { tris: 600, mats: [2, 6], maxDim: 3.2 },
  pinautomaat: { tris: 400, mats: [2, 8], maxDim: 3.2 },
  kiosk: { tris: 300, mats: [2, 6], maxDim: 3.1 },
  goudbal: { tris: 600, mats: [2, 6], maxDim: 0.3 },
  kantoorwagen: { tris: 400, mats: [2, 8], maxDim: 6.0 },
  frituuraanhanger: { tris: 400, mats: [2, 8], maxDim: 4.2 },
};
// de props uit het register houden zich aan hun eigen norm (driehoeken; één vertexkleur-materiaal telt als één)
for (const id of CUTSCENE_PROPS) DECOR_BUDGET[id] = { tris: PROP_REGISTER[id].norm.tris[1], mats: [1, 6], maxDim: 4.4 };
export const budgetOf = (kind) => ({ ...DECOR_BUDGET.default, ...(DECOR_BUDGET[kind] || {}) });

// De metingen van een gebouwd model (voor audit en test): { tris, mats, bbox: { x, y, z }, nan }
export function measureModel(root) {
  const mats = new Set();
  let tris = 0, nan = false;
  const box3 = new THREE.Box3();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry, pos = g.attributes.position;
    tris += (g.index ? g.index.count : pos.count) / 3;
    for (let i = 0; i < pos.array.length; i++) if (!Number.isFinite(pos.array[i])) nan = true;
    // een materiaal telt per kleur, structuur en gloed (de aankleding maakt per onderdeel een nieuw materiaal met dezelfde kleur)
    (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => mats.add(`${m.color ? m.color.getHex() : 0}|${m.map ? 'map' : ''}|${m.emissive ? m.emissive.getHex() : 0}`));
    const b = new THREE.Box3().setFromObject(o);
    box3.union(b);
  });
  for (const v of [box3.min, box3.max]) if (![v.x, v.y, v.z].every(Number.isFinite)) nan = true;
  const size = box3.getSize(new THREE.Vector3());
  return { tris: Math.round(tris), mats: mats.size, bbox: { x: +size.x.toFixed(3), y: +size.y.toFixed(3), z: +size.z.toFixed(3) }, min: { x: box3.min.x, y: box3.min.y, z: box3.min.z }, nan };
}

// Ruimt de eigen geometrie van een gebouwd model op (materialen zijn gedeeld en blijven staan).
export function disposeModel(root) {
  root.traverse((o) => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
}
