// Pure logic of the load screens (game/js/loadlogic.js):  node scripts/loadlogic_test.mjs
import { loadKind, stepProgress, startProgress, pickTips, buildLines, tipText, barsFor, BAR_PHASES, TIP_MAX_CHARS, MAX_S, SNEL_M, loadPending, LOAD_STEPS, loadStepAt } from '../game/js/loadlogic.js';
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

// #929: het laadscherm telt ook de tegelwachtrij en de prewarm van de bestemming
// mee; een reis die alleen op gebouwen en wegen wachtte, sloot te vroeg.
ok(loadPending({ buildings: 3, roads: 2 }) === 5, 'loadPending: gebouwen en wegen');
ok(loadPending({ buildings: 3 }, 7, 4) === 14, 'loadPending: tegels en prewarm tellen mee');
ok(loadPending(null, 2, 0) === 2 && loadPending({ buildings: NaN, roads: -5 }, 0, 2) === 2, 'loadPending: onzin telt niet mee');
{
  // met een niet-lege tegelwachtrij is het scherm nog niet klaar, ook al staan de
  // gebouwen en wegen op nul; dat was precies de trage eerste seconde na een reis
  let p = startProgress(), klaarMetTegels = -1;
  for (let f = 0; f < 900; f++) {
    const t = f / 60, tiles = f < 180 ? 40 : 0; // 3 s lang tegels in de wachtrij
    p = stepProgress(p, loadPending({ buildings: 0, roads: 0 }, tiles), t, 'travel');
    if (p.done && klaarMetTegels < 0) klaarMetTegels = t;
  }
  ok(klaarMetTegels >= 3, 'de tegelwachtrij houdt het scherm open tot die leeg is', klaarMetTegels);
}
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
import { BOOT_STEPS, BOOT_DONE_LABEL, bootPlan, bootProgress, bootPhaseAt, bootCreepCap, bootStepText, stepDurations, loadStepNr } from '../game/js/loadlogic.js';
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
// #770: haalt iets het laadscherm weg, dan rondt de lus af in plaats van alleen te stoppen, anders blijft done hangen
ok(/if \(!el\.isConnected\) \{ finish\(\); return; \}/.test(src), 'een losgekoppeld laadscherm resolvet done (#770)');

