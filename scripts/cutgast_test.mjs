// #724: de gast-kant van een scriptscène. Het pakket gaat door de echte codec en komt heel aan
// (inclusief own/clue/card/radio/voice), de gast krijgt dezelfde regels en duur, en de scène die
// playScript(replay:true) bij hem bouwt levert geldige frames: cutscript.js is puur, dus dat kan
// zonder Electron of DOM. Wat hier niet in zit: het echte playScript/three-pad in het spel (dat
// dekt de testbank met een gast; zie docs/COOP-TESTBANK.md).
//   node scripts/cutgast_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cutPakket, cutStukken, nieuwCutVerzamelaar, leesCutPakket, cutsceneScene, gastCine } from '../game/js/coopcut.js';
import { compileScene, shotPoints } from '../game/js/cutscript.js';
import { openingActs } from '../game/js/cutscenes.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } };
const bron = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
const finite = (v) => Number.isFinite(v);

// Een openingsact met de lastige regels: own (de scène speelt de stem zelf), clue, card, radio en voice.
const lines = [];
for (let i = 0; i < 18; i++) {
  lines.push({ speaker: i % 2 ? 'Tessa' : 'Tammo', text: 'Dit is regel ' + i + ' van de opening, lang genoeg voor de ondertitel.', at: 1 + i * 2.5, dur: 2.2,
    ...(i === 2 ? { own: true, voice: 'audio/voicelines/story/a.ogg' } : {}),
    ...(i === 5 ? { own: true, voice: 'audio/voicelines/story/c.ogg' } : {}),
    ...(i === 4 ? { clue: true, card: 'Tessa' } : {}),
    ...(i === 6 ? { radio: true } : {}),
    ...(i % 3 === 0 ? { voice: 'audio/voicelines/story/b.ogg' } : {}) });
}
const acts = openingActs(lines);
const ROLE = { character: 'anita' }; // de gast speelt Tessa; de scène vraagt Tammo

t('#724: het pakket komt door de echte codec heel aan, met own/clue/card/radio/voice en dezelfde duur', () => {
  const act = acts[1];
  const pakket = cutPakket({ def: act.def, lines: act.lines, duration: act.duration, anchor: { x: 10.5, y: -4, facing: 1.2, z: 0.1 }, cine: { id: 'opening', title: 'Kop' }, rol: 'tammo' });
  const verzamelaar = nieuwCutVerzamelaar();
  let gast = null;
  for (const stuk of cutStukken(7, pakket)) gast = verzamelaar.voegToe(JSON.parse(JSON.stringify(stuk))) || gast;
  assert.ok(gast, 'het pakket is niet compleet aangekomen');
  assert.equal(gast.duration, pakket.duration, 'de duur is gelijk');
  assert.deepEqual(gast.lines, pakket.lines, 'de regels zijn gelijk, flags en opnames inbegrepen');
  assert.deepEqual(gast.anchor, pakket.anchor, 'het anker is gelijk');
  assert.equal(gast.cine.id, 'opening');
  assert.equal(gast.rol, 'tammo', 'de verhaalrol gaat mee');
  const eigen = gast.lines.filter((l) => l.own);
  assert.ok(eigen.length >= 1 && eigen.every((l) => l.voice), 'own-regels houden hun eigen opname');
  assert.ok(gast.lines.some((l) => l.clue && l.card === 'Tessa'), 'clue en naamkaart komen mee');
  assert.ok(gast.lines.some((l) => l.radio), 'radio komt mee');
});

