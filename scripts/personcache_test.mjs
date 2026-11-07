// #658: de voetgangersmesh-cache. De look bepaalt de rompgeometrie; gelijke looks delen één
// geometry (markShared, dus scene3d.disposeObject laat hem staan), verschillende looks bouwen
// apart, en de LRU is begrensd zonder ooit een gedeelde geometry te disposen.
//   node scripts/personcache_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const { buildPersonMesh, releasePersonGeometry, personCacheStats, resetPersonCacheStats, PERSON_TEMPLATE_CACHE_MAX } = await import('../game/js/models3d_people.js');

let n = 0, fails = 0;
const ok = (c, naam, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', naam, extra); } };

const look = { hat: 'beanie', hairStyle: 'bun', bag: 'backpack', bagColor: 0x4a5a4a };
const opts = { seed: 4242, look: { ...look } };

resetPersonCacheStats();
const a = buildPersonMesh(0x3f6ea8, 0xd0a080, opts);
const b = buildPersonMesh(0x3f6ea8, 0xd0a080, opts);
ok(a.userData.body.geometry === b.userData.body.geometry, 'gelijke look deelt de rompgeometrie');
ok(a.userData.body.geometry.userData.shared === true, 'de gedeelde geometry is als shared gemarkeerd');
let s = personCacheStats();
ok(s.hits === 1 && s.misses === 1 && s.builds === 1 && s.size === 1, 'de teller: één bouw, één hergebruik', JSON.stringify(s));

// Een andere look (ander kapsel) bouwt een eigen geometry.
const c = buildPersonMesh(0x3f6ea8, 0xd0a080, { seed: 4242, look: { ...look, hairStyle: 'long' } });
ok(c.userData.body.geometry !== a.userData.body.geometry, 'een andere look krijgt een eigen geometry');
ok(personCacheStats().misses === 2 && personCacheStats().size === 2, 'tweede look is een miss');
// Een andere shirtkleur zit in de vertexkleuren en dus ook in de sleutel.
const d = buildPersonMesh(0x9e3027, 0xd0a080, opts);
ok(d.userData.body.geometry !== a.userData.body.geometry, 'andere shirtkleur is een andere template');

// De cache is begrensd; een geëvictte template blijft leven zolang een voetganger hem gebruikt.
const eerste = a.userData.body.geometry;
for (let i = 0; i < PERSON_TEMPLATE_CACHE_MAX + 10; i++) {
  buildPersonMesh(0x3f6ea8, 0xd0a080, { seed: 4242, look: { ...look, hatColor: 0x100000 + i } });
}
s = personCacheStats();
ok(s.size <= PERSON_TEMPLATE_CACHE_MAX, 'de cache blijft onder de bovengrens', String(s.size));
ok(s.evictions > 0, 'er is geëvict', JSON.stringify(s));
ok(eerste.userData.shared === true && eerste.attributes && eerste.attributes.position, 'de geëvictte geometry leeft door bij de levende peds');
// De laatste gebruiker geeft hem vrij: pas dan dispose, niet bij een gedeelde evictie.
let disposed = false;
const echteDispose = eerste.dispose.bind(eerste);
eerste.dispose = () => { disposed = true; echteDispose(); };
releasePersonGeometry(a);
ok(!disposed, 'nog een levende gebruiker: geen dispose');
releasePersonGeometry(b);
ok(disposed, 'laatste gebruiker weg: nu pas dispose');
releasePersonGeometry(c); releasePersonGeometry(d);
// Broncheck: in de cache-tak staat de dispose alleen achter de refcount.
const bron = fs.readFileSync(new URL('../game/js/models3d_people.js', import.meta.url), 'utf8');
const tak = bron.slice(bron.indexOf('const oud = personGeometries.keys().next().value') - 100, bron.indexOf('const oud = personGeometries.keys().next().value') + 420);
ok(/\.personRefs \|\| 0\) > 0\).*personRetired/.test(tak), 'evictie dispt alleen ongebruikte templates');

console.log(fails ? `${fails} of ${n} personcache checks failed` : `personcache_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
