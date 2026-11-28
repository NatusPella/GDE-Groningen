// Straatdetail (28-11, #1353): de bouwers van de kleine props die wijken en dorpen levend maken: kliko's, fietsen, tuinhekjes,
// schuttingen, tuinpaden, plantenbakken, kabelkasten, afvalzuilen, verkeersborden, bermpalen en rietpollen. Geregistreerd in
// propregister.js en gebouwd via propmodels3d.js propGeometry(id); geplaatst door streetdetail.js (puur) en getekend door
// streetfurniture3d.js (één InstancedMesh per soort). Elke bouwer geeft een geometrie met vertexkleuren, oorsprong op de grond,
// +x als voorkant en de breedte (of lengte) langs z. Altijd zomer: bloeiende bakken, geen sneeuw of kale takken.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, composeMatrix, tubeGeometry } from './pixelart3d.js';

const IJZER = 0x2b2f2a, STAAL = 0x6b6e70, DONKER = 0x3a3d40, LICHT = 0xb9b6ae;

function shade(hex, f) {
  const r = ((hex >> 16) & 255) * f, g = ((hex >> 8) & 255) * f, b = (hex & 255) * f;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

// Rolcontainer van 240 l: romp die naar onderen smaller wordt (twee trappen), deksel met achterscharnier en greep, twee wielen
// op een as, greeprand achter, een wit etiket en een groef vooraan. Kleur: romp en deksel.
function kliko(romp, deksel) {
  const B = new GeoBuilder(1);
  B.box(0, 0.4, 0, 0.66, 0.6, 0.52, romp);                                  // onderste romp
  B.box(0, 0.78, 0, 0.72, 0.36, 0.58, romp);                                // bovenste romp, iets breder
  B.box(0, 0.975, 0, 0.76, 0.05, 0.6, shade(romp, 0.9));                    // opstaande rand onder het deksel
  B.box(0, 1.025, 0, 0.78, 0.05, 0.62, deksel);                             // deksel
  B.box(0.34, 1.0, 0, 0.05, 0.035, 0.34, shade(deksel, 0.8));               // greep vooraan het deksel
  B.box(-0.37, 1.02, 0, 0.05, 0.05, 0.5, shade(deksel, 0.85));              // scharnierbalk
  B.box(0.362, 0.55, 0, 0.012, 0.18, 0.2, 0xe9e6dc);                         // etiket vooraan
  B.box(0.364, 0.55, 0, 0.012, 0.03, 0.14, 0x4a4e52);                        // tekstregel op het etiket
  B.box(0.352, 0.3, 0, 0.012, 0.03, 0.4, shade(romp, 0.82));                // groef
  B.box(-0.36, 0.78, 0, 0.04, 0.06, 0.4, shade(romp, 0.8));                 // greeprand achter
  for (const s of [-1, 1]) {
    B.geo(new THREE.CylinderGeometry(0.085, 0.085, 0.05, 8), composeMatrix(-0.26, 0.085, s * 0.28, Math.PI / 2, 0, 0), IJZER); // wiel
    B.geo(new THREE.CylinderGeometry(0.035, 0.035, 0.052, 6), composeMatrix(-0.26, 0.085, s * 0.28, Math.PI / 2, 0, 0), LICHT); // naaf
  }
  B.box(-0.26, 0.085, 0, 0.03, 0.03, 0.56, IJZER);                          // as
  return B.build();
}

// Stadsfiets (omafiets): twee wielen met band, velg, naaf en spaken, een laag frame, voor- en achterspatbord, zadel op een
// zadelpen, stuur met handvatten en een lamp, jasbeschermer, trapper, bagagedrager, achterlicht en een standaard; optioneel een
// mand voorop. Voorkant +x, wielen in het x-y-vlak.
function fiets(frame, mand) {
  const B = new GeoBuilder(1);
  const R = 0.34, bw = 0.55;
  for (const x of [bw, -bw]) {
    B.geo(new THREE.TorusGeometry(R - 0.02, 0.022, 4, 14), composeMatrix(x, R, 0), 0x1d1e1f);                // band
    B.geo(new THREE.TorusGeometry(R - 0.05, 0.008, 3, 14), composeMatrix(x, R, 0), 0xb4b7ba);                // velg
    B.geo(new THREE.CylinderGeometry(0.03, 0.03, 0.09, 6), composeMatrix(x, R, 0, Math.PI / 2, 0, 0), STAAL); // naaf
    for (let k = 0; k < 3; k++) B.box(x, R, 0, 0.006, 2 * (R - 0.05), 0.006, 0xaeb1b4, 0, 0, 0, (k * Math.PI) / 3); // spaken
  }
  const f = frame, f2 = shade(frame, 0.8);
  B.geo(tubeGeometry([-bw, R, 0], [0, 0.3, 0], 0.014), null, f);                 // achtervork naar de trapas
  B.geo(tubeGeometry([0, 0.3, 0], [-0.2, 0.86, 0], 0.016), null, f);             // zadelbuis
  B.geo(tubeGeometry([-0.2, 0.84, 0], [0.34, 0.9, 0], 0.014), null, f);          // bovenbuis
  B.geo(tubeGeometry([0, 0.3, 0], [0.34, 0.9, 0], 0.014), null, f);              // onderbuis
  B.geo(tubeGeometry([0.34, 0.9, 0], [bw, R, 0], 0.014), null, f);               // voorvork
  B.geo(tubeGeometry([0.34, 0.9, 0], [0.38, 1.0, 0], 0.016), null, f2);          // stuurpen
  B.box(0.38, 1.02, 0, 0.04, 0.03, 0.56, IJZER);                                 // stuur
  for (const s of [-1, 1]) B.box(0.38, 1.0, s * 0.3, 0.1, 0.035, 0.035, 0x1d1e1f); // handvatten
  B.box(-0.2, 0.9, 0, 0.26, 0.06, 0.16, 0x2a2a2c);                               // zadel
  B.geo(tubeGeometry([-0.2, 0.84, 0], [-0.2, 0.9, 0], 0.012), null, STAAL);      // zadelpen
  B.box(bw, R + 0.2, 0, 0.5, 0.012, 0.09, f2);                                    // voorspatbord
  B.box(-bw, R + 0.2, 0, 0.5, 0.012, 0.09, f2);                                   // achterspatbord
  B.box(-0.15, 0.4, 0.04, 0.5, 0.2, 0.012, f2);                                   // jasbeschermer
  B.box(0.0, 0.3, 0.06, 0.2, 0.03, 0.02, STAAL);                                  // trapper
  B.geo(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 6), composeMatrix(0.46, 1.0, 0, 0, 0, Math.PI / 2), 0xf1dc7a); // koplamp
  B.box(-0.9, 0.55, 0.0, 0.04, 0.035, 0.05, 0xc43a2c);                            // achterlicht
  B.box(-0.7, 0.62, 0, 0.3, 0.025, 0.2, DONKER);                                  // bagagedrager
  if (mand) { // een rieten mand voorop met een rand
    B.box(0.5, 1.14, 0, 0.3, 0.22, 0.34, 0xb08a52);
    B.box(0.5, 1.26, 0, 0.32, 0.03, 0.36, 0x8a6a3c);
  }
  B.box(-0.1, 0.06, 0.12, 0.04, 0.12, 0.02, STAAL);                               // standaard
  return B.build();
}

