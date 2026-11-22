// Verfijnronde minigames en bijbanen (22-11): regressietests en fuzz voor wat de regels en HUD-modellen doen bij rare invoer
// (NaN, ontbrekende velden, dubbele aanroepen, extreme waarden). Puur, geen DOM en geen THREE.
//   node scripts/verfijn_minigames_test.mjs
import { fmtTime, windText, standTabel, makeRng } from '../game/js/minigamekit.js';
import { tijdTekst, kartHudModel } from '../game/js/kartstatus.js';
import { schiet, noteer, nieuweSerie, penaltyMedaille, UITKOMSTEN } from '../game/js/penaltyrules.js';
import { scorePoint } from '../game/js/padelrules.js';
import { padelHudModel, puntPop, watNu as padelWatNu } from '../game/js/padelstatus.js';
import { newCard, finishHole, holeName, cardTotals } from '../game/js/discgolfrules.js';
import { discgolfHudModel, baanPop } from '../game/js/discgolfstatus.js';
import { distText, directionWord, progressText, guideModel, edgeIndicator } from '../game/js/pigeonguidelogic.js';
import { windSterkte } from '../game/js/windmini.js';
import { createClimb, startClimb, stepClimb, botInput, WALL } from '../game/js/climbrules.js';
import { klimHudModel } from '../game/js/klimstatus.js';
import { startRonde, stapRonde, BIJBAAN_IDS } from '../game/js/bijbaanregels.js';

let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL', m); } };

