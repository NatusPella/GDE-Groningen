// De gedeelde bouwers van het straatmeubilair (register: propregister.js): één geometrie per soort, gebruikt door de
// wereld (cityprops.js voor de stad, streetfurniture3d.js voor het buitengebied) en door de cutscenes (storyprops.js).
// Elke bouwer geeft een BufferGeometry met vertexkleuren (GeoBuilder), oorsprong op de grond, +x als voorkant en de
// breedte langs z, zoals cityprops.js al rekent. De geometrie is klein genoeg om per cel samen te voegen en te instancen
// (zie de driehoekennorm in het register). Alles is laag-poly met echt detail: latten, gietijzer, kragen, banden, schroeven.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, composeMatrix, tubeGeometry, markShared } from './pixelart3d.js';
import { melkbus, busdeksel, carbidbok, carbidspul, lontstok, gehoorkap, koffietafel, hooibaal, weidehek } from './carbidprops3d.js'; // carbidveld (24-11)
import { kophalsromp, werktuigloods, balenwagen } from './erfgebouwen3d.js'; // het Groningse erf (24-11)

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

// Een autostoel (kijkt naar +x, oorsprong op de vloer): rails, zitting met zijwangen die iets naar achteren zakt, een schuine
// rugleuning met zijwangen, een hoofdsteun op twee stangetjes. Voor het interieur achter een open deur (models3d_vehicles.js).
function autostoel() {
  const B = new GeoBuilder(1);
  const STOF = 0x4a4f5a, WANG = 0x3c414b, NAAD = 0x2a2d33, STAAL = 0x6b6e70;
  for (const z of [-0.15, 0.15]) B.box(0.02, 0.02, z, 0.46, 0.03, 0.04, STAAL);                       // rails
  B.box(0.02, 0.07, 0, 0.42, 0.06, 0.38, NAAD);                                                         // onderstel
  B.box(0.04, 0.14, 0, 0.44, 0.08, 0.36, STOF, 0, 0, 0, -0.06);                                         // zitting, achter iets lager
  for (const z of [-0.205, 0.205]) B.box(0.04, 0.17, z, 0.46, 0.1, 0.07, WANG, 0, 0, 0, -0.06);       // zijwangen van de zitting (iets langer: geen gedeeld voorvlak)
  B.box(0.04, 0.185, 0, 0.36, 0.008, 0.012, NAAD);                                                      // naad in de zitting
  B.box(-0.2, 0.44, 0, 0.09, 0.52, 0.38, STOF, 0, 0, 0, 0.22);                                          // rugleuning, schuin naar achteren
  for (const z of [-0.205, 0.205]) B.box(-0.18, 0.42, z, 0.12, 0.48, 0.07, WANG, 0, 0, 0, 0.22);      // zijwangen van de rug
  for (const z of [-0.07, 0.07]) B.box(-0.29, 0.73, z, 0.015, 0.09, 0.015, STAAL, 0, 0, 0, 0.22);     // stangen van de hoofdsteun
  B.box(-0.31, 0.81, 0, 0.08, 0.12, 0.26, STOF, 0, 0, 0, 0.22);                                         // hoofdsteun
  return B.build();
}
// Het dashboard (de voorkant naar +x, de bestuurder links, -z): een lange bovenkant met een kap boven de meters, het metercluster,
// ventilatieroosters, een middenconsole met radio en pook, en het stuur op een kolom. Breedte 1,4 m; schaal in z naar de romp.
function dashboard() {
  const B = new GeoBuilder(1);
  const DASH = 0x2b2d32, ZACHT = 0x3a3d44, METER = 0x1a3a44, ROOSTER = 0x121315, STUUR = 0x1e1f22, RING = 0x9aa0a6;
  B.box(0, 0, 0, 0.32, 0.2, 1.4, DASH);                                                                 // body
  B.box(0.04, 0.12, 0, 0.36, 0.04, 1.42, ZACHT, 0, 0, 0, -0.12);                                        // bovenkant, aflopend naar de ruit
  B.box(-0.1, 0.12, -0.34, 0.14, 0.09, 0.4, ZACHT);                                                     // kap boven de meters
  for (const z of [-0.43, -0.25]) {
    B.geo(new THREE.CylinderGeometry(0.065, 0.065, 0.008, 12).rotateZ(Math.PI / 2), composeMatrix(-0.161, 0.05, z), RING);
    B.geo(new THREE.CylinderGeometry(0.055, 0.055, 0.01, 12).rotateZ(Math.PI / 2), composeMatrix(-0.164, 0.05, z), METER);
  }
  for (const z of [-0.62, -0.05, 0.05, 0.62]) B.box(-0.162, 0.03, z, 0.01, 0.06, 0.12, ROOSTER);       // roosters
  B.box(-0.12, -0.18, 0, 0.3, 0.28, 0.22, DASH);                                                        // middenconsole
  B.box(-0.17, -0.08, 0, 0.012, 0.07, 0.16, METER);                                                     // radio
  B.geo(new THREE.CylinderGeometry(0.018, 0.022, 0.16, 6), composeMatrix(-0.3, -0.26, 0, 0, 0, 0.5), STUUR); // pook
  // stuur op een kolom, schuin naar de bestuurder
  B.geo(new THREE.CylinderGeometry(0.03, 0.035, 0.32, 6).rotateZ(Math.PI / 2 + 0.45), composeMatrix(-0.26, -0.02, -0.34), STUUR);
  B.geo(new THREE.TorusGeometry(0.17, 0.018, 5, 14).rotateY(Math.PI / 2).rotateZ(0.45), composeMatrix(-0.4, -0.08, -0.34), STUUR);
  B.box(-0.4, -0.08, -0.34, 0.03, 0.05, 0.3, STUUR, 0, 0, 0, 0.45);                                     // spaak
  B.geo(new THREE.CylinderGeometry(0.045, 0.045, 0.056, 8).rotateZ(Math.PI / 2 + 0.45), composeMatrix(-0.39, -0.08, -0.34), ZACHT); // naaf
  return B.build().translate(0, 0.34, 0); // oorsprong onder de middenconsole (de bovenkant zit dan op 0,46 m)
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

// --- De haven van M13 (#1328): een loskade met echte onderdelen in plaats van kale dozen en cilinders ------------------------------

// Een zeecontainer: +x is de deurkant, de lengte langs x en de breedte langs z. De romp staat lichtgrijs in de vertexkleur: de kleur van
// de (verzonnen) rederij komt van het materiaal (vertexkleur maal materiaalkleur), zodat een kleur geen eigen geometrie kost.
function zeecontainer(L) {
  const B = new GeoBuilder(1);
  // #1328: een lichte romp en duidelijk donkerdere ribben, zodat de golfplaat ook in de schaduw als ribbels leest (de lak komt van
  // het materiaal van de aanroeper en vermenigvuldigt dit)
  const W = 2.44, H = 2.59, body = 0xf0f0f0, rib = 0xb4b4b4, frame = 0x8c8c8c, dark = 0x3a3a3a, steel = 0xcfd1cf;
  B.box(0, H / 2, 0, L - 0.16, H - 0.2, W - 0.1, body);                                          // de romp
  // golfplaat op de lange zijden: om de 28 cm een uitstekende rib
  const n = Math.floor((L - 0.5) / 0.28);
  for (let i = 0; i < n; i++) {
    const x = -L / 2 + 0.32 + i * 0.28;
    for (const s of [-1, 1]) B.box(x, H / 2, s * (W / 2 - 0.035), 0.13, H - 0.34, 0.03, rib);
  }
  // het dak met lichte dwarsdeuken, de kopse kant met vijf ribben
  for (let x = -L / 2 + 0.5; x < L / 2 - 0.3; x += 0.9) B.box(x, H - 0.085, 0, 0.3, 0.02, W - 0.2, rib);
  for (let k = 0; k < 5; k++) B.box(-L / 2 + 0.06, H / 2, -0.9 + k * 0.45, 0.03, H - 0.34, 0.16, rib);
  // het frame: hoekstijlen, boven- en onderregels, en de acht hoekstukken waar de kraan hem pakt
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box(sx * (L / 2 - 0.08), H / 2, sz * (W / 2 - 0.08), 0.16, H, 0.16, frame);
  for (const y of [0.08, H - 0.08]) {
    for (const sz of [-1, 1]) B.box(0, y, sz * (W / 2 - 0.06), L - 0.3, 0.16, 0.12, frame);
    for (const sx of [-1, 1]) B.box(sx * (L / 2 - 0.06), y, 0, 0.12, 0.16, W - 0.3, frame);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const y of [0.095, H - 0.095]) B.box(sx * (L / 2 - 0.095), y, sz * (W / 2 - 0.095), 0.19, 0.19, 0.19, dark);
  // de deuren: twee vleugels met een naad, scharnieren, vier sluitstangen met hendels en een typeplaatje
  for (const sz of [-1, 1]) B.box(L / 2 - 0.02, H / 2, sz * (W / 4 - 0.01), 0.04, H - 0.32, W / 2 - 0.08, rib);
  B.box(L / 2 + 0.002, H / 2, 0, 0.02, H - 0.32, 0.03, dark);
  for (const sz of [-1, 1]) for (const y of [0.45, 1.05, 1.65, 2.2]) B.box(L / 2 + 0.01, y, sz * (W / 2 - 0.13), 0.05, 0.09, 0.06, dark);
  for (const z of [-0.95, -0.35, 0.35, 0.95]) {
    B.box(L / 2 + 0.03, H / 2, z, 0.035, H - 0.3, 0.035, steel);                                 // sluitstang
    B.box(L / 2 + 0.06, 1.15, z + (z < 0 ? 0.1 : -0.1), 0.03, 0.05, 0.22, steel);                // hendel
    for (const y of [0.2, H - 0.2]) B.box(L / 2 + 0.03, y, z, 0.06, 0.08, 0.07, dark);           // nokhouder
  }
  B.box(L / 2 + 0.005, 1.75, -0.6, 0.01, 0.12, 0.22, 0xe8e2c8);                                  // typeplaatje
  // vorkgaten onderin bij een korte container (een lege rijdt op een heftruck)
  if (L < 8) for (const x of [-1.05, 1.05]) for (const sz of [-1, 1]) B.box(x, 0.1, sz * (W / 2 - 0.02), 0.36, 0.1, 0.04, dark);
  return B.build();
}

// De havenkraan (de kraankooi van M13): een portaal op vier poten, een draaibare bovenbouw met machinehuis, contragewicht en cabine,
// een bok en een vakwerkgiek langs +x met een haakblok aan de kabel. Geel gelakt staal met donkere details; oorsprong midden tussen de poten.
function havenkraan() {
  const B = new GeoBuilder(1);
  const geel = 0xe2bb2e, geelD = 0xb8941f, staal = 0x4a4d4f, glas = 0x2b3b4a, rood = 0xb53a2a, wit = 0xe8e6e0;
  const P = 1.6, top = 6.0;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    B.box(sx * P, top / 2, sz * P, 0.34, top, 0.34, geel);                                         // poot
    B.box(sx * P, 0.12, sz * P, 0.7, 0.24, 0.7, staal);                                            // voet met railwielkast
  }
  for (const s of [-1, 1]) {
    B.box(0, top - 0.25, s * P, 2 * P + 0.34, 0.5, 0.3, geel);                                    // portaalbalken
    B.box(s * P, top - 0.25, 0, 0.3, 0.5, 2 * P + 0.34, geel);
    B.geo(tubeGeometry([-P, 0.5, s * P], [P, top - 0.6, s * P], 0.07), null, geelD);                // schoren
    B.geo(tubeGeometry([s * P, 0.5, -P], [s * P, top - 0.6, P], 0.07), null, geelD);
  }
  B.geo(new THREE.CylinderGeometry(1.5, 1.6, 0.4, 16), composeMatrix(0, top + 0.2, 0), staal);       // draaikrans
  B.box(-0.6, top + 1.45, 0, 3.6, 2.1, 2.6, geel);                                                 // machinehuis
  B.box(-0.6, top + 2.55, 0, 3.7, 0.12, 2.7, geelD);                                               // dakrand
  for (const x of [-1.6, -0.9, -0.2]) for (const s of [-1, 1]) B.box(x, top + 1.6, s * 1.31, 0.45, 0.5, 0.02, staal); // roosters in de zijwanden
  B.box(-2.75, top + 1.0, 0, 0.9, 1.6, 2.4, 0x5c5f60);                                             // contragewicht
  for (const y of [0.6, 1.0, 1.4]) B.box(-3.21, top + y, 0, 0.02, 0.08, 2.3, wit);                // waarschuwingsstrepen
  // de cabine vooraan, met ramen rondom (donker glas) en een loopbordes
  B.box(1.5, top + 1.25, 1.0, 1.5, 1.7, 1.2, geel);
  B.box(2.26, top + 1.45, 1.0, 0.02, 0.9, 1.0, glas);
  B.box(1.5, top + 1.45, 1.61, 1.2, 0.9, 0.02, glas);
  B.box(1.5, top + 1.45, 0.39, 1.2, 0.9, 0.02, glas);
  B.box(1.6, top + 0.42, 1.0, 1.9, 0.06, 1.7, staal);                                              // bordes
  for (const z of [0.15, 1.85]) B.box(1.6, top + 0.95, z, 1.9, 0.04, 0.04, geel);                 // leuning
  // de bok: twee schuine benen naar de top, met de tuien naar de giekpunt en het contragewicht
  const bok = [-0.4, top + 6.2, 0];
  for (const sz of [-0.9, 0.9]) B.geo(tubeGeometry([0.6, top + 2.6, sz], bok, 0.12), null, geel);
  B.geo(tubeGeometry([-2.6, top + 2.0, 0], bok, 0.1), null, geelD);
  B.box(bok[0], bok[1], 0, 0.5, 0.4, 0.5, geelD);
  // de vakwerkgiek: vier gordingen van de voet tot de punt, met dwarsstaven en diagonalen
  const voet = 1.0, punt = 15.5, yv = top + 1.2, yp = top + 4.2;
  const at = (t, dy, dz) => [voet + (punt - voet) * t, yv + (yp - yv) * t + dy, dz];
  const h0 = 0.55, w0 = 0.5;
  for (const [dy, dz] of [[0, -w0], [0, w0], [h0, -w0 * 0.6], [h0, w0 * 0.6]]) B.geo(tubeGeometry(at(0, dy, dz), at(1, dy * 0.4, dz * 0.4), 0.06), null, geel);
  for (let i = 0; i <= 8; i++) {
    const t = i / 8, k = 1 - 0.6 * t;
    B.geo(tubeGeometry(at(t, 0, -w0 * k), at(t, 0, w0 * k), 0.035), null, geelD);
    B.geo(tubeGeometry(at(t, 0, (i % 2 ? -1 : 1) * w0 * k), at(t, h0 * k, 0), 0.035), null, geelD);
  }
  B.geo(tubeGeometry(bok, at(1, h0 * 0.4, 0), 0.03), null, staal);                                 // tui naar de punt
  B.box(punt + 0.1, yp, 0, 0.5, 0.45, 0.45, geelD);                                                // kop met schijven
  // de kabel en het haakblok, met een rode hijsbalk
  B.geo(tubeGeometry([punt + 0.1, yp - 0.2, 0], [punt + 0.1, 2.6, 0], 0.025), null, staal);
  B.box(punt + 0.1, 2.3, 0, 0.5, 0.6, 0.35, rood);
  B.geo(new THREE.TorusGeometry(0.16, 0.05, 4, 8, Math.PI * 1.4), composeMatrix(punt + 0.1, 1.8, 0, 0, 0, Math.PI * 0.8), staal);
  // de ladder langs een poot naar het portaal
  for (const dz of [-0.2, 0.2]) B.box(P + 0.3, top / 2, P + dz, 0.04, top, 0.04, staal);
  for (let y = 0.5; y < top; y += 0.35) B.box(P + 0.3, y, P, 0.03, 0.03, 0.4, staal);
  return B.build();
}