// #600, #1010: the boot bar has every step of the start, with words and weights; it is full only after the last one
const plans = {
  nieuw: bootPlan(), openingen: bootPlan({ openings: true }), opgeslagen: bootPlan({ film: false }),
  test: bootPlan({ warm: false }), stil: bootPlan({ geluid: false }),
};
ok(BOOT_STEPS.every((st) => st.label.length > 12 && st.weight > 0 && /^[A-Z]/.test(st.label) && !/[.!?]$/.test(st.label)), 'every boot step has a plain label and a weight');
ok(BOOT_STEPS.map((st) => st.id).join() === 'kaart,wereld,systemen,buurt,openingsbeelden,shaders,geluid,beeld', 'the boot steps follow the order of the start', BOOT_STEPS.map((st) => st.id).join());
ok(/shaders worden klaargezet \(dit duurt even\)/.test(BOOT_STEPS.find((st) => st.id === 'shaders').label) && /openingsbeelden worden klaargezet/.test(BOOT_STEPS.find((st) => st.id === 'openingsbeelden').label) && /geluid wordt klaargemaakt/.test(BOOT_STEPS.find((st) => st.id === 'geluid').label), 'the long steps say what they do');
ok(BOOT_DONE_LABEL.startsWith('Klaar'), 'the end has its own words');
for (const [naam, plan] of Object.entries(plans)) {
  ok(Math.abs(plan.steps.reduce((t, st) => t + st.weight, 0) - 1) < 1e-9, 'weights add up to 1: ' + naam);
  ok(plan.steps.every((st, i) => st.label && st.nr === i + 1 && st.total === plan.total && st.to > st.from && (i === 0 || st.from === plan.steps[i - 1].to)), 'steps are numbered, labelled and contiguous: ' + naam);
  ok(plan.steps[0].from === 0 && plan.steps[plan.total - 1].to === 1, 'the plan runs from 0 to 1: ' + naam);
  // walk the whole start in small moves: monotone, and 1 only at the end of the last step
  let last = -1, vol = 0;
  for (const st of plan.steps) for (let f = 0; f <= 20; f++) {
    const v = bootProgress(plan, st.id, f / 20);
    ok(v >= last - 1e-12, 'the bar never goes back: ' + naam + ' ' + st.id + ' ' + f);
    if (v >= 1) vol++;
    last = v;
  }
  ok(vol === 1 && bootProgress(plan, plan.steps[plan.total - 1].id, 1) === 1, 'the bar is full only at the end of the last step: ' + naam, vol);
  ok(plan.steps.slice(0, -1).every((st) => bootProgress(plan, st.id, 1) < 1), 'no step but the last fills the bar: ' + naam);
  // a step that has not started is never ahead of one that is further along, whatever it reports
  ok(plan.steps.every((st) => bootPhaseAt(bootProgress(plan, st.id, 0), plan).id === st.id), 'the start of a step belongs to that step: ' + naam);
  ok(plan.steps.every((st) => bootCreepCap(plan, bootProgress(plan, st.id, 0)) < st.to && bootCreepCap(plan, bootProgress(plan, st.id, 0)) >= st.from), 'the creep stays inside its step: ' + naam);
}
ok(plans.nieuw.total === 7 && plans.openingen.total === 8 && plans.test.total === 3 && plans.stil.total === 6, 'the plan follows the start: warm-up, opening shots, sound', [7, 8, 3, 6].join());
ok(!plans.nieuw.steps.some((st) => st.id === 'openingsbeelden') && plans.openingen.steps.some((st) => st.id === 'openingsbeelden'), 'the opening shots are a step only when they are ridden ahead');
ok(!plans.test.steps.some((st) => ['buurt', 'shaders', 'geluid', 'beeld'].includes(st.id)), 'a test run has no warm-up steps');
{
  const sh = (p) => p.steps.find((st) => st.id === 'shaders').weight;
  ok(sh(plans.opgeslagen) < sh(plans.nieuw), 'a saved game has no film light, so a lighter shader step');
  ok(plans.nieuw.steps.find((st) => st.id === 'shaders').weight + plans.nieuw.steps.find((st) => st.id === 'buurt').weight > 0.4, 'the warm-up steps weigh in: the bar is not "full" at the end of the map and the systems');
  // the old failure: the bar stood at 92% on "buurt klaargezet" while the shaders were still to come
  const voorWarm = bootProgress(plans.nieuw, 'systemen', 1);
  ok(voorWarm < 0.5, 'after the systems the bar is far from full', voorWarm);
}
ok(bootProgress(plans.nieuw, 'bestaatniet', 1) === 0 && bootProgress(plans.nieuw, 'kaart', NaN) === 0 && bootProgress(plans.nieuw, 'kaart', 5) === plans.nieuw.steps[0].to, 'unknown step and out-of-range fractions are safe');
ok(bootPhaseAt(0).id === 'kaart' && bootPhaseAt(0.999).final && !bootPhaseAt(0.999).klaar && bootPhaseAt(1).klaar, 'the last boot step is final; klaar only at 1');
ok(bootPhaseAt(-1).id === 'kaart' && bootPhaseAt(5).final, 'out-of-range progress is clamped');
ok(bootStepText(plans.nieuw.steps[4], plans.nieuw.total) === 'Stap 5 van 7', 'the step counter says which step of how many');
// a long step with nothing to report: the creep moves the bar but never into the last tenth of the step
{
  const sh = plans.nieuw.steps.find((st) => st.id === 'shaders');
  const cap = bootCreepCap(plans.nieuw, sh.from);
  ok(cap > sh.from && cap < sh.to - (sh.to - sh.from) * 0.05 && bootCreepCap(plans.nieuw, 1) === 1, 'the creep has room to move and stops short of the step end', cap);
}
// the measurement: durations per step from the reported moments, shares add up to 1
{
  const d = stepDurations([['kaart', 0, 1000], ['kaart', 0.5, 2000], ['wereld', 0, 4000], ['wereld', 1, 5000], ['buurt', 0, 6000]], 10000);
  ok(d.length === 3 && d[0].ms === 3000 && d[1].ms === 2000 && d[2].ms === 4000, 'stepDurations: first report to the first of the next step', JSON.stringify(d));
  ok(Math.abs(d.reduce((t, o) => t + o.aandeel, 0) - 1) < 1e-9 && stepDurations([], 5).length === 0, 'stepDurations: shares add up to 1; empty is empty');
}
// the load screen's steps get a counter too (#1010)
ok(loadStepNr(0).nr === 1 && loadStepNr(0.3).nr === 2 && loadStepNr(0.7).nr === 3 && loadStepNr(1).nr === 4 && loadStepNr(1).total === 4 && loadStepNr(0.5, 'snel').total === 1, 'the load screen counts its steps');
ok(LOAD_STEPS.reduce((t, st, i) => t + ((LOAD_STEPS[i + 1] ? LOAD_STEPS[i + 1].from : 1) - st.from), 0) === 1 && /Stap \$\{nr\.nr\} van \$\{nr\.total\}/.test(src), 'the load steps cover the bar and the screen shows "Stap n van m"');
// the boot screen shows the counter and the step ticks, in the screen-print style (tokens, no own colours)
{
  const ss = fs.readFileSync(new URL('../game/js/startscreen.js', import.meta.url), 'utf8');
  const hh = fs.readFileSync(new URL('../game/index.html', import.meta.url), 'utf8');
  ok(/class="ld-step"/.test(hh) && /#loading \.ld-tick \{[^}]*var\(--ds-c-ink-inkt\)/.test(hh) && /#loading \.ld-step \{[^}]*var\(--ds-c-ink-inkt\)/.test(hh), 'the boot screen has a step counter and ticks in ink');
  ok(/export function setBootStep\(/.test(ss) && /className = 'ld-tick'/.test(ss) && /aria-valuetext', stap \+ ': ' \+ phase\.label/.test(ss), 'the bar shows the ticks and tells the step to a screen reader');
  ok(!/setInterval\([^)]*requestAnimationFrame/.test(ss) && /bootCreepCap\(plan, progress\)/.test(ss), 'the creep is a slow approach inside the step, no loop animation');
}
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
// the load screen's steps in words (#1002): in order, every bar value has one, snel has its own
ok(loadStepAt(0).id === 'plek' && loadStepAt(0.3).id === 'gebouwen' && loadStepAt(0.7).id === 'tegels' && loadStepAt(1).id === 'bijna', 'load steps by bar');
ok(loadStepAt(NaN).id === 'plek' && loadStepAt(-3).id === 'plek' && loadStepAt(9).id === 'bijna', 'load step clamps');
ok(loadStepAt(0.5, 'snel').id === 'snel', 'snel has one step');
ok(LOAD_STEPS.every((s, i) => s.label.length > 8 && (i === 0 || s.from > LOAD_STEPS[i - 1].from)), 'load steps are words in ascending order');
console.log(`${n - fails}/${n} loadlogic`);
process.exit(fails ? 1 : 0);
