// Prestatie: de gestagede desktop-index.html heeft modulepreload-hints (zoals de webversie, #757), zonder dev-hulpen,
// en het main-script blijft staan. Stagiet echt (zonder wereld) in een tijdelijke map.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { withModulePreload } from '../web/preload.mjs';

// pure functie
const page = '<head></head><script type="module" src="js/main.js"></script>';
const out = withModulePreload(page, ['js/a.js', 'js/testmenu.js', 'x.png']);
assert.ok(out.includes('<link rel="modulepreload" href="js/a.js">'), 'hint voor gewone module');
assert.ok(!out.includes('testmenu'), 'geen dev-hulp');
assert.ok(out.endsWith('<script type="module" src="js/main.js"></script>'), 'main-script blijft staan');
assert.throws(() => withModulePreload('<html></html>', []), /main\.js/, 'zonder main-script een duidelijke fout');

// echte stage
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!fs.existsSync(path.join(ROOT, 'desktop', 'vendor-cache'))) { console.log('SKIP desktop_preload_test: geen desktop/vendor-cache'); process.exit(0); }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-stage-'));
const dest = path.join(tmp, 'stage');
try {
  const r = spawnSync(process.execPath, ['build.mjs', '--no-world'], { cwd: path.join(ROOT, 'desktop'), env: { ...process.env, GDE_STAGE_OUT: dest, GDE_NO_WORLD: '1' }, encoding: 'utf8' });
  assert.equal(r.status, 0, 'stage faalt: ' + (r.stderr || '').slice(-400));
  const html = fs.readFileSync(path.join(dest, 'index.html'), 'utf8');
  const tags = html.match(/<link rel="modulepreload" href="[^"]+">/g) || [];
  assert.ok(tags.length > 500, 'veel modulepreload-hints in de stage: ' + tags.length);
  assert.ok(tags.some((t) => t.includes('href="js/main.js"')), 'main.js is erbij');
  assert.ok(!tags.some((t) => /js\/testmenu\.js|js\/trailer\.js/.test(t)), 'dev-hulpen niet');
  assert.ok(html.includes('<script type="module" src="js/main.js"></script>'), 'main-script blijft');
  for (const t of tags) assert.ok(fs.existsSync(path.join(dest, decodeURI(t.match(/href="([^"]+)"/)[1]))), 'hint wijst naar een bestaand bestand: ' + t);
  console.log(`desktop_preload_test ok (${tags.length} hints)`);
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