// Een havenhek: een paneel van 3,5 m gaas in een buizenframe op twee betonnen voeten, met een bordje. Breedte langs z.
function havenhek() {
  const B = new GeoBuilder(1);
  const L = 3.5, H = 2.0, buis = 0x8d9295, draad = 0x9fa5a8, beton = 0xb9b4a8, bord = 0xe8c93a;
  for (const z of [-L / 2 + 0.05, L / 2 - 0.05]) {
    B.box(0, 0.09, z, 0.62, 0.18, 0.22, beton);                                                    // betonvoet
    B.box(0, 0.19, z, 0.5, 0.02, 0.18, 0x9f9a8f);
  }
  B.geo(tubeGeometry([0, 0.2, -L / 2 + 0.05], [0, H, -L / 2 + 0.05], 0.022), null, buis);
  B.geo(tubeGeometry([0, 0.2, L / 2 - 0.05], [0, H, L / 2 - 0.05], 0.022), null, buis);
  B.geo(tubeGeometry([0, H, -L / 2 + 0.05], [0, H, L / 2 - 0.05], 0.022), null, buis);
  B.geo(tubeGeometry([0, 0.22, -L / 2 + 0.05], [0, 0.22, L / 2 - 0.05], 0.022), null, buis);
  // het gaas: dunne staanders en drie liggers
  for (let z = -L / 2 + 0.2; z < L / 2 - 0.1; z += 0.15) B.box(0, (H + 0.22) / 2, z, 0.008, H - 0.22, 0.008, draad);
  for (const y of [0.6, 1.1, 1.6]) B.box(0, y, 0, 0.008, 0.008, L - 0.1, draad);
  B.box(0.02, 1.35, 0.6, 0.01, 0.3, 0.45, bord);                                                   // bordje (verboden toegang, als pictogram)
  B.box(0.026, 1.35, 0.6, 0.004, 0.12, 0.12, 0x1f1f1f);
  return B.build();
}

