// De adapter tussen het verhaal en de snackwagen (snackstory.js): de stille vlaggen wagen:* openen de snackwagen in fasen, een oude save en een ontbrekende provider laten alles
// open (migratieregel), elke dichte stap geeft een hint van een personage, en de belettering volgt wagen:naam.   node scripts/snackstory_test.mjs
// Schrijft nooit naar echte opslag: de opslag is een nepobject.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as SS from '../game/js/snackstory.js';
import * as L from '../game/js/bezitlive.js';
import * as BL from '../game/js/boerderijlive.js';
import * as GT from '../game/js/bezitgate.js';
import * as SL from '../game/js/snacklive.js';
import * as UI from '../game/js/snackui.js';
import * as P from '../game/js/snackvanplan.js';
import { VAN_FLAGS, milestoneFlagsForDone } from '../game/js/storymilestones.js';
import { newGate } from '../game/js/unlockgate.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 3).join(' | ')); } };
const nepOpslag = () => { const m = new Map(); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem(k, v) { m.set(k, String(v)); }, removeItem: (k) => m.delete(k) }; };
const wereld = (money = 1e6, day = 100) => ({ money, calendar: { day }, msgs: [], addMessage(x) { this.msgs.push(x); } });
const reset = () => { const store = nepOpslag(); L.initBezit({ opslag: store }); BL.initBoerderij({ opslag: store }); L.setClaimLookup(null); L.setClaimSend(null); GT.resetUnlockGate(); SS.setSnackFlagProvider(null); return store; };
// een nieuw spel: nieuwe poort, vlaggen tot en met één mijlpaal
const nieuw = (...flags) => SS.setSnackFlagProvider(() => ({ flags: new Set(flags), gate: newGate(), ended: false, dev: false }));
const upTo = (k) => VAN_FLAGS.slice(0, k);
GT.setGateProgress(() => ({ dev: true }));            // de poort van de snackwagen zelf staat open; hier gaat het om de fasen

