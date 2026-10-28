// De aanraakbediening kent de nieuwe situaties van #151: de coopvraag (ja/nee), het hengelen aan de waterkant,
// de trekker op het erf en de cijferkeuze van de bijbaan- en tekstpanelen. Sinds #502 kent hij ook de bus (deuren
// en knielen) en het vliegtuig (kleppen, gestel, roer) — dezelfde keuze als gamepad.js. Deze test bewijst per
// situatie dat touchlogic.js hem kiest, dat de juiste knop bestaat (met dezelfde actie als op het pad) en dat de
// knoppen op een telefoonscherm groot genoeg zijn en niet over elkaar liggen.
//   node scripts/touch_situaties_test.mjs
import { readFileSync } from 'node:fs';
import { PAD_MAPS, HENGEL_HINT } from '../game/js/controls.js';
import { touchContext, touchPlan, touchMore, touchPlacement, touchRects, touchBar, labelFor, iconFor, stickless, hudMinimap } from '../game/js/touchlogic.js';

let fail = 0, n = 0;
const ok = (c, name, extra) => { n++; if (!c) { fail++; console.log('FAIL ' + name + (extra !== undefined ? ' ' + JSON.stringify(extra) : '')); } };
// de knop van een situatie op een plek van het pad, en de extra knop achter "Meer"
const btn = (ctx, slot) => touchPlan(ctx).find((b) => b.slot === slot);
const extra = (ctx, action) => touchMore(ctx).find((m) => m.action === action);

// Een wereld zonder alles wat een situatie kan kiezen; daarna per geval een veld erbij.
const wereld = (patch = {}) => Object.assign({
  time: 10, minigameUntil: 0, player: { inVehicle: null }, noLookBack: false,
  coopHold: false, coopGastVraag: null, coopStem: null, coopUitnodiging: null, coopWisselUi: null,
  coopNet: null, coopWedGast: null, pvpArenaUitn: null,
}, patch);

// --- 1. de coopvraag: A is ja, B is nee ----------------------------------------------------
ok(!!PAD_MAPS.coopvraag, 'coopvraag: de indeling bestaat');
ok(btn('coopvraag', 'a') && btn('coopvraag', 'a').action === PAD_MAPS.coopvraag.a && btn('coopvraag', 'a').label === 'Ja', 'coopvraag: A heet Ja en geeft de toets van het pad', btn('coopvraag', 'a'));
ok(btn('coopvraag', 'b') && btn('coopvraag', 'b').action === PAD_MAPS.coopvraag.b && btn('coopvraag', 'b').label === 'Nee', 'coopvraag: B heet Nee en geeft de toets van het pad', btn('coopvraag', 'b'));
ok(PAD_MAPS.coopvraag.a === 'j' && PAD_MAPS.coopvraag.b === 'n', 'coopvraag: het pad stuurt J en N (zo leest het vraagscherm het)');
ok(btn('coopvraag', 'a').side === 'right' && btn('coopvraag', 'b').side === 'right', 'coopvraag: ja en nee staan bij de duim van de rechterhand');
ok(iconFor('Ja') !== '' && iconFor('Nee') !== '', 'coopvraag: allebei de knoppen hebben een icoon');
// de D-pad is leeg in deze situatie: N zou op de D-pad omhoog de radio aanzetten
ok(!touchMore('coopvraag').some((m) => m.action === 'n'), 'coopvraag: "Nee" zit niet ook nog eens achter Meer als radio', touchMore('coopvraag'));
ok(stickless('coopvraag') === false && PAD_MAPS.coopvraag.stick === 'move', 'coopvraag: je kunt ondertussen doorlopen');
// elke vraag van Samen spelen (wedstrijd, opdracht, overname, stemming, arena) kiest deze situatie
for (const [naam, veld] of [
  ['de vraag aan de gastheer', { coopGastVraag: { rest: 12 } }],
  ['een stemming', { coopStem: { rest: 5 } }],
  ['een uitnodiging', { coopUitnodiging: { rest: 5 } }],
  ['het overnemen van het spel', { coopWisselUi: { vraag: { rest: 9 } } }],
  ['een wedstrijduitnodiging', { coopNet: { role: 'host', wed: { u: { keuze: ['wacht'] } } } }],
  ['de uitslag met rematch', { coopNet: { role: 'host', wed: { uitslag: {} } } }],
  ['de gast ziet een uitslag', { coopWedGast: { uitslag: {} } }],
  ['de PvP-arena', { pvpArenaUitn: { keuze: ['wacht'] } }],
]) ok(touchContext(wereld(veld)) === 'coopvraag', `coopvraag: ${naam} kiest de vraagindeling`, touchContext(wereld(veld)));

