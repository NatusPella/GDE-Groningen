// #820: genereert game/js/herkenningspunten.js uit game/landmarkkits.json. Eén bron, één richting:
// alleen punten met een naam (583 van de 707 kits) worden een herkenningspunt in het album.
//   node scripts/gen_herkenningspunten.mjs          schrijf het databestand
//   node scripts/gen_herkenningspunten.mjs --check  faal als het bestand achterloopt
// De puntvorm: { id, naam, x, y, soort }. `soort` is de kitsoort uit landmarkkits.json; de albummodule
// vertaalt hem naar kerk, molen, borg enz. Er wordt niets verzonnen: naam en coördinaten komen uit de kit.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const KITS = path.join(REPO, 'game', 'landmarkkits.json');
const OUT = path.join(REPO, 'game', 'js', 'herkenningspunten.js');

const rond = (v) => Math.round(Number(v) * 10) / 10;

// Dezelfde volgorde als in landmarkkits.json, zodat het databestand deterministisch is.
export function bouwPunten(kits) {
  const items = (kits && Array.isArray(kits.items) ? kits.items : []).filter((i) => i && typeof i.n === 'string' && i.n.trim() && Number.isFinite(i.x) && Number.isFinite(i.y));
  return items.map((i, idx) => ({ id: `${i.k}-${idx + 1}`, naam: i.n.trim(), x: rond(i.x), y: rond(i.y), soort: String(i.k || 'overig') }));
}

export function genereer(kits = JSON.parse(fs.readFileSync(KITS, 'utf8'))) {
  const punten = bouwPunten(kits);
  const lijnen = [];
  lijnen.push('// #820: de herkenningspunten van de provincie, gegenereerd uit game/landmarkkits.json.');
  lijnen.push('// Niet met de hand aanpassen: node scripts/gen_herkenningspunten.mjs schrijft dit bestand,');
  lijnen.push('// en scripts/herkenningspunten_test.mjs bewaakt dat de twee niet uit elkaar lopen.');
  lijnen.push(`// ${punten.length} punten met een naam (kerk, molen, borg en meer).`);
  lijnen.push('export const HERKENNINGSPUNTEN = [');
  for (const p of punten) lijnen.push(`  { id: ${JSON.stringify(p.id)}, naam: ${JSON.stringify(p.naam)}, x: ${p.x}, y: ${p.y}, soort: ${JSON.stringify(p.soort)} },`);
  lijnen.push('];');
  lijnen.push('');
  lijnen.push(`export const HERKENNINGSPUNTEN_TOTAAL = ${punten.length};`);
  return lijnen.join('\n') + '\n';
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const tekst = genereer();
  if (process.argv.includes('--check')) {
    const huidig = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (huidig !== tekst) { console.error('herkenningspunten.js loopt achter; draai node scripts/gen_herkenningspunten.mjs'); process.exit(1); }
    console.log('herkenningspunten.js is actueel.');
  } else {
    fs.writeFileSync(OUT, tekst);
    console.log(`herkenningspunten.js geschreven: ${JSON.parse(JSON.stringify(bouwPunten(JSON.parse(fs.readFileSync(KITS, 'utf8'))))).length} punten`);
  }
}
