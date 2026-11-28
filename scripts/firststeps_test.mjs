// De eerste tien minuten (22-11): de bedieningsregel van het eerste doel wijkt zodra de speler laat zien dat hij kan
// lopen of rijden, en wie van het eerste doel afdwaalt of lang niet opschiet krijgt hooguit twee keer een korte
// herinnering. De regels zijn puur (game/js/firststeps.js); de bedrading in de HUD en de uitleg toetsen we in de bron.
// De regel en de kaart in beeld zijn niet getest.
//   node scripts/firststeps_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  PRACTICE_METRES, PRACTICE_MAX_STEP, createPractice, trackPractice, practiced,
  NUDGE, NUDGE_CARD, createCourse, trackCourse, courseNudged, pauseCourse, punchPromptAllowed,
} from '../game/js/firststeps.js';
import { controlHint, hintText } from '../game/js/controlhint.js';
import { LESSON_MAX_WORDS } from '../game/js/onboardinglogic.js';

const ROOT = new URL('../', import.meta.url);
const lees = (p) => fs.readFileSync(new URL(p, ROOT), 'utf8');
let n = 0, bad = 0;
const t = (naam, fn) => { n++; try { fn(); } catch (e) { bad++; console.log('FAIL', naam, '\n  ', String(e.message || e).split('\n').slice(0, 4).join('\n   ')); } };

// Loop of rij `meters` in stappen van `stap` meter langs de x-as.
const beweeg = (st, context, meters, stap = 1, x0 = 0) => {
  let x = x0;
  trackPractice(st, context, x, 0);
  for (let m = 0; m < meters; m += stap) { x += stap; trackPractice(st, context, x, 0); }
  return x;
};

t('oefenen: de meters tellen per context, een sprong telt niet', () => {
  const st = createPractice();
  assert.equal(practiced(st, 'foot'), false);
  beweeg(st, 'foot', PRACTICE_METRES.foot - 5);
  assert.equal(practiced(st, 'foot'), false, 'net te weinig gelopen');
  // een teleport, respawn of scènewissel: geen oefening
  trackPractice(st, 'foot', 5000, 5000);
  assert.equal(practiced(st, 'foot'), false, 'een sprong van kilometers telt niet');
  beweeg(st, 'foot', 6, 1, 5000);
  assert.equal(practiced(st, 'foot'), true, 'na de drempel is lopen geoefend');
  assert.equal(practiced(st, 'vehicle'), false, 'rijden is een eigen context');
  assert.ok(PRACTICE_MAX_STEP < PRACTICE_METRES.foot, 'één sprong kan de drempel nooit halen');
});

t('oefenen: instappen begint een nieuwe meting, de overstap zelf telt niet', () => {
  const st = createPractice();
  trackPractice(st, 'foot', 0, 0);
  assert.equal(trackPractice(st, 'vehicle', 10, 0), 0, 'de eerste meting in een nieuwe context telt niets');
  assert.equal(trackPractice(st, 'vehicle', 14, 3), 5);
  assert.equal(st.vehicle, 5);
  assert.equal(st.foot, 0);
});

t('oefenen: rommel breekt niets', () => {
  const st = createPractice();
  assert.equal(trackPractice(null, 'foot', 0, 0), 0);
  assert.equal(trackPractice(st, 'raket', 0, 0), 0);
  assert.equal(trackPractice(st, 'toString', 0, 0), 0, 'geen eigenschap van Object als context');
  assert.equal(trackPractice(st, 'foot', NaN, 0), 0);
  assert.equal(trackPractice(st, 'foot', 0, Infinity), 0);
  assert.equal(practiced(null, 'foot'), false);
  assert.equal(practiced(st, 'raket'), false);
  for (const k of Object.keys(PRACTICE_METRES)) assert.ok(Number.isFinite(st[k]) && st[k] === 0, k);
});

t('de regel van het eerste doel wijkt na het oefenen, per context', () => {
  const eerste = { storyGuide: { name: 'Naar Berend' }, stats: { missionsDone: 0 } };
  const voet = { inVehicle: null }, auto = { inVehicle: {} };
  const st = createPractice();
  assert.match(hintText(controlHint(eerste, voet, { eerstedoel: true, practice: st })), /lopen/, 'eerst staat de lopen-regel er');
  beweeg(st, 'foot', PRACTICE_METRES.foot);
  assert.equal(controlHint(eerste, voet, { eerstedoel: true, practice: st }), null, 'na het lopen wijkt hij');
  assert.match(hintText(controlHint(eerste, auto, { eerstedoel: true, practice: st })), /sturen/, 'de eerste keer in de auto komt de rijregel');
  beweeg(st, 'vehicle', PRACTICE_METRES.vehicle, 5);
  assert.equal(controlHint(eerste, auto, { eerstedoel: true, practice: st }), null, 'na het rijden wijkt die ook');
  assert.equal(controlHint(eerste, voet, { eerstedoel: true, practice: st }), null, 'en uitstappen brengt de lopen-regel niet terug');
  assert.ok(controlHint(eerste, voet, { eerstedoel: true }), 'zonder meting blijft het oude gedrag');
});

