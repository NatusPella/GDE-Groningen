// De echte plekken van padel en Pitch & Putt (#174): locatiekeuze uit de OSM-data, terugval zonder
// data, banen op een echte golfbaan en de data zelf (klein, geen namen of contactgegevens).
//   node scripts/echteplekken_test.mjs
import fs from 'node:fs';
import { padelDefs, mergePadelDefs, golfVenues, nearestOf, afstandTotLijnen } from '../game/js/echteplekken.js';
import * as PP from '../game/js/puttinglogic.js';
import { pointInPolygon } from '../game/js/util.js';

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const lcg = (a) => () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };

// --- synthetisch ---------------------------------------------------------------------------------
{
  const d = {
    padel: [
      { id: 'a', x: 0, y: 0, rot: 0.3, l: 20, w: 10, soort: 'baan', plaats: 'Test' },
      { id: 'b', x: 12, y: 0, rot: 0.3, l: 20, w: 10, soort: 'baan', plaats: 'Test' },
      { id: 'c', x: 40, y: 30, soort: 'centrum', plaats: 'Test' }, // bij de banen: geen eigen locatie
      { id: 'd', x: 3000, y: 0, soort: 'centrum', plaats: 'Test' },
    ],
    golf: [],
  };
  const defs = padelDefs(d);
  check('padel: banen worden een locatie, een ver centrum een tweede', defs.length === 2 && defs[0].courts.length === 2 && defs[1].courts.length === 0 && defs[1].centre, JSON.stringify(defs));
  check('padel: namen uniek en zonder clubnaam', defs[0].name === 'Padelbaan Test' && defs[1].name === 'Padelbaan Test 2');
  check('padel: terugval zonder data', padelDefs({}).length === 0 && padelDefs({ padel: [] }).length === 0);
  const old = [{ x: 100, y: 0, name: 'oud-dichtbij' }, { x: 9000, y: 9000, name: 'oud-ver' }];
  const m = mergePadelDefs(defs, old);
  check('padel: oude plek blijft alleen als de data niets binnen 250 m heeft', m.length === 3 && m.some((s) => s.name === 'oud-ver') && !m.some((s) => s.name === 'oud-dichtbij'));
  check('golf: zonder data geen banen (de Concours-terugval blijft)', golfVenues({}).length === 0 && golfVenues({ golf: [] }).length === 0);

  // een rechthoekige baan van 120 x 90 m zonder tees: rooster, alles binnen de omtrek
  const rot = 0.5, c = Math.cos(rot), s = Math.sin(rot), at = (u, v) => [1000 + c * u - s * v, 500 + s * u + c * v];
  const ring = [at(-60, -45), at(60, -45), at(60, 45), at(-60, 45)];
  const v = golfVenues({ golf: [{ id: 'w1', leisure: 'golf_course', x: 1000, y: 500, rot, l: 120, w: 90, ha: 1.08, ring, plaats: 'Rond' }] });
  check('golf: rooster op een kale baan', v.length === 1 && !v[0].real && v[0].holes.length >= 3, JSON.stringify(v.map((q) => q.holes.length)));
  if (v.length) {
    check('golf: tees en greens binnen de omtrek', v[0].holes.every((h) => [h.tee, h.cup].every((p) => pointInPolygon(p.x, p.y, ring))));
    const hs = PP.holesFromWorld(v[0].holes);
    check('golf: holes met par en richting', hs.every((h) => (h.par === 2 || h.par === 3) && Number.isFinite(h.heading) && h.len >= 30 && h.len <= 78), JSON.stringify(hs.map((h) => h.len)));
  }
  const tiny = [[0, 0], [40, 0], [40, 30], [0, 30]];
  check('golf: een baan zonder rot/l/w geeft geen NaN-holes (#229)', golfVenues({ golf: [{ id: 'n', leisure: 'golf_course', x: 1000, y: 500, ha: 1.08, ring }] }).every((v) => v.holes.every((h) => [h.tee.x, h.tee.y, h.cup.x, h.cup.y].every(Number.isFinite))));
  check('golf: een te kleine baan valt af', golfVenues({ golf: [{ id: 't', leisure: 'golf_course', x: 20, y: 15, rot: 0, l: 40, w: 30, ha: 0.12, ring: tiny }] }).length === 0);
  // echte tees en greens (30-78 m) worden gebruikt
  const ring2 = [[0, 0], [400, 0], [400, 200], [0, 200]];
  const parts = [];
  for (let i = 0; i < 4; i++) { parts.push({ id: 't' + i, golf: 'tee', x: 40 + i * 90, y: 40 }); parts.push({ id: 'g' + i, golf: 'green', x: 40 + i * 90, y: 100 }); }
  const v2 = golfVenues({ golf: [{ id: 'c2', leisure: 'golf_course', x: 200, y: 100, rot: 0, l: 400, w: 200, ha: 8, ring: ring2, plaats: 'Echt' }, ...parts] });
  check('golf: echte tee-green-paren', v2.length === 1 && v2[0].real && v2[0].holes.length === 4 && v2[0].holes.every((h) => Math.abs(Math.hypot(h.cup.x - h.tee.x, h.cup.y - h.tee.y) - 60) < 1e-6));
  check('nearestOf', nearestOf([{ x: 0, y: 0 }, { x: 10, y: 0 }], 8, 1).item.x === 10 && nearestOf([], 0, 0) === null);
  const weg = [{ pts: [[0, 0], [100, 0]] }, { pts: [[0, 50], [100, 50]] }];
  check('afstand tot de weg', Math.abs(afstandTotLijnen(weg, 30, 12) - 12) < 1e-9 && Math.abs(afstandTotLijnen(weg, 130, 0) - 30) < 1e-9 && afstandTotLijnen([], 0, 0) === Infinity);
}

