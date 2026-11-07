// Ommeland-paspoort (#681): per dorp het uitje, de eierbal, de vondst en het evenement, met
// voortgang, de eerstvolgende trein en een "bijna compleet"-hint vanaf 80%. De module is puur
// (geen DOM, geen THREE), dus dit test de regels met dezelfde bronnen als het spel; de UI is
// een broncheck, zoals todo_ui_test doet.
//   node scripts/ommelandpaspoort_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as P from '../game/js/ommelandpaspoort.js';
import { VILLAGES } from '../game/js/ommelandlines.js';
import { FINDS, STREKEN } from '../game/js/regioleven.js';
import { AGENDA } from '../game/js/evenementen.js';

let n = 0, bad = 0;
const t = (naam, fn) => { n++; try { fn(); } catch (e) { bad++; console.log('FAIL', naam, '\n  ', String(e.message || e).split('\n').slice(0, 4).join('\n   ')); } };
const lees = (f) => fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');
const dorpen = P.dorpen();

t('elk dorp uit de bron heeft een streek en de vier onderdelen', () => {
  assert.ok(dorpen.length >= 8, `dorpen uit ommelandlines.js: ${dorpen.length}`);
  assert.deepEqual(dorpen.slice().sort(), Object.keys(VILLAGES).sort(), 'geen handgeschreven dorpenlijst');
  for (const d of dorpen) {
    assert.ok(P.DORP_STREEK[d], `${d} heeft een streek`);
    const s = P.streekVan(d);
    assert.ok(s && STREKEN.some((x) => x.id === s.id), `${d}: streek ${P.DORP_STREEK[d]} bestaat`);
    const stand = P.dorpStand(d, {});
    assert.equal(stand.onderdelen.length, stand.evenement ? 4 : 3, `${d}: vier dingen (of drie zonder evenement)`);
    assert.deepEqual(stand.onderdelen.map((o) => o.id), ['uitje', 'eierbal', 'vondst', ...(stand.evenement ? ['evenement'] : [])], `${d}: de volgorde`);
    assert.equal(stand.uitje.tekst, VILLAGES[d].special ? VILLAGES[d].special.name : stand.uitje.tekst, `${d}: de uitje-naam uit de bron`);
  }
});

t('de aantallen komen uit de brontabellen', () => {
  assert.ok(P.dorpen().every((d) => P.evenementVoor(d)), 'elk dorp heeft een evenement (uit de agenda of de streek)');
  const bronnen = new Set(P.dorpen().map((d) => P.evenementVoor(d).soort));
  assert.ok(bronnen.has('agenda') && bronnen.has('streek'), 'de evenementen komen uit beide brontabellen');
  for (const d of dorpen) {
    const finds = P.vondstenVoor(d);
    assert.equal(finds.length, FINDS.filter((f) => f.streek === P.DORP_STREEK[d]).length, `${d}: de vondsten van de streek`);
  }
  const p = P.paspoort({});
  assert.equal(p.eierballen.totaal, dorpen.length, 'eierballen: één per dorp');
  assert.equal(p.vondsten.totaal, FINDS.length, 'vondsten: de hele bron');
  assert.equal(p.dorpen.length, dorpen.length, 'één regel per dorp');
});

t('per speler: eigen dorpen en eierballen, dezelfde evenementen als de opener', () => {
  const host = P.paspoort({ uitjes: ['Haren', 'Winsum'], eieren: ['Haren'], vondsten: ['v-hun-1'] });
  const gast = P.paspoort({ uitjes: [], eieren: [], vondsten: [] });
  assert.notEqual(host.onderdelenKlaar, gast.onderdelenKlaar, 'twee spelers hebben eigen voortgang');
  const hw = host.dorpen.find((d) => d.dorp === 'Winsum');
  const gw = gast.dorpen.find((d) => d.dorp === 'Winsum');
  assert.notEqual(hw.klaar, gw.klaar, 'Winsum telt per speler');
  assert.deepEqual(host.dorpen.map((d) => d.evenement && d.evenement.id), gast.dorpen.map((d) => d.evenement && d.evenement.id), 'de evenementen (kalender) zijn voor beiden gelijk');
  assert.ok(host.dorpen.every((d) => ['agenda', 'streek'].includes(P.evenementVoor(d.dorp).soort)), 'elk evenement heeft een bron');
});

t('de voortgang is vier dingen per dorp, met de vondst als deelstand', () => {
  const finds = P.vondstenVoor('Winsum');
  const data = { uitjes: ['Winsum'], eieren: ['Winsum'], vondsten: finds.map((f) => f.id), gezien: [P.evenementVoor('Winsum').id] };
  const w = P.dorpStand('Winsum', data);
  assert.equal(w.klaar, w.totaal, 'alles klaar');
  assert.equal(w.pct, 100);
  const half = P.dorpStand('Winsum', { uitjes: ['Winsum'] });
  assert.equal(half.klaar, 1);
  assert.match(half.vondst.tekst, /0 van \d+ in Hunsingo/, 'de vondst noemt de streek en de deelstand');
  assert.ok(!half.vondst.klaar, 'de vondst is pas klaar als de streek af is');
});

