// Kleding-clipping: bouwt een figuur met de echte modelbouwers en meet hoe diep kledinglagen door het lichaam of door elkaar steken.
// Gebruikt door scripts/kleding_clipping_audit.mjs (rapport) en scripts/kleding_clipping_test.mjs (permanente test).
//
// METHODE (vastgelegd in docs/KLEDING-CLIPPING-22-11.md)
//  - De bouwer (models3d_people.js) legt met personProbe.layers vast welke driehoeken bij welk stuk horen (laag: hat, hair, glasses, top, ...).
//    De geometrie is de rustpose in modelruimte, ongeschaald; de lichaamsvorm (smal/breed/lang/kort) werkt via L.build in de ringen en via
//    een uniforme groepsschaal. Het hoofd is bij elke vorm gelijk, torso en ledematen niet.
//  - Hoofd: het hoofd is een analytische ellipsoide (headShape, met de afplatting van kin en achterhoofd). Dieptemeting van een punt = hoeveel
//    mm het binnen die ellipsoide ligt, radiaal gemeten vanuit het hoofdcentrum. De werkelijke kop is een 9x7-veelvlak dat binnen die
//    ellipsoide ligt, dus de meting is streng (conservatief) voor 'steekt het hoofd erdoor'.
//  - Laag over laag: raycasting vanuit een centrum (hoofd: punt; romp: verticale as; arm: lijn door de arm) naar een punt van de binnenste
//    laag; de buitenste laag geeft de straal waarop haar of huid hoort te blijven. Diepte = hoeveel mm de binnenste laag buiten de buitenste
//    steekt (of bij 'bedekt': hoeveel mm een kenmerk onder de buitenste laag ligt).
//  - Alle diepten zijn in meter; de drempels staan in kleding_clipping_audit.mjs en de test.
import '../node3d.mjs';
import { pathToFileURL } from 'node:url';
import { resolve, sep } from 'node:path';

const THREE = await import('three');
// GDE_CLIP_JS wijst naar een andere kopie van game/js (voor de meting 'voor' een fix, zie het rapport)
const JS = process.env.GDE_CLIP_JS ? pathToFileURL(`${resolve(process.env.GDE_CLIP_JS)}${sep}`).href : new URL('../../game/js/', import.meta.url).href;
const P = await import(JS + 'models3d_people.js');
const C = await import(JS + 'clothing.js');
const D = await import(JS + 'clothingdata.js');
const H = await import(JS + 'clothinghair.js');
const K = await import(JS + 'clothingkit.js');

P.personProbe.layers = true;
export const { HEAD_Y, SHOULDER_Y, CHEST_Y, UPPER_ARM } = P.PERSON_RIG;
export { P, C, D, H, K, THREE };

export const BODIES = H.BODY_IDS;
export const HAIRS = H.HAIR_STYLE_IDS;

// ----------------------------------------------------------------------------------------------------------------- onderwerpen
// De figuren waarop elk stuk wordt gepast: de twee hoofdpersonen (zoals shops.js ze bouwt) en NPC's zoals avatarLook/npcLook ze bouwen.
export const SUBJECTS = {
  tammo: { kind: 'char', app: P.TAMMO_APPEARANCE },
  tessa: { kind: 'char', app: P.ANITA_APPEARANCE },
  npcM: { kind: 'npc', variant: 'male', seed: 5.3 },
  npcF: { kind: 'npc', variant: 'female', seed: 9.7 },
  npcOud: { kind: 'npc', variant: 'male', seed: 14.1, age: 'old' },
};
export const SUBJECT_IDS = Object.keys(SUBJECTS);
// De agent met zijn vaste pet (politie, buzz): geen onderdeel van de matrix, wel een eigen hoofddeksel
SUBJECTS.agent = { kind: 'cop' };

// Een neutraal basisuitzicht: de onderlaag waaronder het te testen stuk komt.
export const NEUTRAL = { top: 'tshirt.wit', bottom: 'jeans.jeans', shoes: 'gympen.wit' };

export function pieceFor(itemId, colorIndex = 0) {
  const it = D.ITEM_BY_ID[itemId];
  return `${itemId}.${it.colors[colorIndex % it.colors.length]}`;
}

// spec: { who, body, worn: { slot: piece }, hair: 'stijl' }
export function buildCase(spec) {
  const sub = SUBJECTS[spec.who];
  const worn = { ...spec.worn, hair: `${spec.hair || (spec.who === 'tessa' ? 'long' : 'short')}.naturel`, body: spec.body || 'gemiddeld' };
  let group;
  if (sub.kind === 'cop') {
    group = P.buildPersonMesh(0x1c3fae, 0xd9b08c, { seed: spec.seed ?? 3 });
  } else if (sub.kind === 'char') {
    const o = C.outfitToLook(worn, sub.app, spec.extras || null);
    group = P.buildPersonMesh(o.shirt ?? sub.app.shirt, sub.app.skin, { ...sub.app, ...o });
  } else {
    const o = C.outfitToLook(worn, {}, spec.extras || null);
    const look = sub.age ? { ...o.look, age: sub.age } : o.look;
    group = P.buildPersonMesh(o.shirt, 0xd9b08c, {
      seed: sub.seed, variant: sub.variant, look, shirtBands: o.shirtBands,
      ...(o.pants != null ? { pants: o.pants } : {}), ...(o.shoes != null ? { shoes: o.shoes } : {}), ...(o.cap != null ? { cap: o.cap } : {}),
      ...(o.body ? { body: o.body } : {}), ...(o.hairStyle ? { hairStyle: o.hairStyle } : {}), ...(o.hair != null ? { hair: o.hair } : {}),
    });
  }
  return { spec, group, ...extract(group) };
}

