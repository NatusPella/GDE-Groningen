// De gedeelde bouwers van het straatmeubilair (register: propregister.js): één geometrie per soort, gebruikt door de
// wereld (cityprops.js voor de stad, streetfurniture3d.js voor het buitengebied) en door de cutscenes (storyprops.js).
// Elke bouwer geeft een BufferGeometry met vertexkleuren (GeoBuilder), oorsprong op de grond, +x als voorkant en de
// breedte langs z, zoals cityprops.js al rekent. De geometrie is klein genoeg om per cel samen te voegen en te instancen
// (zie de driehoekennorm in het register). Alles is laag-poly met echt detail: latten, gietijzer, kragen, banden, schroeven.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, composeMatrix, tubeGeometry, markShared } from './pixelart3d.js';

const IRON = 0x2b2f2a, STEEL = 0x6b6e70, DARK = 0x3a3d40;

function bank() {
  const B = new GeoBuilder(1);
  const wood = [0x8a623c, 0x7e5836, 0x916641, 0x7a5434];
  const L = 1.7;
  // zitlatten: vier planken met een kier ertussen, elk een eigen tint
  for (let i = 0; i < 4; i++) B.box(0.16 - i * 0.11, 0.45, 0, 0.095, 0.035, L, wood[i]);
  // rugleuning: drie licht achterover hellende latten
  for (let i = 0; i < 3; i++) B.box(-0.26 - i * 0.025, 0.62 + i * 0.14, 0, 0.03, 0.115, L, wood[(i + 1) % 4], 0, 0, 0, 0.2);
  for (const s of [-1, 1]) {
    const z = s * (L / 2 - 0.1);
    // gietijzeren zijstuk: voor- en achterpoot met voetplaat, armleuning op een steun, steun van de rug
    B.box(0.2, 0.22, z, 0.05, 0.44, 0.045, IRON);
    B.geo(tubeGeometry([-0.2, 0.0, z], [-0.34, 0.93, z], 0.022), null, IRON);
    B.box(0.2, 0.012, z, 0.12, 0.024, 0.09, DARK);
    B.box(-0.2, 0.012, z, 0.12, 0.024, 0.09, DARK);
    B.box(0.04, 0.46, z, 0.44, 0.03, 0.045, IRON);                     // zitframe
    B.box(0.2, 0.62, z, 0.3, 0.035, 0.06, IRON);                       // armleuning
    B.box(0.2, 0.54, z, 0.04, 0.17, 0.045, IRON);                      // steun van de armleuning
    B.box(0.34, 0.62, z, 0.06, 0.05, 0.06, 0x4a4e4a);                  // gebogen kop van de armleuning
  }
  B.box(0.04, 0.26, 0, 0.03, 0.03, L - 0.2, IRON);                    // dwarsbalk onder de zitting
  for (const s of [-1, 1]) for (const x of [0.2, 0.12, 0.04, -0.04]) B.box(x, 0.4675, s * (L / 2 - 0.1), 0.012, 0.012, 0.012, 0xb9b6ae); // schroefkopjes
  return B.build();
}

function afvalbak() {
  const B = new GeoBuilder(1);
  const green = 0x2f4a3a, lid = 0x3d5a47;
  B.geo(new THREE.CylinderGeometry(0.24, 0.2, 0.74, 10), composeMatrix(0, 0.44, 0), green);
  B.geo(new THREE.CylinderGeometry(0.255, 0.255, 0.035, 10), composeMatrix(0, 0.1, 0), IRON);
  B.geo(new THREE.CylinderGeometry(0.255, 0.25, 0.03, 10), composeMatrix(0, 0.78, 0), IRON);   // bandjes boven en onder
  B.geo(new THREE.CylinderGeometry(0.27, 0.27, 0.05, 10), composeMatrix(0, 0.86, 0), lid);     // deksel met rand
  B.geo(new THREE.CylinderGeometry(0.05, 0.25, 0.1, 10), composeMatrix(0, 0.935, 0), lid);     // bolle kap
  B.geo(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 6), composeMatrix(0, 0.99, 0), IRON);     // knop
  B.box(0.235, 0.64, 0, 0.03, 0.17, 0.26, 0x101213);                                           // inworpklep, donker
  B.box(0.245, 0.64, 0, 0.012, 0.19, 0.28, IRON);                                              // omlijsting
  B.box(0.228, 0.42, 0, 0.012, 0.1, 0.1, 0xd9d4c6);                                            // wapenplaatje
  B.box(0.232, 0.2, 0, 0.012, 0.22, 0.012, 0x24382d);                                          // deurnaad
  B.box(-0.28, 0.5, 0, 0.04, 0.98, 0.04, IRON);                                                // paal
  B.box(-0.26, 0.62, 0, 0.06, 0.05, 0.1, IRON);                                                // beugel
  B.box(-0.26, 0.28, 0, 0.06, 0.05, 0.1, IRON);
  B.box(-0.28, 0.01, 0, 0.14, 0.02, 0.14, DARK);                                               // voetplaat
  B.geo(new THREE.CylinderGeometry(0.035, 0.03, 0.03, 6), composeMatrix(0.17, 0.805, 0.12), 0xb9b6ae); // asbakje op het deksel
  return B.build();
}

