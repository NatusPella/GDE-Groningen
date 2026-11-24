// Het winkelpad van M05 'Wind tegen, beide kanten op' (spelbot 23-11): de missie vraagt een eigen fiets, het verhaal stuurt je naar
// Trap & Toeter, een inloopwinkel. Een speler moet die fiets ALTIJD kunnen kopen: prompt bij de marker en bij de deur (ruime straal),
// binnen bij de toonbank, en na 10 s bij de deur of binnen opent de winkelkaart vanzelf. Daarna is de eis voldaan en wijst het verhaal
// naar de start van M05.
//   stap (eis 'bike', gids naar de fietsenwinkel) -> winkel (prompt of terugval) -> koop (een fiets in je bezit) -> volgende stap (de start)
// Puur: de regels (shopentry.js), de poort (missiongates.js, REQUIREMENTS) en de bezitstaat van shops.js; dat shops.js, story.js en
// interiors.js de regels volgen, keurt deze test aan de bron. De winkelkaart zelf (DOM) en de deur in 3D zijn niet getest.
//   node scripts/m05_winkelpad_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
import { shopReach, shopSpot, nearStoryShop, makeStoryShopWait, SHOP_USE_RADIUS, STORY_SHOP_RADIUS, STORY_SHOP_WAIT_S } from '../game/js/shopentry.js';
// three.js komt via node3d.mjs: de modules die het (via shops.js) nodig hebben, laden pas daarna
const { createMissionGates } = await import('../game/js/missiongates.js');
const { REQUIREMENTS } = await import('../game/js/missionrequirements.js');
const { buildDefsVoorMuseum } = await import('../game/js/missions_defs.js');
const spot = (x, y) => ({ x, y, road: null });
const getMissionDefs = () => buildDefsVoorMuseum({ map: { meta: { landmarks: [] }, nearestRoadPoint: () => null, roadsNear: () => [], buildingsNear: () => [] }, walk: spot, drive: spot });
const S = await import('../game/js/shops.js');

let bad = 0, n = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log('FAIL', name, info); } };
const read = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');

// de winkel zoals initShops hem neerzet: de marker buiten het pand, de deur van het interieur een paar meter verderop
const winkel = { id: 'fietsen-0', type: 'fietsen', name: 'Trap & Toeter Binnenstad', x: -138.1, y: 354.1 };
const deur = { x: -141.5, y: 357.2 }, toonbank = { x: -145, y: 361 };
const ingang = (o = {}) => ({ door: deur, counter: toonbank, live: true, inside: false, ...o });

// 1. de stap: M05 vraagt een eigen fiets, en de poort stuurt je naar de fietsenwinkel
const m05 = getMissionDefs().find((d) => d && d.label === 'Wind tegen, beide kanten op');
ok(!!m05 && m05.requires === 'bike', 'M05 vraagt een eigen fiets');
ok(REQUIREMENTS.bike.shop === 'fietsen', 'een fiets koop je bij de fietsenwinkel');
const world = { time: 0, ammo: {}, map: { meta: {} }, players: [{ x: -300, y: 300, angle: 0 }], player: { x: -300, y: 300 } };
const gates = createMissionGates({ state: () => ({ reqHintAt: -99, index: 0 }), hooks: { waived: () => false, gated: () => {} }, requirements: REQUIREMENTS, shops: () => [winkel], homePlace: () => null });
ok(gates.unmetRequirement(world, m05) === 'bike', 'zonder fiets: de eis staat open');
ok(gates.requirementPlace(world, 'bike') === winkel, 'de gids gaat naar Trap & Toeter');

// 2. de winkel: waar staat de prompt?
const verhaal = { story: true, walkIn: true };
ok(shopReach(winkel.x + 3.4, winkel.y, winkel, ingang(), verhaal) !== null, 'op 3,4 m van de marker (waar de bot tussen de fietsen bleef staan): de prompt van de verhaalwinkel staat er');
ok(shopReach(deur.x + 1, deur.y, winkel, ingang(), verhaal) !== null, 'bij de deur: de prompt staat er');
ok(shopReach(deur.x + 1, deur.y, winkel, ingang({ live: false }), verhaal) !== null, 'bij een deur die dicht blijft (interieur niet geladen): de prompt staat er');
ok(shopReach(winkel.x + 3, winkel.y, winkel, null, verhaal) !== null, 'zonder plan van het interieur: de prompt bij de marker');
ok(shopReach(toonbank.x, toonbank.y, winkel, ingang({ inside: true }), verhaal) === null, 'binnen: geen buitenprompt, de toonbank verkoopt');
ok(shopReach(winkel.x + STORY_SHOP_RADIUS + 0.5, winkel.y, winkel, null, verhaal) === null, 'verder dan de ruime straal: geen prompt');
ok(STORY_SHOP_RADIUS >= 4 && STORY_SHOP_RADIUS > SHOP_USE_RADIUS, 'de verhaalwinkel heeft een ruime straal');
// een gewone inloopwinkel buiten het verhaal houdt #1150 (naar binnen lopen), behalve als de deur niet open kan
ok(shopReach(deur.x + 1, deur.y, winkel, ingang(), { walkIn: true }) === null, 'een andere inloopwinkel met een open deur: naar binnen (#1150)');
ok(shopReach(winkel.x + 1, winkel.y, winkel, ingang({ live: false }), { walkIn: true }) !== null, 'een andere inloopwinkel waarvan de deur dicht blijft: de prompt buiten');
ok(shopReach(winkel.x + 1, winkel.y, winkel, null, {}) !== null && shopReach(winkel.x + 3, winkel.y, winkel, null, {}) === null, 'een gewone winkel: 2,6 m rond de marker, zoals altijd');
// de gids en de ring: bij de deur, binnen bij de toonbank
ok(shopSpot(winkel, ingang()) === deur, 'buiten wijst de gids naar de deur');
ok(shopSpot(winkel, ingang({ inside: true })) === toonbank, 'binnen wijst de gids naar de toonbank');
ok(shopSpot(winkel, null).x === winkel.x, 'zonder interieur: de marker');

