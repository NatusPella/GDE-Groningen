// De kaartpopups (21-11, docs/KAART-POPUPS-21-11.md): Reis erheen gaat over HOE je reist (geen Zelf gaan), de toets staat IN de knop, en één
// navigatiepatroon voor toetsenbord en controller. Pure logica en markup, geen browser:
//   - de vervoersopties per situatie (aanbevolen, beschikbaarheid, reden, gast, uitbreidbaar)
//   - de glyph in de knop per invoerapparaat (toetsenbord, Xbox, PlayStation, Steam Deck, Switch, aanraking)
//   - de focusvolgorde (navIndex) en de toetsafspraken (A is Enter, B is Esc)
//   node scripts/kaartpopups_test.mjs
import fs from 'node:fs';
import * as K from '../game/js/kaartactie.js';
import { reisOpties, OV_MIN_M } from '../game/js/ovopties.js';
import { dsButtonKey, knopToets, buttonsWithoutGlyph, looseHintBesideButton, KNOP_TOETSEN, shortcutName } from '../game/js/dsbutton.js';
import { navIndex, PAGE_SWITCH_KEYS, rijCijfer } from '../game/js/listnav.js';
import { actiesHtml, reisHtml, reisPopupHtml, sluitHtml } from '../game/js/kaartactieui.js';
import { padSlotFor, PAD_MAPS } from '../game/js/controls.js';
import { padGlyphInner } from '../game/js/glyphs.js';

let n = 0, fails = 0;
const ok = (c, m, i = '') => { n++; if (!c) { fails++; console.log('FAIL', m, i); } };
const src = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const trein = { length: 3500, etaS: 420, legs: [{ kind: 'train', length: 3500, line: 'Lijn 1' }] };

// 1. de opties per situatie
const ver = reisOpties({ auto: { length: 3200, etaS: 260 }, trein, bus: { length: 3400, etaS: 600, lines: [{ name: 'Lijn 12', kind: 'bus' }], changes: ['X'] }, taxi: { length: 3200, etaS: 400 }, boot: { length: 3000, etaS: 700 } }, { money: 100, directM: 3200, hemelsM: 2560 });
const rv = K.reisKeuzes(ver, 2560);
ok(rv.length === 4 && rv.every((r) => r.beschikbaar && !r.disabled), 'ver weg met geld: alle vier de vervoerswijzen kunnen');
ok(rv.filter((r) => r.aanbevolen).length === 1 && rv[0].aanbevolen, 'precies één aanbevolen en die staat bovenaan');
ok(rv.map((r) => r.toets).join('') === '1234', 'de rijen krijgen de cijfertoetsen 1 tot 4 in de volgorde waarin ze staan');
ok(rv.every((r) => r.icoon && r.label && r.uitleg && r.kosten && r.duur), 'elke rij: icoon, naam, zin, prijs en duur');
ok(/Lijn 12/.test(rv.find((r) => r.id === 'bus').uitleg) && /1 overstap/.test(rv.find((r) => r.id === 'bus').uitleg), 'de buszin noemt de lijn en de overstap');
const dichtbij = reisOpties({ taxi: { length: 300, etaS: 140 } }, { money: 100, directM: 300, hemelsM: 240 });
const rd = K.reisKeuzes(dichtbij, 240);
ok(rd.every((r) => !r.beschikbaar && r.disabled) && rd.every((r) => /Te dichtbij/.test(r.disabled)), 'vlakbij: niets kan, elke rij zegt "Te dichtbij: loop of rij zelf"', rd.map((r) => r.disabled));
ok(K.geenRoute('trein', OV_MIN_M - 1) === 'Te dichtbij: loop of rij zelf' && /treinverbinding/.test(K.geenRoute('trein', OV_MIN_M + 1)) && /buslijn/.test(K.geenRoute('bus', OV_MIN_M + 1)) && /vaarroute/.test(K.geenRoute('boot', OV_MIN_M + 1)), 'de reden zonder route: te dichtbij, geen trein, geen bus, geen boot');
const arm = reisOpties({ auto: { length: 3200, etaS: 260 }, trein, taxi: { length: 3200, etaS: 400 } }, { money: 2, directM: 3200, hemelsM: 2560 });
const ra = K.reisKeuzes(arm, 2560);
ok(ra.every((r) => !r.beschikbaar) && ra.filter((r) => !r.geenRoute).every((r) => /te weinig/i.test(r.disabled)), 'te weinig geld: de rijen met een route zijn uit met "te weinig", de rest zegt "geen route"', ra.map((r) => r.id + ':' + r.disabled));
ok(ra.findIndex((r) => r.geenRoute) > ra.findLastIndex((r) => !r.geenRoute), 'wat te duur is staat boven wat er niet is');
const actie = K.actieModel({ spot: { x: 3000, y: 0 }, speler: { x: 0, y: 0 }, waypoint: null, opts: arm });
ok(/te weinig/i.test(actie.acties[1].sub), 'de plekkaart zegt bij Reis erheen waarom reizen nu niet kan', actie.acties[1].sub);
const rastGast = K.reisKeuzes(ver, 2560, { gast: true });
ok(rastGast.every((r) => r.disabled === K.GAST_REIS_KORT && !r.aanbevolen && !r.beschikbaar), 'gast: dezelfde vier rijen, uitgeschakeld met de reden, niets aanbevolen');
ok(K.actieModel({ spot: { x: 3000, y: 0 }, speler: { x: 0, y: 0 }, waypoint: null, opts: ver, gast: true }).acties[1].sub === K.GAST_REIS_KORT, 'gast: de plekkaart zegt "Alleen in je eigen spel"');
// uitbreidbaar: Bezit en later (vlucht, eigen voertuig, fiets) staan klaar maar zijn nog geen rij
ok(K.REIS_MODI.filter((m) => m.status === 'gepland').map((m) => m.id).join() === 'vlucht,eigen,fiets', 'gepland: vlucht, eigen voertuig en fiets staan klaar in REIS_MODI');
ok(rv.every((r) => K.REIS_MODI.find((m) => m.id === r.id).status === 'actief'), 'een gepland vervoer komt nooit in de lijst');
ok(!rv.some((r) => r.id === 'zelf' || r.id === 'auto') && !/zelf/i.test(rv.map((r) => r.label).join()), 'geen Zelf gaan en geen Zelf rijden als reisoptie');
ok(K.ACTIE_TOETSEN.waypoint === '1' && K.ACTIE_TOETSEN.reis === '2' && K.ACTIE_TOETSEN.info === '3' && K.ACTIE_TOETSEN.haalweg === '1' && K.ACTIE_TOETSEN.story === '1', 'de plekkaart: 1 waypoint (ook Haal weg en Volg het verhaal), 2 Reis erheen, 3 Info');