// ----------------------------------------------------------------------------------------------------------------- lagen
function extract(group) {
  const geo = group.userData.body.geometry;
  const pos = geo.attributes.position.array;
  const ranges = geo.userData.layers;
  const parts = {};
  for (let i = 0; i < ranges.length - 1; i++) {
    const [a, name] = ranges[i], b = ranges[i + 1][0];
    if (b <= a) continue;
    (parts[name] ||= []).push(pos.subarray(a * 9, b * 9));
  }
  const layers = {};
  for (const [name, list] of Object.entries(parts)) {
    const n = list.reduce((s, x) => s + x.length, 0);
    const f = new Float64Array(n); let o = 0;
    for (const x of list) { f.set(x, o); o += x.length; }
    layers[name] = f;
  }
  // losse meshes (sieraden, horloge, handschoenen): naar modelruimte in de rustpose (groep ongeschaald)
  const acc = [];
  group.scale.set(1, 1, 1);
  // de bindpose: alle botten recht (een elleboog is na het bouwen 0,12 rad gebogen door autoElbow; de huid is in de bindpose gebouwd)
  group.traverse((o) => { if (o.isBone) o.rotation.set(0, 0, 0); });
  group.userData.elbowL.rotation.set(0, 0, 0); group.userData.elbowR.rotation.set(0, 0, 0);
  group.updateMatrixWorld(true);
  for (const m of group.userData.clothingMeshes || []) {
    const p = m.geometry.attributes.position.array;
    const out = new Float64Array(p.length);
    const v = new THREE.Vector3();
    for (let i = 0; i < p.length; i += 3) { v.set(p[i], p[i + 1], p[i + 2]).applyMatrix4(m.matrixWorld); out[i] = v.x; out[i + 1] = v.y; out[i + 2] = v.z; }
    const side = m.parent === group.userData.chest ? 'chest' : m.parent === group.userData.elbowL ? 'L' : 'R';
    acc.push({ kind: m.userData.kind, side, tris: out });
  }
  // de shirtlagen van de voetbalkleding (patroon en rugnummer, sponsorpaneel): losse meshes aan de borstbot, naar modelruimte
  const kit = [];
  for (const m of group.userData.chest.children) {
    if (!m.userData.kit) continue;
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry, p = g.attributes.position.array, out = new Float64Array(p.length), v = new THREE.Vector3();
    for (let i = 0; i < p.length; i += 3) { v.set(p[i], p[i + 1], p[i + 2]).applyMatrix4(m.matrixWorld); out[i] = v.x; out[i + 1] = v.y; out[i + 2] = v.z; }
    kit.push({ name: m.name, tris: out });
  }
  return { layers, acc, kit, geo, shZ: group.userData.shZ, female: !!group.userData.female };
}

// De romp en de losse stukken (sieraden, horloge, handschoenen) als een geometrie voor de softwarerenderer (scripts/lib/kleding_clip_png.mjs).
export function renderableOf(c) {
  const body = c.geo, bp = body.attributes.position.array, bc = body.attributes.color;
  const parts = [{ p: bp, c: (i) => [bc.getX(i), bc.getY(i), bc.getZ(i)] }];
  const v = new THREE.Vector3();
  for (const m of c.group.userData.clothingMeshes || []) {
    const g = m.geometry, p = g.attributes.position, col = g.attributes.color, w = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); w[i * 3] = v.x; w[i * 3 + 1] = v.y; w[i * 3 + 2] = v.z; }
    parts.push({ p: w, c: (i) => [col.getX(i), col.getY(i), col.getZ(i)] });
  }
  const total = parts.reduce((n, x) => n + x.p.length / 3, 0);
  const pos = new Float32Array(total * 3), cols = new Float32Array(total * 3);
  let o = 0;
  for (const x of parts) for (let i = 0; i < x.p.length / 3; i++, o++) { pos.set(x.p.subarray(i * 3, i * 3 + 3), o * 3); cols.set(x.c(i), o * 3); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return g;
}

// unieke hoekpunten van een lagenlijst (driehoeken), afgerond op 0,1 mm
export function vertsOf(tris) {
  if (!tris) return [];
  const seen = new Set(), out = [];
  for (let i = 0; i < tris.length; i += 3) {
    const k = `${Math.round(tris[i] * 1e4)}|${Math.round(tris[i + 1] * 1e4)}|${Math.round(tris[i + 2] * 1e4)}`;
    if (seen.has(k)) continue;
    seen.add(k); out.push([tris[i], tris[i + 1], tris[i + 2]]);
  }
  return out;
}

