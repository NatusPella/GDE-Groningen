// Camera-audit op de echte kaart (aaa30, eis 2): voor elke cutscene van de eerste 30 minuten (of --only=) en elke plek in de stad toetst hij de
// camera langs het hele pad op gebouwen en bomen (de pagina-helft staat in cutscene_wereld_audit.page.js) en faalt als de camera, ná de
// camerabescherming van cutscenehost.js (camguard.js), nog in een gebouw of boom zit of er tussen twee beelden doorheen gaat.
//   node scripts/qa/cutscene_wereld_audit.mjs [--only=M01.intro,...] [--uit=.scr/wa] [--strict]
// Vereist een Electron-slot en een gestagede game (GDE_GAME_DIR, ELECTRON_EXE); zonder die: SKIP (exit 0).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (k, d = '') => { const a = process.argv.find((v) => v === `--${k}` || v.startsWith(`--${k}=`)); return a ? (a.includes('=') ? a.slice(k.length + 3) : true) : d; };
export const EERSTE_30 = ['story-opening-keuken', 'story-opening-verhuisdag', 'M01.intro', 'M01.3', 'M01.5', 'M01.outro', 'M02.intro', 'M02.outro', 'M03.intro', 'M03.2', 'M03.outro', 'M04.intro', 'M04.outro', 'M05.intro', 'M05.outro'];
// echte plekken in de stad (WGS84 via rdnew.js wgsToWorld): het Martinikerkhof, de Herestraat, de Grote Markt, het station, de Broerstraat; en de vaste plek van de contactvellen
export const PLEKKEN = { martinikerkhof: [53.2196, 6.5682], herestraat: [53.2150, 6.5620], grotemarkt: [53.2193, 6.5665], station: [53.2108, 6.5658], broerstraat: [53.2195, 6.5608], vaste: null };

const runner = require('../lib/electronrunner.cjs');
const only = String(arg('only', '')).split(',').filter(Boolean);
const ids = only.length ? only : EERSTE_30;
const game = process.env.GDE_GAME_DIR || path.join(ROOT, 'desktop', 'build', 'game');
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
if (!fs.existsSync(path.join(game, 'index.html')) || !fs.existsSync(electron)) { console.log('SKIP cutscene_wereld_audit: geen gestagede game of geen Electron (GDE_GAME_DIR, ELECTRON_EXE)'); process.exit(0); }
const { wgsToWorld } = await import('../../game/js/rdnew.js');
const spots = Object.entries(PLEKKEN).map(([naam, ll]) => { if (!ll) return { naam, x: 200.8, y: 45.4, a: 0.3 }; const [x, y] = wgsToWorld(ll[0], ll[1]); return { naam, x, y, a: 0.3 }; });
const uit = path.resolve(String(arg('uit', path.join(ROOT, '.scr', 'wa'))));
fs.mkdirSync(uit, { recursive: true });
const { profile, tmp } = runner.prepareRunDir(uit);
const script = path.join(uit, '_page.js');
fs.writeFileSync(script, `window.__wa = ${JSON.stringify({ items: ids.map((id) => ({ id, spots })), step: 0.1 })};\n` + fs.readFileSync(path.join(ROOT, 'scripts', 'qa', 'cutscene_wereld_audit.page.js'), 'utf8'));
const env = runner.electronEnv({ profile, tmp, gameDir: game, extra: { GDE_NO_THROTTLE: '1' } });
const res = await runner.runElectron({ electron, cwd: path.join(ROOT, 'desktop'), env, out: uit, slot: { label: 'wereld-audit', waitMin: 0.1, maxOthers: 1, pollMs: 2000 }, timeoutMin: 12,
  args: ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1280x720', `--smoke-test=${path.join(uit, 's.png')}`, `--perf-script=${script}`] });
runner.removeProfile(profile);
let out = {};
try { out = JSON.parse(res.perfScript || '{}').out || {}; } catch (e) { console.log('FAIL: resultaat onleesbaar: ' + e.message); process.exit(1); }
fs.writeFileSync(path.join(uit, 'resultaat.json'), JSON.stringify(out, null, 1));
let fout = 0;
console.log('cutscene'.padEnd(26) + 'plek'.padEnd(16) + 'voor: in/door/wand'.padEnd(22) + 'na de bescherming: in/door/wand');
for (const [id, per] of Object.entries(out)) {
  if (per.fout) { console.log(id.padEnd(26) + per.fout); fout++; continue; }
  for (const [naam, r] of Object.entries(per)) {
    console.log(id.padEnd(26) + naam.padEnd(16) + `${r.in}/${r.door}/${r.naWand}`.padEnd(22) + `${r.naGuard.in}/${r.naGuard.door}/${r.naGuard.naWand}`);
    if (r.naGuard.in || r.naGuard.door) fout++;
  }
}
console.log(fout ? `cutscene_wereld_audit: ${fout} cutscene/plek-combinaties met de camera in of door een object` : 'cutscene_wereld_audit: de camera zit nergens in of door een gebouw of boom');
process.exit(arg('strict') && fout ? 1 : 0);
