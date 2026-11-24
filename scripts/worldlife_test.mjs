// Wereld levend (game/js/worldlife.js, 21-11): determinisme, variatie per kalenderdag, het beeldbudget, de zomerregels, de rolpools van de
// kleding, de bubbels en dat er geen netwerkverkeer of toevalsbron in zit. Puur Node, geen THREE.
// node scripts/worldlife_test.mjs
import fs from 'node:fs';
import * as W from '../game/js/worldlife.js';
import { LIFE_LINES, ANIMAL_LINES } from '../game/js/worldlifelines.js';
import { ROLE_POOLS } from '../game/js/clothingdata.js';
import { weekdayOf } from '../game/js/calendar.js';
import { summerLayer } from '../game/js/summerday.js';

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };
const lees = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

// -- determinisme: dezelfde dag en klok geven bij iedereen dezelfde evenementen en acteurs (Samen spelen zonder netwerkverkeer) --------
let gelijk = true;
for (let dag = 1; dag <= 60; dag++) for (let uur = 0; uur < 24; uur += 1.5) {
  if (JSON.stringify(W.lifeEvents(dag, uur)) !== JSON.stringify(W.lifeEvents(dag, uur))) gelijk = false;
  if (JSON.stringify(W.lifeRoster(dag, uur)) !== JSON.stringify(W.lifeRoster(dag, uur))) gelijk = false;
}
ok(gelijk, 'lifeEvents en lifeRoster zijn deterministisch');
const p1 = W.lifePose(W.lifeRoster(1, 12)[0], 37.5, {}), p2 = W.lifePose(W.lifeRoster(1, 12)[0], 37.5, {});
ok(JSON.stringify(p1) === JSON.stringify(p2), 'lifePose is deterministisch bij gelijke tijd');
ok(W.lifeRoster(5, 12, { x: 1e6, y: 1e6, r: 100 }).length === 0, 'ver weg van alle plekken is er niets te tekenen');

// -- variatie: elk evenement komt voor, niet elke dag hetzelfde -----------------------------------------------------------------
const dagen = {};
for (let d = 1; d <= 60; d++) {
  const dagSet = new Set();
  for (let u = 0; u < 24; u += 0.5) for (const e of W.lifeEvents(d, u)) dagSet.add(e.id);
  for (const id of dagSet) dagen[id] = (dagen[id] || 0) + 1;
}
for (const ev of W.LIFE_EVENTS) ok((dagen[ev.id] || 0) >= 8, `evenement ${ev.id} komt op genoeg van 60 dagen voor (${dagen[ev.id] || 0})`);
for (const ev of W.LIFE_EVENTS) ok(ev.id === 'eenden' || ev.id.startsWith('duiven') || ev.id === 'zwaluwen' || (dagen[ev.id] || 0) < 60, `evenement ${ev.id} is niet elke dag`);
const kenmerk = new Set();
for (let d = 1; d <= 60; d++) kenmerk.add(W.lifeEvents(d, 15).map((e) => e.id).join(','));
ok(kenmerk.size >= 12, `de middag verschilt per dag (${kenmerk.size} verschillende dagen van 60)`);

// -- de markt: alleen dinsdag, vrijdag en zaterdag (kalender), op de Vismarkt, overdag -----------------------------------------------
let marktFout = false, marktDagen = 0;
for (let d = 1; d <= 60; d++) {
  const markt = W.lifeEvents(d, 11).find((e) => e.id === 'markt');
  if (markt) { marktDagen++; if (![2, 5, 6].includes(weekdayOf(d)) || markt.place !== 'Vismarkt') marktFout = true; }
  else if ([2, 5, 6].includes(weekdayOf(d)) && summerLayer(d, 11).rain <= 0.35) marktFout = true;
  if (W.lifeEvents(d, 3).some((e) => e.id === 'markt') || W.lifeEvents(d, 20).some((e) => e.id === 'markt')) marktFout = true;
}
ok(!marktFout && marktDagen >= 20, 'markt: alleen op marktdagen (di, vr, za), op de Vismarkt, nooit in de nacht', `${marktDagen}`);

// -- het studentenfeest loopt door na middernacht (het plan van de avond ervoor) ---------------------------------------------------------
let nacht = false;
for (let d = 2; d <= 60; d++) { if (W.lifeEvents(d, 1).some((e) => e.id === 'studentenfeest' && e.day === d - 1)) nacht = true; }
ok(nacht, 'het studentenfeest loopt na middernacht door op het plan van de dag ervoor');
ok(![...Array(60).keys()].some((d) => W.lifeEvents(d + 1, 12).some((e) => e.id === 'studentenfeest')), 'geen studentenfeest overdag');

