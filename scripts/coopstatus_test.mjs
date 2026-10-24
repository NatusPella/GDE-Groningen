// Samen spelen: het register samenStatus (game/js/coopstatus.js): elk bekend onderdeel heeft een status, 'werkt' komt overeen met de code
// (GAST_ACTIVITEITEN, BIJBAAN_REGELS, registreerWedstrijd), en de waarschuwing komt alleen bij twee of meer spelers.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as S from '../game/js/coopstatus.js';
import { GAST_ACTIVITEITEN } from '../game/js/coopgast.js';
import { BIJBAAN_REGELS } from '../game/js/coopbijbaan.js';
import { REGISTRY } from '../game/js/cooproles.js';
import { ververs } from '../game/js/spelersregister.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'game', 'js');
const lees = (f) => readFileSync(path.join(dir, f), 'utf8');
const alleJs = readdirSync(dir).filter((f) => f.endsWith('.js'));
const woorden = (s) => s.trim().split(/\s+/).length;

function wereld(extra = 0) {
  const w = { player: { x: 0, y: 0 }, coopPartners: [], meldingen: [], addMessage(t) { this.meldingen.push(t); } };
  for (let i = 0; i < extra; i++) w.coopPartners.push({ slot: i + 1, x: 5, y: 5, naam: 'Speler' + (i + 1) });
  ververs(w, 0);
  return w;
}
const samen = () => wereld(1);

let n = 0;
const t = (name, f) => { f(); n++; };

t('elke status in het register is werkt, deels of nee; elke melding past in het meldingenbudget', () => {
  for (const [soort, tabel] of Object.entries(S.REGISTER)) for (const [id, st] of Object.entries(tabel)) assert.ok(S.STATUSSEN.includes(st), `${soort}/${id}`);
  for (const k of [S.SAMEN_TEKST, S.START_TEKST]) for (const tekst of Object.values(k)) assert.ok(woorden(tekst) <= 14, tekst);
  assert.equal(S.SAMEN_TEKST.nee, 'Dit werkt nog niet samen.');
  assert.equal(S.SAMEN_TEKST.deels, 'Dit werkt nog maar deels samen.');
});

t('elke bijbaan uit de code heeft een status; de coöp-bijbanen en de bus werken', () => {
  const ids = new Set();
  for (const f of alleJs.filter((q) => /^sidejob_/.test(q))) for (const m of lees(f).matchAll(/^ {2}id: '([a-z]+)'/gm)) ids.add(m[1]);
  assert.ok(ids.size >= 15, 'de bijbanen zijn gevonden: ' + [...ids].join());
  for (const id of ids) assert.ok(S.samenStatus('bijbaan', id), 'bijbaan zonder status: ' + id);
  for (const id of Object.keys(BIJBAAN_REGELS)) assert.equal(S.samenStatus('bijbaan', id), 'werkt', id);
  assert.equal(S.samenStatus('bijbaan', 'bus'), 'werkt');
  for (const id of ['boerderij', 'rondvaart', 'tjalke']) assert.equal(S.samenStatus('bijbaan', id), 'nee', id);
  for (const [id, st] of Object.entries(S.REGISTER.bijbaan)) if (st === 'werkt') assert.ok(id in BIJBAAN_REGELS || id === 'bus', 'werkt zonder coöp-regel: ' + id);
});

