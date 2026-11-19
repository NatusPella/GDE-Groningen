// Page half of scripts/qa/bouwsteen_wachtfiguur_beeld.mjs (desktop --perf-script body). Zet voor elke soort wachtplek
// (bank, kist, baal, ton, plant, koffie, krant, hengel) de kring met spullen en de wachtfiguur zeven meter voor de
// speler, speelt de idle-animatie een paar seconden en maakt een opname per plek. Raakt geen missie en geen opslag;
// de groep gaat er na elke opname weer af. Beoordeel: staat de figuur op de grond en naast de spullen, kijkt hij naar
// de kring, zijn de armen (horloge, koffie, lezen) geloofwaardig, flikkert er niets bij de overgang tussen clips.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const W = await import('/js/wachtprops.js');
const out = { fouten: [], standen: 0 };
const world = window.__debug && window.__debug.world;
const p = world && world.player;
if (!p) { out.fouten.push('geen speler'); return JSON.stringify({ results: { wachtfiguur: out } }); }
const target = { x: p.x + Math.cos(p.angle) * 7, y: p.y + Math.sin(p.angle) * 7, z: 0 };
for (const prop of W.PROP_KINDS) {
  const st = { kind: 'hold', label: `Wacht bij ${prop}`, time: 20, wacht: { figuur: true, prop, seed: 0.37 } };
  const g = W.buildWaitDressing(st, target, 3.5, world);
  if (!g) { out.fouten.push(`${prop}: geen groep`); continue; }
  if (!g.userData.figuur) out.fouten.push(`${prop}: geen figuur`);
  let t = 0, last = performance.now();
  while (t < 4) { await new Promise((r) => requestAnimationFrame(r)); const now = performance.now(); const dt = (now - last) / 1000; last = now; t += dt; W.tickWaitFigure(g, dt); W.updateWaitDressing(g, t / 4); }
  out.standen++;
  console.log(`[capture] wachtfiguur-${prop}`);
  await sleep(600);
  W.disposeWaitDressing(g);
}
console.log(`[wachtfiguur] plekken ${out.standen}, fouten ${out.fouten.length}`);
return JSON.stringify({ results: { wachtfiguur: out } });
