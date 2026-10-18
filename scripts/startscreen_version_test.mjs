// The title menu shows the version once, in the credit line (#183):  node scripts/startscreen_version_test.mjs
import fs from 'fs';
const js = fs.readFileSync(new URL('../game/js/startscreen.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../game/js/startscreen.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../game/index.html', import.meta.url), 'utf8');
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } };
ok(!/ss-ver2/.test(js + css), 'no second version label on a menu item');
ok((html.match(/class="ss-ver"/g) || []).length === 1, 'one version span in the start screen');
const menu = js.slice(js.indexOf('const itemHtml'), js.indexOf('menu.innerHTML'));
ok(menu.length > 100 && !/VERSION/.test(menu), 'menu items do not print VERSION');
console.log(fails ? `${fails} failed` : '3/3 ok');
process.exit(fails ? 1 : 0);