function fietsenrek(n = 4) {
  const B = new GeoBuilder(1);
  const len = n * 0.7;
  B.geo(tubeGeometry([0, 0.42, -len / 2], [0, 0.42, len / 2], 0.024), null, STEEL);
  B.geo(tubeGeometry([0, 0.22, -len / 2], [0, 0.22, len / 2], 0.016), null, STEEL);
  B.box(0, 0.015, 0, 0.12, 0.03, len + 0.1, DARK);                                             // grondplaat
  for (let i = 0; i <= n; i++) {
    const z = -len / 2 + i * 0.7;
    B.geo(tubeGeometry([0, 0.03, z], [0, 0.42, z], 0.02), null, STEEL);
    B.geo(new THREE.SphereGeometry(0.032, 6, 4), composeMatrix(0, 0.44, z), 0x8a8d90);        // dop
    B.box(0, 0.035, z, 0.1, 0.02, 0.07, DARK);                                                 // voetje met bout
  }
  for (let i = 0; i < n; i++) B.box(0.06, 0.32, -len / 2 + (i + 0.5) * 0.7, 0.012, 0.18, 0.5, 0x4a4e52); // wielgeleider tussen twee beugels
  return B.build();
}

// Het bushokje (+z is de open kant, breedte langs x: de oriëntatie van streetfurniture3d.js): dak met dakrand en goot,
// stalen stijlen, wanden van helder glas in lijsten (lichtere kleur dan de rest), een zitbank, een lichtbak met een
// lijnkaart en een haltepaal met bord ernaast.
function bushokje() {
  const B = new GeoBuilder(1);
  const frame = 0x2b3a4a, glass = 0xa9c3cc, glassHi = 0xc9dde2;
  B.box(0, 2.46, 0, 3.4, 0.09, 1.7, frame);
  B.box(0, 2.53, 0, 3.46, 0.04, 1.76, 0x1e2a36);                                               // dakrand
  B.box(0, 2.405, 0.82, 3.3, 0.06, 0.06, 0x9aa1a6);                                            // regenpijp
  B.box(1.72, 2.5, 0, 0.04, 0.12, 1.7, 0x9aa1a6);
  for (const x of [-1.55, 1.55]) {
    B.box(x, 1.2, -0.7, 0.07, 2.4, 0.07, frame);
    B.box(x, 1.2, 0.7, 0.07, 2.4, 0.07, frame);
  }
  B.box(0, 1.3, -0.7, 3.04, 1.8, 0.03, glass);                                                 // achterwand (glas)
  for (let i = 0; i < 3; i++) B.box(-1.01 + i * 1.01, 1.3, -0.7, 0.04, 1.8, 0.05, frame);      // stijlen tussen de ruiten
  B.box(0, 0.4, -0.7, 3.04, 0.1, 0.05, frame);
  B.box(0, 2.22, -0.7, 3.04, 0.1, 0.05, frame);
  for (const s of [-1, 1]) {
    B.box(s * 1.55, 1.3, 0, 0.03, 1.8, 1.34, glass);                                           // zijwand (glas)
    B.box(s * 1.55, 0.4, 0, 0.05, 0.1, 1.38, frame);
    B.box(s * 1.55, 0.7, 0.2, 0.04, 0.6, 0.5, glassHi);                                         // weerspiegeling, lichter vlak
  }
  B.box(-0.7, 0.55, -0.45, 1.3, 0.05, 0.4, 0x7a5a3a);                                          // bankje
  B.box(-0.7, 0.28, -0.45, 1.2, 0.04, 0.34, frame);
  for (const x of [-1.25, -0.15]) B.box(x, 0.27, -0.45, 0.05, 0.54, 0.3, 0x1e2a36);
  B.box(0.95, 1.4, -0.66, 0.9, 1.4, 0.06, 0xe9e5d4);                                           // lichtbak met lijnkaart
  B.box(0.95, 1.4, -0.63, 0.82, 1.32, 0.012, 0xd9d4bd);
  B.box(0.95, 1.55, -0.62, 0.5, 0.05, 0.012, 0x2f7d46);                                        // groene lijn
  B.box(0.95, 1.35, -0.62, 0.5, 0.05, 0.012, 0x21468b);                                        // blauwe lijn
  B.box(0.95, 1.15, -0.62, 0.5, 0.05, 0.012, 0xc9a227);
  // haltepaal met een rond bord ernaast
  B.geo(tubeGeometry([2.15, 0, 0.5], [2.15, 2.7, 0.5], 0.04), null, 0x8a9196);
  B.geo(new THREE.CylinderGeometry(0.26, 0.26, 0.03, 12).rotateX(Math.PI / 2), composeMatrix(2.15, 2.5, 0.54), 0x1f6fb4);
  B.geo(new THREE.CylinderGeometry(0.2, 0.2, 0.034, 12).rotateX(Math.PI / 2), composeMatrix(2.15, 2.5, 0.545), 0xf2f0ea);
  for (const dx of [-0.07, 0.07]) B.box(2.15 + dx, 2.5, 0.565, 0.05, 0.26, 0.01, 0x1f6fb4);   // de H van halte
  B.box(2.15, 2.5, 0.565, 0.14, 0.05, 0.01, 0x1f6fb4);
  B.box(2.15, 2.0, 0.54, 0.34, 0.26, 0.025, 0xf2f0ea);                                         // dienstregelingkastje
  B.box(2.15, 0.02, 0.5, 0.22, 0.04, 0.22, DARK);
  return B.build();
}

