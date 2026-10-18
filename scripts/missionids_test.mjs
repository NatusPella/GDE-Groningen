// MISSION_IDS is append-only (#215): indices zitten in saves en medaillerecords. Draai: node scripts/missionids_test.mjs
import { MISSION_IDS } from '../game/js/storyarc.js';
const FROZEN = ['berend','chaos','kei','noorderzon','ringweg','kroegentocht','fatbike','rondvaart','pinautomaat','duifverkenning','museumkraak','vetgekaapt','vlag','skutsje','traumaduif','fjord','bod','ontzet','loket','bakkiestunt','containers','dijk','graan','bruggen','wiebelwerk','stoom','beleg','luik','colonne','eieren','wierde'];
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } };
ok(MISSION_IDS.length >= FROZEN.length, 'geen id verwijderd');
FROZEN.forEach((id, i) => ok(MISSION_IDS[i] === id, `plek ${i} is ${id}, nu ${MISSION_IDS[i]}`));
ok(new Set(MISSION_IDS).size === MISSION_IDS.length, 'ids uniek');
console.log(fails ? `${fails} mislukt` : `missionids_test: ${MISSION_IDS.length} ids ok`);
process.exit(fails ? 1 : 0);
