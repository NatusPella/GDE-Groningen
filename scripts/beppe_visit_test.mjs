// Een bezoek aan Beppes huis (#1063): de vroege ontgrendeling (afgeleid, nooit
// opgeslagen), een bestaande save die het huis alsnog open heeft, de keuze van
// briefje en tip per akte zonder spoilers, de dagelijkse soep per speler, de
// kaartmarker en het reisdoel, en de kamer zelf (maten, plekken, muren,
// bereikbaarheid, camera). Puur: leest game/js/beppe_visit_rules.js,
// beppe_visit_texts.js, beppe_rules.js en de bron van beppe_garden.js /
// beppe_binnen.js; geen THREE, geen DOM, geen game/world.
// Draai: node scripts/beppe_visit_test.mjs
import { readFileSync } from 'node:fs';
import { STEPS, missionIndexOf } from '../game/js/storyarc.js';
import { BEATS, TIPS, INVITE, OPEN, SOUP } from '../game/js/beppe_visit_texts.js';
import {
  UNLOCK_STEP, ACT_ORDER, VISIT, soupKey, visitUnlocked, reachedAct, timeOfDay, isRaining, eligible, pickBeat, pickNote, pickTip,
  soupState, ROOM, SPOTS, SOLIDS, SPOT_R, nearestSpot, nearDoorOutside, keepInRoom, insideRoom, roomCamera, cameraInsideRoom, canEnter,
} from '../game/js/beppe_visit_rules.js';
import { markerOf, tributeTodo, TODO_KEY } from '../game/js/beppe_rules.js';
import { TODO } from '../game/js/beppe_texts.js';

let bad = 0, n = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.error('FAIL', m + (info ? ` (${info})` : '')); } };

// --- de ontgrendeling: vroeg, afgeleid -------------------------------------------------
ok(UNLOCK_STEP === 'M01', 'het huis opent na de eerste missie (M01)');
const k1 = STEPS.findIndex((s) => s.id === 'M01');
ok(k1 >= 0 && STEPS[k1].part === 'kop', 'M01 is een stap in akte 1');
ok(STEPS.slice(0, k1).every((s) => s.kind !== 'mission'), 'vóór M01 is er geen missie gespeeld: de opening telt niet');
ok(!visitUnlocked(null) && !visitUnlocked({}) && !visitUnlocked({ done: [], completed: [] }), 'een nieuw spel: nog dicht');
ok(!visitUnlocked({ done: ['M00'], completed: [] }), 'na alleen de opening: nog dicht');
ok(visitUnlocked({ done: ['M01'], completed: [] }), 'M01 klaar: open');
ok(visitUnlocked({ done: [], completed: [missionIndexOf('M01')] }), 'de missie van M01 gehaald in de keten: open');
ok(visitUnlocked({ done: ['M03'], completed: [] }), 'een latere stap klaar (M01 overgeslagen of vooruit gespeeld): open');
// een oude save: het verhaal staat ver, de vlag is er niet in opgeslagen
const oldSave = { story: { done: ['M00', 'M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07'] }, missions: { completed: [] } };
ok(visitUnlocked({ done: oldSave.story.done, completed: oldSave.missions.completed }), 'een bestaande save voorbij M01 heeft het huis open bij het laden, zonder migratie');
const earlySave = { story: { done: ['M00'] }, missions: { completed: [] } };
ok(!visitUnlocked({ done: earlySave.story.done, completed: earlySave.missions.completed }), 'een bestaande save die nog niet voorbij M01 is: dicht');
ok(!('beppeHuis' in oldSave) && JSON.stringify(oldSave).indexOf('beppe') < 0, 'de vlag staat niet in de savegame: afgeleid');
{
  const src = readFileSync(new URL('../game/js/savegame.js', import.meta.url), 'utf8');
  ok(!/beppe/i.test(src), 'savegame.js kent geen Beppe-sleutel');
}