// --- de echte data --------------------------------------------------------------------------------
{
  const raw = fs.readFileSync(new URL('../game/echteplekken.json', import.meta.url), 'utf8');
  const data = JSON.parse(raw);
  check('data: klein', raw.length < 200000, raw.length);
  check('data: frame rd-new, bron OSM', data.frame === 'rd-new' && /OpenStreetMap/.test(data.bron));
  check('data: geen namen of contactgegevens', !/"(naam|name|phone|website|email|contact|operator|opening_hours)"/.test(raw));

  const defs = padelDefs(data);
  const stad = defs.filter((s) => Math.hypot(s.x, s.y) < 5500), ommeland = defs.filter((s) => Math.hypot(s.x, s.y) >= 5500);
  check('padel: de stad heeft locaties', stad.length >= 8, stad.length);
  check('padel: het Ommeland heeft locaties', ommeland.length >= 8, ommeland.length);
  check('padel: banen hebben een echte oriëntatie', defs.filter((s) => s.courts.length).every((s) => s.courts.every((c) => Number.isFinite(c.rot) && Math.abs(c.rot) <= Math.PI + 1e-9)));
  check('padel: locaties met 5, 4 en 3 banen', [5, 4, 3].every((n) => defs.some((s) => s.courts.length === n)), defs.map((s) => s.courts.length).join());
  check('padel: namen uniek', new Set(defs.map((s) => s.name)).size === defs.length);
  check('padel: alles in de provincie', defs.every((s) => s.x > -35000 && s.x < 65000 && s.y > -40000 && s.y < 55000));

  const venues = golfVenues(data);
  check('golf: de stad (Pitch & Putt Groningen) en het Ommeland', venues.some((v) => Math.hypot(v.x, v.y) < 5500) && venues.filter((v) => Math.hypot(v.x, v.y) >= 5500).length >= 3, venues.map((v) => v.name).join());
  const banen = new Map(data.golf.filter((g) => g.leisure === 'golf_course').map((g) => [g.id, g]));
  for (const v of venues) {
    const hs = PP.holesFromWorld(v.holes);
    check(`golf ${v.name}: 3 tot 6 holes, speelbare lengtes`, hs.length >= 3 && hs.length <= 6 && hs.every((h) => h.len >= 30 && h.len <= 78 && (h.par === 2 || h.par === 3)), hs.map((h) => Math.round(h.len)).join());
    const course = banen.get(v.id.replace('echt-', ''));
    check(`golf ${v.name}: tees en greens binnen de echte omtrek`, !!course && v.holes.every((h) => [h.tee, h.cup].every((p) => pointInPolygon(p.x, p.y, course.ring))));
    const h = hs[0], r = PP.pitch(h, h.tee, h.heading, PP.powerForCarry(Math.min(h.len, PP.PITCH_MAX * 0.95)), lcg(7));
    check(`golf ${v.name}: een pitch speelt`, r && Number.isFinite(r.end.x));
  }
  check('terugval: de Concours-holes bestaan nog', PP.ppHoles().length === 6);
}

console.log(bad ? `echteplekken: ${bad} FAILED` : 'echteplekken: all passed');
process.exit(bad ? 1 : 0);
