// Bootinterieurs, pure indeling (#847): bootinterieur.js legt per bootsoort de stuurhut of roef vast in
// scheepscoördinaten. Deze test rekent na dat de indeling eindig is, binnen de romp en de roef past, op de
// juiste plek staat per soort, en dat open boten zonder roef niets krijgen. Geen three.js, geen Electron:
//   node scripts/bootinterieur_test.mjs
const B = await import('../game/js/bootinterieur.js');
const { BOAT_KINDS, boatHasCabin } = await import('../game/js/boattypes.js');

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const near = (a, b, marge = 0.15) => Math.abs(a - b) <= marge;

// Een nep-boot met het model van een BOAT_KINDS-soort. bootinterieur.js leest alleen v.model, v.id, v.isPolice,
// v.wrecked en v.sinking; voor de 3D-test komt daar de echte Vehicle bij.
let nextId = 1;
function boot(kind, extra = {}) {
  const model = BOAT_KINDS[kind];
  return { id: extra.id || nextId++, isBoat: true, model: { ...model }, ...extra };
}

// Alle getallen in een indeling moeten eindig zijn; anders komt er NaN-meetkunde in de wereld (de verhaaltest
// laat daarop falen).
function eindig(o, pad = 'indeling') {
  if (typeof o === 'number') { if (!Number.isFinite(o)) { console.log('FAIL niet-eindig', pad, o); return false; } return true; }
  if (Array.isArray(o)) { for (let i = 0; i < o.length; i++) if (!eindig(o[i], `${pad}[${i}]`)) return false; return true; }
  if (o && typeof o === 'object') { for (const k of Object.keys(o)) if (!eindig(o[k], `${pad}.${k}`)) return false; }
  return true;
}

// Past de hele inrichting binnen de romp (x, z) en, bij een dichte roef, binnen de roef (x0..x1, ±halfW) en
// tussen de vloer en het dak? Open boten hebben geen dak: daar telt alleen dat het niet onder de romp zakt.
function pastInRoef(L, label) {
  const hl = L.lengte / 2, hw = L.breedte / 2;
  const fout = [], inHull = (x, z) => x >= -hl - 1e-6 && x <= hl + 1e-6 && z >= -hw - 1e-6 && z <= hw + 1e-6;
  const inRoef = (x, z) => x >= L.x0 - 1e-6 && x <= L.x1 + 1e-6 && z >= -L.halfW - 1e-6 && z <= L.halfW + 1e-6;
  const hoog = (y) => y >= L.vloer - 0.12 && (!L.dak || y <= L.dak + 1e-6);
  check(`${label}: roef binnen de romp`, inHull(L.x0, -L.halfW) && inHull(L.x1, L.halfW) && L.halfW <= hw + 1e-6, `x ${L.x0}..${L.x1} z ±${L.halfW} romp ${L.lengte}x${L.breedte}`);
  // stuur
  const s = L.stuur;
  if (s.soort === 'wiel') {
    if (!inHull(s.x, s.z) || !inRoef(s.x, s.z)) fout.push(`stuur ${s.x},${s.z}`);
    if (!(s.r > 0.05 && s.r < 0.4)) fout.push(`stuurr ${s.r}`);
    if (s.y < L.vloer || (L.dak && s.y + s.r > L.dak + 0.02)) fout.push(`stuur y ${s.y}`);
  } else {
    if (!inHull(s.x0, s.z0) || !inHull(s.x1, s.z1) || !inRoef(s.x0, s.z0) || !inRoef(s.x1, s.z1)) fout.push('helmstok buiten de kuip');
    if (s.y0 < L.vloer || s.y1 < L.vloer) fout.push(`helmstok y ${s.y0},${s.y1}`);
  }
  for (const b of L.banken) {
    if (!inHull(b.x - b.l / 2, b.z - b.b / 2) || !inHull(b.x + b.l / 2, b.z + b.b / 2)) fout.push(`bank ${b.x},${b.z} buiten de romp`);
    if (!inRoef(b.x - b.l / 2, b.z - b.b / 2) || !inRoef(b.x + b.l / 2, b.z + b.b / 2)) fout.push(`bank ${b.x},${b.z} buiten de roef`);
    if (!hoog(b.y)) fout.push(`bank y ${b.y}`);
  }
  if (L.paneel) {
    const p = L.paneel;
    if (!inRoef(p.x - p.l / 2, p.z - p.b / 2) || !inRoef(p.x + p.l / 2, p.z + p.b / 2)) fout.push('paneel buiten de roef');
    if (!hoog(p.y) || !hoog(p.y + p.h)) fout.push(`paneel y ${p.y}`);
  }
  for (const [naam, d] of [['tafel', L.tafel], ['kombuis', L.kombuis], ['bemanningsbank', L.bemanningsbank]]) {
    if (!d) continue;
    if (!inRoef(d.x - d.l / 2, d.z - d.b / 2) || !inRoef(d.x + d.l / 2, d.z + d.b / 2)) fout.push(`${naam} buiten de roef`);
    const top = d.y + (naam === 'tafel' ? 0 : d.h || 0);
    if (!hoog(top)) fout.push(`${naam} y ${top}`);
  }
  for (const v of L.vesten) {
    if (!inHull(v.x, v.z) || !inRoef(v.x, v.z)) fout.push(`vest ${v.x},${v.z}`);
    if (!hoog(v.y)) fout.push(`vest y ${v.y}`);
  }
  check(`${label}: inrichting binnen romp en roef`, fout.length === 0, fout.join('; '));
  return fout.length === 0;
}

