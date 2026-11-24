// Carbidschieten (24-11, feedback eigenaar: "totaal niet te zien dat het carbidschieten is"): de bouwers van de props op het
// carbidveld van boer Roelf. Geregistreerd in propregister.js en gebouwd via propmodels3d.js propGeometry(id), net als het
// straatmeubilair: het veld (carbid.js), de intro van de activiteit (carbidintro.js) en de trailershot gebruiken dezelfde bouwer.
// Een liggende melkbus op een houten bok, het deksel los (dat vliegt), de emmer met water en het blik carbid, de lontstok,
// gehoorkappen, de koffietafel, ronde balen en een weidehek. Zomer: niets van oud en nieuw. Elke bouwer geeft een geometrie met
// vertexkleuren, oorsprong op de grond, +x als voorkant.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, composeMatrix, tubeGeometry } from './pixelart3d.js';

const ZINK = 0xb4bbc0, ZINK_D = 0x878f95, ZINK_L = 0xd2d7da, ROEST = 0x8a5434, HOUT = 0x8a6440, HOUT_D = 0x6a4a2e, HOUT_L = 0xa07a50;
const v2 = (pts) => pts.map(([r, y]) => new THREE.Vector2(r, y));

// De straal en de lengte van de liggende bus (voor de scène: waar de mond en het ontsteekgaatje zitten)
export const MELKBUS = { r: 0.165, len: 0.68, mond: 0.68, gat: 0.07 };

// De liggende melkbus (40 l): romp met voetrand, twee banden, schouder, hals met kraag, twee oren, de open mond aan +x (het deksel
// zit los), een ontsteekgaatje bovenop bij de bodem en een paar roestplekken. De as langs x.
export function melkbus() {
  const B = new GeoBuilder(1);
  const R = MELKBUS.r + 0.008; // de as iets boven de straal: de oren steken onderaan niet door de grond
  const prof = v2([[0.001, 0], [0.15, 0], [0.168, 0.012], [0.168, 0.04], [0.16, 0.05], [0.16, 0.2], [0.166, 0.21], [0.166, 0.23], [0.16, 0.24], [0.16, 0.41], [0.166, 0.42], [0.166, 0.44], [0.16, 0.45], [0.152, 0.5], [0.12, 0.56], [0.1, 0.59], [0.098, 0.64], [0.112, 0.65], [0.112, 0.675], [0.09, 0.68], [0.084, 0.62]]);
  const band = (x) => (x < 0.05 || (x > 0.2 && x < 0.24) || (x > 0.41 && x < 0.45) || (x > 0.64 && x < 0.676) ? ZINK_D : x > 0.676 ? 0x2a2c2e : x > 0.45 && x < 0.6 ? ZINK_L : ZINK);
  B.geo(new THREE.LatheGeometry(prof, 14), composeMatrix(0, R, 0, 0, 0, -Math.PI / 2), (x) => band(x));
  B.geo(new THREE.CircleGeometry(0.084, 12).rotateY(Math.PI / 2), composeMatrix(0.62, R, 0), 0x1c1d1e);           // donker binnenin de hals
  for (const s of [-1, 1]) {
    B.geo(new THREE.TorusGeometry(0.045, 0.011, 4, 8, Math.PI), composeMatrix(0.53, R + s * 0.13, 0, s > 0 ? 0 : Math.PI, 0, 0), ZINK_D); // oren
    B.box(0.53, R + s * 0.125, 0, 0.05, 0.02, 0.03, ZINK_D);
  }
  B.geo(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 8), composeMatrix(MELKBUS.gat, 2 * R - 0.004, 0), 0x141414); // ontsteekgaatje
  B.geo(new THREE.CylinderGeometry(0.026, 0.026, 0.008, 8), composeMatrix(MELKBUS.gat, 2 * R - 0.006, 0), ZINK_D);
  for (const [x, a, w] of [[0.12, 2.3, 0.07], [0.33, 4.1, 0.05], [0.47, 1.2, 0.045]]) B.box(x, R + Math.cos(a) * 0.162, Math.sin(a) * 0.162, w, 0.008, w * 0.8, ROEST, 0, -a, 0, 0); // roest
  return B.build();
}

