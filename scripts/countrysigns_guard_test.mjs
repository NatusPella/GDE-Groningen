// Een bord zonder tekst is geen bord (#436): geen leeg vlak in de wereld.
//   node scripts/countrysigns_guard_test.mjs
import './node3d.mjs';
const { buildSign } = await import('../game/js/countrysigns.js');

let n = 0, bad = 0;
const ok = (name, c, extra = '') => { n++; if (!c) { bad++; console.log('FAIL', name, extra); } };

for (const text of ['', '   ', null, undefined]) {
  const g = buildSign({ kind: 'place', text, x: 0, y: 0, rot: 0 });
  ok(`geen plaatsnaambord zonder naam (${JSON.stringify(text)})`, g.children.length === 0, String(g.children.length));
}
const okSign = buildSign({ kind: 'place', text: ' Hoogkerk ', x: 10, y: 20, rot: 0.4 });
ok('een echt plaatsnaambord bouwt', okSign.children.length > 0);
ok('met een tekstsleutel', (okSign.userData.signKeys || []).length === 1 && okSign.userData.signKeys[0] === 'p:Hoogkerk');

const leeg = buildSign({ kind: 'junction', x: 0, y: 0, blades: [{ text: '', km: 2, ax: 1, ay: 0 }] });
ok('geen wegwijzer met alleen lege armen', leeg.children.length === 0);
const half = buildSign({ kind: 'junction', x: 0, y: 0, blades: [{ text: '', km: 2, ax: 1, ay: 0 }, { text: 'Haren', km: 3, ax: 0, ay: 1 }] });
ok('een lege arm valt weg, de rest blijft', half.children.length === 2 && half.userData.signKeys.length === 2, `${half.children.length} ${half.userData.signKeys.length}`);
console.log(`countrysigns_guard_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
