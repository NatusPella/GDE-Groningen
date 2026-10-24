// De actiebalk en de reiskeuze bij een klik op de kaart (#445): drie hoofdacties, haal weg bij een tweede klik,
// reizen als eigen uitgelegde stap, en wat een gast mag.
//   node scripts/kaartactie_test.mjs
import fs from 'node:fs';
import * as K from '../game/js/kaartactie.js';
import * as UI from '../game/js/kaartactieui.js';
import { travelOptions } from '../game/js/reiskeuze.js';
import { panelState } from '../game/js/reisview.js';
import { reisOpties } from '../game/js/ovopties.js';
import { HELP_TOPICS, helpPlain } from '../game/js/helpoverview.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL ' + name + (info ? ' :: ' + info : '')); } };

const speler = { x: 0, y: 0 };
const spot = { x: 3000, y: 400, name: 'Vismarkt' };
const opts = reisOpties({ auto: { length: 3200, etaS: 260 }, trein: { length: 3500, etaS: 420, legs: [{ kind: 'train', length: 3500, line: 'Lijn 1' }] } }, { money: 50 });

// 1. precies drie hoofdacties, met icoon en korte tekst
const m = K.actieModel({ spot, speler, waypoint: null, opts });
ok(m.acties.length === 3 && m.acties.map((a) => a.id).join() === 'waypoint,reis,info', 'drie hoofdacties: waypoint, reis, info', m.acties.map((a) => a.id));
ok(m.acties.every((a) => a.icoon && a.label && a.sub), 'elke actie heeft een icoon, een label en een korte tekst');
ok(m.acties[0].label === 'Zet waypoint' && m.acties[1].label === 'Reis erheen' && m.acties[2].label === 'Info', 'de labels');
ok(/€ \d+ · ± \d+ min/.test(m.acties[1].sub), 'Reis erheen toont kosten en duur', m.acties[1].sub);
const kaal = K.actieModel({ spot, speler, waypoint: null, opts: [] });
ok(/Zelf gaan · ± \d+ min/.test(kaal.acties[1].sub), 'zonder ov: Reis erheen zegt dat je zelf gaat, met de duur', kaal.acties[1].sub);

// 2. een waypoint dat er staat wordt Haal weg; er is er één tegelijk
const staat = K.actieModel({ spot, speler, waypoint: { x: 3010, y: 405 }, opts });
ok(staat.acties[0].id === 'haalweg' && staat.acties[0].label === 'Haal weg', 'tweede klik op het waypoint: Haal weg');
const ander = K.actieModel({ spot, speler, waypoint: { x: 100, y: 100 }, opts });
ok(ander.acties[0].id === 'waypoint' && /Vervangt/.test(ander.acties[0].sub), 'een ander waypoint wordt vervangen (één tegelijk)');
ok(K.opWaypoint({ x: 0, y: 0 }, { x: 10, y: 10 }) && !K.opWaypoint({ x: 0, y: 0 }, { x: 100, y: 0 }) && !K.opWaypoint(null, { x: 0, y: 0 }), 'opWaypoint: dichtbij telt');
ok(K.actieModel({ spot, speler, waypoint: null, opts, verhaal: true }).acties[0].id === 'story', 'het verhaaldoel: Volg het verhaal');

// 3. gast: waypoint kan, reizen niet (alleen in je eigen spel)
const gast = K.actieModel({ spot, speler, waypoint: null, opts, gast: true });
ok(gast.acties[0].id === 'waypoint' && !gast.acties[0].disabled, 'een gast kan een waypoint zetten');
ok(gast.acties[1].disabled && gast.acties[1].reden === K.GAST_REIS_MELDING && /eigen spel/.test(K.GAST_REIS_MELDING), 'een gast krijgt een duidelijke melding bij Reis erheen');
const gk = K.reisKeuzes(opts, 3200, { gast: true });
ok(gk.filter((r) => r.soort === 'snel').every((r) => r.disabled) && gk.find((r) => r.soort === 'zelf') && !gk.find((r) => r.soort === 'zelf').disabled, 'gast: snel reizen uit, zelf gaan aan');

