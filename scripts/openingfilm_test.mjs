// De opening als film (game/js/openingfilm.js) en zijn staging (intromontage.js buildFilmShots, story.js, vlag ?openingfilm): de reeks tegen de
// regie-bijbel, de regels tegen de tekstregels van de cutscene-linter, de regie-engine op het keukengesprek, het introductieprotocol (nul context),
// Samen spelen, toegankelijkheid, en de veiligheid van de koppeling (vlag, terugval, geen flitsen, geen verwijzing naar niet-gespeelde shots).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SCENES, SEQUENCE, LINES, NAME_CARDS, MUSIC, TITLE, MULTIPLAYER, ACCESS, GRADES, FILM_VOICES, validateOpening, openingDuration, timeline, kitchenDirection, skipHint, engineLines, themeEntryShot, OPENING_RANGE } from '../game/js/openingfilm.js';
import { directDialogue, MIN_SHOT } from '../game/js/cutdirector.js';
import { checkText } from './lib/cutscene_lint.mjs';

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const im = read('../game/js/intromontage.js');
const story = read('../game/js/story.js');

// 1. de film zelf: duur (de eigenaar liet de opening langer worden: tot 240 s), reeks en regels
assert.deepEqual(validateOpening(), [], validateOpening().join('; '));
const d = openingDuration();
assert.deepEqual(OPENING_RANGE, [60, 240], 'nieuwe grens 240 s (eigenaar-besluit 21-11, "langer mag")');
assert.ok(d >= OPENING_RANGE[0] && d <= OPENING_RANGE[1], `duur ${d}`);
assert.deepEqual(SCENES.map((s) => s.id), ['C00.1', 'C00.2', 'C00.3'], 'scene-id’s volgen 09-script-akte1.md');
assert.ok(SEQUENCE.every((s) => SCENES.some((c) => c.id === s.scene)));
for (const sc of SCENES) assert.ok(GRADES[sc.grade], sc.id);
const clocks = SCENES.map((s) => GRADES[s.grade].clock[0]);
assert.ok(clocks.every((c, i) => i === 0 || c > clocks[i - 1]), 'het dagritme loopt op');
assert.ok(Object.values(GRADES).every((g) => ['helder', 'mist'].includes(g.weather)), 'altijd zomer (R-17)');
// de tijdlijn: de shots sluiten op elkaar aan en de film eindigt met de titelkaart en de zweefvlucht
const tl = timeline();
assert.ok(tl.every((r, i) => i === 0 || Math.abs(r.t - (tl[i - 1].t + tl[i - 1].dur)) < 0.15));
assert.equal(SEQUENCE[SEQUENCE.length - 1].id, 'c3-zweef', 'de film eindigt met de zweefvlucht naar de speler, zodat het spel niet op zwart begint');
// AAA30 regie (28-11): eerst de stad (kraan, daken, plantsoen, fietsen, meeuw), dan de titelkaart, dan pas de mensen
const ids = SEQUENCE.map((s) => s.id);
assert.deepEqual(ids.slice(0, 8), ['c1-zwart', 'c1-markt', 'c1-daken', 'c1-plein', 'c1-fietsen', 'c1-meeuw', 'c1-titel', 'c1-duiven'], 'de opening begint met establishing shots en de titelkaart voor Tammo');
assert.ok(SEQUENCE.filter((s) => s.establishing && s.scene === 'C00.1').length >= 3, 'minstens drie establishing shots in de koude opening');
assert.ok(!ids.includes('c3-titel'), 'de titelkaart staat vooraan (c1-titel)');

