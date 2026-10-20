// game/stad.json schrijven (#90): de vaste, leesbare vorm, en het terugschrijven van wat een oplosser in de stadsdata veranderde
// (profile.mjs: wegen, railprofile.mjs: spoor, furniture.mjs: meubilair). De OSM-lagen (water, groen, bomen, gebouwen) staan er niet in.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const STAD_FILE = path.join(ROOT, 'game/stad.json');

// Leesbaar in git: elke sleutel op een regel, elke rij van een lijst op een eigen regel (de volgorde van de rijen is de gid van de tegels)
export function stringifyStad(s) {
  const lines = [];
  for (const [k, v] of Object.entries(s)) {
    if (Array.isArray(v) && v.length && v.every((r) => r && typeof r === 'object' && !Array.isArray(r))) {
      lines.push(`${JSON.stringify(k)}: [`, v.map((r) => JSON.stringify(r)).join(',\n'), '],');
    } else if (k === 'meta') {
      lines.push(`${JSON.stringify(k)}: {`, Object.entries(v).map(([mk, mv]) => `${JSON.stringify(mk)}: ${JSON.stringify(mv)}`).join(',\n'), '},');
    } else lines.push(`${JSON.stringify(k)}: ${JSON.stringify(v)},`);
  }
  lines[lines.length - 1] = lines[lines.length - 1].replace(/,$/, '');
  return '{\n' + lines.join('\n') + '\n}\n';
}

// zet data[k] (de lijsten die de oplosser bijwerkte) in stad.json en schrijf het bestand
export function writeStadFrom(data, keys, file = STAD_FILE) {
  const stad = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const k of keys) if (data[k] !== undefined) stad[k] = data[k];
  const text = stringifyStad(stad);
  JSON.parse(text);
  fs.writeFileSync(file, text);
  return file;
}