// ----------------------------------------------------------------------------------------------------------------- raycast
// Möller-Trumbore, tweezijdig. Geeft het kleinste en het grootste t > 0 waarop de straal de driehoeken raakt, of null.
export function rayRange(tris, ox, oy, oz, dx, dy, dz) {
  let tmin = Infinity, tmax = -Infinity;
  for (let i = 0; i < tris.length; i += 9) {
    const e1x = tris[i + 3] - tris[i], e1y = tris[i + 4] - tris[i + 1], e1z = tris[i + 5] - tris[i + 2];
    const e2x = tris[i + 6] - tris[i], e2y = tris[i + 7] - tris[i + 1], e2z = tris[i + 8] - tris[i + 2];
    const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
    const det = e1x * px + e1y * py + e1z * pz;
    if (det > -1e-12 && det < 1e-12) continue;
    const inv = 1 / det;
    const tx = ox - tris[i], ty = oy - tris[i + 1], tz = oz - tris[i + 2];
    const u = (tx * px + ty * py + tz * pz) * inv;
    if (u < -1e-6 || u > 1 + 1e-6) continue;
    const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
    const v = (dx * qx + dy * qy + dz * qz) * inv;
    if (v < -1e-6 || u + v > 1 + 1e-6) continue;
    const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
    if (t <= 1e-9) continue;
    if (t < tmin) tmin = t;
    if (t > tmax) tmax = t;
  }
  return tmax < 0 ? null : { tmin, tmax };
}

// ----------------------------------------------------------------------------------------------------------------- het hoofd
const HC = [0, HEAD_Y, 0];
// hoeveel meter ligt het punt binnen de hoofdellipsoide (0 = erbuiten of erop); radiaal vanuit het hoofdcentrum
export function headDepth(x, y, z) {
  const dy = y - HEAD_Y;
  const ny = dy / 0.118;
  const fz = ny < 0 ? 1 - 0.3 * Math.pow(-ny, 1.4) : 1;
  let fx = 1;
  if (ny < 0) fx *= x > 0 ? 1 - 0.1 * -ny : 1 - 0.3 * -ny;
  if (x < 0 && ny > -0.3) fx *= 1.07;
  const nx = x / (0.097 * fx), nz = z / (0.086 * fz);
  const q = Math.hypot(nx, ny, nz);
  if (q >= 1 || q === 0) return 0;
  return Math.hypot(x, dy, z) * (1 - q) / q;
}

// ----------------------------------------------------------------------------------------------------------------- de controles
// Elke controle geeft { check, depth (m), layer, at }. depth > 0 is een overtreding van die grootte.
export function measureCase(c) {
  const out = [];
  const add = (check, depth, layer, at, note = '') => { if (depth > 0) out.push({ check, depth, layer, at, note }); };
  const L = c.layers;
  const shell = L.hatshell, trim = L.hattrim;

  // 1. hoofddeksel in het hoofd (de schaal van het hoofddeksel; de rand en de versiering zijn aanhechting)
  if (shell) {
    let best = 0, at = null;
    for (const v of vertsOf(shell)) { const d = headDepth(v[0], v[1], v[2]); if (d > best) { best = d; at = v; } }
    add('hoofddeksel-in-hoofd', best, 'hatshell', at);
  }

  // 2. haar door het hoofddeksel: een haarpunt buiten het buitenvlak van het hoofddeksel, in een richting die het deksel bedekt
  if (shell && L.hair) {
    let best = 0, at = null;
    for (const v of vertsOf(L.hair)) {
      const dx = v[0], dy = v[1] - HEAD_Y, dz = v[2], r = Math.hypot(dx, dy, dz);
      if (r < 0.02) continue;
      const h = rayRange(shell, 0, HEAD_Y, 0, dx / r, dy / r, dz / r);
      if (h && r - h.tmax > best) { best = r - h.tmax; at = v; }
    }
    add('haar-door-hoofddeksel', best, 'hair', at);
  }

  // 3. gezicht en bril: bedekt door het hoofddeksel (ogen, neus, mond, bril) of erdoorheen (oren, wenkbrauwen, bril); alleen voor een schil
  // (pet, mutsje, platte pet): een bandje, kroon of oren zit boven het haar en bedekt het gezicht niet.
  const hatPiece = c.spec.worn.hat ? D.parsePiece(c.spec.worn.hat) : null;
  if (shell && hatPiece && ['cap', 'tammo', 'flatcap', 'beanie'].includes(hatPiece.item.kind)) {
    for (const [layer, label] of [['face', 'gezicht'], ['glasses', 'bril']]) {
      let cover = 0, atC = null, poke = 0, atP = null;
      for (const v of vertsOf(L[layer])) {
        const dx = v[0], dy = v[1] - HEAD_Y, dz = v[2], r = Math.hypot(dx, dy, dz);
        if (r < 0.02) continue;
        const h = rayRange(shell, 0, HEAD_Y, 0, dx / r, dy / r, dz / r);
        if (!h) continue;
        if (h.tmax - r > cover) { cover = h.tmax - r; atC = v; }
        if (r - h.tmax > poke) { poke = r - h.tmax; atP = v; }
      }
      add(`${label}-bedekt-door-hoofddeksel`, cover, layer, atC);
      add(`${label}-door-hoofddeksel`, poke, layer, atP);
    }
  }

  // 4. capuchon (hoodbowl) in het hoofd
  if (L.hoodbowl) {
    let best = 0, at = null;
    for (const v of vertsOf(L.hoodbowl)) { const d = headDepth(v[0], v[1], v[2]); if (d > best) { best = d; at = v; } }
    add('capuchon-in-hoofd', best, 'hoodbowl', at);
  }

  measureBody(c, add);
  return out;
}

