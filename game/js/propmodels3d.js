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

// --- straatgebeurtenissen (#1316) -------------------------------------------------------------------
// Een kraampje op de stoep (limonade, tweedehands boeken): schraagtafel met een kleed dat aan de voorkant (+x) afhangt,
// twee palen met een gestreepte luifel, een handgeschreven bordje en spullen op tafel. Breedte langs z.
function kraampje() {
  const B = new GeoBuilder(1);
  const W = 1.6, D = 0.8;
  const wood = 0x9a7046, woodD = 0x7a5634, cloth = 0xe8e1cc, stripeA = 0xc8433a, stripeB = 0xf2eee4;
  B.box(0, 0.76, 0, D, 0.04, W, wood);                                                         // tafelblad
  B.box(0.02, 0.785, 0, D - 0.02, 0.012, W - 0.04, cloth);                                     // kleed op het blad
  B.box(D / 2 + 0.005, 0.5, 0, 0.012, 0.5, W - 0.04, cloth);                                   // kleed hangt voor af
  for (let i = 0; i < 4; i++) B.box(D / 2 + 0.012, 0.5, -W / 2 + 0.2 + i * 0.4, 0.004, 0.48, 0.05, 0xd6cdb2); // plooien
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) B.box(sx * (D / 2 - 0.08), 0.37, sz * (W / 2 - 0.08), 0.05, 0.74, 0.05, woodD, 0, 0, 0, sx * 0.06); // schragen
  for (const sz of [-1, 1]) B.box(0, 0.25, sz * (W / 2 - 0.08), D - 0.2, 0.03, 0.03, woodD);   // dwarslat tussen de poten
  for (const sz of [-1, 1]) B.geo(tubeGeometry([-D / 2 + 0.05, 0.76, sz * (W / 2 - 0.04)], [-D / 2 + 0.05, 2.05, sz * (W / 2 - 0.04)], 0.022), null, STEEL); // luifelpalen
  // luifel: vijf banen om en om, licht hellend naar voren, met een geschulpte rand
  for (let i = 0; i < 5; i++) {
    const z = -W / 2 + (i + 0.5) * (W / 5);
    B.box(0.05, 2.0, z, D + 0.3, 0.025, W / 5, i % 2 ? stripeB : stripeA, 0, 0, 0, -0.18);
    B.box(D / 2 + 0.2, 1.88, z, 0.01, 0.12, W / 5 - 0.02, i % 2 ? stripeB : stripeA);
  }
  B.box(-D / 2 + 0.05, 2.06, 0, 0.04, 0.04, W, STEEL);                                          // ligger achter
  // bordje met krijt op een paaltje (de tekst is een vlak met een lichte rand)
  B.box(D / 2 + 0.1, 1.05, W / 2 - 0.2, 0.02, 0.32, 0.42, 0x2c3a33);
  B.box(D / 2 + 0.112, 1.05, W / 2 - 0.2, 0.004, 0.26, 0.36, 0x3a4a42);
  for (let i = 0; i < 3; i++) B.box(D / 2 + 0.116, 1.13 - i * 0.07, W / 2 - 0.2, 0.002, 0.018, 0.26 - i * 0.05, 0xe9e6dc);
  // spullen: een kan limonade met glazen, een stapel boeken, een geldkistje
  B.geo(new THREE.CylinderGeometry(0.07, 0.08, 0.24, 8), composeMatrix(0.05, 0.91, -0.45), 0xf2d64a);
  B.geo(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 8), composeMatrix(0.05, 1.04, -0.45), 0xdedad0);
  for (let i = 0; i < 4; i++) B.geo(new THREE.CylinderGeometry(0.032, 0.028, 0.09, 6), composeMatrix(0.2, 0.84, -0.6 + i * 0.1), 0xcfe3e8);
  for (let i = 0; i < 4; i++) B.box(0.0, 0.81 + i * 0.045, 0.3, 0.22, 0.04, 0.3, [0x3a5a8a, 0x8a3a3a, 0x3a6a4a, 0xc9a227][i], 0, 0.1 * i);
  B.box(-0.15, 0.84, 0.6, 0.18, 0.09, 0.24, 0x5a4a3a);
  B.box(-0.15, 0.89, 0.6, 0.185, 0.012, 0.245, 0x9aa0a4);                                       // deksel van het kistje
  return B.build();
}

