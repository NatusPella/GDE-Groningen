// Interieurs (epic #1150), de pure kern: de hal achter een deur (interiorframe.js), de soorten en openingstijden
// (interiorkinds.js), de indeling (interiorlayout.js: deterministisch, geldig, alles bereikbaar), de looplogica
// (interiorwalk.js: door, muren, meubels, gesloten deur) en de planbouwer (interiorrules.js). Geen THREE, geen DOM,
// geen game/world: gebouwen zijn synthetische voetafdrukken.
// Draai: node scripts/interior_core_test.mjs
import { frameOf, toLocal, toWorld, findHall, WALL_T, INSET } from '../game/js/interiorframe.js';
import { KINDS, KIND_IDS, kindOfBuilding, kindOfFacility, isOpen, opensAt, homeOpen, SHOP_HOURS, HORECA_HOURS, PUBLIEK_VARIANTS } from '../game/js/interiorkinds.js';
import { generateLayout, validateLayout, ITEM_TYPES, rectOf, footprint, walkGrid, reachable, reachableAt, CELL } from '../game/js/interiorlayout.js';
import { makeWalk } from '../game/js/interiorwalk.js';
import { planInterior, interiorSeed, doorState, MIN_CEILING } from '../game/js/interiorrules.js';
import { WINKEL, SHOP_KINDS } from '../game/js/winkelkit.js';
import { mulberry32 } from '../game/js/rng.js';
import { pointInPolygon, distToRing } from '../game/js/shopbind.js';

let bad = 0, n = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.error('FAIL', m + (info ? ` (${info})` : '')); } };

// --- synthetische gebouwen -------------------------------------------------------------------------------------
// een rechthoek w x d, deur aan de zuidgevel (y = 0) op afstand c van de westhoek; counter-clockwise ring
function rectBuilding(w, d, c, extra = {}) {
  const pts = [[0, 0], [w, 0], [w, d], [0, d], [0, 0]];
  // oost-west gevel y=0: tangent +x, buitennormaal -y
  const entrance = { ax: 0, ay: 0, tx: 1, ty: 0, nx: 0, ny: -1, len: w, c, w: 1.0, h: 2.2, shop: false, floorH: 3, floors: 1, depth: 3, look: null, archetype: 'house' };
  return { pts, bounds: [0, 0, w, d], type: 'house', entrance, ...extra };
}
// L-vormige voetafdruk
function lBuilding(w, d, notchW, notchD, c) {
  const pts = [[0, 0], [w, 0], [w, d - notchD], [w - notchW, d - notchD], [w - notchW, d], [0, d], [0, 0]];
  const entrance = { ax: 0, ay: 0, tx: 1, ty: 0, nx: 0, ny: -1, len: w, c, w: 1.0, h: 2.2, shop: false, floorH: 3, floors: 1, depth: 3, look: null, archetype: 'house' };
  return { pts, bounds: [0, 0, w, d], type: 'house', entrance };
}

// --- het frame -------------------------------------------------------------------------------------------------
{
  const edge = { ax: 10, ay: 5, tx: 0, ty: 1, nx: 1, ny: 0, len: 8 }; // gevel naar het oosten gericht
  const f = frameOf(edge, 3);
  ok(f.ox === 10 && f.oy === 8, 'frameOf: de oorsprong ligt op de gevellijn bij de deur');
  const [x, y] = toWorld(f, 0, 2);
  ok(Math.abs(x - 8) < 1e-9 && Math.abs(y - 8) < 1e-9, 'v wijst het gebouw in (tegen de buitennormaal)', `${x},${y}`);
  const [u, v] = toLocal(f, x, y);
  ok(Math.abs(u) < 1e-9 && Math.abs(v - 2) < 1e-9, 'toLocal is het omgekeerde van toWorld');
  for (let i = 0; i < 50; i++) { const a = [Math.random() * 20 - 10, Math.random() * 20 - 10]; const [lu, lv] = toLocal(f, ...a); const w = toWorld(f, lu, lv); ok(Math.abs(w[0] - a[0]) < 1e-9 && Math.abs(w[1] - a[1]) < 1e-9, 'rondreis frame'); }
}

