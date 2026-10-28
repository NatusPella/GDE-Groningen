// Vliegschool (#502): het waypoint staat bij de balie aan de Machlaan, de leskist blijft op het platform.
// De school had één plek voor twee dingen: `stand()` koos een open stuk naast de baan (het platform, want
// "ver van de autoweg" won met factor 30) en diezelfde plek was het waypoint, de kaartmarker en de plek waar
// de speler na een les terugkwam. Nu zijn het er twee: `baliePlek()` bij de ingang en `lesPlek()` op het veld.
// Deze test bewijst dat de balie bij de ingang staat (droog, vrij en begaanbaar), dat de leskist op het veld
// blijft en dat de activiteit (standactivity.spots()) de balie volgt en niet het veld.
//   node scripts/vliegschool_stand_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import './node3d.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const plekken = JSON.parse(fs.readFileSync(path.join(ROOT, 'game/vliegplekken.json'), 'utf8'));
const { loadCityWorld } = await import('./lib/loadworld.mjs');
const { makeStrip } = await import('../game/js/planecontrol.js');
const { isInWater, pointInPolygon } = await import('../game/js/util.js');
const { VLIEGSCHOOL, baliePlek, lesPlek } = await import('../game/js/vliegschool.js');

let n = 0, bad = 0;
const check = (naam, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', naam, info); } };
const afstand = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// De ingang van het veld aan de Machlaan en de kiosk van Rotor Roelf ernaast (shops.js, HELI_DEALER):
// de balie hoort bij een van beide, niet op de strip 135 m verderop.
const MACHLAAN = { x: 1758.3, y: 9967.9 };
const KIOSK = { x: 1759.1, y: 9967.18 };
// De vliegveldzone rond Eelde: dezelfde straal waarbinnen helirun.js een toestel "bij Eelde" vindt.
const ZONE = 400;

const { map } = await loadCityWorld();
const inGebouw = (x, y) => (map.buildingsNear ? map.buildingsNear(x, y, 0.5) : []).some((b) => {
  const [x0, y0, x1, y1] = b.bounds;
  return x >= x0 && x <= x1 && y >= y0 && y <= y1 && pointInPolygon(x, y, b.pts);
});

// Het platform: een grasstrook van dezelfde maat als de eigen baan (planeflight.js), 135 m van de ingang.
// Het spel geeft die strook als `w.planeStrip` mee; de test doet hetzelfde, zodat lesPlek() de echte weg kiest.
const platform = { x: plekken.eelde.x + 135, y: plekken.eelde.y };
const strip = makeStrip({ x: platform.x, y: platform.y, heading: 0.4, length: 520, width: 34 });
const world = { map, planeStrip: strip, player: { x: platform.x, y: platform.y } };

const balie = baliePlek(world);
const les = lesPlek(world);

// (a) de balie: bij de ingang of de kiosk, en op een plek waar je kunt staan en weglopen
const dIngang = Math.min(afstand(balie, MACHLAAN), afstand(balie, KIOSK));
check('de balie ligt binnen 40 m van de Machlaan-ingang of de kiosk', dIngang <= 40, `${dIngang.toFixed(1)} m`);
check('de balie staat niet in een gebouw', !inGebouw(balie.x, balie.y), JSON.stringify(balie));
check('de balie staat niet in het water', !isInWater(map, balie.x, balie.y), JSON.stringify(balie));
check('de balie is begaanbaar (je kunt er weglopen)', !map.isOpenSpot || map.isOpenSpot(balie.x, balie.y), JSON.stringify(balie));

// (b) de leskist: nog steeds op het veld, niet bij de ingang
const dEelde = afstand(les, plekken.eelde);
check('de leskist staat binnen de vliegveldzone rond Eelde', dEelde <= ZONE, `${dEelde.toFixed(0)} m van eelde`);
check('de leskist staat bij de strip van het platform', afstand(les, platform) <= 100, `${afstand(les, platform).toFixed(0)} m van het midden van de strip`);
check('de leskist staat niet bij de balie (het platform is een andere plek)', afstand(les, balie) > 40, `${afstand(les, balie).toFixed(0)} m`);
check('de leskist staat niet in een gebouw', !inGebouw(les.x, les.y), JSON.stringify(les));
check('de leskist staat niet in het water', !isInWater(map, les.x, les.y), JSON.stringify(les));

// (c) de activiteit: de kaartmarker, het waypoint en de E-prompt volgen de balie
VLIEGSCHOOL.init(world); // zet worldRef, net als activities.js bij het laden van de wereld
const dbg = globalThis.__vliegschool;
const spot = VLIEGSCHOOL.spots()[0];
check('de activiteitsplek (spots) is de balie', afstand(spot, balie) < 0.01, `${afstand(spot, balie).toFixed(1)} m van de balie`);
check('de activiteitsplek is niet het veld', afstand(spot, les) > 40, `${afstand(spot, les).toFixed(0)} m van de leskist`);
check('de oude naam stand() (debug spot) wijst ook naar de balie', afstand(dbg.spot(), balie) < 0.01, `${afstand(dbg.spot(), balie).toFixed(1)} m`);
check('de debug geeft de leskist apart (lesSpot)', afstand(dbg.lesSpot(), les) < 0.01, `${afstand(dbg.lesSpot(), les).toFixed(1)} m`);

console.log(bad ? `vliegschool_stand_test: ${bad} van ${n} mislukt` : `vliegschool_stand_test: alles goed (${n} controles)`);
process.exit(bad ? 1 : 0);
