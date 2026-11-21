// #492: de Beleidswinkel. Klein, veilig en per speler: drie maatregelen met een echte haak in het spel,
// opslag in de eigen gde-beleid-v1, en geen aankoop zonder geld of zonder dat de maatregel al loopt.
//   node scripts/beleidswinkel_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  BELEID, beleidVan, normaliseerBeleid, heeftBeleid, koopBeleidRegel,
  resetBeleidVoorTest, getBeleid, initBeleid, beleidActief, beleidBoetekorting, beleidBijbaanfactor, beleidMarktdag,
  beleidOffers, beleidPaneelHtml, beleidBon, koopBeleid, getBeleidSave, applyBeleidSave, BELEID_OPSLAG,
} from '../game/js/beleidswinkel.js';
import { KEYS } from '../game/js/storagekeys.js';

let n = 0, fails = 0;
const t = (naam, fn) => { n++; try { fn(); console.log('ok   ' + naam); } catch (e) { fails++; console.log('FAIL ' + naam + '\n  ' + e.message.split('\n')[0]); } };
const read = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
const mem = () => { const m = new Map(); return { m, getItem(k) { return m.has(k) ? m.get(k) : null; }, setItem(k, v) { m.set(k, String(v)); }, removeItem(k) { m.delete(k); } }; };
const wereld = (money = 1000) => ({ money, msgs: [], addMessage(t) { this.msgs.push(t); } });

t('drie maatregelen met unieke id, een prijs en een Nederlandse tekst', () => {
  assert.equal(BELEID.length, 3);
  assert.equal(new Set(BELEID.map((b) => b.id)).size, 3);
  for (const b of BELEID) {
    assert.ok(b.naam && b.tekst && b.prijs > 0, b.id);
    assert.ok(['boete', 'loon', 'markt'].includes(b.effect), b.id);
    assert.equal(beleidVan(b.id), b);
  }
  assert.equal(beleidVan('bestaatniet'), null);
  assert.equal(BELEID_OPSLAG, KEYS.beleid);
  assert.match(BELEID_OPSLAG, /^gde-beleid-v1/);
});

t('normaliseren: alleen bekende id\'s, geen dubbele, kapotte opslag wordt leeg', () => {
  assert.deepEqual(normaliseerBeleid(null), { v: 1, gekocht: [] });
  assert.deepEqual(normaliseerBeleid({ gekocht: ['flits', 'flits', 'onbekend'] }).gekocht, ['flits']);
  assert.deepEqual(normaliseerBeleid({ gekocht: 'flits' }).gekocht, []);
  assert.equal(heeftBeleid({ gekocht: ['markt'] }, 'markt'), true);
  assert.equal(heeftBeleid({ gekocht: ['markt'] }, 'flits'), false);
});

t('de pure koopregel: één keer, alleen bekend', () => {
  const st = normaliseerBeleid(null);
  const r = koopBeleidRegel(st, 'flits');
  assert.equal(r.ok, true);
  assert.equal(r.prijs, 250);
  assert.deepEqual(r.staat.gekocht, ['flits']);
  assert.deepEqual(st.gekocht, [], 'de oude stand blijft ongemoeid');
  assert.equal(koopBeleidRegel(r.staat, 'flits').ok, false, 'dubbel kopen kan niet');
  assert.equal(koopBeleidRegel(st, 'onbekend').ok, false);
});

t('kopen kost geld, één keer; zonder geld gebeurt er niets', () => {
  const st = mem();
  resetBeleidVoorTest(st);
  const w = wereld(1000);
  assert.match(koopBeleid(w, 'flits'), /Soepel flitsbeleid aangenomen/);
  assert.equal(w.money, 750);
  assert.equal(koopBeleid(w, 'flits'), 'Dat heb je al');
  assert.equal(w.money, 750, 'een tweede aankoop kost niets');
  const arm = wereld(100);
  assert.match(koopBeleid(arm, 'subsidie'), /Te weinig geld/);
  assert.equal(arm.money, 100);
  assert.equal(koopBeleid(wereld(0), 'onbekend'), 'Onbekend beleid');
  const precies = wereld(300);
  assert.match(koopBeleid(precies, 'markt'), /aangenomen/);
  assert.equal(precies.money, 0, 'tot de laatste euro, nooit negatief');
});

t('de effecten zijn echt en pas actief na de aankoop', () => {
  resetBeleidVoorTest(mem());
  assert.equal(beleidBoetekorting(), 0);
  assert.equal(beleidBijbaanfactor(), 1);
  assert.equal(beleidMarktdag(), false);
  const w = wereld(2000);
  koopBeleid(w, 'flits'); koopBeleid(w, 'subsidie'); koopBeleid(w, 'markt');
  assert.equal(beleidActief('flits'), true);
  assert.equal(beleidBoetekorting(), 0.25);
  assert.equal(beleidBijbaanfactor(), 1.05);
  assert.equal(beleidMarktdag(), true);
  assert.equal(w.money, 2000 - 250 - 350 - 300);
  const offers = beleidOffers(5000);
  assert.ok(offers.every((o) => o.gekocht), 'de winkel toont alles als aangenomen');
});

