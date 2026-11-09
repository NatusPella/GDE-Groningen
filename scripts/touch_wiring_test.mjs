// Aanraakbedrading van de schermen (#805): statische controle dat winkel,
// telefoon, kaart, minigames en spelstanden tikbare handlers hebben en niet
// alleen muis-events. Geen runtime; de browser-/toestelronde blijft mensenwerk.
import fs from 'node:fs';

let fails = 0;
const ok = (c, name) => { if (!c) { fails++; console.log('FAIL', name); } };
const read = (rel) => fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');

// winkel: click-delegatie op de root, items zijn echte knoppen
const shop = read('game/js/shopui.js');
ok(shop.includes("root.addEventListener('click'"), 'winkel: click-delegatie');
ok(shop.includes('sm-item') && shop.includes('data-id'), 'winkel: items hebben een id en zijn knoppen');

// telefoon: de click-delegatie van het pauzemenu stuurt naar phoneClick
const pause = read('game/js/pausemenu.js');
ok(pause.includes("root.addEventListener('click'"), 'pauzemenu: click-delegatie');
ok(/phoneClick\(e, world/.test(pause), 'telefoon: click gaat naar phoneClick');

// spelstanden: eigen click-delegatie
const saves = read('game/js/saveslotsui.js');
ok(saves.includes("addEventListener('click'"), 'spelstanden: click-delegatie');

// kaart: pointer-pan en pinch, en zoekresultaten via click (geen mousedown-only)
const map = read('game/js/mapview.js');
ok(map.includes("cv.addEventListener('pointerdown'"), 'kaart: pointerdown voor aanraking');
ok(map.includes("cv.addEventListener('pointermove'"), 'kaart: pointermove voor slepen/pinch');
ok(map.includes("cv.addEventListener('pointerup'"), 'kaart: pointerup sluit de vinger af');
ok(map.includes('pinchStep'), 'kaart: pinch via de pure pinchStep');
ok(map.includes("li.addEventListener('click'") && !map.includes("li.addEventListener('mousedown'"), 'kaart: zoekresultaat is tikbaar');
ok(map.includes("overlay.addEventListener('click'"), 'kaart: kaartkaart/legenda via click');

// minigames: cellen worden tikdoelen met pointerdown en 44 px
const mini = read('game/js/minigamekit.js');
ok(mini.includes("el.cells.addEventListener('pointerdown'"), 'minigames: cellen via pointerdown');
ok(mini.includes('html.touch-play') && mini.includes('min-height: 44px'), 'minigames: tikdoelen van 44 px');
ok(mini.includes('data-do="stop"') && mini.includes("el.addEventListener('click'"), 'minigames: stopvenster met klikbare knoppen');

// het touch-scherm bepaalt zelf wanneer de tiklaag actief is
const touch = read('game/js/touch.js');
ok(touch.includes("classList.toggle('touch-play'"), 'touch: tiklaag aan/uit volgens de situatie');
ok(touch.includes("html.touch-device .m-hint"), 'touch: toetshints verborgen');

// staand (#805): geen draaibanner meer, een eigen smalle menulayout, en de plaatsnaam wijkt
const pauseCss = read('game/js/pausemenu.css');
ok(/@media \(max-width: 760px\) and \(orientation: portrait\)/.test(pauseCss), 'pauzemenu: eigen staande media query');
ok(/\.pm-rail \{ left: 8px; right: 8px; top: 8px; bottom: auto; width: auto; --ra-h: 44px; \}/.test(pauseCss), 'staand: rail als balk bovenin');
ok(/\.pm-sheet \{ left: 8px; right: 8px; top: 64px; bottom: 8px; \}/.test(pauseCss), 'staand: blad vult de rest van het scherm (geen 90 px-paneel)');
ok(!/Draai je toestel voor het menu/.test(touch), 'geen draaibanner meer voor het pauzemenu');
ok(/html\.touch-device\.touch-portrait #hud \.hud-place/.test(touch), 'staand: de plaatsnaam zakt onder de knoppenrij');
ok(!/touch-portrait #pause-menu\.visible::before/.test(touch), 'geen ::before-banner op het pauzemenu');

console.log(fails ? `${fails} FAIL` : 'touch_wiring_test ok');
process.exit(fails ? 1 : 0);