t('bijna-compleet-hint vanaf 80%, per soort', () => {
  const eggs7 = dorpen.slice(0, -1);
  const finds26 = FINDS.slice(0, 26).map((f) => f.id);
  const p = P.paspoort({ eieren: eggs7, vondsten: finds26 });
  const hints = P.hint80(p);
  assert.ok(hints.some((h) => /eierballen/.test(h)), `eierballen-hint: ${hints.join(' | ')}`);
  assert.ok(hints.some((h) => /vondsten/.test(h)), `vondsten-hint: ${hints.join(' | ')}`);
  const vol = P.paspoort({ eieren: dorpen, vondsten: FINDS.map((f) => f.id) });
  assert.equal(P.hint80(vol).length, 0, 'niets meer bijna bij 100%');
  const laag = P.paspoort({ eieren: dorpen.slice(0, 5), vondsten: FINDS.slice(0, 18).map((f) => f.id) });
  assert.equal(P.hint80(laag).length, 0, 'onder 80% geen hint');
  // een dorp dat bijna af is telt mee via de dorpen-stand (7 van 8)
  const zeven = dorpen.slice(0, -1).map((d) => ({ uitjes: [d], eieren: [d], vondsten: P.vondstenVoor(d).map((f) => f.id), gezien: [P.evenementVoor(d).id] }));
  const bijnaDorpen = P.paspoort({ uitjes: zeven.map(() => ''), eieren: dorpen, vondsten: FINDS.map((f) => f.id) });
  assert.equal(typeof bijnaDorpen.pct, 'number');
});

t('de trein is vanuit het dorp te plannen', () => {
  const routes = [{ name: 'Lijn 1', stops: [{ name: 'Groningen', s: 0 }, { name: 'Haren', s: 5000 }, { name: 'Winsum', s: 14000 }] }];
  const plan = P.treinPlan('Haren', routes, { dag: 1, uur: 12 });
  assert.ok(plan.lijnen.length >= 1, 'er is een volgende trein');
  assert.match(plan.tekst, /^Trein \d{2}:\d{2} · Lijn 1$/, plan.tekst);
  assert.ok(plan.lijnen.every((l) => l.vertrek >= 12 * 3600), 'de trein vertrekt niet in het verleden');
  assert.deepEqual(P.treinPlan('Onbekend', routes, { dag: 1, uur: 12 }).lijnen, [], 'geen trein zonder halte');
  assert.equal(P.treinPlan('Haren', [], {}).tekst, 'Geen trein gevonden');
});

t('de module is puur: geen DOM, geen THREE, geen eigen invoer', () => {
  const bron = lees('ommelandpaspoort.js');
  assert.ok(!/\bdocument\.|\bwindow\.|\bTHREE\.|localStorage/.test(bron), 'geen DOM, THREE of opslag');
  assert.ok(!/from '\.\/(world|players|hud|scene3d)/.test(bron), 'geen wereld- of UI-modules');
});

// --- UI: het overzicht staat in Te doen (en dus op de kaart), met balk en treinknop ----------
t('Te doen toont per dorp het paspoort met een voortgangsbalk en de trein', () => {
  const todo = lees('todo.js'), td = lees('todoui.js');
  assert.match(todo, /from '\.\/ommelandpaspoort\.js'/, 'todo.js gebruikt de paspoortmodule');
  assert.match(todo, /function ommelandPaspoortItems|ommelandPaspoortItems\(/, 'per dorp een Te-doen-regel');
  assert.match(todo, /progress:\s*\{\s*klaar: d\.klaar, totaal: d\.totaal, pct: d\.pct/, 'de regel draagt de voortgang');
  assert.match(todo, /trein:\s*plan\.volgende|trein:\s*plan\.lijnen\[0\]|trein:\s*/, 'de regel draagt de treinplanning');
  assert.match(todo, /export function paspoortOverzicht|export function ommelandPaspoort/, 'het overzicht is van buiten te lezen');
  assert.match(td, /paspoortOverzicht|ommelandPaspoort/, 'todoui.js toont het overzicht');
  assert.match(td, /data-bar="om-paspoort"|data-bar="paspoort/, 'het overzicht heeft een voortgangsbalk');
  assert.match(td, /data-todo-trein/, 'er is een treinknop in het detail');
  assert.match(td, /it\.progress/, 'een rij toont de voortgangsbalk per dorp');
});

// De kaart leest dezelfde regels (getTodoItems), dus het dorp staat ook in de kaartzoektocht.
t('de kaart gebruikt dezelfde regels via getTodoItems', () => {
  const todo = lees('todo.js'), mv = lees('mapview.js');
  assert.match(todo, /ommelandPaspoortItems\(world\)/, 'de regels zitten in getTodoItems');
  assert.match(mv, /getTodoItems\(state\.world\)/, 'de kaart leest diezelfde lijst');
});

console.log(bad ? `ommelandpaspoort_test: ${n - bad}/${n} ok` : `ommelandpaspoort_test: ${n}/${n} ok`);
process.exitCode = bad ? 1 : 0;