// -- het weer van de zomervariatie: regen dempt of sluit, zwaluwen alleen op mooie dagen --------------------------------------------------
let regenFout = false, zwaluwFout = false, regenDagen = 0;
for (let d = 1; d <= 400; d++) for (let u = 6; u < 22; u += 1) {
  const l = summerLayer(d, u), ev = W.lifeEvents(d, u);
  if (l.rain > 0.35) { regenDagen++; if (ev.some((e) => e.id === 'artiest' || e.id === 'wandelgroep' || e.id === 'zwaluwen')) regenFout = true; }
  if (ev.some((e) => e.id === 'zwaluwen') && !['helder', 'zacht', 'bries', 'hitte'].includes(l.kind)) zwaluwFout = true;
}
ok(regenDagen > 20 && !regenFout, 'bij regen geen straatartiest, wandelgroep of zwaluwen', `${regenDagen}`);
ok(!zwaluwFout, 'zwaluwen alleen op heldere, zachte, briesachtige of hete dagen');

// -- het beeldbudget: vast plafond, nooit meer dan het aantal instanties en draw calls van de limiet --------------------------------------
ok(W.LIFE_LIMITS.extraDrawCalls === 25 && W.LIFE_LIMITS.maxPeople <= 96 && W.LIFE_LIMITS.maxAnimals <= 64 && W.LIFE_LIMITS.maxBubbles === 2, 'LIFE_LIMITS: 25 draw calls (24 mensmeshes en de dieren), 96 mensen, 64 dieren, 2 bubbels');
let maxP = 0, maxA = 0;
for (let d = 1; d <= 90; d++) for (let u = 0; u < 24; u += 0.5) {
  const r = W.lifeRoster(d, u);
  const p = r.filter((a) => a.kind === 'people').length, a = r.length - p;
  if (p > maxP) maxP = p; if (a > maxA) maxA = a;
}
ok(maxP <= W.LIFE_LIMITS.maxPeople && maxA <= W.LIFE_LIMITS.maxAnimals, 'op elke dag en elk uur binnen de instantielimiet', `${maxP}/${maxA}`);
ok(maxP >= 30 && maxA >= 15, 'het mag ook echt druk worden (anders is het geen evenement)', `${maxP}/${maxA}`);
const src3d = lees('../game/js/worldlife3d.js'), code3d = strip(src3d);
ok((code3d.match(/new THREE\.InstancedMesh\(/g) || []).length === 2, 'worldlife3d.js bouwt de mensen en de dieren als InstancedMesh (twee plekken in de code)');
// #1330: mensen uit het echte personagesysteem (gebakken Quaternius-mensen), geen cilinders met een bol
ok(/bakeModularPose\(/.test(code3d) && !/CylinderGeometry|SphereGeometry/.test(code3d), 'worldlife3d.js tekent echte mensen, geen cilinders of bollen');
ok(!/new THREE\.(Mesh|Sprite|Points|Line|PointLight|SpotLight)\(/.test(code3d) && !/\.clone\(/.test(code3d), 'geen losse Mesh, Sprite, Points of lichten per acteur');
ok(/instanceMatrix\.setUsage|DynamicDrawUsage/.test(code3d) && /LIFE_LIMITS\.maxPeople/.test(code3d), 'de instanties hebben de limiet als grootte');
ok(/updateWorldLife\(scene, world, px, py, dt\)/.test(lees('../game/js/weather.js')), 'weather.js roept updateWorldLife aan (een plek in de renderlus)');

// -- posities: binnen de plek, op de grond (behalve zwaluw en zweefmolen), nooit NaN ---------------------------------------------------------
let poseFout = '';
const o = {};
for (const dag of [1, 2, 3, 5, 6, 9]) for (const uur of [7, 11, 15, 19, 22]) {
  for (const a of W.lifeRoster(dag, uur)) for (const t of [0, 13.7, 99, 1234.5]) {
    W.lifePose(a, t, o);
    if (![o.x, o.y, o.z, o.heading].every(Number.isFinite)) poseFout = `NaN ${a.id}`;
    const d = Math.hypot(o.x - a.cx, o.y - a.cy);
    if (d > a.r * 1.5 + 8) poseFout = `te ver ${a.id} ${d.toFixed(1)}`;
    if (o.z < 0 || (o.z > 0.3 && a.motion !== 'air' && a.motion !== 'carousel')) poseFout = `hoogte ${a.id}`;
    if (a.motion === 'air' && o.z < 6) poseFout = `zwaluw te laag ${a.id}`;
  }
}
ok(!poseFout, 'alle poses blijven bij hun plek en zijn eindig', poseFout);

// -- de rolpools van de kleding worden hergebruikt (geen eigen kledinglijst) -------------------------------------------------------------------
const rollen = new Set();
for (let d = 1; d <= 20; d++) for (const u of [8, 12, 15, 21]) for (const a of W.lifeRoster(d, u)) if (a.role) rollen.add(a.role);
ok([...rollen].every((r) => ROLE_POOLS[r]), 'elke rol in het wereldleven bestaat in ROLE_POOLS van de kleding', [...rollen].join(','));
for (const r of ['winkelier', 'voetganger', 'toerist', 'student', 'feestganger', 'wandelaar', 'sporter']) ok(rollen.has(r), `rol ${r} komt voor`);
ok(!/models3d_people|buildPersonMesh/.test(code3d) && /bakeModularPose/.test(code3d) && !/SKIN\s*=|setColorAt\(i, color\.setHex\(bodyColor/.test(code3d), 'kleding en huid komen uit het personagesysteem (modularpeople.js, per zaad), niet uit een eigen tabel (#1330)');

// -- bubbels: hoogstens twee, dichtbij, deterministisch, alleen eigen regels ------------------------------------------------------------------
const r12 = W.lifeRoster(1, 12), mid = r12.find((a) => a.ev === 'markt');
let maxSp = 0, bubbelFout = false, gehoord = new Set();
for (let t = 0; t < 600; t += 0.5) {
  const sp = W.lifeSpeakers(r12, mid.x, mid.y, t, 1, []);
  maxSp = Math.max(maxSp, sp.length);
  for (const s of sp) { if (Math.hypot(s.actor.x - mid.x, s.actor.y - mid.y) > (s.actor.kind === 'people' ? 16 : 6) + 1e-9 || !s.text) bubbelFout = true; gehoord.add(s.text); }
}
ok(maxSp <= 2 && maxSp >= 1 && !bubbelFout, 'hoogstens twee bubbels tegelijk, alleen dichtbij', `${maxSp}`);
ok(gehoord.size >= 4, 'de regels wisselen (kleine dialoogregels)', `${gehoord.size}`);
ok(JSON.stringify(W.lifeSpeakers(r12, mid.x, mid.y, 42, 1, []).map((s) => s.text)) === JSON.stringify(W.lifeSpeakers(r12, mid.x, mid.y, 42, 1, []).map((s) => s.text)), 'bubbels zijn deterministisch bij dezelfde tijd');
ok(W.lifeSpeakers(r12, mid.x + 500, mid.y, 10, 1, []).length === 0, 'ver weg praat er niemand');

// -- de regels: Nederlands, kort, geen echte merken of personen, geen winter, "Grunn" nooit "de Grunn", een regel per evenement ----------------------------
const alle = [];
for (const [id, t] of Object.entries(LIFE_LINES)) { alle.push(...t.mensen); for (const l of Object.values(t.rol || {})) alle.push(...l); ok(W.EVENT_BY_ID[id] || W.LIFE_EVENTS.some((e) => e.lines === id), `regeltabel ${id} hoort bij een evenement`); }
for (const ev of W.LIFE_EVENTS) if (ev.kind === 'people') ok(LIFE_LINES[ev.lines] && LIFE_LINES[ev.lines].mensen.length >= 5, `evenement ${ev.id} heeft minstens vijf regels`);
for (const ev of W.LIFE_EVENTS) if (ev.kind === 'animal') ok(ANIMAL_LINES[ev.species] && ANIMAL_LINES[ev.species].length >= 1, `dier ${ev.species} heeft een geluid`);
ok(new Set(alle).size === alle.length, 'geen dubbele regels');
ok(alle.every((l) => l.length <= 60 && /^[A-ZÀ-Ý]/.test(l)), 'elke regel is kort (hoogstens 60 tekens) en begint met een hoofdletter', alle.filter((l) => l.length > 60).join('|'));
const merken = /albert heijn|jumbo|lidl|aldi|coca|heineken|bavaria|ikea|google|facebook|instagram|tiktok|netflix|nokia|apple|samsung|ajax|psv|feyenoord|fc groningen/i;
ok(!alle.some((l) => merken.test(l)), 'geen echte merken of clubs in de regels');
const winter = /winter|sneeuw|vorst|ijs\b|schaats|kerst|koud/i;
ok(!alle.some((l) => /sneeuw|vorst|schaats|kerst|winter|koud/i.test(l)), 'geen winterwoorden in de regels (altijd zomer)');
ok(!/winter|sneeuw|vorst|schaats|kerst/i.test(strip(lees('../game/js/worldlife.js'))), 'geen winterwoorden in de bron');
ok(!alle.some((l) => /de Grunn\b/i.test(l)), 'nooit "de Grunn"');
ok(!alle.some((l) => /dood|bloed|sterf|wapen|schiet|steek/i.test(l)), 'geen leed in de regels');
void winter;

// -- Samen spelen: geen netwerk, geen toeval, geen echte opslag --------------------------------------------------------------------------------
const kern = strip(lees('../game/js/worldlife.js')) + strip(lees('../game/js/worldlifelines.js'));
ok(!/Math\.random|Date\.now|performance\.now|fetch\(|WebSocket|RTCPeer|localStorage|from '\.\/(net|coop)/.test(kern), 'worldlife.js: geen toeval, geen klok van het systeem, geen netwerk, geen opslag');
ok(!/\bnetwork|send\(|broadcast|coopSend/i.test(strip(src3d)), 'worldlife3d.js stuurt niets over het netwerk');
ok(!/Math\.random/.test(code3d), 'worldlife3d.js gebruikt geen toeval');

console.log(`${n - fails}/${n} checks ok`);
process.exit(fails ? 1 : 0);
