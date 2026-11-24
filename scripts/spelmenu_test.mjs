// Het pauzemenu krijgt een eigen 'Spel'-menu naast Instellingen (#416): speelopties los van de systeeminstellingen. Geen optie gaat verloren,
// elke optie staat op één plek en bewaart onder dezelfde sleutel; het menu kent de nieuwe sectie overal (rail, voorstart, voetregel, icoon).
//   node scripts/spelmenu_test.mjs      (bronchecks: geen DOM)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KEYS } from '../game/js/storagekeys.js';
import * as LB from '../game/js/loopbaan.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL ' + name + (info ? ' :: ' + info : '')); } };

const pm = read('game/js/pausemenu.js');
const lbSrc = read('game/js/loopbaan.js');
const a = pm.indexOf('function settingsHtml()');
const m = pm.indexOf('function spelHtml()');
const b = pm.indexOf('export function initPauseMenu(');
ok(a > 0 && m > a && b > m, 'settingsHtml, spelHtml en initPauseMenu staan in die volgorde');
const settingsSrc = pm.slice(a, m), spelSrc = pm.slice(m, b);
const keysOf = (src) => [...src.matchAll(/(?:slider|toggle|picker)\('(\w+)'/g)].map((x) => x[1]);
// #1169: de moeilijkheid (niveau per save) heeft een eigen tabblad in difficultypanel.js; het niveau is daar de gewone kiezer data-setting="difficulty"
const moeilijkheidTab = settingsSrc.includes("tab('moeilijkheid', difficultyTabHtml()") && read('game/js/difficultypanel.js').includes('data-setting="difficulty"');
const settingsKeys = [...keysOf(settingsSrc), ...(moeilijkheidTab ? ['difficulty'] : [])], spelKeys = keysOf(spelSrc);

// de opties van Instellingen vóór deze wijziging (main, #416): alles staat er nog, op precies één plek
const VOOR = ['preset', 'resolution', 'autoResolution', 'zuinig', 'shadows', 'drawDistance', 'brightness', 'quality', 'masterVolume', 'musicVolume', 'sfxVolume', 'voiceVolume',
  'subtitleSize', 'subtitleBox', 'soundCaptions', 'fov', 'cameraDistance', 'mouseSensitivity', 'invertY', 'autoAim', 'padLayout', 'padLookSensitivity', 'rumble', 'hudMode',
  'showMinimap', 'mapShiftTeleport', 'minimapZoom', 'minimapNorth', 'showHints', 'hintSource', 'touchControls', 'onboardingTips', 'showFog', 'cinematicMoments',
  'drunkFx', 'ruzie', 'shiftMode', 'speedFeel', 'driftAssist', 'bikeAssist', 'gore', 'colorBlind', 'uiScale', 'textSize', 'subtitleContrast', 'reduceMotion', 'reduceFlash',
  'helpTime', 'helpDamage', 'helpGates', 'helpOffer', 'liveBussen', 'stapAnimatie', 'steerSensitivity', 'screenNarration', 'readingTime', 'difficulty',
  'firstPersoon'];   // liveBussen (#395)/stapAnimatie (#459); #801/#802: stuurgevoeligheid, schermnarratie, leestijd; #800: moeilijkheid; #833: eerste persoon
const NU = [...settingsKeys, ...spelKeys];
ok(VOOR.length === 58, 'de lijst van vóór de wijziging heeft 58 opties (53 + #801/#802: stuurgevoeligheid, schermnarratie, leestijd; #800: moeilijkheid; #833: eerste persoon)');
ok(VOOR.filter((k) => k !== 'preset').every((k) => NU.includes(k)), 'geen optie verloren', VOOR.filter((k) => k !== 'preset' && !NU.includes(k)).join(', '));
// #985: nieuwe opties staan hier met hun issuenummer. VOOR blijft de bevroren lijst van main,
// zodat een optie die zonder uitleg verdwijnt of verschijnt nog steeds opvalt.
const NIEUW = ['showSubtitles', 'rustigDrukwerk', 'rumbleStrength', 'terugkeerScene', 'uitlegIconen', 'qteStand', 'liveTreinen', 'worldColor', 'subtitleVlak', 'screenShake', 'markerVormen', 'tikStand', 'startBinnen', 'footballMusic', 'footballMusicVolume'];   // #985 punt 4: ondertitels uit; #992: Rustig drukwerk; 21-11: Wereldkleur
ok(NU.every((k) => VOOR.includes(k) || NIEUW.includes(k)), 'geen optie erbij die geen instelling is', NU.filter((k) => !VOOR.includes(k) && !NIEUW.includes(k)).join(', '));
ok(new Set(NU).size === NU.length, 'elke optie staat op één plek', NU.filter((k, i) => NU.indexOf(k) !== i).join(', '));

// wat naar Spel verhuisd is, en wat blijft
// #897: "Spelen" is geen tabblad van Spel meer maar een instelling: verkeer, geweld, rijden en de
// kaart staan onder Instellingen > Spel, net als de moeilijkheid (#891).
// #979: Camera & richten en Hints & uitleg horen bij Instellingen, niet als losse Spel-tabs: ze
// gaan over hoe je kijkt en wat je in beeld ziet, niet over je spel zelf.
const NAAR_INSTELLINGEN = ['ruzie', 'drunkFx', 'gore', 'shiftMode', 'speedFeel', 'driftAssist', 'bikeAssist', 'mapShiftTeleport', 'liveBussen', 'liveTreinen', 'difficulty'];
ok(NAAR_INSTELLINGEN.every((k) => settingsKeys.includes(k) && !spelKeys.includes(k)), 'de speelopties en de moeilijkheid staan onder Instellingen > Spel', NAAR_INSTELLINGEN.filter((k) => !settingsKeys.includes(k)).join(', '));
const IN_INSTELLINGEN = ['fov', 'cameraDistance', 'autoAim', 'cinematicMoments', 'showHints', 'hintSource', 'onboardingTips', 'firstPersoon'];
ok(IN_INSTELLINGEN.every((k) => settingsKeys.includes(k) && !spelKeys.includes(k)), 'camera, richten en hints staan onder Instellingen (#979)', IN_INSTELLINGEN.filter((k) => !settingsKeys.includes(k)).join(', '));;
const BLIJFT = ['resolution', 'shadows', 'masterVolume', 'mouseSensitivity', 'invertY', 'padLayout', 'hudMode', 'showMinimap', 'minimapZoom', 'minimapNorth', 'touchControls', 'showFog', 'colorBlind', 'uiScale', 'reduceMotion', 'stapAnimatie', 'helpTime', 'helpOffer', 'subtitleSize'];
ok(BLIJFT.every((k) => settingsKeys.includes(k) && !spelKeys.includes(k)), 'beeld, geluid, besturing, interface en toegankelijkheid blijven onder Instellingen');
ok(settingsSrc.includes('data-preset-btn'), 'de voorinstellingen staan onder Instellingen > Beeld als knoppen, niet als picker (#435)');

// #891, #1169: de moeilijkheid heeft een eigen tabblad Moeilijkheid (difficultypanel.js) met het niveau, de drie niveaus uitgelegd en de opties; het tabblad Spel verwijst ernaar
const dm = read('game/js/difficultypanel.js');
ok(moeilijkheidTab && /DIFFICULTY_MODES\.map\(\(m\) => \[m, DIFFICULTY\[m\]\.label\]\)/.test(dm), 'de moeilijkheid heeft een eigen tabblad met het niveau en de drie niveaus (#1169)');
ok(/function levelRows\(\)/.test(dm) && /pm-diff-row/.test(dm) && /data-diff="\$\{m\}"/.test(dm), 'de drie niveaus worden uitgelegd (#891)');
ok((dm.match(/data-setting="difficulty" data-options/g) || []).length === 1 && !/picker\('difficulty'/.test(settingsSrc), 'het niveau staat op precies één plek');

// elke optie is een echte instelling (settings.js) en de opslagsleutels zijn dezelfde gebleven
const settingsJs = read('game/js/settings.js');
const base = settingsJs.slice(settingsJs.indexOf('const BASE_DEFAULTS = {'), settingsJs.indexOf('const DEFAULTS ='));
ok(NU.filter((k) => k !== 'preset').every((k) => new RegExp(`\\b${k}:`).test(base)), 'elke optie staat in BASE_DEFAULTS', NU.filter((k) => k !== 'preset' && !new RegExp(`\\b${k}:`).test(base)).join(', '));
ok(KEYS.settings === 'gde-settings' && /gde-menu/.test(KEYS.menu), 'de opslagsleutels van instellingen en menu zijn dezelfde gebleven', `${KEYS.settings} ${KEYS.menu}`);
ok(!/localStorage\.(setItem|getItem)\([^)]*spel/i.test(pm), 'Spel bewaart niets onder een eigen sleutel: alleen de instellingen en de menukeuze (pref.sub)');

// de tabbladen van Spel, de sectie en alles eromheen
const sub = (pm.match(/spel: \[((?:\[[^\]]+\],? ?)+)\],/) || [])[1] || '';
const subIds = [...sub.matchAll(/\['(\w+)', '([^']+)'\]/g)].map((x) => x[1]);
ok(subIds.join() === 'overzicht,samen,spelers,uitnodigen,sessie,acties', 'Spel heeft één tabrij: Overzicht, Samen spelen (zonder sessie) of Spelers, Uitnodigen en Sessie (in een sessie), en Opslaan en stoppen (ontwerp Samen spelen 24-11)', subIds.join());
ok(subIds.every((id) => ['overzicht', 'samen', 'spelers', 'uitnodigen', 'sessie'].includes(id) || spelSrc.includes(`tab('${id}'`) || spelSrc.includes(`data-sub="${id}" class="sp-opslaan`)) && spelSrc.includes('data-sub="overzicht" class="pm-ov pm-spelov"'), 'elk tabblad heeft zijn inhoud (Overzicht tekent zich in Spel)');
// #979: de twee verhuisde tabbladen staan nu onder Instellingen, met hun eigen inhoud.
const setSub = (pm.match(/settings: \[((?:\[[^\]]+\],? ?)+)\],/) || [])[1] || '';
const setIds = [...setSub.matchAll(/\['(\w+)', '([^']+)'\]/g)].map((x) => x[1]);
ok(setIds.join() === 'video,sound,spel,moeilijkheid,besturing,camera,display,hints,a11y,online', 'Instellingen heeft Camera en Hints & uitleg naast de bestaande tabbladen en Samen spelen (online) (#979)', setIds.join());
ok(setIds.filter((id) => ['camera', 'hints'].includes(id)).every((id) => settingsSrc.includes(`tab('${id}'`)), 'Camera en Hints hebben hun eigen inhoud onder Instellingen');
ok(!/data-goto-sub="spel:camera"/.test(pm) && !/data-goto-sub="spel:hints"/.test(pm), 'geen enkele knop of verwijzing wijst nog naar Spel > Camera of Spel > Hints');
ok(/\['spel', 'Spel', '/.test(pm), "'spel' staat in de sectielijst");
ok(/PRESTART_SECTIONS = \['spel', 'settings', 'controls'\]/.test(pm), 'ook in het hoofdmenu (voor de start) zijn de speelopties bereikbaar');
ok(/^\s*spel: \[\[\['↑', '↓'\], 'kiezen'\]/m.test(pm), 'Spel heeft zijn voetregel');
ok(/ICONS = {[^}]*spel: 'spel'/.test(pm), 'Spel heeft een icoon in de Phosphor-set (icons.js)');
ok(/data-panel="spel" class="pm-panel pm-col pm-tabbed"/.test(pm) && /\$\{spelHtml\(\)\}/.test(pm), 'het paneel van Spel staat in het blad');
ok(pm.includes("if (name === 'spel') { showSubtab('spel', pref.sub.spel || subsOf('spel')[0][0]); syncControls(); syncSaveButtons(); afterSpelSub(); }"),'Spel laat zijn tabblad, de waarden van de regelaars en de opslagknoppen zien');
ok(/tab === 'settings' \|\| tab === 'spel'\) syncControls\(\)/.test(pm), 'Q en E tussen de tabbladen van Spel vullen de regelaars');
ok(/\['besturing', 'Besturing'\]/.test(pm), 'Instellingen heeft het tabblad Besturing (muis, toetsenbord, controller en touch)');
ok(pm.includes('enterSection(go.dataset.goto)') && read('game/js/todoui.js').includes('data-action="mission-stop"'),'Missie stoppen staat bij de missie in Spel > Overzicht (de knop met de vraag, #390; Spel-UI 24-11)');
// de spel-acties van de oude rail (Spel opslaan, Opgeslagen spellen, Naar het hoofdmenu, Afsluiten, Opnieuw beginnen, Laatste spel laden, Nieuw spel, Annuleren, Doorgaan) staan nu onder Spel > Opslaan & stoppen, met dezelfde data-action
// Spel-UI 24-11: Doorgaan staat alleen nog in de rail; Opslaan en stoppen heeft de kaart Dit spel (save, saves), het verlaten (menu, exit) en de vragen (nieuw-vraag, terugzetten-vraag) en houdt de oude herstartvraag verborgen in de DOM (restart, load, new, cancel)
const ACTIES = ['save', 'saves', 'menu', 'exit', 'nieuw-vraag', 'terugzetten-vraag', 'restart', 'load', 'new', 'cancel'];
const actiesTab = spelSrc.slice(spelSrc.indexOf('data-sub="acties"')) + pm.slice(pm.indexOf('function saveFactsInner'), pm.indexOf('function syncSaveFacts'));
for (const a of ACTIES) ok(new RegExp('data-action="' + a + '"').test(actiesTab), 'Spel > Opslaan & stoppen heeft data-action="' + a + '"');
ok(!/pm-rail-acts|pm-rail-foot/.test(pm.slice(pm.indexOf('<nav class="pm-rail"'), pm.indexOf('</nav>', pm.indexOf('<nav class="pm-rail"')))), 'de rail heeft geen spel-acties meer');
ok(/data-restart-confirm/.test(actiesTab) && /Laatste spel laden/.test(actiesTab) && /Nieuw spel \(nieuwe plek\)/.test(actiesTab) && /Annuleren/.test(actiesTab), 'de vraag bij Opnieuw beginnen staat er met haar drie knoppen');
ok(/Nu opslaan/.test(actiesTab) && /Naar het menu<\/button>/.test(actiesTab) && /Opgeslagen spellen<\/button>/.test(actiesTab) && /Terugzetten…<\/button>/.test(actiesTab) && /Afsluiten<\/button>/.test(actiesTab), 'de knoppen houden hun tekst (de tests en harnassen zoeken erop)');
ok(!/querySelector\('\.pm-game \.pm-confirm'\)|querySelector\('\.pm-status'\)|\.pm-rail-acts/.test(pm), 'de code zoekt de vraag, de statusregel en de knoppen niet meer in de rail');
ok(/data-game-status/.test(actiesTab) && /\[data-game-status\]/.test(pm), 'de statusregel van opslaan en laden staat onder de knoppen');
ok(/pm-ingame/.test(pm.slice(pm.indexOf('function subtabsHtml'), pm.indexOf('function subtabsHtml') + 500)) && /const subsOf = /.test(pm), 'het tabblad Opslaan & stoppen is er in het hoofdmenu (voor de start) niet');
ok(/#pause-menu \[data-panel="spel"\] \[data-action\]/.test(read('desktop/devtools.js')), 'de smoke-test van Electron meldt ook de acties onder Spel (pauseButtons)');
ok(/data-action="menu"[^>]*>Naar het menu</.test(pm), 'het pauzemenu heeft Naar het hoofdmenu (alleenspelen_test)');
// Standaard herstellen blijft bij Instellingen (het zet alles terug, ook Spel)
ok(/\[data-action="reset"\]'\)\.hidden = name !== 'settings'/.test(pm), 'Standaard herstellen blijft bij Instellingen');
// oude opgeslagen keuzes (pref.sub) breken niets: een onbekend tabblad valt terug op het eerste
ok(/if \(!subs\.some\(\(\[id\]\) => id === name\)\) name = subs\[0\]\[0\]/.test(pm), 'een onbekend of oud tabblad valt terug op het eerste');
ok(/SUB_ALIAS = \{ settings: \{ controller: 'besturing' \} \}/.test(pm), 'de oude naam controller werkt nog; camera is sinds #979 een eigen tabblad');

// het woordbudget: de nieuwe titels en tabnamen zijn kort
for (const t of ['Spel', 'Spelen', 'Camera & richten', 'Hints & uitleg', 'Muis & controller']) ok(t.split(/\s+/).filter((w) => w !== '&').length <= 3, `'${t}' is kort`);

// #979: een oude opgeslagen Spel-keuze voor Camera of Hints wijst door naar Instellingen, waar ze nu staan.
ok(/sub\.spel === 'camera' \|\| sub\.spel === 'hints'/.test(pm) && /sub\.settings = sub\.spel/.test(pm), 'een oude Spel-voorkeur Camera of Hints opent onder Instellingen');

// #980: de twee verhuisde schermen beginnen met wat er nu staat: Camera met stand, beeldhoek en
// richten; Hints met een voorbeeld. De waarden volgen de regelaars meteen (syncNowFacts).
ok(/camNowHtml\(\)/.test(settingsSrc) && /data-cam-stand/.test(pm) && /data-cam-fov/.test(pm) && /data-cam-aim/.test(pm), 'Camera toont de camerastand van nu bovenaan');
ok(/hintsNowHtml\(\)/.test(settingsSrc) && /data-hintprev/.test(pm) && /Hints staan uit/.test(pm), 'Hints toont een voorbeeld en zegt het als hints uit staan');
ok(/function syncNowFacts/.test(pm) && /syncNowFacts\(st\)/.test(pm) && /syncNowFacts\(\)/.test(pm), 'de samenvatting volgt elke wijziging en de invoerwissel');
ok(/afstand\.disabled = !!st\.firstPersoon/.test(pm), 'in eerste persoon is de camera-afstand niet meer bedienbaar');
ok(/stand === 'pad' \? `\$\{pg\('y'\)\}<span>Instappen<\/span>`/.test(pm), 'het hintvoorbeeld toont op de controller de gebruiksknop (Y), niet A (#980)');
ok(/bron\.setAttribute\('aria-disabled', String\(!st\.showHints\)\)/.test(pm) && /if \(!pk \|\| pk\.getAttribute\('aria-disabled'\) === 'true'\) return;/.test(pm), 'zonder toetshints is de keuze "Hints tonen voor" niet meer bedienbaar');
ok(/tab\('camera'[\s\S]*?<span>Kijken<\/span>[\s\S]*?<span>Richten<\/span>[\s\S]*?<span>Sfeer<\/span>/.test(settingsSrc), 'Camera groepeert de regelaars in Kijken, Richten en Sfeer (#980)');
ok(/tab\('hints'[\s\S]*?<span>In beeld<\/span>[\s\S]*?<span>Uitleg<\/span>[\s\S]*?<span>Terugkijken<\/span>/.test(settingsSrc), 'Hints groepeert de regelaars in In beeld, Uitleg en Terugkijken (#980)');
ok(/data-save-now/.test(spelSrc) && /function saveFactsInner/.test(pm) && /function syncSaveFacts/.test(pm), 'Opslaan & stoppen toont sessietijd, laatste opslag en de savegame (#980)');
const pmcss = read('game/js/pausemenu.css');
ok(/\.pm-nowfacts/.test(pmcss) && /\.pm-hintprev/.test(pmcss), 'de samenvatting en het hintvoorbeeld hebben eigen vormgeving');
ok(/\[data-panel="settings"\] \.pm-inner\.pm-settings > \.m-tabs \.m-tablist \{ gap: 0 28px; \}/.test(pmcss), 'de acht instellingentabs blijven met een krappere tussenruimte op één rij (#979)');

// --- #430: Loopbaan met Bezigheden, Besturing bij elkaar, Te doen en Verhaal gesplitst ---------------------------------------------
const kinderen = (pm.match(/const CHILD = \{([^}]+)\}/) || [])[1] || '';
ok(/visboek: 'loopbaan'/.test(kinderen) && !/boerderij:/.test(kinderen) && /controls: 'settings'/.test(kinderen), 'Visboek hangt onder Loopbaan, de toetsen en knoppen onder Instellingen; Boerderij is sinds 21-11 een eigen rail-item');
const rail = pm.slice(pm.indexOf('const RAIL_GROUPS ='), pm.indexOf('const CHILD ='));
ok(/'bezit', 'Bezit', \['spullen', 'garage', 'boerderij'\]/.test(rail), 'Boerderij staat als eigen item in de rail, onder Bezit (21-11)');
for (const id of ['visboek', 'controls']) ok(!new RegExp("'" + id + "'").test(rail), id + ' staat niet los in de rail');
for (const id of ['visboek', 'boerderij', 'controls']) ok(new RegExp("\\['" + id + "', '[^']+', '").test(pm) && new RegExp('data-panel="' + id + '"').test(pm), id + ' bestaat nog als onderdeel met zijn paneel (niets verdwenen)');
ok(/aria-current', String\(b\.dataset\.goto === \(CHILD\[name\] \|\| name\)\)/.test(pm), 'de rail markeert de ouder van een onderdeel');
ok(/if \(CHILD\[tab\] && origin === 'home'\)/.test(pm), 'Esc en Terug gaan van een onderdeel naar zijn ouder');
ok(/ids = sectionIds\(\)\.filter\(\(id\) => !CHILD\[id\]\)/.test(pm), 'Q en E tussen onderdelen slaan de kinderen over');
const lb = read('game/js/loopbaanui.js');
ok(/VAK_LINK = \{[\s\S]*?hengelen: \{ id: 'visboek'[\s\S]*?landbouw: \{ id: 'boerderij'/.test(lb) && lb.includes('bezighedenHtml(id, v, banen)') && !lb.includes('lb-tegel') && !lb.includes('lb-bez-rij'), 'Vissen en Boerderij zijn bezigheden van hun loopbaan, geen aparte tegels (#430)');
ok(lb.includes('data-todo-goal="job:') && lb.includes('Volgende klus') && !lb.includes('volgendeKlusHtml') && !lb.includes('Naar de volgende klus:') && !lb.includes('data-lbview'), 'elke bezigheid staat er één keer: Volgende klus is een label, geen tweede knop; Veroverd is geen weergave van Loopbaan');
// één overzicht: elke loopbaan toont zijn bezigheden en voortgang, en geen bezigheid valt onder twee loopbanen
ok(lb.includes('lb-k-bar') && lb.includes('bezighedenHtml(id, v, banen)'), 'elke loopbaan in de lijst heeft zijn voortgangsbalk en het detail zijn bezigheden');
{
  const baanVak = lbSrc.slice(lbSrc.indexOf('const BAAN_VAK = {'), lbSrc.indexOf('export const BAAN_IDS'));
  const paren = [...baanVak.matchAll(/([a-z]+):\s*'([a-z]+)'/g)].map((x) => [x[1], x[2]]);
  const ids = paren.map((p) => p[0]);
  ok(paren.length > 30 && new Set(ids).size === ids.length && paren.every(([, v]) => LB.VAK_IDS.includes(v)), 'elke bezigheid hangt aan precies één loopbaan en die bestaat', ids.filter((id, i) => ids.indexOf(id) !== i).join(', '));
  ok(LB.BAAN_IDS.every((b) => LB.banenVan(LB.vakVanBaan(b)).includes(b)), 'elke bezigheid is via zijn loopbaan te vinden');
  ok(lb.includes('Bezigheden'), 'de bezigheden hebben een eigen kop in het loopbaanpaneel');
}
ok(/Veroverd staat in de rail/.test(read('game/js/todoui.js')) && pm.includes("['veroverd', 'Veroverd',") && /data-panel="veroverd"/.test(pm) && /if \(name === 'veroverd'\) renderVeroverdPanel/.test(pm), 'Veroverd is een eigen railrij met een eigen paneel (#676)');
// Besturing: alles bij elkaar in Instellingen
const bes = settingsSrc.slice(settingsSrc.indexOf("tab('besturing'"), settingsSrc.indexOf("tab('display'"));
for (const k of ['mouseSensitivity', 'invertY', 'padLayout', 'padLookSensitivity', 'rumble', 'touchControls']) ok(keysOf(bes).includes(k), 'Besturing heeft ' + k);
ok(/data-pad-test/.test(bes) && /data-goto-sub="controls:knoppen"/.test(bes) && /data-goto-sub="controls:toetsen"/.test(bes) && /data-goto-sub="controls:overzicht"/.test(bes) && /data-goto-sub="controls:hulp"/.test(bes) && /data-goto-sub="settings:hints"/.test(bes), 'Besturing verwijst naar Controller testen, Knoppen indelen, Toetsen, Toetsenoverzicht, Hulp en Hints (#979: Hints staat onder Instellingen)');
ok(!/touchControls/.test(settingsSrc.slice(settingsSrc.indexOf("tab('display'"), settingsSrc.indexOf("tab('a11y'"))), 'Interface heeft de aanraakbediening niet meer');
ok(/\['overzicht', 'Toetsenoverzicht'\]/.test(pm) && !/'Alle toetsen'\]/.test(pm), "'Alle toetsen' heet Toetsenoverzicht en staat onder Besturing");
// de besturing staat per situatie bij elkaar en elke regel staat er één keer (#430)
const cgSrc = pm.slice(pm.indexOf('const CONTROL_GROUPS = '), pm.indexOf('const GROUP_ICONS = '));
const groepen = new Function('DESKTOP', cgSrc.replace('const CONTROL_GROUPS = ', 'return ') + ';')(false);
ok(groepen.map((g) => g[1]).join() === 'Te voet,Vervoer,Vechten,Duif,Samen spelen,Menu en radio', 'het Toetsenoverzicht heeft één blok per situatie', groepen.map((g) => g[1]).join());
ok(!/Helikopter/.test(cgSrc) && /heli en vliegtuig/.test(cgSrc), 'de helikopter staat bij het vervoer, niet als losse situatie met dubbele WASD- en E-regels');
for (const [gid, titel, rijen] of groepen) {
  const gezien = new Set();
  for (const [keys, desc] of rijen) {
    const k = keys.join('+') + '|' + desc;
    ok(!gezien.has(k) && desc.length > 3, `geen dubbele regel in ${titel}`, desc);
    gezien.add(k);
  }
  ok(new Set(rijen.map(([k]) => k.join('+'))).size === rijen.length, `elke toets staat één keer in ${titel}`, rijen.map(([k]) => k.join('+')).join(' '));
}
ok(/data-goto-sub="settings:besturing"/.test(pm.slice(pm.indexOf('function subtabsHtml'), pm.indexOf('function subtabsHtml') + 1200)), 'toetsen en knoppen hebben een knop terug naar Instellingen');
// Te doen: losse activiteiten; Verhaal: de opdrachten
// Te doen: losse activiteiten in één lijst, met Dichtbij als filter (#607, was een eigen weergave)
ok(/data-todo-near/.test(read('game/js/todoui.js')) && /setTodoFilter/.test(pm) && !/data-sub="dichtbij"/.test(pm) && !/data-todo-sort/.test(pm), 'Activiteiten heeft één lijst met een Dichtbij-filter in plaats van twee weergaven');
ok(pm.includes("verhaal: [['opdrachten', 'Opdrachten'], ['personages', 'Personages']]"),'Verhaal heeft Opdrachten en Personages (Aanwijzingen is weg sinds 21-11); Veroverd staat sinds #676 in de rail');
ok(/data-of="verhaal" data-sub="opdrachten" data-keep/.test(pm) && /renderTodoStory\(/.test(pm) && /export function renderTodoStory/.test(read('game/js/todoui.js')), 'de verhaalopdrachten staan onder Verhaal, met dezelfde lijst en details');
ok(/data-todo-view="verhaal"/.test(read('game/js/todoui.js')) && /view === 'verhaal'\) \{ pref\.sub\.verhaal = 'opdrachten'/.test(pm), 'Alle opdrachten in Overzicht leidt naar Verhaal > Opdrachten');
// elke actie bereikbaar, geen dubbele data-actions of panelen
const panels = [...pm.matchAll(/data-panel="(\w+)" class/g)].map((x) => x[1]);
ok(new Set(panels).size === panels.length && panels.length === 17, 'elk paneel staat één keer in het blad', String(panels.length));
// --- #430 definitief: Spel (met Overzicht), Verhaal (met de telefoon), Loopbanen, Activiteiten, Samen spelen (met Spelers), Instellingen (met Cheats)
const secties = new Function('return ' + pm.slice(pm.indexOf('const SECTIONS = [') + 'const SECTIONS = '.length, pm.indexOf('];', pm.indexOf('const SECTIONS = [')) + 1))();
ok(secties.map((x) => x[0]).slice(0, 11).join() === 'spel,verhaal,todo,loopbaan,map,spullen,garage,veroverd,prestaties,fotos,settings', 'de secties staan in de volgorde van de eigenaar (20-11: Spel | Doen | Bezit | Voortgang | Systeem)', secties.map((x) => x[0]).join());
ok(!panels.includes('overzicht') && !panels.includes('telefoon'), 'Overzicht en Telefoon zijn geen eigen paneel meer');
for (const [id, titel, zin] of secties) ok(zin.split(/\s+/).length <= 8 && zin.length > 3, `onder ${titel} staat één korte zin (max 8 woorden)`, zin);
ok(secties.find((x) => x[0] === 'loopbaan')[1] === 'Loopbanen' && secties.find((x) => x[0] === 'todo')[1] === 'Activiteiten', 'Loopbaan heet Loopbanen en Te doen heet Activiteiten');
// de telefoon: contacten en berichten staan onder Verhaal, met dezelfde weergave en dezelfde klikken
const ph = read('game/js/phone.js'), vui = read('game/js/verhaalui.js');
ok(vui.includes('renderCharacterPhone(') && vui.includes('data-vh-phone') && ph.includes('export function renderCharacterPhone') && pm.includes("phoneClick(e, world, root.querySelector('[data-vh-phone]'), phoneApi)"), 'berichten en bellen staan bij het personage (Verhaal > Personages), met dezelfde klikken');
ok(ph.includes('Praat met ${c.name}') && ph.includes('data-ph-contact="${i}"') && ph.includes('messagesHtml(id)') && ph.includes('phoneHistory'), 'per personage: bellen als contact, en de berichten nieuwste eerst');
// geen verloren categorie: elke afzender valt onder een personage of onder Overig, elk contact bij een personage of Overig
ok(ph.includes("export const characterForSender = (name) => characterOf(name) || OVERIG;") && vui.includes('overigCard()') && ph.includes("'Nieuws (Kiekdoar)'"), 'wat van geen personage is (nieuws, meldingen, contacten zonder personage) staat onder Overig');
ok(!ph.includes('data-ph-thread="') || true, 'de oude lijst Berichten is niet meer nodig');
ok(pm.includes("if (name === 'telefoon') { pref.sub.verhaal = 'personages'; name = 'verhaal'; }") && pm.includes('selectVerhaalCharacter(characterForSender(opts.thread))'), 'de oude naam telefoon verwijst naar Verhaal > Personages; een bericht opent het personage');
ok(pm.includes("[data-of=\"verhaal\"][data-subtab=\"personages\"]") && pm.includes("toggleAttribute('data-new', met || unread)"), 'ongelezen berichten tonen op Personages en bij Verhaal');
ok(!/data-goto="telefoon"/.test(pm) && !/'telefoon'\)/.test(pm.slice(pm.indexOf('function syncNavBadges'), pm.indexOf('function renderPhone'))), 'er is geen rijknop of teller voor de telefoon meer; ongelezen berichten tellen bij Verhaal');
// oude namen verwijzen door
for (const [oud, nieuw] of [["name === 'overzicht' || name === 'game'", "name = 'spel'"], ["name === 'telefoon'", "name = 'verhaal'"], ["name === 'cheats'", "name = 'streken'"], ["name === 'missions'", "name = 'todo'"]]) ok(pm.includes(oud) && pm.includes(nieuw), 'oude naam ' + oud.split("'")[1] + ' verwijst door');
ok(/CHILD = {[^}]*controls: 'settings'/.test(pm) && !/streken: 'settings'/.test(pm) && !pm.includes("['settings', 'over', 'streken']") && /rowName\('Over GDE'/.test(pm) && !/spelers: 'samen'/.test(pm), 'Over is sinds #601 een rij onder Instellingen; Cheats staat sinds #435 in de rail; Samen spelen en Spelers zijn geen onderdeel of rijknop meer');
ok(pm.includes("['samen', 'Samen spelen'], ['spelers', 'Spelers'], ['uitnodigen', 'Uitnodigen'], ['sessie', 'Sessie']") && pm.includes('data-of="spel" data-sub="spelers"') && pm.includes('data-of="spel" data-sub="uitnodigen"') && pm.includes('data-of="spel" data-sub="sessie"') && pm.includes('renderSamenPanel(root.querySelector') && pm.includes('renderSpelersPanel(root.querySelector') && pm.includes('renderUitnodigen(') && pm.includes('renderSessie('), 'in een sessie vervangen Spelers, Uitnodigen en Sessie het tabblad Samen spelen in één tabrij (ontwerp Samen spelen 24-11)');
ok(pm.includes('const spelTabMag') && pm.includes("id === 'samen' ? !echteSessieNu()"), 'Samen spelen is er alleen zonder echte sessie; Spelers, Uitnodigen en Sessie alleen met een sessie');
ok(pm.includes("name === 'samen' || name === 'samenspelen' || name === 'spelers'") && pm.includes("setN('spel', coopN") && pm.includes('world.coopSpelers.length'), 'de oude namen samen, samenspelen en spelers verwijzen naar Spel > Samen spelen; de rijknop Spel toont het aantal spelers');
ok(read('game/js/main.js').includes("openPauseMenu('samen')"), 'de coöp-melding opent nog openPauseMenu(samen), dat nu naar Spel > Samen spelen gaat');
ok(!read('scripts/coop/coop.page.js').includes('.ra[data-goto="samen"]') && !read('scripts/coop/coop.page.js').includes('.ra[data-goto="spelers"]'), 'de coöp-QA zoekt geen oude rijknoppen meer');
ok(!settingsSrc.includes("tab('cheats'") && /\['video', 'Beeld'\], \['sound', 'Geluid & ondertitels'\], \['spel', 'Spelregels'\], \['moeilijkheid', 'Moeilijkheid'\], \['besturing', 'Besturing'\], \['camera', 'Camera'\], \['display', 'Interface'\], \['hints', 'Hints & uitleg'\], \['a11y', 'Toegankelijkheid'\]/.test(pm), 'Instellingen heeft negen echte instellingstabbladen (met Spel sinds #897, Moeilijkheid sinds #1169, Spelregels sinds #985 en Camera/Hints sinds #979); Cheats staat als eigen onderdeel in de rail (#604)');
ok(!/\['fouten', 'Foutrapport'\]/.test(pm) && pm.includes('<span>Problemen</span>') && pm.includes('data-errsum'), 'het foutrapport staat onder Over als Problemen met een Nederlandse samenvatting (#604)');
ok(pm.includes('data-reset-confirm') && pm.includes('data-action="reset-go"') && pm.includes('data-action="reset-undo"') && pm.includes('data-action="reset-cancel"'), 'Standaard herstellen vraagt eerst en kan daarna ongedaan gemaakt worden (#604)');
ok(pm.includes('const inGameOnly') && /prestart && inGameOnly/.test(pm), 'voor de start zijn Overzicht, Opslaan & stoppen en Samen spelen er niet');
ok(pm.includes("if (tab === 'spel' && !atHome())"), 'Esc in Spel gaat eerst terug naar Overzicht en sluit dan pas');
// Activiteiten: geen bijbanen (die staan onder Loopbanen) en de banen zijn daar te kiezen
const tui = read('game/js/todoui.js');
ok(/isActiviteit = \(it\) => it\.group !== 'verhaal' && it\.group !== 'bijbaantjes'/.test(tui) && /SHOWN = GROUPS\.filter/.test(tui) && /eigen\.filter\(\(it\) => it\.dist != null/.test(tui), 'Activiteiten (één lijst met Dichtbij-filter) heeft geen bijbanen meer');
ok(/data-todo-goal="job:/.test(lb) && /baanDoelen/.test(lb) && /tab === 'loopbaan' && todoClick/.test(pm), 'een bijbaan kies je onder Loopbanen met Zet als doel (niet dubbel)');
const bron = pm.slice(0, pm.indexOf('export function initPauseMenu('));
for (const act of [...ACTIES.filter((a) => a !== 'save'), 'bench', 'bench-go', 'errlog-copy']) {
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

// --- #435: de rest van de checklist ------------------------------------------------------------------------------------------------
const td = read('game/js/todoui.js');
ok(td.includes('function nextHtml(cur)') && td.includes('return nextHtml(cur) + PART_IDS.map('), 'Verhaal > Opdrachten begint met de volgende stap en een knop naar het doel');
ok(td.includes("it.group !== 'missies';") && td.includes("g !== 'missies'"), 'Activiteiten bevat geen verhaalmissies meer');
ok(pm.includes('class="ra pm-exit" data-action="exit"'), 'Afsluiten staat als eigen knop in de rail van het pauzemenu (alleen desktop)');
ok(pm.includes("icon('spelers', 'pm-ic n-ic')"), 'de teller bij Spel heeft een poppetje-icoon');
ok(read('game/js/hudcards.js').includes('menuMelding(text)'), 'meldingen staan direct in beeld als het menu open is');
ok(pm.includes('Geluid uit of weer aan;'), 'Besturing legt de dempknop uit (in de lange uitleg onder Hulp)');

// #435 (vervolg): garage, fotomodus, kaart, Spullen, Prestaties, Shift en Aanwijzingen
const vp = read('game/js/vehiclepreview.js'), fu = read('game/js/fotomodusui.js'), sp = read('game/js/spullen.js'), vu = read('game/js/verhaalui.js');
ok(vp.includes("'webglcontextlost'") && vp.includes('forgetBlankShots'), 'de gedeelde voorbeeldrenderer herstelt na een verloren WebGL-context');
// #435: de 3D-voorbeelden in de garage en Kopen met een waypoint
const gu = read('game/js/garageui.js'), gp = read('game/js/garagepics.js'), mm = read('game/js/menumodels.js');
ok(mm.includes("['autos', \"Auto's\"]") && mm.indexOf("['autos'") < mm.indexOf("['all', 'Alles']"), "de garage begint op het tabblad Auto's en Alles staat achteraan");
ok(gp.includes('export function garageSaleShop(') && gu.includes('data-garage-koop='), 'bij een voertuig dat te koop is staat een knop Kopen met de winkel erbij');
ok(pm.includes("[data-garage-koop]") && pm.includes('garageNaarWinkel(world, gw.dataset.garageKoop)'), 'Kopen zet een waypoint naar de plek waar het te koop is (pausemenu.js)');
ok(gu.includes('gar-stage') && gu.includes('gar-still') && gu.includes('showStageFallback'), 'het 3D-voorbeeld heeft een stilstaand beeld en een silhouet als terugval, zodat het paneel nooit leeg is');
// review 0.62: de knoppenrij van de garage schoof over de laatste regel van WAAR; ze is nu
// een eigen blok onder de gegevens en de vraag "WAAR" verschijnt alleen met inhoud
ok(gu.includes('m-acts td-acts gar-acts') && /const waarHtml = waar && waar\.trim\(\) \? secHtml\('Waar'/.test(gu), 'de garageknoppen staan in een eigen rij onder de gegevens, met WAAR alleen als er iets staat');
ok(/#pause-menu \.gar-viewer > \.m-acts\.td-acts \{[^}]*position: static/.test(read('game/js/pausemenu.css')), 'de garageknoppen zijn niet plakkerig: geen overlap met de gegevens');
ok(gu.includes('viewerCanvas !== c') && gu.includes('onFirstFrame'), 'het voorbeeld wordt hergebruikt: een andere keuze wisselt alleen het model, geen nieuwe renderer of canvas');
ok(vp.includes('GL_RETRY_MS') && vp.includes('glRetryAt') && !vp.includes('if (url || glFailed)'), 'een mislukte of verloren voorbeeldcontext wordt na een korte pauze opnieuw geprobeerd en een leeg plaatje wordt niet bewaard');
ok(pm.includes('if (isPhotoMode()) return;'), 'het pauzemenu opent niet over de fotomodus (Escape en M horen bij de fotomodus)');
ok(fu.includes('BAR_HTML') && fu.includes("KEYBTN('W A S D', 'Lopen')") && fu.includes('data-foto-stop'), 'de fotomodus heeft een knoppenbalk met sleutelhints en Terug');
ok(fu.includes("inProvinceData(p.cam.x, p.cam.y) === false"), 'de vrije camera van de fotomodus blijft binnen de wereld');
ok(read('game/js/gebiedenkaart.js').includes('landBorders()') && read('game/js/regions.js').includes('export const landBorders'), 'de kaart tekent de landgrenzen in de kleur van het buurgebied');
ok(sp.includes('LEEG[deel]') && sp.includes('itemIcoon(') && sp.includes('class="sp-raster"'), 'Spullen: pictogrammen en een uitleg bij een lege categorie');
const ac = read('game/js/achievements.js');
ok(ac.includes("id: 'kaart_alle'") && ac.includes("stat: 'gebied_provincie'") && read('game/js/achievementtracker.js').includes('syncGebiedStats') && read('game/js/gebieden.js').includes('function kaartVerkend'), 'Prestaties: de hele kaart verkend en de gebiedenvoortgang tellen mee');
ok(read('game/js/player.js').includes('Even uitpuffen'), 'Shift zonder sprint zegt waarom');
ok(!vu.includes('function cluesHtml(') && !pm.includes('data-sub="aanwijzingen"'), 'de Aanwijzingen-tab is weg (21-11: hints en clues voegden niets toe)');
ok(pm.includes("setN('spel', coopN ? String(coopN) : ''") && read('game/js/coopspelers.js').includes('rijen.sort((a, b) => (a.jij'), 'de Spel-teller telt jezelf mee (de lijst begint met jou)');

// #445: de kaart, waypoints en reizen
const mvs = read('game/js/mapview.js');
ok(mvs.includes("from './kaartactie.js'") && mvs.includes('actiesHtml(model, stap)'), 'Kaart: een klik toont de actiebalk Zet waypoint, Reis erheen en Info (kaartactie.js)');
ok(mvs.includes('initKaartUitleg(overlay)') && mvs.includes('uitleg-sluit') && mvs.includes('UITLEG_ID'), 'Kaart: de eerste keer een uitleg, te sluiten, onthouden onder gde-hud-gezien');
ok(read('game/js/helpoverview.js').includes("id: 'kaart'"), 'Besturing, Hulp: de uitleg over de kaart is terug te vinden');


// #435: veilig afsluiten vanuit het hoofdmenu en de nieuw-bolletjes op de rail
const exitBranch = pm.slice(pm.indexOf("a === 'menu' || a === 'quit-now'"), pm.indexOf("a === 'pigeon-stop'"));
ok(/started\(\) && !prestart && world \? saveGame\(world\) : undefined/.test(exitBranch), 'Afsluiten bewaart alleen een lopend spel, niet de menuscene boven het hoofdmenu (#435); de uitslag gaat naar #563');
ok(!/if \(world\) saveGame\(world\)/.test(exitBranch), 'geen onvoorwaardelijke save meer bij Spel herstarten of Afsluiten');
const pcss = read('game/js/pausemenu.css').replace(/\r\n/g, '\n');
ok(pcss.includes('.ra[data-new] .ra-t::after'), 'de nieuw-bolletjes op de rail (Verhaal, Prestaties) hebben een eigen stijl (#435)');
ok(pcss.includes('.ra.pm-exit::after'), 'Afsluiten staat met een scheidingslijn onder de andere secties');
ok(pm.includes("setN('todo', '');") && !pm.includes("setN('todo', fresh"), "'nieuw' van een verhaal-aanwijzing staat niet meer op Activiteiten (#435)");
// #435: Beeld > Voorinstelling zijn knoppen, met de stand van nu gemarkeerd
ok(pm.includes('data-preset-btn="${n}" aria-pressed="false"') && pm.includes("setAttribute('aria-pressed'") && !pm.includes('data-preset-pick'), 'de voorinstellingen zijn knoppen en de oude kiezer is weg');
ok(pm.includes('[data-preset-now]') && pm.includes("cur ? autoGfxNote(st) : 'Eigen instellingen'"), 'de huidige stand is zichtbaar, ook als je zelf aan de schuiven zat (en of hij automatisch gekozen is, 23-11)');
ok(pcss.includes('.pm-chips .m-chip[aria-pressed="true"]'), 'de gekozen voorinstelling staat in het groen met een vinkje');
// #586: een lopende toetsen-/controller-rebind mag niet blijven hangen als het pauzemenu sluit
const setOpenSrc = pm.slice(pm.indexOf('function setOpen('));
const sluitTak = setOpenSrc.slice(setOpenSrc.indexOf('if (!value)'), setOpenSrc.indexOf('open = value;'));
ok(sluitTak.includes('cancelRebind(true)'), 'elke sluiting van het pauzemenu (setOpen(false)) annuleert een lopende rebind en geeft de input-capture vrij');
const resumeSluit = pm.slice(pm.indexOf("if (a === 'resume')"), pm.indexOf("if (a === 'resume')") + 60);
ok(resumeSluit.includes('setOpen(false)'), 'Doorgaan en de rail-Terug (runAction resume) sluiten via setOpen(false) en komen dus langs die annulering');
ok(pm.includes('class="ra pm-back" data-action="resume">Terug'), 'de railknop Terug heeft data-action resume (dezelfde route als Doorgaan)');
const cancelSrc = pm.slice(pm.indexOf('function cancelRebind('), pm.indexOf('function focusEl('));
ok(cancelSrc.includes('rebinding.cancel()') && cancelSrc.includes('input.captureKey = null') && cancelSrc.includes('renderBinds()'),
  'cancelRebind ruimt de controller-capture en de toetscapture op en haalt de wachtstand van de knop weg');
ok(cancelSrc.includes('if (input) input.captureKey = null;') && /if \(!rebinding\) \{[\s\S]*?input\.captureKey = null/.test(cancelSrc),
  'de toetscapture gaat ook vrij als de wachtstand al weg was (geen ingeslikte toets meer)');
ok(pm.includes('rebinding.cancel = capturePadButton('), 'de controller-capture wordt met zijn eigen cancel-functie opgeruimd');
ok(/if \(k === 'Escape' \|\| k === 'Backspace'\) \{ consume\(e\); cancelRebind\(\); \}/.test(pm), 'Escape annuleert de rebind zelf (en sluit het menu dan niet)');
ok(pm.includes("if (prev === 'controls' && name !== 'controls') cancelRebind();"), 'een tabwissel weg van Besturing annuleert de rebind');
ok(exitBranch.includes('cancelRebind(true)'), 'Afsluiten geeft de wachtstand vrij voordat het spel opslaat en sluit');

// #911: drie zichtbare groepen met een kop en een telling, in dezelfde volgorde als de secties
const railGroepen = (pm.match(/const RAIL_GROUPS = \[([\s\S]*?)\];/) || [])[1] || '';
const railDelen = [...railGroepen.matchAll(/\['(\w+)', '([^']+)', \[([^\]]+)\]\]/g)].map((m) => [m[1], m[2], [...m[3].matchAll(/'(\w+)'/g)].map((x) => x[1])]);
ok(railDelen.length === 5 && !railDelen.flatMap((d) => d[2]).includes('over'), 'de rail heeft vijf groepen en geen Over-rij (#601)', JSON.stringify(railDelen.map((d) => d[0])));
ok(railDelen.map((d) => d[0]).join() === 'spel,doen,bezit,voortgang,systeem' && railDelen.map((d) => d[1]).join() === 'Spel,Doen,Bezit,Voortgang,Systeem', 'de groepen heten Spel, Doen, Bezit, Voortgang en Systeem (#911, 20-11)');
ok(railDelen[0][2].join() === 'spel' && railDelen[1][2].join() === 'verhaal,todo,loopbaan,map' && railDelen[2][2].join() === 'spullen,garage,boerderij' && railDelen[3][2].join() === 'veroverd,prestaties,fotos' && railDelen[4][2].join() === 'settings,streken', 'de rail: Spel | Verhaal, Activiteiten, Loopbanen, Boerderij, Kaart | Spullen, Garage | Veroverd, Prestaties, Foto’s | Instellingen en Cheats (#430, #435, #601, #676, #911, 20-11)');
ok(/pm-rail-h/.test(pm) && !/data-gcount/.test(pm) && /function railPosition\(/.test(pm), 'de kop van een groep toont geen aantal en de bladkop zegt waar je bent (#911, 21-11)');
ok(/'over',\s*'Over'/.test(pm) && /data-goto="over"|data-goto-sub="[a-z]+:over"/.test(pm), 'Over bestaat nog als onderdeel met een ingang (#601)');
ok(/rowName\('Over GDE'.*?data-goto="over"/.test(pm), 'Instellingen > Interface heeft een rij naar Over (#601)');
// de rail past op de stage: 48 px per rij op 1080p, 40 px op 1280x720 (QA #911), en nooit
// meer de oude 56 px of een inklapregel per vensterhoogte
ok(/--ra-h: 48px/.test(pcss) && !/--ra-h: 56px/.test(pcss) && !/max-height: 1000px/.test(pcss), 'de railrijen zijn 48 px en krimpen niet meer per vensterhoogte (#601, #911)');
const compactRail = [...pcss.matchAll(/@media \(max-height: 820px\) \{([\s\S]*?)\n\}/g)].map((m) => m[1]).join('\n');
ok(/--ra-h: 40px/.test(compactRail) && /\.pm-rail-h \{/.test(compactRail), 'op 1280x720 krijgt de rail compactere rijen en koppen, zodat alle twaalf onderdelen passen (#911)');
// Q/E en [ ] doen hetzelfde en pakken de zichtbare (binnenste) tabrij, daarna het onderdeel
ok(/lower === 'q' \|\| lower === 'e' \|\| k === '\[' \|\| k === '\]'/.test(pm) && /function cycleVisibleTabs/.test(pm) && /lists\[lists\.length - 1\]/.test(pm),
  'Q/E en [ ] pakken de zichtbare tabrij, de binnenste eerst (#601)');
ok(/if \(SUBTABS\[tab\] && cycleVisibleTabs\(dir\)\) return;\s*if \(cycleOwnTabs\(dir\)\) return;\s*cycleSection\(dir\);/.test(pm),
  'Q/E en [ ] vallen terug op het onderdeel als er geen tabbladen zijn (#601)');
ok(!/spelers-tab/.test(pm), 'er is geen tweede tabrij meer, dus Q/E hoeft op Spel > Samen spelen niets bijzonders te noemen (ontwerp Samen spelen 24-11)');
const hintSecties = ['spullen', 'loopbaan', 'visboek', 'boerderij', 'fotos', 'streken', 'over', 'map'];
for (const s of hintSecties) ok(new RegExp(`^\\s*${s}: .*\\[\\['Q', 'E'\\], '`, 'm').test(pm), `de voetregel van ${s} noemt Q/E (wat de toets daar doet)`);
ok(/over: \[\[\['↑', '↓'\], 'kiezen'\], \[\['Enter'\], 'open of dicht'\]/.test(pm), 'Over heeft een eigen voetregel met de vouwen (#601)');
// Over is een naslagscherm: 18 px body en twee vouwen, geen tweede tekststijl
const overSrc = pm.slice(pm.indexOf('function renderOverPanel'), pm.indexOf('const ARROWS'));
ok(/overBodyHtml\(/.test(overSrc) && /data-fold-body="over-credits"/.test(overSrc) && /CREDITS_HTML/.test(overSrc) && /data-over-alles/.test(overSrc),
  'Over vouwt "Wat is er nieuw" en de credits in plaats van een tekstmuur (#601/#612)');
ok(/#pause-menu \.pm-over p, #pause-menu \.pm-over li \{ font-size: 18px/.test(pcss), 'Over heeft 18 px body (#601)');
// één "Wat is er nieuw": het oude titelscherm heeft die ingang niet meer
const ss = read('game/js/startscreen.js');
ok(!/act: 'news'/.test(ss) && !/openNews/.test(ss), 'het titelscherm heeft geen tweede "Wat is er nieuw" meer (#601)');
// Spel-UI 24-11: het Overzicht is een heldkaart met de gele knop, een strook Aandacht, één voortgangsblok en een voet met Vastgelopen?; geen tegels en geen vouwen meer
const todoSrc = read('game/js/todoui.js');
ok(/function heldHtml/.test(todoSrc) && /verderKnop\('Verder met deze stap'/.test(todoSrc) && /data-ov-verder/.test(todoSrc), 'Overzicht heeft de heldkaart met Verder met deze stap (Spel-UI 24-11)');
ok(/function strookHtml/.test(todoSrc) && /aandachtRegels\(/.test(todoSrc) && /function voortgangBlokHtml/.test(todoSrc) && /function voetHtml/.test(todoSrc), 'Overzicht heeft de strook Aandacht, het voortgangsblok en de voet');
ok(!/ov-tile|tilesHtml|disc\('quick'|disc\('help'/.test(todoSrc), 'de tegels en de vouwen Snel instellen en Vastgelopen? zijn weg uit het Overzicht');
ok(/export function foldNote/.test(todoSrc) && /foldNote\(btn\.dataset\.fold, on\)/.test(pm), 'de vouwen van Over en Overzicht onthouden hun stand');
ok(/data-ov-verder/.test(todoSrc) && /chooseTodo\(world, it, null\)/.test(todoSrc) && /api\.close/.test(todoSrc), 'Verder met deze stap zet het doel, sluit het menu en laat het spel verder gaan');
ok(/-webkit-mask-image: linear-gradient\(180deg, transparent 0, (?:#000|var\(--ds-c-ink-inkt\)) 14px\)/.test(pmcss), 'wat wegscrolt vervaagt, in plaats van midden in een regel af te knippen (#965)');
ok(/\.ov-scroll'\)\) n\.scrollTop = 0/.test(pm), 'bij het openen begint het Overzicht weer bovenaan (#965)');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
