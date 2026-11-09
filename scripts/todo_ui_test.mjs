// Te doen / Activiteiten (#607): één selectiemodel (een rij opent het detail), Dichtbij als
// filter boven dezelfde lijst in plaats van een eigen weergave met eigen klikgedrag, een vaste
// opmaak voor cijfers en de medaille als icoon plus woord. De DOM-glue van todoui.js heeft
// THREE nodig en is hier daarom een broncheck, zoals spelmenu_test doet.
//   node scripts/todo_ui_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';

let n = 0;
const t = (naam, fn) => { n++; try { fn(); } catch (e) { console.log('FAIL', naam, '\n  ', String(e.message || e).split('\n').slice(0, 4).join('\n  ')); process.exitCode = 1; } };
const lees = (f) => fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');

t('Activiteiten heeft één lijst: Dichtbij is een filter, geen eigen weergave', () => {
  const td = lees('todoui.js'), pm = lees('pausemenu.js');
  assert.match(td, /export function setTodoFilter\(near\)/, 'de filterstand is van buiten te zetten');
  assert.match(td, /data-todo-near/, 'er is een filterknop boven de lijst');
  assert.match(td, /ui\.near = !ui\.near/, 'die knop zet de filter aan of uit');
  assert.match(pm, /setTodoFilter\(view === 'dichtbij'\)/, 'de telefoonroute opent dezelfde lijst met de filter aan');
  assert.ok(!/data-sub="dichtbij"/.test(pm), 'er is geen tweede weergave meer in de sectie');
  assert.ok(!/function nearHtml\(/.test(td), 'de oude Dichtbij-weergave is weg');
  assert.ok(!/data-todo-sort/.test(td + pm), 'de losse sorteerstand is weg');
});

t('een rij doet overal hetzelfde: hij opent het detail', () => {
  const td = lees('todoui.js');
  const click = td.slice(td.indexOf('export function todoClick('), td.indexOf('export function setTodoFilter') > 0 ? td.length : td.length);
  const rij = click.slice(click.indexOf("const c = t.closest('[data-todo]');"));
  assert.match(rij, /if \(!panel\.querySelector\('\.td-detail'\)\) \{ ui\.sel = c\.dataset\.todo; api\.showView\('dichtbij'\); return true; \}/, 'zonder detailpaneel opent de rij hetzelfde detail in Activiteiten');
  assert.match(rij, /select\(panel, world, c\.dataset\.todo\);/, 'met een detailpaneel opent de rij het detail meteen');
});

t('geen opmaak die van de lengte van een cijfer afhangt', () => {
  const td = lees('todoui.js');
  const fact = td.slice(td.indexOf('function factHtml('), td.indexOf('function detailHtml('));
  assert.ok(!/\.length >/.test(fact), 'factHtml kiest niet meer op tekstlengte');
  assert.match(fact, /class="m-fact td-fact"/, 'elk feit heeft dezelfde opmaak');
  assert.match(fact, /class="m-num"/, 'de waarde staat in de vaste cijferstijl');
});

t('de medaille is een icoon plus het woord, geen tooltip', () => {
  const td = lees('todoui.js');
  const dot = td.slice(td.indexOf('const medalDot ='), td.indexOf('// the right-hand end of a row'));
  assert.match(dot, /MEDALS\[m\]/, 'de naam van de medaille staat in de HTML');
  assert.match(dot, /m-medal-t/, 'met een eigen tekststijl naast het icoon');
  assert.ok(!/title="/.test(dot), 'geen tooltip meer als enige aanwijzing');
});

t('de catalogus heeft een eigen taal: een pictogram per activiteit', () => {
  const td = lees('todoui.js');
  const r = td.slice(td.indexOf('function row(it, extra'), td.indexOf('// --- Overzicht'));
  assert.match(r, /mapIconUrl\(it\.icon, 22\)/, 'de activiteit draagt het pictogram van de kaart');
  assert.match(r, /it\.group !== 'missies' && it\.group !== 'verhaal'/, 'de verhaalmissies houden hun eigen regel zonder pictogram');
});

t('de opmaak ervoor staat in de menustijlen', () => {
  const css = lees('pausemenu.css');
  assert.match(css, /#pause-menu \.m-facts \.td-fact \{[^}]*flex-direction: row/);
  assert.match(css, /#pause-menu \.m-medal-t \{/);
  assert.match(css, /#pause-menu \.m-li \.td-ico \{/);
});

t('#821: één blok "Je voortgang" met de drie lussen uit de bestaande systemen', () => {
  const td = lees('todoui.js');
  for (const bron of ['loopbaanSamenvatting', 'getSideJobList', 'getOverzicht', 'gebiedenSamenvatting']) assert.match(td, new RegExp(bron), 'bron: ' + bron);
  assert.match(td, /function voortgangHtml\(/, 'de functie bestaat');
  assert.match(td, /disc\('voortgang', 'Je voortgang'/, 'het blok is een inklapbaar disc-blok');
  assert.match(td, /rij\('Loopbaan'/, 'regel Loopbaan');
  assert.match(td, /rij\('Bijbanen'/, 'regel Bijbanen');
  assert.match(td, /rij\('Veroverd'/, 'regel Veroverd');
  assert.match(td, /Herhalen maakt één baan beter, variëren maakt je loopbaan breder, en alles in een gebied maakt je wijkheld\./, 'de zin onderscheidt de drie lussen');
  assert.match(td, /tilesHtml\(world, extra\) \+ voortgangHtml\(\)/, 'het blok staat in Overzicht');
  const blok = td.slice(td.indexOf('function voortgangHtml'), td.indexOf('function disc('));
  assert.ok(!/localStorage|sessionStorage/.test(blok), 'geen nieuwe opslag in het blok');
  assert.ok(!/data-bar=/.test(blok), 'geen vierde progressiebalk');
});

if (process.exitCode) console.log(`todo_ui_test: ${n} tests, mislukt`);
else console.log(`todo_ui_test: ${n}/${n} ok`);
