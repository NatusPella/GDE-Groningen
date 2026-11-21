// #987: gedragstest voor de onthullingsmeting (scripts/verhaal_onthulling.mjs) en de regressiebewaking van
// de opening en missie 1 t/m 3: hoogstens twee nieuwe namen per scène en geen onverklaarde verwijzing in de
// eerste vijf minuten, en geen onverklaarde verwijzing daarna.
//   node scripts/verhaal_onthulling_test.mjs
import fs from 'node:fs';
import { analyse, dichtheid, toets, laadScenes, NORM, LEXICON } from './verhaal_onthulling.mjs';

let n = 0, fails = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };
const sc = (id, at, lines, regie = []) => ({ id, at, regie, lines: lines.map(([speaker, text, dur = 3]) => ({ speaker, text, dur })) });

// --- de meetlat zelf, op kleine voorbeelden ---------------------------------------------------------------
{
  const r = analyse([sc('a', 0, [['Tammo', 'Moi, Tessa.'], ['Berend Bos', 'Goidag.'], ['Tessa', 'Berend heeft een bakkie.']])]);
  ok(r[0].namen.join() === 'berend', 'een nieuwe stem is een nieuwe naam, de hoofdpersonen zijn gratis, een herhaling telt niet', r[0].namen.join());
}
{
  const r = analyse([sc('a', 0, [['Tessa', 'We doen mee aan de Noordelijke Snackprijs.']])]);
  ok(r[0].onverklaard.length === 1 && r[0].regels[0].leeg, 'een evenement zonder uitleg is onverklaard en een lege regel');
}
{
  const r = analyse([sc('a', 0, [['Tessa', 'We doen mee aan de Snackprijs.'], ['Tammo', 'Wat is dat?'], ['Tessa', 'Een wedstrijd voor de beste eierbal.']])]);
  ok(r[0].onverklaard.length === 0, 'een uitleg in de volgende regels van dezelfde scène telt');
}
{
  const r = analyse([sc('a', 0, [['Tessa', 'Dat is de Snackprijs, een wedstrijd voor de beste eierbal.']]), sc('b', 10, [['Tessa', 'Weer de Snackprijs.']])]);
  ok(r[0].namen.length === 1 && r[1].namen.length === 0 && r[1].onverklaard.length === 0, 'een naam telt één keer en een eenmaal gegeven uitleg blijft staan', JSON.stringify([r[0].namen, r[1].namen, r[1].onverklaard]));
  const w = analyse([sc('a', 0, [['Tessa', 'Dat is de Snackprijs.']]), sc('b', 10, [['Tessa', 'Weer de Snackprijs.']])]);
  ok(w[1].onverklaard.length === 1, 'een herhaling zonder uitleg blijft onverklaard');
}
{
  const r = analyse([sc('a', 0, [['Tessa', 'Het klooster van mijn opa stond er al in 1953, zoals je weet.']])]);
  ok(r[0].voorgeschiedenis.length === 1 && r[0].regels[0].voorgeschiedenis.length >= 2, 'voorgeschiedenis telt één keer per regel, met alle trefwoorden');
}
{
  const r = analyse([sc('a', 0, [['Tessa', 'Trede twee van de complimentenladder, Tammo.']])]);
  ok(r[0].onverklaard.length >= 1, 'een verwijzing naar iets wat nergens is getoond is onverklaard');
  const r2 = analyse([sc('a', 0, [['Berend Bos', 'De complimentenladder heeft vijf treden, een ladder van complimenten.'], ['Tessa', 'Trede twee van de complimentenladder, Tammo.']])]);
  ok(r2[0].onverklaard.length === 0, 'dezelfde verwijzing na de uitleg is goed', JSON.stringify(r2[0].onverklaard));
}
{
  const r = analyse([sc('a', 0, [['Tessa', 'Sjabbe, Durk en Douwe werken voor Jelle.']])]);
  ok(toets(r).some((f) => /nieuwe namen/.test(f)), 'te veel nieuwe namen in de eerste vijf minuten is een overtreding', toets(r).join(' | '));
  const laat = analyse([sc('a', 400, [['Tessa', 'Sjabbe, Durk en Douwe werken samen.']])]);
  ok(!toets(laat).some((f) => /nieuwe namen/.test(f)), 'na vijf minuten mag een scène drie namen dragen');
  const vier = analyse([sc('a', 400, [['Tessa', 'Sjabbe, Durk, Douwe en Berend werken voor Jelle.']])]);
  ok(toets(vier).some((f) => /nieuwe namen/.test(f)), 'maar geen vier');
}
{
  const r = analyse([sc('a', 0, [['Tessa', 'Moi.'], ['Tammo', 'Moi.']]), sc('b', 70, [['Tessa', 'Berend.'], ['Tessa', 'Jelle.']])]);
  const d = dichtheid(r);
  ok(d.length === 2 && d[0].nieuw === 0 && d[1].nieuw === 2 && d[1].regels === 2, 'de dichtheid telt nieuwe dingen en regels per minuut', JSON.stringify(d));
}
ok(NORM.namenPerScene === 2 && NORM.onverklaardPerScene === 0 && NORM.eersteMinuten === 5, 'de norm is twee namen, nul onverklaard, vijf minuten');
ok(LEXICON.every((e) => e.id && e.kind && e.re), 'elk lexiconitem heeft id, soort en herkenning');

