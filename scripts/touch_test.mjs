// node scripts/touch_test.mjs: touch detection, the virtual stick and the
// buttons per situation (game/js/touchlogic.js).
import { detectTouch, stickVector, knobOffset, lookDelta, stickKeys, touchPlan, labelFor, touchUiActive, touchContext, stickless } from '../game/js/touchlogic.js';
import { touchMode, touchLayout, touchMore, touchLabelForToken, TOUCH_CHOICES } from '../game/js/touchlogic.js';
import { pinchStep, leftButtonX, touchPlacement, touchRects, hudMinimap } from '../game/js/touchlogic.js';
import { PAD_MAPS } from '../game/js/controls.js';

let fail = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};

eq('desktop', detectTouch({ maxTouchPoints: 0, fine: true, hover: true }), false);
eq('phone', detectTouch({ maxTouchPoints: 5, coarse: true }), true);
eq('laptop touchscreen with mouse', detectTouch({ maxTouchPoints: 10, fine: true, hover: true }), false);
eq('tablet no media queries', detectTouch({ maxTouchPoints: 5 }), true);
eq('forced off', detectTouch({ maxTouchPoints: 5, coarse: true, forced: false }), false);
eq('forced on', detectTouch({ forced: true }), true);

eq('stick centre', stickVector({ x: 0, y: 0 }, { x: 0, y: 0 }), [0, 0]);
eq('stick dead zone', stickVector({ x: 0, y: 0 }, { x: 5, y: 0 }), [0, 0]);
eq('stick full right', stickVector({ x: 0, y: 0 }, { x: 200, y: 0 }), [1, 0]);
const up = stickVector({ x: 0, y: 0 }, { x: 0, y: -28 });
eq('stick half up', [up[0], up[1] < -0.3 && up[1] > -0.7], [0, true]);
eq('knob clamped', knobOffset({ x: 0, y: 0 }, { x: 112, y: 0 }), { x: 56, y: 0 });
eq('look swipe', lookDelta({ x: 10, y: 10 }, { x: 20, y: 5 }, 1), [16, -8]);

eq('keys right', [...stickKeys([1, 0])], ['d']);
eq('keys diagonal', [...stickKeys([-0.7, -0.7])].sort(), ['a', 'w']);
eq('hysteresis keeps', [...stickKeys([0.4, 0], new Set(['d']))], ['d']);
eq('hysteresis needs more to start', [...stickKeys([0.4, 0], new Set())], []);

const foot = touchPlan('foot');
eq('foot has jump', foot.find((b) => b.slot === 'a').label, 'Spring');
eq('foot fire on rt', foot.find((b) => b.slot === 'rt').action, '@fire');
eq('foot weapon once', foot.filter((b) => b.action.startsWith('@wheel')).length, 1);
const car = touchPlan('vehicle');
eq('car gas', car.find((b) => b.action === '@gas').label, 'Gas');
eq('car horn', car.find((b) => b.action === 'h').label, 'Toeter');
let allLabelled = true;
for (const ctx of Object.keys(PAD_MAPS)) if (ctx !== 'menu') for (const b of touchPlan(ctx)) if (!/^[A-Z0-9]/.test(b.label)) allLabelled = false;
eq('all labels filled', allLabelled, true);
eq('every ctx has a plan', Object.keys(PAD_MAPS).filter((c) => c !== 'menu' && !touchPlan(c).length), []);
eq('label fallback', labelFor('foot', 'zz'), '');
eq('ui off in menu', touchUiActive({ started: true, menuOpen: true }), false);
eq('ui on in play', touchUiActive({ started: true, menuOpen: false }), true);

eq('ctx menu', touchContext({}, { menuOpen: true }), 'menu');
eq('ctx foot', touchContext({ player: {} }), 'foot');
eq('ctx pannenkoek', touchContext({ player: {}, activityGame: 'pannenkoek' }), 'pannenkoek');
eq('ctx klokken', touchContext({ player: {}, activityGame: 'carillon' }), 'klokken');
eq('ctx car', touchContext({ player: { inVehicle: {} } }), 'vehicle');
eq('ctx heli', touchContext({ player: { inVehicle: { isHeli: true } } }), 'heli');
eq('ctx manual', touchContext({ player: { inVehicle: { gb: {} } } }, { shiftMode: 'hand' }), 'vehicleManual');
eq('ctx pigeon', touchContext({ pigeonMode: true }), 'pigeon');

const pan = touchPlan('pannenkoek').map((b) => b.label).join(',');
eq('pannenkoek touch buttons', pan, 'Stroop,Spek,Appel,Kaas,Stop,3,1,2');
eq('stick off in pannenkoek', stickless('pannenkoek'), true);
eq('stick on in minigame', stickless('minigame'), false);
eq('mode auto follows device', [touchMode('auto', true), touchMode('auto', false)], [true, false]);
eq('mode forced', [touchMode('aan', false), touchMode('uit', true)], [true, false]);
eq('choices', TOUCH_CHOICES, ['auto', 'aan', 'uit']);

