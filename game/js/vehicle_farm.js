// De Korenwolf M3 (maaidorser) en de Laadkabouter L45 (wiellader) opnieuw gebouwd (24-11) in de stijl van de Quaternius-voertuigen:
// geëxtrudeerde profielen met afgeronde randen, afgeschuinde dozen, rondom glas met stijlen, een zichtbare bestuurdersplek en
// echte werktuigen (haspel en messenbalk, laadarmen met cilinders en een bak met tanden). Alleen geometrie; de wielen en de
// materialen regelt models3d_vehicles.js. Maten blijven die van de oude modellen (7,4 x 3,3 m en 3,4 x 1,8 m, wielen op dezelfde plek).
import { GeoBuilder, composeMatrix, THREE, C, G_GLASS, G_LAMP, shade, chamfBox, prism, tube, beam, glassQuad, lugWheel } from './vehicle_shapes.js';

const cyl = (B, x, y, z, rt, rb, h, color, seg = 10, axis = 'y', group = 0) => {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  if (axis === 'z') g.rotateX(Math.PI / 2);
  else if (axis === 'x') g.rotateZ(Math.PI / 2);
  B.geo(g, composeMatrix(x, y, z), color, group);
};

// Een cabine met rondom glas: x0..x1, vloer fl, dakrand roof, halve breedte hz, raamstijlen op de hoeken. rake: helling van de voorruit.
function glassCab(B, paint, x0, x1, fl, belt, roof, hz, rake = 0.12) {
  const mx = (x0 + x1) / 2;
  chamfBox(B, mx, (fl + belt) / 2, 0, x1 - x0, belt - fl, hz * 2, 0.06, paint);
  for (const s of [1, -1]) {
    glassQuad(B, [x0, belt, s * hz], [x1, belt, s * hz], [x1 - rake, roof, s * (hz - 0.03)], [x0, roof, s * (hz - 0.03)], [0, 0, s]);
    for (const px of [x0 + 0.03, x1 - 0.03]) B.box(px - (px > mx ? rake / 2 : 0), (belt + roof) / 2, s * (hz - 0.02), 0.07, roof - belt, 0.07, paint);
    B.box(mx, (belt + roof) / 2, s * (hz - 0.02), 0.05, roof - belt, 0.05, paint); // middenstijl
  }
  glassQuad(B, [x1, belt, hz], [x1, belt, -hz], [x1 - rake, roof, -(hz - 0.03)], [x1 - rake, roof, hz - 0.03], [1, 0, 0]);
  glassQuad(B, [x0, belt, -hz], [x0, belt, hz], [x0, roof, hz - 0.03], [x0, roof, -(hz - 0.03)], [-1, 0, 0]);
  chamfBox(B, mx + 0.1, roof + 0.07, 0, x1 - x0 + 0.5, 0.14, hz * 2 + 0.16, 0.05, shade(paint, 0.82));
}

// De bestuurdersplek: stoel, stuur of joystick en een paneel; (x, z) is de stoelvoet.
function seatSet(B, x, fl, z, face = 1) {
  chamfBox(B, x, fl + 0.4, z, 0.5, 0.1, 0.5, 0.03, C.SEAT);
  chamfBox(B, x - 0.24 * face, fl + 0.75, z, 0.1, 0.7, 0.5, 0.03, C.SEAT);
  B.box(x, fl + 0.18, z, 0.14, 0.34, 0.14, C.DARK);
  B.box(x + 0.5 * face, fl + 0.8, z, 0.3, 0.5, 0.7, C.DARK);
  B.geo(new THREE.TorusGeometry(0.17, 0.02, 4, 10).rotateY(Math.PI / 2).rotateZ(0.35 * face), composeMatrix(x + 0.5 * face, fl + 1.1, z), 0x16171a);
}

