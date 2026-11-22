// #804: hudcards.js leest offsetHeight (layoutdwang) hooguit vier keer per seconde, niet elk frame.
//   node scripts/hudcards_layout_test.mjs
import fs from 'node:fs';
import { throttledRead, COLUMN_OPTS_MS } from '../game/js/hudbus.js';
let fails = 0, n = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL', name, info); } };
let reads = 0;
const col = throttledRead(() => ({ extraLines: ++reads }), COLUMN_OPTS_MS);
const a = col(1000);
for (let i = 1; i < 60; i++) col(1000 + i * 4);   // 60 frames van 4 ms: binnen het venster
ok(reads === 1, 'binnen het venster één lezing, geen 60', String(reads));
ok(col(1000 + COLUMN_OPTS_MS + 1).extraLines === 2, 'na het venster opnieuw lezen');
ok(a.extraLines === 1, 'de uitkomst is de gecachete waarde');
col(10);   // klok liep terug (nieuw spel): niet vastzitten aan een oude cache
ok(reads === 3, 'een terugspringende klok leest opnieuw', String(reads));
const src = fs.readFileSync(new URL('../game/js/hudcards.js', import.meta.url), 'utf8');
ok(/throttledRead\(\(\) => columnOptsRead\(\), COLUMN_OPTS_MS\)/.test(src), 'hudcards: columnOpts loopt via throttledRead');
ok(!/const col = columnOpts\(\)/.test(src), 'hudcards: columnOpts wordt niet meer elk frame gelezen');
// #1211: een Phosphor-icoon (inline stroke:none) krijgt op de kaart toch een inktrand, anders verdwijnt een geel icoon op papier
const kaartCss = fs.readFileSync(new URL('../game/js/hudcards.css', import.meta.url), 'utf8');
ok(/#hud \.hc-icon svg\[viewBox="0 0 256 256"\] \{[^}]*stroke: var\(--ds-c-ink-inkt\) !important;[^}]*stroke-width: 1\.5px !important/.test(kaartCss), 'de meldingsiconen hebben een inktrand, ook met inline stroke:none');
ok(/svg\[viewBox="0 0 256 256"\] \* \{ vector-effect: non-scaling-stroke/.test(kaartCss), 'de rand is op elke schaal even dik');
console.log(fails ? `hudcards_layout_test: ${fails} FAIL` : `hudcards_layout_test: ok (${n} controles)`);
process.exit(fails ? 1 : 0);
