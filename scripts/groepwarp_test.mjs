// Test van groepwarp.js: een warp, reisscène of finale neemt de gasten van de sessie mee (audit speelbaarheid 23-11).
//   node scripts/groepwarp_test.mjs
import fs from 'node:fs';
import { warpGasten, gastenMeeAanBoord, zetGroepWarpHaken, plekVoor, WARP_RINGEN, WARP_MELDING } from '../game/js/groepwarp.js';

let n = 0, fout = 0;
const ok = (c, m) => { n++; if (!c) { fout++; console.log('FOUT: ' + m); } };
const lees = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');

function wereld({ rol = 'host', vrij = null } = {}) {
  const boot = { id: 'boot' }, auto = { id: 'auto' };
  const figs = {
    1: { slot: 1, x: 900, y: 900, inVeh: null },
    2: { slot: 2, x: 950, y: 950, inVeh: auto, coopBestuurt: true, coopVoertuig: true, stoel: 0, water: {}, swimming: true },
    3: { slot: 3, x: 990, y: 990, inVeh: boot, coopVoertuig: true, stoel: 1 },
  };
  const meld = [], los = [];
  const w = { coopRole: rol, coopFigures: figs, coopMeld: (s, t) => meld.push([s, t]), ...(vrij ? { coopVrij: vrij } : {}) };
  zetGroepWarpHaken({ lichamen: (ww) => Object.values(ww.coopFigures).map((f) => [f.slot, f]), los: (ww, s) => los.push(s) });
  return { w, figs, meld, los, boot, auto };
}

{
  const { w, figs, meld, los } = wereld();
  const k = warpGasten(w, { x: 10, y: 20 });
  ok(k === 3, 'alle drie de gasten gaan mee: ' + k);
  for (const f of Object.values(figs)) {
    const d = Math.hypot(f.x - 10, f.y - 20);
    ok(d >= WARP_RINGEN[0] - 1e-6 && d <= WARP_RINGEN[WARP_RINGEN.length - 1] + 1e-6, `gast ${f.slot} staat naast de bestemming (${d.toFixed(1)} m)`);
    ok(f.inVeh === null && f.coopVoertuig === false, `gast ${f.slot} zit niet meer in een voertuig`);
    ok(f.vx === 0 && f.vy === 0 && f.gz === 0 && f.water === null && f.swimming === false, `gast ${f.slot} staat stil en droog`);
  }
  ok(los.length === 1 && los[0] === 2, 'de gast die stuurt wordt eerst losgemaakt (bestuurLos)');
  const plekken = new Set(Object.values(figs).map((f) => `${f.x.toFixed(2)},${f.y.toFixed(2)}`));
  ok(plekken.size === 3, 'elke gast een eigen plek');
  ok(meld.length === 3 && meld.every(([, t]) => t === WARP_MELDING), 'elke gast krijgt één korte melding');
}
{
  const { w, figs, boot } = wereld();
  const k = warpGasten(w, { x: 0, y: 0 }, { meeVoertuig: boot });
  ok(k === 2 && figs[3].inVeh === boot && figs[3].x === 990, 'wie in het voertuig zit dat zelf meereist blijft zitten');
}
{
  const { w, figs, boot } = wereld();
  const k = warpGasten(w, { x: 0, y: 0 }, { alleen: (l) => l.inVeh === boot });
  ok(k === 1 && figs[3].inVeh === null && figs[1].x === 900, 'het filter neemt alleen de gasten in de afgemeerde boot mee');
}
{
  const { w, figs } = wereld({ rol: 'client' });
  ok(warpGasten(w, { x: 0, y: 0 }) === 0 && figs[1].x === 900, 'bij een gast (client) verplaatst niets: de wereld is van wie het spel opende');
}
{
  const { w } = wereld();
  ok(warpGasten(w, { x: NaN, y: 0 }) === 0 && warpGasten(w, null) === 0 && warpGasten(null, { x: 0, y: 0 }) === 0, 'rommel geeft niets en geen crash');
  ok(warpGasten({ coopRole: 'host', coopFigures: {} }, { x: 0, y: 0 }) === 0, 'alleen spelen: niemand te verplaatsen');
}
{
  // een vrije plek: water of een gebouw dichtbij schuift de gast naar een verdere ring
  const vrij = (x, y) => Math.hypot(x, y) > 4;
  const { w, figs } = wereld({ vrij });
  warpGasten(w, { x: 0, y: 0 });
  ok(Object.values(figs).every((f) => Math.hypot(f.x, f.y) > 4), 'gasten komen op een vrije plek (world.coopVrij)');
  const p = plekVoor({ x: 0, y: 0 }, 0, () => false);
  ok(Number.isFinite(p.x) && Math.abs(Math.hypot(p.x, p.y) - WARP_RINGEN[0]) < 1e-6, 'zonder vrije plek de eerste ring');
}

