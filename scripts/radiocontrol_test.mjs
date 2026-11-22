// De radio bedienen met alleen een controller of toetsenbord (22-11, #988, #495): de pure regels in game/js/radiocontrol.js, het zenderwiel in
// actionradial.js en de verbinding in radio.js en controls.js. Geen browser, geen Electron, geen audio.
//
//   node scripts/radiocontrol_test.mjs
import { readFileSync } from 'node:fs';
import { radioDialPages, radioDialRow, radioDialResult, createNKey, radioPassenger, radioPaths, RADIO_OFF, PASSENGER_TEXT } from '../game/js/radiocontrol.js';
import * as W from '../game/js/actionradial.js';
import * as C from '../game/js/controls.js';
import { CHANNELS } from '../game/js/radiochannels.js';

let fails = 0, n = 0;
const ok = (c, name, extra) => { n++; if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };
const src = (f) => readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');

// --- 1. het zenderwiel: wat erin staat ---------------------------------------------------------------------------------------------------
const lijst = [
  { id: 'gmusic', name: 'G-Music', dj: 'Geesje', sub: 'x', status: 'open' },
  { id: 'nachtstreek', name: 'Nachtstreek', dj: 'Rikus', sub: 'x', status: 'open' },
  { id: 'binnenkort', name: 'Binnenkort FM', dj: 'Nog niemand', sub: 'x', status: 'soon' },
  { id: 'geheim', name: 'Geheime zender', dj: 'Niemand', sub: 'x', status: 'hidden' },
  { id: 'wierde', name: 'Wierde Radio', dj: 'Boer Harm', sub: 'x', status: 'open' },
];
const pages = radioDialPages(lijst, { currentId: 'nachtstreek', on: true });
const items = pages[0].items;
ok(pages.length === 1 && pages[0].layout === 'lijst' && pages[0].title === 'Zenders', 'een pagina, een lijst, de titel Zenders');
ok(!items.some((i) => i.radio === 'geheim'), 'een verborgen (geheime, niet gevonden) zender staat er niet in');
const soon = items.find((i) => i.radio === 'binnenkort');
ok(soon && soon.disabled === true && soon.sub === 'Binnenkort', 'Binnenkort staat erin, grijs (disabled) en zegt Binnenkort');
ok(items.filter((i) => !i.disabled && i.radio !== RADIO_OFF).length === 3, 'de open zenders zijn te kiezen');
ok(items.every((i) => i.icon && i.label), 'elke rij heeft een icoon en een naam');
ok(items.filter((i) => i.active).length === 1 && items.find((i) => i.active).radio === 'nachtstreek', 'precies de huidige zender is gemarkeerd');
ok(items[items.length - 1].radio === RADIO_OFF && items[items.length - 1].label === 'Radio uit', 'de laatste rij zet de radio uit');
ok(items[radioDialRow(pages)].radio === 'nachtstreek', 'het wiel opent op de huidige zender');
const uitPages = radioDialPages(lijst, { currentId: 'nachtstreek', on: false });
ok(uitPages[0].items.filter((i) => i.active).length === 1 && uitPages[0].items.find((i) => i.active).radio === RADIO_OFF, 'staat de radio uit, dan is Radio uit gemarkeerd en geen zender');
ok(radioDialRow(radioDialPages([{ id: 'x', name: 'X', dj: 'd', status: 'soon' }], { currentId: 'nope', on: true })) >= 0, 'zonder huidige zender opent het wiel op een rij (Radio uit)');
ok(JSON.stringify(radioDialResult(items[0])) === JSON.stringify({ type: 'zender', channel: 'gmusic' }), 'een zender kiezen geeft die zender');
ok(radioDialResult(items[items.length - 1]).type === 'uit', 'Radio uit kiezen zet de radio uit');
ok(radioDialResult(soon) === null && radioDialResult(null) === null && radioDialResult({}) === null, 'Binnenkort en een onbekende rij doen niets');
// met de echte zenderlijst van het spel: elke zender krijgt een rij met een naam
const echt = radioDialPages(CHANNELS.map((c) => ({ id: c.id, name: c.name, dj: c.dj, sub: c.sub, status: 'open' })), { currentId: 'gmusic', on: true });
ok(echt[0].items.length === CHANNELS.length + 1, 'de echte zenders staan er allemaal in, plus Radio uit', echt[0].items.length);

