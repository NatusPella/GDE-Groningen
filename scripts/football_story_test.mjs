// Test van de footballstorydata (#1374, V0 en V1): scripts/football_story_test.mjs. Puur, geen Electron.
// Dekt: de twee verhaalclubs (zonder voorvoegsel, het aantal blijft 16), het startpark op het Hogeland, de rangen als data, de aanleiding (de invalbeurt), de verhaalbeats per rang
// (een per speldag, niet tijdens een scène, per speler in het eigen profiel, oude profielen blijven heel) en de Samen-spelen-regel (terugblik voor een gast, geen gedeelde vlag).
import PARKDATA from '../game/js/voetbalparkendata.js';
import assert from 'node:assert/strict';
import { CLUBS, clubById, clubsOf, CLUBS_PER_DIVISION } from '../game/js/voetbalclubs.js';
import { makeParkIndex, localDivision, localClubName } from '../game/js/voetbalparken.js';
import * as C from '../game/js/voetbalcarriere.js';
import * as V from '../game/js/footballstory.js';
import { wordCount } from '../game/js/hudtext.js';
import { hasForbiddenWord } from './voetbal_verboden.mjs';
import * as L from '../game/js/loopbaanlive.js';
import * as LIVE from '../game/js/voetbalcarrierelive.js';

let n = 0;
const t = (naam, f) => { try { f(); n++; } catch (e) { console.error('FAIL', naam); throw e; } };
const index = makeParkIndex(PARKDATA);
const startAt = (char = 'anita') => C.createCareer({ char, index, home: V.storyHome(index) });
const ctx = (day = 5) => ({ unlocked: true, busy: false, day });

