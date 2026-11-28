// Test voor game/js/hoofdmenu.js: de rijen, de focus, de toetsen, de uitkomst naar de startvraag en wat Nieuw spel en Laden met de saves doen.
import assert from 'node:assert/strict';
import { menuItems, startFocus, menuToets, uitkomstVan, nieuwSpelPlan, ladenPlan, heldRegels, samenKeuzePlan, samenGekozen } from '../game/js/hoofdmenu.js';
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); n++; };

// terugkerende speler: Doorgaan is de held
let it = menuItems({ heeftSave: true, desktop: true, aantal: 5 });
eq(it.map((x) => x.id), ['doorgaan', 'nieuw', 'laden', 'samen', 'instellingen', 'afsluiten'], 'rijen met een save in de app');
ok(it[0].held && !it[1].held, 'alleen de eerste rij is de held');
ok(it.find((x) => x.id === 'laden').meta === '5 spellen', 'het aantal spellen staat bij Opgeslagen spellen');
eq(menuItems({ heeftSave: true, aantal: 1 }).find((x) => x.id === 'laden').meta, '1 spel', 'enkelvoud');
// nieuwe speler: geen Doorgaan en geen Laden (geen uitgeschakelde rijen), Nieuw spel is de held
it = menuItems({ heeftSave: false, desktop: false });
eq(it.map((x) => x.id), ['nieuw', 'samen', 'instellingen'], 'rijen zonder save en zonder app');
eq(menuItems({ heeftSave: false, aantal: 2 }).map((x) => x.id), ['nieuw', 'laden', 'samen', 'instellingen'], 'een lege actieve plek met oudere spellen houdt Opgeslagen spellen');
ok(it[0].held && it[0].label === 'Nieuw spel', 'Nieuw spel is de held zonder save');
ok(!it.some((x) => x.id === 'afsluiten'), 'Afsluiten alleen in de app');

// focus
eq(startFocus(menuItems({ heeftSave: true, aantal: 3 }), 'samen'), 3, 'de vorige keer Samen: focus op Samen spelen');
eq(startFocus(menuItems({ heeftSave: true }), 'alleen'), 0, 'anders de held');
eq(startFocus(menuItems({ heeftSave: false }), undefined), 0, 'zonder voorkeur de held');

// toetsen
it = menuItems({ heeftSave: true, desktop: true, aantal: 2 });
eq(menuToets('ArrowDown', 0, it), { focus: 1 }, 'omlaag');
eq(menuToets('ArrowUp', 0, it), { focus: it.length - 1 }, 'omhoog vanaf de held gaat rond');
eq(menuToets('s', it.length - 1, it), { focus: 0 }, 'WASD, rond');
eq(menuToets('Enter', 2, it), { kies: 'laden' }, 'Enter kiest de rij met focus');
eq(menuToets(' ', 0, it), { kies: 'doorgaan' }, 'spatie ook');
eq(menuToets('4', 0, it), { kies: 'samen' }, 'cijfers zijn snelkeuze');
eq(menuToets('9', 0, it), null, 'een cijfer zonder rij doet niets');
eq(menuToets('Escape', 0, it), null, 'Escape doet niets (Afsluiten is een rij)');
eq(menuToets('Backspace', 0, it), null, 'Backspace ook niet');
eq(menuToets('Home', 3, it), { focus: 0 }, 'Home');
eq(menuToets('End', 0, it), { focus: it.length - 1 }, 'End');
eq(menuToets('x', 0, []), null, 'geen rijen, geen actie');

// uitkomst naar de startvraag: alleen Samen gebruikt het netwerk
eq([uitkomstVan('doorgaan'), uitkomstVan('nieuw'), uitkomstVan('laden'), uitkomstVan('samen')], ['alleen', 'alleen', 'alleen', 'samen'], 'Alleen of Samen');
eq([uitkomstVan('instellingen'), uitkomstVan('afsluiten'), uitkomstVan('onzin')], [null, null, null], 'Instellingen en Afsluiten beslissen de start niet');

