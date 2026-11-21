// De kapper aan de stoel (game/js/kapperkeuze.js, epic Autotuning ronde 4, #1155): de adapter deelt de kapsels van het kledingsysteem in groepen.
// Pure test. De lijst van 17 stijlen staat hier als vaste kopie van clothinghair.js HAIR_STYLE_IDS in epic-kleding-21-11 (de huidige
// clothinghair.js in deze branch heeft er nog 9: de adapter moet met allebei werken, en met een toekomstig tiende kapsel).
import { HAIR_GROUPS, hairGroups, CUT_LINES, cutKind, cutLine } from '../game/js/kapperkeuze.js';
import { HAIR_STYLE_IDS, HAIR_STYLES } from '../game/js/clothinghair.js';
import { hairSfx } from '../game/js/tuningsfx.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name} ${info}`); } };

const KLEDING_17 = ['short', 'buzz', 'bald', 'curly', 'afro', 'long', 'bun', 'ponytail', 'bob', 'wavy', 'fringe', 'pixie', 'quiff', 'undercut', 'mohawk', 'pigtails', 'braid'];
const lijst17 = KLEDING_17.map((id) => [id, 'Label ' + id]);

// alle 17 komen er precies één keer in, in groepen zonder lege kop
const g17 = hairGroups(lijst17);
const flat = g17.flatMap((g) => g.items.map((i) => i[0]));
ok(flat.length === 17 && new Set(flat).size === 17 && KLEDING_17.every((id) => flat.includes(id)), 'alle 17 kapsels, elk één keer', flat.join());
ok(g17.length === 4 && g17.every((g) => g.items.length >= 2), 'vier groepen met elk meerdere kapsels', g17.map((g) => g.id + ':' + g17.length).join());
ok(g17.every((g) => g.title && g.id), 'elke groep heeft een naam');
ok(HAIR_GROUPS.flatMap((g) => g.ids).length === 17 && new Set(HAIR_GROUPS.flatMap((g) => g.ids)).size === 17, 'elk kapsel staat in precies één groep van de adapter');

// de huidige data van deze branch (9 of 17): niets valt weg, niets dubbel
for (const ch of Object.keys(HAIR_STYLES)) {
  const g = hairGroups(HAIR_STYLES[ch]), f = g.flatMap((x) => x.items.map((i) => i[0]));
  ok(f.length === HAIR_STYLES[ch].length && new Set(f).size === f.length, `de lijst van ${ch} blijft heel`, f.length + ' van ' + HAIR_STYLES[ch].length);
}
ok(HAIR_STYLE_IDS.every((id) => KLEDING_17.includes(id)), 'de stijlen van deze branch zijn een deel van de 17 van epic-kleding');

// onbekende stijlen: onder Overig, labels blijven zoals ze zijn
const toekomst = hairGroups([...lijst17, ['mullet', 'Visstaartje']]);
ok(toekomst.length === 5 && toekomst[4].id === 'overig' && toekomst[4].items[0][1] === 'Visstaartje', 'een onbekend kapsel komt onder Overig');
ok(hairGroups(lijst17)[0].items[0][1] === 'Label short', 'labels blijven van het kledingsysteem');
// kapotte invoer
ok(hairGroups(null).length === 0 && hairGroups([]).length === 0 && hairGroups([null, 5, ['x']]).length === 1, 'kapotte invoer geeft geen fout');
ok(hairGroups([['short', 'Kort']]).length === 1 && hairGroups([['short', 'Kort']])[0].id === 'kort', 'een enkele stijl: één groep');

// de regel bij het knippen
ok(cutKind('bob', false) === 'knippen' && cutKind('buzz', false) === 'tondeuse' && cutKind('bald', false) === 'tondeuse' && cutKind('bob', true) === 'kleur', 'schaar, tondeuse en kleur');
for (const k of Object.keys(CUT_LINES)) ok(CUT_LINES[k].length >= 2 && CUT_LINES[k].every((l) => l.length > 15 && l.length < 120), 'regels van redelijke lengte', k);
ok(cutLine('bob', false, 0) !== cutLine('bob', false, 1) && cutLine('bob', false, -3).length > 10 && cutLine('bob', true, 1.7).length > 10, 'wisselt per beurt, ook bij gek getal');
ok(Object.values(CUT_LINES).flat().every((l) => !/\b(winter|sneeuw|bmw|audi|ford|volkswagen|mercedes|tesla)\b/i.test(l)), 'geen merken of winter');
// het geluid hoort bij dezelfde soort ingreep als de regel
for (const id of KLEDING_17) ok((hairSfx(id, false) === 'hair_clipper') === (cutKind(id, false) === 'tondeuse'), 'geluid en regel kiezen dezelfde soort', id);
ok(hairSfx('bob', true) === 'hairdryer_blast' && cutKind('bob', true) === 'kleur', 'kleur: föhn');

console.log(`kapperkeuze_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
