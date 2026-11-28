// Consistentietest personages (#1365, bijbel 28-11 03 §5.10): alles wat het personageblad zegt (game/js/characterdossiers*.js,
// bijbel 01 §2) komt terug in de scènes (docs/verhaal/nieuw/09-script-*.md, game/storydata/script.json), in het model van het
// personage (haar, kleding, kleur, uiterlijk: game/js/clothinghair.js, clothingdata.js, storycast.js, missionstory.js NPC,
// models3d_people.js) en in de dialoog (spreekstijl, dialectniveau, leeftijd, aanspreekvormen, stemkaart).
//
//   node scripts/character_consistency_test.mjs                    toetst tegen de basislijn (scripts/character_consistency_baseline.json) en toont het rapport
//   node scripts/character_consistency_test.mjs --strict           elke afwijking faalt (de lijst die de bouw moet wegwerken)
//   node scripts/character_consistency_test.mjs --list             toont elke afwijking met personage, scène of veld en regel
//   node scripts/character_consistency_test.mjs --write-baseline   schrijft de huidige afwijkingen als basislijn
//   node scripts/character_consistency_test.mjs --quiet            geen rapport, alleen de uitslag
//
// De blad-bron wint: wijkt iets af, dan is de afwijking de fout. De basislijn is het bekende werk: een nieuwe afwijking faalt, en een
// afwijking die is opgelost moet uit de basislijn (zodat de lijst alleen kan krimpen). Wat niet automatisch kan, staat in het rapport
// onder "handmatig te beoordelen".
import './node3d.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);

// ---- pure part ----

// hex colour -> colour family word (Dutch), or null for no colour
export function colourOf(hex) {
  const r = ((hex >> 16) & 255) / 255, g = ((hex >> 8) & 255) / 255, b = (hex & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; }
  if (l < 0.13) return 'zwart';
  if (s < 0.14) return l > 0.82 ? 'wit' : 'grijs';
  if (h < 14 || h >= 346) return 'rood';
  if (h < 48) return l < 0.42 || s < 0.32 ? (l > 0.72 ? 'wit' : 'bruin') : 'oranje';
  if (h < 72) return l > 0.78 && s < 0.5 ? 'wit' : 'geel';
  if (h < 170) return 'groen';
  if (h < 262) return 'blauw';
  if (h < 300) return 'paars';
  return 'roze';
}
const FAMILY = { oranje: 'warm', bruin: 'warm', wit: 'licht', grijs: 'licht' }; // roest en oranje, wit en grijs lezen als dezelfde familie
const fam = (c) => FAMILY[c] || c;
const COLOUR_WORDS = [
  ['rood', /(?<![a-zë])(?:fel|bordeaux)?(?:rood|rode|bordeaux)(?![a-zë])/i], ['oranje', /(?<![a-zë])oranje/i],
  ['geel', /(?<![a-zë])(?:mosterd|oker)?(?:geel|gele|mosterd)/i], ['groen', /(?<![a-zë])(?:olijf|salie|mint|donker|licht)?(?:groen|groene|olijf|mint)/i],
  ['blauw', /(?<![a-zë])(?:konings|koning|marine|zee|licht|donker|nacht)?(?:blauw|blauwe|marine)/i], ['paars', /(?<![a-zë])(?:paars|paarse|lila)/i],
  ['roze', /(?<![a-zë])roze/i], ['bruin', /(?<![a-zë])(?:bruin|bruine|roest|cognac|espresso)/i], ['zwart', /(?<![a-zë])(?:zwart|zwarte)/i],
  ['wit', /(?<![a-zë])(?:wit|witte|ecru|crème|creme)(?![a-zë])/i], ['grijs', /(?<![a-zë])(?:grijs|grijze|antraciet)/i],
];
// the colour words a text names, as a set of families
export const coloursIn = (text) => new Set(COLOUR_WORDS.filter(([, re]) => re.test(text || '')).map(([c]) => fam(c)));
const CHROMATIC = new Set(['rood', 'geel', 'groen', 'blauw', 'paars', 'roze', 'warm']);

// dialect level of a card (bible 01 §2.0): '0', '1', '2', '3', 'F1', 'F2', 'F' (Fries, level not named) or null (not decidable)
export function dialectLevel(text) {
  if (!text || text === 'n.v.t.') return null;
  const n = /niveau\s*(\d)/i.exec(text);
  if (n) return n[1];
  const f = /\bF([12])\b/.exec(text);
  if (f) return `F${f[1]}`;
  if (/^\s*standaard/i.test(text)) return '0';
  if (/^\s*plat gronings/i.test(text)) return '3';
  if (/^\s*gronings in (?:kleine )?doses?/i.test(text)) return '2';
  if (/\bplat\b/i.test(text) && /gronings/i.test(text)) return '3';
  if (/fries|friese/i.test(text)) return 'F';
  return null; // free text without a level ("Gronings getint"): not decidable
}
const sameLevel = (a, b) => a === b || (a && b && a[0] === 'F' && b[0] === 'F' && (a === 'F' || b === 'F'));

// clear Groningse and Friese words (not the shared greeting "moi", not names or the common "jonge"/"mem"/"beppe")
const GRONINGS = /(?<![a-zë])(nait|kinnen|gien|zölf|zulf|doar|boetn|veul|joen?|mie|kiek|aargens|dou|wie bin|zok|nou nait)(?![a-zë])/gi;
const FRIES = /(?<![a-zë])(famke|moai|tige|oant sjen|sjochst|priuw|goed ite|meitsje|wis en wrachtich|net fertelle|dyn|heit)(?![a-zë])/gi;
export const groningsIn = (text) => (String(text).match(GRONINGS) || []).map((x) => x.toLowerCase());
export const friesIn = (text) => (String(text).match(FRIES) || []).map((x) => x.toLowerCase());
export const wordCount = (text) => String(text).trim().split(/\s+/).filter(Boolean).length;