export function buildMaaidorserGeo(L, W, paint) {
  const B = new GeoBuilder(3);
  const hl = L / 2, hw = W / 2, rond = shade(paint, 0.82), licht = shade(paint, 1.12), geel = 0xe0b030;
  // --- onderbouw: dorskast met schuine neus, een lichtere band en de zijkleppen
  prism(B, [[-2.5, 0.75], [1.9, 0.75], [2.3, 1.15], [2.3, 2.1], [-2.3, 2.1], [-2.65, 1.85]], 1.5, 0, paint, 0.07);
  for (const s of [1, -1]) {
    chamfBox(B, -0.3, 1.45, s * 0.76, 3.6, 0.7, 0.03, 0.05, licht);
    for (let i = 0; i < 5; i++) B.box(-1.8 + i * 0.85, 1.45, s * 0.785, 0.04, 0.6, 0.02, shade(paint, 0.7));
  }
  B.box(-0.3, 0.7, 0, 4.3, 0.1, 1.2, 0x1c1d1f);
  // --- schuine invoer (feeder) met hydraulische cilinders, daarvoor de maaitafel
  prism(B, [[1.95, 1.0], [1.95, 1.95], [3.05, 1.4], [3.05, 0.78]], 1.4, 0, rond, 0.06);
  for (const s of [1, -1]) {
    tube(B, [1.7, 0.95, s * 0.6], [2.5, 1.55, s * 0.6], 0.045, C.CHROME);
    tube(B, [1.7, 0.95, s * 0.6], [2.1, 1.25, s * 0.6], 0.08, C.DARK);
  }
  // maaitafel: bak met achterwand, zijplaten met puntneus, haspel met latten, deelsnuiten en messenbalk
  prism(B, [[2.65, 0.45], [3.7, 0.38], [3.72, 0.66], [3.5, 0.66], [3.1, 0.98], [2.65, 1.2]], W - 0.1, 0, geel, 0.06);
  for (const s of [1, -1]) {
    prism(B, [[2.62, 0.42], [3.78, 0.4], [3.78, 0.78], [3.35, 1.55], [2.62, 1.6]], 0.1, s * (hw - 0.05), shade(geel, 0.85), 0.03);
    for (const zz of [-1.0, 0.0, 1.0]) prism(B, [[3.4, 0.4], [3.95, 0.5], [3.4, 0.7]], 0.12, zz + s * 0.0 * 0.5, shade(geel, 0.9), 0.02);
  }
  cyl(B, 3.1, 0.82, 0, 0.23, 0.23, W - 0.3, C.STEEL, 12, 'z'); // voerschroef
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    B.box(3.1 + Math.cos(a) * 0.3, 0.82 + Math.sin(a) * 0.3, 0, 0.05, 0.1, W - 0.4, shade(C.STEEL, 0.7), 0, 0, 0, a);
  }
  // haspel: twee ringen, zes latten en een as, op armen
  const rx = 3.25, ry = 1.4;
  cyl(B, rx, ry, 0, 0.07, 0.07, W - 0.1, C.DARK, 8, 'z');
  for (const zz of [-1, 0, 1]) cyl(B, rx, ry, zz * (hw - 0.3), 0.18, 0.18, 0.06, C.DARK, 8, 'z');
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.2;
    B.box(rx + Math.cos(a) * 0.5, ry + Math.sin(a) * 0.5, 0, 0.09, 0.07, W - 0.2, 0xe3a22a, 0, 0, 0, a + Math.PI / 2);
    for (const zz of [-1.2, -0.4, 0.4, 1.2]) B.box(rx + Math.cos(a) * 0.58, ry + Math.sin(a) * 0.58, zz, 0.03, 0.16, 0.025, C.TRIM, 0, 0, 0, a);
  }
  for (const s of [1, -1]) beam(B, [2.55, 1.25, s * (hw - 0.05)], [rx, ry, s * (hw - 0.05)], 0.08, 0.08, C.DARK);
  for (let k = 0; k < 24; k++) B.box(3.8, 0.5, -W / 2 + 0.15 + k * ((W - 0.3) / 23), 0.07, 0.04, 0.09, C.TRIM);
  // --- cabine boven de invoer, met stoel en stuur
  glassCab(B, paint, 1.2, 2.45, 2.1, 2.5, 3.35, 0.75, 0.15);
  seatSet(B, 1.75, 2.1, 0.0, 1);
  B.box(1.85, 2.1 + 0.02, 0, 1.2, 0.04, 1.4, 0x3b3f46);
  for (const s of [1, -1]) {
    B.box(2.5, 3.32, s * 0.5, 0.08, 0.1, 0.22, C.HEADLAMP, G_LAMP);
    B.box(2.4, 3.1, s * 0.78, 0.04, 0.04, 0.22, C.TRIM);
    B.box(2.4, 2.95, s * 0.98, 0.07, 0.4, 0.14, C.TRIM);
  }
  cyl(B, 2.2, 3.65, 0, 0.07, 0.09, 0.1, 0xd88a1a, 8, "y", G_LAMP);
  // --- graantank met schuine zijden en afdekking, lospijp en trap
  prism(B, [[-2.4, 2.1], [1.15, 2.1], [1.15, 2.85], [0.8, 3.3], [-2.2, 3.3], [-2.4, 2.95]], 2.5, 0, paint, 0.1);
  prism(B, [[-2.2, 3.3], [0.8, 3.3], [0.55, 3.5], [-2.0, 3.5]], 2.0, 0, rond, 0.05);
  for (const s of [1, -1]) chamfBox(B, -0.6, 2.7, s * 1.26, 3.2, 0.6, 0.03, 0.05, licht);
  tube(B, [-2.2, 3.62, 0.9], [1.0, 3.62, 0.9], 0.17, C.LIGHT, 10);
  tube(B, [1.05, 2.4, 1.0], [1.05, 3.62, 1.0], 0.13, C.LIGHT, 8);
  tube(B, [-2.2, 3.62, 0.9], [-2.7, 3.2, 0.9], 0.15, C.STEEL, 8);
  cyl(B, -2.78, 3.12, 0.9, 0.05, 0.22, 0.3, C.STEEL, 8);
  // trap en plateau aan de rechterkant
  for (let i = 0; i < 5; i++) B.box(1.0, 0.55 + i * 0.37, 1.32, 0.3, 0.05, 0.4, C.STEEL);
  for (const dx of [-0.13, 0.13]) tube(B, [1.0 + dx, 0.4, 1.45], [1.0 + dx, 2.3, 1.45], 0.025, C.CHROME, 5);
  B.box(1.85, 2.08, 1.05, 1.3, 0.05, 0.5, C.STEEL);
  tube(B, [1.2, 2.55, 1.3], [2.45, 2.55, 1.3], 0.025, C.CHROME, 5);
  // --- motorruimte achterop met rooster, uitlaat en lampen
  chamfBox(B, -3.15, 1.6, 0, 1.2, 1.45, 1.9, 0.18, paint);
  B.box(-3.77, 1.65, 0, 0.04, 1.05, 1.45, C.TRIM);
  for (let k = 0; k < 8; k++) B.box(-3.8, 1.2 + k * 0.12, 0, 0.03, 0.05, 1.4, C.STEEL);
  cyl(B, -2.7, 2.7, -0.6, 0.06, 0.06, 1.0, C.DARK, 8);
  cyl(B, -2.7, 3.22, -0.6, 0.09, 0.07, 0.07, C.STEEL, 8);
  for (const s of [1, -1]) { B.box(-hl + 0.02, 1.9, s * 0.8, 0.04, 0.14, 0.26, C.TAIL, G_LAMP); B.box(-hl + 0.02, 1.1, s * 0.8, 0.04, 0.08, 0.2, C.INDICATOR, G_LAMP); }
  // --- assen, spatborden en koplampen
  for (const s of [1, -1]) {
    cyl(B, 1.0, 0.95, s * 0.9, 0.2, 0.2, 0.4, C.DARK, 10, 'z');
    cyl(B, -hl + 1.0, 0.62, s * 0.9, 0.12, 0.12, 0.5, C.DARK, 8, 'z');
    chamfBox(B, 1.0, 2.14, s * 1.2, 2.3, 0.1, 0.78, 0.04, shade(paint, 0.78));
    chamfBox(B, -hl + 1.0, 1.4, s * 1.07, 1.2, 0.08, 0.6, 0.03, shade(paint, 0.78));
    B.box(hl - 0.03, 0.85, s * (hw - 0.3), 0.04, 0.12, 0.26, C.HEADLAMP, G_LAMP);
  }
  B.box(hl + 0.07, 0.55, 0, 0.04, 0.1, 0.55, 0xe3bb1c);
  return B.build();
}