// Een lichtmast: betonpoer, taps toelopende mast, een kop met vier schijnwerpers en een onderhoudsluikje.
function lichtmast() {
  const B = new GeoBuilder(1);
  const staal = 0x8a8f93, donker = 0x34383a;
  B.box(0, 0.25, 0, 0.9, 0.5, 0.9, 0xb5b0a4);                                                     // betonpoer
  B.box(0, 0.52, 0, 0.5, 0.04, 0.5, donker);                                                      // voetplaat met bouten
  for (const [x, z] of [[0.2, 0.2], [-0.2, 0.2], [0.2, -0.2], [-0.2, -0.2]]) B.box(x, 0.56, z, 0.05, 0.06, 0.05, 0x5a5e60);
  B.geo(new THREE.CylinderGeometry(0.09, 0.16, 9.6, 8), composeMatrix(0, 5.34, 0), staal);
  B.box(0.15, 1.4, 0, 0.02, 0.4, 0.12, donker);                                                   // luikje
  B.box(0, 10.2, 0, 1.4, 0.1, 0.5, staal);                                                         // kopbalk
  for (const x of [-0.5, -0.17, 0.17, 0.5]) {
    B.box(x, 10.0, 0.1, 0.3, 0.26, 0.22, donker, 0, -0.5, 0, 0);                                  // schijnwerper, schuin omlaag
    B.box(x, 9.93, 0.21, 0.26, 0.2, 0.02, 0xfff3cc, 0, -0.5, 0, 0);                               // de lens
  }
  return B.build();
}

