// Het pauzemenu krijgt een eigen 'Spel'-menu naast Instellingen (#416): speelopties los van de systeeminstellingen. Geen optie gaat verloren,
// elke optie staat op één plek en bewaart onder dezelfde sleutel; het menu kent de nieuwe sectie overal (rail, voorstart, voetregel, icoon).
//   node scripts/spelmenu_test.mjs      (bronchecks: geen DOM)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KEYS } from '../game/js/storagekeys.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL ' + name + (info ? ' :: ' + info : '')); } };

const pm = read('game/js/pausemenu.js');
const a = pm.indexOf('function settingsHtml()');
const m = pm.indexOf('function spelHtml()');
const b = pm.indexOf('export function initPauseMenu(');
ok(a > 0 && m > a && b > m, 'settingsHtml, spelHtml en initPauseMenu staan in die volgorde');
const settingsSrc = pm.slice(a, m), spelSrc = pm.slice(m, b);
const keysOf = (src) => [...src.matchAll(/(?:slider|toggle|picker)\('(\w+)'/g)].map((x) => x[1]);
const settingsKeys = keysOf(settingsSrc), spelKeys = keysOf(spelSrc);

// de opties van Instellingen vóór deze wijziging (main, #416): alles staat er nog, op precies één plek
const VOOR = ['preset', 'resolution', 'autoResolution', 'zuinig', 'shadows', 'drawDistance', 'brightness', 'quality', 'masterVolume', 'musicVolume', 'sfxVolume', 'voiceVolume',
  'subtitleSize', 'subtitleBox', 'soundCaptions', 'fov', 'cameraDistance', 'mouseSensitivity', 'invertY', 'autoAim', 'padLayout', 'padLookSensitivity', 'rumble', 'hudMode',
  'showMinimap', 'mapShiftTeleport', 'minimapZoom', 'minimapNorth', 'showHints', 'hintSource', 'touchControls', 'onboardingTips', 'showFog', 'cinematicMoments', 'wijkFilm',
  'drunkFx', 'ruzie', 'shiftMode', 'speedFeel', 'driftAssist', 'bikeAssist', 'gore', 'colorBlind', 'uiScale', 'textSize', 'subtitleContrast', 'reduceMotion', 'reduceFlash',
  'helpTime', 'helpDamage', 'helpGates', 'helpOffer'];
const NU = [...settingsKeys, ...spelKeys];
ok(VOOR.length === 52, 'de lijst van vóór de wijziging heeft 52 opties');
ok(VOOR.every((k) => NU.includes(k)), 'geen optie verloren', VOOR.filter((k) => !NU.includes(k)).join(', '));
ok(NU.every((k) => VOOR.includes(k)), 'geen optie erbij die geen instelling is', NU.filter((k) => !VOOR.includes(k)).join(', '));
ok(new Set(NU).size === NU.length, 'elke optie staat op één plek', NU.filter((k, i) => NU.indexOf(k) !== i).join(', '));

// wat naar Spel verhuisd is, en wat blijft
const NAAR_SPEL = ['fov', 'cameraDistance', 'autoAim', 'cinematicMoments', 'wijkFilm', 'showHints', 'hintSource', 'onboardingTips', 'ruzie', 'drunkFx', 'gore', 'shiftMode', 'speedFeel', 'driftAssist', 'bikeAssist', 'mapShiftTeleport'];
ok(NAAR_SPEL.every((k) => spelKeys.includes(k) && !settingsKeys.includes(k)), 'de speelopties staan onder Spel en niet meer onder Instellingen');
const BLIJFT = ['preset', 'resolution', 'shadows', 'masterVolume', 'mouseSensitivity', 'invertY', 'padLayout', 'hudMode', 'showMinimap', 'minimapZoom', 'minimapNorth', 'touchControls', 'showFog', 'colorBlind', 'uiScale', 'reduceMotion', 'helpTime', 'helpOffer', 'subtitleSize'];
ok(BLIJFT.every((k) => settingsKeys.includes(k) && !spelKeys.includes(k)), 'beeld, geluid, besturing, interface en toegankelijkheid blijven onder Instellingen');

// elke optie is een echte instelling (settings.js) en de opslagsleutels zijn dezelfde gebleven
const settingsJs = read('game/js/settings.js');
const base = settingsJs.slice(settingsJs.indexOf('const BASE_DEFAULTS = {'), settingsJs.indexOf('const DEFAULTS ='));
ok(NU.filter((k) => k !== 'preset').every((k) => new RegExp(`\\b${k}:`).test(base)), 'elke optie staat in BASE_DEFAULTS', NU.filter((k) => k !== 'preset' && !new RegExp(`\\b${k}:`).test(base)).join(', '));
ok(KEYS.settings === 'gde-settings' && /gde-menu/.test(KEYS.menu), 'de opslagsleutels van instellingen en menu zijn dezelfde gebleven', `${KEYS.settings} ${KEYS.menu}`);
ok(!/localStorage\.(setItem|getItem)\([^)]*spel/i.test(pm), 'Spel bewaart niets onder een eigen sleutel: alleen de instellingen en de menukeuze (pref.sub)');

// de tabbladen van Spel, de sectie en alles eromheen
const sub = (pm.match(/spel: \[((?:\[[^\]]+\],? ?)+)\],/) || [])[1] || '';
const subIds = [...sub.matchAll(/\['(\w+)', '([^']+)'\]/g)].map((x) => x[1]);
ok(subIds.join() === 'acties,spelen,camera,hints', 'Spel heeft de tabbladen Opslaan & stoppen, Spelen, Camera & richten en Hints & uitleg', subIds.join());
ok(subIds.every((id) => new RegExp(`tab\\('${id}'`).test(spelSrc)), 'elk tabblad heeft zijn inhoud');
ok(/\['spel', 'Spel', '/.test(pm), "'spel' staat in de sectielijst");
ok(/\['spel', 'settings', 'streken'\]\];/.test(pm), 'de rail toont Spel vóór Instellingen (Besturing hangt eronder, #430)');
ok(/PRESTART_SECTIONS = \['spel', 'settings', 'controls'\]/.test(pm), 'ook in het hoofdmenu (voor de start) zijn de speelopties bereikbaar');
ok(/^\s*spel: \[\[\['↑', '↓'\], 'kiezen'\]/m.test(pm), 'Spel heeft zijn voetregel');
ok(/^\s*spel: '<rect/m.test(pm), 'Spel heeft een icoon in dezelfde lijnstijl');
ok(/data-panel="spel" class="pm-panel pm-col pm-tabbed"/.test(pm) && /\$\{spelHtml\(\)\}/.test(pm), 'het paneel van Spel staat in het blad');
ok(/if \(name === 'spel'\) \{ showSubtab\('spel', pref\.sub\.spel \|\| subsOf\('spel'\)\[0\]\[0\]\); syncControls\(\); syncSaveButtons\(\); \}/.test(pm), 'Spel laat zijn tabblad, de waarden van de regelaars en de opslagknoppen zien');
ok(/tab === 'settings' \|\| tab === 'spel'\) syncControls\(\)/.test(pm), 'Q en E tussen de tabbladen van Spel vullen de regelaars');
ok(/\['besturing', 'Besturing'\]/.test(pm), 'Instellingen heeft het tabblad Besturing (muis, toetsenbord, controller en touch)');
ok(/enterSection\(go\.dataset\.goto\)/.test(pm) && /data-goto="overzicht"/.test(spelSrc), 'Missie stoppen verwijst naar Overzicht (de knop met de vraag, #390)');
// de spel-acties van de oude rail (Spel opslaan, Opgeslagen spellen, Naar het hoofdmenu, Afsluiten, Opnieuw beginnen, Laatste spel laden, Nieuw spel, Annuleren, Doorgaan) staan nu onder Spel > Opslaan & stoppen, met dezelfde data-action
const ACTIES = ['resume', 'save', 'saves', 'menu', 'exit', 'restart', 'load', 'new', 'cancel'];
const actiesTab = spelSrc.slice(spelSrc.indexOf("tab('acties'"), spelSrc.indexOf("tab('spelen'"));
for (const a of ACTIES) ok(new RegExp('data-action="' + a + '"').test(actiesTab), 'Spel > Opslaan & stoppen heeft data-action="' + a + '"');
ok(!/pm-rail-acts|pm-rail-foot/.test(pm.slice(pm.indexOf('<nav class="pm-rail"'), pm.indexOf('</nav>', pm.indexOf('<nav class="pm-rail"')))), 'de rail heeft geen spel-acties meer');
ok(/data-restart-confirm/.test(actiesTab) && /Laatste spel laden/.test(actiesTab) && /Nieuw spel \(nieuwe plek\)/.test(actiesTab) && /Annuleren/.test(actiesTab), 'de vraag bij Opnieuw beginnen staat er met haar drie knoppen');
ok(/Spel opslaan<\/button>/.test(actiesTab) && /Naar het hoofdmenu<\/button>/.test(actiesTab) && /Opgeslagen spellen<\/button>/.test(actiesTab) && /Opnieuw beginnen<\/button>/.test(actiesTab) && /Afsluiten<\/button>/.test(actiesTab), 'de knoppen houden hun tekst (de tests en harnassen zoeken erop)');
ok(!/querySelector\('\.pm-game \.pm-confirm'\)|querySelector\('\.pm-status'\)|\.pm-rail-acts/.test(pm), 'de code zoekt de vraag, de statusregel en de knoppen niet meer in de rail');
ok(/data-game-status/.test(actiesTab) && /\[data-game-status\]/.test(pm), 'de statusregel van opslaan en laden staat onder de knoppen');
ok(/pm-ingame/.test(pm.slice(pm.indexOf('function subtabsHtml'), pm.indexOf('function subtabsHtml') + 500)) && /const subsOf = /.test(pm), 'het tabblad Opslaan & stoppen is er in het hoofdmenu (voor de start) niet');
ok(/#pause-menu \[data-panel="spel"\] \[data-action\]/.test(read('desktop/devtools.js')), 'de smoke-test van Electron meldt ook de acties onder Spel (pauseButtons)');
ok(/data-action="menu"[^>]*>Naar het hoofdmenu</.test(pm), 'het pauzemenu heeft Naar het hoofdmenu (alleenspelen_test)');
// Standaard herstellen blijft bij Instellingen (het zet alles terug, ook Spel)
ok(/\[data-action="reset"\]'\)\.hidden = name !== 'settings'/.test(pm), 'Standaard herstellen blijft bij Instellingen');
// oude opgeslagen keuzes (pref.sub) breken niets: een onbekend tabblad valt terug op het eerste
ok(/if \(!subs\.some\(\(\[id\]\) => id === name\)\) name = subs\[0\]\[0\]/.test(pm), 'een onbekend of oud tabblad valt terug op het eerste');
ok(/SUB_ALIAS = \{ settings: \{ controller: 'besturing', camera: 'besturing' \} \}/.test(pm), 'de oude namen controller en camera werken nog');

// het woordbudget: de nieuwe titels en tabnamen zijn kort
for (const t of ['Spel', 'Spelen', 'Camera & richten', 'Hints & uitleg', 'Muis & controller']) ok(t.split(/\s+/).filter((w) => w !== '&').length <= 3, `'${t}' is kort`);

// --- #430: Loopbaan met Bezigheden, Besturing bij elkaar, Te doen en Verhaal gesplitst ---------------------------------------------
const kinderen = (pm.match(/const CHILD = \{([^}]+)\}/) || [])[1] || '';
ok(/visboek: 'loopbaan'/.test(kinderen) && /boerderij: 'loopbaan'/.test(kinderen) && /controls: 'settings'/.test(kinderen), 'Visboek en Boerderij hangen onder Loopbaan, de toetsen en knoppen onder Instellingen');
const rail = pm.slice(pm.indexOf('const RAIL_GROUPS ='), pm.indexOf('const CHILD ='));
for (const id of ['visboek', 'boerderij', 'controls']) ok(!new RegExp("'" + id + "'").test(rail), id + ' staat niet los in de rail');
for (const id of ['visboek', 'boerderij', 'controls']) ok(new RegExp("\\['" + id + "', '[^']+', '").test(pm) && new RegExp('data-panel="' + id + '"').test(pm), id + ' bestaat nog als onderdeel met zijn paneel (niets verdwenen)');
ok(/aria-current', String\(b\.dataset\.goto === \(CHILD\[name\] \|\| name\)\)/.test(pm), 'de rail markeert de ouder van een onderdeel');
ok(/if \(CHILD\[tab\] && origin === 'home'\)/.test(pm), 'Esc en Terug gaan van een onderdeel naar zijn ouder');
ok(/ids = sectionIds\(\)\.filter\(\(id\) => !CHILD\[id\]\)/.test(pm), 'Q en E tussen onderdelen slaan de kinderen over');
const lb = read('game/js/loopbaanui.js');
ok(/data-goto="\$\{id\}"/.test(lb) && /'visboek', 'Vissen'/.test(lb) && /'boerderij', 'Boerderij'/.test(lb) && /Bezigheden/.test(lb), 'Loopbaan heeft de sectie Bezigheden met grote tegels voor Vissen en Boerderij');
ok((lb.match(/bezighedenHtml\(\) \+/g) || []).length === 2, 'de tegels staan in beide weergaven van Loopbaan');
// Besturing: alles bij elkaar in Instellingen
const bes = settingsSrc.slice(settingsSrc.indexOf("tab('besturing'"), settingsSrc.indexOf("tab('display'"));
for (const k of ['mouseSensitivity', 'invertY', 'padLayout', 'padLookSensitivity', 'rumble', 'touchControls']) ok(keysOf(bes).includes(k), 'Besturing heeft ' + k);
ok(/data-pad-test/.test(bes) && /data-goto-sub="controls:knoppen"/.test(bes) && /data-goto-sub="controls:toetsen"/.test(bes) && /data-goto-sub="controls:overzicht"/.test(bes) && /data-goto-sub="controls:hulp"/.test(bes) && /data-goto-sub="spel:hints"/.test(bes), 'Besturing verwijst naar Controller testen, Knoppen indelen, Toetsen, Toetsenoverzicht, Hulp en Hints');
ok(!/touchControls/.test(settingsSrc.slice(settingsSrc.indexOf("tab('display'"), settingsSrc.indexOf("tab('a11y'"))), 'Interface heeft de aanraakbediening niet meer');
ok(/\['overzicht', 'Toetsenoverzicht'\]/.test(pm) && !/'Alle toetsen'\]/.test(pm), "'Alle toetsen' heet Toetsenoverzicht en staat onder Besturing");
ok(/data-goto-sub="settings:besturing"/.test(pm.slice(pm.indexOf('function subtabsHtml'), pm.indexOf('function subtabsHtml') + 1200)), 'toetsen en knoppen hebben een knop terug naar Instellingen');
// Te doen: losse activiteiten; Verhaal: de opdrachten
ok(/todo: \[\['alles', 'Alles'\], \['dichtbij', 'Dichtbij'\]\]/.test(pm), 'Te doen heeft Alles en Dichtbij (losse activiteiten)');
ok(/verhaal: \[\['opdrachten', 'Opdrachten'\], \['personages', 'Personages'\], \['aanwijzingen', 'Aanwijzingen'\]\]/.test(pm), 'Verhaal heeft Opdrachten, Personages en Aanwijzingen');
ok(/data-of="verhaal" data-sub="opdrachten" data-keep/.test(pm) && /renderTodoStory\(/.test(pm) && /export function renderTodoStory/.test(read('game/js/todoui.js')), 'de verhaalopdrachten staan onder Verhaal, met dezelfde lijst en details');
ok(/data-todo-view="verhaal"/.test(read('game/js/todoui.js')) && /view === 'verhaal'\) \{ pref\.sub\.verhaal = 'opdrachten'/.test(pm), 'Alle opdrachten in Overzicht leidt naar Verhaal > Opdrachten');
// elke actie bereikbaar, geen dubbele data-actions of panelen
const panels = [...pm.matchAll(/data-panel="(\w+)" class/g)].map((x) => x[1]);
ok(new Set(panels).size === panels.length && panels.length >= 17, 'elk paneel staat één keer in het blad', String(panels.length));
const bron = pm.slice(0, pm.indexOf('export function initPauseMenu('));
for (const act of [...ACTIES, 'bench', 'bench-go', 'errlog-copy']) {
  const aantal = (bron.match(new RegExp('<button[^>]*data-action="' + act + '"', 'g')) || []).length;
  ok(aantal === 1, 'data-action="' + act + '" staat op één knop', String(aantal));
}
const SUBS = {};
for (const m of pm.matchAll(/^  (\w+): \[(\['[^\n]+\])\],$/gm)) SUBS[m[1]] = [...m[2].matchAll(/\['(\w+)',/g)].map((x) => x[1]);
const verw = [...pm.matchAll(/data-goto-sub="(\w+):(\w+)"/g)].map((x) => [x[1], x[2]]);
ok(verw.length >= 6, 'verwijzingen naar tabbladen gevonden', String(verw.length));
for (const [sec, sb] of verw) ok((SUBS[sec] || []).includes(sb), 'verwijzing ' + sec + ':' + sb + ' bestaat');
const hintsSrc = pm.slice(pm.indexOf('const HINTS = {'), pm.indexOf('// a line in the sheet header'));
for (const id of ['visboek', 'boerderij', 'controls', 'loopbaan', 'verhaal', 'todo', 'settings']) ok(new RegExp('^  ' + id + ': \\[', 'm').test(hintsSrc), 'voetregel (Esc Terug) voor ' + id);

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
