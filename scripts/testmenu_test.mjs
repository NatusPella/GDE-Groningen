// Testmenu (game/js/testmenulogic.js): node scripts/testmenu_test.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const L = await import(pathToFileURL(path.join(root, 'game/js/testmenulogic.js')).href);
const { FLAG_DOCS } = await import(pathToFileURL(path.join(root, 'game/js/devflags.js')).href);
let fails = 0, n = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name); } };

const rows = L.flagRows(FLAG_DOCS, '?coop&marker=vorm');
ok(rows.length > 10, 'rows for the switches');
ok(!rows.some((r) => r.name === 'testmenu' || r.name === 'dev'), 'skipped switches left out');
ok(rows.find((r) => r.name === 'coop').on === true, 'coop on');
ok(rows.find((r) => r.name === 'marker').value === 'vorm', 'marker value');
ok(rows.find((r) => r.name === 'reizen').on === false, 'reizen off');
ok(rows.every((r) => r.doc && r.doc.length > 5), 'every row has a doc');
ok(Object.keys(L.VALUE_FLAGS).every((k) => k in FLAG_DOCS), 'value switches exist');

ok(L.withFlag('?testmenu', 'coop', true) === '?testmenu&coop', 'turn on');
ok(L.withFlag('?testmenu&coop', 'coop', false) === '?testmenu', 'turn off');
ok(L.withFlag('', 'reizen', true) === '?reizen&testmenu', 'testmenu stays');
ok(L.withFlag('?testmenu&marker=vorm', 'marker', true, 'andere') === '?testmenu&marker=andere', 'value replaced');
ok(L.clearedSearch() === '?testmenu', 'cleared');

const ids = L.SHORTCUTS.map((s) => s.id);
ok(new Set(ids).size === ids.length, 'unique shortcut ids');
ok(L.SHORTCUTS.every((s) => s.label && s.group && s.act && s.act.kind), 'shortcut shape');
ok(L.shortcutGroups().reduce((a, g) => a + g.items.length, 0) === ids.length, 'groups hold all');

const w = L.findWaterNear(0, 0, (x) => x > 40);
ok(w && w.x > 40, 'water found');
ok(L.findWaterNear(0, 0, () => false) === null, 'no water');

// the menu must not write the real storage keys
const src = readFileSync(path.join(root, 'game/js/testmenu.js'), 'utf8') + readFileSync(path.join(root, 'game/js/testmenulogic.js'), 'utf8');
ok(!/gde-save-v1|gde-settings|gde-prestaties-v1/.test(src), 'no real storage keys');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
