// Geluidslicenties (ADR 0039): elk geluidsbestand in game/audio/sfx staat in het manifest, in docs/AUDIO-LICENTIES.md en in de
// credits van het spel (game/js/sfx/audiocredits.js, sectie Geluiden), met licentie CC0 of CC BY 3.0/4.0, auteur, bron-URL en id.
//   node scripts/audio_licenties_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LICENTIES, bouwDoc, bouwModule, bronnen, leesManifest } from './audio/licenties_bouw.mjs';
import { AUDIO_CREDITS } from '../game/js/sfx/audiocredits.js';
import { geluidenHtml, CREDITS_HTML } from '../game/js/credits.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0, n = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL', name, info); } };

const man = leesManifest();
const files = fs.readdirSync(path.join(ROOT, 'game', 'audio', 'sfx')).filter((f) => /\.(ogg|mp3|wav|flac)$/.test(f));
const doc = fs.readFileSync(path.join(ROOT, 'docs', 'AUDIO-LICENTIES.md'), 'utf8');
const mod = fs.readFileSync(path.join(ROOT, 'game', 'js', 'sfx', 'audiocredits.js'), 'utf8');

ok(files.length > 0, 'er zijn geluidsbestanden');
for (const f of files) ok(Object.values(man.geluiden).some((g) => g.bestand === f), `${f} staat in het manifest`);
for (const [k, g] of Object.entries(man.geluiden)) {
  const h = g.herkomst || {};
  ok(files.includes(g.bestand), `${k}: bestand ${g.bestand} bestaat`);
  ok(LICENTIES[h.licentie], `${k}: licentie CC0 of CC BY 3.0/4.0 (${h.licentie})`);
  ok(h.licentie_url === (LICENTIES[h.licentie] || {}).url, `${k}: licentie_url past bij de licentie`);
  ok(h.auteur && /^[\w.\-]+$/.test(h.auteur), `${k}: auteurshandle`);
  ok(h.freesound_id > 0 && h.url === `https://freesound.org/people/${h.auteur}/sounds/${h.freesound_id}/`, `${k}: bron-URL en id kloppen`);
  ok(h.titel, `${k}: titel`);
  ok(/^\d{4}-\d{2}-\d{2}$/.test(h.datum || ''), `${k}: datum`);
  ok(h.bron_sha256 ? /^[0-9a-f]{64}$/.test(h.bron_sha256) : true, `${k}: sha256 is hex`);
  ok(g.bewerking, `${k}: bewerking beschreven`);
  ok(doc.includes('`' + g.bestand + '`') && doc.includes(`/sounds/${h.freesound_id}/`), `${k}: staat in docs/AUDIO-LICENTIES.md`);
  ok(AUDIO_CREDITS.some((c) => c.id === h.freesound_id && c.auteur === h.auteur && c.licentie === LICENTIES[h.licentie].kort), `${k}: staat in de credits-gegevens`);
}
ok(doc === bouwDoc(man), 'docs/AUDIO-LICENTIES.md is gelijk aan de uitvoer van het manifest (node scripts/audio/licenties_bouw.mjs --write)');
ok(mod === bouwModule(man), 'audiocredits.js is gelijk aan de uitvoer van het manifest');
ok(AUDIO_CREDITS.length === bronnen(man).length, 'elke bron staat precies één keer in de credits');
// geen merken of modellen in speltekst (constitutie 2): de credits tonen een eigen omschrijving, niet de bronnaam
ok(!/Chrysler|Nissan|Volvo|Maxima|Rover|Aston|Martin/i.test(mod), 'audiocredits.js bevat geen merknamen');
// de credits van het spel noemen elke CC-BY-auteur met titel en licentie
const html = geluidenHtml();
for (const c of AUDIO_CREDITS) ok(html.includes(c.auteur) && html.includes(c.licentie) && html.includes(String(c.id)) && c.beschrijving, `credits noemen ${c.auteur} (${c.id})`);
ok(CREDITS_HTML.includes('<h4>Geluiden</h4>'), 'de creditspagina heeft een sectie Geluiden');
ok(html.includes('Freesound'), 'Freesound staat als bron genoemd');

console.log(fails ? `${fails} van ${n} controles mislukt` : `ok: ${n} controles`);
process.exit(fails ? 1 : 0);
