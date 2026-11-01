// Samen spelen (#525): een gast drukt mee op de keuze of de timing van de gastheer. Het scènebericht zegt welke
// stap op het paneel staat en welke toetsen die aanneemt; de gast stuurt zijn toets, de gastheer leest hem als
// zijn eigen antwoord en de stap gaat verder. Puur: geen netwerk, geen DOM.
import assert from 'node:assert/strict';
import { schoonScene, sceneBericht, sceneLeeg, leesSceneBericht, paneelTekst } from '../game/js/coopworld.js';
import { paneelEvent, paneelToets, paneelIndrukken, neemPaneelDruk, PANEEL_WACHT_S } from '../game/js/coopgast.js';
import { enterChoice, stepChoice } from '../game/js/stagechoice.js';
import { enterTiming, stepTiming } from '../game/js/stagetiming.js';

let n = 0, fails = 0;
const t = (name, f) => {
  n++;
  try { f(); } catch (e) { fails++; console.log('FAIL', name, e && e.message ? e.message : e); }
};

// een wereld van de gastheer met een invoer die tikt zoals input.js
const hostWorld = (scene = null) => ({
  time: 100,
  input: { _justPressed: new Set(), wasPressed(k) { return this._justPressed.has(k); }, consume(k) { this._justPressed.delete(k); } },
  coopNet: { role: 'host', sceneNu: scene },
});
const guestInput = (...keys) => { const s = new Set(keys); return { wasPressed: (k) => s.has(k), consume() {} }; };

t('het scènebericht draagt het paneel en de toetsen die het aanneemt', () => {
  const sc = schoonScene({ keuze: { tekst: 'Wat doe je?', opties: ['Weglopen', 'Blijven'] }, paneel: { stap: 'choice', toetsen: ['1', '2'] } });
  assert.deepEqual(sc.paneel, { stap: 'choice', toetsen: ['1', '2'] });
  assert.equal(sceneLeeg(sc), false);
  assert.equal(sceneLeeg(schoonScene({})), true);
});

t('een paneel zonder bruikbare toetsen is geen paneel, en alleen 1-9 en Spatie komen door', () => {
  assert.equal(schoonScene({ paneel: { stap: 'choice', toetsen: [] } }).paneel, null);
  assert.equal(schoonScene({ paneel: { stap: 'choice', toetsen: ['x', 'enter'] } }).paneel, null);
  assert.deepEqual(schoonScene({ paneel: { stap: 'timing', toetsen: [' ', 'e', 'f', ' ', 'q'] } }).paneel.toetsen, [' ', 'e', 'f']);
});

t('de balk van een timing gaat mee, want zonder balk drukt een gast blind', () => {
  const sc = schoonScene({ paneel: { stap: 'timing', toetsen: [' '], meter: { v: 0.42, from: 0.36, to: 0.64 } } });
  assert.deepEqual(sc.paneel.meter, { v: 0.42, from: 0.36, to: 0.64 });
  const scheef = schoonScene({ paneel: { stap: 'timing', toetsen: [' '], meter: { v: 1.9, from: 0.2, to: 0.4 } } });
  assert.equal(scheef.paneel.meter.v, 1, 'de naald blijft tussen 0 en 1');
  assert.equal(schoonScene({ paneel: { stap: 'timing', toetsen: [' '], meter: { v: 'x' } } }).paneel.meter, undefined, 'een onleesbare balk gaat niet mee');
  assert.equal(schoonScene({ paneel: { stap: 'choice', toetsen: ['1'], meter: { v: 0.5, from: 0, to: 1 } } }).paneel.meter, undefined, 'alleen een timing heeft een balk');
});

