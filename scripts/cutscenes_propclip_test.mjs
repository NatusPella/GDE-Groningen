// #263: de camera van een cutscene staat nooit in een voertuig-prop (de Escapade, een bestelbus, een trekker, een fiets):
// in M22.4 stond hij 27 s in de auto (een rode band en een blauwe ruit dwars door het beeld).
//   node scripts/cutscenes_propclip_test.mjs
// Loopt elke scène van de catalogus (cutpreview.js, zonder wereld) af op 0,25 s en toetst de camera aan de grondafmetingen
// van elk zichtbaar voertuig-prop (cutscenemodels.js PROP_FOOT), plus een kleine synthetische scène.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (f) => import(pathToFileURL(path.join(root, 'game', 'js', f)).href);
const prev = await imp('cutpreview.js');
const { PROP_FOOT, propFoot } = await imp('cutscenemodels.js');
const { compileScene } = await imp('cutscript.js');
let fails = 0, n = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name); } };

// is punt (x, y, z) binnen de doos van voertuig-prop o (x, y, h, a: hoek, +x naar voren)?
const inBox = (c, o, foot) => {
  const dx = c.x - o.x, dy = c.y - o.y;
  const lx = dx * Math.cos(-o.a) - dy * Math.sin(-o.a), ly = dx * Math.sin(-o.a) + dy * Math.cos(-o.a);
  return Math.abs(lx) < foot[0] / 2 && Math.abs(ly) < foot[1] / 2 && c.z - o.h < foot[2] && c.z - o.h > -0.2;
};

ok(propFoot('auto') && propFoot('trekker') && propFoot('bestelbus') && !propFoot('doos'), 'voertuigen hebben een grondafmeting, losse spullen niet');
ok(Object.values(PROP_FOOT).every((f) => f.length === 3 && f.every((v) => v > 0)), 'elke afmeting is [lengte, breedte, hoogte] en positief');

const script = JSON.parse(fs.readFileSync(path.join(root, 'game', 'storydata', 'script.json'), 'utf8'));
const src = fs.readFileSync(path.join(root, 'game', 'js', 'missionstory.js'), 'utf8');
const cat = prev.buildCatalog({ script, npcSource: src });
const anchor = { x: 0, y: 0, facing: 0, z: 0 };
let scenes = 0, samples = 0;
for (const e of cat) {
  if (!e.scene || !e.def) continue;
  const props = Object.entries(e.def.props || {}).filter(([, p]) => propFoot(p.kind));
  if (!props.length) continue;
  scenes++;
  const hits = [];
  for (let t = 0; t <= e.duration; t += 0.25) {
    const s = e.scene.sample(t, anchor);
    samples++;
    for (const [id, p] of props) {
      const o = s.props[id];
      if (o && o.visible && inBox(s.camera.position, o, propFoot(p.kind))) hits.push(`${t}s ${id}`);
    }
  }
  ok(!hits.length, `${e.id}: camera in een voertuig-prop (${hits.slice(0, 3).join(', ')}${hits.length > 3 ? ` +${hits.length - 3}` : ''})`);
}
ok(scenes >= 10, `scènes met een voertuig-prop gecontroleerd (${scenes})`);

// synthetisch: een korte scène waarin de auto-prop precies op de camerastand staat; de camera moet eruit
const def = {
  id: 'test.propclip', cast: {}, props: { wagen: { kind: 'auto', at: [3, 0, 0], face: 0 } },
  actors: { tammo: { look: 'tammo', at: [-2, 0.5], face: 0 }, tessa: { look: 'anita', at: [-2, -0.5], face: 0 } },
  open: [], beats: [], shots: [{ t: 0, shot: 'cut', at: [3, 0, 1.2], look: 'wagen@1', fov: 40 }],
};
try {
  const sc = compileScene(def, { lines: [], duration: 6 });
  const s = sc.sample(1, anchor);
  const o = s.props.wagen;
  ok(o && !inBox(s.camera.position, o, propFoot('auto')), 'een camerastand midden in de auto wordt eruit geduwd');
} catch (err) {
  ok(false, 'synthetische scène compileert: ' + String(err).slice(0, 120));
}

console.log(`cutscenes_propclip_test: ${n} checks, ${scenes} scènes, ${samples} samples, ${fails} mislukt`);
process.exit(fails ? 1 : 0);
