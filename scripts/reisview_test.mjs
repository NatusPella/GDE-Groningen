// Travel beat views (game/js/reisview.js, #97):  node scripts/reisview_test.mjs
import * as V from '../game/js/reisview.js';
import * as B from '../game/js/hudbus.js';
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const beat = { to: 'Zoutkamp', length: 30000, ride: 'bus', lines: ['Klaas wacht.'] };

ok(V.briefingLine(beat) === 'Naar Zoutkamp · 30 km · ± 23 min met de auto · ± 36 min met de bus', V.briefingLine(beat));
ok(!/bus|trein/.test(V.briefingLine({ to: 'Winsum', length: 4500 })), 'no ride in line without ride');
ok(V.briefingLine({ to: 'Dichtbij', length: 800 }).includes('0,8 km'), 'short in km with comma');
const st = V.panelState(beat);
ok(st.options.length === 3 && st.options[0].key === '1' && st.options[0].cls === 'pick', 'default highlighted');
ok(V.panelState(beat, 'zelf').options[1].cls === 'pick', 'pick moves');
ok(V.panelState({ ...beat, lines: null }).options.length === 2, 'no skip without lines');
ok(V.pickFromKey(beat, '3') === 'overslaan' && V.pickFromKey({ ...beat, lines: null }, '3') === null && V.pickFromKey(beat, '9') === null, 'keys');
// every option's key (what a tap on its row sends, reispanel.js) picks that option
ok(st.options.every((o, i) => V.pickFromKey(beat, o.key) === ['meerijden', 'zelf', 'overslaan'][i]), 'tap keys pick their option');
ok(V.hudLine(0) === '' && V.hudLine(1500) === '1,5 km · ± 1 min', 'hud line', V.hudLine(1500));
ok(V.shouldPrompt(8000) && !V.shouldPrompt(2000), 'prompt only on a jump');
ok(V.arrivalMessage(beat).kind === 'reis' && B.KINDS.reis.p === B.P1, 'reis is a P1 story kind');
ok(V.cyclePick(beat, 'meerijden', 1) === 'zelf' && V.cyclePick(beat, 'meerijden', -1) !== 'meerijden', 'gamepad cycles the pick');
// #1214: nooit "NaN km", geen "gratis" bij elke optie, de winst alleen bij zelf gaan en alleen als die er is
for (const lengte of [undefined, NaN, null, 'x', 0, -5]) {
  const p = V.panelState({ to: 'Zoutkamp', length: lengte, lines: ['a'] });
  const tekst = JSON.stringify(p);
  ok(!/NaN|undefined|null|Infinity/.test(tekst) && p.rule === '', 'geen NaN of lege afstand in het keuzepaneel', String(lengte));
  ok(!/€ 0/.test(tekst), 'geen "€ 0"-winst', String(lengte));
}
ok(st.options.every((o) => !/gratis/i.test(o.label)), 'geen "gratis" in de optieregels');
ok(/\+ € \d+/.test(st.options[1].label) && !/€/.test(st.options[0].label) && !/€/.test(st.options[2].label), 'alleen zelf gaan toont de winst');
ok(st.rule === '30 km', 'de afstand staat een keer in het paneel', st.rule);
// #1214: geen NaN km, geen 'gratis', geen € 0, een getal per keuze
const kaal = V.panelState({ to: 'Zoutkamp', ride: 'bus', lines: ['x'] });
const tekst = JSON.stringify(kaal) + V.briefingLine({ to: 'Zoutkamp' });
ok(!/NaN|gratis|€ 0|undefined/.test(tekst) && kaal.rule === '', 'zonder afstand geen NaN, gratis of € 0', tekst);
ok(!/gratis|€ 0/.test(JSON.stringify(st)) && /\+ € 120/.test(st.options[1].label), 'met afstand: verdienste bij zelf gaan, nooit gratis', st.options[1].label);
// toetsenbord gelijk aan het pad: Tab verplaatst de markering, cijfers kiezen, Enter bevestigt de markering
ok(V.keyAction(beat, 'meerijden', 'Tab').markeer === 'zelf' && V.keyAction(beat, 'meerijden', 'Tab', true).markeer === 'overslaan', 'Tab moves the pick');
ok(['ArrowUp', 'ArrowDown', 'w', 's', 'a', 'd'].every((k) => V.keyAction(beat, 'zelf', k) === null), 'movement and steering keys stay with the game');
ok(V.keyAction(beat, 'zelf', 'Enter').kies === 'zelf' && V.keyAction(beat, 'zelf', '3').kies === 'overslaan', 'enter confirms the pick, digits choose');
ok(V.keyAction(beat, 'zelf', 'Escape').sluit === true && V.keyAction(beat, 'zelf', 'x') === null && V.keyAction({ ...beat, lines: null }, 'zelf', '3') === null, 'escape closes, rest is not ours');
// #1216 (hertest 24-11): de reisvraag is dezelfde reiskaart als Reis erheen op de grote kaart
{
  const { reisKaartHtml, reisPopupHtml } = await import('../game/js/kaartactieui.js');
  const fs = await import('node:fs');
  const m = V.reisKaartModel({ ...beat, to: 'Zoutkamp', length: 30000, ride: 'trein' }, 'zelf', {});
  ok(m.titel === 'Naar Zoutkamp' && m.afstand === '30 km' && m.gekozen === 'zelf' && m.hud === true, 'model: titel, afstand, keuze', JSON.stringify(m).slice(0, 200));
  ok(m.rijen.map((r) => r.toets).join('') === '123' && m.rijen[0].icoon === 'trein' && m.rijen.every((r) => r.icoon), 'elke rij heeft een icoon en zijn cijfertoets');
  ok(/\+ € 120/.test(m.rijen[1].kosten) && !m.rijen[0].kosten && !/NaN|gratis|undefined/.test(JSON.stringify(m)), 'alleen zelf gaan toont de winst, nooit gratis of NaN');
  const h = reisKaartHtml(m);
  const kaart = reisPopupHtml({ naam: 'Vismarkt', afstand: '3,2 km', rijen: [], gekozen: null, reis: { label: 'Reis nu' } });
  const klassen = (x) => ['ds-z-kaart ds-z-kaart--recht mv-reispop-box', 'ds-z-kaart__titel', 'mv-help-foot', 'mv-reispop-ok'].every((c) => x.includes(c));
  ok(klassen(h) && klassen(kaart), 'reisvraag en kaartpopup delen kop, kaart en knop (één component)');
  ok((h.match(/class="mv-keuze/g) || []).length === 3 && /data-card="kies:zelf"[^>]*data-key="2"/.test(h) && /mv-keuze sel"[^>]*data-card="kies:zelf"/.test(h), 'de rijen zijn de rijen van de kaartpopup, met de markering op de keuze');
  ok(/mv-reispop--hud/.test(h) && !/aria-modal/.test(h) && !/data-card="reis-sluit"/.test(h), 'in het spel niet modaal en zonder Terug (Esc neemt de standaard)');
  const zonder = V.reisKaartModel({ to: 'Zoutkamp', ride: 'bus', lines: ['x'] }, null, {});
  ok(zonder.afstand === '' && !/NaN|undefined/.test(reisKaartHtml(zonder)), 'zonder afstand geen NaN in de kaart');
  const rp = fs.readFileSync(new URL('../game/js/reispanel.js', import.meta.url), 'utf8');
  ok(/reisKaartHtml/.test(rp) && !/createChoicePanel/.test(rp), 'reispanel.js tekent de reiskaart, niet meer het keuzepaneel');
}
console.log(`${n - fails}/${n} reisview`);
process.exit(fails ? 1 : 0);