// --- 2. het wachtscherm: de balk gaat opzij, de speler tikt de dialoog aan -------------------
ok(touchContext(wereld({ coopHold: true, coopNet: { role: 'host' } })) === 'menu', 'wachtscherm: geen spelknoppen over het dialoogvenster');
ok(touchBar('menu').plan.length === 0 && touchBar('menu').more.length === 0, 'wachtscherm: de balk houdt alleen Pauze over', touchBar('menu'));
ok(touchBar('foot').plan.length === touchPlan('foot').length && touchBar('foot').more.length === touchMore('foot').length, 'buiten de menu-situatie tekent de balk gewoon de knoppen van de situatie');
ok(touchRects('menu', { width: 800, height: 360 }).map((r) => r.name).join() === 'II', 'wachtscherm: er staat één knop op het scherm: Pauze');

// --- 3. hengelen aan de waterkant: X hengelt -----------------------------------------------
ok(touchContext(wereld(), { hengel: true }) === 'hengelen', 'hengelen: de hengelhint kiest de hengelsituatie');
ok(touchContext(wereld(), { hengel: false }) === 'foot', 'hengelen: zonder hint blijft het de voetindeling');
ok(btn('hengelen', 'x') && btn('hengelen', 'x').action === 'i' && btn('hengelen', 'x').label === 'Hengelen', 'hengelen: de X-knop hengelt', btn('hengelen', 'x'));
ok(iconFor('Hengelen') !== '', 'hengelen: de hengelknop heeft een icoon');
ok(btn('hengelen', 'y').action === 'e', 'hengelen: Y blijft instappen en gebruiken', btn('hengelen', 'y'));
// te voet blijft X de tweede gebruikstoets (uitstappen bij de attracties): daar verandert niets
ok(btn('foot', 'x').action === 'f' && btn('foot', 'x').label === 'Instappen', 'voet: X blijft F, ook met de hengelknop erbij', btn('foot', 'x'));

// --- 4. de trekker op het erf: aftakas, ontkoppelen, tanken en de hef -----------------------
ok(touchContext(wereld({ player: { inVehicle: { speed: 0, farm: 'trekker1' } } })) === 'trekker', 'trekker: een landbouwmachine kiest de trekkerindeling');
ok(touchContext(wereld({ player: { inVehicle: { speed: 0, model: { zeil: true } } } })) === 'skutsje', 'trekker: een zeilboot blijft de skûtsje-indeling');
ok(btn('trekker', 'b') && btn('trekker', 'b').action === 'x' && btn('trekker', 'b').label === 'Ontkoppelen', 'trekker: B koppelt los', btn('trekker', 'b'));
ok(btn('trekker', 'lb') && btn('trekker', 'lb').action === 't' && btn('trekker', 'lb').label === 'Hef', 'trekker: LB is de hef', btn('trekker', 'lb'));
ok(extra('trekker', 'g') && extra('trekker', 'g').label === 'Aftakas', 'trekker: de aftakas staat achter Meer', touchMore('trekker'));
ok(extra('trekker', 'r') && extra('trekker', 'r').label === 'Tanken', 'trekker: tanken staat achter Meer', touchMore('trekker'));
ok(btn('trekker', 'rt').action === '@gas' && btn('trekker', 'lt').action === '@brake', 'trekker: gas en rem op de trekkers', touchPlan('trekker').filter((b) => b.action.startsWith('@')));
ok(stickless('trekker') === false && PAD_MAPS.trekker.stick === 'steer', 'trekker: de stick stuurt, net als in een auto');
for (const l of ['Ontkoppelen', 'Aftakas', 'Tanken']) ok(iconFor(l) !== '', `trekker: "${l}" heeft een icoon`);

