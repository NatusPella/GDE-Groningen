// #1297: slapen in een safehuis telde geen nieuwe dag als de klok minder dan vier uur terugsprong (om 10:00 slapen tot
// de ochtend van 07:30): de kalender en de dag van de meubels (de stek van de plant) bleven staan, anders dan slapen
// thuis (#1299). Draait de echte slaapNu van safehuizen.js met de echte kalender en meubels.
//   node scripts/safehuis_slaapdag_test.mjs
import './node3d.mjs';
import { registerHooks } from 'node:module';

registerHooks({
  load(url, ctx, next) {
    const r = next(url, ctx);
    if (/\/game\/js\/safehuizen\.js$/.test(url)) return { ...r, source: String(r.source) + '\nexport const __slaapNu = slaapNu;\n', shortCircuit: true };
    return r;
  },
});

const S = await import('../game/js/safehuizen.js');
const C = await import('../game/js/calendarday.js');
const F = await import('../game/js/furniture.js');
const SV = await import('../game/js/savehook.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ' (' + info + ')' : ''}`); } };

// node3d.mjs heeft geen body; de fade hangt er een laag aan
const noop = () => {};
document.body = { appendChild: noop, removeChild: noop, style: {}, classList: { contains: () => false, add: noop, remove: noop, toggle: noop } };
// de save hoort hier niet bij; de timers lopen meteen (de fade van 0,9 s is beeld)
SV.registerSaveGame?.(() => true);
const realTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn) => { fn(); return 0; };

const mk = (clock) => ({ clock, time: 100, health: 50, loadCount: 0, stats: {}, messages: [], addMessage(t) { this.messages.push(t); }, calendar: { day: 3, seen: [] } });

async function slaap(van, tot) {
  const w = mk(van);
  F.applyFurnitureSave({ owned: ['plant'], day: 10, stek: 0 });
  const dag0 = C.today(w), meubel0 = F.getFurnitureSave().day;
  S.__slaapNu(w, null, tot, 'Goeiemorgen');
  return { w, kalender: C.today(w) - dag0, meubels: F.getFurnitureSave().day - meubel0 };
}

try {
  let r = await slaap(10, 7.5);
  ok(r.w.clock === 7.5, 'de klok staat op half acht', r.w.clock);
  ok(r.kalender === 1, 'om 10:00 slapen tot de ochtend: de kalender gaat een dag verder', r.kalender);
  ok(r.meubels === 1, 'en de meubeldag (stek van de plant) ook', r.meubels);
  r = await slaap(15, 13);
  ok(r.kalender === 1 && r.meubels === 1, 'om 15:00 slapen tot de middag: de volgende dag', `${r.kalender}/${r.meubels}`);
  r = await slaap(12, 13);
  ok(r.kalender === 0 && r.meubels === 0, 'om 12:00 slapen tot één uur: dezelfde dag', `${r.kalender}/${r.meubels}`);
  r = await slaap(23, 7.5);
  ok(r.meubels === 1, 'een gewone nacht: de meubels tellen één dag', r.meubels);
} finally { globalThis.setTimeout = realTimeout; }

console.log(fails ? `safehuis_slaapdag_test: ${fails} van ${n} mislukt` : `safehuis_slaapdag_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
