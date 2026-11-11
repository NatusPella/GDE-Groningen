// Openingsmontage (#717) en cutscene-docs/preview (#723): de montage is C00.1, de dode
// replay-API is weg, de docs/specs noemen de host-only-regel en de preview kent de
// momenten en intochten met hun duur en skipbaarheid.
//   node scripts/cutscene_engine_docs_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let n = 0;
const ok = (c, m, extra = '') => { n++; if (!c) { console.log('FAIL ' + m + (extra ? ' (' + extra + ')' : '')); process.exitCode = 1; } };

// #717: montage als C00.1, dode replay-API weg, besluit vastgelegd
const story = lees('game/js/story.js');
ok(!/playTrailerMontage\(world/.test(story), 'de standaardopening speelt de montage niet automatisch');
ok(/const staged = acts\.length === 3 && playAct\(0\);/.test(story), 'de gescripte acts zijn de basis met een terugval');
const cine = lees('game/js/cinematics.js');
ok(!/export function replayIntro/.test(cine), 'de dode replayIntro is weg');
ok(!/function playIntro\(w\)/.test(cine), 'de dode playIntro is weg');
const montage = lees('game/js/intromontage.js');
ok(!/export function introSeen/.test(montage), 'de ongebruikte introSeen-export is weg');
ok(/export function playTrailerMontage/.test(montage), 'de montage-API voor de opening bestaat');
const adr = lees('.specs-fire/standards/adr/0032-opening-terug-naar-gescripte-scene.md');
ok(/gescripte scène/.test(adr) && /Afgewezen/.test(adr), 'ADR 0032 legt het besluit met alternatieven vast');
ok(/0032-opening-terug/.test(lees('.specs-fire/standards/adr/README.md')), 'de ADR-index noemt 0032');

// #723: docs en specs
const arch = lees('ARCHITECTURE.md');
ok(/C00\.1 trailer-montage/.test(arch), 'ARCHITECTURE rekent met de C00.1-montage');
const coop = lees('docs/COOP-GAST.md');
ok(/Veroveren en intochten \(#723\)/.test(coop), 'COOP-GAST heeft de sectie veroveren/intohten');
ok(/host-only film/.test(coop) && /intocht/i.test(coop), 'COOP-GAST noemt de intocht host-only');
const verhaal = lees('.specs-fire/standards/verhaal.md');
ok(/host-only/.test(verhaal) && /playScript/.test(verhaal), 'de verhaal-spec heeft de scène/film-regel');
const multi = lees('.specs-fire/standards/multiplayer.md');
ok(/host-only|hostonly|host only/i.test(multi), 'de multiplayer-spec kent de host-only-films');

// #723: de preview-catalogus
const cp = lees('game/js/cutpreview.js');
ok(/export const MOMENT_PREVIEW/.test(cp), 'de preview heeft een catalogus met momenten');
for (const id of ['moment:landmark', 'moment:crash', 'moment:mission-intro']) ok(cp.includes(id), `de preview kent ${id}`);
ok(/INTOCHTEN/.test(cp) && /Intochten/.test(cp), 'de preview neemt de echte intochten uit wijkintocht.js mee');
ok(/skippable/.test(cp) && /hostOnly/.test(cp), 'de preview noemt skipbaarheid en host-only');

console.log(process.exitCode ? 'cutscene_engine_docs_test: FAIL' : `cutscene_engine_docs_test: ${n} controles ok`);
