// Samen spelen: als het spel de speler verplaatst (een warp in een missie, een reisscène van het verhaal, de terugkeer na een
// mislukte missie, de finale op de Grote Markt), gaan de gasten mee (audit speelbaarheid 23-11). Daarvoor bleef een gast die J
// zei bij M11 in Zoutkamp staan terwijl de rest van de missie kilometers verderop speelde.
//
// Het patroon is dat van een gast die aansluit (coopnet.js onJoin): de lichamen van de gasten zijn figuren bij wie het spel
// opende, en die zet hij neer op een vrije plek naast de bestemming (world.coopVrij); de gast ziet zichzelf daar via de gewone
// momentopname. Er is geen nieuw netwerkbericht. Een gast die stuurt wordt eerst netjes losgemaakt (bestuurLos), een gast die
// meerijdt in het voertuig dat zelf mee verhuist blijft zitten. Bij een gast (coopRole 'client') en alleen spelen doet dit niets.
//
// Puur op de haken na: missions.js zet ze (gastLichamen en bestuurLos uit coopbestuur.js), de test vervangt ze.
// Test: scripts/groepwarp_test.mjs.

const haken = { lichamen: null, los: null, inBoot: null };
export function zetGroepWarpHaken(h) { Object.assign(haken, h || {}); }

export const WARP_RINGEN = Object.freeze([2.2, 3.4, 4.8, 6.5]);
export const WARP_MELDING = 'Je reist mee met de groep.';

// Een vrije plek rond dest voor gast nummer i (eigen hoek per gast, dan ringen naar buiten); zonder vrije plek de eerste ring.
export function plekVoor(dest, i, vrij = null) {
  const a0 = (i + 1) * 1.7;
  for (const r of WARP_RINGEN) {
    for (let k = 0; k < 8; k++) {
      const a = a0 + (k * Math.PI) / 4, x = dest.x + Math.cos(a) * r, y = dest.y + Math.sin(a) * r;
      if (!vrij || vrij(x, y)) return { x, y };
    }
  }
  return { x: dest.x + Math.cos(a0) * WARP_RINGEN[0], y: dest.y + Math.sin(a0) * WARP_RINGEN[0] };
}

// Zet elke gast van de sessie bij dest. opts.meeVoertuig: wie daarin zit reist al mee; opts.alleen(lichaam): een filter.
// Geeft het aantal verplaatste gasten terug.
export function warpGasten(world, dest, { meeVoertuig = null, alleen = null } = {}) {
  if (!world || !dest || !Number.isFinite(dest.x) || !Number.isFinite(dest.y)) return 0;
  if (world.coopRole === 'client' || typeof haken.lichamen !== 'function') return 0;
  const vrij = typeof world.coopVrij === 'function' ? (x, y) => world.coopVrij(x, y, world) : null;
  let n = 0;
  for (const [slot, l] of haken.lichamen(world) || []) {
    if (!l || !(slot >= 1)) continue;
    if (meeVoertuig && l.inVeh === meeVoertuig) continue;
    if (alleen && !alleen(l)) continue;
    if (l.coopBestuurt && typeof haken.los === 'function') haken.los(world, slot);
    l.inVeh = null; l.coopVoertuig = false; l.stoel = undefined;
    const p = plekVoor(dest, n, vrij);
    l.x = p.x; l.y = p.y; l.vx = 0; l.vy = 0; l.z = 0; l.vz = 0; l.gz = 0;
    l.water = null; l.swimming = false;
    if (typeof world.coopMeld === 'function') { try { world.coopMeld(slot, WARP_MELDING); } catch (e) { /* melding is bijzaak */ } }
    n++;
  }
  return n;
}

// De gastheer stapt in een boot die meteen wegvaart (M06: de vluchtboot bij het museum). Elke gast die nog niet in een voertuig
// zit gaat mee aan boord (coopnet.js zetInBoot: dezelfde stoelen als bij de band). Is de boot vol, dan haalt de band hem later bij.
// Geeft het aantal gasten dat meeging.
const BOOT_MELDING = 'Je zit mee in de boot.';
export function gastenMeeAanBoord(world) {
  if (!world || world.coopRole === 'client' || typeof haken.lichamen !== 'function' || typeof haken.inBoot !== 'function') return 0;
  let n = 0;
  for (const [slot, l] of haken.lichamen(world) || []) {
    if (!l || !(slot >= 1) || l.inVeh) continue;
    if (!haken.inBoot(world, l)) continue;
    if (typeof world.coopMeld === 'function') { try { world.coopMeld(slot, BOOT_MELDING); } catch (e) { /* bijzaak */ } }
    n++;
  }
  return n;
}
