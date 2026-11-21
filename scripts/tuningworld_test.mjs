// Gepimpte auto's in de wereld (game/js/tuningworld.js, epic Autotuning #1155): aandeel per wijk en uur, nooit meer dan 5%,
// geen in het platteland, deterministisch, budgetten, autotreffen en de underglow-begroting. Pure test.
import {
  MAX_SHARE, MAX_TUNED_TRAFFIC, MAX_GLOW_VISIBLE, MEET_SHARE, PROFILE_SHARE, STYLE_BY_PROFILE, KIND_WEIGHT, eligibleKind, tunedShare, unit, tunedLookFor,
  meetActive, isMeetLotId, MEET_LINES, meetNotice, glowBudget,
} from '../game/js/tuningworld.js';
import { sanitizeLook, isStock, lookCode } from '../game/js/vehiclelook.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name} ${info}`); } };

// aandeel
for (const p of Object.keys(PROFILE_SHARE)) {
  for (const hour of [3, 7, 12, 17, 21]) for (const weekday of [1, 5]) for (const kind of Object.keys(KIND_WEIGHT)) {
    const s = tunedShare(p, { hour, weekday, kind });
    ok(s >= 0 && s <= MAX_SHARE, 'aandeel in bereik', `${p} ${hour} ${weekday} ${kind} ${s}`);
  }
}
ok(tunedShare('centrum', { country: true }) === 0 && tunedShare('student', { country: true, hour: 22, weekday: 6 }) === 0, 'platteland heeft er geen');
ok(tunedShare('centrum', { kind: 'taxi' }) === 0 && tunedShare('centrum', { kind: 'ambulance' }) === 0 && tunedShare('centrum', { kind: 'truck' }) === 0 && !eligibleKind('cashvan') && !eligibleKind('delivery'), 'taxi, bestel en ambulance nooit');
ok(tunedShare('student', { hour: 22 }) > tunedShare('student', { hour: 7 }) && tunedShare('student', { hour: 22 }) > tunedShare('student', { hour: 13 }), 's avonds meer dan overdag en meer dan in de ochtend');
ok(tunedShare('centrum', { weekday: 6, hour: 12 }) > tunedShare('centrum', { weekday: 2, hour: 12 }), 'in het weekend meer');
ok(tunedShare('centrum', { parked: true }) < tunedShare('centrum', {}), 'geparkeerd iets minder');
ok(tunedShare('centrum', {}) > tunedShare('standaard', {}) && tunedShare('student', {}) > tunedShare('bakfiets', {}) && tunedShare('bakfiets', {}) < tunedShare('chic', {}), 'de stad meer dan de rand');
ok(tunedShare('onbekend', {}) === PROFILE_SHARE.standaard * KIND_WEIGHT.hatch, 'onbekend profiel is standaard');
ok(tunedShare('centrum', { meet: true }) === MEET_SHARE && tunedShare('centrum', { meet: true, country: true }) === MEET_SHARE, 'een treffen verhoogt het aandeel op zijn plek');
ok(tunedShare('centrum', { kind: 'taxi', meet: true }) === 0, 'ook op een treffen geen taxi');

// echte verdeling over veel id's (deterministisch): gemiddeld onder de 5% en in de buurt van de verwachting
for (const [profile, hours] of [['centrum', [8, 14, 20, 23]], ['student', [8, 14, 20, 23]], ['chic', [12]], ['industrie', [12]], ['bakfiets', [12]], ['standaard', [12, 21]]]) {
  for (const hour of hours) {
    let tuned = 0, N = 30000;
    for (let i = 0; i < N; i++) if (tunedLookFor(i, profile, { hour, weekday: 5, kind: 'hatch' })) tuned++;
    const share = tuned / N;
    ok(share <= MAX_SHARE + 0.004, 'verdeling blijft onder de 5%', `${profile} ${hour}: ${(share * 100).toFixed(2)}%`);
    ok(share > 0.002, 'er zijn er wel', `${profile} ${hour}`);
  }
}
let mixed = 0, M = 40000;
const kindsMix = ['hatch', 'hatch', 'hatch', 'sedan', 'sedan', 'wagon', 'suv', 'van', 'sport', 'tokkie', 'roestbak', 'elektrisch', 'taxi', 'delivery', 'truck'];
for (let i = 0; i < M; i++) if (tunedLookFor(i, ['centrum', 'student', 'standaard', 'standaard', 'bakfiets'][i % 5], { hour: 17, weekday: 3, kind: kindsMix[i % kindsMix.length] })) mixed++;
ok(mixed / M < 0.025 && mixed / M > 0.002, 'een gewone mix van verkeer: ruim onder de drie procent', `${(mixed / M * 100).toFixed(2)}%`);