// --- 5. de cijfers van een bijbaan- of tekstpaneel -----------------------------------------
ok(touchContext(wereld({ minigameUntil: 10.25 })) === 'minigame', 'bijbaan: een paneel dat de invoer opeist kiest de minigame-indeling');
ok(touchContext(wereld({ minigameUntil: 10.25, player: { inVehicle: { speed: 2 } } })) === 'vehicle', 'bijbaan: in een rijdende taxi houdt de speler de voertuigindeling');
const cijfers = touchMore('minigame').filter((m) => /^[1-4]$/.test(m.action));
ok(cijfers.map((m) => m.action).sort().join('') === '1234', 'bijbaan: alle vier de antwoorden staan achter Meer', touchMore('minigame'));
ok(new Set(cijfers.map((m) => m.slot)).size === 4, 'bijbaan: elk cijfer op een eigen knop', cijfers);
ok(cijfers.every((m) => m.label === m.action), 'bijbaan: de knop toont het cijfer zelf', cijfers.map((m) => m.label));
ok(iconFor('1') === '', 'bijbaan: een cijferknop houdt tekst (geen icoon), dat is het duidelijkste teken');
ok(btn('minigame', 'b').action === 'backspace' && btn('minigame', 'b').label === 'Stop', 'bijbaan: B stopt het paneel', btn('minigame', 'b'));
// de oude fout: met de voetindeling zat "Overslaan" (O) achter Meer en sloeg je de verhaallijn over
ok(!touchMore('minigame').some((m) => m.action === 'o'), 'bijbaan: geen "Overslaan" meer achter Meer', touchMore('minigame'));

// --- 6. dezelfde actie als het spel leest --------------------------------------------------
// touch.js doet voor een gewone toets input.padHold(toets, in); het spel leest dat met wasPressed. Hier met de
// echte Input: een knop die "de juiste actie geeft" is er een die het spel ook echt ziet.
const tgt = { addEventListener() {}, removeEventListener() {} };
globalThis.window = tgt;
globalThis.document = { addEventListener() {} };
const { Input } = await import('../game/js/input.js');
const inp = new Input(tgt);
const drukt = (k) => { inp.padHold(k, true); const gezien = inp.wasPressed(k); inp.padHold(k, false); inp.endFrame(); return gezien; };
for (const [ctx, slot] of [['coopvraag', 'a'], ['coopvraag', 'b'], ['hengelen', 'x'], ['trekker', 'b'], ['trekker', 'lb'], ['bus', 'lb'], ['bus', 'rb'], ['plane', 'b'], ['plane', 'lb']]) {
  const b = btn(ctx, slot);
  ok(drukt(b.action), `${ctx}: het spel ziet de toets van ${b.label} (${b.action})`);
}
for (const [ctx, action] of [['trekker', 'g'], ['trekker', 'r'], ['minigame', '1'], ['minigame', '2'], ['minigame', '3'], ['minigame', '4']]) {
  const m = extra(ctx, action);
  ok(drukt(m.action), `${ctx}: het spel ziet ${m.label} achter Meer (${m.action})`);
}

// --- 7. de knoppen op een telefoonscherm --------------------------------------------------
// Dezelfde eisen als touch_test.mjs, nu voor elke situatie (dus ook de nieuwe): een plek per knop, binnen beeld,
// minstens 44 px raakvlak, niet op de minimap en niets over elkaar.
const SCREENS = [[800, 360], [360, 800], [915, 412], [412, 915], [844, 390], [390, 844], [1180, 820], [820, 1180], [640, 320], [568, 320]];
const hit = (a, b) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;
let slecht = 0;
for (const ctx of [...Object.keys(PAD_MAPS), 'cutscene']) {
  if (touchPlacement(ctx).length !== touchPlan(ctx).length) { slecht++; console.log(`FAIL ${ctx}: ${touchPlan(ctx).length} knoppen maar ${touchPlacement(ctx).length} plekken`); }
  for (const [W, H] of SCREENS) {
    const rs = touchRects(ctx, { width: W, height: H });
    for (const r of rs) {
      if (r.x < 0 || r.y < 0 || r.x + r.w > W || r.y + r.h > H) { slecht++; console.log(`FAIL ${ctx} ${W}x${H}: ${r.name} valt buiten beeld`); }
      if (Math.min(r.w, r.h) < 44) { slecht++; console.log(`FAIL ${ctx} ${W}x${H}: ${r.name} is ${Math.round(r.w)}x${Math.round(r.h)} (< 44)`); }
    }
    const mm = hudMinimap({ width: W, height: H });
    for (const r of rs) if (hit(r, mm)) { slecht++; console.log(`FAIL ${ctx} ${W}x${H}: ${r.name} ligt op de minimap`); }
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) if (hit(rs[i], rs[j])) { slecht++; console.log(`FAIL ${ctx} ${W}x${H}: ${rs[i].name} en ${rs[j].name} overlappen`); }
  }
}
ok(slecht === 0, `knoppen van alle situaties: plek, beeld, 44 px en geen overlap op ${SCREENS.length} schermen`);
// de breedste nieuwe knop ("Ontkoppelen") naast zijn buren, op de kleinste telefoon
{
  const rs = touchRects('trekker', { width: 568, height: 320 });
  const eigen = rs.find((r) => r.name === 'Ontkoppelen');
  ok(eigen && Math.round(eigen.w) >= 44 && Math.round(eigen.h) >= 44, 'trekker: de ontkoppelknop is op 568x320 groot genoeg', eigen);
  ok(rs.filter((r) => r.name === 'II').length === 1, 'trekker: de pauzeknop staat er altijd');
}

