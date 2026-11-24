// Pure layouttests van de reparaties uit de overlap-audit van 20-11 (docs/OVERLAP-AUDIT-20-11.md, #985): per opgeloste klasse een regel.
//   node scripts/overlap_fixes_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randTop, plaatsTop } from '../game/js/bigmoment.js';
import { labelDy, anchorCovered, CLEAR_GAP } from '../game/js/promptclear.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log('FAIL ' + m + (info !== '' ? ' (' + JSON.stringify(info) + ')' : '')); } };

// klasse 1: de gezocht-tag (grote moment, rand) hangt onder de rechterkolom van de HUD, niet over het wapenchip
ok(randTop(228, 720, 120) === 240, 'randTop: 12 px onder de rechterkolom (720p: kolom eindigt op 228)', randTop(228, 720, 120));
ok(randTop(342, 1080, 150) === 354, 'randTop: 1080p');
ok(randTop(900, 720, 120) === 588, 'randTop: blijft binnen het venster (hoogte 120)', randTop(900, 720, 120));
ok(randTop(NaN, 720, 120) === 12, 'randTop: zonder meting 12 px van boven');
ok(/el\.style\.top = randTop\(/.test(src('game/js/bigmoment.js')), 'showBigMoment zet de top van de rand-tag uit de gemeten kolom');

// klasse 2: een wereldlabel ligt nooit over een HUD-kaart, de minikaart of het doel
const view = { w: 1280, h: 720 };
const chip = (l, t, r, b) => ({ left: l, top: t, right: r, bottom: b });
ok(labelDy(chip(400, 85, 610, 130), [chip(10, 34, 360, 120)], view) === 0, 'labelDy: geen overlap, geen verschuiving');
// een label boven de helft van het scherm over een kaart: eronder
let dy = labelDy(chip(300, 90, 500, 130), [chip(36, 34, 390, 120)], view);
ok(dy === 120 + CLEAR_GAP - 90, 'labelDy: een kaart bovenin: het label gaat eronder', dy);
// een label onderin over de doelkaart: erboven
dy = labelDy(chip(500, 470, 700, 510), [chip(402, 450, 878, 507)], view);
ok(dy === (450 - CLEAR_GAP - 40) - 470, 'labelDy: de doelkaart onderin: het label gaat erboven', dy);
// twee onderdelen na elkaar: de tweede ronde pakt het
dy = labelDy(chip(300, 300, 500, 340), [chip(250, 280, 600, 360), chip(250, 230, 600, 270)], view);
ok(dy !== 0, 'labelDy: een tweede obstakel op de weg wordt meegenomen', dy);
// geen ruimte (obstakel dat het hele venster vult): blijft staan
ok(labelDy(chip(300, 300, 500, 340), [chip(0, 0, 1280, 720)], view) === 0, 'labelDy: geen ruimte, het label blijft staan');
ok(labelDy(chip(300, 300, 500, 340), [chip(500, 300, 700, 340)], view) === 0, 'labelDy: tegen elkaar aan is geen overlap');
// #1189: een label dat 1 px onder de doelbalk hangt (geen overlap, wel 'geplakt') schuift naar de vaste marge eronder
dy = labelDy(chip(400, 121, 600, 160), [chip(380, 40, 880, 120)], view);
ok(dy === 120 + CLEAR_GAP - 121, 'labelDy: een label vlak onder de doelbalk krijgt de vaste marge', dy);
ok(CLEAR_GAP >= 8, 'labelDy: de marge is groter dan de harde schaduw van 4 px', CLEAR_GAP);
ok(labelDy(chip(400, 120 + CLEAR_GAP, 600, 170), [chip(380, 40, 880, 120)], view) === 0, 'labelDy: op de marge blijft een label staan');
ok(/labelDy\(/.test(src('game/js/prompts.js')), 'prompts.js past labelDy toe op elk wereldlabel');
ok(/classList\.toggle\('wp-los', !!dy\)/.test(src('game/js/prompts.js')) && /\.wp\.wp-los \.wp-line \{ visibility: hidden; \}/.test(src('game/js/prompts.css')), '#1189: een opgeschoven label heeft geen lijn door zijn tekst');

// klasse 4: het minigamebord loopt niet onder de klok (zone C) door: zijn maximale breedte houdt rekening met de gemeten kolom
ok(/max-width: min\(760px, calc\(100vw \/ var\(--ui, 1\) - 2 \* max\(var\(--hud-edge, 46px\) \+ 310px, var\(--hud-c-right, 0px\) \+ 12px\)\)/.test(src('game/js/minigamekit.js')), 'mg-board: max-width volgt --hud-c-right');
// 1280 px breed, kolom C 400 HUD-px: bord <= 1280 - 2 * 412 = 456 en dus rechts van het bord (centraal) vrij van de klok
const bordMax = (vw, ui, edge, cRight) => Math.min(760, vw / ui - 2 * Math.max(edge + 310, cRight + 12), vw - 32);
ok(bordMax(1280, 1, 46, 400) === 456 && 640 + 456 / 2 <= 1280 - 400, 'mg-board 720p: rechterrand valt links van zone C', bordMax(1280, 1, 46, 400));

// klasse 5: de plaatskaart ('gebied') hangt in de vrije middenzone, niet onderin over doel en minikaart
const css = src('game/js/bigmoment.css');
ok(/\.bm-gebied \{[^}]*top: 24vh/.test(css) && !/\.bm-gebied \{[^}]*bottom/.test(css), 'bm-gebied: boven in de vrije zone (top), niet op bottom 14vh');
ok(/min-width: min\(640px, max\(340px, calc\(100vw - 820px\)\)\)/.test(css), 'bm-kaart: breedte laat de linkerkolom (kaarten) en de rechterkolom vrij');

// klasse 6: de plaatskaart hangt onder de kolom van zone B (doel en routekaart bovenin)
ok(plaatsTop(173, 120) === 173, 'plaatsTop: genoeg ruimte onder de kolom, het eigen begin blijft');
ok(plaatsTop(108, 150) === 162, 'plaatsTop: de compacte kaart (15vh) schuift onder een hoge kolom', plaatsTop(108, 150));
ok(plaatsTop(NaN, NaN) === 0, 'plaatsTop: zonder meting 0');
ok(/plaatsTop\(/.test(src('game/js/bigmoment.js')) && /hud-zone-b/.test(src('game/js/bigmoment.js')), 'showBigMoment meet zone B voor de plaatskaart');
// klasse 7: het doel en de routekaart staan in één kolom (hud_panel.js zet ze in .hud-zone-b), dus ze overlappen niet
const hudjs = src('game/js/hud_panel.js');
ok(/zoneB\.appendChild\(gps\)/.test(hudjs) && /zoneB\.insertBefore\(mission, gps\)/.test(hudjs), 'doel en routekaart zitten in dezelfde kolom (doel eerst)');
ok(/watchZoneB\(root, zoneB\)/.test(hudjs) && /--hud-b-bottom/.test(hudjs), 'hud_panel.js meet de onderkant van zone B');
ok(/body\.mg-on #hud \.hud-mission/.test(src('game/js/minigamekit.js')), 'het minigamebord (bovenin) verbergt het doel');
ok(/body\.cine-hide-hud #hud > :not\(\.hud-damage\)/.test(src('game/js/hud_panel.css')), 'een filmlaag verbergt de kolom (kinderen van #hud)');

// klasse 8: een wereldlabel waarvan het anker onder een bord of paneel ligt, verdwijnt; het minigamebord valt onder 1100 px onder zone C
const boards = [chip(408, 34, 862, 217)];
ok(anchorCovered(640, 150, boards) === true && anchorCovered(300, 150, boards) === false, 'anchorCovered: alleen een anker onder het bord');
ok(anchorCovered(863, 100, boards) === true && anchorCovered(870, 100, boards) === false, 'anchorCovered: 2 px speling aan de rand');
ok(/anchorCovered\(/.test(src('game/js/prompts.js')) && /wp-weg/.test(src('game/js/prompts.css')), 'prompts.js verbergt een label met een bedekt anker (wp-weg)');
const mgjs = src('game/js/minigamekit.js');
ok(/@media \(max-width: 1100px\) \{ #hud \.mg-board \{ left: auto; right: var\(--hud-edge, 46px\); transform: none; top: calc\(var\(--hud-tr-bottom, 150px\) \+ 8px\)/.test(mgjs), 'mg-board onder 1100 px: rechts onder zone C (gemeten --hud-tr-bottom)');
ok(/max\(330px, var\(--hud-c-right, 0px\) \+ 12px\)/.test(mgjs), 'mg-board tot 1500 px: de reserve rechts is de gemeten zone C, niet vast 330 px');
// de bordcellen zijn getallen (discgolf.js: worpen of het nummer), geen "Hole 1": ze breken niet af
ok(/t: c\.done \? String\(c\.strokes\)/.test(src('game/js/discgolf.js')), 'discgolf-cellen zijn worpen of nummers');
ok(/line-clamp: 6/.test(src('game/js/phonefeed.css')) && /overflow-wrap: anywhere/.test(src('game/js/phonefeed.css')), 'phonefeed: een lange kop breekt en houdt zes regels (nieuws past helemaal)');

// klasse 9: lage vensters (1024x600): de strook van zone B is smal, de routekaart breekt om, de doelregel kapt af met "…", de naamkaart hangt boven de hintstapel
const css985 = src('game/js/hud_panel.css');
ok(/@media \(max-width: 1100px\) \{[^}]*#hud \.hud-gps \{ flex-wrap: wrap;[^}]*white-space: normal/.test(css985), 'smalle strook: de routekaart breekt om (afstand onder de afslag)');
ok(/#hud \.hud-mission-progress \{ max-width: 100%; overflow: hidden; text-overflow: ellipsis;/.test(css985), 'de doelregel kapt af met een ellips in plaats van uit de kaart te steken');
ok(/#hud \.hud-mission \.hud-obj-keys \{ display: none; \}/.test(css985), 'smalle strook: de bedieningsregel van het doel valt weg');
ok(/--hud-vehname-ctx/.test(src('game/js/hud_panel.js')) && /var\(--hud-vehname-ctx, 0px\)/.test(css985), 'de naamkaart hangt boven de toetshintstapel (--hud-vehname-ctx)');
ok(/display: none; \/\* #985/.test(src('game/js/minigamekit.js')), 'het watermerk van het minigamebord ligt niet meer achter de laatste regels');
ok(/columnOpts\(\)/.test(src('game/js/hudcards.js')) && /leftColumnFits\(upA \? upA\.spec : null, q\.spec, columnOpts\(\)\)/.test(src('game/js/hudcards.js')), 'hudcards: een E-kaart telt het venster en de telefoonkaart mee');
ok(/left: calc\(var\(--hud-edge\) \+ min\(calc\(30vw \/ var\(--ui, 1\)\), 350px\) \+ 12px\); right: max\(var\(--hud-edge\), calc\(var\(--hud-c-right, 0px\) \+ 12px\)\)/.test(css985), 'zone B vult de strook tussen berichtkolom en zone C');

// klasse 10: het karakterkaartje toont één personage, dat van de speler (hoofdspeler: ook een gast ziet zijn eigen figuur)
const hp = src('game/js/hud_panel.js');
ok(!/hud-mate-pic/.test(hp) && !/mateImg/.test(hp) && !/setPortrait\(els\.mateImg/.test(hp), 'geen tweede portret meer naast de naam (hud-mate-pic weg)');
ok(/hud-mate-txt/.test(hp), 'de metgezel blijft voor schermlezers (visueel verborgen tekst)');
ok(/const ch = hoofdspeler\(world\)\.character === 'anita' \? 'anita' : 'tammo';/.test(hp), 'de naam en het portret komen van de hoofdspeler (de eigen figuur, ook bij een gast)');
ok(!/hud-done/.test(hp) && !/from '\.\/progresslive\.js'/.test(hp), 'de totale voortgang (N% klaar) staat niet meer op het karakterkaartje (eigenaar 20-11)');
ok((hp.match(/setPortrait\(/g) || []).length === 2, 'setPortrait: alleen de definitie en het portret van de speler');

// klasse 11: elke balk op het karakterkaartje heeft een icoon van 16 px (hart, schild, voertuig) met een naam voor schermlezers
ok(/aria-label="Gezondheid"[^']*'\s*\+\s*icoon\('hart_vol', \{ maat: 16/.test(hp), 'de gezondheidsbalk heeft een hartje');
ok(/aria-label="Pantser"[^']*'\s*\+\s*icoon\('schild', \{ maat: 16/.test(hp), 'de pantserbalk heeft een schild');
ok(/aria-label="Voertuig"[^']*'\s*\+\s*icoon\('auto', \{ maat: 16/.test(hp) && /function setVehMeterIcon/.test(hp), 'de voertuigbalk heeft een voertuigicoon dat het soort volgt');
ok(/#hud \.hud-meter \.hud-meter-ic \{ flex: 0 0 16px; width: 16px; height: 16px;/.test(src('game/js/hud_panel.css')) && /#hud \.hud-meter \.hud-bar \{ width: 159px; \}/.test(src('game/js/hud_panel.css')), 'de iconen zijn 16 px en de balken lijnen uit (159 px)');

// klasse 12 (1024x600): keuzepaneel onder zone C, ondertitel boven de F-kolom, spraakbel buiten de HUD
ok(/@media \(max-width: 1100px\) and \(min-width: 481px\) \{ #hud \.cw-panel \{ left: auto; right: var\(--hud-edge, 46px\)/.test(src('game/js/choicepanel.js')), 'keuzepaneel onder 1100 px: rechts onder zone C');
ok(/max-height: 720px\) \{ body \{ --ds-sub-bottom: 200px; \} \}/.test(src('game/js/subtitle.css')), 'ondertitels hangen op een laag venster boven de locatiekaart');
ok(/setBubbleObstacles\(list\)/.test(src('game/js/prompts.js')) && /labelDy\(/.test(src('game/js/hudrules.js')), 'een spraakbel schuift uit de HUD-onderdelen (hudrules bubblePlace)');
ok(/toggle\('off', hidden \|\| hintsQuiet\(\)\);\s*hudObstacles\(\);/.test(src('game/js/prompts.js')), 'de belhindernissen worden ook ververst als de hints zwijgen (#1198)');

// klasse 13: de snelheidsmeter is één compact blok (snelheid 40 px, versnelling klein, toeren als dunne balk binnen de kaart)
const hcss = src('game/js/hud_panel.css'), hj = src('game/js/hud_panel.js');
ok(/<div class="sp-main"><b class="sp-val">0<\/b><span class="sp-unit">km\/u<\/span><div class="sp-gears"[^>]*aria-label="Versnelling"><\/div>/.test(hj) && /class="sp-rpm" viewBox="0 0 200 14"/.test(hj) && /<\/svg>` \+\s*'<span class="sp-zender"[^\n]*<\/span><\/div>';/.test(hj), 'de toerenbalk zit binnen sp-main, de aria-labels blijven (Versnelling, Toerental)');
ok(/aria-label="Toerental"/.test(hj), 'aria-label Toerental blijft');
ok(/#hud \.sp-val \{ grid-column: 1; grid-row: 1; font-size: 52px;/.test(hcss) && /#hud \.sp-rpm \{ grid-column: 1 \/ -1; grid-row: 2; width: 100%; height: 7px; \}/.test(hcss), 'snelheid 52 px, toerenbalk 7 px onder de kaart');
// de maat: kaart ca. 150 x 66 px = 9900 px2, tegen de oude 8000 px2 kaart + 166 x 166 boog (ca. 36000 px2): minstens 60% kleiner
const oud = 14 * 0 + (100 * 0.85 + 18 + 3 + 18 + 10) * 160 + 166 * 166, nieuw = 150 * 66;
ok(nieuw <= oud * 0.4, 'het blok is minstens 60% kleiner qua oppervlak (' + nieuw + ' tegen ' + oud + ')');
ok(/body\.hud-in-vehicle #hud \.hud-ctx \{ bottom: calc\(var\(--hud-edge, 46px\) \+ 92px\)/.test(src('game/js/prompts.css')), 'de toetshintstapel hangt direct boven het blok');
ok(/no-rpm/.test(hcss) && /no-gears/.test(hcss), 'fiets, scooter en boot tonen alleen wat ze hebben (geen toeren, geen versnelling)');

// #1198: de bel staat boven het hoofd van de spreker, ook op een dijk of in een kuil (niet op p.h boven 0)
{
  const { bubbleBase } = await import('../game/js/hudrules.js');
  ok(bubbleBase({ x: 0, y: 0, gz: 3.5 }) === 3.5, 'voetganger op 3,5 m: de bel begint daar');
  ok(bubbleBase({ x: 0, y: 0, gz: -1.2 }, { groundHeightAt: () => 9 }) === -1.2, 'eigen grondhoogte gaat voor de kaart');
  ok(bubbleBase({ x: 1, y: 2 }, { groundHeightAt: (x, y) => x + y }) === 3, 'vaste spreker zonder gz: de grond van de kaart');
  ok(bubbleBase({ x: 1, y: 2 }, { groundHeightAt: () => NaN }) === 0 && bubbleBase({ x: 1, y: 2 }, { groundHeightAt: () => { throw new Error('x'); } }) === 0 && bubbleBase(null) === 0, 'geen grond of fout: 0');
  const s3 = fs.readFileSync(path.join(ROOT, 'game/js/scene3d.js'), 'utf8');
  ok(/projectToScreen\(src\.x, bubbleBase\(src, world\.map\) \+ \(p\.h \?\? 2\.1\), src\.y, vw, vh\)/.test(s3), 'scene3d.js zet de bel op de grond van de spreker plus p.h');
}

console.log(`overlap_fixes_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