// 4. de reiskeuze: een zin per keuze, kosten, duur en één aanbevolen
const keuzes = K.reisKeuzes(opts, 3200);
ok(keuzes.every((r) => r.uitleg && r.kosten && r.duur), 'elke keuze heeft een zin, kosten en duur');
ok(keuzes.filter((r) => r.aanbevolen).length === 1, 'precies één keuze is aanbevolen', keuzes.map((r) => r.id + r.aanbevolen));
ok(keuzes.at(-1).id === 'zelf' && keuzes.at(-1).kosten === 'gratis', 'Zelf gaan is er altijd en is gratis');
ok(K.reisKeuzes([], 500).find((r) => r.id === 'zelf').aanbevolen, 'zonder ov is Zelf gaan de aanbevolen keuze');
const html = UI.actiesHtml(m, null) + UI.reisHtml(keuzes, 'trein') + UI.infoHtml(K.infoRegels({ spot, afstand: 3000 })) + UI.uitlegHtml() + UI.hintHtml();
for (const id of ['waypoint', 'reis', 'info']) ok(html.includes(`data-card="${id}"`), `knop data-card=${id}`);
ok(html.includes('aanbevolen') && html.includes('data-card="zelf"') && html.includes('data-card="kies:trein"'), 'de reiskeuze: aanbevolen, Zelf gaan en Snel reizen klikbaar');
ok(html.includes('data-act="uitleg-sluit"') && html.includes('Besturing'), 'de uitleg is te sluiten en zegt waar je hem terugvindt');
ok(/<kbd>ENTER<\/kbd>/.test(html) && /<kbd>DELETE<\/kbd>/.test(html), 'de hints gebruiken toetsen die voor een controller worden omgezet');

// 5. het keuzevenster bij een verhaalrit: Snel reizen, Zelf gaan, Overslaan, uitgelegd en met aanbevolen
const beat = { to: 'Zoutkamp', length: 9000, ride: 'bus', lines: ['Het ritje.'] };
const t = travelOptions(beat);
ok(t.options[0].label.startsWith('Snel reizen') && t.options[1].label === 'Zelf gaan' && t.options[2].label === 'Overslaan', 'de keuzes heten Snel reizen, Zelf gaan en Overslaan', t.options.map((o) => o.label));
ok(t.options.every((o) => o.uitleg && o.kosten), 'elke keuze heeft een uitleg en kosten');
const ps = panelState(beat);
ok(ps.options.every((o) => o.note) && ps.options.filter((o) => o.badge === 'aanbevolen').length === 1, 'het venster toont een zin per keuze en één aanbevolen keuze');
ok(ps.options.every((o) => /min|direct/.test(o.label)), 'het venster toont de duur');

// 6. de uitleg is terug te vinden bij Besturing > Hulp
ok(HELP_TOPICS.some((x) => x.id === 'kaart') && /Haal weg/.test(helpPlain()) && /passagier/.test(helpPlain()), 'Hulp: een onderwerp over de kaart, het waypoint en het station');

// 7. bronchecks: het station, de kaart en de opslag
const read = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const st = read('game/js/stationtravel.js');
ok(st.includes("'Als passagier meegaan'") && st.includes("'Zelf de trein besturen'") && !st.includes("title: 'Vertrekken'") && !st.includes("title: 'Als passagier meerijden'"), 'station: Zelf de trein besturen of Als passagier meegaan, geen vertrekken of meerijden');
const mv = read('game/js/mapview.js');
ok(mv.includes("act === 'reis' || act === 'info'") && mv.includes("act === 'haalweg'") && mv.includes("name: name || 'Plek op de kaart'"), 'kaart: een klik op een plek opent de actiebalk (geen direct waypoint)');
ok(mv.includes('GAST_REIS_MELDING') && mv.includes('ALLEEN_EIGEN_SPEL'), 'kaart: een gast krijgt een melding bij reizen');
ok(mv.includes('data-card="close"') && mv.includes("act === 'goal'") && mv.includes("act === 'clear'"), 'kaart: de data-card-namen blijven');
ok(read('game/js/storagekeys.js').includes("hudSeen: 'gde-hud-gezien'"), 'opslagsleutel gde-hud-gezien blijft (de uitleg onthoudt zijn eerste keer daar)');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
