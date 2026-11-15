// #958: uit het water klimmen gebeurt bij de waterkant, niet meters landinwaarts.
// De oude regel zocht een droog punt binnen 1,3 m en schoof dat nog eens 0,5 m naar
// binnen; bij een kade klom de speler dan door de kademuur omhoog. Deze test draait
// findClimbSpot op een nepkaart met een rechte kade en een grasoever:
//  - de klimplek ligt 0,4 m achter de waterkant, ook als de zwemmer verder weg is;
//  - de richting waarin hij kijkt wint;
//  - een gebouw op de kade is geen klimplek;
//  - een grasoever heet `bank` (daar loopt hij zo uit), een kade niet;
//  - zonder oever binnen bereik is er geen klimplek.
//   node scripts/zwemklim_test.mjs
import './node3d.mjs';

const { findClimbSpot } = await import('../game/js/player.js');

let n = 0, bad = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

// water: x < 0. De kade staat op x = 0.
const water = { pts: [[-60, -60], [0, -60], [0, 60], [-60, 60]] };
const green = [];
const buildings = [];
const map = {
  water: [water],
  waterNear: () => [water],
  greenNear: () => green,
  buildingsNear: () => buildings,
};

const near = (a, b, tol = 0.25) => Math.abs(a - b) <= tol;
const s = findClimbSpot(map, -0.8, 0, 0);
ok(!!s, 'er is een klimplek bij de kade');
if (s) {
  ok(near(s.x, 0.4, 0.3), 'de klimplek ligt 0,4 m achter de waterkant', `x=${s.x.toFixed(2)}`);
  ok(near(s.y, 0, 0.5), 'de klimplek ligt recht voor de zwemmer', `y=${s.y.toFixed(2)}`);
  ok(s.bank === false, 'een kade is geen grasoever');
}

// een zwemmer verder van de kade: de plek schuift niet mee het land op
const far = findClimbSpot(map, -1.2, 0, 0);
ok(!!far && near(far.x, 0.4, 0.3), 'de klimplek blijft bij de waterkant, ook verder weg', far ? `x=${far.x.toFixed(2)}` : 'geen');

// kijken naar de andere kant: de dichtstbijzijnde oever wint op de kijkrichting
const away = findClimbSpot(map, -0.8, 0, Math.PI);
ok(!!away && near(away.x, 0.4, 0.3), 'de kade achter de rug is nog steeds de klimplek', away ? `x=${away.x.toFixed(2)}` : 'geen');

// gebouw op de kade: geen klimplek
buildings.push({ pts: [[0.1, -6], [6, -6], [6, 6], [0.1, 6]], bounds: [0.1, -6, 6, 6], type: 'yes' });
ok(findClimbSpot(map, -0.8, 0, 0) === null, 'een gebouw op de kade blokkeert de klimplek');
buildings.length = 0;

// grasoever: bank = true
green.push({ pts: [[0, -60], [60, -60], [60, 60], [0, 60]], bounds: [0, -60, 60, 60] });
const bank = findClimbSpot(map, -0.8, 0, 0);
ok(!!bank && bank.bank === true, 'een grasoever is een bank (daar loopt hij zo uit)');
green.length = 0;

// midden op ruim water: geen oever binnen klimbereik
ok(findClimbSpot(map, -40, 0, 0) === null, 'zonder oever binnen bereik is er geen klimplek');

// en de klim zelf: de speler komt op de oever uit, niet in het gebouw
console.log(bad ? `${bad} van ${n} mislukt` : `zwemklim_test: ok (${n} controles)`);
process.exit(bad ? 1 : 0);
