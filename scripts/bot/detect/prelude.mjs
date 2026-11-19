// De pagina-voorloop van de detectoren: de modules zonder imports (dom, console, frametijd) als window.__botDetect en de page-kant
// (page.js) als window.__botDetectPage. run.mjs zet dit voor het botscript; scripts/proef_detect_test.mjs voert het in Node uit met een nepvenster.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const strip = (f) => fs.readFileSync(path.join(HERE, f), 'utf8').replace(/^export (const|function|class) /gm, '$1 ');

export function detectPrelude() {
  const body = `${strip('dom.mjs')}\n${strip('console.mjs')}\n${strip('frametijd.mjs')}\nreturn { snapshotDom, auditDom, dedupeDom, parseColor, contrastRatio, ConsoleVerzamelaar, HitchMeter };`;
  const page = fs.readFileSync(path.join(HERE, 'page.js'), 'utf8').replace(/;\s*$/, '');
  return `window.__botDetect = (() => {\n${body}\n})();\nwindow.__botDetectPage = ${page};\n`;
}