const ph = touchLayout({ width: 844, height: 390 });
eq('phone landscape', [ph.cls, ph.orientation, ph.hint], ['phone', 'landscape', '']);
const pp = touchLayout({ width: 390, height: 844 });
eq('phone portrait hint', [pp.portrait, pp.hint.length > 0], [true, true]);
const tb = touchLayout({ width: 1180, height: 820 });
eq('tablet', tb.cls, 'tablet');
eq('scale bounded', [ph.scale, tb.scale, touchLayout({ width: 320, height: 240 }).scale].every((v) => v >= 0.7 && v <= 1.3), true);
eq('tablet bigger than small phone', tb.scale > touchLayout({ width: 640, height: 320 }).scale, true);

// extra actions behind "Meer": never duplicate a direct button, never the menu key
for (const ctx of Object.keys(PAD_MAPS)) {
  if (ctx === 'menu') continue;
  const direct = new Set(touchPlan(ctx).map((b) => b.action));
  const more = touchMore(ctx);
  eq(`more ${ctx} distinct`, more.every((m) => !direct.has(m.action) && m.action !== 'escape' && m.label) && new Set(more.map((m) => m.action)).size === more.length, true);
}
eq('foot more has map or radio', touchMore('foot').some((m) => ['Kaart', 'Radio', 'Doel'].includes(m.label)), true);
eq('key hint becomes button label', touchLabelForToken('E', 'foot') !== '' || touchMore('foot').length > 0, true);
eq('unknown token has no label', touchLabelForToken('F12', 'foot'), '');

const pin = pinchStep([{ x: 0, y: 0 }, { x: 100, y: 0 }], [{ x: 0, y: 0 }, { x: 200, y: 0 }]);
eq('pinch apart doubles', pin.factor, 2);
eq('pinch midpoint', pin.mid, { x: 100, y: 0 });
eq('pinch zero distance is neutral', pinchStep([{ x: 5, y: 5 }, { x: 5, y: 5 }], [{ x: 0, y: 0 }, { x: 9, y: 0 }]).factor, 1);

// de knoppen van elke situatie op telefoon en tablet: genoeg plekken, binnen beeld, >= 44 px, geen overlap
const SCREENS = [[800, 360], [360, 800], [915, 412], [412, 915], [844, 390], [390, 844], [1180, 820], [820, 1180], [640, 320], [568, 320]];
const hit = (a, b) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;
let layoutBad = 0;
for (const ctx of Object.keys(PAD_MAPS).filter((c) => c !== 'xbox' && c !== 'ps' && c !== 'switch' && c !== 'deck')) {
  if (!['foot', 'vehicle', 'vehicleManual', 'skutsje', 'heli', 'pigeon', 'train', 'minigame', 'klokken', 'pannenkoek', 'foodtruck', 'menu'].includes(ctx)) continue;
  const want = touchPlan(ctx).length;
  if (touchPlacement(ctx).length !== want) { layoutBad++; console.log(`FAIL ${ctx}: ${want} knoppen maar ${touchPlacement(ctx).length} plekken`); }
  for (const [W, H] of SCREENS) {
    const rs = touchRects(ctx, { width: W, height: H });
    for (const r of rs) {
      if (r.x < 0 || r.y < 0 || r.x + r.w > W || r.y + r.h > H) { layoutBad++; console.log(`FAIL ${ctx} ${W}x${H}: ${r.name} valt buiten beeld`); }
      if (Math.min(r.w, r.h) < 44) { layoutBad++; console.log(`FAIL ${ctx} ${W}x${H}: ${r.name} is ${Math.round(r.w)}x${Math.round(r.h)} (< 44)`); }
    }
    const mm = hudMinimap({ width: W, height: H });
    for (const r of rs) if (hit(r, mm)) { layoutBad++; console.log(`FAIL ${ctx} ${W}x${H}: ${r.name} ligt op de minimap`); }
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) if (hit(rs[i], rs[j])) { layoutBad++; console.log(`FAIL ${ctx} ${W}x${H}: ${rs[i].name} en ${rs[j].name} overlappen`); }
  }
}
if (layoutBad) fail++; else console.log('ok   knoppen per situatie: plekken, beeld, 44 px en overlap op 10 schermen');

// env(safe-area-inset-*) in touch.js geeft op iOS pas iets met viewport-fit=cover
// the left buttons start beside the minimap (360 px tall phone: the minimap is 190 px wide)
eq('geen minimap: knoppen in de hoek', leftButtonX({ minimapRight: 0, scale: 0.9 }), 24);
eq('minimap tot 214 px: knoppen erachter', leftButtonX({ minimapRight: 214, scale: 0.9 }), Math.ceil(224 / 0.9));
eq('minimap smaller dan de hoek: hoek blijft', leftButtonX({ minimapRight: 6, scale: 1 }), 24);
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../game/index.html', import.meta.url), 'utf8');
if (!/name="viewport"[^>]*viewport-fit=cover/.test(html)) { fail++; console.log('FAIL viewport-fit=cover ontbreekt in index.html'); }

console.log(fail ? `${fail} FAILED` : 'all ok');
process.exit(fail ? 1 : 0);
