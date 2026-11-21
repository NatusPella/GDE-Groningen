// Samen spelen (#983, #443): de pannenkoekenwedstrijd op het Pannenkoekenschip. Iedereen bakt twee minuten op zijn eigen scherm met
// dezelfde bestellingen; de host houdt het scorebord en betaalt per plek. Alleen blijft het de gewone minigame.
//   node scripts/multiplayermatch_pannenkoek_test.mjs
// De echte pannenkoek.js en multiplayerwedstrijd.js; de wereld is een nepwereld met een nephub (zoals coopwedstrijd_test.mjs).
import './node3d.mjs';
import assert from 'node:assert/strict';

const mem = new Map();
const ECHT = /^gde-(save-v1|settings|prestaties-v1)$/;
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k) => { assert.ok(!ECHT.test(k), `test leest echte opslag: ${k}`); return mem.has(k) ? mem.get(k) : null; },
    setItem: (k, v) => { assert.ok(!ECHT.test(k), `test schrijft echte opslag: ${k}`); mem.set(k, String(v)); },
    removeItem: (k) => { assert.ok(!ECHT.test(k), `test wist echte opslag: ${k}`); mem.delete(k); },
    clear: () => mem.clear(),
  },
});
const echteMaak = document.createElement.bind(document);
// het bord van een minigame zoekt kindelementen: de testomgeving geeft overal een rustig dummy-element terug
const dummy = () => ({ addEventListener() {}, style: {}, classList: { add() {}, remove() {}, toggle() {} }, dataset: {}, set innerHTML(v) {}, get innerHTML() { return ''; }, textContent: '', hidden: true, appendChild() {}, setAttribute() {}, querySelector: dummy, querySelectorAll: () => [], closest: () => null });
document.createElement = (tag) => { const e = echteMaak(tag); e.querySelector = () => dummy(); e.querySelectorAll = () => []; return e; };
document.body = document.createElement('div');

const W = await import('../game/js/multiplayerwedstrijd.js');
const { PANNENKOEK } = await import('../game/js/pannenkoek.js');
const R = await import('../game/js/pannenkoekrules.js');
const { makeRng } = await import('../game/js/minigamekit.js');

let n = 0, fails = 0;
const t = (naam, f) => {
  n++;
  try { f(); console.log('ok  ', naam); } catch (e) { fails++; process.exitCode = 1; console.log('FAIL', naam, '\n    ' + (e.stack || e.message || e)); }
};

const ROSTER = (k = 4) => ['tammo', 'rik', 'sanne', 'bram'].slice(0, k).map((char, slot) => ({ slot, char, verbinding: 'ok' }));
function nepWereld(spelers) {
  const log = [];
  const hub = { roster: { spelers }, announce: (b, slot) => { log.push([slot, b]); return true; } };
  const world = {
    coopNet: { role: 'host', hub }, coop: { remote: false }, time: 0, meldingen: [], money: 0,
    player: { x: 0, y: 0, z: 0, angle: 0, inVehicle: null, vx: 0, vy: 0, speed: 0, exitVehicle() {} },
    map: { }, input: { wasPressed: () => false, consume() {} },
    addMessage(tekst) { this.meldingen.push(tekst); },
    coopFigures: Object.fromEntries(spelers.filter((s) => s.slot > 0).map((s) => [s.slot, { slot: s.slot, x: 0, y: 0, input: { mx: 0, my: 0, buttons: 0 } }])),
  };
  return { world, log, hub };
}
const betaald = [];
W.zetWedHaken({ betaalGast: (w, slot, geld, extra) => { betaald.push([slot, geld, extra]); return true; } });
const regel = W.WEDSTRIJDEN.get('pannenkoek');

t('de pannenkoekenwedstrijd is een puntenwedstrijd met één beurt in het vak horeca', () => {
  assert.ok(regel, 'geregistreerd');
  assert.equal(regel.soort, 'punt');
  assert.equal(regel.vak, 'horeca');
  assert.equal(regel.opties().beurten, 1);
  assert.equal(regel.opties().format(1234), '1.234 punten');
  assert.equal(typeof W.zetWedGastHaken, 'function');
});