// de terugval: 10 s bij de deur of binnen zonder te kopen, en de winkelkaart opent vanzelf; één keer per bezoek
const wacht = makeStoryShopWait();
let open = 0;
for (let t = 0; t < STORY_SHOP_WAIT_S - 0.5; t += 0.5) if (wacht.tick(0.5, { shopId: winkel.id, near: true, blocked: false }) === 'open') open++;
ok(open === 0, 'voor 10 s nog niet');
for (let t = 0; t < 1; t += 0.5) if (wacht.tick(0.5, { shopId: winkel.id, near: true, blocked: false }) === 'open') open++;
ok(open === 1, 'na 10 s bij de deur: de winkelkaart opent');
for (let t = 0; t < 30; t += 0.5) if (wacht.tick(0.5, { shopId: winkel.id, near: true, blocked: false }) === 'open') open++;
ok(open === 1, 'één keer per bezoek, niet steeds opnieuw');
wacht.tick(0.5, { shopId: winkel.id, near: false, blocked: false });
for (let t = 0; t < 11; t += 0.5) if (wacht.tick(0.5, { shopId: winkel.id, near: true, blocked: false }) === 'open') open++;
ok(open === 2, 'weggelopen en terug: weer na 10 s');
const stil = makeStoryShopWait();
let o2 = 0;
for (let t = 0; t < 20; t += 0.5) if (stil.tick(0.5, { shopId: winkel.id, near: true, blocked: true }) === 'open') o2++;
ok(o2 === 0, 'met een menu of scène in beeld, of in een voertuig: de klok staat stil');
ok(nearStoryShop(toonbank.x, toonbank.y, winkel, ingang({ inside: true })) && nearStoryShop(deur.x + 2, deur.y, winkel, ingang()) && !nearStoryShop(0, 0, winkel, ingang()), 'binnen en bij de deur telt als bij de winkel');

// 3. de koop: een fiets in je bezit (de bezitstaat van shops.js, zoals een koop of een save hem vult)
ok(!REQUIREMENTS.bike.met(world), 'voor de koop: geen eigen fiets');
S.applyShopSave(world, { vehicles: [{ key: 'omafiets', garage: true }] });
ok(REQUIREMENTS.bike.met(world), 'na de koop: een eigen fiets');

// 4. de volgende stap: de eis is voldaan, het verhaal gaat naar de start van M05
ok(gates.unmetRequirement(world, m05) === null, 'na de koop staat er geen eis meer open: de gids gaat naar de start');

// de andere winkelstap van akte 1: M06 vraagt zwart incognito (Stoer & Stads, een kledingwinkel met interieur) of een huurboot; de regel
// hangt aan de winkel waar het verhaal je heen stuurt (storyGuide.buy en shopId), niet aan het soort winkel, dus geldt daar hetzelfde
ok([].concat(REQUIREMENTS.heist.shop).includes('kleding'), 'M06: de kledingwinkel is een winkelstap van het verhaal');
ok(/const isStoryShop = \(world, s\) => !!\(world && world\.storyGuide && world\.storyGuide\.buy && world\.storyGuide\.shopId === s\.id\)/.test(read('shops.js')), 'de ruime prompt en de terugval gelden voor elke winkel waar het verhaal je heen stuurt');

// de bron volgt de regels
const shops = read('shops.js'), story = read('story.js'), interiors = read('interiors.js');
ok(/export function nearestShop[\s\S]{0,900}shopReach\(/.test(shops), 'shops.js: nearestShop gebruikt shopReach');
ok(/export function updateShops\(dt, world\) \{\s*storyShopFallback\(dt, world\);/.test(shops), 'shops.js: updateShops draait de terugval elke frame');
ok(/const at = shopSpot\(s0/.test(shops), 'shops.js: de ring van de prompt staat bij de deur');
ok(/shopEntryOf\(place\)[\s\S]{0,200}shopSpot\(place, e\)/.test(story), 'story.js: de gids wijst naar de deur of de toonbank');
ok(/setShopEntrySource\(shopEntryAt\)/.test(interiors), 'interiors.js levert de ingang');
ok(/S\.plans\.get\(b\)[\s\S]{0,600}live: S\.live\.has\(b\)/.test(interiors), 'interiors.js: de ingang zegt of de deur open kan (het interieur leeft)');

console.log(`m05_winkelpad_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
