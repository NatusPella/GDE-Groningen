// De gedeelde vensterpomp, de rustpoort, tilesIn en de begrensde bouwlijst (code-review 21-11, #1052).
//   node scripts/streamwindows_test.mjs
import assert from 'node:assert/strict';
import { createDrainPump, mapBusy, createCalmGate, joinQueues, BG_SLICE_MS, setHoldProbe, backgroundHeld } from '../game/js/tilestream.js';
import { FrameQueue } from '../game/js/tilestore.js';
import { tilesIn } from '../game/js/tileplace.js';
import { TileWorld, BUILDING_DELTA_MAX } from '../game/js/tileworld.js';

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };

// ---- de pomp: vijf vensters delen het budget per frame ----
{
  let t = 0;
  const now = () => t;
  const q = new FrameQueue();
  const perFrame = [];
  let cur = 0, total = 0;
  for (let i = 0; i < 600; i++) q.add(() => { t += 0.5; cur += 0.5; total++; }, 1);
  const pump = createDrainPump({ queue: q, now, nextFrame: async () => { perFrame.push(cur); cur = 0; t += 10; } });
  const done = [];
  for (let w = 0; w < 5; w++) pump.add({ sliceMs: BG_SLICE_MS, until: null }).then((f) => done.push(f));
  await new Promise((r) => setTimeout(r, 0));
  while (pump.size) await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
  ok(total === 600 && q.items.length === 0, 'alle rijen werden afgewerkt');
  ok(done.length === 5, 'alle vijf de vensters werden klaar');
  ok(Math.max(...perFrame) <= BG_SLICE_MS + 0.5 + 1e-9, `hoogstens ${Math.max(...perFrame)} ms per frame voor vijf vensters (was 5 x ${BG_SLICE_MS} ms)`);
  ok(pump.stats.windowsMax === 5, 'ze waren tegelijk actief');
}
// een venster dat op zijn eigen tegels wacht (until) is klaar zodra die er zijn, ook als de wachtrij nog werk heeft
{
  let t = 0; const now = () => t; const q = new FrameQueue(); let mine = 0;
  for (let i = 0; i < 100; i++) q.add(() => { t += 0.5; if (i === 3) mine = 1; }, 1);
  const pump = createDrainPump({ queue: q, now, nextFrame: async () => { t += 10; } });
  const frames = await pump.add({ sliceMs: 3, until: () => mine === 1 });
  ok(mine === 1 && q.items.length > 0 && frames <= 3, `until: klaar na ${frames} frames, de rest blijft staan`);
}
// vasthouden: een vastgehouden venster kost niets en wordt na de vasthouding bediend
{
  let t = 0; const now = () => t; const q = new FrameQueue(); let ran = 0;
  for (let i = 0; i < 10; i++) q.add(() => { t += 0.5; ran++; }, 1);
  let held = true, frame = 0;
  const pump = createDrainPump({ queue: q, now, nextFrame: async () => { t += 16; if (++frame === 20) held = false; } });
  const p = pump.add({ sliceMs: 3, hold: () => held });
  await p;
  ok(ran === 10 && frame >= 20, `vastgehouden tot frame 20, daarna klaar (${frame} frames)`);
  ok(frame >= 20, 'tijdens de vasthouding gebeurde er niets');
}
// een urgent venster naast een achtergrondvenster: het grootste budget geldt, niet de som
{
  let t = 0; const now = () => t; const q = new FrameQueue(); const per = []; let cur = 0;
  for (let i = 0; i < 200; i++) q.add(() => { t += 0.5; cur += 0.5; }, 1);
  const pump = createDrainPump({ queue: q, now, nextFrame: async () => { per.push(cur); cur = 0; t += 10; } });
  pump.add({ sliceMs: 6 }); pump.add({ sliceMs: 3 }); pump.add({ sliceMs: 3 });
  while (pump.size) await new Promise((r) => setTimeout(r, 0));
  ok(Math.max(...per) <= 6.5 + 1e-9, `urgent (6) en twee achtergrond (3): hoogstens ${Math.max(...per)} ms, niet 12`);
}
// de planner-hook krijgt het gewenste budget en mag het verlagen
{
  let t = 0; const now = () => t; const q = new FrameQueue(); const per = []; let cur = 0;
  for (let i = 0; i < 100; i++) q.add(() => { t += 0.5; cur += 0.5; }, 1);
  const spent = [];
  const pump = createDrainPump({ queue: q, now, nextFrame: async () => { per.push(cur); cur = 0; t += 10; }, grant: (b) => Math.min(b, 1), onSpend: (ms, b) => spent.push([ms, b]) });
  await pump.add({ sliceMs: 3 });
  ok(Math.max(...per) <= 1.5 + 1e-9 && spent.length > 0 && spent.every(([, b]) => b === 3), 'grant begrenst het budget, onSpend meldt wat er is uitgegeven');
}
holdFree();
function holdFree() { setHoldProbe(null); ok(backgroundHeld() === false, 'geen vasthouding blijft hangen'); }

