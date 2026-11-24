// De bestelbus, de ambulance en (onder de opbouw) de foodtruck, opnieuw gebouwd in de vormtaal van het Quaternius-autopakket
// (24-11, voertuigen-weg): een afgeronde romp met grote facetten, een raked voorraam met stijlen en een echt zijraam in de deur,
// een kap met rand en grille, lampen in behuizingen, bumpers die om de hoek lopen, dikke wielen met velg, spiegels op armen en een
// cabine met stoelen en dashboard achter de uitgeknipte deurgaten. De deuren knipt models3d_vehicles.js (knipDeurgaten). Alles is
// geometrie in vertexkleuren op de drie groepen van de GeoBuilder (lak, glas, lampen); geen textuur.
// c is wat buildCarGeometry meegeeft: B (GeoBuilder), P (profiel), hl, hw, W, L, xK (voorkant laadruimte), paint, K (kleuren),
// G (groepen) en een paar bouwers van de gastheer (extrudeProfile, shadeHex, binnenDoos, THREE).
import { fillet, planExtrude, cyl, bar, headlamp, mirror, handle, grille, taillight, ridge } from './vehicle_kit.js';
import { composeMatrix } from './pixelart3d.js';

// De omtrek van de romp (voor naar achter over de bovenkant, dan de onderkant met de wielkasten) met afgeronde hoeken.
export function vanOutline(P, hl, xK, sill, archPts) {
  const top = [[hl, P.nose, 0.22], [hl - 0.3, P.hood, 0.18], [P.xA, P.belt, 0.1], [xK, P.belt, 0], [xK, P.roof, 0], [-hl, P.roof, 0.24], [-hl, sill + 0.08, 0.07]];
  const bot = [[hl, sill + 0.08, 0.07]];
  const poly = [...top.map((p) => [p[0], p[1]]), ...archPts, ...bot.map((p) => [p[0], p[1]])];
  const r = [...top.map((p) => p[2]), ...archPts.map(() => 0), ...bot.map((p) => p[2])];
  return fillet(poly, r, 3);
}

const rot = (B, x, y, z, sx, sy, sz, color, group, rz) => B.box(x, y, z, sx, sy, sz, color, group, 0, 0, rz);

