// Verfijnronde geluid (22-11): regressie- en fuzztest voor de zuivere audiomodules. Een ontbrekende positie, een NaN-tijd of een
// raar sleutelwoord mocht nooit een NaN-versterking, een zwijgende voetstap of een weggewist stuk afkoeltijd opleveren.
import { distanceGain, airLowpassHz, arrivalDelay, speechDuckFactor, categoryLevel, plan, duckVeilig } from '../game/js/sfx/mixplan.js';
import { capVoor, createStemTeller, voiceCap } from '../game/js/sfx/stemlimiet.js';
import { stepSurface, fileSurface, stepNames, fileStepNames, gainJitter, strideFor } from '../game/js/sfx/steps.js';
import { scheepshoornPauze, treinHoornPauze, verkeerDagNiveau, bedWobble, bedStartRate } from '../game/js/sfx/lagenplan.js';
import { magKlinken, wordtGesmoord, kiesVariant, toonSpreiding } from '../game/js/sfx/uitaal.js';
import { spreiding } from '../game/js/sfx/stingen.js';
import { volumeValue } from '../game/js/sfx/volume.js';
import { planAdBlock } from '../game/js/radioads.js';
import { pickTrack, pushHistory, normalizeTrack } from '../game/js/musicpick.js';

let fout = 0;
const eis = (ok, naam) => { if (!ok) { fout++; console.log('FOUT:', naam); } };
const fin = (x) => Number.isFinite(x);
const WEIRD = [undefined, null, NaN, -1, Infinity, 1e9, 'constructor', '__proto__', {}];

// mixplan geeft nooit NaN
for (const w of WEIRD) {
  eis(fin(distanceGain(w)) && distanceGain(w) > 0, `distanceGain(${String(w)})`);
  eis(fin(airLowpassHz(w)) && airLowpassHz(w) >= 900, `airLowpassHz(${String(w)})`);
  eis(fin(arrivalDelay(w)), `arrivalDelay(${String(w)})`);
  eis(fin(speechDuckFactor('voetstap', w)), `speechDuckFactor speaking ${String(w)}`);
  eis(fin(categoryLevel(w)), `categoryLevel(${String(w)})`);
  const p = plan(w, w, w);
  eis(fin(p.gain) && fin(p.rate) && fin(p.delay) && fin(p.lp), `plan(${String(w)})`);
}
eis(categoryLevel('constructor') === 0.7 && Math.abs(speechDuckFactor('toString', 1) - 0.7) < 1e-9, 'prototypesleutel is geen categorie');
eis(distanceGain(0) === 1 && arrivalDelay(343) === 1, 'gewone waarden blijven gelijk');

// stemlimiet
eis(capVoor('constructor') === Infinity && capVoor('hasOwnProperty', 2) === Infinity, 'capVoor prototypesleutel is geen categorie');
eis(capVoor('voetstap', NaN) === 8, 'capVoor NaN-prio telt als gewoon');
{ const t = createStemTeller(); let ok = 0; for (let i = 0; i < 20; i++) if (t.neem('constructor')) ok++; eis(ok === 20, 'teller laat onbekende categorie door'); }

// globale stemlimiet en demping van de omgeving
eis([undefined, NaN, 3, -1, 1.5, null].every((p) => voiceCap(p, [26, 54, 76]) === 54) && voiceCap(0, [26, 54, 76]) === 26 && voiceCap(2, [26, 54, 76]) === 76, 'voiceCap: onbruikbare prioriteit telt als gewoon');
for (const a of WEIRD) for (const h of WEIRD) { const d = duckVeilig(a, h); eis(fin(d.amount) && d.amount >= 0 && d.amount <= 1 && fin(d.hold) && d.hold >= 0 && d.hold <= 30, 'duckVeilig ' + String(a) + ' ' + String(h)); }
eis(duckVeilig(0.4, 2).amount === 0.4 && duckVeilig(0.4, 2).hold === 2, 'duckVeilig laat gewone waarden staan');

// stappen
eis(stepSurface('constructor') === 'klinkers' && stepSurface('__proto__') === 'klinkers' && stepSurface(undefined) === 'klinkers', 'stepSurface prototypesleutel');
eis(fileSurface('toString') === 'klinkers' && fileSurface('strand') === 'zand', 'fileSurface prototypesleutel en alias');
eis(stepNames('gras', NaN).every((n) => !n.includes('NaN')) && fileStepNames('gras', NaN).every((n) => !n.includes('NaN')), 'stapnamen zonder NaN');
for (const w of WEIRD) {
  eis(fin(gainJitter(w)) && gainJitter(w) > 0.5 && gainJitter(w) < 2, `gainJitter(${String(w)})`);
  eis(fin(strideFor(w, false)) && strideFor(w, false) >= 0.4, `strideFor(${String(w)})`);
}

