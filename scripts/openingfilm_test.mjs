// De opening als filmdata (game/js/openingfilm.js): shotlijst tegen de regie-bijbel, regels tegen de tekstregels van de cutscene-linter,
// de regie-engine op de keukenscène, het introductieprotocol (nul context), Samen spelen en toegankelijkheid.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SCENES, SHOTS, LINES, NAME_CARDS, MUSIC, TITLE, MULTIPLAYER, ACCESS, GRADES, validateOpening, openingDuration, kitchenDirection, skipHint, OPENING_RANGE } from '../game/js/openingfilm.js';
import { directDialogue, MIN_SHOT } from '../game/js/cutdirector.js';
import { checkText } from './lib/cutscene_lint.mjs';

// 1. de film zelf
assert.deepEqual(validateOpening(), [], validateOpening().join('; '));
const d = openingDuration();
assert.ok(d >= OPENING_RANGE[0] && d <= OPENING_RANGE[1], `duur ${d}`);
assert.deepEqual(SCENES.map((s) => s.id), ['C00.1', 'C00.2', 'C00.3'], 'scene-id’s volgen 09-script-akte1.md');
for (const sc of SCENES) assert.ok(GRADES[sc.grade], sc.id);
// de dag heeft ritme: goud, ochtend, dag, in die volgorde, en nooit winter of nacht
const clocks = SCENES.map((s) => GRADES[s.grade].clock[0]);
assert.ok(clocks.every((c, i) => i === 0 || c > clocks[i - 1]), 'het dagritme loopt op');
assert.ok(Object.values(GRADES).every((g) => ['helder', 'mist'].includes(g.weather)), 'altijd zomer (R-17)');

// 2. tekst: de regels van de linter (merken, winter, “de Grunn”, leessnelheid, beurtlengte)
const unit = { id: 'C00', kind: 'opening', lines: LINES.map((l) => ({ speaker: l.speaker, key: l.who, text: l.text, channel: l.channel || '', voiceDur: l.voice === 'behouden' ? l.dur : null, hasVoice: l.voice === 'behouden', textOnly: l.voice === 'nieuw' })) };
const findings = checkText(unit, {}).filter((f) => f.ernst === 'blokkerend');
assert.deepEqual(findings.map((f) => f.tekst || f.uitleg || JSON.stringify(f)), [], 'blokkerende tekstvondsten');
// de opening gebruikt de nieuwe kern en de nieuwe slogan; geen snackwagen als belofte op de titelkaart
assert.equal(TITLE.tagline, 'Ontdek jezelf in Grunn.');
assert.ok(!/frietwagen|snack|eierbal/i.test(JSON.stringify(TITLE)), 'de titelkaart belooft geen snackwagen');
assert.ok(!/de grunn/i.test(JSON.stringify([LINES, TITLE])));

// 3. introductieprotocol voor iemand met nul context: twee namen, één hint van de tegenstander, geen uitleg door radio
const spoken = new Set(LINES.filter((l) => !l.channel).map((l) => l.who));
assert.deepEqual([...spoken].sort(), ['anita', 'tammo'], 'alleen Tammo en Tessa spreken in beeld');
assert.ok(NAME_CARDS.tammo && NAME_CARDS.tessa && Object.keys(NAME_CARDS).length === 2, 'twee naamkaarten, geen derde');
const jelle = LINES.filter((l) => /colbert/.test(l.text));
assert.equal(jelle.length, 1, 'de tegenstander is één hint (een Fries in een blauw colbert), nog zonder naam');
assert.ok(!LINES.some((l) => /Jelle|Terpstra/.test(l.text)), 'Jelle wordt in de opening niet bij naam genoemd');
assert.ok(LINES.filter((l) => /duif|duiven/i.test(l.text)).length === 0 && SHOTS.some((s) => /duif|duiven/.test(s.cam)), 'Tammo’s duiven zijn beeld, geen uitleg');
// thema “plek in de wereld / niet kwijtraken” staat in de tekst
assert.ok(LINES.some((l) => /Wij niet/.test(l.text)) && LINES.some((l) => /Samen/.test(l.text)));

// 4. de regie-engine op de keukenscène: geen shot korter dan MIN_SHOT, een close-up op de bekentenis, een reactie na de grap
const dir = directDialogue(kitchenDirection());
assert.ok(dir.stats.shots >= 8, `de keuken heeft ${dir.stats.shots} shots`);
assert.ok(dir.stats.closeUps >= 2 && dir.stats.reactions >= 2, 'close-ups en reacties');
assert.ok(dir.humor.length >= 2 && dir.humor.every((h) => h.label === 'humor-review'), 'de grappen krijgen alleen ruimte en het label humor-review');
assert.ok(MIN_SHOT >= 1.2);
const keuken = kitchenDirection().lines;
assert.ok(keuken.every((l, i) => i === 0 || l.at >= keuken[i - 1].at + keuken[i - 1].dur - 0.05), 'keukenregels overlappen niet');

// 5. muziek: elke cue staat in de shotlijst of de regels; geluiden zijn namen (de sfxmap koppelt ze later)
const cues = new Set(SHOTS.map((s) => s.cue).filter(Boolean));
for (const m of MUSIC) if (m.at >= 3) assert.ok(cues.has(m.cue) || /sting|stilte|hint/.test(m.cue), `muziekcue ${m.cue} hoort bij geen shot`);
for (const s of SHOTS) if (s.sfx) assert.match(s.sfx, /^[a-z-]+$/, `geluidsnaam ${s.sfx}`);

// 6. Samen spelen en toegankelijkheid
assert.equal(MULTIPLAYER.mode, 'local');
assert.equal(MULTIPLAYER.gatesOthers, false, 'overslaan houdt niemand anders op');
assert.equal(ACCESS.flashes, false);
assert.equal(ACCESS.subtitlesAlways, true);
assert.match(skipHint().text, /\{SPATIE\}/, 'de overslaan-hint noemt de toets in de knop (DS3)');

// 7. nieuwe regels: de verhaal-lead neemt ze over in het script (scene-id's C00.x); het filmscript noemt ze als [NIEUW] voor de TTS-ronde
const doc = fs.readFileSync(new URL('../docs/verhaal/OPENING-FILMSCRIPT-21-11.md', import.meta.url), 'utf8');
for (const l of LINES) assert.ok(doc.includes(l.text), `het filmscript mist de regel ${l.id}`);
for (const sc of SCENES) assert.ok(doc.includes(sc.id));

// 8. de titelkaart komt uit de data (intromontage.js leest hem hier)
const im = fs.readFileSync(new URL('../game/js/intromontage.js', import.meta.url), 'utf8');
assert.ok(im.includes("from './openingfilm.js'") && im.includes('TITLE.tagline'), 'intromontage.js leest de titelkaart uit openingfilm.js');
console.log(`openingfilm_test: ok (${d.toFixed(1)} s, ${SHOTS.length} vaste shots, keuken ${dir.stats.shots} geregisseerde shots)`);
