// #662: het eerste speelbare moment van een nieuw spel moet onder de drie
// minuten blijven, en de overslaan-hint moet meteen in beeld staan.
// node scripts/openingtempo_test.mjs  (leest dezelfde catalogus als de balans)
//
// De opening (C00.1-C00.3 + eindkaart) wordt uit script.json getimed door
// cutpreview.js/openingActs; story.js speelt precies die acts. Voor de fix was de
// keukenscene 111 s en de opening 168,8 s; na het schrappen van de grappen die
// niet het doel dragen is dat 89,9 s en 147,7 s.
import fs from 'node:fs';
const { buildCatalog } = await import('../game/js/cutpreview.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const root = new URL('../', import.meta.url);
const script = JSON.parse(fs.readFileSync(new URL('game/storydata/script.json', root), 'utf8'));
const cat = buildCatalog({ script, npcSource: fs.readFileSync(new URL('game/js/missionstory.js', root), 'utf8') });
const opening = cat.filter((e) => e.group === 'Opening');
const total = opening.reduce((a, e) => a + (e.duration || 0), 0);
const kitchen = opening.find((e) => e.id === 'story-opening-keuken');
const trailer = opening.find((e) => e.id === 'story-opening-trailer');

ok(opening.length === 4, 'vier openingdelen (drie acts en de eindkaart)', opening.length);
ok(total <= 180, 'eerste speelbare moment binnen 3 minuten', `${total.toFixed(1)} s`);
ok(total <= 160, 'met marge onder de 3 minuten (na #662)', `${total.toFixed(1)} s`);
ok(kitchen && kitchen.duration < 100, 'de keukenscene is ingekort', kitchen && kitchen.duration.toFixed(1));
ok(trailer && trailer.duration < 40, 'de eerste scène is kort', trailer && trailer.duration.toFixed(1));
console.log(`#662 meting: opening totaal ${total.toFixed(1)} s, keuken ${kitchen.duration.toFixed(1)} s (was 111,1 s), eerste scène ${trailer.duration.toFixed(1)} s; oud totaal 168,8 s`);

// dezelfde functie die de meting doet, speelt story.js ook: meet en spel lopen gelijk
const story = fs.readFileSync(new URL('game/js/story.js', root), 'utf8');
const cut = fs.readFileSync(new URL('game/js/cutscenes.js', root), 'utf8');
ok(/import \{ openingActs, END_CARD, flatScene \} from '\.\/cutscenes\.js'/.test(story), 'story.js speelt dezelfde openingActs als de meting');
ok(/export function openingActs\(lines\)/.test(cut) && /openingLineCut/.test(cut), 'de inkorting zit in openingActs zelf');

// de overslaan-hint: meteen bij de start van een scène, geen timer
const cine = fs.readFileSync(new URL('game/js/cinematics.js', root), 'utf8');
const toggle = cine.match(/r\.classList\.toggle\('show-skip',([^\n]*)\)/);
ok(!!toggle && /skippable/.test(toggle[1]), 'show-skip gaat meteen aan voor een scène die over te slaan is', toggle && toggle[1].trim());
ok(!/setTimeout\([^)]*show-skip/.test(cine), 'geen vertraging op de overslaan-hint');
ok(/Houd<\/span><span class="hud-key">SPATIE/.test(cine), 'de hint noemt Spatie');

console.log(`${n - fails}/${n} openingtempo`);
process.exit(fails ? 1 : 0);
