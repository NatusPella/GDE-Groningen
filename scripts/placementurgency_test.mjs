// Pure tests van de urgentie van plaatsingsvensters (#1052, #1016): een faciliteit nabij, een cutscene die loopt, een
// activiteit of een herstel: het venster is urgent, wordt niet vastgehouden en is binnen het budget klaar.
//   node scripts/placementurgency_test.mjs
import assert from 'node:assert/strict';
import { urgencyMode, urgencyModeFor, nearestPointDist, installActivityProbe, URGENT_NEAR_M, URGENT_SLICE_MS } from '../game/js/placementurgency.js';
import { BACKGROUND_PRIORITY, BG_SLICE_MS, drainSliced, holdBackground, setHoldProbe, backgroundHeld } from '../game/js/tilestream.js';
import { FrameQueue } from '../game/js/tilestore.js';
import { createFramePlanner, PLAN } from '../game/js/streamplanner.js';

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };

// ---- de stand ----
ok(urgencyMode({ urgent: true }).mode === 'sync' && urgencyMode({ urgent: true }).sliceMs === 0 && urgencyMode({ urgent: true }).priority === -500, 'een teleport die de speler koos: synchroon, top-prioriteit');
{
  const w = urgencyMode({ near: 120 });
  ok(w.mode === 'urgent' && w.held === false && w.sliceMs >= URGENT_SLICE_MS && w.priority === 120, 'faciliteit op 120 m: urgent, niet vastgehouden, ruim budget, prioriteit = afstand');
}
ok(urgencyMode({ near: URGENT_NEAR_M }).mode === 'urgent' && urgencyMode({ near: URGENT_NEAR_M + 1 }).mode === 'background', 'de grens op URGENT_NEAR_M');
ok(urgencyMode({ near: 5000, activity: true }).mode === 'urgent' && urgencyMode({ near: 5000, restoring: true }).mode === 'urgent', 'een lopende activiteit of een herstel is urgent, ook ver weg');
{
  const w = urgencyMode({ near: 5000 });
  ok(w.mode === 'background' && w.held && w.priority === BACKGROUND_PRIORITY && w.sliceMs === BG_SLICE_MS, 'ver weg zonder activiteit: achtergrond (zoals voorheen)');
  ok(urgencyMode({ near: 5000, slice: 6 }).sliceMs === 6, 'een eigen slice van de aanroeper blijft');
}
ok(urgencyMode({}).mode === 'background', 'zonder gegevens: achtergrond');
ok(nearestPointDist([[0, 0], [30, 40]], { x: 30, y: 36 }) === 4, 'dichtstbijzijnde punt');
ok(nearestPointDist([], { x: 0, y: 0 }) === Infinity && nearestPointDist([[1, 1]], null) === Infinity && nearestPointDist([[NaN, 1]], { x: 0, y: 0 }) === Infinity, 'onbekend: oneindig, geen NaN');
installActivityProbe(() => true);
ok(urgencyModeFor([[9000, 9000]], { x: 0, y: 0 }).mode === 'urgent', 'de activiteitssonde maakt elk venster urgent');
installActivityProbe(null);
ok(urgencyModeFor([[100, 0]], { x: 0, y: 0 }).mode === 'urgent' && urgencyModeFor([[9000, 0]], { x: 0, y: 0 }).mode === 'background', 'urgencyModeFor uit punten en focus');

// ---- faciliteit nabij + cutscene actief -> klaar binnen budget ----
// een wachtrij met `items` tegelrijen van elk 0,5 ms (modeltijd); een frame is 16 ms; een cutscene houdt het achtergrondwerk vast
async function runWindow(mode, items, { cutscene, frames = 400 }) {
  let t = 0;
  const now = () => t;
  const q = new FrameQueue();
  let done = 0;
  for (let i = 0; i < items; i++) q.add(() => { t += 0.5; done++; }, 1);
  setHoldProbe(() => cutscene);
  let frame = 0;
  const nextFrame = async () => { t += 16; frame++; if (frame > frames) { cutscene = false; } };
  // cutscene eindigt na `frames` frames (anders zou het achtergrondvenster nooit klaar komen: de vasthouding eindigt bij BG_HOLD_MAX_MS)
  const f = await drainSliced(q, { sliceMs: mode.sliceMs || 3, nextFrame, now, maxMs: 20000, hold: mode.held ? backgroundHeld : null });
  setHoldProbe(null);
  return { frames: f, done, left: q.items.length, spentMs: t };
}
{
  // 60 rijen = 30 ms werk: urgent = 6 ms per frame = 5 frames
  const w = urgencyMode({ near: 100 });
  const r = await runWindow(w, 60, { cutscene: true });
  ok(r.left === 0 && r.done === 60, 'faciliteit op 100 m tijdens een cutscene: alle rijen klaar');
  ok(r.frames <= Math.ceil(30 / w.sliceMs) + 1, `en binnen ${r.frames} frames (budget ${w.sliceMs} ms per frame)`);
  // hetzelfde venster als achtergrond blijft tijdens de cutscene staan
  const bg = urgencyMode({ near: 9000 });
  let t = 0; const q = new FrameQueue(); let doneBg = 0;
  for (let i = 0; i < 60; i++) q.add(() => { t += 0.5; doneBg++; }, 1);
  setHoldProbe(() => true);
  let calls = 0;
  const p = drainSliced(q, { sliceMs: bg.sliceMs, nextFrame: async () => { t += 16; calls++; if (calls === 30) setHoldProbe(() => false); }, now: () => t, hold: backgroundHeld });
  await p; setHoldProbe(null);
  ok(doneBg === 60 && calls >= 30, `een ver venster wacht de cutscene af (${calls} frames) en wordt daarna klaar`);
}
{
  // een groot urgent venster (400 rijen = 200 ms) loopt niet in één klap: hoogstens URGENT_SLICE_MS per frame
  const w = urgencyMode({ near: 50 });
  let t = 0; const now = () => t; const q = new FrameQueue(); const perFrame = []; let cur = 0;
  for (let i = 0; i < 400; i++) q.add(() => { t += 0.5; cur += 0.5; }, 1);
  await drainSliced(q, { sliceMs: w.sliceMs, nextFrame: async () => { perFrame.push(cur); cur = 0; t += 10; }, now, maxMs: 20000 });
  ok(Math.max(...perFrame) <= URGENT_SLICE_MS + 0.5 + 1e-9, `hoogstens ${Math.max(...perFrame)} ms tegelwerk per frame`);
  ok(perFrame.length >= 200 / URGENT_SLICE_MS - 1, 'en het is verdeeld over frames');
}