// Het deksel van de melkbus: schotel met opstaande rand, een bolle kap en een beugel. Plat op de grond, oorsprong onderaan.
export function busdeksel() {
  const B = new GeoBuilder(1);
  const prof = v2([[0.001, 0], [0.112, 0], [0.118, 0.008], [0.118, 0.034], [0.104, 0.04], [0.09, 0.05], [0.05, 0.062], [0.001, 0.065]]);
  B.geo(new THREE.LatheGeometry(prof, 14), null, (x, y) => (y < 0.036 ? ZINK_D : ZINK));
  B.geo(new THREE.CylinderGeometry(0.085, 0.085, 0.006, 14), composeMatrix(0, 0.003, 0), 0x55595c);               // binnenrand
  B.geo(new THREE.TorusGeometry(0.04, 0.007, 4, 8, Math.PI), composeMatrix(0, 0.064, 0), ZINK_L);                  // beugel
  for (const s of [-1, 1]) B.box(s * 0.04, 0.066, 0, 0.016, 0.008, 0.016, ZINK_D);
  return B.build();
}

// De hoogte van de wieg van de bok (de onderkant van de bus ligt daar)
export const BOK_WIEG = 0.47;

// De houten bok onder de bus: twee schragen met gespreide poten, elk een V-vormige wieg voor de romp, een lange regel onderlangs,
// een spie onder de voorkant (de mond wijst iets omhoog), bouten en een spijkerplaatje. Lengte langs x.
export function carbidbok() {
  const B = new GeoBuilder(1);
  for (const [x, c] of [[-0.26, HOUT], [0.26, HOUT_D]]) {
    for (const s of [-1, 1]) B.box(x, 0.24, s * 0.17, 0.06, 0.5, 0.055, c, 0, s * 0.32, 0, 0);                    // gespreide poten
    for (const s of [-1, 1]) B.box(x, 0.48, s * 0.1, 0.065, 0.04, 0.2, HOUT_L, 0, s * 0.42, 0, 0);                 // de V van de wieg
    B.box(x, 0.43, 0, 0.07, 0.06, 0.42, c);                                                                        // dwarsligger
    B.box(x, 0.15, 0, 0.04, 0.04, 0.42, HOUT_D);                                                                    // schoor
    for (const s of [-1, 1]) B.geo(new THREE.CylinderGeometry(0.009, 0.009, 0.08, 6).rotateZ(Math.PI / 2), composeMatrix(x + 0.036, 0.43, s * 0.14), 0x3a3a3a); // bouten
  }
  B.box(0, 0.2, 0, 0.62, 0.045, 0.05, HOUT);                                                                        // regel onderlangs
  B.box(0.26, 0.52, 0, 0.1, 0.035, 0.08, HOUT_L, 0, 0, 0, 0.25);                                                    // spie
  B.box(-0.26, 0.465, 0, 0.08, 0.004, 0.06, 0x9a9ea2);                                                              // spijkerplaatje
  return B.build();
}