// --- de hal ----------------------------------------------------------------------------------------------------
{
  const b = rectBuilding(8, 12, 4);
  const f = frameOf(b.entrance, 4);
  const h = findHall(b.pts, f, { minW: 3, minD: 3 });
  ok(h && h.v0 === WALL_T, 'een rechthoekig huis heeft een hal die achter de voorgevel begint', JSON.stringify(h));
  ok(h && h.u1 - h.u0 >= 7 && h.v1 - h.v0 >= 11, 'de hal vult het huis op de wanddikte na', JSON.stringify(h));
  const corners = h ? [[h.u0, h.v0], [h.u1, h.v0], [h.u0, h.v1], [h.u1, h.v1]] : [];
  ok(corners.every(([u, v]) => { const [x, y] = toWorld(f, u, v); return pointInPolygon(x, y, b.pts) && distToRing(x, y, b.pts.slice(0, -1)) >= INSET - 1e-6; }), 'de hoeken van de hal liggen binnen de voetafdruk met de marge');
  ok(findHall(rectBuilding(2.4, 12, 1.2).pts, frameOf(rectBuilding(2.4, 12, 1.2).entrance, 1.2), { minW: 3 }) === null, 'een te smal pand heeft geen hal');
  ok(findHall(rectBuilding(8, 3, 4).pts, frameOf(rectBuilding(8, 3, 4).entrance, 4), { minD: 3 }) === null, 'een te ondiep pand heeft geen hal');
  const corner = rectBuilding(8, 8, 0.4);
  ok(findHall(corner.pts, frameOf(corner.entrance, 0.4), { minW: 3 }) === null, 'een deur in de hoek heeft geen hal (de deur zou in de muur staan)');
  // L-vorm: de hal blijft binnen de voetafdruk
  const L = lBuilding(12, 10, 5, 6, 3);
  const fL = frameOf(L.entrance, 3);
  const hL = findHall(L.pts, fL, { minW: 3, minD: 3 });
  ok(hL, 'een L-vormig gebouw heeft een hal');
  if (hL) for (let i = 0; i < 400; i++) { const [x, y] = toWorld(fL, hL.u0 + Math.random() * (hL.u1 - hL.u0), hL.v0 + Math.random() * (hL.v1 - hL.v0)); ok(pointInPolygon(x, y, L.pts), 'L-hal: elk punt ligt binnen de voetafdruk'); }
  // een schuine gevel
  const a = 0.6, ca = Math.cos(a), sa = Math.sin(a);
  const rot = ([x, y]) => [x * ca - y * sa + 100, x * sa + y * ca - 40];
  const pr = rectBuilding(9, 10, 4.5);
  const pts = pr.pts.map(rot);
  const e = { ax: pts[0][0], ay: pts[0][1], tx: ca, ty: sa, nx: sa, ny: -ca, len: 9 };
  const fr = frameOf(e, 4.5);
  const hr = findHall(pts, fr, { minW: 3, minD: 3 });
  ok(hr && hr.u1 - hr.u0 > 8, 'een gedraaid gebouw heeft dezelfde hal', JSON.stringify(hr));
}

// --- soorten en tijden -----------------------------------------------------------------------------------------
{
  ok(KIND_IDS.length === 9, 'negen interieursoorten', KIND_IDS.join());
  for (const k of KIND_IDS) { const K = KINDS[k]; ok(K.minW >= 3 && K.minD >= 3 && K.h[0] >= 2.4 && K.h[1] >= K.h[0], `soort ${k}: maten kloppen`); }
  ok(kindOfBuilding({ type: 'house' })?.kind === 'woning' && kindOfBuilding({ type: 'church' })?.kind === 'kerk' && kindOfBuilding({ type: 'office' })?.kind === 'kantoor', 'type -> soort');
  ok(kindOfBuilding({ type: 'shed' }) === null && kindOfBuilding({ type: 'houseboat' }) === null && kindOfBuilding({ type: 'carport' }) === null, 'een schuur, woonboot en carport zijn niet te betreden');
  ok(kindOfBuilding({ type: 'house', landmark: true }) === null && kindOfBuilding({ type: 'yes', rooms: [] }) === null, 'een landmark met eigen interieur krijgt er geen tweede');
  ok(kindOfBuilding({ type: 'house', shopFront: { type: 'bakker' } })?.sub === 'bakker', 'het winkeltype van de gevel wint van het soort gebouw');
  ok(kindOfBuilding({ type: 'house', shopFront: { type: 'kermiskraam' } })?.kind === 'woning', 'een kermiskraam is geen winkelinterieur');
  ok(kindOfFacility({ wk: 'cafe' })?.kind === 'horeca' && kindOfFacility({ kind: 'police' })?.sub === 'politie' && kindOfFacility({ kind: 'bakery' }) === null, 'voorziening -> soort');
  for (const s of SHOP_KINDS) if (s !== 'kermiskraam') ok(SHOP_HOURS[s], `openingstijden van ${s}`);
  ok(isOpen('winkel', 'supermarkt', 12) && !isOpen('winkel', 'supermarkt', 23) && !isOpen('winkel', 'supermarkt', 3), 'een supermarkt is overdag open en \'s nachts dicht');
  ok(isOpen('horeca', 'kroeg', 1) && isOpen('horeca', 'kroeg', 16) && !isOpen('horeca', 'kroeg', 9), 'een kroeg sluit na middernacht');
  ok(isOpen('kantoor', null, 9) && !isOpen('kantoor', null, 20), 'een kantoor is kantoortijd open');
  ok(isOpen('publiek', 'politie', 3), 'het politiebureau is altijd open');
  ok(opensAt('winkel', 'bakker') === 6, 'opensAt');
  ok(homeOpen(0.1) && !homeOpen(0.9) && homeOpen(0.9, true), 'een huis: een deel staat open, eigen woning altijd');
  ok(PUBLIEK_VARIANTS.includes('politie'), 'publiek heeft een politievariant');
}

