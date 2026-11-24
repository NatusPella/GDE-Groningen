// De bakwagen (24-11, voertuigen-weg), opnieuw gebouwd in de vormtaal van het Quaternius-autopakket: een afgeronde kantelcabine met een
// raked voorraam, echte wielkast, deur met zijraam (echt deurgat met cabine erachter), grille met kader, rechthoekige koplampen in
// behuizingen, bumper met mistlampen, opstap en handgreep, grote spiegels op armen, zonneklep, dakspoiler en markeringslichten; een
// chassis met langsbalken, brandstoftank, assen en spatborden met spatlappen; een afgeronde laadbak met aluminium kaders, persribben,
// dubbele achterdeuren met sluitstangen, onderrijbeveiliging en achterlichten; dikke wielen met velg. Dezelfde maten, wielplekken en
// deurtabel (vehicledoors.js truck) als de oude bakwagen, zodat lading (vrachtruimte.js), zitplekken (seating3d.js) en botsmaat gelijk blijven.
// h is de gereedschapskist van models3d_vehicles.js (truckKit): bouwers voor geometrie, deuren, wielen en materialen.
import { fillet, planExtrude, cyl, bar, mirror, handle, grille, taillight, ridge } from './vehicle_kit.js';

const RAIL_DARK = 0x2a2b2d;

export function truckDims(L, W) {
  const hl = L / 2, hw = W / 2, cabL = 2.0;
  return { hl, hw, cabL, xc0: hl - cabL, boxX0: -hl, boxX1: hl - cabL - 0.1, wr: 0.52, fwx: hl - 0.85, rwx: -hl + 1.7, boxY0: 0.96, boxY1: 3.6, cabBot: 0.64, roof: 2.72, floor: 0.83 };
}

// Het chassis: langsbalken, dwarsliggers, assen, differentieel, brandstoftanks, accubak en bladveren.
function chassis(B, D, c) {
  const { hw, hl, wr } = D;
  for (const s of [1, -1]) {
    B.box(0, 0.74, s * 0.46, c.L - 0.5, 0.2, 0.12, 0x232426);
    B.box(0.2, 0.58, s * 0.46, 0.8, 0.06, 0.2, 0x2f3033);
  }
  for (const x of [-hl + 0.9, -0.8, 1.2, hl - 1.3]) B.box(x, 0.74, 0, 0.1, 0.16, c.W - 0.8, 0x2a2b2d);
  for (const x of [D.fwx, D.rwx]) cyl(B, x, wr, 0, 0.09, 0.09, c.W - 0.7, 'z', 0x3a3c3f, 8);
  B.geo(new c.THREE.SphereGeometry(0.2, 8, 6), c.composeMatrix(D.rwx, wr, 0), 0x3a3c3f);
  for (const s of [1, -1]) {
    cyl(B, -0.3, 0.55, s * (hw - 0.22), 0.3, 0.3, 1.25, 'x', 0x8f9498, 12);
    for (const dx of [-0.45, 0.45]) B.box(-0.3 + dx, 0.55, s * (hw - 0.22), 0.04, 0.68, 0.64, 0x2a2b2d);
    B.box(1.2, 0.5, s * (hw - 0.3), 0.7, 0.2, 0.26, 0x2f3033);
    B.box(D.rwx + 0.2, 0.74, s * 0.65, 1.2, 0.06, 0.1, 0x3a3c3f);
  }
}

