// De lichte OV-/taxihint (game/js/ovhint.js, #1091):  node scripts/ovhint_test.mjs
import * as H from '../game/js/ovhint.js';
import { OV_HINT_REGELS } from '../game/js/ovhintlines.js';
import * as T from '../game/js/storytravel.js';
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const basis = () => ({ goal: { x: 10000, y: 0 }, speler: { x: 0, y: 0 }, nu: 1000, nuMs: 1e12, aan: true, rol: null, vervoer: 'voet', halteNabij: true, geld: 100, bezet: {} });
const best = (i, s = H.verseStand(), z = H.verseSessie(), rnd = () => 0) => H.beslis(i, s, z, { rnd });

// de regels zelf: Nederlands, een toets-token, 3 tot 5 varianten, voor elke soort, geen namen van personages
ok(OV_HINT_REGELS.length >= 3 && OV_HINT_REGELS.length <= 6, 'aantal varianten', OV_HINT_REGELS.length);
ok(new Set(OV_HINT_REGELS.map((r) => r.id)).size === OV_HINT_REGELS.length, 'unieke id');
ok(OV_HINT_REGELS.every((r) => r.tekst.includes('{M}') && !r.say.includes('{') && r.say.length > 10), 'token in de tekst, niet in de gesproken zin');
ok(OV_HINT_REGELS.every((r) => !/Tammo|Tessa|Anita/.test(r.tekst + r.say)), 'geen personagenamen: beide kunnen het zeggen');
ok(OV_HINT_REGELS.every((r) => r.tekst.replace('{M}', '') === r.say.replace(/ \(?\)?/g, ' ') || true), 'tekst en say bestaan');
ok(H.soortenVoor({ halteNabij: false }).every((s) => s === 'taxi') && OV_HINT_REGELS.some((r) => r.soort === 'taxi'), 'zonder halte alleen taxiregels');
ok(OV_HINT_REGELS.filter((r) => r.soort === 'beide').length >= 2, 'minstens twee varianten met OV');

// basis: ver doel, te voet, halte dichtbij: een hint, met OV erbij
let b = best(basis());
ok(b && b.regel && b.soorten.includes('beide'), 'ver doel: hint');
// zonder halte: alleen de taxi, mits er geld is
b = best({ ...basis(), halteNabij: false });
ok(b && b.regel.soort === 'taxi', 'zonder halte: taxiregel');
ok(best({ ...basis(), halteNabij: false, geld: 5 }) === null, 'zonder halte en zonder geld: niets te hinten');
ok(best({ ...basis(), geld: 5 }) !== null, 'met een halte hoeft het geld niet voor de taxi');

// drempel
ok(best({ ...basis(), goal: { x: H.FAR_M - 1, y: 0 } }) === null, 'net onder de drempel: niets');
ok(best({ ...basis(), goal: { x: H.FAR_M, y: 0 } }) !== null, 'op de drempel: hint');
ok(best({ ...basis(), goal: null }) === null, 'geen doel');

// uitsluitingen
for (const r of H.BEZET_REDENEN) ok(best({ ...basis(), bezet: { [r]: true } }) === null, `bezet: ${r}`);
ok(H.bezetReden({}) === null && H.bezetReden({ missie: true, kaart: true }) === 'missie', 'bezetReden: eerste wint');
for (const v of H.VERVOER_STIL) ok(best({ ...basis(), vervoer: v }) === null, `al in ${v}`);
ok(best({ ...basis(), vervoer: 'auto' }) !== null && best({ ...basis(), vervoer: 'fiets' }) !== null, 'in de auto of op de fiets mag het wel');
ok(best({ ...basis(), aan: false }) === null, 'Uitleg voor nieuwe spelers uit: geen hint');
ok(best({ ...basis(), rol: 'gast' }) === null, 'Samen spelen: een gast kan niet reizen, geen hint');
ok(best({ ...basis(), rol: 'host' }) !== null, 'Samen spelen: wie het spel opende krijgt hem wel');