// Een heftruck: chassis, contragewicht, stoel en stuur onder een veiligheidskooi, een hefmast met vorkbord en twee vorken langs +x.
function heftruck() {
  const B = new GeoBuilder(1);
  const oranje = 0xe07a1f, donker = 0x2c2e30, staal = 0x6d7174, band = 0x1c1c1c, stoel = 0x232323;
  B.box(0, 0.55, 0, 1.9, 0.6, 1.1, oranje);                                                        // chassis
  B.box(-0.95, 0.75, 0, 0.5, 0.95, 1.12, donker);                                                  // contragewicht
  B.box(-0.6, 1.0, 0, 0.6, 0.12, 1.0, oranje);                                                     // motorkap
  B.box(-0.45, 1.25, 0, 0.45, 0.12, 0.5, stoel); B.box(-0.68, 1.5, 0, 0.1, 0.5, 0.5, stoel);       // stoel
  B.geo(tubeGeometry([0.35, 0.95, 0], [0.2, 1.45, 0], 0.03), null, donker);                        // stuurkolom
  B.geo(new THREE.TorusGeometry(0.17, 0.025, 4, 12), composeMatrix(0.2, 1.47, 0, 0, 0, 1.2), donker); // stuur
  for (const [x, z] of [[0.55, 0.5], [0.55, -0.5], [-0.75, 0.5], [-0.75, -0.5]]) B.geo(tubeGeometry([x, 0.85, z], [x * 0.95, 2.15, z * 0.95], 0.035), null, donker); // kooi
  B.box(-0.1, 2.17, 0, 1.4, 0.05, 1.0, donker);
  for (let z = -0.35; z <= 0.36; z += 0.175) B.box(-0.1, 2.2, z, 1.35, 0.02, 0.03, staal);        // roosterdak
  for (const sz of [-1, 1]) {
    B.geo(new THREE.CylinderGeometry(0.3, 0.3, 0.24, 12), composeMatrix(0.55, 0.3, sz * 0.48, Math.PI / 2, 0, 0), band); // voorwielen
    B.geo(new THREE.CylinderGeometry(0.24, 0.24, 0.2, 12), composeMatrix(-0.7, 0.24, sz * 0.48, Math.PI / 2, 0, 0), band); // achterwielen
    B.geo(new THREE.CylinderGeometry(0.13, 0.13, 0.25, 8), composeMatrix(0.55, 0.3, sz * 0.49, Math.PI / 2, 0, 0), 0x9a9da0); // naven
    B.box(1.05, 1.25, sz * 0.32, 0.12, 2.5, 0.1, staal);                                           // mastprofielen
  }
  for (const y of [0.5, 1.5, 2.45]) B.box(1.05, y, 0, 0.1, 0.08, 0.74, staal);                    // dwarsregels van de mast
  B.box(1.14, 0.45, 0, 0.06, 0.5, 0.95, donker);                                                   // vorkbord
  for (const sz of [-1, 1]) {
    B.box(1.2, 0.45, sz * 0.3, 0.06, 0.5, 0.12, donker);                                           // vorkrug
    B.box(1.75, 0.22, sz * 0.3, 1.1, 0.05, 0.12, staal);                                           // vork
  }
  for (const sz of [-1, 1]) B.box(-1.2, 1.0, sz * 0.3, 0.04, 0.12, 0.12, 0xd93a2a);               // achterlichten
  B.box(0.55, 1.9, 0.48, 0.08, 0.1, 0.1, 0xfff3cc);                                                // werklamp
  return B.build();
}

