// Tekstvelden (#315): invoegen op de selectie en welke elementen als tekstveld tellen.
import assert from 'node:assert/strict';
import { insertAt, isTextField } from '../game/js/textfield.js';
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); n++; };
eq(insertAt('abc', 1, 1, 'XY'), { value: 'aXYbc', caret: 3 }, 'invoegen midden');
eq(insertAt('abc', 0, 3, 'Q'), { value: 'Q', caret: 1 }, 'selectie vervangen');
eq(insertAt('abc', null, null, 'd'), { value: 'abcd', caret: 4 }, 'geen selectie = achteraan');
eq(insertAt('abc', 3, 3, 'defgh', 5), { value: 'abcde', caret: 5 }, 'maxLength knipt');
eq(insertAt('abcde', 1, 3, 'xyz', 5), { value: 'axyzde', caret: 4 }.value.length > 5 ? { value: 'axyde', caret: 3 } : { value: 'axyzde', caret: 4 }, 'maxLength met selectie');
eq(insertAt('abc', 9, 2, 'x'), { value: 'abcx', caret: 4 }, 'selectie buiten de tekst');
ok(isTextField({ tagName: 'INPUT', type: 'text' }) && isTextField({ tagName: 'INPUT', type: 'search' }) && isTextField({ tagName: 'TEXTAREA' }) && isTextField({ tagName: 'DIV', isContentEditable: true }), 'tekstvelden');
ok(!isTextField({ tagName: 'INPUT', type: 'checkbox' }) && !isTextField({ tagName: 'INPUT', type: 'range' }) && !isTextField({ tagName: 'BUTTON' }) && !isTextField(null), 'geen tekstvelden');
console.log(`textfield_test: ${n} ok`);
