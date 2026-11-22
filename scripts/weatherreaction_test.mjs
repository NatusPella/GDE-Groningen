// Weerreacties van voorbijgangers (game/js/weatherreaction.js, sprint 22-11): klassen, overgangen, regels en de tik.
//   node scripts/weatherreaction_test.mjs
import * as WR from '../game/js/weatherreaction.js';
import { WEATHER_KINDS } from '../game/js/weatherstate.js';
import { mulberry32 } from '../game/js/rng.js';
import fs from 'node:fs';
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name} ${info}`); } };

// klassen
ok(WEATHER_KINDS.every((k) => ['regen', 'onweer', 'mist', 'zon', 'droog'].includes(WR.weatherClass(k))), 'elke weersoort heeft een klasse');
ok(WR.weatherClass('motregen') === 'regen' && WR.weatherClass('regenbui') === 'regen' && WR.weatherClass('onweer') === 'onweer' && WR.weatherClass('storm') === 'onweer'
  && WR.weatherClass('mist') === 'mist' && WR.weatherClass('helder') === 'zon' && WR.weatherClass('bewolkt') === 'droog' && WR.weatherClass(undefined) === 'droog', 'klassen kloppen');

// overgangen
ok(WR.reactionKey('droog', 'regen') === 'regen' && WR.reactionKey('zon', 'regen') === 'regen' && WR.reactionKey('mist', 'regen') === 'regen', 'regen begint');
ok(WR.reactionKey('regen', 'onweer') === 'onweer' && WR.reactionKey('droog', 'onweer') === 'onweer', 'onweer begint');
ok(WR.reactionKey('onweer', 'regen') === null, 'van onweer naar regen is geen nieuws');
ok(WR.reactionKey('regen', 'zon', 14) === 'opklaren' && WR.reactionKey('onweer', 'zon', 9) === 'opklaren' && WR.reactionKey('mist', 'zon', 10) === 'opklaren', 'de zon komt terug');
ok(WR.reactionKey('regen', 'zon', 23) === null && WR.reactionKey('regen', 'zon', 3) === null, 'in de nacht geen zon');
ok(WR.reactionKey('droog', 'zon', 12) === null && WR.reactionKey('zon', 'droog', 12) === null && WR.reactionKey('regen', 'droog', 12) === null, 'droog en zon wisselen is geen nieuws');
ok(WR.reactionKey('droog', 'mist') === 'mist' && WR.reactionKey('mist', 'droog') === null, 'mist valt in');
ok(WR.reactionKey('regen', 'regen') === null && WR.reactionKey(null, 'regen') === null, 'geen overgang zonder verschil of begin');

// regels: elke sleutel heeft genoeg regels, kort, Nederlands, zomers, zonder merken en zonder leed
for (const [key, lines] of Object.entries(WR.REACTION_LINES)) {
  ok(lines.length >= 5 && new Set(lines).size === lines.length, 'genoeg unieke regels', key);
  for (const t of lines) {
    ok(t.length <= 80 && t.length >= 8, 'lengte', t);
    ok(!/de Grunn/i.test(t), 'Grunn, nooit de Grunn', t);
    ok(!/sneeuw|ijs(?![a-z])|vorst|winter|kerst|schaatsen/i.test(t), 'altijd zomer', t);
    ok(!/(^|[^a-z])(google|facebook|whatsapp|coca|albert heijn|jumbo|ikea|netflix|instagram|tiktok|mcdonald)/i.test(t), 'geen echte merken', t);
    ok(!/(^|[^a-z])(hello|the|you|thanks)([^a-z]|$)/i.test(t), 'Nederlands', t);
    ok(!/dood|bloed|slachtoffer|gewond|overleden/i.test(t), 'geen leed', t);
  }
}
ok(['regen', 'onweer', 'opklaren', 'mist'].every((k) => WR.REACTION_LINES[k]), 'alle overgangen hebben regels');

// keuze: verschillend binnen een reactie, vers boven recent
const r = mulberry32(4);
const two = WR.pickReactionLines('regen', 2, [], r);
ok(two.length === 2 && two[0] !== two[1], 'twee verschillende regels');
const recent = WR.REACTION_LINES.regen.slice(0, 7);
ok(WR.pickReactionLines('regen', 1, recent, r)[0] === WR.REACTION_LINES.regen[7], 'vers boven recent');
ok(WR.pickReactionLines('regen', 1, WR.REACTION_LINES.regen, r).length === 1, 'alles recent: toch een regel');
ok(WR.pickReactionLines('onzin', 1, [], r).length === 0, 'onbekende sleutel geeft niets');
ok(WR.pickReactionLines('mist', 99, [], r).length === WR.REACTION_LINES.mist.length, 'nooit meer dan er zijn');

// de tik
const ped = (x, y, extra = {}) => ({ x, y, state: 'wander', ...extra });
const mk = (kind, clock = 14) => ({ time: 100, clock, player: { x: 0, y: 0 }, weather: { kind }, pedestrians: [ped(10, 0), ped(13, 1), ped(-12, 3)] });
const run = (w, secs, rng, step = 0.1) => { for (let t = 0; t < secs; t += step) { w.time += step; WR.tickWeatherReaction(step, w, rng); } };
const spoken = (w) => w.pedestrians.filter((p) => p.speechText);
const clear = (w) => w.pedestrians.forEach((p) => { delete p.speechText; p.speechUntil = 0; });

WR.resetWeatherReaction();
let w = mk('helder'), rng = mulberry32(7);
run(w, 30, rng);
ok(spoken(w).length === 0, 'het weer waarin je laadt geeft geen reactie');
w.weather.kind = 'regenbui';
run(w, 1, rng);
ok(spoken(w).length === 0 && WR.weatherReactionState().pending, 'niet direct: eerst een paar seconden');
run(w, WR.REACT_DELAY_MAX + 2, rng);
const said = spoken(w);
ok(said.length >= 1 && said.length <= 2 && said.every((p) => WR.REACTION_LINES.regen.includes(p.speechText)), 'regen: een of twee wandelaars reageren met een regenregel', said.map((p) => p.speechText).join('|'));
ok(WR.weatherReactionState().cooldown > 0 && !WR.weatherReactionState().pending, 'na de reactie een rustpauze');

// binnen de pauze geen tweede reactie
clear(w);
w.weather.kind = 'onweer';
run(w, 20, rng);
ok(spoken(w).length === 0, 'binnen de rustpauze geen tweede reactie');
run(w, WR.REACT_COOLDOWN, rng);
w.weather.kind = 'helder';
run(w, 1, rng);
w.weather.kind = 'onweer';
run(w, WR.REACT_DELAY_MAX + 2, rng);
ok(spoken(w).some((p) => WR.REACTION_LINES.onweer.includes(p.speechText)), 'na de pauze reageert onweer weer');

// een verouderde reactie: de bui is alweer weg voor iemand reageerde
WR.resetWeatherReaction();
w = mk('helder'); rng = mulberry32(11);
run(w, 2, rng);
w.weather.kind = 'regenbui'; run(w, 0.5, rng);
w.weather.kind = 'bewolkt'; run(w, 20, rng);
ok(spoken(w).length === 0, 'een bui die alweer weg is geeft geen late regenregel');

// de zon komt terug, alleen overdag
WR.resetWeatherReaction();
w = mk('regenbui', 15); rng = mulberry32(13);
run(w, 2, rng);
w.weather.kind = 'helder'; run(w, WR.REACT_DELAY_MAX + 2, rng);
ok(spoken(w).some((p) => WR.REACTION_LINES.opklaren.includes(p.speechText)), 'opklaren overdag');
WR.resetWeatherReaction();
w = mk('regenbui', 23); run(w, 2, rng);
w.weather.kind = 'helder'; run(w, WR.REACT_DELAY_MAX + 2, rng);
ok(spoken(w).length === 0, 'opklaren in de nacht blijft stil');

// niemand in de buurt, of alleen bezette wandelaars: geen bel, en de wacht loopt af
WR.resetWeatherReaction();
w = mk('helder'); rng = mulberry32(17);
run(w, 2, rng);
w.pedestrians = [ped(60, 0), ped(2, 0), ped(10, 1, { isCop: true }), ped(11, 1, { scene: true })];
w.weather.kind = 'regenbui'; run(w, 40, rng);
ok(spoken(w).length === 0 && !WR.weatherReactionState().pending, 'geen luisteraars: geen bel en geen blijvende wacht');

// een wandelaar die al praat blijft ongemoeid
WR.resetWeatherReaction();
w = mk('helder'); rng = mulberry32(19);
run(w, 2, rng);
w.pedestrians = [ped(10, 0, { speechText: 'Hoi', speechUntil: 1e9 })];
w.weather.kind = 'regenbui'; run(w, 20, rng);
ok(w.pedestrians[0].speechText === 'Hoi', 'een lopend gesprek wordt niet onderbroken');

// de bron: geen netwerk, geen opslag, toeval alleen als standaard van de rng-parameter
const src = fs.readFileSync(new URL('../game/js/weatherreaction.js', import.meta.url), 'utf8');
ok(!/fetch[(]|XMLHttpRequest|WebSocket|localStorage/.test(src), 'geen netwerk en geen opslag');
ok(!src.split('rng = Math.random').join('').includes('Math.random'), 'Math.random alleen als standaard van de rng-parameters');

const rt = fs.readFileSync(new URL('../game/js/regiolevenrt.js', import.meta.url), 'utf8');
ok(rt.includes("from './weatherreaction.js'") && rt.includes('tickWeatherReaction(dt, w)'), 'regiolevenrt hangt de weerreactie aan dezelfde poort als de straatpraat');

console.log(`weatherreaction_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
