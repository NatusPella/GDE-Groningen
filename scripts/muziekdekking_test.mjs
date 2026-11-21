// De muzieklijst (docs/verhaal/MUZIEKLIJST-21-11.md) tegen de code en de bestanden:
// - elke cue met status "bestaat" heeft een koppeling die klopt (bestand op schijf, sleutel in de code);
// - elke scenario-sleutel en elke beschikbare missiesfeer staat in de lijst;
// - de artiesten, de zendernamen, de jingles en de radioreclames bevatten geen echte merken of artiesten.
// Geen audio nodig en niets wordt beluisterd. Draai: node scripts/muziekdekking_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SFEER_BESTAND, BESCHIKBARE_SFEREN, MISSIE_EIGEN_MUZIEK, BIJBAAN_EIGEN_MUZIEK } from '../game/js/missiesfeer.js';
import { PROGRAMMES, STATION_NAME } from '../game/js/musicpick.js';
import { RADIO_ADS } from '../game/js/radioads.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const bestaat = (f) => fs.existsSync(path.join(ROOT, f));

let n = 0;
const ok = (c, m) => { n++; if (!c) { console.log('FAIL ' + m); process.exitCode = 1; } };

// --- de lijst lezen -------------------------------------------------------------------------
const doc = lees('docs/verhaal/MUZIEKLIJST-21-11.md');
const cues = [];
for (const regel of doc.split(/\r?\n/)) {
  if (!/^\| C\d+ \|/.test(regel)) continue;
  const c = regel.split('|').slice(1, -1).map((x) => x.trim());
  cues.push({ id: c[0], moment: c[1], lus: c[6], naam: c[7], status: c[8], koppeling: c[9] });
}
ok(cues.length >= 60, `de lijst heeft minstens 60 cues (gevonden ${cues.length})`);
ok(new Set(cues.map((c) => c.id)).size === cues.length, 'elke cue-ID komt één keer voor');

// --- de code lezen --------------------------------------------------------------------------
const scenarioBron = lees('game/js/audio/scenario.js');
const vast = {};
for (const m of scenarioBron.matchAll(/^\s+(\w+): '\.\/audio\/scenario\/([\w.-]+\.mp3)'/gm)) vast[m[1]] = m[2];
ok(Object.keys(vast).length >= 10, 'SCENARIO_TRACKS gelezen');

const manifest = JSON.parse(lees('game/audio/gmusic/manifest.json'));
const gmusicBestanden = manifest.tracks.map((t) => (typeof t === 'string' ? t : t.file));

const gebruikteSferen = new Set([...MISSIE_EIGEN_MUZIEK.map((e) => e.sfeer), ...Object.values(BIJBAAN_EIGEN_MUZIEK)]);

// --- per cue ---------------------------------------------------------------------------------
const STATUS = ['bestaat', 'te koppelen', 'ontbreekt'];
for (const c of cues) {
  ok(STATUS.includes(c.status), `${c.id}: status "${c.status}" is bestaat, te koppelen of ontbreekt`);
  ok(/ \/ /.test(c.naam) && c.naam.split(' / ').every((x) => x.trim()), `${c.id}: "Artiest / titel" is niet leeg`);
  ok(['ja', 'nee'].includes(c.lus), `${c.id}: lus is ja of nee`);
  const [soort, doel] = c.koppeling === '-' ? ['-', ''] : c.koppeling.split(/:(.*)/s);
  if (c.status === 'ontbreekt') { ok(soort === '-', `${c.id}: ontbreekt heeft geen koppeling`); continue; }
  ok(soort !== '-' || c.status === 'te koppelen', `${c.id}: bestaat heeft een koppeling`);
  if (soort === 'scenario') {
    ok(!!vast[doel], `${c.id}: scenario-sleutel ${doel} staat in SCENARIO_TRACKS`);
    ok(bestaat('game/audio/scenario/' + vast[doel]), `${c.id}: bestand van ${doel} staat op schijf`);
  } else if (soort === 'sfeer') {
    ok(!!SFEER_BESTAND[doel] && BESCHIKBARE_SFEREN.includes(doel), `${c.id}: sfeer ${doel} is beschikbaar`);
    ok(gebruikteSferen.has(doel), `${c.id}: sfeer ${doel} hangt aan een missie of bijbaan`);
    ok(bestaat('game/audio/scenario/' + SFEER_BESTAND[doel]), `${c.id}: bestand van ${doel} staat op schijf`);
  } else if (soort === 'gmusic') {
    if (doel.startsWith('jingles/')) ok(bestaat('game/audio/gmusic/' + doel), `${c.id}: jingle ${doel} staat op schijf`);
    else {
      ok(gmusicBestanden.includes(doel), `${c.id}: ${doel} staat in het manifest`);
      ok(bestaat('game/audio/gmusic/' + doel), `${c.id}: ${doel} staat op schijf`);
    }
  } else if (soort === 'theme') {
    ok(fs.readdirSync(path.join(ROOT, 'game/audio/theme')).some((f) => f.endsWith('.mp3')), `${c.id}: titelnummer staat op schijf`);
  } else if (soort !== '-') ok(false, `${c.id}: onbekende koppeling "${c.koppeling}"`);
}

