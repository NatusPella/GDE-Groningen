// #960: Tessa en Tammo zeggen niet bij elke missie hetzelfde paar. De
// terugval voor een missie die te vroeg start varieert per missie (variant), en
// de dagafsluitende regel "wij tweeën tegen de rest" hoort alleen bij de echte
// laatste missie van de dag.
//   node scripts/duo_repeat_test.mjs
import './node3d.mjs';
const { duoFor, dayClosePair, DUO_BY_STAGE } = await import('../game/js/missionstory.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const text = (lines) => (lines || []).map((l) => l[1]).join(' | ');

// De vroege terugval is per missie anders.
const intros = [];
for (let variant = 0; variant < 8; variant++) intros.push(text(duoFor(DUO_BY_STAGE.length - 1, 'intro', { variant })));
ok(new Set(intros).size >= 3, 'de vroege terugval varieert per missie', String(new Set(intros).size));
ok(!intros.some((t) => /tegen de rest/i.test(t)), 'de dagafsluitende regel komt niet bij vroege missies', intros.find((t) => /tegen de rest/i.test(t)) || '');
ok(intros.every((t) => t.length > 4), 'elke variant heeft echt tekst');

const outros = [];
for (let variant = 0; variant < 8; variant++) outros.push(text(duoFor(DUO_BY_STAGE.length - 1, 'outro', { variant })));
ok(new Set(outros).size >= 3, 'ook de outro varieert');
ok(!outros.some((t) => /tegen de rest/i.test(t)), 'en de outro zegt de dagregel niet');

// De echte dagafsluiting houdt de regel.
ok(/laatste klus/i.test(text(dayClosePair('intro'))) && /voor vandaag/i.test(text(dayClosePair('intro'))), 'de echte dagafsluiting zegt "laatste klus"');
ok(text(DUO_BY_STAGE[DUO_BY_STAGE.length - 1].outro).includes('tegen de rest'), 'de regel staat nog in de tabel voor de dagafsluiting');

// In orde: het paar van die stage blijft ongewijzigd.
ok(text(duoFor(0, 'intro')) === text(DUO_BY_STAGE[0].intro), 'in volgorde verandert er niets');
ok(text(duoFor(3, 'outro', { variant: 99 })) === text(DUO_BY_STAGE[3].outro), 'een vroege variant raakt de gewone stages niet');

console.log(`${n - fails}/${n} duo_repeat`);
process.exit(fails ? 1 : 0);
