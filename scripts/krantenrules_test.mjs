// De krant- en folderronde (#405): de regels van krantenrules.js en dat de baan overal is aangemeld.
//   node scripts/krantenrules_test.mjs
// - de worp: dichtbij en langzaam is raak, snel en ver mist vaker; de uitkomst volgt de afstanden; de ruis is normaal verdeeld
// - het loon: raak betaalt meer dan de mat, een misser niets, fooi alleen voor een ronde zonder misser; de luie weg
//   (de stapel in de papiercontainer bij de vijver) betaalt minder dan nette bezorgers en heeft geen fooi
// - de meetpunten langs een weg: om de stap, ook over een bocht, in beide richtingen, binnen de lengte
// - de teksten: Nederlands, verzonnen kranten en folders, geen echt merk, niets over vervuilen
// - de baan: in SIDE_JOBS, een vak (Bezorgen), een pictogram, een prestatie, een prijsschatting; dezelfde sleutels als de andere banen
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as R from '../game/js/krantenrules.js';

let n = 0;
const t = (name, f) => { f(); n++; };
const bron = (p) => fs.readFileSync(new URL('../game/js/' + p, import.meta.url), 'utf8');
// een vaste reeks getallen, zodat de test elke keer hetzelfde doet
const reeks = (seed) => { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };

t('de spreiding groeit met de afstand en de snelheid, en de afstand houdt bij het bereik op', () => {
  assert.ok(R.worpSpreiding(5, 0) < R.worpSpreiding(15, 0), 'verder is lastiger');
  assert.ok(R.worpSpreiding(8, 0) < R.worpSpreiding(8, 7), 'sneller is lastiger');
  assert.equal(R.worpSpreiding(40, 0), R.worpSpreiding(R.WORP_BEREIK, 0), 'boven het bereik telt de afstand niet verder mee');
  assert.equal(R.worpSpreiding(-3, -2), 0.5, 'nooit onder het vaste deel');
});

t('de uitkomst: bus, mat, gemist op de grenzen', () => {
  assert.equal(R.worpUitkomst(0), 'bus');
  assert.equal(R.worpUitkomst(R.BUS_R), 'bus');
  assert.equal(R.worpUitkomst(R.BUS_R + 0.01), 'mat');
  assert.equal(R.worpUitkomst(R.MAT_R), 'mat');
  assert.equal(R.worpUitkomst(R.MAT_R + 0.01), 'gemist');
});

t('een gooi uit stilstand vanaf dichtbij is vaker raak dan op volle snelheid van ver, en een misser komt voor', () => {
  const tel = (afstand, snelheid) => {
    const r = reeks(7), c = { bus: 0, mat: 0, gemist: 0 };
    for (let i = 0; i < 4000; i++) c[R.worpUitkomst(R.worpFout(afstand, snelheid, R.ruisUit(r)))]++;
    return c;
  };
  const dichtbij = tel(4, 0), ver = tel(16, 7);
  assert.ok(dichtbij.bus / 4000 > 0.7, 'dichtbij en langzaam: meestal raak ' + dichtbij.bus);
  assert.ok(ver.bus < dichtbij.bus * 0.5, 'ver en snel: veel minder raak');
  assert.ok(ver.gemist > 400, 'ver en snel: een misser komt voor ' + ver.gemist);
  assert.ok(dichtbij.gemist < 100, 'dichtbij en langzaam: bijna nooit mis ' + dichtbij.gemist);
  assert.ok(ver.mat > 400, 'de deurmat is een echte uitkomst ' + ver.mat);
});

t('de ruis is bijna normaal verdeeld met sd rond 1', () => {
  const r = reeks(11); const v = [];
  for (let i = 0; i < 20000; i++) v.push(R.ruisUit(r));
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length);
  assert.ok(Math.abs(m) < 0.05, 'gemiddeld nul ' + m);
  assert.ok(sd > 0.9 && sd < 1.1, 'sd rond 1 ' + sd);
  assert.ok(v.every((x) => Math.abs(x) <= 3.0001), 'begrensd');
});

t('het loon van een ronde: raak > mat > mis, fooi alleen zonder misser', () => {
  const alles = R.rondeLoon({ bus: 6 }), half = R.rondeLoon({ bus: 3, mat: 3 }), mis = R.rondeLoon({ bus: 4, mat: 1, gemist: 1 });
  assert.equal(alles.base, R.RONDE_VAST + 6 * R.WORP_LOON.bus);
  assert.ok(alles.base > half.base && half.base > mis.base, 'meer raak betaalt meer');
  assert.ok(alles.tip > 0 && alles.perfect && alles.schoon, 'alles in de bus: fooi');
  assert.equal(half.tip, 0, 'mat is geen fooi');
  assert.equal(mis.tip, 0); assert.equal(mis.schoon, false, 'een misser is niet schoon');
  assert.equal(R.rondeLoon({}).base, R.RONDE_VAST, 'zonder worpen alleen de vaste vergoeding');
  assert.equal(R.rondeLoon({ bus: 2 }).tip, 0, 'minder dan drie huizen geeft geen fooi');
});