// --- de akte: nooit vooruit -----------------------------------------------------------------
ok(reachedAct({ done: ['M01'] }) === 'kop' && reachedAct({}) === 'kop', 'akte 1 bij M01 en bij niets');
for (const part of ACT_ORDER) {
  const first = STEPS.find((s) => s.part === part);
  if (!first) { ok(false, `akte ${part} heeft stappen`); continue; }
  ok(reachedAct({ done: [first.id] }) === part, `de eerste stap van ${part} brengt de speler in ${part}`, reachedAct({ done: [first.id] }));
}
ok(timeOfDay(8) === 'ochtend' && timeOfDay(13) === 'middag' && timeOfDay(19) === 'avond' && timeOfDay(2) === 'nacht' && timeOfDay(24 + 6) === 'ochtend', 'dagdelen');
ok(isRaining({ active: true, intensity: 0.5 }) && !isRaining({ active: false, intensity: 0.9 }) && !isRaining({ active: true, intensity: 0.05 }) && !isRaining(null), 'regen is een bui, geen mist');

// --- briefjes en tips: per akte, zonder spoilers ------------------------------------------
const ids = new Set();
for (const b of [...BEATS, ...TIPS]) {
  ok(!ids.has(b.id), `uniek id ${b.id}`); ids.add(b.id);
  ok(ACT_ORDER.includes(b.act), `${b.id} hoort bij een bestaande akte`);
  ok(typeof b.text === 'string' && b.text.length >= 20 && b.text.length <= 170, `${b.id}: een korte regel`, String(b.text && b.text.length));
  ok(!/[–—]/.test(b.text), `${b.id}: geen gedachtestreep`);
}
for (const act of ACT_ORDER) {
  const max = ACT_ORDER.indexOf(act);
  const plain = eligible(BEATS, { act, who: '', time: '', rain: false });
  ok(plain.length >= 2, `${act}: minstens twee briefjes zonder voorwaarde`, String(plain.length));
  ok(plain.every((b) => ACT_ORDER.indexOf(b.act) <= max), `${act}: geen briefje uit een latere akte`);
  // alle combinaties: nooit een regel uit een latere akte
  let seen = new Set();
  for (const who of ['tammo', 'anita', '']) for (const time of ['ochtend', 'middag', 'avond', 'nacht']) for (const rain of [false, true]) {
    for (let visit = 0; visit < 6; visit++) {
      const note = pickNote({ act, who, time, rain }, { day: visit * 3 + 1, visit });
      ok(!!note && ACT_ORDER.indexOf(note.act) <= max, `${act}: briefje ${note && note.id} loopt niet vooruit`);
      if (note) { if (note.who) ok(note.who === who, `${note.id} spreekt de juiste speler aan`); if (note.time) ok(note.time === time, `${note.id} past bij ${time}`); if (note.weather) ok(rain, `${note.id} past bij regen`); seen.add(note.id); }
      const tip = pickTip({ act, who, time, rain }, { day: visit + 1, visit });
      ok(!!tip && ACT_ORDER.indexOf(tip.act) <= max, `${act}: tip ${tip && tip.id} loopt niet vooruit`);
    }
  }
  ok(seen.size >= 3, `${act}: afwisseling over de bezoeken`, String(seen.size));
}
ok(!TIPS.some((t) => t.act === 'romp') || pickTip({ act: 'kop' }, { day: 1, visit: 0 }).act === 'kop', 'een tip uit akte 2 komt niet in akte 1');
{
  const all = new Set();
  for (let v = 0; v < 40; v++) { const t = pickTip({ act: 'kop' }, { day: v + 1, visit: v }); all.add(t.id); }
  ok(![...all].includes('tip-bieten'), 'in akte 1 geen tip over de bieten (akte 2)');
}
// nooit twee keer hetzelfde achter elkaar
{
  let last = '', repeats = 0;
  for (let v = 0; v < 60; v++) { const b = pickNote({ act: 'nazomer', who: 'tammo', time: 'avond', rain: false }, { day: 5, visit: v, last }); if (b.id === last) repeats++; last = b.id; }
  ok(repeats === 0, 'geen briefje twee keer achter elkaar', String(repeats));
}
ok(pickBeat([], {}, {}) === null, 'zonder briefjes geen keuze');
// dezelfde stand geeft dezelfde keuze (geen Math.random in de regels)
ok(pickNote({ act: 'romp', who: 'anita', time: 'middag' }, { day: 4, visit: 2 }).id === pickNote({ act: 'romp', who: 'anita', time: 'middag' }, { day: 4, visit: 2 }).id, 'de keuze is herhaalbaar');
{
  const src = readFileSync(new URL('../game/js/beppe_visit_rules.js', import.meta.url), 'utf8');
  ok(!/Math\.random|Date\.now|performance\./.test(src), 'de regels gebruiken geen klok of toeval');
}