// Houten lattenhekje (2 m, lengte langs z): twaalf spitse latten met een eigen tint, twee regels en twee palen met een kopje.
function lattenhek() {
  const B = new GeoBuilder(1);
  const wit = [0xe8e4d6, 0xdcd8ca, 0xece8da, 0xe2ded0];
  for (let i = 0; i < 12; i++) {
    const z = -0.95 + i * 0.173;
    B.box(0, 0.42, z, 0.025, 0.78, 0.085, wit[i % 4]);
    B.geo(new THREE.ConeGeometry(0.0425, 0.07, 4), composeMatrix(0, 0.815, z, 0, Math.PI / 4, 0), wit[(i + 1) % 4]); // spits
  }
  B.box(-0.025, 0.3, 0, 0.03, 0.05, 2, 0xcfcabb);                  // onderregel achter
  B.box(-0.025, 0.65, 0, 0.03, 0.05, 2, 0xcfcabb);                 // bovenregel achter
  for (const z of [-1, 1]) {
    B.box(0, 0.45, z * 0.99, 0.07, 0.9, 0.07, 0xd6d1c2);           // paal
    B.box(0, 0.92, z * 0.99, 0.09, 0.03, 0.09, 0xece8da);          // kopje
  }
  B.box(0, 0.01, 0, 0.03, 0.02, 2, 0x6f6a58);                      // grondstrook
  return B.build();
}

