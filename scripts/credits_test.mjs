// Credits (#credits): iedereen die meehielp staat erin, op volgorde van bijdrage, en
// niemand die in docs/CREDITS.md staat mag ontbreken. Geen echte namen van anderen dan
// de eigenaar (constitution 4), geen merken van andere games.
//   node scripts/credits_test.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { CONTRIBUTORS, AI_ASSISTENTS, CREDITS_HTML, THIRD_PARTY_CARDS } from '../game/js/credits.js';

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n += 1; };
const lees = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');

ok(Array.isArray(CONTRIBUTORS) && CONTRIBUTORS.length >= 8, 'de contributielijst is gevuld');
ok(CONTRIBUTORS[0].who === 'NatusPella', 'de maker staat bovenaan');
ok(CONTRIBUTORS.every((c) => c.who && c.role), 'iedere regel heeft een naam en een rol');

const docs = lees('docs/CREDITS.md');
for (const c of CONTRIBUTORS) {
  ok(docs.includes(c.who), `docs/CREDITS.md noemt ${c.who}`);
  ok(CREDITS_HTML.includes(c.who), `de in-game credits noemen ${c.who}`);
}

// De namen uit de docstabel die in de code horen te staan; de bronnen staan in NOTICE.md.
for (const naam of ['astnagrath', 'pixel-maus', 'alexkramer98', 'Teungritter', 'MathijsG', 'ArmEagle', 'wisskid', 'Agnilor', 'jonathanbuist']) {
  ok(docs.includes(naam), `docs/CREDITS.md noemt ${naam}`);
}
ok(AI_ASSISTENTS.length >= 5, 'de tech-stack noemt de AI-assistenten');
for (const [who] of AI_ASSISTENTS) {
  ok(docs.includes(who.split(' (')[0]), `docs/CREDITS.md noemt ${who}`);
  ok(!CONTRIBUTORS.some((c) => c.who === who), `${who} staat niet bij de credits`);
}
ok(CREDITS_HTML.includes('AI-assistenten'), 'de in-game credits noemen de AI-hulp als tech-stack');

ok(new Set(CONTRIBUTORS.map((c) => c.who)).size === CONTRIBUTORS.length, 'geen dubbele regels');
ok(THIRD_PARTY_CARDS.some(([t]) => t === 'NatusPella'), 'de aftiteling noemt de maker');
ok(THIRD_PARTY_CARDS.some(([t]) => t.startsWith('astnagrath')), 'de aftiteling noemt de testers');

const verboden = new RegExp('(^|[^a-z0-9])(GTA|GTE|Grand Theft|Rockstar|Take-Two)([^a-z0-9]|$)|Alexander Buist', 'i');
ok(!verboden.test(CREDITS_HTML + JSON.stringify(CONTRIBUTORS)), 'geen merknaam of echte naam in de credits');

console.log(`credits_test: ${n}/${n} ok`);
