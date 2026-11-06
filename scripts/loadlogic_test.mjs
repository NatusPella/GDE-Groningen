// Pure logic of the load screens (game/js/loadlogic.js):  node scripts/loadlogic_test.mjs
import { loadKind, stepProgress, startProgress, pickTips, buildLines, tipText, barsFor, BAR_PHASES, TIP_MAX_CHARS, MAX_S, SNEL_M } from '../game/js/loadlogic.js';
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

ok(loadKind(5000) === 'travel' && loadKind(SNEL_M - 1) === 'snel' && loadKind(900) === 'snel', 'kind by distance');
ok(loadKind(10, { save: true }) === 'save', 'save wins');

// progress: monotonic, ends at 1, never done before the minimum time
let s = startProgress(), last = 0, doneAt = -1;
for (let f = 0; f < 600; f++) {
  const t = f / 60, pending = Math.max(0, 100 - f * 2);
  s = stepProgress(s, pending, t, 'travel');
  ok(s.bar >= last - 1e-9, 'bar never goes back', f);
  last = s.bar;
  if (s.done && doneAt < 0) doneAt = t;
}
ok(doneAt >= 1.4, 'not done before the minimum', doneAt);
ok(s.bar === 1, 'ends full');
// first frames show nearly nothing
let a = stepProgress(startProgress(), 500, 0, 'save');
ok(a.bar <= 0.05 && !a.done, 'first frame starts low');
// nothing to build: still waits for the minimum, then done
let q = startProgress(); let d = -1;
for (let f = 0; f < 400; f++) { q = stepProgress(q, 0, f / 60, 'snel'); if (q.done && d < 0) d = f / 60; }
ok(d >= 0.6 && d < 1.2, 'snel with an empty queue is quick', d);
// stuck stream gives up after MAX_S
let z = startProgress();
z = stepProgress(z, 50, MAX_S + 0.1, 'travel');
ok(z.done && z.bar === 1, 'timeout finishes');

