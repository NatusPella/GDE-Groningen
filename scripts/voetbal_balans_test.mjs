// Balans en exploit-audit van de voetbalcarrière (#1116, epic #1106): meerdere seizoenen over beide personages en alle drie de strategieën, plus de lussen
// waarmee een speler geld uit niets zou kunnen halen (aandelen kopen en verkopen, bewerkte save, sponsor twee keer, contract opnieuw laden, nachtlus).
// Puur: geen wereld, geen opslag, geen Electron.   node scripts/voetbal_balans_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runCareer, loadIndex } from './voetbal_carriere_sim.mjs';
import * as S from './lib/economiesim.mjs';
import * as C from '../game/js/voetbalcarriere.js';
import * as B from '../game/js/voetbalclub_bezit.js';
import * as T from '../game/js/voetbaltransfers.js';
import * as Sp from '../game/js/voetbalsponsors.js';
import { ACHIEVEMENTS } from '../game/js/achievements.js';

let n = 0, fails = 0;
const t = (naam, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL ' + naam + '\n  ' + String(e.message).split('\n')[0]); } };
const NETTO_PER_UUR = S.simuleer({ uren: 10 }).netPerUur;       // het gemeten gemiddelde van de hele economie (ongeveer 1.100)
const MAX = NETTO_PER_UUR * 1.15;                                // geen voetbalbron mag daar boven uit komen (ontwerp: binnen 15 procent)
const index = loadIndex(), getClub = C.clubResolver(index);
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');

// Over zes seizoenen: elk personage, elke strategie.
const runs = {};
for (const char of ['anita', 'tammo']) for (const strategie of ['speel', 'reken', 'mix']) runs[`${char}/${strategie}`] = runCareer({ char, seizoenen: 6, strategie });

t('zes seizoenen: elke run eindigt, het geld is eindig en positief, en wie zelf speelt verdient meer dan wie laat rekenen', () => {
  for (const [k, r] of Object.entries(runs)) {
    assert.ok(Number.isFinite(r.earned) && r.earned > 0, `${k}: verdiend ${r.earned}`);
    assert.equal(r.seasons.length, 6, `${k}: ${r.seasons.length} seizoenen`);
    for (const s of r.seasons) assert.ok(Number.isFinite(s.earned) && s.earned >= 0 && s.earned <= 4000, `${k} seizoen ${s.nr}: ${s.earned}`);
  }
  for (const char of ['anita', 'tammo']) {
    assert.ok(runs[`${char}/speel`].earned > runs[`${char}/reken`].earned * 1.5, `${char}: spelen is niet duidelijk beter dan rekenen laten`);
    assert.ok(runs[`${char}/mix`].earned >= runs[`${char}/reken`].earned, `${char}: mix minder dan rekenen`);
    assert.ok(runs[`${char}/mix`].earned <= runs[`${char}/speel`].earned, `${char}: mix meer dan spelen`);
  }
});

t('geld per actief uur: zelf spelen blijft onder het gemiddelde van de hele economie plus 15%, en boven een zinnig uurloon', () => {
  for (const char of ['anita', 'tammo']) {
    const r = runs[`${char}/speel`];
    assert.ok(r.perHour <= MAX, `${char}: ${r.perHour} per actief uur is boven ${Math.round(MAX)}`);
    assert.ok(r.perHour >= 200, `${char}: ${r.perHour} per actief uur is te weinig om de moeite te zijn`);
  }
});

t('de nachtlus: wie elke vier echte minuten slaapt om de speldag te laten lopen en alles laat rekenen, haalt hooguit 15% van het gemiddelde per uur', () => {
  // Een speldag is 24 minuten klok; de klok moet 4 uur lopen voordat een nacht telt (voetbalagenda.js NIGHT_JUMP): een nacht kost dus ten minste 4 echte minuten.
  for (const char of ['anita', 'tammo']) {
    const r = runs[`${char}/reken`];
    const perUur = r.earned / ((r.days * 4) / 60);
    assert.ok(perUur <= NETTO_PER_UUR * 0.15, `${char}: slaaplus geeft ${Math.round(perUur)} per uur (grens ${Math.round(NETTO_PER_UUR * 0.15)})`);
  }
});

t('de prestaties: elke vc_-prestatie heeft een ontgrendelpad en elk pad een definitie; steam/achievements.json volgt de tekst', () => {
  const src = read('../game/js/voetbalcarrierelive.js');
  const paden = new Set([...src.slice(src.indexOf('export function achievementsFor'), src.indexOf('function unlockFor')).matchAll(/ids\.push\('([a-z_]+)'\)/g)].map((m) => m[1]));
  const defs = ACHIEVEMENTS.filter((a) => a.id.startsWith('vc_')).map((a) => a.id);
  assert.deepEqual([...paden].sort(), defs.slice().sort(), 'paden en definities verschillen');
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length, 'dubbele ids');
  const steam = JSON.parse(read('../steam/achievements.json')).prestaties;
  for (const a of ACHIEVEMENTS.filter((x) => x.id.startsWith('vc_') || x.id.startsWith('voetbal_'))) {
    assert.ok(a.title && a.desc, `${a.id}: tekst`);
    const s = steam.find((x) => x.id === a.id);
    assert.ok(s && s.titel === a.title && s.omschrijving === a.desc, `${a.id} mist of wijkt af in steam/achievements.json`);
  }
});

