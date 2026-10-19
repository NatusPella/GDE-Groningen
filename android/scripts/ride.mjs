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
import { footStick, carControls, normAngle, headingTo, PathFollower, WedgeDetector } from '../../game/js/botlogic.js';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const DIR = path.join(OUT, 'ride');
fs.mkdirSync(DIR, { recursive: true });
const report = [];
const log = (ok, what, extra = '') => { const l = `${ok ? 'ok  ' : 'FOUT'} ${what}${extra ? ' - ' + extra : ''}`; console.log(l); report.push(l); };
const adb = adbTool();

const HERVAT = flag('--hervat') || flag('--alleen-opslaan'); // verder met het draaiende spel (geen install, geen nieuw spel)
if (!flag('--no-install') && !HERVAT) {
  adb('install', '-r', path.join(OUT, 'gde-groningen-debug.apk'));
  adb('shell', 'pm', 'clear', PKG);
}
if (!HERVAT) { adb('shell', 'am', 'start', '-n', `${PKG}/.MainActivity`); await sleep(8000); }

let d = null;
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
// d.up laat alle vingers los en zet de rest opnieuw neer: de stick krijgt dan zijn oorsprong op de laatste plek
let origin = { x: 150, y: 215 }, lastPos = { ...origin }, stickDown = false;
const pedals = new Map(); // label -> vinger-id
async function button(re, holdMs = 120) {
  const id = await btnId(re);
  if (!id) return false;
  const c = await d.center('#' + id);
  if (!c) return false;
  await d.down(7, c.x, c.y); await sleep(holdMs); await d.up(7);
  if (stickDown) origin = { ...lastPos };
  return true;
}
// houdt een knop ingedrukt (gas, rem) tot hij losgelaten wordt
async function pedal(re, on) {
  const key = String(re);
  if (on && !pedals.has(key)) {
    const id = await btnId(re); const c = id && await d.center('#' + id);
    if (!c) return false;
    pedals.set(key, 20 + pedals.size); await d.down(pedals.get(key), c.x, c.y);
  } else if (!on && pedals.has(key)) {
    const fid = pedals.get(key); pedals.delete(key); await d.up(fid);
    if (stickDown) origin = { ...lastPos };
  }
  return true;
}
const releasePedals = async () => { for (const k of [...pedals.keys()]) await pedal(new RegExp(k.slice(1, -1), 'i'), false); };
async function stick(x, y) {
  const R = 50;
  if (!x && !y) { if (stickDown) { await d.up(1); stickDown = false; origin = { x: 150, y: 215 }; } return; }
  if (!stickDown) { origin = { x: 150, y: 215 }; await d.down(1, origin.x, origin.y); stickDown = true; }
  lastPos = { x: origin.x + x * R, y: origin.y + y * R };
  await d.move(1, lastPos.x, lastPos.y);
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

// alleen tikken als het 'Tik om te beginnen'-scherm er nog is (anders raakt de tik een menuregel)
async function tikOmTeBeginnen() {
  if (await ev(`/Tik om te beginnen/.test(document.body.innerText) && !document.querySelector('.ss-item')`)) { await d.tap(60, 300); await sleep(1500); }
}
let s;
if (!HERVAT) {
// --- 1. start en nieuw spel ---
// eerst 'Tik om te beginnen' (start ook het geluid), dan het menu
if (!(await waitFor(`/Tik om te beginnen/.test(document.body.innerText) || !!document.querySelector('.ss-item')`, 240000, 'laadscherm klaar'))) process.exit(1);
await tikOmTeBeginnen();
if (!(await waitFor(`!!document.querySelector('.ss-item')`, 60000, 'startmenu'))) process.exit(1);
log(true, 'startscherm met touch-UI');
if (await ev(`!!document.querySelector('.ss-news:not([hidden])')`)) { await d.tapEl('.ss-news-close'); await sleep(1200); }
await screenshot('1-startscherm');
await d.tapEl('.ss-item[data-act="new"]');
if (!(await waitFor(`document.body.classList.contains('game-started')`, 60000, 'spel gestart na Nieuw spel'))) process.exit(1);
log(true, 'Nieuw spel gestart met een tik');

// --- 2. opening overslaan (vasthouden) ---
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

}

const SAVEONLY = flag('--alleen-opslaan'); // alleen sectie 5, vanaf het startmenu met een bestaande stand
if (!SAVEONLY) {
// --- 4. M01 spelen: naar de bakkie, instappen, rijden naar de markeringen, alles met aanrakingen ---
const full = async () => JSON.parse(await ev(`(() => { const w = __debug.world, p = w.player, v = p.inVehicle, m = w.mission || {}, c = document.getElementById('cine');
  const mk = m.phase === 'active' && m.marker ? { x: m.marker.x, y: m.marker.y } : w.storyGuide ? { x: w.storyGuide.x, y: w.storyGuide.y } : null;
  const cand = (w.vehicles || []).filter((q) => q !== v && !q.wrecked && !q.isBoat && !q.isHeli && !q.isBike).map((q) => ({ x: q.x, y: q.y, d: Math.hypot(q.x - p.x, q.y - p.y), mc: !!q.missionCar })).sort((a, b) => (b.mc - a.mc) || (a.d - b.d));
  const near = cand[0] || null; // de missie-auto (Berends bakkie) gaat voor
  const dlg = document.querySelector('#hud .cw-panel:not([hidden]) .cw-opt');
  return JSON.stringify({ x: p.x, y: p.y, cam: w.camYaw, t: w.time, money: w.money, hp: p.health, veh: v ? { x: v.x, y: v.y, angle: v.angle, speed: v.speed || 0, mc: !!v.missionCar, bike: !!v.isBike } : null,
    target: mk, near, cine: !!(c && c.classList.contains('active')), dlg: !!dlg, text: (document.querySelector('#hud .hud-mission') || {}).textContent || '', ctx: document.documentElement.dataset.touchCtx,
    step: window.__story.current(), phase: m.phase, paused: !!w.paused }); })()`));
// 1,8 km lopen duurt op een trage emulator te lang: de dev-sprong naar de markering (--lopen: toch lopen)
if (!flag('--lopen')) { await stick(0, 0); log(await ev('window.__story.teleport()'), 'dev-sprong naar Berend (de 1,8 km lopen is niet gespeeld)'); await sleep(3000); }
let last = '', ticks = 0, carTicks = 0, footTicks = 0, boarded = false;
const playUntil = Date.now() + (Number(args[args.indexOf('--min') + 1]) || 12) * 60000;
let driftTick = 0, awayUntil = 0;
// route over wegen of paden (routing.js van het spel, zoals de spelbot): een vaste lijn voor de PathFollower
let follower = null, followKey = '', followAt = 0;
const wedge = new WedgeDetector();
async function aimPoint(f, mode, tgt) {
  const me = f.veh || f;
  const key = mode + Math.round(tgt.x / 5) + ',' + Math.round(tgt.y / 5);
  if (!follower || key !== followKey || Date.now() - followAt > 15000) {
    followKey = key; followAt = Date.now();
    const pts = await ev(`import('/js/routing.js').then((R) => { const r = R.planLandRoute(__debug.world.map, '${mode}', [${me.x}, ${me.y}], [${tgt.x}, ${tgt.y}]); return r && r.pts && r.pts.length ? r.pts : null; }).catch(() => null)`);
    const line = pts || [[me.x, me.y]];
    line.push([tgt.x, tgt.y]);
    follower = new PathFollower(line, { reach: mode === 'drive' ? 7 : 2.5 });
  }
  const direct = Math.hypot(tgt.x - me.x, tgt.y - me.y);
  return direct < 25 ? tgt : follower.next({ x: me.x, y: me.y }) || tgt;
}
while (Date.now() < playUntil) {
  let f;
  try { f = await full(); } catch (e) { await sleep(2000); continue; }
  const key = `${f.step && f.step.id}|${f.phase}|${f.text}|${f.ctx}`;
  if (key !== last) { last = key; console.log(`  [${Math.round(f.t)}s] ${key} @${Math.round(f.x)},${Math.round(f.y)} -> ${f.target ? Math.round(f.target.x) + ',' + Math.round(f.target.y) : '-'}`); await screenshot(`4-${String(++ticks).padStart(2, '0')}`); }
  if (f.step && f.step.id !== 'M01') break;
  if (f.cine) { await stick(0, 0); await releasePedals(); await button(/overslaan/i, 2300); await sleep(1200); continue; }
  if (f.dlg) { await stick(0, 0); await d.tapEl('#hud .cw-panel:not([hidden]) .cw-opt'); await sleep(1500); continue; }
  // 'Stap even uit de marker en weer terug': een stukje weg en dan opnieuw erin
  if (f.target && /uit de marker/i.test(f.text) && !awayUntil) awayUntil = Date.now() + 9000;
  if (awayUntil && Date.now() > awayUntil + 60000) awayUntil = 0;
  if (f.target && awayUntil && Date.now() < awayUntil) f.target = { x: f.target.x + 30, y: f.target.y + 30 };
  const dist = f.target ? Math.hypot(f.target.x - (f.veh || f).x, f.target.y - (f.veh || f).y) : 0;
  // in een andere auto of een fiets dan de missie vraagt: eerst uitstappen (Gebruik)
  if (f.veh && /stap in/i.test(f.text) && !f.veh.mc) { await stick(0, 0); await releasePedals(); await button(/gebruik/i, 150); await sleep(2500); continue; }
  if (f.veh) {
    boarded = true; carTicks++;
    if (!f.target) { await stick(0, 0); await releasePedals(); await sleep(1500); continue; }
    // de stunt: binnen de straal rondjes met gas, volle stuuruitslag en af en toe Handrem (driften geeft punten)
    if (/^stunt/i.test(f.text) && dist < 45) {
      await stick(0.9, 0); await pedal(/^gas$/i, true);
      if (++driftTick % 3 === 0) await button(/handrem/i, 900);
      await sleep(300);
      continue;
    }
    const aim = await aimPoint(f, 'drive', f.target);
    const c = carControls({ x: f.veh.x, y: f.veh.y, angle: f.veh.angle, speed: f.veh.speed }, aim, { stopAt: false, top: 12 });
    if (!c.reverse && wedge.update(f.t, f.veh.speed, c.throttle)) { wedge.reset(); await stick(-0.9, 0); await pedal(/^gas$/i, false); await pedal(/^rem$/i, true); await sleep(1800); await pedal(/^rem$/i, false); continue; }
    await stick(c.steer, 0);
    await pedal(/^gas$/i, c.throttle > 0);
    await pedal(/^rem$/i, c.throttle < 0);
    await sleep(350);
  } else if (/stap in|instap|bakkie|auto/i.test(f.text) && f.near) {
    footTicks++;
    if (f.near.d < 3.2) { await stick(0, 0); await button(/instappen/i, 150); await sleep(2500); }
    else { const [sx, sy] = footStick(headingTo(f, f.near), f.cam); await stick(sx, sy); await sleep(400); }
  } else if (f.target) {
    const [sx, sy] = footStick(headingTo(f, f.target), f.cam);
    await stick(dist > 4 ? sx : 0, dist > 4 ? sy : 0); await sleep(500);
  } else { await stick(0, 0); await sleep(1500); }
}
await stick(0, 0); await releasePedals();
const fin = await full();
log(boarded, 'ingestapt met Instappen en gereden met stick en gas', `${carTicks} rij-ticks`);
log(!!fin.step && fin.step.id !== 'M01', 'M01 afgerond met touch', fin.step && fin.step.id);
await screenshot('5-einde-m01');


}
if (SAVEONLY) { await continueGame(); await sleep(4000); }
// --- 5. opslaan, app doden, opnieuw starten, Doorgaan; daarna dezelfde stand onder de oude sleutel (migratie) ---
const snap = () => ev(`(() => { const w = __debug.world, p = w.player; return JSON.stringify({ x: Math.round(p.x), y: Math.round(p.y), money: w.money, step: __story.current() && __story.current().id }); })()`).then(JSON.parse);
// de sleutel krijgt het verhaal-achtervoegsel (gde-save-v1-nieuw); de herstelkopie (gde-save-herstel-...) is een andere sleutel
const saveKey = () => ev(`Object.keys(localStorage).find((k) => /^(gde-dev:)?(gde|gte)-save-v1/.test(k)) || ''`);
const saveRaw = async () => { const k = await saveKey(); return k ? ev(`localStorage.getItem(${JSON.stringify(k)})`) : ''; };
await stick(0, 0); await releasePedals();
if (await ev(`!!document.getElementById('cine')?.classList.contains('active')`)) { await button(/overslaan/i, 2300); await sleep(1500); }
const before = await snap();
await d.tapEl('#touch-ui .t-pause');
log(await waitFor(`!!document.querySelector('#pause-menu.visible')`, 20000, 'pauzemenu open met II'), 'pauzemenu opent met de pauzeknop');
await sleep(800);
// Opslaan staat onderaan de rail van het pauzemenu, op een telefoon onder de rand: scrollen (programmatisch; een veeg
// met een aanraking scrolde de rail op de emulator niet, nog uit te zoeken)
let saved = false;
for (let i = 0; i < 8 && !saved; i++) {
  if (await d.center('#pause-menu [data-action="save"]')) { await d.tapEl('#pause-menu [data-action="save"]'); saved = true; } else { await ev(`document.querySelector('#pause-menu [data-action="save"]').scrollIntoView({ block: 'center' })`); await sleep(800); }
}
log(saved, 'Opslaan bereikbaar na scrollen van het menu');
await sleep(2500);
const raw1 = await saveRaw();
log(raw1.length > 100, 'Opslaan schrijft gde-save-v1', raw1.length + ' tekens');
await screenshot('6-opgeslagen');
async function restartApp() {
  d.close();
  adb('shell', 'am', 'force-stop', PKG);
  await sleep(2000);
  adb('shell', 'am', 'start', '-n', `${PKG}/.MainActivity`);
  await sleep(8000);
  d = null;
  for (let i = 0; i < 60 && !d; i++) { try { d = await connect(); } catch (e) { await sleep(3000); } }
  await waitFor(`/Tik om te beginnen/.test(document.body.innerText) || !!document.querySelector('.ss-item')`, 240000, 'laadscherm klaar na herstart');
  await tikOmTeBeginnen();
  await waitFor(`!!document.querySelector('.ss-item')`, 60000, 'startmenu na herstart');
  if (await ev(`!!document.querySelector('.ss-news:not([hidden])')`)) { await d.tapEl('.ss-news-close'); await sleep(1200); }
}
async function continueGame() {
  await waitFor(`/Tik om te beginnen/.test(document.body.innerText) || !!document.querySelector('.ss-item')`, 240000, 'laadscherm klaar');
  await tikOmTeBeginnen();
  if (await ev(`!!document.querySelector('.ss-news:not([hidden])')`)) { await d.tapEl('.ss-news-close'); await sleep(1200); }
  await waitFor(`!!document.querySelector('.ss-item[data-act="continue"]')`, 30000, 'Doorgaan in het menu');
  for (let i = 0; i < 10 && !(await d.center('.ss-item[data-act="continue"]')); i++) await sleep(1500);
  await d.tapEl('.ss-item[data-act="continue"]');
  return waitFor(`document.body.classList.contains('game-started')`, 90000, 'Doorgaan start het spel');
}
await restartApp();
const kept = await saveRaw();
log(kept.length > 100 && kept === raw1, 'spelstand overleeft het afsluiten van de app', kept.length + ' tekens');
log(await continueGame(), 'Doorgaan laadt de spelstand');
await sleep(4000);
const after = await snap();
log(after.step === before.step && Math.abs(after.money - before.money) < 1, 'stap en geld na laden gelijk', JSON.stringify(before) + ' -> ' + JSON.stringify(after));
await screenshot('7-geladen');
// migratie: een stand onder de oude sleutel (gte-save-v1) moet nog steeds laden
const key = await ev(`(() => { const k = Object.keys(localStorage).find((k) => /^gde-save-v1/.test(k)); const v = localStorage.getItem(k); localStorage.setItem(k.replace('gde-', 'gte-'), v); localStorage.removeItem(k); return k; })()`);
await restartApp();
const migrated = (await saveKey()).startsWith('gde-');
log(migrated, 'oude sleutel gte-save-v1 migreert naar ' + key);
log(await continueGame(), 'Doorgaan werkt na migratie');


// --- 6. systeem: terugknop, rotatie, naar de achtergrond en terug, app gedood, geluid, fps en profiel ---
const keyevent = (k) => adb('shell', 'input', 'keyevent', k);
const savedAt = async () => { const raw = await saveRaw(); try { return JSON.parse(raw).savedAt || 0; } catch (e) { return 0; } };
if (!(await ev(`document.body.classList.contains('game-started')`))) await continueGame(); // na de migratie staat het spel al aan
await waitFor(`document.body.classList.contains('game-started')`, 90000, 'spel draait voor de systeemstappen');
await sleep(3000);
if (await ev(`!!document.getElementById('cine')?.classList.contains('active')`)) { await button(/overslaan/i, 2300); await sleep(1500); }
// 6a. terugknop = pauzemenu, nog een keer = weer terug in het spel
keyevent('KEYCODE_BACK');
log(await waitFor(`!!document.querySelector('#pause-menu.visible')`, 20000, 'terugknop opent pauzemenu'), 'terugknop opent het pauzemenu');
keyevent('KEYCODE_BACK');
log(await waitFor(`!document.querySelector('#pause-menu.visible')`, 20000, 'terugknop sluit pauzemenu'), 'tweede terugknop sluit het pauzemenu');
// 6b. rotatie: het toestel mag alleen liggend (sensorLandscape); 180 graden draaien blijft liggend en bruikbaar
adb('shell', 'settings', 'put', 'system', 'accelerometer_rotation', '0');
for (const rot of ['3', '1']) {
  adb('shell', 'settings', 'put', 'system', 'user_rotation', rot);
  await sleep(4000);
  const dims = await ev('innerWidth + "x" + innerHeight');
  const [w, h] = dims.split('x').map(Number);
  log(w > h && await ev(`!!document.getElementById('touch-ui') && document.documentElement.dataset.touchClass === 'phone'`), 'rotatie ' + (rot === '3' ? '270' : '90') + ' graden blijft liggend met touch-UI', dims);
  await screenshot('8-rotatie-' + rot);
}
// 6c. naar de achtergrond: de stand wordt bewaard; terug: pauzemenu
const t0 = await savedAt();
keyevent('KEYCODE_HOME');
await sleep(4000);
adb('shell', 'am', 'start', '-n', `${PKG}/.MainActivity`);
await sleep(4000);
const t1 = await savedAt();
log(t1 > t0, 'stand bewaard bij naar de achtergrond gaan', `${t0} -> ${t1}`);
log(await waitFor(`!!document.querySelector('#pause-menu.visible')`, 20000, 'pauzemenu na terugkeer'), 'terug uit de achtergrond staat het spel in het pauzemenu');
// 6d. geluid
const au = JSON.parse(await ev('JSON.stringify(__audio.state())'));
log(au.ctx === 'running', 'AudioContext draait (geen blokkade door autoplay)', 'ctx ' + au.ctx + ', tijd ' + au.time);
log(!!au.gmusic && au.gmusic.started && !au.gmusic.error, 'muziek gestart', JSON.stringify({ current: au.gmusic.current, paused: au.gmusic.paused, tracks: au.gmusic.tracks }));
// 6e. profiel en fps (pauzemenu eerst dicht)
keyevent('KEYCODE_BACK');
await waitFor(`!document.querySelector('#pause-menu.visible')`, 20000, 'menu dicht');
const gfx = JSON.parse(await ev(`(() => { const s = JSON.parse(localStorage.getItem('gde-settings') || '{}'); return JSON.stringify({ q: s.quality, res: s.resolution, dd: s.drawDistance, sh: s.shadows, auto: s.autoResolution, advies: localStorage.getItem('gde-gfx-advice'), cores: navigator.hardwareConcurrency, mem: navigator.deviceMemory }); })()`));
log(gfx.q === 'laag' && gfx.sh === false, 'lage-end profiel automatisch gekozen', JSON.stringify(gfx));
const fps = await ev(`new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 10000) requestAnimationFrame(f); else res(+(n / ((performance.now() - t0) / 1000)).toFixed(1)); }; requestAnimationFrame(f); })`);
log(true, 'fps op de emulator (10 s, te voet; zegt niets over een telefoon)', String(fps));
// 6f. app gedood op de achtergrond, opnieuw starten, Doorgaan
const t2 = await savedAt();
d.close();
keyevent('KEYCODE_HOME'); await sleep(3000);
adb('shell', 'am', 'kill', PKG); await sleep(2000);
const alive = (() => { try { return adb('shell', 'pidof', PKG); } catch (e) { return ''; } })();
log(!alive, 'app in de achtergrond door Android gedood (am kill)');
adb('shell', 'am', 'start', '-n', `${PKG}/.MainActivity`); await sleep(8000);
d = null; for (let i = 0; i < 60 && !d; i++) { try { d = await connect(); } catch (e) { await sleep(3000); } }
log(await continueGame(), 'Doorgaan na een gedode app laadt de stand');
log((await savedAt()) >= t2, 'stand na het doden niet ouder dan voor het doden');

await d.ev('1'); // houdt de verbinding warm
fs.writeFileSync(path.join(DIR, 'verslag.txt'), report.join('\n') + '\n');
d.close();
console.log(report.some((l) => l.startsWith('FOUT')) ? 'ritje met fouten' : 'ritje geslaagd');