// Houten schutting (2 m, lengte langs z): betonnen onderplaat, zeven liggende planken in vijf tinten tussen betonpalen met een
// kap en een afdeklijst.
function schutting() {
  const B = new GeoBuilder(1);
  const hout = [0x86603a, 0x7b5733, 0x926a42, 0x7a5532, 0x8c6640];
  B.box(0, 0.13, 0, 0.05, 0.26, 1.98, 0x9a9b97);                       // betonnen onderplaat
  for (let i = 0; i < 7; i++) B.box(0.005, 0.3 + i * 0.205, 0, 0.035, 0.195, 1.9, hout[i % 5]); // planken
  B.box(0, 1.77, 0, 0.07, 0.04, 2, 0x6a4a2c);                          // afdeklijst
  for (const z of [-1, 1]) {
    B.box(0, 0.9, z * 0.995, 0.09, 1.8, 0.09, 0x8f908c);               // betonpaal
    B.geo(new THREE.ConeGeometry(0.075, 0.06, 4), composeMatrix(0, 1.83, z * 0.995, 0, Math.PI / 4, 0), 0xa3a49f); // kap
  }
  return B.build();
}

// Tuinpad (1 m lang langs z, 0,9 m breed): vier rijen van drie grijze betontegels met voegen en een tintverschil per tegel;
// ligt 0,03 m boven de grond.
function tuinpad() {
  const B = new GeoBuilder(1);
  B.box(0, 0.01, 0, 0.9, 0.02, 1, 0x6e6c63);                            // voegbed
  const tint = [0xa9a69b, 0xb4b1a6, 0x9d9a90, 0xaeaaa0, 0xbab7ac];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    B.box(-0.3 + c * 0.3, 0.025, -0.375 + r * 0.25, 0.27, 0.02, 0.23, tint[(r * 3 + c * 2) % 5]);
  }
  return B.build();
}

// Plantenbak (1,0 m): houten bak met hoekstijlen en een afdeklijst, aarde, drie heesters in groentinten en bloeiende toppen in
// rood, geel, wit en roze (zomer).
function plantenbak() {
  const B = new GeoBuilder(1);
  const hout = 0x7d5a3a, hout2 = 0x8c6842;
  B.box(0, 0.22, 0, 0.42, 0.44, 1.0, hout);
  for (const z of [-0.47, 0.47]) B.box(0, 0.22, z, 0.46, 0.46, 0.06, hout2);                // hoekstijlen
  B.box(0, 0.45, 0, 0.5, 0.03, 1.06, 0x9a7650);                                              // afdeklijst
  B.box(0, 0.44, 0, 0.36, 0.02, 0.92, 0x3b2c20);                                             // aarde
  const groen = [0x3f7a35, 0x4f8a3c, 0x356b2e], bloem = [0xd2452f, 0xe7c630, 0xf1efe6, 0xc24a8f];
  for (let i = 0; i < 3; i++) {
    const z = -0.32 + i * 0.32;
    B.geo(new THREE.IcosahedronGeometry(0.17, 0), composeMatrix(0, 0.62, z), groen[i]);
    B.geo(new THREE.IcosahedronGeometry(0.1, 0), composeMatrix(0.08, 0.76 + (i % 2) * 0.04, z + 0.05), groen[(i + 1) % 3]);
    for (let k = 0; k < 3; k++) B.geo(new THREE.IcosahedronGeometry(0.04, 0), composeMatrix(0.06 - k * 0.07, 0.8 + k * 0.02, z + (k - 1) * 0.08), bloem[(i + k) % 4]);
  }
  return B.build();
}

