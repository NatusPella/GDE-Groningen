// Microinteracties (DESIGN_SYSTEM.md, "Microinteractions"): de bibliotheek in game/js/ds-motion.css en
// game/js/microinteractions.js houdt zich aan de schaal van ds-tokens.css. Alleen lezen, geen browser.
//   node scripts/microinteracties_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MI, telStap } from '../game/js/microinteractions.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
let n = 0, fails = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${naam}${info ? ` (${info})` : ''}`); } };

const tokens = lees('game/js/ds-tokens.css');
const motion = lees('game/js/ds-motion.css');
const css = motion.replace(/\/\*[\s\S]*?\*\//g, '');
const plat = css.replace(/\s+/g, ' ');
const tokensPlat = tokens.replace(/\s+/g, ' ');
const ms = (naam) => Number((tokens.match(new RegExp(`--ds-${naam}:\\s*(\\d+)ms`)) || [])[1]);

// De schaal is dezelfde als in de tokens en in microinteractions.js
ok(ms('m-snel') === 120 && ms('m') === 200 && ms('m-max') === 250, 'tokens: 120, 200 en 250 ms');
ok(MI.snel === ms('m-snel') && MI.normaal === ms('m') && MI.max === ms('m-max'), 'MI in microinteractions.js volgt de tokens');
ok(MI.verschuiving === 8 && /--ds-mi-versch:\s*8px/.test(css), 'de grootste verplaatsing is 8 px in JS en CSS');

// Geen letterlijke tijd boven 250 ms, geen lus, geen @keyframes die iets anders dan opacity of transform doet
const tijden = [...css.matchAll(/(?<![\w-])(\d*\.?\d+)(ms|s)\b/g)].map((m) => (m[2] === 's' ? Number(m[1]) * 1000 : Number(m[1])));
ok(tijden.every((t) => t <= 250), 'elke letterlijke tijd in ds-motion.css is hooguit 250 ms', tijden.join(','));
ok(!/infinite/.test(css), 'geen lus (infinite) in ds-motion.css');
ok(!/animation-iteration-count/.test(css), 'geen animation-iteration-count in ds-motion.css');
const keyframes = [...css.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g)];
for (const k of keyframes) {
  const props = [...k[2].matchAll(/([\w-]+)\s*:/g)].map((m) => m[1]);
  ok(props.every((p) => ['opacity', 'transform', 'translate', 'fill', 'background-color'].includes(p)), `@keyframes ${k[1]} animeert alleen opacity, transform of fill`, props.join(','));
}
ok(keyframes.length === 0 && !/animation\s*:/.test(css), 'ds-motion.css heeft geen @keyframes en geen animation: de toestandsklassen sturen transities');

// Alleen opacity, translate, transform, box-shadow (druk-state) en fills in een transition
const transProps = new Set();
for (const m of css.matchAll(/transition\s*:\s*([^;}]+)/g)) {
  let diepte = 0, deel = '';
  const klaar = () => { if (deel.trim()) transProps.add(deel.trim().split(/\s+/)[0]); deel = ''; };
  for (const ch of m[1]) {
    if (ch === '(') diepte++;
    if (ch === ')') diepte--;
    if (ch === ',' && diepte === 0) klaar(); else deel += ch;
  }
  klaar();
}
for (const p of transProps) ok(['opacity', 'translate', 'transform', 'box-shadow', 'background-color', 'fill'].includes(p), `transition op ${p} is toegestaan`);
for (const verboden of ['width', 'height', 'top', 'left', 'right', 'bottom', 'margin', 'padding', 'filter', 'blur', 'all']) ok(!transProps.has(verboden), `geen transition op ${verboden} (layout, filter of alles)`);

// Verplaatsing: nooit meer dan 8 px letterlijk in een translate
const px = [...css.matchAll(/translate\s*:\s*([^;}]+)/g)].flatMap((m) => [...m[1].matchAll(/(\d+)px/g)].map((x) => Number(x[1])));
ok(px.every((v) => v <= 8), 'een letterlijke translate is hooguit 8 px', px.join(','));

// Alle tijden komen uit de tokens: Beweging beperken en Rustig drukwerk zetten de tokens op 0
const gebruikt = [...css.matchAll(/transition(?:-duration)?\s*:\s*([^;}]+)/g)].map((m) => m[1]).join(' ');
ok(/var\(--ds-m\b/.test(gebruikt) && /var\(--ds-m-max\b/.test(gebruikt) && /var\(--ds-m-snel\b/.test(gebruikt), 'de drie tokens worden gebruikt');
ok(/html\.reduce-motion \{[^}]*--ds-m: 0ms/.test(tokensPlat) && /prefers-reduced-motion: reduce\) \{ :root \{[^}]*--ds-m: 0ms/.test(tokensPlat), 'de tokens staan op 0 ms bij reduce-motion en prefers-reduced-motion');
ok(/rustig-drukwerk[^{]*\{[^}]*--ds-m: 0ms; --ds-m-max: 0ms/.test(tokensPlat), 'Rustig drukwerk zet de tokens op 0 ms');
ok(/html\.reduce-motion \.ds-mi-in[^{]*\{ transition-delay: 0ms/.test(plat) && /prefers-reduced-motion: reduce\) \{ \.ds-mi-in \{[^}]*transition-delay: 0ms/.test(plat), 'ook een delay is 0 bij reduce-motion (twee takken)');
ok(!/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/.test(css), 'geen losse kleur in ds-motion.css');

// De klassen uit het hoofdstuk bestaan
for (const k of ['ds-mi-in', 'ds-mi-landing', 'ds-mi-na', 'ds-mi-schuift', 'ds-mi-druk', 'ds-mi-vul', 'ds-mi-teller']) ok(new RegExp(`\\.${k}\\b`).test(css), `.${k} staat in ds-motion.css`);
const doc = lees('DESIGN_SYSTEM.md');
ok(/#{2,3} Microinteractions/.test(doc), 'DESIGN_SYSTEM.md heeft het hoofdstuk Microinteractions');
for (const k of ['ds-mi-in', 'ds-mi-landing', 'ds-mi-schuift', 'ds-mi-druk', 'ds-mi-vul', 'ds-mi-teller']) ok(doc.includes(k), `${k} staat in het hoofdstuk`);

// De rekenstap van de teller: <= 250 ms, monotoon, eindigt exact, nul bij 0
{
  let v = 1000; const start = 1000, doel = 6500; let t = 0;
  while (v !== doel && t < 1000) { v = telStap(v, doel, start, 1 / 60); t += 1000 / 60; }
  ok(v === doel && t <= 250 + 1000 / 60, 'een teller bereikt het doel in hooguit 250 ms (+1 frame)', `${t} ms`);
  ok(telStap(10, 500, 10, 0.016, 0) === 500, 'duur 0 (Beweging beperken) zet meteen de eindwaarde');
  let w = 500; const sw = 500; let monotoon = true;
  for (let i = 0; i < 30 && w !== 100; i++) { const nw = telStap(w, 100, sw, 1 / 60); if (nw > w) monotoon = false; w = nw; }
  ok(monotoon && w === 100, 'een teller omlaag loopt monotoon en eindigt op het doel');
  ok(telStap(100, 100, 100, 0.016) === 100, 'gelijk is gelijk');
}

// De koppeling: de componenten dragen de klassen
const bm = lees('game/js/bigmoment.js') + lees('game/js/bigmoment.css');
ok(['bm-band', 'bm-slip', 'bm-stempel', 'bm-kaart', 'bm-tag'].every((c) => new RegExp(`class=\\"${c} ds-mi-in ds-mi-landing`).test(bm)), 'de vijf einde-missie-vormen landen met ds-mi-in ds-mi-landing');
ok(!/@keyframes bm-/.test(bm), 'bigmoment.css heeft geen eigen @keyframes meer');
ok(/hud-card ds-mi-in/.test(lees('game/js/hudcards.js')), 'HUD-kaarten dragen ds-mi-in');
ok(/pf-card ds-mi-in/.test(lees('game/js/phonefeed.js')), 'telefoonmeldingen dragen ds-mi-in');
ok(/ach-toast ds-mi-in/.test(lees('game/js/achievements.js')), 'de prestatietoast draagt ds-mi-in');
ok(/ds-motion\.css/.test(lees('game/index.html')), 'game/index.html laadt ds-motion.css');
ok(/telStap/.test(lees('game/js/hud_panel.js')), 'de geldteller in de HUD gebruikt telStap');

console.log(`${n - fails}/${n} microinteracties-controles groen`);
process.exit(fails ? 1 : 0);
