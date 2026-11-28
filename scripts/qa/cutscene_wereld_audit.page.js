// Pagina-helft van scripts/qa/cutscene_wereld_audit.mjs (desktop --perf-script): de camera van elke cutscene langs het hele pad op de ECHTE kaart.
// window.__wa = { items: [{ id, spots: [{ naam, x, y, a }] }], step } staat ervoor. Per cutscene en plek: de ankerstand zoals het spel hem kiest
// (fitAnchor met de gebouwen van de kaart), de camera elke `step` s, en de plekken waar hij in een gebouw of boom zit of er tussen twee
// beelden doorheen gaat (camguard.js pathViolations), of binnen 0,35 m van een muur komt (nabije-clip). Daarna dezelfde stroom door de
// camerabescherming (createCamGuard): wat dan nog overblijft is een echte fout.
const D = window.__debug; const w = D.world; const map = w.map;
const imp = (f) => import('/js/' + f + '.js');
const WA = window.__wa || { items: [], step: 0.1 };
const scr = await imp('cutscript');
const prev = await imp('cutpreview');
const cam = await imp('camerapath');
const G = await imp('camguard');
const gr = await imp('greenery');
await imp('cutscenehost');
const script = await (await fetch('/storydata/script.json')).json();
const src = await (await fetch('/js/missionstory.js')).text();
const cat = prev.buildCatalog({ script, npcSource: src });
const byId = new Map(cat.map((e) => [e.id, e]));
const r2 = (v) => Math.round(v * 100) / 100;
const solid = (x, y, z) => cam.roofAt(map, x, y) > z - 0.2;
const tree = (x, y, z) => { if (typeof map.treesNear !== 'function') return false; for (const t of map.treesNear(x, y, 12)) if (gr.treeBlocksPoint(t, x, y, z, 0.35)) return true; return false; };
const blocked = (x, y, z) => solid(x, y, z) || tree(x, y, z);
const nearWall = (x, y, z) => solid(x + 0.35, y, z) || solid(x - 0.35, y, z) || solid(x, y + 0.35, z) || solid(x, y - 0.35, z);
const out = {};
for (const it of WA.items) {
  const e = byId.get(it.id);
  if (!e || !e.scene) { out[it.id] = { fout: 'niet in de catalogus' }; continue; }
  for (const sp of it.spots) {
    const gz = map.groundHeightAt ? map.groundHeightAt(sp.x, sp.y, 0) || 0 : 0;
    const env = { solid, tree };
    const at = scr.fitAnchor(e.scene, { x: sp.x, y: sp.y, facing: sp.a || 0, z: gz }, env, { radii: [4, 7, 10] });
    const samples = [], guarded = [];
    const guard = G.createCamGuard({ blocked, nudge: (q) => G.nudgeFromWalls(solid, q) });
    let lastIdx = null, near = 0, nearT = null, nearG = 0;
    for (let t = 0; t <= e.duration - 0.05; t += WA.step) {
      const s = e.scene.sample(t, at, env);
      const c = s.camera;
      const smp = { t: r2(t), shotIndex: c.shotIndex, cut: !!c.cut || c.shotIndex !== lastIdx, position: { x: c.position.x, y: c.position.y, z: c.position.z } };
      lastIdx = c.shotIndex;
      samples.push(smp);
      if (nearWall(c.position.x, c.position.y, c.position.z) && !solid(c.position.x, c.position.y, c.position.z)) { near++; if (nearT == null) nearT = r2(t); }
      const gp = guard.apply({ position: { ...smp.position }, shotIndex: smp.shotIndex, cut: smp.cut }, WA.step);
      guarded.push({ t: smp.t, shotIndex: smp.shotIndex, cut: smp.cut, position: gp.position });
      if (nearWall(gp.position.x, gp.position.y, gp.position.z)) nearG++;
    }
    const raw = G.pathViolations(blocked, samples);
    const na = G.pathViolations(blocked, guarded);
    (out[it.id] = out[it.id] || {})[sp.naam] = { anker: { x: r2(at.x), y: r2(at.y), facing: r2(at.facing) }, in: raw.filter((q) => q.soort === 'in').length, door: raw.filter((q) => q.soort === 'door').length, eerst: raw[0] ? { t: raw[0].t, soort: raw[0].soort } : null, naWand: near, naWandT: nearT, naGuard: { in: na.filter((q) => q.soort === 'in').length, door: na.filter((q) => q.soort === 'door').length, naWand: nearG }, guard: guard.stats };
  }
}
return JSON.stringify({ out });