function paaltje() {
  const B = new GeoBuilder(1);
  B.geo(new THREE.CylinderGeometry(0.075, 0.08, 0.86, 8), composeMatrix(0, 0.43, 0), 0x8c2a2a);
  B.geo(new THREE.CylinderGeometry(0.082, 0.082, 0.07, 8), composeMatrix(0, 0.76, 0), 0xe8e4dc);   // reflecterende band
  B.geo(new THREE.CylinderGeometry(0.082, 0.082, 0.07, 8), composeMatrix(0, 0.58, 0), 0xe8e4dc);
  B.geo(new THREE.CylinderGeometry(0.02, 0.078, 0.07, 8), composeMatrix(0, 0.895, 0), 0x6e1f1f); // bolle kop
  B.geo(new THREE.CylinderGeometry(0.105, 0.115, 0.05, 8), composeMatrix(0, 0.025, 0), DARK);   // voetkraag
  return B.build();
}

// --- huisraad voor de ruimtes van akte 1 (23-11): wat de CC0-packs niet hebben ------------------------------------------------
// De tv in de flat: een plat scherm met een smalle rand, een spiegelend vlak met een lichtere schuine streep, een voet met een hals,
// een aan-lampje en twee luidsprekerroosters onderin. Voorkant +x, breedte langs z.
function tv() {
  const B = new GeoBuilder(1);
  const W = 1.42, H = 0.82, Y = 0.12;
  const bezel = 0x16181b, glass = 0x1d2733, glassHi = 0x34465a, foot = 0x2a2d31;
  B.box(0, Y + H / 2, 0, 0.05, H, W, bezel);                                                    // romp
  B.box(-0.03, Y + H / 2, 0, 0.03, H * 0.7, W * 0.6, 0x202326);                                // achterkant: dikker midden
  B.box(0.027, Y + H / 2 + 0.015, 0, 0.006, H - 0.07, W - 0.05, glass);                        // scherm
  for (let i = 0; i < 3; i++) B.box(0.031, Y + 0.25 + i * 0.12, -0.25 + i * 0.12, 0.004, 0.36, 0.05, glassHi, 0, 0.5, 0, 0); // weerspiegeling
  B.box(0.03, Y + 0.025, 0.5, 0.004, 0.012, 0.012, 0xd84a3a);                                  // aan-lampje
  for (const z of [-0.45, 0.45]) B.box(0.028, Y + 0.022, z, 0.004, 0.018, 0.24, 0x2c3036);     // luidsprekerroosters
  B.box(-0.01, Y / 2 + 0.01, 0, 0.06, Y, 0.08, foot);                                          // hals
  B.box(0, 0.008, 0, 0.26, 0.016, 0.42, foot);                                                 // voet
  B.box(0.0, 0.018, 0, 0.22, 0.006, 0.38, 0x3a3e43);                                           // rand van de voet
  return B.build();
}

