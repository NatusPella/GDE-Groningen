// PvP-interpolatievertraging (#806): is het een echt gevecht (minstens twee
// niet-passieve spelers), dan interpoleert een gast korter.  node scripts/pvpvertraging_test.mjs
import fs from 'node:fs';
import { pvpAanDeGang } from '../game/js/cooppvp.js';
import { INTERP_DELAY, PVP_INTERP_DELAY, interpDelayVoorPvp } from '../game/js/net/interp.js';

let fails = 0;
const ok = (c, name, extra) => { if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };
const read = (rel) => fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');

ok(pvpAanDeGang(null) === false && pvpAanDeGang(undefined) === false, 'zonder PvP-stand geen gevecht');
ok(pvpAanDeGang({ actief: {} }) === false, 'niemand actief: geen gevecht');
ok(pvpAanDeGang({ actief: { 0: true } }) === false, 'één actieveling: nog geen gevecht');
ok(pvpAanDeGang({ actief: { 0: true, 1: true } }) === true, 'twee niet-passieve spelers: gevecht');
ok(pvpAanDeGang({ actief: { 0: true, 2: true, 5: true } }) === true, 'drie actievelingen: gevecht');

ok(INTERP_DELAY === 0.12 && PVP_INTERP_DELAY === 0.06, 'de vertragingen zijn 120 en 60 ms');
ok(interpDelayVoorPvp(false) === INTERP_DELAY, 'buiten PvP de gewone 120 ms');
ok(interpDelayVoorPvp(true) === PVP_INTERP_DELAY, 'in PvP de korte 60 ms');

// De koppeling zit in de code: een gast krijgt zijn vertraging uit de PvP-stand.
const coop = read('game/js/coopnet.js');
ok(/zetPvpVertraging\(world\)/.test(coop), 'tickCoopNet zet de PvP-vertraging');
ok(/pvpAanDeGang\(world\.coopPvp\)/.test(coop), 'de keuze hangt aan de echte PvP-stand');
ok(/session\.interpDelay = delay/.test(coop), 'de sessie krijgt de gekozen vertraging');
const session = read('game/js/net/session.js');
ok(/this\.interpDelay/.test(session) && /advance\(dt, this\.interpDelay \?\? INTERP_DELAY\)/.test(session), 'de gastbuffer gebruikt de vertraging');
const interp = read('game/js/net/interp.js');
ok(/PVP_INTERP_DELAY = 0\.06/.test(interp) && /interpDelayVoorPvp/.test(interp), 'de vertragingen staan in interp.js');

console.log(fails ? `${fails} FAIL` : 'pvpvertraging_test ok');
process.exit(fails ? 1 : 0);
