// De botsauto van de kermis (#389): bumpercar3d.js bouwt per kleur één samengevoegde geometrie in Node.
//   node scripts/bumpercar_test.mjs   (eenmalig: cd desktop && npm run stage)
import './node3d.mjs';
const { bumperCarGeometry, bumperCarMaterial, buildBumperCarGeometry } = await import('../game/js/bumpercar3d.js');

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const g = buildBumperCarGeometry(0xd8262e);
const pos = g.attributes.position;
let finite = true;
for (let i = 0; i < pos.array.length; i++) if (!Number.isFinite(pos.array[i])) finite = false;
check('alle posities eindig', finite);
g.computeBoundingBox();
const b = g.boundingBox;
check('voetafdruk zoals een botsauto (1,4 tot 2 m lang, 1 tot 1,5 m breed)', b.max.x - b.min.x >= 1.4 && b.max.x - b.min.x <= 2.0 && b.max.z - b.min.z >= 1.0 && b.max.z - b.min.z <= 1.5, `${(b.max.x - b.min.x).toFixed(2)} x ${(b.max.z - b.min.z).toFixed(2)}`);
check('de paal reikt tot het rooster (3,6 m)', b.max.y > 3.5 && b.max.y < 3.8, 'hoogte ' + b.max.y.toFixed(2));
check('een groep en vertexkleuren, dus één draw call', g.groups.length === 1 && !!g.attributes.color);
check('genoeg onderdelen (> 300 driehoeken, geen blok)', pos.count / 3 > 300, 'driehoeken ' + pos.count / 3);
check('gedeeld per kleur', bumperCarGeometry(0x2f6fd0) === bumperCarGeometry(0x2f6fd0) && bumperCarGeometry(0x2f6fd0) !== bumperCarGeometry(0xd8262e));
check('één gedeeld materiaal', bumperCarMaterial() === bumperCarMaterial() && bumperCarMaterial().vertexColors);
console.log(bad ? `${bad} mislukt` : 'bumpercar_test: ok');
process.exit(bad ? 1 : 0);