// De cabine boven de raamlijn: raked voorraam met stijlen, zijruit in de deur, dakrand, wissers en het interieur.
export function vanCabin(B, c) {
  const { P, hw, W, xK, paint, K, G, extrudeProfile, shadeHex, binnenDoos } = c;
  const { belt, roof, xA, xB } = P;
  const ww = W * 0.88, dark = 0x1d1e20, pil = shadeHex(paint, 0.82);
  // het dak van de cabine, afgerond
  B.geo(extrudeProfile([[xB + 0.14, roof - 0.14], [xB + 0.04, roof - 0.04], [xB - 0.1, roof], [xK, roof], [xK, roof - 0.16]], W * 0.97, 0.07, 3), null, paint);
  // voorruit op de schuine lijn, met kader: kopstuk, onderrand en twee stijlen
  const a = [xA + 0.03, belt + 0.03], b = [xB + 0.1, roof - 0.14];
  const len = Math.hypot(a[0] - b[0], a[1] - b[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  rot(B, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0, len, 0.03, ww, K.GLASS, G.GLASS, ang);
  rot(B, b[0] + 0.015, b[1] + 0.045, 0, 0.14, 0.09, W * 0.9, paint, G.BODY, ang - 0.25);
  rot(B, a[0] + 0.02, a[1] - 0.03, 0, 0.2, 0.06, ww + 0.02, dark, G.BODY, 0.12);
  for (const s of [1, -1]) {
    bar(B, [xA + 0.03, belt + 0.02, s * (hw - 0.07)], [xB + 0.12, roof - 0.12, s * (hw - 0.07)], 0.09, pil);
    // zijruit: een vlak in de deur (de deur neemt het mee), met de onderrand en de stijlen als lijst
    const glas = [[xK + 0.08, belt + 0.08], [xA - 0.03, belt + 0.08], [xB + 0.09, roof - 0.16], [xK + 0.08, roof - 0.16]];
    B.geo(extrudeProfile(glas, 0.045, 0, 1), composeMatrix(0, 0, s * (hw - 0.035)), K.GLASS, G.GLASS);
    B.box((xK + xA) / 2, belt + 0.03, s * (hw - 0.025), xA - xK - 0.02, 0.06, 0.05, dark);
    B.box(xK + 0.0, (belt + roof) / 2 - 0.02, s * (hw - 0.025), 0.08, roof - belt - 0.12, 0.06, pil);
    bar(B, [xK + 0.05, roof - 0.12, s * (hw - 0.03)], [xB - 0.1, roof - 0.12, s * (hw - 0.03)], 0.05, dark);
    B.box((xK + xB) / 2 + 0.1, roof - 0.04, s * (hw + 0.012), xB - xK - 0.1, 0.035, 0.04, dark);
    // de wissers
    const wy = a[1] + 0.05, wx = a[0] - 0.04;
    bar(B, [wx - 0.03, wy + 0.02, s * 0.12], [wx - 0.28, wy + 0.3, s * 0.5], 0.012, dark);
  }
  B.box(xB + 0.28, roof - 0.28, 0, 0.04, 0.1, 0.22, dark);
  // het interieur achter de uitgeknipte deuren: wanden, vloer, twee stoelen, dashboard met stuur; een eigen mesh (interieurSimpel) die
  // op de lagere niveaus en met de echte cabine (cabin3d.js) verdwijnt
  const I = c.I;
  const cx = (xK + xA) / 2 - 0.02;
  binnenDoos(I, cx, (0.4 + belt) / 2, 0, xA - xK - 0.2, belt - 0.42, W - 0.32, 0x34383d);
  I.box(cx, 0.4, 0, xA - xK - 0.22, 0.03, W - 0.36, 0x45474c);
  for (const s of [1, -1]) {
    I.box(cx - 0.05, 0.56, s * 0.42, 0.5, 0.14, 0.46, 0x3b4048);
    I.geo(extrudeProfile([[-0.06, -0.02], [0.06, -0.02], [0.12, 0.62], [-0.02, 0.62]], 0.46, 0.04, 2), composeMatrix(cx - 0.3, 0.6, s * 0.42), 0x3b4048);
    I.box(cx - 0.36, 1.26, s * 0.42, 0.08, 0.16, 0.26, 0x2e3238);
  }
  I.box(xA - 0.27, belt - 0.2, 0, 0.46, 0.3, W - 0.34, 0x2a2c31);
  I.box(xA - 0.05, belt - 0.03, 0, 0.12, 0.04, W - 0.4, 0x202226);
  I.geo(new c.THREE.TorusGeometry(0.17, 0.022, 5, 12), composeMatrix(xA - 0.58, belt - 0.08, -0.42, 0, Math.PI / 2 - 0.5, 0), 0x1a1b1d);
  cyl(I, xA - 0.45, belt - 0.2, -0.42, 0.025, 0.03, 0.3, 'x', 0x2a2c31, 6);
}

// De bumpers voor en achter, vlak na elkaar in de lakgroep: de schade (vehicleimpact) knipt ze los via de bereiken f0..f1 en f1..r1.
export function vanBumpers(B, c, marks) {
  const { hl, hw, W, paint, K, shadeHex } = c;
  marks.f0();
  const bump = shadeHex(paint, 0.88), lip = 0x1f2022;
  const plan = fillet([[hl + 0.07, -(hw - 0.22)], [hl + 0.07, hw - 0.22], [hl - 0.08, hw - 0.045], [hl - 0.36, hw - 0.045], [hl - 0.36, -(hw - 0.045)], [hl - 0.08, -(hw - 0.045)]], [0.12, 0.12, 0.08, 0.02, 0.02, 0.08], 2);
  B.geo(planExtrude(plan, 0.3, 0.24, 0.025, 1), null, bump);
  B.geo(planExtrude(fillet([[hl + 0.075, -(hw - 0.3)], [hl + 0.075, hw - 0.3], [hl - 0.1, hw - 0.06], [hl - 0.1, -(hw - 0.06)]], 0.08, 2), 0.25, 0.06, 0.012, 1), null, lip);
  B.box(hl + 0.083, 0.42, 0, 0.012, 0.11, 0.5, K.PLATE);
  for (const s of [1, -1]) B.box(hl + 0.068, 0.37, s * (hw * 0.62), 0.02, 0.05, 0.3, 0x2a2b2d);
  B.box(hl + 0.04, 0.5, 0, 0.03, 0.025, W * 0.7, K.CHROME);
  marks.f1();
  const bump2 = shadeHex(paint, 0.88);
  const plan2 = fillet([[-hl - 0.07, -(hw - 0.22)], [-hl - 0.07, hw - 0.22], [-hl + 0.1, hw - 0.045], [-hl + 0.3, hw - 0.045], [-hl + 0.3, -(hw - 0.045)], [-hl + 0.1, -(hw - 0.045)]], [0.1, 0.1, 0.06, 0.02, 0.02, 0.06], 2);
  B.geo(planExtrude(plan2, 0.32, 0.22, 0.025, 1), null, bump2);
  B.geo(planExtrude(fillet([[-hl - 0.075, -(hw - 0.3)], [-hl - 0.075, hw - 0.3], [-hl + 0.12, hw - 0.1], [-hl + 0.12, -(hw - 0.1)]], 0.06, 2), 0.56, 0.02, 0.006, 1), null, 0x2a2b2d);
  for (const s of [1, -1]) B.box(-hl - 0.085, 0.43, s * (hw - 0.18), 0.012, 0.03, 0.2, K.CHROME);
  marks.r1();
}

// Voorkant: koplampen in behuizingen, mistlampen, kap met ribben en gleuf, kraag rond de lampen.
export function vanFront(B, c) {
  const { P, hl, hw, W, paint, G, K, shadeHex } = c;
  for (const s of [1, -1]) {
    headlamp(B, hl + 0.002, P.nose - 0.17, s * (hw - 0.3), 0.105, K, s);
    cyl(B, hl + 0.03, 0.43, s * (hw - 0.17), 0.045, 0.045, 0.04, 'x', K.HEADLAMP, 8, G.LAMP);
  }
  // de kap: twee ribben over de lengte en de gleuf bij de ruit
  const hx0 = hl - 0.3, hx1 = P.xA, ang = Math.atan2(P.belt - P.hood, hx1 - hx0);
  for (const s of [1, -1]) rot(B, (hx0 + hx1) / 2, (P.hood + P.belt) / 2 + 0.012, s * 0.42, hx1 - hx0 - 0.1, 0.014, 0.05, shadeHex(paint, 1.14), G.BODY, ang);
  B.box(hx1 - 0.1, P.belt + 0.005, 0, 0.06, 0.012, W * 0.7, 0x1d1e20);
}

// Achterkant: achterlichten, kenteken met lamp, scharnieren en handgrepen van de achterdeuren en achterruiten met kader.
export function vanRear(B, c) {
  const { P, hl, hw, K, G } = c;
  B.box(-hl - 0.01, 0.62, 0, 0.012, 0.1, 0.48, K.PLATE);
  B.box(-hl - 0.03, 0.7, 0, 0.03, 0.03, 0.4, 0x1d1e20);
  B.box(-hl - 0.03, 0.74, 0, 0.03, 0.03, 0.06, K.HEADLAMP, G.LAMP);
  for (const s of [1, -1]) {
    taillight(B, -hl - 0.005, 1.02, s * (hw - 0.1), 0.46, K, 0.14);
    B.box(-hl - 0.014, 0.8, s * (hw - 0.1), 0.02, 0.06, 0.1, K.HEADLAMP, G.LAMP);
    for (const y of [0.8, 1.5, P.roof - 0.2]) B.box(-hl - 0.02, y, s * (hw - 0.02), 0.04, 0.12, 0.04, 0x2a2b2d);
  }
  B.box(-hl - 0.03, 1.1, 0.05, 0.03, 0.2, 0.05, K.CHROME);
  B.box(-hl - 0.014, 1.3, 0, 0.012, P.roof - 1.0, 0.025, 0x1d1e20);
  for (const s of [1, -1]) {
    if (!c.amb) {
      // het glas ligt in een kader van vier strips (geen vlakken die op elkaar liggen)
      const zc = s * hw * 0.5, gw = hw * 0.74, gh = 0.44, yc = P.roof - 0.4, fx = -hl - 0.012;
      B.box(fx, yc, zc, 0.02, gh, gw, K.GLASS, G.GLASS);
      B.box(fx, yc + gh / 2 + 0.03, zc, 0.02, 0.06, gw + 0.12, 0x1d1e20);
      B.box(fx, yc - gh / 2 - 0.03, zc, 0.02, 0.06, gw + 0.12, 0x1d1e20);
      for (const q of [-1, 1]) B.box(fx, yc, zc + q * (gw / 2 + 0.03), 0.02, gh + 0.12, 0.06, 0x1d1e20);
    }
  }
}

// De flanken en het dak van de laadruimte: persribben, rails van de schuifdeur, markeringslichten, grepen, spatlappen, dakribben,
// luchtafvoer en antenne. Zonder gaten voor de schuifdeur: die staat in vehicledoors.js als beweegbaar deel.
export function vanSides(B, c) {
  const { P, hl, hw, L, xK, paint, K, G, shadeHex } = c;
  const rib = shadeHex(paint, 1.1), dim = shadeHex(paint, 0.78);
  const x0 = -hl + 0.3, x1 = xK - 0.04;
  // de schuifdeur (vehicledoors.js: x = -0,08 L, 1 m breed) houdt zijn eigen naden: de ribben lopen er niet doorheen
  const d0 = -0.08 * L - 0.5 - 0.04, d1 = -0.08 * L + 0.5 + 0.04;
  // de stijlen staan op vaste plekken; de ribben lopen tussen de stijlen (en de schuifdeur) door, nooit eroverheen
  const posts = [x0 + 0.04, (x0 + d0) / 2, x1 - 0.04], TH = 0.022;
  const stops = [[x0, posts[0] - 0.04], [posts[0] + 0.04, posts[1] - 0.04], [posts[1] + 0.04, d0], [d1, posts[2] - 0.04]];
  const span = (y, sy, color, s2) => { for (const [a0, a1] of stops) ridge(B, (a0 + a1) / 2, y, s2 * hw, a1 - a0, sy, TH, color, s2); };
  for (const s of [1, -1]) {
    if (!c.kaal) {
      for (const y of [0.98, 1.56]) span(y, 0.05, rib, s);
      span(P.roof - 0.14, 0.035, dim, s);
      for (const x of posts) ridge(B, x, (0.9 + P.roof) / 2 - 0.1, s * hw, 0.05, P.roof - 1.0, TH, dim, s);
      ridge(B, d0 - 0.4, P.roof - 0.25, s * hw, 0.9, 0.03, 0.03, 0x2a2b2d, s); // de bovenrail van de schuifdeur loopt naar achteren door
    }
    ridge(B, xK + 0.06, P.roof - 0.1, s * hw, 0.1, 0.05, 0.022, K.INDICATOR, s, G.LAMP);
    ridge(B, -hl + 0.08, P.roof - 0.1, s * hw, 0.1, 0.05, 0.022, K.TAIL, s, G.LAMP);
    ridge(B, P.fw + 0.5, 0.82, s * hw, 0.1, 0.045, 0.022, K.INDICATOR, s, G.LAMP);
    handle(B, 1.14, 0.92, s * hw, s, K);
    if (s > 0 && !c.amb) handle(B, -0.08 * L + 0.3, 1.0, hw, s, K);
    B.box(P.rw - 0.46, 0.2, s * (hw - 0.1), 0.02, 0.2, 0.22, 0x151516);
  }
  if (!c.kaal) {
    for (const z of [-0.5, 0, 0.5]) B.box((x0 + x1) / 2, P.roof + 0.008, z, x1 - x0 - 0.2, 0.025, 0.05, rib);
    B.box(-0.6, P.roof + 0.035, 0, 0.5, 0.07, 0.36, 0x2a2b2d);
    B.box(-0.6, P.roof + 0.075, 0, 0.42, 0.012, 0.28, shadeHex(paint, 0.7));
  }
  bar(B, [xK + 0.2, P.roof, 0.7], [xK + 0.17, P.roof + 0.22, 0.72], 0.016, 0x1a1b1d);
}

// Een wielkastrand: een donkere boog die 2,5 cm uit de flank staat, rond elke wielkast, aan beide kanten (een extrusie van de boog).
export function arcFlares(B, c, arches) {
  const { hw, extrudeProfile } = c;
  for (const { x, r, cy } of arches) {
    const pts = [];
    for (let k = 0; k <= 8; k++) { const a = (18 + k * 18) * Math.PI / 180; pts.push([Math.cos(a) * (r + 0.075), Math.sin(a) * (r + 0.075)]); }
    for (let k = 8; k >= 0; k--) { const a = (18 + k * 18) * Math.PI / 180; pts.push([Math.cos(a) * (r + 0.012), Math.sin(a) * (r + 0.012)]); }
    const g = extrudeProfile(pts, 0.025, 0, 1);
    for (const s of [1, -1]) B.geo(g, composeMatrix(x, cy, s * (hw + 0.004)), 0x1d1e20);
  }
}

// De spiegels als losse delen (schade): twee grote spiegels op armen aan de A-stijl.
export function vanMirrors(B, c) {
  const { P, hw, paint, K } = c;
  for (const s of [1, -1]) mirror(B, P.xA - 0.08, P.belt + 0.2, s * (hw - 0.02), s, paint, K, 0.17);
}
export function vanGrille(B, c) {
  const { P, hl, W, K } = c;
  grille(B, hl + 0.014, P.nose - 0.17, W * 0.42, 0.2, 4, K);
  cyl(B, hl + 0.05, P.nose - 0.17, 0, 0.055, 0.055, 0.02, 'x', K.CHROME, 8);
  B.box(hl + 0.062, P.nose - 0.17, 0, 0.012, 0.05, 0.05, 0x23406a, 0, 0, 0, Math.PI / 4);
}

// Het dak van de ambulance: een hoge, afgeronde dakkap boven de patiëntenruimte in wit met een blauwe voorrand en flitsers, een
// lichtbalk op het cabinedak, een airco-unit, een luchtafvoer, een antenne en een neutraal embleem op beide flanken van de kap.
// Het embleem is verzonnen: een blauwe schijf met een witte achtpuntige ster en een rand; geen kruis en geen bestaand teken.
export function ambulanceRoof(B, c) {
  const { P, hl, hw, W, K, G, extrudeProfile } = c;
  const WHITE = 0xf4f2ee, BLUE = 0x1d4fa3, LAMP = 0x2f6bff;
  const roofX0 = P.xB - 0.45, rh = 0.5, top = P.roof + rh;
  const pts = fillet([[roofX0, P.roof - 0.03], [roofX0 + 0.1, top], [-hl + 0.04, top], [-hl, top - 0.12], [-hl, P.roof - 0.03]], [0, 0.14, 0.16, 0.14, 0], 3, true);
  B.geo(extrudeProfile(pts, W - 0.1, 0.09, 2), null, WHITE);
  B.box(roofX0 + 0.05, P.roof + rh / 2 - 0.02, 0, 0.04, rh - 0.12, W * 0.74, BLUE);
  B.box(roofX0 + 0.12, top - 0.03, 0, 0.06, 0.04, W * 0.6, LAMP, G.LAMP);
  for (const s of [1, -1]) B.box(-hl + 0.02, top - 0.11, s * 0.52, 0.04, 0.07, 0.26, LAMP, G.LAMP);
  // lichtbalk op het cabinedak: donkere balk met blauwe uiteinden en een heldere midden (de draaiende lampen komen in assembleCar)
  const barX = P.xB - 0.25;
  B.box(barX, P.roof + 0.03, 0, 0.3, 0.06, W * 0.84, 0x1f2022);
  for (const s of [1, -1]) B.box(barX, P.roof + 0.1, s * W * 0.4, 0.26, 0.1, 0.12, LAMP, G.LAMP);
  B.box(barX, P.roof + 0.09, 0, 0.18, 0.07, W * 0.3, 0xdfe6ee, G.LAMP);
  // airco, luchtafvoer en antenne op de kap
  B.box(-0.55, top + 0.07, 0, 0.9, 0.14, 0.8, 0xb9bcbf);
  for (let k = -2; k <= 2; k++) B.box(-0.55, top + 0.145, k * 0.15, 0.82, 0.012, 0.03, 0x6b6e72);
  B.box(-1.5, top + 0.04, 0, 0.3, 0.08, 0.3, 0x8f9296);
  bar(B, [-hl + 0.4, top, hw * 0.55], [-hl + 0.36, top + 0.4, hw * 0.55 + 0.02], 0.016, 0x1a1b1d);
  // embleem: een blauwe schijf met een witte achtpuntige ster, midden op de zijkant van de kap
  const ex = (roofX0 - hl) / 2 + 0.6, ey = P.roof + rh / 2 - 0.02;
  for (const s of [1, -1]) {
    const z = s * ((W - 0.1) / 2 + 0.006);
    cyl(B, ex, ey, z, 0.215, 0.215, 0.012, 'z', 0xf4f2ee, 14);
    cyl(B, ex, ey, z + s * 0.007, 0.19, 0.19, 0.012, 'z', BLUE, 14);
    B.box(ex, ey, z + s * 0.014, 0.25, 0.25, 0.012, 0xf4f2ee, 0, 0, 0, Math.PI / 4);
    B.box(ex, ey, z + s * 0.02, 0.25, 0.25, 0.012, 0xf4f2ee);
    B.box(ex, ey, z + s * 0.026, 0.1, 0.1, 0.012, BLUE, 0, 0, 0, Math.PI / 4);
  }
}
