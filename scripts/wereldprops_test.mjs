// De wereldprops van 27-10 (#502): geen boom of hooibaal op de verharding, geen wegmarkering
// in het water en een woonboot die op het waterpeil ligt.
//
//   1. propclear.js: één regel voor alle props die los op de grond staan — de voetafdruk van
//      de soort plus PROP_MARGE (0,15 m, de rand die treeclear.js en de wereldcontrole al
//      eisen) van elke verharding, ook die van de tegels (provinceworld.js realBlockedAt).
//      Een bosrand die over een weg valt levert zo geen boom op het asfalt, en een baal
//      blijft van een gevel in de fietsstraat af.
//   2. waterlevels.js verfBovenWater + roadsurface.js verfBovenWaterIndices: verf onder het
//      waterpeil van die plek (een brug, een duiker, een polderweg onder het peil) valt weg.
//   3. waterlevels.js woonbootY: de romp ligt WOONBOOT_DIEPTE onder de waterspiegel van het
//      water waarin hij ligt, dus hij zakt mee met een meer met een eigen peil.
//
//   node scripts/wereldprops_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = await import('../game/js/propclear.js');
const W = await import('../game/js/waterlevels.js');
const PW = await import('../game/js/provinceworld.js');
const G = await import('../game/js/gdt.js');
const RS = await import('../game/js/roadsurface.js');

let n = 0;
const ok = (c, m) => { n++; assert.ok(c, m); };
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

// ---------------------------------------------------------------- 1. verharding
// Een weg langs de x-as, 6 m breed: de rand ligt op y = 3. De hash-weg (polderweg) is hier
// niet aan de hand: alles komt van de tegels, zoals buiten de stad.
const wegRand = 3;
const gapVrij = (x, y, reach) => Math.min(reach, Math.abs(y) - wegRand);
const geenTegels = () => false;
const KROON = 1.2; // countryside.js ROAD_CLEAR.tree: de kroon van een boom
const BAAL = 1.0; // ROAD_CLEAR.bale

// Een bosrand die over de weg valt: bomen op een raster van 2,5 m, de rand van het bos
// ligt op y = 2 (midden over de rijbaan). Alleen wat de regel goedkeurt, komt in de wereld.
const bomen = [];
for (let x = -20; x <= 20; x += 2.5) for (let y = -12.5; y <= 2; y += 2.5) if (P.propVrij(x, y, KROON, { gap: gapVrij, blocked: geenTegels })) bomen.push([x, y]);
ok(bomen.length > 10, `de bomen buiten de weg blijven staan (${bomen.length})`);
ok(bomen.every(([, y]) => Math.abs(y) - wegRand >= KROON + P.PROP_MARGE), 'geen boom van de bosrand op de verharding');
ok(!P.propVrij(0, 2.4, KROON, { gap: gapVrij, blocked: geenTegels }), 'een boom midden op de rijbaan valt af');
ok(!P.propVrij(0, 3 + KROON, KROON, { gap: gapVrij, blocked: geenTegels }), 'een boom op de rand van de rijbaan valt af');
ok(P.propVrij(0, 3 + KROON + P.PROP_MARGE, KROON, { gap: gapVrij, blocked: geenTegels }), 'een boom net naast de rand blijft');

// De hooibalen van een erf naast een provinciale weg: dezelfde regel, en de tegels doen mee
// (provinceworld.js realBlockedAt, precies zoals initProvince het aan countryedge geeft).
const [ti, tj] = G.tileIndexOf(0, 0);
const sleutel = G.tileKey(ti, tj);
const weg = { cat: 'normal', width: 6, pts: [[-80, 0], [80, 0]], bounds: [-80, -3, 80, 3] };
const gevel = { type: 'house', pts: [[10, 8], [18, 8], [18, 16], [10, 16], [10, 8]], bounds: [10, 8, 18, 16] };
const tegelMap = {
  resident: new Set([`${ti},${tj}`]),
  roadsNear: (x, y, r) => (Math.abs(y) <= r + 3 ? [weg] : []),
  buildingsNear: (x, y, r) => (x > 10 - r - 8 && x < 18 + r + 8 && y > 8 - r - 8 && y < 16 + r + 8 ? [gevel] : []),
  waterNear: () => [],
  railNear: () => [],
};
const isTegel = (k) => (k === sleutel ? { flags: 1 } : null);
const tegels = (x, y, m) => PW.realBlockedAt(tegelMap, isTegel, x, y, m);
const baalVrij = (x, y) => P.propVrij(x, y, BAAL, { gap: () => 99, blocked: tegels });

