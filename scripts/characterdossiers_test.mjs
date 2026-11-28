// Consistency of the character dossiers (game/js/characterdossiers*.js): every card has every field
// (or 'n.v.t.'), relations are declared once and so are mutual, ages and family gaps are plausible,
// the references (voices, scenes, outfits, characters.js, script.json) exist, and no text breaks the
// constitution (no "de Grunn", no winter, no removed storyline). Pure: no Electron, no network.
//   node scripts/characterdossiers_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const D = await import('../game/js/characterdossiers.js');
const B = await import('../game/js/characterdossiers_base.js');
const C = await import('../game/js/characters.js');
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const script = JSON.parse(read('game/storydata/script.json'));

let n = 0;
const t = (naam, fn) => { n++; try { fn(); } catch (e) { console.log('FAIL', naam, '\n  ', String(e.message || e).split('\n').slice(0, 6).join('\n  ')); process.exitCode = 1; } };
const flat = (v) => (v && typeof v === 'object' ? Object.values(v).flatMap(flat) : [String(v)]);
const textOf = (d) => flat(d).join(' | ');

// ---- the story steps and acts from the script (the ground truth of "who comes when") ----
const stepAct = new Map();
const stepOrder = [];
for (const sc of script.scenes) if (!stepAct.has(sc.step)) { stepAct.set(sc.step, sc.act); stepOrder.push(sc.step); }
const actOf = (step) => (step === 'E' ? 5 : stepAct.get(step));
const speaking = new Map(); // script key -> { first, last } as step indices
for (const sc of script.scenes) for (const l of sc.lines || []) {
  if (!l.key) continue;
  const i = stepOrder.indexOf(sc.step);
  const s = speaking.get(l.key) || { first: i, last: i };
  s.first = Math.min(s.first, i); s.last = Math.max(s.last, i);
  speaking.set(l.key, s);
}

t('de dossiers zijn er en hebben unieke id\'s', () => {
  assert.ok(D.DOSSIERS.length >= 80, `verwacht minstens 80 dossiers, kreeg ${D.DOSSIERS.length}`);
  assert.equal(new Set(D.DOSSIERS.map((d) => d.id)).size, D.DOSSIERS.length, 'dubbel id');
});

t('elk dossier heeft elk veld, in het juiste soort', () => {
  for (const d of D.DOSSIERS) {
    for (const k of B.ALL_FIELDS) assert.ok(k in d, `${d.id}: veld ${k} ontbreekt`);
    for (const k of B.SCALAR_FIELDS) assert.equal(typeof d[k], 'string', `${d.id}: ${k} is geen tekst`);
    for (const k of B.LIST_FIELDS) assert.ok(Array.isArray(d[k]) && d[k].length >= 1 && d[k].every((x) => typeof x === 'string' && x), `${d.id}: ${k} is geen lijst met tekst`);
    assert.ok(d.age === B.NA || (Number.isInteger(d.age) && d.age >= 0 && d.age <= 110), `${d.id}: leeftijd ${d.age}`);
    assert.ok(B.TIERS.includes(d.tier), `${d.id}: tier ${d.tier}`);
    assert.ok(B.STATUSES.includes(d.status), `${d.id}: status ${d.status}`);
    assert.ok(B.PRONOUNS.includes(d.pronoun), `${d.id}: aanspreekvorm ${d.pronoun}`);
    assert.ok(B.OUTFIT_ROLES.includes(d.outfitRole), `${d.id}: outfitRole ${d.outfitRole}`);
    for (const k of ['arc', 'outfitByAct', 'homeByAct']) assert.ok(d[k] === B.NA || (d[k] && typeof d[k] === 'object'), `${d.id}: ${k}`);
    assert.ok(d.traits.length >= (d.tier === 'cameo' ? 2 : 3) || d.traits[0] === B.NA, `${d.id}: 3 tot 5 eigenschappen`);
    assert.ok(d.traits.length <= 5, `${d.id}: maximaal 5 eigenschappen`);
  }
});

t('de hoofdpersonen en de bijrollen zijn goed gevuld; de rest redelijk', () => {
  const min = { lead: 0.9, supporting: 0.8, minor: 0.6, cameo: 0.5, mentioned: 0.5, group: 0.5 };
  for (const d of D.DOSSIERS) {
    const s = B.fillStats(d);
    assert.ok(s.filled / s.total >= min[d.tier], `${d.id} (${d.tier}): ${s.filled}/${s.total} gevuld, minimaal ${Math.round(min[d.tier] * 100)} procent`);
  }
});

