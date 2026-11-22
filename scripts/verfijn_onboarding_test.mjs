// Verfijnronde 22-11, epic Onboarding, moeilijkheid en progressie: regressietests, randgevallen en een lange speelsimulatie
// voor wat die ronde heeft rechtgezet. Puur en zonder DOM: de bedrading die three of een DOM nodig heeft wordt in de bron
// getoetst. Het scherm zelf is niet bekeken (zie docs/VERFIJNING-22-11-ONBOARDING.md, "Alleen in beeld").
//   node scripts/verfijn_onboarding_test.mjs
import fs from 'node:fs';
import { combineProgress, honestPercentage, saveProgress, storyCounts } from '../game/js/progress.js';
import { HINTS, pickHint, parseSeen, serializeSeen, CALM_UNTIL, GAP, GAP_CALM, SETTLE } from '../game/js/hintkit.js';
import { HELP_TOPICS } from '../game/js/helpoverview.js';
import { HINT_UITLEG, UITLEG_DATA } from '../game/js/uitlegdata.js';
import { LESSON_IDS, lessonsAllSeen, goalHandled, explanationResetMessage, LESSON_MAX_WORDS } from '../game/js/onboardinglogic.js';
import { travelOptions, selfReward, arrival } from '../game/js/reiskeuze.js';
import { pickDirFromKey, cyclePick } from '../game/js/reisview.js';
import { recapContent, RECAP_MAX_WORDS } from '../game/js/recapcard.js';
import { CARD_TEXT, levelKeyAction } from '../game/js/difficultycard.js';

const lees = (f) => fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');
let n = 0, bad = 0;
const ok = (c, naam, extra = '') => { n++; if (!c) { bad++; console.log('FAIL', naam, extra); } };
const woorden = (t) => String(t).replace(/\{\w+\}/g, 'X').trim().split(/\s+/).filter(Boolean).length;

// ---- 1-3: voortgang liegt niet -------------------------------------------------------------------------------------------
ok(honestPercentage(399, 400) === 99, '399 van 400 is 99%, niet "100% klaar"', honestPercentage(399, 400));
ok(honestPercentage(400, 400) === 100, 'alles klaar is 100%');
ok(honestPercentage(1, 400) === 1, 'net begonnen is minstens 1%, niet "0% klaar"');
ok(honestPercentage(0, 400) === 0, 'niets gedaan blijft 0%');
ok(honestPercentage(5, 0) === 0 && honestPercentage(NaN, NaN) === 0 && honestPercentage(-3, 10) === 0 && honestPercentage(99, 10) === 100, 'kapotte tellingen blijven binnen 0 en 100');
{
  const bijna = combineProgress({ verhaal: { done: 399, total: 400 }, prestaties: { done: 80, total: 80 }, kaart: { done: 1000, total: 1000 }, gebieden: { done: 40, total: 40 } });
  ok(bijna.pct === 99, 'bijna alles klaar toont niet 100%', bijna.pct);
  const alles = combineProgress({ verhaal: { done: 4, total: 4 }, prestaties: { done: 80, total: 80 } });
  ok(alles.pct === 100, 'alles klaar is 100%');
  const begin = combineProgress({ verhaal: { done: 1, total: 400 }, prestaties: { done: 0, total: 150 }, kaart: { done: 0, total: 9000 }, gebieden: { done: 0, total: 80 } });
  ok(begin.pct === 1, 'de eerste stap geeft meteen 1%', begin.pct);
  ok(combineProgress({ verhaal: { done: 0, total: 400 } }).pct === 0, 'zonder een enkele stap blijft het 0%');
  ok(saveProgress({ story: { done: [] }, missions: { completed: [] } }) === 0, 'een lege save is 0%');
}
// Fuzz: voor willekeurige tellingen blijft elk percentage tussen 0 en 100, en 100 alleen als alles klaar is.
{
  let s = 12345;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  let goed = true;
  for (let i = 0; i < 4000 && goed; i++) {
    const c = {};
    let alleKlaar = true, iets = false;
    for (const id of ['verhaal', 'prestaties', 'kaart', 'gebieden']) {
      if (rnd() < 0.2) continue;
      const total = Math.floor(rnd() * 500);
      const done = rnd() < 0.15 ? total : Math.floor(rnd() * (total + 5));
      c[id] = { done, total };
      if (total > 0) { if (done < total) alleKlaar = false; if (done > 0) iets = true; }
    }
    const r = combineProgress(c);
    const aantal = r.parts.length;
    if (!(r.pct >= 0 && r.pct <= 100)) goed = false;
    if (r.pct === 100 && !(alleKlaar && aantal > 0)) goed = false;
    if (aantal > 0 && alleKlaar && r.pct !== 100) goed = false;
    if (iets && r.pct < 1) goed = false;
  }
  ok(goed, 'fuzz: 4000 willekeurige tellingen houden de voortgang eerlijk');
}
ok(/honestPercentage\(c\.done, c\.total\)/.test(lees('progress.js')), 'het savegame-overzicht gebruikt dezelfde eerlijke regel');
ok(typeof storyCounts === 'function', 'storyCounts bestaat nog');

