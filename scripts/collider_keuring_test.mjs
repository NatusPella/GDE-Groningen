// Test van de collider-keuring (#502): een nep-wereld met één collider mét en
// één zónder tekengeometrie. De keuring moet de tweede als verdacht aanwijzen
// en de eerste met rust laten — en ook het omgekeerde zien (tekenwerk dat je
// niet ziet maar wel blokkeert) en een lijncollider die maar half gedekt is.
//
//   node scripts/collider_keuring_test.mjs
//
// Geen three.js en geen wereld: dit test de kern (keur/steekproeven/rapport),
// niet de bronnen. Die leest scripts/collider_keuring.mjs uit de echte wereld.
import { keur, steekproeven, dekt, rapport } from './collider_keuring.mjs';

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ` (${info})` : ''}`); } };

// --- 1. de nep-wereld: één collider met mesh, één zonder ----------------------
{
  const colliders = [
    { soort: 'paal', x: 10, y: 0, r: 0.2, bron: 'nep' },   // heeft een mesh
    { soort: 'paal', x: 30, y: 0, r: 0.2, bron: 'nep' },   // heeft er geen
  ];
  const teken = [{ soort: 'paal', x: 10, y: 0, r: 0.2 }];
  const u = keur(colliders, teken);
  ok(u.n === 2, 'de keuring ziet beide colliders', `${u.n}`);
  ok(u.gedekt === 1, 'één collider is gedekt', `${u.gedekt}`);
  ok(u.verdacht.length === 1, 'één collider is verdacht', `${u.verdacht.length}`);
  ok(u.verdacht[0].x === 30 && u.verdacht[0].y === 0, 'de collider zonder mesh is de verdachte', JSON.stringify(u.verdacht[0]));
  ok(u.verdacht[0].dekking === 0, 'de verdachte heeft dekking 0', `${u.verdacht[0].dekking}`);
  ok(u.verdacht[0].dichtstbij === null, 'er is geen tekenwerk in de buurt', `${u.verdacht[0].dichtstbij}`);
  ok(u.onzichtbaar.length === 0, 'er is niets onzichtbaars gedekt');
}

// --- 2. het omgekeerde: tekenwerk dat je niet ziet maar wel blokkeert -------
{
  const colliders = [{ soort: 'kraam', x: 0, y: 0, r: 0.5 }];
  const teken = [{ soort: 'kraam', x: 0, y: 0, r: 0.5, zichtbaar: false }];
  const u = keur(colliders, teken);
  ok(u.verdacht.length === 0, 'een onzichtbaar mesh dekt de collider wel (geen tweede melding)');
  ok(u.onzichtbaar.length === 1, 'het onzichtbare tekenwerk met botsvolume wordt gemeld', `${u.onzichtbaar.length}`);
  ok(u.onzichtbaar[0].soort === 'kraam', 'met de juiste soort', u.onzichtbaar[0].soort);
}

// --- 3. een lijncollider wordt langs zijn hele lengte gekeurd ----------------
{
  const hek = { soort: 'hek', x: 0, y: 0, r: 0.1, half: 10, angle: 0 };
  // drie stukken heg van 8 m dekken de 20 m
  const teken = [
    { soort: 'hek', x: -7, y: 0, r: 4 },
    { soort: 'hek', x: 0, y: 0, r: 4 },
    { soort: 'hek', x: 7, y: 0, r: 4 },
  ];
  const u = keur([hek], teken);
  ok(u.verdacht.length === 0, 'een volledig gedekt hek is niet verdacht', `${u.verdacht.length}`);
  // en met alleen het linker stuk blijft er een gat over
  const u2 = keur([hek], teken.slice(0, 1));
  ok(u2.verdacht.length === 1, 'een hek met een gat is verdacht', `${u2.verdacht.length}`);
  ok(u2.verdacht[0].dekking < 0.6, 'de dekking zakt onder de grens', `${u2.verdacht[0].dekking}`);
  ok(steekproeven(hek).length > 10, 'de steekproef neemt meer dan tien punten op een hek van 20 m', `${steekproeven(hek).length}`);
}

// --- 4. een gebouw keurt op zijn muren, niet op het middelpunt ---------------
{
  // U-vorm: het midden van de omhullende doos ligt in de binnenplaats
  const pts = [[0, 0], [10, 0], [10, 10], [7, 10], [7, 3], [3, 3], [3, 10], [0, 10]];
  const colliders = [{ soort: 'gebouw', x: 5, y: 5, pts, r: 5 }];
  const teken = [{ soort: 'gebouw', x: 5, y: 5, pts }];
  const u = keur(colliders, teken);
  ok(u.verdacht.length === 0, 'een U-vormig gebouw dekt zijn eigen muren', `${u.verdacht.length}`);
  // zonder mesh is elke muur ongedekt
  const u2 = keur(colliders, []);
  ok(u2.verdacht.length === 1 && u2.verdacht[0].dekking === 0, 'zonder mesh is het gebouw verdacht', `${u2.verdacht.length}`);
  ok(dekt({ soort: 'gebouw', pts }, 5, 3, 0.1), 'een punt op de muur valt binnen het profiel');
}

// --- 5. strikt: een stuk leuning verderop dekt het gat niet ------------------
{
  const colliders = [{ soort: 'leuning', x: 0, y: 0, r: 0.12, half: 1, angle: 0, bron: 'nep' }];
  // het volgende stuk leuning staat 1,6 m verderop: met de losse marge lijkt het
  // gat gedekt, met de strikte regel niet (dit is de onzichtbare leuning van
  // de playtest: het celmesh liet de sectie weg maar resolveRailings hield hem)
  const teken = [{ soort: 'leuning', x: 1.6, y: 0, r: 1.1 }];
  ok(keur(colliders, teken).verdacht.length === 0, 'los telt de buurleuning mee');
  ok(keur(colliders, teken, { strikt: true }).verdacht.length === 1, 'strikt telt alleen de eigen sectie');
}

// --- 6. het rapport noemt de plek, de soort en de reden ---------------------
{
  const u = keur([{ soort: 'paal', x: 12.345, y: -6.789, r: 0.2, bron: 'nep' }], []);
  const regels = rapport([{ naam: 'nep:bron', waarom: 'test', colliders: [{ soort: 'paal', x: 12.345, y: -6.789 }], uitkomst: u }]);
  const tekst = regels.join('\n');
  ok(tekst.includes('(12.3, -6.8)'), 'het rapport rondt de coördinaat af', tekst.split('\n').find((r) => r.includes('12.3')) || tekst);
  ok(tekst.includes('paal'), 'het rapport noemt de soort');
  ok(tekst.includes('geen tekenwerk in de buurt'), 'het rapport zegt waarom');
  ok(tekst.includes('nep:bron'), 'het rapport noemt de bron');
}

console.log(`${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