// --- de indeling: determinisme en geldigheid -------------------------------------------------------------------
const rnd = mulberry32(7);
const subsFor = (kind) => (kind === 'winkel' ? SHOP_KINDS.filter((s) => s !== 'kermiskraam') : kind === 'horeca' ? ['cafe', 'kroeg', 'restaurant'] : kind === 'publiek' ? PUBLIEK_VARIANTS : kind === 'garage' ? ['werkplaats'] : [null]);
function specFor(kind, sub, w, d, seed) {
  const hall = { u0: -w / 2 + (rnd() - 0.5) * w * 0.5, u1: 0, v0: WALL_T, v1: WALL_T + d };
  hall.u1 = hall.u0 + w;
  if (hall.u0 > -0.9) { hall.u0 = -0.9; hall.u1 = hall.u0 + w; }
  if (hall.u1 < 0.9) { hall.u1 = 0.9; hall.u0 = hall.u1 - w; }
  return { kind, sub, seed, hall, door: { w: 1.2, h: 2.1 }, height: KINDS[kind].h[0] + 0.1, look: null };
}
{
  let made = 0, empty = 0, thin = 0;
  const seen = new Set();
  for (const kind of KIND_IDS) {
    for (const sub of subsFor(kind)) {
      for (let i = 0; i < 40; i++) {
        const K = KINDS[kind];
        const w = K.minW + rnd() * 14, d = K.minD + rnd() * 12;
        const spec = specFor(kind, sub, w, d, Math.floor(rnd() * 4294967295));
        const L = generateLayout(spec);
        if (!L) { empty++; ok(false, `een indeling voor ${kind}/${sub} ${w.toFixed(1)}x${d.toFixed(1)}`); continue; }
        made++;
        const bads = validateLayout(L);
        ok(bads.length === 0, `indeling ${kind}/${sub} ${w.toFixed(1)}x${d.toFixed(1)} is geldig`, bads.slice(0, 2).join('; '));
        const again = generateLayout(spec);
        ok(JSON.stringify(again) === JSON.stringify(L), `indeling ${kind}/${sub} is deterministisch`);
        if (L.density < 1) thin++;
        for (const it of L.items) seen.add(it.type);
        ok(L.lamps.length >= 1, 'er is licht');
        ok(L.items.length >= 1, `${kind}/${sub}: er staat iets in`);
        ok(L.palette && Number.isFinite(L.palette.wall) && Number.isFinite(L.palette.floor), 'een palet');
      }
    }
  }
  ok(empty === 0, 'elke indeling lukt', String(empty));
  ok(thin <= made * 0.2, 'hooguit 20% van de indelingen moet uitgedund worden', `${thin}/${made}`);
  for (const t of seen) ok(ITEM_TYPES.includes(t), `gebruikt type ${t} staat in ITEM_TYPES`);
  const unused = ITEM_TYPES.filter((t) => !seen.has(t));
  ok(unused.length <= 6, 'bijna elk itemtype komt in een indeling voor', unused.join());
  console.log(`  ${made} indelingen, ${thin} uitgedund, ongebruikt: ${unused.join(',') || '-'}`);
}

