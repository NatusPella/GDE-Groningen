// Herkenbare plekken op het land (#21, #23, #164, #198): perrons bij stations, schoorstenen,
// zendmasten, monumenten en kruisen, en parken. Het zusje van waterplekken.js: zuiver en
// data-gedreven. classifyLand leest OSM-tags, kitFor geeft een low-poly kit van doosjes,
// cilinders en kegels in een lokaal frame (x langs de plek, z dwars, y boven de grond),
// tileBudget houdt de onderdelen per cel binnen een budget, en auditLand telt per type en
// per streek wat er herkenbaar wordt. De wereldbouwer is scripts/world/streekplekken.mjs
// (-> game/streekplekken.json), de tekenlaag game/js/streekplekken3d.js (InstancedMesh per vorm).
import { lineInfo, decimate, langsLijn, partsToWorld as partsNaarWereld, CEL, celVan } from './waterplekken.js';
import { streekAt, STREKEN } from './regioleven.js';

export { lineInfo, decimate, CEL, celVan };

// type -> { prio (lager = eerst behouden), cap (onderdelen per plek), min (kleinste kit dat telt) }
export const LAND_TYPES = {
  perron:      { prio: 0, cap: 40, label: 'perron' },
  schoorsteen: { prio: 1, cap: 12, label: 'schoorsteen' },
  mast:        { prio: 1, cap: 22, label: 'zendmast' },
  monument:    { prio: 2, cap: 20, label: 'monument of kruis' },
  park:        { prio: 3, cap: 80, label: 'park' },
};

// Per cel: hoeveel onderdelen (= instanties) hooguit, en per type een bovengrens.
export const LAND_BUDGET = { onderdelen: 700, perType: { perron: 6, schoorsteen: 4, mast: 3, monument: 8, park: 4 } };

const KLEUR = {
  beton: 0xb9b4a8, donker: 0x4a5560, hout: 0x8c6b45, steen: 0xa8a39c, baksteen: 0xa5523a, rood: 0xb8362c, wit: 0xeeece4,
  geel: 0xd8b13a, staal: 0x6a7480, zwart: 0x24272b, blad: 0x4f7a3c, blad2: 0x6b8f43, stam: 0x6a4a2e, gras: 0x7da356, blauw: 0x2f5f8a,
};

const tagNum = (v, d) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) && n > 0 ? n : d; };

// -> { type, sub, name } of null. `tags` = OSM-tags.
export function classifyLand(tags) {
  if (!tags) return null;
  const t = tags;
  const name = String(t.name || '').trim();
  if ((t.railway === 'platform' || (t.public_transport === 'platform' && t.train === 'yes')) && t.disused !== 'yes') {
    return { type: 'perron', sub: t.covered === 'yes' || t.shelter === 'yes' ? 'overkapt' : 'open', name };
  }
  if (t.man_made === 'chimney') return { type: 'schoorsteen', sub: t.material === 'brick' ? 'baksteen' : 'beton', name };
  if (t.man_made === 'mast' || t.man_made === 'communications_tower' || t['tower:type'] === 'communication') {
    return { type: 'mast', sub: t.man_made === 'communications_tower' || t['tower:type'] === 'communication' ? 'toren' : 'mast', name };
  }
  if (t.historic === 'wayside_cross' || t.historic === 'wayside_shrine') return { type: 'monument', sub: 'kruis', name };
  if (t.man_made === 'obelisk') return { type: 'monument', sub: 'obelisk', name };
  if (t.historic === 'monument' || t.historic === 'memorial') {
    // een plaquette, struikelsteen of spookfiets is een tegel in de stoep, geen zuil van vijf meter (#419)
    if (['plaque', 'stolperstein', 'ghost_bike', 'bench', 'plate'].includes(t.memorial)) return { type: 'monument', sub: 'plaquette', name };
    return { type: 'monument', sub: t.memorial === 'statue' || t.memorial === 'bust' ? 'beeld' : 'zuil', name };
  }
  if (t.leisure === 'park' || (t.leisure === 'garden' && t.access !== 'private') || (t.landuse === 'recreation_ground' && name)) {
    return { type: 'park', sub: t.leisure === 'garden' ? 'tuin' : 'park', name };
  }
  return null;
}