// De frituurpan van Tammo en Tessa: rvs-bak met afgeronde hoeken (geschuinde randen), olie, twee manden met een zwarte greep,
// een deksel met een venster dat schuin openstaat, een draaiknop en een rood lampje. Voorkant +x.
function frituurpan() {
  const B = new GeoBuilder(1);
  const rvs = 0xb9bec4, rvsD = 0x8d9399, zwart = 0x1c1d20, olie = 0xd9a53a, olieD = 0xb8862a;
  B.box(0, 0.13, 0, 0.36, 0.24, 0.42, rvs);                                                    // bak
  for (const s of [-1, 1]) { B.box(s * 0.18, 0.13, 0, 0.02, 0.22, 0.4, rvsD); B.box(0, 0.13, s * 0.21, 0.34, 0.22, 0.02, rvsD); } // randen
  B.box(0, 0.012, 0, 0.38, 0.024, 0.44, zwart);                                                // voetrand
  B.box(0, 0.252, 0, 0.3, 0.006, 0.36, olie);                                                  // olie
  for (const z of [-0.085, 0.085]) {
    B.box(0, 0.245, z, 0.24, 0.02, 0.15, 0x9ea4aa);                                            // mand (rand boven de olie)
    for (let i = 0; i < 4; i++) B.box(-0.09 + i * 0.06, 0.256, z, 0.006, 0.004, 0.14, olieD);  // gaas
    B.box(0.2, 0.25, z, 0.1, 0.022, 0.03, zwart);                                              // greep naar voren
  }
  B.box(-0.17, 0.33, 0, 0.03, 0.16, 0.4, rvs, 0, 0, 0, 0.35);                                  // deksel schuin open
  B.box(-0.15, 0.34, 0, 0.012, 0.09, 0.22, 0x3b4a55, 0, 0, 0, 0.35);                           // venster in het deksel
  B.box(0.181, 0.1, 0.12, 0.012, 0.05, 0.05, zwart);                                           // draaiknop
  B.box(0.185, 0.1, 0.12, 0.006, 0.012, 0.035, 0xe0e0e0);                                      // streep op de knop
  B.box(0.182, 0.1, -0.12, 0.008, 0.018, 0.018, 0xd8402a);                                     // lampje
  B.box(0.181, 0.18, 0, 0.006, 0.02, 0.3, rvsD);                                               // naad onder de rand
  return B.build();
}

// Een oude buisradio op de vensterbank: houten kast met een gewelfd dak, een stoffen luidsprekerfront met lijsten, een groen
// afstemvenster, twee knoppen, een messing bies en een antenne. Voorkant +x.
function buisradio() {
  const B = new GeoBuilder(1);
  const hout = 0x6b4526, houtD = 0x4f321b, stof = 0xd8c7a0, stofD = 0xb8a57c, messing = 0xc9a24a;
  B.box(0, 0.085, 0, 0.16, 0.15, 0.3, hout);                                                   // kast
  B.geo(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 10, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(-Math.PI / 2), composeMatrix(0, 0.16, 0), hout); // gewelfd dak
  B.box(0, 0.006, 0, 0.17, 0.012, 0.31, houtD);                                                // plint
  B.box(0.081, 0.09, -0.06, 0.004, 0.12, 0.15, stof);                                          // luidsprekerstof
  for (let i = 0; i < 6; i++) B.box(0.084, 0.04 + i * 0.02, -0.06, 0.003, 0.004, 0.15, stofD); // lijsten
  B.box(0.082, 0.14, -0.06, 0.004, 0.006, 0.17, messing);                                      // bies
  B.box(0.082, 0.12, 0.08, 0.004, 0.04, 0.1, 0x3fc97a);                                        // afstemvenster
  B.box(0.083, 0.12, 0.08, 0.003, 0.03, 0.003, 0xc83a2a);                                      // naald
  for (const z of [0.05, 0.11]) B.geo(new THREE.CylinderGeometry(0.016, 0.016, 0.02, 8).rotateZ(Math.PI / 2), composeMatrix(0.09, 0.055, z), houtD); // knoppen
  B.geo(tubeGeometry([-0.04, 0.2, -0.1], [-0.08, 0.36, -0.14], 0.004), null, 0x9aa0a6);       // antenne
  return B.build();
}

