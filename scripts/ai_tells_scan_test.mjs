// Test voor scripts/ai_tells_scan.mjs (23-11): de kenmerken vangen wat ze moeten vangen, gewoon Nederlands komt erdoor,
// en de telling in de speltekst komt per kenmerk niet boven scripts/ai_tells_baseline.json (die mag alleen dalen:
// zet hem na een opschoonronde lager met `node scripts/ai_tells_scan.mjs --write`). Uitleg: docs/AI-TELLS-23-11.md.
//   node scripts/ai_tells_scan_test.mjs
import { KENMERKEN, scan, tellingen, leesBaseline } from './ai_tells_scan.mjs';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.log('FAIL ' + msg); } };
const kenmerk = (id) => KENMERKEN.find((k) => k.id === id);
const vangt = (id, t) => !!kenmerk(id).test(t);

// de kenmerken
ok(vangt('gedachtestreepje', 'Je geld blijft van jou — de rest niet.') && vangt('gedachtestreepje', 'Rij door – hij komt eraan'), 'gedachtestreepje midden in een zin');
ok(!vangt('gedachtestreepje', 'Eet wat. Ik wil niks. – M.') && !vangt('gedachtestreepje', 'GDE Groningen – Zomer vol misdaad') && !vangt('gedachtestreepje', 'Toetsen 1 – 4'), 'ondertekening, spelnaam en bereik tellen niet');
ok(vangt('niet-x-maar-y', 'Het is niet alleen een spel, maar ook een gevoel.') && !vangt('niet-x-maar-y', 'Rij naar de kade.'), 'niet X, maar Y');
ok(vangt('ai-woord', 'Duik in een naadloze wereld.') && vangt('ai-woord', 'Ontdek jezelf in Grunn.') && !vangt('ai-woord', 'Ontdek 33 buurten'), 'modelwoorden; ontdekken als prestatie mag');
ok(vangt('drietal', 'Zwart, zwaar en onverwoestbaar') && !vangt('drietal', 'Zuinig en saai. Precies wat je moeder wil'), 'drietal');
ok(vangt('staccato-drietal', 'Twee vrienden. Eén zomer. Geen plan.') && !vangt('staccato-drietal', 'Twee vrienden zonder plan. Eén lange zomer.'), 'staccato-drietal');
ok(vangt('title-case', 'Rood Licht Is Een Mening') && vangt('title-case', 'Nieuw Spel Starten'), 'Title Case');
ok(!vangt('title-case', 'Café De Lallende Koe') && !vangt('title-case', 'Grote Markt') && !vangt('title-case', 'Rood licht is een mening'), 'eigennamen en zinsletter');
ok(vangt('titel-dubbelepunt', 'Groningen: een reis') && !vangt('titel-dubbelepunt', 'Te hoog: de politie komt'), 'titel met dubbele punt, statusregel niet');
ok(vangt('emoji', 'Gelukt 🎉') && !vangt('emoji', 'Wanted ★★☆'), 'emoji; sterren zijn geen emoji');
ok(vangt('engels-woord', 'Quest completed, check your rewards') && !vangt('engels-woord', 'Een tip: de shop is open'), 'Engelse woorden; ingeburgerde woorden mogen');
ok(vangt('dubbele-spatie', 'Rij  door') && !vangt('dubbele-spatie', 'Rij door'), 'dubbele spatie');
ok(vangt('drie-puntjes', 'Wacht even...') && !vangt('drie-puntjes', 'Wacht even…'), "drie puntjes tegen '…'");
ok(vangt('uitroep-stapel', 'Snel! Nu! Weg!') && !vangt('uitroep-stapel', 'Snel! Weg hier.'), 'uitroepstapel');
ok(vangt('nep-statistiek', '87% van de spelers vindt dit leuk') && !vangt('nep-statistiek', 'Je verkoper krijgt 30% van de winst.'), 'nep-statistiek; een spelregel met een percentage mag');
ok(vangt('placeholder-debug', 'TODO tekst') && vangt('placeholder-debug', 'Lorem ipsum dolor'), 'placeholder');
ok(vangt('laten-we', 'Laten we beginnen!') && vangt('afsluitzin', 'Want uiteindelijk draait het om vriendschap.'), 'presentatorentoon en slotzin');

// identieke zin: één regel per zin, spiegels (ondertitels, verhaalscript) tellen niet
const items = [
  { file: 'game/js/a.js', line: 1, text: 'Dit is een zin die twee keer voorkomt.', kind: 'js' },
  { file: 'game/js/b.js', line: 2, text: 'Dit is een zin die twee keer voorkomt.', kind: 'js' },
  { file: 'game/js/subtitles.js', line: 3, text: 'Deze zin staat ook in de ondertitels hier.', kind: 'js' },
  { file: 'game/js/c.js', line: 4, text: 'Deze zin staat ook in de ondertitels hier.', kind: 'js' },
];
const id = scan({ items }).filter((h) => h.kenmerk === 'identieke-zin');
ok(id.length === 1 && id[0].term.includes('game/js/b.js'), 'identieke zin één keer geteld, spiegel niet');

// de echte speltekst: per kenmerk niet boven de baseline
const base = leesBaseline();
ok(base && base.per, 'scripts/ai_tells_baseline.json bestaat');
if (base && base.per) {
  const per = tellingen(scan());
  for (const [k, n] of Object.entries(per)) {
    const max = base.per[k];
    ok(max != null, `kenmerk ${k} staat in de baseline`);
    ok(max == null || n <= max, `${k}: ${n} treffers, baseline ${max} (de telling mag alleen dalen; zie --kenmerk=${k})`);
  }
}

console.log(failed ? `ai_tells_scan_test: ${failed} FAIL` : 'ai_tells_scan_test: alles ok');
process.exit(failed ? 1 : 0);