function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const box = (x, y, z, w, h, d, c, ry = 0) => ({ s: 'box', x, y, z, w, h, d, c, ry });
const cyl = (x, y, z, r, h, c) => ({ s: 'cyl', x, y, z, w: r, h, d: r, c, ry: 0 });
const cone = (x, y, z, r, h, c) => ({ s: 'cone', x, y, z, w: r, h, d: r, c, ry: 0 });

// Een boom: stam en kegelkroon (y = onderkant).
const boom = (x, z, h, c) => [cyl(x, 0, z, 0.18 + h * 0.02, h * 0.4, KLEUR.stam), cone(x, h * 0.3, z, h * 0.32, h * 0.7, c)];

// Lokaal kit van een plek: [{ s, x, y, z, w, h, d, c, ry }] (y = onderkant boven de grond).
// plek: { id, t, sub, x, y, a, l, w, h?, pts? }
export function kitFor(plek) {
  const t = plek.t, L = plek.l || 10, W = plek.w || 4, rnd = rng((plek.id | 0) + 29);
  const cap = LAND_TYPES[t] ? LAND_TYPES[t].cap : 0;
  const o = [];
  switch (t) {
    case 'perron': {
      const len = Math.min(220, Math.max(20, L)), br = Math.min(8, Math.max(2.5, Math.min(W, 8)));
      o.push(box(0, 0, 0, len, 0.9, br, KLEUR.beton));
      o.push(box(0, 0.9, br / 2 - 0.35, len, 0.02, 0.7, KLEUR.geel));   // veiligheidsstrook
      const stap = len > 90 ? 40 : 30;
      for (let x = -len / 2 + 8; x <= len / 2 - 6; x += 24) o.push(cyl(x, 0.9, -br / 2 + 0.4, 0.07, 4.2, KLEUR.donker), box(x, 4.4, -br / 2 + 0.4, 1.4, 0.18, 0.5, KLEUR.wit));   // lantaarns
      if (plek.sub === 'overkapt' || len >= 60) {
        const dl = Math.min(len * 0.5, 40);
        o.push(box(0, 3.4, -br / 2 + 1.2, dl, 0.25, Math.min(br - 0.6, 3.4), KLEUR.donker));
        for (const sx of [-1, 1]) o.push(cyl(sx * (dl / 2 - 0.5), 0.9, -br / 2 + 1.2, 0.1, 2.6, KLEUR.donker));
        o.push(box(0, 1.2, -br / 2 + 0.7, Math.min(5, dl * 0.4), 0.45, 0.9, KLEUR.hout));   // bank
      }
      for (let x = -len / 2 + stap; x < len / 2 - 10; x += stap) o.push(box(x, 0.9, br / 2 - 1.2, 0.2, 2.2, 1.0, KLEUR.blauw));   // bordje
      o.push(box(len / 2 - 0.4, 0.9, 0, 0.8, 0.5, br, KLEUR.donker));   // eindstuk
      break;
    }
    case 'schoorsteen': {
      const h = Math.min(120, Math.max(14, plek.h || 40)), r0 = Math.max(0.9, h * 0.04);
      const n = Math.max(3, Math.min(8, Math.round(h / 8)));
      const kl = plek.sub === 'baksteen' ? KLEUR.baksteen : KLEUR.beton;
      o.push(cyl(0, 0, 0, r0 * 1.5, 1.2, KLEUR.steen));
      for (let i = 0; i < n; i++) o.push(cyl(0, 1.2 + i * ((h - 1.2) / n), 0, r0 * (1.2 - 0.4 * i / n), (h - 1.2) / n, kl));
      o.push(cyl(0, h, 0, r0 * 0.9, 0.5, KLEUR.zwart));
      if (h >= 50) for (let i = 0; i < 2; i++) o.push(cyl(0, h - 4 - i * 6, 0, r0 * 0.85, 1.4, KLEUR.rood));
      break;
    }
    case 'mast': {
      const h = Math.min(140, Math.max(15, plek.h || 45)), r0 = Math.max(0.35, h * 0.01);
      const n = Math.max(3, Math.round(h / 10));
      for (let i = 0; i < n; i++) o.push(cyl(0, i * (h / n), 0, r0 * (1.5 - i / n), h / n, i % 2 ? KLEUR.rood : KLEUR.wit));
      o.push(cyl(0, h, 0, r0 * 0.3, 4, KLEUR.staal));
      for (let k = 0; k < 3; k++) o.push(box(Math.cos(k * 2.1) * r0 * 2.6, h * (0.72 + k * 0.08), Math.sin(k * 2.1) * r0 * 2.6, 0.5, 2.2, 0.5, KLEUR.staal, k * 2.1));
      o.push(box(0, 0, 0, 3.4, 2.2, 3.4, KLEUR.donker), box(0, h * 0.62, 0, r0 * 5, 0.25, r0 * 5, KLEUR.staal), cyl(r0 * 2.2, h * 0.7, 0, r0 * 0.9, 0.3, KLEUR.wit));   // techniekkast aan de voet, platform en schotel
      break;
    }
    case 'monument': {
      // een plaquette, en een zuil als punt zonder hoogte (in de data staan zo ook de gedenktekens in de Folkingestraat), is een
      // laag steentje van een meter; het plein van acht meter en de grote zuil zijn er alleen voor echte, hoge monumenten (#419)
      if (plek.sub === 'plaquette' || (plek.sub === 'zuil' && !plek.h && !(plek.l > 0))) {
        o.push(box(0, 0, 0, 0.5, 0.12, 0.5, 0x9a8f80), box(0, 0.12, 0, 0.36, 0.55, 0.16, KLEUR.steen), box(0, 0.67, 0, 0.42, 0.06, 0.2, KLEUR.beton));
        break;
      }
      const h = Math.min(30, Math.max(4, plek.h || (plek.sub === 'kruis' ? 4.5 : plek.sub === 'obelisk' ? 12 : 5.5)));
      // een plein van klinkers met vier paaltjes, zodat het monument ook van ver als plek leest
      o.push(box(0, 0, 0, 8, 0.12, 8, 0x9a8f80));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) o.push(cyl(sx * 3.6, 0.12, sz * 3.6, 0.14, 0.9, KLEUR.zwart));
      if (plek.sub === 'kruis') {
        o.push(box(0, 0.12, 0, 1.8, 0.7, 1.8, KLEUR.steen), box(0, 0.82, 0, 0.45, h, 0.45, KLEUR.steen), box(0, 0.82 + h * 0.65, 0, 0.45, 0.45, 1.6, KLEUR.steen, Math.PI / 2));
      } else if (plek.sub === 'obelisk') {
        o.push(box(0, 0.12, 0, 3.2, 1.0, 3.2, KLEUR.steen), box(0, 1.12, 0, 2.0, h * 0.8, 2.0, KLEUR.beton), cone(0, 1.12 + h * 0.8, 0, 1.4, h * 0.2 + 1.2, KLEUR.beton));
      } else if (plek.sub === 'beeld') {
        o.push(box(0, 0.12, 0, 2.6, 2.0, 2.6, KLEUR.steen), cyl(0, 2.12, 0, 0.7, 1.9, KLEUR.donker), cyl(0, 4.0, 0, 0.42, 0.7, KLEUR.donker), cone(0, 4.7, 0, 0.5, 0.6, KLEUR.donker));
      } else {
        o.push(box(0, 0.12, 0, 2.8, 0.8, 2.8, KLEUR.steen), box(0, 0.92, 0, 1.5, h - 0.9, 1.5, KLEUR.beton), box(0, h, 0, 2.0, 0.4, 2.0, KLEUR.steen));
      }
      break;
    }
    case 'park': {
      // heggen langs de rand, een zandpad met een kruising, een vijver, banken, lantaarns en bomen
      const len = Math.min(90, Math.max(12, L)) * 0.9, br = Math.min(70, Math.max(8, W)) * 0.9;
      o.push(box(0, 0, 0, len, 0.04, Math.min(2.4, br * 0.3), 0xc9b98f), box(0, 0, 0, Math.min(2.4, len * 0.3), 0.04, br * 0.9, 0xc9b98f));
      if (len > 24 && br > 16) {
        for (const sz of [-1, 1]) o.push(box(0, 0, sz * br / 2, len * 0.9, 1.0, 0.9, KLEUR.blad));
        o.push(box(len * 0.22, 0, br * 0.18, Math.min(14, len * 0.25), 0.07, Math.min(9, br * 0.25), 0x5d8fb0));
      }
      const bomen = Math.min(Math.floor((cap - 14) / 2), Math.max(4, Math.round(len * br / 200)));
      for (let i = 0; i < bomen; i++) {
        const x = (rnd() - 0.5) * len, z = (rnd() - 0.5) * br;
        if (Math.abs(z) < 2.4 || Math.abs(x) < 2.4) continue;
        o.push(...boom(x, z, 6 + rnd() * 6, rnd() < 0.5 ? KLEUR.blad : KLEUR.blad2));
      }
      for (const [sx, sz] of [[-0.2, 1], [0.2, -1], [-0.35, -1]]) o.push(box(len * sx, 0.3, sz * 2.0, 1.8, 0.45, 0.5, KLEUR.hout), cyl(len * sx + 3, 0, sz * 2.4, 0.08, 3.4, KLEUR.donker));
      break;
    }
    default: return [];
  }
  return o.slice(0, cap);
}