// --- de soep: één keer per speeldag, per speler ---------------------------------------------
{
  const marks = new Set();
  const has = (set, v) => set === VISIT.set && marks.has(v);
  const s1 = soupState({ day: 3, has, health: 40, maxHealth: 100, heal: SOUP.heal, cookieMoney: SOUP.cookieMoney });
  ok(s1.due && s1.heal === SOUP.heal && s1.money === 0, 'gewond: soep geneest, geen koek');
  marks.add(soupKey(3));
  const s2 = soupState({ day: 3, has, health: 40, maxHealth: 100 });
  ok(!s2.due && s2.heal === 0 && s2.money === 0, 'dezelfde dag: niets meer');
  const s3 = soupState({ day: 4, has, health: 40, maxHealth: 100, heal: SOUP.heal, cookieMoney: SOUP.cookieMoney });
  ok(s3.due, 'de volgende dag: weer soep');
  const s4 = soupState({ day: 5, has, health: 100, maxHealth: 100, heal: SOUP.heal, cookieMoney: SOUP.cookieMoney });
  ok(s4.due && s4.heal === 0 && s4.money === SOUP.cookieMoney && s4.full, 'al fit: het gebaar is een koek met een klein bedrag');
  const s5 = soupState({ day: 6, has, health: 90, maxHealth: 100, heal: SOUP.heal, cookieMoney: SOUP.cookieMoney });
  ok(s5.heal === 10 && s5.money === SOUP.cookieMoney, 'bijna fit: gezondheid wordt niet boven het maximum gevuld, de rest is de koek');
  ok(SOUP.heal <= 30 && SOUP.cookieMoney <= 10, 'de balans is klein');
  ok(soupKey(3) !== soupKey(4) && soupKey(NaN) === 'soep:0', 'een sleutel per speeldag');
  // per speler: elke speler heeft zijn eigen merken; een tweede speler heeft de dag van de eerste niet
  const other = new Set();
  const hasOther = (set, v) => set === VISIT.set && other.has(v);
  ok(soupState({ day: 3, has: hasOther, health: 40 }).due, 'een andere speler heeft zijn eigen cooldown');
}

// --- de kaartmarker en het reisdoel ----------------------------------------------------------
{
  const site = { gardenBench: { x: 120, y: -40 }, house: { x: 100, y: -40, a: 0 } };
  const closed = markerOf(site), open = markerOf(site, true);
  ok(closed && open && open.kind === 'beppe' && closed.kind === 'beppe', 'de kaartmarker bestaat voor en na het openen (altijd zichtbaar, kaartonthulling)');
  ok(open.sub === OPEN.sub && closed.sub === TODO.sub, 'open geeft een eigen onderregel');
  ok(open.goal && open.goal.kind === 'place' && open.goal.x === 120 && open.goal.y === -40, 'de marker is een reisdoel (plek met coördinaten): Reis erheen en waypoint via de kaartactie');
  ok(open.todo === TODO_KEY, 'de marker verwijst naar de Te-doen-kaart');
  const todo = tributeTodo(site, false, true), plain = tributeTodo(site, false);
  ok(todo.detail.text.includes(OPEN.todoText) && !plain.detail.text.includes(OPEN.todoText), 'Te doen vertelt dat de deur openstaat, alleen als hij open is');
  ok(todo.goal.kind === 'place', 'Te doen heeft het reisdoel');
  ok(markerOf(null, true) === null, 'zonder plek geen marker');
}
{
  const kaart = readFileSync(new URL('../game/js/kaartonthulling.js', import.meta.url), 'utf8');
  ok(/beppe/.test(kaart.split('NOOIT_VERBORGEN_SLEUTEL')[1] || ''), 'Beppe blijft op de kaart, ook in een onbekende streek');
  const kaartactie = readFileSync(new URL('../game/js/kaartactie.js', import.meta.url), 'utf8');
  ok(/Reis erheen/.test(kaartactie), 'de kaartactie biedt Reis erheen op elke plek');
}