// --- de boten met een roef of stuurhut ----------------------------------------------------------
const MET_ROEF = ['rondvaart', 'spits', 'kempenaar', 'zeeVracht', 'zeeContainer', 'zeeTanker', 'zeeSleper', 'skutsje', 'zeilboot'];
const rijen = [];
for (const kind of MET_ROEF) {
  const v = boot(kind);
  const L = B.bootInterieur(v);
  check(`${kind}: heeft een indeling`, !!L, String(B.bootInterieurSoort(v)));
  if (!L) continue;
  check(`${kind}: eindig`, eindig(L));
  pastInRoef(L, kind);
  check(`${kind}: banken`, L.banken.length >= 2, String(L.banken.length));
  check(`${kind}: reddingsvesten`, L.vesten.length >= 2, String(L.vesten.length));
  check(`${kind}: vloer onder dak`, L.dak === 0 || L.vloer < L.dak, `${L.vloer} < ${L.dak}`);
  check(`${kind}: roef breder dan diep?`, L.halfW > 0.2, String(L.halfW));
  rijen.push({ kind, soort: L.soort, open: L.open, x0: L.x0, x1: L.x1, halfW: L.halfW, vloer: L.vloer, dak: L.dak, banken: L.banken.length });
}

// --- de roef staat per soort op de plek waar de fitter hem tekent ------------------------------
{
  const hl = (k) => BOAT_KINDS[k].len / 2;
  // sloep met roef (politie heeft er altijd een): de roef zit midden in de boot, van -0,35hl tot 0,35hl
  const politie = boot('sloep', { isPolice: true });
  const LS = B.bootInterieur(politie);
  check('sloep met roef: politie heeft een roef', !!LS);
  if (LS) {
    check('sloep met roef: midden in de boot', near((LS.x0 + LS.x1) / 2, 0, 0.05), String((LS.x0 + LS.x1) / 2));
    check('sloep met roef: 0,35 van de lengte (2 x 0,35 hl)', near(LS.x1 - LS.x0, BOAT_KINDS.sloep.len * 0.35 - 0.24, 0.05), String(LS.x1 - LS.x0));
    check('sloep met roef: dichte roef met raamband', !LS.open && LS.raam && LS.raam.y0 < LS.raam.y1, JSON.stringify(LS.raam));
    check('sloep met roef: de vloer ligt op de kast van sloepFit (0,85)', near(LS.vloer, 0.87, 0.03), String(LS.vloer));
  }
  // een gewone sloep zonder roef (hash op v.id) krijgt niets
  let zonder = null;
  for (let id = 1; id < 200 && !zonder; id++) { const v = boot('sloep', { id }); if (!boatHasCabin(v)) zonder = v; }
  check('sloep zonder roef: geen indeling', !!zonder && B.bootInterieur(zonder) === null && B.heeftBootInterieur(zonder) === false);

  // rondvaart: de kuip loopt van de skipperkruk tot de voorste stijl (rondvaartFit rx0/rx1) met de banken 0,95 uit elkaar
  const RV = B.bootInterieur(boot('rondvaart'));
  const rvl = BOAT_KINDS.rondvaart.len / 2;
  check('rondvaart: kuip van -hl+0,7 tot hl-1,35', near(RV.x0, -rvl + 0.7) && near(RV.x1, rvl - 1.35), `${RV.x0}..${RV.x1}`);
  check('rondvaart: open zijkanten met een glazen dak erboven', RV.open === true && RV.dak > 1.5 && RV.raam === null, String(RV.dak));
  check('rondvaart: stuur op -hl+1,04', near(RV.stuur.x, -rvl + 1.04), String(RV.stuur.x));
  const bankZ = Math.abs(RV.banken[0].z);
  check('rondvaart: banken op ±0,82', near(bankZ, (BOAT_KINDS.rondvaart.wid / 2 - 0.16 + 0.15) / 2), String(bankZ));

  // binnenvaart: stuurhut achterop, midden op wx = -hl+3,6 (binnenvaartFit)
  for (const kind of ['spits', 'kempenaar']) {
    const L = B.bootInterieur(boot(kind));
    const l = BOAT_KINDS[kind].len;
    const wx = -l / 2 + 3.6;
    check(`${kind}: stuurhut achterop op -hl+3,6`, near((L.x0 + L.x1) / 2, wx) && L.x1 < 0, `${(L.x0 + L.x1) / 2} tegen ${wx}`);
    check(`${kind}: raamband 1,9..2,6`, near(L.raam.y0, 1.9, 0.02) && near(L.raam.y1, 2.6, 0.02), JSON.stringify(L.raam));
    check(`${kind}: vloer op het dek`, near(L.vloer, 1.16, 0.02), String(L.vloer));
    check(`${kind}: stuurstoel op de plek van boatSeats`, near(L.banken[0].x + 0.15, wx, 0.3), String(L.banken[0].x));
  }

  // zeeschip: de brug zit op bx = -hl+2,4+lengte/2+1,4, met de glasband op by-0,45..by+0,55
  for (const kind of ['zeeVracht', 'zeeContainer', 'zeeTanker']) {
    const m = BOAT_KINDS[kind], l = m.len, hl = l / 2;
    const opbouwL = m.soort === 'tanker' ? 15 : 13;
    const bx = -hl + 2.4 + opbouwL / 2 + 1.4;
    const L = B.bootInterieur(boot(kind));
    check(`${kind}: brug op bx`, near((L.x0 + L.x1) / 2, bx), `${(L.x0 + L.x1) / 2} tegen ${bx}`);
    check(`${kind}: vloer en dak van de brug`, near(L.vloer, 9.0, 0.05) && near(L.dak, 11.16, 0.05), `${L.vloer}..${L.dak}`);
    check(`${kind}: raamband 9,75..10,65`, near(L.raam.y0, 9.75, 0.05) && near(L.raam.y1, 10.65, 0.05), JSON.stringify(L.raam));
    check(`${kind}: stuurstoel op 9,9 (boatSeats)`, near(L.banken[0].y, 9.9, 0.05), String(L.banken[0].y));
  }

  // sleper: hoge brug midscheeps op -hl*0,15+0,6
  {
    const m = BOAT_KINDS.zeeSleper, hl = m.len / 2;
    const xb = -hl * 0.15 + 0.6;
    const L = B.bootInterieur(boot('zeeSleper'));
    check('sleper: brug midscheeps', near((L.x0 + L.x1) / 2, xb), `${(L.x0 + L.x1) / 2} tegen ${xb}`);
    check('sleper: vloer en raamband', near(L.vloer, 4.3, 0.05) && near(L.raam.y0, 4.9, 0.05) && near(L.raam.y1, 5.7, 0.05), `${L.vloer} ${JSON.stringify(L.raam)}`);
  }

  // skûtsje: open kuip met de helmstok achterop en de luiken als banken
  {
    const m = BOAT_KINDS.skutsje, hl = m.len / 2;
    const L = B.bootInterieur(boot('skutsje'));
    check('skutsje: open kuip met een helmstok', L.open === true && L.stuur.soort === 'helmstok' && L.dak === 0);
    check('skutsje: helmstok achterop', near(L.stuur.x0, -hl + 0.9) && near(L.stuur.x1, -hl + 1.45), `${L.stuur.x0}..${L.stuur.x1}`);
    check('skutsje: kuip tot het voorste luik', near(L.x1, m.len * 0.21, 0.2), String(L.x1));
    check('skutsje: geen stuurwiel of paneel', L.paneel === null);
  }

  // zeilboot: open kuip met een helmstok; de gewone dinghy (met motor) krijgt niets
  {
    const Z = B.bootInterieur(boot('zeilboot'));
    check('zeilboot: open kuip met helmstok', Z.open === true && Z.stuur.soort === 'helmstok');
    check('dinghy zonder zeil: geen indeling', B.bootInterieur(boot('dinghy')) === null);
  }
}