// De emmer water en het blik carbid naast de bok: zinken emmer met hengsel en water, een blik met deksel en een rode band, een
// lepel om het carbid te scheppen en wat gemorste brokjes.
export function carbidspul() {
  const B = new GeoBuilder(1);
  const emmer = v2([[0.001, 0], [0.1, 0], [0.104, 0.01], [0.13, 0.27], [0.137, 0.28], [0.137, 0.29], [0.126, 0.29], [0.1, 0.03]]);
  B.geo(new THREE.LatheGeometry(emmer, 12), composeMatrix(-0.12, 0, 0), (x, y) => (y > 0.27 || (y > 0.12 && y < 0.15) ? ZINK_D : ZINK));
  B.geo(new THREE.CircleGeometry(0.12, 12).rotateX(-Math.PI / 2), composeMatrix(-0.12, 0.24, 0), 0x4f7a92);          // water
  B.geo(new THREE.TorusGeometry(0.13, 0.006, 4, 10, Math.PI), composeMatrix(-0.12, 0.29, 0, 0, Math.PI / 2, -0.4), 0x5a5f63); // hengsel
  B.geo(new THREE.CylinderGeometry(0.075, 0.075, 0.2, 12), composeMatrix(0.14, 0.1, 0.04), 0x9aa0a4);              // blik
  B.geo(new THREE.CylinderGeometry(0.0765, 0.0765, 0.07, 12, 1, true), composeMatrix(0.14, 0.1, 0.04), 0xb23a2a);   // rode band
  B.geo(new THREE.CylinderGeometry(0.0767, 0.0767, 0.012, 12, 1, true), composeMatrix(0.14, 0.145, 0.04), 0xe6dcc0); // witte bies
  B.geo(new THREE.CylinderGeometry(0.079, 0.079, 0.022, 12), composeMatrix(0.14, 0.205, 0.04), 0x6e7478);           // deksel
  B.geo(tubeGeometry([0.02, 0.01, -0.12], [0.2, 0.05, -0.18], 0.008, 0.008, 4), null, 0x8a9094);                   // lepel: steel
  B.geo(new THREE.SphereGeometry(0.028, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI), composeMatrix(0.0, 0.03, -0.115), 0x8a9094); // lepel: schep
  for (let i = 0; i < 5; i++) B.box(0.23 + (i % 2) * 0.03, 0.006, -0.06 + i * 0.025, 0.018, 0.012, 0.016, 0xd8d6cc); // gemorste brokjes carbid
  return B.build();
}

// De lengte van de lontstok (de scène zet de vlam aan het eind, x = LONT)
export const LONT = 2.0;

// De lontstok: een lange essenhouten stok met aan het eind een omwikkelde lap met ijzerdraad (de fakkel) en een greep van tape.
// Ligt langs x op de grond; de scène kantelt hem in de hand. De vlam is vuur (fx3d), geen geometrie.
export function lontstok() {
  const B = new GeoBuilder(1);
  const L = LONT;
  B.geo(tubeGeometry([0, 0.025, 0], [L, 0.025, 0], 0.017, 0.013, 6), null, 0xb08a5a);
  B.geo(tubeGeometry([0.05, 0.025, 0], [0.32, 0.025, 0], 0.02, 0.02, 6), null, 0x2a2a2a);                          // tape-greep
  B.geo(new THREE.CylinderGeometry(0.034, 0.03, 0.16, 7).rotateZ(-Math.PI / 2), composeMatrix(L - 0.06, 0.035, 0), 0x3a2e24); // verkoolde lap
  for (const x of [L - 0.12, L - 0.06, L]) B.geo(new THREE.CylinderGeometry(0.037, 0.037, 0.012, 7).rotateZ(-Math.PI / 2), composeMatrix(x, 0.035, 0), 0x6a6e72); // ijzerdraad
  B.geo(new THREE.CylinderGeometry(0.024, 0.02, 0.05, 7).rotateZ(-Math.PI / 2), composeMatrix(L + 0.03, 0.035, 0), 0xc8642a); // gloeiende punt
  return B.build();
}