// 2. tekst: de regels van de linter (merken, winter, “de Grunn”, leessnelheid, beurtlengte)
const unit = { id: 'C00', kind: 'opening', lines: LINES.map((l) => ({ speaker: l.speaker, key: l.who, text: l.text, channel: l.channel || '', voiceDur: l.voice === 'behouden' ? Math.max(1.6, l.text.length / 14) : null, hasVoice: l.voice === 'behouden', textOnly: l.voice === 'nieuw' })) };
assert.deepEqual(checkText(unit, {}).filter((f) => f.ernst === 'blokkerend').map((f) => JSON.stringify(f)), [], 'blokkerende tekstvondsten');
assert.equal(TITLE.tagline, 'Een zomer in Grunn. Kon minder.');
assert.ok(!/frietwagen|snack|eierbal/i.test(JSON.stringify(TITLE)), 'de titelkaart belooft geen snackwagen');
assert.ok(!/de grunn/i.test(JSON.stringify([LINES, TITLE])));
assert.ok(!/Fjord Frituur/.test(JSON.stringify([LINES, TITLE, SEQUENCE])), 'de naam Fjord Frituur is weg (eigenaar 21-11)');
assert.ok(!/TAM & TES/.test(JSON.stringify([TITLE, LINES])), 'TAM & TES staat alleen als belettering in beeld, niet in titel, slogan of tekst');
// de regels zijn die van de verhaal-lead (09-script-akte1.md, C00.2 en C00.3), in volgorde van deze film: nieuwe tekst alleen waar het script hem niet heeft
const script = read('../docs/verhaal/nieuw/09-script-akte1.md');
const norm = (t) => t.replace(/[“”"]/g, '"');
const scriptText = norm(script);
// L15 is door de eigenaar-besluiten van 21-11 (de naam Fjord Frituur verdwijnt) afgeweken van het script; de verhaal-lead neemt hem over
const fromScript = LINES.filter((l) => l.scene !== 'C00.1' && !['L15', 'L29', 'L30'].includes(l.id));
for (const l of fromScript) assert.ok(scriptText.includes(norm(l.text)), `de regel ${l.id} staat niet in 09-script-akte1.md: ${l.text}`);
assert.ok(scriptText.includes('Een luisteraar meldt een Fries in een blauw colbert'), 'de Jelle-hint staat ook in het script van de verhaal-lead');

// 3. introductieprotocol voor iemand met nul context
const spokenOnScreen = new Set(LINES.filter((l) => !l.channel).map((l) => l.who));
assert.deepEqual([...spokenOnScreen].sort(), ['anita', 'tammo'], 'alleen Tammo en Tessa spreken in beeld');
assert.ok(NAME_CARDS.tammo && NAME_CARDS.tessa && Object.keys(NAME_CARDS).length === 2, 'twee naamkaarten, geen derde');
assert.ok(!LINES.some((l) => /Jelle|Terpstra/.test(l.text)), 'Jelle wordt in de opening niet bij naam genoemd');
assert.ok(SEQUENCE.some((s) => /duiven/.test(s.cam)) && !LINES.some((l) => /duif|duiven/i.test(l.text)), 'Tammo’s duiven zijn beeld, geen uitleg');
assert.ok(LINES.some((l) => /Wij niet/.test(l.text)) && LINES.some((l) => /Samen/.test(l.text)), 'het thema: samen blijven');
assert.ok(LINES.some((l) => /honderdvijftig euro/.test(l.text)) && LINES.some((l) => /wedstrijd/.test(l.text)), 'wat ze eerst moeten doen is gezegd (aansluiting op M01)');
// per scène hoogstens drie sprekers (R-20)
for (const sc of SCENES) assert.ok(new Set(LINES.filter((l) => l.scene === sc.id).map((l) => l.who)).size <= 3, sc.id);

// 4. de regie-engine op het keukengesprek (de cutscene-weg): geen shot korter dan MIN_SHOT, close-ups en reacties, humor krijgt alleen ruimte
const dir = directDialogue(kitchenDirection());
assert.ok(dir.stats.shots >= 10, `de keuken heeft ${dir.stats.shots} geregisseerde shots`);
assert.ok(dir.stats.closeUps >= 3 && dir.stats.reactions >= 3, 'close-ups en reacties');
assert.ok(dir.humor.length >= 2 && dir.humor.every((h) => h.label === 'humor-review'));
assert.ok(MIN_SHOT >= 1.2);

// 5. muziek en geluid
for (const m of MUSIC) assert.ok(SEQUENCE.some((s) => s.id === m.shot), `muziekcue ${m.cue}`);
for (const s of SEQUENCE) if (s.sfx) assert.match(s.sfx, /^[a-z-]+$/, `geluidsnaam ${s.sfx}`);
assert.ok(fs.existsSync(new URL('../game/' + FILM_VOICES['Rikus|Augustus. In Grunn heet dat zomer.'].src, import.meta.url)), 'de opname van Rikus’ eerste regel bestaat');

// 6. Samen spelen en toegankelijkheid
assert.equal(MULTIPLAYER.mode, 'local');
assert.equal(MULTIPLAYER.gatesOthers, false, 'overslaan houdt niemand anders op');
assert.equal(ACCESS.flashes, false);
assert.equal(ACCESS.subtitlesAlways, true);
assert.match(skipHint().text, /\{SPATIE\}/, 'de overslaan-hint noemt de toets in de knop (DS3)');
assert.match(im, /prefers-reduced-motion: reduce\) \{ #intro-montage \.im-card\.on \{ animation-name: im-card-fade/, 'reduced motion: de titelkaart fadet');

// 7. de staging: de reeks in intromontage.js is dezelfde als SEQUENCE (volgorde en aantal), elke shot komt uit zijn builder
const filmBlock = im.slice(im.indexOf('// --- THE FILM'));
const baseIds = [...filmBlock.matchAll(/base\('([a-z0-9-]+)'/g)].map((m) => m[1]);
assert.deepEqual([...new Set(baseIds)], SEQUENCE.map((s) => s.id), 'elke shot van de reeks wordt gebouwd, in de volgorde van de reeks');
const ret = /return \[(fBlack[^\]]+)\];/.exec(filmBlock);
assert.ok(ret, 'de lijst die buildFilmShots teruggeeft ontbreekt');
assert.equal(ret[1].split(',').length, SEQUENCE.length, 'evenveel shots als de reeks');
// een nieuwe shot leest nooit de .timed van een oude shot (die staat niet in de lijst: dat gaf een TypeError)
assert.ok(!/\b(dawn|kitchenIn|kitchenCar|liefste|huur|radioTip|verhuis|tammoCard)\.timed\b/.test(filmBlock), 'geen verwijzing naar de .timed van een oude shot');
// geen vaste kleurcodes in de nieuwe code (de ds3-ratel telt ze)
assert.ok(!/'#[0-9a-fA-F]{6}'/.test(filmBlock), 'geen #hexkleur in de filmcode');
// geen flitsen en geen sluiterklik in de film
assert.match(im, /if \(!r\.film && \(!prev \|\| !prev\.black\)\) flash\(\);/);
assert.match(im, /if \(!r\.film\) sfx\(w, 'camera_shutter'/);
// de camera's van de keuken blijven aan één kant van de as (180 graden, R-04): alle over-de-schouder-standen hebben v = -0,32
assert.match(filmBlock, /camAnita = .*K\(1\.4, -0\.32, 1\.3\)/);
assert.match(filmBlock, /camTammo = .*K\(-1\.4, -0\.32, 1\.3\)/);

// 8. veiligheid: vlag, terugval bij een fout, het oude pad blijft
const flags = read('../game/js/devflags.js');
assert.ok(flags.includes("openingfilm: has('openingfilm') || (!has('oudeopening') && !STORY_TEST && !AUTOPLAY)"), 'de film is de standaard, behalve met ?oudeopening of in een storytest/autoplay-run');
assert.ok(flags.includes("oudeopening: 'Speel de oude opening"));
assert.match(read('../docs/ONTWIKKELEN.md'), /\| `\?openingfilm` \|/);
assert.match(story, /if \(FLAGS\.openingfilm && acts\.length === 3\)/);
assert.match(story, /playOpeningFilm\(world/);
assert.match(story, /if \(failed\) \{ if \(!playOld\(\)\) openingKlaar\(\); \}/, 'een fout tijdens de film start de oude opening');
assert.match(story, /if \(!ok && !playOld\(\)\) openingKlaar\(\);/, 'kan de film niet starten, dan de oude opening');
assert.match(story, /\.catch\(\(e\) => \{ console\.warn\('opening-film', e\); if \(!playOld\(\)\) openingKlaar\(\); \}\);/);
assert.match(story, /return playOld\(\);/, 'zonder vlag speelt het spel precies zijn oude opening');
assert.match(im, /try \{ alle = buildShots\(w, film\); \} catch/, 'bouwen van de film faalt veilig');
assert.match(im, /setTimeout\(\(\) => skipCinematic\(\), 0\)/, 'een speelfout stopt de film');
assert.ok(im.includes("buildShots(w, film = false)") || im.includes('function buildShots(w, film = false)'));
// de oude opening is ongemoeid: de oude lijst staat er nog en de titelkaart komt uit de data
assert.match(im, /const OLD = \[\s*sun, bikes, gull, boat, anitaCard, tammoCard, pigeon, limo, tanker, heli, title,/);
assert.ok(im.includes('TITLE.tagline'));
// de muziek: de film opent in stilte (straatgeluid, Rikus); het thema valt in op de eerste kraanshot (cue thema-in), niet bij het openen van de film
assert.equal(themeEntryShot(), 'c1-markt');
assert.ok(SEQUENCE.findIndex((s) => s.id === themeEntryShot()) > SEQUENCE.findIndex((s) => s.id === 'c1-zwart'), 'het thema valt na de koude opening');
assert.ok(im.includes('if (!r.offset && !film) cueTheme(0);'), 'de film start zijn thema niet bij het openen');
assert.ok(im.includes('if (r.film && !r.themeOn && shot.filmId && shot.filmId === themeEntryShot()) { r.themeOn = true; cueTheme(0); }'), 'het thema valt in op de thema-in-shot, één keer');
assert.ok(im.includes('return { filmId: id, minDur: e.minDur'), 'elke filmshot kent zijn id uit de reeks');
// de engine-regels van een shot komen uit de reeks
assert.deepEqual(engineLines('c2-bank').map((l) => l[0]), ['T', 'A']);
assert.equal(engineLines('c3-geld').length, 4);
// #1341: een vastgehouden toets slaat hooguit één film over. De herhaling van een keydown start geen nieuwe hold, en na het overslaan blijft
// de spatie "ingeslikt" tot hij losgelaten is: de volgende film (de eerste missiescène) ziet de nog vastgehouden toets niet als nieuw overslaan.
{
  const { cutsceneTakesSpace } = await import('../game/js/spacegate.js');
  assert.equal(cutsceneTakesSpace({ skippable: true }, { repeat: true }), false, 'een keydown-herhaling is geen overslaan');
  assert.equal(cutsceneTakesSpace({ skippable: true }, { repeat: false }), true);
  const cine = read('../game/js/cinematics.js');
  const rs = cine.indexOf('function resetSkip()');
  const reset = cine.slice(rs, cine.indexOf('}', cine.indexOf('skipShown = -1', rs)));
  assert.ok(rs > 0 && !reset.includes('swallowSpace'), 'resetSkip laat de ingeslikte spatie staan tot de keyup');
  assert.ok(cine.includes('if (swallowSpace) { e.preventDefault(); e.stopImmediatePropagation(); return; }'), 'een nog vastgehouden spatie start geen tweede hold');
  const ku = cine.indexOf("addEventListener('keyup'");
  assert.ok(ku > 0 && cine.slice(ku, ku + 200).includes('swallowSpace = false'), 'pas de keyup geeft de spatie weer vrij');
  assert.ok(story.includes('Skipping (hold Space) ends the whole opening'), 'overslaan beëindigt de hele opening, niet één act');
  assert.ok(story.includes('if (failed) { if (!playOld()) openingKlaar(); } else openingKlaar();'), 'de film eindigt (overgeslagen of niet) in één openingKlaar');
}
console.log(`openingfilm_test: ok (geschat ${d.toFixed(1)} s, ${SEQUENCE.length} geënsceneerde shots, keuken ${dir.stats.shots} geregisseerde shots)`);
