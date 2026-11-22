// Het kader van de grote kaart (#901): het verste zoomniveau past precies in het scherm
// en het beeld blijft binnen het kader, zodat je nooit voorbij het einde van de kaart
// pant. Pure checks op kaartkader.js en bronchecks op de kaart.
//   node scripts/kaartkader_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { frameScale, clampView } from '../game/js/kaartkader.js';

let n = 0, fails = 0;
const ok = (c, naam, extra = '') => { n++; if (!c) { fails++; console.log('FAIL ' + naam + (extra ? ' :: ' + extra : '')); } };

const FRAME = [0, 0, 1000, 1000];
{
  ok(Math.abs(frameScale(FRAME, 800, 600) - 0.6) < 1e-9, 'de schaal past het kader in het scherm (hoogte begrenst)');
  ok(Math.abs(frameScale(FRAME, 500, 900) - 0.5) < 1e-9, 'de schaal past het kader in het scherm (breedte begrenst)');
  ok(frameScale(FRAME, 2000, 2000) === 2, 'een groot scherm laat het kader twee keer zo groot zien');
  ok(frameScale(null, 800, 600) === 0 && frameScale(FRAME, 0, 600) === 0 && frameScale([0, 0, 0, 1], 800, 600) === 0, 'kapotte invoer geeft schaal 0');
  ok(frameScale(FRAME, 1000, 1000) * (FRAME[2] - FRAME[0]) === 1000, 'op de passende schaal is het kader precies zo breed als het scherm');
}

{
  // bij een schaal waarin het beeld kleiner is dan het kader, schuift het midden naar binnen
  const v = clampView(0, 0, 1, 400, 300, FRAME); // half 200 x 150
  ok(v.cx === 200 && v.cy === 150, 'linksboven wordt naar binnen geschoven', `${v.cx},${v.cy}`);
  const w = clampView(900, 900, 1, 400, 300, FRAME);
  ok(w.cx === 800 && w.cy === 850, 'rechtsonder wordt naar binnen geschoven', `${w.cx},${w.cy}`);
  const m = clampView(500, 500, 1, 400, 300, FRAME);
  ok(m.cx === 500 && m.cy === 500 && !m.clamped, 'in het midden verandert er niets');
  // de zichtbare wereldbox blijft binnen het kader
  const halfW = 400 / 2, halfH = 300 / 2;
  ok(v.cx - halfW >= FRAME[0] && v.cx + halfW <= FRAME[2] && v.cy - halfH >= FRAME[1] && v.cy + halfH <= FRAME[3], 'de zichtbare box ligt binnen het kader');
  ok(w.cx + halfW <= FRAME[2] && w.cy + halfH <= FRAME[3], 'ook rechtsonder blijft de box binnen het kader');
}

{
  // een scherm dat groter is dan het kader: geen pan, de kaart staat gecentreerd
  const v = clampView(-500, 2000, 0.2, 400, 300, FRAME); // half 1000 x 750 > kader
  ok(v.cx === 500 && v.cy === 500, 'een te groot beeld staat gecentreerd', `${v.cx},${v.cy}`);
  const w = clampView(500, 500, 0.2, 400, 300, FRAME);
  ok(w.cx === 500 && w.cy === 500 && !w.clamped, 'gecentreerd is niet geclamped');
}

{
  const z = clampView(5, 5, 0, 400, 300, FRAME);
  ok(z.cx === 5 && z.cy === 5, 'zonder schaal gebeurt er niets');
  const k = clampView(5, 5, 1, 400, 300, [1, 1, 0, 0]);
  ok(k.cx === 5 && k.cy === 5, 'een kapot kader doet niets');
  assert.doesNotThrow(() => clampView(0, 0, 1, 400, 300, null));
}

{
  const map = fs.readFileSync(new URL('../game/js/mapview.js', import.meta.url), 'utf8');
  ok(map.includes("from './kaartkader.js'") && map.includes('frameScale(state.bounds, state.cw, state.ch)'), 'het verste zoomniveau komt uit het kader');
  ok(map.includes('clampView(state.cx, state.cy, state.scale, state.cw, state.ch, state.bounds)'), 'het beeld wordt binnen het kader gehouden');
  ok(!map.includes('state.cx = Math.max(minx, Math.min(maxx, state.cx))'), 'de oude clamp op het middelpunt is weg');
  ok(map.includes("inkA('tintMap', 0.5)") && map.includes('buiten het kader van de kaart'), 'buiten het kader tekent de kaart hetzelfde donkere buurland');
}

// #1190: de schaalbalk begint rechts van de bronvermelding (links 12 px + tekst), niet eroverheen
{
  const mv = fs.readFileSync(new URL('../game/js/mapview.js', import.meta.url), 'utf8');
  const m = mv.match(/const MAP_SCALE_X = (\d+);/);
  const osm = mv.match(/\.mapview-osm \{\s*position: absolute; left: (\d+)px/);
  ok(m && osm && Number(m[1]) - 8 >= Number(osm[1]) + 190, 'de schaalbalk begint rechts van de bronvermelding', m && osm ? `${m[1]} / ${osm[1]}` : 'niet gevonden');
}
console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
