// HUD layout on 720p, 1080p and 4K without a browser (#92, #33): the scale the
// HUD gets, the edge, the smallest text and the contrast of the HUD colours on
// its card, for every colour-blind palette. The pictures are ui_shots.mjs.
//   node scripts/hud_layout_test.mjs
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { uiScaleFor, hudViewport, hudEdge, READABLE_MIN, contrast, HUD_CARD_BG, HUD_PLAAT_BG, HUD_PLAAT_INKT, RUSTIG_CONTRAST, TEXT_CONTRAST, GRAPHIC_CONTRAST, EDGE_MIN, EDGE_MAX } from '../game/js/hudlook.js';
import { PALETTES } from '../game/js/a11y.js';

let fails = 0;
const ok = (c, name, extra) => { if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };
const css = (f) => fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'game', 'js', f), 'utf8');

const SIZES = [[1280, 720], [1366, 768], [1920, 1080], [2560, 1440], [3840, 2160], [2560, 1080]];
for (const [w, h] of SIZES) {
  const s = uiScaleFor(w, h);
  const v = hudViewport(w, h);
  const tag = `${w}x${h}`;
  ok(s >= 1 && s <= 4, `${tag}: schaal ${s} binnen 1..4`);
  // the HUD box is the window divided by the scale: 16:9 from 1080p up is always 1600x900
  ok(Math.abs(v.w * s - w) < 1 && Math.abs(v.h * s - h) < 1, `${tag}: HUD-vlak maal schaal is het venster`, v);
  const e = hudEdge(w, h, s);
  ok(e >= EDGE_MIN && e <= EDGE_MAX, `${tag}: rand ${e} binnen ${EDGE_MIN}..${EDGE_MAX}`);
  // the edge in device px stays in the title-safe 3.5%..8% of the short side
  const dev = e * s;
  ok(dev >= Math.min(w, h) * 0.035 - 1, `${tag}: rand ${dev}px is title-safe`);
  ok(dev <= Math.min(w, h) * 0.1, `${tag}: rand ${dev}px is niet te ruim`);
  // minimap and the edge leave room: the left column (minimap) and the right column (speedo) never touch
  ok(250 + 2 * e + 2 * 120 < v.w, `${tag}: minimap en snelheidsmeter passen naast elkaar`);
}
ok(uiScaleFor(3840, 2160) === 2.4 && uiScaleFor(1920, 1080) === 1.2, 'schaal 1.2 op 1080p en 2.4 op 4K');
ok(uiScaleFor(1280, 720) === 1, '720p krijgt schaal 1 (HUD 1280x720, niet kleiner)');
ok(uiScaleFor(1920, 1080, 1.3) > uiScaleFor(1920, 1080), 'Grootte interface werkt door');
// telefoon (aanraking, korte zijde < 700): kleinere HUD; tablet en bureaublad ongewijzigd
ok(uiScaleFor(800, 360, 1, true) === 0.667 && uiScaleFor(360, 800, 1, true) === 0.667, 'telefoon 800x360 en 360x800: schaal 0.667');
ok(uiScaleFor(915, 412, 1, true) > 0.7 && uiScaleFor(915, 412, 1, true) < 0.8, 'telefoon 915x412: ca. 0.76');
ok(uiScaleFor(1180, 820, 1, true) === 1 && uiScaleFor(1920, 1080, 1, true) === 1.2, 'tablet en groot scherm met touch: schaal ongewijzigd');
ok(uiScaleFor(800, 360, 1, false) === 1, 'zonder touch blijft 800x360 op schaal 1');
ok(uiScaleFor(320, 200, 1, true) === 0.62 && uiScaleFor(800, 360, 0.1, true) >= 0.5, 'telefoon: ondergrens 0.62, gebruikersfactor tot 0.5');
ok(uiScaleFor(10, 10, 0.1) >= 0.8 && uiScaleFor(99999, 99999, 9) <= 4, 'schaal blijft tussen 0.8 en 4');

