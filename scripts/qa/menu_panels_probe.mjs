// Opent elk pauzemenu-onderdeel in een echte Electron en meldt per scherm of het opent.
// Dit vangt de klasse fouten die een bron-regex mist: een ReferenceError in de opbouw (Veroverd
// miste een import) of een TDZ-fout (Cheats gebruikte `n` voor de declaratie). In het spel
// betekent zo'n fout een leeg paneel zonder melding, dus de speler ziet niets.
//
//   node scripts/qa/menu_panels_probe.mjs [--out=<map>]
//
// Draait via scripts/ui_shots.mjs met een eigen scene; gebruikt een wegwerpprofiel en raakt
// geen echte opslag aan. Vereist een gestagede wereld en Electron (zie docs/ONTWIKKELEN.md).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-menu-panels')));
fs.mkdirSync(OUT, { recursive: true });

// De scene: elk onderdeel openen, de zichtbaarheid controleren en het resultaat teruggeven.
// Teruggeven (niet loggen) is bewust: devtools.js schrijft alleen bekende prefixes in het log.
const scene = path.join(OUT, '_probe.js');
fs.writeFileSync(scene, `
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const imp = (f) => import('/js/' + f + '.js');
for (let i = 0; i < 40 && !document.body.classList.contains('game-started'); i++) {
  for (const t of [window, document]) {
    t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
    t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }));
  }
  await sleep(2000);
}
const PM = await imp('pausemenu');
const D = window.__debug;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
// Let op twee aliassen: 'overzicht' is een tab van het Spel-paneel en 'telefoon' verwijst
// door naar Verhaal. Die hebben geen eigen paneel; we toetsen het paneel waar ze in vallen.
const PANEEL = { overzicht: 'spel', telefoon: 'verhaal' };
const tabs = ['overzicht','todo','map','telefoon','verhaal','loopbaan','veroverd','spullen','garage','prestaties','fotos','settings','controls','streken'];
const out = [];
for (const tab of tabs) {
  try {
    PM.openPauseMenu(tab);
    await sleep(900);
    const p = document.querySelector('[data-panel="' + (PANEEL[tab] || tab) + '"]');
    const zichtbaar = p ? !p.hidden : false;
    const tekst = p ? p.textContent.trim().length : 0;
    out.push({ tab, ok: zichtbaar && tekst > 0, zichtbaar, tekst });
    PM.closePauseMenu();
  } catch (e) {
    try { PM.closePauseMenu(); } catch (e2) { /* stond niet open */ }
    out.push({ tab, ok: false, fout: (e && e.message) || String(e) });
  }
  await sleep(250);
}
return JSON.stringify(out);
`);

const shots = path.join(ROOT, 'scripts', 'ui_shots.mjs');
const r = spawnSync(process.execPath, [shots, `--scenes=${scene}`, `--out=${OUT}`, '--sizes=1280x720', '--timeout=600'], { encoding: 'utf8', cwd: ROOT });
const log = fs.existsSync(path.join(OUT, '_log-1280x720.txt')) ? fs.readFileSync(path.join(OUT, '_log-1280x720.txt'), 'utf8') : '';
const regel = (log.split('\n').find((l) => l.startsWith('[perf-script]')) || '').slice(14).trim();
let uitslag = null;
try { uitslag = JSON.parse(regel); } catch (e) { /* geen uitkomst */ }
if (!uitslag) {
  console.error('geen uitkomst van de probe; zie', path.join(OUT, '_log-1280x720.txt'));
  if (r.error) console.error(r.error.message);
  process.exit(2);
}
let fout = 0;
for (const p of uitslag) {
  if (p.ok) console.log(`ok    ${p.tab} (${p.tekst} tekens)`);
  else { fout++; console.log(`FOUT  ${p.tab}: ${p.fout || `paneel ${p.zichtbaar ? 'leeg' : 'verborgen'}`}`); }
}
console.log(`menu_panels_probe: ${uitslag.length - fout} van ${uitslag.length} onderdelen openen`);
process.exit(fout ? 1 : 0);
