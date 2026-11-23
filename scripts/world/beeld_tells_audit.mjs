// AI-tells in beeld (23-11, docs/AI-TELLS-BEELD-23-11.md): wat een speler of publisher binnen een seconde als "goedkoop of
// gegenereerd" ziet en wat de bestaande audits (world_audit, prop_conflict_audit, placement_audit, zfight_audit, mesh_audit)
// nog niet tellen. Bouwt de stad zoals het spel (loadCityData, GameMap, models3d_buildings.js) en telt:
//   rugNaarStraat        voordeur of winkelpui op een gevel die niet naar een straat kijkt, terwijl een andere open gevel dat wel doet
//   deurAfgewend         de voordeur wijst van de dichtstbijzijnde straat af (normaal en richting naar de straat < 0)
//   deurTeLaag           voordeur lager dan DOOR_MIN (de mens van models3d_people.js is 1,62 m, een echte tot 1,9 m)
//   winkeldeurTeLaag     winkeldeur lager dan DOOR_MIN
//   luifelTeLaag         onderkant van de markies boven de stoep lager dan AWNING_MIN (je loopt er met je hoofd tegenaan)
//   bordVervormd         winkelbord waarvan de letters meer dan 20% uitgerekt of samengeperst zijn (canvas tegen bordmaat)
//   bordHalfWoord        winkelbord met een afgekapt woord
//   boomZinkt            boom (y = 0) op een talud of verhoogde weg: de grond onder de stam ligt > 10 cm hoger
//   boomZweeft           boom boven een verdiept stuk (grond > 10 cm lager)
//   boomDoorDek          boom onder een brugdek dat lager is dan de boom (de kroon steekt door het dek)
//   boomKloon            buurboom binnen 6 m met dezelfde soort, hoogte en kroonmaat (zichtbaar gekopieerd)
//   groenOpRijbaan       grasvlak, park of plantvak dat voor de helft of meer op een rijbaan ligt (een groen vlak midden op straat)
//   gevelKloon           twee buurpanden met dezelfde muurkleur, dakkleur, hoogte en soort (info: Nederlandse rijen lijken op elkaar)
//   schaal               mens tegen deur, auto en bus (vaste maten; faalt bij een verkeerde verhouding)
//
//   node scripts/world/beeld_tells_audit.mjs [--strict] [--json] [--r=1500] [--all] [--list]
//   GDE_STAD_CACHE_DIR=<map>  waar de stadscache staat (anders de tijdelijke map van het systeem)
// Zonder data/cache/province: SKIP. Drempels in CAPS: de stand na de fixes van 23-11, alleen dalen.
import '../node3d.mjs';

const args = process.argv.slice(2);
const STRICT = args.includes('--strict'), JSON_OUT = args.includes('--json'), LIST = args.includes('--list'), ALL = args.includes('--all');
const R = Number((args.find((a) => a.startsWith('--r=')) || '--r=1500').slice(4));

export const DOOR_MIN = 2.0;     // m: een deur moet hoger zijn dan een lange mens plus wat lucht
export const AWNING_MIN = 2.1;   // m: vrije doorloophoogte onder een markies
const CAPS = {
  rugNaarStraat: 0, deurTeLaag: 0, winkeldeurTeLaag: 0, luifelTeLaag: 0, bordVervormd: 0, bordHalfWoord: 0,
  // gemeten op 23-11 na de fixes (straal 1.500 m); gevelKloon is informatie (Groningse rijtjes lijken echt op elkaar)
  boomZinkt: 1, boomZweeft: 0, boomDoorDek: 0, boomKloon: 288, deurAfgewend: 2069, gevelKloon: Infinity, groenOpRijbaan: 8,
};

const log = (...a) => { if (!JSON_OUT) console.log(...a); };
const { loadCityData } = await import('../lib/loadworld.mjs');
const { GameMap } = await import('../../game/js/mapdata.js');
await import('../../game/js/player.js');
const MB = await import('../../game/js/models3d_buildings.js');
const { edgeStreet, nearestStreet } = await import('../../game/js/facadefront.js');
const { treeDims } = await import('../../game/js/greenery.js');
const SS = await import('../../game/js/shopsign.js');
const { WINKEL } = await import('../../game/js/winkelkit.js');
const THREE = await import('three');