t('zonder gasten en zonder sessie is het de gewone minigame', () => {
  assert.equal(W.wedNodigUit({ coopNet: null }, 'pannenkoek').reden, 'solo');
  assert.equal(W.wedNodigUit(nepWereld(ROSTER(1)).world, 'pannenkoek').reden, 'solo');
});

// dezelfde zaadwaarde geeft dezelfde bestellingen, ook bij een ander beeldtempo
function bestellingen(dt, seed = 1000) {
  const s = R.createPan(makeRng(seed));
  const lijst = [];
  for (let i = 0; i < 120 / dt; i++) for (const e of R.stepPan(s, dt)) if (e.type === 'guest') lijst.push(e.topping);
  return lijst;
}
t('dezelfde zaadwaarde geeft dezelfde bestellingen (60 en 20 beelden per seconde)', () => {
  const a = bestellingen(1 / 60), b = bestellingen(1 / 20);
  const k = Math.min(a.length, b.length, 8);
  assert.ok(k >= 6, `genoeg bestellingen (${k})`);
  assert.deepEqual(a.slice(0, k), b.slice(0, k));
});

t('de gast die bij de loopplank staat mag de wedstrijd vragen; ver weg niet', () => {
  const { world } = nepWereld(ROSTER());
  // de plek van het schip is een ontwerpgegeven: alleen nabij telt
  const plek = regel.plek(world);
  assert.ok(Number.isFinite(plek.x) && Number.isFinite(plek.y));
  assert.equal(regel.gastPlek(world, plek.x + 1, plek.y), true);
  assert.equal(regel.gastPlek(world, plek.x + 60, plek.y), false);
});

t('een hele wedstrijd: host en twee gasten, punten naar de host, geld per plek, niemand verliest iets', () => {
  const { world, log } = nepWereld(ROSTER());
  assert.equal(W.wedNodigUit(world, 'pannenkoek').reden, 'uitgenodigd');
  assert.deepEqual(log.filter(([, b]) => b.f === 'uit').map(([s]) => s), [1, 2, 3], 'elke gast krijgt Meedoen?');
  W.wedHandleGast(world, { k: 'wedgast', a: 'ja' }, 1);
  W.wedHandleGast(world, { k: 'wedgast', a: 'ja' }, 2);
  W.wedHandleGast(world, { k: 'wedgast', a: 'nee' }, 3);
  W.wedHostTik(world, 10.5);
  const start = log.find(([, b]) => b.f === 'start');
  assert.ok(start && start[1].punt === 1 && start[1].beurten === 1, 'de gasten krijgen een puntenstart met één beurt');
  assert.deepEqual(log.filter(([, b]) => b.f === 'start').map(([s]) => s).sort(), [1, 2]);
  assert.ok(log.some(([s, b]) => s === 3 && b.f === 'kijk'), 'wie nee zei kijkt mee op het bord');
  assert.ok(PANNENKOEK.active(), 'de host bakt zelf mee');
  // de host bakt twee minuten zonder iets te doen: 0 punten; de gasten melden hun punten
  W.wedHandleGast(world, { k: 'wedgast', a: 'punt', b: 0, p: 310 }, 1);
  W.wedHandleGast(world, { k: 'wedgast', a: 'punt', b: 0, p: 540 }, 2);
  for (let i = 0; i < 130; i++) { world.time += 1; PANNENKOEK.update(1, world); W.wedHostTik(world, 1); }
  assert.ok(!PANNENKOEK.active(), 'de host is klaar');
  const rij = (W.wedScoreRijen(world) || []);
  const eind = log.filter(([, b]) => b.f === 'eind' || b.f === 'uitslag');
  assert.ok(eind.length >= 2, `beide gasten krijgen een uitslag (${eind.length})`);
  const geld = Object.fromEntries(betaald.map(([slot, g]) => [slot, g]));
  assert.ok(geld[2] > geld[1], `de hoogste punten krijgen het meeste geld (${JSON.stringify(geld)})`);
  assert.ok(betaald.every(([, , x]) => x.vak === 'horeca'), 'in de eigen loopbaan van horeca');
  assert.equal(betaald.filter(([s]) => s === 3).length, 0, 'wie nee zei krijgt niets');
  void rij;
});