// De laadbak: afgeronde bak met aluminium kaders, persribben, hoekstijlen, markeringslichten, spatborden en zijbeveiliging, en de
// achterkant met dubbele deuren, scharnieren, sluitstangen, onderrijbeveiliging, achterlichten en kenteken.
function laadbak(B, D, c) {
  const { hw, hl, wr, boxX0, boxX1 } = D, { h, K, G, W } = c;
  const bc = c.wrecked ? c.paint : 0xeeeee8, alu = c.wrecked ? c.paint : 0xa7adb3, dark = RAIL_DARK;
  const bx = (boxX0 + boxX1) / 2, bl = boxX1 - boxX0;
  const arch = h.archedSill(boxX0, boxX1, D.boxY0, [{ x: D.rwx, r: wr + 0.1, cy: wr }]);
  const poly = [[boxX0, D.boxY1], [boxX1, D.boxY1], [boxX1, D.boxY0 + 0.02], ...arch.slice().reverse(), [boxX0, D.boxY0 + 0.02]];
  const rad = [0.12, 0.12, 0.05, ...arch.map(() => 0), 0.05, 0];
  B.geo(h.extrudeProfile(fillet(poly, rad.slice(0, poly.length), 3), W, 0.07, 2), null, bc);
  const nRib = Math.max(3, Math.round(bl / 0.62));
  for (const s of [1, -1]) {
    for (let i = 1; i < nRib; i++) {
      const x = boxX0 + (bl * i) / nRib;
      if (Math.abs(x - D.rwx) < wr + 0.2) continue;
      ridge(B, x, 2.3, s * hw, 0.05, 2.5, 0.022, h.shadeHex(bc, 0.86), s);
    }
    ridge(B, bx, D.boxY1 - 0.14, s * hw, bl - 0.1, 0.1, 0.03, alu, s);
    for (const x of [boxX0 + 0.06, boxX1 - 0.06]) ridge(B, x, (D.boxY0 + D.boxY1) / 2 + 0.1, s * hw, 0.1, D.boxY1 - D.boxY0 - 0.3, 0.03, alu, s);
    for (const x of [boxX0 + 0.5, bx - 1.3, bx + 0.3, boxX1 - 0.5]) ridge(B, x, D.boxY0 + 0.3, s * hw, 0.14, 0.06, 0.022, K.INDICATOR, s, G.LAMP);
    ridge(B, boxX1 - 0.2, D.boxY1 - 0.34, s * hw, 0.14, 0.06, 0.022, K.INDICATOR, s, G.LAMP);
    B.box(D.rwx - wr - 0.18, 0.4, s * (hw - 0.34), 0.03, 0.46, 0.46, 0x151516);
    const sx0 = D.rwx + 0.65, sx1 = D.fwx - 0.8;
    for (const y of [0.74, 0.91]) B.box((sx0 + sx1) / 2, y, s * (hw - 0.08), sx1 - sx0, 0.08, 0.04, dark);
  }
  B.box(bx, D.boxY1 + 0.012, 0, bl - 0.12, 0.03, W - 0.1, h.shadeHex(bc, 0.92));
  const dw = W / 2 - 0.07;
  for (const s of [1, -1]) {
    B.box(-hl - 0.012, 2.25, s * (W / 4 + 0.005), 0.02, 2.5, dw, h.shadeHex(bc, 0.95));
    for (const y of [1.25, 2.25, 3.25]) B.box(-hl - 0.03, y, s * (hw - 0.07), 0.04, 0.1, 0.07, dark);
    for (const z of [0.22, 0.72]) {
      cyl(B, -hl - 0.045, 2.25, s * z, 0.018, 0.018, 2.5, 'y', alu, 6);
      B.box(-hl - 0.07, 1.6, s * z + (s > 0 ? -0.08 : 0.08), 0.03, 0.035, 0.18, dark);
      for (const y of [1.02, 3.48]) B.box(-hl - 0.045, y, s * z, 0.05, 0.05, 0.06, dark);
    }
    B.box(-hl + 0.33, 0.62, s * 0.62, 0.42, 0.06, 0.06, dark);
    taillight(B, -hl - 0.006, 1.05, s * (hw - 0.14), 0.5, K, 0.2);
    B.box(-hl - 0.016, 0.82, s * (hw - 0.14), 0.02, 0.07, 0.12, K.HEADLAMP, G.LAMP);
    for (let i = 0; i < 3; i++) B.box(-hl + 0.059, 0.52, s * (0.2 + i * 0.35), 0.006, 0.08, 0.16, i % 2 ? 0xf2efe4 : 0xc8102e);
  }
  B.box(-hl + 0.12, 0.5, 0, 0.12, 0.13, W - 0.2, dark);
  B.box(-hl - 0.012, 0.7, 0, 0.012, 0.1, 0.48, K.PLATE);
}

