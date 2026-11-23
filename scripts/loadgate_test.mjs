// De laadpoort en de ene vloeiende balk (opdracht 21-11, automatisch door):  node scripts/loadgate_test.mjs
import fs from 'node:fs';
import { createGate, gateTick, fadeMs, statusLine, wachtOpGastheer, HANG_S, FADE_MS, HOST_MAX_S } from '../game/js/loadgate.js';
import { easeBar, MAX_STEP_PER_FRAME, bootPlan, bootProgress } from '../game/js/loadlogic.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const tick = (g, o) => gateTick(g, { stap: 'Gebouwen en straten komen binnen', ...o });

// tijdens het laden: de echte stap als statusregel, geen prompt, geen actie
{
  const g = createGate();
  const a = tick(g, { elapsedS: 0.5 });
  ok(a.state === 'laadt' && a.actie === 'niets' && a.status === 'Gebouwen en straten komen binnen', 'laden: de statusregel is de echte stap', a.status);
  const b = tick(g, { elapsedS: HANG_S - 0.1 });
  ok(b.state === 'laadt' && b.actie === 'niets', 'vlak voor de wachttijd nog gewoon laden');
  ok(!('prompt' in a) && !('promptTekst' in a), 'er is geen prompt in de poort');
}
// klaar: het scherm gaat zelf door, precies één keer
{
  const g = createGate();
  tick(g, { elapsedS: 1 });
  const c = tick(g, { done: true, elapsedS: 3 });
  ok(c.state === 'klaar' && c.actie === 'door', 'klaar: automatisch door, zonder toets');
  ok(tick(g, { done: true }).actie === 'niets' && tick(g, { done: true }).actie === 'niets', 'en maar één keer');
  ok(tick(createGate(), { done: true, elapsedS: 0 }).actie === 'door', 'ook als het laden direct klaar is');
}
// een lange stap: eerlijke reden, géén dwang en géén knop; klaar sluit alsnog zelf
{
  const g = createGate();
  const v = tick(g, { elapsedS: HANG_S + 1, stap: 'De tegels rond je worden gelegd' });
  ok(v.state === 'hangt' && v.actie === 'niets' && /niet vastgelopen/.test(v.status) && /De tegels rond je worden gelegd/.test(v.status), 'hangt: reden en stap in de statusregel');
  ok(tick(g, { done: true, elapsedS: HANG_S + 2 }).actie === 'door', 'na een lange wacht sluit klaar het scherm alsnog zelf');
}
// Samen spelen: de gast wacht op de gastheer
{
  const g = createGate();
  const v = tick(g, { elapsedS: 20, wachtOp: 'Tammo' });
  ok(v.state === 'wacht-host' && v.actie === 'niets' && v.status === 'Wachten op Tammo', 'gast: Wachten op <naam>, ook na lange tijd');
  ok(tick(g, { elapsedS: 21, wachtOp: '' }).state === 'hangt', 'de gastheer is er, het laden loopt nog: terug naar de gewone staten');
}
// #1292: de noodrem van het eigen laden (done na MAX_S) sluit het scherm niet zolang de gast op de gastheer wacht
{
  const g = createGate();
  const v = tick(g, { done: true, elapsedS: 13, wachtOp: 'Tammo' });
  ok(v.state === 'wacht-host' && v.actie === 'niets', 'gast: klaar of noodrem sluit niet zolang de gastheer er niet is');
  ok(tick(g, { done: true, elapsedS: 14, wachtOp: '' }).actie === 'door', 'de eerste wereldstand is er: het scherm gaat door');
  ok(tick(createGate(), { done: true, elapsedS: HOST_MAX_S, wachtOp: 'Tammo' }).actie === 'door', 'na de ruime grens gaat het scherm toch door');
  ok(tick(createGate(), { done: true, elapsedS: NaN, wachtOp: 'Tammo' }).actie === 'door', 'een kapotte tijd houdt het scherm niet vast');
}
// #1002: de bedrading: alleen een gast zonder eerste wereldstand wacht op de gastheer
ok(wachtOpGastheer({ role: 'client', joined: false }, () => 'Tammo') === 'Tammo', 'een gast zonder wereldstand wacht op de gastheer');
ok(wachtOpGastheer({ role: 'client', joined: false }, () => '') === 'wie het spel opende', 'zonder naam staat er "wie het spel opende"');
ok(wachtOpGastheer({ role: 'client', joined: true }, () => 'Tammo') === '' && wachtOpGastheer({ role: 'host' }, () => 'x') === '' && wachtOpGastheer(null, () => 'x') === '', 'binnen, host of solo: wacht op niemand');
ok(/wachtOpGastheer\(world\.coopNet/.test(fs.readFileSync(new URL('../game/js/loadscreen.js', import.meta.url), 'utf8')), 'loadscreen.js geeft de gastheer door aan de poort');
ok(tick(createGate(), null).state === 'laadt' && tick(createGate(), { elapsedS: NaN }).state === 'laadt', 'slechte invoer is veilig');
ok(statusLine('laadt', '') === 'Het spel wordt geladen' && statusLine('klaar', 'x') === 'Klaar', 'statusLine: terugval en klaar');

// de fade: kort, bij reduced motion direct
ok(fadeMs(false) === FADE_MS && FADE_MS <= 400 && FADE_MS > 0 && fadeMs(true) === 0, 'fade: hooguit 400 ms, bij reduced motion direct');

// een vloeiende balk: gewogen, monotoon, nooit > 100 % en nooit een sprong
{
  let shown = 0, prev = 0, mono = true, max = true;
  for (const t of [0.1, 0.1, 0.5, 0.3, 0.9, 1, 1.4, 0.2, NaN]) for (let f = 0; f < 600; f++) {
    shown = easeBar(shown, t, 16.7);
    if (shown < prev || shown > 1) mono = false;
    if (shown - prev > MAX_STEP_PER_FRAME + 1e-9) max = false;
    prev = shown;
  }
  ok(mono && max && shown === 1, 'easeBar: nooit terug, nooit boven 1, hooguit 1% per frame, haalt het doel', shown);
  ok(easeBar(0.5, 0.5) === 0.5 && easeBar(0.7, 0.2) === 0.7 && easeBar(NaN, NaN) === 0, 'easeBar: stilstand en slechte invoer');
  ok(easeBar(0.5, 0.5001, 16.7) > 0.5, 'easeBar: een klein gat sluit ook (geen stilstand op 99 %)');
  let s = 0.99, k = 0;
  while (s < 1 && k < 5000) { s = easeBar(s, 1, 16.7); k++; }
  ok(s === 1 && k < 400, 'easeBar: de laatste procenten zijn rustig maar eindig', k);
}
for (const [naam, plan] of Object.entries({ nieuw: bootPlan(), opgeslagen: bootPlan({ film: false }), test: bootPlan({ warm: false }) })) {
  ok(plan.steps.every((st) => st.weight > 0) && Math.abs(plan.steps.reduce((t, st) => t + st.weight, 0) - 1) < 1e-9, 'gewichten tellen op tot 1: ' + naam);
  let prev = 0, mono = true;
  for (const st of plan.steps) for (let f = 0; f <= 10; f++) { const v = bootProgress(plan, st.id, f / 10); if (v < prev - 1e-12 || v > 1) mono = false; prev = v; }
  ok(mono, 'bootvoortgang is monotoon en nooit boven 1: ' + naam);
  const lengte = (st) => st.to - st.from;
  ok(plan.steps.every((a) => plan.steps.every((b) => a.weight <= b.weight || lengte(a) >= lengte(b) - 1e-12)), 'zwaardere stappen krijgen een groter stuk van de balk: ' + naam);
}

// de balk is één stuk, zonder segmenten, in zeefdruk
{
  const rd = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
  const html = rd('../game/index.html'), ss = rd('../game/js/startscreen.js'), css = rd('../game/js/loadscreen.css'), ls = rd('../game/js/loadscreen.js') + rd('../game/js/loadscene.js');
  ok(!/ld-tick|buildTicks/.test(html + ss), 'bootbalk: geen tikken of segmenten');
  ok(!/ls-seg|ls-tick|ld-seg/.test(css + ls + html), 'laadbalk: geen segmenten');
  ok(/#load-screen \.ls-bar i \{[^}]*var\(--ds-c-ink-bord\)/.test(css) && /#loading \.ld-fill \{[^}]*var\(--ds-c-ink-bord\)/.test(html), 'bordgroene vulling');
  ok(/#load-screen \.ls-step \{[^}]*font: 400 max\(13px, 1em\)/.test(css), 'de statusregel volgt de stage en blijft op de 13 px-vloer of erboven');
  ok(!/ls-skip|ls-note|keyTextHtml|gatePress|isSkipKey|keydown/.test(ls + css), 'laadscherm: geen Enter-prompt, geen toetsafhandeling meer');
  ok(!/bt-key/.test(html), 'bootscherm: geen leeg Enter-vak meer');
  ok(/fadeMs\(reduced\(\)\)/.test(ls) && /gv\.actie === 'door'/.test(ls), 'het scherm sluit op de actie van de poort, met de fade');
  // #1292: de laadhouder gaat pas na de fade los, niet aan het begin ervan
  const fin = ls.slice(ls.indexOf('const finish = () =>'), ls.indexOf('let tickGemeld'));
  ok(/setTimeout\(\(\) => \{ el\.remove\(\); release\(\); \}, ms\)/.test(fin) && fin.indexOf("setLoadHold(world, 'laadscherm', false)") > fin.indexOf('const release'), 'de pauze gaat er pas af als de fade klaar is');
  ok(/const release = \(\) => \{\s*if \(active\) return;/.test(fin), 'een nieuw laadscherm tijdens de fade houdt zijn pauze');
  ok(/ls-bar[\s\S]*ls-step/.test(ls.slice(ls.indexOf('class="ls-prog"'))), 'de statusregel staat onder de balk');
  ok(fs.existsSync(new URL('../game/js/loadskip.js', import.meta.url)) === false, 'loadskip.js (Verder-prompt) is weg');
}
console.log(`loadgate_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
