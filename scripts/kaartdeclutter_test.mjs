// Declutter van de kaartplekken per zoom (21-11, docs/KAART-DECLUTTER-21-11.md): op zoom 6 overspoelden de
// restaurants in het centrum de kaart. Pure test van game/js/mapdeclutter.js met de echte horecaplekken
// van het centrum (game/facilities.json): dichtheid per zoom binnen de limiet, prioriteit, geen overlap,
// determinisme, stabiliteit bij schuiven en geen herberekening per frame.
//   node scripts/kaartdeclutter_test.mjs
import fs from 'node:fs';
import { poiRules, zoomBucket, fadeIn, clusterGrid, mergeClose, createHorecaPlanner, capPins, MAX_PINS_ABSOLUTE } from '../game/js/mapdeclutter.js';
import { placeIcons, isKeptKind, mapPriority } from '../game/js/mapicons.js';
import { iconMinZoom } from '../game/js/mapstyle.js';
import { wgsToWorld } from '../game/js/rdnew.js';

let n = 0, fails = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fails++; console.log('FAIL ' + naam + (info ? ' :: ' + info : '')); } };

// de echte horeca van het centrum (de Grote Markt en zijn omgeving, 1,2 km)
export function centrumHoreca() {
  const j = JSON.parse(fs.readFileSync(new URL('../game/facilities.json', import.meta.url), 'utf8'));
  const kind = j.kinds.indexOf('horeca');
  const [cx, cy] = wgsToWorld(53.2194, 6.5665);
  return j.f.filter((r) => r[0] === kind).map((r, i) => { const [x, y] = wgsToWorld(r[1], r[2]); return { x, y, name: 'plek ' + i }; })
    .filter((p) => Math.hypot(p.x - cx, p.y - cy) < 1200).map((p) => ({ ...p, c: [cx, cy] }));
}
const spots = centrumHoreca();
const [CX, CY] = spots.length ? spots[0].c : [0, 0];
ok(spots.length >= 60, 'het centrum heeft veel horeca (de aanleiding)', String(spots.length));

// het scherm: 1280 x 720 px, zoom 1 is het stadsbeeld (ongeveer 0,2 px per meter), zoom 6 dus 1,2 px per meter
const CW = 1280, CH = 720, BASE = 0.2;
const view = (z, cx = CX, cy = CY) => {
  const s = BASE * z;
  return { zoom: z, scale: s, x0: cx - CW / 2 / s, x1: cx + CW / 2 / s, y0: cy - CH / 2 / s, y1: cy + CH / 2 / s };
};

// 1. de regels per zoom: 0 horeca onder de startzoom, begrensd, glad, nooit boven het totaalmaximum
ok(iconMinZoom('horeca') === 6, 'horeca begint op zoom 6 (ICON_MIN_ZOOM)');
for (let z = 1; z < 6; z += 0.5) ok(poiRules(z).horecaMax === 0, `zoom ${z}: nog geen horeca`);
for (let z = 6; z <= 12; z += 1) ok(poiRules(z).horecaMax > 0 && poiRules(z).cellPx > 0, `zoom ${z}: horeca met een groepsgrootte`);
let vorig = poiRules(0.5);
for (let z = 0.55; z <= 12; z += 0.05) {
  const r = poiRules(z);
  ok(r.horecaMax >= vorig.horecaMax || z < 0.6, `het horecamaximum daalt niet bij inzoomen (zoom ${z.toFixed(2)})`);
  ok(r.maxPins <= MAX_PINS_ABSOLUTE && r.maxPins >= 40, `zoom ${z.toFixed(2)}: maximum aantal pins ${r.maxPins} binnen 40-80`);
  ok(z < 6.1 || Math.abs(r.horecaMax - vorig.horecaMax) <= 3, `geen sprong in het horecamaximum (zoom ${z.toFixed(2)})`, `${vorig.horecaMax} -> ${r.horecaMax}`);
  vorig = r;
}
ok(poiRules(NaN).maxPins > 0 && poiRules(-1).maxPins > 0 && poiRules(99).maxPins === MAX_PINS_ABSOLUTE, 'rare zoomwaarden vallen in de tabel');

