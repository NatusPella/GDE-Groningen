// Page half of scripts/qa/cutmix_live.mjs (aaa30): speelt één scène twee keer in echte tijd door de host (playScript, de echte weg met
// cinematics, stemmen en de muziekmix) en logt elke 100 ms de gain van de muziekbus en de stand van de cutscenemix.
// Run 1: de oude stand (__audio.cutMixOff(true): de radio en scenarioloop dempen alleen met de gespreksdemping, het thema niet). Run 2: de nieuwe mix.
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const host = await imp('cutscenehost');
const prev = await imp('cutpreview');
const cine = await imp('cinematics');
const A = window.__audio;
for (let i = 0; i < 240 && !(D && D.world); i++) await sleep(500);
await sleep(5000);
const script = await (await fetch('/storydata/script.json')).json();
const src = await (await fetch('/js/missionstory.js')).text();
const cat = prev.buildCatalog({ script, npcSource: src });
const id = window.__cm.scene;
const e = cat.find((x) => x.id === id || x.id === 'story-' + id);
if (!e || !e.def) return JSON.stringify({ results: { fout: 'scène niet gevonden: ' + id } });
const runs = [];
for (const legacy of [true, false]) {
  for (let i = 0; i < 100 && cine.isCinematicActive(); i++) { cine.skipCinematic(); await sleep(200); } // een lopende scène (de opening) eerst weg
  A.cutMixOff(legacy);
  console.log('[cm] run legacy=' + legacy + ' t=' + Math.round(performance.now()));
  await sleep(1500);
  const base = A.state();
  const anchor = { x: p.x, y: p.y, facing: 0.3, z: p.gz || 0 };
  const ok = host.playScript(w, e.def, { lines: e.lines.map((l) => ({ ...l })), duration: e.duration, anchor });
  const t0 = performance.now();
  const samples = [];
  let lines = null;
  while (performance.now() - t0 < 100000) {
    if (samples.length % 50 === 0) console.log('[cm] ' + samples.length + ' act=' + cine.isCinematicActive() + ' ok=' + ok);
    await sleep(100);
    const s = A.state();
    const act = cine.isCinematicActive();
    samples.push([+((performance.now() - t0) / 1000).toFixed(2), s.musicBus, s.cutMix.mode, s.cutMix.db, s.speech && s.speech.talking ? 1 : 0, act ? 1 : 0]);
    if (!act && samples.length > 20) break;
  }
  // de eindtijd van de stilte erna: de muziek moet terugkomen
  for (let i = 0; i < 40; i++) { await sleep(100); const s = A.state(); samples.push([+((performance.now() - t0) / 1000).toFixed(2), s.musicBus, s.cutMix.mode, s.cutMix.db, s.speech && s.speech.talking ? 1 : 0, 0]); }
  runs.push({ legacy, started: !!ok, baseBus: base.musicBus, scenario: base.scenario, samples });
  cine.isCinematicActive() && cine.skipCinematic();
  await sleep(1500);
}
A.cutMixOff(false);
return JSON.stringify({ results: { scene: id, duur: e.duration, lines: e.lines.map((l) => ({ at: +l.at.toFixed(2), dur: +l.dur.toFixed(2) })), kolommen: ['t', 'bus', 'stand', 'mix_db', 'stem', 'scene'], mix: runs } });
