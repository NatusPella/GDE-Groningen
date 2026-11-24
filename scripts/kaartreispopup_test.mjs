// De reiskeuze op de grote kaart is een eigen popup (21-11, eigenaar: "kies je Reis erheen, dan een popup in plaats van die kaart nog groter te maken"):
// de plekkaart blijft even groot, het venster heeft zijn eigen focusval, Esc sluit terug naar de plekkaart, Enter bevestigt, en als reizen niet kan
// staat de reden er. De logica (reisKeuzes, kies:, rij, zelf) is dezelfde als eerst en wordt door kaartactie_test gedekt; hier de popup.
// De DOM-kant zit in mapview.js; echte beelden: node scripts/qa/gebieden_shots.mjs (Electron, door de coördinator).
//   node scripts/kaartreispopup_test.mjs
import fs from 'node:fs';
import * as K from '../game/js/kaartactie.js';
import { reisPopupHtml, actiesHtml, reisHtml } from '../game/js/kaartactieui.js';
import { reisOpties } from '../game/js/ovopties.js';

let n = 0, fails = 0;
const ok = (c, m, i = '') => { n++; if (!c) { fails++; console.log('FAIL', m, i); } };
const src = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const mv = src('game/js/mapview.js');
const ui = src('game/js/kaartactieui.js');
const pm = src('game/js/pausemenu.js');

const speler = { x: 0, y: 0 };
const spot = { x: 3000, y: 400, name: 'Vismarkt' };
const opts = reisOpties({ auto: { length: 3200, etaS: 260 }, trein: { length: 3500, etaS: 420, legs: [{ kind: 'train', length: 3500, line: 'Lijn 1' }] } }, { money: 50 });
const rijen = K.reisKeuzes(opts, 3200, {});
const gekozen = rijen.find((r) => r.aanbevolen).id;
const basis = { naam: 'Vismarkt', afstand: '3,2 km', rijen, gekozen, kleur: {}, gast: false, melding: '', reis: { label: 'Reis nu · € 12 · 4 min', uitgeschakeld: false } };