// 2. dichtheid per zoom 1 tot 8 (en daarboven) in het centrum: binnen de limiet en nooit overlap
const iconPx = 21; // MIN_ICON_PX: een icoon is minstens zo breed
for (const z of [1, 2, 3, 4, 5, 6, 6.5, 7, 7.5, 8, 9, 10, 12]) {
  const plan = createHorecaPlanner()(spots, view(z));
  const r = poiRules(z);
  ok(plan.length <= r.horecaMax, `zoom ${z}: ${plan.length} horeca-iconen binnen het maximum ${r.horecaMax}`);
  if (z < 6) ok(plan.length === 0, `zoom ${z}: geen horeca`);
  let minD = Infinity;
  const s = BASE * z;
  for (let i = 0; i < plan.length; i++) for (let j = i + 1; j < plan.length; j++) minD = Math.min(minD, Math.hypot(plan[i].x - plan[j].x, plan[i].y - plan[j].y) * s);
  ok(plan.length < 2 || minD >= iconPx * 1.2, `zoom ${z}: geen overlap, kleinste afstand ${minD.toFixed(0)} px`);
  const inbeeld = plan.every((p) => p.x > view(z).x0 - 200 / s && p.x < view(z).x1 + 200 / s);
  ok(inbeeld, `zoom ${z}: alleen wat bij het beeld hoort`);
  const totaal = plan.reduce((a, p) => a + p.n, 0);
  ok(totaal <= spots.length, `zoom ${z}: een groep telt geen plekken dubbel (${totaal} <= ${spots.length})`);
}
// op zoom 6 een handvol groepen in plaats van de hele straat vol
const z6 = createHorecaPlanner()(spots, view(6));
ok(z6.length >= 1 && z6.length <= 12, `zoom 6 in het centrum: ${z6.length} iconen (was: alle ${spots.filter((p) => Math.abs(p.x - CX) < 750 && Math.abs(p.y - CY) < 420).length} plekken in beeld)`);
ok(z6.some((p) => p.n > 1), 'zoom 6: dichte plekken zijn een groep met aantal');
// inzoomen klapt een groep open: op zoom 12 zijn er meer en kleinere groepen dan op zoom 6 (gelijk beeldmidden)
const z12 = createHorecaPlanner()(spots, view(12));
ok(z12.length > 0 && z12.filter((p) => p.n === 1).length >= 1, 'zoom 12: losse plekken');
ok(Math.max(...z12.map((p) => p.n)) <= Math.max(...z6.map((p) => p.n)), 'inzoomen maakt de groepen kleiner');

// 3. determinisme: de volgorde van de bron doet er niet toe
const door = [...spots].reverse();
for (const z of [6, 7, 8, 10]) {
  const a = createHorecaPlanner()(spots, view(z)), b = createHorecaPlanner()(door, view(z));
  ok(JSON.stringify(a.map((p) => [p.x, p.y, p.n])) === JSON.stringify(b.map((p) => [p.x, p.y, p.n])), `zoom ${z}: dezelfde uitkomst bij een andere volgorde`);
}

// 4. geen herberekening per frame: hetzelfde beeld geeft hetzelfde resultaat (zelfde object); schuiven laat groepen staan
{
  const plan = createHorecaPlanner();
  const a = plan(spots, view(7));
  ok(plan(spots, view(7)) === a, 'hetzelfde beeld: het gecachte plan, niets herberekend');
  const b = plan(spots, view(7, CX + 5, CY + 5));
  const sleutel = (p) => `${Math.round(p.x)},${Math.round(p.y)}`;
  const inBeide = a.filter((p) => b.some((q) => sleutel(q) === sleutel(p)));
  ok(inBeide.length >= Math.min(a.length, b.length) - 1, 'een klein stukje schuiven laat de groepen op hun plek (geen flikkering)');
  ok(inBeide.every((p) => p.n === b.find((q) => sleutel(q) === sleutel(p)).n), 'en met hetzelfde aantal');
  // zoomstappen: binnen een kwartoctaaf blijft de groepering gelijk
  ok(zoomBucket(6.0) === zoomBucket(6.05) && zoomBucket(6) !== zoomBucket(7), 'de groepering volgt kwartoctaaf-stappen');
}