// De cabine: afgeronde kantelcabine met wielkast, dakspoiler, raked voorraam met stijlen, zonneklep en wissers, het zijraam in de deur,
// deurgreep, treden, handgreep, spiegels, markeringslichten, grille, koplampen, bumper, het interieur en de uitlaat.
function cabine(B, D, c) {
  const { hw, hl, wr, xc0 } = D, { h, K, G, W, paint } = c;
  const cz = W / 2 - 0.025, dark = RAIL_DARK, dx = hl - 1.05; // dx: het midden van de deur (deurtabel: 3,2 m van het midden)
  const arch = h.archedSill(xc0, hl, D.cabBot, [{ x: D.fwx, r: wr + 0.09, cy: wr }]);
  const top = [[xc0, D.roof, 0.12], [hl - 0.4, D.roof, 0.16], [hl - 0.04, 1.84, 0.1], [hl, 1.78, 0.08], [hl, D.cabBot + 0.02, 0.08]];
  const poly = [...top.map((p) => [p[0], p[1]]), ...arch.slice().reverse(), [xc0, D.cabBot + 0.02]];
  const rad = [...top.map((p) => p[2]), ...arch.map(() => 0), 0];
  B.geo(h.extrudeProfile(fillet(poly, rad, 3), cz * 2, 0.1, 2), null, paint);
  B.geo(h.extrudeProfile(fillet([[hl - 0.5, D.roof], [xc0 + 0.02, 3.38], [xc0 + 0.02, D.roof]], [0, 0.1, 0], 2), W - 0.5, 0.05, 2), null, h.shadeHex(paint, 0.9));
  const a = [hl - 0.05, 1.9], b = [hl - 0.4, D.roof - 0.1], len = Math.hypot(a[0] - b[0], a[1] - b[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  B.box((a[0] + b[0]) / 2 + 0.01, (a[1] + b[1]) / 2, 0, len, 0.03, W - 0.62, K.GLASS, G.GLASS, 0, 0, ang);
  B.box(b[0] - 0.02, b[1] + 0.07, 0, 0.18, 0.1, W - 0.4, h.shadeHex(paint, 0.62), 0, 0, 0, ang - 0.4);
  for (const s of [1, -1]) {
    bar(B, [a[0] + 0.02, a[1] - 0.02, s * (cz - 0.23)], [b[0] + 0.03, b[1] + 0.02, s * (cz - 0.23)], 0.09, h.shadeHex(paint, 0.82));
    bar(B, [a[0] - 0.02, a[1] + 0.1, s * 0.14], [a[0] - 0.12, a[1] + 0.62, s * 0.62], 0.014, 0x1d1e20);
    const zg = s * (cz + 0.014);
    B.box(dx, 2.12, s * (cz + 0.004), 0.92, 0.66, 0.012, 0x20272c);
    B.box(dx, 2.12, zg + s * 0.012, 0.92, 0.66, 0.028, K.GLASS, G.GLASS);
    B.box(dx, 2.5, s * (cz + 0.012), 1.0, 0.06, 0.03, 0x1d1e20);
    B.box(dx, 1.76, s * (cz + 0.012), 1.0, 0.06, 0.03, 0x1d1e20);
    handle(B, dx - 0.4, 1.55, s * cz, s, K);
    for (const y of [0.55, 0.9]) B.box(xc0 + 0.3, y, s * (cz + 0.08), 0.5, 0.05, 0.2, 0x3a3c3f);
    cyl(B, dx + 0.5, 1.75, s * (cz + 0.04), 0.022, 0.022, 0.9, 'y', K.CHROME, 6);
    mirror(B, hl - 0.28, 2.1, s * cz, s, paint, K, 0.32);
    B.box(hl - 0.06, D.roof - 0.1, s * (cz - 0.25), 0.04, 0.07, 0.12, K.INDICATOR, G.LAMP);
  }
  for (let i = -2; i <= 2; i++) B.box(hl - 0.55, D.roof + 0.02, i * 0.28, 0.1, 0.06, 0.1, K.INDICATOR, G.LAMP);
  grille(B, hl + 0.012, 1.3, W * 0.5, 0.62, 6, K);
  cyl(B, hl + 0.05, 1.5, 0, 0.07, 0.07, 0.02, 'x', K.CHROME, 8);
  for (const s of [1, -1]) {
    B.box(hl - 0.01, 1.2, s * (hw - 0.34), 0.06, 0.26, 0.4, 0x1e1f21);
    B.box(hl + 0.03, 1.22, s * (hw - 0.34), 0.03, 0.16, 0.32, K.HEADLAMP, G.LAMP);
    B.box(hl + 0.02, 0.98, s * (hw - 0.34), 0.03, 0.07, 0.3, K.INDICATOR, G.LAMP);
    cyl(B, hl + 0.06, 0.58, s * (hw - 0.45), 0.07, 0.07, 0.05, 'x', K.HEADLAMP, 8, G.LAMP);
  }
  B.geo(planExtrude(fillet([[hl + 0.12, -(hw - 0.2)], [hl + 0.12, hw - 0.2], [hl - 0.1, hw - 0.05], [hl - 0.4, hw - 0.05], [hl - 0.4, -(hw - 0.05)], [hl - 0.1, -(hw - 0.05)]], [0.1, 0.1, 0.06, 0, 0, 0.06], 2), 0.42, 0.26, 0.03, 1), null, dark);
  B.box(hl + 0.14, 0.52, 0, 0.012, 0.11, 0.5, K.PLATE);
  cyl(B, hl + 0.1, 0.4, 0.5, 0.03, 0.03, 0.14, 'x', K.CHROME, 6);
  const I = c.I; // het interieur is een eigen mesh (interieurSimpel): weg op de lagere niveaus en met de echte cabine (cabin3d.js)
  const icx = hl - D.cabL / 2;
  const ix0 = xc0 + 0.07, ix1 = hl - 0.34; // de binnenbak blijft achter het raked voorraam
  h.binnenDoos(I, (ix0 + ix1) / 2, 1.72, 0, ix1 - ix0, 1.16, W - 0.34, 0x3a3c40); // de vloer ligt op drempelhoogte van de deur, boven de wielkast
  I.box((ix0 + ix1) / 2, 1.15, 0, ix1 - ix0 - 0.02, 0.02, W - 0.4, 0x45474c);
  I.box((ix0 + ix1) / 2, 2.27, 0, ix1 - ix0 - 0.02, 0.02, W - 0.4, 0x6f737a); // het plafond van de cabine
  for (const s of [1, -1]) {
    I.box(hl - 1.05, 1.27, s * 0.5, 0.5, 0.12, 0.5, 0x4d515c); // boven de wielkast (de kast loopt tot 1,13 m)
    I.box(hl - 1.33, 1.62, s * 0.5, 0.1, 0.6, 0.5, 0x4d515c);
    I.box(hl - 1.36, 2.02, s * 0.5, 0.08, 0.16, 0.3, 0x3a3d44);
  }
  I.box(hl - 0.5, 1.62, 0, 0.35, 0.3, W - 0.3, 0x2b2d32);
  I.geo(new c.THREE.TorusGeometry(0.2, 0.025, 5, 12), c.composeMatrix(hl - 0.75, 1.62, -0.5, 0, Math.PI / 2 - 0.9, 0), 0x1a1b1d);
  cyl(B, xc0 - 0.06, 2.0, hw - 0.14, 0.07, 0.07, 2.5, 'y', K.CHROME, 8);
  for (const y of [1.2, 2.0, 2.8]) B.box(xc0 - 0.04, y, hw - 0.14, 0.05, 0.06, 0.18, dark);
  B.box(xc0 - 0.06, 3.28, hw - 0.14, 0.2, 0.05, 0.1, 0x6b6e72, 0, 0, 0, 0.5);
}

export function buildBakwagen(v, h) {
  const { THREE, GeoBuilder, composeMatrix, K, G } = h;
  const L = v.model.len, W = v.model.wid;
  const D = truckDims(L, W), { hw, wr } = D;
  const wrecked = !!v.wrecked;
  const paint = wrecked ? h.WRECKED_COLOR : h.toHex(v.model.color, 0xe8e6e0);
  const geo = h.cached(`truck4|${L}|${W}|${paint}`, () => {
    const B = new GeoBuilder(3);
    const I = new GeoBuilder(1);
    const c = { THREE, composeMatrix, h, K, G, L, W, paint, wrecked, I };
    chassis(B, D, c);
    laadbak(B, D, c);
    cabine(B, D, c);
    h.addDoorCuts(B, 'truck', L, hw, paint, K.CHROME, true);
    const k = h.knipDeurgaten(B, 'truck', L, W);
    const g = B.build();
    g.userData.interieurGeo = I.build();
    g.userData.knip = { ...h.deurSchillen(k, L), rects: k.rects, zs: k.zs };
    return g;
  });
  const mats = h.vehicleMaterials(wrecked);
  const group = new THREE.Group();
  const body = new THREE.Mesh(geo, mats);
  group.add(body);
  group.userData.body = body;
  group.userData.lodMax = 1500; // niveau 1 (vehiclelod3d.js)
  h.koppelDeurgaten(group, body, geo);
  h.voegInterieurToe(group, body, geo);
  const wFront = h.cached(`wheel2|${wr}|0.34`, () => h.richWheelGeometry(wr, 0.34, K));
  const wRear = h.cached(`wheel2|${wr}|0.46`, () => h.richWheelGeometry(wr, 0.46, K));
  const wheels = [], front = [];
  for (const s of [1, -1]) {
    front.push(h.addWheel(group, wFront, mats[0], D.fwx, wr, s * (hw - 0.3), wheels));
    h.addWheel(group, wRear, mats[0], D.rwx, wr, s * (hw - 0.3), wheels);
  }
  group.userData.wheels = wheels;
  group.userData.frontWheels = front;
  group.userData.wheelRadius = wr;
  return group;
}