t('de balk verandert mee met de naald: de gast ziet hem dus bewegen', () => {
  const a = sceneBericht(null, { paneel: { stap: 'timing', toetsen: [' '], meter: { v: 0.1, from: 0.4, to: 0.6 } } });
  assert.ok(a.event, 'de eerste stand gaat uit');
  assert.equal(sceneBericht(a.huidig, { paneel: { stap: 'timing', toetsen: [' '], meter: { v: 0.1, from: 0.4, to: 0.6 } } }).event, null, 'stil als de naald stilstaat');
  assert.ok(sceneBericht(a.huidig, { paneel: { stap: 'timing', toetsen: [' '], meter: { v: 0.5, from: 0.4, to: 0.6 } } }).event, 'een nieuwe stand gaat uit');
});

t('bij een timing gaan de vraag en de rondeteller mee, zodat de gast weet waar hij op drukt', () => {
  const sc = schoonScene({ paneel: { stap: 'timing', toetsen: [' '], tekst: 'Camera een kijkt naar de koffieautomaat.', ronde: 'Timing - 2 VAN 3' } });
  assert.equal(sc.paneel.tekst, 'Camera een kijkt naar de koffieautomaat.');
  assert.equal(sc.paneel.ronde, 'Timing - 2 VAN 3');
  const keuze = schoonScene({ paneel: { stap: 'choice', toetsen: ['1'] } });
  assert.equal(keuze.paneel.tekst, undefined, 'een keuze stuurt geen lege tekst mee');
  assert.equal(keuze.paneel.ronde, undefined);
});

t('de gast ziet het paneel in het bericht van de gastheer (heen en terug over de lijn)', () => {
  const bericht = sceneBericht(null, { paneel: { stap: 'timing', toetsen: [' ', 'e', 'f'] } });
  assert.ok(bericht.event, 'er gaat een bericht uit');
  assert.deepEqual(leesSceneBericht(bericht.event).paneel, { stap: 'timing', toetsen: [' ', 'e', 'f'] });
  assert.equal(sceneBericht(bericht.huidig, { paneel: { stap: 'timing', toetsen: [' ', 'e', 'f'] } }).event, null, 'niets veranderd, niets sturen');
});

t('de gast stuurt alleen een toets die het paneel noemt', () => {
  const paneel = { stap: 'choice', toetsen: ['1', '2'] };
  assert.deepEqual(paneelEvent('2', paneel), { k: 'paneel', a: '2' });
  assert.equal(paneelEvent('3', paneel), null);
  assert.equal(paneelEvent('e', paneel), null);
  assert.equal(paneelEvent('1', null), null);
});

t('de gast leest zijn eigen toets uit de paneeltoetsen', () => {
  const paneel = { stap: 'timing', toetsen: [' ', 'e', 'f'] };
  assert.equal(paneelToets(guestInput('e'), paneel), 'e');
  assert.equal(paneelToets(guestInput('w'), paneel), null);
  assert.equal(paneelToets(guestInput(), paneel), null);
});

t('de gastheer leest de toets van de gast als zijn eigen antwoord', () => {
  const sc = { paneel: { stap: 'choice', toetsen: ['1', '2'] } };
  const w = hostWorld(sc);
  assert.equal(paneelIndrukken(w, 1, '2', { kind: 'choice' }, sc), true);
  assert.deepEqual(neemPaneelDruk(w, 'choice'), ['2'], 'de keuze leest hem');
  assert.deepEqual(neemPaneelDruk(w, 'choice'), [], 'en daarna is de wachtrij leeg');
});

t('een gast kan niet drukken bij een andere stap, een andere toets of buiten de keuze/timing', () => {
  const sc = { paneel: { stap: 'choice', toetsen: ['1'] } };
  assert.equal(paneelIndrukken(hostWorld(sc), 1, '2', { kind: 'choice' }, sc), false, 'toets niet in het paneel');
  assert.equal(paneelIndrukken(hostWorld(sc), 1, '1', { kind: 'goto' }, sc), false, 'geen paneelstap');
  assert.equal(paneelIndrukken(hostWorld(sc), 0, '1', { kind: 'choice' }, sc), false, 'de gastheer zelf, geen gast');
  assert.equal(paneelIndrukken(hostWorld(null), 1, '1', { kind: 'choice' }, null), false, 'geen scènebericht');
});