ok(!baalVrij(0, 3 + BAAL), 'een hooibaal op de rand van de rijbaan valt af');
ok(baalVrij(0, 3 + BAAL + P.PROP_MARGE + 0.01), 'een hooibaal naast de weg blijft');
ok(!baalVrij(9.5, 12), 'een hooibaal tegen een gevel valt af');
ok(baalVrij(6.5, 12), 'een hooibaal op het erf blijft');
// De balenrij van een erf (countryplan.js baleStack) staat op dezelfde regel: geen enkele
// baal van de rij komt op de verharding uit.
const rij = [];
for (let k = 0; k < 8; k++) for (let y = 3; y <= 6; y += 0.5) if (baalVrij(-5 + k * 1.3, y)) rij.push([-5 + k * 1.3, y]);
ok(rij.every(([, y]) => y - wegRand >= BAAL + P.PROP_MARGE), 'geen hooibaal van de rij op de verharding');

// De regel staat ook echt in de bouw van het landschap: countryside.js pusht elke prop door
// propclear.js, niet meer langs de eigen tabel.
const land = src('game/js/countryside.js');
ok(/import \{ propVrij \} from '\.\/propclear\.js'/.test(land), 'countryside.js gebruikt de ene regel');
ok(/propVrijHier\(x, y, type\)/.test(land), 'elke prop van countryside.js gaat door propVrij');

// ---------------------------------------------------------------- 2. markering
const meer = { kind: 'meer', name: 'Lauwersmeer', lv: W.BOEZEM_Y + 1.3, pts: [[-200, -200], [200, -200], [200, 200], [-200, 200], [-200, -200]] };
const metMeer = { waterNear: (x, y, r) => [-200 < x - r && x + r < 200 ? meer : null].filter(Boolean) };
ok(W.waterSurfaceAt(metMeer, 0, 0) === meer.lv, 'het peil van het meer is de waterspiegel');

// De markering volgt het wegdek (pos: x, hoogte, y). Een streep die in het water zakt en een
// die op het dek ligt: alleen de tweede blijft over.
const pos = [0, -1.5, 0, 1, -1.5, 0, 2, -1.5, 0, 10, 4.5, 0, 11, 4.5, 0, 12, 4.5, 0];
const idx = [0, 1, 2, 3, 4, 5];
const gehouden = RS.verfBovenWaterIndices(metMeer, pos, idx);
ok(gehouden.length === 3 && gehouden.every((i) => i >= 3), `de verf onder het peil valt weg (${JSON.stringify(gehouden)})`);
ok(!W.verfBovenWater(metMeer, 0, 0, meer.lv - 0.01), 'een punt net onder het peil is water');
ok(W.verfBovenWater(metMeer, 0, 0, meer.lv + 0.05), 'een punt erboven is verharding');
// Op de boezem (geen eigen peil) blijft de verf van een weg op straatniveau staan.
const boezem = { waterNear: () => [] };
ok(RS.verfBovenWaterIndices(boezem, pos, idx).length === idx.length, 'zonder hoger water blijft alle verf');
ok(!W.verfBovenWater(boezem, 0, 0, W.BOEZEM_Y - 0.01), 'onder de boezem is het water');
ok(W.verfBovenWater(boezem, 0, 0, 0), 'op straatniveau is het verharding');
// De bouw van de markering gebruikt de regel (roadsurface.js markingGeometry).
const oppervlak = src('game/js/roadsurface.js');
ok(/verfBovenWaterUit\(M\)/.test(oppervlak), 'de markering gaat door de waterregel');

// ---------------------------------------------------------------- 3. woonboot
const bootOpBoezem = W.woonbootY(boezem, 0, 0);
ok(Math.abs(bootOpBoezem - (W.BOEZEM_Y - W.WOONBOOT_DIEPTE)) < 1e-9, `op de boezem: ${bootOpBoezem}`);
ok(Math.abs(W.woonbootY(metMeer, 0, 0) - (meer.lv - W.WOONBOOT_DIEPTE)) < 1e-9, 'op het meer ligt de romp op het peil van het meer');
// Het peil zakt 30 cm: de woonboot zakt precies mee in plaats van te blijven hangen.
const lager = { waterNear: () => [{ kind: 'meer', name: 'Lauwersmeer', lv: meer.lv - 0.3, pts: meer.pts }] };
ok(Math.abs(W.woonbootY(metMeer, 0, 0) - W.woonbootY(lager, 0, 0) - 0.3) < 1e-9, 'de woonboot zakt mee met het peil');
ok(W.woonbootY(metMeer, 0, 0) > W.woonbootY(boezem, 0, 0), 'op hoger water ligt hij hoger, niet in de lucht');
// De gebouwenbouw vraagt de hoogte per plek (models3d_buildings.js houseboatBaseY).
const gebouw = src('game/js/models3d_buildings.js');
ok(/houseboatBaseY\(b\)/.test(gebouw) && /woonbootY\(map/.test(gebouw), 'een woonboot van een tegel vraagt zijn hoogte aan het waterpeil');

console.log(`wereldprops_test: ${n} checks ok (props ${P.PROP_MARGE} m van de rand, verf boven ${meer.lv.toFixed(2)}, woonboot ${bootOpBoezem.toFixed(2)} op de boezem)`);