// Een kabelhaspel aan de kade: twee houten flenzen met een stalen as en kabel op de kern; ligt op zijn rand, as langs z.
function kabelhaspel() {
  const B = new GeoBuilder(1);
  const hout = 0x8a6a44, houtD = 0x6e5236, kabel = 0x2a2a2a;
  const R = 1.2;
  for (const s of [-1, 1]) {
    B.geo(new THREE.CylinderGeometry(R, R, 0.1, 18), composeMatrix(0, R, s * 0.95, Math.PI / 2, 0, 0), hout);
    for (let k = 0; k < 6; k++) B.box(0, R, s * 1.005, 2 * R - 0.15, 0.06, 0.02, houtD, 0, 0, 0, (k / 6) * Math.PI); // planknaden
    B.geo(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 8), composeMatrix(0, R, s * 1.04, Math.PI / 2, 0, 0), 0x6d7174); // as-eind
  }
  B.geo(new THREE.CylinderGeometry(0.85, 0.85, 1.8, 16), composeMatrix(0, R, 0, Math.PI / 2, 0, 0), kabel); // opgerolde kabel
  for (let k = 0; k < 5; k++) B.geo(new THREE.TorusGeometry(0.86, 0.025, 3, 16), composeMatrix(0, R, -0.72 + k * 0.36), 0x3a3a3a); // windingen
  B.geo(tubeGeometry([0.6, R - 0.6, 0.5], [1.4, 0.03, 0.9], 0.04), null, kabel);                   // los einde naar de grond
  return B.build();
}

