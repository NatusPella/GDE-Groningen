// Pure side of the accessibility options (game/js/a11ylogic.js, a11y.js palettes, #200):
//   node scripts/a11y_test.mjs
// Contrast of the marker palettes on the HUD backdrop, markers that stay apart under colour
// blindness, subtitle contrast, text sizes, and what the comfort settings switch off.
import { PALETTES } from '../game/js/a11y.js';
import * as L from '../game/js/a11ylogic.js';
import { COLOR_BLIND_MODES, SUBTITLE_SIZES } from '../game/js/settings.js';

let fails = 0, n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };

// contrast maths against known values
ok(Math.abs(L.contrastRatio('#000000', '#ffffff') - 21) < 0.01, 'black on white is 21:1');
ok(Math.abs(L.contrastRatio('#777777', '#ffffff') - 4.48) < 0.05, '#777 on white is about 4.48:1');
ok(L.contrastRatio('#123456', '#123456') === 1, 'same colour is 1:1');
ok(L.contrastRatio(0xff0000, '#00ff00') === L.contrastRatio('#00ff00', '#ff0000'), 'ratio is symmetric, numbers work');
ok(L.toRgb('nonsense').join() === '0,0,0', 'broken colour is black');

// every palette: every colour readable on the dark HUD backdrop, every palette has the same keys
const keys = Object.keys(PALETTES.uit).sort().join();
for (const mode of COLOR_BLIND_MODES) {
  const p = PALETTES[mode];
  ok(p && Object.keys(p).sort().join() === keys, mode + ' has every marker colour');
  ok(L.lowContrast(p, '#0c140e').length === 0, mode + ' markers hold 3:1 on the HUD', JSON.stringify(L.lowContrast(p, '#0c140e')));
  ok(L.closePairs(p, mode).length === 0, mode + ' key markers stay apart for that eye', JSON.stringify(L.closePairs(p, mode)));
  ok(Object.values(p).every((c) => /^#[0-9a-f]{6}$/i.test(c)), mode + ' colours are hex');
}
// the default palette is the one that needs the other three
ok(L.closePairs(PALETTES.uit, 'protanopie').length > 0, 'default palette is hard under protanopie (why the mode exists)');

// the simulation does what it should
ok(L.simulate('#ffffff', 'deuteranopie').every((v) => v >= 250), 'white stays white');
ok(L.simulate('#ff0000', 'uit').join() === '255,0,0', 'uit changes nothing');
const red = L.simulate('#d93f3f', 'protanopie');
ok(red[0] < 217, 'red darkens for protanopia', red.join());
ok(L.colorDistance('#d93f3f', '#d93f3f') === 0 && L.colorDistance('#000000', '#ffffff') > 90, 'colour distance');

// subtitles
ok(L.SUBTITLE_CONTRASTS.includes('normaal') && L.SUBTITLE_CONTRASTS.includes('hoog'), 'subtitle contrast steps');
ok(L.subtitleContrastRatio('hoog') >= 7, 'high subtitle contrast is AAA even on white', String(L.subtitleContrastRatio('hoog')));
ok(L.subtitleContrastRatio('normaal') >= L.MIN_TEXT, 'normal subtitle box is AA');
ok(L.subtitleStyle('hoog', false).boxAlpha > L.subtitleStyle('normaal', true).boxAlpha, 'hoog has a denser box, with or without the box setting');
ok(L.subtitleStyle('normaal', false).boxAlpha === 0, 'normal without box has none');
ok(Object.keys(SUBTITLE_SIZES).length >= 4 && SUBTITLE_SIZES.extragroot >= 1.5, 'subtitle sizes reach 1.5x');

// text size
ok(L.textScale('normaal') === 1 && L.textScale('extragroot') > L.textScale('groot') && L.textScale('groot') > 1, 'text scale steps grow');
ok(L.textScale('onzin') === 1, 'unknown size is 1');

// comfort settings
const base = L.effectsFor();
ok(base.cameraShake === 1 && base.screenFlash === 1, 'nothing reduced by default');
ok(L.effectsFor({ reduceMotion: true }).cameraShake === 0 && L.effectsFor({ reduceMotion: true }).screenFlash === 1, 'reduceMotion stops shake, not flashes');
ok(L.effectsFor({ reduceFlash: true }).screenFlash === 0 && L.effectsFor({ reduceFlash: true }).cameraShake === 1, 'reduceFlash stops flashes only');
ok(base.flashMaxPerSecond <= 3, 'at most three flashes a second');
ok(L.shakeAmount(0.03, { reduceMotion: true }) === 0 && L.shakeAmount(0.03, {}) === 0.03, 'shake amount follows the setting');
console.log(fails ? `${fails} of ${n} failed` : `a11y_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