// ----------------------------------------------------------------------------------------------------------------- romp en ledematen
const cat = (...lists) => {
  const l = lists.filter(Boolean);
  const f = new Float64Array(l.reduce((n, x) => n + x.length, 0)); let o = 0;
  for (const x of l) { f.set(x, o); o += x.length; }
  return f;
};
const sideOf = (tris, s) => { // alleen de driehoeken van één kant (z > 0 of z < 0) van de figuur
  const out = [];
  for (let i = 0; i < tris.length; i += 9) { const z = tris[i + 2] + tris[i + 5] + tris[i + 8]; if (z * s > 0) for (let k = 0; k < 9; k++) out.push(tris[i + k]); }
  return Float64Array.from(out);
};
// Straal loodrecht op een as (punt a, eenheidsrichting d) door punt v: { r: afstand van v tot de as, R: grootste afstand waarop de driehoeken de straal raken }
function perp(tris, a, d, v) {
  const w = [v[0] - a[0], v[1] - a[1], v[2] - a[2]];
  const s = w[0] * d[0] + w[1] * d[1] + w[2] * d[2];
  const f = [a[0] + d[0] * s, a[1] + d[1] * s, a[2] + d[2] * s];
  const u = [v[0] - f[0], v[1] - f[1], v[2] - f[2]], r = Math.hypot(...u);
  if (r < 1e-5) return null;
  const h = rayRange(tris, f[0], f[1], f[2], u[0] / r, u[1] / r, u[2] / r);
  return { r, R: h ? h.tmax : null, f };
}
const ARM_SPLAY = 0.06;
// de as van de arm van kant s (+1 links, -1 rechts): van de schouder langs de gespreide arm
export function armAxis(shZ, s) { return { a: [0, SHOULDER_Y, s * shZ], d: [0, -Math.cos(ARM_SPLAY), s * Math.sin(ARM_SPLAY)] }; }

// Splitst een lijst driehoeken in losse stukken (driehoeken die een hoekpunt delen horen bij elkaar): een doos, een lus, een strook.
export function piecesOf(tris) {
  if (!tris) return [];
  const n = tris.length / 9, parent = Array.from({ length: n }, (_, i) => i);
  const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const owner = new Map();
  for (let t = 0; t < n; t++) {
    for (let k = 0; k < 3; k++) {
      const key = `${Math.round(tris[t * 9 + k * 3] * 1e4)}|${Math.round(tris[t * 9 + k * 3 + 1] * 1e4)}|${Math.round(tris[t * 9 + k * 3 + 2] * 1e4)}`;
      if (owner.has(key)) parent[find(t)] = find(owner.get(key)); else owner.set(key, t);
    }
  }
  const groups = new Map();
  for (let t = 0; t < n; t++) { const r = find(t); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(t); }
  return [...groups.values()].map((ts) => {
    const f = new Float64Array(ts.length * 9);
    ts.forEach((t, i) => f.set(tris.subarray(t * 9, t * 9 + 9), i * 9));
    return f;
  });
}

