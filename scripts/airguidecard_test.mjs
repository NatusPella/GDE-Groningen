// De routekaart in de lucht (#1038, eigenaar 22-11): plaatsnaam in plaats van de missievoorwaarde, een pijl die meedraait,
// de U-bocht-drempel, de titellengte en de bedrading in hud_panel.js. Puur, zonder DOM en zonder THREE.
//   node scripts/airguidecard_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';

const C = await import('../game/js/airguidecard.js');
let n = 0;
const ok = (c, m) => { n++; assert.ok(c, m); };

// 1) label-bron: een missietitel is nooit de bestemming
const MISSIE = 'Nul krassen, vijftienhonderd punten';
const placeAt = (x) => (x > 5000 ? { place: 'Winsum', near: false } : { place: 'Eelde', near: true });
const pads = [{ x: 100, y: 100, name: 'Vliegveld Eelde' }];
ok(C.airDestName({ x: 110, y: 90, kind: 'mission', name: MISSIE }, { pads, placeAt }) === 'Vliegveld Eelde', 'dichtbij een landingsplek: de naam van de plek');
ok(C.airDestName({ x: 9000, y: 0, kind: 'mission', name: MISSIE }, { pads, placeAt }) === 'Winsum', 'missie zonder plek: de plaats, niet de titel');
ok(C.airDestName({ x: 300, y: 0, kind: 'mission', name: MISSIE }, { pads, placeAt }) === 'Bij Eelde', 'buiten het gebied: "Bij ..."');
ok(C.airDestName({ x: 9000, y: 0, kind: 'job', name: 'Lever 3 pakketten' }, { placeAt }) === 'Winsum', 'ook een klus-label is geen plek');
ok(C.airDestName({ x: 9000, y: 0, kind: 'mission', name: MISSIE }, {}) === 'Je doel', 'zonder plaatsnamen: neutraal, nooit de titel');
ok(C.airDestName({ x: 9000, y: 0, kind: 'user', name: 'Eemshaven' }, { placeAt }) === 'Eemshaven', 'eigen doel: zijn plaatsnaam');
ok(C.airDestName({ x: 9000, y: 0, kind: 'mission', name: 'Rotor Roelf, Eelde', plek: true }, { placeAt }) === 'Rotor Roelf, Eelde', 'echte plek (heli-run): blijft');
ok(!C.airDestName({ x: 9000, y: 0, kind: 'mission', name: MISSIE }, { pads, placeAt }).includes('krassen'), 'de voorwaarde staat nergens');

// 2) pijl-hoek in alle kwadranten: plus = rechts, 0 = recht vooruit
for (const [rel, deg] of [[0, 0], [30, 30], [90, 90], [119, 119], [-30, -30], [-90, -90], [-119, -119]]) {
  const a = C.airArrow(rel);
  ok(!a.uturn && a.icon === 'pijl_omhoog' && a.deg === deg, `pijl ${rel}`);
}
// 3) U-bocht-drempel op 120 graden
ok(!C.airArrow(119).uturn && C.airArrow(120).uturn && C.airArrow(-120).uturn && C.airArrow(180).uturn, 'drempel 120');
ok(C.airArrow(150).icon === 'omdraaien' && C.airArrow(150).deg === 0, 'U-bocht: omdraai-icoon, geen draaiing');
ok(C.airAction(0) === 'Houd koers' && C.airAction(20) === 'Rechts aanhouden' && C.airAction(-20) === 'Links aanhouden', 'aanhouden');
ok(C.airAction(60) === 'Draai naar rechts' && C.airAction(-60) === 'Draai naar links' && C.airAction(150) === 'Draai om', 'draaien');

// 4) de hele kaart: me kijkt oost (angle 0), doel ligt achter je (west)
const me = { x: 0, y: 0, z: 40, angle: 0, speed: 40 };
let c = C.airCard(me, { x: -1700, y: 0, kind: 'mission', name: MISSIE }, { alt: 75, placeAt });
ok(c.title === 'Eelde' || c.title === 'Bij Eelde', `titel: ${c.title}`);
ok(c.sub === 'Draai om · achter je · Stijg naar 75 m', `sub: ${c.sub}`);
ok(c.uturn && c.icon === 'omdraaien' && !/°|Koers/.test(c.sub), 'U-bocht zonder graden');
c = C.airCard(me, { x: 0, y: 1000, kind: 'user', name: 'Eemshaven' }, { alt: 40 }); // zuid = rechts van een oostkoers
ok(c.deg === 90 && c.action === 'Draai naar rechts' && c.sub === 'Draai naar rechts · Hoogte goed', `rechts: ${c.deg} ${c.sub}`);
ok(c.key === 'Eemshaven|Draai naar rechts', 'sleutel wisselt met de handeling');

// 5) titellengte: hooguit 30 tekens, één regel
ok(C.cutTitle(MISSIE).length <= C.AIR_TITLE_MAX && C.cutTitle(MISSIE).endsWith('…'), 'lange titel wordt afgekapt');
ok(C.cutTitle('Vliegveld Eelde') === 'Vliegveld Eelde', 'korte titel blijft');
ok(C.cutTitle('a'.repeat(30)).length === 30 && C.cutTitle('a'.repeat(31)).length === 30, 'grens op 30');

// 6) bedrading in hud_panel.js: de kaart gebruikt airCard, de pijl draait mee, de balk toont in de lucht geen werkwoord + titel
const hud = fs.readFileSync(new URL('../game/js/hud_panel.js', import.meta.url), 'utf8');
ok(/airCard\(me, route\.target/.test(hud) && /landingSpots\(map\)/.test(hud) && /placeAt: worldPlaceAt/.test(hud), 'hud: kaart uit airCard met landingsplekken en plaatsnamen');
ok(/--gps-hoek/.test(hud) && /classList\.toggle\('is-air'/.test(hud), 'hud: pijlhoek en is-air');
ok(/lucht \? cutTitle\(g\.name\)/.test(hud), 'hud: balk in de lucht zonder "Vlieg naar:"');
const css = fs.readFileSync(new URL('../game/js/hud_panel.css', import.meta.url), 'utf8');
ok(/is-air \.gps-arrow \{ transform: rotate\(var\(--gps-hoek/.test(css) && /gps-wissel var\(--ds-m-lang\)/.test(css), 'css: pijl draait, wissel met token <= 250 ms');
const rt = fs.readFileSync(new URL('../game/js/routing.js', import.meta.url), 'utf8');
ok(/name: hr\.name \|\| 'Heli', plek: true/.test(rt), 'routing: heli-run doelen zijn echte plekken');

console.log(`airguidecard_test: ${n} controles gehaald`);