// lagenplan
for (const w of WEIRD) {
  eis(fin(scheepshoornPauze(w, w)) && scheepshoornPauze(w, w) > 0, `scheepshoornPauze(${String(w)})`);
  eis(fin(treinHoornPauze(w, w, w, w)) && treinHoornPauze(w, w, w, w) > 0, `treinHoornPauze(${String(w)})`);
  eis(fin(verkeerDagNiveau(w, w, w, w, w)), `verkeerDagNiveau(${String(w)})`);
  eis(fin(bedWobble(w, w, w)), `bedWobble(${String(w)})`);
  eis(fin(bedStartRate(w)), `bedStartRate(${String(w)})`);
}

// UI-taal en stings
{
  const last = new Map();
  eis(magKlinken(last, 'ui_tab', NaN) === false && !last.has('ui_tab'), 'magKlinken met NaN-tijd laat niets vallen en wist niets');
  eis(magKlinken(last, 'ui_tab', 10) === true && magKlinken(last, 'ui_tab', 10.01) === false && magKlinken(last, 'ui_tab', 10.2) === true, 'afkoeltijd blijft werken');
  eis(magKlinken(new Map(), 'constructor', 1) === true, 'onbekend geluid krijgt de standaardafkoeltijd');
  eis(wordtGesmoord(new Map(), 'constructor', 1) === false && wordtGesmoord({}, 'toString', 1) === false, 'wordtGesmoord prototypesleutel');
  for (const r of [NaN, undefined, -3, 7, Infinity]) {
    eis(['a', 'b', 'c'].includes(kiesVariant(['a', 'b', 'c'], r, null)), `kiesVariant r=${String(r)} geeft een variant`);
    eis(fin(toonSpreiding(r)) && fin(spreiding(r)), `spreiding r=${String(r)}`);
  }
  eis(kiesVariant(null, 0.5) === null && kiesVariant([], 0.5) === null, 'kiesVariant lege lijst');
}

// volume uit een tekst met procent
eis(volumeValue('50%') === 0.5 && volumeValue(' 80 % ') === 0.8 && volumeValue('12,5%') === 0.125 && volumeValue('150%') === 1 && volumeValue('-5%') === 0 && volumeValue('abc', 0.4) === 0.4, 'volumeValue met procent');

// reclameblok: nooit een gat
{
  const st = { lastAt: -1e9, breaks: 99, blocks: 0, history: [] };
  const b = planAdBlock(st, { now: 1e6, progId: 'dag' }, () => 0.3);
  eis(b === null || (b.ads.length > 0 && b.ads.every((a) => a && a.id)), 'planAdBlock levert nooit een gat in het blok');
}

// QA: simulatie over een lange speelduur: de radio herhaalt nooit direct en de geschiedenis blijft begrensd
{
  const tracks = Array.from({ length: 20 }, (_, i) => normalizeTrack({ file: `nr${i}.ogg`, stations: i < 14 ? ['gmusic'] : ['nachtstreek'], time: i % 5 === 0 ? 'night' : 'any', weight: 1 + (i % 3) }));
  let seed = 12345; const rng = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const hist = []; let herhaling = 0; const keer = new Map();
  for (let i = 0; i < 6000; i++) {
    const uur = (i * 0.25) % 24, station = uur >= 22 || uur < 6 ? 'nachtstreek' : 'gmusic';
    const t = pickTrack(tracks, hist, { station, hour: uur, rng, fresh: i === 0 });
    eis(!!t, 'pickTrack levert altijd een nummer');
    if (hist.length && hist[hist.length - 1] === t.id) herhaling++;
    keer.set(t.id, (keer.get(t.id) || 0) + 1);
    pushHistory(hist, t.id);
  }
  eis(herhaling === 0, `geen nummer twee keer achter elkaar (${herhaling})`);
  eis(hist.length <= 400, 'geschiedenis begrensd');
  eis(tracks.filter((t) => t.stations.includes('gmusic')).every((t) => (keer.get(t.id) || 0) > 50), 'elk dagnummer komt aan bod op lange duur');
}

if (fout) { console.log(`verfijn_audio_test: ${fout} fout(en)`); process.exit(1); }
console.log('verfijn_audio_test: ok');