t('canon-markering klopt: alleen bestaande en gevulde velden', () => {
  for (const d of D.DOSSIERS) for (const k of d.canon) {
    assert.ok(B.ALL_FIELDS.includes(k), `${d.id}: canon noemt onbekend veld ${k}`);
    assert.ok(!B.isNA(d[k]), `${d.id}: canon-veld ${k} is n.v.t.`);
  }
  for (const d of D.DOSSIERS.filter((x) => x.status === 'candidate')) assert.equal(d.canon.length, 0, `${d.id}: een kandidaat heeft geen canonvelden`);
});

t('relaties: één keer verklaard, dus wederzijds; geen zelf, geen dubbel, alle velden gevuld', () => {
  const seen = new Set();
  for (const e of D.RELATIONS) {
    for (const k of B.EDGE_FIELDS) assert.ok(typeof e[k] === 'string' && e[k], `${e.a}-${e.b}: ${k} leeg`);
    assert.ok(D.DOSSIER_BY_ID.has(e.a) && D.DOSSIER_BY_ID.has(e.b), `relatie met onbekend personage: ${e.a}-${e.b}`);
    assert.notEqual(e.a, e.b, `${e.a} met zichzelf`);
    assert.ok(B.RELATION_TYPES.includes(e.type), `${e.a}-${e.b}: type ${e.type}`);
    const key = [e.a, e.b].sort().join('|');
    assert.ok(!seen.has(key), `dubbele relatie ${key}`);
    seen.add(key);
    assert.ok(e.from === 'met' || stepAct.has(e.from), `${e.a}-${e.b}: bekend-vanaf ${e.from} is geen stap`);
  }
  for (const d of D.DOSSIERS) {
    const mine = D.relationsFor(d.id);
    assert.ok(mine.length >= 1, `${d.id} heeft geen enkele relatie`);
    for (const r of mine) { // de afgeleide kant van B naar A bestaat en draait de rollen om
      const back = D.relationsFor(r.to).find((x) => x.to === d.id);
      assert.ok(back && back.is === r.theyAre && back.theyAre === r.is, `${d.id}-${r.to} niet wederzijds`);
    }
  }
  const duo = D.relationsFor('tammo').filter((r) => ['anita', 'rikus'].includes(r.to));
  assert.equal(duo.length, 2, 'Tammo kent Tessa en Rikus');
});

t('leeftijden en familie-afstanden zijn aannemelijk binnen de canon', () => {
  const age = (id) => D.dossierOf(id).age;
  assert.equal(age('tammo'), 24); assert.equal(age('anita'), 24); assert.equal(age('rikus'), 25);
  assert.equal(age('trijntje'), 92); assert.equal(age('mem'), 91); assert.equal(age('geesje'), 84);
  // 1953: beide bakkers waren jong (de afgeleide leeftijd uit de leeftijd nu en de kalender van het spel)
  for (const id of ['trijntje', 'mem']) { const [lo, hi] = B.ageIn(D.dossierOf(id), 1953); assert.ok(lo >= 16 && hi <= 30, `${id} was ${lo}-${hi} in 1953`); }
  assert.deepEqual(B.birthYears(D.dossierOf('tammo')), [2001, 2002], 'geboortejaren zijn alleen afgeleid');
  const gap = { vader: [18, 60], moeder: [18, 60], oma: [32, 72], opa: [32, 72], 'Friese oma': [32, 72], kleinzoon: [32, 72] };
  for (const e of D.RELATIONS.filter((x) => x.type === 'family')) {
    const a = D.dossierOf(e.a), b = D.dossierOf(e.b);
    if (typeof a.age !== 'number' || typeof b.age !== 'number') continue;
    const d = Math.abs(a.age - b.age);
    for (const [word, [lo, hi]] of Object.entries(gap)) {
      if (e.aIs.startsWith(word) || e.bIs.startsWith(word) || e.aIs.includes(`(${word}`) || e.bIs.includes(`(${word}`)) assert.ok(d >= lo && d <= hi, `${e.a}-${e.b}: ${word}, verschil ${d} jaar valt buiten ${lo}-${hi}`);
    }
  }
  const [dk, dw] = [D.dossierOf('durk'), D.dossierOf('douwe')];
  assert.equal(dk.age, dw.age, 'de tweeling is even oud');
});

