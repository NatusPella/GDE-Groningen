// canvasTex (game/js/canvastex.js): zonder opgave anisotropie 4, een eigen waarde blijft staan.
//   node scripts/canvastex_aniso_test.mjs
import './node3d.mjs';
const { canvasTex, DEFAULT_ANISOTROPY } = await import('../game/js/canvastex.js');
let n = 0, bad = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const draw = () => {};
ok(DEFAULT_ANISOTROPY === 4, 'standaard is 4');
ok(canvasTex(8, 8, draw).anisotropy === 4, 'zonder opgave 4', String(canvasTex(8, 8, draw).anisotropy));
ok(canvasTex(8, 8, draw, { anisotropy: 8 }).anisotropy === 8, 'een eigen waarde blijft');
ok(canvasTex(8, 8, draw, { anisotropy: 1 }).anisotropy === 1, '1 zet het uit');
console.log(`${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