// Kabelkast (distributiekast): grijsgroene kast op een betonnen sokkel met twee deuren met ventilatiesleuven, een slotkastje en
// een geel waarschuwingsplaatje.
function kabelkast() {
  const B = new GeoBuilder(1);
  B.box(0, 0.06, 0, 0.36, 0.12, 0.8, 0x8d8e89);                                   // sokkel
  B.box(0, 0.7, 0, 0.3, 1.16, 0.74, 0x7e8f84);                                    // kast
  B.box(0, 1.3, 0, 0.34, 0.04, 0.78, 0x6b7a70);                                   // dak met overstek
  B.box(0.153, 0.72, -0.19, 0.012, 1.0, 0.34, 0x879a8e);                          // deur links
  B.box(0.153, 0.72, 0.19, 0.012, 1.0, 0.34, 0x879a8e);                           // deur rechts
  B.box(0.16, 0.72, 0, 0.012, 1.0, 0.012, 0x4f5a53);                              // deurnaad
  for (let i = 0; i < 5; i++) B.box(0.16, 1.1 - i * 0.03, -0.19, 0.012, 0.012, 0.26, 0x4f5a53); // ventilatiesleuven
  B.box(0.162, 0.7, 0.04, 0.014, 0.08, 0.04, 0xb9b6ae);                           // slotkastje
  B.box(0.158, 0.4, 0.2, 0.012, 0.1, 0.1, 0xe6c43a);                              // waarschuwingsplaatje
  return B.build();
}

// Afvalzuil (ondergrondse container, bovenste deel): drie zuilen op een dekplaat (restafval grijs, papier blauw, glas groen),
// elk met een kap, een inworpklep met greep en een pictogramvlak.
function afvalzuil() {
  const B = new GeoBuilder(1);
  B.box(0, 0.015, 0, 0.9, 0.03, 1.95, 0x77786f);                                  // dekplaat
  const kleur = [[0x7c8085, 0x5a5e62], [0x2f5f9e, 0x254a7c], [0x3f7d4a, 0x2f6038]];
  kleur.forEach(([k, d], i) => {
    const z = (i - 1) * 0.62;
    B.geo(new THREE.CylinderGeometry(0.26, 0.28, 1.0, 10), composeMatrix(0, 0.55, z), k);   // zuil
    B.geo(new THREE.CylinderGeometry(0.29, 0.26, 0.08, 10), composeMatrix(0, 1.09, z), d);  // kap
    B.box(0.22, 0.88, z, 0.07, 0.2, 0.3, 0x1a1c1d);                                          // inworpklep
    B.box(0.235, 0.88, z, 0.03, 0.05, 0.2, 0x9a9d9f);                                        // greep
    B.box(0.26, 0.5, z, 0.014, 0.22, 0.22, 0xe9e6dc);                                        // pictogramvlak
    B.box(0.268, 0.5, z, 0.012, 0.1, 0.1, d);
  });
  return B.build();
}

// Verkeersbord met ronde schijf (zone 30): stalen paal met kap, rode rand, witte schijf, het getal 30 in zeven segmenten, een
// beugel en een grijze achterkant. Voorkant +x.
function bord30() {
  const B = new GeoBuilder(1);
  B.geo(tubeGeometry([0, 0, 0], [0, 2.4, 0], 0.03, 0.03, 6), null, 0x8a8f92);
  B.geo(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 6), composeMatrix(0, 2.41, 0), 0x6b6e70);
  B.geo(new THREE.CylinderGeometry(0.3, 0.3, 0.025, 20), composeMatrix(0.03, 2.1, 0, 0, 0, Math.PI / 2), 0xc4282d);   // rode rand
  B.geo(new THREE.CylinderGeometry(0.235, 0.235, 0.028, 20), composeMatrix(0.034, 2.1, 0, 0, 0, Math.PI / 2), 0xf4f4f0); // witte schijf
  const seg = (z, y, w, h) => B.box(0.05, y, z, 0.012, h, w, 0x1d1e1f);
  for (const [zo, drie] of [[-0.085, true], [0.085, false]]) { // het cijfer 3 en het cijfer 0 in zeven segmenten
    seg(zo, 2.1 + 0.125, 0.12, 0.025);
    seg(zo, 2.1 - 0.125, 0.12, 0.025);
    seg(zo + 0.06, 2.1 + 0.06, 0.025, 0.12);
    seg(zo + 0.06, 2.1 - 0.06, 0.025, 0.12);
    if (drie) seg(zo, 2.1, 0.1, 0.025); else { seg(zo - 0.06, 2.1 + 0.06, 0.025, 0.12); seg(zo - 0.06, 2.1 - 0.06, 0.025, 0.12); }
  }
  B.box(-0.005, 2.1, 0, 0.012, 0.6, 0.6, 0x9a9da0);          // achterkant
  B.box(-0.03, 2.1, 0, 0.03, 0.05, 0.08, 0x6b6e70);          // beugel
  return B.build();
}