// Kit in wereldcoordinaten (de eigen kitFor, niet die van de waterplekken).
export const partsToWorld = (plek, parts = kitFor(plek)) => partsNaarWereld(plek, parts);

// Houdt de plekken per cel binnen het budget; de belangrijkste (prio, benoemde) blijven.
// -> { kept, dropped: {type: n}, perCel: Map(cel -> onderdelen) }
export function tileBudget(plekken, budget = LAND_BUDGET) {
  const cellen = new Map();
  for (const p of plekken) { const k = celVan(p.x, p.y); (cellen.get(k) || cellen.set(k, []).get(k)).push(p); }
  const kept = [], dropped = {}, perCel = new Map();
  for (const [k, lijst] of cellen) {
    lijst.sort((a, b) => (LAND_TYPES[a.t]?.prio ?? 99) - (LAND_TYPES[b.t]?.prio ?? 99) || (a.n ? 0 : 1) - (b.n ? 0 : 1) || a.id - b.id);
    let n = 0; const perType = {};
    for (const p of lijst) {
      const parts = kitFor(p).length;
      if (!parts || n + parts > budget.onderdelen || (perType[p.t] || 0) >= (budget.perType[p.t] ?? Infinity)) { dropped[p.t] = (dropped[p.t] || 0) + 1; continue; }
      n += parts; perType[p.t] = (perType[p.t] || 0) + 1; kept.push(p);
    }
    perCel.set(k, n);
  }
  return { kept, dropped, perCel };
}

