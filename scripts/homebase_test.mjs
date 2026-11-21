// Thuis per verhaalstap (homebase.js): vier verhaalhuizen in verhaalvolgorde, een oude save blijft in Paddepoel, vastpinnen, een Bezit-pand
// als thuis, en een thuis verandert nooit voortgang of geld.
// node scripts/homebase_test.mjs
import fs from 'node:fs';
import {
  homes, homeOf, storyHome, readHomeState, unlockHomes, activeHome, pinHome, moveWithStory, registerHome, resetHomes, homeProblems, DEFAULT_HOME,
} from '../game/js/homebase.js';
import { STEPS } from '../game/js/storyarc.js';
import { MISSION_IDS } from '../game/js/storyarc.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

ok(homeProblems().length === 0, 'de verhaalhuizen volgen elkaar in verhaalvolgorde zonder gat', homeProblems().join('; '));
const story = homes().filter((h) => h.fromStep);
ok(story.length >= 4, 'minstens drie verhuizingen (vier verhaalhuizen)', story.length);
ok(new Set(story.map((h) => h.id)).size === story.length, 'elk huis heeft een eigen id');
ok(story.every((h) => h.name && h.why && h.hint && h.interior && h.anchor), 'elk huis heeft naam, reden, hint, interieurvariant en ankerplek');
ok(story.every((h) => !h.anchor.mission || MISSION_IDS.includes(h.anchor.mission)), 'een ankerplek verwijst naar een bestaande missie (startplek)');
ok(story[0].id === DEFAULT_HOME && story[0].fromStep === 'M00', 'het eerste huis is Paddepoel, vanaf de opening');

// per akte een ander thuis
ok(storyHome('M01') === 'paddepoel' && storyHome('M08') === 'oma_noorderhaven' && storyHome('M13') === 'havenkantoor' && storyHome('M19') === 'schuur_tinus' && storyHome('M25') === 'oma_keuken' && storyHome('M29') === 'paddepoel_stel', 'het verhaalthuis volgt de akte');
ok(storyHome(null) === 'paddepoel' && storyHome('onbekend') === 'paddepoel', 'een onbekende of lege stap leest als Paddepoel');

// migratie: een oude save zonder home-veld blijft precies zoals het was
const oud = readHomeState(undefined);
ok(oud.active === 'paddepoel' && oud.unlocked.join() === 'paddepoel' && oud.pinned === false && oud.v === 1, 'een save zonder home-veld leest als Paddepoel, niets open, niet vastgepind');
ok(JSON.stringify(readHomeState(readHomeState(null))) === JSON.stringify(oud), 'lezen is idempotent');
ok(readHomeState({ active: 'bestaat-niet', unlocked: ['x'] }).active === 'paddepoel', 'een vreemde stand valt terug op Paddepoel');
ok(activeHome(undefined, 'M01').id === 'paddepoel', 'een oude save op M01 woont in Paddepoel');

// het verhaal verhuist mee
let st = readHomeState(null);
let r = moveWithStory(st, 'M06', 'M07');
ok(r.moved && r.from === 'paddepoel' && r.to === 'oma_noorderhaven', 'na M06 verhuist het duo naar Oma');
st = r.state;
r = moveWithStory(st, 'M07', 'M08');
ok(!r.moved, 'binnen één akte verhuist niemand');
r = moveWithStory(st, 'M11', 'M12');
ok(r.moved && r.to === 'havenkantoor', 'na akte 2 naar het havenkantoor');
ok(r.state.unlocked.includes('paddepoel') && r.state.unlocked.includes('oma_noorderhaven') && r.state.unlocked.includes('havenkantoor'), 'elk gezien thuis komt open en blijft open');
const keten = ['M06', 'M11', 'M16', 'M22', 'M26'].reduce((acc, s, i, a) => { const next = STEPS[STEPS.findIndex((x) => x.id === s) + 1].id; const m = moveWithStory(acc.state, i ? a[i - 1] : 'M01', next); return { state: m.state, n: acc.n + (m.moved ? 1 : 0) }; }, { state: readHomeState(null), n: 0 });
ok(keten.n >= 3, 'minstens drie verhuizingen over de aktes', keten.n);

// vastpinnen: de speler kan altijd naar zijn eigen thuis
let pinned = unlockHomes(readHomeState(null), 'M20');
pinned = pinHome(pinned, 'paddepoel', 'M20');
ok(pinned.pinned && activeHome(pinned, 'M20').id === 'paddepoel', 'een vastgepind thuis blijft, ook als het verhaal verder is');
ok(moveWithStory(pinned, 'M20', 'M24').state.active === 'paddepoel' && !moveWithStory(pinned, 'M20', 'M24').moved, 'het verhaal verhuist een vastgepinde speler niet');
ok(!pinHome(readHomeState(null), 'havenkantoor', 'M01').pinned, 'een thuis dat nog niet open is, is niet te pinnen');
ok(pinHome(pinned, null, 'M20').pinned === false && activeHome(pinHome(pinned, null, 'M20'), 'M20').id === 'schuur_tinus', 'loslaten geeft het verhaalthuis terug');

// Bezit: een gekocht pand als thuis (de interface voor de Bezit-lead)
registerHome({ id: 'pand-test', name: 'Een pand aan de Hereweg', ref: { parcel: 'x' } });
ok(homeOf('pand-test').registered && homeOf('pand-test').kind === 'pand' && homeOf('pand-test').fromStep === null, 'een geregistreerd pand komt nooit vanzelf uit het verhaal');
const mijn = pinHome({ ...unlockHomes(readHomeState(null), 'M30'), unlocked: ['paddepoel', 'pand-test'] }, 'pand-test', 'M30');
ok(mijn.pinned && activeHome(mijn, 'M30').id === 'pand-test', 'de speler kan zijn eigen pand als thuis kiezen');
resetHomes();
ok(!homeOf('pand-test'), 'de registratie is te resetten');

// nooit voortgang, geld of einde; geen opslag, geen wereld
const src = fs.readFileSync(new URL('../game/js/homebase.js', import.meta.url), 'utf8').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
ok(!/world\.|localStorage|document\.|money|reward|markDone|coopNet/.test(src), 'homebase.js raakt geen wereld, opslag, geld of voortgang');

console.log(`homebase_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
