// PvP-interpolatievertraging (#806): is het een echt gevecht (minstens twee
// niet-passieve spelers), dan interpoleert een gast korter.  node scripts/pvpvertraging_test.mjs
import fs from 'node:fs';
import { pvpAanDeGang } from '../game/js/cooppvp.js';
import { INTERP_DELAY, PVP_INTERP_DELAY, interpDelayVoorPvp } from '../game/js/net/interp.js';
import { ClientSession } from '../game/js/net/session.js';
import { createLink, makeRng } from '../game/js/net/memtransport.js';

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
// #1298: gedrag in plaats van brontekst: een echte ClientSession geeft zijn interpDelay door aan de snapshotbuffer
const gast = new ClientSession(createLink({ latency: 0 }).b, { info: {}, caps: [] }, makeRng(1));
gast.joined = true; const gezien = []; gast.buf.advance = (dt, delay) => gezien.push(delay);
gast.tick(1 / 30); gast.interpDelay = PVP_INTERP_DELAY; gast.tick(1 / 30); gast.interpDelay = null; gast.tick(1 / 30);
ok(gezien.length === 3 && gezien[0] === INTERP_DELAY && gezien[1] === PVP_INTERP_DELAY && gezien[2] === INTERP_DELAY, 'de gastbuffer gebruikt de vertraging van de sessie, zonder vertraging de gewone', gezien);

console.log(fails ? `${fails} FAIL` : 'pvpvertraging_test ok');
process.exit(fails ? 1 : 0);
