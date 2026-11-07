// De HUD gebruikt de statuskleuren uit de a11y-paletten en geen eigen hexen (#479). Dit is de
// statische kant van die afspraak: in de kaarten, het keuzepaneel en de minigamebalk mag een
// kleur alleen als `var(--mk-*)` met terugvalwaarde staan, zodat een kleurenblindmodus meedoet.
//
// Twee soorten kleuren mogen wel los staan, en ze staan allebei op één plek in het bestand:
// - de identiteitskleur per minigame (`accent: '#...'` in de MINIGAMES-tabel);
// - de vulling en lijnen van de SVG-pictogrammen (`fill="#..."` / `stroke="#..."`).
// Alles daarbuiten is tekst- of chroomkleur uit DESIGN_SYSTEM.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0;
const ok = (v, wat) => { if (!v) { console.log('FAIL ' + wat); fails++; } };
const read = (f) => fs.readFileSync(path.join(ROOT, 'game', 'js', f), 'utf8');

const CHROOM = new Set(['#f0ede4', '#f2f2f2', '#0c140e', '#17301f', '#ffffff', '#fff', '#a9a69b', '#fbfaf5', '#12200f']);

// Wat overblijft nadat de toegestane soorten eruit zijn.
function strayHexes(file, allow = new Set()) {
  let text = read(file);
  text = text.replace(/var\(--[a-z-]+,\s*#[0-9a-fA-F]{3,6}\)/g, 'var()');
  // een tokendefinitie is de plek waar een hex mag staan; de fallback erbij is dezelfde kleur
  text = text.replace(/--[a-z0-9-]+:\s*#[0-9a-fA-F]{3,6}/g, '--token');
  text = text.replace(/accent:\s*'#[0-9a-fA-F]{6}'/g, 'accent');
  text = text.replace(/(fill|stroke)="#[0-9a-fA-F]{3,6}"/g, '$1=""');
  const hexes = [...text.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toLowerCase());
  return [...new Set(hexes.filter((h) => !CHROOM.has(h) && !allow.has(h)))];
}

const kaarten = read('hudcards.css');
for (const soort of ['missie', 'bijbaan', 'geld', 'politie', 'gevaar', 'prestatie']) {
  ok(new RegExp(`data-kind="${soort}"\\]\\s*\\{\\s*--hc:\\s*var\\(--mk-`).test(kaarten),
    `hudcards.css: kaart "${soort}" haalt zijn kleur uit --mk-*`);
}
const kaartStray = strayHexes('hudcards.css');
ok(kaartStray.length === 0, 'hudcards.css: kleuren buiten de tokens: ' + (kaartStray.join(', ') || 'geen'));

const keuze = read('choicepanel.js');
ok(/var\(--cw-acc,\s*var\(--mk-mission/.test(keuze), 'choicepanel.js: het accent komt uit de mission-token');
ok(!/#d9a441|#5dff7a|#ff9a3c|#ffd23f/.test(keuze.replace(/var\(--[a-z-]+,\s*#[0-9a-fA-F]{3,6}\)/g, 'var()')),
  'choicepanel.js: geen losse statushexen meer');
const keuzeStray = strayHexes('choicepanel.js');
ok(keuzeStray.length === 0, 'choicepanel.js: kleuren buiten de tokens: ' + (keuzeStray.join(', ') || 'geen'));

const mg = read('minigamekit.js');
ok(!/#6cc070|#5dff7a/.test(mg.replace(/var\(--[a-z-]+,\s*#[0-9a-fA-F]{3,6}\)/g, 'var()')),
  'minigamekit.js: geen losse statushexen meer in de balk');
const mgStray = strayHexes('minigamekit.js');
ok(mgStray.length === 0, 'minigamekit.js: kleuren buiten de tokens en de accenttabel: ' + (mgStray.join(', ') || 'geen'));

// De kaartactiebalk (#602): alle kleuren als token met terugval, dus de kleurenblindmodi doen mee.
const kaartactie = read('kaartactieui.js');
const actieStray = strayHexes('kaartactieui.js');
ok(actieStray.length === 0, 'kaartactieui.js: kleuren buiten de tokens: ' + (actieStray.join(', ') || 'geen'));
ok(!/#5dff7a|#ff9a8a|#9aa3ad|rgba\(95,\s*180,\s*217/.test(kaartactie), 'kaartactieui.js: geen eigen groen, rood, grijs of blauw meer');

// De golf-HUD (#597): de statuskleuren staan als token met terugval, dus de kleurenblindmodi doen mee.
const golf = read('golfhud.js');
const golfStray = strayHexes('golfhud.js');
ok(golfStray.length === 0, 'golfhud.js: kleuren buiten de tokens: ' + (golfStray.join(', ') || 'geen'));
ok(!/#ff9a3c|#ffd23f|#5dff7a/.test(golf.replace(/var\(--[a-z-]+,\s*#[0-9a-fA-F]{3,6}\)/g, 'var()')), 'golfhud.js: geen losse statushexen meer');

// De padel-HUD (#599): geen eigen blauw meer, puntstand en flits via de tokens, GP uitgelegd.
const padel = read('padel.js');
ok(/const ACCENT = mgThema\('padel'\)\.accent/.test(padel), 'padel.js: het accent komt uit de accenttabel');
ok(!/#3aa6e8|#ffd23f|#5dff7a/.test(padel.replace(/var\(--[a-z-]+,\s*#[0-9a-fA-F]{3,6}\)/g, 'var()')), 'padel.js: geen eigen blauw of losse statushexen in de HUD');
ok(/var\(--mk-mission/.test(padel) && /GP = gouden punt/.test(padel), 'padel.js: de puntstand is een token en GP heeft uitleg');


// De machinist (#625): de cabine gebruikt de tokens (geen eigen blauw/rood), en de knipperende
// waarschuwingsbalk stopt bij "Beweging beperken" en "Flitsen beperken".
const cab = read('treincabine.js');
ok(!/#3a7bd5|#7fb2ff|#d94a3a|#ffd23f|#ff9a3c|#5dff7a/.test(cab.replace(/var\(--[a-z-]+,\s*#[0-9a-fA-F]{3,6}\)/g, 'var()')), 'treincabine.js: geen eigen blauw of losse statushexen in de cabine');
ok(/prefers-reduced-motion: reduce\) \{ #hud \.tc-cab \.tc-alert \{ animation: none; \}/.test(cab) && /html\.reduce-motion #hud \.tc-cab \.tc-alert, html\.reduce-flash #hud \.tc-cab \.tc-alert \{ animation: none !important; \}/.test(cab), 'treincabine.js: de waarschuwing stopt bij Beweging/Flitsen beperken');
const mach = read('machinist.js');
ok(/var\(--mk-danger[\s\S]{0,140}var\(--mk-mission[\s\S]{0,140}var\(--mk-ok/.test(mach), 'machinist.js: de remmeter gebruikt de tokens');
ok(/key\('BACKSPACE'\)/.test(mach) && /const INTRO = /.test(mach) && /tractie, .{0,80}noodrem\./.test(mach), 'machinist.js: korte intro en kern-help');

// De cockpit-HUD's (#632): de CSS van bus, heli en vliegtuig haalt zijn kleuren uit de tokens; de
// canvas- en 3D-kleuren van de instrumenten en wereldborden blijven beeld, geen HUD-chroom.
for (const f of ['helirun.js', 'heliflight.js', 'busbestuurhud.js', 'busboard3d.js', 'instrumenten.js']) {
  const bron = read(f);
  const cssBlokken = [...bron.matchAll(/const CSS = \x60([\s\S]*?)\x60;/g)].map((m) => m[1]).join('\n');
  const zonderTerugval = cssBlokken.replace(/var\(--[a-z-]+,\s*#[0-9a-fA-F]{3,6}\)/g, 'var()');
  ok(!/#f0c21a|#ff7ab6|#ffb21a|#d93a2b|#ffc21a|#ff6a4a|#ff5a4a|#5dff7a/.test(zonderTerugval), f + ': cockpit-CSS zonder losse statushexen');
  if (cssBlokken) ok(/var\(--mk-/.test(cssBlokken), f + ': de cockpit gebruikt de tokens');
}

// De heist-UI (#629): geen handgeschreven font en geen eigen goud meer; de bouwtekening haalt het
// goud uit de mission-token (per kleurenblindmodus) en de rolchip is 44 px op touch.
const heistCss = read('heist.css');
ok(!/Segoe Print|Bradley Hand|Comic Sans|#f2c14e/.test(heistCss), 'heist.css: geen handgeschreven font of eigen goud');
ok(/font-family: 'Arial Narrow', Arial, sans-serif; font-style: italic;/.test(heistCss), 'heist.css: de notitie is cursief Arial Narrow');
const heistUi = read('heistui.js');
ok(/GOLD = \(\) => markerColors\(\)\.mission/.test(heistUi), 'heistui.js: het goud komt uit de mission-token');
ok(!/Segoe Print|Bradley Hand|Comic Sans|system-ui/.test(heistUi), 'heistui.js: geen handgeschreven font of system-ui meer');
ok(/min-height:44px/.test(heistUi), 'heistui.js: de rolchip is 44 px op touch');

// De per-bord issues (#596/#614/#615/#617/#619/#620): de statuskleuren komen uit de tokens en de
// borden dragen hun eigen vorm (boeiencellen, duikstreep, startlichten, balansmidden, klimvlag).
const waterski = read('waterski.js');
ok(/cells = s\.gates\.map/.test(waterski) && /Laatste kans/.test(waterski) && /text: 'arm'/.test(read('zwembad.js')), 'waterski/zwembad: baan als vorm en laatste kans');
const zwembad = read('zwembad.js');
ok(/var\(--mk-ok/.test(zwembad) && /var\(--mk-job/.test(zwembad) && /Spatie bij het streepje/.test(zwembad), 'zwembad: duik- en vermoeidheidsmeter via tokens en vorm');
const kart = read('kartbaan.js');
ok(/mg-stand/.test(kart) && /Startlichten\.\.\. \(\$\{Math\.min\(g\.lights, 3\)\}\/3\)/.test(kart) && /var\(--mk-job/.test(kart), 'kartbaan: tussenstand als tabel, startlichten in de HUD, driftkleur via token');
const skate = read('skatepark.js');
ok(/mark: 0\.5/.test(skate) && /var\(--mk-danger, #d93f3f\)/.test(skate) && /text: 'balans'/.test(skate), 'skatepark: balansmeter via token met middenstreep');
const klim = read('klimtoren.js');
ok(/var\(--mk-danger, #d93f3f\)/.test(klim) && /text: 'arm'/.test(klim) && /klimtoren: \{ titel: 'KLIMTOREN ZERNIKE', accent: '#d9455f', icoon: 'vlag' \}/.test(mg), 'klimtoren: armenbalk via token, vlag als icoon');

// #613 hengelen: één bord voor wedstrijd en vrij hengelen, met modusregel, beetvorm en beloningskaart.
const hengelen = read('hengelen.js');
ok(!/boardVrij/.test(hengelen) && (hengelen.match(/if \(!board\) board = createBoard\('hengelen'\)/g) || []).length === 2, 'hengelen: één bord voor beide modi');
ok(/Vrij hengelen<\/span>/.test(hengelen) && /Wedstrijd<\/span>/.test(hengelen), 'hengelen: de modus staat op het bord');
ok(/text: 'BEET'/.test(hengelen) && /kind: 'prestatie', kicker: 'Hengelen', key: 'hengel-vrij-klaar'/.test(hengelen), 'hengelen: beet als eigen vorm en het sessie-einde als beloningskaart');

// #621 rondvaart: droge kadenaam, krom Nederlands weg, uitslag noemt de gemiste kade en de seconden.
const dienst = read('simdienst.js');
ok(/Kade bij de brug/.test(dienst) && !/naam: Kade \$\{k\}/.test(dienst), 'rondvaart: kades hebben een droge naam');
const acts = read('activities.js');
ok(/kade\(s\) gemist/.test(acts) && /Meer eerst aan bij een jachthaven/.test(acts), 'rondvaart: uitslag noemt de gemiste kade en het Nederlands klopt');
// De vijf restpunten van de activiteit-HUD's.
const disc = read('discgolf.js');
ok(/powerForBasket/.test(disc) && (disc.match(/mark: doelKracht\(g, dist\)/g) || []).length === 2, 'discgolf: de laadbaar heeft een streefstreep uit powerForBasket (#598)');
const sk = read('skatepark.js');
ok(/extra = `<span class="sk-bal">/.test(sk) && !/flash = g\.b\.grind\.bal >/.test(sk), 'skatepark: de balanstip staat op een eigen regel (#619)');
ok(/class="mg-stand"/.test(klim) && !/stand \? `<span>/.test(klim), 'klimtoren: de online stand is een tabel (#620)');
ok(/\[data-sfeer="vaardienst"\] \{ border-bottom: 2px solid var\(--ink/.test(mg), 'rondvaart: de kadeband staat op het bord (#621)');
ok((mg.match(/clip-path: polygon/g) || []).length >= 8, 'de bordvormen hebben eigen silhouetten (#596)');
ok(/function boardBox\(vw, ui = 1\)/.test(mg), 'de bordmaat is als pure functie na te rekenen (#596)');


// #599 padel: het eigen bord staat op dezelfde sfeerroute, schaalt mee en noemt de opener bij naam.
const padelHud = read('padel.js');
ok(/sfeerVlakHtml\('padel'\)/.test(padelHud) && /dataset\.sfeer = 'padel'/.test(padelHud), 'padel: eigen bord op de sfeerroute (#599/#595)');
ok(/getSettings\(\)\.onlineNaam/.test(padelHud) && /profiel \|\| eigen/.test(padelHud), 'padel: de teamnaam is de spelersnaam van de opener, niet vast Tammo/Tessa');
ok(/calc\(20px \* var\(--ui, 1\)\)/.test(padelHud), 'padel: het bord schaalt mee met --ui');
// #643: de telefoon en de prestatiekaart volgen dezelfde tokens; ook rgba() telt mee.
const telefoonCss = read('phonefeed.css');
ok(!/#8fd3ff|#ff5a4a|rgba\(30, 36, 31|rgba\(14, 19, 15/.test(telefoonCss), 'phonefeed.css: geen eigen blauw, tweede rood of eigen bijna-zwart');
ok(/var\(--mk-user/.test(telefoonCss) && /var\(--mk-danger, #d93f3f\)/.test(telefoonCss), 'de telefoon gebruikt de tokens');
const prestatieCss = read('hudcards.css');
ok(!/rgba\(232, 201, 58/.test(prestatieCss) && /color-mix\(in srgb, var\(--hc\) 45%/.test(prestatieCss), 'de prestatiekaart heeft één accent uit --hc, ook voor rgba()');

// De identiteitskleuren staan op één plek: de accenttabel. Zo kan niemand er stilletjes een
// statuskleur tussen schuiven zonder dat deze test het ziet.
const accenten = [...mg.matchAll(/accent:\s*'(#[0-9a-fA-F]{6})'/g)].map((m) => m[1].toLowerCase());
ok(accenten.length >= 15, 'minigamekit.js: de accenttabel is gevonden (' + accenten.length + ' spellen)');
// #596: boeren en het vertrekbord hergebruiken bewust een bestaand accent (geen nieuwe hex).
const paren = [...mg.matchAll(/(\w+): \{ titel: '[^']*', accent: '(#[0-9a-fA-F]{6})'/g)].map((m) => [m[1], m[2].toLowerCase()]);
const uniek = paren.filter(([k]) => !['boeren', 'station'].includes(k)).map(([, a]) => a);
ok(new Set(uniek).size === uniek.length, 'minigamekit.js: elke minigame heeft een eigen accentkleur (behalve de twee hergebruikte sfeerranden)');

// #645: dezelfde ratchet voor de HUD-modules die nog niet in de lijst hierboven stonden.
// De baseline is de stand bij #645; een nieuwe hex buiten tokens/chroom laat de test
// vallen. Alleen naar beneden bijwerken (haakjes eruit als een kleur weg is).
const HUD_DRIFT = {
  'hud_panel.css': ['#f3dc6a', '#e8c93a', '#7a6610', '#d93f3f', '#ff9a9a', '#3fc97a', '#2b5f8f', '#ffd36a', '#1e9e56', '#c8d0c9', '#8f2626', '#f07a5a', '#a3b2a6', '#ff6f61', '#ffd23f', '#f2d36b', '#f2c14e', '#9cc1f0', '#f39a8c'],
  'phonefeed.css': ['#d93f3f', '#111613', '#1a201c', '#070a08', '#2b332d', '#050806', '#1f2622'],
  'achievements.js': ['#3fc97a', '#6fe39d', '#1e9e56', '#e8c93a', '#fff0a8', '#d9a91e'],
  'golfhud.js': [],
  'padel.js': ['#3f8a4a', '#2f6fb8', '#f4f4ee', '#f2ede0', '#dff04a'],
  'carbid.js': ['#e9e0c8', '#b8352a', '#1d1d1d', '#f2ede0', '#ffd23f'],
  'kermis.js': ['#fff6d8', '#ffd23f', '#c8261e', '#f2e8d0', '#1d2a6a', '#7a1e1e', '#f2ede0'],
  'treincabine.js': [],
  'heistui.js': ['#3fc97a', '#d93f3f', '#0f1c13'],
  'pigeonmode.js': [],
  // #633: de gedeelde uitje-kaart leent alles van de sfeer- en thematabellen.
  'uitjepaneel.js': [],
  'kaartactieui.js': [],
};
for (const [f, basis] of Object.entries(HUD_DRIFT)) {
  const nieuw = strayHexes(f).filter((h) => !basis.includes(h));
  ok(nieuw.length === 0, `${f}: nieuwe kleur buiten de tokens/baseline: ${nieuw.join(', ') || 'geen'}`);
}

// Iedere surface uit hudbus.js moet of geauditeerd zijn, of met een reden als beeld
// (canvas/3D/wereld) buiten de HUD-chroom vallen. Zo kan een nieuwe HUD-module er
// niet stilletjes tussen glippen (#645).
const { SURFACES } = await import('../game/js/hudbus.js');
const HUD_AUDIT = new Set([...Object.keys(HUD_DRIFT), 'hudcards.css', 'choicepanel.js', 'minigamekit.js', 'kaartactieui.js']);
// beeld/canvas/wereld: kleuren horen bij het spelbeeld of de 3D-wereld, niet bij HUD-chroom
const BUITEN = new Set(['aimassist.js', 'banter.js', 'bakeround.js', 'boerderijui.js', 'busbestuurhud.js', 'busboard3d.js', 'casework.js', 'cinematics.js', 'coophold.js', 'coophud.js', 'coopscene.js', 'coopspelersui.js', 'coopwedstrijd3d.js', 'dorpsuitjes.js', 'drunk.js', 'furniture.js', 'garageui.js', 'gfxprofile.js', 'heliflight.js', 'helirun.js', 'hud_panel.js', 'hudcards.js', 'hudgps.js', 'hudtext.js', 'input.js', 'instrumenten.js', 'intromontage.js', 'loopbaanui.js', 'lowhealth.js', 'mapview.js', 'menumelding.js', 'multiplayerhostwisselui.js', 'namecard.js', 'padtest.js', 'partnerhud.js', 'pausemenu.js', 'phone.js', 'phonefeed.js', 'planeflight.js', 'postfx3d.js', 'postgame.js', 'profileoverlay.js', 'prompts.js', 'radiosub.js', 'reisrit.js', 'respawn.js', 'reuzenrad.js', 'rondvaartchase.js', 'samenkeuze.js', 'savegame.js', 'scene3d.js', 'shopui.js', 'sikkomfeed.js', 'speech.js', 'spullen.js', 'startscreen.js', 'stationtravel.js', 'story.js', 'storycontact.js', 'storydev.js', 'storytalk.js', 'storytest.js', 'stunthud.js', 'subtitles.js', 'testmenu.js', 'textfield.js', 'todoui.js', 'touch.js', 'trailer.js', 'verhaalui.js', 'veroverdpanel.js', 'visboekui.js']);
for (const [naam, s] of Object.entries(SURFACES)) {
  for (const f of s.files || []) ok(HUD_AUDIT.has(f) || BUITEN.has(f), `surface ${naam}: ${f} is niet geauditeerd en niet als beeld gemarkeerd`);
}

// #645: geen vaste magische maten meer voor voertuignaam en prestatie-toast, en één font-stack.
const panelCss = read('hud_panel.css');
ok(!/bottom:\s*calc\(var\(--hud-edge\) \+ 300px\)/.test(panelCss) && /bottom:\s*(?:var\(--hud-vehname-bottom,\s*)?calc\(var\(--hud-edge\) \+ var\(--mm-size\) \+ 50px\)/.test(panelCss), 'hud_panel.css: voertuignaam op de gemeten kolom');
ok(!/top:\s*330px/.test(panelCss) && /top:\s*calc\(var\(--hud-top\) \+ var\(--mm-size\) \+ 46px\)/.test(panelCss), 'hud_panel.css: nowplaying op de gemeten kolom');
ok(!/left:\s*max\(50%,\s*700px\)/.test(read('achievements.js')), 'achievements.js: prestatie-toast zonder vaste 700px');
const a11yCss = read('a11y.css');
ok(!/system-ui/.test(a11yCss), 'a11y.css: één font-stack, geen system-ui');
// #645: HUD-overlays gebruiken dezelfde Arial Narrow-stack; system-ui blijft voor dev/preview.
for (const f of ['hudcards.css', 'pausemenu.css', 'postgame.js', 'helirun.js', 'bakeround.js', 'coopwedstrijd3d.js', 'furniture.js']) {
  ok(!/system-ui/.test(read(f)), `${f}: geen system-ui in een HUD-overlay`);
}

// #627/#628/#630: kermis, reuzenrad, carbid en de duif lezen bord en accent uit MG_THEMA/createBoard.
const kermisSrc = read('kermis.js'), radSrc = read('reuzenrad.js'), carbidSrc = read('carbid.js'), pigeonSrc = read('pigeonmode.js');
ok(/const ACCENT = mgThema\('kermis'\)\.accent/.test(kermisSrc) && /createBoard\('kermis'\)/.test(kermisSrc) && !/\.kermis-board/.test(kermisSrc),
  'kermis: één bord en accent uit MG_THEMA, geen eigen bord-CSS meer');
ok(/const ACCENT = mgThema\('hoogvlieger'\)\.accent/.test(radSrc) && /createBoard\('hoogvlieger'\)/.test(radSrc) && !/\.rad-board/.test(radSrc),
  'reuzenrad: hetzelfde bord als de kermis, accent uit MG_THEMA');
ok(/const ACCENT = mgThema\('carbid'\)\.accent/.test(carbidSrc) && /createBoard\('carbid'\)/.test(carbidSrc) && !/\.carbid-board/.test(carbidSrc),
  'carbid: één bord en accent uit MG_THEMA, geen eigen bord-CSS meer');
ok(!/\[W\] \[S\]|\[A\] \[D\]/.test(kermisSrc + carbidSrc), 'kermis en carbid: geen brackettekst meer in de kaarten');
ok(strayHexes('pigeonmode.js').length === 0 && /const thema = mgThema\('duivenmelker'\)/.test(pigeonSrc), 'duif: geen losse hex, titel en accent uit MG_THEMA');
ok(/font: 12px\/18px/.test(pigeonSrc) && /prefers-reduced-motion/.test(pigeonSrc) && /class="hud-key"/.test(pigeonSrc), 'duif: chips 12 px, keycaps via .hud-key en reduce-motion');

console.log((fails ? 'FAIL ' : '') + 'hud_kleuren_test: ' + (fails ? fails + ' fout' : 'ok — de HUD-kleuren komen uit de tokens, de accenten uit één tabel'));
process.exit(fails ? 1 : 0);
