t('de luie weg: de stapel in de container betaalt, maar minder dan nette bezorgers, zonder fooi', () => {
  for (const huizen of [3, 4, 6, 8]) {
    const lui = R.luiLoon(huizen);
    const half = R.rondeLoon({ bus: Math.ceil(huizen / 2), mat: Math.floor(huizen / 2) });
    const perfect = R.rondeLoon({ bus: huizen });
    assert.ok(lui.base >= 1 && lui.tip === 0, 'betaald, zonder fooi');
    assert.ok(lui.base < half.base, `${huizen} huizen: lui ${lui.base} is minder dan half raak ${half.base}`);
    assert.ok(lui.base < perfect.base + perfect.tip, 'en dus veel minder dan alles raak met fooi');
  }
  assert.ok(R.LUI_FACTOR > 0.3 && R.LUI_FACTOR < 0.9, 'wel echt betaald: het is een grapje, geen straf');
});

t('een bot die rondes fietst (elke worp op 7 m, 5 m/s): netjes bezorgen betaalt duidelijk meer dan de luie weg, en een ronde betaalt als een klein bijbaantje', () => {
  const r = reeks(21);
  for (const huizen of [4, 5, 6, 8]) {
    let netjes = 0, lui = 0;
    const rondes = 400;
    for (let i = 0; i < rondes; i++) {
      const w = { bus: 0, mat: 0, gemist: 0 };
      for (let h = 0; h < huizen; h++) w[R.worpUitkomst(R.worpFout(7, 5, R.ruisUit(r)))]++;
      const l = R.rondeLoon(w);
      netjes += l.base + l.tip; lui += R.luiLoon(huizen).base;
    }
    netjes /= rondes; lui /= rondes;
    assert.ok(netjes > lui * 1.4, `${huizen} huizen: netjes ${netjes.toFixed(1)} tegen lui ${lui.toFixed(1)}: netjes moet duidelijk meer opleveren`);
    assert.ok(lui >= 8 && netjes <= 60, `${huizen} huizen: het loon blijft in de buurt van een bijbaantje (${lui.toFixed(1)} tot ${netjes.toFixed(1)})`);
  }
});

t('het aantal huizen groeit met het niveau en de reeks, en de stapel heeft reserve', () => {
  assert.equal(R.huizenAantal(1, 0), 4);
  assert.ok(R.huizenAantal(5, 0) > R.huizenAantal(1, 0), 'hoger niveau: meer huizen');
  assert.ok(R.huizenAantal(1, 3) > R.huizenAantal(1, 0), 'een reeks: een extra huis');
  assert.equal(R.huizenAantal(99, 99), 8, 'maximaal acht');
  for (const h of [4, 6, 8]) assert.equal(R.stapelGrootte(h), h + 3, 'drie reserve');
});

t('meetpunten langs een weg: om de stap, over een bocht, in beide richtingen', () => {
  const pts = [[0, 0], [30, 0], [30, 40], [90, 40]];   // rechtdoor, naar boven, rechtdoor
  const voor = R.meetpunten(pts, 0, 1, 5, 0, 12, 150);
  assert.ok(voor.length >= 8, 'genoeg punten ' + voor.length);
  assert.deepEqual(voor[0], { x: 17, y: 0, ux: 1, uy: 0 }, 'het eerste punt ligt een stap verder, richting de weg op');
  for (let i = 1; i < voor.length; i++) assert.ok(Math.abs(Math.hypot(voor[i].x - voor[i - 1].x, voor[i].y - voor[i - 1].y) - 12) < 12.0001, 'nooit verder dan een stap (de bocht telt korter)');
  const bocht = voor.find((p) => p.uy === 1);
  assert.ok(bocht && bocht.x === 30, 'na de bocht langs de y-as');
  const terug = R.meetpunten(pts, 1, -1, 30, 20, 12, 60);
  assert.ok(terug.length >= 4 && terug[0].uy === -1, 'achteruit langs de weg');
  assert.equal(R.meetpunten(pts, 0, 1, 0, 0, 12, 0).length, 0, 'lengte nul: niets');
  assert.equal(R.meetpunten([[0, 0]], 0, 1, 0, 0, 12, 100).length, 0, 'een weg zonder segment: niets');
  const totaal = R.meetpunten(pts, 0, 1, 0, 0, 10, 40);
  assert.ok(totaal.length <= 4, 'binnen de lengte ' + totaal.length);
});

