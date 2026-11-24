// Permanente borging van de controller-review van het pauzemenu en alle pagina's (22-11, #1011 en #495). Zonder Electron en zonder DOM:
// de audit (controller_audit_menu.mjs) leest de bronnen per scherm; deze test eist dat er niets overblijft buiten de lijst met onderbouwde
// uitzonderingen hieronder, en dat elke uitzondering nog bestaat (anders staat de lijst achter). Plus de pure logica van de reparaties.
//   node scripts/controller_menu_test.mjs
import fs from 'node:fs';
import { auditMenu, SCHERMEN, menuIndeling, simuleerLijst, simuleerRaster, hintsZonderPadToets, selectElementen } from './controller_audit_menu.mjs';
import { nextSelectIndex, isPadTextField, PAD_TEXT_TYPES } from '../game/js/padlogic.js';
import { focusSelector, focusSignature, restoreTarget, keepFocus } from '../game/js/focusbehoud.js';
import { PAD_MAPS } from '../game/js/controls.js';

let n = 0, fout = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fout++; console.log('FOUT ' + m + (info !== '' ? ' (' + (typeof info === 'string' ? info : JSON.stringify(info)) + ')' : '')); } };
const lees = (f) => fs.readFileSync(f, 'utf8');

// ---------- 1. de audit: geen bevinding buiten de uitzonderingen ----------
// Elke uitzondering: scherm | code | deel van bestand | reden. De reden zegt waarom het geen gebrek is of waar het alternatief zit.
const UITZONDERINGEN = [
  ['pauze-rail', 'vasthouden', 'pausemenu.js', 'Handmatig schakelen met koppeling: de koppelingstoets tijdens het rijden (voertuigbesturing, #495), geen menuactie; de tikstand (Instellingen) dekt rennen en richten, de koppeling blijft een rijtoets'],
  ['bezit', 'vasthouden', 'bezitui.js', 'Vasthouden om te kopen (24-11, boven €1.000): muis, Enter of Spatie (keydown tot keyup) en een controller-A die alleen een klik geeft telt als eerste van twee drukken binnen vier seconden; de bevestigingskaart legt het uit (bindVasthouden)'],
  ['pauze-rail', 'focusring', 'pausemenu.css', 'Een tab die niet gekozen is toont bewust geen focusring (oogtest 20-11): de ring hoort bij de gekozen tab, de focus is dan nog zichtbaar op het tabblad zelf'],
  ['instellingen', 'focusring', 'a11y.css', 'De kaart in het pauzemenu is een focusbare canvas over het hele scherm: daar bewust geen ring; de controllerring voor alle andere knoppen staat op de regel erboven (#809). Sinds de oude .ds-papier-ring weg is (audit UX 23-11) is er geen :focus-visible-regel meer in dit bestand die dat maskeerde'],
  ['kaart', 'onbereikbaar-sjabloon', 'mapview.js', 'mapview-card is het omhulsel van de plekkaart (closest-zoeker); de knoppen erin (Zet routepunt, Reis erheen, Info, Sluiten) zijn buttons'],
  ['kaart', 'onbereikbaar-js', 'mapview.js', 'zoekresultaten van de kaart: een combobox, de pijlen en Enter in het zoekveld kiezen een resultaat (A opent het schermtoetsenbord op het veld)'],
  ['tuning', 'onbereikbaar-sjabloon', 'tuningworkshopui.js', 'Eigen kleur: een OS-kleurkiezer; de werkplaats loopt met eigen rijen (moveRow) en het palet is het alternatief met de D-pad'],
  ['tuning', 'tekstveld-type', 'tuningworkshopui.js', 'type=color: de OS-kleurkiezer is niet met een controller te bedienen; de palet-knoppen in dezelfde rij doen hetzelfde'],
  ['tuning', 'geen-focus-terug', 'tuningworkshopui.js', 'de werkplaats is een eigen volledig scherm uit de winkel of garage; bij sluiten gaat hij terug naar het spel (geen menu eronder), de focus wordt gewist'],
  ['samen', 'onbereikbaar-sjabloon', 'coopspelersui.js', 'tabRijHtml (Tab-lijst in het spel, 22-11): een leesregel; data-slot is alleen het adres voor de dempknop erin, de rij zelf is niet klikbaar'],
  ['samen', 'herrender-zonder-focus', 'samenpanel.js', 'samenpanel.js tekent alleen de eenmalige profielkaart; de herrenders van de hub en de spelerslijst gebruiken keepFocus (samenhubui.js, coopspelersui.js)'],
  ['uitleg', 'onbereikbaar-js', 'recapcardrun.js', 'de recap is een kaart die alleen sluit: Enter, spatie, Escape en Backspace (dus A en B) sluiten hem via een venster-keydown; een focusbaar element is niet nodig'],
  ['overig', 'herrender-zonder-focus', 'visboekui.js', 'alleen het detailvlak wordt vervangen; de lijstknoppen blijven staan en houden de focus (kies() zet alleen klassen)'],
  ['overig', 'herrender-zonder-focus', 'fotomodusui.js', 'de overlay en de balk worden eenmaal gebouwd; de fotolijst wordt bij het openen getekend, niet na een klik'],
];
const audit = auditMenu();
ok(audit.length === 14 && audit.length === SCHERMEN.length, 'de audit dekt alle 14 schermen', audit.length);
const gebruikt = new Set();
for (const r of audit) {
  for (const b of r.bevindingen) {
    const i = UITZONDERINGEN.findIndex(([sc, code, deel]) => sc === r.id && code === b.code && String(b.bestand).includes(deel));
    ok(i >= 0, `${r.id}: bevinding buiten de uitzonderingen: [${b.code}] ${b.bestand}:${b.regel || '-'} ${(b.haak || b.type || b.tekst || '').toString().slice(0, 80)}`);
    if (i >= 0) gebruikt.add(i);
  }
}
UITZONDERINGEN.forEach((u, i) => ok(gebruikt.has(i), `de uitzondering is verouderd (verwijder haar uit de lijst): ${u[0]} ${u[1]} ${u[2]}`));
for (const r of audit) ok(!r.bevindingen.some((b) => b.code === 'bron-ontbreekt'), `${r.id}: alle bronbestanden bestaan`);
ok(audit.every((r) => r.bestanden.length > 0), 'elk scherm heeft minstens een bron');

