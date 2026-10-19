// Maakt de tekstlijst voor een Groningse/Friese nalezer (#13) uit de bronbestanden.
// Verstuurt niets; schrijft docs/NALEZEN-GRONINGS-FRIES.md (of een ander pad via --out=).
//   node scripts/nalezerlijst.mjs [--out=pad.md] [--check]   (--check: alleen tellen, niets schrijven)
// Gronings: scripts/gronings_spoken.json (regel zoals getoond -> ingesproken spelling).
// Fries: regels in game/storydata/script.json met kenmerkende Friese woorden (heuristiek;
// de nalezer markeert ook wat wij gemist hebben).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').slice(k.length + 3);
const out = arg('out') || path.join(REPO, 'docs', 'NALEZEN-GRONINGS-FRIES.md');

export const FRIES_RE = /\b(foar|moai|heit|dêr|wêr|myn|dyn|gjin|binne|bist|jo binne|tankewol|asjebleaft|goeie moarn|hoe giet it|wy|sjoch|fan 'e|fan de wei|lekker nei)\b/i;

export function gronings() {
  const t = JSON.parse(fs.readFileSync(path.join(REPO, 'scripts', 'gronings_spoken.json'), 'utf8'));
  return Object.entries(t).filter(([a, b]) => typeof b === 'string' && a !== b);
}

export function fries() {
  const s = JSON.parse(fs.readFileSync(path.join(REPO, 'game', 'storydata', 'script.json'), 'utf8'));
  const rows = [];
  (function walk(o, p) {
    if (typeof o === 'string') { if (/\.text$/.test(p) && FRIES_RE.test(o)) rows.push([p.replace(/^\./, ''), o]); }
    else if (o && typeof o === 'object') for (const k in o) walk(o[k], `${p}.${k}`);
  })(s, '');
  return rows;
}

const esc = (x) => x.replace(/\|/g, '\|').replace(/\r?\n/g, ' ');

export function build() {
  const g = gronings(), f = fries();
  let md = `# Nalezen: Gronings en Fries (#13)\n\nGegenereerd door \`node scripts/nalezerlijst.mjs\`. **Niets is verstuurd**; dit bestand is voor de eigenaar om aan een nalezer te geven.\n\n`;
  md += `## Wat we vragen\n\nGeef bij elke regel: **goed**, **aanpassen** (met jouw spelling) of **weg**. Let op:\n- Gronings: klopt de spelling en klinkt het natuurlijk? Het spel zegt "Grunn", nooit "de Grunn".\n- Fries: klopt het Frysk en is het niet beledigend? Gaat het om een bepaalde streek of dialect (Noord-Friesland of Gronings-Fries)?\n- De ondertitel (tekst op het scherm) blijft Nederlands; alleen de ingesproken versie is Gronings.\n- Geen woord uit een merk of van een echt persoon toevoegen (alles is verzonnen).\n\n`;
  md += `Samenvatting: ${g.length} Groningse spreekregels, ${f.length} regels met Friese woorden (heuristisch gevonden).\n\n`;
  md += `## 1. Gronings (getoond -> ingesproken)\n\n| # | Getoond | Ingesproken (Gronings) | Oordeel |\n|---|---|---|---|\n`;
  g.forEach(([a, b], i) => { md += `| ${i + 1} | ${esc(a)} | ${esc(b)} | |\n`; });
  md += `\nDe Friese regels in de Deel 4-scripts (\`docs/verhaal/deel4-f4a.md\`, \`-f4b\`, \`-f4c\`) zijn de bron; hieronder staan alleen de regels die in \`script.json\` zitten.\n`;
  md += `\n## 2. Fries (kandidaten; plaats in \`script.json\`)\n\n| # | Plaats | Tekst | Oordeel |\n|---|---|---|---|\n`;
  f.forEach(([p, t], i) => { md += `| ${i + 1} | \`${p}\` | ${esc(t)} | |\n`; });
  return { md, g: g.length, f: f.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = build();
  if (process.argv.includes('--check')) console.log(`gronings ${r.g}, fries ${r.f}`);
  else { fs.writeFileSync(out, r.md); console.log(`geschreven: ${path.relative(REPO, out)} (gronings ${r.g}, fries ${r.f})`); }
}