// --- 8. de bus en het vliegtuig (#502): eigen indelingen, net als op het pad -----------------
// De bus: de deuren (O) en het knielen (K) zitten op de bumpers. Zonder deze situatie kreeg de bus de
// voertuigindeling (hef en vuur) en waren deuren en knielen op aanraak onbereikbaar.
const busV = { speed: 0, isBus: true };
ok(touchContext(wereld({ player: { inVehicle: busV } })) === 'bus', 'bus: een lijnbus kiest de busindeling', touchContext(wereld({ player: { inVehicle: busV } })));
ok(btn('bus', 'lb') && btn('bus', 'lb').action === 'o' && btn('bus', 'lb').label === 'Deuren', 'bus: LB opent de deuren (O)', btn('bus', 'lb'));
ok(btn('bus', 'rb') && btn('bus', 'rb').action === 'k' && btn('bus', 'rb').label === 'Knielen', 'bus: RB laat de bus knielen (K)', btn('bus', 'rb'));
ok(labelFor('bus', 'o') === 'Deuren' && labelFor('bus', 'k') === 'Knielen', 'bus: de knoppen heten Deuren en Knielen', [labelFor('bus', 'o'), labelFor('bus', 'k')]);
ok(iconFor('Deuren') !== '' && iconFor('Knielen') !== '', 'bus: de deuren- en knielknop hebben allebei een icoon');
ok(!touchPlan('bus').some((b) => b.action === 't' || b.action === '@fire'), 'bus: geen hef en geen vuurknop in de bus', touchPlan('bus'));
// Het vliegtuig: planeflight.js zet world.noLookBack (Q is in de kist het roer). Zonder eigen tak werd dat de
// skûtsje-indeling en miste de speler de daling (Ctrl op B); nu wint de vliegindeling, ook van een zeilmodel.
const kist = { speed: 0, isPlane: true };
const inKist = wereld({ player: { inVehicle: kist }, noLookBack: true });
ok(touchContext(inKist) === 'plane', 'vliegtuig: een vliegtuig kiest de vliegindeling', touchContext(inKist));
ok(touchContext(inKist) !== 'skutsje', 'vliegtuig: met noLookBack (Q is het roer) wordt het geen skûtsje');
ok(touchContext(wereld({ player: { inVehicle: { isPlane: true, model: { zeil: true } } }, noLookBack: true })) === 'plane', 'vliegtuig: de vliegindeling gaat vóór de zeilboot');
ok(btn('plane', 'a') && btn('plane', 'a').action === ' ' && btn('plane', 'a').label === 'Omhoog', 'vliegtuig: A trekt de neus omhoog', btn('plane', 'a'));
ok(btn('plane', 'b') && btn('plane', 'b').action === 'control' && btn('plane', 'b').label === 'Omlaag', 'vliegtuig: B duwt de neus omlaag, dus dalen kan weer', btn('plane', 'b'));
ok(btn('plane', 'lb') && btn('plane', 'lb').action === 'k' && btn('plane', 'lb').label === 'Kleppen', 'vliegtuig: LB zet de kleppen', btn('plane', 'lb'));
ok(btn('plane', 'x') && btn('plane', 'x').action === 'g' && btn('plane', 'x').label === 'Gestel', 'vliegtuig: X haalt het gestel in of uit', btn('plane', 'x'));
ok(btn('plane', 'y') && btn('plane', 'y').action === 'e' && btn('plane', 'y').label === 'Roer rechts', 'vliegtuig: de E-knop is het roer rechts', btn('plane', 'y'));
ok(labelFor('plane', 'q') === 'Roer links' && labelFor('plane', 'e') === 'Roer rechts', 'vliegtuig: Q en E heten roer links en rechts', [labelFor('plane', 'q'), labelFor('plane', 'e')]);
ok(labelFor('plane', 'k') === 'Kleppen' && labelFor('foot', 'k') === 'Kusje', 'vliegtuig: dezelfde toets heet in de kist anders dan op de grond', [labelFor('plane', 'k'), labelFor('foot', 'k')]);
ok(labelFor('plane', 'g') === 'Gestel' && labelFor('foot', 'g') === 'Dienst', 'vliegtuig: G is het gestel, geen dienst', [labelFor('plane', 'g'), labelFor('foot', 'g')]);
ok(labelFor('plane', 'v') === '' && labelFor('foot', 'v') === 'Film', 'vliegtuig: geen filmknop tussen de vliegknoppen', [labelFor('plane', 'v'), labelFor('foot', 'v')]);
ok(![...touchPlan('plane'), ...touchMore('plane')].some((b) => b.label === 'Film'), 'vliegtuig: "Film" staat nergens op de balk', [...touchPlan('plane'), ...touchMore('plane')].map((b) => b.label));
ok(labelFor('plane', 'shift') === 'Rem' && labelFor('foot', 'shift') === 'Rennen', 'vliegtuig: Shift remt op de baan in plaats van te rennen', [labelFor('plane', 'shift'), labelFor('foot', 'shift')]);
for (const l of ['Omhoog', 'Omlaag', 'Kleppen', 'Gestel', 'Roer links', 'Roer rechts']) ok(iconFor(l) !== '', `vliegtuig: "${l}" heeft een icoon`);