{
  // de vluchtboot van M06: wie niet in een voertuig zit gaat aan boord; een volle boot laat hem staan (de band haalt hem later)
  const { w, figs } = wereld();
  let plaatsen = 1;
  const aanBoord = [];
  zetGroepWarpHaken({ lichamen: (ww) => Object.values(ww.coopFigures).map((f) => [f.slot, f]), inBoot: (ww, l) => { if (plaatsen <= 0) return false; plaatsen--; l.inVeh = 'vluchtboot'; aanBoord.push(l.slot); return true; } });
  const k = gastenMeeAanBoord(w);
  ok(k === 1 && aanBoord[0] === 1 && figs[1].inVeh === 'vluchtboot', 'een gast te voet gaat mee aan boord');
  ok(figs[2].inVeh !== 'vluchtboot' && figs[3].inVeh !== 'vluchtboot', 'wie al in een voertuig zit blijft zitten');
  ok(gastenMeeAanBoord({ ...w, coopRole: 'client' }) === 0, 'bij een gast (client) gebeurt niets');
  zetGroepWarpHaken({ inBoot: null });
  ok(gastenMeeAanBoord(w) === 0, 'zonder boothaak (geen sessie) gebeurt niets');
}

// bedrading: elke echte verplaatsing van de speler in het spel neemt de gasten mee
const missions = lees('game/js/missions.js');
ok(/zetGroepWarpHaken\(\{ lichamen: gastLichamen, los: bestuurLos \}\)/.test(missions), 'missions.js zet de haken');
ok(/function warpPlayer[\s\S]{0,900}warpGasten\(world, t\)/.test(missions), 'warpPlayer (M11) neemt de gasten mee');
ok(/function handBack[\s\S]{0,900}warpGasten\(world, p, \{ alleen/.test(missions), 'handBack (afmeren) neemt de gasten in de boot mee');
ok(/export function placeParty[\s\S]{0,600}warpGasten\(w, dest, \{ meeVoertuig/.test(lees('game/js/storytravel.js')), 'placeParty (reisscène, opnieuw proberen) neemt de gasten mee');
ok(/function playFinale[\s\S]{0,1400}warpGasten\(world, spot\)/.test(lees('game/js/story.js')), 'de finale zet de gasten op de Markt');
// elke `warp:` in een missiedefinitie loopt via warpPlayer
for (const f of fs.readdirSync(new URL('../game/js/', import.meta.url)).filter((x) => /^missions.*\.js$/.test(x))) {
  const src = lees('game/js/' + f);
  if (/\bwarp: \{/.test(src)) ok(/st\.warp\) warpPlayer\(world, st\.warp\)/.test(missions), `${f}: een warp gaat via warpPlayer`);
}
ok(/warp/i.test(lees('docs/COOP-GAST.md')), 'COOP-GAST.md noemt de regel');
const heist = lees('game/js/heist.js');
ok(/boardBoat\(world, boat\);\s*gastenMeeAanBoord\(world\)/.test(heist), 'de vluchtboot (updateGetaway) neemt de gasten mee');
ok(/boardBoat\(world, boat\); gastenMeeAanBoord\(world\);/.test(heist), 'ook als de vlucht wordt overgeslagen');
ok(/zetGroepWarpHaken\(\{ inBoot: zetInBoot \}\)/.test(lees('game/js/coopnet.js')), 'coopnet.js geeft zetInBoot als haak');
ok(/w\.player\.x = res\.x; w\.player\.y = res\.y; warpGasten\(w, res\)/.test(lees('game/js/missionstory.js')), 'na de fierljepsprong (M20) staan de gasten mee aan de overkant');

if (fout) { console.log(`groepwarp_test: ${fout} van ${n} fout`); process.exit(1); }
console.log(`groepwarp_test: ${n}/${n} ok`);