// text: no HUD font below READABLE_MIN device px unless it floors itself on --hud-min
const FLOOR = /max\(\s*[\d.]+px\s*,\s*var\(--hud-min\)\s*\)/;
const ALLOW = [/hud-wasd .hud-key/]; // the key caps of the WASD cluster are glyphs, not words
let small = 0;
for (const f of ['hud_panel.css', 'hudcards.css', 'prompts.css', 'phonefeed.css', 'regelwidget.css']) {
  const lines = css(f).split(/\r?\n/);
  lines.forEach((line, i) => {
    const m = /font-size:\s*([\d.]+)px/.exec(line);
    if (!m || Number(m[1]) >= READABLE_MIN || FLOOR.test(line)) return;
    // the rule's own selector may sit on an earlier line when the rule is multi-line
    let sel = line;
    for (let j = i; j >= 0 && !/[{]/.test(lines[j]); j--) sel = lines[j] + sel;
    if (ALLOW.some((a) => a.test(sel))) return;
    small++;
    ok(false, `${f}:${i + 1}: font-size ${m[1]}px < ${READABLE_MIN}px zonder --hud-min`);
  });
}
ok(/--hud-min:\s*calc\(13px \/ var\(--ui/.test(css('hud_panel.css')), '--hud-min staat op #hud');
ok(READABLE_MIN === 13, 'READABLE_MIN is 13');

// #643: de prestatiemelding staat in zone E (links, boven de minimap) en niet meer onder de routebanner
ok(/\.ach-toast \{[^}]*top: auto; bottom: calc\(var\(--mm-bottom, 46px\) \+ var\(--mm-size, 250px\) \+ 14px\); left: var\(--hud-edge, 46px\)/.test(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'game', 'js', 'achievements.js'), 'utf8')), 'prestatiemelding staat in zone E, los van de routebanner');

// the sticky action bar of a pane ('Laten afleveren') is opaque within 16px, so it never lets the row under it read through
{
  const m = /\.m-pane > \.m-acts\.td-acts \{[^}]*padding-top: (\d+)px; background: linear-gradient\(180deg, rgba\([^)]*, 0\), rgba\([^)]*, ([\d.]+)\) (\d+)px\)/.exec(css('menu.css'));
  ok(!!m && Number(m[3]) <= 16 && Number(m[2]) >= 0.95, 'actiebalk van een pane is binnen 16px dekkend', m && m.slice(1));
}

// contrast on the HUD card for every palette: signal colours are graphics (3:1), the text colour is text (4.5:1)
ok(contrast('#f0ede4', HUD_CARD_BG) >= TEXT_CONTRAST, 'HUD-tekst op de kaart');
ok(contrast(HUD_PLAAT_INKT, HUD_PLAAT_BG) >= RUSTIG_CONTRAST, 'HUD-inkt op het papieren plaatje haalt de Rustig-drukwerknorm');
for (const [mode, p] of Object.entries(PALETTES)) {
  for (const k of ['ok', 'danger', 'mission', 'missionActive']) ok(contrast(p[k], HUD_CARD_BG) >= GRAPHIC_CONTRAST, `${mode}: ${k} op de HUD-kaart`, contrast(p[k], HUD_CARD_BG));
}


