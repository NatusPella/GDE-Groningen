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
  assert.equal(S.SAMEN_TEKST.nee, 'Dit kan alleen in je eigen spel; samen kan hengelen en boeren.');
  assert.equal(S.SAMEN_TEKST.deels, 'Dit werkt nog maar deels samen.');
});

t('#684: een nee noemt wat wél kan en de positieve lijst komt uit het register', () => {
  assert.match(S.SAMEN_TEKST.nee, /samen kan hengelen/);
  assert.match(S.START_TEKST.nee, /samen kan hengelen/);
  assert.match(S.START_TEKST.nee, /pannenkoeken bakken/);
  const kan = S.samenKan();
  assert.ok(kan.length >= 12, 'de lijst is gevuld: ' + kan.join(', '));
  for (const label of kan) assert.ok(label && label === label.toLowerCase(), 'kleine letters: ' + label);
  // de volledige regel noemt elk onderdeel dat werkt, en niets dat 'nee' is
  assert.match(S.SAMEN_KAN_REGEL, /^Samen kan nu: .+\.$/);
  for (const label of kan) assert.ok(S.SAMEN_KAN_REGEL.includes(label), label);
  assert.doesNotMatch(S.SAMEN_KAN_REGEL, /zwembad|kermis|vliegschool|trein|heli\b/);
  // de korte regel past in het meldingenbudget en noemt de vier lokale activiteiten van een gast
  assert.ok(woorden(S.SAMEN_KAN_KORT) <= 14, S.SAMEN_KAN_KORT);
  for (const w of ['hengelen', 'boeren', 'pannenkoeken', 'beiaard']) assert.match(S.SAMEN_KAN_KORT, new RegExp(w), w);
  assert.equal(S.SAMEN_KAN_TITEL, 'Wat kan samen');
});

t('elke bijbaan uit de code heeft een status; de coöp-bijbanen en de bus werken', () => {
  const ids = new Set();
  for (const f of alleJs.filter((q) => /^sidejob_/.test(q))) for (const m of lees(f).matchAll(/^ {2}id: '([a-z]+)'/gm)) ids.add(m[1]);
  assert.ok(ids.size >= 15, 'de bijbanen zijn gevonden: ' + [...ids].join());
  for (const id of ids) assert.ok(S.samenStatus('bijbaan', id), 'bijbaan zonder status: ' + id);
  for (const id of Object.keys(BIJBAAN_REGELS)) assert.equal(S.samenStatus('bijbaan', id), 'werkt', id);
  assert.equal(S.samenStatus('bijbaan', 'bus'), 'werkt');
  // #492: de vrachtbijbaan werkt samen met een bijrijder; de status volgt de regel in coopbijbaan.js
  assert.equal(BIJBAAN_REGELS.vracht.rol, 'bijrijder');
  assert.equal(S.samenStatus('bijbaan', 'vracht'), 'werkt');
  for (const id of ['boerderij', 'rondvaarttour', 'boa']) assert.equal(S.samenStatus('bijbaan', id), 'nee', id);
  // #683: de drie nieuwe banen hebben een eigen helper-rol en staan op werkt
  for (const [id, rol] of [['rondvaart', 'passagier'], ['veerdienst', 'passagier'], ['rechtbank', 'tweede jurylid']]) {
    assert.equal(S.samenStatus('bijbaan', id), 'werkt', id);
    assert.equal(BIJBAAN_REGELS[id].rol, rol, id + ': rol');
    assert.ok(BIJBAAN_REGELS[id].hulp.length > 20, id + ': hulp');
  }
  assert.ok(S.samenKan().includes('de rondvaart') && S.samenKan().includes('de veerdienst') && S.samenKan().includes('de rechtbank'));
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
  assert.equal(S.samenStatus('voertuig', 'trein'), 'deels');
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
  for (const k of ['laser', 'crack', 'vault', 'plan']) assert.equal(S.samenStatus('stap', k), 'werkt', k);
  assert.equal(S.samenStatus('stap', 'train'), 'nee');
});

t('een missie krijgt de slechtste status van zijn stappen', () => {
  assert.equal(S.missieStatus({ type: 'stages', stages: [{ kind: 'goto' }, { kind: 'hold' }, { kind: 'chase' }] }), 'werkt');
  assert.equal(S.missieStatus({ type: 'stages', stages: [{ kind: 'goto' }, { kind: 'crack' }] }), 'werkt');
  assert.equal(S.missieStatus({ type: 'stages', stages: [{ kind: 'crack' }, { kind: 'train' }, { kind: 'goto' }] }), 'nee');
  assert.equal(S.missieStatus({ type: 'stages', stages: [{ kind: 'iets-nieuws' }] }), 'deels', 'een onbekende stap telt als deels');
  assert.equal(S.missieStatus({ type: 'boat' }), 'nee');
  assert.equal(S.missieStatus({ type: 'checkpoint' }), 'werkt', 'sinds #525 leest de motor de groep: elke meespeler haalt zelf de controlepunten');
  assert.equal(S.missieStatus(null), null);
});

