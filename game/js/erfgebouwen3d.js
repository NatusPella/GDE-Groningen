// Gebouwen en wagens van een Gronings erf (24-11, na de carbidbeelden: "de grote rode schuur is een Amerikaanse gambrel-schuur").
// Geregistreerd in propregister.js en gebouwd via propmodels3d.js propGeometry(id): een kop-hals-rompboerderij zoals in het
// Groninger land (woonhuis van baksteen met donkere pannen en schoorstenen, een lage hals, een grote schuur met lage muren en een
// hoog rood pannendak met wolfseinden, groen-witte baanderdeuren en gietijzeren stalraampjes), een werktuigenloods met diepte
// achter de half open schuifdeur (band, werkbank, gereedschapsbord, jerrycans) en een balenwagen met een platte laadvloer.
// Oorsprong op de grond, +x is de voorkant.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, composeMatrix, tubeGeometry } from './pixelart3d.js';
import { gableRoofX, gableRoofZ, hipRoof } from './countrymodels.js';

const STEEN = 0x8c3b2b, STEEN_D = 0x5e271d, VOEG = 0xb8a89a, WIT = 0xece8de, GLAS = 0x1f2a30, PAN_D = 0x30363b, PAN_R = 0xa8502f, GROEN = 0x2f5a3a;

// Een raam in een gevel die naar +x (n = 1) of -x (n = -1) kijkt, of naar +z/-z (as 'z'): wit kozijn, donker glas, roeden, dorpel.
function raam(B, x, y, z, w, h, n = 1, as = 'x', roeden = true) {
  const d = 0.05 * n;
  const p = (a, b, c, sx, sy, sz, col) => (as === 'x' ? B.box(x + a, y + b, z + c, sx, sy, sz, col) : B.box(x + c, y + b, z + a, sz, sy, sx, col));
  p(d, 0, 0, 0.08, h + 0.16, w + 0.16, WIT);
  p(d * 2, 0, 0, 0.04, h, w, GLAS);
  if (roeden) { p(d * 2.6, 0, 0, 0.03, h, 0.05, WIT); p(d * 2.6, h * 0.12, 0, 0.03, 0.05, w, WIT); }
  p(d * 2.4, -h / 2 - 0.1, 0, 0.14, 0.06, w + 0.3, 0xd6d0c4);
}

