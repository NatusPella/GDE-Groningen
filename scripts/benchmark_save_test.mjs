// De benchmark en de start (22-11): geen keuzekaart, en de save en de voortgang per save blijven onaangeroerd.
//   node scripts/benchmark_save_test.mjs   (geheugen-storage; raakt nooit echte opslag)
import { KEYS } from '../game/js/storagekeys.js';
import { SAVE_VERSION } from '../game/js/savemigrate.js';
import { ARC_ID } from '../game/js/storyarc.js';
import * as S from '../game/js/saveslots.js';
import { activateScope, readOwner } from '../game/js/savescope.js';
import { launchKind, skipStartChoice, launchPlan, askLaunchChoice, isAutomation } from '../game/js/launchchoice.js';
import { afterBenchmarkPlan, prepareBenchmarkReload } from '../game/js/benchmarkreturn.js';

let n = 0, fails = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log(`FAIL ${name}`); } };
class Mem {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}
const save = (money, savedAt) => ({ v: SAVE_VERSION, arc: ARC_ID, savedAt, money, speeltijd: 100, missions: { index: 0, completed: [], seen: [] }, character: 'tammo' });

// 1. de centrale startregel
ok(launchKind({}) === 'player' && !skipStartChoice({}), 'gewone start: de kaart verschijnt');
ok(launchKind({ benchmark: true }) === 'benchmark' && skipStartChoice({ benchmark: true }), '--benchmark: geen kaart');
ok(skipStartChoice({}, { benchmarkPending: true }) && launchKind({}, { benchmarkPending: true }) === 'benchmark', 'benchmark uit Instellingen (herlaad): geen kaart');
ok(skipStartChoice({ benchmark: true, startkeuze: 'vraag' }), 'een benchmark vraagt nooit, ook niet met ?startkeuze=vraag');
for (const f of ['noattract', 'storytest', 'stil', 'trailer', 'preview', 'perf', 'spotsonly', 'autoplay', 'menutest']) {
  ok(isAutomation({ [f]: true }) && launchKind({ [f]: true }) === 'automation' && skipStartChoice({ [f]: true }), `vlag ${f}: testrun slaat de kaart over`);
  ok(!skipStartChoice({ [f]: true, startkeuze: 'vraag' }), `vlag ${f} met ?startkeuze=vraag: de kaart toont toch`);
}
ok(skipStartChoice({ startkeuze: 'alleen' }), '?startkeuze=alleen slaat de kaart over');
{
  const plan = launchPlan({}, { testmodus: false, benchmark: true });
  ok(!plan.keuze && !plan.naam && plan.modus === 'alleen' && plan.reden === 'benchmark', 'plan: solo en meteen');
  let gevraagd = 0, bewaard = 0;
  const modus = await askLaunchChoice({ plan, settings: () => ({}), keuze: async () => { gevraagd++; return 'samen'; }, naam: async () => true, toestemming: async () => true, sessie: async () => 'host', samen: () => { gevraagd++; }, bewaar: () => { bewaard++; } });
  ok(modus === 'alleen' && gevraagd === 0 && bewaard === 0, 'geen kaart, geen wizard, niets bewaard (startKeuze blijft)');
}

// 2. na de benchmark
ok(afterBenchmarkPlan({ fromGame: true, hasSave: true }).action === 'continue' && !afterBenchmarkPlan({ fromGame: true, hasSave: true }).legacyCard && !afterBenchmarkPlan({ fromGame: true, hasSave: true }).newGame, 'uit een spel: terug naar de save, geen Nieuw verhaal-kaart');
ok(!afterBenchmarkPlan({ fromGame: true, hasSave: true }).difficultyCard, 'geen moeilijkheidskaart');