// --- 2. het wiel: openen, kiezen, bevestigen, annuleren ----------------------------------------------------------------------------------
const gedaan = [];
ok(W.openRadialPages('radio', pages, { sel: radioDialRow(pages), runner: (it) => gedaan.push(it.radio) }) && W.radialIsOpen(), 'het zenderwiel opent');
let m = W.radialModel();
ok(m.layout === 'lijst' && m.title === 'Zenders' && m.sel === 1, 'het model: een lijst, geopend op de huidige zender', [m.layout, m.sel]);
ok(W.radialStep('down') === 3, 'D-pad omlaag slaat Binnenkort over (van Nachtstreek naar Wierde Radio)', W.radialModel().sel);
ok(W.radialStep('up') === 1 && W.radialStep('up') === 0, 'D-pad omhoog loopt terug');
ok(W.radialStep('up') === 4, 'rond aan het begin: naar Radio uit');
W.radialStep('down');
// de stick in een lijst: één rij per duw, bij vasthouden na een pauze weer een
ok(W.radialAim(0, 1, 0.5, 1000) === 1 && W.radialAim(0, 1, 0.5, 1100) === 1 && W.radialAim(0, 1, 0.5, 1300) === 3, 'de stick omlaag loopt rij voor rij (met herhaling), Binnenkort valt weg');
W.radialAim(0, 0, 0.5, 1400);
ok(W.radialAim(0, 0.2, 0.5, 1500) === 3, 'binnen de dode zone verandert er niets');
ok(W.radialAim(1, 0.1, 0.5, 2000) === 3, 'zijwaarts duwen is geen omlaag in een lijst');
// Binnenkort kiezen met een klik kan niet: het wiel blijft open
ok(W.radialPick(2) === null && W.radialIsOpen() && gedaan.length === 0, 'een klik op Binnenkort kiest niets en laat het wiel open');
const gekozen = W.radialPick(0);
ok(gekozen && gekozen.radio === 'gmusic' && !W.radialIsOpen() && gedaan.join() === 'gmusic', 'kiezen bevestigt, sluit het wiel en geeft de zender aan de eigen runner', gedaan);
// annuleren: sluiten zonder keuze
W.openRadialPages('radio', pages, { sel: 1, runner: (it) => gedaan.push('FOUT ' + it.radio) });
W.closeRadial();
ok(!W.radialIsOpen() && gedaan.length === 1, 'B (sluiten) kiest niets');
// een gewoon wiel gebruikt de gewone runner, niet die van het zenderwiel
const gewoon = [];
W.setRadialRunner((it) => gewoon.push(it.id));
W.openRadial('vehicle');
W.radialStep('right'); W.radialChoose();
ok(gewoon.length === 1 && gedaan.length === 1, 'het acties-wiel houdt zijn eigen runner');
W.setRadialRunner(null);
// een onderdeel met een actie (Zenders kiezen) roept de actie aan en sluit het wiel
let actie = 0;
W.setRadialAction('radiowiel', () => { actie++; });
W.openRadial('vehicle');
const rp = W.radialModel();
W.radialPage(1);
const radioPage = W.radialModel();
ok(radioPage.title === 'Radio' && radioPage.items.some((i) => i.id === 'zenderwiel'), 'het acties-wiel heeft een pagina Radio met Zenders kiezen', radioPage.title);
W.radialStep('down'); W.radialStep('down'); W.radialStep('down'); W.radialStep('down');
const welke = radioPage.items[W.radialModel().sel];
W.radialChoose();
ok(welke && welke.id === 'zenderwiel' && actie === 1 && !W.radialIsOpen(), 'Zenders kiezen roept het zenderwiel aan', [welke && welke.id, actie]);
ok(rp.title === 'Spelen', 'de eerste pagina blijft Spelen');
ok(JSON.stringify(W.itemKeys({ key: 'n', alt: true })) === JSON.stringify({ down: ['alt', 'n'], up: ['n', 'alt'] }), 'Alt + N: Alt eerst in en laatst uit');
ok(JSON.stringify(W.itemKeys({ key: 'n', shift: true })) === JSON.stringify({ down: ['shift', 'n'], up: ['n', 'shift'] }), 'Shift + N blijft zoals het was');

