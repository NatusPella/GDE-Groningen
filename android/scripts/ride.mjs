// Scripted rit op de emulator (of een toestel): nieuw spel, de opening met Overslaan,
// M01 met alleen aanrakingen (stick, camerazwiep, knoppen), opslaan en laden.
// Alles gaat via echte touch-events in de WebView (driver.mjs); de spelstatus komt
// uit window.__debug (alleen lezen). Schrijft verslag en schermafdrukken naar android/out/ride/.
//
//   node scripts/ride.mjs [--stap nieuw|loop|rij|opslaan] [--no-install] [--teleport]
//
// --teleport: de 1,8 km naar Berend niet lopen maar de dev-sprong naar de markering gebruiken
// (op een trage emulator duurt lopen te lang); het lopen zelf wordt wel eerst een tijd getest.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { OUT, toolEnv } from './common.mjs';
import { connect, adbTool, sleep, PKG } from './driver.mjs';
import { footStick, carControls, normAngle, headingTo } from '../../game/js/botlogic.js';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const DIR = path.join(OUT, 'ride');
fs.mkdirSync(DIR, { recursive: true });
const report = [];
const log = (ok, what, extra = '') => { const l = `${ok ? 'ok  ' : 'FOUT'} ${what}${extra ? ' - ' + extra : ''}`; console.log(l); report.push(l); };
const adb = adbTool();

if (!flag('--no-install')) {
  adb('install', '-r', path.join(OUT, 'gde-groningen-debug.apk'));
  adb('shell', 'pm', 'clear', PKG);
}
adb('shell', 'am', 'start', '-n', `${PKG}/.MainActivity`);
await sleep(8000);

let d;
for (let i = 0; i < 60 && !d; i++) { try { d = await connect(); } catch (e) { await sleep(3000); } }
if (!d) throw new Error('geen WebView');
const ev = (x) => d.ev(x);
const waitFor = async (expr, ms, what) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await ev(expr)) return true; } catch (e) { /* trage pagina */ } await sleep(1500); }
  log(false, 'time-out: ' + what);
  return false;
};
const state = async () => JSON.parse(await ev(`(() => { const w = window.__debug && window.__debug.world; if (!w) return 'null'; const p = w.player, v = p.inVehicle;
  const c = document.getElementById('cine');
  return JSON.stringify({ x: p.x, y: p.y, a: p.angle, cam: w.camYaw, hp: p.health, t: w.time, money: w.money,
    veh: v ? { x: v.x, y: v.y, angle: v.angle, speed: v.speed } : null, guide: w.storyGuide ? { x: w.storyGuide.x, y: w.storyGuide.y, step: w.storyGuide.step } : null,
    cine: !!(c && c.classList.contains('active')), ctx: document.documentElement.dataset.touchCtx, step: window.__story.current(), mission: window.__story.mission() });
  })()`));

// --- aanrakingen ---
const btnId = (re) => ev(`(() => { const e = [...document.querySelectorAll('#touch-ui .t-btn, #touch-ui .t-panel .t-btn')].find((e) => ${re}.test(e.textContent)); if (!e) return false; e.id = 'tb-' + ${JSON.stringify(re.source.replace(/\W/g, ''))}; return e.id; })()`);
async function button(re, holdMs = 120) {
  const id = await btnId(re);
  if (!id) return false;
  const c = await d.center('#' + id);
  if (!c) return false;
  await d.down(7, c.x, c.y); await sleep(holdMs); await d.up(7);
  return true;
}
const STICK = { x: 150, y: 215 }; // linker zone, boven de minimap
let stickDown = false;
async function stick(x, y) {
  const R = 50;
  if (!x && !y) { if (stickDown) { await d.up(1); stickDown = false; } return; }
  if (!stickDown) { await d.down(1, STICK.x, STICK.y); stickDown = true; }
  await d.move(1, STICK.x + x * R, STICK.y + y * R);
}
async function swipeLook(dx, ms = 600) {
  const x0 = 640, y0 = 150;
  await d.down(2, x0, y0);
  for (let i = 1; i <= 4; i++) { await d.move(2, x0 + (dx * i) / 4, y0); await sleep(ms / 4); }
  await d.up(2);
}
const adbBin = path.join(toolEnv().sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
// echte schermafdruk (ook de 3D-wereld; Page.captureScreenshot toont het WebGL-canvas zwart)
const screenshot = async (name) => fs.writeFileSync(path.join(DIR, name + '.png'), execFileSync(adbBin, ['exec-out', 'screencap', '-p'], { maxBuffer: 1 << 27 }));

// --- 1. start en nieuw spel ---
// eerst 'Tik om te beginnen' (start ook het geluid), dan het menu
if (!(await waitFor(`/Tik om te beginnen/.test(document.body.innerText) || !!document.querySelector('.ss-item')`, 240000, 'laadscherm klaar'))) process.exit(1);
if (!(await ev(`!!document.querySelector('.ss-item')`))) { await d.tap(433, 206); await sleep(1500); }
if (!(await waitFor(`!!document.querySelector('.ss-item')`, 60000, 'startmenu'))) process.exit(1);
log(true, 'startscherm met touch-UI');
if (await ev(`!!document.querySelector('.ss-news:not([hidden])')`)) { await d.tapEl('.ss-news-close'); await sleep(1200); }
await screenshot('1-startscherm');
await d.tapEl('.ss-item[data-act="new"]');
if (!(await waitFor(`document.body.classList.contains('game-started')`, 60000, 'spel gestart na Nieuw spel'))) process.exit(1);
log(true, 'Nieuw spel gestart met een tik');

// --- 2. opening overslaan (vasthouden) ---
let s;
for (let i = 0; i < 20; i++) {
  try { s = await state(); } catch (e) { await sleep(2000); continue; }
  if (s && s.step && s.step.id !== 'M00' && !s.cine) break;
  if (s && s.cine && await button(/overslaan/i, 2300)) await sleep(1500); else await sleep(2500);
}
log(!!s && s.step.id === 'M01', 'opening overgeslagen met vasthouden van Overslaan', s && s.step && s.step.id);
await waitFor(`window.__debug && window.__debug.world && !document.getElementById('cine').classList.contains('active')`, 30000, 'cutscene weg');
await screenshot('2-na-opening');

// --- 3. lopen: stick naar de markering, camera met een zwiep ---
s = await state();
const g = s.guide;
log(!!g, 'doel (storyGuide) bekend', g && `${Math.round(g.x)},${Math.round(g.y)}`);
const p0 = { x: s.x, y: s.y };
const cam0 = s.cam;
await swipeLook(220);
await sleep(1500);
s = await state();
log(Math.abs(normAngle(s.cam - cam0)) > 0.05, 'camera draait met een zwiep rechts', `${cam0.toFixed(2)} -> ${s.cam.toFixed(2)}`);
const walkUntil = Date.now() + 40000;
let moved = 0;
while (Date.now() < walkUntil) {
  s = await state();
  const [sx, sy] = footStick(headingTo(s, g), s.cam);
  await stick(sx, sy);
  moved = Math.hypot(s.x - p0.x, s.y - p0.y);
  if (moved > 25) break;
  await sleep(500);
}
await stick(0, 0);
log(moved > 20, 'lopen met de stick', `${Math.round(moved)} m`);
await screenshot('3-lopen');

await d.ev('1'); // houdt de verbinding warm
fs.writeFileSync(path.join(DIR, 'verslag.txt'), report.join('\n') + '\n');
d.close();
console.log(report.some((l) => l.startsWith('FOUT')) ? 'ritje met fouten' : 'ritje geslaagd');