// ---- exploit-audit ----
const base = runs['anita/speel'].career;
const rijk = () => ({ ...JSON.parse(JSON.stringify(base)), flags: { ...base.flags, shareReady: true } });
const clubIds = () => base.leagues.talent.clubs.filter((id) => id !== base.club);

t('aandeel kopen en meteen verkopen kost altijd geld (verkoop 75%), ook herhaald en met meerdere clubs', () => {
  let c = rijk(), kas = 1e7;
  const start = kas;
  for (let i = 0; i < 20; i++) for (const id of clubIds().slice(0, 3)) {
    const b = C.buyClubShare(c, id, 0.1, kas, getClub);
    assert.ok(b.ok, b.reason);
    c = b.career; kas -= b.price;
    const s = C.sellClubShare(c, id);
    assert.ok(s.ok && s.price < b.price, 'verkoop is minder dan aankoop');
    c = s.career; kas += s.price;
  }
  assert.ok(kas < start, 'de kas daalt bij elke ronde kopen en verkopen');
});

t('de schaalprijs loopt op met het aantal clubs en stopt bij de rand; een hele club kan niet dubbel gekocht worden', () => {
  assert.ok(B.priceOf('talent', 0.1, 10) > B.priceOf('talent', 0.1, 0));
  assert.equal(B.priceOf('talent', 0.1, 500), B.priceOf('talent', 0.1, B.SCALE_CAP));
  let c = rijk(); const id = clubIds()[0];
  c = C.buyClubShare(c, id, 1, 1e7, getClub).career;
  assert.equal(C.buyClubShare(c, id, 0.1, 1e7, getClub).ok, false, 'meer dan de hele club');
});

t('het dividend betaalt een aandeel pas na minstens twaalf seizoenen terug', () => {
  for (const d of ['talent', 'terp', 'kroon']) {
    const prijs = B.priceOf(d, 1, 0);
    const top = B.dividendOf({ prijs }, 1, 8).payout * 7;   // beste plek, zeven competitierondes per seizoen
    assert.ok(top <= prijs / 12, `${d}: ${top} per seizoen op een prijs van ${prijs}`);
    assert.ok(B.dividendOf({ prijs }, 8, 8).payout > 0, 'ook de laatste plek keert iets uit');
  }
});

t('een bewerkte save kan het dividend niet opblazen: aandeel, prijs en sponsorbedrag worden geklemd', () => {
  const c = rijk(); const id = clubIds()[0];
  c.bezit = { clubs: { [id]: { aandeel: 1, sinds: 0, prijs: 1e9 } } };
  c.sponsors = { nr: 1, slots: [{ id: 'sp1-0', sort: Sp.SORT_IDS[0], naam: 'Zo en Zo', goal: 'doelpunt', amount: 9e9, accepted: true, paid: false, osm: null }] };
  const g = C.normalize(JSON.stringify(c));
  assert.ok(g.started, 'de geklemde save blijft geldig');
  const max = B.priceOf('kroon', 1, B.SCALE_CAP);
  assert.ok(g.bezit.clubs[id].prijs <= max, `prijs ${g.bezit.clubs[id].prijs}`);
  assert.ok(g.sponsors.slots[0].amount <= 2000);
  assert.ok(B.dividendOf(g.bezit.clubs[id], 1, 8).payout <= max * 0.02, 'dividend per ronde');
});

