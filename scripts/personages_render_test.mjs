// Render-meting van Verhaal > Personages met headless Chrome (personages-ui 22-11): geen lege tabbalk of leeg vlak, het dossier heeft een kop
// bovenaan, niets loopt over of overlapt, geen alinea langer dan drie regels, op 1280x720 en 1920x1080 met ui-schaal 1,5.
// Zonder Chrome of zonder de gevendorde three: nette SKIP (exit 0). De meting zelf staat in scripts/ui/personages_render.mjs (MEET).
//   node scripts/personages_render_test.mjs
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = spawnSync(process.execPath, [path.join(root, 'scripts/ui/personages_render.mjs'), '--meet', '--snel'], { cwd: root, encoding: 'utf8', timeout: 110000 });
const uit = `${r.stdout || ''}${r.stderr || ''}`;
if (/^skip:/m.test(uit)) { console.log('SKIP personages_render_test:', (uit.match(/^skip: (.*)$/m) || [])[1]); process.exit(0); }
if (r.error || r.status !== 0) { console.log(uit.trim()); console.log('FAIL personages_render_test'); process.exit(1); }
const regels = uit.split('\n').filter((l) => /^(ok|FOUT)/.test(l));
if (!regels.length) { console.log(uit.trim()); console.log('FAIL personages_render_test: geen meting'); process.exit(1); }
console.log(`personages_render_test: ${regels.length} renders ok (kop aanwezig, geen leeg element, geen overlap)`);
