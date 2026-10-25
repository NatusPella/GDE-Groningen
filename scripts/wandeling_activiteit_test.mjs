// Wandeling Winsum: de wandeling neemt de speler niet over, dus hij meldt zich niet als activiteit. Daardoor
// moest hij zijn eigen stopwegen hebben: een controller of de tastbare knoppen (B = Backspace) en het laden van
// een save (dat alle quit-hooks draait). Deze test start de echte activiteit in een nep-DOM en controleert dat
// elk van die wegen hem netjes opruimt.
//   node scripts/wandeling_activiteit_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

const noop = () => {};
function nepEl() {
  return {
    style: { setProperty: noop }, hidden: false, innerHTML: '', textContent: '', dataset: {}, children: [], value: '', checked: false,
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    appendChild(c) { this.children.push(c); }, remove() {}, addEventListener: noop, removeEventListener: noop, setAttribute: noop, focus: noop, click: noop,
    querySelector: () => nepEl(), querySelectorAll: () => [], getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }),
  };
}
globalThis.document.createElement = () => nepEl();
globalThis.document.body = nepEl();
globalThis.document.head = nepEl();
globalThis.document.getElementById = () => null;

const C = await import('../game/js/controls.js');
const B = await import('../game/js/busy.js');
const { WANDELING } = await import('../game/js/wandeling.js');

let n = 0, bad = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.log('FAIL', m, info); } };

const spot = WANDELING.spots()[0];
const wereld = () => {
  const pressed = new Set();
  return {
    time: 10, money: 100, pendingRespawn: false, extraSpeakers: [],
    input: { wasPressed: (k) => pressed.has(k), consume: (k) => pressed.delete(k), padKeys: new Set(), pressed },
    player: { x: spot.x, y: spot.y, inVehicle: null, swimming: false, vx: 0, vy: 0, speed: 0, moving: false },
    map: {}, berichten: [], addMessage(t) { this.berichten.push(t); },
  };
};

// De controller: B is in de minigame-indeling de stopknop (Backspace), en die indeling kiest gamepad.js
// zodra world.wandelingActief staat (de echte pollronde staat in scripts/gamepad_live_test.mjs).
ok(C.PAD_MAPS.minigame.b === 'backspace', 'B stopt in de minigame-indeling');
ok(C.padSlotFor('BACKSPACE', 'minigame') === 'b', 'Backspace hoort bij B');
const gp = fs.readFileSync(new URL('../game/js/gamepad.js', import.meta.url), 'utf8');
const tl = fs.readFileSync(new URL('../game/js/touchlogic.js', import.meta.url), 'utf8');
ok(/if \(w\.wandelingActief\) return 'minigame';/.test(gp), 'de controller kiest de minigame-indeling tijdens de wandeling');
ok(/if \(w\.wandelingActief\) return 'minigame';/.test(tl), 'de tastbare knoppen kiezen die indeling ook');

// Starten: de vlag staat aan en de HUD-timer loopt.
{
  const w = wereld();
  WANDELING.init(w);
  ok(WANDELING.prompt(w) !== null, 'je kunt bij de eerste paal starten');
  ok(WANDELING.interact(w), 'E start de wandeling');
  ok(w.wandelingActief === true && window.__wandeling.state() !== null, 'de wandeling meldt dat hij loopt');
  // Een save laden draait alle quit-hooks (savegame.js): de wandeling hoort dan te stoppen.
  B.quitRunningActivities(w);
  ok(w.wandelingActief === false && window.__wandeling.state() === null, 'een save laden stopt de wandeling');
  ok(w.berichten.some((t) => t === 'Wandeling gestopt'), 'de speler hoort dat de wandeling stopt', w.berichten);
}

// Stoppen met de eigen quit (duif, poppenspel, enz.) en met een respawn.
{
  const w = wereld();
  WANDELING.init(w);
  WANDELING.interact(w);
  WANDELING.quit(w);
  ok(w.wandelingActief === false && window.__wandeling.state() === null, 'de eigen quit stopt de wandeling');

  WANDELING.interact(w);
  w.pendingRespawn = true;
  WANDELING.tick(0.1, w);
  ok(w.wandelingActief === false && window.__wandeling.state() === null, 'een respawn stopt de wandeling');
}

// De laadweg zelf: applySave moet de hooks draaien, niet alleen de actieve activiteiten.
const sg = fs.readFileSync(new URL('../game/js/savegame.js', import.meta.url), 'utf8');
ok(/quitRunningActivities\(w\)/.test(sg), 'savegame.js draait de quit-hooks bij het laden');
ok(!/^\s*quitActivity\(w\);/m.test(sg), 'savegame.js slaat de wandeling niet meer over met een losse quitActivity');

console.log(bad ? `${bad} van ${n} mislukt` : `wandeling_activiteit_test: ${n}/${n} ok`);
process.exit(bad ? 1 : 0);