// --- 3. kort en lang drukken op N ---------------------------------------------------------------------------------------------------------
{
  const k = createNKey();
  // kort: de radio gaat bij het loslaten om, één keer
  const uit = [];
  uit.push(k.step({ pressed: true, down: true, dt: 0.016 }));
  for (let i = 0; i < 5; i++) uit.push(k.step({ down: true, dt: 0.016 }));
  uit.push(k.step({ down: false, dt: 0.016 }));
  ok(uit.filter(Boolean).join() === 'toggle' && uit[uit.length - 1] === 'toggle', 'een korte druk is één keer aan of uit, bij het loslaten', uit);
  // lang: het wiel, één keer, en loslaten zet de radio niet om
  const lang = [];
  lang.push(k.step({ pressed: true, down: true, dt: 0.016 }));
  for (let i = 0; i < 60; i++) lang.push(k.step({ down: true, dt: 0.016 }));
  lang.push(k.step({ down: false, dt: 0.016 }));
  lang.push(k.step({ down: false, dt: 0.016 }));
  ok(lang.filter(Boolean).join() === 'wheel', 'een lange druk opent het wiel één keer en zet de radio niet om', lang.filter(Boolean));
  // net onder de houdtijd is nog kort
  const grens = [];
  grens.push(k.step({ pressed: true, down: true, dt: 0.016 }));
  for (let i = 0; i < 20; i++) grens.push(k.step({ down: true, dt: 0.016 }));
  grens.push(k.step({ down: false, dt: 0.016 }));
  ok(grens.filter(Boolean).join() === 'toggle', 'onder de houdtijd (0,4 s) is het nog een korte druk', grens.filter(Boolean));
  ok(Math.abs(C.WHEEL_HOLD_MS - 400) < 1, 'de houdtijd is die van het acties-wiel (400 ms)');
  // Shift en Alt: meteen, ook bij vasthouden maar één keer
  const sh = [k.step({ pressed: true, down: true, shift: true, dt: 0.016 })];
  for (let i = 0; i < 60; i++) sh.push(k.step({ down: true, shift: true, dt: 0.016 }));
  sh.push(k.step({ down: false, shift: true, dt: 0.016 }));
  ok(sh.filter(Boolean).join() === 'next', 'Shift+N is meteen de volgende zender, één keer', sh.filter(Boolean));
  ok(k.step({ pressed: true, down: true, alt: true, dt: 0.016 }) === 'prev', 'Alt+N is meteen de vorige zender');
  k.step({ down: false });
  // een menu houdt de toets tegen en wist wat er liep
  k.step({ pressed: true, down: true, dt: 0.016 });
  ok(k.step({ down: true, blocked: true, dt: 1 }) === null && k.step({ down: false, dt: 0.016 }) === null, 'een geblokkeerde toets (menu, filmpje) doet niets bij het loslaten');
  // een pad dat de toets in één beeld indrukt en loslaat (de D-pad-tik van het acties-wiel, 90 ms): kort
  ok(k.step({ pressed: true, down: false, dt: 0.016 }) === 'toggle', 'een druk die in hetzelfde beeld los is, is kort');
}