t('de woonplek wisselt per akte: de hoofdpersonen hebben alle akten en het epiloog', () => {
  for (const id of ['tammo', 'anita']) {
    const h = D.dossierOf(id).homeByAct;
    for (const a of ['1', '2', '3', '4', '5', '6', 'E']) assert.ok(h[a], `${id}: woonplek in akte ${a}`);
  }
  for (const d of D.DOSSIERS) if (d.homeByAct !== B.NA) for (const k of Object.keys(d.homeByAct)) assert.ok(k === 'all' || k === 'E' || /^[1-6]$/.test(k), `${d.id}: homeByAct sleutel ${k}`);
});

t('de scene-gegevens kloppen met het script: wie komt wanneer', () => {
  const keys = new Set(D.DOSSIERS.map((d) => d.speakerKey));
  for (const k of Object.keys(script.speakers)) assert.ok(keys.has(k), `scriptspreker ${k} heeft geen dossier`);
  for (const d of D.DOSSIERS) {
    if (d.firstStep !== B.NA) assert.ok(stepAct.has(d.firstStep) || d.firstStep === 'E', `${d.id}: eerste stap ${d.firstStep} bestaat niet`);
    if (d.lastStep !== B.NA) assert.ok(stepAct.has(d.lastStep) || d.lastStep === 'E', `${d.id}: laatste stap ${d.lastStep} bestaat niet`);
    if (d.firstStep !== B.NA && d.lastStep !== B.NA) assert.ok(stepOrder.indexOf(d.firstStep) <= stepOrder.indexOf(d.lastStep), `${d.id}: eerste stap na de laatste`);
    const s = speaking.get(d.speakerKey);
    if (!s || d.firstStep === B.NA) continue;
    // de akte van de eerste (genoemde of geziene) stap mag eerder zijn dan de eerste spreekbeurt, nooit later
    assert.ok(actOf(d.firstStep) <= actOf(stepOrder[s.first]), `${d.id}: eerste stap ${d.firstStep} (akte ${actOf(d.firstStep)}) na de eerste spreekbeurt (${stepOrder[s.first]})`);
    assert.ok(actOf(d.lastStep) >= actOf(stepOrder[s.last]), `${d.id}: laatste stap ${d.lastStep} voor de laatste spreekbeurt (${stepOrder[s.last]})`);
  }
});

t('bekend-vanaf wijst naar echte velden en stappen', () => {
  for (const d of D.DOSSIERS) for (const [k, from] of Object.entries(d.reveal)) {
    assert.ok(['age', 'homePlace', 'work', 'origin'].includes(k), `${d.id}: reveal-veld ${k} staat niet op de kaart`);
    assert.ok(from === 'met' || stepAct.has(from), `${d.id}: reveal ${k} vanaf ${from}`);
  }
});