// Een vast pseudo-toeval (dezelfde kast is elke keer dezelfde kast).
const seeded = (s) => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };

// Een boekenkast van twee net-afgestudeerden: grenen, vier planken, rijen boeken van wisselende hoogte en kleur (een paar scheef),
// een doos en een plantje bovenop, een stapel tijdschriften onderin. Voorkant +x, breedte langs z.
function boekenkast() {
  const B = new GeoBuilder(1);
  const hout = 0xc9a06a, houtD = 0xa9824f, W = 0.9, D = 0.3, H = 1.8;
  const rnd = seeded(11);
  for (const s of [-1, 1]) B.box(0, H / 2, s * (W / 2 - 0.01), D, H, 0.02, hout);         // zijkanten
  B.box(-D / 2 + 0.005, H / 2, 0, 0.01, H, W, houtD);                                          // achterwand
  const planken = [0.05, 0.47, 0.89, 1.31, 1.78];
  for (const y of planken) B.box(0, y, 0, D, 0.025, W - 0.02, hout);
  B.box(D / 2 - 0.01, 0.025, 0, 0.02, 0.05, W - 0.02, houtD);                                  // plint
  const kleuren = [0x8e2f2a, 0x2f4f7a, 0xd8b45a, 0x3f6b4a, 0xe8e2d2, 0x6b4a7a, 0xc4602c, 0x22262b, 0x9aa7b0];
  for (let p = 0; p < 3; p++) {
    let z = -W / 2 + 0.03;
    const y0 = planken[p] + 0.0125, maxH = planken[p + 1] - planken[p] - 0.06;
    while (z < W / 2 - 0.08) {
      const t = 0.025 + rnd() * 0.035, h = maxH * (0.62 + rnd() * 0.36), c = kleuren[Math.floor(rnd() * kleuren.length)];
      if (rnd() < 0.08 && z > -W / 2 + 0.2) { B.box(0.02, y0 + h * 0.45, z + 0.05, D * 0.75, t, h, c, 0, 0.35, 0, 0); z += h * 0.6; continue; } // een liggend boek
      B.box(0.01, y0 + h / 2, z + t / 2, D * 0.75, h, t, c);
      B.box(D * 0.38 + 0.012, y0 + h * 0.72, z + t / 2, 0.003, 0.012, t * 0.8, 0xe8d9a8);      // titelstreepje op de rug
      z += t + 0.003;
      if (rnd() < 0.12) z += 0.06;                                                              // een gat in de rij
    }
  }
  B.box(0.02, planken[3] + 0.13, -0.2, 0.24, 0.24, 0.3, 0xb98d56);                              // een doos op de bovenste plank
  B.box(0.02, planken[3] + 0.255, -0.2, 0.25, 0.012, 0.08, 0xe8d3a8);
  B.geo(new THREE.CylinderGeometry(0.06, 0.05, 0.11, 8), composeMatrix(0.03, planken[4] + 0.068, 0.25), 0xb8653a); // potje bovenop
  B.geo(new THREE.IcosahedronGeometry(0.1, 0), composeMatrix(0.03, planken[4] + 0.2, 0.25), 0x4f8a40);
  for (let i = 0; i < 4; i++) B.box(0.0, planken[0] + 0.02 + i * 0.012, 0.2, 0.22, 0.01, 0.28, [0xe8e2d2, 0xc4402c, 0x2f6fb0, 0xf2c94c][i]); // tijdschriften
  return B.build();
}