// deterministisch
ok(JSON.stringify(tunedLookFor(4242, 'centrum', { hour: 22, kind: 'sport', weekday: 6 })) === JSON.stringify(tunedLookFor(4242, 'centrum', { hour: 22, kind: 'sport', weekday: 6 })), 'zelfde id, zelfde uitkomst');
ok(unit('a', 1) === unit('a', 1) && unit('a', 1) !== unit('a', 2) && unit('x', 5) >= 0 && unit('x', 5) < 1, 'unit is stabiel en in [0,1)');
let sample = null;
for (let i = 0; i < 5000 && !sample; i++) sample = tunedLookFor(i, 'student', { hour: 22, weekday: 6, kind: 'sport' });
ok(sample && !isStock(sample.look) && lookCode(sample.look) === lookCode(sanitizeLook(sample.look)) && /^#[0-9a-f]{6}$/.test(sample.bodyColor), 'resultaat is een geldige look met lak');
ok(STYLE_BY_PROFILE[sample.style] === undefined && ['race', 'show', 'rally', 'cruiser'].includes(sample.style), 'stijl uit de generator');
const styleSeen = new Set();
for (let i = 0; i < 20000; i++) { const t = tunedLookFor(i, 'industrie', { hour: 12, weekday: 2, kind: 'hatch' }); if (t) styleSeen.add(t.style); }
ok([...styleSeen].every((s) => STYLE_BY_PROFILE.industrie.includes(s)) && styleSeen.size >= 1, 'de industrie krijgt alleen zijn eigen stijlen', [...styleSeen].join());

// budget: genoeg gepimpte auto's in beeld, dan geen nieuwe rijdende meer (geparkeerd telt niet mee)
let blocked = 0, allowed = 0, parkedAllowed = 0;
for (let i = 0; i < 20000; i++) {
  if (tunedLookFor(i, 'student', { hour: 22, weekday: 6, kind: 'sport' }, { tuned: MAX_TUNED_TRAFFIC, glow: 0 })) allowed++; else blocked++;
  if (tunedLookFor(i, 'student', { hour: 22, weekday: 6, kind: 'sport', parked: true }, { tuned: MAX_TUNED_TRAFFIC, glow: 0 })) parkedAllowed++;
}
ok(allowed === 0 && blocked === 20000, 'rijdend verkeer houdt op bij het budget');
ok(parkedAllowed > 100, 'geparkeerde auto\'s vallen buiten het verkeersbudget', String(parkedAllowed));
let glowWhenFull = 0;
for (let i = 0; i < 20000; i++) { const t = tunedLookFor(i, 'centrum', { hour: 22, weekday: 6, kind: 'sport' }, { tuned: 0, glow: MAX_GLOW_VISIBLE }); if (t && t.look.glow) glowWhenFull++; }
ok(glowWhenFull === 0, 'bij een vol glow-budget krijgt een nieuwe auto geen underglow');
let glowOpen = 0;
for (let i = 0; i < 20000; i++) { const t = tunedLookFor(i, 'centrum', { hour: 22, weekday: 6, kind: 'sport' }, { tuned: 0, glow: 0 }); if (t && t.look.glow) glowOpen++; }
ok(glowOpen > 5, 'met ruimte komt underglow wel voor', String(glowOpen));

// autotreffen
ok(meetActive(5, 20) && meetActive(6, 23) && meetActive(6, 0.5) && meetActive(0, 0.5) && meetActive(0, 14), 'vrijdag, zaterdagavond en zondagmiddag');
ok(!meetActive(2, 20) && !meetActive(5, 12) && !meetActive(0, 20) && !meetActive(1, 14) && !meetActive(3, 0.5), 'doordeweeks en overdag niet');
let meetN = 0;
for (let i = 0; i < 12000; i++) if (isMeetLotId(1000 + i * 7)) meetN++;
ok(meetN > 120 && meetN < 300, 'ongeveer een op de zestig parkeerplaatsen is een treffenplek (zeldzaam)', String(meetN));
ok(isMeetLotId(777) === isMeetLotId(777), 'treffenplek is stabiel');
ok(meetNotice(true, 30) && meetNotice(true, 30).title === 'Autotreffen' && !meetNotice(true, 200) && !meetNotice(false, 10), 'melding alleen dichtbij en tijdens het treffen');
const BR = /\b(bmw|audi|ford|opel|volkswagen|mercedes|toyota|tesla|ferrari|porsche|shell|bp)\b/i;
ok(MEET_LINES.length >= 6 && MEET_LINES.every((l) => !BR.test(l) && !/sneeuw|winter|de Grunn/i.test(l)), 'treffenregels: geen merken');

// glow-budget
const entries = Array.from({ length: 30 }, (_, i) => ({ id: 'v' + i, dist: 100 - i * 3, glow: i % 2 === 0 }));
const shown = glowBudget(entries);
ok(shown.size === MAX_GLOW_VISIBLE, 'hoogstens het budget aan underglow in beeld', String(shown.size));
const nearest = entries.filter((e) => e.glow).sort((a, b) => a.dist - b.dist).slice(0, MAX_GLOW_VISIBLE).map((e) => e.id);
ok(nearest.every((id) => shown.has(id)), 'de dichtstbijzijnde krijgen het');
ok(glowBudget([{ id: 'a', dist: 5, glow: false }]).size === 0 && glowBudget([]).size === 0 && glowBudget(entries, 2).size === 2, 'zonder glow of met kleiner budget');

console.log(`tuningworld_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
