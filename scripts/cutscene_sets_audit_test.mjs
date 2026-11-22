// Test van de inventaris van binnensets (scripts/cutscene_sets_audit.mjs): elke set die een cutscene, een missiestap of een terugkeervignet
// speelt heeft een tabelrij met een echte-wereld-mapping of een bewuste terugval; geen nieuwe set sluipt erin zonder rij; de uitvoer is JSON-baar.
//   node scripts/cutscene_sets_audit_test.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { inventory, checkTable, stageUses, render } from './cutscene_sets_audit.mjs';
import { REAL_SETS, PLAYED_SETS, isRealSet } from '../game/js/realsets.js';
import './node3d.mjs';
const { STAGE_SETS } = await import('../game/js/stagesets.js');

let n = 0, bad = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.error('FAIL', m + (info ? ` (${info})` : '')); } };

const inv = inventory();
const by = Object.fromEntries(inv.map((r) => [r.set, r]));
ok(checkTable(inv).length === 0, 'de tabel klopt met wat er gespeeld wordt', JSON.stringify(checkTable(inv)));
for (const k of PLAYED_SETS) ok(!!by[k] && !!by[k].tabel, 'de gespeelde set ' + k + ' heeft een rij in de inventaris en in de tabel');
// elke binnenset heeft een mapping (echt) of een bewuste terugval met reden
for (const r of inv) {
  const t = r.tabel;
  ok(!!t && (t.status === 'echt' || (t.status === 'terugval' && !!t.why)), r.set + ': een mapping of een bewuste terugval met reden');
}
// de sets van de stappen (stagesets.js) zijn dezelfde als die in de tabel
for (const k of STAGE_SETS) ok(!!REAL_SETS[k], 'stap-set ' + k + ' staat in de tabel');
// elke set die in de broncode van de missies wordt gevraagd, staat in de tabel (een nieuwe set zonder rij valt hier op)
const uses = stageUses();
ok(uses.length >= 13, 'de missiestappen met een set zijn gevonden', String(uses.length));
for (const u of uses) ok(!!REAL_SETS[u.set], 'missions_*.js regel ' + u.line + ': set ' + u.set + ' staat in de tabel');
// elke set van een cutscene in cutscript.js (de documentatieregel) staat in de tabel
const cs = readFileSync(new URL('../game/js/cutscript.js', import.meta.url), 'utf8');
const m = /set: ('[a-z]+'(?: \| '[a-z]+')+)/.exec(cs);
const documented = m ? m[1].split('|').map((x) => x.trim().replace(/'/g, '')) : [];
ok(documented.length >= 8, 'cutscript.js noemt zijn sets', String(documented.length));
for (const k of documented) ok(!!REAL_SETS[k], 'cutscript.js set ' + k + ' staat in de tabel');
// tellingen die de documentatie noemt
ok(inv.reduce((a, r) => a + r.cutscenes.length, 0) >= 14, 'minstens 14 cutscenes met een binnenset');
ok(inv.reduce((a, r) => a + r.terugkeer.length, 0) >= 24, 'minstens 24 terugkeervignetten met een binnenset');
ok(PLAYED_SETS.filter((k) => isRealSet(k)).length === 7 && PLAYED_SETS.filter((k) => !isRealSet(k)).length === 2, 'zeven sets met een echt pand, twee bewuste terugvallen (keuken, kruitkelder)');
ok(render(inv).includes('Wiebelwerk') && render(inv).includes('terugval'), 'de uitvoer noemt de plekken en de terugvallen');
// de scripts zelf: --json en --strict zonder wereld
const out = execFileSync(process.execPath, [new URL('./cutscene_sets_audit.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), '--json', '--strict'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
const j = JSON.parse(out);
ok(Array.isArray(j.inventaris) && j.inventaris.length === inv.length && j.fouten.length === 0, '--json geeft de inventaris en --strict slaagt zonder wereld');
// de wereldstand is niet in git: de test van de pandkeuze op echte tegels draait alleen als er een wereld staat
const hasWorld = (() => { try { return readdirSync(new URL('../game/world/', import.meta.url)).includes('index.json'); } catch (e) { return false; } })();
console.log(hasWorld ? '  game/world aanwezig: draai scripts/cutscene_sets_audit.mjs --world voor de pandkeuze op de echte tegels' : '  SKIP de pandkeuze op echte tegels (geen game/world in deze werkboom; draai de audit met --world=<map>)');

console.log(`cutscene_sets_audit_test: ${n - bad}/${n} controles ok`);
process.exit(bad ? 1 : 0);
