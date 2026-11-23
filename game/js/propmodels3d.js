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

// Een stalen vat van 200 liter frituurvet (vettruck 23-11, M07): blauw gelakt, twee rolringen, een felsnaad boven en onder,
// een deksel met een grote en een kleine stop en een wit etiket. Het vet van M07 staat zo als echte verpakking in de scènes.
function vetvat(niveau = 0) {
  const B = new GeoBuilder(1);
  const blauw = 0x1f4f8f, rand = 0x173d70, staal = 0x9aa1a6;
  if (niveau > 0) {
    // LOD 1: romp, één rolring en het etiket; LOD 2: alleen de romp met zes zijden
    B.geo(new THREE.CylinderGeometry(0.28, 0.28, 0.9, niveau === 1 ? 10 : 6), composeMatrix(0, 0.45, 0), blauw);
    if (niveau === 1) {
      B.geo(new THREE.CylinderGeometry(0.295, 0.295, 0.04, 10, 1, true), composeMatrix(0, 0.45, 0), rand);
      B.box(0.275, 0.62, 0, 0.02, 0.2, 0.22, 0xeeebe2);
    }
    return B.build();
  }
  B.geo(new THREE.CylinderGeometry(0.28, 0.28, 0.84, 14), composeMatrix(0, 0.44, 0), blauw);
  for (const y of [0.3, 0.6]) B.geo(new THREE.CylinderGeometry(0.292, 0.292, 0.035, 14, 1, true), composeMatrix(0, y, 0), rand); // rolringen
  for (const y of [0.025, 0.875]) B.geo(new THREE.CylinderGeometry(0.29, 0.29, 0.05, 14, 1, true), composeMatrix(0, y, 0), rand); // felsnaad
  B.geo(new THREE.CylinderGeometry(0.255, 0.255, 0.012, 14), composeMatrix(0, 0.866, 0), rand);                    // verzonken deksel
  B.geo(new THREE.CylinderGeometry(0.04, 0.04, 0.025, 8), composeMatrix(0.15, 0.88, 0.05), staal);                  // grote stop
  B.geo(new THREE.CylinderGeometry(0.022, 0.022, 0.025, 8), composeMatrix(-0.16, 0.88, -0.06), staal);              // kleine stop
  B.box(0.272, 0.46, 0, 0.02, 0.2, 0.22, 0xeeebe2);                                                                // etiket
  B.box(0.283, 0.5, 0, 0.004, 0.05, 0.16, 0x1d4f9c);
  B.box(0.283, 0.42, 0, 0.004, 0.02, 0.16, 0xc8102e);
  return B.build();
}

// Een jerrycan frituurvet van 20 liter: crèmekleurige kunststof waar het gele vet doorheen schemert, verdiepte zijpanelen,
// een greep met drie gaten op twee pootjes, een schroefdop op de hoek en een etiket. De bus waarmee de snackbarhouders hun vet halen.
function jerrycan(niveau = 0) {
  const B = new GeoBuilder(1);
  const romp = 0xe9e1c4, vet = 0xd9b45a, donker = 0x3a3d40;
  if (niveau > 0) {
    // LOD 1: romp, het vet erin en de greep; LOD 2: één blok
    B.box(0, 0.23, 0, 0.17, 0.46, 0.33, romp);
    if (niveau === 1) { B.box(0, 0.13, 0, 0.176, 0.22, 0.3, vet); B.box(0, 0.49, 0.015, 0.045, 0.025, 0.24, romp); }
    return B.build();
  }
  B.box(0, 0.21, 0, 0.17, 0.4, 0.33, romp);
  B.box(0, 0.13, 0, 0.174, 0.22, 0.3, vet);                                                                        // het vet schemert door
  for (const s of [1, -1]) B.box(s * 0.091, 0.24, 0, 0.004, 0.26, 0.24, shade(romp));                             // verdiept paneel
  B.box(0, 0.42, 0.03, 0.15, 0.04, 0.27, romp);                                                                    // schouder
  for (const z of [-0.07, 0.1]) B.box(0, 0.46, z, 0.04, 0.05, 0.03, romp);                                         // pootjes van de greep
  B.box(0, 0.49, 0.015, 0.045, 0.025, 0.24, romp);                                                                 // greep
  B.geo(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 8), composeMatrix(0, 0.465, -0.13), 0x2f5d9e);                // schroefdop
  B.box(0.096, 0.2, 0, 0.004, 0.1, 0.14, 0xf4f2ec);                                                                // etiket
  B.box(0, 0.005, 0, 0.16, 0.01, 0.31, donker);                                                                    // voetrand
  return B.build();
}
function shade(hex, f = 0.88) {
  const r = ((hex >> 16) & 255) * f, g = ((hex >> 8) & 255) * f, b = (hex & 255) * f;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

const MAKERS = { bank, afvalbak, fietsenrek: () => fietsenrek(4), bushokje, paaltje, vetvat, jerrycan };
// de props met lichtere LOD-niveaus (de opgave staat in propregister.js PROP_REGISTER[id].lod)
const LOD_MAKERS = new Set(['vetvat', 'jerrycan']);
const cache = new Map();

// De gedeelde geometrie van een geregistreerde prop (een kopie per aanroep is niet nodig: de geometrie is gemarkeerd als gedeeld).
// niveau: het LOD-niveau (0 is het volle model); een prop zonder lichtere niveaus geeft altijd niveau 0.
export function propGeometry(id, niveau = 0) {
  const n = LOD_MAKERS.has(id) ? niveau : 0;
  const key = n ? id + '|' + n : id;
  let g = cache.get(key);
  if (!g) {
    const make = MAKERS[id];
    if (!make) throw new Error('onbekende prop: ' + id);
    g = markShared(n ? make(n) : make());
    cache.set(key, g);
  }
  return g;
}
export { fietsenrek as fietsenrekGeometry };
export const PROP_MODEL_IDS = Object.keys(MAKERS);