// 3. save en voortgang: benchmarkstart -> boot -> benchmarkeinde
{
  const ls = new Mem();
  S.writeSlot(ls, 1, save(10, 1000));
  S.writeSlot(ls, 2, save(20, 3000));
  S.setActive(ls, 1);
  activateScope(ls, 1, 1);
  ls.setItem(KEYS.exploration, '{"verkend":42}');
  // een andere tab schreef slot 2 later: "de laatst bewaarde" is dus niet de plek van de speler
  const voor = { s1: ls.getItem(S.slotKey ? S.slotKey(1) : 'x'), idx: ls.getItem(KEYS.saveSlots) };
  let opgeslagen = 0;
  const prep = prepareBenchmarkReload({ save: () => { opgeslagen++; return true; }, slot: () => 1, markStay: (k) => S.markStay(ls, k) });
  ok(prep.ok && prep.slot === 1 && opgeslagen === 1, 'benchmarkstart bewaart en geeft de stay-vlag');
  // de boot na de herlaad (savescopeactivate.js doet pickLatest + activateScope)
  const want = S.pickLatest(ls);
  ok(want === 1, 'de boot opent dezelfde plek, niet de laatst bewaarde van een andere tab');
  const wissel = activateScope(ls, want, 0);
  ok(!wissel.changed && readOwner(ls) === 1, 'geen scope-wissel');
  ok(ls.getItem(KEYS.exploration) === '{"verkend":42}', 'voortgang per save onaangetast');
  ok(S.pickLatest(ls) === 1, 'ook een tweede lezer in dezelfde boot ziet dezelfde plek');
  // benchmarkeinde: Doorgaan laadt de save en bindt de plek; de stay-vlag verdwijnt
  S.clearStay(ls); // bindSlot
  ok(S.pickLatest(ls) === 2 && S.isFresh(ls) === false, 'na het laden normaal gedrag; geen nieuw-spel-vlag');
  ok(S.readSlot(ls, 1).data && S.readSlot(ls, 1).data.money === 10 && S.readSlot(ls, 2).data.money === 20, 'beide saves ongewijzigd');
  ok(voor.idx !== undefined, 'index aanwezig');
}
// de benchmark start niet als bewaren mislukt (er verandert niets)
{
  const ls = new Mem();
  S.writeSlot(ls, 1, save(10, 1000));
  const prep = prepareBenchmarkReload({ save: () => false, slot: () => 1, markStay: (k) => S.markStay(ls, k) });
  ok(!prep.ok && prep.reason === 'opslaan', 'bewaren mislukt: geen herlaad');
  ok(S.pickLatest(ls) === 1 && !JSON.parse(ls.getItem(KEYS.saveSlots) || '{}').stay, 'en er is geen stay-vlag gezet');
  const thr = prepareBenchmarkReload({ save: () => { throw new Error('vol'); }, slot: () => 1, markStay: () => true });
  ok(!thr.ok, 'een fout bij bewaren stopt de benchmark');
  ok(!prepareBenchmarkReload({ save: () => true, slot: () => 0, markStay: () => true }).ok, 'geen gebonden plek: geen herlaad');
}

// 22-11: saveGame() geeft true zonder te bewaren; de benchmark gebruikt saveGameEchtBewaard en weigert dan met een rustige melding
{
  const fs = await import('node:fs');
  const sg = fs.readFileSync(new URL('../game/js/savegame.js', import.meta.url), 'utf8');
  const f = sg.slice(sg.indexOf('export function saveGameEchtBewaard'), sg.indexOf('export function saveGame('));
  ok(/bewarenUit \|\| w\.ritBezig \|\| w\.coopRole === 'client'\) return false/.test(f), 'bewaren uit, reisrit of gast: niet echt bewaard');
  const pm = fs.readFileSync(new URL('../game/js/pausemenu.js', import.meta.url), 'utf8');
  ok(/save: \(\) => saveGameEchtBewaard\(world\)/.test(pm), 'pausemenu start de benchmark alleen na echt bewaren');
  ok(/coopSessieLoopt\(world\)\) \{[^}]*BENCH_COOP_TEXT/.test(pm), 'benchmark geblokkeerd tijdens Samen spelen');
  const T = await import('../game/js/benchmarkreturn.js');
  ok(T.BENCH_SAVE_FIRST_TEXT === 'Bewaar eerst je spel.' && /Samen spelen/.test(T.BENCH_COOP_TEXT), 'meldingen');
  const geen = prepareBenchmarkReload({ save: () => false, slot: () => 1, markStay: () => true });
  ok(!geen.ok && geen.reason === 'opslaan', 'niet echt bewaard: geen herlaad');
}

if (fails) { console.log(`${fails} van ${n} mislukt`); process.exit(1); }
console.log(`benchmark_save_test: ${n} gecontroleerd, alles goed`);
