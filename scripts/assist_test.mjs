// Pure logica van de hulpopties (game/js/assist.js, #215):  node scripts/assist_test.mjs
import * as A from '../game/js/assist.js';

let fails = 0;
const ok = (c, name, extra) => { if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };

ok(!A.helpActive({}) && !A.helpActive(A.HELP_DEFAULTS), 'standaard is geen hulp');
ok(A.helpActive({ helpTime: 'ruimer' }) && A.helpActive({ helpDamage: 'minder' }) && A.helpActive({ helpGates: 'ruim' }), 'elke hulpkeuze telt');
ok(!A.helpActive({ helpTime: 'onzin', helpDamage: '__proto__', helpGates: 3 }), 'onbekende waarden zijn geen hulp');
ok(A.cleanHelpSetting('helpTime', 'ruim') === 'ruim' && A.cleanHelpSetting('helpTime', 'toString') === 'uit', 'schoonmaken per sleutel');

// tijd
ok(A.scaleTime(60, {}) === 60 && A.scaleTime(60, { helpTime: 'ruimer' }) === 75 && A.scaleTime(58, { helpTime: 'heel ruim' }) === 116, 'tijd schaalt');
ok(A.scaleTime(null, { helpTime: 'ruim' }) === null && A.scaleTime(Infinity, { helpTime: 'ruim' }) === Infinity && A.scaleTime(0, { helpTime: 'ruim' }) === 0, 'geen limiet blijft geen limiet');

// schade
ok(A.scaleDamage(10, {}) === 10 && A.scaleDamage(10, { helpDamage: 'veel minder' }) === 3, 'schade schaalt');

// poorten
const g = { x: 0, y: 0, r: 40, lo: 20, hi: 60 };
ok(A.widenGate(g, {}) === g, 'zonder hulp dezelfde poort');
const w = A.widenGate(g, { helpGates: 'ruim' });
ok(w.r > g.r && w.hi > g.hi && w.lo < g.lo && w.lo >= 0, 'poort ruimer, niet onder de grond', w);
ok((w.lo + w.hi) / 2 === 40 && w.x === 0, 'midden en positie blijven');
ok(A.widenGate({ r: 10, lo: 0, hi: 5 }, { helpGates: 'ruim' }).lo === 0, 'lo 0 blijft 0');

// aanbod
ok(!A.shouldOffer({ fails: 1 }) && A.shouldOffer({ fails: 2 }) && A.shouldOffer({ fails: 5 }), 'aanbod vanaf de tweede mislukking');
ok(!A.shouldOffer({ fails: 3, offered: true }), 'maar een keer per stap');
ok(!A.shouldOffer({ fails: 3, settings: { helpTime: 'ruimer' } }), 'niet als je al hulp hebt');
ok(!A.shouldOffer({ fails: 3, settings: { helpOffer: false } }), 'uit te zetten');
ok(A.offerText('licht').includes('25% meer tijd') && A.offerText('nope').includes('hulp'), 'aanbodtekst');
ok(!/[a-z]\./.test('') && A.offerText().includes('met hulp'), 'tekst noemt het label');

// met-hulp boekhouding
ok(A.markHelped({}, 'm05', {}).m05 === undefined && A.markHelped({}, 'm05', { helpTime: 'ruim' }).m05 === true, 'label alleen met hulp');
ok(A.markHelped({ a: true }, 'b', { helpGates: 'ruim' }).a === true, 'oude labels blijven');
ok(Object.keys(A.cleanHelped({ a: true, b: 'x', c: 1, ['d'.repeat(100)]: true })).join() === 'a', 'rommel eruit gefilterd');
ok(Object.keys(A.cleanHelped(null)).length === 0 && Object.keys(A.cleanHelped('x')).length === 0, 'geen object, leeg');

// voorinstellingen hangen aan geldige waarden
for (const [name, p] of Object.entries(A.HELP_PRESETS)) for (const k of ['helpTime', 'helpDamage', 'helpGates']) ok(A.cleanHelpSetting(k, p[k]) === p[k], `preset ${name}.${k}`);
ok(!A.helpActive(A.HELP_PRESETS.uit) && A.helpActive(A.HELP_PRESETS.licht), 'preset uit/licht');

// de schadehaak zit ook op kogels/klappen (combat.damagePlayer) en op valschade (player.hurtByFall)
import fs from 'node:fs';
const src = (f) => fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');
ok(/damage = assistDamage(damage)/.test(src('combat.js')), 'damagePlayer past de hulp toe');
ok(/assistDamage(Math.min(100/.test(src('player.js')), 'hurtByFall past de hulp toe');

if (fails) { console.log(`${fails} mislukt`); process.exit(1); }
console.log('assist_test: ok');