// Gehoorkappen (geel, zoals op het erf): hoofdband met kussen, twee kappen met een zwart oorkussen en een draaipunt. De kappen
// langs z; op een hoofd hangt de scène ze aan userData.head.
export function gehoorkap() {
  const B = new GeoBuilder(1);
  const geel = 0xe6b922, zwart = 0x1d1e20;
  B.geo(new THREE.TorusGeometry(0.125, 0.012, 5, 14, Math.PI).rotateY(Math.PI / 2), composeMatrix(0, 0.07, 0), 0x2c2e30); // hoofdband
  B.box(0, 0.196, 0, 0.04, 0.012, 0.09, 0x3c3f42);                                                                    // kussen in de band
  for (const s of [-1, 1]) {
    B.geo(new THREE.CylinderGeometry(0.048, 0.05, 0.04, 12).rotateX(Math.PI / 2), composeMatrix(0, 0.05, s * 0.135), geel); // kap
    B.geo(new THREE.CylinderGeometry(0.044, 0.044, 0.016, 12).rotateX(Math.PI / 2), composeMatrix(0, 0.05, s * 0.11), zwart); // oorkussen
    B.box(0, 0.1, s * 0.138, 0.02, 0.03, 0.012, 0x3c3f42);                                                            // draaipunt
  }
  return B.build();
}

// De koffietafel bij de schuur: een klaptafel met geruit tafelzeil, schragenpoten, een thermoskan met dop-beker en handvat,
// vier mokken koffie, een koektrommel en een opgevouwen krant. Lang langs z, voorkant +x.
export function koffietafel() {
  const B = new GeoBuilder(1);
  const H = 0.74;
  B.box(0, H, 0, 0.7, 0.03, 1.3, 0xf0ece2);                                                                          // tafelzeil
  for (let i = 0; i < 6; i++) B.box(0, H + 0.016, -0.54 + i * 0.216, 0.7, 0.002, 0.1, 0xc94a3a);                       // ruit: banen
  for (let i = 0; i < 3; i++) B.box(-0.23 + i * 0.23, H + 0.017, 0, 0.1, 0.002, 1.3, 0xd98a7a);
  B.box(0.352, H - 0.06, 0, 0.004, 0.12, 1.3, 0xf0ece2);                                                              // overhang voor
  for (const z of [-0.5, 0.5]) for (const s of [-1, 1]) B.box(0, H / 2, z, 0.04, H * 1.05, 0.04, 0x8a8f93, 0, 0, 0, s * 0.42); // schragenpoten (X)
  for (const z of [-0.5, 0.5]) B.box(0, H - 0.04, z, 0.6, 0.04, 0.05, 0x6a6e72);
  const kan = v2([[0.001, 0], [0.055, 0], [0.06, 0.01], [0.06, 0.24], [0.05, 0.27], [0.035, 0.29], [0.035, 0.3]]);
  B.geo(new THREE.LatheGeometry(kan, 10), composeMatrix(0.05, H + 0.015, -0.35), (x, y) => (y > H + 0.25 ? 0x3c3f42 : 0x2f6a4a)); // thermoskan
  B.geo(new THREE.CylinderGeometry(0.042, 0.038, 0.07, 10), composeMatrix(0.05, H + 0.35, -0.35), 0x3c3f42);         // dop-beker
  B.box(0.11, H + 0.18, -0.35, 0.03, 0.1, 0.02, 0x3c3f42);                                                           // handvat
  for (const [x, z, c] of [[0.15, -0.15, 0xe9e4d6], [-0.12, -0.05, 0x3f6ea8], [0.12, 0.12, 0xc9a227], [-0.16, 0.25, 0xe9e4d6]]) {
    B.geo(new THREE.CylinderGeometry(0.04, 0.036, 0.09, 10), composeMatrix(x, H + 0.06, z), c);                        // mok
    B.geo(new THREE.CircleGeometry(0.034, 8).rotateX(-Math.PI / 2), composeMatrix(x, H + 0.104, z), 0x4a2e1c);        // koffie
    B.geo(new THREE.TorusGeometry(0.022, 0.007, 4, 8), composeMatrix(x + 0.045, H + 0.06, z), c);                     // oor
  }
  B.geo(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 14), composeMatrix(-0.1, H + 0.055, -0.42), 0x2a5a8a);          // koektrommel
  B.geo(new THREE.CylinderGeometry(0.114, 0.114, 0.02, 14), composeMatrix(-0.1, H + 0.1, -0.42), 0xc9a227);
  B.box(0.0, H + 0.022, 0.48, 0.26, 0.012, 0.34, 0xdedad0, 0, 0, 0.2, 0);                                             // krant
  B.box(0.0, H + 0.029, 0.44, 0.2, 0.002, 0.1, 0x6a6a6a, 0, 0, 0.2, 0);
  return B.build();
}