// --- de kamer ---------------------------------------------------------------------------------
ok(ROOM.hw === 2.8 && ROOM.hd === 3.5 && ROOM.h === 2.6, 'de kamer is het huis (5,6 x 7 x 2,6 m: houseMesh)');
{
  const src = readFileSync(new URL('../game/js/beppe_garden.js', import.meta.url), 'utf8');
  ok(/B\.box\(0, 1\.3, 0, 5\.6, 2\.6, 7,/.test(src), 'het huis buiten is nog 5,6 x 2,6 x 7 m');
  ok(/wall\(0, -3\.6, 2\.9, a\)/.test(src) && /wall\(2\.9, 0, 3\.7/.test(src), 'de buitenmuren staan als botsvlakken op de rand van de kamer');
  ok(/visitPrompt\(w, visitCtx\)/.test(src) && /visitInteract\(w, visitCtx\)/.test(src) && /visitTick\(dt, w, visitCtx\)/.test(src), 'beppe_garden geeft prompt, E en tick door aan de kamer');
  ok(/buildBeppeRoom/.test(src) && /house: houseGroup, room: roomGroup/.test(src), 'de kamer wordt met het huis gebouwd, verborgen tot de deur');
  ok(/visitStatus\(\)\.unlocked/.test(src), 'kaartmarker en Te doen kennen de open stand');
  const bin = readFileSync(new URL('../game/js/beppe_binnen.js', import.meta.url), 'utf8');
  ok(/onRespawn/.test(src) && /pendingRespawn/.test(bin), 'een respawn zet de speler uit de kamer');
  ok(/bron: BRON/.test(bin) && /roomCamera\(\)/.test(bin), 'een vaste kamercamera (cameraOverride, harde snee)');
  ok(!/Math\.random/.test(bin), 'geen toeval in de kamer');
  ok(!/storage|localStorage|saveGame/i.test(bin), 'de kamer schrijft niets naar opslag buiten de eigen lifetime-merken');
  ok(/markLifetime\(VISIT\.set, soupKey/.test(bin), 'de cooldown staat in het profiel van de speler (lifetime-merk)');
  const lines = src.split('\n').length;
  ok(lines < 900, 'beppe_garden blijft klein', String(lines));
  const scene = readFileSync(new URL('../game/js/scene3d.js', import.meta.url), 'utf8').split('\n').length;
  ok(scene < 4500, 'scene3d.js onder de 4500 regels', String(scene));
}
const cam = roomCamera();
ok(cameraInsideRoom(cam), 'de camera staat binnen de wanden en onder het plafond');
ok(cam.pos.h <= ROOM.h - ROOM.ceilMargin && cam.pos.h > 1.2, 'camerahoogte onder het plafond, boven de meubels');
ok(Number.isFinite(cam.yaw), 'de bewegingsrichting volgt de camera');
// de camera ziet de plekken: binnen de halve beeldhoek (verticaal 66 graden, 16:9)
{
  const halfH = Math.atan(Math.tan(cam.fov * Math.PI / 360) * 16 / 9);
  for (const k of ['door', 'stove', 'table', 'board']) {
    const s = SPOTS[k];
    let d = Math.atan2(s.z - cam.pos.z, s.x - cam.pos.x) - cam.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    ok(Math.abs(d) < halfH, `${k} ligt in beeld van de kamercamera`, `${(d * 57.3).toFixed(0)} graden`);
  }
}
// de plekken liggen in de kamer en niet in het meubilair; er is een plek om te staan
const inSolid = (lx, lz, r = 0) => SOLIDS.some(([x0, z0, x1, z1]) => lx > x0 - r && lx < x1 + r && lz > z0 - r && lz < z1 + r);
ok(insideRoom(SPOTS.enter.x, SPOTS.enter.z, 0) && !inSolid(SPOTS.enter.x, SPOTS.enter.z, 0.3), 'de plek na het binnenkomen is vrij');
ok(!insideRoom(SPOTS.out.x, SPOTS.out.z, 0) && SPOTS.out.x > ROOM.hw, 'buiten staat de speler op de veranda');
ok(nearDoorOutside(SPOTS.doorOutside.x, SPOTS.doorOutside.z) && !nearDoorOutside(0, 0) && !nearDoorOutside(10, 0), 'de buitendeur heeft een bereik');
ok(nearestSpot(SPOTS.enter.x, SPOTS.enter.z) === 'door', 'bij binnenkomst is de deur het dichtstbij');
const stand = { stove: { x: -1.5, z: 1.6 }, table: { x: 0, z: -0.6 }, board: { x: -0.4, z: -2.4 }, door: { x: 1.9, z: 0 } };
for (const [k, p] of Object.entries(stand)) {
  const q = keepInRoom(p.x, p.z);
  ok(Math.hypot(q.lx - p.x, q.lz - p.z) < 1e-6, `${k}: de staplek is vrij van muren en meubels`, `${q.lx.toFixed(2)},${q.lz.toFixed(2)}`);
  ok(nearestSpot(p.x, p.z) === k, `${k}: de staplek hoort bij ${k}`, String(nearestSpot(p.x, p.z)));
  ok(Math.hypot(p.x - SPOTS[k].x, p.z - SPOTS[k].z) <= SPOT_R, `${k}: binnen bereik`);
}
// bereikbaarheid: een vloed over de vrije vloer (cel 0,1 m) van de binnenkomplek naar elke staplek
{
  const step = 0.1, free = (x, z) => { const q = keepInRoom(x, z); return Math.hypot(q.lx - x, q.lz - z) < 1e-6; };
  const key = (x, z) => `${Math.round(x / step)}|${Math.round(z / step)}`;
  const seen = new Set([key(SPOTS.enter.x, SPOTS.enter.z)]);
  const q = [[SPOTS.enter.x, SPOTS.enter.z]];
  while (q.length) {
    const [x, z] = q.pop();
    for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const nx = x + dx, nz = z + dz, kk = key(nx, nz);
      if (seen.has(kk) || !free(nx, nz)) continue;
      seen.add(kk); q.push([nx, nz]);
    }
  }
  for (const [k, p] of Object.entries(stand)) ok(seen.has(key(p.x, p.z)), `${k} is te voet te bereiken vanaf de deur`);
  ok(seen.size > 300, 'de vrije vloer is ruim genoeg om te lopen', String(seen.size));
}
// niemand loopt door een muur of een meubel
for (const [x, z] of [[9, 9], [-9, -9], [0, -1.35], [-2.2, 1.6], [0, 6], [3, 0]]) {
  const q = keepInRoom(x, z);
  ok(Math.abs(q.lx) <= ROOM.hw && Math.abs(q.lz) <= ROOM.hd && !inSolid(q.lx, q.lz, 0.3), `een speler op ${x},${z} komt binnen de wanden en buiten het meubilair uit`, `${q.lx.toFixed(2)},${q.lz.toFixed(2)}`);
}
ok(insideRoom(0, 0) && !insideRoom(5, 0) && !insideRoom(0, 4.5), 'binnen/buiten');

// --- ingang -----------------------------------------------------------------------------------
{
  const base = { unlocked: true, near: true, onFoot: true, busy: false, wanted: 0, cinematic: false };
  ok(canEnter(base), 'open, bij de deur, te voet, rustig: naar binnen');
  ok(!canEnter({ ...base, unlocked: false }), 'dicht: niet naar binnen');
  ok(!canEnter({ ...base, near: false }), 'niet bij de deur: niet naar binnen');
  ok(!canEnter({ ...base, onFoot: false }), 'in een voertuig: niet naar binnen');
  ok(!canEnter({ ...base, busy: true }), 'tijdens een missie of activiteit: niet naar binnen');
  ok(!canEnter({ ...base, wanted: 2 }), 'met de politie op je hielen: niet naar binnen');
  ok(!canEnter({ ...base, cinematic: true }), 'tijdens een filmpje: niet naar binnen');
}

// --- de tekst: Nederlands, verzonnen, geen merken ---------------------------------------------
{
  const all = [...BEATS, ...TIPS].map((b) => b.text).concat([INVITE.text, INVITE.card.title, INVITE.card.body, OPEN.todoText, OPEN.sub]);
  ok(all.every((t) => !/\b(winter|sneeuw|ijs)\b/i.test(t)), 'altijd zomer: geen winter of sneeuw');
  ok(all.every((t) => !/de Grunn\b/.test(t)), 'Grunn, nooit de Grunn');
  ok(all.every((t) => !/\b(Albert Heijn|Jumbo|Coca|McDonald|Google|Facebook)\b/i.test(t)), 'geen echte merken');
  ok(!/Oma Trijntje/.test(all.join(' ')), 'Beppe is een ander personage dan Oma Trijntje: nergens verward');
}

console.log(bad ? `beppe_visit_test: ${bad} van ${n} mislukt` : `beppe_visit_test: ${n} controles ok`);
process.exit(bad ? 1 : 0);