t('de vliegschool blijft nee, maar de tekst noemt het meerijden (#492)', () => {
  assert.equal(S.samenStatus('activiteit', 'vliegschool'), 'nee', 'de lessen zijn host-only');
  const w = S.samenWaarschuwing(samen(), 'activiteit', 'vliegschool');
  assert.equal(w.status, 'nee'); assert.equal(w.grijs, true);
  assert.equal(w.toelichting, S.TOELICHTING['activiteit/vliegschool']);
  assert.match(w.toelichting, /meerijden/); assert.match(w.toelichting, /besturen niet/);
  assert.match(w.tekst, /meerijden/, 'de kaarttekst noemt het meerijden echt');
  assert.match(w.start, /meerijden/, 'de waarschuwing vóór de start noemt het meerijden echt');
  assert.equal(S.toelichtingVan('activiteit', 'vliegschool'), w.toelichting);
  assert.equal(S.toelichtingVan('activiteit', 'kermis'), null, 'de andere nee-onderdelen houden de gewone tekst');
  assert.equal(S.toelichtingVan('activiteit', 'toString'), null);
  assert.equal(S.toelichtingVan('activiteit', null), null);
  assert.equal(S.samenWaarschuwing(samen(), 'activiteit', 'kermis').toelichting, null);
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

t('#683: elke deels-activiteit heeft een bewuste keuze en het groeipad noemt echte, nog niet-samen banen', () => {
  const deels = Object.entries(S.REGISTER.activiteit).filter(([, st]) => st === S.DEELS).map(([id]) => id);
  assert.ok(deels.length >= 7, 'de zeven deels-activiteiten: ' + deels.join(', '));
  for (const id of deels) {
    const k = S.deelsKeuzeVan(id);
    assert.ok(k, id + ' heeft een keuze');
    assert.ok(S.DEELS_ROUTES.includes(k.route), id + ': route ' + k.route);
    assert.ok(k.rol && k.reden && k.reden.length > 20, id + ': rol en reden');
    assert.ok(['lokaal', 'wedstrijd', 'host-only'].includes(k.route), id);
    // een volgende stap is pas geldig als er iets te bouwen is; host-only noemt wat er nu niet kan
    if (k.route === 'host-only') assert.ok(k.kandidaat && k.nodig, id + ': wat een volgende stap zou zijn');
  }
  assert.equal(S.deelsKeuzeVan('discgolf'), null, 'een werkende activiteit heeft geen deels-keuze');
  assert.equal(S.deelsKeuzeVan('bestaatniet'), null);
  assert.equal(S.deelsKeuzeVan(null), null);
  // het groeipad: banen die het spel kent, nu nog host-only (geen BIJBAAN_REGELS), met een helper-rol en de haak
  // het groeipad is leeg: alle acht banen die erin stonden zijn gebouwd en hebben een regel (#683)
  assert.equal(S.BIJBAAN_GROEIPAD.length, 0, 'het groeipad is gesloten');
  // #683: de vijf banen uit het groeipad hebben een eigen E-hulp en staan op werkt
  for (const [id, rol] of [['cabaret', 'mede-optreder'], ['loket', 'tweede balie'], ['snackoverlast', 'handhaver'], ['tjalke', 'bemanning'], ['bietenoogst', 'helper']]) {
    assert.equal(S.samenStatus('bijbaan', id), 'werkt', id);
    assert.equal(BIJBAAN_REGELS[id].rol, rol, id + ': rol');
    assert.equal(BIJBAAN_REGELS[id].actie, true, id + ': E-hulp');
    assert.ok(S.samenKan().some((l) => l.includes(id === 'bietenoogst' ? 'bietenoogst' : id)), id + ' staat in de positieve lijst');
  }
  const RB = BIJBAAN_REGELS;
  assert.equal(RB.cabaret.positie, true); assert.equal(RB.tjalke.positie, false);
});

t('twee of meer spelers: nee grijs, deels met markering, werkt niets; de start meldt maar blokkeert niet', () => {
  for (const extra of [1, 2, 3]) {
    const w = wereld(extra);
    assert.equal(S.meerdereSpelers(w), true, 'spelers ' + (extra + 1));
    const nee = S.samenWaarschuwing(w, 'activiteit', 'kermis');
    assert.deepEqual([nee.status, nee.grijs, nee.deels, nee.tekst], ['nee', true, false, 'Dit kan alleen in je eigen spel; samen kan hengelen en boeren.']);
    const deels = S.samenWaarschuwing(w, 'activiteit', 'safehuis');
    assert.deepEqual([deels.status, deels.grijs, deels.deels, deels.tekst], ['deels', false, true, 'Dit werkt nog maar deels samen.']);
    for (const [soort, id] of [['activiteit', 'discgolf'], ['bijbaan', 'taxi'], ['bijbaan', 'bus'], ['stap', 'goto'], ['minigame', 'padel']]) assert.equal(S.samenWaarschuwing(w, soort, id), null, id);
  }
  const w = samen();
  const r = S.waarschuwVoorStart(w, 'bijbaan', 'boa');
  assert.equal(r.status, 'nee');
  assert.deepEqual(w.meldingen, ['Dit kan alleen in je eigen spel; samen kan hengelen, boeren of pannenkoeken bakken.']);
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