t('de stand wordt per speler bewaard en komt terug uit de opslag', () => {
  const st = mem();
  resetBeleidVoorTest(st);
  koopBeleid(wereld(1000), 'subsidie');
  const raw = JSON.parse(st.getItem(BELEID_OPSLAG));
  assert.deepEqual(raw.gekocht, ['subsidie']);
  // opnieuw laden (zoals na een herstart): de stand komt terug
  resetBeleidVoorTest(st);
  assert.equal(beleidActief('subsidie'), true);
  assert.deepEqual(getBeleidSave().gekocht, ['subsidie']);
  // een tweede speler met een eigen opslag erft niets
  const ander = mem();
  initBeleid({ opslag: ander });
  resetBeleidVoorTest(ander);
  assert.equal(beleidActief('subsidie'), false, 'de andere speler heeft zijn eigen beleid');
  applyBeleidSave({ gekocht: ['markt'] });
  assert.equal(beleidActief('markt'), true);
  assert.deepEqual(JSON.parse(ander.getItem(BELEID_OPSLAG)).gekocht, ['markt']);
});

t('de haken zitten in verkeer, bijbanen, de Fjord en de Veroverd-tab', () => {
  const verkeer = read('trafficlaw.js'), baantjes = read('sidejobs.js'), fjord = read('pg_foodtruck.js'), veroverd = read('veroverdpanel.js');
  assert.match(verkeer, /beleidBoetekorting\(\)/);
  assert.match(verkeer, /Math\.round\(amount \* \(1 - beleidBoetekorting\(\)\)\)/);
  assert.match(baantjes, /beleidBijbaanfactor\(\)/);
  assert.match(fjord, /isToday\('markt', w\) \|\| beleidMarktdag\(\)/);
  assert.match(veroverd, /beleidPaneelHtml\(/);
  assert.match(veroverd, /koopBeleid\(world/);
  assert.match(veroverd, /[data-beleid]/);
});

t('betaalbaar volgt het saldo: te weinig geld zet de knop uit, genoeg zet hem aan', () => {
  resetBeleidVoorTest(mem());
  assert.deepEqual(beleidOffers(100).map((o) => o.betaalbaar), [false, false, false]);
  assert.deepEqual(beleidOffers(300).map((o) => o.betaalbaar), [true, false, true]);
  assert.deepEqual(beleidOffers(5000).map((o) => o.betaalbaar), [true, true, true]);
  assert.equal(beleidOffers().every((o) => !o.betaalbaar), true, 'zonder saldo is niets betaalbaar');
});

t('het paneel toont saldo met duizendscheiding, een uitgezette knop met het tekort en de melding', () => {
  resetBeleidVoorTest(mem());
  const arm = beleidPaneelHtml(100, 'Te weinig geld: €250');
  assert.match(arm, /Je saldo: <b>€100<\/b>/);
  assert.match(arm, /data-beleid="flits" disabled/);
  assert.match(arm, /nog €150 nodig/);
  assert.match(arm, /Te weinig geld: €250/);
  const rijk = beleidPaneelHtml(12500);
  assert.match(rijk, /€12\.500/);
  assert.doesNotMatch(rijk, /disabled/);
  assert.doesNotMatch(rijk, /vo-beleid-melding/);
});

t('de bon toont het gevolg vóór de keuze: prijs, saldo en saldo erna, of wat er mist', () => {
  assert.deepEqual(beleidBon(250, 1000), { prijs: 250, saldo: 1000, na: 750, mist: 0 });
  assert.deepEqual(beleidBon(250, 100), { prijs: 250, saldo: 100, na: 0, mist: 150 });
  assert.deepEqual(beleidBon(250, NaN), { prijs: 250, saldo: 0, na: 0, mist: 250 });
  resetBeleidVoorTest(mem());
  const rijk = beleidPaneelHtml(1000);
  assert.match(rijk, /Na aankoop<\/span><span class="ds-z-bon__stippen"><\/span><b>€750<\/b>/, 'saldo erna van de eerste maatregel');
  assert.doesNotMatch(rijk, /Je mist/);
  const arm = beleidPaneelHtml(100);
  assert.match(arm, /Je mist<\/span><span class="ds-z-bon__stippen"><\/span><b>€150<\/b>/);
  assert.match(arm, /bw-probleem/, 'te weinig geld geeft een probleem-callout');
  assert.match(arm, /Je hebt nog €150 nodig/);
});

t('er is één gele hoofdknop, de rest is secundair; een aangenomen maatregel heeft geen knop meer', () => {
  resetBeleidVoorTest(mem());
  const html = beleidPaneelHtml(5000);
  const knoppen = html.match(/<button[^>]*data-beleid="[^"]*"[^>]*>/g) || [];
  assert.equal(knoppen.length, 3);
  assert.equal(knoppen.filter((k) => !k.includes('ds-z-knop--secundair')).length, 1, 'precies één gele knop');
  koopBeleid(wereld(5000), 'flits');
  const na = beleidPaneelHtml(4750);
  assert.equal((na.match(/data-beleid="flits"/g) || []).length, 0, 'gekochte maatregel zonder knop');
  assert.match(na, /Aangenomen/);
});

t('bij te weinig geld wijst de oplossing naar een maatregel die je wel kunt betalen, en nergens heen als niets kan', () => {
  resetBeleidVoorTest(mem());
  const alt = beleidPaneelHtml(260);
  assert.match(alt, /data-beleid-ga="flits"/, 'Soepel flitsbeleid kost 250 en past in 260');
  const niets = beleidPaneelHtml(10);
  assert.doesNotMatch(niets, /data-beleid-ga/);
});

t('elke status heeft een pictogram en een woord, niet alleen kleur', () => {
  resetBeleidVoorTest(mem());
  const html = beleidPaneelHtml(260);
  for (const woord of ['Kan nu', 'Te duur']) assert.match(html, new RegExp(`<svg class="(?:ic )?ds-z-chip__icoon"[^>]*>.*?</svg>${woord}`));
});

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