// Een vouwbaar droogrek met was: twee schuine poten per kant, zes stangen, handdoeken en shirts over de stangen. Voorkant +x, lengte langs z.
function droogrek() {
  const B = new GeoBuilder(1);
  const staal = 0xd9dcde, L = 1.2;
  for (const s of [-1, 1]) {
    B.geo(tubeGeometry([-0.32, 0, s * L / 2], [0.0, 0.9, s * L / 2], 0.012), null, staal);
    B.geo(tubeGeometry([0.32, 0, s * L / 2], [0.0, 0.9, s * L / 2], 0.012), null, staal);
  }
  const stangen = [[-0.2, 0.55], [-0.1, 0.72], [0, 0.9], [0.1, 0.72], [0.2, 0.55]];
  for (const [x, y] of stangen) B.geo(tubeGeometry([x, y, -L / 2], [x, y, L / 2], 0.008), null, staal);
  B.geo(tubeGeometry([-0.31, 0.12, -L / 2], [-0.31, 0.12, L / 2], 0.008), null, staal);
  B.geo(tubeGeometry([0.31, 0.12, -L / 2], [0.31, 0.12, L / 2], 0.008), null, staal);
  // de was: een handdoek, twee shirts, sokken
  B.box(-0.2, 0.36, -0.3, 0.012, 0.38, 0.42, 0xc4402c);
  B.box(0.2, 0.33, 0.25, 0.012, 0.44, 0.5, 0x2f6fb0);
  B.box(-0.1, 0.53, 0.25, 0.012, 0.38, 0.36, 0xe8e2d2);
  B.box(0.1, 0.56, -0.25, 0.012, 0.32, 0.3, 0x3f6b4a);
  for (const z of [0.0, 0.08, 0.16]) B.box(0.0, 0.8, z, 0.012, 0.18, 0.06, [0x22262b, 0xd8b45a, 0x22262b][Math.round(z / 0.08)]);
  return B.build();
}

// Een stapel verhuisdozen die nog niet uitgepakt is: drie dozen, plakband, een etiket, handgrepen; de bovenste half open. Voorkant +x.
function verhuisdozen() {
  const B = new GeoBuilder(1);
  const karton = 0xb98d56, kartonD = 0x9c7444, tape = 0xd9c8a0, gat = 0x3a2a1a;
  const doos = (x, y, z, w, h, d, open = false) => {
    B.box(x, y + h / 2, z, w, h, d, karton);
    B.box(x, y + h + 0.002, z, w + 0.004, 0.004, 0.06, tape);                       // plakband over de naad
    B.box(x + w / 2 + 0.002, y + h * 0.6, z, 0.003, 0.08, d * 0.45, 0xf2efe6);      // etiket
    B.box(x + w / 2 + 0.003, y + h * 0.6, z, 0.003, 0.008, d * 0.35, 0x5b4a36);     // geschreven regel
    for (const s of [-1, 1]) B.box(x, y + h * 0.75, z + s * (d / 2 + 0.002), w * 0.3, 0.035, 0.004, gat); // handgrepen
    if (open) { B.box(x - w / 2 - 0.08, y + h + 0.06, z, 0.16, 0.012, d, kartonD, 0, 0, 0, 0.9); B.box(x + w / 2 + 0.08, y + h + 0.06, z, 0.16, 0.012, d, kartonD, 0, 0, 0, -0.9); }
  };
  doos(0, 0, 0, 0.5, 0.4, 0.6);
  doos(0.02, 0.4, 0.03, 0.44, 0.34, 0.5);
  doos(-0.03, 0.74, -0.02, 0.36, 0.3, 0.42, true);
  return B.build();
}

