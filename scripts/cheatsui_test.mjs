// Cheatmenu: bladeren is niet activeren (#161): node scripts/cheatsui_test.mjs
import { CHEATS } from '../game/js/cheatlist.js';
import { impact, summaryLine, pressToggle, onSelect } from '../game/js/cheatsuilogic.js';

let n = 0, fails = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL ' + name); } };
const by = (id) => CHEATS.find((c) => c.id === id);

ok(impact(by('grotekoppen')) === 'veilig', 'cosmetic is veilig');
ok(impact(by('teleport')) === 'veilig' && impact(by('voertuig')) === 'veilig', 'actions are veilig');
ok(impact(by('zwaartekracht')) === 'hindert', 'gameplay hindert');
for (const c of CHEATS) ok(impact(c) === (c.safe || c.kind === 'action' || c.kind === 'perk' ? 'veilig' : 'hindert'), `impact of ${c.id}`);

ok(summaryLine(CHEATS, () => false).tone === 'good', 'nothing on: good');
ok(summaryLine(CHEATS, (id) => id === 'grotekoppen').tone === 'good', 'only veilig on: good');
const s = summaryLine(CHEATS, (id) => id === 'storm');
ok(s.tone === 'red' && s.text.includes('Zomer? Ja.') && s.text.includes('uitgeschakeld'), 'hindering on: prestaties off');

let st = { pending: null };
let r = pressToggle(st, by('grotekoppen'), false);
ok(r.do === 'apply' && r.value === true, 'veilig on in one press');
r = pressToggle(st, by('storm'), false);
ok(r.do === 'ask' && r.pending === 'storm', 'hindering asks first');
st = { pending: r.pending };
r = pressToggle(st, by('storm'), false);
ok(r.do === 'apply' && r.value === true && r.pending === null, 'second press confirms');
r = pressToggle({ pending: null }, by('storm'), true);
ok(r.do === 'apply' && r.value === false, 'off needs no confirmation');
ok(onSelect({ pending: 'storm' }, 'eeuwig').pending === null, 'moving away drops the confirmation');
ok(onSelect({ pending: 'storm' }, 'storm').pending === 'storm', 'same row keeps it');
r = pressToggle({ pending: 'storm' }, by('eeuwig'), false);
ok(r.do === 'ask', 'a waiting confirmation for another cheat does not count');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