function measureBody(c, add) {
  const L = c.layers;

  // details op de romp (revers, overhemd in de open jas, zakken, kraagjes): elk los stuk moet op het oppervlak liggen. Zweeft het (het dichtstbijzijnde punt
  // meer dan 1 cm ervoor) of zit het er helemaal in (het buitenste punt onder het oppervlak), dan is het een plank voor de borst of onzichtbaar.
  for (const name of c.spec.who === 'agent' ? [] : ['topdetail', 'under', 'lapel']) { // de uniformdetails van de agent (antenne, portofoon) zijn vaste ontwerpen
    let float = 0, buried = 0, atF = null, atB = null;
    for (const piece of piecesOf(L[name])) {
      let mn = Infinity, mx = -Infinity, at = null;
      for (const v of vertsOf(piece)) {
        if (v[1] < 0.95 || v[1] > 1.5) continue; // alleen de romp (rok- en jaspanden hebben een eigen laag)
        const r = Math.hypot(v[0], v[2]);
        if (r < 1e-4) continue;
        const h = rayRange(L.top, 0, v[1], 0, v[0] / r, 0, v[2] / r);
        if (!h) continue;
        const gap = r - h.tmax;
        if (gap < mn) mn = gap;
        if (gap > mx) { mx = gap; at = v; }
      }
      if (mn !== Infinity && mn - 0.01 > float) { float = mn - 0.01; atF = at; }
      if (mx !== -Infinity && -mx > buried) { buried = -mx; atB = at; }
    }
    const label = name === 'under' ? 'overhemd' : name === 'lapel' ? 'revers' : 'detail';
    add(`${label}-zweeft`, float, name, atF);
    add(`${label}-begraven`, buried, name, atB);
  }
  // wat een sieraad kan bedekken: de romp, de kraag, de details, de sjaal (de capuchon hangt achter de nek, daar zit de ketting in de opening)
  const tops = cat(L.top, L.collar, L.topdetail, L.scarf, L.under);
  const base = cat(L.top); // de romp zelf; revers, zakken en kraag liggen erop en mogen een ketting bedekken
  // sieraden om de hals: hoe diep ligt het diepste punt in de kleding, en is het hoogste punt nog zichtbaar boven de kleding
  for (const a of c.acc) {
    if (a.side === 'chest') {
      let deepest = 0, highest = -Infinity, at = null;
      for (const v of vertsOf(a.tris)) {
        const r = Math.hypot(v[0], v[2]);
        if (r < 1e-4) continue;
        const h = rayRange(tops, 0, v[1], 0, v[0] / r, 0, v[2] / r);
        if (!h) continue;
        const hb = rayRange(base, 0, v[1], 0, v[0] / r, 0, v[2] / r);
        if (hb && hb.tmax - r > deepest) { deepest = hb.tmax - r; at = v; }
        const gap = r - h.tmax;
        if (gap > highest) highest = gap;
      }
      add(`${a.kind}-in-kleding`, deepest, 'acc', at);
      if (highest !== -Infinity) add(`${a.kind}-verborgen`, -highest, 'acc', at);
    } else {
      // polsstuk of handschoen om de arm: hoe diep zit het in de mouw of de arm (alleen punten langs de arm tussen elleboog en pols)
      const s = a.side === 'L' ? 1 : -1;
      const ax = armAxis(c.shZ, s);
      const arm = sideOf(cat(L.sleeve, L.cuff, L.armskin), s);
      let deepest = 0, highest = -Infinity, at = null;
      for (const v of vertsOf(a.tris)) {
        if (v[1] > SHOULDER_Y - 0.4 || v[1] < SHOULDER_Y - 0.72) continue; // alleen het stuk om de onderarm
        const q = perp(arm, ax.a, ax.d, v);
        if (!q || q.R == null) continue;
        const gap = q.r - q.R;
        if (-gap > deepest && q.r > 0.35 * q.R) { deepest = -gap; at = v; } // het middelpunt van een kap van een cilinder ligt op de as en telt niet mee
        if (gap > highest) highest = gap;
      }
      add(`${a.kind}-in-arm`, deepest, 'acc', at);
      if (highest !== -Infinity) add(`${a.kind}-verborgen`, -highest, 'acc', at);
    }
  }

  // tas: hoe diep zit de tas of de band in een arm of hand
  if (L.bag) {
    for (const s of [1, -1]) {
      const ax = armAxis(c.shZ, s);
      const arm = sideOf(cat(L.sleeve, L.cuff, L.armskin, L.hand), s);
      let deepest = 0, at = null;
      for (const v of vertsOf(L.bag)) {
        if (v[1] > SHOULDER_Y || v[1] < SHOULDER_Y - 0.72 || v[2] * s < 0) continue;
        const q = perp(arm, ax.a, ax.d, v);
        if (!q || q.R == null) continue;
        if (q.R - q.r > deepest) { deepest = q.R - q.r; at = v; }
      }
      add('tas-in-arm', deepest, 'bag', at);
    }
  }

  // sjaal: diepte in de kraag of het shirt, en of er nog iets van boven de kleding uitkomt
  if (L.scarf) {
    const under = cat(L.top);
    let deepest = 0, highest = -Infinity, at = null;
    for (const v of vertsOf(L.scarf)) {
      const r = Math.hypot(v[0], v[2]);
      if (r < 1e-4) continue;
      const h = rayRange(under, 0, v[1], 0, v[0] / r, 0, v[2] / r);
      if (!h) continue;
      const gap = r - h.tmax;
      if (-gap > deepest) { deepest = -gap; at = v; }
      if (gap > highest) highest = gap;
    }
    add('sjaal-in-kleding', deepest, 'scarf', at);
    if (highest !== -Infinity) add('sjaal-verborgen', -highest, 'scarf', at);
    if (highest !== -Infinity) add('sjaal-zweeft', highest - 0.04, 'scarf', at); // een sjaal die meer dan 4 cm van de romp af staat is een kraag van karton
    // kraag, revers en overhemd onder de jas die door de sjaal heen steken (de capuchon hangt achter de nek, daar hoort hij buiten de sjaal)
    for (const name of ['collar', 'topdetail', 'under']) {
      let best = 0, atK = null;
      for (const v of vertsOf(L[name])) {
        if (v[1] < 1.4 || v[1] > 1.53) continue;
        const r = Math.hypot(v[0], v[2]);
        if (r < 1e-4) continue;
        const h = rayRange(L.scarf, 0, v[1], 0, v[0] / r, 0, v[2] / r);
        if (h && r - h.tmax > best) { best = r - h.tmax; atK = v; }
      }
      add(`${name === 'collar' ? 'kraag' : name === 'under' ? 'overhemd' : 'revers'}-door-sjaal`, best, name, atK);
    }
  }

  // rok, jurk en jaspanden: steekt een been door de panelen? (vanuit de verticale romp-as; alleen punten van het been op panelhoogte)
  if (L.hem && L.leg) {
    let best = 0, at = null;
    for (const v of vertsOf(L.leg)) {
      if (v[1] < 0.5 || v[1] > 0.97) continue;
      const r = Math.hypot(v[0], v[2]);
      if (r < 1e-4) continue;
      const h = rayRange(L.hem, 0, v[1], 0, v[0] / r, 0, v[2] / r);
      if (h && r - h.tmax > best) { best = r - h.tmax; at = v; }
    }
    add('been-door-panelen', best, 'leg', at);
  }

  // schoenen: hoe diep zit een schoen in het been (de broek of de huid erboven); het been is een lus rond een verticale as
  if (L.shoe && L.leg) {
    const hipZ = c.female ? 0.084 : 0.088;
    let deepest = 0, at = null;
    for (const s of [1, -1]) {
      const leg = sideOf(L.leg, s);
      for (const v of vertsOf(sideOf(L.shoe, s))) {
        if (v[1] < 0.13) continue; // alleen de schacht boven de enkel
        const q = perp(leg, [0, 0, s * hipZ], [0, 1, 0], v);
        if (!q || q.R == null) continue;
        if (q.R - q.r > deepest) { deepest = q.R - q.r; at = v; }
      }
    }
    add('schoen-in-been', deepest, 'shoe', at);
  }

  // ---- voetbalkleding (22-11) ----
  const hipZ2 = c.female ? 0.084 : 0.088;
  // kousen: steekt het been (de huid onder het broekje) door de kous?
  if (L.sock && L.leg) {
    let best = 0, at = null;
    for (const s of [1, -1]) {
      const sock = sideOf(L.sock, s);
      for (const v of vertsOf(sideOf(L.leg, s))) {
        if (v[1] < 0.12 || v[1] > 0.48) continue;
        const q = perp(sock, [0, 0, s * hipZ2], [0, 1, 0], v);
        if (q && q.R != null && q.r - q.R > best) { best = q.r - q.R; at = v; }
      }
    }
    add('kous-door-been', best, 'sock', at);
  }
  // scheenbeschermers: liggen op de kous (of het been): niet erin, niet erboven
  if (L.guard && (L.sock || L.leg)) {
    let float = 0, buried = 0, atF = null, atB = null;
    for (const s of [1, -1]) {
      const base = sideOf(L.sock || L.leg, s);
      for (const piece of piecesOf(sideOf(L.guard, s))) {
        let mn = Infinity, mx = -Infinity, at = null;
        for (const v of vertsOf(piece)) {
          const q = perp(base, [0, 0, s * hipZ2], [0, 1, 0], v);
          if (!q || q.R == null) continue;
          const gap = q.r - q.R;
          if (gap < mn) mn = gap;
          if (gap > mx) { mx = gap; at = v; }
        }
        if (mn !== Infinity && mn - 0.01 > float) { float = mn - 0.01; atF = at; }
        if (mx !== -Infinity && -mx > buried) { buried = -mx; atB = at; }
      }
    }
    add('scheenbeschermer-zweeft', float, 'guard', atF);
    add('scheenbeschermer-begraven', buried, 'guard', atB);
  }
  // aanvoerdersband: om de mouw van de linkerbovenarm
  if (L.captainband && L.sleeve) {
    const ax = armAxis(c.shZ, 1), arm = sideOf(L.sleeve, 1);
    let float = 0, buried = 0, atF = null, atB = null;
    for (const v of vertsOf(L.captainband)) {
      const q = perp(arm, ax.a, ax.d, v);
      if (!q || q.R == null) continue;
      const gap = q.r - q.R;
      if (-gap > buried) { buried = -gap; atB = v; }
      if (gap - 0.02 > float) { float = gap - 0.02; atF = v; }
    }
    add('aanvoerdersband-in-mouw', buried, 'captainband', atB);
    add('aanvoerdersband-zweeft', float, 'captainband', atF);
  }
  // rugnummer, naamstrook en sponsorpaneel: dunne dozen op de romp (de doorsnede-dozen van het patroon lopen door de hele romp en tellen niet mee)
  for (const kk of c.kit || []) {
    let float = 0, buried = 0, atF = null, atB = null;
    for (const piece of piecesOf(kk.tris)) {
      let xmin = Infinity, xmax = -Infinity, mn = Infinity, mx = -Infinity, at = null;
      const vs = vertsOf(piece);
      for (const v of vs) { xmin = Math.min(xmin, v[0]); xmax = Math.max(xmax, v[0]); }
      if (xmin < -0.02 && xmax > 0.02) continue;
      for (const v of vs) {
        const r = Math.hypot(v[0], v[2]);
        if (r < 1e-4) continue;
        const h = rayRange(L.top, 0, v[1], 0, v[0] / r, 0, v[2] / r);
        if (!h) continue;
        const gap = r - h.tmax;
        if (gap < mn) mn = gap;
        if (gap > mx) { mx = gap; at = v; }
      }
      if (mn !== Infinity && mn - 0.01 > float) { float = mn - 0.01; atF = at; }
      if (mx !== -Infinity && -mx > buried) { buried = -mx; atB = at; }
    }
    const label = kk.name === 'shirtSponsor' ? 'sponsorpaneel' : 'rugnummer';
    add(`${label}-zweeft`, float, 'kit', atF);
    add(`${label}-begraven`, buried, 'kit', atB);
  }
}

