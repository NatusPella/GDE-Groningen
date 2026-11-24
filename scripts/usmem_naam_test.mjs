// Jelles bedrijf heet overal "Us Mem Snacks" (canoniek in .specs-fire/standards/verhaal.md, het script en de stemmen; zijn vet heet
// "Us Mem Vet"). Hertest 24-11: het Snackwagen-tabblad, de kaart en een prestatie zeiden "Usmem Snacks". Deze test zoekt varianten in
// alles wat een speler kan zien of horen: game/js, game/storydata, de stemregels en steam/achievements.json. Code-namen in kleine
// letters (usmem, usMemVetTexture) en de Steam-API-naam ACH_BZ_USMEM zijn geen spelertekst en tellen niet mee.
//   node scripts/usmem_naam_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VARIANT = /\bUsmem\b|\bUsMem\b|\bUs mem\b|\bUs-Mem\b|\bUS-?MEM\b(?! SNACKS| VET)|\bUSMEM SNACKS\b|\bus mem\b/g;
const ALLOW = /ACH_BZ_USMEM/;
const files = [];
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(js|json)$/.test(e.name)) files.push(p); } };
for (const d of ['game/js', 'game/storydata']) walk(path.join(ROOT, d));
for (const f of ['steam/achievements.json', 'game/audio/voicelines/lines/tts.json', 'game/audio/voicelines/lines/manifest.json']) if (fs.existsSync(path.join(ROOT, f))) files.push(path.join(ROOT, f));

const fouten = [];
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((l, i) => { if (ALLOW.test(l)) return; const m = l.match(VARIANT); if (m) fouten.push(`${path.relative(ROOT, f)}:${i + 1}: ${m.join(', ')}`); });
}
const rival = fs.readFileSync(path.join(ROOT, 'game/js/rival.js'), 'utf8');
if (!/export const RIVAL_NAME = 'Us Mem Snacks';/.test(rival)) fouten.push('rival.js: RIVAL_NAME is niet "Us Mem Snacks"');
const spec = fs.readFileSync(path.join(ROOT, '.specs-fire/standards/verhaal.md'), 'utf8');
if (!spec.includes('Us Mem Snacks')) fouten.push('verhaal.md noemt "Us Mem Snacks" niet meer: kies opnieuw de canonieke schrijfwijze');

if (fouten.length) { console.log(`usmem_naam_test: ${fouten.length} variant(en) van "Us Mem":\n  ` + fouten.slice(0, 40).join('\n  ')); process.exit(1); }
console.log(`usmem_naam_test: ${files.length} bestanden, overal "Us Mem"`);
