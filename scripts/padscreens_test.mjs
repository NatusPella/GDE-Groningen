// Navigatietest met alleen een controller (game/js/padscreens.js, #151):
// elk scherm is vanaf de titel bereikbaar en weer te verlaten.
//   node scripts/padscreens_test.mjs
import * as S from '../game/js/padscreens.js';
import { PAD_MAPS } from '../game/js/controls.js';

let fails = 0;
const ok = (c, name, extra) => { if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };

const all = new Set(S.PAD_SCREEN_EDGES.flatMap((e) => [e.from, e.to]));
const seen = S.reachable('titel');
ok([...all].every((s) => seen.has(s)), 'elk scherm is vanaf de titel met het pad te bereiken', [...all].filter((s) => !seen.has(s)));
ok(S.stuckScreens('voet').length === 0, 'elk scherm heeft een padroute terug naar lopen', S.stuckScreens('voet'));
for (const e of S.PAD_SCREEN_EDGES) {
  ok(!!PAD_MAPS[e.ctx], `situatie ${e.ctx} bestaat`);
  ok(S.padCan(e.ctx, e.key), `${e.from} -> ${e.to}: ${e.key} heeft een knop in ${e.ctx}`);
}
ok(!S.padCan('foot', 'h'), 'toeteren te voet heeft geen knop (bekende leemte)');
ok(S.padCan('menu', 'arrowdown') && S.padCan('klokken', 'arrowleft'), 'pijlen via de stick in menu en klokken');
// een kapotte tabel moet opvallen: haal alle uitwegen uit een minigame weg
const broken = S.PAD_SCREEN_EDGES.filter((e) => e.from !== 'minigame');
ok(S.stuckScreens('voet', broken).includes('minigame'), 'de test merkt een scherm zonder uitweg op');
// elke situatie heeft een pauze- of terugknop
for (const [ctx, map] of Object.entries(PAD_MAPS)) ok(Object.values(map).includes('escape'), `${ctx}: een pauze- of terugknop`);

// de knopglyphs onderaan het pauzemenu (PAD_KEYS in pausemenu.js) moeten doen wat ze zeggen in de menusituatie
import { readFileSync } from 'node:fs';
import { padFamily } from '../game/js/controls.js';
const src = readFileSync(new URL('../game/js/pausemenu.js', import.meta.url), 'utf8');
const pk = src.match(/const PAD_KEYS = \{([^}]*)\};/);
ok(!!pk, 'PAD_KEYS gevonden in pausemenu.js');
const want = { Enter: 'enter', Esc: 'escape', Q: 'q', E: 'e', M: 'm', Scroll: ']' };
if (pk) for (const [, key, slot] of pk[1].matchAll(/(\w+):\s*'(\w+)'/g)) {
  if (want[key]) ok(PAD_MAPS.menu[slot] === want[key], `menuhint ${key} staat op knop ${slot}, en die doet ${PAD_MAPS.menu[slot]}`);
}
// Switch-controllers worden aan hun id herkend (Chrome/Electron, ook zonder standaardmapping)
for (const id of ['Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)', 'Nintendo Co., Ltd. Pro Controller (Vendor: 057e Product: 2009)', 'Wireless Gamepad (Vendor: 057E Product: 2006)', 'Joy-Con (L+R)']) {
  ok(padFamily(id) === 'switch', `herkend als Switch: ${id}`);
}
if (fails) { console.log(`${fails} mislukt`); process.exit(1); }
console.log('padscreens_test: ok');