// --- de echte opening en missie 1 t/m 3 -----------------------------------------------------------------
const scenes = analyse(laadScenes());
const ids = scenes.map((s) => s.id);
ok(ids[0] === 'C00.1 (trailermontage)' && ids[1] === 'C00.2' && ids[2] === 'C00.3', 'de speelvolgorde begint met trailer, keuken, verhuisdag', ids.slice(0, 3).join());
ok(['M01.1', 'M01.6', 'M02.3', 'M03.2', 'M03.4'].every((i) => ids.includes(i)), 'M01 t/m M03 staan in de meting');
const at = (s) => s.at;
ok(scenes.every((s, i) => i === 0 || at(s) >= at(scenes[i - 1])), 'de tijden lopen op');
const fouten = toets(scenes);
ok(fouten.length === 0, 'de norm voor de opening en M01-M03 wordt gehaald', fouten.join(' | '));
const eerste = scenes.filter((s) => s.at < NORM.eersteMinuten * 60);
ok(eerste.length >= 5, 'er zijn scènes in de eerste vijf minuten', eerste.length);
ok(eerste.every((s) => s.namen.length <= 2), 'elke scène in de eerste vijf minuten heeft hoogstens twee nieuwe namen', eerste.map((s) => `${s.id}:${s.namen.length}`).join(' '));
ok(scenes.every((s) => s.onverklaard.length === 0), 'nergens een onverklaarde verwijzing', scenes.filter((s) => s.onverklaard.length).map((s) => s.id).join());
const keuken = scenes.find((s) => s.id === 'C00.2');
ok(keuken && keuken.namen.length <= 2 && keuken.regels.length <= 26, 'de keuken noemt hoogstens twee namen in zesentwintig regels (kern 21-11: de zorg om elkaar kwijt te raken staat in de opening)', keuken && keuken.namen.join());
ok(scenes.flatMap((s) => s.regels).every((r) => !/complimentenladder/i.test(r.text) || r.speaker !== 'Tessa'), 'Tessa verwijst niet meer naar een ladder die niemand heeft uitgelegd');

// de regie en het script blijven bij elkaar: het script heeft 3 + 18 + 5 regels in de opening, cutscenes.js splitst op die plekken
const data = JSON.parse(fs.readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));
const count = (id) => data.scenes.find((s) => s.id === id).lines.length;
const cut = fs.readFileSync(new URL('../game/js/cutscenes.js', import.meta.url), 'utf8');
const split = /const ACT_SPLIT = \[(\d+), (\d+), (\d+), Infinity\]/.exec(cut);
ok(split && +split[2] === count('C00.1') && +split[3] === count('C00.1') + count('C00.2'), 'ACT_SPLIT in cutscenes.js volgt de regelaantallen van C00.1 en C00.2', split && split.slice(1).join());
ok(/const OPENING_CUT = \[\];/.test(cut), 'de opening heeft geen stille, geschrapte regels meer');

// de haak staat in beeld: de slotkaart van de trailer zegt wat er aan de hand is
const montage = fs.readFileSync(new URL('../game/js/intromontage.js', import.meta.url), 'utf8');
const opening = fs.readFileSync(new URL('../game/js/openingfilm.js', import.meta.url), 'utf8');
ok(/class="im-tagline">\$\{TITLE\.tagline\}<\/div><div class="im-kicker">\$\{TITLE\.sub\}/.test(montage) && /tagline: 'Ontdek jezelf in Grunn\.'/.test(opening) && /sub: 'Twee afgestudeerden\. Eén zomer\. Nog geen plan\.'/.test(opening), 'de slotkaart van de trailer noemt de haak: twee afgestudeerden, één zomer, nog geen plan');

console.log(`${n - fails}/${n} verhaal_onthulling`);
process.exit(fails ? 1 : 0);