// tijden: afronding mag nooit 0:60.00 geven
ok(fmtTime(59.999) === '1:00.00', 'fmtTime 59,999 is 1:00.00, kreeg ' + fmtTime(59.999));
ok(fmtTime(119.996) === '2:00.00' && fmtTime(0) === '0:00.00' && fmtTime(61.5) === '1:01.50', 'fmtTime gewone waarden');
ok(fmtTime(-3) === '0:00.00' && fmtTime(NaN) === '-:--.--', 'fmtTime negatief en NaN');
ok(tijdTekst(59.999) === '1:00,00' && tijdTekst(75.25) === '1:15,25', 'kart tijdTekst afronding en komma');
for (let i = 0; i < 2000; i++) {
  const s = i * 0.0173;
  ok(!/:6\d\./.test(fmtTime(s)) && !/:6\d,/.test(tijdTekst(s)), 'geen 60 seconden in de tijd bij ' + s);
}
// wind
ok(windText({ speed: NaN }) === 'Windstil' && windText(null) === 'Windstil' && windText({ speed: 9 }) === 'Wind 3 Bft', 'windText met rare invoer');
ok([windSterkte(NaN), windSterkte(Infinity), windSterkte(-5)].every((w) => Number.isFinite(w.t) && w.streepjes >= 1 && w.streepjes <= 3), 'windSterkte blijft een getal');
// penalty fuzz: een NaN-schot is nooit zomaar een doelpunt, en alles blijft een bekende uitkomst
const rng = makeRng(5);
const bekend = Object.keys(UITKOMSTEN);
for (let i = 0; i < 3000; i++) {
  const pick = () => { const r = rng(); return r < 0.1 ? NaN : r < 0.15 ? Infinity : r < 0.2 ? undefined : (rng() * 4 - 2); };
  const uit = schiet({ u: pick(), v: pick(), kracht: pick(), rng });
  ok(bekend.includes(uit.uitkomst), 'schiet geeft altijd een bekende uitkomst');
  ok(Number.isFinite(uit.u) && Number.isFinite(uit.v), 'schiet geeft altijd een eindige plek van de bal');
}
const serie = nieuweSerie();
ok(noteer(serie, 'bestaat-niet') === false && serie.schoten.every((x) => x === null), 'een onbekende uitkomst telt niet als schot');
ok(penaltyMedaille(NaN) === 0 && penaltyMedaille(5) === 3 && penaltyMedaille(undefined) === 0, 'penaltyMedaille met NaN');
// padel
const stand = { points: [1, 2], games: [0, 1] };
const vreemd = scorePoint(stand, 2);
ok(!vreemd.gameWon && !vreemd.over && vreemd.points.join() === '1,2' && vreemd.games.join() === '0,1', 'een punt voor een onbekend team verandert niets');
ok(scorePoint({ points: [3, 3], games: [0, 0] }, 1).gameWon, 'het gouden punt beslist de game');
ok(!padelHudModel({ fase: 'rally' }).cijfers.some((c) => /undefined|NaN/.test(c.waarde)), 'padel-HUD zonder stand blijft leesbaar');
ok(padelWatNu({ fase: 'outro', winnaar: -1 }) === 'Potje gestopt', 'een gestopt potje is geen punt voor hen');
ok(puntPop({ team: 0, rally: 2 }).tekst === 'Punt: 0-0', 'puntPop zonder stand');
// discgolf
const card = newCard([{ n: 1, par: 3 }, { n: 2, par: 3 }]);
finishHole(card, 0, 1); finishHole(card, 0, 1); finishHole(card, 0, 5);
ok(card.aces === 1 && card.holes[0].strokes === 1, 'dubbel afronden telt de ace en de hole maar een keer');
ok(finishHole(card, 9, 3) === null && finishHole(card, 1, NaN) === card.holes[1] && !card.holes[1].done, 'een onbestaande hole of NaN-worpen sluit niets af');
ok(cardTotals(card).strokes === 1, 'de kaart telt alleen afgeronde banen');
ok(holeName(NaN, 3) === '' && holeName(1, 3) === 'Ace!' && holeName(3, 3) === 'Par', 'holeName met NaN');
ok(baanPop('Baan 2', 1, 3).tekst === 'Baan 2: 1 worp, ace!' && baanPop('Baan 2', 1, 3).geluid === 'ui_loopbaan', 'een ace springt op');
ok(baanPop('Baan 2', 4, 3).tekst === 'Baan 2: 4 worpen', 'gewone baanpop blijft');
ok(!discgolfHudModel({ modus: 'ronde', fase: 'aim', mand: NaN, baan: 1, banen: 3, par: 3, worp: 1, wind: 'Windstil' }).cijfers[0].waarde.includes('NaN'), 'mandafstand NaN');
// duif
ok(distText(NaN) === '0 m' && distText(-4) === '0 m' && distText(1500) === '1,5 km', 'distText randgevallen');
ok(directionWord(NaN) === 'recht voor je', 'directionWord NaN');
ok(progressText(0, 0) === 'Nog niets te spotten' && progressText(9, 6) === 'Gespot 6 van 6', 'progressText randgevallen');
ok(guideModel({ targets: [{ x: 10, y: 0, label: 'Kolom' }], spotted: new Set(), flight: null }).items.length === 1, 'guideModel zonder vlucht');
ok(guideModel({ targets: null, spotted: new Set(), flight: { x: 0, y: 0, yaw: 0 } }).line === 'Alles gespot', 'guideModel zonder doelen');
const e = edgeIndicator(NaN, 0.2, false);
ok(Number.isFinite(e.x) && Number.isFinite(e.y) && Number.isFinite(e.angle), 'edgeIndicator NaN');
// klim: grote dt en lege invoer, en een lange bot-simulatie
{
  const c = createClimb(); startClimb(c);
  ok(Array.isArray(stepClimb(c, undefined, 0.016)), 'stepClimb zonder invoer');
  stepClimb(c, { a: true, d: true }, 120);
  ok(c.time < 1 && Number.isFinite(c.time), 'een hapering van twee minuten telt hooguit een kwart seconde: ' + c.time);
  stepClimb(c, { a: true }, NaN);
  ok(Number.isFinite(c.time), 'dt NaN verpest de tijd niet');
  const k = createClimb(); startClimb(k);
  for (let i = 0; i < 60 * 600 && k.phase === 'climb'; i++) stepClimb(k, botInput(k), 1 / 60);
  ok(k.phase === 'top' || k.phase === 'over', 'de klimbot komt na maximaal tien minuten ergens (geen vastloper): ' + k.phase);
  ok(Number.isFinite(k.time) && k.falls <= WALL.tries, 'klimtijd en vallen blijven geldig');
  ok(klimHudModel({ fase: 'run', klimFase: 'climb', grond: false, hoogte: 3, kansen: 2, armen: 0.5 }).cijfers[2].waarde === '0:00.00', 'klim-HUD zonder tijd');
}
// kart
ok(Number.isFinite(kartHudModel({ fase: 'race', drift: {} }).meter.pct), 'driftlading zonder tijd');
// bijbanen: alle banen overleven grote en rare dt en lege invoer
for (const id of BIJBAAN_IDS) {
  const r = startRonde(id, 1, makeRng(3));
  let kapot = false;
  for (let i = 0; i < 600 && !r.over; i++) {
    try { stapRonde(r, i % 3 ? {} : null, i % 50 === 0 ? 50 : i % 17 === 0 ? NaN : 1 / 30); } catch (err) { kapot = true; console.log(id, err.message); break; }
  }
  ok(!kapot, `bijbaan ${id} overleeft een hapering, NaN en lege invoer`);
}
// bord
ok(/Nog niemand/.test(standTabel(['Naam', 'Tijd'], [])) && /colspan="3"/.test(standTabel(['Naam', 'Tijd'], [])), 'lege tussenstand zegt het');
ok(/<th scope="row">Mo<\/th>/.test(standTabel(['Naam'], [{ naam: 'Mo' }])), 'een rij zonder cellen crasht niet');
ok(!/<b>/.test(standTabel(['Naam'], [{ naam: '<b>x', cellen: [] }])), 'namen blijven geescaped');

console.log(`verfijn_minigames_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