t('elke fase hoort bij één vlag van storymilestones.js (alleen toevoegen, nooit hernoemen)', () => {
  for (const [stage, flag] of Object.entries(SS.STAGE_FLAGS)) assert.ok(VAN_FLAGS.includes(flag), `${stage} ${flag}`);
  assert.equal(SS.STAGES.length, 6);
  for (const s of SS.STAGES) assert.ok(SS.STAGE_HINTS[s] && SS.STAGE_HINTS[s].length > 20, s);
});
t('zonder provider, bij een oude save, dev of een afgerond verhaal staat alles open (migratieregel)', () => {
  SS.setSnackFlagProvider(null);
  for (const s of SS.STAGES) assert.equal(SS.stageOpen(s), true);
  SS.setSnackFlagProvider(() => ({ flags: new Set(), gate: undefined }));       // een oude save heeft geen gate
  for (const s of SS.STAGES) assert.equal(SS.stageOpen(s), true);
  SS.setSnackFlagProvider(() => ({ flags: new Set(), gate: { v: 1, open: [], legacy: true } }));
  assert.equal(SS.stageOpen('keten'), true);
  SS.setSnackFlagProvider(() => ({ flags: new Set(), gate: newGate(), dev: true }));
  assert.equal(SS.stageOpen('keten'), true);
  SS.setSnackFlagProvider(() => ({ flags: new Set(), gate: newGate(), ended: true }));
  assert.equal(SS.stageOpen('keten'), true);
  SS.setSnackFlagProvider(() => { throw new Error('stuk'); });                 // een kapotte provider sluit nooit
  assert.equal(SS.stageOpen('menu'), true);
  assert.equal(SS.flagsFrom(undefined), null); assert.equal(SS.flagsFrom('raar'), null);
});
t('een nieuw spel: de fasen gaan een voor een open met de vlaggen; een dichte fase heeft een hint', () => {
  nieuw();
  for (const s of SS.STAGES) { assert.equal(SS.stageOpen(s), false, s); assert.ok(SS.stageHint(s)); }
  assert.equal(SS.stageCount(), 0);
  nieuw('wagen:idee', 'wagen:menu');
  assert.equal(SS.stageOpen('menu'), true); assert.equal(SS.stageHint('menu'), null); assert.equal(SS.stageOpen('stek'), false);
  assert.equal(SS.stageCount(), 1);
  nieuw(...VAN_FLAGS);
  assert.equal(SS.stageCount(), 6);
  assert.equal(Object.values(SS.stageView()).every((x) => x.open && x.hint === null), true);
});
t('flagsFrom leest een Set, een lijst en een stand', () => {
  assert.ok(SS.flagsFrom(new Set(['wagen:menu'])).has('wagen:menu'));
  assert.ok(SS.flagsFrom(['wagen:menu']).has('wagen:menu'));
  assert.ok(SS.flagsFrom({ flags: ['wagen:team'], gate: newGate() }).has('wagen:team'));
  assert.equal(SS.flagsFrom({ flags: ['wagen:team'], gate: newGate(), dev: true }), null);
});
t('een oude save krijgt de vlaggen van wat hij al deed (storymilestones) en dus alle fasen', () => {
  const flags = milestoneFlagsForDone(['M30']);
  assert.equal(flags.length, 7);
  SS.setSnackFlagProvider(() => ({ flags, gate: newGate() }));
  assert.equal(SS.stageCount(), 6);
});
t('het menu: pas na wagen:menu', () => {
  reset(); nieuw('wagen:idee');
  let r = SL.offeringButton('kaassouffle'); assert.equal(r.ok, false); assert.equal(r.why, 'verhaal'); assert.match(r.text, /Oma Trijntje/);
  nieuw('wagen:idee', 'wagen:menu');
  r = SL.offeringButton('kaassouffle'); assert.notEqual(r.why, 'verhaal');
});
t('standplaatsen kopen pas na wagen:stek; overnemen van Us Mem en de wagen zelf zetten later', () => {
  reset(); nieuw('wagen:menu'); const w = wereld();
  let r = SL.koopVergunning(w, 'dorp'); assert.equal(r.ok, false); assert.equal(r.why, 'verhaal'); assert.equal(w.money, 1e6); assert.match(r.text, /Lammert/);
  nieuw('wagen:menu', 'wagen:stek');
  r = SL.koopVergunning(w, 'dorp'); assert.equal(r.ok, true); assert.ok(w.money < 1e6);
  r = SL.placeVan('dorp'); assert.equal(r.ok, false); assert.equal(r.why, 'verhaal'); assert.match(r.text, /Vismarkt/);
  assert.equal(SL.placeVan(null).ok, true, 'de wagen naar huis mag altijd');
  nieuw('wagen:menu', 'wagen:stek', 'wagen:standplaats');
  assert.equal(SL.placeVan('dorp').ok, true);
  const S = L.snackState(); const usmem = S.rival.spots[0];
  r = SL.acquireRivalSpot(w, usmem); assert.equal(r.why, 'verhaal'); assert.match(r.text, /Us Mem/);
  nieuw(...upTo(7));
  assert.notEqual(SL.acquireRivalSpot(w, usmem).why, 'verhaal');
});
t('medewerkers-wagens na wagen:team; een tweede wagen pas na wagen:keten', () => {
  reset(); nieuw('wagen:menu', 'wagen:stek'); const w = wereld();
  assert.equal(SL.koopVergunning(w, 'dorp').ok, true);
  let r = SL.koopVloot(w, 'dorp'); assert.equal(r.ok, false); assert.equal(r.why, 'verhaal'); assert.match(r.text, /Berend/);
  nieuw('wagen:menu', 'wagen:stek', 'wagen:team');
  r = SL.koopVloot(w, 'dorp'); assert.equal(r.ok, true, r.text);
  assert.equal(SL.koopVergunning(w, 'park').ok, true);
  r = SL.koopVloot(w, 'park'); assert.equal(r.why, 'verhaal'); assert.match(r.text, /tweede wagen/);
  nieuw(...upTo(7));
  assert.equal(SL.koopVloot(w, 'park').ok, true);
});
t('de belettering: eerst SNACKWAGEN, na wagen:naam de eigen naam in beeld; Us Mem houdt zijn bord', () => {
  reset(); nieuw('wagen:team'); const w = wereld();
  assert.equal(SS.ownSignFor(), 'SNACKWAGEN');
  nieuw('wagen:team', 'wagen:naam');
  assert.equal(SS.ownSignFor(), 'TAM & TES'); assert.equal(SS.ownSignFor('KAS & KAAS'), 'KAS & KAAS');
  const plan = P.planWagons([{ spot: 'markt', kind: 'own', x: 0, y: 0, sign: 'SNACKWAGEN' }, { spot: 'park', kind: 'rival', x: 5, y: 0 }, { spot: 'dorp', kind: 'fleet', x: 9, y: 0 }], { x: 0, y: 0 });
  const by = Object.fromEntries(plan.map((q) => [q.kind, q.sign]));
  assert.equal(by.own, 'SNACKWAGEN'); assert.equal(by.rival, 'US MEM SNACKS'); assert.equal(by.fleet, 'TAM & TES');
  assert.equal(w.money, 1e6);
});
t('de view en de tab: een dichte fase geeft een hint en een uitgezette knop in plaats van een leeg scherm', () => {
  reset(); nieuw('wagen:idee'); const w = wereld();
  const v = SL.snackView(w);
  assert.equal(v.stages.menu.open, false); assert.ok(v.stages.menu.hint);
  const html = UI.snackHtml({ ...v, own: { ...v.own, hasWagon: true } });
  for (const k of ['stek', 'standplaats', 'team', 'keten']) assert.match(html, new RegExp(`data-stage="${k}"`), k);
  assert.match(html, /data-sn="vergunning"[^>]*disabled/);
  nieuw(...VAN_FLAGS);
  const open = UI.snackHtml({ ...SL.snackView(w), own: { ...SL.snackView(w).own, hasWagon: true } });
  assert.ok(!/data-stage=/.test(open));
});
t('oude saves en tests zonder provider: niets is dicht (snacklive blijft werken zoals voor de epic)', () => {
  reset(); const w = wereld();
  assert.equal(SL.koopVergunning(w, 'dorp').ok, true);
  assert.equal(SL.koopVloot(w, 'dorp').ok, true);
  assert.equal(SL.snackView(w).stages.keten.open, true);
});
t('main.js koppelt de echte story-vlaggen aan de adapter en gebruikt geen eigen vlaglijst', () => {
  const m = fs.readFileSync(new URL('../game/js/main.js', import.meta.url), 'utf8');
  assert.match(m, /setSnackFlagProvider\(\(\) => \{ const p = storyGateProgress\(\); return \{ flags: storyBridgeView\(\)\.flags, gate: p\.gate/);
  const src = fs.readFileSync(new URL('../game/js/snackstory.js', import.meta.url), 'utf8');
  assert.ok(!/story\.js|fetch\(|Math\.random/.test(src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')));
});
console.log(`snackstory_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
