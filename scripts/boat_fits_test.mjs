// Past een boot bij het water (#436)? Een sloep hoort niet in een sloot of een plasje, een kano wel.
//   node scripts/boat_fits_test.mjs
import './node3d.mjs';
const { boatFitsWater, WATER_KINDS } = await import('../game/js/waterlevels.js');
const { BOAT_KINDS } = await import('../game/js/boattypes.js');

let n = 0, fails = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${naam}${info ? ' (' + info + ')' : ''}`); } };

// een rechthoekig water met de diepte en klasse van zijn soort
const poly = (breed, lang, kind = 'diep') => ({ kind, dp: WATER_KINDS[kind].depth, nav: WATER_KINDS[kind].nav, pts: [[0, 0], [breed, 0], [breed, lang], [0, lang]] });
const boot = (k) => BOAT_KINDS[k];

// sloot: 4 m breed, 60 m lang, diepte 0,6, klasse 1
const sloot = poly(4, 60, 'sloot');
ok(!boatFitsWater(sloot, boot('sloep')), 'een sloep past niet in een sloot');
ok(boatFitsWater(sloot, boot('kano')), 'een kano past wel in een sloot');
ok(boatFitsWater(sloot, boot('sup')), 'een sup past wel in een sloot');

// vijver: 40 x 30, diepte 1,5, klasse 1
const vijver = poly(40, 30, 'vijver');
ok(!boatFitsWater(vijver, boot('sloep')), 'een sloep past niet op een vijver (klasse)');
ok(boatFitsWater(vijver, boot('kano')), 'een kano past op een vijver');

// een plasje van 5 x 4 m: te klein voor een sloep, groot genoeg voor een kano
const plas = poly(5, 4, 'diep');
ok(!boatFitsWater(plas, boot('sloep')), 'een sloep past niet in een plasje');
ok(boatFitsWater(plas, boot('sup')), 'een sup past nog in een plasje');

// kanaal: 30 m breed, 400 m lang, diepte 4,5, klasse 4
const kanaal = poly(30, 400, 'kanaal');
ok(boatFitsWater(kanaal, boot('sloep')), 'een sloep past op een kanaal');
ok(boatFitsWater(kanaal, boot('rondvaart')), 'een rondvaartboot past op een kanaal');
ok(boatFitsWater(kanaal, boot('spits')), 'een binnenvaartschip past op een kanaal');

// onzin valt af
ok(!boatFitsWater(null, boot('sloep')), 'geen water: nee');
ok(!boatFitsWater({ pts: [] }, boot('sloep')), 'leeg water: nee');
ok(!boatFitsWater(kanaal, null), 'geen boot: nee');
ok(!boatFitsWater({ kind: 'sloot', pts: [[0, 0], [1, 0], [0, 1]] }, boot('kano')), 'een driehoekje van een meter: nee');

// een water zonder eigen dp/nav valt terug op zijn soort
const kaal = { kind: 'diep', pts: kanaal.pts };
ok(boatFitsWater(kaal, boot('sloep')), 'zonder dp/nav gelden de waarden van de soort');

console.log(`boat_fits: ${n - fails}/${n} checks passed`);
process.exit(fails ? 1 : 0);