// ---- 4: de hulptekst zegt waar het doel echt staat ------------------------------------------------------------------------
{
  const alles = HELP_TOPICS.flatMap((t) => t.lines).join('\n');
  ok(!/Onderin staat je (doel|eerste klus)/.test(alles), 'de hulp zegt niet meer dat het doel onderin staat');
  ok(/Bovenin[^.]*staat je doel/.test(alles) && /Bovenin staat je eerste klus/.test(alles), 'de hulp zegt dat het doel bovenin staat, zoals de uitlegkaart');
  ok(/Je doel staat bovenin/.test(lees('onboarding.js')), 'de uitlegkaart en de hulp zeggen hetzelfde');
}

// ---- 5-6: hinttekst: geen kale toetsen, kort genoeg --------------------------------------------------------------------------
for (const h of HINTS) {
  const kaal = h.body.replace(/\{\w+\}/g, '').match(/\([A-Z0-9]\)|\bdruk [A-Z]\b/g);
  ok(!kaal, h.id + ' noemt geen kale toets (die volgt de herbinding niet)', String(kaal));
  ok(h.body.length < 200, h.id + ' is korter dan 200 tekens', String(h.body.length));
}

// ---- 7-10: elk voertuig heeft de uitleg met iconen; eerst het plaatje --------------------------------------------------------------
{
  const voertuigen = HINTS.filter((h) => h.kind === 'vehicle');
  ok(voertuigen.every((h) => HINT_UITLEG[h.id]), 'elk voertuig heeft uitleg met iconen', voertuigen.filter((h) => !HINT_UITLEG[h.id]).map((h) => h.id).join());
  for (const id of ['m-discgolf', 'm-pitchputt', 'm-kartbaan']) ok(HINT_UITLEG[id], id + ' heeft uitleg met iconen');
  for (const id of ['v-fatbike', 'v-vracht', 'm-discgolf', 'm-pitchputt', 'm-kartbaan']) {
    const d = HINT_UITLEG[id];
    ok(d && d.stappen.length >= 2 && d.stappen.length <= 4, id + ': twee tot vier stappen');
    ok(d && d.stappen.every((s) => woorden(s.tekst) <= 8), id + ': hooguit acht woorden per stap');
  }
  ok(typeof UITLEG_DATA === 'object', 'de uitlegdata laden');
}

