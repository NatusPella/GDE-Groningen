// De vijf controller-gaten van #151, zonder echte controller: eerst de tabellen (controls.js,
// padscreens.js), daarna de situatiekeuze van gamepad.js in een nepbrowser met een nep-pad.
//   node scripts/pad_extra_test.mjs
import { PAD_MAPS, PAD_BUTTONS, padSlotFor } from '../game/js/controls.js';
import { padCan } from '../game/js/padscreens.js';

let fails = 0, n = 0;
const ok = (c, name, extra) => { n++; if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };

// --- 1. bijbanen en tekstpanelen: de cijfers 1-4, Tab en Backspace ----------------------------
// stagechoice.js, sidejob_rechtbank.js, sidejob_boa.js en sidejob_snackbar.js lezen ze; gamepad.js
// kiest de minigame-indeling zodra zo'n paneel de invoer opeist (world.minigameUntil).
for (const k of ['1', '2', '3', '4', 'backspace', 'tab']) ok(padCan('minigame', k), `minigame: ${k} heeft een knop`);
ok(['1', '2', '3', '4'].every((k) => padSlotFor(k, 'minigame') !== null), 'minigame: elk antwoordcijfer zit op de D-pad');
ok(new Set(['1', '2', '3', '4'].map((k) => padSlotFor(k, 'minigame'))).size === 4, 'minigame: elk cijfer op een eigen knop');
ok(padSlotFor('BACKSPACE', 'minigame') === 'b', 'minigame: B stopt het paneel');
// de voetindeling zelf blijft zoals hij was (radio, kusje, verhaal overslaan, lakmenu)
ok(padSlotFor('N', 'foot') === 'up' && padSlotFor('K', 'foot') === 'down' && padSlotFor('O', 'foot') === 'left' && padSlotFor('R', 'foot') === 'right', 'foot: de D-pad houdt radio, kusje, verhaal en garage');

// --- 2. Samen spelen: J of N ----------------------------------------------------------------
ok(padSlotFor('J', 'coopvraag') === 'a' && padSlotFor('N', 'coopvraag') === 'b', 'coopvraag: A is ja, B is nee');
ok(PAD_MAPS.coopvraag.stick === 'move', 'coopvraag: je kunt ondertussen doorlopen');
// N zit niet op de D-pad omhoog: die zet de radio aan
ok(PAD_MAPS.coopvraag.up !== 'n' && !['up', 'down', 'left', 'right'].some((s) => PAD_MAPS.coopvraag[s] === 'n'), 'coopvraag: N zit niet op de D-pad (geen radio)');
ok(PAD_MAPS.foot.up === 'n', 'foot: de radio blijft op D-pad omhoog staan');
ok(padSlotFor('ESCAPE', 'coopvraag') === 'start', 'coopvraag: Start blijft de pauzeknop');

// --- 3. de schermen van Samen spelen: menu-indeling -----------------------------------------
// coophold.js (wachten op een weggevallen speler) en multiplayerhostwisselui.js (het spel overnemen):
// de laatste werkt met de coopvraag-indeling (J/N), de eerste met de menu-indeling (pijlen + A).
ok(PAD_MAPS.menu.a === 'enter' && PAD_MAPS.menu.b === 'escape', 'menu: A kiest, B gaat terug (de knoppen van het wachtscherm)');
ok(PAD_MAPS.menu.stick === 'nav' && PAD_MAPS.menu.up === 'arrowup', 'menu: de stick en de pijlen lopen langs de knoppen');

// --- 4. hengelen te voet ---------------------------------------------------------------------
ok(padCan('hengelen', 'i') && padSlotFor('I', 'hengelen') === 'x', 'hengelen: X hengelt aan de waterkant');
ok(PAD_MAPS.hengelen.y === 'e', 'hengelen: Y blijft instappen en gebruiken');
// te voet blijft X de tweede gebruikstoets: daar komt de hengelsituatie pas als de hint er staat
ok(PAD_MAPS.foot.x === 'f' && padSlotFor('I', 'foot') === null, 'foot: X blijft F, hengelen heeft een eigen situatie');
ok(PAD_MAPS.vehicle.down === 'i', 'vehicle: D-pad omlaag hengelt in een stilliggende boot');

// --- 5. de trekker en de zeilboot ------------------------------------------------------------
ok(padSlotFor('G', 'trekker') === 'up', 'trekker: G (aftakas) op D-pad omhoog');
ok(padSlotFor('X', 'trekker') === 'b', 'trekker: X (ontkoppelen) op B');
ok(padSlotFor('R', 'trekker') === 'down', 'trekker: R (tanken) op D-pad omlaag');
ok(padSlotFor('T', 'trekker') === 'lb' && padSlotFor('E', 'trekker') === 'y', 'trekker: de hef op LB en koppelen op Y');
ok(PAD_MAPS.trekker.stick === 'steer' && PAD_MAPS.trekker.rt === '@gas' && PAD_MAPS.trekker.lt === '@brake', 'trekker: gas, rem en sturen als een auto');
// een zeilboot vaart met de skûtsje-indeling; daar zitten Q en Z al op de bumpers
ok(padSlotFor('Z', 'skutsje') === 'lb' && padSlotFor('Q', 'skutsje') === 'rb', 'skutsje: zeil vieren op LB, aanhalen op RB');