// --- 4. Samen spelen: de bestuurder kiest, een passagier volgt -----------------------------------------------------------------------------
ok(!radioPassenger({ coopNet: {} }, null), 'te voet is niemand passagier');
ok(!radioPassenger(null, {}) && !radioPassenger({}, {}), 'zonder sessie is niemand passagier (Alleen spelen)');
ok(!radioPassenger({ coopNet: {}, coopSolo: true, coopWielSlot: 1 }, {}), 'een sessie van één telt niet');
ok(!radioPassenger({ coopNet: {}, coopRole: 'host', coopWielSlot: null }, {}), 'de gastheer die zelf stuurt kiest de zender');
ok(radioPassenger({ coopNet: {}, coopRole: 'host', coopWielSlot: 1 }, {}), 'de gastheer die het stuur aan een gast gaf is passagier en volgt');
ok(radioPassenger({ coopNet: {}, coopRole: 'client', coopInVoertuig: true, coopBestuurder: false, coopWiel: false }, {}), 'een gast als bijrijder is passagier');
ok(!radioPassenger({ coopNet: {}, coopRole: 'client', coopInVoertuig: true, coopBestuurder: true }, {}), 'een gast achter het stuur kiest de zender');
ok(!radioPassenger({ coopNet: {}, coopRole: 'client', coopInVoertuig: true, coopWiel: true }, {}), 'een bijrijder die het stuur kreeg kiest de zender');
ok(!radioPassenger({ coopNet: {}, coopRole: 'client', coopInVoertuig: false }, {}), 'een gast te voet is geen passagier');
ok(PASSENGER_TEXT === 'De bestuurder kiest de zender.', 'de melding voor de passagier staat er');
const radioSrc = src('radio.js');
ok(/if \(!auto && isPassenger\(\)\)/.test(radioSrc), 'selectChannel weigert een passagier (menu, Shift+N en het wiel lopen er allemaal langs)');
ok(/export function openRadioWheel\(\) \{\s*if \(!world\) return false;\s*if \(isPassenger\(\)\)/.test(radioSrc), 'het wiel opent niet voor een passagier');
ok(/setRadialAction\('radiowiel'/.test(radioSrc), 'het acties-wiel opent het zenderwiel via de actie radiowiel');
ok(/auto \? |auto = false/.test(radioSrc) && /if \(!auto\) \{\s*if \(vehState\.kind\) rememberVehicle\(id\)/.test(radioSrc), 'een gekozen zender in een voertuig wordt per voertuigsoort onthouden (radioVehicle, #988)');
ok(/channelNotice\(world, z, true\)/.test(radioSrc), 'na het wisselen komt de radiomelding (zender, DJ, titel en artiest) zoals bij het instappen');

// --- 5. de routes per situatie: elke radioactie is op elk voertuigtype met alleen het pad te bereiken ---------------------------------
const SOORTEN = ['foot', 'hengelen', 'vehicle', 'vehicleManual', 'bus', 'skutsje', 'trekker', 'heli', 'plane', 'pigeon', 'train'];
for (const ctx of SOORTEN) for (const samen of [false, true]) {
  const r = radioPaths(ctx, samen);
  ok(r && r.toggle, `${ctx}${samen ? ' (Samen)' : ''}: radio aan of uit is op het pad te bereiken`, r);
  ok(r && r.next === 'acties-wiel', `${ctx}${samen ? ' (Samen)' : ''}: de volgende zender is op het pad te bereiken`, r);
  ok(r && r.prev === 'acties-wiel', `${ctx}${samen ? ' (Samen)' : ''}: de vorige zender is op het pad te bereiken`, r);
  ok(r && r.dial.length > 0, `${ctx}${samen ? ' (Samen)' : ''}: het zenderwiel is op het pad te bereiken`, r);
}
ok(radioPaths('foot').toggle === 'up' && radioPaths('foot').dial.includes('houd up'), 'te voet: D-pad omhoog is de radio, vasthouden het wiel');
ok(radioPaths('foot', true).toggle === 'acties-wiel', 'te voet in een sessie is D-pad omhoog bij de groep: de radio zit dan in het wiel');
ok(radioPaths('vehicle').toggle === 'acties-wiel' && radioPaths('vehicle').dial.join() === 'acties-wiel', 'in een auto: alles via het acties-wiel (er is geen vrije knop, #495)');
ok(radioPaths('menu') === null || radioPaths('menu').next === null, 'in een menu is er geen wiel (de zenderlijst staat in Instellingen > Geluid)');
// geen enkele bestaande binding is veranderd: de radio-items hebben geen eigen knop nodig en nemen er geen af
for (const ctx of SOORTEN) {
  const map = C.PAD_MAPS[ctx];
  const nHier = C.PAD_BUTTONS.filter((s) => map[s] === 'n');
  ok(nHier.length <= 1, `${ctx}: N staat hooguit op één knop`, nHier);
  ok(!C.PAD_BUTTONS.some((s) => map[s] === 'alt'), `${ctx}: Alt staat op geen enkele knop (alleen het wiel stuurt hem)`);
}
ok(C.PAD_MAPS.foot.up === 'n' && C.PAD_MAPS.vehicle.up === 'p' && C.PAD_MAPS.vehicle.lb === 't' && C.PAD_MAPS.vehicle.view === 'm' && C.PAD_MAPS.coopvraag.b === 'n', 'de bestaande bindingen zijn ongewijzigd (voet, auto, kaart, vraag)');

// --- 6. herbinden: de acties staan in het herbind-scherm en oude herbindingen blijven werken ----------------------------------
const nRij = C.KEY_ACTIONS.filter(([k]) => k === 'n');
ok(nRij.length === 1 && /Shift/.test(nRij[0][1]) && /Alt/.test(nRij[0][1]) && /vasthouden/.test(nRij[0][1]) && /zenderwiel/.test(nRij[0][1]), 'de N-rij in Besturing noemt aan/uit, Shift, Alt en vasthouden', nRij[0] && nRij[0][1]);
ok(new Set(C.KEY_ACTIONS.map(([k]) => k)).size === C.KEY_ACTIONS.length, 'geen toets dubbel in de herbindlijst (er is geen nieuwe toets bijgekomen)');
// N herbonden naar B: de hele radiobediening (kort, vasthouden, Shift, Alt) volgt die ene toets
const { binds } = C.bindKey({}, 'n', 'b');
ok(C.physicalKey(binds, 'n') === 'b' && C.keyTranslation(binds).get('b') === 'n', 'N herbonden naar B: B is voor het spel weer N, en dus ook B vasthouden, Shift+B en Alt+B');
ok(JSON.stringify(C.normalizeKeyBinds({ n: 'b', u: 'g' })) === JSON.stringify({ n: 'b', u: 'g' }), 'een oude herbinding van N blijft zoals hij was (opslag onveranderd)');
ok(JSON.stringify(C.normalizeKeyBinds({ n: 'alt' })) === '{}', 'Alt kan geen herbinding worden (vast), zodat Alt+N niet kan botsen');
// de controller: de knop blijft herbindbaar, het wiel volgt
const padBinds = C.bindButton({}, 'up', 'left').binds;
ok(C.physicalButton(padBinds, 'up') === 'left' && C.buttonSlots(padBinds).left === 'up', 'D-pad omhoog (de radio te voet) is te verplaatsen; het slot blijft hetzelfde voor het spel');

// --- 7. de uitleg: de snelkoppelregel in Instellingen > Geluid --------------------------------------------------------------------
ok(/Zender kiezen met een controller: houd Overzicht en kies Zenders kiezen/.test(src('pausemenu.js')), 'Instellingen > Geluid noemt hoe je met een controller een zender kiest');
ok(/vasthouden/.test(radioSrc) && /Nieuwe zender/.test(radioSrc), 'de melding bij een nieuwe zender noemt het zenderwiel');

console.log(fails ? `radiocontrol_test: ${fails} van ${n} mislukt` : `radiocontrol_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
