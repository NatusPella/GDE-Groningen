// De winkelkit (game/js/winkelkit.js, issue #156): elk winkeltype heeft een
// eigen set (kleuren, inrichting, meubilair, naam), dezelfde seed geeft
// dezelfde winkel, het type volgt uit de ruitrang en de shadertabel klopt.
//   node scripts/winkelkit_test.mjs
import fs from 'node:fs';

const K = await import('../game/js/winkelkit.js');
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails++; console.log('FAIL', msg); } };

const WANTED = ['supermarkt', 'bakker', 'slager', 'snackbar', 'kleding', 'fietsen', 'bloemist', 'kapper', 'elektronica', 'tweedehands', 'souvenir', 'kiosk', 'kermiskraam'];
check(WANTED.every((t) => K.SHOP_KINDS.includes(t)) && K.SHOP_KINDS.length === WANTED.length, 'alle winkeltypen uit het issue');

// elk type een eigen set: geen twee types delen wand + vloer + accent, of het meubilair
const keys = new Set(), furn = new Set();
for (const t of K.SHOP_KINDS) {
  const d = K.WINKEL[t];
  check(d && d.label && d.furniture.length >= 3 && d.etalage && d.names.length === 2, `${t}: complete data`);
  keys.add([d.wall, d.floor, d.accent, d.sign].join('|'));
  furn.add(d.furniture.join('|'));
}
check(keys.size === K.SHOP_KINDS.length, 'elk type een eigen kleurenpalet');
check(furn.size === K.SHOP_KINDS.length, 'elk type eigen meubilair');
const sigs = new Set(K.SHOP_KINDS.map((t) => { const l = K.winkelLook(t, 1); return [l.row.toFixed(2), l.items.toFixed(2), l.floorPattern, l.island.map((v) => v.toFixed(2)).join(',')].join('|'); }));
check(sigs.size >= 9, `de indeling verschilt per type (${sigs.size} verschillende)`);

// zelfde seed, zelfde winkel; andere seeds geven variatie binnen een type
for (const t of K.SHOP_KINDS) {
  for (const seed of [0, 1, 7.5, 123456]) {
    check(JSON.stringify(K.winkelLook(t, seed)) === JSON.stringify(K.winkelLook(t, seed)), `${t}/${seed}: deterministisch`);
  }
  const looks = new Set(Array.from({ length: 40 }, (_, i) => JSON.stringify(K.winkelLook(t, i * 1.37 + 0.2))));
  check(looks.size >= 8, `${t}: variatie per seed (${looks.size})`);
  const names = new Set(Array.from({ length: 60 }, (_, i) => K.winkelNaam(t, i * 0.77 + 0.1)));
  check(names.size >= 3, `${t}: meerdere winkelnamen (${names.size})`);
}

// type uit de rang: alle types komen voor, gevel en shader gebruiken dezelfde afbeelding
const seen = new Set();
for (let l = 0; l < K.SHOP_LEVELS; l++) {
  const rank = (l + 0.5) / K.SHOP_LEVELS;
  check(K.typeOfRank(rank) === K.typeOfLevel(l), `rang ${rank}: type komt uit het niveau`);
  check(K.facadeLook(rank).type === K.typeOfLevel(l), 'gevel gebruikt hetzelfde type');
  seen.add(K.typeOfLevel(l));
}
check(seen.size === K.SHOP_KINDS.length, 'elk type komt in de 32 niveaus voor');
check(K.typeOfLevel(-1) && K.typeOfRank(2) && K.typeOfRank(-3), 'rang buiten bereik blijft geldig');

// shadertabel: een rij per type, alles in 0..1 (of de maat van het meubilair)
const T = K.shaderTable();
for (const k of ['wall', 'floor', 'accent', 'layout']) check(T[k].length === K.SHOP_KINDS.length && T[k].every((r) => r.length === 4 && r.every(Number.isFinite)), `shadertabel ${k}`);
check(T.wall.every((r) => r.slice(0, 3).every((c) => c >= 0 && c <= 1)), 'wandkleuren zijn 0..1');

// geen echte merken in de verzonnen namen
const brands = /albert heijn|\bjumbo\b|\bplus\b|\bcoop\b|lidl|aldi|blokker|action|hema|mediamarkt|coolblue|gall|ikea|swapfiets|\bkruidvat\b|bakker bart|febo|kwalitaria|mcdonald|c&a|zara|h&m|primark/i;
for (const t of K.SHOP_KINDS) for (let i = 0; i < 200; i++) check(!brands.test(K.winkelNaam(t, i * 0.31)), `${t}: merknaam in ${K.winkelNaam(t, i * 0.31)}`);

// de ruit-shader leest dezelfde tabel
const src = fs.readFileSync(new URL('../game/js/interiorglass.js', import.meta.url), 'utf8');
check(/uShopWall\[\$\{SHOP_KINDS\.length\}\]/.test(src) && /shaderTable\(\)/.test(src), 'interiorglass.js gebruikt de winkelkit');
check(/facadeLook/.test(fs.readFileSync(new URL('../game/js/models3d_buildings.js', import.meta.url), 'utf8')), 'de gevel gebruikt de winkelkit');

console.log(fails ? `${fails} failures` : 'ok');
process.exit(fails ? 1 : 0);
