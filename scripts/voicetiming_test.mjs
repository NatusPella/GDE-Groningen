// Stemtijden vóór het compileren (#731): de scène rekt op de echte voice-duren op,
// maar dat gebeurde ná cutscenehost.compileScene — shots en cues stonden dan al op de
// oude duur en liepen aan het eind uit de pas met de stem. De pure regels staan in
// game/js/voicetiming.js; cutscenehost past ze toe vóór compileScene, cinematics
// (attachVoices) gebruikt dezelfde functie. Deze test doet de regels en bewaakt de
// volgorde in de bron.
//   node scripts/voicetiming_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const V = await import(pathToFileURL(path.join(ROOT, 'game/js/voicetiming.js')).href);

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ` (${info})` : ''}`); } };
const dichtbij = (a, b) => Math.abs(a - b) < 1e-9;
// een resolver zoals lineVoiceFor: alleen voor deze woorden is er een opname
const stem = (duren) => (spreker, tekst) => (duren[tekst] ? { src: 'x/' + tekst + '.opus', dur: duren[tekst] } : null);

// 1. niets te doen: leeg, geen opnames, of geen resolver
{
  const leeg = V.plannedVoiceLines([], 5, stem({}));
  ok(leeg.changed === false && leeg.duration === 5 && leeg.lines.length === 0, 'geen regels: niets verandert');
  const geen = V.plannedVoiceLines(undefined, 5, stem({}));
  ok(geen.changed === false && geen.lines.length === 0, 'geen lijst: veilig leeg');
  const regels = [{ speaker: 'A', text: 'zonder opname', at: 1, dur: 2 }];
  const geenStem = V.plannedVoiceLines(regels, 5, stem({}));
  ok(geenStem.changed === false && geenStem.duration === 5 && geenStem.lines === regels, 'geen opname: de regels en duur blijven');
  ok(V.plannedVoiceLines(regels, 5, null).changed === false, 'zonder resolver niets plannen');
}

// 2. één opname die langer duurt dan de regel: de regel rekt op, de volgende schuift mee
{
  const regels = [
    { speaker: 'A', text: 'kort', at: 0.5, dur: 1.5 },
    { speaker: 'T', text: 'tweede', at: 2.2, dur: 2 },
  ];
  const r = V.plannedVoiceLines(regels, 6, stem({ kort: 3.1 }));
  ok(r.changed === true, 'met een opname verandert er iets');
  ok(r.lines[0].voice === 'x/kort.opus' && dichtbij(r.lines[0].vdur, 3.1), 'de opname komt op de regel');
  ok(dichtbij(r.lines[0].dur, 3.35) && dichtbij(r.lines[0].at, 0.5), 'de regel duurt zo lang als de opname + 0,25 s');
  ok(dichtbij(r.lines[1].at, 2.2 + (3.35 - 1.5)), 'de volgende regel schuift het verschil op', String(r.lines[1].at));
  ok(dichtbij(r.lines[1].dur, 2), 'een regel zonder opname houdt zijn leestijd');
  ok(dichtbij(r.duration, 6 + (3.35 - 1.5)), 'de scèneduur rekt mee', String(r.duration));
  ok(r.duration >= r.lines[1].at + r.lines[1].dur + 0.2, 'en er blijft een staart van 0,2 s');
}

// 3. twee opnamen: het verschil telt op; een eigen lange leestijd wint als die langer is
{
  const regels = [
    { speaker: 'A', text: 'een', at: 0.5, dur: 1 },
    { speaker: 'T', text: 'twee', at: 2, dur: 6 },
  ];
  const r = V.plannedVoiceLines(regels, 8, stem({ een: 2.5, twee: 1.2 }));
  ok(dichtbij(r.lines[0].dur, 2.75) && dichtbij(r.lines[1].at, 2 + 1.75), 'de eerste opname schuift de tweede op');
  ok(dichtbij(r.lines[1].dur, 6), 'de eigen leestijd (6 s) blijft als die langer is dan de opname (1,45)');
  // de duur is het grootste van (oude duur + verschil) en (laatste regel-eind + 0,2 s staart)
  ok(dichtbij(r.duration, Math.max(8 + 1.75, r.lines[1].at + r.lines[1].dur + 0.2)), 'de duur volgt het verschil én de staart', String(r.duration));
}

// 4. regels die de scène zelf inspreekt (own) of al een voice hebben, blijven staan
{
  const eigen = { speaker: 'A', text: 'zelf', at: 1, dur: 2, own: true };
  const al = { speaker: 'T', text: 'al', at: 4, dur: 2, voice: 'bestaand.opus' };
  const r = V.plannedVoiceLines([eigen, al], 8, stem({ zelf: 5, al: 5 }));
  ok(r.changed === false && r.lines[0] === eigen && r.lines[1] === al && r.duration === 8, 'own en bestaande opnames worden niet overschreven (#711)');
}

// 5. idempotent: opnieuw plannen verandert niets (attachVoices ziet dan niets te doen)
{
  const regels = [{ speaker: 'A', text: 'een', at: 0.5, dur: 1 }, { speaker: 'T', text: 'twee', at: 2.5, dur: 2 }];
  const eerste = V.plannedVoiceLines(regels, 6, stem({ een: 2.4 }));
  const tweede = V.plannedVoiceLines(eerste.lines, eerste.duration, stem({ een: 2.4 })); // dezelfde bank: niets nieuws
  ok(tweede.changed === false && tweede.duration === eerste.duration, 'een tweede ronde plant niets meer', JSON.stringify({ c: tweede.changed, d: tweede.duration }));
  ok(V.voicedDuration(regels, 6, stem({ een: 2.4 })) === eerste.duration, 'voicedDuration geeft dezelfde duur');
}

// 6. de bronvolgorde: plannen vóór compileren, en de geplande regels/duur naar het spel en het gastpakket
{
  const host = fs.readFileSync(path.join(ROOT, 'game/js/cutscenehost.js'), 'utf8');
  const iPlan = host.indexOf('const vt = plannedVoiceLines(');
  const iCompile = host.indexOf('scene = compileScene(def, { lines: sceneLines, duration: sceneDur })');
  ok(iPlan > 0 && iCompile > iPlan, 'cutscenehost plant de stemmen vóór compileScene', `${iPlan} < ${iCompile}`);
  ok(/compileScene\(def, \{ lines: sceneLines, duration: sceneDur \}\)/.test(host), 'de compilatie gebruikt de geplande regels en duur');
  ok(/\.\.\.cine, id: cine\.id \|\| def\.id, duration: sceneDur, lines: sceneLines,/.test(host), 'de cinematic speelt met dezelfde duur en regels');
  ok(/cutPakket\(\{ def, lines: sceneLines, duration: sceneDur,/.test(host), 'de gasten krijgen dezelfde geplande tijden (#711)');
  ok(/shotPoints\(scene, at, sceneDur\)/.test(host) && /resolveTime\(f\.t, sceneLines, sceneDur\)/.test(host), 'prewarm en naamkaarten gebruiken dezelfde tijden');
  const cin = fs.readFileSync(path.join(ROOT, 'game/js/cinematics.js'), 'utf8');
  ok(/export function attachVoices\(a\)/.test(cin), 'attachVoices is exporteerbaar (test en gastkant, coopcut_test)');
  ok(/const r = plannedVoiceLines\(a\.lines, a\.duration, lineVoiceFor\);/.test(cin), 'attachVoices gebruikt dezelfde pure regels (één bron)');
}

console.log(fails ? `voicetiming_test: ${fails} van ${n} mislukt` : `voicetiming_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