// ---------- 2. de menu-indeling van de controller en geen botsende toetsen ----------
ok(menuIndeling().length === 0, 'PAD_MAPS.menu: elke knop heeft zijn vaste toets', menuIndeling());
const M = PAD_MAPS.menu;
const perToets = {};
for (const [slot, toets] of Object.entries(M)) { if (toets == null || toets === 'nav') continue; (perToets[toets] ||= []).push(slot); }
const dubbel = Object.entries(perToets).filter(([, s]) => s.length > 1).map(([t, s]) => t + ':' + s.join('+'));
// B en Start gaan beide terug (bedoeld: Start sluit het menu, B gaat een niveau terug; in het menu zelf doen ze hetzelfde)
ok(dubbel.length === 1 && dubbel[0] === 'escape:b+start', 'in het menu delen alleen B en Start een toets (beide terug)', dubbel);
ok(M.x === 'delete' && M.y === ' ', 'X en Y zijn de tweede en derde actie (Delete en Spatie), nergens anders voor gebruikt');

// ---------- 3. de focusvolgorde met listnav en spatialNext (de simulatie) ----------
for (const k of [1, 2, 3, 5, 9, 14, 62, 81, 120]) ok(simuleerLijst(k).length === 0, `een lijst van ${k} knoppen: elke knop bereikbaar, Tab loopt rond`, simuleerLijst(k));
for (const [r, k] of [[1, 5], [4, 7], [6, 8], [3, 3], [12, 2]]) ok(simuleerRaster(r, k) === 0, `een raster van ${r} x ${k} (Spullen, Garage, Kleding): de D-pad bereikt elke cel`, simuleerRaster(r, k));

