// Test van de regie-engine voor dialoogscènes (game/js/cutdirector.js): shot/reverse-shot, close-up op emotie, reactie na een belofte,
// een ontboezeming en een punch, ruimte na humor (zonder de tekst aan te raken), minimale en maximale shotduur, één kant van de as,
// en dat het opt-in is: geen bestaande scène heeft `direct`, en een gegenereerde scène voldoet aan de linter. Geen browser.
//   node scripts/cutdirector_test.mjs
import { directDialogue, MIN_SHOT, MAX_HOLD, templateFor, EMOTIONS, KINDS } from '../game/js/cutdirector.js';
import { missionScene, SPECS, MORE_SPECS } from '../game/js/cutscenes_akte1.js';
import '../game/js/cutscenes_akte2.js';
import '../game/js/cutscenes_akte3.js';
import '../game/js/cutscenes_akte4.js';
import '../game/js/cutscenes_akte6.js';
import { compileScene, validateScene } from '../game/js/cutscript.js';
import { propFoot } from '../game/js/cutscenemodels.js';
import { lintUnit } from './lib/cutscene_lint.mjs';

let n = 0, fails = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${naam}${info ? ` (${info})` : ''}`); } };
const num = (t, lines) => { if (typeof t === 'number') return t; const m = /^L(\d+)([+-]\d+(?:\.\d+)?)?$/.exec(t); return m ? lines[+m[1]].at + (m[2] ? +m[2] : 0) : NaN; };

const mk = (spec) => { let t = 0.6; return spec.map(([speaker, text, o = {}]) => { const dur = o.dur || 2.6; const l = { speaker, to: o.to || null, emotion: o.emotion || 'neutral', kind: o.kind || 'line', at: t, dur, text, humor: !!o.humor }; t += dur + 0.1; return l; }); };
const DUO = ['tammo', 'tessa'];
const GESPREK = mk([['tammo', 'Goedemorgen.'], ['tessa', 'Morgen. Heb je geslapen?'], ['tammo', 'Nee, jij?'], ['tessa', 'Ook niet.'], ['tammo', 'Koffie dan.'], ['tessa', 'Ja, graag.']]);

// ---- shot/reverse-shot ---------------------------------------------------------------------------------------------------------
{
  const d = directDialogue({ actors: DUO, lines: GESPREK });
  ok(d.shots.length >= 4, 'een gesprek krijgt meerdere shots', String(d.shots.length));
  ok(d.shots[0].t === 0 && d.shots[0].shot === 'push', 'de scène opent op een tweeshot op t = 0 (de template tweeshot)');
  const ots = d.shots.filter((s) => s.shot === 'ots');
  ok(ots.length >= 3, 'wie praat wordt over de schouder van de luisteraar genomen', String(ots.length));
  ok(ots.every((s, i, a) => i === 0 || a[i - 1].from !== s.from), 'schouder en tegenschouder wisselen af (de luisteraar is steeds een ander)');
  const tammo = ots.filter((s) => s.target === 'tammo'), tessa = ots.filter((s) => s.target === 'tessa');
  ok(tammo.every((s) => s.side > 0) && tessa.every((s) => s.side < 0), 'elke spreker zit steeds aan dezelfde kant van de as: de camera kruist de lijn niet', JSON.stringify([tammo.map((s) => s.side), tessa.map((s) => s.side)]));
  ok(d.humor.length === 0, 'zonder humorvlag geen humorlabel');
}

// ---- emotie, belofte, ontboezeming ------------------------------------------------------------------------------------------------
{
  const d = directDialogue({ actors: DUO, lines: mk([['tammo', 'Ik heb gelogen.', { kind: 'confession', dur: 3 }], ['tessa', 'Dat weet ik.'], ['tammo', 'Wat?!', { emotion: 'shock', dur: 2 }], ['tessa', 'Ik beloof het je.', { kind: 'promise', dur: 3 }], ['tammo', 'Goed.'], ['tessa', 'Ik ben verdrietig.', { emotion: 'sad', dur: 3 }], ['tammo', 'Kom hier.']]) });
  ok(templateFor({ kind: 'confession' }) === 'langzameZoom' && templateFor({ kind: 'promise' }) === 'closeGezicht' && templateFor({ emotion: 'shock' }) === 'schrikNadering' && templateFor({ emotion: 'neutral' }) === null, 'templateFor kiest de sjablonen van de bijbel');
  ok(d.shots.some((s) => s.shot === 'push' && s.fov1 < s.fov0 && s.d0 === s.d1), 'een ontboezeming krijgt een langzame zoom (de lens loopt dicht)');
  ok(d.shots.some((s) => s.shot === 'push' && s.ease === 'in' && s.shake), 'schrik krijgt een schokkende nadering');
  ok(d.shots.some((s) => s.shot === 'push' && s.fov0 <= 26 && s.target === 'tammo@1.5'), 'een belofte of verdriet krijgt een close-up op het gezicht');
  ok(d.stats.reactions >= 2, 'na een belofte en een ontboezeming volgt een reactie van de luisteraar', JSON.stringify(d.stats));
  ok(d.shots.some((s) => s.shot === 'push' && /^tessa@1\.5$/.test(s.target) && s.fov0 === 26 && s.d0 === 3), 'de reactie staat op de luisteraar (wachtOpReactie)');
}

// ---- humor: ruimte, geen oordeel, tekst onaangeroerd ------------------------------------------------------------------------------------
{
  const lines = mk([['tammo', 'Ik had gedacht dat we eerst koffie zouden drinken en dan pas naar Berend zouden rijden, maar goed.', { dur: 4 }], ['tessa', 'Droog toost.', { kind: 'punch', dur: 1.2 }], ['tammo', 'Ja.', { dur: 1 }], ['tessa', 'Rijden.', { dur: 1 }]]);
  const kopie = JSON.stringify(lines.map((l) => [l.text, l.at, l.dur]));
  const d = directDialogue({ actors: DUO, lines });
  ok(d.humor.length === 1 && d.humor[0].label === 'humor-review' && d.humor[0].line === 1, 'een punch krijgt alleen het label humor-review');
  ok(JSON.stringify(lines.map((l) => [l.text, l.at, l.dur])) === kopie, 'de tekst en de timing van een grap worden nooit aangeraakt');
  ok(d.stats.reactions === 1, 'na de punch is er ruimte: een reactie van de luisteraar');
  const t = d.shots.map((s) => num(s.t, lines));
  const rIdx = d.shots.findIndex((s) => s.shot === 'push' && s.target === 'tammo@1.5' && s.d0 === 3);
  ok(rIdx >= 0 && (t[rIdx + 1] || 99) - t[rIdx] >= 1.2, 'de reactie na de punch blijft minstens 1,2 s staan', JSON.stringify(t));
  ok(directDialogue({ actors: DUO, lines: mk([['tammo', 'Een grap.', { humor: true }], ['tessa', 'Ja.']]) }).humor.length === 1, 'een humorvlag op een regel geeft ook het label');
}

// ---- duur en volgorde -----------------------------------------------------------------------------------------------------------------------
{
  const korte = mk([['tammo', 'Ja.', { dur: 0.6 }], ['tessa', 'Nee.', { dur: 0.6 }], ['tammo', 'Ja.', { dur: 0.6 }], ['tessa', 'Nee.', { dur: 0.6 }], ['tammo', 'Ja!', { dur: 0.6 }], ['tessa', 'Nee!', { dur: 0.6 }]]);
  const d = directDialogue({ actors: DUO, lines: korte });
  const t = d.shots.map((s) => num(s.t, korte));
  ok(t.every((x, i) => i === 0 || x - t[i - 1] >= MIN_SHOT - 1e-6), 'geen shot is korter dan de minimale duur', JSON.stringify(t));
  ok(t.every((x, i) => i === 0 || x > t[i - 1]), 'de tijden stijgen strikt');
  ok(d.notes.length > 0, 'weggelaten shots worden in de notities verklaard');
  const lang = mk([['tammo', 'Een heel lang verhaal dat maar doorgaat en doorgaat zonder dat er iemand iets tussendoor zegt.', { dur: 16 }], ['tessa', 'Ja.']]);
  const d2 = directDialogue({ actors: DUO, lines: lang });
  const t2 = d2.shots.map((s) => num(s.t, lang));
  ok(t2.every((x, i) => i === 0 || x - t2[i - 1] <= MAX_HOLD + 1e-6) || d2.shots.some((s) => s.shot === 'push'), 'een lange beurt blijft niet in één stilstaand shot', JSON.stringify(t2));
  ok(directDialogue({ lines: [] }).shots.length === 0, 'geen regels, geen shots');
  const wide = directDialogue({ actors: DUO, lines: GESPREK, wide: { from: [-5, 4, 3], to: [-3, 3, 2.2], look: 'mid:tammo,tessa@1.2', fov: 48 } });
  ok(wide.shots[0].shot === 'dolly' && wide.shots[0].t === 0, 'met een wide opent de scène op de establishing dolly');
  ok(EMOTIONS.length === 7 && KINDS.length === 5, 'de emoties en soorten regels staan vast');
}

// ---- een gegenereerde scène voldoet aan de linter --------------------------------------------------------------------------------------
{
  const lijn = [['Tammo', 'Goedemorgen.'], ['Anita', 'Morgen. Heb je geslapen?'], ['Tammo', 'Nee. Ik moet je iets zeggen.'], ['Anita', 'Zeg het maar.'], ['Tammo', 'Ik heb gelogen over de auto.', { kind: 'confession', dur: 3.6 }], ['Anita', 'Dat wist ik al.'], ['Tammo', 'Wat?!'], ['Anita', 'Koffie?']];
  let t = 0.6;
  const lines = lijn.map(([speaker, text, o = {}]) => { const dur = o.dur || 2.6; const l = { speaker, text, at: t, dur, channel: 'stem', key: speaker === 'Tammo' ? 'T' : 'A', voiceDur: 0 }; t += dur + 0.1; return l; });
  const spec = {
    cast: {}, props: {},
    direct: { lines: [{ on: 4, kind: 'confession', emotion: 'sad' }, { on: 6, emotion: 'shock' }, { on: 7, kind: 'punch' }] },
  };
  const def = missionScene('direct-test', lines, { looks: {}, spec });
  ok(def && def.shots.length >= 5, 'missionScene bouwt een scène met direct', def ? String(def.shots.length) : 'null');
  ok(def.humor && def.humor.length === 1 && def.humor[0].label === 'humor-review', 'de scène draagt het humorlabel');
  const duration = lines[lines.length - 1].at + lines[lines.length - 1].dur + 1;
  const issues = validateScene(def, { lines, duration });
  ok(!issues.length, 'de gegenereerde scène valideert', issues.join('; ').slice(0, 200));
  const scene = compileScene(def, { lines, duration });
  const unit = { id: 'direct-test', group: 'Test', kind: 'staged', act: 1, lines, def, scene, duration, rhythm: null, status: 'ok', issues: [], footOf: propFoot };
  const v = lintUnit(unit, { speakers: { T: {}, A: {} }, npc: {} });
  ok(!v.some((x) => x.ernst === 'blokkerend'), 'de gegenereerde scène heeft geen blokkerende lintvondst', JSON.stringify(v.filter((x) => x.ernst === 'blokkerend').map((x) => x.regel + ' ' + x.bericht)));
  ok(!v.some((x) => x.regel === 'CS-C06'), 'de gegenereerde scène springt niet over de as');
  ok(!v.some((x) => x.regel === 'CS-C05'), 'de sprekers zijn in beeld');
}

// ---- opt-in: bestaande scènes blijven ongemoeid -----------------------------------------------------------------------------------------------
{
  const specs = { ...SPECS, ...MORE_SPECS };
  ok(Object.keys(specs).length > 90 && Object.values(specs).every((s) => !s.direct), 'geen enkele bestaande scène gebruikt direct (opt-in, geen bestaande regie herschreven)');
}

console.log(fails ? `${fails} van ${n} cutdirector-controles falen` : `cutdirector_test: ${n} controles ok`);
process.exit(fails ? 1 : 0);
