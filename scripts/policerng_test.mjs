// De politie-spawns zijn herhaalbaar (#43): node scripts/policerng_test.mjs
import './node3d.mjs';
const { policeRng } = await import('../game/js/police.js');
let n = 0, bad = 0;
const check = (name, c) => { n++; if (!c) { bad++; console.log('FAIL', name); } };
const seq = (w) => { const r = policeRng(w); return [r(), r(), r(), r()].join(); };
check('zelfde zaadje, zelfde reeks', seq({ policeSeed: 7 }) === seq({ policeSeed: 7 }));
check('ander zaadje, andere reeks', seq({ policeSeed: 7 }) !== seq({ policeSeed: 8 }));
const w = {}; const a = policeRng(w);
check('dezelfde generator per wereld', policeRng(w) === a);
check('waarden in [0,1)', (() => { const r = policeRng({}); for (let i = 0; i < 100; i++) { const x = r(); if (!(x >= 0 && x < 1)) return false; } return true; })());
console.log(`policerng_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