t('een missie, bijbaan of achtervolging houdt zijn regel, ook na het oefenen (#824)', () => {
  const st = createPractice();
  beweeg(st, 'foot', PRACTICE_METRES.foot * 2);
  const voet = { inVehicle: null };
  for (const w of [{ mission: { phase: 'active' } }, { sideJob: { active: true } }, { wanted: 1 }]) {
    assert.ok(controlHint(w, voet, { eerstedoel: true, practice: st }), JSON.stringify(w));
  }
});

// Speel `sec` seconden met een vaste afstand (of een functie van de tijd) en geef de eerste reden terug.
const speel = (st, stap, afstand, sec, dt = 0.5) => {
  for (let s = 0; s < sec; s += dt) {
    const r = trackCourse(st, stap, typeof afstand === 'function' ? afstand(s) : afstand, dt);
    if (r) return { reden: r, na: s + dt };
  }
  return null;
};

t('koers: wie gewoon naar het doel gaat hoort niets', () => {
  const st = createCourse();
  // 2300 m naar Berend met 8 m/s, tien minuten lang
  assert.equal(speel(st, 'a', (s) => Math.max(0, 2300 - 8 * s), 600), null);
  // wandelen met 1,5 m/s: ook dat is opschieten
  const st2 = createCourse();
  assert.equal(speel(st2, 'a', (s) => Math.max(NUDGE.near + 1, 600 - 1.5 * s), 360), null);
});

t('koers: stilstaan geeft na de wachttijd een herinnering, niet eerder', () => {
  const st = createCourse();
  const r = speel(st, 'a', 800, 600);
  assert.ok(r && r.reden === 'stall', 'stilstaan valt op');
  assert.ok(r.na >= NUDGE.stall && r.na <= NUDGE.stall + 1, 'pas na de wachttijd: ' + r.na);
});

t('koers: de andere kant op rijden geeft een herinnering zodra het verschil groot is', () => {
  const st = createCourse();
  const r = speel(st, 'a', (s) => 500 + 10 * s, 600);
  assert.ok(r && r.reden === 'away');
  assert.ok(Math.abs(r.na * 10 - NUDGE.away) <= 10, 'bij ' + NUDGE.away + ' m verder weg: ' + r.na * 10);
  // een omweg van minder dan de drempel (een brug, een gracht) is geen dwalen
  const st2 = createCourse();
  assert.equal(speel(st2, 'a', (s) => (s < 15 ? 500 + 10 * s : 650 - 10 * (s - 15)), 60), null);
});

t('koers: hooguit twee keer per sessie, met tussenruimte, en na een herinnering opnieuw meten', () => {
  const st = createCourse();
  let keren = 0, laatst = -Infinity;
  for (let s = 0; s < 3600; s += 0.5) {
    if (trackCourse(st, 'a', 800, 0.5)) {
      assert.ok(s - laatst >= NUDGE.gap, 'tussenruimte: ' + (s - laatst));
      courseNudged(st, 800);
      keren++; laatst = s;
    }
  }
  assert.equal(keren, NUDGE.max, 'een uur stilstaan geeft precies ' + NUDGE.max + ' herinneringen');
});

t('koers: vlak bij het doel, zonder doel of bij een nieuw doel hoor je niets', () => {
  const st = createCourse();
  assert.equal(speel(st, 'a', NUDGE.near - 1, 600), null, 'vlak bij het doel zegt de doelregel al "Je bent er"');
  const st2 = createCourse();
  speel(st2, 'a', 800, NUDGE.stall - 5);
  // het doel verspringt naar een nieuwe stap: de meting begint opnieuw, ook al is het nieuwe doel ver weg
  assert.equal(trackCourse(st2, 'b', 3000, 0.5), '');
  assert.equal(speel(st2, 'b', 3000, NUDGE.stall - 5), null, 'de wachttijd telt vanaf het nieuwe doel');
  // een eigen doel, een missie of een scène: de tijd telt niet door
  const st3 = createCourse();
  speel(st3, 'a', 800, NUDGE.stall - 5);
  pauseCourse(st3);
  assert.equal(trackCourse(st3, '', NaN, 60), '');
  assert.equal(speel(st3, 'a', 800, NUDGE.stall - 5), null, 'na de onderbreking begint de meting opnieuw');
  assert.equal(trackCourse(null, 'a', 1, 1), '');
  assert.equal(trackCourse(createCourse(), 'a', 800, NaN), '');
});