// speech violations of one line of a speaker with this dialect level: [{ kind, detail }]
export function speechSlips(text, level) {
  if (!level) return [];
  const out = [];
  const gro = groningsIn(text), fri = friesIn(text);
  if (gro.length && (level === '0' || level[0] === 'F')) out.push({ kind: 'gronings', detail: `Gronings (${[...new Set(gro)].join(', ')}) bij niveau ${level}` });
  if (level === '1' && gro.length > 1) out.push({ kind: 'gronings', detail: `meer dan één Gronings woord (${[...new Set(gro)].join(', ')}) bij niveau 1` });
  if (fri.length && level[0] !== 'F') out.push({ kind: 'fries', detail: `Fries (${[...new Set(fri)].join(', ')}) bij niveau ${level}` });
  if (/\bde Grunn\b/.test(text)) out.push({ kind: 'grunn', detail: '"de Grunn" (constitution 1: Grunn, nooit de Grunn)' });
  return out;
}

const UNITS = { nul: 0, een: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7, acht: 8, negen: 9, tien: 10, elf: 11, twaalf: 12, dertien: 13, veertien: 14, vijftien: 15, zestien: 16, zeventien: 17, achttien: 18, negentien: 19 };
const TENS = { twintig: 20, dertig: 30, veertig: 40, vijftig: 50, zestig: 60, zeventig: 70, tachtig: 80, negentig: 90 };
export function dutchNumber(w) {
  w = String(w).toLowerCase();
  if (/^\d{1,3}$/.test(w)) return Number(w);
  if (w in UNITS) return UNITS[w];
  if (w in TENS) return TENS[w];
  const m = /^([a-z]+?)(?:en|ën)(twintig|dertig|veertig|vijftig|zestig|zeventig|tachtig|negentig)$/.exec(w);
  if (m && m[1] in UNITS) return UNITS[m[1]] + TENS[m[2]];
  return null;
}
const NUMWORD = '(\\d{1,3}|[a-zë]+)';
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, (c) => String.fromCharCode(92) + c);

// the names that point at one character: aliases and first name (4 letters or more, owned by one card only)
export function nameIndex(dossiers) {
  const first = (d) => d.name.replace(/[(].*[)]/, '').trim().split(/[ ]+/).filter((w) => !/^(Oma|Opa|Oom|Tante|Boer|Meester|Kapitein|Dokter|Chauffeur|Dispatcher|Stationschef|Hoofdagent|Agent|Wijkagent|Mevrouw|Meneer|Omroeper|Pa|Mam|Ome|Schipper|Voorzitter|Bakker|Trainer)$/i.test(w))[0] || '';
  const raw = new Map(), owners = new Map();
  for (const d of dossiers) {
    if (d.tier === 'group') continue;
    const names = new Set([...(Array.isArray(d.aliases) ? d.aliases : []), first(d)]);
    raw.set(d.id, names);
    for (const n of names) owners.set(n, [...(owners.get(n) || []), d.id]);
  }
  const out = new Map();
  for (const [id, names] of raw) { const keep = [...names].filter((n) => n.length >= 4 && owners.get(n).length === 1); if (keep.length) out.set(id, keep); }
  return out;
}
const sentences = (text) => String(text).split(/(?<=[.!?…])\s+/).filter(Boolean);

// age claims in a text: "ik ben vierentwintig." (the speaker) and "Mem is eenennegentig." (a named character).
// agesOf: id -> age; names: Map(id -> [names]); speakerId: the dossier id of the speaker, or null. Returns [{ id, said, is }]
export function ageSlips(text, { agesOf, names, speakerId }) {
  const out = [];
  const tail = '(?:\\s+jaar(?:\\s+oud)?)?\\s*(?:[,.!?…]|$)';
  if (speakerId && typeof agesOf.get(speakerId) === 'number') {
    for (const m of text.matchAll(new RegExp(`(?<![a-zë])ik ben ${NUMWORD}${tail}`, 'gi'))) {
      const n = dutchNumber(m[1]);
      if (n !== null && n >= 3 && n !== agesOf.get(speakerId)) out.push({ id: speakerId, said: n, is: agesOf.get(speakerId) });
    }
  }
  for (const [id, ns] of names) {
    if (typeof agesOf.get(id) !== 'number') continue;
    for (const n of ns) {
      for (const m of text.matchAll(new RegExp(`(?<![A-Za-zë])${esc(n)} is ${NUMWORD}${tail}`, 'gi'))) {
        const v = dutchNumber(m[1]);
        if (v !== null && v >= 3 && v !== agesOf.get(id)) out.push({ id, said: v, is: agesOf.get(id) });
      }
    }
  }
  return out;
}