// 1. de popup: dialoog met naam, titel in DS-stijl, de keuzes, Reis nu met Enter ernaast, Terug met Esc ernaast
const h = reisPopupHtml(basis);
ok(/role="dialog" aria-modal="true" aria-labelledby="mv-reispop-t"/.test(h) && /id="mv-reispop-t"/.test(h), 'de popup is een dialoog met een naam');
ok(/ds-zeef ds-z-kaart ds-z-kaart--recht mv-reispop-box/.test(h) && /ds-z-kaart__kop/.test(h) && /ds-z-kaart__titel">Reis erheen</.test(h), 'de popup is een .ds-z-kaart met de titel Reis erheen');
ok((h.match(/class="mv-keuze/g) || []).length === rijen.length && /data-card="kies:/.test(h) && !/data-card="zelf"/.test(h), 'elke vervoerswijze staat in de popup, Zelf gaan niet (21-11)');
ok(rijen.length === 4 && ['trein', 'bus', 'taxi', 'boot'].every((id) => h.includes(`data-card="kies:${id}"`)), 'trein, bus, taxi en boot staan er, ook als er geen route is (dan met de reden)');
ok(/mv-aanb/.test(h) && /gratis|€/.test(h), 'de aanbeveling, de kosten en de duur staan erbij');
ok(/<button[^>]*class="ds-z-knop mv-reispop-ok ds-z-knop--toets"[^>]*data-card="rij"[^>]*data-key="ENTER"[^>]*><span class="ds-z-knop__label">Reis nu · € 12 · 4 min<\/span><span class="ds-z-knop__toets"/.test(h), 'Reis nu bevestigt, met de Enter-toets IN de knop');
ok(/data-card="reis-sluit"[^>]*data-key="ESC"[^>]*><span class="ds-z-knop__label">Terug<\/span><span class="ds-z-knop__toets"/.test(h), 'Terug sluit, met de Esc-toets IN de knop');
ok(!/mv-help-toets|ds-toetsregel/.test(h), 'geen losse toetshint naast een knop in de popup');
ok(/Vismarkt<\/b> · 3,2 km/.test(h), 'de plek en de afstand staan bovenaan');

// 2. reizen kan niet: een duidelijke reden, en geen knop die Enter kan afvuren
const gast = reisPopupHtml({ ...basis, gast: true, melding: K.GAST_REIS_MELDING, reis: null });
ok(gast.includes(K.GAST_REIS_MELDING) && /role="status"/.test(gast) && !/data-card="rij"/.test(gast) && /data-card="reis-sluit"/.test(gast), 'een gast leest waarom snel reizen niet kan, kan alleen Zelf gaan of terug');
const arm = reisPopupHtml({ ...basis, melding: 'Je hebt te weinig geld voor deze rit.', reis: { label: 'Reis nu · € 400 · 4 min', uitgeschakeld: true } });
ok(/mv-reispop-ok[^>]*data-card="rij" disabled/.test(arm) && /te weinig geld/.test(arm) && !/mv-reispop-ok[^>]*data-key/.test(arm), 'te weinig geld: Reis nu is uit, de reden staat er en er is geen Enter-toets in de knop');
const kaal = reisPopupHtml({ ...basis, rijen: K.reisKeuzes([], 3200, {}), gekozen: null, melding: 'Er gaat geen vervoer naar deze plek. Zet een routepunt om er zelf heen te gaan.', reis: null });
ok(!/data-card="zelf"/.test(kaal) && /geen vervoer/.test(kaal) && /Geen treinverbinding hierheen/.test(kaal) && !/data-card="rij"/.test(kaal), 'geen verbinding: elke rij zegt waarom, de melding wijst naar Zet routepunt');

// 3. de plekkaart verandert niet van grootte: de reiskeuze staat niet meer in de kaart
ok(!/reisHtml/.test(mv.split('\n').filter((l) => /^import/.test(l)).join('\n')), 'mapview.js haalt reisHtml niet meer binnen: de plekkaart bouwt de keuze niet');
const kaart = mv.slice(mv.indexOf('function showCard('), mv.indexOf('function syncReisPopup('));
ok(!/reisHtml\(|class="mapview-btn" data-card="rij"/.test(kaart) && /popup = \{ naam/.test(kaart) && /syncReisPopup\(popup\)/.test(kaart), 'showCard zet de reiskeuze in de popup en niet in de kaart');
const acties = actiesHtml(K.actieModel({ spot, speler, waypoint: null, opts }), 'reis');
ok(/data-card="reis"[^>]*aria-haspopup="dialog"/.test(acties) && !/aria-expanded="true"[^>]*>\s*<svg[^>]*><use[^>]*#.*reis/.test(acties), 'Reis erheen meldt aan de schermlezer dat hij een venster opent (geen uitklapper meer)');
ok(/c\.stap = act === 'reis' \? 'reis'/.test(mv), 'Reis erheen opent de popup (Info klapt nog wel uit)');
ok(reisHtml(rijen, gekozen).includes('mv-reiskeuze'), 'de rijen zelf (reisHtml) zijn ongewijzigd: dezelfde logica, een nieuwe plek');

// 4. focus, Esc, Enter, klik ernaast
ok(/function syncReisPopup\(popup\)/.test(mv) && /wens\.focus\(\{ preventScroll: true \}\)/.test(mv) && /mv-reispop-ok:not\(:disabled\)/.test(mv), 'bij het openen krijgt Reis nu de focus (anders de gekozen keuze, anders Terug)');
ok(/fc && \[\.\.\.pop\.querySelectorAll\('\[data-card\]'\)\]/.test(mv), 'bij een andere keuze blijft de focus op dezelfde knop');
ok(/export function kaartReisPopupSluiten\(\)/.test(mv) && /state\.card\.stap = null/.test(mv) && /\[data-card="reis"\]/.test(mv), 'Esc sluit terug naar de plekkaart en zet de focus terug op Reis erheen');
ok(/kaartUitlegSluiten\(\) \|\| kaartReisPopupSluiten\(\) \|\| kaartPlekkaartSluiten\(\)/.test(pm), 'pausemenu.js goBack (Esc en B) sluit eerst de uitleg, dan de popup, dan de plekkaart, dan pas de kaart');
ok(/e\.key === 'Enter' \|\| e\.key === ' '\) && !e\.repeat/.test(mv) && /op\.closest\('\.mv-keuze'\)/.test(mv) && /mv-reispop-ok:not\(:disabled\)/.test(mv), 'Enter bevestigt (op een rij kiest hij die rij en springt de focus naar Reis nu)');
ok(/e\.key === 'Tab' && knoppen\.length/.test(mv) && /lijstFocus\(knoppen, e, true\)/.test(mv), 'de focus blijft binnen het venster (Tab en Shift+Tab lopen rond)');
ok(/ArrowDown' \|\| e\.key === 'ArrowUp' \|\| e\.key === 'Home'/.test(mv) && /navIndex\(/.test(mv), 'pijl omhoog en omlaag, Home en End lopen door alle knoppen (rijen en voetknoppen, ook voor een controller)');
ok(/rijCijfer\(e\.key\)/.test(mv) && /\.mv-keuze\[data-key=/.test(mv), 'de cijfers 1 tot 9 kiezen een rij');
ok(/if \(e\.target === pop\) \{ kaartReisPopupSluiten\(\)/.test(mv), 'een klik naast het venster is Terug');
ok(/querySelector\('\.mv-reispop, \.mv-help'\)\) return;/.test(mv), 'de pijltjes schuiven de kaart niet terwijl een popup openstaat');
ok(/if \(kaartToets\(e\)\) return;/.test(mv) && mv.indexOf('if (kaartToets(e)) return;') < mv.indexOf('Enter on the map itself'), 'de popup krijgt de toets vóór de Enter-onder-het-richtkruis-regel');
ok(/if \(tab === 'map' && kaartToets\(e\)\) return;/.test(pm) && pm.indexOf("kaartToets(e)) return;") < pm.indexOf('const dir = ARROWS[k];'), 'pausemenu.js geeft de kaartvensters de toets vóór de menutoetsen (Tab en Q/E wisselen het menu niet onder een open venster)');
ok(/closeMap\(\) \{[\s\S]{0,200}hideCard\(\)/.test(mv), 'sluiten van de kaart ruimt de popup op (hideCard)');
ok(/function hideCard\(\) \{[\s\S]{0,200}syncReisPopup\(null\)/.test(mv), 'hideCard haalt de popup weg');

// 5. DS3: .ds-z-kaart, 15 px, keycap-systeem (geen eigen toetsmaten), rustige binnenkomst
const css = ui.slice(ui.indexOf('/* de uitleg en de reispopup'));
ok(/mv-reispop-box \{ width: min\(520px, 100%\)/.test(css), 'de popup is 520 px breed, de plekkaart niet breder dan ze was');
ok(/mv-reispop \.mv-keuze \{ min-height: var\(--ds-doel-aanraken\)/.test(css), 'elke keuze is een aanraakdoel (44 px)');
ok(!/mv-reispop[^{]*hud-key[^{]*\{/.test(css), 'geen eigen toetsmaten in de popup: het keycap-systeem bepaalt');
ok(/html\.rustig-drukwerk :is\(\.mapview-overlay, \.reis-hud\) :is\(\.mv-help, \.mv-reispop/.test(css), 'Rustig drukwerk en Beweging beperken zetten de binnenkomst uit');

// #1215: een rij zonder icoonnaam krijgt het icoon van haar vervoerswijze (geen vraagteken), een kaal getal als kosten is een bedrag en
// label, kosten en duur plakken in de leestekst niet aan elkaar ("Trein 12", niet "Trein12")
{
  const kaal = reisHtml([{ id: 'trein', label: 'Trein', kosten: 12, duur: '6 min', toets: '1' }, { id: 'bus', label: 'Bus', kosten: 4, duur: '14 min', toets: '2' }], 'trein');
  const vraag = reisHtml([{ id: 'trein', icoon: 'bestaatniet', label: 'Trein', kosten: '', duur: '' }], null);
  ok((kaal.match(/<svg/g) || []).length === 2 && kaal.match(/<svg[^>]*>(.*?)<\/svg>/g)[0] !== vraag.match(/<svg[^>]*>(.*?)<\/svg>/g)[0], 'elke rij heeft zonder icoonnaam het icoon van zijn vervoerswijze, niet het vraagteken');
  ok(kaal.includes('€ 12') && kaal.includes('€ 4'), 'een getal als kosten staat als bedrag');
  ok(/<\/span> <i class="mv-aanb">/.test(reisHtml([{ id: 'trein', label: 'Trein', aanbevolen: true, kosten: '€ 12', duur: '6 min' }], 'trein')) && /<\/span> <span class="mv-kd">/.test(kaal), 'spaties tussen label, aanbeveling en feiten');
  ok(!/gratis|NaN|undefined/.test(reisHtml([{ id: 'boot', label: 'Boot', kosten: 0, duur: '', toets: '4' }], null)), 'een rij zonder gegevens toont geen rommel');
}

console.log(fails ? `kaartreispopup_test: ${fails} van ${n} mislukt` : `kaartreispopup_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