// Kop-hals-romp, Gronings: lengte langs x (de kop aan +x, met de voorgevel naar de weg), breedte langs z.
export function kophalsromp() {
  const B = new GeoBuilder(1);
  // de kop: woonhuis van baksteen, anderhalve laag, zadeldak met de nok langs z, wit gootlijst, twee schoorstenen
  const K0 = 14, K1 = 23, KW = 6.2, KH = 5.2;
  B.box((K0 + K1) / 2, KH / 2, 0, K1 - K0, KH, KW * 2, STEEN);
  B.box((K0 + K1) / 2, 0.3, 0, K1 - K0 + 0.08, 0.6, KW * 2 + 0.08, STEEN_D);                        // plint
  B.box(K1 + 0.04, KH - 0.35, 0, 0.12, 0.08, KW * 2, VOEG);                                          // speklaag onder de goot
  gableRoofZ(B, K0, K1, KW, KH, 9.8, PAN_D, STEEN);
  for (const x of [K0 - 0.3, K1 + 0.3]) B.box(x, KH - 0.1, 0, 0.35, 0.28, KW * 2 + 0.9, WIT);        // gootlijsten
  for (const s of [-1, 1]) {
    B.box((K0 + K1) / 2, 9.9, s * (KW - 0.5), 0.7, 1.5, 0.8, 0x6e3a2c);                               // schoorstenen
    B.box((K0 + K1) / 2, 10.7, s * (KW - 0.5), 0.9, 0.12, 1.0, 0x3a3a38);
  }
  for (const z of [-4.4, -2.3, 2.3, 4.4]) raam(B, K1, 2.1, z, 1.1, 1.9);                             // voorgevel, beneden
  for (const z of [-2.3, 2.3]) raam(B, K1, 4.3, z, 0.9, 0.9);                                         // zolder (dakkapel-loos: in de gevel)
  B.box(K1 + 0.06, 1.25, 0, 0.12, 2.5, 1.2, GROEN);                                                   // voordeur
  B.box(K1 + 0.08, 2.75, 0, 0.1, 0.45, 1.2, GLAS);                                                    // bovenlicht
  B.box(K1 + 0.09, 2.75, 0, 0.12, 0.6, 1.4, WIT, 0, 0, 0, 0);
  B.box(K1 + 0.5, 0.1, 0, 0.9, 0.2, 1.8, 0x8a8680);                                                   // stoep
  for (const s of [-1, 1]) { raam(B, (K0 + K1) / 2, 2.1, s * KW, 1.1, 1.8, s, 'z'); raam(B, (K0 + K1) / 2, 6.6, s * KW, 0.8, 1.0, s, 'z'); }
  // de hals: lager, met een deur en een raam
  const H0 = 10, H1 = K0, HW = 3.6, HH = 3.2;
  B.box((H0 + H1) / 2, HH / 2, 0, H1 - H0, HH, HW * 2, STEEN);
  gableRoofX(B, H0, H1, HW, HH, 6.0, PAN_D, STEEN);
  B.box(12.6, 1.1, HW + 0.06, 1.0, 2.2, 0.12, GROEN);
  raam(B, 11, 1.8, HW, 0.9, 1.0, 1, 'z');
  // de romp: lage muren, hoog pannendak met wolfseinden, rode pannen in rijen, donkere nokvorsten
  const R0 = -24, R1 = H0, RW = 11.5, RH = 3.4, NOK = 14.5;
  B.box((R0 + R1) / 2, RH / 2, 0, R1 - R0, RH, RW * 2, STEEN);
  B.box((R0 + R1) / 2, 0.3, 0, R1 - R0 + 0.08, 0.6, RW * 2 + 0.08, STEEN_D);
  const pannen = (x, y) => (Math.floor(y * 1.6) % 2 ? PAN_R : 0x9a4729);
  const dak = new GeoBuilder(1);
  hipRoof(dak, R0, R1, RW, RH, NOK, 7.5, 0xffffff, 0, 0.7);
  B.geo(dak.build(), null, pannen);
  B.box((R0 + R1) / 2 , NOK + 0.08, 0, R1 - R0 - 15, 0.22, 0.4, PAN_D);                               // nokvorsten
  for (const s of [-1, 1]) B.box((R0 + R1) / 2, RH - 0.05, s * (RW + 0.75), R1 - R0 + 1.2, 0.16, 0.18, 0x3a3d40); // goten
  for (const x of [R0 + 0.4, R1 - 0.4]) B.box(x, NOK - 0.9, 0, 0.12, 0.9, 0.5, WIT);                  // uilenborden in de wolfseinden
  // baanderdeuren (groen met witte schoren) en een staldeur in de zijgevel, gietijzeren stalraampjes
  for (const [x, w] of [[-4, 4.4], [-15, 3.0]]) {
    B.box(x, 1.5, RW + 0.07, w, 3.0, 0.12, GROEN);
    B.box(x, 3.05, RW + 0.1, w + 0.3, 0.16, 0.14, WIT);
    for (const s of [-1, 1]) B.box(x + s * w / 4, 1.5, RW + 0.14, 0.12, 3.2, 0.04, WIT, 0, 0, 0, s * Math.atan2(w / 2, 3));
    B.box(x, 1.5, RW + 0.15, 0.08, 3.0, 0.04, WIT);
  }
  for (let x = R0 + 3; x < R1 - 2; x += 4) raam(B, x, 2.3, -RW, 0.9, 0.55, -1, 'z', false);
  for (const x of [5, -10, -20]) raam(B, x, 2.3, RW, 0.9, 0.55, 1, 'z', false);
  B.box(R0 - 0.06, 1.5, 0, 0.12, 3.0, 3.6, GROEN);                                                    // achterdeur in het wolfseind
  return B.build();
}