// who is whose family (bible 01 §2.4): Beppe is Tammo's oma, Oma Trijntje is Tessa's oma, Mem is Jelle's oma; Femke is the keeper and Tessa's friend.
// One sentence at a time; the slips are found by the combination of names and words.
export const RELATION_RULES = [
  { id: 'beppe-is-tammos-oma', test: (s) => /\bBeppe\b/.test(s) && /\b(Tessa'?s? (oma|beppe)|oma van Tessa|Beppe van Tessa)\b/i.test(s), msg: "Beppe is Tammo's oma, niet die van Tessa" },
  { id: 'trijntje-is-tessas-oma', test: (s) => /\bTrijntje\b/.test(s) && /\b(Tammo'?s? (oma|beppe)|oma van Tammo)\b/i.test(s), msg: "Oma Trijntje is Tessa's oma, niet die van Tammo" },
  { id: 'mem-is-jelles-oma', test: (s) => /\bMem\b/.test(s) && /\b(Tammo'?s?|Tessa'?s?) mem\b/i.test(s), msg: "Mem is Jelles oma" },
  { id: 'mem-geen-moeder', test: (s) => /\bMem\b/.test(s) && /\b(Jelle'?s? moeder|moeder van Jelle|zoon van Mem)\b/i.test(s), msg: "Mem is Jelles oma, niet zijn moeder" },
  { id: 'jelle-geen-beppe', test: (s) => /\bJelle'?s?\b/.test(s) && /\bJelle'?s? beppe\b/i.test(s), msg: "Jelles oma heet Mem, niet Beppe" },
  { id: 'femke-is-keeper', test: (s) => /\bFemke\b/.test(s) && /\b(spits|aanvaller|linksbuiten|rechtsbuiten|verdediger|middenvelder)\b/i.test(s), msg: 'Femke is de keeper' },
  { id: 'femke-is-tessas-vriendin', test: (s) => /\bFemke\b/.test(s) && /\b(vriendin van Tammo|Tammo'?s vriendin|zusje|zus van|nicht van)\b/i.test(s), msg: "Femke is de vriendin van Tessa (haar zusje is Lieke)" },
];
export const relationSlips = (text) => sentences(text).flatMap((s) => RELATION_RULES.filter((r) => r.test(s)).map((r) => ({ id: r.id, msg: r.msg, sentence: s })));

// looks in the story text: hair of Tammo and Tessa (Tessa has long hair by default, Tammo has no ponytail)
export const HAIR_RULES = {
  tammo: /\b(staart\w*|paardenstaart|vlecht\w*|knotje|lang(?:e)? (?:haar|haren)|blond\w* (?:haar|kuif|krullen)|kale? (?:hoofd|kop)|rood haar|grijs haar|baard)\b/i,
  anita: /\b(kort(?:e)? (?:haar|haren)|kale? (?:hoofd|kop)|blond\w* (?:haar|kuif|krullen)|rood haar|grijs haar)\b/i,
};
// one sentence about exactly one of the two (and no other named character) that names a look the card does not have
export function appearanceSlips(text, others = []) {
  const out = [];
  for (const s of sentences(text)) {
    const hasTammo = /\bTammo\b/i.test(s), hasTessa = /\bTessa\b/i.test(s);
    if (hasTammo === hasTessa) continue;
    if (others.some((re) => re.test(s))) continue;
    const who = hasTammo ? 'tammo' : 'anita';
    const m = HAIR_RULES[who].exec(s);
    if (m) out.push({ id: `${who === 'tammo' ? 'tammo' : 'tessa'}-haar`, who, said: m[0], sentence: s });
  }
  return out;
}

// the colour of a piece of clothing that a sentence about Tammo or Tessa names ("een blauwe pet") must be one the card allows
const GARMENT = /(?<![a-zë])(rode?|blauwe?|groene?|gele?|oranje|zwarte?|witte?|grijze?|paarse?|roze|bruine?)\s+(jas|jack|pet|shirt|trui|blouse|overall|vest)\b/gi;
export function garmentSlips(text, allowed, others = []) {
  const out = [];
  for (const s of sentences(text)) {
    const hasTammo = /\bTammo\b/i.test(s), hasTessa = /\bTessa\b/i.test(s);
    if (hasTammo === hasTessa || others.some((re) => re.test(s))) continue;
    const who = hasTammo ? 'tammo' : 'anita';
    for (const m of s.matchAll(GARMENT)) {
      const c = [...coloursIn(m[1])][0];
      if (c && !allowed[who].has(c)) out.push({ id: `${who === 'tammo' ? 'tammo' : 'tessa'}-kleding`, who, said: m[0], sentence: s });
    }
  }
  return out;
}

// ---- synthetic tests (behaviour of the checks, not of the data) ----
let n = 0;
const t = (naam, fn) => { n++; try { fn(); } catch (e) { console.log('FAIL', naam, '\n  ', String(e.message || e).split('\n').slice(0, 8).join('\n  ')); process.exitCode = 1; } };

t('kleurfamilies: een blauw jack is blauw, een roestkleurige pet is warm, ecru is licht', () => {
  assert.equal(colourOf(0x3f6ea8), 'blauw');
  assert.equal(colourOf(0x9e3027), 'rood');
  assert.equal(colourOf(0x1b1716), 'zwart');
  assert.equal(colourOf(0x7a8f6a), 'groen');
  assert.equal(colourOf(0xd8d4cc), 'wit');
  assert.ok(coloursIn('een koningsblauw colbert en een marineblauwe jas').has('blauw'));
  assert.ok(!coloursIn('broodtrommel en brood').has('rood'), 'brood is geen rood');
  assert.ok(coloursIn('een roestkleurige pet').has('warm') && coloursIn('oranje pet').has('warm'));
});

t('dialectniveau uit het blad: niveau-getal, Fries, standaard, Gronings', () => {
  assert.equal(dialectLevel('standaard Nederlands (besluit #134); een Gronings woord is een grap'), '0');
  assert.equal(dialectLevel('Nederlands met Friese woorden (F1)'), 'F1');
  assert.equal(dialectLevel('Nederlands met een enkel Gronings woord (niveau 1)'), '1');
  assert.equal(dialectLevel('Gronings in kleine doses (moi, kon minder)'), '2');
  assert.equal(dialectLevel('Nederlands met Friese woorden'), 'F');
  assert.equal(dialectLevel('n.v.t.'), null);
  assert.ok(sameLevel('F', 'F2') && !sameLevel('0', 'F1'));
});

t('spreekstijl: Gronings bij niveau 0 en Fries bij een Gronger valt op; een gewone zin niet', () => {
  assert.equal(speechSlips('Dat kunnen we nait doen, jong.', '0')[0].kind, 'gronings');
  assert.equal(speechSlips('Dat kunnen we nait doen.', '2').length, 0);
  assert.equal(speechSlips('Tige tank, famke.', '2')[0].kind, 'fries');
  assert.equal(speechSlips('Tige tank, famke.', 'F1').length, 0);
  assert.equal(speechSlips('Moi. Kon minder.', '0').length, 0, 'moi is de gedeelde groet');
  assert.equal(speechSlips('Ik woon in de Grunn.', '0')[0].kind, 'grunn');
  assert.equal(speechSlips('Nait veul, kinnen we.', '1')[0].kind, 'gronings', 'niveau 1 is een enkel woord');
});

t('leeftijd: "ik ben vierentwintig" past bij Tammo, "Mem is eenennegentig" bij Mem; een andere leeftijd valt op', () => {
  assert.equal(dutchNumber('vierentwintig'), 24);
  assert.equal(dutchNumber('tweeënnegentig'), 92);
  assert.equal(dutchNumber('achtentachtig'), 88);
  assert.equal(dutchNumber('eenennegentig'), 91);
  const ctx = { agesOf: new Map([['tammo', 24], ['mem', 91]]), names: new Map([['mem', ['Mem']]]), speakerId: 'tammo' };
  assert.deepEqual(ageSlips('Ik ben vierentwintig, oma.', ctx), []);
  assert.deepEqual(ageSlips('Mem is eenennegentig.', ctx), []);
  assert.equal(ageSlips('Ik ben dertig jaar.', ctx)[0].is, 24);
  assert.equal(ageSlips('Mem is zeventig jaar oud.', ctx)[0].said, 70);
  assert.deepEqual(ageSlips('Ik ben veertig jaar open en de pannen zijn leeg.', ctx), [], 'een duur is geen leeftijd');
});

t('aanspreekvormen: Beppe is Tammo\'s oma, Oma Trijntje is Tessa\'s oma, Mem is Jelles oma', () => {
  assert.equal(relationSlips("Tessa's oma Beppe maakt soep.")[0].id, 'beppe-is-tammos-oma');
  assert.equal(relationSlips("Tammo's oma Trijntje bakt.")[0].id, 'trijntje-is-tessas-oma');
  assert.equal(relationSlips('Mem, de moeder van Jelle, wint niet.')[0].id, 'mem-geen-moeder');
  assert.deepEqual(relationSlips('De moeder van Jelle wil omzet.'), [], 'Jelles moeder (onbenoemd) is geen Mem');
  assert.equal(relationSlips('Mem is Jelles moeder.')[0].id, 'mem-geen-moeder');
  assert.deepEqual(relationSlips("Tessa's oma Trijntje bakt. Tammo's beppe kookt."), []);
  assert.equal(relationSlips('Femke is de spits van het dorp.')[0].id, 'femke-is-keeper');
  assert.deepEqual(relationSlips('Femke staat in de goal, de vriendin van Tessa.'), []);
});

t('uiterlijk: Tammo geen staart, Tessa geen kort haar; zinnen over beide of over een derde tellen niet', () => {
  assert.equal(appearanceSlips('Tammo bindt zijn haar in een staart.')[0].id, 'tammo-haar');
  assert.equal(appearanceSlips('Tessa met kort haar kijkt op.')[0].id, 'tessa-haar');
  assert.deepEqual(appearanceSlips('Tessa bindt haar lange haar in een staart.'), []);
  assert.deepEqual(appearanceSlips('Tammo en Tessa zien een man met een staart.'), []);
  assert.deepEqual(appearanceSlips('Tammo kijkt naar Rikus met zijn staart.', [/\bRikus\b/]), []);
});

t('kleding: een kleur die bij geen set van het personage hoort valt op', () => {
  const allowed = { tammo: new Set(['blauw', 'warm', 'groen']), anita: new Set(['rood', 'blauw']) };
  assert.equal(garmentSlips('Tessa draagt een gele jas.', allowed)[0].id, 'tessa-kleding');
  assert.deepEqual(garmentSlips('Tessa draagt een rode jas.', allowed), []);
  assert.deepEqual(garmentSlips('Tammo zet zijn oranje pet af.', allowed), []);
  assert.equal(garmentSlips('Tammo zet zijn rode pet af.', allowed).length, 1);
});

t('de naamindex slaat dubbele en te korte namen over', () => {
  const idx = nameIndex([
    { id: 'a', tier: 'minor', name: 'Hinke Wiersma', aliases: ['Beppe', 'Hinke'] },
    { id: 'b', tier: 'minor', name: 'Bep Wiersma', aliases: ['Bep', 'Hinke'] },
    { id: 'c', tier: 'group', name: 'Politie', aliases: ['Politie'] },
  ]);
  assert.deepEqual(idx.get('a'), ['Beppe']);
  assert.ok(!idx.has('b') && !idx.has('c'));
});

// ---- the real data against the bible ----
const D = await import('../game/js/characterdossiers.js');
const H = await import('../game/js/clothinghair.js');
const C = await import('../game/js/clothingdata.js');
const P = await import('../game/js/models3d_people.js');
const M = await import('../game/js/missionstory.js');
const S = await import('../game/js/storycast.js');
const script = JSON.parse(read('game/storydata/script.json'));
const kaarten = JSON.parse(read('scripts/stemkaarten.json')).bladen;

const violations = [];
const slip = (check, who, where, detail) => violations.push({ check, who, where, detail });
const byId = (id) => D.dossierOf(id);
const bySpeaker = new Map(D.DOSSIERS.filter((d) => d.speakerKey !== 'n.v.t.').map((d) => [d.speakerKey, d]));
const names = nameIndex(D.DOSSIERS);
const otherNames = (skip) => [...names].filter(([id]) => !skip.includes(id)).flatMap(([, ns]) => ns.map((x) => new RegExp(`\\b${esc(x)}\\b`)));
const NOT_DUO = otherNames(['tammo', 'anita']);
const agesOf = new Map(D.DOSSIERS.map((d) => [d.id, d.age]));
const text = (d, ...fields) => fields.map((f) => (typeof d[f] === 'object' && d[f] ? Object.values(d[f]).join(' ') : String(d[f] ?? ''))).join(' ');
const lookText = (d) => text(d, 'look', 'outfitByAct');
const voiceOf = (key) => (script.speakers[key] || {}).voice;

// 1. every speaker has a card, and a voice card that fits it
const kaartOf = (d, key) => kaarten.find((b) => b.id === d.id || (d.id === 'anita' && b.id === 'tessa') || b.opname === voiceOf(key));
const spoken = new Map();
const keyByName = new Map(Object.entries(script.speakers).flatMap(([k, v]) => [[v.name, k], [v.voice, k]]));
// app messages carry no key: the sender name is the full name or an alias of one card
const keyOf = (l) => {
  if (l.key !== undefined) return l.key;
  if (keyByName.has(l.speaker)) return keyByName.get(l.speaker);
  const hits = D.DOSSIERS.filter((d) => d.speakerKey !== 'n.v.t.' && d.tier !== 'group' && (new RegExp(`^${esc(l.speaker)}\\b`).test(d.name) || (d.aliases || []).includes(l.speaker) || String(d.nick).split(';')[0].trim() === l.speaker));
  return hits.length === 1 ? hits[0].speakerKey : undefined; // "Oma" names two cards: not decidable
};
for (const sc of script.scenes) (sc.lines || []).forEach((l) => {
  const k = keyOf(l);
  if (k === undefined) return;
  spoken.set(k, (spoken.get(k) || 0) + 1);
});
for (const [key, count] of spoken) {
  const d = bySpeaker.get(key);
  if (!d) { slip('blad-ontbreekt', key, 'script', `spreker ${key} (${count} regels) heeft geen personageblad`); continue; }
  const k = kaartOf(d, key);
  if (!k) { slip('stemkaart-ontbreekt', d.id, 'stemkaarten.json', `${d.id} (${count} regels) heeft geen stemkaart`); continue; }
  if (typeof d.age === 'number' && k.leeftijd !== d.age) slip('stemkaart-verschil', d.id, 'leeftijd', `blad ${d.age}, stemkaart ${k.leeftijd}`);
  const pron = { hij: 'm', zij: 'v' }[d.pronoun];
  if (pron && k.geslacht !== pron) slip('stemkaart-verschil', d.id, 'geslacht', `blad ${d.pronoun}, stemkaart ${k.geslacht}`);
  const lv = dialectLevel(d.dialect);
  if (lv && !sameLevel(lv, k.dialect)) slip('stemkaart-verschil', d.id, 'dialect', `blad niveau ${lv}, stemkaart ${k.dialect}`);
  if (d.voice !== 'n.v.t.' && d.voice !== k.stem) slip('stemkaart-verschil', d.id, 'stem', `blad ${d.voice}, stemkaart ${k.stem}`);
}
// lines without a speaker key: which speaker name do they carry
const unkeyed = new Map();
for (const sc of script.scenes) for (const l of sc.lines || []) if (keyOf(l) === undefined) unkeyed.set(l.speaker, (unkeyed.get(l.speaker) || 0) + 1);
for (const [who, c] of unkeyed) slip('blad-ontbreekt', String(who), 'script', `regels zonder sprekersleutel (${c}x, spreker "${who}")`);

// 2. hair and clothing of the duo: model data against the card
{
  const tammo = byId('tammo'), tessa = byId('anita');
  const style = (h) => String(h).split('.')[0];
  const TAIL = ['ponytail', 'pigtails', 'braid', 'bun'];
  if (TAIL.includes(P.TAMMO_APPEARANCE.hairStyle) || P.TAMMO_APPEARANCE.hairStyle === 'long') slip('haar', 'tammo', 'TAMMO_APPEARANCE.hairStyle', `Tammo heeft ${P.TAMMO_APPEARANCE.hairStyle} (geen staart of lang haar)`);
  if (TAIL.includes(style(H.DEFAULT_HAIR.tammo)) || style(H.DEFAULT_HAIR.tammo) === 'long') slip('haar', 'tammo', 'DEFAULT_HAIR', `Tammo's standaardkapsel is ${H.DEFAULT_HAIR.tammo}`);
  if (P.ANITA_APPEARANCE.hairStyle !== 'long') slip('haar', 'anita', 'ANITA_APPEARANCE.hairStyle', `Tessa heeft ${P.ANITA_APPEARANCE.hairStyle}, standaard is lang haar`);
  if (style(H.DEFAULT_HAIR.anita) !== 'long') slip('haar', 'anita', 'DEFAULT_HAIR', `Tessa's standaardkapsel is ${H.DEFAULT_HAIR.anita}, standaard is lang haar`);
  if (/staart|paardenstaart/i.test(tammo.look)) slip('haar', 'tammo', 'dossier.look', 'het blad geeft Tammo een staart');
  if (!/lang\w*(?: zwart)? haar|lange haren/i.test(tessa.look)) slip('haar', 'anita', 'dossier.look', 'het blad zegt niet dat Tessa lang haar heeft');
  const dark = (hex) => ['zwart', 'bruin'].includes(colourOf(hex)) || colourOf(hex) === 'grijs' && (hex & 255) < 0x60;
  if (!dark(P.TAMMO_APPEARANCE.hair)) slip('haar', 'tammo', 'TAMMO_APPEARANCE.hair', 'het blad zegt donker kort haar');
  if (!dark(P.ANITA_APPEARANCE.hair)) slip('haar', 'anita', 'ANITA_APPEARANCE.hair', 'het blad zegt lang zwart haar');
  // outfit sets: every set the card names exists, belongs to the character and shows the colours the card names
  const allowed = { tammo: new Set(), anita: new Set() };
  for (const [d, ch] of [[tammo, 'tammo'], [tessa, 'anita']]) {
    for (const [act, key] of Object.entries(d.outfitByAct)) {
      const set = C.SET_BY_ID[key];
      if (!set) { slip('kleding-set', d.id, `outfitByAct.${act}`, `set ${key} bestaat niet in clothingdata.js`); continue; }
      if (set.char !== ch) slip('kleding-set', d.id, `outfitByAct.${act}`, `set ${key} is van ${set.char}`);
      for (const p of set.pieces) { const x = C.parsePiece(p); const c = x && colourOf(C.colorHex(x.color)); if (c && ['hat', 'outer', 'top'].includes(x.item.slot)) allowed[ch].add(fam(c)); }
    }
    for (const c of coloursIn(lookText(d))) allowed[ch].add(c);
    const base = C.SET_BY_ID[d.outfitByAct[1]];
    if (base) {
      const said = coloursIn(d.look);
      for (const p of base.pieces) {
        const x = C.parsePiece(p);
        if (!x || !['hat', 'outer', 'top'].includes(x.item.slot)) continue;
        const c = fam(colourOf(C.colorHex(x.color)));
        if (CHROMATIC.has(c) && said.size && !said.has(c)) slip('kleding-basis', d.id, 'dossier.look', `de basisset ${base.id} draagt ${p} (${c}), het blad noemt ${[...said].join(', ')}`);
      }
    }
  }
  GARMENT_ALLOWED = allowed;
}
var GARMENT_ALLOWED;

// 3. the model register of the story cast (missionstory NPC, storycast looks) against the card
{
  const reg = new Map(Object.entries(M.NPC));
  const LOOKS = { jelle: S.JELLE_LOOK, mem: S.MEM_LOOK, rikus: S.RIKUS_LOOK, beppe: S.BEPPE_LOOK };
  const hairWord = /(?<![a-zë])(zwart\w*|donker\w*|blond\w*|grijs\w*|wit\w*|bruin\w*|rood|rode|ros\w*)\b[^,.;]{0,20}\b(haar|kuif|knot)/i;
  const lightness = (hex) => (Math.max(hex >> 16 & 255, hex >> 8 & 255, hex & 255) + Math.min(hex >> 16 & 255, hex >> 8 & 255, hex & 255)) / 510;
  const hairClass = (hex) => { const c = colourOf(hex); return c === 'zwart' || (c === 'bruin' && lightness(hex) < 0.3) ? 'donker' : c === 'geel' || (c === 'oranje' && lightness(hex) > 0.55) ? 'blond' : c === 'wit' || c === 'grijs' ? 'licht' : c; };
  const hairSaid = (w) => (/^(zwart|donker)/i.test(w) ? 'donker' : /^blond/i.test(w) ? 'blond' : /^(grijs|wit)/i.test(w) ? 'licht' : /^bruin/i.test(w) ? 'bruin' : 'rood');
  for (const d of D.DOSSIERS) {
    const key = d.speakerKey;
    const npc = reg.get(key) || (d.id === 'anita' ? P.ANITA_APPEARANCE : d.id === 'tammo' ? P.TAMMO_APPEARANCE : null);
    if (!npc) continue;
    const a = (d.id === 'anita' || d.id === 'tammo') ? npc : { ...npc, ...(LOOKS[d.id] || {}) };
    const lk = a.look || {};
    const txt = lookText(d);
    const where = d.id === 'anita' || d.id === 'tammo' ? 'APPEARANCE' : `missionstory.NPC.${key}`;
    if (a.variant && ({ hij: 'male', zij: 'female' })[d.pronoun] && a.variant !== ({ hij: 'male', zij: 'female' })[d.pronoun]) slip('model-geslacht', d.id, where, `blad ${d.pronoun}, model ${a.variant}`);
    if (typeof d.age === 'number') {
      const want = d.age >= 65 ? 'old' : d.age < 14 ? 'child' : null;
      if (want && lk.age !== want) slip('model-leeftijd', d.id, where, `blad ${d.age} jaar, model ${lk.age || 'geen leeftijdsklasse (volwassen)'}`);
      if (!want && ((lk.age === 'old' && d.age < 55) || (lk.age === 'child' && d.age >= 14))) slip('model-leeftijd', d.id, where, `blad ${d.age} jaar, model ${lk.age}`);
    }
    const said = coloursIn(txt.replace(/[a-zë]+\s+(?:haar|haren|kuif|knotje?)\b/gi, ' '));
    for (const [part, hex] of [['shirt', lk.topColor ?? a.shirt], ['sjaal', lk.scarf ? lk.scarfColor : null], ['pet', lk.hat ? lk.hatColor : null]]) {
      if (hex == null) continue;
      const c = fam(colourOf(hex));
      if (CHROMATIC.has(c) && said.size && !said.has(c)) slip('model-kleur', d.id, `${where}.${part}`, `${part} is ${c} (0x${hex.toString(16)}), het blad noemt ${[...said].join(', ')}`);
    }
    const hw = hairWord.exec(d.look);
    if (hw && a.hair != null && hairClass(a.hair) !== hairSaid(hw[1])) slip('model-haar', d.id, `${where}.hair`, `blad zegt ${hw[0]}, model ${hairClass(a.hair)}`);
    if (/knot|knoet/i.test(d.look) && a.hairStyle !== 'bun') slip('model-haar', d.id, `${where}.hairStyle`, `blad zegt een knot, model ${a.hairStyle || 'willekeurig'}`);
    if (npc === reg.get(key) && LOOKS[d.id]) {
      const need = (re, ok, what) => { if (re.test(d.look) && !ok) slip('model-uiterlijk', d.id, `${where}.${what}`, `het blad noemt ${what}, het model heeft het niet`); };
      need(/\bsnor\b/i, lk.facial === 'moustache', 'snor');
      need(/\bbaard\b/i, lk.facial === 'beard', 'baard');
      need(/\bsjaal\b/i, lk.scarf, 'sjaal');
      need(/zonnebril/i, lk.shades, 'zonnebril');
      need(/\b(bril|montuur)\b/i, lk.glasses, 'bril');
    }
  }
  // the cutscene actors of the duo use the look of their own character, in every cutscene file
  const files = fs.readdirSync(new URL('../game/js', import.meta.url)).filter((f) => /^cutscenes(_akte\d)?\.js$/.test(f));
  for (const f of files) {
    read(`game/js/${f}`).split('\n').forEach((line, i) => {
      const m = /\b(tammo|tessa|anita)\s*:\s*\{\s*look:\s*'(\w+)'/.exec(line);
      if (m && m[2] !== (m[1] === 'tammo' ? 'tammo' : 'anita')) slip('cutscene-bezetting', m[1], `${f}:${i + 1}`, `acteur ${m[1]} gebruikt het uiterlijk ${m[2]}`);
    });
  }
}

// 4. the dialogue: speech style, age and address forms
const corpus = []; // { where, who (dossier id or null), text }
for (const sc of script.scenes) {
  (sc.regie || []).forEach((r, i) => corpus.push({ where: `${sc.id}#regie${i}`, who: null, text: r, sc }));
  (sc.lines || []).forEach((l, i) => corpus.push({ where: `${sc.id}#${i}`, who: bySpeaker.get(keyOf(l))?.id || null, text: l.text || '', line: l, sc }));
}
{
  const levelOfId = new Map(D.DOSSIERS.map((d) => [d.id, dialectLevel(d.dialect)]));
  const kLevel = (id) => { const b = kaarten.find((k) => k.id === id || (id === 'anita' && k.id === 'tessa')); return b ? b.dialect : null; };
  let prev = null;
  for (const e of corpus) {
    const before = prev && prev.sc === e.sc && prev.line ? prev.text : '';
    prev = e;
    if (e.who && e.line) {
      const lv = levelOfId.get(e.who) || kLevel(e.who);
      // Tessa does Jelle (bible: "ze imiteert Jelle slecht") and Tammo may quote: a line with a quote or Jelle's name is exempt from the Fries rule
      for (const s of speechSlips(e.text, lv)) {
        if (s.kind === 'fries' && (/["“”„]/.test(e.text) || /\bJelle\b|\bMem\b/.test(e.text) || friesIn(e.text).every((w) => friesIn(before).includes(w)))) continue; // a quote, an imitation or an echo of the line before
        slip(`spreekstijl-${s.kind}`, e.who, e.where, s.detail);
      }
      if (e.who === 'tammo' && e.line.tag === 'NIEUW' && wordCount(e.text) > 8) slip('spreekstijl-lengte', 'tammo', e.where, `${wordCount(e.text)} woorden in een nieuwe regel (hooguit acht): "${e.text.slice(0, 60)}"`);
    }
    for (const a of ageSlips(e.text, { agesOf, names, speakerId: e.who })) slip('leeftijd', a.id, e.where, `de tekst zegt ${a.said}, het blad ${a.is}`);
    for (const r of relationSlips(e.text)) slip(`aanspreekvorm-${r.id}`, 'relatie', e.where, `${r.msg}: "${r.sentence.slice(0, 80)}"`);
    for (const a of appearanceSlips(e.text, NOT_DUO)) slip('uiterlijk', a.who, e.where, `"${a.said}" bij ${a.who === 'tammo' ? 'Tammo' : 'Tessa'}: "${a.sentence.slice(0, 80)}"`);
    for (const a of garmentSlips(e.text, GARMENT_ALLOWED, NOT_DUO)) slip('kleding-tekst', a.who, e.where, `"${a.said}" hoort bij geen outfit van het blad: "${a.sentence.slice(0, 80)}"`);
  }
  // the 09-script docs: only what the JSON does not already carry (prose and director's lines of the scenes)
  const jsonText = new Set(corpus.map((e) => e.text.trim()));
  const dir = new URL('../docs/verhaal/nieuw/', import.meta.url);
  for (const f of fs.readdirSync(dir).filter((x) => /^09-script-.*\.md$/.test(x))) {
    fs.readFileSync(new URL(f, dir), 'utf8').split('\n').forEach((raw, i) => {
      if (/^(#|>|\s*$)/.test(raw)) return;
      const body = raw.replace(/^\(regie:\s*/i, '').replace(/\)\s*$/, '').replace(/^[^:]{1,40}:\s*/, '').replace(/\s*\[[A-Z]+\]\s*$/, '').trim();
      if (!body || jsonText.has(body)) return;
      const where = `md:${f}:${i + 1}`;
      for (const r of relationSlips(body)) slip(`aanspreekvorm-${r.id}`, 'relatie', where, `${r.msg}: "${r.sentence.slice(0, 80)}"`);
      for (const a of appearanceSlips(body, NOT_DUO)) slip('uiterlijk', a.who, where, `"${a.said}" bij ${a.who === 'tammo' ? 'Tammo' : 'Tessa'}: "${a.sentence.slice(0, 80)}"`);
      for (const a of garmentSlips(body, GARMENT_ALLOWED, NOT_DUO)) slip('kleding-tekst', a.who, where, `"${a.said}" hoort bij geen outfit van het blad: "${a.sentence.slice(0, 80)}"`);
      for (const a of ageSlips(body, { agesOf, names, speakerId: null })) slip('leeftijd', a.id, where, `de tekst zegt ${a.said}, het blad ${a.is}`);
    });
  }
}

// 5. the facts of the bible that must hold in the card itself (owner requirements, 28-11)
{
  const rel = (a, b) => D.relationsFor(a).find((r) => r.to === b);
  const femke = byId('femke');
  if (!/keeper/i.test(femke.nick + femke.work + femke.storyRole)) slip('blad-feit', 'femke', 'dossier', 'Femke is keeper');
  if (!rel('anita', 'femke') || !['friends'].includes(rel('anita', 'femke').type)) slip('blad-feit', 'femke', 'relations', 'Femke is een vriendin van Tessa');
  if (!/oma/.test(rel('tammo', 'beppe')?.theyAre || '')) slip('blad-feit', 'beppe', 'relations', "Beppe is Tammo's oma");
  if (rel('anita', 'trijntje')?.theyAre !== 'oma') slip('blad-feit', 'trijntje', 'relations', "Oma Trijntje is Tessa's oma");
  if (!/oma/.test(rel('jelle', 'mem')?.theyAre || '')) slip('blad-feit', 'mem', 'relations', "Mem is Jelles oma");
  if (byId('tammo').age !== 24 || byId('anita').age !== 24) slip('blad-feit', 'tammo', 'age', 'Tammo en Tessa zijn vierentwintig');
}
// the speakers' lines of the cast of the story text (beppe_texts.js) say where Beppe lives: the bible puts the house just inside the border
{
  const beppeTexts = read('game/js/beppe_texts.js');
  beppeTexts.split('\n').forEach((line, i) => { if (/(Beppe|beppe)/.test(line) && /net over de grens/.test(line)) slip('woonplaats', 'beppe', `beppe_texts.js:${i + 1}`, 'het blad zet het huis net BINNEN de provinciegrens (bijbel 01 §2.1), de tekst zegt "net over de grens"'); });
}
// "<name> woont in <place>" claims in the text: the place must occur on the card
{
  const home = (d) => `${d.homePlace} ${d.homeAddress} ${d.household} ${text(d, 'homeByAct')} ${d.origin} ${d.mapLink}`.toLowerCase();
  for (const e of corpus) {
    for (const [id, ns] of names) {
      for (const nm of ns) {
        const m = new RegExp(`(?<![A-Za-zë])${esc(nm)} woont (?:in|bij|aan|op) (?:de |het |een )?([A-Za-zë]+)`, 'i').exec(e.text);
        if (m && !home(byId(id)).includes(m[1].toLowerCase())) slip('woonplaats', id, e.where, `de tekst zegt dat ${nm} woont in/bij "${m[1]}", dat staat niet op het blad`);
      }
    }
  }
}

// ---- the result: unique, keyed, against the baseline ----
const key = (v) => `${v.check}|${v.who}|${v.where}`;
const unique = [...new Map(violations.map((v) => [key(v), v])).values()];
const baselineFile = new URL('./character_consistency_baseline.json', import.meta.url);
if (flag('write-baseline')) { fs.writeFileSync(baselineFile, JSON.stringify({ _: 'Bekende afwijkingen van het personageblad (scripts/character_consistency_test.mjs): check|personage|plek. Alleen laten krimpen; schrijf opnieuw met --write-baseline.', violations: unique.map(key).sort() }, null, 1) + '\n'); console.log(`basislijn geschreven: ${unique.length} afwijkingen`); }
const baseline = new Set(fs.existsSync(baselineFile) ? JSON.parse(fs.readFileSync(baselineFile, 'utf8')).violations : []);

if (flag('list')) for (const v of unique) console.log(`${v.check.padEnd(34)} ${String(v.who).padEnd(12)} ${v.where.padEnd(26)} ${v.detail}`);

t(flag('strict') ? 'strikt: geen enkele afwijking van het personageblad' : 'geen nieuwe afwijking van het personageblad (de basislijn is het bekende werk)', () => {
  if (flag('strict')) return assert.equal(unique.length, 0, `${unique.length} afwijkingen; zie --list`);
  const fresh = unique.filter((v) => !baseline.has(key(v)));
  assert.deepEqual(fresh.map((v) => `${key(v)}  ${v.detail}`), [], 'nieuwe afwijkingen: pas de tekst of het model aan het blad aan (het blad is de waarheid), of leg bewust vast');
  const solved = [...baseline].filter((k) => !unique.some((v) => key(v) === k));
  assert.deepEqual(solved, [], 'opgeloste afwijkingen staan nog in de basislijn: draai --write-baseline');
});

// ---- the report ----
if (!flag('quiet')) {
  const per = new Map();
  for (const v of unique) { const e = per.get(v.check) || { all: 0, known: 0 }; e.all++; if (baseline.has(key(v))) e.known++; per.set(v.check, e); }
  console.log('\nRapport: afwijkingen per soort (totaal / waarvan in de basislijn)');
  for (const [c, e] of [...per].sort()) console.log(`  ${c.padEnd(40)} ${String(e.all).padStart(4)} / ${e.known}`);
  const who = new Map();
  for (const v of unique) who.set(v.who, (who.get(v.who) || 0) + 1);
  console.log('Per personage (meeste afwijkingen eerst): ' + [...who].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([w, c]) => `${w} ${c}`).join(', '));
  console.log(`Gecontroleerd: ${D.DOSSIERS.length} bladen, ${spoken.size} sprekers in ${script.scenes.length} scènes, ${kaarten.length} stemkaarten, ${Object.keys(M.NPC).length} modellen in het NPC-register.`);
  console.log('Handmatig te beoordelen (niet automatisch toetsbaar):');
  for (const h of [
    'uiterlijk dat het blad noemt maar het model niet kent: litteken (Tammo), lengte en postuur, gezichtsvorm, rimpels',
    'figuren die het kledingsysteem willekeurig kleedt (alle personages buiten storycast.js en het NPC-register): kleur en soort tegen het blad',
    'de kleding van de speler in cutscenes: vrij gekozen (bijbel 01 §2.0), dus alleen de NPC-kant van Tammo en Tessa is toetsbaar',
    'tics en humor per personage (tekstcheck kan woorden vinden, niet of de grap klopt)',
    'Gronings en Fries: of de woorden kloppen is aan een kenner (docs/verhaal/GRONINGS-20-SPREEKTEKSTEN.md); de test toetst alleen het niveau',
  ]) console.log(`  - ${h}`);
}
if (!process.exitCode) console.log(`character_consistency_test: ${n}/${n} ok (${unique.length} bekende afwijkingen)`);