// --- open boten zonder roef krijgen niets ------------------------------------------------------
for (const kind of ['kano', 'kajak', 'sup', 'supWit', 'waterfiets', 'rubberboot', 'dinghy', 'skiff', 'acht', 'roeiboot']) {
  const v = boot(kind);
  check(`${kind}: open boot zonder roef krijgt niets`, B.bootInterieur(v) === null && B.heeftBootInterieur(v) === false && B.bootInterieurSoort(v) === null);
}

// --- een wrak of een zinkende boot krijgt niets ------------------------------------------------
{
  const wrak = boot('rondvaart'); wrak.wrecked = true;
  const zink = boot('rondvaart'); zink.sinking = { z: -1 };
  check('wrak: geen interieur', B.heeftBootInterieur(wrak) === false && B.bootInterieur(wrak) === null);
  check('zinkende boot: geen interieur', B.heeftBootInterieur(zink) === false && B.bootInterieur(zink) === null);
}

// --- een te kleine boot: geen roef om in te richten --------------------------------------------
{
  const klein = boot('rondvaart'); klein.model = { ...klein.model, len: 1.2 };
  check('boot korter dan 1,5 m: geen indeling', B.bootInterieur(klein) === null);
}

// --- de geometriesleutel: gelijk model deelt, andere maat niet ---------------------------------
{
  const a = boot('spits'), b = boot('spits'), c = boot('kempenaar');
  check('sleutel: zelfde model, zelfde sleutel', B.bootInterieurKey(a) === B.bootInterieurKey(b) && B.bootInterieurKey(a).length > 0);
  check('sleutel: andere boot, andere sleutel', B.bootInterieurKey(a) !== B.bootInterieurKey(c));
  const pol = boot('sloep', { isPolice: true });
  check('sleutel: politieboot heeft zijn eigen roefsleutel', B.bootInterieurKey(pol).startsWith('sloepRoef|'));
  check('sleutel: open boot zonder roef heeft geen sleutel', B.bootInterieurKey(boot('kano')) === '');
  // de sleutel verandert niet als de boot vaart: hij hangt aan het model, niet aan de plek
  const vaart = boot('spits');
  const k1 = B.bootInterieurKey(vaart);
  vaart.x = 123; vaart.y = -456;
  check('sleutel: onafhankelijk van de plek', B.bootInterieurKey(vaart) === k1);
}

// --- meting: de roefmaten per soort, voor het verslag ------------------------------------------
console.log('bootinterieur: roefmaten per soort (x0..x1, halve breedte, vloer..dak, banken):');
for (const r of rijen) {
  console.log(`  ${r.kind.padEnd(13)} ${r.open ? 'open' : 'dicht'} x ${r.x0.toFixed(2)}..${r.x1.toFixed(2)}  halfW ${r.halfW.toFixed(2)}  y ${r.vloer.toFixed(2)}..${r.dak.toFixed(2)}  banken ${r.banken}`);
}

console.log(bad ? `${bad} mislukt` : 'bootinterieur_test: ok');
process.exit(bad ? 1 : 0);