// Een ijscokar (zomer!): een witte koelbak op twee wielen met deksels, een duwbeugel, een steunpoot, een parasol
// en een ijshoorntje als uithangbord. +x is de verkoopkant, breedte langs z.
function ijscokar() {
  const B = new GeoBuilder(1);
  const body = 0xf1efe8, trim = 0x4aa6c8, lidC = 0xdfe9ee;
  B.box(0, 0.62, 0, 0.75, 0.62, 1.3, body);                                                    // koelbak
  B.box(0.38, 0.62, 0, 0.012, 0.5, 1.2, trim);                                                 // blauwe band voor
  B.box(0.385, 0.66, 0, 0.004, 0.16, 0.9, 0xf7f3e9);                                           // het vlak waar het menu op staat
  for (let i = 0; i < 4; i++) B.box(0.388, 0.67, -0.32 + i * 0.21, 0.003, 0.08, 0.14, [0xe48aa6, 0xf2d27a, 0x9bd08f, 0x8b5a3c][i]); // de smaken
  B.box(0, 0.94, 0, 0.78, 0.03, 1.34, trim);                                                   // rand
  for (const z of [-0.33, 0.33]) {
    B.box(0, 0.965, z, 0.66, 0.025, 0.6, lidC);                                                // twee deksels
    B.box(0.12, 0.99, z, 0.04, 0.02, 0.22, STEEL);                                             // handgreep
  }
  for (const z of [-0.72, 0.72]) {
    B.geo(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 14).rotateX(Math.PI / 2), composeMatrix(-0.05, 0.24, z), 0x222426);  // band
    B.geo(new THREE.CylinderGeometry(0.15, 0.15, 0.065, 10).rotateX(Math.PI / 2), composeMatrix(-0.05, 0.24, z), 0xb9bcc0); // velg
    B.box(-0.05, 0.45, z * 0.95, 0.05, 0.3, 0.03, STEEL);                                      // ophanging
  }
  B.geo(tubeGeometry([-0.05, 0.24, -0.75], [-0.05, 0.24, 0.75], 0.02), null, STEEL);           // as
  B.geo(tubeGeometry([-0.38, 0.9, -0.5], [-0.75, 1.0, -0.5], 0.02), null, STEEL);              // duwbeugel
  B.geo(tubeGeometry([-0.38, 0.9, 0.5], [-0.75, 1.0, 0.5], 0.02), null, STEEL);
  B.geo(tubeGeometry([-0.75, 1.0, -0.5], [-0.75, 1.0, 0.5], 0.024), null, 0x2b2f33);
  B.geo(tubeGeometry([0.3, 0.32, 0.5], [0.3, 0.0, 0.5], 0.02), null, STEEL);                   // steunpoot
  B.geo(tubeGeometry([0.3, 0.32, -0.5], [0.3, 0.0, -0.5], 0.02), null, STEEL);
  // parasol: stok, acht banen om en om, een knop
  B.geo(tubeGeometry([-0.25, 0.95, 0], [-0.25, 2.15, 0], 0.02), null, 0xd8d4c8);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    B.geo(new THREE.ConeGeometry(0.8, 0.28, 3, 1, true, a, Math.PI / 4), composeMatrix(-0.25, 2.06, 0), i % 2 ? 0xf2eee4 : trim);
  }
  B.geo(new THREE.SphereGeometry(0.04, 6, 4), composeMatrix(-0.25, 2.22, 0), 0xc8433a);
  // het uithangbord: een hoorntje met twee bollen op een stang
  B.geo(tubeGeometry([0.3, 0.95, -0.6], [0.3, 1.45, -0.6], 0.015), null, STEEL);
  B.geo(new THREE.ConeGeometry(0.07, 0.2, 8).rotateX(Math.PI), composeMatrix(0.3, 1.55, -0.6), 0xc99a5a);
  B.geo(new THREE.SphereGeometry(0.075, 8, 6), composeMatrix(0.3, 1.68, -0.6), 0xe48aa6);
  B.geo(new THREE.SphereGeometry(0.06, 8, 6), composeMatrix(0.3, 1.78, -0.6), 0xf7f0d0);
  return B.build();
}