// Punt in een vlak [[x,y],...] (even-oneven), voor de controle van monumenten in gebouwen en parken in water.
export function puntInVlak(x, y, pts) {
  let bin = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) bin = !bin;
  }
  return bin;
}

export const streekId = (x, y) => { const s = streekAt(x, y); return s ? s.id : 'elders'; };
export const STREEK_IDS = [...STREKEN.map((s) => s.id), 'elders'];

// Tellingen per type en per streek: { type: { streek: { gevonden, herkenbaar, benoemd } } }.
// `gevonden` = OSM-elementen (ruw), per streek niet bekend, dus alleen het totaal in `ruw`.
export function auditLand(plekken, ruw = {}, budgetResult = null) {
  const rows = [], perStreek = {};
  for (const type of Object.keys(LAND_TYPES)) {
    const mine = plekken.filter((p) => p.t === type);
    perStreek[type] = {};
    let herkenbaar = 0, onderdelen = 0;
    for (const p of mine) {
      const n = kitFor(p).length, ok = n >= 3;
      onderdelen += n; if (ok) herkenbaar++;
      const s = (perStreek[type][streekId(p.x, p.y)] ||= { plekken: 0, herkenbaar: 0, benoemd: 0 });
      s.plekken++; if (ok) s.herkenbaar++; if (p.n) s.benoemd++;
    }
    const ontbreekt = [];
    const gevonden = ruw[type] ?? mine.length;
    if (gevonden > mine.length) ontbreekt.push(`${gevonden - mine.length} samengevoegd (dubbel) of te klein`);
    if (budgetResult && budgetResult.dropped[type]) ontbreekt.push(`${budgetResult.dropped[type]} buiten het celbudget`);
    rows.push({ type, label: LAND_TYPES[type].label, ruw: gevonden, gebouwd: mine.length, onderdelen, herkenbaar, benoemd: mine.filter((p) => p.n).length, ontbreekt });
  }
  return { rows, perStreek };
}