// Een ingelijste print (verzonnen illustratie: een toren in een avondlucht boven daken): lijst, passe-partout, vlakken. Dun langs x,
// voorkant +x, onderkant op y = 0 (hangt aan een wand of leunt ergens tegen).
function lijst() {
  const B = new GeoBuilder(1);
  const Wd = 0.42, H = 0.56;
  B.box(0, H / 2, 0, 0.025, H, Wd, 0x2a2622);                                                   // lijst
  B.box(0.013, H / 2, 0, 0.004, H - 0.05, Wd - 0.05, 0xf2efe6);                                 // passe-partout
  B.box(0.016, H / 2 + 0.03, 0, 0.004, H - 0.17, Wd - 0.13, 0xe9a35a);                          // avondlucht
  B.box(0.017, H / 2 + 0.1, 0, 0.004, 0.12, Wd - 0.13, 0xd8645a);                               // band van de zon
  B.box(0.018, 0.2, -0.06, 0.004, 0.17, 0.035, 0x3a2a28);                                       // toren
  B.box(0.018, 0.31, -0.06, 0.004, 0.06, 0.02, 0x3a2a28);
  for (let i = 0; i < 4; i++) B.box(0.018, 0.12 + (i % 2) * 0.02, -0.12 + i * 0.07, 0.004, 0.06 + (i % 2) * 0.04, 0.06, 0x4a3a34); // daken
  B.box(0.018, 0.36, 0.08, 0.004, 0.05, 0.05, 0xf6e6b8);                                        // zon
  return B.build();
}

// Een poster met plakband (verzonnen ontwerp: drie vlakken en een fiets in lijnen, geen tekst). Dun langs x, voorkant +x, onderkant op 0.
function poster() {
  const B = new GeoBuilder(1);
  const W = 0.5, H = 0.7;
  B.box(0, H / 2, 0, 0.004, H, W, 0xf2ead8);
  B.box(0.003, H * 0.64, -0.08, 0.003, 0.3, 0.26, 0x2f6fb0);
  B.box(0.004, H * 0.5, 0.09, 0.003, 0.22, 0.22, 0xe8742a);
  B.box(0.005, H * 0.3, 0, 0.003, 0.06, 0.38, 0x3f6b4a);
  for (const z of [-0.1, 0.1]) B.geo(new THREE.TorusGeometry(0.06, 0.006, 4, 12).rotateY(Math.PI / 2), composeMatrix(0.006, H * 0.18, z), 0x22262b); // fietswielen
  B.box(0.006, H * 0.2, 0, 0.002, 0.006, 0.2, 0x22262b);
  for (const [y, z] of [[H - 0.02, -W / 2 + 0.03], [H - 0.02, W / 2 - 0.03], [0.02, -W / 2 + 0.03], [0.02, W / 2 - 0.03]]) B.box(0.004, y, z, 0.003, 0.03, 0.05, 0xe8e0c4); // plakband
  return B.build();
}

// Een laptop die openstaat: onderkant met toetsenbord en trackpad, scherm schuin achterover met een licht beeld. Voorkant +x.
function laptop() {
  const B = new GeoBuilder(1);
  B.box(0, 0.009, 0, 0.23, 0.018, 0.33, 0x8f959b);                                              // onderkant
  B.box(0.01, 0.0185, 0, 0.12, 0.002, 0.28, 0x2a2d31);                                           // toetsenbord
  B.box(0.09, 0.0185, 0, 0.05, 0.002, 0.1, 0x6f757b);                                            // trackpad
  B.box(-0.115, 0.11, 0, 0.012, 0.21, 0.33, 0x8f959b, 0, 0, 0, -0.25);                           // scherm, schuin
  B.box(-0.108, 0.112, 0, 0.003, 0.18, 0.3, 0x9cc4dc, 0, 0, 0, -0.25);                           // het beeld
  B.box(-0.112, 0.02, 0, 0.02, 0.012, 0.3, 0x55595e);                                              // scharnier
  B.box(-0.137, 0.21, 0, 0.004, 0.008, 0.008, 0x111111, 0, 0, 0, -0.25);                          // camerapuntje
  return B.build();
}

const MAKERS = { bank, afvalbak, fietsenrek: () => fietsenrek(4), bushokje, paaltje, tv, frituurpan, buisradio, boekenkast, droogrek, verhuisdozen, lijst, poster, laptop };
const cache = new Map();

// De gedeelde geometrie van een geregistreerde prop (een kopie per aanroep is niet nodig: de geometrie is gemarkeerd als gedeeld).
export function propGeometry(id) {
  let g = cache.get(id);
  if (!g) {
    const make = MAKERS[id];
    if (!make) throw new Error('onbekende prop: ' + id);
    g = markShared(make());
    cache.set(id, g);
  }
  return g;
}
export { fietsenrek as fietsenrekGeometry };
export const PROP_MODEL_IDS = Object.keys(MAKERS);
