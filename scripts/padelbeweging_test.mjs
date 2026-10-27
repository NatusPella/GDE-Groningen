// Padel, bewegen en animeren (#502): de loopsnelheid van een personage komt uit de verplaatsing van
// die stap, niet uit de ingedrukte richting. Daardoor stopt de loopanimatie als je tegen het glas of
// de achterwand staat (de clamp houdt je tegen) en als je stil staat; en een gast in de spiegel van
// de host haalt zijn momentopname strak in zonder door zijn doel te schieten en zonder met zijn benen
// door te lopen op een snelheid die hij niet meer maakt.
//   node scripts/padelbeweging_test.mjs
import * as P from '../game/js/padelmatch.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let bad = 0, n = 0;
const check = (naam, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', naam, info); } };

const DT = 1 / 60;
const SPEED_MENS = 5.8;   // de loopsnelheid van een menselijke stoel (padelmatch.js, SPEED_MENS)
const HZ = 12;            // de host stuurt twaalf momentopnamen per seconde (multiplayerwedstrijd.js)
const MENSEN = [{ slot: 0, naam: 'Tammo', char: 'tammo' }, { slot: 1, naam: 'Tessa', char: 'anita' }];
const STIL = { mx: 0, my: 0, buttons: 0 };
const WEST = { mx: 1, my: 0, buttons: 0 };   // team 0 loopt met mx 1 naar +u, dus naar het glas aan de zijkant

// --- 1. de regel zelf -------------------------------------------------------------------------
{
  check('stilstand is snelheid 0', P.stapSnelheid(0, 0, DT) === 0);
  check('een vrije stap levert de loopsnelheid', Math.abs(P.stapSnelheid(SPEED_MENS * DT, 0, DT) - SPEED_MENS) < 1e-9);
  check('diagonaal telt de hele afstand', Math.abs(P.stapSnelheid(0.03, 0.04, 0.01) - 5) < 1e-9);
  check('zonder tijd (dt 0 of onzin) geen snelheid', P.stapSnelheid(1, 1, 0) === 0 && P.stapSnelheid(1, 1, NaN) === 0 && P.stapSnelheid(1, 1, -1) === 0);
  check('onzin in de verplaatsing geeft geen rare snelheid', Number.isFinite(P.stapSnelheid(NaN, 0, DT)));
}

// --- 2. een menselijke stoel: vrij lopen, dan tegen het glas ----------------------------------
{
  const m = P.maakPadel(MENSEN, { rng: () => 0.5 });
  m.phaseT = 1e9;                        // in de intro blijven: geen serve die de stoel vastzet
  const s = m.stoelen[0];
  const tik = (secs, invoer) => { for (let i = 0; i < Math.round(secs / DT); i++) P.tikPadel(m, DT, () => invoer); };

  tik(DT, WEST);
  check('vrij lopen: de animatie draait op loopsnelheid', Math.abs(s.speed - SPEED_MENS) < 1e-9, s.speed);
  const naEen = s.u;
  check('vrij lopen: hij schuift ook echt op', naEen > 1.5, naEen);

  tik(1, WEST);                          // doorlopen tot de clamp hem tegen het glas houdt
  check('tegen het glas staat hij stil op de rand', Math.abs(s.u - 4.65) < 1e-9, s.u);
  check('tegen het glas is de loopsnelheid 0 (de benen stoppen)', s.speed === 0, s.speed);
  const rand = s.u;
  tik(0.5, WEST);
  check('tegen het glas blijft hij op dezelfde plek', s.u === rand && s.speed === 0, `${s.u} ${s.speed}`);

  tik(DT, STIL);
  check('loslaten geeft ook snelheid 0', s.speed === 0, s.speed);
  tik(DT, { mx: -1, my: 0, buttons: 0 });
  check('van het glas af loopt hij weer', s.u < rand && Math.abs(s.speed - SPEED_MENS) < 1e-9, `${s.u} ${s.speed}`);

  // de achterwand (v) net zo: team 0 zit op v < 0 en de clamp ligt op -0.9
  tik(2, { mx: 0, my: -1, buttons: 0 });  // my -1 is vooruit, dus naar het net
  check('tegen de achterwand staat hij stil', Math.abs(s.v + 0.9) < 1e-9 && s.speed === 0, `${s.v} ${s.speed}`);
}

// --- 3. de eigen serve: je staat vast, dus de benen staan stil ---------------------------------
{
  const m = P.maakPadel(MENSEN, { rng: () => 0.5 });
  const s = m.stoelen[0];
  m.phase = 'serve'; m.serverStoel = s.i; m.phaseT = 5;
  const u0 = s.u;
  for (let i = 0; i < 30; i++) P.tikPadel(m, DT, () => WEST);
  check('tijdens je eigen serve sta je stil en loopt de animatie niet door', s.u === u0 && s.speed === 0, `${s.u} ${s.speed}`);
}

// --- 4. de spiegel van de gast: strak naar de laatste stand, zonder doorschieten ----------------
{
  const sp = P.maakPadelSpiegel({ deeln: MENSEN }, 1);
  const s = sp.stoelen[0];
  const doel = s.u + 1.2;                // de host staat stil; de gast is nog onderweg
  s.tu = doel; s.tv = s.v;
  let verste = -Infinity, eersteFout = null;
  for (let i = 0; i < 120; i++) {
    P.tikPadelSpiegel(sp, DT);
    verste = Math.max(verste, s.u);
    if (eersteFout === null && Math.abs(s.u - doel) < 0.01) eersteFout = (i + 1) * DT;
  }
  check('een gast haalt zijn doel', s.u === doel, s.u - doel);
  check('een gast schiet niet door zijn doel', verste <= doel + 1e-9, verste - doel);
  check('een gast staat stil als hij er is', s.speed === 0, s.speed);
  // 1,2 m in ruim een kwart seconde: ongeveer het tempo waarin hij ook echt rent, en geen gelei
  check('een gast is er snel (binnen 0,3 s)', eersteFout !== null && eersteFout < 0.3, eersteFout);
}

// --- 5. de gast naast een lopende host: geen glijden, wel bijblijven ---------------------------
{
  const m = P.maakPadel(MENSEN, { rng: () => 0.5 });
  m.phaseT = 1e9;
  const sp = P.maakPadelSpiegel({ deeln: MENSEN }, 1);
  const host = m.stoelen[0], gast = sp.stoelen[0];
  let seq = 0, tSnap = 0, maxFout = 0, maxSnelheidsfout = 0, overschot = -Infinity, klaarOp = null, liep = 0;

  for (let i = 0; i < 180; i++) {
    const t = i * DT, loopt = t < 0.25;
    P.tikPadel(m, DT, () => (loopt ? WEST : STIL));
    tSnap += DT;
    if (tSnap >= 1 / HZ) { tSnap = 0; P.voerInPadel(sp, P.snapPadel(m, ++seq)); }   // de momentopname van de host
    const was = gast.u;
    P.tikPadelSpiegel(sp, DT);
    // de animatiesnelheid van de gast is de verplaatsing die hij in dit beeld maakte
    maxSnelheidsfout = Math.max(maxSnelheidsfout, Math.abs(gast.speed - Math.abs(gast.u - was) / DT));
    if (loopt) { maxFout = Math.max(maxFout, Math.abs(host.u - gast.u)); if (gast.speed > 1) liep++; }
    if (t > 0.6) overschot = Math.max(overschot, gast.u - host.u);                    // de host staat al stil
    if (klaarOp === null && Math.abs(host.u - gast.u) < 0.01) klaarOp = t;
  }
  check('de gast loopt mee met de host (en blijft in de buurt)', liep > 0 && maxFout < 0.8, `${liep} ${maxFout.toFixed(3)}`);
  check('de gast haalt de laatste stand van de host in', klaarOp !== null && Math.abs(host.u - gast.u) < 1e-3, `${klaarOp} ${(host.u - gast.u).toFixed(4)}`);
  check('de gast schuift niet voorbij de plek waar de host stilstaat', overschot <= 1e-9, overschot);
  check('de gast staat stil als de host stilstaat', gast.speed === 0, gast.speed);
  check('de animatie van de gast volgt zijn eigen verplaatsing, niet de oude stand', maxSnelheidsfout < 1e-9, maxSnelheidsfout);
}

// --- 6. de solowedstrijd (padel.js) gebruikt dezelfde regel ------------------------------------
// padel.js laadt three.js van een CDN en is hier niet te importeren; deze controle bewaakt de regel
// in de bron, zodat hij niet terugvalt naar "snelheid uit de invoer".
{
  const bron = readFileSync(path.join(ROOT, 'game/js/padel.js'), 'utf8');
  check('padel.js haalt de snelheid van de speler uit zijn verplaatsing', /me\.speed = stapSnelheid\(me\.u - u0, me\.v - v0, dt\)/.test(bron));
  check('de oude snelheid uit de invoer is weg', !/me\.speed = \(mu \|\| mv\)/.test(bron));
  check('padel.js haalt de gedeelde regel uit padelmatch.js', /import \{[^}]*stapSnelheid[^}]*\} from '\.\/padelmatch\.js'/.test(bron));
  check('ook de tegenstander en je maatje lopen op hun eigen verplaatsing', /function moveTo\(a, u, v, speed, dt\) \{[\s\S]*?a\.speed = stapSnelheid\(a\.u - u0, a\.v - v0, dt\)/.test(bron));
}

console.log(bad ? `padelbeweging: ${bad} van ${n} controles mislukt` : `ok: ${n} controles`);
process.exit(bad ? 1 : 0);
