// HUD-borden #622/#623/#624/#626: eigen sfeer per bord via de bestaande route (createBoard,
// MG_THEMA, sfeertabel), teams met tokenkleur en vorm, canonieke toetskap en rapport/contract-
// kaarten. De modules zijn browserzwaar (THREE/DOM), dus dit is een broncheck zoals todo_ui_test,
// plus de kleurenblindmodi uit a11y.js als echte pure check.
//   node scripts/hud_borden_622_626_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PALETTES } from '../game/js/a11y.js';
import { MG_THEMA } from '../game/js/minigamekit.js';
import { sfeerVan } from '../game/js/activiteitensfeer.js';
import { boardBox } from '../game/js/minigamekit.js';

let n = 0, bad = 0;
const t = (naam, fn) => { n++; try { fn(); } catch (e) { bad++; console.log('FAIL', naam, '\n  ', String(e.message || e).split('\n').slice(0, 4).join('\n   ')); } };
const lees = (f) => fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');
const keys = (s) => (s.match(/key\('([A-Z0-9+]+)'\)/g) || []).length;

// ---------------------------------------------------------------- #622 vliegschool
t('#622: het lesmenu groepeert per toestel en het rapport noemt de stempel zonder kleur', () => {
  const vs = lees('vliegschool.js');
  assert.match(vs, /cells: lessen\.map\(\(l, i\) => \(\{ t: `\$\{i \+ 1\} \$\{medaljeTekst/, 'korte cellen met nummer en stempel');
  assert.match(vs, /Vliegtuig · lessen 1-5/, 'de vliegtuiglessen staan bij elkaar');
  assert.match(vs, /Helikopter · lessen 6-10/, 'de helikopterlessen staan bij elkaar');
  assert.match(vs, /Rapport: .*stempel/, 'het rapport noemt de stempel als woord');
  assert.match(vs, /\['', 'brons', 'zilver', 'goud'\]\[m\]/, 'de medaille is een woord, niet alleen een kleur');
  assert.match(vs, /fitCard\(R\.LIJNEN\[id\]\.uitleg\)/, 'de introkaart is ingekort tot het woordbudget');
});

t('#622: de school heeft één identiteit in UI en wereld, zonder blauw bordje', () => {
  const vs = lees('vliegschool.js');
  assert.ok(!/#17304a|#e7b83a|#f4efe0/.test(vs), 'geen blauw/geel bordje meer');
  assert.match(vs, /g\.fillStyle = '#0c140e'/, 'de wereldbord-achtergrond is de HUD-inkt');
  assert.match(vs, /g\.strokeStyle = '#d9d4be'/, 'de rand is het schoolaccent');
  assert.equal(sfeerVan('vliegschool').naam, 'Brevet op zak', 'de school heeft een eigen sfeernaam');
  assert.equal(sfeerVan('vliegschool').tint, 'melk', 'de schoolse tint');
  assert.match(vs, /const hulp = les\.kist === 'vliegtuig'/, 'de hulp hangt van de les af');
  const hulpBlok = vs.slice(vs.indexOf('const hulp = les.kist'), vs.indexOf('board.set({ row: rij.join', vs.indexOf('const hulp = les.kist')));
  const vlieg = hulpBlok.slice(0, hulpBlok.indexOf('    : `'));
  const heli = hulpBlok.slice(hulpBlok.indexOf('    : `'));
  assert.ok(keys(vlieg) <= 6 && keys(heli) <= 6, 'hooguit de toetsen van deze les');
  assert.ok(!/key\('CTRL'\)|key\('SHIFT'\)|key\('K'\)|key\('G'\)/.test(hulpBlok), 'geen niet-gebruikte toetsen meer in de hulp');
});

// ---------------------------------------------------------------- #623 vluchtdienst
t('#623: de vluchtdienst heeft een eigen vaan en een eigen sfeer', () => {
  assert.equal(MG_THEMA.vluchtdienst.icoon, 'vlag', 'de dienst heeft een vaan, geen oog');
  assert.notEqual(MG_THEMA.vluchtdienst.icoon, MG_THEMA.vliegschool.icoon, 'school en dienst verschillen in vorm');
  assert.equal(sfeerVan('vluchtdienst').naam, 'Rondje boven de stad');
  assert.equal(sfeerVan('vluchtdienst').icoon, 'vlag');
});

t('#623: torenblok apart, bestemming in de titel, drie toetsen', () => {
  const a = lees('activities.js');
  assert.match(a, /const toren = cfg\.rijen \? cfg\.rijen\(run\.d, v\) : \[\]/, 'de torenregels worden apart verzameld');
  assert.match(a, /extra: toren\.length \? `<div style="display:grid/, 'de toren staat in een eigen blok');
  assert.ok(!/rows\.push\(\.\.\.cfg\.rijen/.test(a), 'de toren zit niet meer tussen de cijferrijen');
  assert.match(a, /Naar <b>\$\{run\.d\.naarNaam\}/, 'de bestemming staat in de eerste rij');
  const cfg = a.slice(a.indexOf("id: 'vluchtdienst'"), a.indexOf('maak:', a.indexOf("id: 'vluchtdienst'")));
  assert.match(cfg, /help: `\$\{key\('W'\)\}/, 'de help begint met de gas/rem-toets');
  assert.ok(keys(cfg.split('help:')[1].split(',')[0]) <= 4, 'hooguit drie toetsgroepen plus stoppen');
  assert.ok(!/key\('A'\)|key\('K'\)/.test(cfg.split('help:')[1].split(',')[0]), 'geen kleppen of roltoetsen in de hint');
});

// ---------------------------------------------------------------- #624 pvp-arena
t('#624: teamkleuren uit de tokens, met een vorm, en in alle kleurenblindmodi te onderscheiden', () => {
  const p = lees('pvparena.js');
  assert.match(p, /kleur: 'var\(--mk-user, #c068ff\)', vorm: 'driehoek'/, 'Noord: gebruikerstoken + driehoek');
  assert.match(p, /kleur: 'var\(--mk-job, #ff9a3c\)', vorm: 'vierkant'/, 'Zuid: klustoken + vierkant');
  assert.match(p, /export const teamVorm = \(i\) => \(i === 0 \? '▲' : '■'\)/, 'één bron voor de teamvorm');
  assert.ok(!/'#4aa3ff'|'#ff9a3c'/.test(p.replace(/#ff9a3c\)/g, '')), 'geen losse teamhexen (behalve de token-terugval)');
  const modi = ['uit', 'deuteranopie', 'protanopie', 'tritanopie'];
  for (const m of modi) {
    assert.ok(PALETTES[m] && PALETTES[m].user !== PALETTES[m].job, `${m}: Noord en Zuid verschillen van kleur`);
  }
});

t('#624: beide borden noemen het eigen team, zonder spelerslijst, en passen naast de minimap', () => {
  const mw = lees('multiplayerpvpwereld.js');
  assert.match(mw, /Jij: team \$\{ARENA_TEAMS\[0\]\.naam\} \$\{teamVorm\(0\)\}/, 'de opener ziet zijn eigen team');
  assert.match(mw, /Jij: \$\{team\}/, 'de gast ziet zijn eigen team');
  assert.match(mw, /team \$\{ARENA_TEAMS\[g\.team\]\.naam\} \$\{teamVorm\(g\.team\)\}/, 'de gast ziet ook de teamvorm');
  assert.ok(!/s\.rijen\.map/.test(mw), 'geen volledige spelerslijst meer op het bord');
  assert.match(mw, /s\.zones\.map\(zoneVorm\)/, 'de zones als vormpjes');
  assert.ok(boardBox(1280).max >= 360, 'het bord past op 1280x720');
});

// ---------------------------------------------------------------- #626 boerenwerk
t('#626: de hint gebruikt de canonieke toetskap en het bord heeft thema + taak', () => {
  const b = lees('boerderijgast.js');
  assert.match(b, /import \{ createBoard, key, mgThema \} from '\.\/minigamekit\.js'/, 'key en mgThema komen uit de kit');
  assert.match(b, /help: `\$\{key\('SPATIE'\)\} in het midden · \$\{key\('BACKSPACE'\)\} stoppen`/, 'de hint is een echte toetskap');
  assert.ok(!/\[Spatie\]|\[Backspace\]/.test(b), 'geen bracket-tekst meer');
  assert.ok(!/'#b98b2e'/.test(b), 'geen eigen accenthex');
  assert.match(b, /mgThema\('boeren'\)\.accent/, 'het accent komt uit de thematabel');
  assert.match(b, /TAAK_MARK/, 'de vier taken hebben een eigen teken');
  assert.match(b, /<b>\$\{taakNaam\(game\.taak\)\}<\/b>/, 'de taak staat vet in de titelregel');
  assert.equal(sfeerVan('boeren').naam, 'Boerenzakdoek', 'de zakdoekband zit in de sfeertabel');
});

t('#626: contracten als kaarten met balk, bedrag en ingeklapte uitleg', () => {
  const ui = lees('boerderijui.js');
  assert.match(ui, /class="bd-contract"/, 'per contract een kaart');
  assert.match(ui, /data-bar="ct-\$\{esc\(c\.id\)\}" data-w="\$\{pct\}"/, 'met een voortgangsbalk per contract');
  assert.match(ui, /<span class="m-num">\$\{euro\(c\.bonus\)\}<\/span>/, 'de bonus als bedrag');
  assert.match(ui, /<details class="bd-uitleg"><summary>Uitleg<\/summary>/, 'de uitleg is ingeklapt');
  assert.match(ui, /<details class="bd-uitleg"><summary>Hoe werken contracten\?<\/summary>/, 'de lange uitleg is ingeklapt');
});

console.log(bad ? `hud_borden_622_626_test: ${n - bad}/${n} ok` : `hud_borden_622_626_test: ${n}/${n} ok`);
process.exitCode = bad ? 1 : 0;