// 2. de toets staat in de knop, niet ernaast (plekkaart, reispopup, uitleg)
const kaart = actiesHtml(K.actieModel({ spot: { x: 3000, y: 0 }, speler: { x: 0, y: 0 }, waypoint: null, opts: ver }), null) + sluitHtml();
ok(['1', '2', '3'].every((c) => new RegExp(`class="mv-actie[^"]*"[^>]*data-key="${c}"[^>]*>[\\s\\S]*?ds-z-knop__toets--rechts[\\s\\S]*?data-gk="${c}"`).test(kaart)), 'plekkaart: elke actie heeft zijn cijfer als glyph IN de knop, rechts');
ok(/data-card="close"[^>]*data-key="ESC"[^>]*><span class="ds-z-knop__label">Sluiten<\/span><span class="ds-z-knop__toets"/.test(kaart), 'plekkaart: Sluiten heeft Esc in de knop (B op een controller)');
ok(buttonsWithoutGlyph(kaart).length === 0 && looseHintBesideButton(kaart) === 0, 'plekkaart: geen knop zonder glyph en geen losse hint');
const pop = reisPopupHtml({ naam: 'X', afstand: '3 km', rijen: rv, gekozen: rv[0].id, kleur: {}, gast: false, melding: '', reis: { label: 'Reis nu · € 8', uitgeschakeld: false } });
ok(rv.every((r) => new RegExp(`data-card="kies:${r.id}"[^>]*data-key="${r.toets}"`).test(pop)) && buttonsWithoutGlyph(pop).length === 0 && looseHintBesideButton(pop) === 0, 'reispopup: elke rij, Reis nu en Terug hebben hun toets in de knop; geen losse hint');
ok(reisHtml(rv, rv[0].id).includes('aria-pressed="true"') && (reisHtml(rv, rv[0].id).match(/aria-pressed="true"/g) || []).length === 1, 'de gekozen rij meldt aria-pressed (één)');
ok(!pop.includes('data-card="zelf"') && !/Zelf gaan/.test(pop), 'reispopup: geen Zelf gaan en geen tekst "Dat kan ook in Samen spelen"');
ok(!/Dat kan ook in Samen spelen/.test(src('game/js/kaartactie.js') + src('game/js/kaartactieui.js') + src('game/js/mapview.js')), 'de oude zin "Dat kan ook in Samen spelen" is uit de code');

