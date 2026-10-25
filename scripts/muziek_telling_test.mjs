// De muziektellingen in de juridische tekst moeten kloppen met wat er in de repo staat (#484).
// Eén bron: de bestanden zelf. Faalt als docs/LICENTIES.md een ander aantal noemt dan er mp3's zijn.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const count = (dir) => {
  const d = path.join(ROOT, dir);
  if (!fs.existsSync(d)) return 0;
  return fs.readdirSync(d, { recursive: true }).filter((f) => String(f).toLowerCase().endsWith('.mp3')).length;
};

const gmusic = count('game/audio/gmusic');
const scenario = count('game/audio/scenario');
const theme = count('game/audio/theme');

const tekst = fs.readFileSync(path.join(ROOT, 'docs', 'LICENTIES.md'), 'utf8');
const regel = tekst.split(/\r?\n/).find((l) => /G-Music-nummers/.test(l)) || '';

const eis = (voorwaarde, bericht) => {
  if (!voorwaarde) { console.log('FAIL ' + bericht); process.exitCode = 1; }
};

eis(gmusic > 0, 'geen G-Music-nummers gevonden in game/audio/gmusic');
eis(new RegExp(`\\b${gmusic} G-Music-nummers`).test(regel), `LICENTIES.md noemt niet "${gmusic} G-Music-nummers" (regel: ${regel.trim().slice(0, 90)})`);
eis(new RegExp(`\\b${scenario} scenario-loops`).test(regel), `LICENTIES.md noemt niet "${scenario} scenario-loops" (regel: ${regel.trim().slice(0, 90)})`);
eis(theme === 1, `verwacht één titelnummer in game/audio/theme, gevonden ${theme}`);

// De tweede plek in hetzelfde document moet hetzelfde zeggen, anders lopen ze uit elkaar.
const tabel = tekst.split(/\r?\n/).filter((l) => /\*\*Muziek\*\*/.test(l));
eis(tabel.length === 0 || tabel.every((l) => new RegExp(`\\b${gmusic} G-Music-nummers`).test(l) && new RegExp(`\\b${scenario} scenario-loops`).test(l)),
  'de muziekregel elders in LICENTIES.md noemt andere aantallen');

if (!process.exitCode) console.log(`muziek_telling_test ok: ${gmusic} G-Music, ${scenario} scenario-loops, ${theme} titelnummer`);