// Voorrangsbord (gele ruit met witte en zwarte rand) op een paal, met beugel en kap.
function voorrangsbord() {
  const B = new GeoBuilder(1);
  B.geo(tubeGeometry([0, 0, 0], [0, 2.3, 0], 0.03, 0.03, 6), null, 0x8a8f92);
  B.geo(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 6), composeMatrix(0, 2.31, 0), 0x6b6e70);
  const d = Math.PI / 4;
  B.box(-0.005, 1.95, 0, 0.012, 0.66, 0.66, 0x9a9da0, 0, 0, 0, d);   // achterkant
  B.box(0.03, 1.95, 0, 0.012, 0.66, 0.66, 0xf4f4f0, 0, 0, 0, d);     // witte rand
  B.box(0.038, 1.95, 0, 0.012, 0.6, 0.6, 0x1d1e1f, 0, 0, 0, d);      // zwarte lijn
  B.box(0.046, 1.95, 0, 0.012, 0.55, 0.55, 0xf4f4f0, 0, 0, 0, d);    // wit
  B.box(0.054, 1.95, 0, 0.012, 0.47, 0.47, 0xf2c21b, 0, 0, 0, d);    // geel
  B.box(-0.03, 1.95, 0, 0.03, 0.05, 0.08, 0x6b6e70);                 // beugel
  return B.build();
}

// Bermpaal: witte kunststof paal met een afgeschuinde kop, rode reflectoren aan beide kanten en een zwarte voetstrook.
function bermpaal() {
  const B = new GeoBuilder(1);
  B.box(0, 0.5, 0, 0.1, 1.0, 0.16, 0xeeeee8);
  B.box(0, 0.08, 0, 0.105, 0.16, 0.165, 0x2a2b2c);                        // voetstrook
  B.geo(new THREE.ConeGeometry(0.09, 0.08, 4), composeMatrix(0, 1.04, 0, 0, Math.PI / 4, 0), 0xe4e4de);
  B.box(0.052, 0.82, 0, 0.012, 0.12, 0.1, 0xc4282d);                      // rode reflector
  B.box(0.052, 0.62, 0, 0.012, 0.08, 0.1, 0x2a2b2c);                      // zwarte band
  B.box(-0.052, 0.82, 0, 0.012, 0.12, 0.1, 0xc4282d);
  return B.build();
}

// Rietpol: een kluit van negen spitse bladeren in drie groentinten met drie pluimen en een grondkluit; staat aan de slootkant.
function rietpol() {
  const B = new GeoBuilder(1);
  const tint = [0x7f9a4c, 0x6e8a40, 0x93a65a, 0x5f7a38];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + i * 0.7, r = 0.12 + (i % 3) * 0.07, h = 1.1 + (i % 4) * 0.28;
    B.geo(new THREE.ConeGeometry(0.035, h, 4, 1, true), composeMatrix(Math.cos(a) * r, h / 2, Math.sin(a) * r, Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12), tint[i % 4]);
    if (i % 3 === 0) B.geo(new THREE.ConeGeometry(0.05, 0.28, 5), composeMatrix(Math.cos(a) * (r + 0.02), h - 0.05, Math.sin(a) * (r + 0.02), Math.sin(a) * 0.14, 0, -Math.cos(a) * 0.14), 0x8a7a52); // pluim
  }
  B.geo(new THREE.CylinderGeometry(0.28, 0.32, 0.08, 7), composeMatrix(0, 0.04, 0), 0x56503a);   // grondkluit
  return B.build();
}

export const STREETDETAIL_MAKERS = {
  klikogrijs: () => kliko(0x6f7378, 0x585c61),
  klikogroen: () => kliko(0x3f6a3a, 0x2f5230),
  klikoblauw: () => kliko(0x2f5f9e, 0x254a7c),
  fietszwart: () => fiets(0x25282b, true),
  fietsrood: () => fiets(0x9c2f27, false),
  fietsblauw: () => fiets(0x2c4f7c, false),
  lattenhek, schutting, tuinpad, plantenbak, kabelkast, afvalzuil, bord30, voorrangsbord, bermpaal, rietpol,
};