// ---- de rustpoort kijkt naar beide wachtrijen ----
{
  const map = { tileQueue: new FrameQueue(), bgQueue: new FrameQueue() };
  ok(mapBusy(map) === false && mapBusy(null) === false && mapBusy({}) === false, 'lege kaart: rustig');
  map.bgQueue.add(() => {}, 1);
  ok(mapBusy(map) === true, 'een achtergrondtegel telt mee (de oude poorten zagen hem niet)');
  const gate = createCalmGate(2000);
  ok(gate(map, 0) === true, 'de eerste keer mag (er wacht anders niemand)');
  ok(gate(map, 100) === false && gate(map, 1999) === false, 'daarna wacht hij zolang de kaart bezig is');
  ok(gate(map, 2000) === true && gate(map, 2001) === false, 'en hoogstens eens per twee seconden, zodat hij nooit voor altijd wacht');
  map.bgQueue.items.length = 0;
  ok(gate(map, 2002) === true && gate(map, 2003) === true, 'rustig: altijd');
  const zonderBg = { tileQueue: new FrameQueue() };
  zonderBg.tileQueue.add(() => {}, 1);
  ok(mapBusy(zonderBg) === true, 'de gewone wachtrij telt nog steeds');
}

// ---- tilesIn wacht op verwerkte rijen ----
{
  const keys = ['a', 'b'];
  let pending = true;
  const map = { store: { keysAround: () => keys, missing: () => [] }, tilesPending: () => pending };
  ok(tilesIn(map, [[0, 0]]) === false, 'tegels in de store maar de rijen nog in de wachtrij: niet binnen');
  pending = false;
  ok(tilesIn(map, [[0, 0]]) === true, 'rijen verwerkt: binnen');
  ok(tilesIn({ store: { keysAround: () => keys, missing: () => ['a'] }, tilesPending: () => false }, [[0, 0]]) === false, 'ontbrekende tegel: niet binnen');
  ok(tilesIn({}, [[0, 0]]) === true && tilesIn({ store: { keysAround: () => keys, missing: () => [] } }, [[0, 0]]) === true, 'geen store of geen wachtrij: zoals voorheen');
}

// ---- de bouwlijst voor de routing is begrensd ----
{
  const fake = { _buildingDelta: [], _noteBuildingDelta: TileWorld.prototype._noteBuildingDelta };
  for (let i = 0; i < BUILDING_DELTA_MAX; i++) fake._noteBuildingDelta({ i });
  ok(fake._buildingDelta.length === BUILDING_DELTA_MAX && !fake._buildingDeltaOverflow, 'tot de grens gewoon bijhouden');
  fake._noteBuildingDelta({ i: -1 });
  ok(fake._buildingDelta.length === 0 && fake._buildingDeltaOverflow === true, 'over de grens: leeg en gemeld als overloop (de routing toetst alles opnieuw)');
  const geen = { _noteBuildingDelta: TileWorld.prototype._noteBuildingDelta };
  geen._noteBuildingDelta({});
  ok(geen._buildingDelta === undefined, 'zonder lijst (de routing draait niet) gebeurt er niets');
  // ook als niemand hem leest blijft het geheugen begrensd
  const f2 = { _buildingDelta: [], _noteBuildingDelta: TileWorld.prototype._noteBuildingDelta };
  for (let i = 0; i < BUILDING_DELTA_MAX * 3; i++) f2._noteBuildingDelta({ i });
  ok(f2._buildingDelta.length <= BUILDING_DELTA_MAX, 'altijd begrensd');
}

console.log(`streamwindows_test: ${n} controles groen`);