// ---- the references into the rest of the repo ----
t('elk personage van characters.js heeft een dossier met dezelfde naam, en de bio noemt dezelfde leeftijd', () => {
  const words = ['', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen'];
  const tens = { twintig: 20, dertig: 30, veertig: 40, vijftig: 50, zestig: 60, zeventig: 70, tachtig: 80, negentig: 90 };
  const num = (w) => { w = w.toLowerCase().replace(/ë/g, 'e'); if (tens[w]) return tens[w]; const m = w.match(/^(een|twee|drie|vier|vijf|zes|zeven|acht|negen)(?:en|ën|n)(twintig|dertig|veertig|vijftig|zestig|zeventig|tachtig|negentig)$/); return m ? words.indexOf(m[1]) + tens[m[2]] : null; };
  const nums = read('game/js/storyarc_nieuw.js').match(/(?:Een|Twee|Drie|Vier|Vijf|Zes|Zeven|Acht|Negen)(?:en|ën|n)(?:twintig|dertig|veertig|vijftig|zestig|zeventig|tachtig|negentig)/gi) || [];
  assert.ok(nums.length >= 3, 'verwacht de leeftijden in woorden in storyarc_nieuw.js');
  for (const c of C.CHARACTERS) {
    const d = D.dossierOf(c.id);
    assert.ok(d, `characters.js: ${c.id} heeft geen dossier`);
    const hay = `${d.name} ${d.nick}`.toLowerCase();
    assert.ok([c.name, ...c.speakers].some((s) => hay.includes(s.toLowerCase())), `${c.id}: dossiernaam "${d.name}" past niet bij "${c.name}"`);
  }
  const ages = { trijntje: 92, mem: 91, geesje: 84 };
  const src = read('game/js/storyarc_nieuw.js');
  for (const [id, a] of Object.entries(ages)) assert.equal(D.dossierOf(id).age, a, `${id}: leeftijd in het dossier`);
  assert.match(read('game/js/characters.js'), /Tweeënnegentig/); // de bio van Oma Trijntje is de bron voor 92
  assert.ok(nums.map(num).includes(91) && nums.map(num).includes(84), 'de naamkaarten noemen 91 en 84');
});

t('stemmen: de stem in het dossier is de stem uit de TTS-bron', () => {
  const src = read('scripts/tts_lines_list.mjs') + '\n' + read('scripts/tts_cast.mjs');
  const known = new Map();
  for (const m of src.matchAll(/^\s*(?:'([^'\n]+)'|(\[?[A-Za-z_]+\]?)):\s*\{[^\n]*?voice:\s*'(\w+)'/gm)) known.set(m[1] || m[2], m[3]);
  const voices = new Set([...known.values()]);
  assert.ok(voices.size >= 30, `verwacht minstens 30 stemmen, kreeg ${voices.size}`);
  let matched = 0;
  for (const d of D.DOSSIERS) {
    if (d.voice === B.NA) continue;
    assert.ok(voices.has(d.voice), `${d.id}: stem ${d.voice} staat niet in de TTS-bron`);
    const keys = [script.speakers[d.speakerKey] && script.speakers[d.speakerKey].voice, d.speakerKey === 'T' ? 'Tammo' : null, d.speakerKey === 'A' ? 'Anita' : null, d.speakerKey === 'rikus' ? '[NARRATOR]' : null, d.nick, d.name].filter(Boolean);
    const hit = keys.find((k) => known.has(k));
    if (hit) { matched++; assert.equal(known.get(hit), d.voice, `${d.id}: stem ${d.voice}, de bron zegt ${known.get(hit)} voor ${hit}`); }
  }
  assert.ok(matched >= 40, `verwacht dat minstens 40 stemmen aan de bron zijn gekoppeld, kreeg ${matched}`);
});

let sets = B.KNOWN_OUTFIT_SETS;
try { const cd = await import('../game/js/clothingdata.js'); sets = cd.SETS.map((s) => s.id); } catch { /* clothingdata.js is nog niet in de build: de ingebouwde lijst telt */ }
t('kleding: de verhaaloutfits van de hoofdpersonen bestaan', () => {
  for (const id of ['tammo', 'anita']) for (const [k, v] of Object.entries(D.dossierOf(id).outfitByAct)) assert.ok(sets.includes(v), `${id}: outfit ${v} (${k}) bestaat niet`);
});

// ---- the constitution ----
t('geen "de Grunn", geen winter, geen verwijderde verhaallijn in de dossiers', () => {
  const all = D.DOSSIERS.map(textOf).join('\n') + '\n' + D.RELATIONS.map((e) => flat(e).join(' ')).join('\n');
  assert.ok(!/\bde Grunn\b/i.test(all), '"de Grunn" staat in een dossier');
  assert.ok(!/\b(winter|sneeuw|ijsbaan|schaatsen|kerstmis)\b/i.test(all), 'winter in een dossier');
  assert.ok(!/gaswinning|aardbeving|Delfstof|versterk/i.test(all), 'een verwijderde verhaallijn (besluit eigenaar 21-11) staat in een dossier');
  assert.ok(!/@|https?:\/\/|\b\d{4}\s?[A-Z]{2}\b/.test(all), 'een e-mailadres, link of postcode staat in een dossier');
});

t('Jelle en zijn oma: geen moeder-variant in de dossiers', () => {
  const rel = D.relationsFor('jelle').find((r) => r.to === 'mem');
  assert.ok(rel && /kleinzoon/.test(rel.is) && /oma/.test(rel.theyAre), 'Jelle is de kleinzoon van Mem');
  const text = textOf(D.dossierOf('jelle')) + textOf(D.dossierOf('mem'));
  assert.ok(!/zijn moeder|haar zoon|zoon van Mem/i.test(text.replace(/Oudere docs[^|]*|Besluit eigenaar[^|]*|bestaande teksten[^|]*/g, '')), 'een moeder-variant staat in het dossier');
});

t('twee oma\'s (#1395): Oma Trijntje is Tessa\'s oma, Beppe is Tammo\'s oma, en ze zijn niet dezelfde', () => {
  const rel = (a, b) => D.relationsFor(a).find((r) => r.to === b);
  assert.equal(rel('anita', 'trijntje').type, 'family');
  assert.equal(rel('anita', 'trijntje').is, 'kleindochter');
  assert.equal(rel('anita', 'trijntje').theyAre, 'oma');
  assert.equal(rel('tammo', 'beppe').type, 'family');
  assert.match(rel('tammo', 'beppe').theyAre, /oma/);
  assert.equal(rel('tammo', 'trijntje').type, 'neighbours', 'Tammo kent Oma Trijntje als buurvrouw, niet als oma');
  assert.ok(!rel('anita', 'beppe') || rel('anita', 'beppe').type !== 'family', 'Beppe is niet Tessa\'s oma');
  const pa = rel('tessa_pa', 'trijntje');
  assert.ok(pa && pa.type === 'family' && pa.is === 'zoon' && pa.theyAre === 'moeder', 'Pa Mulder is Oma Trijntjes zoon');
  assert.ok(!rel('tammo_pa', 'trijntje'), 'Tammo\'s vader is niet haar zoon');
  assert.ok(!rel('trijntje', 'opa') || rel('trijntje', 'opa').type !== 'family', 'Opa is haar buurman en vriend, niet haar man');
  const tr = D.dossierOf('trijntje');
  assert.match(tr.name, /Mulder-Boelens/);
  assert.ok(!/Wierenga/.test(textOf(tr)), 'geen Wierenga bij Oma Trijntje');
  assert.equal(tr.firstStep, 'N8', 'Oma Trijntje is eerst in beeld in N8 (H3)');
  assert.notEqual(D.dossierOf('beppe').id, tr.id);
});

t('de kaart in het spel: spoilervrij, per veld bekend-vanaf', () => {
  const mem = 'mem';
  assert.deepEqual(D.cardFacts(mem, { met: false, done: new Set() }), [], 'wie je niet ontmoette toont niets');
  const early = D.cardFacts(mem, { met: true, done: new Set() }).map((f) => f.label);
  assert.ok(early.includes('Leeftijd') && !early.includes('Woont'), 'Mem: leeftijd direct, woonplaats pas na M20');
  assert.ok(D.cardFacts(mem, { met: true, done: new Set(['M20']) }).some((f) => f.label === 'Woont'), 'na M20 komt haar woonplaats erbij');
  const tr = D.cardFacts('trijntje', { met: true, done: new Set() });
  assert.ok(tr.some((f) => f.label === 'Voor Tessa' && f.text === 'oma'), 'Oma Trijntje is Tessa\'s oma');
  assert.ok(tr.some((f) => f.label === 'Voor Tammo' && /Oma van de straat/.test(f.text)), 'voor Tammo is ze de buurvrouw, Oma van de straat');
  assert.ok(!D.cardFacts('tammo', { met: true, done: new Set() }).some((f) => f.label === 'Voor Tammo'), 'geen "Voor Tammo" op Tammo\'s eigen kaart');
});

t('de kaart is aangesloten op Verhaal > Personages (broncheck)', () => {
  const vu = read('game/js/verhaalui.js');
  assert.match(vu, /from '\.\/characterdossiers\.js'/, 'verhaalui importeert de dossiers');
  assert.match(vu, /cardFacts\(c\.id/, 'de kaart leest de feiten per personage');
  assert.match(vu, /from '\.\/personagedossier\.js'/, 'de opmaak van het dossier staat in personagedossier.js (kop, feiten, Samen in, Meer)');
});

if (!process.exitCode) {
  const stats = { canon: 0, proposal: 0 };
  for (const d of D.DOSSIERS) { const s = B.fillStats(d); stats.canon += s.canon; stats.proposal += s.proposal; }
  console.log(`characterdossiers_test: ${n}/${n} ok (${D.DOSSIERS.length} dossiers, ${D.RELATIONS.length} relaties, ${stats.canon} canon-velden, ${stats.proposal} voorstel-velden)`);
}
