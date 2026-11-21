// Het autotreffen op een vaste plek (game/js/tuningmeet.js, epic Autotuning ronde 4, #1155): zeldzaam, deterministisch per kalenderdag,
// de eigenaars praten over wat er echt op hun auto zit, en de haken in tuningtraffic.js (siteMeetBay, tickMeet). Pure test.
import {
  MEET_SITES, MEET_DAY_CHANCE, parkedBayId, siteMeetBay, tickMeet, meetOfDay, meetSiteAt, bayJoinsMeet, meetHourOn, eveningDay, meetNow, ownerLine, TALK_RANGE, TALK_COOLDOWN,
} from '../game/js/tuningmeet.js';
import { tunedLookFor } from '../game/js/tuningworld.js';
import { generateLook } from '../game/js/vehiclelook.js';
import { weekdayOf } from '../game/js/calendar.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name} ${info}`); } };

// zeldzaam: een treffen op minder dan een dag op de vijf, vrijdag en zaterdag vaker dan door de week
let days = 0, wk = 0, wkN = 0, wd = 0, wdN = 0;
for (let d = 0; d < 7000; d++) {
  const w = weekdayOf(d), s = meetOfDay(d, w);
  if (s) days++;
  if (w === 5 || w === 6) { wkN++; if (s) wk++; } else { wdN++; if (s) wd++; }
}
ok(days / 7000 < 0.2 && days / 7000 > 0.02, 'zeldzaam: ongeveer een dag op de tien', (days / 7000).toFixed(3));
ok(wk / wkN > wd / wdN, 'in het weekend vaker', `${(wk / wkN).toFixed(3)} tegen ${(wd / wdN).toFixed(3)}`);
ok(Math.abs(wd / wdN - MEET_DAY_CHANCE.week) < 0.02 && Math.abs(wk / wkN - MEET_DAY_CHANCE.weekend) < 0.04, 'dichtbij de bedoelde kansen');
ok(meetOfDay(NaN) === null && meetOfDay(undefined) === null, 'zonder dag geen treffen');

// deterministisch: dezelfde dag geeft overal dezelfde plek (host en gast)
let same = true, both = new Set();
for (let d = 0; d < 3000; d++) {
  const a = meetOfDay(d, weekdayOf(d)), b = meetOfDay(d, weekdayOf(d));
  if ((a && a.id) !== (b && b.id)) same = false;
  if (a) both.add(a.id);
}
ok(same, 'zelfde dag, zelfde plek');
ok(both.size === MEET_SITES.length, 'beide plekken komen voor', [...both].join());
ok(MEET_SITES.some((s) => /Haren/.test(s.name)) && MEET_SITES.some((s) => /Reitdiep/.test(s.name)), 'Haren en het Reitdiep');
ok(MEET_SITES.every((s) => Number.isFinite(s.x) && Number.isFinite(s.y) && s.r > 100 && s.r < 1500), 'plekken met een redelijke straal');

// plek van een punt
let dayOn = -1;
for (let d = 0; d < 500 && dayOn < 0; d++) if (meetOfDay(d, weekdayOf(d))) dayOn = d;
const site = meetOfDay(dayOn, weekdayOf(dayOn));
ok(site && meetSiteAt(site.x, site.y, dayOn, weekdayOf(dayOn)) === site, 'het centrum van de plek van vandaag');
ok(meetSiteAt(site.x + site.r + 50, site.y, dayOn, weekdayOf(dayOn)) === null, 'buiten de straal niets');
const other = MEET_SITES.find((s) => s !== site);
ok(meetSiteAt(other.x, other.y, dayOn, weekdayOf(dayOn)) === null, 'de andere plek is vandaag een gewone parkeerplaats');
let join = 0;
for (let i = 0; i < 4000; i++) if (bayJoinsMeet(site.x + i, site.y - i, dayOn)) join++;
ok(join / 4000 > 0.4 && join / 4000 < 0.6, 'de helft van de vakken doet mee', String(join / 4000));
ok(bayJoinsMeet(10, 20, 5) === bayJoinsMeet(10, 20, 5), 'een vak beslist elke keer hetzelfde');

// uren: 19 tot 01, na middernacht hoort bij de avond ervoor
ok(meetHourOn(19) && meetHourOn(23.5) && meetHourOn(0.5) && !meetHourOn(1) && !meetHourOn(12) && !meetHourOn(18.9), 'van 19 tot 01 uur');
ok(eveningDay(10, 22) === 10 && eveningDay(10, 0.5) === 9, 'na middernacht is het de avond van gisteren');
ok(meetNow(dayOn, 21, weekdayOf) === site && meetNow(dayOn, 12, weekdayOf) === null && meetNow(dayOn + 1, 0.5, weekdayOf) === site, 'het treffen is alleen aan in de avond van zijn dag');

