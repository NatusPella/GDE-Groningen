// Wrakken opruimen (#436): de verste van elke speler eerst, wat van een speler is blijft.
//   node scripts/wrakopruim_test.mjs
import { kiesWrakkenVoorOpruimen, MAX_WRAKKEN } from '../game/js/wrakopruim.js';

let n = 0, fout = 0;
const check = (naam, ok, info = '') => { n++; if (!ok) { fout++; console.log('FAIL', naam, info); } };

const wrak = (id, x, y, extra = {}) => ({ id, x, y, wrecked: true, model: { name: 'hatch' }, ...extra });
const host = { x: 0, y: 0, host: true };
const gast = { x: 500, y: 0, host: false };

// Niets boven de grens: niets opruimen.
check('onder de grens blijft alles staan', kiesWrakkenVoorOpruimen([wrak('a', 0, 0)], [host]).length === 0);
check('precies op de grens blijft alles staan', kiesWrakkenVoorOpruimen(Array.from({ length: MAX_WRAKKEN }, (_, i) => wrak('w' + i, i, 0)), [host]).length === 0);
check('lege lijst geeft niets', kiesWrakkenVoorOpruimen([], [host]).length === 0 && kiesWrakkenVoorOpruimen(null, [host]).length === 0);

// De verste eerst; alleen wat boven de grens ligt.
{
  const lijst = Array.from({ length: MAX_WRAKKEN }, (_, i) => wrak('dicht' + i, 2 + i, 0)).concat([wrak('ver1', 300, 0), wrak('ver2', 900, 0)]);
  const weg = kiesWrakkenVoorOpruimen(lijst, [host]);
  check('net zoveel weg als er te veel is', weg.length === lijst.length - MAX_WRAKKEN, 'kreeg ' + weg.length);
  check('de verste twee gaan', weg.map((v) => v.id).sort().join() === 'ver1,ver2', weg.map((v) => v.id).join());
  check('niets dichtbij gaat weg', !weg.some((v) => v.id.startsWith('dicht')));
}

// Samen spelen: een wrak naast een gast is dichtbij, ook als de gastheer ver weg is (#429).
{
  const bijGast = Array.from({ length: MAX_WRAKKEN }, (_, i) => wrak('gast' + i, 500 + i, 0));
  const ver = [wrak('ver1', 2000, 0), wrak('ver2', 2400, 0)];
  const weg = kiesWrakkenVoorOpruimen(bijGast.concat(ver), [host, gast]);
  check('alleen de verre wrakken gaan, niet die van de gast', weg.map((v) => v.id).sort().join() === 'ver1,ver2', weg.map((v) => v.id).join());

  // Zonder de gast als focus zouden de wrakken van de gast als "ver" gelden: dat is precies de fout van eerst.
  const alleenHost = kiesWrakkenVoorOpruimen(bijGast.concat(ver), [host]);
  check('zonder foci telt alleen de gastheer (oude, foute regel)', alleenHost.every((v) => v.x >= 500));
}

// Wat van een speler is, blijft staan, ook al staat het ver weg.
{
  const beschermd = [
    wrak('player', 900, 0, { driver: 'player' }),
    wrak('missie', 900, 0, { missionCar: true }),
    wrak('eigen', 900, 0, { playerOwned: true }),
    wrak('garage', 900, 0, { homeStored: true }),
    wrak('escapade', 900, 0, { isHeroCar: true }),
  ];
  const rest = Array.from({ length: MAX_WRAKKEN }, (_, i) => wrak('r' + i, 1 + i, 0));
  const weg = kiesWrakkenVoorOpruimen(rest.concat(beschermd), [host]);
  check('een wrak van de speler gaat nooit weg', weg.length === 0, weg.map((v) => v.id).join());
}

// Zinkende en gezonken wrakken zijn van de zinkregel, niet van deze.
{
  const lijst = Array.from({ length: MAX_WRAKKEN + 6 }, (_, i) => wrak('z' + i, 100 + i, 0, { sinking: i < 2 ? { phase: 'fall' } : undefined, sunk: i >= 2 && i < 4 }));
  const weg = kiesWrakkenVoorOpruimen(lijst, [host]);
  check('zinkende en gezonken wrakken tellen niet mee', weg.every((v) => !v.sinking && !v.sunk));
  check('de rest wordt wel opgeruimd', weg.length === 2, 'kreeg ' + weg.length);
}

// Een wrak zonder bruikbare plek mag als eerste weg (en levert geen NaN op).
{
  const lijst = Array.from({ length: MAX_WRAKKEN }, (_, i) => wrak('n' + i, 1, 0)).concat([wrak('kapot', NaN, NaN)]);
  const weg = kiesWrakkenVoorOpruimen(lijst, [host]);
  check('een wrak met een kapotte plek gaat voor', weg.length === 1 && weg[0].id === 'kapot', weg.map((v) => v.id).join());
}

// max=0 ruimt alles op wat mag; een negatieve grens ruimt ook alles op en blijft heel.
{
  const lijst = [wrak('a', 0, 0), wrak('b', 1, 0), wrak('p', 2, 0, { driver: 'player' })];
  check('grens nul: alles wat mag weg', kiesWrakkenVoorOpruimen(lijst, [host], 0).map((v) => v.id).sort().join() === 'a,b');
  check('negatieve grens blijft heel', kiesWrakkenVoorOpruimen(lijst, [host], -3).length === 2);
}

console.log(`wrakopruim_test: ${n - fout}/${n}`);
process.exit(fout ? 1 : 0);