// Een bolder aan de kaderand: gietijzeren paal met kraag en kop op een voetplaat.
function bolder() {
  const B = new GeoBuilder(1);
  const ijzer = 0x2b2f2a, kop = 0x3d423c;
  B.box(0, 0.03, 0, 0.6, 0.06, 0.6, 0x55595e);
  for (const [x, z] of [[0.22, 0.22], [-0.22, 0.22], [0.22, -0.22], [-0.22, -0.22]]) B.box(x, 0.075, z, 0.06, 0.03, 0.06, 0x8a8d90);
  B.geo(new THREE.CylinderGeometry(0.18, 0.22, 0.5, 10), composeMatrix(0, 0.31, 0), ijzer);
  B.geo(new THREE.CylinderGeometry(0.26, 0.2, 0.1, 10), composeMatrix(0, 0.6, 0), kop);
  B.geo(new THREE.CylinderGeometry(0.24, 0.26, 0.06, 10), composeMatrix(0, 0.68, 0), kop);
  return B.build();
}

const MAKERS = { bank, afvalbak, fietsenrek: () => fietsenrek(4), bushokje, paaltje, autostoel, dashboard, vetvat, jerrycan, kraampje, ijscokar, gitaarkoffer, gitaar, tv, frituurpan, buisradio, boekenkast, droogrek, verhuisdozen, lijst, poster, laptop, melkbus, busdeksel, carbidbok, carbidspul, lontstok, gehoorkap, koffietafel, hooibaal, weidehek, kophalsromp, werktuigloods, balenwagen , container20: () => zeecontainer(6.06), container40: () => zeecontainer(12.19), havenkraan, havenhek, lichtmast, heftruck, kabelhaspel, bolder };
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
