// Test van de cutscene-linter (laag 2): opzettelijk foute eenheden moeten de juiste regel raken, een nette eenheid niet,
// en de strengheid klopt: de regels gelden voor alle cutscenes, geen baseline, een uitzondering heeft een reden. Geen browser, geen wereld.
//   node scripts/cutscene_lint_test.mjs
import fs from 'node:fs';
import { compileScene } from '../game/js/cutscript.js';
import { propFoot } from '../game/js/cutscenemodels.js';
import { lintUnit, checkText, checkIntroductions, humorCandidates, checkHumorStructure, rapportVan, globaleScore, scoreVan, inFrame, bijbelIds, RULES, valideerUitzonderingen, pasUitzonderingenToe } from './lib/cutscene_lint.mjs';

let n = 0, fails = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${naam}${info ? ` (${info})` : ''}`); } };
const heeft = (v, regel, ernst) => v.some((x) => x.regel === regel && (!ernst || x.ernst === ernst));

// ---- bouwstenen -------------------------------------------------------------------------------------------------
const DUO = {
  tammo: { look: 'tammo', at: [0, 0.6], face: 0, anim: 'idle', speaker: 'Tammo', gaze: 'speaker' },
  tessa: { look: 'anita', at: [0, -0.6], face: 0, anim: 'idle', speaker: ['Anita', 'Tessa'], gaze: 'speaker' },
};
const regels = (lijst) => { let t = 0.6; return lijst.map(([speaker, text, o = {}]) => { const dur = o.dur || 2.4; const r = { speaker, key: o.key || (speaker === 'Tammo' ? 'T' : speaker === 'Anita' ? 'A' : speaker.toLowerCase()), text, at: t, dur, channel: o.channel || 'stem', textOnly: !!o.textOnly, voiceDur: o.voiceDur || 0, hasVoice: o.hasVoice ?? true }; t += dur + 0.1; return r; }); };
const BEST = [['Tammo', 'Goedemorgen.'], ['Anita', 'Morgen. Heb je geslapen?'], ['Tammo', 'Nee, jij?'], ['Anita', 'Ook niet.'], ['Tammo', 'Koffie dan.'], ['Anita', 'Ja, graag.']];
const goedeShots = (extra = []) => [
  { t: 0, shot: 'dolly', from: [-4.4, 0.4, 2.0], to: [-3.6, 0.2, 1.8], look: 'mid:tammo,tessa@1.3', fov: 42 },
  { t: 'L1', shot: 'cut', at: [-2.8, 0.5, 1.6], look: 'speaker', fov: 34 },
  { t: 'L2', shot: 'cut', at: [-2.8, -0.5, 1.6], look: 'speaker', fov: 34 },
  { t: 'L3', shot: 'dolly', from: [-3.4, 0.2, 1.7], to: [-2.8, 0.3, 1.65], look: 'mid:tammo,tessa@1.3', fov: 36 },
  ...extra,
];
function bouw(def, lijst = BEST, duration) {
  const lines = regels(lijst);
  const dur = duration || lines[lines.length - 1].at + lines[lines.length - 1].dur + 1;
  const volledig = { id: 'test', actors: { ...DUO }, props: {}, cues: [], shots: goedeShots(), ...def };
  const scene = compileScene(volledig, { lines, duration: dur, skipValidate: true });
  return { id: 'test', group: 'Test', kind: 'staged', act: 1, lines, def: volledig, scene, duration: dur, rhythm: null, status: 'ok', issues: [], footOf: propFoot };
}
const tekstEenheid = (lijst, extra = {}) => ({ id: 't', group: 'Script', kind: 'script', lines: regels(lijst), def: null, scene: null, duration: 20, ...extra });
const CTX = { speakers: { T: {}, A: {}, berend: {}, rikus: {} }, npc: {} };

// ---- 1. een nette scène is schoon -----------------------------------------------------------------------------------
{
  const u = bouw({});
  const v = lintUnit(u, CTX);
  ok(!v.some((x) => x.ernst === 'blokkerend'), 'een nette scène heeft geen blokkerende vondst', JSON.stringify(v.filter((x) => x.ernst === 'blokkerend')));
  ok(scoreVan(v) >= 60, 'een nette scène scoort goed', String(scoreVan(v)));
}

// ---- 2. tekstregels ---------------------------------------------------------------------------------------------------
{
  const lang = 'Dit is een heel lange uitleg over iets wat eigenlijk veel korter had gekund maar die toch doorgaat tot de spreker echt lucht nodig heeft en dan nog even verder gaat met meer details.';
  ok(heeft(checkText(tekstEenheid([['Tammo', lang], ['Anita', 'Ja.']]), CTX), 'CS-T02'), 'T02: een beurt van meer dan 25 woorden wordt gemeld');
  ok(heeft(checkText(tekstEenheid([['Tammo', lang + ' ' + lang], ['Anita', 'Ja.']]), CTX), 'CS-T02', 'blokkerend'), 'T02: boven 45 woorden is het blokkerend');
  ok(heeft(checkText(tekstEenheid([['Tammo', 'Eén.'], ['Tammo', 'Twee.'], ['Tammo', 'Drie.'], ['Tammo', 'Vier.'], ['Anita', 'Ja.']]), CTX), 'CS-T03'), 'T03: vier beurten achter elkaar worden gemeld');
  ok(heeft(checkText(tekstEenheid([['Tammo', 'A.'], ['Anita', 'B.'], ['Berend', 'C.', { key: 'berend' }], ['Henk', 'D.', { key: 'berend' }]]), CTX), 'CS-T04'), 'T04: vier sprekers worden gemeld');
  ok(!heeft(checkText(tekstEenheid([['Tammo', 'A.'], ['Anita', 'B.'], ['Rikus', 'Radio.', { key: 'rikus', channel: 'radio' }], ['Tammo', 'C.']]), CTX), 'CS-T04'), 'T04: een radiostem telt niet mee');
  ok(heeft(checkText(tekstEenheid([['Tammo', 'Bij Albert Heijn is het druk.']]), CTX), 'CS-T05', 'blokkerend'), 'T05: een echt merk is blokkerend');
  ok(!heeft(checkText(tekstEenheid([['Tammo', 'Bij EIKEA is het druk.']]), CTX), 'CS-T05'), 'T05: de parodie EIKEA is toegestaan');
  ok(heeft(checkText(tekstEenheid([['Tammo', 'Ik woon in de Grunn.']]), CTX), 'CS-T05'), 'T05: "de Grunn" wordt gemeld');
  ok(!heeft(checkText(tekstEenheid([['Tammo', 'Ik woon in Grunn.']]), CTX), 'CS-T05'), 'T05: "Grunn" is goed');
  ok(heeft(checkText(tekstEenheid([['Tammo', 'Er ligt sneeuw op het Zuiderdiep.']]), CTX), 'CS-T05'), 'T05: sneeuw wordt gemeld (altijd zomer)');
  ok(heeft(checkText(tekstEenheid([['Tammo', 'Please wait, you are not the one with this thing.']]), CTX), 'CS-T05'), 'T05: Engelse spelertekst wordt gemeld');
  ok(heeft(checkText(tekstEenheid([['Tammo', 'Druk op {ENTER} om door te gaan.']]), CTX), 'CS-T06', 'blokkerend'), 'T06: een onopgeloste plaatshouder is blokkerend');
  ok(heeft(checkText(tekstEenheid([['Tammo', 'Je krijgt undefined euro.']]), CTX), 'CS-T06'), 'T06: undefined in de tekst wordt gemeld');
  ok(heeft(checkText(tekstEenheid([['Tammo', '   ']]), CTX), 'CS-T06'), 'T06: een lege regel wordt gemeld');
  ok(heeft(checkText(tekstEenheid([['Spook', 'Boe.', { key: 'spook' }]]), CTX), 'CS-T07', 'blokkerend'), 'T07: een onbekend personage is blokkerend');
  ok(heeft(checkText(tekstEenheid([['Tammo', 'Dit is een vrij lange regel van ruim honderdveertig tekens die in twee en een halve seconde gesproken wordt en dus onleesbaar is voor iedereen.', { voiceDur: 3 }]]), CTX), 'CS-T01'), 'T01: te snelle ondertitel wordt gemeld');
  ok(heeft(checkText(tekstEenheid([['Tammo', 'Honderdveertig tekens in een halve seconde, dat leest niemand ooit, ook geen snelle lezer met veel oefening hoor, echt niet.', { voiceDur: 0.5 }]]), CTX), 'CS-T01', 'blokkerend'), 'T01: boven 28 tekens per seconde is blokkerend');
  ok(!heeft(checkText(tekstEenheid([['Tammo', 'Kort.', { voiceDur: 0.6 }]]), CTX), 'CS-T01'), 'T01: een korte regel is geen probleem');
  // 23-11 (M06.intro): een korte stem in een geënsceneerde tijdlijn staat zo lang als de tijdlijn hem geeft, een kortere voorbeeldduur telt niet
  ok(!heeft(checkText(tekstEenheid([['Tammo', 'En daarna brengen we hem terug.', { voiceDur: 1.27, dur: 3.1 }]]), CTX), 'CS-T01'), 'T01: de duur uit de tijdlijn telt als de ondertitel langer staat dan de stem');
  ok(heeft(checkText(tekstEenheid([['Tammo', 'En daarna brengen we hem terug.', { voiceDur: 1.27, dur: 1.0 }]]), CTX), 'CS-T01'), 'T01: een kortere tijdlijnduur maakt de stemduur niet korter');
  ok(heeft(checkText(tekstEenheid([['Tammo', 'A.'], ['Tammo', 'B.'], ['Tammo', 'C.'], ['Tammo', 'D.']]), CTX), 'CS-T09'), 'T09: een toespraak van één spreker wordt gemeld');
  ok(!heeft(checkText(tekstEenheid([['Rikus', 'A.', { key: 'rikus', channel: 'radio' }], ['Rikus', 'B.', { key: 'rikus', channel: 'radio' }], ['Rikus', 'C.', { key: 'rikus', channel: 'radio' }], ['Rikus', 'D.', { key: 'rikus', channel: 'radio' }]]), CTX), 'CS-T09'), 'T09: een radio-uitzending is geen toespraak');
  ok(heeft(checkText(tekstEenheid([['Tammo', 'Hoi.', { hasVoice: false }]]), CTX), 'CS-T10'), 'T10: een regel zonder stemclip wordt gemeld');
  ok(!heeft(checkText(tekstEenheid([['Tammo', 'Hoi.', { hasVoice: false, textOnly: true }]]), CTX), 'CS-T10'), 'T10: bewust alleen-ondertitel is goed');
}

// ---- 3. introducties ----------------------------------------------------------------------------------------------------
{
  const names = { berend: 'Berend Bos', durk: 'Durk', rikus: 'Rikus' };
  const scene = (id, lijst, regie = []) => ({ id, kind: 'script', lines: regels(lijst).map((l, i) => ({ ...l, key: lijst[i][2] && lijst[i][2].key ? lijst[i][2].key : l.key })), regie });
  const zonder = checkIntroductions([
    scene('S1', [['Tammo', 'We gaan weg.'], ['Anita', 'Ja.']]),
    scene('S2', [['Berend Bos', 'Goedemorgen.', { key: 'berend' }], ['Tammo', 'Hoi.'], ['Berend Bos', 'Kom binnen.', { key: 'berend' }]]),
  ], names);
  ok((zonder.get('S2') || []).some((v) => v.regel === 'CS-T08'), 'T08: een personage zonder aankondiging of naamkaart wordt gemeld');
  const metAankondiging = checkIntroductions([
    scene('S1', [['Tammo', 'Berend heeft veertig jaar verloren.'], ['Anita', 'Ja.']]),
    scene('S2', [['Berend Bos', 'Goedemorgen.', { key: 'berend' }], ['Tammo', 'Hoi.'], ['Berend Bos', 'Kom binnen.', { key: 'berend' }]]),
  ], names);
  ok(!(metAankondiging.get('S2') || []).length, 'T08: een aangekondigd personage is goed');
  const metKaart = checkIntroductions([
    scene('S2', [['Berend Bos', 'Goedemorgen.', { key: 'berend' }], ['Tammo', 'Hoi.'], ['Berend Bos', 'Kom binnen.', { key: 'berend' }]], ['Naamkaart BEREND bij de eerste verschijning.']),
  ], names);
  ok(!(metKaart.get('S2') || []).length, 'T08: een naamkaart in de regie telt als introductie');
  const viaRadio = checkIntroductions([
    scene('S1', [['Durk', 'Hallo allemaal.', { key: 'durk', channel: 'radio' }], ['Tammo', 'Hoi.'], ['Durk', 'Nog een keer.', { key: 'durk', channel: 'radio' }]]),
  ], names);
  ok((viaRadio.get('S1') || []).some((v) => /radio en telefoon introduceren nooit/.test(v.bericht)), 'T08: een personage dat eerst via de radio klinkt wordt gemeld');
  const eenRegel = checkIntroductions([scene('S1', [['Tammo', 'Hoi.'], ['Berend Bos', 'Goedemorgen.', { key: 'berend' }]])], names);
  ok(!(eenRegel.get('S1') || []).length, 'T08: een bijrol met één regel hoeft geen introductie');
}

// ---- 4. camera ------------------------------------------------------------------------------------------------------------
{
  // speaker niet in beeld: de camera kijkt van de acteurs weg
  const weg = bouw({ shots: [{ t: 0, shot: 'cut', at: [-4, 0, 1.6], look: [-30, 0, 1.6], fov: 40 }, { t: 'L3', shot: 'dolly', from: [-4, 0, 1.6], to: [-5, 0.5, 1.7], look: [-30, 0, 1.6], fov: 40 }] });
  const v = lintUnit(weg, CTX);
  ok(heeft(v, 'CS-C05', 'blokkerend'), 'C05: een spreker die nergens in beeld is, is blokkerend', JSON.stringify(v.map((x) => x.regel)));
  // spreker kort in beeld: belangrijk
  ok(!heeft(lintUnit(bouw({}), CTX), 'CS-C05', 'blokkerend'), 'C05: een nette dekking mag niet blokkeren');
  // camera onder de grond
  const laag = bouw({ shots: [{ t: 0, shot: 'cut', at: [-3, 0, 0.05], look: 'mid:tammo,tessa@1.3', fov: 40 }, ...goedeShots().slice(1)] });
  ok(heeft(lintUnit(laag, CTX), 'CS-C02', 'blokkerend'), 'C02: een camera onder 0,25 m is blokkerend');
  // camera met een geen-getal (nepscène: de echte compiler weigert dit al)
  const nan = { ...bouw({}), scene: { sample: () => ({ camera: { position: { x: NaN, y: 0, z: 1 }, lookAt: { x: 0, y: 0, z: 1 }, fov: 40, shotIndex: 0 }, actors: {}, props: {} }), stillStretches: () => [], shots: [] } };
  ok(heeft(lintUnit(nan, CTX), 'CS-C01', 'blokkerend'), 'C01: een NaN-camera is blokkerend');
  const leeg = bouw({}); leeg.def = { ...leeg.def, shots: [] };
  ok(heeft(lintUnit(leeg, CTX), 'CS-C01', 'blokkerend'), 'C01: een scène zonder shots is blokkerend');
  // camera in een figuur
  const inFiguur = { ...bouw({}), scene: { sample: () => ({ camera: { position: { x: 500, y: -300, z: 1.4 }, lookAt: { x: 501, y: -300, z: 1.4 }, fov: 40, shotIndex: 0 }, actors: { tammo: { x: 500.1, y: -300.1, h: 0, a: 0, visible: true, speed: 0, gaze: 0 } }, props: {}, speaker: null }) } };
  ok(heeft(lintUnit(inFiguur, CTX), 'CS-C03', 'blokkerend'), 'C03: een camera in een figuur is blokkerend');
  const inVoertuig = { ...bouw({}), scene: { sample: () => ({ camera: { position: { x: 500, y: -300, z: 0.8 }, lookAt: { x: 501, y: -300, z: 0.8 }, fov: 40, shotIndex: 0 }, actors: {}, props: { bus: { x: 500, y: -300, h: 0, kind: 'bestelbus', visible: true } }, speaker: null }) } };
  ok(heeft(lintUnit(inVoertuig, CTX), 'CS-C03', 'blokkerend'), 'C03: een camera in een voertuig is blokkerend');
  // shot te kort
  const flits = bouw({ shots: [{ t: 0, shot: 'dolly', from: [-4, 0, 1.8], to: [-3.6, 0, 1.8], look: 'mid:tammo,tessa@1.3', fov: 42 }, { t: 3, shot: 'cut', at: [-2.8, 0.5, 1.6], look: 'speaker', fov: 34 }, { t: 3.3, shot: 'cut', at: [-2.8, -0.5, 1.6], look: 'speaker', fov: 34 }, { t: 5, shot: 'dolly', from: [-3.4, 0.2, 1.7], to: [-2.8, 0.3, 1.65], look: 'mid:tammo,tessa@1.3', fov: 36 }] });
  ok(heeft(lintUnit(flits, CTX), 'CS-C04'), 'C04: een shot van 0,3 s wordt gemeld');
  // springende as: de camera wisselt tussen achter en voor de sprekers
  const sprong = bouw({ shots: [
    { t: 0, shot: 'cut', at: [-3, 0.2, 1.6], look: 'speaker', fov: 36 }, { t: 'L1', shot: 'cut', at: [3.2, 0.2, 1.6], look: 'speaker', fov: 36 },
    { t: 'L2', shot: 'cut', at: [-3, 0.2, 1.6], look: 'speaker', fov: 36 }, { t: 'L3', shot: 'cut', at: [3.2, 0.2, 1.6], look: 'speaker', fov: 36 },
    { t: 'L4', shot: 'cut', at: [-3, 0.2, 1.6], look: 'speaker', fov: 36 }, { t: 'L5', shot: 'cut', at: [3.2, 0.2, 1.6], look: 'speaker', fov: 36 }] });
  ok(heeft(lintUnit(sprong, CTX), 'CS-C06', 'belangrijk'), 'C06: een camera die steeds over de as springt wordt gemeld');
  ok(!heeft(lintUnit(bouw({}), CTX), 'CS-C06'), 'C06: een camera aan één kant is goed');
  // jump cut
  const jump = bouw({ shots: [{ t: 0, shot: 'cut', at: [-3, 0.2, 1.6], look: 'mid:tammo,tessa@1.3', fov: 36 }, { t: 3, shot: 'cut', at: [-3, 0.2, 1.6], look: 'mid:tammo,tessa@1.3', fov: 36 }, { t: 'L4', shot: 'cut', at: [-3.2, 0.4, 1.6], look: 'mid:tammo,tessa@1.3', fov: 38 }] });
  ok(heeft(lintUnit(jump, CTX), 'CS-C07'), 'C07: twee gelijke shots achter elkaar zijn een jump cut');
  ok(inFrame({ position: { x: 0, y: 0, z: 1.6 }, lookAt: { x: 5, y: 0, z: 1.6 }, fov: 40 }, { x: 4, y: 0.5, z: 1.5 }), 'inFrame: een figuur recht voor de camera is in beeld');
  ok(!inFrame({ position: { x: 0, y: 0, z: 1.6 }, lookAt: { x: 5, y: 0, z: 1.6 }, fov: 40 }, { x: -3, y: 0, z: 1.5 }), 'inFrame: een figuur achter de camera is niet in beeld');
}

// ---- 5. visuele logica ------------------------------------------------------------------------------------------------
{
  const andere = [['Tammo', 'Hoi.'], ['Berend Bos', 'Goedemorgen.', { key: 'berend' }], ['Tammo', 'Ja.'], ['Berend Bos', 'Kom.', { key: 'berend' }]];
  const zonderActor = bouw({}, andere);
  ok(heeft(lintUnit(zonderActor, { speakers: { ...CTX.speakers }, npc: { berend: {} } }), 'CS-V01', 'blokkerend'), 'V01: een spreker die niet in de scène staat is blokkerend');
  const verborgen = bouw({ cues: [{ t: 0, actor: 'tessa', hide: true }] });
  ok(heeft(lintUnit(verborgen, CTX), 'CS-V01', 'blokkerend'), 'V01: een spreker die verborgen is, is blokkerend');
  const inElkaar = bouw({ actors: { ...DUO, tessa: { ...DUO.tessa, at: [0, 0.6] } } });
  ok(heeft(lintUnit(inElkaar, CTX), 'CS-V03'), 'V03: twee figuren op dezelfde plek worden gemeld');
  const inAuto = bouw({ props: { auto: { kind: 'auto', at: [0, 0.6, 0], face: 0 } } });
  ok(heeft(lintUnit(inAuto, CTX), 'CS-V03'), 'V03: iemand die in een auto staat zonder te zitten wordt gemeld');
  const knik = bouw({ cues: [{ t: 'L3', actor: 'tammo', anim: 'nod' }] }, [['Anita', 'Wil je mee?'], ['Tammo', 'Goedemorgen.'], ['Anita', 'Ja.'], ['Tammo', 'Nee, dank je.'], ['Anita', 'Jammer.'], ['Tammo', 'Ja.']]);
  ok(heeft(lintUnit(knik, CTX), 'CS-V04'), 'V04: knikken bij "Nee" wordt gemeld');
  const rug = bouw({ actors: { tammo: { ...DUO.tammo, face: 180, gaze: 0 }, tessa: DUO.tessa }, cues: [] });
  ok(heeft(lintUnit(bouw({ actors: { tammo: { ...DUO.tammo, face: 90, gaze: 0 }, tessa: DUO.tessa }, cues: [] }), CTX), 'CS-V05'), 'V05: een spreker met zijn rug naar de ander wordt gemeld');
  ok(lintUnit(rug, CTX).length >= 0, 'V05: draait zonder te crashen');
  // #1146: gemeten tegen wie hij aanspreekt, niet tegen wie het dichtstbij staat; een figurant zonder regel telt niet mee
  const extra = { look: 'tammo', at: [0, 1.4], face: 180, anim: 'idle', speaker: ['Gast'], gaze: 0 };
  const metExtra = bouw({ actors: { tammo: { ...DUO.tammo, face: -90, gaze: 0 }, tessa: DUO.tessa, gast: extra }, cues: [] });
  ok(!heeft(lintUnit(metExtra, CTX), 'CS-V05'), 'V05: wie naar de ander kijkt faalt niet omdat een figurant achter hem staat');
  const naarExtra = bouw({ actors: { tammo: { ...DUO.tammo, face: 90, gaze: 0 }, tessa: DUO.tessa, gast: { ...extra, at: [0, 1.4] } }, cues: [] });
  ok(heeft(lintUnit(naarExtra, CTX), 'CS-V05'), 'V05: wie naar een figurant kijkt in plaats van naar de ander wordt gemeld');
}

// ---- 6. humor: alleen structuur en labels, nooit smaak --------------------------------------------------------------------
{
  const u = tekstEenheid([['Tammo', 'Ik had gedacht dat we eerst koffie zouden drinken en dan pas naar Berend zouden rijden, maar goed.'], ['Anita', 'Droog toost.'], ['Tammo', 'Dat was een grap, snap je?']]);
  ok(heeft(checkHumorStructure(u), 'CS-H01'), 'H01: een uitgelegde grap wordt als structuur gemeld');
  ok(checkHumorStructure(u).every((x) => x.categorie === 'smaak'), 'H01: humor is categorie smaak');
  const c = humorCandidates(u);
  ok(c.length >= 1 && c.every((x) => x.label === 'humor-review'), 'humorkandidaten dragen het label humor-review');
  const r = rapportVan(u, [{ cutscene: 't', regel: 'CS-H01', categorie: 'smaak', ernst: 'nit', bericht: 'x' }]);
  ok(r.score === 100 && r.smaak === 1, 'smaak telt niet mee in de score en staat apart');
  ok(!Object.entries(RULES).some(([id, r2]) => r2.categorie === 'smaak' && r2.ernst !== 'nit'), 'smaakregels zijn nooit blokkerend of belangrijk');
}


// ---- 7. score, bijbel-ID's en uitzonderingen (streng voor alles, geen baseline) --------------------------------------------------------------
{
  const v = (cutscene, regel, ernst, extra = {}) => ({ cutscene, regel, categorie: RULES[regel].categorie, ernst, bericht: 'x', ...extra });
  const a = rapportVan({ id: 'a', lines: [] }, [v('a', 'CS-T05', 'blokkerend'), v('a', 'CS-T02', 'belangrijk')]);
  const b = rapportVan({ id: 'b', lines: [] }, []);
  ok(a.score === 67 && b.score === 100 && globaleScore([a, b]) === 84, 'score: blokkerend 25, belangrijk 8, globale score is het gemiddelde', `${a.score} ${globaleScore([a, b])}`);
  const ids = bijbelIds({ regels: [{ id: 'R-03', lint: 'CS-C05' }, { id: 'R-09', linter: ['CS-T01', 'CS-T02'] }, { id: 'R-10' }] });
  ok(ids['CS-C05'] === 'R-03' && ids['CS-T02'] === 'R-09' && Object.keys(ids).length === 3, 'bijbelIds: koppelt voorlopige ID\'s aan de R-nummers van de bijbel');
  // uitzonderingen
  const goed = { uitzonderingen: [{ cutscene: 'a', regel: 'CS-T05', reden: 'een bewuste parodie op een verzonnen merknaam in deze scène', akkoord: 'eigenaar' }] };
  ok(valideerUitzonderingen(goed, { cutscenes: new Set(['a', 'b']) }).length === 0, 'een uitzondering met reden is geldig');
  ok(valideerUitzonderingen({ uitzonderingen: [{ cutscene: 'a', regel: 'CS-T05', reden: 'kort' }] }).some((f) => /reden/.test(f)), 'een uitzondering zonder echte reden wordt geweigerd');
  ok(valideerUitzonderingen({ uitzonderingen: [{ cutscene: 'a', regel: 'CS-X99', reden: 'een heel lange reden die genoeg tekens heeft hoor' }] }).some((f) => /onbekende regel/.test(f)), 'een uitzondering voor een onbekende regel wordt geweigerd');
  ok(valideerUitzonderingen(goed, { cutscenes: new Set(['b']) }).some((f) => /onbekende cutscene/.test(f)), 'een uitzondering voor een onbekende cutscene wordt geweigerd');
  ok(valideerUitzonderingen({ uitzonderingen: [{ cutscene: 'a', regel: 'CS-H01', reden: 'een heel lange reden die genoeg tekens heeft hoor' }] }).some((f) => /smaak/.test(f)), 'een smaakregel heeft geen uitzondering nodig');
  ok(valideerUitzonderingen({ uitzonderingen: [goed.uitzonderingen[0], goed.uitzonderingen[0]] }).some((f) => /dubbel/.test(f)), 'een dubbele uitzondering wordt geweigerd');
  ok(valideerUitzonderingen({}).length === 1, 'een bestand zonder lijst wordt geweigerd');
  // toepassen
  const perId = { a: [v('a', 'CS-T05', 'blokkerend'), v('a', 'CS-T02', 'belangrijk', { regelNr: 3 })], b: [v('b', 'CS-T05', 'blokkerend')] };
  const res = pasUitzonderingenToe(perId, [goed.uitzonderingen[0], { cutscene: 'c', regel: 'CS-T01', reden: 'een heel lange reden die genoeg tekens heeft hoor' }]);
  ok(perId.a[0].uitzondering && !perId.a[1].uitzondering && !perId.b[0].uitzondering, 'een uitzondering dekt alleen zijn eigen cutscene en regel');
  ok(res.verouderd.length === 1 && res.verouderd[0].cutscene === 'c', 'een uitzondering zonder vondst is verouderd en wordt gemeld');
  const na = rapportVan({ id: 'a', lines: [] }, perId.a);
  ok(na.blokkerend === 0 && na.uitgezonderd === 1 && na.belangrijk === 1 && na.score === 92, 'een uitgezonderde vondst telt niet meer mee in de aantallen en de score', JSON.stringify([na.blokkerend, na.uitgezonderd, na.score]));
  const metRegelNr = { a: [v('a', 'CS-T02', 'belangrijk', { regelNr: 3 }), v('a', 'CS-T02', 'belangrijk', { regelNr: 7 })] };
  pasUitzonderingenToe(metRegelNr, [{ cutscene: 'a', regel: 'CS-T02', regelNr: 3, reden: 'een heel lange reden die genoeg tekens heeft hoor' }]);
  ok(metRegelNr.a[0].uitzondering && !metRegelNr.a[1].uitzondering, 'een uitzondering met regelNr dekt alleen die regel');
}

// ---- 8. de echte data en de CLI -------------------------------------------------------------------------------------------------------------
{
  const { runLint, samenvatting, faalLijst } = await import('./cutscene_lint.mjs');
  const { rapporten, uitzonderingFouten } = await runLint();
  const sam = samenvatting(rapporten);
  ok(sam.cutscenes >= 150 && sam.gestaged >= 90, 'de linter ziet alle cutscenes (geregisseerd en script)', `${sam.cutscenes}/${sam.gestaged}`);
  ok(rapporten.every((r) => Number.isFinite(r.score)), 'elke cutscene heeft een score');
  ok(rapporten.some((r) => r.humor.length), 'humorkandidaten worden gelabeld voor het panel');
  ok(uitzonderingFouten.length === 0, 'het uitzonderingenbestand is geldig en geen uitzondering is verouderd', uitzonderingFouten.join('; '));
  ok(!fs.existsSync(new URL('./cutscene_lint_basis.json', import.meta.url)), 'er is geen stille baseline meer (cutscene_lint_basis.json bestaat niet)');
  const lijst = faalLijst(rapporten);
  ok(/## Blokkerend \(\d+\)/.test(lijst) && /## Belangrijk/.test(lijst), 'de faallijst voor de verhaal-lead heeft een blokkerend- en een belangrijk-deel');
  const blokkerend = rapporten.reduce((s, r) => s + r.blokkerend, 0);
  ok(new RegExp(`## Blokkerend \\(${blokkerend}\\)`).test(lijst), 'de faallijst telt de blokkerende vondsten', String(blokkerend));
  // de CLI: --meld blokkeert niet, --strict blokkeert zolang er een blokkerende vondst zonder uitzondering is
  const { spawnSync } = await import('node:child_process');
  const cli = (...a) => spawnSync(process.execPath, [new URL('./cutscene_lint.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), ...a], { encoding: 'utf8' });
  ok(cli('--meld', '--quiet').status === 0, '--meld blokkeert niet op bestaande cutscenes');
  const streng = cli('--strict', '--quiet');
  ok(blokkerend === 0 ? streng.status === 0 : streng.status === 1, '--strict blokkeert precies zolang er een blokkerende vondst zonder uitzondering is', `exit ${streng.status}, ${blokkerend} blokkerend`);
}

console.log(fails ? `${fails} van ${n} cutscene_lint-controles falen` : `cutscene_lint_test: ${n} controles ok`);
process.exit(fails ? 1 : 0);