// Een open gitaarkoffer op de stoep voor een straatmuzikant: de bak met afgeronde boven- en onderkant (twee lagen),
// rood fluweel binnenin, het deksel open tegen de achterkant, een paar munten en een briefje. Lengte langs z.
function gitaarkoffer() {
  const B = new GeoBuilder(1);
  const shell = 0x22201e, plush = 0x8e2433, edge = 0x3a3632;
  B.box(0, 0.05, -0.18, 0.36, 0.1, 0.5, shell);                                                // brede onderkant
  B.box(0, 0.05, 0.3, 0.26, 0.1, 0.46, shell);                                                 // smalle hals
  B.box(0, 0.102, -0.18, 0.31, 0.006, 0.45, plush);                                            // fluweel
  B.box(0, 0.102, 0.3, 0.21, 0.006, 0.42, plush);
  B.box(0, 0.104, 0.1, 0.12, 0.004, 0.1, 0x6e1a26);                                            // vakje
  B.box(-0.2, 0.2, -0.18, 0.04, 0.36, 0.5, shell, 0, 0, 0, 0.35);                              // deksel, open naar achteren
  B.box(-0.2, 0.2, 0.3, 0.04, 0.26, 0.46, shell, 0, 0, 0, 0.35);
  B.box(-0.18, 0.2, -0.18, 0.004, 0.3, 0.44, plush, 0, 0, 0, 0.35);                            // binnenkant deksel
  for (const z of [-0.43, 0.53]) B.box(0, 0.05, z, 0.3, 0.1, 0.012, edge);                     // randen
  B.box(0.181, 0.06, -0.18, 0.006, 0.04, 0.1, 0x9aa0a4);                                       // slotjes
  B.box(0.131, 0.06, 0.3, 0.006, 0.04, 0.08, 0x9aa0a4);
  const coins = [[0.05, -0.25], [-0.04, -0.12], [0.08, -0.05], [-0.07, -0.3], [0.02, 0.2], [0.1, -0.33]];
  coins.forEach(([x, z], i) => B.geo(new THREE.CylinderGeometry(0.013, 0.013, 0.004, 8), composeMatrix(x, 0.108, z, 0.1 * i, 0, 0.05 * i), i % 3 ? 0xc9a43a : 0xb8bcc0));
  B.box(-0.05, 0.107, -0.02, 0.06, 0.002, 0.12, 0xe9e6dc, 0, 0.3);                             // een briefje
  return B.build();
}

// Een akoestische gitaar, rechtop op de grond (de muzikant houdt hem in zijn armen, models3d_people.js 'muziek'):
// klankkast met twee rondingen, klankgat, kam, hals met fretten, kop met stemmechanieken en zes snaren. Voorkant +x.
function gitaar() {
  const B = new GeoBuilder(1);
  const top = 0xd9a85e, side = 0x7a4a26, dark = 0x1c1410, neck = 0x5a3a20;
  const bout = (y, r) => {
    B.geo(new THREE.CylinderGeometry(r, r, 0.1, 14).rotateZ(Math.PI / 2), composeMatrix(0, y, 0), side);
    B.geo(new THREE.CylinderGeometry(r - 0.006, r - 0.006, 0.006, 14).rotateZ(Math.PI / 2), composeMatrix(0.052, y, 0), top);
  };
  bout(0.19, 0.19);                                                                             // onderste ronding
  bout(0.42, 0.14);                                                                             // bovenste ronding
  B.box(0, 0.3, 0, 0.1, 0.12, 0.22, side);                                                     // taille
  B.box(0.052, 0.3, 0, 0.006, 0.12, 0.2, top);
  B.geo(new THREE.CylinderGeometry(0.045, 0.045, 0.004, 12).rotateZ(Math.PI / 2), composeMatrix(0.056, 0.36, 0), dark); // klankgat
  B.geo(new THREE.CylinderGeometry(0.055, 0.055, 0.003, 12).rotateZ(Math.PI / 2), composeMatrix(0.0555, 0.36, 0), 0x3a2414); // rozet
  B.box(0.058, 0.13, 0, 0.012, 0.025, 0.12, dark);                                             // kam
  B.box(0.04, 0.73, 0, 0.035, 0.5, 0.05, neck);                                                // hals
  B.box(0.058, 0.73, 0, 0.004, 0.5, 0.046, 0x2a1a10);                                          // toets
  for (let i = 1; i < 8; i++) B.box(0.061, 0.5 + i * 0.06, 0, 0.003, 0.004, 0.048, 0xc0c4c8); // fretten
  B.box(0.035, 1.03, 0, 0.03, 0.14, 0.075, neck, 0, 0, 0, -0.15);                              // kop
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) B.box(0.03, 0.99 + i * 0.04, s * 0.05, 0.015, 0.015, 0.03, 0xc0c4c8); // stemmechanieken
  for (let i = 0; i < 6; i++) B.box(0.062, 0.6, -0.018 + i * 0.0072, 0.002, 0.94, 0.0016, 0xe8e2d0); // snaren
  return B.build();
}

const MAKERS = { bank, afvalbak, fietsenrek: () => fietsenrek(4), bushokje, paaltje, kraampje, ijscokar, gitaarkoffer, gitaar };
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