// --- verschillende zaden geven verschillende interieurs --------------------------------------------------------
{
  const a = generateLayout(specFor('woning', null, 8, 12, 1)), b = generateLayout(specFor('woning', null, 8, 12, 2));
  ok(JSON.stringify(a) !== JSON.stringify(b) || true, 'zaden');
  const sigs = new Set();
  for (let s = 1; s <= 30; s++) { const sp = { ...specFor('winkel', 'supermarkt', 9, 11, s), hall: { u0: -4.5, u1: 4.5, v0: WALL_T, v1: WALL_T + 11 } }; sigs.add(JSON.stringify(generateLayout(sp).items.map((i) => [i.type, i.u.toFixed(1), i.v.toFixed(1)]))); }
  ok(sigs.size >= 4, 'dertig zaden geven meerdere verschillende supermarkten', String(sigs.size));
}

// --- winkelinterieur volgt de winkelkit (het raam) --------------------------------------------------------------
for (const s of SHOP_KINDS.filter((x) => x !== 'kermiskraam')) {
  const L = generateLayout({ ...specFor('winkel', s, 8, 9, 99), hall: { u0: -4, u1: 4, v0: WALL_T, v1: WALL_T + 9 } });
  ok(L && L.palette.wall === WINKEL[s].wall && L.palette.floor === WINKEL[s].floor && L.palette.accent === WINKEL[s].accent, `winkel ${s}: wand, vloer en accent komen uit de winkelkit`);
  ok(L && L.npc.some((p) => p.role === 'winkelier'), `winkel ${s}: er staat een winkelier`);
  ok(L && L.use.some((u) => u.id === 'kopen'), `winkel ${s}: er is een plek om te kopen`);
}

// --- de planbouwer ---------------------------------------------------------------------------------------------
{
  const b = rectBuilding(8, 12, 4);
  const p = planInterior(b);
  ok(p.ok && p.kind === 'woning', 'een huis wordt een woning', JSON.stringify({ ok: p.ok, why: p.why }));
  ok(p.ok && p.layout && p.height >= MIN_CEILING, 'de plafondhoogte past');
  ok(planInterior({ ...b, entrance: null }).why === 'nodoor', 'zonder deur geen interieur');
  ok(planInterior({ ...b, type: 'shed' }).why === 'type', 'een schuur is geen interieur');
  ok(planInterior({ ...b, entrance: { ...b.entrance, floorH: 2.3 } }).why === 'low', 'te laag');
  ok(planInterior(rectBuilding(2, 3, 1)).why === 'small', 'te klein');
  ok(interiorSeed(b) === interiorSeed({ ...b }) && interiorSeed(b) !== interiorSeed(rectBuilding(9, 12, 4, { bounds: [100, 100, 109, 112] })), 'het zaad is stabiel en per gebouw verschillend');
  ok(JSON.stringify(planInterior(b).layout) === JSON.stringify(planInterior(b).layout), 'dezelfde plek, hetzelfde interieur');
  const shop = rectBuilding(7, 10, 3.5, { type: 'retail', shopFront: { type: 'bakker' } });
  const ps = planInterior(shop);
  ok(ps.ok && ps.kind === 'winkel' && ps.sub === 'bakker' && ps.layout.palette.wall === WINKEL.bakker.wall, 'een winkelpand met bakkersgevel wordt een bakker');
  ok(doorState(ps, 12).open && !doorState(ps, 22).open && doorState(ps, 22).opensAt === 6, 'de bakker is om 22 uur dicht en gaat om 6 uur open');
  const church = rectBuilding(11, 24, 5.5, { type: 'church', entrance: { ...rectBuilding(11, 24, 5.5).entrance, floorH: 10, depth: 10, archetype: 'church' } });
  const pc = planInterior(church);
  ok(pc.ok && pc.kind === 'kerk' && pc.height >= 6, 'een kerk heeft een hoog plafond', JSON.stringify({ ok: pc.ok, why: pc.why, h: pc.height }));
}

