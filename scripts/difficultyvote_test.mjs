// Moeilijkheid bij Samen spelen is een gezamenlijke keuze, geen hostrecht (besluit eigenaar 22-11): de wereldopties (politie, verkeer)
// en het niveau vragen met meer spelers akkoord van de groep; wat van jezelf is, wijzig je zelf.
//   node scripts/difficultyvote_test.mjs
import fs from 'node:fs';
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
const D = await import('../game/js/difficulty.js');
const V = await import('../game/js/difficultyvote.js');
const G = await import('../game/js/coopgroep.js');

let n = 0, fails = 0;
const ok = (c, name, info) => { n++; if (!c) { fails++; console.log('FAIL', name, info !== undefined ? JSON.stringify(info) : ''); } };
const std = { level: 'standaard', custom: {} };

ok(V.WORLD_OPTIONS.join() === 'policeEscape,policeUnits,trafficDensity', 'de wereldopties zijn politie en verkeer', V.WORLD_OPTIONS);
ok(G.STEM_SOORTEN.includes('moeilijkheid') && typeof G.STEM_TEKST.moeilijkheid === 'function', 'de stemming kent de soort moeilijkheid');
ok(/moeilijkheid van de wereld/.test(G.STEM_TEKST.moeilijkheid('Tessa')) && /Tessa/.test(G.STEM_TEKST.moeilijkheid('Tessa')), 'de vraag noemt wie het vraagt en wat er verandert');
ok(/aangepast/.test(G.stemUitslagTekst(true, '', 'moeilijkheid')) && /blijft/.test(G.stemUitslagTekst(false, '', 'moeilijkheid')) && /antwoord/.test(G.stemUitslagTekst(false, 'geen antwoord', 'moeilijkheid')), 'de uitslag zegt wat er gebeurde');

// wat raakt de wereld?
ok(V.touchesWorld({ type: 'option', key: 'policeUnits' }, std) && V.touchesWorld({ type: 'option', key: 'trafficDensity' }, std), 'politie en verkeer raken de wereld');
ok(!V.touchesWorld({ type: 'option', key: 'damageTaken' }, std) && !V.touchesWorld({ type: 'option', key: 'fines' }, std) && !V.touchesWorld({ type: 'option', key: 'timeFactor' }, std) && !V.touchesWorld({ type: 'option', key: 'hints' }, std), 'schade, boete, tijd en hints zijn van jezelf');
ok(V.touchesWorld({ type: 'level', naar: 'uitdagend' }, std) && !V.touchesWorld({ type: 'level', naar: 'standaard' }, std), 'een ander niveau raakt de wereld, hetzelfde niveau niet');
ok(!V.touchesWorld({ type: 'reset' }, { level: 'standaard', custom: { income: 1.25 } }) && V.touchesWorld({ type: 'reset' }, { level: 'standaard', custom: { policeUnits: 1.5 } }), 'terugzetten raakt de wereld alleen als een wereldoptie afweek');
ok(!V.touchesWorld(null) && !V.touchesWorld({ type: 'onzin' }), 'onbekende wijzigingen raken niets');

// alleen: meteen
{
  let k = 0;
  const w = { addMessage() {} };
  ok(V.changeWithGroup(w, { type: 'option', key: 'policeUnits' }, () => k++, std) === true && k === 1, 'alleen: de wijziging gaat meteen door');
}
// host met een gast: stemming, alleen bij ja
{
  let k = 0, vraag = null;
  const w = { coopNet: { role: 'host', hub: { roster: { spelers: [{ slot: 0 }, { slot: 1 }] } } }, addMessage() {}, coopVraag: (soort, tekst, ja) => { vraag = { soort, tekst, ja }; return true; } };
  ok(V.changeWithGroup(w, { type: 'option', key: 'policeUnits' }, () => k++, std) === true && vraag && vraag.soort === 'moeilijkheid' && k === 0, 'host met gast: eerst een stemming, nog niets gewijzigd');
  vraag.ja();
  ok(k === 1, 'na ja gaat de wijziging door');
  vraag = null;
  V.changeWithGroup(w, { type: 'option', key: 'damageTaken' }, () => k++, std);
  ok(vraag === null && k === 2, 'een eigen optie vraagt niemand iets');
}
// gast: kan de wereld niet zelf wijzigen, maar zijn eigen opties wel
{
  let k = 0; const msgs = [];
  const w = { coopNet: { role: 'client' }, addMessage: (t) => msgs.push(t) };
  ok(V.changeWithGroup(w, { type: 'option', key: 'trafficDensity' }, () => k++, std) === false && k === 0 && msgs.length === 1 && msgs[0] === V.WORLD_GUEST_TEXT, 'gast: een wereldoptie wordt geweigerd met een melding');
  ok(V.changeWithGroup(w, { type: 'option', key: 'fines' }, () => k++, std) === true && k === 1, 'gast: een eigen optie gaat gewoon door');
}
// bedrading
{
  const pm = fs.readFileSync(new URL('../game/js/pausemenu.js', import.meta.url), 'utf8');
  ok(/from '\.\/difficultyvote\.js'/.test(pm) && /type: 'level'/.test(pm) && /type: 'reset'/.test(pm) && /type: 'option'/.test(pm), 'pausemenu.js stuurt niveau, optie en reset door de groepsvraag');
}

console.log(fails ? `${fails}/${n} FAIL` : `difficultyvote_test: ${n}/${n} ok`);
process.exitCode = fails ? 1 : 0;