// De werktuigenloods: staal op een gemetselde voet, zadeldak met de nok langs x, de voorkant (+x) met een schuifdeur die half open
// staat. Binnen: een betonvloer, een lichte achterwand, een trekkerband tegen de wand, een werkbank met bankschroef, een
// gereedschapsbord met schop, riek en hark, jerrycans en een lamp onder de nok.
export function werktuigloods() {
  const B = new GeoBuilder(1);
  const D = 5, W = 7, H = 4.6, ST = 0x9aa49c, ST_D = 0x7d877f, BIN = 0xb9b3a6;
  B.box(-D, H / 2, 0, 0.2, H, W * 2, ST);                                                              // achterwand (buiten)
  B.box(-D + 0.12, H / 2, 0, 0.04, H - 0.4, W * 2 - 0.4, BIN);                                         // achterwand binnen, licht
  for (const s of [-1, 1]) { B.box(0, H / 2, s * W, D * 2, H, 0.2, ST); B.box(0, H / 2, s * (W - 0.12), D * 2 - 0.4, H - 0.4, 0.04, BIN); }
  for (const s of [-1, 1]) B.box(0, 0.35, s * (W + 0.02), D * 2 + 0.1, 0.7, 0.24, 0x8c3b2b);          // gemetselde voet
  // voorgevel met een opening van 7 bij 4 m en het geveldriehoek erboven
  for (const s of [-1, 1]) B.box(D, H / 2, s * 5.25, 0.2, H, 3.5, ST);
  B.box(D, H - 0.3, 0, 0.2, 0.6, 7, ST);
  for (let z = -6.6; z <= 6.6; z += 0.6) B.box(D + 0.11, H / 2, z, 0.04, H, 0.06, ST_D);              // golfplaatribben
  gableRoofX(B, -D, D, W, H, 7.2, 0x5f666c, ST);
  B.box(0, 0.03, 0, D * 2 - 0.2, 0.06, W * 2 - 0.2, 0x8f8c84);                                         // betonvloer
  // de schuifdeur, half open: een paneel voor het linkerdeel van de opening, met rail en greep
  B.box(D + 0.3, 2.0, -2.0, 0.08, 3.9, 3.6, 0x3a5a40);
  for (const y of [0.9, 2.0, 3.1]) B.box(D + 0.35, y, -2.0, 0.04, 0.08, 3.6, 0x2c4632);
  B.box(D + 0.35, 4.05, 0, 0.1, 0.12, 7.6, 0x3a3d40);                                                  // rail
  B.box(D + 0.38, 1.4, -0.4, 0.06, 0.4, 0.06, 0x1c1c1c);
  // binnen: band, werkbank, bord met gereedschap, jerrycans, lamp
  B.geo(new THREE.TorusGeometry(0.62, 0.24, 6, 14), composeMatrix(-D + 0.55, 0.86, -4.2, 0, Math.PI / 2 - 0.25, 0), 0x1d1d1d);
  B.geo(new THREE.CylinderGeometry(0.4, 0.4, 0.34, 10).rotateX(Math.PI / 2), composeMatrix(-D + 0.55, 0.86, -4.2, 0, Math.PI / 2 - 0.25, 0), 0xc9a33a); // velg
  B.box(-D + 0.6, 0.9, 1.6, 0.8, 0.08, 2.4, 0x8a6440);                                                 // werkbank
  for (const z of [0.5, 2.7]) for (const x of [-D + 0.3, -D + 0.9]) B.box(x, 0.45, z, 0.08, 0.9, 0.08, 0x5a4a3a);
  B.box(-D + 0.6, 1.02, 0.8, 0.2, 0.16, 0.2, 0x3a4a6a);                                                // bankschroef
  B.box(-D + 0.17, 2.0, 1.6, 0.04, 1.2, 2.4, 0x9a7a52);                                                // gereedschapsbord
  for (const [z, h, c] of [[0.7, 1.1, 0x6a6e72], [1.2, 1.0, 0x8a6440], [1.7, 1.1, 0x6a6e72], [2.2, 0.9, 0xc94a3a], [2.6, 0.7, 0x3a6ea8]]) B.box(-D + 0.22, 2.0, z, 0.05, h, 0.06, c);
  B.box(-D + 0.24, 1.5, 0.7, 0.05, 0.28, 0.22, 0x6a6e72);                                              // schopblad
  for (const [z, c] of [[-1.2, 0xc8302a], [-0.8, 0x2f6a3a], [-0.4, 0xc8302a]]) B.box(-D + 0.4, 0.25, z, 0.18, 0.5, 0.32, c); // jerrycans
  B.geo(new THREE.CylinderGeometry(0.3, 0.3, 0.88, 10), composeMatrix(-D + 0.5, 0.44, 4.6), 0x2f5f9a);   // olievat
  B.box(0, 5.3, 0, 1.2, 0.08, 0.2, 0xfff2c0);                                                         // tl-lamp onder de nok
  B.box(0, 5.38, 0, 1.25, 0.06, 0.24, 0x5a5f63);
  return B.build();
}