for (const ph of BAR_PHASES) ok(barsFor(ph) === 1, 'one bar in phase ' + ph);
{
  const ls = fs.readFileSync(new URL('../game/js/loadscreen.js', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../game/js/loadscreen.css', import.meta.url), 'utf8');
  const html = fs.readFileSync(new URL('../game/index.html', import.meta.url), 'utf8');
  ok((ls.match(/class="ls-bar"/g) || []).length === 1, 'load screen draws one bar element');
  ok(!/ls-tiles/.test(ls + css), 'no second (tile) bar on the load screen');
  ok(!/ls-snel[^{]*\.ls-bar[^{]*\{[^}]*display:\s*none/.test(css), 'snel keeps its single bar');
  ok(/classList\.add\('ls-over'\)/.test(ls) && /#loading\.ls-over \.bt-load/.test(html), 'boot bar hides when the load screen opens');
  ok((html.match(/class="ld-bar"/g) || []).length === 1 && !/<div id="loading"[^>]*role="progressbar"/.test(html), 'boot screen has one progressbar');
}

// tips
const tips = ['Tip: loop met V. Dan kom je verder.', 'Tip: ' + 'x'.repeat(80), 'Tip: pauze met Esc.', 'Tip: pauze met Esc.', 'Tip: kaart met M!'];
const rng = (() => { let i = 0; return () => ((i = (i * 7 + 3) % 10) / 10); })();
const p = pickTips(tips, 5, rng);
ok(p.length === 3, 'dedupes and drops long ones', p.length);
ok(p.every((t) => t.length <= TIP_MAX_CHARS && !t.startsWith('Tip')), 'short, no prefix');
ok(tipText('Tip: loop met V. Dan kom je verder.') === 'Loop met V.', 'first sentence');
ok(!pickTips(tips, 5, rng, 'Pauze met Esc.').includes('Pauze met Esc.'), 'no repeat of last');
ok(pickTips(tips, 0).length === 0, 'n = 0');

ok(buildLines('snel', ['Onderweg', 'x'], p).length === 0, 'snel has no lines');
const bl = buildLines('travel', ['Onderweg', 'Een lijn'], p);
ok(bl.length === 4 && bl[0][0] === 'Onderweg' && bl[1][0] === 'Wist je dat', 'lead then tips');
ok(buildLines('travel', ['Onderweg', ''], p).length === 3, 'empty lead skipped');
import { PICTURES, APPROVED, MISSION_PICTURE, missionPicture, pictureHtml, pictureOk } from '../game/js/loadscene.js';
import { BOOT_PHASES, bootPhaseAt } from '../game/js/loadlogic.js';
import fs from 'node:fs';
ok(APPROVED.length === 7 && APPROVED.every((p) => fs.existsSync(new URL('../game/img/laad/' + p + '.jpg', import.meta.url))), 'every approved picture exists');
ok(Object.values(MISSION_PICTURE).every(pictureOk) && missionPicture('nope') === 'vismarkt', 'every mission kind has an approved picture');
ok(APPROVED.every((p) => { const h = pictureHtml(p); return h.includes('img/laad/' + p + '.jpg') && h.includes('alt="' + PICTURES[p] + '"'); }), 'picture html uses the render and its alt');
ok(pictureHtml('x').includes('img/laad/vismarkt.jpg') && !/<svg/.test(pictureHtml('duif', 'bt-bg')), 'unknown falls back, no own svg style');
// every load screen picks from the approved set (loadscreen.js imports the DOM-free parts only at call time)
const src = fs.readFileSync(new URL('../game/js/loadscreen.js', import.meta.url), 'utf8');
const pickBody = src.slice(src.indexOf('export function pickImage'), src.indexOf('function recapText'));
const used = [...pickBody.matchAll(/'([a-z]+)'/g)].map((x) => x[1]).filter((w) => !['haven', 'kade', 'diep', 'gracht', 'water', 'markt', 'binnenstad', 'forum', 'toren', 'kerk'].includes(w));
ok(used.length >= 5 && used.every(pictureOk), 'pickImage only names approved pictures', used.join());
// #600: an unknown place gets the neutral render, and the country at night is never the chase picture
ok(/return 'luchtfoto';\s*\}/.test(pickBody), 'pickImage falls back to the neutral aerial');
ok(!/place\.country[^\n]*achtervolging/.test(pickBody), 'the country at night does not get the chase picture');
ok(!/CITY_IMAGES/.test(src), 'no hash-picked random city picture');
ok(!/sceneSvg|ls-scene/.test(src), 'load screen has no own svg scene');

// #600: the boot bar has real steps with words, also at the last one
ok(BOOT_PHASES.length === 5 && BOOT_PHASES[0].from === 0 && BOOT_PHASES[BOOT_PHASES.length - 1].from >= 0.9,
  'the boot bar has measured steps and a last one at the end', BOOT_PHASES.length);
ok(bootPhaseAt(0).id === 'kaart' && bootPhaseAt(0.91).final && bootPhaseAt(1).final, 'the last boot step is final and named');
ok(BOOT_PHASES.every((p, i) => i === 0 || p.from > BOOT_PHASES[i - 1].from), 'the boot steps rise');
ok(bootPhaseAt(-1).from === 0 && bootPhaseAt(5).from === BOOT_PHASES[BOOT_PHASES.length - 1].from, 'out-of-range progress is clamped');
ok(!/firstSentence\(recapText/.test(src), 'the load screen keeps the whole recap instead of its first sentence');
// #600: one progressbar on the bar, not on the whole screen, so the place, the story and the tip stay readable
const ldHtml = src.slice(src.indexOf('el.innerHTML ='), src.indexOf('document.body.appendChild(el)'));
ok(/class="ls-bar" role="progressbar"/.test(ldHtml) && !/el\.setAttribute\('role', 'progressbar'\)/.test(src), 'the load screen has one progressbar, on the bar');
ok(/aria-valuenow/.test(src) && /aria-live="polite"/.test(ldHtml), 'the bar reports progress and the tip line is announced');
// the first load screen (index.html #loading): only the age sign, no words, and a sharp picture
const html = fs.readFileSync(new URL('../game/index.html', import.meta.url), 'utf8');
const boot = html.slice(html.indexOf('<div id="loading"'), html.indexOf('<div id="start-screen"'));
ok(boot.includes('bt-pegi') && boot.includes('>18<') && !/bt-desc|Geweld|verzonnen|Kaartdata|goedgekeurd/.test(boot), 'boot screen shows only the 18 sign');
ok(!/blur\(/.test(html.slice(html.indexOf('#loading .bt-bg'), html.indexOf('#loading .bt-veil'))), 'boot picture is not blurred');
ok(!/blur\(/.test(fs.readFileSync(new URL('../game/js/loadscreen.css', import.meta.url), 'utf8').split(/\r?\n/).filter((l) => /ls-bg/.test(l)).join('')), 'load picture is not blurred');
ok(/pickImage\(world, place, mission\)\s*\{\s*if \(mission\) return missionPicture\(mission\)/.test(src), 'a mission picks its own picture');
console.log(`${n - fails}/${n} loadlogic`);
process.exit(fails ? 1 : 0);