// saves gaan nooit stuk
eq(nieuwSpelPlan({ heeftSave: false }), { actie: 'direct' }, 'zonder save begint de boot zelf een nieuw spel');
eq(nieuwSpelPlan({ heeftSave: true, vrijePlek: true }), { actie: 'nieuwe-plek' }, 'met een save komt er een verse plek bij');
const vol = nieuwSpelPlan({ heeftSave: true, vrijePlek: false });
ok(vol.actie === 'vol' && /Alle plekken/.test(vol.tekst), 'zonder vrije plek gebeurt er niets en het menu zegt waarom (geen stille overschrijving)');
eq(ladenPlan(3), { actie: 'stay', n: 3 }, 'laden pint de gekozen plek (markStay)');
eq([ladenPlan(0).actie, ladenPlan(NaN).actie, ladenPlan('2').actie], ['geen', 'geen', 'geen'], 'een ongeldige plek wordt nooit gepind');

// Samen spelen: eerst de opslagkeuze (28-11)
eq(samenKeuzePlan({ aantal: 0 }), { actie: 'nieuw' }, 'zonder enig spel is Nieuw spel de keuze, ook voor een gast');
eq(samenKeuzePlan({ aantal: 0, rol: 'gast' }).actie, 'nieuw', 'gast zonder plek: Nieuw als standaard');
const sk = samenKeuzePlan({ aantal: 3, rol: 'host' });
ok(sk.actie === 'kies' && sk.titel === 'Kies welke wereld je host', 'host: de wereld die je host');
ok(samenKeuzePlan({ aantal: 3, rol: 'gast' }).titel === 'Kies je eigen spel' && samenKeuzePlan({ aantal: 2, rol: 'lijst' }).titel === 'Kies je eigen spel', 'gast: je eigen spel');
ok(/niets overschreven/.test(sk.hint) && /eigen geld/.test(sk.hint), 'de hint zegt wat er gebeurt en dat er niets wordt overschreven');
eq(samenGekozen(2), { soort: 'plek', actie: 'stay', n: 2 }, 'een gekozen plek blijft de plek van de boot');
eq(samenGekozen('nieuw', { heeftSave: true, vrijePlek: true }), { soort: 'nieuw', actie: 'nieuwe-plek' }, 'Nieuw met saves: een verse plek, nooit een overschrijving');
ok(samenGekozen('nieuw', { heeftSave: true, vrijePlek: false }).actie === 'vol', 'Nieuw zonder vrije plek: het menu zegt waarom');
eq(samenGekozen('nieuw', { heeftSave: false }), { soort: 'nieuw', actie: 'direct' }, 'Nieuw zonder saves: de boot begint zelf');
ok(samenGekozen(0).soort === 'geen' && samenGekozen(NaN).soort === 'geen' && samenGekozen(undefined).soort === 'geen', 'een ongeldige plek wordt nooit gepind');

// de held
const nu = 1_700_000_000_000;
const h = heldRegels({ name: 'Hoofdspel', character: 'Tessa', playSeconds: 22320, money: 12840, savedAt: nu - 5 * 60000, story: { next: 'Een middag op het terras' } }, nu);
eq([h.naam, h.wie, h.stap], ['Hoofdspel', 'Tessa', 'Een middag op het terras'], 'naam, speler en stap');
ok(h.meta === '6 u 12 · €12.840 · 5 min geleden', 'meta: speeltijd, geld, wanneer ' + h.meta);
ok(heldRegels({ playSeconds: 90, money: 0, savedAt: nu - 3 * 3600000 }, nu).meta.endsWith('3 u geleden'), 'uren geleden');
ok(heldRegels({ playSeconds: 0, money: 0, savedAt: nu - 3 * 86400000 }, nu).meta.endsWith('3 dagen geleden'), 'dagen geleden');
eq(heldRegels(null), null, 'zonder save geen held');
eq(heldRegels({ playSeconds: NaN, money: NaN }, nu).meta, '0 min · €0', 'rommel in de save breekt niets');
console.log(`hoofdmenu_test: ${n} controles ok`);