t('#724: de gastscène (playScript replay) bouwt dezelfde regels en levert geldige frames', () => {
  // de eerste act is de korte scène waarvan de regie alleen naar de eigen drie regels verwijst:
  // daarmee kan compileScene de gast-kant zuiver doorrekenen (de tweede act verwijst naar de latere regels).
  const act = acts[0];
  const pakket = cutPakket({ def: act.def, lines: act.lines, duration: act.duration, anchor: { x: 10.5, y: -4, facing: 1.2, z: 0.1 }, cine: { id: 'opening' }, rol: 'tammo' });
  const gast = leesCutPakket(JSON.parse(JSON.stringify(pakket)), 12);
  assert.ok(gast && gast.duration === pakket.duration && gast.lines.length === pakket.lines.length, 'de gast leest het pakket');
  // cutGastSpeel bouwt de scène met precies deze regels/duur; compileScene is de pure kant daarvan.
  const scène = compileScene(gast.def, { lines: gast.lines, duration: gast.duration });
  const anchor = { x: 10.5, y: -4, facing: 1.2, z: 0.1 };
  const env = { solid: () => false };
  let frames = 0;
  for (let k = 0; k <= 20; k++) {
    const tt = (gast.duration * k) / 20;
    const f = scène.sample(tt, anchor, env);
    assert.ok(f && f.camera && f.camera.position && f.camera.lookAt, `frame ${tt}: geen camera`);
    for (const v of [f.camera.position.x, f.camera.position.y, f.camera.position.z, f.camera.lookAt.x, f.camera.lookAt.y, f.camera.lookAt.z]) assert.ok(finite(v), `frame ${tt}: camera niet eindig`);
    for (const [id, a] of Object.entries(f.actors || {})) assert.ok(a && finite(a.x) && finite(a.y), `frame ${tt}: acteur ${id} niet eindig`);
    for (const [id, p] of Object.entries(f.props || {})) assert.ok(p && finite(p.x) && finite(p.y), `frame ${tt}: prop ${id} niet eindig`);
    if (f.speaker != null) assert.equal(typeof f.speaker, 'string', `frame ${tt}: spreker`);
    frames++;
  }
  assert.equal(frames, 21);
  const punten = shotPoints(scène, anchor, gast.duration, 1);
  assert.ok(punten.length >= 3 && punten.every((q) => finite(q.x) && finite(q.y)), 'de camerabaan is eindig');
});

t('#724: de gast speelt de scène als replay (geen host-boekhouding) met dezelfde rolverdeling', () => {
  const act = acts[1];
  const pakket = cutPakket({ def: act.def, lines: act.lines, duration: act.duration, anchor: null, cine: { id: 'opening' }, rol: 'tammo' });
  const gast = leesCutPakket(pakket, 3);
  const scène = cutsceneScene(gast, ROLE, gast.def);
  assert.equal(scène.hoofdrol, 'tammo', 'de scène vraagt Tammo als hoofdrol');
  assert.equal(scène.eigen, 'anita', 'de gast is Tessa');
  assert.ok(scène.tijdelijk, 'tijdelijk een andere rol');
  assert.equal(scène.metgezel, 'anita', 'de metgezel is de andere verhaalrol van de hoofdrol');
  assert.ok(scène.verdeling && typeof scène.verdeling.perActeur === 'object', 'de rolverdeling komt mee');
  // het gastkanaal: een replay-scène heeft een cutId en stuurt het tempo van de gastheer
  const cine = gastCine(gast, () => {});
  assert.equal(cine.cutId, gast.id, 'de gastcine kent het scènenummer');
  assert.equal(cine.skippable, true);
  assert.equal(typeof cine.onEnd, 'function');
});

t('#724: cutGastSpeel speelt de scène echt als replay af (bronbewaking)', () => {
  const coop = bron('coopcut.js');
  const gast = coop.slice(coop.indexOf('export async function cutGastSpeel'));
  assert.match(gast, /replay: true/, 'cutGastSpeel vraagt playScript om een replay');
  assert.match(gast, /lines: p\.lines, duration: p\.duration, anchor: p\.anchor/, 'dezelfde regels, duur en anker als de gastheer');
  assert.match(gast, /cine: gastCine\(p, klaar\)/, 'de gastcine met cutId');
  const host = bron('cutscenehost.js');
  assert.match(host, /lineCards = replay \? \(sceneLines \|\| \[\]\)\.filter\(\(l\) => l && l\.card\)/, 'naamkaarten van regels alleen bij de replay');
  assert.match(host, /if \(replay\) cutGastTik\(w, cine\.cutId, t, STEL\); else cutHostTik\(w, cutId, t\)/, 'de replay stuurt geen hostberichten');
});

console.log(`cutgast_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);

