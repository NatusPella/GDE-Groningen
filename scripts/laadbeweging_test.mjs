// Laadschermbeweging (23-11, wens van de eigenaar): elk laadscherm gebruikt de gedeelde set uit game/js/ds-laad.css, die alleen
// transform en opacity animeert met tijden uit tokens, en die stilstaat bij Beweging beperken (instelling en systeem) en Rustig drukwerk.
// Puur lezen, geen browser.
//   node scripts/laadbeweging_test.mjs
import fs from 'node:fs';
import { loadScreenHtml } from '../game/js/loadscene.js';

let n = 0, fout = 0;
const ok = (c, w) => { n++; if (!c) { fout++; console.log('FAIL ' + w); } };
const lees = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const zonderCommentaar = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

const ruw = lees('game/js/ds-laad.css');
const css = zonderCommentaar(ruw);
const tokens = lees('game/js/ds-tokens.css');
const html = lees('game/index.html');
const ls = lees('game/js/loadscreen.js');

// 1. de set zelf
const KLASSEN = ['ds-laad__stempel', 'ds-laad__drift', 'ds-laad__adem', 'ds-laad__balk', 'ds-laad__status--nieuw'];
for (const k of KLASSEN) ok(new RegExp('\\.' + k + '\\b').test(css), `ds-laad.css kent .${k}`);
for (const kf of css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?\})\s*\}/g)) {
  const props = [...kf[2].matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
  ok(props.length && props.every((p) => p === 'transform' || p === 'opacity'), `@keyframes ${kf[1]} animeert alleen transform en opacity (${props.join(', ')})`);
}
for (const regel of ruw.split('\n').filter((l) => /\banimation\s*:/.test(l) && !/animation:\s*none/.test(l))) {
  const kaal = regel.replace(/\/\*.*?\*\//g, '').replace(/var\([^()]*\)/g, '');
  ok(!/(?<![\w.-])\d*\.?\d+m?s\b/.test(kaal.split(/animation\s*:/)[1] || ''), 'geen letterlijke tijd in een animatie: ' + regel.trim().slice(0, 70));
  ok(/var\(--ds-laad-/.test(regel), 'de tijd komt uit een --ds-laad-*-token: ' + regel.trim().slice(0, 70));
  if (/\binfinite\b/.test(regel)) ok(/ds3-lus/.test(regel), 'een doorlopende animatie draagt ds3-lus: ' + regel.trim().slice(0, 70));
}
ok(!/#[0-9a-fA-F]{3,8}\b|rgba?\(|gradient\(/.test(css), 'geen losse kleur en geen verloop (alleen inkt-tokens)');
ok(!/transition\s*:/.test(css), 'geen transities op layout-eigenschappen (de set gebruikt alleen animaties)');

ok(/\.ds-laad:is\(\.done, \.out\)[^{]*\.ds-laad__drift[^{]*\.ds-laad__balk::after \{ animation: none; \}/.test(css), 'een laadscherm dat weg is (done, out) laat geen lus doorlopen tijdens het spelen');

// 2. Beweging beperken en Rustig drukwerk: drie takken, elke klasse staat stil
const takken = {
  systeem: (css.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/) || [, ''])[1],
  instelling: css.split('\n').filter((l) => l.startsWith('html.reduce-motion')).join('\n'),
  rustig: css.split('\n').filter((l) => l.startsWith('html.rustig-drukwerk')).join('\n'),
};
for (const [naam, tak] of Object.entries(takken)) {
  ok(/animation:\s*none/.test(tak), `de tak ${naam} zet de animatie uit`);
  for (const k of ['ds-laad__stempel', 'ds-laad__drift', 'ds-laad__adem', 'ds-laad__status--nieuw', 'ds-laad__balk::after']) ok(tak.includes(k), `de tak ${naam} dekt .${k}`);
  ok(!/opacity:\s*0\b/.test(tak), `de tak ${naam} verbergt niets`);
}

// 3. de tokens
for (const t of ['stempel', 'staffel', 'wissel', 'adem', 'glans', 'drift']) ok(new RegExp(`--ds-laad-${t}:\\s*\\d+m?s`).test(tokens), `token --ds-laad-${t} bestaat`);
const nul = tokens.match(/--ds-laad-stempel: 0ms; --ds-laad-staffel: 0ms; --ds-laad-wissel: 0ms;/g) || [];
ok(nul.length === 2, 'Beweging beperken zet de laad-tokens op nul (systeem en instelling)');

// 4. elk laadscherm gebruikt de set
ok(/<link rel="stylesheet" href="js\/ds-laad\.css">/.test(html), 'index.html laadt ds-laad.css');
ok(/<div id="loading" class="ds-laad">/.test(html), 'het opstartscherm (ook het voorladen van de benchmark) is een .ds-laad');
ok(/gde-mark ds-laad__stempel/.test(html) && /gde-sign ds-laad__stempel/.test(html) && /gde-sub ds-laad__stempel/.test(html), 'het logo op het opstartscherm stempelt via de gedeelde set');
ok(/ld-fill ds-laad__balk/.test(html) && /ld-status ds-laad__status/.test(html), 'balk en statusregel van het opstartscherm doen mee');
ok(!/@keyframes bt-stamp/.test(html), 'het opstartscherm heeft geen eigen stempel meer naast de gedeelde set');
ok(/className = 'ls ls-' \+ kind \+ ' instant ds-laad'/.test(ls), 'het laadscherm (save, reizen, snel reizen, missie, Samen spelen) is een .ds-laad');
ok(/nieuweRegel\(stepEl\)/.test(ls) && !/offsetWidth/.test(ls.split('function nieuweRegel')[1].split('\n}')[0]), 'een nieuwe statusregel komt binnen zonder geforceerde layout');
for (const kind of ['save', 'travel', 'snel']) {
  const h = loadScreenHtml({ kind, name: 'Vismarkt', img: 'vismarkt' });
  for (const k of ['ds-laad__stempel', 'ds-laad__drift', 'ds-laad__adem', 'ds-laad__balk', 'ds-laad__status']) ok(h.includes(k), `laadscherm ${kind} gebruikt .${k}`);
  ok((h.match(/role="progressbar"/g) || []).length === 1, `laadscherm ${kind}: één balk`);
  ok(!/Enter|ENTER|tip/i.test(h.replace(/class="[^"]*"/g, '')), `laadscherm ${kind}: geen Enter en geen tip`);
}

console.log(`laadbeweging_test: ${n - fout}/${n}`);
process.exit(fout ? 1 : 0);