// ---- de planner: urgent is een eigen klasse, nooit vastgehouden ----
{
  const pl = createFramePlanner();
  // een film houdt alles vast
  pl.openFrame({ frameMs: 10, hold: true });
  ok(pl.grant('tile', 5) === 0 || pl.grant('tile', 5) <= PLAN.minUnitMs, 'niet-urgent werk wordt tijdens een film vastgehouden');
  const g = pl.grant('urgent', 100);
  ok(g === PLAN.urgentMs, 'urgent werk krijgt zijn eigen budget, ondanks de film');
  pl.spend('urgent', g);
  ok(pl.grant('urgent', 100) === 0, 'maar niet meer dan urgentMs per frame');
  pl.openFrame({ frameMs: 40, hold: true });
  ok(pl.grant('urgent', 100) === PLAN.urgentMs, 'ook bij een trage frame: urgent');
  // urgent telt niet mee in de pool van de rest (de totaalgrens van capMs geldt voor niet-urgent)
  pl.openFrame({ frameMs: 10 });
  const before = pl.pool; pl.spend('urgent', 6);
  ok(pl.grant('building', 100) <= before + 1e-9 && pl.grant('building', 100) > 0, 'urgent werk neemt het budget van de rest niet weg');
}
// de wachtrij van de planner kent urgent als klasse en voert hem uit
{
  let t = 0; const now = () => t; const pl = createFramePlanner(); const order = [];
  pl.openFrame({ frameMs: 10, hold: true });
  pl.submit({ cls: 'urgent', rank: 100, est: 0.5, step: () => { t += 0.5; order.push('u'); return true; } });
  pl.submit({ cls: 'tile', rank: 1, est: 0.5, step: () => { t += 0.5; order.push('t'); return true; } });
  pl.runQueue('urgent', now);
  ok(order.join() === 'u', 'tijdens een film loopt alleen het urgente werk');
}
holdBackground(false);

// ---- #1052: na een lading en bij een lopende activiteit zijn vensters urgent (de bedrading) ----
{
  const { noteRestore, restoreActive, resetRestore, RESTORE_MS } = await import('../game/js/placementurgency.js');
  resetRestore();
  ok(!restoreActive(1000) && urgencyModeFor([[9000, 0]], { x: 0, y: 0 }).mode === 'background', 'zonder lading: ver weg blijft achtergrond');
  noteRestore(); // klok = performance.now()
  ok(urgencyModeFor([[9000, 0]], { x: 0, y: 0 }).mode === 'urgent', 'na een geladen savegame is een ver venster urgent');
  ok(restoreActive(performance.now() + RESTORE_MS - 1) && !restoreActive(performance.now() + RESTORE_MS + 1), 'het herstelvenster duurt RESTORE_MS');
  resetRestore();
  ok(urgencyModeFor([[9000, 0]], { x: 0, y: 0 }).mode === 'background', 'daarna weer achtergrond');
  const fs = await import('node:fs');
  const main = fs.readFileSync(new URL('../game/js/main.js', import.meta.url), 'utf8');
  const sg = fs.readFileSync(new URL('../game/js/savegame.js', import.meta.url), 'utf8');
  ok(/installActivityProbe\(\(\) => playerBusy\(world, \[[^\]]*'missionPhase'[^\]]*\]\)\.busy\)/.test(main), 'main.js hangt de activiteitssonde aan playerBusy (missie, bijbaan, wedstrijd, minigame)');
  ok(!/'cinematic'/.test(main.match(/installActivityProbe\(.*/)[0]), 'een cutscene alleen telt niet als activiteit (die houdt achtergrondwerk juist vast)');
  ok(/if \(r\.ok\) \{ bewarenUit = false; (?:clearSafe\(\); )?noteRestore\(\); return true; \}/.test(sg), // #1295: clearSafe ervoor 'savegame.js meldt een geslaagde lading met noteRestore');
}

console.log(`placementurgency_test: ${n} controles groen`);
