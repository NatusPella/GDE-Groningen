// Regressiewachten voor de HUD- en aanraaklayout van 0.61.0: #867 (doel-HUD op
// 1024x768), #868 (menu-, kaart- en telefoontekst onder 12 px), #869 (afgekapte
// actie-uitleg), #870 (straatpraatbubbels en naamkaarten buiten beeld), #876
// (vliegtuigpaneel over de toetshint), #877 (aanraak-vlieg-HUD 800x360) en #881
// (aanraak-vlieg-HUD 360x800). Bronchecks op de CSS/JS die de HUD opbouwt, plus
// de pure regels voor de tekstbel, de menuvloer en het compacte lesbord.
//   node scripts/hud_layout_issues_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bubblePlace } from '../game/js/hudrules.js';
import { menuTextMin, MENU_READABLE_MIN, hudEdge, uiScaleFor } from '../game/js/hudlook.js';
import { compactBoard } from '../game/js/minigamekit.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, 'game', 'js', f), 'utf8');
let n = 0, fail = 0;
const ok = (c, naam, extra = '') => { n++; if (!c) { fail++; console.log('FAIL', naam, extra); } };
const near = (a, b, m = 0.01) => Math.abs(a - b) <= m;

// --- #867: het doel van zone G op 1024x768 ---------------------------------
{
  const hud = read('hud_panel.css');
  const smal = /@media \(max-width: 1320px\) \{([\s\S]*?)\n\}/.exec(hud);
  ok(!!smal, '#867: er is een smalle-schermenregel voor het doel');
  const blok = smal ? smal[1] : '';
  ok(/bottom:\s*calc\(var\(--hud-edge\) \+ 150px\)/.test(blok), '#867: doel zakt boven de straatkolom');
  ok(/max-width:\s*min\(calc\(58vw \/ var\(--ui, 1\)\), calc\(100vw \/ var\(--ui, 1\) - 2 \* \(var\(--hud-edge\) \+ var\(--mm-size\) \+ 16px\)\)\)/.test(blok), '#867: doel krijgt de breedte tussen de randen');
  ok(!/160px/.test(blok), '#867: geen vaste 160px-reserve voor zone H meer');
  // 1024x768: de oude formule gaf 128 px; nu minstens 400 px en boven de kolom.
  const edge = hudEdge(1024, 768, uiScaleFor(1024, 768));
  const mm = 250;
  const w = Math.min(1024 * 0.58, 1024 - 2 * (edge + mm + 16));
  ok(w >= 400, `#867: 1024x768 geeft ${Math.round(w)} px doelbreedte (was 128)`);
  ok(edge + 150 > 46 + 120, '#867: de onderkant van het doel ligt boven de straatkolom');
}

