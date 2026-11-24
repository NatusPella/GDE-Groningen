// Voortgang van de game (#898): één percentage uit het verhaal, de prestaties, de kaart en de
// gebieden, met dezelfde uitkomst op vier plekken (HUD, Overzicht, savegame-overzicht en het
// hervatten). Het rekenwerk in progress.js is puur; de bedrading staat in de bronchecks.
//   node scripts/progress_test.mjs
import fs from 'node:fs';
import { combineProgress, storyCounts, saveProgress, progressText, PROGRESS_PARTS, progressPartText, tilesShownElsewhere } from '../game/js/progress.js';

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
// eigenaar 20-11 (#985): de voortgang staat niet meer in de HUD, alleen in het menu (Overzicht) en het savegame-overzicht
ok(!/from '\.\/progresslive\.js'/.test(hud) && !/hud-done/.test(hud) && !/updateProgress\(/.test(hud), 'de HUD toont de totale voortgang niet meer (geen chipje, geen progresslive)');
ok(!/hud-done/.test(hcss), 'het chipje heeft geen stijl meer');
ok(!/Welkom terug in Grunn/.test(hud), 'het welkom-terugbericht met het cijfer staat niet meer in de HUD');

ok(/from '\.\/progresslive\.js'/.test(lees('todoui.js')) && /gameProgress\(\)/.test(lees('todoui.js')), 'het Overzicht haalt hetzelfde cijfer uit progresslive.js (Spel-UI 24-11: todoui.js)');
ok(/function voortgangBlokHtml/.test(lees('todoui.js')) && /sp-voortgang__pct/.test(lees('todoui.js')), 'het voortgangsblok is één percentage met één balk en platte regels (Spel-UI 24-11)');
ok(/\.sp-voortgang__pct/.test(lees('ds-spel.css')), 'het voortgangsblok heeft een eigen stijl (ds-spel.css)');

// tekstdieet 21-11: de kleine savekaart toont geen percentage meer (naam, speeltijd, plek, datum); de grote Doorgaan-knop wel, met het label "verhaal"
ok(/saveProgress/.test(ssl) && !/class="ssl-prog"/.test(ssl), 'de savekaart heeft geen voortgangsbalk meer');
ok(/ssl-hero-prog/.test(ssl) && /% verhaal/.test(ssl), 'de grote Doorgaan-knop noemt het verhaalpercentage');

// geen tweede waarheid: nergens anders wordt het percentage opnieuw uitgerekend
ok(!/getStorySteps\(\)\.filter\(\(s\) => s\.available\)/.test(pm), 'het menu rekent het verhaalpercentage niet zelf uit');
ok(!/gde-voortgang|gde-progress/.test(hud + pm + ssl), 'geen nieuwe opslagsleutel voor de voortgang');


// #1259: geen "0 van 71 · 0%" en geen tweede cijfer voor Prestaties in een tegel
ok(progressPartText({ done: 0, total: 71, pct: 0 }) === 'nog niets van 71', 'nul gedaan leest als nog niets', progressPartText({ done: 0, total: 71, pct: 0 }));
ok(progressPartText({ done: 12, total: 71, pct: 17 }) === '12 van 71 · 17%', 'gewone regel met percentage');
ok(progressPartText({ done: 0, total: 0, pct: 0 }) === '' && progressPartText(null) === '', 'leeg onderdeel geeft niets');
ok(tilesShownElsewhere(combineProgress({ verhaal: { done: 0, total: 71 }, prestaties: { done: 0, total: 237 } }).parts).includes('prestaties'), 'prestaties in het blok: geen tegel');
ok(tilesShownElsewhere(combineProgress({ verhaal: { done: 0, total: 71 } }).parts).length === 0 && tilesShownElsewhere(undefined).length === 0, 'zonder prestaties in het blok blijft de tegel');
{
  const tu = lees('todoui.js');
  ok(!/ov-tile|tilesHtml/.test(tu), 'het Overzicht heeft geen tegels meer: elk cijfer staat één keer (Spel-UI 24-11)');
  ok(/progressPartText\(/.test(tu), 'todoui gebruikt de eerlijke regel van het voortgangsblok');
}

console.log(bad ? `progress_test: ${bad} van ${n} checks rood` : `progress_test: ${n} checks groen`);
process.exit(bad ? 1 : 0);