t('een sponsordoel betaalt eenmalig, ook na opslaan en laden of opnieuw accepteren', () => {
  let sp = Sp.newSponsors(base.club, 'talent', 1);
  const slot = sp.slots[0].id;
  sp = Sp.accept(sp, slot).sponsors;
  assert.equal(Sp.accept(sp, slot).ok, false, 'een tweede accepteren kan niet');
  const state = { goals: 5, unbeaten: 5, promoted: true };
  const een = Sp.settle(sp, state);
  assert.ok(een.earn.reduce((a, x) => a + x.amount, 0) > 0);
  const c = rijk(); c.sponsors = een.sponsors;
  const geladen = C.normalize(JSON.stringify(c));
  assert.deepEqual(Sp.settle(geladen.sponsors, state).earn, [], 'na laden betaalt hetzelfde doel niet nog eens');
  assert.deepEqual(Sp.settle(een.sponsors, state).earn, []);
});

t('de sponsorsom per seizoen is begrensd en blijft onder tweeënhalf keer de kampioensbeloning', () => {
  for (const d of ['talent', 'terp', 'kroon']) {
    const alles = Sp.offersFor(base.club, d, 1).reduce((a, x) => a + x.amount, 0);
    assert.ok(alles <= Sp.AMOUNT[d][1] * Sp.MAX_SPONSOR_DEALS, `${d}: ${alles}`);
  }
  assert.ok(Sp.AMOUNT.kroon[1] * Sp.MAX_SPONSOR_DEALS <= C.SEASON_PAY.kroonChampion * 2.5);
});

t('een ronde laat zich niet twee keer spelen; opnieuw laden geeft dezelfde uitrekening', () => {
  const c = JSON.parse(JSON.stringify(C.createCareer({ char: 'anita', index, home: { x: 0, y: 0 } })));
  c.day = c.seasonStart + 3;
  const m = C.nextMatch(c, getClub);
  assert.ok(m && m.status === 'open', 'de eerste ronde staat open op dag 3');
  const a = C.playEvent(c, getClub, null);
  const b = C.playEvent(C.normalize(JSON.stringify(c)), getClub, null);
  assert.deepEqual(a.summary.earn, b.summary.earn, 'laden en opnieuw rekenen: dezelfde uitslag en hetzelfde geld');
  assert.equal(a.career.evDone, c.evDone + 1);
  const dubbel = C.playEvent(a.career, getClub, null);
  assert.ok(!dubbel.summary || dubbel.summary.n !== m.n || dubbel.summary.kind !== m.kind, 'dezelfde ronde is niet nog eens te spelen');
});

t('training: een tweede training op dezelfde speldag kan niet', () => {
  const c = JSON.parse(JSON.stringify(C.createCareer({ char: 'tammo', index, home: { x: 0, y: 0 } })));
  const a = C.train(c, 'shot', 1);
  assert.ok(a.ok);
  const b = C.train(a.career, 'shot', 1);
  assert.equal(b.ok, false);
  assert.deepEqual(b.career.me, a.career.me, 'een geweigerde training verandert niets');
});

t('transfers: kopen en verkopen is een verlies en de clubkas wordt nooit speler-geld', () => {
  const club = getClub(base.club);
  const p = T.freeAgents(1, 1)[0];
  const b = T.buyPlayer(T.emptyMarket(), club, p, [], 2);
  assert.ok(b.ok, b.reason);
  const s = T.sellPlayer(b.market, club, b.market.imports[club.id][0]);
  assert.ok(s.price <= Math.round(b.price * 0.8), `verkoop ${s.price} op aankoop ${b.price}`);
  assert.ok(T.cashOf(s.market, club) < T.cashOf(T.emptyMarket(), club), 'de kas is na een rondje armer');
  assert.ok(!/clubCash|cashOf|market\.cash/.test(read('../game/js/voetbalcarrierelive.js')), 'de live-laag betaalt nooit uit de clubkas aan de speler');
});

console.log(`voetbal_balans_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