// 5. de laag zet horeca in de wachtrij: een winkel, thuis of een doel wint van horeca (de botsingsregel van placeIcons)
{
  const gap = 30;
  const uit = placeIcons([{ kind: 'horeca', sx: 100, sy: 100 }, { kind: 'shop-snack', sx: 104, sy: 102 }, { kind: 'home', sx: 400, sy: 400 }, { kind: 'horeca', sx: 404, sy: 402 }], gap);
  ok(uit.some((p) => p.kind === 'shop-snack') && !uit.some((p) => p.kind === 'horeca'), 'winkels en thuis winnen van horeca op dezelfde plek');
}

// 6. het maximum aan pins: de belangrijkste winnen, wat je nooit weg wilt drukken blijft
{
  const pins = [{ kind: 'player', sx: 1, sy: 1 }, { kind: 'userWaypoint', sx: 2, sy: 2 }, { kind: 'perceel-eigen-1', sx: 3, sy: 3 }];
  for (let i = 0; i < 100; i++) pins.push({ kind: i % 3 === 0 ? 'horeca' : i % 3 === 1 ? 'shop-snack' : 'hospital', sx: i * 40, sy: 10 });
  const kort = capPins(pins, 60);
  ok(kort.length === 3 + 60, 'het maximum geldt voor de losse pins: 60 plus de blijvers', String(kort.length));
  ok(['player', 'userWaypoint', 'perceel-eigen-1'].every((k) => kort.some((q) => q.kind === k)), 'speler, doel en eigen bezit blijven altijd');
  const weg = pins.filter((q) => !kort.includes(q));
  const laagsteBlijft = Math.min(...kort.filter((q) => !isKeptKind(q.kind)).map((q) => mapPriority(q.kind)));
  ok(weg.every((q) => mapPriority(q.kind) <= laagsteBlijft), 'alleen de laagste prioriteit valt weg: horeca eerst, dan winkels');
  ok(kort.filter((q) => q.kind === 'hospital').length === pins.filter((q) => q.kind === 'hospital').length, 'diensten (zorg) blijven staan voor winkels en horeca');
  ok(JSON.stringify(capPins(pins, 60).map((q) => q.sx)) === JSON.stringify(kort.map((q) => q.sx)), 'deterministisch');
  ok(capPins(pins.slice(0, 10), 60).length === 10, 'onder het maximum blijft alles');
  ok(isKeptKind('player') && !isKeptKind('horeca'), 'blijvers: speler ja, horeca nee');
}

// 7. de hulpfuncties
{
  const g = clusterGrid([{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 500, y: 500 }], 50);
  ok(g.length === 2 && g[0].n === 2 && g[1].n === 1, 'clusterGrid: twee dicht bij elkaar vormen een groep');
  ok(clusterGrid([{ x: NaN, y: 1 }, { x: 1, y: 1 }], 50).length === 1, 'clusterGrid: een plek zonder geldige plek telt niet mee');
  const m = mergeClose([{ x: 0, y: 0, n: 5 }, { x: 10, y: 0, n: 1 }, { x: 100, y: 0, n: 2 }], 30);
  ok(m.length === 2 && m[0].n === 6, 'mergeClose: de kleine gaat in de grote');
  ok(fadeIn(6, 6) < 0.5 && fadeIn(8, 6) === 1 && fadeIn(6.3, 6) > fadeIn(6, 6), 'fadeIn: horeca komt zacht binnen vanaf zijn startzoom');
  ok(fadeIn(3, 0) === 1, 'fadeIn zonder startzoom: meteen vol');
}

console.log(`kaartdeclutter_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