// --- dekking: wat in de code staat, staat in de lijst --------------------------------------
const gekoppeld = new Set(cues.map((c) => c.koppeling));
for (const k of BESCHIKBARE_SFEREN) ok(gekoppeld.has('sfeer:' + k), `sfeer ${k} staat in de muzieklijst`);
// elke vaste scenariosleutel heeft een cue, behalve de spanningsloop (alleen op expliciet verzoek)
for (const k of Object.keys(vast)) if (!['missie'].includes(k)) ok(gekoppeld.has('scenario:' + k), `scenario-sleutel ${k} heeft een cue`);

// --- verzonnen namen -------------------------------------------------------------------------
// Een korte lijst van echte artiesten, zenders en merken die nooit in speltekst of lijst horen te staan (AGENTS.md constitution 2).
const ECHT = [
  'spotify', 'youtube', 'tiktok', 'apple music', 'netflix', 'radio 538', 'qmusic', 'q-music', 'sky radio', 'npo', 'radio 1', 'radio 2', '3fm', 'slam', 'funx', 'radio veronica',
  'rtv noord', 'omroep gelderland', 'coca', 'heineken', 'grolsch', 'albert heijn', 'jumbo', 'bol.com', 'ns ', 'arriva', 'qbuzz', 'google', 'gemini',
  'beatles', 'rolling stones', 'queen', 'abba', 'madonna', 'michael jackson', 'prince', 'beyonce', 'beyoncé', 'taylor swift', 'drake', 'eminem', 'kanye', 'rihanna', 'coldplay',
  'u2', 'metallica', 'nirvana', 'oasis', 'adele', 'ed sheeran', 'bruno mars', 'daft punk', 'kraftwerk', 'andre hazes', 'andré hazes', 'frans bauer', 'marco borsato', 'dr. dre',
  'snoop', 'jay-z', 'tiesto', 'tiësto', 'armin', 'martin garrix', 'guus meeuwis', 'de jeugd van tegenwoordig', 'doe maar', 'normaal', 'golden earring', 'blof', 'bløf', 'kane',
];
const bevatEcht = (t) => {
  const s = ' ' + String(t).toLowerCase().replace(/[^a-z0-9éë .-]+/g, ' ') + ' ';
  return ECHT.find((e) => s.includes(' ' + e.trim() + ' ') || (!/ $/.test(e) && s.includes(' ' + e + ' ')));
};
for (const c of cues) {
  const hit = bevatEcht(c.naam);
  ok(!hit, `${c.id}: artiest of titel bevat een echte naam of merk ("${hit}")`);
}
for (const naam of new Set(cues.map((c) => c.naam))) ok(cues.filter((c) => c.naam === naam).length <= 2, `"${naam}" staat hoogstens twee keer in de lijst (een slotversie of korte versie mag een eigen titel)`);

// de radio zelf: zendernaam, programma's, artiesten, jingles en reclames
ok(!bevatEcht(STATION_NAME), `zendernaam ${STATION_NAME} is verzonnen`);
for (const p of PROGRAMMES) ok(!bevatEcht(p.name + ' ' + p.sub), `programma ${p.name} is verzonnen`);
const radioBron = lees('game/js/audio/radio.js');
const artiesten = [...radioBron.matchAll(/^\s+['"][^'"]+['"]: ["']([^"']+)["'],?\s*$/gm)].map((m) => m[1]);
ok(artiesten.length >= 15, `GMUSIC_ARTISTS gelezen (${artiesten.length} artiesten)`);
for (const a of artiesten) ok(!bevatEcht(a), `radio-artiest "${a}" is verzonnen`);
const jingles = JSON.parse(lees('game/audio/gmusic/jingles/tts.json'));
for (const [sleutel, j] of Object.entries(jingles)) ok(!bevatEcht(sleutel + ' ' + (j.input || '')), `jingle "${sleutel}" is verzonnen`);
for (const ad of RADIO_ADS) ok(!bevatEcht(ad.firma + ' ' + ad.lines.join(' ')), `reclame ${ad.id} (${ad.firma}) is verzonnen`);

if (!process.exitCode) console.log(`muziekdekking_test ok: ${cues.length} cues (${cues.filter((c) => c.status === 'bestaat').length} bestaan, ${cues.filter((c) => c.status === 'te koppelen').length} te koppelen, ${cues.filter((c) => c.status === 'ontbreekt').length} ontbreken), ${n} controles`);
