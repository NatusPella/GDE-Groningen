// Beeldcheck voor #197 (windwijzer), #199 (fotomodus) en #203 (evenement): desktop --perf-script body.
// Elke synthetische keydown krijgt een keyup. Wegwerpprofiel, geen echte opslag.
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const imp = (f) => import('/js/' + f + '.js');
const cine = await imp('cinematics'); const VH = await imp('vehicle'); const BT = await imp('boattypes'); const WL = await imp('waterlevels');
const EV = await imp('evenementen'); const FU = await imp('fotomodusui'); const DN = await imp('daynight');
const out = { fouten: [] };
const origErr = console.error.bind(console); console.error = (...a) => { out.fouten.push(a.map(String).join(' ').slice(0, 200)); origErr(...a); };
window.addEventListener('error', (e) => out.fouten.push('error: ' + e.message));
setInterval(() => { if (!window.__keepCine && cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true; D.input.canLock = () => false;
const key = (type, k, code) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(type, { key: k, code: code || k, bubbles: true })); };
const tap = async (k, code, ms = 80) => { key('keydown', k, code); await sleep(ms); key('keyup', k, code); await sleep(120); };
const snap = async (name) => { await sleep(600); console.log('[capture] ' + name); await sleep(600); };
const teleport = (x, y) => { if (p.inVehicle) p.exitVehicle(map, w); p.x = x; p.y = y; p.vx = p.vy = 0; p.z = 0; p.vz = 0; p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0; };
const fix = (hour) => { w.clock = hour; w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity }; if (DN.refreshDayNight) DN.refreshDayNight(w); };
let hold = null;
const loop = () => { if (hold && !p.inVehicle) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; } requestAnimationFrame(loop); }; loop();
const go = async (x, y, ms = 9000) => { teleport(x, y); hold = { x, y }; await sleep(ms * 0.6); teleport(x, y); await sleep(ms * 0.4); };

// de start: Enter tot het spel loopt (de harnas-Enter kan te vroeg zijn)
for (let i = 0; i < 40 && !document.body.classList.contains('game-started'); i++) { await tap('Enter', 'Enter'); await sleep(1500); }
for (let i = 0; i < 25 && w.paused; i++) { await tap(' ', 'Space'); await sleep(700); }
out.gestart = document.body.classList.contains('game-started');
await sleep(3000);

// zeilregatta: een zeilboot bij een jachthaven, E start, de eerste ton aanvaren
try {
  hold = null; fix(14);
  await sleep(2500);
  const lijst = window.__regatta.marinas(); out.havens = lijst.length;
  const waterOk = (x, y) => { const q = WL.waterAt(map, x, y); return !!(q && q.navigable && q.depth > 1.5); };
  const KB = await imp('regattabaan');
  let gekozen = null;
  for (const m of lijst) { const b = KB.kiesBaan(m.x, m.y, waterOk); if (b) { gekozen = { m, b }; break; } }
  out.haven = gekozen && gekozen.m.name; out.baan = gekozen && gekozen.b.tonnen.map((t) => [Math.round(t.x), Math.round(t.y)]);
  if (gekozen) {
    const { m, b } = gekozen;
    // begin in water naast de haven: het dichtstbijzijnde waterpunt rond het havenmidden
    let sp = null; for (let r = 0; r < 120 && !sp; r += 6) for (let k = 0; k < 16 && !sp; k++) { const a2 = k / 16 * Math.PI * 2, x = m.x + Math.cos(a2) * r, y = m.y + Math.sin(a2) * r; if (waterOk(x, y)) sp = { x, y }; }
    out.start = sp;
    await go(sp.x, sp.y, 7000); hold = null;
    const t0 = b.tonnen[0];
    const v = new VH.Vehicle(sp.x, sp.y, Math.atan2(t0.y - sp.y, t0.x - sp.x), { ...BT.BOAT_KINDS.zeilboot }); v.isBoat = true; v.speed = 0; w.vehicles.push(v);
    p.enterVehicle(v, w); await sleep(1200);
    await tap('e', 'KeyE', 120); await sleep(800);
    out.gestart = !!window.__regatta.state();
    await snap('regatta-start');
    // teleporteer de boot langs de tonnen (alleen de regels en de HUD controleren; het zeilen zelf staat los)
    const trace = [];
    for (let ronde = 0; ronde < 2; ronde++) for (let i = 0; i < b.tonnen.length; i++) {
      v.x = b.tonnen[i].x; v.y = b.tonnen[i].y; await sleep(1100);
      const st = window.__regatta.state(); trace.push(st ? [st.ronde, st.volgend] : null);
      if (ronde === 0 && i === 1) await snap('regatta-onderweg');
    }
    out.trace = trace; await sleep(1500); out.klaar = !window.__regatta.state();
    await snap('regatta-klaar');
    if (p.inVehicle) p.exitVehicle(map, w);
  }
} catch (e) { out.fouten.push('regatta: ' + e.message); }
return JSON.stringify(out);