const data = await loadCityData();
const map = new GameMap(data);
MB.setBuildingMap(map);
log('kaart geladen:', map.buildings.length, 'gebouwen,', map.trees.length, 'bomen');

const C = { x: 100.63, y: 76.18 };
const near = (x, y) => ALL || Math.hypot(x - C.x, y - C.y) <= R;
const count = {}, list = {};
const hit = (k, where) => { count[k] = (count[k] || 0) + 1; if (LIST && where) (list[k] || (list[k] = [])).push(where); };
for (const k of Object.keys(CAPS)) count[k] = 0;
const at = (x, y) => `${x.toFixed(0)},${y.toFixed(0)}`;

// ------------------------------------------------------------------ gebouwen
let built = 0, withDoor = 0, shops = 0, signs = 0;
const lookOf = new Map();
for (const b of map.buildings) {
  if (!b.pts || !b.bounds || b.landmark) continue;
  const cx = (b.bounds[0] + b.bounds[2]) / 2, cy = (b.bounds[1] + b.bounds[3]) / 2;
  if (!near(cx, cy)) continue;
  let grp;
  try { grp = MB.buildBuildingMesh(b); } catch { continue; }
  built++;
  const det = grp && grp.userData.facadeDetail;
  if (det && MB.buildingLookKey) lookOf.set(b, MB.buildingLookKey(b));
  const E = b.entrance;
  if (!E || E.archetype === 'church') continue;
  withDoor++;
  const mx = E.ax + E.tx * E.c, my = E.ay + E.ty * E.c;
  if (E.h < DOOR_MIN) hit(E.shop ? 'winkeldeurTeLaag' : 'deurTeLaag', `${at(mx, my)} h${E.h.toFixed(2)}`);
  // de gevel van de deur tegen de andere open gevels
  const edges = b._ring || [];
  const self = { ax: E.ax, ay: E.ay, tx: E.tx, ty: E.ty, nx: E.nx, ny: E.ny, len: E.len };
  if (!edgeStreet(map, b, self)) {
    const other = edges.find((e) => !e.party && e.len >= 1.6 && (Math.abs(e.ax - E.ax) > 1e-6 || Math.abs(e.ay - E.ay) > 1e-6) && edgeStreet(map, b, e));
    if (other) hit('rugNaarStraat', at(mx, my));
  }
  const s = nearestStreet(map, cx, cy, 40);
  if (s) {
    const dx = s.x - mx, dy = s.y - my, d = Math.hypot(dx, dy);
    if (d > 1 && (dx * E.nx + dy * E.ny) / d < 0) hit('deurAfgewend', at(mx, my));
  }
}
for (const b of map.buildings) {
  const F = b.shopFront;
  if (!F || !b.entrance) continue;
  const cx = (b.bounds[0] + b.bounds[2]) / 2, cy = (b.bounds[1] + b.bounds[3]) / 2;
  if (!near(cx, cy)) continue;
  shops++;
  const where = at(F.ax + F.tx * (F.s0 + F.s1) / 2, F.ay + F.ty * (F.s0 + F.s1) / 2);
  // de markies: models3d_buildings.js zet awningLow; de oude code (vóór 23-11) hing hem op top - 0,82 m
  const hasAwning = F.type && F.type !== 'kermiskraam' && WINKEL[F.type] && WINKEL[F.type].awning;
  const awningLow = F.awningLow !== undefined ? F.awningLow : (hasAwning ? F.top - 0.82 : null);
  if (awningLow !== null && awningLow < AWNING_MIN) hit('luifelTeLaag', `${where} ${awningLow.toFixed(2)}`);
  if (F.name) {
    signs++;
    // het bord zoals shopsigns3d.js het maakt (signFor); de oude code (vóór 23-11): vast canvas 512 x 80, tekst tot 26 letters
    const sf = SS.signFor ? SS.signFor(F, F.name) : { layout: SS.signLayout(F), cw: 512, text: SS.signText(F.name) };
    const L = sf.layout, cw = sf.cw, t = sf.text;
    // canvas tegen bord, en fillText die een te lange tekst in de breedte samenperst (24 px per hoofdletter)
    const st = ((L.w / L.h) / (cw / 80)) * Math.min(1, (cw - 32) / Math.max(1, t.length * 24));
    if (st < 0.8 || st > 1.25) hit('bordVervormd', `${where} ${L.w.toFixed(1)}m x${st.toFixed(2)} "${t}"`);
    const words = String(F.name).replace(/\s+/g, ' ').trim();
    if (t && !(words === t || words.startsWith(t + ' '))) hit('bordHalfWoord', `${where} "${t}"`);
  }
}
// buurpanden met precies hetzelfde uiterlijk
{
  const idx = new Map([...lookOf.keys()].map((b, i) => [b, i]));
  for (const [b, key] of lookOf) {
    if (!key) continue;
    for (const o of map.buildingsNear((b.bounds[0] + b.bounds[2]) / 2, (b.bounds[1] + b.bounds[3]) / 2, 12)) {
      if (o === b || !lookOf.has(o) || lookOf.get(o) !== key || idx.get(o) < idx.get(b)) continue;
      // alleen panden die echt aan elkaar raken (een gedeelde muur)
      const touch = b.bounds[0] <= o.bounds[2] + 0.3 && o.bounds[0] <= b.bounds[2] + 0.3 && b.bounds[1] <= o.bounds[3] + 0.3 && o.bounds[1] <= b.bounds[3] + 0.3;
      if (touch) hit('gevelKloon');
    }
  }
}

