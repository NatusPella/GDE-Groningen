// HUD-meldingen en -knoppen (#966, #971, #975):
//  - radiomeldingen staan lang genoeg in beeld, en gewone berichten ook (world.readingSeconds);
//  - de grijze knop rechtsonder heet "Spelerslijst" met uitleg, geen kaal "Spelers";
//  - de keybind-hints voor radio en dempen staan niet meer in de HUD (wel in de instellingen).
//   node scripts/hudmeldingen_test.mjs
import { readFileSync } from 'node:fs';
import { nowPlayingSeconds, NP_MIN, NP_MAX } from '../game/js/hudrules.js';
import { readingSeconds } from '../game/js/world.js';
import { SPELERS_KNOP, spelersKnopTekst } from '../game/js/coopspelers.js';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ` (${info})` : ''}`); } };

// #975: een radiomelding is minstens 6,5 s in beeld en groeit mee met de tekst
const kort = nowPlayingSeconds({ station: 'G-Music', title: 'Even stilte' });
const lang = nowPlayingSeconds({ station: 'G-Music · Nachtstreek', title: 'Een heel lange titel van een plaat', artist: 'Rikus draait: de nachtploeg van de provincie' });
ok(kort === NP_MIN && kort >= 6.5, 'de kortste radiomelding blijft 6,5 s staan', String(kort));
ok(lang > kort && lang <= NP_MAX, 'een lange radiomelding blijft langer staan, met een plafond', String(lang));
ok(nowPlayingSeconds(null) >= 6.5 && Number.isFinite(nowPlayingSeconds(undefined)), 'zonder gegevens valt hij terug op de ondergrens');
ok(readingSeconds('Kort.') >= 3 && readingSeconds('Een zin die je rustig wilt kunnen lezen, met een paar woorden extra.') > readingSeconds('Kort.'), 'gewone berichten groeien mee met de tekst');

// #971: de knop zegt wat hij doet
ok(SPELERS_KNOP.label === 'Spelerslijst' && /Tab/.test(SPELERS_KNOP.title), 'de knop heet Spelerslijst en legt de Tab uit');
ok(spelersKnopTekst(0) === 'Spelerslijst' && spelersKnopTekst(3) === 'Spelerslijst · 3', 'de knop telt de spelers mee');
ok(spelersKnopTekst(-2) === 'Spelerslijst' && spelersKnopTekst(NaN) === 'Spelerslijst', 'kapotte aantallen vallen terug op de naam');
const ui = read('game/js/coopspelersui.js');
ok(ui.includes('spelersKnopTekst(aantal)') && ui.includes('SPELERS_KNOP.title') && !ui.includes("textContent = 'Spelers'"), 'de spelerslijstknop gebruikt de nieuwe naam en uitleg');

// #966: geen radio- of demptoets in de HUD
const prompts = read('game/js/prompts.js');
ok(!prompts.includes("tut('radio'") && !prompts.includes("'G-Music aan of uit'"), 'de radio-tutorialrij is weg');
ok(!/^  radio: /m.test(prompts) && !prompts.includes("PAD_DESC") || !/  radio: \(L\)/.test(prompts), 'ook de controller-variant van de radiohint is weg');
const hud = read('game/js/hud_panel.js');
ok(!hud.includes('U: geluid') && !hud.includes("querySelector('small').textContent = hint"), 'geen "U: geluid"-hint meer in de HUD');
ok(/hud-mute/.test(hud) && /isMuted\(\)/.test(hud), 'het luidsprekertje zelf blijft als dempindicator');
ok(!prompts.includes("rows.push(tut('radio'") && !prompts.includes("radio: '<rect"), 'de radio staat niet meer als HUD-hint of pictogram in de tutorial');

console.log(fails ? `${fails} of ${n} failed` : `hudmeldingen_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
