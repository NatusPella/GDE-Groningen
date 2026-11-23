// Het uithangbord van een winkel (game/js/shopsign.js, #156): tekst, kleuren en plaats op de gevel.
//   node scripts/shopsign_test.mjs
import { signText, signColors, signLayout, signCanvasW, signMaxChars, signStretch, SIGN_H, SIGN_MAX_W, SIGN_OFF, SIGN_PX, SIGN_CHAR_PX } from '../game/js/shopsign.js';
import { winkelNaam, SHOP_KINDS } from '../game/js/winkelkit.js';
let n = 0, bad = 0;
const ok = (c, name) => { n++; if (!c) { bad++; console.log('FAIL', name); } };

ok(signText('Bakkerij Warm & Zoet') === 'Bakkerij Warm & Zoet', 'korte naam blijft staan');
ok(signText('  Veel   spaties  ') === 'Veel spaties', 'spaties netjes');
ok(signText('Slagerij de Groninger Metworst Maarten en Zonen') === 'Slagerij de Groninger', 'lange naam op een woordgrens');
ok(signText('Abcdefghijklmnopqrstuvwxyzabcdefgh').length <= 26, 'een lang woord wordt afgekapt');
ok(signText(null) === '' && signText(undefined) === '', 'geen naam geeft geen tekst');
for (const t of SHOP_KINDS) for (let i = 0; i < 40; i++) ok(signText(winkelNaam(t, i * 0.7)).length > 0 && signText(winkelNaam(t, i * 0.7)).length <= 26, `${t}: verzonnen namen passen op het bord`);

ok(signColors(0x232323).fg === '#f6f1e4', 'licht op donker');
ok(signColors(0xd6cab0).fg === '#1b1b1b', 'donker op licht');
ok(signColors(0x2f4a3a).bg === '#2f4a3a' && signColors(0x000000).bg === '#000000', 'achtergrond is de kleur van de band');

// een voorgevel langs de x-as die naar +y (zuid) kijkt, en een die naar buiten wijst in een hoek
const front = { ax: 10, ay: 20, tx: 1, ty: 0, nx: 0, ny: 1, s0: 0.15, s1: 8.15, top: 3.2 };
const L = signLayout(front);
ok(Math.abs(L.x - 14.15) < 1e-9 && Math.abs(L.z - (20 + SIGN_OFF)) < 1e-9, 'midden van de pui, vlak voor de gevel');
ok(Math.abs(L.y - 3.45) < 1e-9 && L.h === SIGN_H, 'in de band boven de pui');
ok(L.w === SIGN_MAX_W, 'breed bord op een brede pui');
ok(Math.abs(Math.sin(L.rotY) - 0) < 1e-9 && Math.cos(L.rotY) > 0.99, 'wijst naar +z als de gevel naar +z kijkt');
const west = signLayout({ ax: 0, ay: 0, tx: 0, ty: 1, nx: -1, ny: 0, s0: 0.15, s1: 3.15, top: 3 });
ok(Math.abs(Math.sin(west.rotY) + 1) < 1e-9, 'wijst naar -x als de gevel naar -x kijkt');
ok(west.w >= 0.8 && west.w <= 3, 'een smalle pui krijgt een smal bord');
ok(signLayout({ ...front, s1: 0.6 }).w === 0.8, 'nooit smaller dan 0,8 m');

// AI-tells 23-11: het canvas heeft de verhouding van het bord, dus geen uitgerekte of samengeperste letters, en de tekst past
for (let w = 0.8; w <= SIGN_MAX_W + 1e-9; w += 0.1) {
  const st = signStretch(signCanvasW(w), SIGN_PX, w, SIGN_H);
  ok(st > 0.85 && st < 1.2, `bord ${w.toFixed(1)} m: letters niet vervormd (${st.toFixed(2)})`);
  const t = signText('Slagerij de Groninger Metworst Maarten en Zonen', Math.min(26, signMaxChars(w)));
  ok(t.length * SIGN_CHAR_PX <= signCanvasW(w) - 32 + 1e-9, `bord ${w.toFixed(1)} m: tekst past zonder samenpersen`);
  ok(t === '' || 'Slagerij de Groninger Metworst Maarten en Zonen'.startsWith(t + ' '), `bord ${w.toFixed(1)} m: hele woorden, geen half woord (${t})`);
}
ok(signStretch(512, 80, 0.8, SIGN_H) < 0.4 && signStretch(512, 80, 5.5, SIGN_H) > 2, 'het oude vaste canvas (512 x 80) vervormde wel');

console.log(`${n - bad}/${n} checks passed`);
process.exit(bad ? 1 : 0);
