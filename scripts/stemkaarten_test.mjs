// Stemkaarten en proefzinnen per personageblad (#1367): de afleiding uit leeftijd en spreekstijl, de regels voor de
// proefzinnen, de overeenkomst met de al opgenomen stemmen en de onderscheiding van gedeelde stemmen.
// Puur: geen netwerk, geen sleutel, geen audio. node scripts/stemkaarten_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildStemkaart, buildAll, onderscheidbaar, leeftijdsklasse, tempoVan, GEMINI_VOICES, DIALECTEN } from './lib/stemkaart.mjs';
import { GRO_ACCENT } from './tts_cast.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { bladen } = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'stemkaarten.json'), 'utf8'));
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const woorden = (t) => t.replace(/[.,!?;:"'()…]/g, ' ').split(/\s+/).filter(Boolean);

// 1. afleiding: leeftijd, dialect en spreekstijl bepalen de kaart
const basis = { id: 'x', naam: 'X', leeftijd: 30, geslacht: 'm', dialect: '0', rol: 'proef', stijl: ['droog', 'kort'], stem: 'Orus', proef: [{ tekst: 'Hoi.' }] };
const met = (o) => buildStemkaart({ ...basis, ...o });
ok(leeftijdsklasse(29) === 'jong' && leeftijdsklasse(30) === 'volwassen' && leeftijdsklasse(64) === 'rijper' && leeftijdsklasse(65) === 'oud' && leeftijdsklasse(80) === 'zeer oud', 'leeftijdsklassen en hun grenzen');
ok(/^jonge /.test(met({ leeftijd: 20 }).wie) && /^oude /.test(met({ leeftijd: 70 }).wie) && /^hele oude /.test(met({ leeftijd: 90 }).wie), 'de wie-beschrijving volgt de leeftijd', met({ leeftijd: 70 }).wie);
ok(/vrouw/.test(met({ geslacht: 'v' }).wie) && /man/.test(met({ geslacht: 'm' }).wie), 'de wie-beschrijving volgt het geslacht');
ok(met({ dialect: '0' }).taal === 'own' && met({ dialect: 'F1' }).taal === 'own' && met({ dialect: 'F2' }).taal === 'own', 'standaard Nederlands en Fries worden uit de geschreven tekst opgenomen');
ok(['1', '2', '3'].every((d) => met({ dialect: d }).taal === 'gro'), 'Gronings (1 tot 3) wordt uit de Groningse spreektekst opgenomen');
ok(met({ dialect: 'F2' }).accent !== met({ dialect: 'F1' }).accent && /Frisian/.test(met({ dialect: 'F1' }).accent) && /Frisian/.test(met({ dialect: 'F2' }).accent), 'F1 en F2 hebben een eigen Fries accent');
ok(met({ dialect: '2' }).accent === GRO_ACCENT && met({ dialect: '3' }).accent !== GRO_ACCENT, 'niveau 2 gebruikt het gewone Groningse accent, niveau 3 een plat accent');
ok(/^jonge Friese man/.test(met({ leeftijd: 24, dialect: 'F1' }).wie), 'wie-beschrijving noemt het taalgebied');
ok(tempoVan({ ...basis, stijl: ['snel', 'droog'] }) === 'snel' && tempoVan({ ...basis, stijl: ['plechtig', 'droog'] }) === 'langzaam', 'een snel of traag stijlwoord bepaalt het tempo');
ok(tempoVan({ ...basis, leeftijd: 80 }) === 'langzaam' && tempoVan({ ...basis, leeftijd: 40 }) === 'gemiddeld', 'zonder stijlwoord bepaalt de leeftijd het tempo');
ok(tempoVan({ ...basis, leeftijd: 80, tempo: 'gemiddeld' }) === 'gemiddeld', 'een expliciet tempo in het blad wint van de leeftijd');
const k = met({ stijl: ['droog', 'kort', 'deadpan'], dialect: '2' });
ok(k.pool.length === 3 && k.pool.every((p) => /, /.test(p)) && k.stijl.startsWith(GRO_ACCENT) && k.stijl.includes(`Tone: ${k.pool[0]}.`), 'de stijlregel heeft accent, wie en toon', k.stijl);
ok(met({ stijl: ['rustig'] }).pool.length === 1, 'een enkel stijlwoord is zelf de poel');

// 2. de bladen zelf
ok(bladen.length >= 35, 'bladen voor de hoofd- en bijfiguren', bladen.length);
const ids = bladen.map((b) => b.id);
ok(new Set(ids).size === ids.length, 'ids zijn uniek');
ok(new Set(bladen.map((b) => b.naam)).size === bladen.length, 'namen zijn uniek');
for (const id of ['tammo', 'tessa', 'beppe', 'jelle', 'mem', 'trijntje', 'rikus', 'auke', 'sander', 'hayo', 'hindrik', 'aaltje', 'hilda', 'ensing', 'bolhuis']) ok(ids.includes(id), `blad ${id} bestaat`);
const kaarten = buildAll(bladen);
const kaart = (id) => kaarten.find((x) => x.id === id);
for (const b of bladen) {
  const c = kaart(b.id);
  ok(GEMINI_VOICES.includes(b.stem), `${b.id}: stem is een van de dertig Gemini-stemmen`, b.stem);
  ok(DIALECTEN[b.dialect], `${b.id}: dialectniveau bestaat`, b.dialect);
  ok(Number.isInteger(b.leeftijd) && b.leeftijd >= 18 && b.leeftijd <= 100, `${b.id}: leeftijd`, b.leeftijd);
  ok(b.stijl.length >= 2, `${b.id}: minstens twee stijlwoorden`);
  ok(b.eerst && /^(H\d+|nazomer|telefoon)$/.test(b.eerst), `${b.id}: eerste verschijning`, b.eerst);
  ok(c.wie.length > 10 && c.pool.length >= 1 && c.stijl.length > 30, `${b.id}: kaart is volledig`);
}

// 3. proefzinnen
const WINTER = /\b(winter|sneeuw|ijs|vorst|kerst)/i;
const MERK = /\b(albert heijn|jumbo|coca|google|facebook|netflix|ikea|mcdonald|spotify|amazon|whatsapp)\b/i;
const GRONINGS_WOORDEN = /\b(nait|mien|doar|doarnoa|gien|joe|moi|kon minder|proaten|wel de|tee)\b/i;
for (const b of bladen) {
  ok(b.proef.length >= 2, `${b.id}: twee proefzinnen`, b.proef.length);
  for (const p of b.proef) {
    const w = woorden(p.tekst).length;
    ok(w >= 1 && w <= 20, `${b.id}: proefzin is kort genoeg`, `${w} woorden: ${p.tekst}`);
    ok(!WINTER.test(p.tekst), `${b.id}: altijd zomer`, p.tekst);
    ok(!MERK.test(p.tekst), `${b.id}: geen echt merk`, p.tekst);
    ok(!/de Grunn\b/i.test(p.tekst + (p.ondertitel || '')), `${b.id}: "Grunn", nooit "de Grunn"`);
    if (['3', 'F1', 'F2'].includes(b.dialect)) ok(p.ondertitel && p.ondertitel.length > 2, `${b.id}: plat Gronings of Fries heeft een Nederlandse ondertitel`, p.tekst);
    if (p.ondertitel) ok(!/\b(nait|mien|doar|gien|meitsje|hast|iten|sjochst|priuw|woe)\b/i.test(p.ondertitel), `${b.id}: de ondertitel is Nederlands`, p.ondertitel);
  }
}
// de spreekstijl uit de bijbel: Tammo zegt hooguit acht woorden, Tessa spreekt standaard Nederlands
for (const p of bladen.find((b) => b.id === 'tammo').proef) ok(woorden(p.tekst).length <= 8, 'Tammo: nooit meer dan acht woorden', p.tekst);
ok(bladen.find((b) => b.id === 'tessa').dialect === '0' && bladen.find((b) => b.id === 'tessa').proef.every((p) => !GRONINGS_WOORDEN.test(p.tekst)), 'Tessa spreekt standaard Nederlands, zonder Gronings woord');
ok(bladen.filter((b) => b.dialect === '0' && !['Tammo'].includes(b.naam)).every((b) => b.proef.every((p) => !GRONINGS_WOORDEN.test(p.tekst))), 'niveau 0: geen Gronings woord in de proefzinnen');
ok(bladen.find((b) => b.id === 'beppe').proef.filter((p) => /\b(ite|meitsje|hast)\b/.test(p.tekst)).length <= 2 && bladen.find((b) => b.id === 'beppe').dialect === 'F2', 'Beppe: Fries-getint met een Friese zin per proef');
ok(kaart('beppe').klasse === 'zeer oud' && kaart('beppe').tempo === 'langzaam' && /Friese vrouw/.test(kaart('beppe').wie), 'Beppe volgt uit het blad: hele oude Friese vrouw, langzaam', kaart('beppe').wie);
ok(kaart('tessa').tempo === 'snel' && kaart('tessa').taal === 'own', 'Tessa: snel en standaard Nederlands');
ok(kaart('tammo').taal === 'gro', 'Tammo wordt uit de Groningse spreektekst opgenomen');

// 4. overeenkomst met wat al is opgenomen: de stem van een bestaande rol is de stem van zijn clips
const opgenomen = new Map();
const loop = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) loop(f);
    else if (e.name === 'tts.json') {
      for (const [sleutel, v] of Object.entries(JSON.parse(fs.readFileSync(f, 'utf8')))) {
        const sp = sleutel.split('|')[0];
        if (!opgenomen.has(sp)) opgenomen.set(sp, new Map());
        opgenomen.get(sp).set(v.voice, (opgenomen.get(sp).get(v.voice) || 0) + 1);
      }
    }
  }
};
const AUDIO = path.join(ROOT, 'game', 'audio');
if (fs.existsSync(AUDIO)) loop(AUDIO);
if (opgenomen.size) {
  for (const b of bladen.filter((x) => x.opname)) {
    const m = opgenomen.get(b.opname);
    ok(!!m, `${b.id}: er zijn clips van "${b.opname}"`);
    if (m) ok(m.size === 1 && m.has(b.stem), `${b.id}: de stem van het blad is de stem van de opgenomen clips`, `${b.stem} tegen ${[...m.keys()].join(',')}`);
  }
  // een voorstel mag nog geen clips onder zijn eigen naam hebben die iets anders zeggen: de naam is vrij
  for (const b of bladen.filter((x) => x.voorstel)) ok(!b.opname, `${b.id}: een voorstel heeft geen opnamenaam`);
} else console.log('SKIP opnamecontrole: geen game/audio');
ok(bladen.every((b) => b.voorstel ? !b.opname : !!b.opname), 'elk blad is een opgenomen rol of een voorstel, nooit beide');

// 5. gedeelde stemmen: een nieuwe rol onderscheidt zich, en elk paar op een stem is te onderscheiden
for (const c of kaarten) {
  const b = bladen.find((x) => x.id === c.id);
  if (b.voorstel) ok(typeof b.onderscheid === 'string' && b.onderscheid.length > 20, `${c.id}: een voorstel zegt hoe hij zich onderscheidt`);
  for (const andere of c.deelt) {
    if (c.id < andere) ok(onderscheidbaar(c, kaart(andere)), `${c.id} en ${andere} delen ${c.stem} en lijken te veel op elkaar`, `${c.klasse}/${c.tempo}/${c.dialect}`);
  }
}
ok(kaart('hoving').deelt.includes('mem') && kaart('mem').deelt.includes('hoving'), 'Mem en Hoving delen Gacrux en weten het van elkaar');
ok(kaart('tammo').deelt.length === 0 && kaart('tessa').deelt.length === 0, 'Tammo en Tessa delen hun stem met niemand');
ok(kaart('aaltje').stem !== kaart('beppe').stem, 'twee Friese vrouwen krijgen niet dezelfde stem');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