// Een balenwagen: platte laadvloer van planken op een stalen chassis, vier wielen, dissel naar +x, een rek voorop.
export function balenwagen() {
  const B = new GeoBuilder(1);
  const L = 6, Wd = 2.4, Y = 1.0;
  for (let i = 0; i < 8; i++) B.box(0, Y, -Wd / 2 + (i + 0.5) * (Wd / 8), L, 0.1, Wd / 8 - 0.02, i % 2 ? 0x9a7a52 : 0x8a6a46); // planken
  for (const s of [-1, 1]) B.box(0, Y - 0.15, s * 0.7, L, 0.2, 0.14, 0x3a3d40);                       // chassisbalken
  for (const s of [-1, 1]) B.box(0, Y + 0.02, s * (Wd / 2 + 0.03), L + 0.06, 0.16, 0.06, 0xb23a2a);   // rode randbalk
  for (const x of [-1.7, 1.7]) for (const s of [-1, 1]) {
    B.geo(new THREE.CylinderGeometry(0.5, 0.5, 0.36, 12).rotateX(Math.PI / 2), composeMatrix(x, 0.5, s * 1.05), 0x1d1d1d);
    B.geo(new THREE.CylinderGeometry(0.28, 0.28, 0.38, 10).rotateX(Math.PI / 2), composeMatrix(x, 0.5, s * 1.05), 0xb23a2a);
  }
  for (const x of [-1.7, 1.7]) B.box(x, 0.5, 0, 0.1, 0.1, 2.0, 0x3a3d40);                             // assen
  B.geo(tubeGeometry([L / 2, 0.8, 0], [L / 2 + 1.4, 0.55, 0], 0.07, 0.07, 6), null, 0x3a3d40);      // dissel
  B.box(L / 2 + 1.45, 0.55, 0, 0.16, 0.12, 0.2, 0x1d1d1d);                                             // trekoog
  for (const s of [-1, 0, 1]) B.box(L / 2 - 0.05, Y + 0.8, s * 1.1, 0.08, 1.6, 0.08, 0x8a6440);       // rek voorop
  for (const y of [0.6, 1.2, 1.6]) B.box(L / 2 - 0.05, Y + y, 0, 0.06, 0.07, Wd, 0x9a7a52);
  return B.build();
}

// De hoogte van de laadvloer van de balenwagen (de scène zet de balen erop)
export const WAGENVLOER = 1.05;
