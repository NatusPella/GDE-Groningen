// #822: de vluchtboot van de museumroof moet vooruit kunnen varen. Op de sparse wereld kan de
// kaart rond de aanlegplaats nog leeg zijn als de missie de boot neerzet; dan koos de oude code
// een koers die later een onzichtbare muur bleek (en alleen achteruit laten varen).
//   node scripts/heistboot_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const { TileWorld } = await import('../game/js/tileworld.js');
const G = await import('../game/js/gdt.js');
const B = await import('../game/js/heistboot.js');
const { bootVaartVrij, bootHullInBuilding, bootVrijeRun, kiesVaarrichting, mooringDataVrij, mooringDataRond, mooringBruikbaar } = B;

let n = 0, fails = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${naam}${info ? ' (' + info + ')' : ''}`); } };

// Een synthetische kaart: kanaal van 300 x 30 m, en een museum dat over het water heen steekt.
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
const global = { sections: [{ type: G.SECTION.META, json: { counts: { water: 1, buildings: 2, green: 0, trees: 0, roads: 0, rails: 0, furniture: 0 }, meta: {} } }] };
const tiles = [{
  i: 0, j: 0, sections: [
    { type: G.SECTION.WATER, rows: [{ gid: 0, pts: rect(0, -15, 300, 15), kind: 'kanaal', lv: 0, nav: 0 }] },
    { type: G.SECTION.BUILDINGS, rows: [{ gid: 0, pts: rect(60, -10, 80, 10), type: 'museum', h: 8 }, { gid: 1, pts: rect(0, -20, 300, -16), type: 'quay', h: 3 }] },
  ],
}];
const KINDS = ['roads', 'buildings', 'water', 'trees', 'rails', 'furniture', 'green'];
const map = TileWorld.fromTiles(global, tiles, { sparse: KINDS });
const boot = { model: { len: 3.4, wid: 1.6 } };

// vrije koers op het kanaal; een koers naar de kade is geen vrije koers
ok(bootVaartVrij(map, boot, 20, 0, 0), 'op het kanaal ligt de romp vrij');
ok(!bootVaartVrij(map, boot, 20, 13.5, Math.PI / 2), 'met de neus tegen de kade is de koers niet vrij');

// kadebebouwing boven het water (het museum) telt als muur
ok(!bootHullInBuilding(map, boot, 20, 0, 0), 'bij de aanlegplaats geen gebouw in de romp');
ok(bootHullInBuilding(map, boot, 70, 0, 0), 'onder het museum zit de romp in de bebouwing');
const runOost = bootVrijeRun(map, boot, 20, 0, 0, 60);
ok(runOost > 20 && runOost < 45, 'de vrije run stopt vóór het museum, niet pas erna', String(runOost));
ok(bootVrijeRun(map, boot, 20, 0, Math.PI, 60) > 5, 'de andere kant op is ook water');

// kiesVaarrichting kiest een richting met genoeg vrije ruimte en geen kadebebouwing
const gekozen = kiesVaarrichting(map, boot, 20, 0, Math.PI, { minRun: 12, maxRun: 60 });
ok(gekozen && gekozen.run >= 12, 'er is een vrije vaarrichting', gekozen && String(gekozen.run));
const richtingRun = gekozen ? bootVrijeRun(map, boot, 20, 0, gekozen.a, 60) : 0;
ok(gekozen && richtingRun >= gekozen.run - 2 && bootVaartVrij(map, boot, 20, 0, gekozen.a), 'de gekozen koers blijft vrij in de eerste meters');

// Een lege sparse-kaart mag geen keuze onthouden; een geladen kaart wel.
const leeg = { store: { keysAround: () => ['0_0'], missing: () => ['0_0'] } };
const geladen = { store: { keysAround: () => ['0_0'], missing: () => [] } };
const metData = (store) => { const m = Object.create(map); m.store = store; return m; };
const leegMap = metData(leeg.store), geladenMap = metData(geladen.store);
ok(!mooringDataVrij(leegMap, 20, 0, 0, 40), 'zonder de tegels onder de koers is de aanlegplaats niet bruikbaar');
ok(mooringDataVrij(geladenMap, 20, 0, 0, 40), 'met de tegels erin wel');
ok(!mooringDataRond(leegMap, 20, 0, 40), 'een leeg gebied rond het anker is niet geladen');
ok(mooringDataRond(geladenMap, 20, 0, 40), 'een geladen gebied wel');
ok(mooringBruikbaar(geladenMap, boot, { x: 20, y: 0, a: 0, run: 40 }), 'een geldige plek is bruikbaar');
ok(!mooringBruikbaar(leegMap, boot, { x: 20, y: 0, a: 0, run: 40 }), 'op een lege kaart niet');
ok(!mooringBruikbaar(geladenMap, boot, { x: 20, y: 13.5, a: Math.PI / 2, run: 40 }), 'een plek tegen de kade niet');
ok(!B.bootVrijeRun(map, boot, 20, 13.5, Math.PI / 2, 20), 'tegen de kade is er geen vrije run');

// De heist-bedrading: de boot kiest een vrije koers, controleert de kaartstand en draait na de
// startscène bij als de neus toch tegen de wal staat.
const heist = fs.readFileSync(new URL('../game/js/heist.js', import.meta.url), 'utf8');
ok(/bootVaartVrij\(map, probe, x, y, a\)/.test(heist), 'de aanlegplaats eist een vrije romp');
ok(/bootVrijeRun\(map, probe, x, y, a, 60\)/.test(heist), 'en een vrije run vooruit');
ok(/mooringDataVrij\(map, best\.x, best\.y, best\.a, best\.run\)/.test(heist), 'de keuze wordt pas bewaard als de kaart geladen is');
ok(/bootVrijeRun\(world\.map, boat, boat\.x, boat\.y, boat\.angle, 30\)/.test(heist) && /kiesVaarrichting\(world\.map, boat, boat\.x, boat\.y, boat\.angle/.test(heist), 'na de startscène wordt de koers gecontroleerd en zo nodig gedraaid');
ok(/S\.wachtBoot = \(S\.wachtBoot \|\| 0\) \+ \(dt \|\| 0\)/.test(heist) && /return S\.wachtBoot > 8;/.test(heist), 'de missie wacht kort op de boot als de kaart nog laadt');
ok(/function warmMooring\(world\)/.test(heist) && /warmMooring\(world\);/.test(heist), 'de tegels rond de aanlegplaats worden opgevraagd zodra de ontsnapping begint');

// De boot botsing: kadebebouwing is geen muur in het water, een woonboot wel.
const vehicle = fs.readFileSync(new URL('../game/js/vehicle.js', import.meta.url), 'utf8');
ok(/if \(v\.isBoat && b\.type !== 'houseboat'\) continue;/.test(vehicle), 'een boot negeert kadebebouwing maar niet een woonboot');

console.log(fails ? `${fails} van ${n} heistboot-checks mislukt` : `heistboot_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