t('elke activiteit uit activities.js heeft een status; GAST_ACTIVITEITEN en de wedstrijden werken', () => {
  const bron = lees('activities.js');
  const bestanden = [...bron.matchAll(/^import \{ [A-Z_]+ \} from '\.\/([a-z]+)\.js';/gm)].map((m) => m[1]).filter((f) => !['shopui', 'cinematics', 'scene3d', 'hudcards', 'minigamekit', 'busy'].includes(f));
  const ids = [];
  for (const f of bestanden) { const m = lees(f + '.js').match(/^ {2}id: '([a-z]+)',/m); if (m) ids.push(m[1]); }
  assert.ok(ids.length >= 18, 'de activiteiten zijn gevonden: ' + ids.join());
  for (const id of ids) assert.ok(S.samenStatus('activiteit', id), 'activiteit zonder status: ' + id);
  for (const id of GAST_ACTIVITEITEN) assert.equal(S.samenStatus('activiteit', id), 'werkt', id);
  // elke coöp-wedstrijd (registreerWedstrijd) werkt samen
  const wed = new Set();
  for (const f of alleJs) for (const m of lees(f).matchAll(/registreerWedstrijd\('([a-z]+)'/g)) wed.add(m[1]);
  assert.ok(wed.size >= 5, 'de wedstrijden zijn gevonden: ' + [...wed].join());
  for (const id of wed) assert.equal(S.samenStatus('activiteit', id) || S.samenStatus('minigame', id), 'werkt', 'wedstrijd: ' + id);
  for (const id of ['kermis', 'zwembad', 'waterski']) assert.equal(S.samenStatus('activiteit', id), 'nee', id);
});

t('elke minigame en elk voertuig uit cooproles.js heeft een status', () => {
  for (const id of REGISTRY.minigame.keys()) assert.ok(S.samenStatus('minigame', id), 'minigame zonder status: ' + id);
  for (const id of REGISTRY.voertuig.keys()) assert.ok(S.samenStatus('voertuig', id), 'voertuig zonder status: ' + id);
  assert.equal(S.samenStatus('minigame', 'padel'), 'werkt');
  assert.equal(S.samenStatus('voertuig', 'trein'), 'nee');
  assert.equal(S.samenStatus('voertuig', 'trekker'), 'nee');
});

t('elke stap die missions.js kent heeft een status; goto, hold, board, escape en chase werken', () => {
  const bron = lees('missions.js');
  const stap = new Set([...bron.matchAll(/^ {4}case '([a-z]+)':/gm)].map((m) => m[1]));
  for (const k of ['goto', 'hold', 'board', 'escape', 'chase', 'laser', 'train']) assert.ok(stap.has(k), 'stap gevonden: ' + k);
  // de stappen die een missie echt gebruikt (kind: in de missiebestanden) en die missions.js afhandelt, hebben allemaal een status
  const kinds = new Set();
  for (const f of alleJs.filter((q) => /^missions/.test(q))) for (const m of lees(f).matchAll(/\bkind: '([a-z]+)'/g)) kinds.add(m[1]);
  const gebruikt = [...kinds].filter((k) => stap.has(k));
  assert.ok(gebruikt.length >= 8, 'de stappen zijn gevonden: ' + gebruikt.join());
  for (const k of gebruikt) assert.ok(S.samenStatus('stap', k), 'stap zonder status: ' + k);
  for (const k of ['goto', 'hold', 'board', 'escape', 'chase']) assert.equal(S.samenStatus('stap', k), 'werkt', k);
  for (const k of ['laser', 'crack', 'vault', 'plan']) assert.equal(S.samenStatus('stap', k), 'deels', k);
  assert.equal(S.samenStatus('stap', 'train'), 'nee');
});

t('een missie krijgt de slechtste status van zijn stappen', () => {
  assert.equal(S.missieStatus({ type: 'stages', stages: [{ kind: 'goto' }, { kind: 'hold' }, { kind: 'chase' }] }), 'werkt');
  assert.equal(S.missieStatus({ type: 'stages', stages: [{ kind: 'goto' }, { kind: 'crack' }] }), 'deels');
  assert.equal(S.missieStatus({ type: 'stages', stages: [{ kind: 'crack' }, { kind: 'train' }, { kind: 'goto' }] }), 'nee');
  assert.equal(S.missieStatus({ type: 'stages', stages: [{ kind: 'iets-nieuws' }] }), 'deels', 'een onbekende stap telt als deels');
  assert.equal(S.missieStatus({ type: 'boat' }), 'nee');
  assert.equal(S.missieStatus({ type: 'checkpoint' }), 'deels');
  assert.equal(S.missieStatus(null), null);
});

t('onbekende onderdelen: geen status en geen waarschuwing', () => {
  assert.equal(S.samenStatus('activiteit', 'bestaat-niet'), null);
  assert.equal(S.samenStatus('bestaat-niet', 'x'), null);
  assert.equal(S.samenStatus('activiteit', 'toString'), null, 'geen sleutels van Object.prototype');
  assert.equal(S.samenStatus('bijbaan', 'loket-nieuw'), 'nee', 'een bijbaan die niet in BIJBAAN_REGELS staat blijft bij wie het spel opende');
  assert.equal(S.samenStatus('bijbaan', ''), null);
  assert.equal(S.samenStatus('missie', 7), null);
  assert.equal(S.samenWaarschuwing(samen(), 'activiteit', 'bestaat-niet'), null);
});

t('eenspeler: nooit een waarschuwing, ook niet bij een nee-onderdeel', () => {
  const w = wereld(0);
  assert.equal(S.meerdereSpelers(w), false);
  for (const [soort, id] of [['activiteit', 'skatepark'], ['bijbaan', 'boerderij'], ['stap', 'train'], ['minigame', 'heli']]) {
    assert.equal(S.samenWaarschuwing(w, soort, id), null, id);
    assert.equal(S.waarschuwVoorStart(w, soort, id), null, id);
  }
  assert.equal(w.meldingen.length, 0);
  assert.equal(S.samenWaarschuwing(null, 'activiteit', 'skatepark'), null, 'zonder wereld ook niet');
  assert.equal(S.samenWaarschuwing({}, 'activiteit', 'skatepark'), null, 'een leeg wereldobject is een speler');
});

t('twee of meer spelers: nee grijs, deels met markering, werkt niets; de start meldt maar blokkeert niet', () => {
  for (const extra of [1, 2, 3]) {
    const w = wereld(extra);
    assert.equal(S.meerdereSpelers(w), true, 'spelers ' + (extra + 1));
    const nee = S.samenWaarschuwing(w, 'activiteit', 'kermis');
    assert.deepEqual([nee.status, nee.grijs, nee.deels, nee.tekst], ['nee', true, false, 'Dit werkt nog niet samen.']);
    const deels = S.samenWaarschuwing(w, 'activiteit', 'safehuis');
    assert.deepEqual([deels.status, deels.grijs, deels.deels, deels.tekst], ['deels', false, true, 'Dit werkt nog maar deels samen.']);
    for (const [soort, id] of [['activiteit', 'discgolf'], ['bijbaan', 'taxi'], ['bijbaan', 'bus'], ['stap', 'goto'], ['minigame', 'padel']]) assert.equal(S.samenWaarschuwing(w, soort, id), null, id);
  }
  const w = samen();
  const r = S.waarschuwVoorStart(w, 'bijbaan', 'rondvaart');
  assert.equal(r.status, 'nee');
  assert.deepEqual(w.meldingen, ['Dit werkt nog niet samen. Je kunt het toch proberen.']);
  assert.equal(S.waarschuwVoorStart(w, 'bijbaan', 'taxi'), null);
  assert.equal(w.meldingen.length, 1, 'een onderdeel dat werkt meldt niets');
  assert.equal(S.waarschuwVoorStart(w, 'stap', 'x', 'deels').status, 'deels', 'een bekende status (missieStatus) mag meegegeven worden');
  assert.match(w.meldingen[1], /deels/);
});

t('een gast ziet hetzelfde: alleen de host-partner telt als tweede speler', () => {
  const w = { player: { x: 0, y: 0 }, coopPartners: [{ slot: 0, x: 3, y: 3, naam: 'Host' }], meldingen: [], addMessage(t) { this.meldingen.push(t); } };
  ververs(w, 1);
  assert.equal(S.meerdereSpelers(w), true);
  assert.equal(S.samenWaarschuwing(w, 'activiteit', 'zwembad').status, 'nee');
  w.coopPartners = []; // de host viel weg: weer een sessie van één
  assert.equal(S.meerdereSpelers(w), false);
  assert.equal(S.samenWaarschuwing(w, 'activiteit', 'zwembad'), null);
});

console.log(`coopstatus_test: ${n} groepen ok`);
