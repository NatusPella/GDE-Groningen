// Iconische waterplekken (#23, #7): sluizen en sluisdeuren, de torens en huisjes
// van beweegbare bruggen, jachthavens, binnenvaarthavens met schepen, vuurtorens
// en de dijk- en zeewerken langs de Waddenkust en de Eemsdelta (strekdammen,
// golfbrekers, pieren, dijken, stuwen, hellingen).
// Zuiver en data-gedreven: classifyPlek leest OSM-tags, kitFor geeft een
// low-poly kit van doosjes, cilinders en kegels in een lokaal frame (x langs de
// plek, z dwars, y boven het water), tileBudget houdt de onderdelen per cel
// binnen een budget en auditPlekken telt wat er per type herkenbaar wordt.
// De wereldbouwer is scripts/world/waterplekken.mjs (-> game/waterplekken.json),
// de tekenlaag game/js/waterplekken3d.js (InstancedMesh per vorm en cel).

export const CEL = 512;   // m, de streamcel van de tekenlaag

// type -> { prio (lager = eerst behouden), cap (onderdelen per plek), kind }
export const PLEK_TYPES = {
  sluis:       { prio: 1, cap: 40, lijn: true,  label: 'sluis' },
  sluisdeur:   { prio: 2, cap: 12, lijn: true,  label: 'sluisdeur' },
  vuurtoren:   { prio: 0, cap: 14, lijn: false, label: 'vuurtoren' },
  haven:       { prio: 3, cap: 60, lijn: false, label: 'binnenvaarthaven' },
  jachthaven:  { prio: 4, cap: 50, lijn: false, label: 'jachthaven' },
  brug:        { prio: 5, cap: 14, lijn: true,  label: 'brugtoren' },
  stuw:        { prio: 6, cap: 12, lijn: true,  label: 'stuw' },
  helling:     { prio: 7, cap: 6,  lijn: true,  label: 'helling' },
  dijk:        { prio: 8, cap: 30, lijn: true,  label: 'dijkwerk' },
  golfbreker:  { prio: 8, cap: 30, lijn: true,  label: 'golfbreker' },
  pier:        { prio: 9, cap: 20, lijn: true,  label: 'pier' },
  strekdam:    { prio: 9, cap: 16, lijn: true,  label: 'strekdam' },
};

// Per cel: hoeveel onderdelen (= instanties) hooguit, en per type een bovengrens.
export const CEL_BUDGET = { onderdelen: 900, perType: { strekdam: 12, pier: 10, dijk: 8, golfbreker: 8, jachthaven: 6, haven: 4, sluis: 6, brug: 8 } };

const KLEUR = {
  beton: 0xb9b4a8, donker: 0x4a5560, hout: 0x8c6b45, paal: 0x3a2e24, steen: 0x7d7a76, basalt: 0x55575a,
  rood: 0xb8362c, wit: 0xeeece4, geel: 0xd8b13a, dak: 0x7a3b2e, gras: 0x6d8a4a, glas: 0x9ec4d8, staal: 0x6a7480,
  blauw: 0x2f5f8a, zwart: 0x24272b, groen: 0x2f6b46,
};

const tagNum = (v, d) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) && n > 0 ? n : d; };

// -> { type, sub, name } of null. `tags` = OSM-tags; node: een puntelement.
export function classifyPlek(tags, node = false) {
  if (!tags) return null;
  const t = tags;
  const name = String(t.lock_name || t.name || '').trim();
  if (t.man_made === 'lighthouse') return { type: 'vuurtoren', sub: t['seamark:type'] || 'licht', name };
  if (t.lock === 'yes' || t.waterway === 'lock') return { type: 'sluis', sub: 'kolk', name };
  if (t.waterway === 'lock_gate' || t.barrier === 'lock_gate') return { type: 'sluisdeur', sub: 'deur', name };
  const mov = t['bridge:movable'] || (t.bridge === 'movable' ? 'bascule' : '');
  if (mov) return { type: 'brug', sub: ['lift', 'swing', 'bascule'].includes(mov) ? mov : mov === 'drawbridge' ? 'bascule' : 'bascule', name };
  if (t.leisure === 'marina') return { type: 'jachthaven', sub: 'jachthaven', name };
  if (t.landuse === 'harbour' || t.waterway === 'dock' || t.waterway === 'boatyard' || t.industrial === 'port') {
    return { type: 'haven', sub: t.waterway === 'dock' ? 'dok' : t.waterway === 'boatyard' ? 'werf' : 'haven', name };
  }
  if (t.waterway === 'weir' || t.waterway === 'sluice_gate' || t.waterway === 'dam') return { type: 'stuw', sub: t.waterway, name };
  if (t.leisure === 'slipway') return { type: 'helling', sub: 'helling', name };
  if (t.man_made === 'groyne') return { type: 'strekdam', sub: 'strekdam', name };
  if (t.man_made === 'breakwater') return { type: 'golfbreker', sub: 'golfbreker', name };
  if (t.man_made === 'pier') return { type: 'pier', sub: 'pier', name };
  if (t.man_made === 'dyke') return { type: 'dijk', sub: 'dijk', name };
  return null;
}

