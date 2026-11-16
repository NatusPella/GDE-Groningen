// #955: een cutscene mag niet in een boom staan (M02.intro: stam en takken vulden het beeld).
//   node scripts/cutscene_tree_test.mjs
// De bomen zijn dezelfde vorm die de wereld tekent (greenery.js treeDims); de camera stapt
// eruit (cutscript.js clearOfTrees) en de ankerstand zoekt vrije grond (fitAnchor + env.tree).
// Het werelddeel leest game/world (bouwproduct); zonder die map slaat het zichzelf over.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileScene, fitAnchor } from '../game/js/cutscript.js';
import { missionScene, sceneSpec } from '../game/js/cutscenes_akte1.js';
import { treeBlocksPoint, treeDims } from '../game/js/greenery.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, fails = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };

// --- 1. de vorm: stam en kroon ------------------------------------------------
ok(sceneSpec('M02.intro') && Array.isArray(sceneSpec('M02.intro').fit?.radii), 'M02.intro vraagt om vrije grond (fit.radii)');
ok(sceneSpec('M02.outro') && Array.isArray(sceneSpec('M02.outro').fit?.radii), 'M02.outro vraagt om vrije grond (fit.radii)');
// een plataan van 20 m: stam tot 6 m, kroon om het midden
const tree = [100, 200, 1, 200];
{
  const d = treeDims(tree);
  ok(treeBlocksPoint(tree, 100, 200, 1.0), 'de stam telt');
  ok(treeBlocksPoint(tree, 100, 200, d.cy), 'de kroon telt');
  ok(treeBlocksPoint(tree, 100 + d.r * 0.8, 200, d.cy), 'de rand van de kroon telt');
  ok(!treeBlocksPoint(tree, 100 + d.r + 2, 200, d.cy), 'buiten de kroon telt niet');
  ok(!treeBlocksPoint(tree, 100, 200, d.cy + d.ry + 2), 'boven de kroon telt niet');
  ok(!treeBlocksPoint({ ...tree, _broken: true }, 100, 200, 1), 'een kapotte boom telt niet');
  ok(treeBlocksPoint(tree, 100, 200, 1.0, 0.5), 'de pad rond de stam telt');
}

// --- 2. de camera stapt uit de boom ------------------------------------------
{
  const def = {
    id: 'boom-test', actors: { a: { look: 'tammo', at: [0, 0], face: 0 } }, props: {}, cues: [],
    shots: [{ t: 0, shot: 'dolly', from: [-6, 6, 3.4], to: [-3, 4.4, 2.6], look: 'a@1.2', fov: 46 }],
  };
  const scene = compileScene(def, { lines: [{ speaker: 'Tammo', text: 'Hoi.', at: 0.5, dur: 3 }], duration: 4 });
  const anchor = { x: 0, y: 0, facing: 0, z: 0 };
  // een kroon precies op de eerste camerapositie (de dolly begint op -6, 6)
  const crown = [-6, 6, 0, 140];
  const tree = (x, y, z) => treeBlocksPoint(crown, x, y, z, 0.3);
  const raw = scene.sample(0.2, anchor).camera.position;
  ok(tree(raw.x, raw.y, raw.z), 'zonder env staat de camera in de kroon (de test raakt de fout)');
  const fixed = scene.sample(0.2, anchor, { tree }).camera.position;
  ok(!tree(fixed.x, fixed.y, fixed.z), 'clearOfTrees haalt de camera uit de kroon', JSON.stringify(fixed));
  // en de camera blijft naar de acteur kijken
  const s = scene.sample(0.2, anchor, { tree });
  ok(Math.abs(s.camera.lookAt.x - 0) < 1e-6 && Math.abs(s.camera.lookAt.y - 0) < 1e-6, 'de camera blijft op de acteur gericht');
}

// --- 3. de ankerstand zoekt vrije grond --------------------------------------
{
  const def = {
    id: 'anker-test', actors: { a: { look: 'tammo', at: [0, 0], face: 0 }, b: { look: 'anita', at: [1, 0], face: 180 } }, props: {}, cues: [],
    shots: [{ t: 0, shot: 'dolly', from: [-6, 6, 3.4], to: [-3, 4.4, 2.6], look: 'a@1.2', fov: 46 }],
  };
  const scene = compileScene(def, { lines: [{ speaker: 'Tammo', text: 'Hoi.', at: 0.5, dur: 3 }], duration: 4 });
  const crown = [-6, 6, 0, 160]; // een grote kroon om de beginstand
  const env = { solid: () => false, tree: (x, y, z) => treeBlocksPoint(crown, x, y, z, 0.3) };
  const at = fitAnchor(scene, { x: 0, y: 0, facing: 0, z: 0 }, env, { radii: [4, 7, 10], ground: () => true });
  let bad = 0;
  for (let t = 0; t <= 4; t += 0.2) {
    const c = scene.sample(t, at).camera.position;
    if (env.tree(c.x, c.y, c.z)) bad++;
  }
  ok(bad === 0, 'fitAnchor zet de scène buiten de kroon', `${bad} beelden in de kroon, anker ${at.x.toFixed(1)},${at.y.toFixed(1)}`);
  ok(Math.hypot(at.x, at.y) > 0.1 || Math.abs(at.facing) > 0.01, 'de ankerstand is gedraaid of verplaatst');
}