// elke nieuwe situatie heeft een pauze- of terugknop en een stick
for (const ctx of ['coopvraag', 'hengelen', 'trekker']) {
  ok(!!PAD_MAPS[ctx], `${ctx}: bestaat`);
  ok(Object.values(PAD_MAPS[ctx]).includes('escape'), `${ctx}: een pauze- of terugknop`);
  ok(typeof PAD_MAPS[ctx].stick === 'string', `${ctx}: de stick doet iets`);
}

// --- de situatiekeuze van gamepad.js, tegen een nepbrowser ------------------------------------
class ClassList {
  constructor() { this.s = new Set(); }
  add(c) { this.s.add(c); }
  remove(c) { this.s.delete(c); }
  toggle(c, on) { (on === undefined ? !this.s.has(c) : on) ? this.s.add(c) : this.s.delete(c); }
  contains(c) { return this.s.has(c); }
}
const el = () => ({ classList: new ClassList(), dataset: {}, querySelector: () => null, querySelectorAll: () => [], contains: () => false, appendChild() {}, remove() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }) });
class KeyboardEvent extends Event {
  constructor(type, init = {}) { super(type, init); Object.assign(this, { key: init.key, code: init.code, repeat: !!init.repeat }); }
}
const win = new EventTarget();
globalThis.KeyboardEvent = KeyboardEvent;
globalThis.window = win;
// de hengelhint van prompts.js: alleen als die rij er staat, hengelt X
let hengelRij = null;
globalThis.document = Object.assign(new EventTarget(), {
  documentElement: el(), body: el(), activeElement: null,
  querySelector: (s) => (String(s).includes('hengel-vrij') ? hengelRij : null),
  querySelectorAll: () => [], getElementById: () => null, pointerLockElement: null,
});
let rafCb = null;
globalThis.requestAnimationFrame = (f) => { rafCb = f; return 1; };
const pads = [];
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => pads, userAgent: 'node' } });

const { Input } = await import('../game/js/input.js');
const { initGamepad } = await import('../game/js/gamepad.js');

const input = new Input(win);
const world = { player: { inVehicle: null }, time: 0, health: 100 };
initGamepad(input, world, { menuOpen: () => false, phoneOpen: () => false, pauseOpen: () => false, mapOpen: () => false });
const seen = [];
win.addEventListener('keydown', (e) => seen.push(e.key));
win.addEventListener('keyup', () => {});