export function maaidorserWheels() { return { big: lugWheel(0.95, 0.7, { lugs: 22, diep: 0.12 }), small: lugWheel(0.62, 0.5, { lugs: 16, diep: 0.1 }) }; }

export function buildLaadmachineGeo(L, W, paint) {
  const B = new GeoBuilder(3);
  const hl = L / 2, hw = W / 2, rond = shade(paint, 0.82), licht = shade(paint, 1.1), staal = 0x4a4c50;
  // --- achterframe: motorkap met afgeronde neus, tegengewicht, rooster, uitlaat en luchtinlaat
  prism(B, [[-1.62, 0.55], [0.3, 0.55], [0.3, 1.0], [-0.55, 1.1], [-0.6, 1.5], [-1.2, 1.55], [-1.62, 1.35]], 1.3, 0, paint, 0.07);
  chamfBox(B, -1.72, 0.95, 0, 0.3, 0.8, 1.5, 0.08, shade(paint, 0.7));
  for (let k = 0; k < 6; k++) B.box(-1.88, 0.8 + k * 0.08, 0, 0.03, 0.045, 1.1, C.TRIM);
  cyl(B, -1.0, 1.85, 0.4, 0.05, 0.05, 0.6, C.DARK, 8);
  cyl(B, -1.0, 2.17, 0.4, 0.08, 0.06, 0.06, C.STEEL, 8);
  cyl(B, -0.85, 1.7, -0.45, 0.07, 0.07, 0.3, C.DARK, 8);
  for (const s of [1, -1]) {
    chamfBox(B, -0.95, 1.0, s * 0.66, 1.2, 0.5, 0.03, 0.05, licht);
    B.box(-hl - 0.0, 1.05, s * 0.55, 0.04, 0.1, 0.18, C.TAIL, G_LAMP);
    B.box(-hl + 0.02, 0.8, s * 0.55, 0.04, 0.06, 0.14, C.INDICATOR, G_LAMP);
  }
  // --- cabine op het achterframe: vloer, stoel, stuur, kooi met rondom glas en dak
  B.box(0.0, 0.66, 0, 1.15, 0.12, 1.2, 0x2a2b2e);
  seatSet(B, -0.25, 0.7, 0.0, 1);
  glassCab(B, paint, -0.55, 0.45, 0.72, 1.12, 2.1, 0.62, 0.1);
  for (const s of [1, -1]) B.box(0.35, 2.28, s * 0.4, 0.14, 0.06, 0.22, C.HEADLAMP, G_LAMP);
  cyl(B, -0.1, 2.38, 0.35, 0.06, 0.08, 0.1, 0xd88a1a, 8, "y", G_LAMP);
  for (const s of [1, -1]) { B.box(0.38, 1.7, s * 0.78, 0.04, 0.5, 0.1, C.TRIM); B.box(0.3, 1.9, s * 0.7, 0.03, 0.03, 0.14, C.TRIM); }
  B.box(0.0, 0.76, 0.66, 0.6, 0.04, 0.2, C.STEEL); // opstap
  // --- knikgewricht en voorframe tussen de wielen
  cyl(B, 0.35, 0.82, 0, 0.3, 0.3, 0.7, C.DARK, 12);
  cyl(B, 0.35, 1.2, 0, 0.36, 0.36, 0.08, paint, 12);
  prism(B, [[0.3, 0.5], [1.5, 0.5], [1.55, 0.85], [0.3, 0.95]], 0.9, 0, shade(paint, 0.75), 0.05);
  for (const s of [1, -1]) {
    cyl(B, hl - 0.85, 0.46, s * 0.45, 0.16, 0.16, 0.35, C.DARK, 8, 'z');
    cyl(B, -1.0, 0.46, s * 0.45, 0.16, 0.16, 0.35, C.DARK, 8, 'z');
    // spatborden
    chamfBox(B, hl - 0.85, 1.02, s * 0.68, 1.0, 0.07, 0.62, 0.03, shade(paint, 0.78));
    chamfBox(B, -1.0, 1.02, s * 0.68, 1.0, 0.07, 0.62, 0.03, shade(paint, 0.78));
    // laadarm: twee kniks, met steunen op het achterframe en een kruisbuis
    const a0 = [-0.15, 1.75, s * 0.8], a1 = [0.7, 1.32, s * 0.8], a2 = [1.55, 0.88, s * 0.8];
    beam(B, a0, a1, 0.18, 0.12, paint);
    beam(B, a1, a2, 0.16, 0.12, paint);
    cyl(B, a0[0], a0[1], s * 0.8, 0.09, 0.09, 0.16, C.STEEL, 8, 'z');
    cyl(B, a2[0], a2[1], s * 0.8, 0.07, 0.07, 0.16, C.STEEL, 8, 'z');
    tube(B, [0.5, 0.82, s * 0.55], [0.55, 1.28, s * 0.74], 0.05, C.CHROME, 8); // hefcilinder
    tube(B, [0.5, 0.82, s * 0.55], [0.54, 1.0, s * 0.62], 0.075, C.DARK, 8);
    B.box(0.5, 0.82, s * 0.55, 0.12, 0.12, 0.14, C.STEEL);
    B.box(hl - 0.03, 0.9, s * (W * 0.3), 0.04, 0.12, 0.22, C.HEADLAMP, G_LAMP);
    B.box(hl - 0.03, 0.74, s * (W * 0.3), 0.04, 0.06, 0.14, C.INDICATOR, G_LAMP);
  }
  B.box(0.75, 1.4, 0, 0.14, 0.14, 1.5, shade(paint, 0.7)); // dwarsbuis
  // kiepcilinder met tuimelaar naar de bak
  beam(B, [0.65, 1.42, 0], [1.4, 1.2, 0], 0.1, 0.1, C.STEEL);
  tube(B, [1.4, 1.2, 0.0], [1.78, 0.98, 0.0], 0.05, C.CHROME, 8);
  // --- de bak: profiel met bodem, rug en lip, zijplaten en een rij tanden
  const bx = 1.7;
  prism(B, [[bx - 0.05, 0.2], [bx + 0.6, 0.26], [bx + 0.7, 0.36], [bx + 0.25, 0.5], [bx + 0.15, 1.0], [bx - 0.1, 1.05], [bx - 0.12, 0.5]], 1.9, 0, 0x5a5d62, 0.04);
  for (const s of [1, -1]) prism(B, [[bx - 0.12, 0.2], [bx + 0.7, 0.28], [bx + 0.45, 0.5], [bx + 0.2, 1.05], [bx - 0.15, 1.1]], 0.06, s * 0.96, 0x3f4144, 0.015);
  for (let k = 0; k < 7; k++) B.box(bx + 0.78, 0.31, -0.78 + k * 0.26, 0.2, 0.08, 0.11, 0x2a2b2e, 0, 0, 0, -0.1);
  B.box(bx + 0.16, 0.93, 0, 0.06, 0.05, 1.8, C.STEEL);
  // --- achterframe: spatbord en ladder, lampen vooraan
  return B.build();
}

export function laadmachineWheel() { return lugWheel(0.46, 0.5, { lugs: 14, diep: 0.12 }); }