// Een ronde baal hooi in een net: de rol met een spiraal op de kopse kanten, netbanden om de omtrek en een paar uitstekende
// strootjes. De as langs z.
export function hooibaal() {
  const B = new GeoBuilder(1);
  const R = 0.66, L = 1.2, stro = 0xcfae62, kop = 0xbf9a50, net = 0xe6e2d4;
  B.geo(new THREE.CylinderGeometry(R, R, L, 16, 1, true).rotateX(Math.PI / 2), composeMatrix(0, R, 0), (x, y) => (Math.sin(x * 9 + y * 7) > 0.6 ? 0xc4a25a : stro));
  for (const s of [-1, 1]) {
    B.geo(new THREE.CircleGeometry(R, 16).rotateY(s > 0 ? 0 : Math.PI), composeMatrix(0, R, s * L / 2), kop);       // kopse kant
    for (const r of [0.18, 0.36, 0.52]) B.geo(new THREE.TorusGeometry(r, 0.018, 3, 14), composeMatrix(0, R, s * (L / 2 + 0.004)), 0xa8854a); // spiraal
  }
  for (const z of [-0.45, -0.15, 0.15, 0.45]) B.geo(new THREE.TorusGeometry(R + 0.006, 0.012, 3, 16), composeMatrix(0, R, z), net); // netbanden
  for (let i = 0; i < 5; i++) { const a = i * 1.3 + 0.4; B.box(Math.cos(a) * R, R + Math.sin(a) * R, -0.3 + i * 0.15, 0.012, 0.012, 0.16, 0xe3c77a, 0, a, 0.3, 0); }
  return B.build();
}

// Een gegalvaniseerd weidehek (3,8 m): twee eiken palen met een kapje, het hek met vijf regels, twee stijlen, een schoor,
// scharnieren en een sluitketting. Breedte langs z, voorkant +x.
export function weidehek() {
  const B = new GeoBuilder(1);
  const W = 3.8, gal = 0xaab1b6, galD = 0x7d858b;
  for (const s of [-1, 1]) {
    B.box(0, 0.7, s * (W / 2 + 0.12), 0.16, 1.4, 0.16, 0x5e4a34);                                                     // paal
    B.box(0, 1.415, s * (W / 2 + 0.12), 0.18, 0.03, 0.18, 0x4a3a28);                                                    // kapje
  }
  for (let i = 0; i < 5; i++) B.geo(tubeGeometry([0, 0.3 + i * 0.22, -W / 2], [0, 0.3 + i * 0.22, W / 2], 0.022, 0.022, 6), null, i % 2 ? gal : galD); // regels
  for (const z of [-W / 2, W / 2]) B.geo(tubeGeometry([0, 0.25, z], [0, 1.25, z], 0.03, 0.03, 6), null, galD);     // stijlen
  B.geo(tubeGeometry([0, 0.3, -W / 2], [0, 1.18, W / 2 - 0.1], 0.018, 0.018, 5), null, gal);                         // schoor
  for (const y of [0.4, 1.1]) B.box(0, y, -W / 2 - 0.05, 0.06, 0.05, 0.1, 0x3a3d40);                                 // scharnieren
  for (let i = 0; i < 4; i++) B.box(0.03, 0.88 - i * 0.04, W / 2 + 0.05, 0.02, 0.035, 0.02, 0x4a4e52);               // ketting
  return B.build();
}