// ------------------------------------------------------------------ bomen
let trees = 0;
for (const t of map.trees) {
  if (!near(t[0], t[1]) || t._broken) continue;
  trees++;
  const d = treeDims(t);
  const H = d.h, R0 = d.r, sp = d.sp;
  const g0 = map.groundHeightAt(t[0], t[1], 0);
  const top = map.groundHeightAt(t[0], t[1], 1000);
  const where = at(t[0], t[1]);
  if (g0 > 0.1) hit('boomZinkt', `${where} +${g0.toFixed(2)}`);
  else if (g0 < -0.1) hit('boomZweeft', `${where} ${g0.toFixed(2)}`);
  if (top > 2 && top < H && g0 < 0.5) hit('boomDoorDek', `${where} dek ${top.toFixed(1)} boom ${H.toFixed(1)}`);
  for (const o of map.treesNear(t[0], t[1], 6)) {
    if (o === t || o[0] < t[0] || (o[0] === t[0] && o[1] <= t[1])) continue;
    const e = treeDims(o);
    if (e.sp === sp && Math.abs(e.h - H) < 0.25 && Math.abs(e.r - R0) < 0.1) hit('boomKloon', where);
  }
}

// ------------------------------------------------------------------ groen op de rijbaan
// een grasvlak, park of plantvak (map.green) dat voor de helft of meer op een rijbaan ligt (binnen de halve breedte van een
// auto-weg op straatniveau): een groen vlak midden op straat. In beeld laat grass.js (pavedTester) de driehoeken op verharding al
// weg en tekent het gras onder de weg; dit is de stand in de data, de teller bewaakt dat het er niet meer worden.
{
  const { pointInPolygon } = await import('../../game/js/util.js');
  const onCarriageway = (x, y) => {
    for (const r of map.roadsNear(x, y, 12)) {
      if (!(r.cat === 'major' || r.cat === 'normal' || r.cat === 'minor') || r.type === 'track' || r.bridge || r.tunnel || r.layer) continue;
      const hw = (r.width || 4) / 2, P = r.pts;
      for (let i = 0; i < P.length - 1; i++) {
        const ax = P[i][0], ay = P[i][1], dx = P[i + 1][0] - ax, dy = P[i + 1][1] - ay, l2 = dx * dx + dy * dy;
        let t = l2 > 1e-9 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
        t = Math.max(0, Math.min(1, t));
        if ((x - ax - dx * t) ** 2 + (y - ay - dy * t) ** 2 < hw * hw) return true;
      }
    }
    return false;
  };
  for (const g of map.green || []) {
    const P = g.pts;
    if (!P || P.length < 3) continue;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const q of P) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
    if (!near((x0 + x1) / 2, (y0 + y1) / 2)) continue;
    const st = Math.max(1, Math.min(4, Math.sqrt((x1 - x0) * (y1 - y0)) / 8));
    let n = 0, on = 0;
    for (let x = x0 + st / 2; x < x1; x += st) for (let y = y0 + st / 2; y < y1; y += st) {
      if (!pointInPolygon(x, y, P)) continue;
      n++;
      if (onCarriageway(x, y)) on++;
    }
    if (n && on / n >= 0.5) hit('groenOpRijbaan', `${at((x0 + x1) / 2, (y0 + y1) / 2)} ${g.kind || ''} ${(x1 - x0).toFixed(0)}x${(y1 - y0).toFixed(0)} m`);
  }
}