// Drempels die alleen kunnen dalen (het ratelmodel): `max` per soort/streek hoeveel er hooguit
// zonder kit mag zijn (of in de ruwe lijst ontbreken), `min` hoeveel er minstens herkenbaar moet zijn.
// Geeft een lijst overtredingen terug (leeg = goed). Een lagere `max` of hogere `min` aanscherpen
// kan altijd; versoepelen hoort bewust te blijken uit de diff van het drempelbestand.
export function checkDrempels(telling, drempels) {
  const bad = [];
  for (const [soort, perStreek] of Object.entries(drempels.min || {})) {
    for (const [streek, min] of Object.entries(perStreek)) {
      const v = telling[soort]?.[streek] ?? 0;
      if (v < min) bad.push(`${soort} in ${streek}: ${v} herkenbaar, minstens ${min}`);
    }
  }
  for (const [soort, perStreek] of Object.entries(drempels.max || {})) {
    for (const [streek, max] of Object.entries(perStreek)) {
      const v = telling[soort]?.[streek] ?? 0;
      if (v > max) bad.push(`${soort} in ${streek}: ${v} zonder kit, hooguit ${max}`);
    }
  }
  return bad;
}

// Drempels uit een telling afleiden (voor het eerste bestand of het aanscherpen): min = het huidige
// aantal herkenbaar, max = het huidige aantal zonder kit.
export function drempelsUit(herkenbaar, zonderKit) {
  return { v: 1, min: herkenbaar, max: zonderKit };
}

// Gebruikt door de kopstukken-audit: de kandidaten uit game/landmarkkits.json per soort en streek.
// landmarkParams komt van landmarkkit.js (hier doorgegeven, zodat deze module three-vrij blijft).
export function telKandidaten(items, landmarkParams) {
  const herkenbaar = {}, zonderKit = {};
  for (const it of items) {
    const sk = streekId(it.x, it.y);
    const p = landmarkParams(it);
    const doel = p ? herkenbaar : zonderKit;
    (doel[it.k] ||= {})[sk] = (doel[it.k][sk] || 0) + 1;
  }
  return { herkenbaar, zonderKit };
}

export { langsLijn, tagNum };
