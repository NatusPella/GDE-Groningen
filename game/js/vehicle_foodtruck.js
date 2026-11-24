// De opbouw van de foodtruck (24-11, voertuigen-weg), op de cabine en romp van de bestelbus (vehicle_van.js): een serveerluik met kader en
// planken erachter, een toonbank met rand en consoles, een gestreept zonnescherm met rand, steunen en lichtsnoer, een menubord aan de
// andere kant, hapjes op de toonbank (frietzakjes, broodjes, kassa, bel), een afzuigkap met schoorsteen en de eierbal op het dak.
// Het bord (Tam & Tes) is een eigen mesh met textuur in buildFoodtruckMesh. Alles verzonnen, geen echte merken.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { composeMatrix, tubeGeometry } from './pixelart3d.js';
import { cyl } from './vehicle_kit.js';

export function foodtruckOnderdelen(B, c) {
  const { L, hl, hw, K, G } = c;
  const x0 = -hl + 0.55, x1 = 0.45; // het luik eindigt voor de cabinedeur (de deur loopt van 0,7 tot 1,45 m)
  const cx = (x0 + x1) / 2, cl = x1 - x0, STEEL = 0xb9bcbf, DARK = 0x1c1d20;
  // het luik: een donkere opening met kader en een warm verlicht achterpaneel met planken en potten
  B.box(cx, 1.5, hw + 0.007, cl, 0.82, 0.012, DARK);
  B.box(cx, 1.36, hw + 0.012, cl * 0.9, 0.42, 0.012, 0xf2c230, G.LAMP);
  for (const y of [1.22, 1.5]) B.box(cx, y, hw + 0.05, cl * 0.9, 0.03, 0.04, 0x8f9296);
  for (let i = 0; i < 9; i++) {
    const px = x0 + 0.2 + (cl - 0.4) * i / 8, kl = [0xc9852e, 0xb23a2a, 0x6aa84f, 0xe8d6a0][i % 4];
    B.box(px, 1.285, hw + 0.045, 0.13, 0.12, 0.1, kl);
    B.box(px + 0.04, 1.565, hw + 0.045, 0.1, 0.12, 0.1, kl === 0xc9852e ? 0xe8d6a0 : 0xc9852e);
  }
  for (const [px, py, w, h] of [[cx, 1.92, cl + 0.12, 0.05], [cx, 1.09, cl + 0.12, 0.05]]) B.box(px, py, hw + 0.012, w, h, 0.05, 0x8f9296);
  for (const px of [x0 - 0.03, x1 + 0.03]) B.box(px, 1.5, hw + 0.012, 0.05, 0.9, 0.05, 0x8f9296);
  // toonbank: steel blad met opstaande rand en twee consoles eronder
  B.box(cx, 1.03, hw + 0.17, cl + 0.12, 0.05, 0.34, STEEL);
  B.box(cx, 1.07, hw + 0.33, cl + 0.12, 0.04, 0.03, STEEL);
  for (const px of [x0 + 0.15, cx, x1 - 0.15]) B.box(px, 0.95, hw + 0.09, 0.05, 0.12, 0.16, 0x6b6e72);
  // zonnescherm: zes banen, een rand van korte banen, twee steunen en een lichtsnoer
  for (let i = 0; i < 6; i++) {
    const sx = x0 + (cl * (i + 0.5)) / 6, kl = i % 2 ? 0xf4f1e6 : 0x1f4f8f;
    B.box(sx, 1.98, hw + 0.42, cl / 6, 0.035, 0.9, kl, 0, 0.5, 0, 0);
    B.box(sx, 1.77, hw + 0.86, cl / 6, 0.14, 0.03, kl);
  }
  for (const x of [x0 + 0.05, x1 - 0.05]) B.geo(tubeGeometry([x, 1.86, hw + 0.8], [x, 1.1, hw + 0.03], 0.018, 0.018, 4), null, K.CHROME);
  for (let i = 0; i < 9; i++) cyl(B, x0 + (cl * i) / 8, 1.68, hw + 0.88, 0.028, 0.028, 0.05, 'x', 0xffe9a8, 6, G.LAMP);
  // hapjes en kassa op de toonbank: frietzakjes (kegels), broodjes (drie lagen), een kassa en een bel
  for (let i = 0; i < 3; i++) B.geo(new THREE.ConeGeometry(0.06, 0.16, 6), composeMatrix(cx - cl * 0.32 + i * 0.16, 1.14, hw + 0.2), [0xe8c24a, 0xd9a521, 0xe8c24a][i]);
  for (let i = 0; i < 2; i++) {
    const bx = cx - 0.05 + i * 0.2;
    for (const [dy, r, kl] of [[0, 0.07, 0xc9852e], [0.045, 0.075, 0x6aa84f], [0.09, 0.07, 0xc9852e]]) cyl(B, bx, 1.075 + dy, hw + 0.2, r, r, 0.04, 'y', kl, 8);
  }
  B.box(cx + cl * 0.3, 1.11, hw + 0.2, 0.26, 0.14, 0.2, 0x2a2b2d);
  B.box(cx + cl * 0.3, 1.2, hw + 0.2, 0.18, 0.07, 0.04, 0x6aa84f, 0, 0.5, 0, 0);
  B.geo(new THREE.SphereGeometry(0.045, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), composeMatrix(cx + cl * 0.12, 1.06, hw + 0.3), 0xd9a521);
  // menubord aan de linkerkant: een donkere lei met gekleurde regels, een kader en een lamp erboven
  const mx = -0.9, mz = -(hw + 0.012);
  B.box(mx, 1.45, mz, 1.0, 0.62, 0.018, 0x23262a);
  for (const [dy, w, kl] of [[0.2, 0.6, 0xf0ede4], [0.08, 0.7, 0xf2c230], [-0.04, 0.55, 0xf0ede4], [-0.16, 0.65, 0xf2c230], [-0.26, 0.4, 0xf0ede4]]) B.box(mx - (0.7 - w) / 2 + 0.05, 1.45 + dy, mz - 0.012, w, 0.04, 0.012, kl);
  for (const [px, py, w, h] of [[mx, 1.78, 1.06, 0.04], [mx, 1.12, 1.06, 0.04]]) B.box(px, py, mz - 0.01, w, h, 0.03, 0x8f9296);
  for (const px of [mx - 0.52, mx + 0.52]) B.box(px, 1.45, mz - 0.01, 0.04, 0.7, 0.03, 0x8f9296);
  B.box(mx, 1.88, mz - 0.1, 0.5, 0.05, 0.14, 0x2a2a2b);
  B.box(mx, 1.84, mz - 0.1, 0.4, 0.02, 0.1, 0xffe9a8, 0, 0, 0, 0, G.LAMP);
  // dak: draagframe voor het bord, afzuigkap met schoorsteen, een generatorkist achterop en de eierbal
  B.box(-0.3, 2.3, 0, L * 0.55, 0.06, 0.08, 0x2a2a2b);
  for (const x of [-0.3 - L * 0.26, -0.3 + L * 0.26]) B.box(x, 2.22, 0, 0.06, 0.2, 0.06, 0x2a2a2b);
  B.box(-hl + 0.7, 2.2, -hw * 0.45, 0.6, 0.2, 0.55, K.CHROME);
  B.box(-hl + 0.7, 2.33, -hw * 0.45, 0.62, 0.03, 0.57, 0x8f9296);
  cyl(B, -hl + 0.7, 2.55, -hw * 0.45, 0.07, 0.07, 0.5, 'y', 0x6b6e72, 8);
  cyl(B, -hl + 0.7, 2.82, -hw * 0.45, 0.1, 0.1, 0.04, 'y', 0x6b6e72, 8);
  B.box(-hl + 0.45, 0.62, -hw - 0.12, 0.7, 0.4, 0.28, 0x3a3d40);
  for (let i = 0; i < 3; i++) B.box(-hl + 0.2 + i * 0.2, 0.64, -hw - 0.13, 0.015, 0.3, 0.2, 0x2a2b2d);
  cyl(B, -hl - 0.12, 0.74, hw - 0.3, 0.11, 0.11, 0.5, 'y', 0xb23a2a, 8); // gasfles op de achterbumper
  cyl(B, -hl - 0.12, 1.02, hw - 0.3, 0.07, 0.07, 0.06, 'y', 0x6b6e72, 8);
  B.geo(new THREE.SphereGeometry(0.42, 12, 9), composeMatrix(hl - 1.25, 2.55, 0, 0, 0, 0, 1, 0.92, 1), 0xb8742c);
  B.geo(new THREE.SphereGeometry(0.45, 12, 9, 0, Math.PI * 2, 0, 0.9), composeMatrix(hl - 1.25, 2.55, 0, 0, 0, 0, 1, 0.92, 1), 0xd89a44);
  B.box(hl - 1.25, 2.12, 0, 0.5, 0.06, 0.5, 0x2a2a2b);
}