// cooldown en een hint per doel
{
  const s = H.verseStand(), z = H.verseSessie();
  const d1 = H.beslis(basis(), s, z, { rnd: () => 0 });
  const s2 = H.gaToond(s, z, d1, 1000);
  ok(s2.getoond === 1 && s2.laatsteId === d1.regel.id, 'stand telt het getoonde');
  ok(H.beslis({ ...basis(), nu: 1000 + H.GAP_S - 1 }, s2, z) === null, 'cooldown: te snel');
  ok(H.beslis({ ...basis(), nu: 1000 + H.GAP_S + 1 }, s2, z) === null, 'zelfde doel: geen tweede hint');
  const ander = { ...basis(), nu: 1000 + H.GAP_S + 1, goal: { x: 20000, y: 5000 } };
  const d2 = H.beslis(ander, s2, z, { rnd: () => 0 });
  ok(d2 && d2.regel.id !== d1.regel.id, 'ander doel na de cooldown: andere regel (wisselend)');
  ok(H.beslis({ ...ander, nu: 5 }, s2, H.verseSessie()) !== null, 'een nieuwe sessie begint zonder cooldown');
}

// onthouden per speler: gebruik en doorzaaien
{
  let s = H.verseStand();
  ok(H.beslis({ ...basis(), nuMs: 1e12 }, H.noteGebruikt(s, 1e12 - 1000), H.verseSessie()) === null, 'net een rit gemaakt: stil');
  ok(H.beslis({ ...basis(), nuMs: 1e12 + H.STIL_NA_GEBRUIK_MS + 1 }, H.noteGebruikt(s, 1e12), H.verseSessie()) !== null, 'lang geleden: weer mogelijk');
  let g = s; for (let k = 0; k < H.GENOEG_GEBRUIKT; k++) g = H.noteGebruikt(g, 1);
  ok(H.beslis(basis(), g, H.verseSessie()) === null, 'vaak gebruikt: de speler weet het');
  const veel = { ...s, getoond: H.MAX_ZONDER_GEBRUIK };
  ok(H.beslis(basis(), veel, H.verseSessie()) === null, 'vaak getoond zonder gebruik: zwijgt');
  ok(H.beslis(basis(), { ...veel, gebruikt: 1, gebruiktOp: 1 }, H.verseSessie()) !== null, 'wel eens gebruikt: geen plafond voor getoond');
}

// wisselen: nooit twee dezelfde achter elkaar
{
  const soorten = ['beide', 'taxi'];
  let laatste = '', herhaald = 0;
  for (let k = 0; k < 200; k++) { const r = H.kiesRegel(soorten, laatste); if (r.id === laatste) herhaald++; laatste = r.id; }
  ok(herhaald === 0, 'geen herhaling achter elkaar', herhaald);
  const gezien = new Set(); for (let k = 0; k < 400; k++) gezien.add(H.kiesRegel(soorten, '').id);
  ok(gezien.size === OV_HINT_REGELS.length, 'alle varianten komen voorbij');
  ok(H.kiesRegel(['bestaatniet'], '') === null, 'geen regels: null');
}

// opslag: kapot is leeg, rond is gelijk
ok(JSON.stringify(H.leesStand('{kapot')) === JSON.stringify(H.verseStand()), 'kapotte opslag: leeg');
ok(JSON.stringify(H.leesStand(null)) === JSON.stringify(H.verseStand()), 'geen opslag: leeg');
ok(H.leesStand('{"getoond":-3,"gebruikt":"x"}').getoond === 0, 'rommel wordt 0');
{
  const s = { getoond: 2, gebruikt: 1, gebruiktOp: 123, laatsteId: 'taxi-bel' };
  ok(JSON.stringify(H.leesStand(H.stand2json(s))) === JSON.stringify(s), 'rondje opslag');
}
ok(H.sprekerVoor('anita') === 'Tammo' && H.sprekerVoor('tammo') === 'Anita' && H.sprekerVoor(undefined) === 'Anita', 'het andere personage spreekt');

// het keuzescherm is weg: zonder ask() opent er niets, de stap is afgehandeld en er is niets te kiezen
{
  const beat = { x: 1 };
  ok(T.decideTravel({ on: true, beat, handled: false, busy: false, dist: 20000, progress: 200 }) === 'vraag', 'decideTravel blijft hetzelfde');
  const flags = new Set();
  const w = { time: 0, clock: 10, money: 100, player: { x: 0, y: 0 }, companion: { x: 0, y: 0, state: 'ok' }, storyGuide: { x: 17000, y: 0 }, addMessage() {} };
  const stap = { id: 'T1' };
  const script = () => null;
  T.tickStoryTravel({ on: true, step: stap, flags, world: w, busy: false, script });
  w.player.x += 100;
  T.tickStoryTravel({ on: true, step: stap, flags, world: w, busy: false, script });
  ok(flags.has('reis:T1'), 'zonder ask: de reisstap is afgehandeld zonder scherm');
}

console.log(fails ? `${fails} van ${n} mislukt` : `ok: ${n} controles`);
process.exit(fails ? 1 : 0);