// 3. dsButtonKey: één component
const b = dsButtonKey({ label: 'Reis nu', toets: 'ENTER', klasse: 'ds-z-knop', attrs: 'data-card="rij"' });
ok(/^<button type="button" class="ds-z-knop ds-z-knop--toets" data-card="rij" data-key="ENTER" aria-keyshortcuts="Enter"><span class="ds-z-knop__label">Reis nu<\/span><span class="ds-z-knop__toets" aria-hidden="true">/.test(b), 'dsButtonKey: label, dan de toets, met aria-keyshortcuts');
ok(/<span class="ds-z-knop__toets"[^>]*>.*data-gk="ENTER"/.test(b), 'de glyph is glyphHtml (data-gk), dus glyphs.js wisselt hem live naar het apparaat');
ok(dsButtonKey({ label: 'Terug', toets: 'ESC', voor: true }).indexOf('ds-z-knop__toets') < dsButtonKey({ label: 'Terug', toets: 'ESC', voor: true }).indexOf('ds-z-knop__label'), 'voor: de toets vóór het label');
ok(!/ds-z-knop__toets|data-key/.test(dsButtonKey({ label: 'Uit', toets: 'ENTER', uit: true })) && /disabled/.test(dsButtonKey({ label: 'Uit', toets: 'ENTER', uit: true })), 'een uitgeschakelde knop toont geen toets');
ok(knopToets('') === '' && shortcutName('ESC') === 'Escape' && shortcutName('ENTER') === 'Enter' && shortcutName('1') === '1', 'knopToets zonder toets is leeg; de shortcutName heet Enter, Escape of het cijfer');
ok(KNOP_TOETSEN.bevestig === 'ENTER' && KNOP_TOETSEN.terug === 'ESC', 'het standaardpatroon: bevestigen is Enter, terug is Esc');
ok(!/px/.test(src('game/js/dsbutton.js').replace(/\/\/.*$/gm, '')), 'dsbutton.js zet geen eigen px-maat (het keycap-systeem bepaalt)');
ok(!/\.ds-z-knop__toets[^{]*\{[^}]*\d+px/.test(src('game/js/ds-components.css').slice(src('game/js/ds-components.css').indexOf('Toets in de knop'))), 'de CSS van de knoptoets heeft geen px-maat');

// 4. de glyph per invoerapparaat: A is Enter, B is Esc in het menu; een cijfer heeft geen padknop en verdwijnt op een controller
ok(PAD_MAPS.menu.a === 'enter' && PAD_MAPS.menu.b === 'escape' && PAD_MAPS.menu.up === 'arrowup' && PAD_MAPS.menu.down === 'arrowdown' && PAD_MAPS.menu.stick === 'nav', 'menupatroon: A Enter, B Esc, D-pad en stick lopen door de knoppen');
ok(padSlotFor('ENTER', 'menu') === 'a' && padSlotFor('ESC', 'menu') === 'b', 'ENTER wijst de A-knop aan en ESC de B-knop');
ok(['1', '2', '3', '4'].every((c) => !padSlotFor(c, 'menu')), 'een cijfertoets heeft geen controllerknop: hij verdwijnt op een pad (geen leeg vakje)');
const lab = (html) => (html.match(/aria-label="([^"]+)"/) || [])[1];
for (const [fam, a, bb] of [['xbox', 'onderste knop', 'rechter knop'], ['ps', 'onderste knop', 'rechter knop'], ['deck', 'onderste knop', 'rechter knop']]) {
  ok(lab(padGlyphInner('a', fam)) === a && lab(padGlyphInner('b', fam)) === bb, `${fam}: A en B krijgen hun eigen glyph met een naam`);
}
ok(padGlyphInner('a', 'ps') !== padGlyphInner('a', 'xbox') && padGlyphInner('a', 'xbox') !== padGlyphInner('b', 'xbox'), 'PlayStation en Xbox tonen een andere glyph voor dezelfde knop');
ok(/touch-play/.test(src('game/js/glyphs.js')) && /pad-none/.test(src('game/js/a11y.css')) && /\.ds-z-knop__toets:has\(\.pad-none\)/.test(src('game/js/ds-components.css')), 'op aanraking of zonder padknop verdwijnt de glyph én zijn wikkel; de knop houdt zijn label');

// 5. de navigatie: één patroon voor toetsenbord en controller
ok(navIndex(4, 0, 'ArrowDown') === 1 && navIndex(4, 3, 'ArrowDown') === 3 && navIndex(4, 0, 'ArrowUp') === 0, 'pijl omlaag en omhoog lopen door de lijst en blijven op de rand (de D-pad)');
ok(navIndex(3, 2, 'Tab', { wrap: true }) === 0 && navIndex(3, 0, 'Tab', { wrap: true, shift: true }) === 2, 'Tab en Shift+Tab lopen rond binnen een venster (de focusval)');
ok(navIndex(5, 2, 'Home') === 0 && navIndex(5, 2, 'End') === 4 && navIndex(5, -1, 'ArrowDown') === 0 && navIndex(5, -1, 'ArrowUp') === 4, 'Home en End; zonder focus begint omlaag vooraan en omhoog achteraan');
ok(navIndex(0, -1, 'ArrowDown') === -1 && navIndex(3, 1, 'x') === -1 && navIndex(3, 1, 'Enter') === -1, 'geen lijst of geen navigatietoets: niets');
ok(['q', 'E', '[', ']', 'M'].every((k) => PAGE_SWITCH_KEYS.test(k)) && !PAGE_SWITCH_KEYS.test('w') && rijCijfer('3') === 3 && rijCijfer('0') === 0 && rijCijfer('a') === 0, 'Q, E, [, ], M horen bij het menu en worden in een venster geslikt; cijfers 1 tot 9 zijn rijkeuzes');

// 6. de verdrading in mapview.js en pausemenu.js (bronchecks; de beelden volgen in de sweep)
const mv = src('game/js/mapview.js');
const pm = src('game/js/pausemenu.js');
ok(/export function kaartToets\(e\)/.test(mv) && /export function kaartPlekkaartSluiten\(\)/.test(mv) && /export function kaartPopupOpen\(\)/.test(mv), 'mapview.js biedt kaartToets, kaartPlekkaartSluiten en kaartPopupOpen aan');
ok(/function focusPlekkaart\(/.test(mv) && /if \(!popup\) focusPlekkaart\(/.test(mv), 'de plekkaart zet de eerste focus op de primaire actie');
ok(/plekkaartToets\(e\)/.test(mv) && /\.mv-actie\[data-key=/.test(mv), 'de cijfers 1 tot 3 doen een actie van de plekkaart');
ok(/const pijl = !\(state\.cardEl/.test(mv), 'met de focus in de plekkaart schuiven de pijlen de kaart niet');
ok(/data-act="hulp"/.test(mv) && /act === 'hulp'/.test(mv) && /syncKaartUitleg\(world, true\)/.test(mv), 'een Hulp-knop bij de zoomknoppen opent de uitleg opnieuw');
ok(/else if \(!opnieuw && !kaartGezien\(\)\) \{[\s\S]{0,400}wachtOpZoekTip\(\)/.test(mv) && /addEventListener\('focus'/.test(mv), 'UX-audit 23-11: de eerste keer geen venster over de kaart; de tip komt bij de eerste focus op het zoekveld');
ok(/\.mv-reispop, \.mv-help'\) \|\| overlay/.test(src('game/js/padmapnav.js')), 'de D-pad van een controller blijft in een open kaartvenster (padmapnav.js)');
ok(!/'Q', 'E'\], 'onderdeel'\]/.test(pm.match(/map: \[\[\['Klik'.*\n/)[0]), 'de voetbalk van de kaart zegt niet meer "onderdeel" bij Q en E');
ok(!/mv-link" data-card="close"/.test(mv), 'mapview.js bouwt Sluiten via sluitHtml (met de Esc-toets erin)');

console.log(fails ? `kaartpopups_test: ${fails} van ${n} mislukt` : `kaartpopups_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