t('V0: de verhaalclubs hebben een verzonnen naam zonder voorvoegsel en het aantal clubs blijft 16', () => {
  assert.equal(CLUBS.length, 16);
  for (const club of CLUBS.filter((x) => x.division === 'kroon')) assert.equal(clubsOf('kroon').includes(club), true);
  assert.equal(clubsOf('kroon').length, CLUBS_PER_DIVISION);
  const top = clubById(V.STORY_TOP_CLUB_ID);
  assert.ok(top && top.division === 'kroon' && top.stadion === 'euroborg', 'de topclub speelt in de Euroborg');
  assert.equal(top.naam, V.STORY_TOP_CLUB);
  assert.equal(clubById('domtorenaars'), null, 'de oude club is vervangen');
  for (const naam of [V.STORY_TOP_CLUB, V.STORY_VILLAGE_CLUB]) {
    assert.ok(!/^(De\s+)?(VV|SV|FC|SC|RKSV)\b/i.test(naam), naam);
    assert.ok(!hasForbiddenWord(naam), naam);
  }
  assert.equal(new Set(CLUBS.map((x) => x.id)).size, 16);
  assert.equal(new Set(CLUBS.map((x) => x.naam)).size, 16);
});
t('V0: de dorpsclub is de club van Warffum en blijft stabiel; andere plaatsen houden hun sjabloonnaam', () => {
  const club = index.byPlace.get(V.STORY_PLACE_ID);
  assert.ok(club, 'Warffum heeft een park in de data');
  assert.equal(club.plaats, V.STORY_PLACE);
  assert.equal(club.naam, V.STORY_VILLAGE_CLUB);
  assert.equal(localClubName(V.STORY_PLACE_ID, 'Warffum'), 'De Hoekers');
  const andere = index.clubs.filter((c) => c.placeId !== V.STORY_PLACE_ID);
  assert.ok(andere.every((c) => c.naam !== V.STORY_VILLAGE_CLUB));
  assert.equal(new Set(index.clubs.map((c) => c.naam)).size, index.clubs.length, 'alle clubnamen blijven uniek');
});
t('V1: het startpark ligt op het Hogeland: de eerste club is De Hoekers en de Talentenklasse zijn de dorpen er omheen', () => {
  const home = V.storyHome(index);
  assert.ok(home && Number.isFinite(home.x) && Number.isFinite(home.y));
  const d = localDivision(index, home);
  assert.equal(d.home.naam, 'De Hoekers');
  assert.equal(d.clubs.length, 8);
  const plaatsen = d.clubs.map((c) => c.plaats);
  assert.ok(plaatsen.includes('Usquert') && plaatsen.includes('Uithuizen'), plaatsen.join(', '));
  assert.ok(!plaatsen.includes('Veendam'), 'een Hogeland-begin, geen stadsclub');
  const c = startAt();
  assert.equal(c.club, d.home.id); assert.equal(c.homeClub, d.home.id);
  assert.equal(C.divisionOfMyClub(c), 'talent');
  assert.equal(V.storyHome(null), null); assert.equal(V.storyHome(makeParkIndex({ v: 1, plaatsen: [] })), null, 'zonder die plaats in de data blijft de start waar hij was');
});
t('V1: de bijfiguren en de zes rangen zijn data, Nederlands, zonder echte namen, en elke naam is eerst geïntroduceerd', () => {
  assert.equal(V.RANKS.length, 6);
  assert.deepEqual(V.RANKS.map((r) => r.rang), [1, 2, 3, 4, 5, 6]);
  assert.ok(V.RANKS.every((r) => r.naam && r.moment && r.plek && r.figuren.every((f) => V.castById(f))));
  assert.deepEqual(V.CAST.slice(0, 2).map((p) => p.naam), ['Albert Teuben', 'Eppo Rozema'], 'deel 01 wint van de eerste opzet van deel 02');
  for (const p of V.CAST) {
    assert.ok(p.naam && p.rol && p.intro, p.id);
    assert.ok(!hasForbiddenWord(`${p.naam} ${p.rol} ${p.intro}`), p.id);
    assert.ok(!/\b(Bos|Klaas|Gladiolen)\b/.test(`${p.naam} ${p.rol}`), 'geen namen uit de oude opzet');
  }
  assert.equal(new Set(V.CAST.map((p) => p.id)).size, V.CAST.length);
});
t('V1: de aanleiding is data in drie delen met sprekers die in de cast of het duo staan; de terugblik is van Albert', () => {
  const alles = V.invalLines();
  assert.equal(alles.length, V.INVAL.avond.length + V.INVAL.zondag.length + V.INVAL.clubhuis.length);
  const bekend = new Set(['Tammo', 'Tessa', ...V.CAST.map((p) => p.naam)]);
  for (const l of alles) { assert.ok(bekend.has(l.wie), l.wie); assert.ok(l.tekst.length > 8 && !hasForbiddenWord(l.tekst)); assert.ok(!/\bde Grunn\b/i.test(l.tekst)); }
  // de speler leert de mensen op de trainingsavond kennen vóór de uitval op zondag
  assert.deepEqual(V.invalLines('avond').map((l) => l.wie), ['Albert Teuben', 'Eppo Rozema', 'Remco Zwart']);
  assert.ok(V.invalLines('zondag').some((l) => l.wie === 'Tessa'), 'Tessa valt in');
  assert.ok(V.invalLines('zondag').some((l) => l.wie === 'Tammo'), 'Tammo staat langs de lijn');
  const terug = V.guestRetrospect();
  assert.ok(terug.length >= 1 && terug.every((l) => l.wie === 'Albert Teuben'));
  terug[0].tekst = 'x'; assert.notEqual(V.guestRetrospect()[0].tekst, 'x', 'een kopie, niet de bron');
  assert.equal(V.INVAL.plaats, V.STORY_PLACE);
});
t('V1: de rang volgt het profiel en daalt nooit door een extra voorwaarde', () => {
  assert.equal(V.storyRank(null), 0); assert.equal(V.storyRank(C.newCareer()), 0);
  const c = startAt();
  assert.equal(V.storyRank(c), 1);
  assert.equal(V.storyRank({ ...c, flags: { ...c.flags, debut: true } }), 2);
  assert.equal(V.storyRank({ ...c, stats: { ...c.stats, promotions: 1 } }), 3);
  assert.equal(V.storyRank({ ...c, flags: { ...c.flags, bid: true } }), 4);
  assert.equal(V.storyRank({ ...c, flags: { ...c.flags, captain: true } }), 5);
  assert.equal(V.storyRank({ ...c, roles: { trainer: true, manager: false } }), 6);
  const inKroon = { ...c, club: 'stadjers', world: { ...c.world, kroon: [...c.world.kroon], talent: c.world.talent.filter((x) => x !== c.club) } };
  inKroon.world.kroon.push('stadjers');
  assert.equal(V.storyRank(inKroon), 6, 'in de Kroonklasse is rang 6');
  assert.equal(V.rankInfo(4).id, 'doorbraak'); assert.equal(V.rankInfo(9), null);
});
t('V1: de verhaalbeats hebben hooguit 14 woorden, een spreker met rol en geen verboden woorden', () => {
  assert.equal(V.STORY_BEATS.length, 6);
  for (const b of V.STORY_BEATS) {
    assert.ok(wordCount(b.tekst) <= V.STORY_BEAT_MAX_WORDS, `${b.id}: ${wordCount(b.tekst)} woorden`);
    assert.ok(!hasForbiddenWord(b.tekst) && !/\b(winter|sneeuw|de grunn)\b/i.test(b.tekst), b.tekst);
    assert.ok(b.wie && b.tekst.length > 10 && !/[A-Z]{4,}/.test(b.tekst));
  }
  assert.equal(new Set(V.STORY_BEATS.map((b) => b.id)).size, 6);
  assert.ok(V.STORY_BEATS.length <= 31, 'het bitmasker houdt 31 beats');
});
t('V1: een carrière krijgt per rang de beat, een per speldag, niet tijdens een scène, en een gedane beat komt niet terug', () => {
  let c = startAt();
  assert.equal(V.nextStoryBeat(c, { unlocked: true, busy: true, day: 5 }), null, 'niet tijdens een missie of scène');
  assert.equal(V.nextStoryBeat(c, { unlocked: false, busy: false, day: 5 }), null, 'niet voor de poort');
  const b1 = V.nextStoryBeat(c, ctx());
  assert.equal(b1.id, 'V1');
  c = V.markStoryBeat(c, b1, 5);
  assert.equal(V.nextStoryBeat(c, ctx(5)), null, 'dezelfde speldag niet nog eens');
  assert.equal(V.nextStoryBeat(c, ctx(6)), null, 'rang 1: er is verder niets aan de beurt');
  // rang 3 haalt V2 en V3, in volgorde, een per dag
  c = { ...c, flags: { ...c.flags, debut: true }, stats: { ...c.stats, promotions: 1 } };
  const b2 = V.nextStoryBeat(c, ctx(6)); assert.equal(b2.id, 'V2'); c = V.markStoryBeat(c, b2, 6);
  assert.equal(V.nextStoryBeat(c, ctx(6)), null);
  const b3 = V.nextStoryBeat(c, ctx(7)); assert.equal(b3.id, 'V3'); c = V.markStoryBeat(c, b3, 7);
  assert.equal(V.nextStoryBeat(c, ctx(8)), null);
  assert.deepEqual(V.storyBeatsDone(c), ['V1', 'V2', 'V3']);
  // een profiel op rang 6 dat alles mist, haalt ze één voor één in
  let d = { ...startAt(), roles: { trainer: true, manager: false } };
  const gezien = [];
  for (let day = 1; day < 12; day++) { const b = V.nextStoryBeat(d, ctx(day)); if (b && !b.jelle) { gezien.push(b.id); d = V.markStoryBeat(d, b, day); } }
  assert.deepEqual(gezien, ['V1', 'V2', 'V3', 'V4', 'V5', 'V6']);
  assert.match(V.storyHudLine(V.STORY_BEATS[0]), /^Albert Teuben: /);
});
t('V1: Jelle stuurt een brief per seizoen vanaf seizoen 2, nooit twee in een seizoen, en de tekst wisselt', () => {
  let c = { ...startAt(), seasonNr: 1 };
  assert.equal(V.jelleLetter(c), null, 'seizoen 1: nog geen brief');
  const teksten = new Set();
  for (let s = 2; s <= 6; s++) {
    c = { ...c, seasonNr: s, flags: { ...c.flags, storyBeats: 63 } };      // alle zes de rangbeats gedaan
    const brief = V.nextStoryBeat(c, ctx(10 * s));
    assert.ok(brief && brief.jelle && brief.seizoen === s, `seizoen ${s}`);
    assert.ok(wordCount(brief.tekst) <= V.STORY_BEAT_MAX_WORDS && !hasForbiddenWord(brief.tekst));
    teksten.add(brief.tekst);
    c = V.markStoryBeat(c, brief, 10 * s);
    assert.equal(V.nextStoryBeat(c, ctx(10 * s + 1)), null, `seizoen ${s}: geen tweede brief`);
  }
  assert.ok(teksten.size >= 4, 'de brieven wisselen');
});
t('Samen spelen: de verhaalvlaggen staan in het eigen profiel; opslaan en laden bewaart ze en een oud profiel breekt niet', () => {
  let c = startAt();
  c = V.markStoryBeat(c, V.nextStoryBeat(c, ctx()), 5);
  const terug = C.normalize(JSON.parse(JSON.stringify(c)));
  assert.deepEqual(V.storyBeatsDone(terug), ['V1']);
  const oud = C.normalize(JSON.parse(JSON.stringify(startAt())));
  assert.deepEqual(V.storyBeatsDone(oud), [], 'een profiel zonder verhaalvlaggen heeft ze niet gedaan');
  assert.equal(V.nextStoryBeat(oud, ctx()).id, 'V1', 'en krijgt ze alsnog');
  // een tweede profiel (een gast die zijn eigen carrière start) deelt niets met het eerste
  const gast = startAt('tammo');
  assert.deepEqual(V.storyBeatsDone(gast), []);
  assert.equal(V.nextStoryBeat(gast, ctx()).id, 'V1');
});
t('de live-laag: een nieuwe carrière begint bij De Hoekers en de verhaalbeat komt als stil appje, een per speldag, na de vaste beats', () => {
  const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => m.delete(k) }; };
  L.zetProfielVoorTest(null, mem()); LIVE.useStorage(mem()); LIVE.useParkData(PARKDATA);
  const w = { money: 0, clock: 12, time: 1500, msgs: [], addMessage(x) { this.msgs.push(x); }, coopDeel: null, player: { character: 'anita' } };
  const c = LIVE.createNew(w, 'anita');
  assert.equal(LIVE.getIndex().byId.get(c.club).naam, 'De Hoekers', 'de start is de dorpsclub');
  const eerste = LIVE.updateBeats(3, w);
  assert.equal(eerste.id, 'V1');
  assert.match(w.msgs[0], /^Albert Teuben: /);
  assert.equal(LIVE.updateBeats(3, w), null, 'een beat per speldag');
  assert.deepEqual(V.storyBeatsDone(LIVE.getCareer()), ['V1'], 'bewaard in het eigen profiel');
  const dag = (d, extra = {}) => { const k = LIVE.getCareer(); LIVE.replaceCareer({ ...k, day: d, flags: { ...k.flags, ...extra } }); };
  dag(1); w.time = 3000; assert.equal(LIVE.updateBeats(3, w), null, 'een volgende speldag: niets aan de beurt op rang 1');
  dag(2, { trained: true, debut: true });
  w.time = 4500; assert.equal(LIVE.updateBeats(3, w).id, 'B2', 'de vaste beats gaan voor');
  dag(3); w.time = 6000; assert.equal(LIVE.updateBeats(3, w).id, 'B3');
  dag(4); w.time = 7500; const volgende = LIVE.updateBeats(3, w); assert.equal(volgende.id, 'V2', 'daarna de verhaalbeat van rang 2');
});

console.log(`football_story_test: ${n} groepen ok`);