// ------------------------------------------------------------------ schaal
const schaal = [];
{
  const { buildPersonMesh } = await import('../../game/js/models3d_people.js');
  const { buildVehicleMesh, setHorseMeshBuilder } = await import('../../game/js/models3d_vehicles.js');
  try { const { buildHorseMesh } = await import('../../game/js/countryside.js'); setHorseMeshBuilder(buildHorseMesh); } catch { /* geen paard nodig */ }
  const box = (o) => new THREE.Box3().setFromObject(o);
  const person = box(buildPersonMesh(0x3366aa, 0xe0b090));
  const ph = person.max.y - person.min.y;
  const car = (name, len, wid, extra = {}) => ({ model: { name, len, wid, color: '#888888', ...extra.model }, ...extra.v });
  const veh = (v) => { const b = box(buildVehicleMesh(v)); return { h: b.max.y - b.min.y, l: Math.max(b.max.x - b.min.x, b.max.z - b.min.z) }; };
  const hatch = veh(car('hatch', 3.8, 1.7)), sedan = veh(car('sedan', 4.3, 1.8));
  const bus = veh(car('midibus', 8.4, 2.3, { v: { isBus: true } }));
  const rule = (ok, name) => { schaal.push({ ok, name }); if (!ok) hit('schaal', name); };
  rule(ph > 1.6 && ph < 1.95, `mens ${ph.toFixed(2)} m (1,60 tot 1,95)`);
  rule(hatch.h > 0.7 * ph && hatch.h < 1.1 * ph, `hatchback ${hatch.h.toFixed(2)} m hoog tegen mens ${ph.toFixed(2)} (0,7 tot 1,1 x)`);
  rule(sedan.l > 2 * ph, `sedan ${sedan.l.toFixed(2)} m lang, meer dan 2 x de mens`);
  rule(bus.h > 1.5 * ph, `bus ${bus.h.toFixed(2)} m hoog, meer dan 1,5 x de mens`);
  rule(DOOR_MIN > ph + 0.15, `deur ${DOOR_MIN} m boven mens ${ph.toFixed(2)} + 0,15`);
}

// ------------------------------------------------------------------ uitslag
const out = { r: ALL ? 'alles' : R, gebouwen: built, metDeur: withDoor, winkels: shops, borden: signs, bomen: trees, count, caps: CAPS, schaal };
if (JSON_OUT) console.log(JSON.stringify(LIST ? { ...out, list } : out, null, 1));
else {
  log(`gebouwd ${built} (met deur ${withDoor}, winkels ${shops}, borden ${signs}), bomen ${trees}, straal ${ALL ? 'alles' : R + ' m'}`);
  for (const k of Object.keys(count)) log(`${k.padEnd(20)} ${String(count[k]).padStart(7)}${Number.isFinite(CAPS[k]) ? `  (max ${CAPS[k]})` : ''}`);
  for (const s of schaal) log(`${s.ok ? 'ok  ' : 'FOUT'} schaal: ${s.name}`);
  if (LIST) for (const [k, v] of Object.entries(list)) { log(`\n${k}:`); for (const w of v.slice(0, 40)) log('  ' + w); }
}
let bad = 0;
for (const [k, cap] of Object.entries(CAPS)) if (Number.isFinite(cap) && (count[k] || 0) > cap) { bad++; log(`BOVEN DREMPEL ${k}: ${count[k]} > ${cap}`); }
if ((count.schaal || 0) > 0) bad++;
process.exit(STRICT && bad ? 1 : 0);