t('koers: fuzz van 2000 willekeurige wandelingen: nooit meer dan het maximum, nooit binnen de tussenruimte', () => {
  let seed = 22112026;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 2000; i++) {
    const st = createCourse();
    let d = 100 + rnd() * 3000, keren = 0, sinds = Infinity;
    for (let s = 0; s < 900; s += 1) {
      d = Math.max(0, d + (rnd() - 0.5) * 40);
      sinds += 1;
      const r = trackCourse(st, rnd() < 0.002 ? 'b' : 'a', d, 1);
      if (r) {
        assert.ok(r === 'away' || r === 'stall');
        assert.ok(d >= NUDGE.near, 'niet vlak bij het doel');
        assert.ok(sinds >= NUDGE.gap, 'tussenruimte');
        courseNudged(st, d); keren++; sinds = 0;
      }
    }
    assert.ok(keren <= NUDGE.max, 'hooguit ' + NUDGE.max + ': ' + keren);
  }
});

t('de herinnering is kort, Nederlands en zonder kale toets', () => {
  const woorden = (NUDGE_CARD.title + ' ' + NUDGE_CARD.body).split(/\s+/).length;
  assert.ok(woorden <= LESSON_MAX_WORDS, woorden + ' woorden');
  assert.ok(NUDGE_CARD.body.length <= 60, 'past in een kaart van één blik: ' + NUDGE_CARD.body.length);
  assert.doesNotMatch(NUDGE_CARD.body, /\b(press|follow|route to|the|your)\b/i, 'geen Engels');
  assert.doesNotMatch(NUDGE_CARD.title + NUDGE_CARD.body, /\((?:[A-Z]|Esc|Tab)\)|druk op [A-Z]\b/, 'geen kale toets');
  assert.match(lees('game/js/helpoverview.js'), /Volg de gele route op de minimap/, 'dezelfde woorden als de hulp');
});

t('bedrading: de HUD meet alleen bij het verhaaldoel en geeft de meting mee', () => {
  const hud = lees('game/js/hud_panel.js');
  assert.match(hud, /import \{ createPractice, trackPractice \} from '\.\/firststeps\.js'/);
  assert.match(hud, /if \(kind === 'story' && speler\) trackPractice\(practice, hintContext\(speler\), speler\.x, speler\.y\)/);
  assert.match(hud, /controlHint\(world, speler, \{ eerstedoel: kind === 'story', practice \}\)/);
});

t('bedrading: de herinnering komt na de doelkaart, één tegelijk, ook bij latere stappen, met een eigen budget per stap', () => {
  const ob = lees('game/js/onboarding.js');
  assert.match(ob, /if \(lost && \(seen\.has\('doel'\) \|\| allSeen\)\) \{\s*if \(!quiet\(\) \|\| cardsBusy\(\) \|\| !mayStart\('card'\)\) return;/, 'dezelfde stilte-regel als de kaarten');
  assert.match(ob, /courseNudged\(course, courseDist\);\s*lastAt = playT;/, 'telt mee voor de tussenruimte van de kaarten');
  assert.match(ob, /w\.storyFreePlay \|\| busy\(w\) \|\| w\.goal\) return NaN/, 'niet tijdens een missie of spel, niet met een eigen doel');
  assert.match(ob, /course\.count = Math\.min\(course\.count, NUDGE\.max - 1\)/, 'een latere stap krijgt één herinnering van zichzelf (audit speelbaarheid 23-11)');
  assert.doesNotMatch(ob, /lessonsAllSeen\(seen\)\) return;/, 'de herinnering werkt ook als alle kaarten gezien zijn');
  assert.match(ob, /hoofdspeler\(w\)/, 'de speler van dit apparaat, niet world.player');
  assert.doesNotMatch(ob, /world\.player|w\.player\b/, 'geen nieuwe enkelspeler-aanname');
  // geen opslag: de herinnering hoort bij de sessie
  assert.doesNotMatch(lees('game/js/firststeps.js'), /localStorage|document\.|window\./, 'firststeps.js is puur');
});

t('UX 28-11: de Slaan-kaart van een voorbijganger komt pas na de eerste missie, niet als eerste kaart van een nieuw spel', () => {
  assert.equal(punchPromptAllowed(0), false);
  assert.equal(punchPromptAllowed(undefined), false);
  assert.equal(punchPromptAllowed(1), true);
  assert.match(lees('game/js/prompts.js'), /isMeleeWeapon\(weapon\) && punchPromptAllowed\(world\.stats && world\.stats\.missionsDone\)/);
});

console.log(`firststeps_test: ${n - bad}/${n} geslaagd`);
if (bad) process.exit(1);
