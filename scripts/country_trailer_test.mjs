// #823: langs een trekker in het Ommeland werd je (en de trekker) stilgezet.
// De contactdoos van de aanhangwagen stond op de trekker zelf in plaats van 6,4 m
// erachter; elke frame raakte de speler die spookdoos, verloor de helft van zijn
// snelheid en zette de trekker stil. Deze test toetst de doos op de echte plek.
//   node scripts/country_trailer_test.mjs
import './node3d.mjs';
const { bodyContact, TRAILER_BACK } = await import('../game/js/countrylife.js');

let n = 0, fails = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${naam}${info ? ' (' + info + ')' : ''}`); } };

// Een echte trekker met aanhangwagen: de trailerdoos is [-2.5, 2.5] rond zijn eigen
// midden, dat 6,4 m achter de trekker hangt. De trekker zelf botst als echt voertuig.
const tractor = () => ({ yaw: 0, body: [-9, 6, 1.5], trailer: [-2.5, 2.5, 1.2], veh: {}, speed: 5 });
const world = (x, y) => {
  const v = { x, y, angle: 0, halfLen: 2, halfWid: 0.9, speed: 20 };
  return { player: { x, y, inVehicle: v }, v, pigeonMode: false };
};

// 1. de spookdoos: 1 m achter de trekker (in de trekker zelf, niet in de trailer) is
//    geen trailercontact; herhaald aanduwen mag de speler niet afremmen.
{
  const a = tractor(), w = world(-1, 0);
  for (let i = 0; i < 10; i++) bodyContact(a, 0, 0, w);
  ok(w.v.speed === 20, 'achter de trekker langs: de speler houdt zijn snelheid', String(w.v.speed));
  ok(a.speed === 5, 'en de trekker wordt niet stilgezet', String(a.speed));
}

// 2. in de andere baan naast de trekker: vrij doorrijden
{
  const a = tractor(), w = world(-1, 2.2);
  bodyContact(a, 0, 0, w);
  ok(w.v.speed === 20 && a.speed === 5, 'in de andere baan langs de trekker: geen contact');
}

// 2b. de hele inhaalmanoeuvre: van achteren naar voren in de andere baan, elke frame
//     opnieuw getoetst. De trekker en de speler blijven gewoon rijden.
{
  const a = tractor(), w0 = world(-8, 2.2);
  for (let x = -8; x <= 8; x += 0.5) { w0.v.x = x; w0.player.x = x; bodyContact(a, 0, 0, w0); }
  ok(w0.v.speed === 20, 'tijdens het inhalen houdt de speler zijn snelheid', String(w0.v.speed));
  ok(a.speed === 5, 'en de trekker rijdt door', String(a.speed));
}

// 3. de echte aanhangwagen: wie hem raakt, wordt afgeremd en de trekker stopt
{
  const a = tractor(), w = world(-TRAILER_BACK, 0);
  bodyContact(a, 0, 0, w);
  ok(w.v.speed === 10, 'de aanhangwagen raken remt de speler af', String(w.v.speed));
  ok(a.speed === 0, 'en zet de trekker stil', String(a.speed));
}

// 4. de doos hangt echt achter de trekker, niet erop
ok(TRAILER_BACK > 5, 'de aanhangwagen hangt meters achter de trekker', String(TRAILER_BACK));

console.log(`country_trailer_test: ${fails ? fails + ' FAILED' : 'ok'} (${n} checks)`);
process.exit(fails ? 1 : 0);