// Middelpunt, richting en lengte van een lijn of vlak [[x,y],...]; breedte = dwarsmaat.
export function lineInfo(pts) {
  if (!pts || !pts.length) return null;
  let cx = 0, cy = 0;
  for (const p of pts) { cx += p[0]; cy += p[1]; }
  cx /= pts.length; cy /= pts.length;
  // hoofdrichting via de tweede-orde momenten (werkt voor lijnen en vlakken)
  let sxx = 0, syy = 0, sxy = 0;
  for (const p of pts) { const dx = p[0] - cx, dy = p[1] - cy; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
  const a = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const c = Math.cos(a), s = Math.sin(a);
  let lo = Infinity, hi = -Infinity, wl = Infinity, wh = -Infinity;
  for (const p of pts) {
    const u = (p[0] - cx) * c + (p[1] - cy) * s, v = -(p[0] - cx) * s + (p[1] - cy) * c;
    if (u < lo) lo = u; if (u > hi) hi = u; if (v < wl) wl = v; if (v > wh) wh = v;
  }
  // het midden van het kistje, niet het zwaartepunt: kits staan symmetrisch
  const mu = (lo + hi) / 2, mv = (wl + wh) / 2;
  return { x: cx + mu * c - mv * s, y: cy + mu * s + mv * c, a, len: hi - lo, wid: wh - wl };
}

// Vereenvoudigt een lijn tot hooguit n punten (gelijk verdeeld op index), eerste en laatste blijven.
export function decimate(pts, n = 12) {
  if (pts.length <= n) return pts.map((p) => [p[0], p[1]]);
  const out = [];
  for (let i = 0; i < n; i++) { const p = pts[Math.round(i * (pts.length - 1) / (n - 1))]; out.push([p[0], p[1]]); }
  return out;
}

const box = (x, y, z, w, h, d, c, ry = 0) => ({ s: 'box', x, y, z, w, h, d, c, ry });
const cyl = (x, y, z, r, h, c) => ({ s: 'cyl', x, y, z, w: r, h, d: r, c, ry: 0 });
const cone = (x, y, z, r, h, c) => ({ s: 'cone', x, y, z, w: r, h, d: r, c, ry: 0 });

function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

// Een binnenvaartschip aan de kade (lokaal, x = vaarrichting): romp, stuurhut, luik.
function schip(x, z, len, br, kleur, ry = 0) {
  return [
    box(x, 0.35, z, len, 1.5, br, kleur, ry),
    box(x - len * 0.38, 1.9, z, len * 0.14, 1.6, br * 0.8, KLEUR.wit, ry),
    box(x + len * 0.08, 1.2, z, len * 0.45, 0.4, br * 0.78, KLEUR.donker, ry),
  ];
}

// Onderdelen van een lijnwerk (strekdam, pier, ...) langs de punten `pts` in het lokaal
// frame van de plek: elke `stap` m een element, hooguit `cap`.
export function langsLijn(pts, p, maakt, stap, cap) {
  const out = [];
  const c = Math.cos(p.a), s = Math.sin(p.a);
  const loc = (q) => [(q[0] - p.x) * c + (q[1] - p.y) * s, -(q[0] - p.x) * s + (q[1] - p.y) * c];
  let volgende = 0, af = 0;   // volgende: afstand langs de lijn van het volgende element
  for (let i = 0; i + 1 < pts.length && out.length < cap; i++) {
    const A = loc(pts[i]), B = loc(pts[i + 1]);
    const dx = B[0] - A[0], dz = B[1] - A[1], L = Math.hypot(dx, dz);
    if (L < 1e-3) continue;
    const ang = -Math.atan2(dz, dx);
    while (volgende <= af + L && out.length < cap) {
      const k = (volgende - af) / L;
      out.push(...maakt(A[0] + dx * k, A[1] + dz * k, ang, out.length));
      volgende += stap;
    }
    af += L;
  }
  return out;
}

const langsPlek = (plek, maakt, stap, cap) => (plek.pts
  ? langsLijn(plek.pts, plek, maakt, stap, cap)
  : langsLijn([[-(plek.l || 20) / 2, 0], [(plek.l || 20) / 2, 0]], { x: 0, y: 0, a: 0 }, maakt, stap, cap));

// Lokaal kit van een plek: [{ s: 'box'|'cyl'|'cone', x, y, z, w, h, d, c, ry }] (y = onderkant boven het water).
// plek: { id, t, sub, x, y, a, l, w, h?, pts? }
export function kitFor(plek) {
  const t = plek.t, L = plek.l || 20, W = plek.w || 8, rnd = rng((plek.id | 0) + 17);
  const cap = PLEK_TYPES[t] ? PLEK_TYPES[t].cap : 0;
  let o = [];
  switch (t) {
    case 'sluis': {
      const len = Math.min(120, Math.max(24, L)), br = Math.min(14, Math.max(5, plek.w || 8));
      for (const sd of [-1, 1]) {
        o.push(box(0, 0.4, sd * (br / 2 + 0.7), len, 1.5, 1.2, KLEUR.beton));
        for (let x = -len / 2 + 3; x <= len / 2 - 2; x += 9) o.push(cyl(x, 1.1, sd * (br / 2 + 0.2), 0.22, 0.5, KLEUR.zwart));
      }
      // de deuren zelf draaien open en dicht (sluizen3d.js); hier alleen de loopbrug erover
      for (const e of [-1, 1]) o.push(box(e * len / 2, 3.2, 0, 1.2, 0.2, br + 3, KLEUR.staal));
      o.push(box(-len / 2 - 3, 1.8, br / 2 + 4, 4.5, 3.4, 3.6, KLEUR.wit), box(-len / 2 - 3, 3.9, br / 2 + 4, 5.2, 0.8, 4.3, KLEUR.dak));   // sluiswachter
      break;
    }
    case 'sluisdeur': {
      const br = Math.min(14, Math.max(4, plek.l || 8));
      for (const sd of [-1, 1]) o.push(box(0, 0.8, sd * br / 4, 0.4, 3.2, br / 2 + 0.2, KLEUR.donker, sd * 0.28));
      o.push(box(0, 3.1, 0, 1.0, 0.2, br + 2, KLEUR.staal), cyl(0, 1.8, br / 2 + 1, 0.4, 3.6, KLEUR.beton), cyl(0, 1.8, -br / 2 - 1, 0.4, 3.6, KLEUR.beton));
      break;
    }
    case 'brug': {
      const len = Math.min(40, Math.max(8, L)), zz = Math.max(3, (plek.w || 6) / 2 + 1.6);
      if (plek.sub === 'lift') {
        for (const e of [-1, 1]) for (const sd of [-1, 1]) o.push(box(e * len / 2, 5.5, sd * zz, 1.6, 12, 1.6, KLEUR.staal));
        for (const sd of [-1, 1]) o.push(box(0, 11.6, sd * zz, len + 1.6, 0.9, 1.2, KLEUR.rood));
      } else if (plek.sub === 'swing') {
        o.push(cyl(0, 0.2, 0, 1.6, 2.4, KLEUR.beton), box(0, 2.6, zz + 1, 3.2, 2.6, 3, KLEUR.wit), box(0, 4.3, zz + 1, 3.8, 0.7, 3.6, KLEUR.dak));
      } else {
        o.push(box(-len / 2 - 1.5, 2.4, zz + 1.5, 4, 3.6, 3.4, KLEUR.wit), box(-len / 2 - 1.5, 4.5, zz + 1.5, 4.6, 0.8, 4, KLEUR.dak), box(-len / 2 + 1, 1.1, -zz, 2.6, 2.2, 1.6, KLEUR.beton));
      }
      break;
    }
    case 'vuurtoren': {
      const h = Math.min(60, Math.max(14, plek.h || 22)), r0 = Math.max(1.8, h * 0.075);
      o.push(cyl(0, 0, 0, r0 * 1.45, 2.2, KLEUR.beton));
      const n = Math.max(2, Math.round(h / 6));
      for (let i = 0; i < n; i++) o.push(cyl(0, 2.2 + i * ((h - 2.2) / n), 0, r0 * (1 - 0.3 * i / n), (h - 2.2) / n, i % 2 ? KLEUR.rood : KLEUR.wit));
      o.push(cyl(0, h, 0, r0 * 0.95, 0.5, KLEUR.zwart), cyl(0, h + 0.5, 0, r0 * 0.6, r0 * 1.2, KLEUR.glas), cone(0, h + 0.5 + r0 * 1.2, 0, r0 * 0.9, r0 * 0.9, KLEUR.zwart));
      break;
    }
    case 'haven': {
      const len = Math.min(180, Math.max(30, L)), br = Math.min(60, Math.max(14, W));
      o.push(box(0, 0.35, -br / 2, len, 0.7, 1.4, KLEUR.beton));
      for (let x = -len / 2 + 5; x <= len / 2 - 4; x += 12) o.push(cyl(x, 0.7, -br / 2 + 0.6, 0.25, 0.6, KLEUR.zwart));
      // loods en silo achter de kade, een kraan op de kade, schepen ervoor
      o.push(box(-len * 0.25, 3, -br / 2 - 9, Math.min(40, len * 0.4), 6, 14, KLEUR.blauw), box(-len * 0.25, 6.3, -br / 2 - 9, Math.min(41, len * 0.4 + 1), 0.7, 14.6, KLEUR.donker));
      o.push(cyl(len * 0.22, 0, -br / 2 - 8, 3.4, 16, KLEUR.beton), cone(len * 0.22, 16, -br / 2 - 8, 3.6, 2.2, KLEUR.staal));
      o.push(box(len * 0.05, 5, -br / 2 + 2, 0.8, 10, 0.8, KLEUR.geel), box(len * 0.05 + 5, 9.8, -br / 2 + 2, 11, 0.7, 1, KLEUR.geel), box(len * 0.05 + 10, 8, -br / 2 + 2, 0.2, 3.4, 0.2, KLEUR.zwart));
      const kl = [KLEUR.blauw, KLEUR.groen, KLEUR.rood, KLEUR.donker];
      const aantal = Math.max(1, Math.min(3, Math.floor(len / 60)));
      for (let i = 0; i < aantal; i++) o.push(...schip(-len / 2 + (i + 0.5) * len / aantal, -br / 2 + 4.2, Math.min(60, len / aantal * 0.8), 6, kl[Math.floor(rnd() * kl.length)]));
      break;
    }
    case 'jachthaven': {
      const len = Math.min(120, Math.max(24, L)), br = Math.min(50, Math.max(10, W));
      o.push(box(0, 0.25, -br / 2, len, 0.5, 1.2, KLEUR.hout));
      const vingers = Math.max(2, Math.min(10, Math.floor(len / 6)));
      for (let i = 0; i < vingers; i++) {
        const x = -len / 2 + (i + 0.5) * len / vingers, fl = Math.min(14, br * 0.7);
        o.push(box(x, 0.25, -br / 2 + fl / 2, 0.9, 0.25, fl, KLEUR.hout), cyl(x, 0.5, -br / 2 + fl, 0.12, 0.8, KLEUR.paal));
        if (i + 1 < vingers) o.push(box(x + len / vingers / 2, 0.45, -br / 2 + fl * 0.45, 2, 0.8, 5.5, rnd() < 0.5 ? KLEUR.wit : KLEUR.rood, 0.04));
      }
      o.push(box(-len / 2 - 3, 1.8, -br / 2 - 3, 4, 3, 3.5, KLEUR.wit), box(-len / 2 - 3, 3.6, -br / 2 - 3, 4.6, 0.7, 4.1, KLEUR.dak));   // havenmeester
      break;
    }
    case 'stuw': {
      const len = Math.min(40, Math.max(6, L));
      o.push(box(0, 0.2, 0, 1.4, 1.0, len, KLEUR.beton));
      for (let z = -len / 2 + 2; z <= len / 2; z += 4) o.push(box(0, 2.4, z, 0.6, 3.6, 0.6, KLEUR.staal));
      o.push(box(0, 4.4, 0, 0.8, 0.3, len, KLEUR.staal));
      break;
    }
    case 'helling': {
      const len = Math.min(20, Math.max(6, L)), br = Math.max(3, W);
      o.push(box(0, 0.05, 0, len, 0.25, br, KLEUR.beton), cyl(-len / 2, 0.6, br / 2 + 0.3, 0.15, 1.2, KLEUR.paal), cyl(-len / 2, 0.6, -br / 2 - 0.3, 0.15, 1.2, KLEUR.paal));
      break;
    }
    case 'strekdam':
      o = langsPlek(plek, (x, z, ang) => [cyl(x, 0, z, 0.2, 2.8, KLEUR.paal)], 4, cap);
      break;
    case 'pier':
      o = langsPlek(plek, (x, z, ang, i) => [box(x, 0.3, z, 4.2, 0.35, 2.4, KLEUR.hout, ang), ...(i % 2 ? [] : [cyl(x, 0.2, z + 1.2, 0.15, 1, KLEUR.paal)])], 4, cap);
      break;
    case 'golfbreker':
      o = langsPlek(plek, (x, z, ang, i) => [box(x, 0.5, z, 3.4, 1.7 + (i % 3) * 0.3, 3.6, KLEUR.basalt, ang + (i % 5) * 0.2)], 3.4, cap);
      break;
    case 'dijk':
      o = langsPlek(plek, (x, z, ang) => [box(x, 0.6, z, 8, 1.2, 9, KLEUR.gras, ang)], 8, cap);
      break;
    default: return [];
  }
  return o.slice(0, cap);
}

// Kit in wereldcoordinaten: [{ s, x, y (hoogte boven water), z (= wereld y), w, h, d, ry, c }]
export function partsToWorld(plek, parts = kitFor(plek)) {
  const a = plek.a || 0, c = Math.cos(a), s = Math.sin(a);
  return parts.map((q) => ({
    s: q.s, c: q.c, w: q.w, h: q.h, d: q.d,
    x: plek.x + q.x * c - q.z * s, y: q.y, z: plek.y + q.x * s + q.z * c, ry: -a + (q.ry || 0),
  }));
}

export const celVan = (x, y) => Math.floor(x / CEL) + ',' + Math.floor(y / CEL);

// Houdt de plekken per cel binnen het budget (onderdelen en een bovengrens per type);
// de belangrijkste (prio) blijven. -> { kept, dropped: {type: n}, perCel: Map(cel -> onderdelen) }
export function tileBudget(plekken, budget = CEL_BUDGET) {
  const cellen = new Map();
  for (const p of plekken) { const k = celVan(p.x, p.y); (cellen.get(k) || cellen.set(k, []).get(k)).push(p); }
  const kept = [], dropped = {}, perCel = new Map();
  const naam = (p) => (p.n ? 0 : 1);
  for (const [k, lijst] of cellen) {
    lijst.sort((a, b) => (PLEK_TYPES[a.t]?.prio ?? 99) - (PLEK_TYPES[b.t]?.prio ?? 99) || naam(a) - naam(b) || a.id - b.id);
    let n = 0; const perType = {};
    for (const p of lijst) {
      const parts = kitFor(p).length;
      const maxT = budget.perType[p.t] ?? Infinity;
      if (!parts || n + parts > budget.onderdelen || (perType[p.t] || 0) >= maxT) { dropped[p.t] = (dropped[p.t] || 0) + 1; continue; }
      n += parts; perType[p.t] = (perType[p.t] || 0) + 1; kept.push(p);
    }
    perCel.set(k, n);
  }
  return { kept, dropped, perCel };
}

// Wat er per type herkenbaar wordt en wat ontbreekt. `ruw`: { type: aantal gevonden in de OSM-data },
// plekken: de gebouwde lijst. -> rijen { type, ruw, gebouwd, kit, herkenbaar, benoemd, ontbreekt: [redenen] }
export function auditPlekken(plekken, ruw = {}, budgetResult = null) {
  const rows = [];
  for (const type of Object.keys(PLEK_TYPES)) {
    const mine = plekken.filter((p) => p.t === type);
    const gevonden = ruw[type] ?? mine.length;
    let onderdelen = 0, herkenbaar = 0;
    for (const p of mine) { const n = kitFor(p).length; onderdelen += n; if (n >= 3) herkenbaar++; }
    const ontbreekt = [];
    if (gevonden > mine.length) ontbreekt.push(`${gevonden - mine.length} samengevoegd (dubbel) of te kort`);
    if (budgetResult && budgetResult.dropped[type]) ontbreekt.push(`${budgetResult.dropped[type]} buiten het celbudget`);
    if (mine.length && herkenbaar < mine.length) ontbreekt.push(`${mine.length - herkenbaar} met een te klein kit`);
    rows.push({ type, label: PLEK_TYPES[type].label, ruw: gevonden, gebouwd: mine.length, onderdelen, herkenbaar, benoemd: mine.filter((p) => p.n).length, ontbreekt });
  }
  return rows;
}