// resultaatkaart (#250): lange waarden (Gevolg, Ontdekt) botsen niet tegen het label. Het label houdt zijn breedte,
// de waarde mag omslaan; de kaart past in elk HUD-vlak. Invoer: de langste echte waarden uit de missiedata.
{
  const banner = css('hud_panel.css');
  const rule = (sel) => {
    const at = banner.indexOf(sel + ' {');
    return at < 0 ? '' : banner.slice(at, banner.indexOf('}', at));
  };
  const row = rule('#cine .cb-stats div'), lab = rule('#cine .cb-stats span'), val = rule('#cine .cb-stats b'), col = rule('#cine .cb-col');
  ok(/gap:\s*\d+px/.test(row), 'resultaatrij heeft een tussenruimte tussen label en waarde');
  ok(/flex:\s*none/.test(lab) && /max-width:\s*\d+%/.test(lab), 'label houdt zijn breedte en kent een maximum');
  ok(/min-width:\s*0/.test(val) && /overflow-wrap:\s*anywhere/.test(val), 'waarde mag krimpen en omslaan');
  ok(/text-align:\s*right/.test(val), 'waarde rechts uitgelijnd');
  const left = Number((col.match(/left:\s*(\d+)px/) || [])[1]), width = Number((col.match(/width:\s*(\d+)px/) || [])[1]);
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'game', 'js');
  const values = [];
  for (const f of fs.readdirSync(dir).filter((x) => /^missions.*\.js$/.test(x))) {
    for (const m of css(f).matchAll(/costRow(?::|\s*=)\s*\['[^']*',\s*'((?:[^'\\]|\\.)*)'/g)) values.push(m[1]);
  }
  ok(values.length >= 8, 'echte waarden uit de missiedata gevonden', values.length);
  const longest = values.sort((a, b) => b.length - a.length).slice(0, 5);
  // schatting: Bebas Neue 26px met 0,04em letterruimte is ongeveer 0,43em per teken, label 20px ruim 0,5em
  const labelW = Math.min(width * 0.4, 'Verwondingen'.length * 20 * 0.5), gap = 18, valueW = width - labelW - gap;
  ok(valueW >= 200, 'waardekolom is minstens 200px breed', valueW);
  for (const v of longest) {
    const lines = Math.ceil((v.length * 26 * 0.43) / valueW);
    ok(lines <= 4, `waarde van ${v.length} tekens past in hooguit 4 regels`, { v, lines });
  }
  for (const [w, h] of SIZES) {
    const vp = hudViewport(w, h), e = hudEdge(w, h, vp.scale);
    ok(left + width + e <= vp.w, `${w}x${h}: resultaatkaart (${left}+${width}) past in het HUD-vlak ${Math.round(vp.w)}`);
  }
}

// --- #463: de plaatsnaam wijkt voor de berichtkaart van zone A ----------------
// Op 360x800-voet en 820x1180-voet lag "GROTE MARKT" achter de TIP-kaart. De
// melding gaat voor (hudrules.js), dus de plaatsnaam zakt tot onder de gemeten
// kaartkolom. Deze controles houden de twee helften van die regel bij elkaar:
// de CSS tilt op met --hud-a-bottom, hud_panel.js vult die uit de echte kaart.
{
  const hud = css('hud_panel.css');
  const rule = (sel) => {
    const at = hud.indexOf(sel + ' {');
    return at < 0 ? '' : hud.slice(at, hud.indexOf('}', at));
  };
  const place = rule('#hud .hud-place');
  ok(/top:\s*max\(/.test(place) && /var\(--hud-a-bottom/.test(place), 'plaatsnaam zakt onder de gemeten berichtkolom', place.slice(0, 190));
  // zone B is één kolom (doel bovenaan, routekaart eronder): de kolom wijkt alleen als de berichtkolom hem raakt (#985)
  const zb = rule('#hud .hud-zone-b');
  ok(/top:\s*max\(/.test(zb) && /var\(--hud-gps-top/.test(zb), 'de kolom van zone B zakt onder een melding die hem raakt', zb.slice(0, 160));
  ok(/var\(--hud-b-bottom/.test(place), 'de plaatsnaam hangt onder de kolom van zone B (--hud-b-bottom)', place.slice(0, 260));
  // de kolom wordt gemeten en niet met een vaste hoogte geraden
  const panel = css('hud_panel.js');
  ok(/--hud-a-bottom/.test(panel) && /el\.offsetTop \+ el\.offsetHeight/.test(panel), 'hud_panel.js meet de onderkant van de kaartkolom');
  ok(/querySelector\('\.phonefeed'\)/.test(panel) && /\[cards, feed\]/.test(panel), 'de telefoonfeed van zone A telt even hoog mee');
  // alleen op een smal scherm: op het bureaublad staat de melding links en zone B in het midden
  ok(/const NARROW = 1024;/.test(panel) && /innerWidth > NARROW/.test(panel), 'de meting geldt alleen op een smal scherm (tot 1024px)');
  // de kier tussen de onderkant van de kaart en de bovenkant van de plaatsnaam
  const gap = Number((place.match(/--hud-a-bottom[^)]*\)\s*\+\s*(\d+)px/) || [])[1]);
  ok(gap >= 8, `plaatsnaam houdt ${gap}px van de berichtkaart`, gap);
  // op 360x800 begint de kolom op --hud-top (18 px in de media query); voor elke
  // kaarthoogte blijft de plaatsnaam er dan onder, hoe hoog de kaart ook wordt
  ok(/--hud-top:\s*max\(18px/.test(hud), 'smal scherm: --hud-top is 18px');
  for (const cardH of [56, 90, 140, 300]) {
    const bottom = 18 + cardH, top = Math.max(18 + 10, bottom + gap);
    ok(top >= bottom + gap, `kaart van ${cardH}px hoog: de plaatsnaam begint op ${top}px, onder de kaart (${bottom}px)`);
  }
}

// --- #463: de draaibanner wijkt voor een melding of een menu-kop --------------
// Op 360x800-trein dekte "Draai je toestel voor de beste besturing" de melding
// "AANGEREDEN DOOR DE TREIN!" af, en in de menu's de kop. De banner is een wenk,
// geen melding: hij verdwijnt zolang een melding, de plaatsnaam of het pauzemenu
// in beeld staat (touch.js-CSS).
{
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'game', 'js');
  const src = fs.readFileSync(path.join(dir, 'touch.js'), 'utf8');
  const sheet = (src.match(/const CSS = `([\s\S]*?)`;/) || [])[1] || '';
  const hides = (sel) => new RegExp(sel + '[^{]*\\{[^}]*display:\\s*none').test(sheet);
  ok(sheet !== '', 'touch.js heeft de aanraak-CSS');
  ok(/max\(13px, calc\(13px \/ var\(--ui, 1\)\)\)/.test(sheet) && !/calc\(11px \/ var\(--ui, 1\)\)/.test(sheet), 'touch: de vaste HUD-tekstvloer is 13 px op het scherm');
  ok(/#touch-ui \.t-turn[^{]*\{ display: block; \}/.test(sheet), 'draaibanner staat alleen in portret aan');
  ok(hides('body\\.hud-card-on'), 'draaibanner wijkt voor een actieve melding (zone A)');
  ok(hides('body:has\\(#hud \\.phonefeed \\.pf-card\\.on\\)'), 'draaibanner wijkt voor een telefoonbericht');
  ok(hides('body:has\\(#pause-menu\\.visible\\)'), 'draaibanner wijkt voor de kop van het pauzemenu');
  ok(hides('body:has\\(#hud \\.hud-place\\.on\\)'), 'draaibanner wijkt voor de plaatsnaam');
}

// --- #849/#850/#854/#855: regressiewachten voor de vlieg-HUD -----------------
// Het vliegtuigpaneel lag linksboven omdat de cockpit-CSS (later in de head,
// zelfde specificiteit) `position: relative` op het paneel zette. Deze controles
// houden de CSS-orde, de aanraakregels en de reserveringen bij elkaar.
{
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'game', 'js');
  const cockpit = fs.readFileSync(path.join(dir, 'cockpit.js'), 'utf8');
  const sheet = (cockpit.match(/COCKPIT_CSS = `([\s\S]*?)`/) || [])[1] || '';
  const basis = (sheet.match(/#hud \.\$\{COCKPIT_CLASS\}\s*\{([^}]*)\}/) || [])[1] || '';
  ok(sheet !== '', '#849: cockpit.js heeft de cockpit-CSS');
  ok(!/position\s*:/.test(basis), '#849: cockpit-frame zet geen position (zou het absolute vliegpaneel overschrijven)', basis.trim());
  const instr = fs.readFileSync(path.join(dir, 'instrumenten.js'), 'utf8');
  ok(/#hud \.hud-instr\{position:absolute;right:var\(--hud-edge/.test(instr), '#849: vliegtuigpaneel staat absoluut aan de rechterrand');

  const touch = (fs.readFileSync(path.join(dir, 'touch.js'), 'utf8').match(/const CSS = `([\s\S]*?)`;/) || [])[1] || '';
  ok(/html\.touch-device #hud \.hud-speedo, html\.touch-device #hud \.hud-heli, html\.touch-device #hud \.hud-instr \{ right: auto; left: 50%; transform: translateX\(-50%\); \}/.test(touch),
    '#850: het vliegtuigpaneel staat op aanraak gecentreerd, vrij van de roerknoppen');
  ok(/html\.touch-device\.touch-portrait #hud \.hud-instr \{ right: var\(--hud-edge\); left: auto; transform: none; bottom: calc\(var\(--hud-f-top, 430px\) \+ 12px\); \}/.test(touch),
    '#850: in portret zakt het paneel boven de linkerkolom');
  ok(/\.hud-instr small, \.hud-instr \.hi-keys, \.hud-instr \.hi-st, \.hud-instr \.hi-row, \.hud-instr \.hi-num span,\s*\.hud-instr \.hi-lamp/.test(touch),
    '#850: alle paneellabels staan in de 12px-vloer');

  const hull = fs.readFileSync(path.join(dir, 'hud_panel.css'), 'utf8');
  const subCss = fs.readFileSync(path.join(dir, 'subtitle.css'), 'utf8'); // het ene ondertitelcomponent (23-11)
  ok(/body\.plane-flying \{ --ds-sub-bottom: calc\(500px \* var\(--ui, 1\)\); \}/.test(subCss),
    '#855: de ondertitel wijkt in de vlucht boven het vliegpaneel');
  ok(/@media \(max-height: 640px\)[^{]*\{ body\.plane-flying \.ds-sub:not\(#cine \.ds-sub\) \{ display: none; \}/.test(subCss),
    '#855: op een korte telefoon verdwijnt de ondertitel tijdens het vliegen (radio speelt door)');

  const mg = fs.readFileSync(path.join(dir, 'minigamekit.js'), 'utf8');
  ok(/box-sizing: border-box[^}]*max-width: min\(760px, calc\(100vw \/ var\(--ui, 1\) - 2 \* max\(var\(--hud-edge, 46px\) \+ 310px, var\(--hud-c-right, 0px\) \+ 12px\)\)/.test(mg),
    '#854: het lesbord reserveert de zone C-kolom (310 px, boven de gemeten 293 px)');
  ok(/@media \(max-width: 900px\) and \(orientation: landscape\) \{\s*#hud \.mg-board \{ left: 50%; transform: translateX\(-50%\); top: calc\(var\(--hud-top, 18px\) \+ 170px\);/.test(mg),
    '#854: op een smalle liggende telefoon zakt het bord onder de zone C-rij');
  const panel = fs.readFileSync(path.join(dir, 'hud_panel.js'), 'utf8');
  ok(/--hud-c-width/.test(panel) && /getBoundingClientRect\(\)/.test(panel), '#854: hud_panel.js meet zone C met de echte kolombreedte');
}

if (fails) { console.log(`${fails} mislukt`); process.exit(1); }
console.log(`hud_layout_test: ok (${SIZES.length} formaten, ${Object.keys(PALETTES).length} paletten)`);
