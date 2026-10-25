// Place name boards and signposts: front towards the arriving traffic, plain back (#228): node scripts/boardquad_test.mjs
// En: een bord zonder tekst is geen bord (#436), want de bordatlas is ondoorzichtig en een leeg vakje
// staat zwart in de wereld.
import { boardQuads, bordTekst, paneelTekst, bordHeeftTekst } from '../game/js/boardquad.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const tri = (q, t) => [0, 1, 2].map((i) => q.pos.slice((t * 3 + i) * 3, (t * 3 + i) * 3 + 3));
const normal = (p) => cross(sub(p[1], p[0]), sub(p[2], p[0]));
const uv = (q, t) => [0, 1, 2].map((i) => q.uv.slice((t * 3 + i) * 2, (t * 3 + i) * 2 + 2));

for (const a of [0, 0.7, Math.PI / 2, 2.4, Math.PI, -2, -0.3]) {
  const b = { x: 100, y: -50, a, z: 0 };
  const q = boardQuads(b, 5, 63, 4, 16, 1.8, 0.9, 2);
  ok(q.pos.length === 36 && q.uv.length === 24, `a=${a}: two quads of six vertices`);
  const travel = [Math.cos(a), 0, Math.sin(a)];
  // front (triangles 0 and 1): the normal faces back along the travel direction, towards the traffic that arrives
  for (const t of [0, 1]) ok(dot(normal(tri(q, t)), travel) < 0, `a=${a}: front triangle ${t} faces the arriving traffic`);
  // back (triangles 2 and 3): the other way
  for (const t of [2, 3]) ok(dot(normal(tri(q, t)), travel) > 0, `a=${a}: back triangle ${t} faces away`);
  // text left to right for a driver looking along `a`: u grows towards the driver's right,
  // which in this frame (x east, z south, looking along (fx, fz)) is (-fz, fx)
  const p = tri(q, 0), u = uv(q, 0);
  const du = u[1][0] - u[0][0], along = sub(p[1], p[0]);
  const right = [-travel[2], 0, travel[0]];
  ok(du > 0 && dot(along, right) > 0, `a=${a}: text runs to the driver's right`);
  // the front cell is the board's slot, the back cell is the plain one
  const cellOf = (uvs) => { const cu = (uvs[0][0] + uvs[1][0] + uvs[2][0]) / 3, cv = (uvs[0][1] + uvs[1][1] + uvs[2][1]) / 3; return [Math.floor(cu * 4), Math.floor((1 - cv) * 16)]; };
  const f = cellOf(u), bk = cellOf(uv(q, 2));
  ok(f[0] === 1 && f[1] === 1, `a=${a}: the front uses its own cell`, JSON.stringify(f));
  ok(bk[0] === 3 && bk[1] === 15, `a=${a}: the back uses the plain cell`, JSON.stringify(bk));
}
// --- een bord zonder tekst is geen bord (#436) ---
for (const leeg of ['', '   ', null, undefined, [], ['', '  '], [null, undefined], 0, {}]) {
  ok(!bordHeeftTekst({ k: 'placesign', text: leeg }), `geen vlak voor een bord zonder tekst (${JSON.stringify(leeg)})`);
  ok(bordTekst(leeg).length === 0, `geen regels zonder tekst (${JSON.stringify(leeg)})`);
}
ok(bordHeeftTekst({ k: 'placesign', text: ['Haren'] }), 'een plaatsnaambord heeft tekst');
ok(bordHeeftTekst({ k: 'wegwijzer', text: ['↑ Haren', '← Zernike'] }), 'een wegwijzer heeft tekst');
ok(bordTekst([' Haren ', '  ', null]).join('|') === 'Haren', 'lege regels en spaties vallen weg', JSON.stringify(bordTekst([' Haren ', '  ', null])));
ok(bordTekst('Hoogkerk')[0] === 'Hoogkerk', 'één regel als tekst mag ook');
ok(!bordHeeftTekst(null) && !bordHeeftTekst(undefined), 'een bord zonder tekstveld komt er niet in');
// een portaal: een leeg paneel levert geen vlak op, het andere blijft
ok(paneelTekst(['↑ Haren', ''], 0) === '↑ Haren' && paneelTekst(['↑ Haren', ''], 1) === '', 'een leeg portaalpaneel valt weg');
ok(paneelTekst(undefined, 1) === '' && paneelTekst([' Haren '], 0) === 'Haren', 'paneeltekst is getrimd en veilig');
ok(paneelTekst([], 0) === '' && paneelTekst('Los', 0) === 'Los', 'paneeltekst ook zonder lijst');

console.log(fails ? `${fails} of ${n} FAILED` : `ok: ${n} checks`);
process.exit(fails ? 1 : 0);