t('wegvallen: een gast die stopt telt niet mee en krijgt niets; de rest loopt door', () => {
  betaald.length = 0;
  const { world, log } = nepWereld(ROSTER(3));
  W.wedNodigUit(world, 'pannenkoek');
  W.wedHandleGast(world, { k: 'wedgast', a: 'ja' }, 1);
  W.wedHandleGast(world, { k: 'wedgast', a: 'ja' }, 2);
  W.wedHostTik(world, 10.5);
  W.wedHandleGast(world, { k: 'wedgast', a: 'weg' }, 2); // gast 2 stopt
  W.wedHandleGast(world, { k: 'wedgast', a: 'punt', b: 0, p: 200 }, 1);
  for (let i = 0; i < 130; i++) { world.time += 1; PANNENKOEK.update(1, world); W.wedHostTik(world, 1); }
  assert.ok(!PANNENKOEK.active());
  assert.equal(betaald.filter(([s]) => s === 2).length, 0, 'de gast die stopte krijgt niets');
  assert.ok(betaald.some(([s]) => s === 1), 'wie afmaakte krijgt zijn plek betaald');
  void log;
});

t('een gast die later aansluit (na de start) kijkt mee en doet niet meer mee', () => {
  const { world, log } = nepWereld(ROSTER(3));
  W.wedNodigUit(world, 'pannenkoek');
  W.wedHandleGast(world, { k: 'wedgast', a: 'ja' }, 1);
  W.wedHandleGast(world, { k: 'wedgast', a: 'nee' }, 2);
  W.wedHostTik(world, 10.5);
  assert.ok(PANNENKOEK.active());
  assert.equal(W.wedHandleGast(world, { k: 'wedgast', a: 'ja' }, 2), false, 'te laat voor een J');
  PANNENKOEK.quit(world); // opruimen
  void log;
});

t('de gastkant: de start zet hem aan het bakken, zijn punten gaan naar de host, stoppen laat de rest doorgaan', () => {
  PANNENKOEK.quit(nepWereld(ROSTER()).world);
  const verzonden = [];
  const world = {
    coopRole: 'client', coopNet: { role: 'client', session: { slot: 1, sendEvent: (b) => { verzonden.push(b); return true; } } },
    time: 0, meldingen: [], player: { x: 0, y: 0, z: 0, angle: 0, inVehicle: null, vx: 0, vy: 0, speed: 0, exitVehicle() {} },
    map: {}, input: { wasPressed: () => false, consume() {} }, addMessage(tekst) { this.meldingen.push(tekst); },
  };
  const MENSEN = [{ slot: 0, naam: 'Tammo', char: 'tammo' }, { slot: 1, naam: 'Tessa', char: 'anita' }];
  W.wedHandleHost(world, W.startEvent('pannenkoek', MENSEN, 0, { punt: 1, beurten: 1 }));
  assert.ok(PANNENKOEK.active(), 'de gast bakt op zijn eigen scherm');
  assert.equal(world.coopWedGast.score.punt, true);
  for (let i = 0; i < 130; i++) { world.time += 1; PANNENKOEK.update(1, world); }
  assert.ok(!PANNENKOEK.active(), 'na twee minuten is hij klaar');
  const punt = verzonden.find((b) => b.k === 'wedgast' && b.a === 'punt');
  assert.ok(punt && punt.b === 0 && Number.isInteger(punt.p) && punt.p >= 0, 'zijn punten gaan als wedgast-punt naar de host');
  // stoppen: alleen voor hemzelf
  W.wedHandleHost(world, W.startEvent('pannenkoek', MENSEN, 0, { punt: 1, beurten: 1 }));
  assert.ok(PANNENKOEK.active());
  PANNENKOEK.quit(world);
  assert.ok(verzonden.some((b) => b.a === 'weg'), 'de host hoort dat hij stopte');
  assert.ok(!PANNENKOEK.active());
});

console.log(fails ? `multiplayermatch_pannenkoek_test: ${n - fails}/${n} ok, ${fails} mislukt` : `multiplayermatch_pannenkoek_test: ${n}/${n} ok`);
