// Voortgang van de game (#898): één percentage uit het verhaal, de prestaties, de kaart en de
// gebieden, met dezelfde uitkomst op vier plekken (HUD, Overzicht, savegame-overzicht en het
// hervatten). Het rekenwerk in progress.js is puur; de bedrading staat in de bronchecks.
//   node scripts/progress_test.mjs
import fs from 'node:fs';
import { combineProgress, storyCounts, saveProgress, progressText, PROGRESS_PARTS } from '../game/js/progress.js';

const lees = (f) => fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');
let n = 0, bad = 0;
const ok = (c, naam, extra = '') => { n++; if (!c) { bad++; console.log('FAIL', naam, extra); } };
const near = (a, b, m = 0.5) => Math.abs(a - b) <= m;

// --- de gewichten ------------------------------------------------------------
ok(PROGRESS_PARTS.length === 4, 'vier onderdelen: verhaal, prestaties, kaart en gebieden');
ok(PROGRESS_PARTS.reduce((s, p) => s + p[2], 0) === 100, 'de gewichten tellen op tot 100');

// --- combineProgress: puur ---------------------------------------------------
const leeg = combineProgress({});
ok(leeg.pct === 0 && leeg.parts.length === 0, 'zonder tellingen is de voortgang 0 en zijn er geen onderdelen', leeg);

const half = combineProgress({ verhaal: { done: 5, total: 10 }, prestaties: { done: 2, total: 4 }, kaart: { done: 1, total: 2 }, gebieden: { done: 0, total: 4 } });
ok(half.parts.length === 4, 'alle vier de onderdelen doen mee', half.parts.map((p) => p.id).join());
ok(half.parts.every((p) => p.pct >= 0 && p.pct <= 100), 'elk onderdeel blijft tussen 0 en 100');
// 50*40 + 50*25 + 50*20 + 0*15 = 4250 / 100 = 42,5 -> 43
ok(half.pct === 43, 'het gewogen gemiddelde van de vier onderdelen', half.pct);
ok(near(half.parts[3].pct, 0, 0.01) && near(half.parts[0].pct, 50, 0.01), 'elk onderdeel houdt zijn eigen percentage');

const alleen = combineProgress({ verhaal: { done: 1, total: 4 } });
ok(alleen.parts.length === 1 && alleen.pct === 25, 'een enkel onderdeel telt volledig, niet als kwart', alleen);

const kapot = combineProgress({ verhaal: { done: 99, total: 4 }, prestaties: { done: -3, total: 8 } });
ok(kapot.parts[0].pct === 100 && kapot.parts[1].pct === 0, 'meer dan het totaal of minder dan nul wordt geklemd', kapot.parts.map((p) => p.pct).join());
ok(combineProgress({ verhaal: { done: 3, total: 0 } }).parts.length === 0, 'een onderdeel zonder totaal doet niet mee');
ok(combineProgress({ verhaal: { done: 3, total: NaN } }).parts.length === 0, 'NaN als totaal doet niet mee');
ok(combineProgress({ verhaal: { done: 3, total: 6 }, prestaties: null }).pct === 50, 'een ontbrekend onderdeel laat de rest het gewicht verdelen');

// --- storyCounts: dezelfde regel als story.js, uit de gegevens van een save ----
const leegVerhaal = storyCounts(null);
ok(leegVerhaal.done === 0 && leegVerhaal.total > 0, 'zonder savegegevens is niets gedaan, maar het totaal klopt', leegVerhaal);
const vol = storyCounts({ story: { done: [] }, missions: { completed: [0, 1, 2] } });
ok(vol.done > 0, 'gehaalde missies tellen als gedane stappen', vol.done);
ok(vol.done < vol.total, 'drie missies is nog niet het hele verhaal', `${vol.done}/${vol.total}`);
ok(saveProgress({ story: { done: [] } }) === 0, 'een leeg verhaal is 0%');
ok(saveProgress(null) === 0, 'zonder gegevens 0%');
const halfVerhaal = saveProgress({ story: { done: [] }, missions: { completed: [0, 1, 2] } });
ok(halfVerhaal > 0 && halfVerhaal <= 100, 'een half gespeeld verhaal geeft een percentage tussen 0 en 100', halfVerhaal);

// --- progressText -----------------------------------------------------------
ok(progressText(0) === '0% klaar' && progressText(42) === '42% klaar' && progressText(100) === '100% klaar', 'de regel klinkt overal hetzelfde');

// --- de bedrading: vier plekken, één bron -----------------------------------
const hud = lees('hud_panel.js');
const pm = lees('pausemenu.js');
const ssl = lees('saveslotsui.js');
const css = lees('pausemenu.css');
const hcss = lees('hud_panel.css');
const scss = lees('saveslots.css');
ok(/from '\.\/progresslive\.js'/.test(hud) && /import \{ gameProgress, progressText \}/.test(hud), 'de HUD haalt het cijfer uit progresslive.js');
ok(/hud-done/.test(hud) && /updateProgress\(dt, world\)/.test(hud), 'de HUD heeft een voortgangschipje en werkt het bij');
ok(/hudMode === 'minimaal'/.test(hud), 'in de minimale HUD-stand blijft het chipje weg');
ok(/Welkom terug in Grunn/.test(hud) && /getPlaySeconds\(\)/.test(hud), 'bij het hervatten zegt het spel één keer hoe ver je bent');
ok(/hud-chip\.hud-done/.test(hcss), 'het chipje heeft een eigen, stille stijl');

ok(/from '\.\/progresslive\.js'/.test(pm) && /gameProgress\(\)/.test(pm), 'het Overzicht haalt hetzelfde cijfer uit progresslive.js');
ok(/pm-progress/.test(pm) && /querySelector\('\.ov-scroll'\)/.test(pm) && /body\.insertAdjacentHTML\('afterbegin', blok\)/.test(pm), 'het voortgangsblok staat boven aan de scrollende inhoud van Overzicht (#965)');
ok(/#pause-menu \.pm-progress \{/.test(css), 'het voortgangsblok heeft een eigen stijl');

ok(/saveProgress/.test(ssl) && /ssl-prog/.test(ssl), 'elke savekaart laat het voortgangspercentage van dat spel zien');
// review 0.62: op de kleine kaart stond alleen "X%", terwijl de HUD en het Overzicht het
// samengestelde cijfer tonen. Het label zegt nu zichtbaar dat dit het verhaal van die save is.
ok(/ssl-prog[\s\S]{0,220}%\s*verhaal/.test(ssl), 'de kleine savekaart noemt zichtbaar dat het percentage over het verhaal gaat');
ok(/ssl-hero-prog/.test(ssl) && /% verhaal/.test(ssl), 'de grote Doorgaan-knop noemt het verhaalpercentage');
ok(/#saveslots \.ssl-prog/.test(scss), 'het balkje op de savekaart heeft een eigen stijl');

// geen tweede waarheid: nergens anders wordt het percentage opnieuw uitgerekend
ok(!/getStorySteps\(\)\.filter\(\(s\) => s\.available\)/.test(pm), 'het menu rekent het verhaalpercentage niet zelf uit');
ok(!/gde-voortgang|gde-progress/.test(hud + pm + ssl), 'geen nieuwe opslagsleutel voor de voortgang');

console.log(bad ? `progress_test: ${bad} van ${n} checks rood` : `progress_test: ${n} checks groen`);
process.exit(bad ? 1 : 0);