// --- #868: menu-, kaart- en telefoontekst houdt 12 schermpixels -------------
{
  const menu = read('menu.css');
  ok(/--menu-min:\s*calc\(13px \/ var\(--mz\)\)/.test(menu), '#868: --menu-min staat op .gm');
  ok(MENU_READABLE_MIN === 13 && near(menuTextMin(1), 15.6), '#868: menuvloer rekent 14,4 stage-px op 1600x900');
  ok(near(menuTextMin(0.667) * (0.667 / 1.2), 13, 0.02), '#868: de vloer is 12 px na de menuzoom');
  const vloer = (f, sel) => {
    const src = read(f);
    const at = src.indexOf(sel);
    return at < 0 ? '' : src.slice(at, src.indexOf('\n', at));
  };
  for (const [f, sel] of [
    ['carrieresfeer.js', '.lb-sfeer-klein {'],
    ['loopbaanui.js', '.lb-groep {'],
    ['loopbaanui.js', '.lb-bz .mut {'],
    ['loopbaanui.js', '.lb-volg {'],
    ['gebiedenui.js', '.gb-groep {'],
    ['visboekui.js', '.vb-soorten .wat {'],
    ['visboekui.js', '.vb-soorten .z {'],
    ['visboekui.js', '.vb-soorten .rec {'],
    ['mapview.js', '.mapview-legend .hint {'],
    ['mapview.js', '.mapview-card small, .mapview-card .mv-rec {'],
    ['mapview.js', '.mapview-card .mv-reisrij {'],
    ['veroverdpanel.js', '.vo-regel {'],
    // de taakkaarten van Veroverd (#980 fase 3) lezen --ds-t-*; --ds-t-hulp is max(14px, var(--menu-min)) en wordt bewaakt door ds_tokens_test
  ]) {
    ok(/var\(--menu-min/.test(vloer(f, sel)), `#868: ${sel} gebruikt de menuvloer`);
  }
  ok(/\.hud-district \{ font-size: max\(17px, var\(--hud-min\)\)/.test(read('hud_panel.css')), '#868: .hud-district op de HUD-vloer');
  ok(/\.hud-busnext span\{font-size:max\(14px,var\(--hud-min/.test(read('busboard3d.js')), '#868: buskaartje-ETA op de HUD-vloer');
  ok(/\.gps-dist span \{ font-size: max\(13px, var\(--hud-min\)\)/.test(read('hud_panel.css')), '#868: de reistijd in de routekaart op de HUD-vloer');
  ok(/#hud \.hc-text span \{ font-size: max\(16px, var\(--hud-min\)\); \}/.test(read('hudcards.css')), '#868: de kaarttekst op een korte telefoon op de HUD-vloer');
  ok(/\.hud-special \{[^}]*font-size: max\(16px, var\(--hud-min\)\)/.test(read('hud_panel.css')), '#868: de kalenderbadge op de HUD-vloer');
  ok(/\.pf-callwho small \{ font-size: max\(13px, var\(--hud-min\)\)/.test(read('phonefeed.css')), '#868: telefoonkop op de HUD-vloer');
  ok(/\.mg-board \.mg-sfeer \{ font: max\(12px, calc\(12px \/ var\(--ui/.test(read('minigamekit.js')), '#868: minigame-sfeer deelt door de HUD-zoom');
  ok(/\.mg-board \.mg-help \{ display: flex;[\s\S]*?max\(14px, calc\(14px \/ var\(--ui/.test(read('minigamekit.js')), '#868: minigame-hulp deelt door de HUD-zoom');
  ok(!/\.vo-beleid \.vo-rij/.test(read('veroverdpanel.js')), '#868: de oude Beleidswinkel-rijen zijn weg; de bonnen lezen de ds-tokens');
  const touch = (read('touch.js').match(/const CSS = `([\s\S]*?)`;/) || [])[1] || '';
  ok(/\.hud-instr \.hi-lamp/.test(touch), '#868: paneellabels staan in de 12px-vloer');
  ok(/\.t-btn \.t-lb \{ line-height: 1; white-space: nowrap; font-size: max\(1em, calc\(13px \/ var\(--t-scale, 1\)\)\)/.test(touch), '#868: aanraakknoppenlabels houden 12 px');
}

// --- #869: de actie-uitleg wrapt in plaats van af te kappen ----------------
{
  const menu = read('menu.css');
  const regel = /#pause-menu \.pm-cdesc \.one, #pause-menu \.pm-cgrid \.one, #pause-menu \.pm-bind \.one \{([^}]*)\}/.exec(menu);
  ok(!!regel, '#869: er is een wrapregel voor de besturingsuitleg');
  ok(regel && /white-space:\s*normal/.test(regel[1]), '#869: de uitleg mag omslaan');
  ok(regel && /text-overflow:\s*clip/.test(regel[1]), '#869: geen ellipsis meer');
  ok(regel && !/nowrap/.test(regel[1]), '#869: geen nowrap meer');
  ok(/Springen, over hek of auto klimmen/.test(read('controls.js')), '#869: de lange uitleg bestaat echt');
}

// --- #870: tekstbellen en naamkaarten binnen de viewport -------------------
{
  // anker = midden van de onderkant van de bel; (100, 200) met een bel van 120x30
  ok(JSON.stringify(bubblePlace({ x: 100, y: 200 }, { w: 120, h: 30 }, { w: 800, h: 360 })) === JSON.stringify({ x: 100, y: 200 }), '#870: een bel midden in beeld blijft staan');
  ok(bubblePlace({ x: -5, y: 100 }, { w: 120, h: 30 }, { w: 800, h: 360 }) === null, '#870: een anker links buiten beeld geeft geen bel');
  ok(bubblePlace({ x: 100, y: 441 }, { w: 120, h: 30 }, { w: 800, h: 360 }) === null, '#870: een anker onder het scherm geeft geen bel');
  const links = bubblePlace({ x: 2, y: 200 }, { w: 120, h: 30 }, { w: 800, h: 360 });
  ok(links && links.x === 64, '#870: een half zichtbare bel wordt met zijn halve breedte geklemd', links);
  const boven = bubblePlace({ x: 100, y: 5 }, { w: 120, h: 30 }, { w: 800, h: 360 });
  ok(boven && boven.y === 34, '#870: een bel boven de rand zakt met zijn hoogte naar binnen', boven);
  ok(bubblePlace({ x: 10, y: 10 }, { w: 900, h: 30 }, { w: 800, h: 360 }) === null, '#870: een bel breder dan het scherm verdwijnt');
  const scene = read('scene3d.js');
  ok(/bubblePlace\(scr, \{ w: el\._bw, h: el\._bh \}/.test(scene), '#870: scene3d gebruikt de pure belregel');
  ok(/el\.style\.fontSize = 'max\(13px, calc\(13px \/ var\(--ui, 1\)\)\)'/.test(scene), '#870: straatpraatbellen houden 13 px op een telefoon');
  ok(!/el\.style\.left = scr\.x/.test(scene), '#870: geen onbegrensde projectie meer');
  ok(/@media \(max-width: 700px\) \{[\s\S]*?#name-card \{ left: 16px; right: 16px; max-width: calc\(100vw - 32px\); \}/.test(read('namecard.js')), '#870: naamkaart blijft op een telefoon binnen de randen');
}

// --- #876: vliegtuigpaneel en toetshintregels ------------------------------
{
  const prompts = read('prompts.css');
  ok(/body\.plane-flying #hud \.hud-ctx \{ bottom: calc\(var\(--hud-edge, 46px\) \+ 305px\); \}/.test(prompts), '#876: toetshintregels wijken boven het vliegpaneel');
  ok(/body\.plane-flying #hud \.hud-vehname \{ display: none; \}/.test(prompts), '#876: de voertuignaamkaart wijkt in de vlucht');
  ok(/#hud \.hud-instr\{position:absolute;right:var\(--hud-edge/.test(read('instrumenten.js')), '#876: het paneel staat nog absoluut rechtsonder');
  ok(!/#hud \.\$\{COCKPIT_CLASS\}\s*\{\s*position:/.test(read('cockpit.js')), '#876: de cockpitrand overschrijft de positie niet');
}

// --- #877: aanraak-vlieg-HUD op 800x360 ------------------------------------
{
  ok(compactBoard(800, 360), '#877: 800x360 krijgt het compacte bord');
  ok(compactBoard(360, 800), '#881: 360x800 krijgt het compacte bord');
  ok(!compactBoard(1280, 720) && !compactBoard(1024, 768), '#877: grotere schermen houden het gewone bord');
  const mg = read('minigamekit.js');
  ok(/@media \(max-height: 460px\) and \(orientation: landscape\) \{[\s\S]*?body\.plane-flying #hud \.mg-board \.mg-row \{ flex-wrap: nowrap; overflow: hidden; white-space: nowrap; line-height: 1\.15; \}/.test(mg), '#877: korte liggende schermen: lesbord compact (één regel)');
  ok(/@media \(max-width: 480px\) \{[\s\S]*?body\.plane-flying #hud \.mg-board \.mg-row \{ flex-wrap: nowrap; overflow: hidden; white-space: nowrap; line-height: 1\.15; \}/.test(mg), '#881: portret klapt het vluchtbord pas tijdens het vliegen in');
  ok(/body\.plane-flying #hud \.mg-board:has\(\.mg-flash:not\(:empty\)\) \.mg-row \{ display: none; \}/.test(mg), '#877: een lesmelding houdt het compacte bord één regel hoog');
  ok(/root\.style\.top = '170px'/.test(mg), '#877: compact bord staat net onder zone C');
  ok(/\.mg-board \.mg-flash \{ font-size: max\(18px, calc\(22px \* var\(--ui, 1\)\)\)/.test(mg), '#868: lesbord-flash houdt 12 px op een telefoon');
  const touch = (read('touch.js').match(/const CSS = `([\s\S]*?)`;/) || [])[1] || '';
  ok(/@media \(max-height: 640px\) \{[\s\S]*?body\.plane-flying #banter-sub, body\.plane-flying #radio-sub \{ display: none; \}/.test(touch), '#877: ondertitel wijkt op korte schermen tijdens het vliegen');
  ok(/body\.plane-flying\.mg-on #hud \.hud-mission \{ display: none; \}/.test(touch), '#877: doel wijkt als het lesbord er staat');
  ok(/html\.touch-device #hud \.hud-instr/.test(touch) && /\.hud-instr \.hi-lamp/.test(touch), '#877: paneel en labels volgen de aanraakregels');
}

// --- #881: aanraak-vlieg-HUD op 360x800 (portret) --------------------------
{
  const touch = (read('touch.js').match(/const CSS = `([\s\S]*?)`;/) || [])[1] || '';
  ok(/html\.touch-device\.touch-portrait #hud \.hud-instr \{ right: var\(--hud-edge\); left: auto; transform: none; bottom: calc\(var\(--hud-f-top, 430px\) \+ 12px\); \}/.test(touch), '#881: paneel zakt in portret boven de linkerkolom');
  ok(/@media \(orientation: portrait\) \{[\s\S]*?body\.plane-flying #banter-sub, body\.plane-flying #radio-sub \{ display: none; \}/.test(touch), '#881: geen ondertitel over het paneel in portret');
  ok(/'--hud-f-top'/.test(read('hud_panel.js')), '#881: hud_panel.js meet de bovenkant van de linkerkolom');
  ok(/watchFlightColumn\(root, fcol\)/.test(read('hud_panel.js')), '#881: de meting hangt aan de linkerkolom');
}

console.log(fail ? `${fail} van ${n} HUD-layoutchecks mislukt` : `hud_layout_issues_test: ${n} checks ok`);
process.exit(fail ? 1 : 0);