export const maxBy = (list, check) => list.filter((f) => f.check === check).reduce((m, f) => Math.max(m, f.depth), 0);

// ----------------------------------------------------------------------------------------------------------------- drempels
// Meter. Standaard 2 mm (de eigenaar: een hoofddeksel dat >2 mm in het hoofd zit is al te veel). Uitzonderingen hebben een reden:
//  - parels, kralen en hangers zijn dobbelsteentjes van 19 tot 22 mm: tot de helft in de stof (10 mm) is een ketting die op de kleding rust;
//  - een band om de pols of een handschoen ligt om de arm en rust op de mouw, een naad van 3 mm hoort daarbij;
//  - een sjaal ligt in de kraag (6 mm), een schoen mag 3 mm in het been (de rand van de schacht).
export const THRESH = {
  default: 0.002,
  'pearls-in-kleding': 0.01, 'beads-in-kleding': 0.01, 'pendant-in-kleding': 0.01, 'chain-in-kleding': 0.006,
  'watch-in-arm': 0.003, 'band-in-arm': 0.003, 'bracelet-in-arm': 0.003, 'glove-in-arm': 0.004, 'work-in-arm': 0.004, 'garden-in-arm': 0.004,
  'sjaal-in-kleding': 0.006, 'schoen-in-been': 0.003, 'sjaal-zweeft': 0.002, 'keeperglove-in-arm': 0.004,
};
export const limitFor = (check) => THRESH[check] ?? THRESH.default;