// --- 9. de bedrading: dezelfde hint en dezelfde vraag als het pad -------------------------
// Zonder deze twee regels zou de pure functie hierboven kloppen terwijl de echte touch.js de hint nooit doorgeeft
// of gamepad.js een eigen kopie van de vraag houdt; dan lopen de twee bedieningen alsnog uit elkaar.
const touchSrc = readFileSync(new URL('../game/js/touch.js', import.meta.url), 'utf8');
const padSrc = readFileSync(new URL('../game/js/gamepad.js', import.meta.url), 'utf8');
const logicSrc = readFileSync(new URL('../game/js/touchlogic.js', import.meta.url), 'utf8');
ok(/HENGEL_HINT/.test(touchSrc) && /hengel: hengelHint\(\)/.test(touchSrc), 'touch.js geeft de hengelhint door aan touchContext');
ok(/HENGEL_HINT/.test(padSrc), 'gamepad.js zoekt dezelfde hengelhint');
ok(HENGEL_HINT === '.ctx-row:not(.gone)[data-id="hengel-vrij"]', 'de hengelhint is de rij die prompts.js neerzet', HENGEL_HINT);
ok(/import .*coopVraag/.test(padSrc) && /import .*coopVraag/.test(logicSrc), 'gamepad en touch gebruiken dezelfde coopVraag uit controls.js');
ok(!/function coopVraag/.test(padSrc), 'gamepad.js heeft geen eigen kopie van de coopvraag meer');
ok(/'trekker'/.test(touchSrc), 'touch.js stuurt ook op de trekker met de stick (zijwaarts)');
ok(/v\.isPlane \? 'plane'/.test(logicSrc) && /v\.isPlane \? 'plane'/.test(padSrc), 'touch en gamepad zetten het vliegtuig op dezelfde plek, vóór de skûtsje-tak');
ok(/v\.isBus \? 'bus'/.test(logicSrc) && /v\.isBus \? 'bus'/.test(padSrc), 'touch en gamepad kennen allebei de busindeling');
ok(labelFor('trekker', 'x') === 'Ontkoppelen' && labelFor('pigeon', 'x') === 'Mens', 'dezelfde toets houdt per situatie zijn eigen naam', [labelFor('trekker', 'x'), labelFor('pigeon', 'x')]);

if (fail) { console.log(`${fail} van ${n} controles gefaald`); process.exit(1); }
console.log(`touch_situaties_test: ${n} controles ok`);
