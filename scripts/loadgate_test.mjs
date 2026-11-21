// De laadpoort en de ene vloeiende balk (opdracht 21-11):  node scripts/loadgate_test.mjs
import fs from 'node:fs';
import { createGate, gateTick, gatePress, HANG_S, REMEMBER_MS } from '../game/js/loadgate.js';
import { easeBar, MAX_STEP_PER_FRAME, bootPlan, bootProgress } from '../game/js/loadlogic.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const tick = (g, o, now) => gateTick(g, { stap: 'Gebouwen en straten komen binnen', ...o }, now);

// geen prompt tijdens het laden, wel bij klaar
{
  const g = createGate();
  const a = tick(g, { elapsedS: 0.5 }, 0);
  ok(a.state === 'laadt' && !a.prompt && a.status === 'Laden…' && a.sub.length > 0, 'laden: geen prompt, wel status en stap');
  const b = tick(g, { elapsedS: HANG_S - 0.1 }, 100);
  ok(b.state === 'laadt' && !b.prompt, 'vlak voor de wachttijd nog steeds geen prompt');
  const c = tick(g, { done: true, elapsedS: 3 }, 200);
  ok(c.state === 'klaar' && c.prompt, 'klaar: de prompt staat er');
  ok(gatePress(g, 210).actie === 'door', 'klaar: Enter werkt direct');
  ok(gatePress(g, 215).actie === 'niets' && tick(g, { done: true }, 220).actie === 'niets', 'geen dubbele start');
}
// Enter tijdens het laden: geen dode toets
{
  const g = createGate();
  tick(g, { elapsedS: 1 }, 1000);
  const r = gatePress(g, 1100);
  ok(r.actie === 'onthoud' && /^Nog even: Gebouwen/.test(r.melding), 'Enter tijdens laden: melding "Nog even: <stap>"', r.melding);
  const v = tick(g, { done: true, elapsedS: 1.5 }, 1600);
  ok(v.actie === 'door', 'onthouden Enter wordt uitgevoerd zodra het klaar is');
  ok(tick(g, { done: true }, 1700).actie === 'niets' && gatePress(g, 1800).actie === 'niets', 'en maar één keer');
}
// een te oude Enter vervalt
{
  const g = createGate();
  tick(g, { elapsedS: 1 }, 0);
  gatePress(g, 0);
  tick(g, { elapsedS: 3 }, REMEMBER_MS + 50);
  const v = tick(g, { done: true }, REMEMBER_MS + 100);
  ok(v.actie === 'niets' && v.prompt, 'na de veiligheids-timeout van 1 s telt de oude Enter niet meer');
}
// timeout: reden en "Toch doorgaan"
{
  const g = createGate();
  const v = tick(g, { elapsedS: HANG_S + 1, stap: 'De tegels rond je worden gelegd' }, 0);
  ok(v.state === 'hangt' && v.prompt && v.promptTekst === 'Toch doorgaan' && /niet vastgelopen/.test(v.status) && /De tegels rond je worden gelegd/.test(v.sub), 'hangt: reden en Toch doorgaan');
  ok(gatePress(g, 5).actie === 'door', 'Toch doorgaan werkt direct');
}
// Samen spelen: de gast wacht op de host
{
  const g = createGate();
  const v = tick(g, { elapsedS: 20, wachtOp: 'Tammo' }, 0);
  ok(v.state === 'wacht-host' && !v.prompt && v.status === 'Wachten op Tammo', 'gast: Wachten op <naam>, geen prompt, ook na lange tijd');
  const r = gatePress(g, 10);
  ok(r.actie === 'onthoud' && r.melding === 'Wachten op Tammo', 'gast: Enter doet niets behalve de melding');
  ok(tick(g, { elapsedS: 21, wachtOp: '' }, 20).state === 'hangt', 'de host is er, het laden loopt nog: terug naar de gewone staten');
}
ok(tick(createGate(), null, 0).state === 'laadt' && tick(createGate(), { elapsedS: NaN }, 0).state === 'laadt', 'slechte invoer is veilig');

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
  const html = rd('../game/index.html'), ss = rd('../game/js/startscreen.js'), css = rd('../game/js/loadscreen.css'), ls = rd('../game/js/loadscreen.js');
  ok(!/ld-tick|buildTicks/.test(html + ss), 'bootbalk: geen tikken of segmenten');
  ok(!/ls-seg|ls-tick|ld-seg/.test(css + ls + html), 'laadbalk: geen segmenten');
  ok(/#load-screen \.ls-bar i \{[^}]*var\(--ds-c-ink-bord\)/.test(css) && /#loading \.ld-fill \{[^}]*var\(--ds-c-ink-bord\)/.test(html), 'bordgroene vulling');
  ok(/#load-screen \.ls-note \{[^}]*font: 400 16px/.test(css) && /#load-screen \.ls-step \{[^}]*19px/.test(css), 'tekst ruim boven de 13 px-vloer');
  ok(/keyTextHtml\('\{ENTER\}'\)/.test(ls) && !/>Verder \{ENTER\}/.test(ls), 'de prompt gebruikt het toetsplaatje, geen ruwe tekst');
  ok(!/skipReady/.test(ls), 'de prompt hangt niet meer aan een vaste 2,5 s maar aan de laadpoort');
  ok(/class="ls-skip" hidden/.test(ls) && /gv\.prompt/.test(ls), 'de prompt begint verborgen en volgt de poort');
}
console.log(`loadgate_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