// ----------------------------------------------------------------------------------------------------------------- combinaties
const px = pieceFor;
const HATS = D.ITEMS.filter((i) => i.slot === 'hat').map((i) => i.id);
const OUTERS = ['jack', 'korte_jas', 'lange_jas', 'colbert', 'regenjas'];
const TOPS = ['tshirt', 'overhemd', 'zomerhemd', 'trui', 'hoodie', 'jurk'];
const BOTTOMS = ['jeans', 'korte_broek', 'rok', 'chino'];
const SHOES = ['gympen', 'instappers', 'laarzen'];
const GLOVES = ['fietshandschoen', 'werkhandschoen', 'tuinhandschoen'];

// Elke combinatie: { set, key, slot, spec }. key beschrijft het te testen stuk samen met wat eromheen zit (voor het rapport).
// stride > 1 neemt elke n-de combinatie (de lichte test); sets kiest de groepen.
export function combos(setIds = null, stride = 1) {
  let n = 0;
  const want = (id) => !setIds || setIds.includes(id);
  const out = [];
  const push = (set, key, slot, spec) => { if (n++ % stride === 0) out.push({ set, key, slot, spec }); };
  if (want('stuk')) {
    // elk kledingstuk (de 63 winkelstukken en de 4 rolstukken) op elk personage en elke lichaamsvorm, in een neutraal basisuitzicht
    for (const it of D.ITEMS) {
      for (const who of SUBJECT_IDS) for (const body of BODIES) {
        push('stuk', it.id, it.slot, { who, body, worn: { ...NEUTRAL, [it.slot]: px(it.id) } });
      }
    }
  }
  if (want('hoofd')) {
    // hoofddeksel x kapsel (het hoofd is bij elke lichaamsvorm gelijk: gemiddeld volstaat) op de personages en een oude NPC (kale kruin)
    for (const hat of HATS) for (const hair of HAIRS) for (const who of ['tammo', 'tessa', 'npcF', 'npcOud']) {
      push('hoofd', `${hat} + ${hair}`, 'hat', { who, body: 'gemiddeld', hair, worn: { ...NEUTRAL, hat: px(hat) } });
    }
    push('hoofd', 'agentpet + buzz', 'hat', { who: 'agent', body: 'gemiddeld', worn: {} });
    // hoofddeksel x bril x gezichtsbeharing x kapsel
    for (const hat of HATS) for (const gl of ['leesbril', 'zonnebril']) for (const face of [null, 'stoppels', 'volbaard', 'snor', 'sik']) for (const hair of ['bald', 'short', 'long', 'afro']) for (const who of ['tammo', 'tessa']) {
      push('hoofd', `${hat} + ${gl}${face ? ' + ' + face : ''} + ${hair}`, 'hat', { who, body: 'gemiddeld', hair, worn: { ...NEUTRAL, hat: px(hat), glasses: px(gl), ...(face ? { face: px(face) } : {}) } });
    }
  }
  if (want('jas')) {
    // jas x shirt x broek op elke lichaamsvorm
    for (const outer of OUTERS) for (const top of TOPS) for (const bottom of BOTTOMS) for (const body of BODIES) for (const who of ['tammo', 'tessa', 'npcOud']) {
      push('jas', `${outer} + ${top} + ${bottom}`, 'outer', { who, body, worn: { outer: px(outer), top: px(top), bottom: px(bottom), shoes: px('gympen') } });
    }
  }
  if (want('schoen')) {
    for (const sh of SHOES) for (const bottom of BOTTOMS) for (const body of BODIES) for (const who of ['tammo', 'tessa', 'npcOud']) {
      push('schoen', `${sh} + ${bottom}`, 'shoes', { who, body, worn: { top: px('tshirt'), bottom: px(bottom), shoes: px(sh) } });
    }
  }
  if (want('hand')) {
    // handschoen en horloge x mouw (shirt en jas) op elke lichaamsvorm
    for (const gl of GLOVES) for (const top of ['tshirt', 'overhemd', 'zomerhemd', 'hoodie']) for (const outer of [null, 'jack', 'lange_jas', 'colbert']) for (const body of BODIES) for (const who of ['tammo', 'tessa']) {
      push('hand', `${gl} + horloge + ${top}${outer ? ' + ' + outer : ''}`, 'hands', { who, body, worn: { ...NEUTRAL, top: px(top), ...(outer ? { outer: px(outer) } : {}), hands: px(gl), wrist: px('horloge') } });
    }
  }
  if (want('sjaal')) {
    // sjaal x jas x shirt x ketting
    for (const outer of [null, ...OUTERS]) for (const top of ['tshirt', 'hoodie', 'trui']) for (const jw of [null, 'ketting', 'parels']) for (const body of BODIES) for (const who of ['tammo', 'tessa']) {
      push('sjaal', `sjaal + ${top}${outer ? ' + ' + outer : ''}${jw ? ' + ' + jw : ''}`, 'neck', { who, body, worn: { ...NEUTRAL, top: px(top), ...(outer ? { outer: px(outer) } : {}), neck: px('sjaal'), ...(jw ? { jewel: px(jw) } : {}) } });
    }
  }
  if (want('tas')) {
    // tas x jas x shirt
    for (const bag of ['rugzak', 'schoudertas']) for (const outer of [null, ...OUTERS]) for (const top of ['tshirt', 'hoodie']) for (const body of BODIES) for (const who of ['tammo', 'tessa']) {
      push('tas', `${bag} + ${top}${outer ? ' + ' + outer : ''}`, 'back', { who, body, worn: { ...NEUTRAL, top: px(top), ...(outer ? { outer: px(outer) } : {}), back: px(bag) } });
    }
  }
  if (want('sport')) {
    // voetbalkleding (22-11): elk niveau, elk patroon dat het niveau toestaat, thuis, uit, derde, keeper, training en trainingspak, op elk personage en elke lichaamsvorm
    const COL = { groen: 'oranje', zwart: 'geel' };
    for (const level of K.LEVEL_IDS) {
      const L = K.KIT_LEVELS[level];
      const kits = [];
      for (const pattern of L.patterns) for (const variant of ['thuis', 'uit', 'derde']) kits.push({ pattern, variant, role: 'veld', mode: 'wedstrijd', color: pattern === 'effen' ? 'groen' : 'zwart', long: pattern === 'helften' });
      kits.push({ pattern: 'effen', variant: 'thuis', role: 'keeper', mode: 'wedstrijd', color: 'groen' }, { pattern: 'effen', variant: 'thuis', role: 'veld', mode: 'training', color: 'marine' }, { pattern: 'effen', variant: 'thuis', role: 'veld', mode: 'intro', color: 'rood' });
      for (const spec of kits) {
        const k = K.kitWorn({ ...spec, level, captain: true, number: 10 + (kits.indexOf(spec) % 80), name: true, sponsors: ['Wiebelwerk'], clubId: 'test', keeperColor: COL[spec.color] || 'geel' });
        for (const who of ['tammo', 'tessa', 'npcM', 'npcF', 'npcOud']) for (const body of BODIES) {
          push('sport', `${k.worn.top.split('.')[0]} + ${level} + ${spec.variant}${spec.role === 'keeper' ? ' + keeper' : ''}${spec.mode !== 'wedstrijd' ? ' + ' + spec.mode : ''}`, 'top', { who, body, worn: k.worn, extras: k.extras });
        }
      }
    }
    // de vier voetbalschoenen onder een lange broek en onder het broekje, met en zonder kousen en scheenbeschermers
    for (const shoe of ['noppen_basis', 'noppen_semi', 'noppen_pro', 'noppen_top']) for (const bottom of ['jeans', 'voetbalbroekje', 'trainingsbroek', 'korte_broek']) for (const legs of [false, true]) for (const body of BODIES) for (const who of ['tammo', 'tessa']) {
      push('sport', `${shoe} + ${bottom}${legs ? ' + kousen + scheenbeschermers' : ''}`, 'shoes', { who, body, worn: { top: px('tshirt'), bottom: px(bottom), shoes: px(shoe), ...(legs ? { legs: px('voetbalsokken'), guard: px('scheenbeschermers') } : {}) } });
    }
    // het hesje en het trainingspak over verschillende mouwen, en de keepershandschoenen met de aanvoerdersband
    for (const outer of ['opwarmhesje', 'trainingsjack']) for (const top of ['voetbalshirt_effen', 'voetbalshirt_lang_effen', 'tshirt']) for (const body of BODIES) for (const who of ['tammo', 'tessa', 'npcOud']) {
      push('sport', `${outer} + ${top}`, 'outer', { who, body, worn: { ...NEUTRAL, outer: px(outer), top: px(top) } });
    }
    for (const body of BODIES) for (const who of ['tammo', 'tessa']) for (const top of ['keepersshirt', 'voetbalshirt_effen']) {
      push('sport', `keepershandschoenen + aanvoerdersband + ${top}`, 'hands', { who, body, worn: { ...NEUTRAL, top: px(top), hands: px('keepershandschoenen'), wrist: px('aanvoerdersband') } });
    }
  }
  return out;
}
export const SET_IDS = ['stuk', 'hoofd', 'jas', 'schoen', 'hand', 'sjaal', 'tas', 'sport'];

// Voert een combinatie uit: { ...combo, found: [{ check, depth, layer, at }] met alleen wat over de drempel gaat }
export function run(combo) {
  const c = buildCase(combo.spec);
  const found = measureCase(c).filter((f) => f.depth > limitFor(f.check));
  return { ...combo, found };
}
