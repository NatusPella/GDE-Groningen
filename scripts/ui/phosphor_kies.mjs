// Bundelt alleen de Phosphor-SVG's die game/js/iconmap.js noemt tot game/js/phosphordata.js
// (ADR 0041). Pakketmap: argument 1 of GDE_PHOSPHOR_PKG (uitgepakte @phosphor-icons/core 2.1.1).
// Gebruik: node scripts/ui/phosphor_kies.mjs <pakketmap>
// Geen netwerk; de uitvoer staat in de repo, het pakket niet.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const pkg = process.argv[2] || process.env.GDE_PHOSPHOR_PKG;
if (!pkg) { console.error('Geef de pakketmap mee (met assets/regular en assets/bold).'); process.exit(2); }
const { ICON_MAP } = await import(pathToFileURL(path.join(root, 'game/js/iconmap.js')).href);
const names = [...new Set(Object.values(ICON_MAP))].sort();
const inner = (weight, n) => {
  // een naam op -fill komt uit het gewicht fill (voor een aangezette toestand) en is in beide plekken gelijk
  if (n.endsWith('-fill')) weight = 'fill';
  const file = path.join(pkg, 'assets', weight, weight === 'regular' ? `${n}.svg` : weight === 'fill' ? `${n}.svg` : `${n}-${weight}.svg`);
  if (!fs.existsSync(file)) throw new Error(`ontbreekt: ${file}`);
  const m = fs.readFileSync(file, 'utf8').match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  return m[1].trim();
};
const lines = names.map((n) => `  ${JSON.stringify(n)}: [${JSON.stringify(inner('regular', n))}, ${JSON.stringify(inner('bold', n))}],`);
const out = `// GEGENEREERD door scripts/ui/phosphor_kies.mjs uit @phosphor-icons/core 2.1.1 (MIT, docs/ICONEN-LICENTIE.md).
// Niet met de hand bewerken: zet een naam in iconmap.js en draai het script. Per naam [regular, bold], viewBox 0 0 256 256.
export const PHOSPHOR_VERSION = '2.1.1';
export const PHOSPHOR = {
${lines.join('\n')}
};
`;
fs.writeFileSync(path.join(root, 'game/js/phosphordata.js'), out);
console.log(`${names.length} iconen, ${out.length} bytes`);