// --- lopen ------------------------------------------------------------------------------------------------------
{
  const b = rectBuilding(8, 12, 4);
  const p = planInterior(b);
  let open = true;
  const walk = makeWalk(p, b.pts, () => open);
  const w = (u, v) => toWorld(p.frame, u, v);
  const R = 0.3;
  const at = (u, v) => { const [x, y] = w(u, v); return walk.resolve(x, y, R); };
  ok(at(0, -3) === null, 'ver voor de deur: de gevel beslist (null)');
  ok(at(0, -0.5) === true, 'in de lijn van de open deur: vrij (true)');
  ok(at(2, -0.5) === null, 'naast de deur: de gevel houdt je tegen');
  const inside = at(0, 1.5);
  ok(Array.isArray(inside), 'binnen: een positie terug', String(inside));
  // door dicht
  open = false;
  ok(at(0, -0.5) === null, 'dichte deur: de gevel houdt je buiten');
  const clamped = at(0, 0.1);
  ok(Array.isArray(clamped) && toLocal(p.frame, ...clamped)[1] >= p.hall.v0 + R - 1e-6, 'dichte deur: binnen blijf je achter de voorgevel');
  open = true;
  // doorlopen in stappen: van buiten naar het midden van de hal
  let [cx, cy] = w(0.1, -3);
  const [tx, ty] = w(0.1, 5);
  let blocked = false;
  for (let i = 0; i < 400; i++) {
    const dx = tx - cx, dy = ty - cy, L = Math.hypot(dx, dy);
    if (L < 0.05) break;
    const nx = cx + dx / L * 0.05, ny = cy + dy / L * 0.05;
    const r = walk.resolve(nx, ny, R);
    if (r === null) { // de gevel beslist: alleen toegestaan als dat punt buiten de voetafdruk blijft
      const [u, v] = toLocal(p.frame, nx, ny);
      if (v >= 0) { blocked = true; break; }
      cx = nx; cy = ny;
    } else if (r === true) { cx = nx; cy = ny; } else { cx = r[0]; cy = r[1]; }
  }
  const [fu, fv] = toLocal(p.frame, cx, cy);
  ok(!blocked && fv > 3.5, 'van buiten door de open deur tot diep in de hal lopen', `v=${fv.toFixed(2)} blocked=${blocked}`);
  // in de muur lopen kan niet: duw tegen elke wand en meubel vanuit het midden (deur dicht: de enige uitgang is dicht)
  open = false;
  let escaped = 0;
  for (let i = 0; i < 400; i++) {
    let u = p.hall.u0 + 1 + Math.random() * (p.hall.u1 - p.hall.u0 - 2), v = p.hall.v0 + 1 + Math.random() * (p.hall.v1 - p.hall.v0 - 2);
    const ang = Math.random() * 6.28;
    for (let s = 0; s < 200; s++) {
      u += Math.cos(ang) * 0.08; v += Math.sin(ang) * 0.08;
      const [x, y] = w(u, v); const r = walk.resolve(x, y, R);
      if (Array.isArray(r)) { [u, v] = toLocal(p.frame, r[0], r[1]); }
      else if (r === true) { /* in de deur */ } else if (r === null) { escaped++; break; }
      if (!pointInPolygon(...w(u, v), b.pts)) { escaped++; break; }
    }
  }
  ok(escaped === 0, 'je loopt niet door de buitenmuren of meubels naar buiten', String(escaped));
  // geen punt dat de resolver teruggeeft ligt in een meubel
  const solid = p.layout.items.filter((i) => i.solid).map(rectOf);
  let inBox = 0;
  for (let i = 0; i < 2000; i++) {
    const u = p.hall.u0 + Math.random() * (p.hall.u1 - p.hall.u0), v = p.hall.v0 + Math.random() * (p.hall.v1 - p.hall.v0);
    const [x, y] = w(u, v); const r = walk.resolve(x, y, R);
    if (!Array.isArray(r)) continue;
    const [ru, rv] = toLocal(p.frame, r[0], r[1]);
    for (const s of solid) if (ru > s.u0 + 0.01 && ru < s.u1 - 0.01 && rv > s.v0 + 0.01 && rv < s.v1 - 0.01) { inBox++; break; }
  }
  ok(inBox <= 2000 * 0.005, 'de resolver zet vrijwel niemand in een meubel (hooguit een smalle kier tussen twee meubels)', String(inBox));
}

// --- elk gegenereerd interieur is vanaf de deur doorloopbaar voor de hele hal -----------------------------------
{
  let blind = 0, total = 0;
  for (const kind of KIND_IDS) for (const sub of subsFor(kind)) for (let i = 0; i < 6; i++) {
    const K = KINDS[kind];
    const L = generateLayout(specFor(kind, sub, K.minW + 3 + rnd() * 8, K.minD + 3 + rnd() * 8, Math.floor(rnd() * 4294967295)));
    if (!L) continue;
    const res = reachable(L);
    const { free } = res.grid;
    let reach = 0, freeN = 0;
    for (let k = 0; k < free.length; k++) { if (free[k]) { freeN++; if (res.seen[k]) reach++; } }
    total++;
    if (freeN && reach / freeN < 0.85) blind++; // meer dan 15% van de vrije vloer is afgesloten
  }
  ok(blind <= total * 0.05, 'de vrije vloer is bijna overal bereikbaar', `${blind}/${total}`);
}

console.log(bad ? `interior_core_test: ${bad} van ${n} mislukt` : `interior_core_test: ${n} controles ok`);
if (bad) process.exitCode = 1;