// ---------- 4. de pure logica van de reparaties ----------
// A en X op een keuzelijst (Bezit: filter, sorteren, product, pand)
ok(nextSelectIndex([true, true, true], 0, 1) === 1 && nextSelectIndex([true, true, true], 2, 1) === 0, 'A op een keuzelijst: volgende optie, rond');
ok(nextSelectIndex([true, true, true], 0, -1) === 2, 'X op een keuzelijst: vorige optie, rond');
ok(nextSelectIndex([true, false, true], 0, 1) === 2 && nextSelectIndex([true, false, true], 2, -1) === 0, 'uitgeschakelde opties worden overgeslagen');
ok(nextSelectIndex([false, false], 0, 1) === -1 && nextSelectIndex([], -1, 1) === -1, 'zonder te kiezen optie blijft hij staan');
ok(nextSelectIndex([true, true], -1, 1) === 0 && nextSelectIndex([true, true], -1, -1) === 1, 'zonder gekozen optie begint hij vooraan of achteraan');
// het schermtoetsenbord: ook het wachtwoord van een sessie
ok(isPadTextField({ tagName: 'INPUT', type: 'password' }) && isPadTextField({ tagName: 'INPUT', type: 'text' }) && isPadTextField({ tagName: 'INPUT', type: 'search' }) && isPadTextField({ tagName: 'TEXTAREA' }), 'het schermtoetsenbord opent op tekst, zoeken, wachtwoord en een tekstvak');
ok(!isPadTextField({ tagName: 'INPUT', type: 'range' }) && !isPadTextField({ tagName: 'INPUT', type: 'checkbox' }) && !isPadTextField({ tagName: 'BUTTON' }) && !isPadTextField(null), 'het opent niet op een schuifregelaar, vinkje, knop of niets');
ok(PAD_TEXT_TYPES.includes('password'), 'PAD_TEXT_TYPES kent password (lobby: sessiewachtwoord #450)');
// de focus blijft na het opnieuw tekenen
const maakEl = (tag, attrs = {}, kl = [], doc) => ({ tagName: tag.toUpperCase(), attributes: Object.entries(attrs).map(([name, value]) => ({ name, value })), classList: kl, id: attrs.id || '', disabled: false, focus() { doc.activeElement = this; } });
const pasOp = (el, sel) => { // een kleine selectorlezer: tag#id[attr="v"].klasse
  const tag = (sel.match(/^[a-z]+/) || [''])[0];
  if (tag && el.tagName.toLowerCase() !== tag) return false;
  for (const m of sel.matchAll(/\[([\w-]+)="((?:[^"\\]|\\.)*)"\]/g)) { const a = el.attributes.find((x) => x.name === m[1]); if (!a || a.value !== m[2].replace(/\\(.)/g, '$1')) return false; }
  for (const m of sel.matchAll(/\.([\w-]+)/g)) if (!el.classList.includes(m[1])) return false;
  const id = sel.match(/#([\w-]+)/); if (id && el.id !== id[1]) return false;
  return true;
};
const maakScope = (doc) => { const s = { kids: [], contains(x) { return this.kids.includes(x); }, querySelectorAll(sel) { return this.kids.filter((e) => pasOp(e, sel)); } }; return s; };
{
  const doc = { body: { tagName: 'BODY' }, activeElement: null };
  const scope = maakScope(doc);
  const teken = () => { scope.kids = ['a', 'b', 'c'].map((id) => maakEl('button', { 'data-bz': 'koop-perceel', 'data-id': id }, ['m-bt'], doc)); };
  teken();
  scope.kids[1].focus();
  ok(focusSelector(scope.kids[1]) === 'button[data-bz="koop-perceel"][data-id="b"]', 'de selector van een knop is tag en data-attributen', focusSelector(scope.kids[1]));
  const restore = keepFocus(scope, doc);
  teken(); doc.activeElement = doc.body; // het paneel is opnieuw getekend: de focus viel op body
  restore();
  ok(doc.activeElement === scope.kids[1], 'na het opnieuw tekenen staat de focus weer op dezelfde knop (Koop op perceel b)');
  // de knop is weg: de buur op dezelfde plek (of de laatste)
  scope.kids[2].focus();
  const h2 = keepFocus(scope, doc);
  scope.kids = scope.kids.slice(0, 2); doc.activeElement = doc.body;
  scope.kids = [maakEl('button', { 'data-bz': 'koop-perceel', 'data-id': 'x' }, [], doc), maakEl('button', { 'data-bz': 'koop-perceel', 'data-id': 'y' }, [], doc)];
  h2();
  ok(doc.activeElement === null || doc.activeElement === doc.body, 'een knop met andere gegevens wordt niet geraden (geen focus op een vreemd element)');
  // dezelfde knop, andere volgorde: de handtekening wint
  scope.kids = ['a', 'b', 'c'].map((id) => maakEl('button', { 'data-bz': 'koop-perceel', 'data-id': id }, [], doc)); scope.kids[0].focus();
  const h3 = keepFocus(scope, doc);
  scope.kids = ['c', 'b', 'a'].map((id) => maakEl('button', { 'data-bz': 'koop-perceel', 'data-id': id }, [], doc)); doc.activeElement = doc.body;
  h3();
  ok(doc.activeElement && doc.activeElement.attributes.find((x) => x.name === 'data-id').value === 'a', 'de knop wordt op zijn gegevens teruggevonden, niet op zijn plek');
  // een focus die al ergens anders staat blijft ongemoeid
  scope.kids[1].focus();
  const h4 = keepFocus(scope, doc);
  const elders = maakEl('button', { id: 'elders' }, [], doc); doc.activeElement = elders;
  h4();
  ok(doc.activeElement === elders, 'staat de focus nu buiten het paneel, dan steelt het restore hem niet');
  // de focus stond buiten het paneel: niets te doen
  doc.activeElement = elders;
  const h5 = keepFocus(scope, doc); doc.activeElement = doc.body; h5();
  ok(doc.activeElement === doc.body, 'stond de focus niet in het paneel, dan zet het restore hem er ook niet in');
  ok(focusSignature(scope, null) === null && restoreTarget(scope, null) === null, 'zonder element of handtekening is er niets te doen');
  ok(typeof keepFocus(null, doc) === 'function', 'zonder paneel geeft keepFocus een lege functie');
}

// ---------- 5. de reparaties staan in de bron ----------
const pad = lees('game/js/gamepad.js');
ok(/tagName === 'SELECT'/.test(pad) && /nextSelectIndex\(/.test(pad) && /dispatchEvent\(new Event\('change'/.test(pad), 'gamepad.js: A stapt door een keuzelijst en meldt de wijziging (change)');
ok(/a === 'escape' && isPadTextField\(el\)/.test(pad) && /function leaveTextField/.test(pad), 'gamepad.js: B verlaat een tekstveld (anders was B er dood)');
ok(/stepFocus\(/.test(pad) && /function stepFocus/.test(pad), 'gamepad.js: de pijlen lopen via stepFocus (spatialNext, daarna de lijst)');
const pk = lees('game/js/onscreenkeyboard.js') + lees('game/js/oskmodel.js');
ok(/isPadTextField/.test(pad) && /wachtwoord/.test(pk), 'onscreenkeyboard.js: het schermtoetsenbord kent een wachtwoordveld (bolletjes, Toon); gamepad.js opent het op een tekstveld')
const lobby = lees('game/js/lobbyui.js');
ok(lobby.includes("contains('coop-lijst-zoek') && state.lijstZoek)"),'lobbyui.js: Escape wist het zoekveld alleen als er tekst staat (daarna gaat B terug)');
const pm = lees('game/js/pausemenu.js');
ok(/T: null, F8: null/.test(pm), 'pausemenu.js: de hints T en F8 tonen geen toetsenbordplaatje bij een controller');
ok(hintsZonderPadToets(pm).length === 0, 'elke footerhint van het pauzemenu heeft een controllerknop of verdwijnt bij een controller', hintsZonderPadToets(pm));
for (const f of ['bezitui.js', 'coopspelersui.js', 'samenhubui.js', 'veroverdpanel.js']) ok(/keepFocus\(/.test(lees('game/js/' + f)) && /restore\(\)/.test(lees('game/js/' + f)), `${f}: tekent de lijst opnieuw met focusbehoud`);
// Bezit heeft geen keuzelijst meer: ook de koppeling per schakel (data-bz-bind) is sinds #1272 een chip die met A doorschuift
ok(selectElementen(lees('game/js/bezitui.js'), 'bezitui.js').length === 0, 'Bezit heeft geen native keuzelijst meer (filter, sorteren, product en koppeling per schakel zijn chips, #1272)');

// ---------- 6. B, Start en de bumpers: een niveau terug en tabs, in elk scherm hetzelfde ----------
ok(/k === 'Escape' \|\| k === 'Backspace'\) \{\s*consume\(e\);\s*goBack\(\)/.test(pm), 'pausemenu.js: Escape en Backspace (B) gaan een niveau terug via goBack');
ok(/lower === 'q' \|\| lower === 'e' \|\| k === '\[' \|\| k === '\]'/.test(pm), 'pausemenu.js: Q en E en [ en ] (LB, RB, LT en RT) wisselen tabs');
ok(/lower === 'm' && !prestart/.test(pm), 'pausemenu.js: M (Terug/View) opent de kaart');

if (fout) { console.log(`controller_menu_test: ${fout} van ${n} mislukt`); process.exit(1); }
console.log(`controller_menu_test: ${n} ok (${audit.length} schermen, ${UITZONDERINGEN.length} onderbouwde uitzonderingen)`);