t('kiesWijk: binnen bereik, dichtbij uitgesloten, met en zonder vijver, uitzonderingen', () => {
  const punten = [{ name: 'A', x: 100, y: 0 }, { name: 'B', x: 900, y: 0, vijver: true }, { name: 'C', x: 3000, y: 0 }, { name: 'D', x: 20, y: 0 }, { name: 'E', x: 700, y: 700 }];
  const r = reeks(3);
  for (let i = 0; i < 30; i++) {
    const w = R.kiesWijk(punten, { x: 0, y: 0 }, { rand: r });
    assert.ok(['B', 'E'].includes(w.name), 'tussen 250 en 1500 m: ' + w.name);
  }
  assert.equal(R.kiesWijk(punten, { x: 0, y: 0 }, { vijver: true, rand: r }).name, 'B');
  assert.equal(R.kiesWijk(punten, { x: 0, y: 0 }, { vijver: false, rand: r }).name, 'E');
  assert.equal(R.kiesWijk(punten, { x: 0, y: 0 }, { uitgezonderd: ['B', 'E'] }), null, 'niets over');
  assert.equal(R.kiesWijk([], { x: 0, y: 0 }), null);
  assert.equal(R.kiesWijk(punten, { x: 0, y: 0 }, { maxAfstand: 4000, minAfstand: 0, uitgezonderd: ['A', 'B', 'D', 'E'] }).name, 'C');
  assert.ok(R.kiesWijk([{ name: 'X', x: NaN, y: 0 }, null, { x: 5, y: 5 }], { x: 0, y: 0 }) === null, 'onbruikbare punten vallen af');
});

t('de teksten: Nederlands, verzonnen, vriendelijk voor het water', () => {
  const alles = [R.KRANTEN, R.FOLDERS, R.VIJVER_VOORAF, R.VIJVER_KLAAR, R.BUS_LINES, R.MAT_LINES, R.MIS_LINES, R.TE_VER, R.KLAAR_NETJES, [R.GEEN_STAPEL, R.OPDRACHTGEVER, R.BAAS]].flat();
  assert.ok(alles.length >= 30, 'genoeg teksten ' + alles.length);
  for (const x of alles) assert.ok(typeof x === 'string' && x.length > 6 && x === x.trim(), 'tekst: ' + x);
  const tekst = alles.join(' ');
  assert.ok(!/Telegraaf|Volkskrant|Dagblad|Albert Heijn|Jumbo|Hema|Bol\.com|Action|Blokker|Gamma|Praxis|Intratuin|NRC|Trouw/i.test(tekst), 'geen echt merk of echte krant');
  assert.ok(!/de Grunn\b/.test(tekst), 'nooit "de Grunn"');
  assert.ok(!/vervuil|plastic|troep|rommel|afval in het water|in het water gooien|de vijver in/i.test(tekst), 'niets dat vervuilen toont');
  assert.ok(R.VIJVER_VOORAF.every((x) => /container/i.test(x)), 'het voorstel noemt de container, niet het water zelf');
  assert.ok(R.VIJVER_KLAAR.some((x) => /vijver blijft schoon|recycled/i.test(x)), 'het grapje zegt dat het schoon blijft');
  assert.ok(!/\b(jongens|dames en heren)\b/i.test(tekst), 'inclusieve woorden');
  assert.ok(!/(sneeuw|winter|ijs|vorst|herfst|november)\b/i.test(tekst), 'altijd zomer');
});

t('de baan is overal aangemeld: SIDE_JOBS, Bezorgen, pictogram, prestatie, prijsschatting', () => {
  const sj = bron('sidejobs.js');
  assert.match(sj, /import krantenwijk from '\.\/sidejob_krantenwijk\.js'/, 'geïmporteerd');
  assert.match(sj, /export const SIDE_JOBS = \[bezorger, krantenwijk,/, 'in SIDE_JOBS');
  assert.match(sj, /case 'krant':/, 'een pictogram in drawJobGlyph');
  assert.match(sj, /krantenwijk: \[\d+, \d+\]/, 'een prijsschatting');
  assert.match(bron('loopbaan.js'), /krantenwijk: 'bezorg'/, 'het vak Bezorgen (loopbaan, #381)');
  assert.match(bron('achievements.js'), /id: 'sj_krantenwijk'[^\n]*stat: 'sj_krantenwijk_streak'/, 'een prestatie op de reeks');
  const job = bron('sidejob_krantenwijk.js');
  assert.match(job, /id: 'krantenwijk'/); assert.match(job, /glyph: 'krant'/);
  for (const haak of ['anchor(map)', 'start(c)', 'round(c)', 'update(dt, c)', 'view(c)', 'stop(c)', 'interact(c)', 'prompt(c)', 'timeout(c)']) assert.ok(job.includes(haak), 'de baan heeft ' + haak);
  assert.match(job, /needsVehicle: \(\) => false/, 'lopend kan ook');
  assert.match(job, /c\.complete\(\{ base, tip, text: 'De stapel in de container\.', flawless: false \}\)/, 'de container betaalt maar telt niet als foutloos');
  assert.doesNotMatch(job, /isInWater\([^)]*\)\s*\)\s*\{[^}]*stapel/s, 'de stapel gaat nooit het water in');
});

console.log(`krantenrules_test: ${n} blokken ok`);
