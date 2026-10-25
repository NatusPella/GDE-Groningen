// Een bord met tekst hoort van beide kanten leesbaar te zijn (#503): een dubbelzijdig vlak laat zijn
// achterkant gespiegeld zien, dus tekstborden bestaan uit twee vlakken rug aan rug (canvastex.js
// signBothSides). Deze test bewaakt de helper en de plekken die hem gebruiken, zodat niemand er weer
// side: THREE.DoubleSide op zet.
//   node scripts/borden_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL ' + m); } };

const CT = await import('../game/js/canvastex.js');
ok(typeof CT.signBothSides === 'function', 'canvastex.js heeft signBothSides');

const THREE = await import('three');
const mat = new THREE.MeshBasicMaterial();
const g = CT.signBothSides(2, 1, mat);
ok(g && g.children && g.children.length === 2, 'twee vlakken, niet één dubbelzijdig vlak');
const [voor, achter] = g.children;
ok(voor && achter, 'voor- en achtervlak');
ok(Math.abs((achter.rotation.y || 0) - Math.PI) < 1e-6, 'het achtervlak staat een halve slag gedraaid');
ok(achter.position.length() < 1e-6 && voor.position.length() < 1e-6, 'beide vlakken staan op dezelfde plek');
ok(mat.side !== THREE.DoubleSide, 'het materiaal is niet dubbelzijdig');

// de tekstborden die deze helper gebruiken, en geen enkele meer met DoubleSide op een vlak met tekst
const borden = [
  ['game/js/kartbaan.js', ['signBothSides(8.4, 1.5', 'signBothSides(0.34, 0.3']],
  ['game/js/skatepark.js', ['signBothSides(2.4, 0.9']],
  ['game/js/discgolf.js', ['signBothSides(0.9, 0.45', 'signBothSides(1.0, 0.5']],
  ['game/js/planestage.js', ['signBothSides(16, 3']],
  ['game/js/geheimen.js', ['signBothSides(0.8, 0.4']],
];
for (const [file, needles] of borden) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  for (const nd of needles) ok(src.includes(nd), `${file}: ${nd}…)`);
  // een bord met tekst erop hoort geen dubbelzijdig vlak te zijn
  const regels = src.split('\n').filter((l) => /DoubleSide/.test(l) && /fillText|canvasTex\(/.test(l));
  ok(!regels.length, `${file}: geen dubbelzijdig tekstvlak meer` + (regels.length ? ' -> ' + regels[0].trim().slice(0, 90) : ''));
}

console.log(`borden_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