let now = 1000;
let threw = null;
const frame = (k = 1) => { for (let i = 0; i < k; i++) { now += 16; try { rafCb(now); } catch (e) { threw = threw || e; } } };
const pad = { id: 'Xbox 360 Controller (XInput STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: PAD_BUTTONS.map(() => ({ pressed: false, value: 0 })) };
pads[0] = pad;
const press = (slot, on = true) => { const b = pad.buttons[PAD_BUTTONS.indexOf(slot)]; b.pressed = on; b.value = on ? 1 : 0; };
const druk = (slot) => { seen.length = 0; press(slot); frame(2); press(slot, false); frame(1); return seen.slice(); };
const ctx = () => document.documentElement.dataset.padCtx;
const zet = (patch) => {
  Object.assign(world, { minigameUntil: 0, coopHold: false, coopGastVraag: null, coopStem: null, coopUitnodiging: null, coopWisselUi: null, coopNet: null, coopWedGast: null, pvpArenaUitn: null, noLookBack: false });
  world.player.inVehicle = null;
  Object.assign(world, patch);
  hengelRij = null;
  frame(2);
  ok(threw === null, `geen uitzondering in de pollronde (${ctx()})`, threw && String(threw));
};

document.body.classList.add('game-started');
press('down'); frame(2); press('down', false); frame(2); // het pad wordt wakker
ok(ctx() === 'foot', 'te voet begint in de voetindeling', ctx());

// 1. een bijbaanpaneel (rechtbank, boa, snackbar) of tekstpaneel eist de invoer op
zet({ time: 10, minigameUntil: 10.25 });
ok(ctx() === 'minigame', 'een paneel kiest de minigame-indeling', ctx());
ok(druk('up').includes('1'), 'paneel: D-pad omhoog kiest antwoord 1', seen);
ok(druk('down').includes('3') && druk('b').includes('Backspace'), 'paneel: D-pad omlaag is 3, B is Backspace');
// in een rijdende taxi of bus houdt de speler de voertuigindeling
zet({ time: 10, minigameUntil: 10.25, player: { inVehicle: { speed: 2 } } });
ok(ctx() === 'vehicle', 'een bijbaan in een voertuig houdt de voertuigindeling', ctx());

// 2. Samen spelen vraagt J of N
zet({ coopGastVraag: { rest: 12 } });
ok(ctx() === 'coopvraag', 'de vraag aan de gastheer kiest de coopvraag-indeling', ctx());
ok(druk('a').includes('j'), 'coopvraag: A stuurt J', seen);
ok(druk('b').includes('n'), 'coopvraag: B stuurt N', seen);
ok(!druk('up').includes('n'), 'coopvraag: de D-pad zet de radio niet aan', seen);
zet({ coopWisselUi: { vraag: { rest: 9 } } });
ok(ctx() === 'coopvraag', 'het overnemen van het spel kiest de coopvraag-indeling', ctx());
zet({ coopNet: { role: 'host', wed: { u: { keuze: ['wacht'] } } } });
ok(ctx() === 'coopvraag', 'een wedstrijduitnodiging kiest de coopvraag-indeling', ctx());
zet({ coopNet: { role: 'host', wed: { uitslag: {} } } });
ok(ctx() === 'coopvraag', 'de uitslag met rematch kiest de coopvraag-indeling', ctx());
zet({ pvpArenaUitn: { keuze: ['wacht'] } });
ok(ctx() === 'coopvraag', 'de PvP-arena-vraag kiest de coopvraag-indeling', ctx());

// 3. het wachtscherm als een speler wegvalt: de menu-indeling
zet({ coopHold: true, coopNet: { role: 'host' } });
ok(ctx() === 'menu', 'het wachtscherm kiest de menu-indeling', ctx());
ok(druk('a').includes('Enter') && druk('b').includes('Escape'), 'wachtscherm: A kiest, B gaat terug');

// 4. hengelen aan de waterkant
zet({});
hengelRij = {}; frame(2);
ok(ctx() === 'hengelen', 'de hengelhint kiest de hengelsituatie', ctx());
ok(druk('x').includes('i'), 'hengelen: X stuurt I', seen);
hengelRij = null; frame(2);
ok(ctx() === 'foot', 'zonder hengelhint is het weer de voetindeling', ctx());
ok(druk('x').includes('f'), 'zonder hengelhint: X is weer F', seen);

// 5. de trekker op het erf en de zeilboot
zet({ player: { inVehicle: { speed: 0, farm: 'trekker1' } } });
ok(ctx() === 'trekker', 'een landbouwmachine kiest de trekkerindeling', ctx());
ok(druk('up').includes('g'), 'trekker: D-pad omhoog is de aftakas (G)', seen);
ok(druk('b').includes('x'), 'trekker: B koppelt los (X)', seen);
ok(druk('down').includes('r'), 'trekker: D-pad omlaag tankt (R)', seen);
ok(druk('lb').includes('t'), 'trekker: LB is de hef (T)', seen);
zet({ player: { inVehicle: { speed: 0, model: { zeil: true } } } });
ok(ctx() === 'skutsje', 'een zeilboot kiest de skûtsje-indeling', ctx());
ok(druk('lb').includes('z') && druk('rb').includes('q'), 'zeilboot: LB viert het zeil (Z), RB haalt aan (Q)');

// 6. het vliegtuig (#502): de D-pad is het roer, net als Q en E op het toetsenbord
// In de kist waren D-pad links/rechts Overslaan (O) en Stop (Backspace); het roer links bestond op het pad helemaal
// niet en op aanraak stond er daardoor geen "Roer links". De twee toetsen die er stonden zijn naar de rechtopstaande
// D-pad gegaan, zodat Overslaan en Stop bereikbaar blijven (Stop is de stoptoets van de vluchtdienst).
zet({ player: { inVehicle: { speed: 20, isPlane: true, model: { name: 'plane' } } }, noLookBack: true });
ok(ctx() === 'plane', 'een vliegtuig kiest de vliegindeling', ctx());
ok(druk('left').includes('q'), 'vliegtuig: D-pad links is het roer links (Q)', seen);
ok(druk('right').includes('e'), 'vliegtuig: D-pad rechts is het roer rechts (E)', seen);
ok(druk('up').includes('o'), 'vliegtuig: D-pad omhoog slaat een verhaalstap over (O)', seen);
ok(druk('down').includes('Backspace'), 'vliegtuig: D-pad omlaag stopt de vlucht (Backspace)', seen);

ok(threw === null, 'de hele run zonder uitzondering', threw && String(threw));
if (fails) { console.log(`${fails} mislukt`); process.exit(1); }
console.log(`pad_extra_test: ok (${n} controles)`);
