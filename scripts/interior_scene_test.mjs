// Interieurs (epic #1150, ronde 2): de koppeling voor missies en verhaalscenes in een pand (interiorscene.js) en het haakje voor de
// kleuren van een woning waar je woont (Homebase). Ankerpunten liggen in de hal, camera's binnen de muren en onder het plafond.
// Draai: node scripts/interior_scene_test.mjs
import { planInterior } from '../game/js/interiorrules.js';
import { sceneAnchors, sceneCamera, inHall } from '../game/js/interiorscene.js';
import { building, subsFor } from './interior_fixtures.mjs';
import { toLocal } from '../game/js/interiorframe.js';
import { mulberry32 } from '../game/js/rng.js';

let bad = 0, n = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.error('FAIL', m + (info ? ` (${info})` : '')); } };
const rnd = mulberry32(17);
for (const [kind, sub] of [['winkel', 'supermarkt'], ['horeca', 'cafe'], ['kantoor', null], ['woning', null], ['kerk', null], ['publiek', 'gemeente'], ['bibliotheek', null]]) {
  const { b, spot } = building(kind, sub, 8 + rnd() * 5, 11 + rnd() * 5, rnd);
  const p = planInterior(b, { spot });
  ok(p.ok, `${kind}: planbaar`);
  const a = sceneAnchors(p);
  for (const k of ['inside', 'centre', 'back', 'left', 'right']) ok(inHall(p, a[k].x, a[k].y), `${kind}: anker ${k} ligt in de hal`);
  ok(Math.abs(toLocal(p.frame, a.door.x, a.door.y)[1]) < 1e-6, `${kind}: de deur ligt op de gevellijn`);
  ok(a.npcs.every((q) => inHall(p, q.x, q.y)), `${kind}: de mensen staan in de hal`);
  for (const shot of ['wide', 'door', 'counter', 'back']) {
    const c = sceneCamera(p, shot);
    ok(inHall(p, c.position.x, c.position.y, 0.44), `${kind}/${shot}: de camera staat binnen de muren`);
    ok(c.position.z <= p.height - 0.29 && c.position.z > 0.5, `${kind}/${shot}: de camera zit onder het plafond`);
    ok(c.fov > 30 && c.fov < 90 && Number.isFinite(c.lookAt.x), `${kind}/${shot}: een geldige blik`);
  }
}
// Homebase: de kleuren van een woning waar je woont
{
  const { b } = building('woning', null, 8, 12, mulberry32(4));
  const a = planInterior(b), c = planInterior(b, { style: { wall: 0x336699, floor: 0x553322, fabric: 0xaa3344 } });
  ok(c.layout.palette.wall === 0x336699 && c.layout.palette.floor === 0x553322, 'een woonstijl zet wand en vloer');
  ok(a.layout.palette.wall !== 0x336699, 'zonder stijl blijft de kamer van het raam');
  ok(JSON.stringify(a.layout.items.map((i) => i.type)) === JSON.stringify(c.layout.items.map((i) => i.type)), 'de indeling blijft dezelfde');
}
console.log(bad ? `interior_scene_test: ${bad} van ${n} mislukt` : `interior_scene_test: ${n} controles ok`);
if (bad) process.exitCode = 1;