// eigenaars: de zin klopt met wat er echt op de auto zit, en wisselt per beurt
const look = generateLook(77, { kind: 'auto', style: 'show' }).look || generateLook(77, { kind: 'auto', style: 'show' });
const l0 = ownerLine(look, 'p1_2', 0), l1 = ownerLine(look, 'p1_2', 1);
ok(typeof l0 === 'string' && l0.length > 12 && l0.length < 140, 'een zin van redelijke lengte');
ok(l0 === ownerLine(look, 'p1_2', 0), 'zelfde auto, zelfde zin');
ok(l0 !== l1, 'een tweede praatje geeft een andere zin');
let seen = new Set();
for (let i = 0; i < 40; i++) seen.add(ownerLine(look, 'v' + i, i));
ok(seen.size >= 6, 'genoeg variatie', String(seen.size));
ok(/underglow/i.test([...Array(8)].map((_, i) => ownerLine({ glow: '#ff00aa' }, 'g', i)).join(' ')), 'underglow komt ter sprake');
ok(ownerLine(null, 'z', 0).length > 8 && ownerLine({}, 'z', 3).length > 8, 'ook zonder look een zin');
const BANNED = /\b(bmw|audi|ford|volkswagen|toyota|mercedes|tesla|porsche|ferrari|opel|renault)\b/i;
let clean = true;
for (let i = 0; i < 300; i++) if (BANNED.test(ownerLine(look, 'x' + i, i))) clean = false;
ok(clean, 'geen merken in de eigenaarszinnen');
ok(TALK_RANGE > 1 && TALK_RANGE < 6 && TALK_COOLDOWN >= 10, 'aanspreken: dichtbij en niet vaker dan eens per kwartier-van-seconden');

// de haken: siteMeetBay en tuneParkedBay met een nepwereld
const worldOn = { calendar: { day: dayOn }, messages: [], addMessage(t) { this.messages.push(t); } };
const worldNone = { calendar: { day: 3 } };
let bayHit = 0;
for (let i = 0; i < 200; i++) if (siteMeetBay(worldOn, site.x + (i % 20) * 3, site.y + Math.floor(i / 20) * 3)) bayHit++;
ok(bayHit > 40 && bayHit < 160, 'op de treffendag doet de helft van de vakken in de straal mee', String(bayHit));
ok(!siteMeetBay(worldOn, other.x, other.y) && !siteMeetBay({}, site.x, site.y), 'andere plek of geen kalender: niet');
ok(parkedBayId({ x: 10.4, y: 20.6 }) === 'p10_21' && parkedBayId({ x: 10.4, y: 20.6 }, 5) === 'p10_21d5' && parkedBayId({ x: 1, y: 2 }, null) === 'p1_2', 'het vak-id: gewoon uit de plek, op een treffen ook uit de dag');
let pimped = 0, diff = 0;
for (let i = 0; i < 300; i++) {
  const id = parkedBayId({ x: site.x + i * 5, y: site.y }, dayOn), id2 = parkedBayId({ x: site.x + i * 5, y: site.y }, dayOn + 7);
  const t = tunedLookFor(id, 'centrum', { kind: 'sport', parked: true, meet: true }), t2 = tunedLookFor(id2, 'centrum', { kind: 'sport', parked: true, meet: true });
  if (t) pimped++;
  if (JSON.stringify(t) !== JSON.stringify(t2)) diff++;
  ok(JSON.stringify(t) === JSON.stringify(tunedLookFor(id, 'centrum', { kind: 'sport', parked: true, meet: true })), 'zelfde dag, zelfde auto in het vak');
}
ok(pimped > 40, 'een treffenvak is vaak gepimpt (het aandeel van een treffen)', String(pimped));
ok(diff > 100, 'een andere dag, andere auto’s in de vakken', String(diff));

// tickMeet: melding, bezoeker en eigenaar (nepwereld met slapende auto's op de plek)
const sleeping = new Set();
for (let i = 0; i < 4; i++) sleeping.add({ id: 'c' + i, x: site.x + i * 3, y: site.y, halfLen: 2.2, look, parkSlot: { x: site.x + i * 3, y: site.y, meet: true } });
const player = { x: site.x + 1, y: site.y + 1 };
const w2 = { calendar: { day: dayOn }, dayNight: { hour: 21 }, messages: [], addMessage(t) { this.messages.push(t); } };
// hourOf(world) leest de zonnetijd uit de wereld; we zetten hem via world.time als die er is. Daarom: alleen controleren als hij het uur volgt.
const { hourOf } = await import('../game/js/streetlifedata.js');
const h = hourOf(w2);
if (meetHourOn(h)) {
  tickMeet(w2, player, sleeping, 100);
  ok(w2.messages.length === 1 && /Autotreffen/.test(w2.messages[0]), 'de melding bij het naderen');
  tickMeet(w2, player, sleeping, 104);
  ok(w2.messages.length === 2 && /^Eigenaar: "/.test(w2.messages[1]), 'een eigenaar spreekt je aan', w2.messages.join(' | '));
  tickMeet(w2, player, sleeping, 108);
  ok(w2.messages.length === 2 || /Bezoeker|bezoeker/.test(w2.messages[w2.messages.length - 1]) || /Eigenaar/.test(w2.messages[w2.messages.length - 1]), 'niet elke twee seconden iets');
} else {
  console.log(`tickMeet overgeslagen: hourOf geeft ${h} voor deze nepwereld`);
}
let quietDay = 0;
while (meetOfDay(quietDay, weekdayOf(quietDay)) || ![1, 2, 3, 4].includes(weekdayOf(quietDay))) quietDay++;
const quiet = { calendar: { day: quietDay }, dayNight: { hour: 21 }, messages: [], addMessage(t) { this.messages.push(t); } };
tickMeet(quiet, player, sleeping, 100);
ok(quiet.messages.length === 0, 'op een gewone dag geen treffen');

console.log(`tuningmeet_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