// --- 4. de echte wereld (M02.intro bij het Boterdiep) -------------------------
{
  const world = path.join(ROOT, 'game', 'world');
  if (!fs.existsSync(path.join(world, 'index.json'))) {
    console.log('SKIP het werelddeel: game/world ontbreekt (stage eerst)');
  } else {
    await import('../scripts/node3d.mjs');
    class FsSource {
      constructor(dir) { this.dir = dir; }
      async read(file, off, len) {
        const a = new Uint8Array(fs.readFileSync(path.join(this.dir, file)));
        return off || len !== a.length ? a.subarray(off, off + len) : a;
      }
      async readAll(file) { return new Uint8Array(fs.readFileSync(path.join(this.dir, file))); }
    }
    globalThis.requestAnimationFrame = (f) => setImmediate(f);
    const { loadTileWorld } = await import('../game/js/tileworld.js');
    const { roofAt } = await import('../game/js/camerapath.js');
    let T = null;
    try {
      T = await loadTileWorld('world/', { source: new FsSource(world), pool: false, extra: [{ name: 'index-provincie.json' }, { name: 'index-corridor.json' }] });
    } catch (e) { console.log('SKIP het werelddeel: de tegels zijn niet leesbaar (' + e.message + ')'); }
    const map = T && T.world;
    if (map) {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'game', 'storydata', 'script.json'), 'utf8'));
    const NAME = { T: 'Tammo', A: 'Anita' };
    const looks = new Proxy({}, { get: (t, k) => ({ name: String(k), shirt: 0x808080, skin: 0xd0a080 }) });
    const lines = [];
    let t = 0.6;
    for (const l of data.scenes.find((s) => s.id === 'M02.1').lines) {
      if (l.channel === 'app-stil') continue;
      const dur = Math.max(2.2, Math.min(8, 1.3 + l.text.length * 0.058));
      lines.push({ speaker: NAME[l.key] || l.key, text: l.text, at: t, dur }); t += dur + 0.1;
    }
    const total = t + 0.3;
    const def = missionScene('M02.intro', lines, { looks });
    const scene = compileScene(def, { lines, duration: total });
    const tree = (x, y, z) => {
      for (const q of map.treesNear(x, y, 12)) if (treeBlocksPoint(q, x, y, z, 0.35)) return true;
      return false;
    };
    const env = { solid: (x, y, z) => roofAt(map, x, y) > z - 0.2, tree };
    const envRaw = { solid: (x, y, z) => roofAt(map, x, y) > z - 0.2 };
    const ground = (x, y) => roofAt(map, x, y) === 0;
    // the trees along the Boterdiep, where M02 starts after M01
    const near = map.treesNear(-22.92, -491.56, 60).filter((q) => !q._broken);
    let found = null;
    for (const q of near) {
      const anchor = { x: q[0] + 6, y: q[1] - 6, facing: 0, z: 0 }; // the wide shot of M02.intro starts at -6, +6
      let rawBad = 0;
      for (let s = 0; s <= total; s += 0.2) {
        const c = scene.sample(s, anchor, envRaw).camera.position;
        if (tree(c.x, c.y, c.z)) rawBad++;
      }
      if (rawBad) { found = { anchor, rawBad }; break; }
    }
    ok(found, 'de M02-intro raakt in de echte wereld een boom (de fout is na te spelen)');
    if (found) {
      const at = fitAnchor(scene, found.anchor, env, { radii: [4, 7, 10], ground });
      let bad = 0;
      for (let s = 0; s <= total; s += 0.2) {
        const c = scene.sample(s, at, env).camera.position;
        if (tree(c.x, c.y, c.z)) bad++;
      }
      ok(bad === 0, 'na de fit staat geen enkel beeld in een boom', `${bad} van ${Math.round(total / 0.2)} beelden`);
      ok(found.rawBad > 0, 'zonder fit stond de camera in de boom', String(found.rawBad));
    }
    }
  }
}

console.log(fails ? `${fails} van ${n} mislukt` : `cutscene_tree_test: ${n} controles ok`);
process.exit(fails ? 1 : 0);