t('de gastheer in zijn menu of pauze neemt geen toets van een gast aan', () => {
  const sc = { paneel: { stap: 'choice', toetsen: ['1'] } };
  const w = hostWorld(sc); w.paused = true;
  assert.equal(paneelIndrukken(w, 1, '1', { kind: 'choice' }, sc), false);
  w.paused = false; w.uiPaused = true;
  assert.equal(paneelIndrukken(w, 1, '1', { kind: 'choice' }, sc), false);
});

t('twee keer hetzelfde antwoord kort achter elkaar telt één keer (geen dubbel antwoord)', () => {
  const sc = { paneel: { stap: 'choice', toetsen: ['1'] } };
  const w = hostWorld(sc);
  assert.equal(paneelIndrukken(w, 1, '1', { kind: 'choice' }, sc), true);
  w.time += PANEEL_WACHT_S / 2;
  assert.equal(paneelIndrukken(w, 1, '1', { kind: 'choice' }, sc), false, 'nog binnen de wacht');
  w.time += PANEEL_WACHT_S;
  assert.equal(paneelIndrukken(w, 1, '1', { kind: 'choice' }, sc), true, 'na de wacht weer');
});

t('wat de gast ziet staan er als regel bij', () => {
  assert.match(paneelTekst({ stap: 'choice', toetsen: ['1', '2'] }), /1 of 2/);
  assert.match(paneelTekst({ stap: 'timing', toetsen: [' ', 'e', 'f'] }), /Spatie/);
  assert.equal(paneelTekst(null), '');
});

t('het hele pad: de gast drukt, de gastheer antwoordt, de keuze gaat verder', () => {
  const stap = { kind: 'choice', rounds: [{ who: 'J', text: 'Wat doe je?', options: [{ label: 'Weglopen', tag: 'weg' }, { label: 'Blijven', tag: 'blijf' }] }] };
  const sc = { keuze: { tekst: 'Wat doe je?', opties: ['Weglopen', 'Blijven'] }, paneel: { stap: 'choice', toetsen: ['1', '2'] } };
  const w = hostWorld(sc);
  const S = {}; enterChoice(S);
  // de gast toetst 2, de gastheer leest dat als zijn eigen antwoord
  const k = paneelToets(guestInput('2'), sc.paneel);
  assert.equal(paneelIndrukken(w, 1, k, stap, sc), true);
  let r = null;
  for (let i = 0; i < 60 && !r; i++) {
    const geldig = (k2) => stap.rounds[0].options.some((o, j) => String(j + 1) === k2);
    const key = neemPaneelDruk(w, 'choice').find(geldig) || null;
    r = stepChoice(stap, S, key, 0.05);
  }
  assert.equal(S.picks[0], 1, 'de tweede optie is gekozen');
  assert.ok(r, 'de stap is klaar');
});

t('het hele pad bij een timing: de gastheer telt de druk van de gast als een treffer', () => {
  const stap = { kind: 'timing', kicker: 'Test', goodAt: 1, rounds: [{ text: 'a', speed: 1, zone: [0, 1], ok: 'ja', bad: 'nee' }] };
  const sc = { paneel: { stap: 'timing', toetsen: [' ', 'e', 'f'] } };
  const w = hostWorld(sc); w.time = 10;
  const S = {}; enterTiming(S);
  assert.equal(paneelIndrukken(w, 1, paneelToets(guestInput('e'), sc.paneel), stap, sc), true);
  const press = neemPaneelDruk(w, 'timing').length > 0;
  assert.equal(press, true, 'de druk van de gast telt');
  let r = stepTiming(stap, S, press, 0.016);
  for (let i = 0; i < 600 && !r; i++) r = stepTiming(stap, S, false, 0.016);
  assert.equal(r, 'done', 'een treffer is genoeg voor goodAt 1');
  assert.equal(S.hits, 1);
});

console.log(fails ? '' : `cooppaneel_test: ${n}/${n} ok`);
