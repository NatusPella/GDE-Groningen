// #813: "Begin hier" — de telling en de drie dichtstbijzijnde dingen.
//   node scripts/todo_begin_test.mjs
import { beginHierItems, beginHierCount } from '../game/js/todobegin.js';
import fs from 'node:fs';

let fails = 0;
const ok = (c, name, extra) => { if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };
const it = (key, dist, status = '', goal = { kind: 'play', id: key }) => ({ key, dist, status, goal, title: key });

ok(beginHierItems([], { x: 0, y: 0 }).length === 0, 'lege lijst geeft niets');
ok(beginHierItems(null).length === 0, 'geen lijst geeft niets');
const one = beginHierItems([it('a', 5)], {}, 3);
ok(one.length === 1 && one[0].key === 'a', 'één item');
const many = beginHierItems([it('d', 40), it('b', 10), it('a', 5), it('c', 20)], {}, 3);
ok(many.map((x) => x.key).join() === 'a,b,c', 'hooguit drie, dichtstbij eerst', many.map((x) => x.key));
ok(beginHierItems([it('a', 5, 'klaar')], {}).length === 0, 'klaar telt niet mee');
ok(beginHierItems([it('a', 5, 'later')], {}).length === 0, 'later telt niet mee');
ok(beginHierItems([it('a', 5, 'slot')], {}).length === 0, 'op slot telt niet mee');
ok(beginHierItems([it('a', 5, 'nu')], {}).length === 1, 'nu telt mee');
ok(beginHierItems([it('a', null)], {}).length === 0, 'zonder afstand telt niet mee');
ok(beginHierItems([it('a', 5), it('a', 3)], {}).length === 1, 'dubbele key telt één keer');
ok(beginHierItems([{ key: 'x', dist: 1 }], {}).length === 0, 'zonder doel telt niet mee');
ok(beginHierItems([it('a', 5)], {}, 0).length === 0, 'aantal nul geeft niets');
ok(beginHierCount([it('a', 1), it('b', 2), it('c', 3), it('d', 4)]) === 4, 'de telling telt alle geldige dingen');

const td = fs.readFileSync(new URL('../game/js/todoui.js', import.meta.url), 'utf8');
ok(td.includes('beginHierHtml()') && td.includes('data-todo='), 'de UI toont de beginhier-rijen als gewone data-todo-rijen');
ok(td.includes('beginHierItems(items, p, 3)') && td.includes('beginHierCount(items, p)'), 'de UI gebruikt de pure selectie');

console.log(fails ? `${fails} FAIL` : 'todo_begin_test ok');
process.exit(fails ? 1 : 0);