// ---- 11-13: de uitlegkaarten ----------------------------------------------------------------------------------------------------
{
  const bron = lees('onboarding.js');
  const ids = [...bron.matchAll(/^    id: '([a-z]+)',$/gm)].map((m) => m[1]);
  ok(JSON.stringify(ids) === JSON.stringify([...LESSON_IDS]), 'de ids in onboardinglogic.js zijn de kaarten in onboarding.js, in dezelfde volgorde');
  ok(lessonsAllSeen(new Set(LESSON_IDS)), 'alles gezien als elke echte kaart gezien is');
  ok(!lessonsAllSeen(new Set(['doel', 'geld', 'kaart', 'tedoen', 'eerstedag', 'oud1'])), 'een vreemd id telt niet mee: de laatste kaart komt nog');
  ok(!lessonsAllSeen(new Set()) && !lessonsAllSeen(null), 'niets gezien en geen opslag is niet af');
  ok(/lessonsAllSeen\(seen\)/.test(bron) && !/seen\.size >= LESSONS\.length/.test(bron), 'onboarding.js gebruikt de echte controle');
  ok(goalHandled(new Set(['doel']), 0), 'de eerste klus gezien: de volgende kaart mag');
  ok(goalHandled(new Set(), 3), 'een bestaand spel (missies gehaald) wacht niet op een kaart die nooit komt');
  ok(!goalHandled(new Set(), 0) && !goalHandled(new Set(), NaN) && !goalHandled(null, 5), 'een nieuw spel wacht wel op de eerste klus');
  ok(/goalHandled\(s, w\.stats\.missionsDone\)/.test(bron), 'Zelf kiezen hangt aan goalHandled');
  // elke kaart: kort, Nederlands, alleen bestaande toetsen
  const kaarten = [...bron.matchAll(/card: \(\) => \(\{ title: '([^']+)', body: [`']([^`']+)[`'] \}\)/g)];
  ok(kaarten.length === LESSON_IDS.length, 'zes kaarten gevonden in de bron', String(kaarten.length));
  const skip = (bron.match(/const SKIP_NOTE = '([^']+)'/) || [])[1] || '';
  for (const [, titel, body] of kaarten) {
    const tekst = body.replace('${SKIP_NOTE}', skip);
    ok(woorden(tekst) <= LESSON_MAX_WORDS, `kaart "${titel}" is hooguit ${LESSON_MAX_WORDS} woorden`, String(woorden(tekst)));
    ok([...tekst.matchAll(/\{(\w+)\}/g)].every((m) => /^([A-Z]+|\d)$/.test(m[1])), `kaart "${titel}" gebruikt alleen toetsfiches`);
    ok(!/\b(the|and|press)\b/i.test(tekst), `kaart "${titel}" is Nederlands`);
  }
  ok(/Instellingen/.test(skip) && /\{ESC\}/.test(skip), 'de uit-regel noemt de toets en het menu');
}
ok(/Zet "Uitleg voor nieuwe spelers" aan/.test(explanationResetMessage(false)) && !/vanzelf/.test(explanationResetMessage(false)), 'zonder uitleg-schakelaar belooft de reset niets');
ok(/vanzelf/.test(explanationResetMessage(true)) && /vanzelf/.test(explanationResetMessage(undefined)), 'met de schakelaar aan beloven we de kaarten');
ok(/explanationResetMessage\(getSettings\(\)\.onboardingTips\)/.test(lees('pausemenu.js')), 'het pauzemenu gebruikt de eerlijke melding');

// ---- Lange speelsimulatie: drie uur spelen met wisselende voertuigen en minigames -------------------------------------------------
{
  let s = 987654;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const seen = new Set();
  const voertuigen = [null, null, 'auto', 'fiets', 'scooter', 'boot', 'bus', 'trekker', 'heli', 'vliegtuig', 'fatbike', 'vracht', 'quad', 'motor', 'foodtruck'];
  const spellen = [null, null, null, 'discgolf', 'penalty', 'kartbaan', 'hengelen', 'klimtoren', 'skatepark'];
  let lastAt = -Infinity, inT = 0, was = '', vorige = null;
  let veld = { vehicle: null, minigame: null };
  let fout = '';
  let totaal = 0;
  const dt = 0.5;
  for (let t = 0; t < 3 * 3600 && !fout; t += dt) {
    if (rnd() < 0.004) veld = { vehicle: voertuigen[Math.floor(rnd() * voertuigen.length)], minigame: rnd() < 0.3 ? spellen[Math.floor(rnd() * spellen.length)] : null };
    const wanted = rnd() < 0.002 ? 2 : 0;
    const st = { ...veld, wanted: t % 600 < 20 ? 2 : wanted, dead: rnd() < 0.0005, paused: false };
    const nu = st.minigame ? 'm:' + st.minigame : st.vehicle ? 'v:' + st.vehicle : '';
    inT = nu && nu === was ? inT + dt : 0;
    was = nu;
    const h = pickHint(st, seen, { playT: t, lastAt, inT }, { enabled: true, busy: false });
    if (!h) continue;
    totaal++;
    if (seen.has(h.id)) fout = 'dubbel: ' + h.id;
    if (st.wanted > 0 || st.dead) fout = 'tijdens politie of dood: ' + h.id;
    if (t < 120) fout = 'in de eerste twee minuten: ' + h.id;
    if (vorige !== null && t - vorige < (t < CALM_UNTIL ? GAP_CALM : GAP) - 1e-9) fout = 'te snel na de vorige: ' + h.id;
    if (inT < SETTLE) fout = 'zonder SETTLE: ' + h.id;
    seen.add(h.id);
    lastAt = t;
    vorige = t;
  }
  ok(!fout, 'drie uur spelen: nooit dubbel, nooit tijdens politie of dood, altijd met tussenruimte', fout);
  ok(totaal > 3 && totaal <= HINTS.length, 'er komen kaarten, maar nooit meer dan er bestaan', String(totaal));
  // opslaan en terugladen houdt de gezien-lijst; rommel in de opslag geeft een lege lijst
  ok(parseSeen(serializeSeen(seen)).size === seen.size, 'de gezien-lijst overleeft opslaan en laden');
  ok(parseSeen('{kapot').size === 0 && parseSeen('{"a":1}').size === 0 && parseSeen('[1,2,null,"v-auto","nep"]').size === 1, 'rommel in de opslag geeft een lege of gefilterde lijst');
}

// ---- 11-19: toetsen in meldingen en de reiskeuze ---------------------------------------------------------------------------------
for (const [f, rx] of [
  ['snelwaypoint.js', /kaart \(\{M\}\)/],
  ['furniture.js', /Zitmoi \(\{E\}\)/],
  ['multiplayerphrasesradial.js', /kaart \(\{M\}\)/],
  ['traindrive.js', /Druk \{G\}: dan rijd je de dienst/],
  ['traindrive.js', /Waakzaamheid: druk \{K\}/],
  ['vehicle.js', /Stap uit \(\{E\}\) voor hij ontploft/],
]) ok(rx.test(lees(f)), `${f}: de toets in de melding is een toetsfiche (volgt herbinden en controller)`, String(rx));
{
  ok(selfReward(NaN) === 0 && selfReward(-9000) === 0 && selfReward(undefined) === 0, 'een kapotte lengte geeft geen negatieve beloning');
  ok(selfReward(10000) === 40 && selfReward(1e9) === 120, 'de beloning blijft zoals hij was en heeft een plafond');
  for (const len of [NaN, -5, 0, undefined, 50, 5000, 40000, 1e9]) {
    const o = travelOptions({ length: len, lines: ['a', 'b'] });
    ok(o.options.every((x) => !/NaN/.test(x.eta)), 'geen "NaN" in de tijdtekst bij lengte ' + len, o.options.map((x) => x.eta).join());
    const a = arrival({ length: len, lines: ['a'] }, 'zelf');
    ok(a && a.money >= 0, 'de aankomstbeloning is nooit negatief bij lengte ' + len);
  }
  ok(pickDirFromKey('ArrowUp') === -1 && pickDirFromKey('w') === -1 && pickDirFromKey('ArrowDown') === 1 && pickDirFromKey('S') === 1, 'pijlen en W/S verplaatsen de reiskeuze');
  ok(pickDirFromKey('Enter') === null && pickDirFromKey('1') === null && pickDirFromKey(undefined) === null && pickDirFromKey('') === null, 'andere toetsen laten de keuze met rust');
  const beat = { length: 8000, lines: ['x'] };
  let p = travelOptions(beat).def;
  const gezien = new Set();
  for (let i = 0; i < 6; i++) { p = cyclePick(beat, p, pickDirFromKey('ArrowDown')); gezien.add(p); }
  ok(gezien.size === travelOptions(beat).options.length, 'met pijl omlaag kom je langs elke keuze en weer terug');
  const bron = lees('reispanel.js');
  // sprint ux-flow (22-11) liet het paneel Tab, cijfers, Enter en Escape (keyAction) volgen: pijlen en W/S blijven van het spel (te voet en in een voertuig sturen ze); pickDirFromKey blijft voor een controller en tests
  ok(/keyAction\(beat, pick, e\.key, e\.shiftKey\)/.test(bron), 'het reispaneel luistert naar de toetsen van keyAction');
}

// ---- 20: de terugblikkaart knipt niet midden in een afkorting -------------------------------------------------------------------
{
  const lang = 'Dr. de Vries wacht bij het St. Jansplein op je. Ga er naartoe en praat met haar, zodat zij je alles kan vertellen over de pakketjes die vorige week zijn verdwenen uit de kluis van het bureau in de stad.';
  const kaart = recapContent({ step: { id: 's1', lead: lang }, ended: false, last: 'Een klus gedaan', partTitle: 'Akte 2', why: 'Een lange regel over waar het om draait in dit deel van het verhaal en waarom het ertoe doet voor iedereen' });
  ok(kaart && /^Dr\. de Vries wacht bij het St\. Jansplein op je\.( |$)/.test(kaart.now), 'de eerste zin eindigt na "op je.", niet na "Dr." (volgende zinnen mogen volgen zolang ze in het budget passen)', kaart && kaart.now);
  const initiaal = recapContent({ step: { id: 's2', lead: 'J. de Boer belt je vanuit Winsum, en hij heeft een dringende vraag over de verdwenen pakketjes uit de kluis. Ga erheen.' }, ended: false, last: 'Een klus die al lang geleden gedaan is door jou en je maat', partTitle: '', why: 'Een lange regel over waar het om draait in dit deel van het verhaal en waarom het ertoe doet voor iedereen hier' });
  ok(initiaal && !/^J\.$/.test(initiaal.now), 'een voorletter is geen zinseinde', initiaal && initiaal.now);
  ok(recapContent({ step: { id: 's3', lead: 'Kort doel.' }, ended: false, last: '', partTitle: '', why: '' }).now === 'Kort doel.', 'een korte tekst blijft heel');
  ok(recapContent({ step: { id: 's4', lead: '' }, ended: false }) === null && recapContent(null) === null, 'zonder tekst geen kaart');
  ok(RECAP_MAX_WORDS === 48, 'de woordgrens van de kaart is niet verschoven');
}

// ---- 21: de moeilijkheidskaart wijst naar toegankelijkheid -----------------------------------------------------------------------
ok(/Moeilijkheid/.test(CARD_TEXT.uitleg) && /Toegankelijkheid/.test(CARD_TEXT.uitleg), 'de kaart zegt waar je later de moeilijkheid en de toegankelijkheid vindt');
ok(CARD_TEXT.uitleg.length <= 60 && woorden(CARD_TEXT.uitleg) <= 16, 'de uitleg op de kaart blijft kort', String(woorden(CARD_TEXT.uitleg)));
ok(levelKeyAction('Tab') === null && levelKeyAction(undefined) === null && levelKeyAction('') === null, 'vreemde toetsen op de moeilijkheidskaart doen niets');
ok(levelKeyAction('2').kies === 'standaard' && levelKeyAction('Escape').kies === 'standaard', 'de keuze en de terugweg zijn Standaard');

if (bad) { console.log(`${bad} van ${n} mislukt`); process.exit(1); }
console.log(`verfijn_onboarding_test: ${n} checks ok`);
