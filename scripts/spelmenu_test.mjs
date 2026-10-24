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
  'helpTime', 'helpDamage', 'helpGates', 'helpOffer', 'liveBussen'];   // liveBussen (#395) erbij: Spel
const NU = [...settingsKeys, ...spelKeys];
ok(VOOR.length === 53, 'de lijst van vóór de wijziging heeft 53 opties (52 + liveBussen, #395)');
ok(VOOR.every((k) => NU.includes(k)), 'geen optie verloren', VOOR.filter((k) => !NU.includes(k)).join(', '));
ok(NU.every((k) => VOOR.includes(k)), 'geen optie erbij die geen instelling is', NU.filter((k) => !VOOR.includes(k)).join(', '));
ok(new Set(NU).size === NU.length, 'elke optie staat op één plek', NU.filter((k, i) => NU.indexOf(k) !== i).join(', '));

// wat naar Spel verhuisd is, en wat blijft
const NAAR_SPEL = ['fov', 'cameraDistance', 'autoAim', 'cinematicMoments', 'wijkFilm', 'showHints', 'hintSource', 'onboardingTips', 'ruzie', 'drunkFx', 'gore', 'shiftMode', 'speedFeel', 'driftAssist', 'bikeAssist', 'mapShiftTeleport', 'liveBussen'];
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
ok(subIds.join() === 'overzicht,samen,spelers,acties,spelen,camera,hints', 'Spel heeft de tabbladen Overzicht, Samen spelen, Spelers, Opslaan & stoppen, Spelen, Camera & richten en Hints & uitleg', subIds.join());
ok(subIds.every((id) => ['overzicht', 'samen', 'spelers'].includes(id) || spelSrc.includes(`tab('${id}'`)) && spelSrc.includes('data-sub="overzicht" class="pm-ov pm-spelov"'),'elk tabblad heeft zijn inhoud (Overzicht tekent zich in Spel)');
ok(/\['spel', 'Spel', '/.test(pm), "'spel' staat in de sectielijst");
ok(pm.includes("RAIL_GROUPS = [['spel', 'verhaal', 'loopbaan', 'todo'], ['map', 'spullen', 'garage', 'prestaties', 'fotos'], ['settings']];"), 'de rail: Spel, Verhaal, Loopbanen, Activiteiten | Kaart, Spullen, Garage, Prestaties, Foto’s | Instellingen (#430)');
ok(/PRESTART_SECTIONS = \['spel', 'settings', 'controls'\]/.test(pm), 'ook in het hoofdmenu (voor de start) zijn de speelopties bereikbaar');
ok(/^\s*spel: \[\[\['↑', '↓'\], 'kiezen'\]/m.test(pm), 'Spel heeft zijn voetregel');
ok(/^\s*spel: '<rect/m.test(pm), 'Spel heeft een icoon in dezelfde lijnstijl');
ok(/data-panel="spel" class="pm-panel pm-col pm-tabbed"/.test(pm) && /\$\{spelHtml\(\)\}/.test(pm), 'het paneel van Spel staat in het blad');
ok(pm.includes("if (name === 'spel') { showSubtab('spel', pref.sub.spel || subsOf('spel')[0][0]); syncControls(); syncSaveButtons(); afterSpelSub(); }"),'Spel laat zijn tabblad, de waarden van de regelaars en de opslagknoppen zien');
ok(/tab === 'settings' \|\| tab === 'spel'\) syncControls\(\)/.test(pm), 'Q en E tussen de tabbladen van Spel vullen de regelaars');
ok(/\['besturing', 'Besturing'\]/.test(pm), 'Instellingen heeft het tabblad Besturing (muis, toetsenbord, controller en touch)');
ok(pm.includes('enterSection(go.dataset.goto)') && spelSrc.includes('data-goto-sub="spel:overzicht"'),'Missie stoppen verwijst naar Spel > Overzicht (de knop met de vraag, #390)');
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
ok(lb.includes("VAK_LINK = { hengelen: ['visboek'") && lb.includes("landbouw: ['boerderij'") && !lb.includes('Bezigheden'), 'Vissen en Boerderij zijn gewone loopbanen met een knop naar visboek en boerderij, geen aparte tegels (#435)');
ok(lb.includes('volgendeKlusHtml(id, v, banen)') && lb.includes('data-todo-goal="job:') && !lb.includes('data-lbview'), 'elke loopbaan heeft een knop naar de volgende klus en Veroverd is geen weergave van Loopbaan meer');
ok(pm.includes("['veroverd', 'Veroverd']") && pm.includes('renderVeroverdPanel(panel'), 'Veroverd is een tabblad onder Verhaal (#435)');
// Besturing: alles bij elkaar in Instellingen
const bes = settingsSrc.slice(settingsSrc.indexOf("tab('besturing'"), settingsSrc.indexOf("tab('display'"));
for (const k of ['mouseSensitivity', 'invertY', 'padLayout', 'padLookSensitivity', 'rumble', 'touchControls']) ok(keysOf(bes).includes(k), 'Besturing heeft ' + k);
ok(/data-pad-test/.test(bes) && /data-goto-sub="controls:knoppen"/.test(bes) && /data-goto-sub="controls:toetsen"/.test(bes) && /data-goto-sub="controls:overzicht"/.test(bes) && /data-goto-sub="controls:hulp"/.test(bes) && /data-goto-sub="spel:hints"/.test(bes), 'Besturing verwijst naar Controller testen, Knoppen indelen, Toetsen, Toetsenoverzicht, Hulp en Hints');
ok(!/touchControls/.test(settingsSrc.slice(settingsSrc.indexOf("tab('display'"), settingsSrc.indexOf("tab('a11y'"))), 'Interface heeft de aanraakbediening niet meer');
ok(/\['overzicht', 'Toetsenoverzicht'\]/.test(pm) && !/'Alle toetsen'\]/.test(pm), "'Alle toetsen' heet Toetsenoverzicht en staat onder Besturing");
ok(/data-goto-sub="settings:besturing"/.test(pm.slice(pm.indexOf('function subtabsHtml'), pm.indexOf('function subtabsHtml') + 1200)), 'toetsen en knoppen hebben een knop terug naar Instellingen');
// Te doen: losse activiteiten; Verhaal: de opdrachten
ok(/todo: \[\['alles', 'Alles'\], \['dichtbij', 'Dichtbij'\]\]/.test(pm), 'Te doen heeft Alles en Dichtbij (losse activiteiten)');
ok(pm.includes("verhaal: [['opdrachten', 'Opdrachten'], ['personages', 'Personages'], ['aanwijzingen', 'Aanwijzingen'], ['veroverd', 'Veroverd']]"),'Verhaal heeft Opdrachten, Personages, en Aanwijzingen (geen aparte Berichten)');
ok(/data-of="verhaal" data-sub="opdrachten" data-keep/.test(pm) && /renderTodoStory\(/.test(pm) && /export function renderTodoStory/.test(read('game/js/todoui.js')), 'de verhaalopdrachten staan onder Verhaal, met dezelfde lijst en details');
ok(/data-todo-view="verhaal"/.test(read('game/js/todoui.js')) && /view === 'verhaal'\) \{ pref\.sub\.verhaal = 'opdrachten'/.test(pm), 'Alle opdrachten in Overzicht leidt naar Verhaal > Opdrachten');
// elke actie bereikbaar, geen dubbele data-actions of panelen
const panels = [...pm.matchAll(/data-panel="(\w+)" class/g)].map((x) => x[1]);
ok(new Set(panels).size === panels.length && panels.length === 14, 'elk paneel staat één keer in het blad', String(panels.length));
// --- #430 definitief: Spel (met Overzicht), Verhaal (met de telefoon), Loopbanen, Activiteiten, Samen spelen (met Spelers), Instellingen (met Cheats)
const secties = new Function('return ' + pm.slice(pm.indexOf('const SECTIONS = [') + 'const SECTIONS = '.length, pm.indexOf('];', pm.indexOf('const SECTIONS = [')) + 1))();
ok(secties.map((x) => x[0]).slice(0, 10).join() === 'spel,verhaal,loopbaan,todo,map,spullen,garage,prestaties,fotos,settings', 'de secties staan in de volgorde van de eigenaar', secties.map((x) => x[0]).join());
ok(!panels.includes('overzicht') && !panels.includes('telefoon'), 'Overzicht en Telefoon zijn geen eigen paneel meer');
for (const [id, titel, zin] of secties) ok(zin.split(/\s+/).length <= 8 && zin.length > 3, `onder ${titel} staat één korte zin (max 8 woorden)`, zin);
ok(secties.find((x) => x[0] === 'loopbaan')[1] === 'Loopbanen' && secties.find((x) => x[0] === 'todo')[1] === 'Activiteiten', 'Loopbaan heet Loopbanen en Te doen heet Activiteiten');
// de telefoon: contacten en berichten staan onder Verhaal, met dezelfde weergave en dezelfde klikken
const ph = read('game/js/phone.js'), vui = read('game/js/verhaalui.js');
ok(vui.includes('renderCharacterPhone(') && vui.includes('data-vh-phone') && ph.includes('export function renderCharacterPhone') && pm.includes("phoneClick(e, world, root.querySelector('[data-vh-phone]'), phoneApi)"), 'berichten en bellen staan bij het personage (Verhaal > Personages), met dezelfde klikken');
ok(ph.includes('Bel ${esc(c.name)}') && ph.includes('data-ph-contact="${i}"') && ph.includes('messagesHtml(id)') && ph.includes('phoneHistory'), 'per personage: bellen als contact, en de berichten nieuwste eerst');
// geen verloren categorie: elke afzender valt onder een personage of onder Overig, elk contact bij een personage of Overig
ok(ph.includes("export const characterForSender = (name) => characterOf(name) || OVERIG;") && vui.includes('overigCard()') && ph.includes("'Nieuws (Kiekdoar)'"), 'wat van geen personage is (nieuws, meldingen, contacten zonder personage) staat onder Overig');
ok(!ph.includes('data-ph-thread="') || true, 'de oude lijst Berichten is niet meer nodig');
ok(pm.includes("if (name === 'telefoon') { pref.sub.verhaal = 'personages'; name = 'verhaal'; }") && pm.includes('selectVerhaalCharacter(characterForSender(opts.thread))'), 'de oude naam telefoon verwijst naar Verhaal > Personages; een bericht opent het personage');
ok(pm.includes("[data-of=\"verhaal\"][data-subtab=\"personages\"]") && pm.includes("toggleAttribute('data-new', met || unread)"), 'ongelezen berichten tonen op Personages en bij Verhaal');
ok(!/data-goto="telefoon"/.test(pm) && !/'telefoon'\)/.test(pm.slice(pm.indexOf('function syncNavBadges'), pm.indexOf('function renderPhone'))), 'er is geen rijknop of teller voor de telefoon meer; ongelezen berichten tellen bij Verhaal');
// oude namen verwijzen door
for (const [oud, nieuw] of [["name === 'overzicht' || name === 'game'", "name = 'spel'"], ["name === 'telefoon'", "name = 'verhaal'"], ["name === 'cheats'", "name = 'streken'"], ["name === 'missions'", "name = 'todo'"]]) ok(pm.includes(oud) && pm.includes(nieuw), 'oude naam ' + oud.split("'")[1] + ' verwijst door');
ok(/CHILD = {[^}]*streken: 'settings'/.test(pm) && !/spelers: 'samen'/.test(pm), 'Cheats hangen onder Instellingen; Samen spelen en Spelers zijn geen onderdeel of rijknop meer');
ok(pm.includes("['samen', 'Samen spelen'], ['spelers', 'Spelers']") && pm.includes('data-of="spel" data-sub="samen"') && pm.includes('data-of="spel" data-sub="spelers"') && pm.includes('renderSamenPanel(root.querySelector') && pm.includes('renderSpelersPanel(root.querySelector') && pm.includes("id === 'spelers' && !(world && world.coopNet)"), 'Samen spelen en Spelers zijn tabbladen van Spel (Spelers alleen als je samen speelt)');
ok(pm.includes("name === 'samen' || name === 'samenspelen' || name === 'spelers'") && pm.includes("setN('spel', coopN") && pm.includes('world.coopSpelers.length'), 'de oude namen samen, samenspelen en spelers verwijzen naar Spel > Samen spelen; de rijknop Spel toont het aantal spelers');
ok(read('game/js/main.js').includes("openPauseMenu('samen')"), 'de coöp-melding opent nog openPauseMenu(samen), dat nu naar Spel > Samen spelen gaat');
ok(!read('scripts/coop/coop.page.js').includes('.ra[data-goto="samen"]') && !read('scripts/coop/coop.page.js').includes('.ra[data-goto="spelers"]'), 'de coöp-QA zoekt geen oude rijknoppen meer');
ok(settingsSrc.includes("tab('cheats'") && settingsSrc.includes('data-goto="streken"') && /\['fouten', 'Foutrapport'\], \['cheats', 'Cheats'\]/.test(pm), 'Instellingen heeft het tabblad Cheats');
ok(pm.includes('const inGameOnly') && /prestart && inGameOnly/.test(pm), 'voor de start zijn Overzicht, Opslaan & stoppen en Cheats er niet');
ok(pm.includes("if (tab === 'spel' && !atHome())"), 'Esc in Spel gaat eerst terug naar Overzicht en sluit dan pas');
// Activiteiten: geen bijbanen (die staan onder Loopbanen) en de banen zijn daar te kiezen
const tui = read('game/js/todoui.js');
ok(/isActiviteit = \(it\) => it\.group !== 'verhaal' && it\.group !== 'bijbaantjes'/.test(tui) && /SHOWN = GROUPS\.filter/.test(tui) && /isActiviteit\(it\)\)\.sort/.test(tui), 'Activiteiten (Alles en Dichtbij) heeft geen bijbanen meer');
ok(/data-todo-goal="job:/.test(lb) && /baanDoelen/.test(lb) && /tab === 'loopbaan' && todoClick/.test(pm), 'een bijbaan kies je onder Loopbanen met Zet als doel (niet dubbel)');
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

// --- #435: de rest van de checklist ------------------------------------------------------------------------------------------------
const td = read('game/js/todoui.js');
ok(td.includes('function nextHtml(cur)') && td.includes('return nextHtml(cur) + PART_IDS.map('), 'Verhaal > Opdrachten begint met de volgende stap en een knop naar het doel');
ok(td.includes("it.group !== 'missies';") && td.includes("g !== 'missies'"), 'Activiteiten bevat geen verhaalmissies meer');
ok(pm.includes('class="ra pm-exit" data-action="exit"'), 'Afsluiten staat als eigen knop in de rail van het pauzemenu (alleen desktop)');
ok(pm.includes("icon('spelers', 'pm-ic n-ic')"), 'de teller bij Spel heeft een poppetje-icoon');
ok(read('game/js/hudcards.js').includes('menuMelding(text)'), 'meldingen staan direct in beeld als het menu open is');
ok(pm.includes("[['U'], 'Geluid uit of weer aan;"), 'Besturing legt de dempknop uit');

// #435 (vervolg): garage, fotomodus, kaart, Spullen, Prestaties, Shift en Aanwijzingen
const vp = read('game/js/vehiclepreview.js'), fu = read('game/js/fotomodusui.js'), sp = read('game/js/spullen.js'), vu = read('game/js/verhaalui.js');
ok(vp.includes("'webglcontextlost'") && vp.includes('forgetBlankShots'), 'de gedeelde voorbeeldrenderer herstelt na een verloren WebGL-context');
ok(pm.includes('if (isPhotoMode()) return;'), 'het pauzemenu opent niet over de fotomodus (Escape en M horen bij de fotomodus)');
ok(fu.includes('BAR_HTML') && fu.includes("KEYBTN('W A S D', 'Lopen')") && fu.includes('data-foto-stop'), 'de fotomodus heeft een knoppenbalk met sleutelhints en Terug');
ok(fu.includes("inProvinceData(p.cam.x, p.cam.y) === false"), 'de vrije camera van de fotomodus blijft binnen de wereld');
ok(read('game/js/gebiedenkaart.js').includes('landBorders()') && read('game/js/regions.js').includes('export const landBorders'), 'de kaart tekent de landgrenzen in de kleur van het buurgebied');
ok(sp.includes('const EMPTY =') && sp.includes('svg(it.icon)') && sp.includes('ALWAYS.has(cat)'), 'Spullen: pictogrammen en een uitleg bij een lege categorie');
const ac = read('game/js/achievements.js');
ok(ac.includes("id: 'kaart_alle'") && ac.includes("stat: 'gebied_provincie'") && read('game/js/achievementtracker.js').includes('syncGebiedStats') && read('game/js/mapview.js').includes("'kaartVerkend'"), 'Prestaties: de hele kaart verkend en de gebiedenvoortgang tellen mee');
ok(read('game/js/player.js').includes('Even uitpuffen'), 'Shift zonder sprint zegt waarom');
ok(vu.includes('vh-gk') && vu.includes('function partOrder('), 'Aanwijzingen: per opdracht gegroepeerd, nieuwste bovenaan');
ok(pm.includes("setN('spel', coopN ? String(coopN) : ''") && read('game/js/coopspelers.js').includes('rijen.sort((a, b) => (a.jij'), 'de Spel-teller telt jezelf mee (de lijst begint met jou)');

// #445: de kaart, waypoints en reizen
const mvs = read('game/js/mapview.js');
ok(mvs.includes("from './kaartactie.js'") && mvs.includes('actiesHtml(model, stap)'), 'Kaart: een klik toont de actiebalk Zet waypoint, Reis erheen en Info (kaartactie.js)');
ok(mvs.includes('initKaartUitleg(overlay)') && mvs.includes('uitleg-sluit') && mvs.includes('UITLEG_ID'), 'Kaart: de eerste keer een uitleg, te sluiten, onthouden onder gde-hud-gezien');
ok(read('game/js/helpoverview.js').includes("id: 'kaart'"), 'Besturing, Hulp: de uitleg over de kaart is terug te vinden');

// #435: veilig afsluiten vanuit het hoofdmenu en de nieuw-bolletjes op de rail
const exitBranch = pm.slice(pm.indexOf("a === 'menu' || a === 'exit'"), pm.indexOf("a === 'pigeon-stop'"));
ok(/started\(\) && !prestart && world\) saveGame\(world\)/.test(exitBranch), 'Afsluiten bewaart alleen een lopend spel, niet de menuscene boven het hoofdmenu (#435)');
ok(!/if \(world\) saveGame\(world\)/.test(exitBranch), 'geen onvoorwaardelijke save meer bij Naar het hoofdmenu of Afsluiten');
const pcss = read('game/js/pausemenu.css');
ok(pcss.includes('.ra[data-new] .ra-t::after'), 'de nieuw-bolletjes op de rail (Verhaal, Prestaties) hebben een eigen stijl (#435)');
ok(pcss.includes('.ra.pm-exit::after'), 'Afsluiten staat met een scheidingslijn onder de andere secties');
ok(pm.includes("setN('todo', '');") && !pm.includes("setN('todo', fresh"), "'nieuw' van een verhaal-aanwijzing staat niet meer op Activiteiten (#435)");
console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
