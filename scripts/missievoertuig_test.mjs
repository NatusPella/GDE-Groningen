// Een voertuig van de missie is nooit autodiefstal (missievoertuig.js).
//   node scripts/missievoertuig_test.mjs
import { isMissieVoertuig, heeftVoertuigVlag, MISSIE_VOERTUIG_M } from '../game/js/missievoertuig.js';

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };
const auto = (o = {}) => ({ x: 100, y: 50, halfLen: 2.1, ...o });
const wereld = (m) => ({ mission: m });
const actief = (x = 100, y = 50) => ({ phase: 'active', marker: { x, y } });

// vlaggen
for (const vlag of ['missionCar', 'isHeroCar', 'playerOwned', 'sideJob', 'storyCar']) {
  check(`vlag ${vlag}: geen diefstal, ook zonder missie`, isMissieVoertuig(wereld(null), auto({ [vlag]: true })));
  check(`vlag ${vlag}: ook als er een bestuurder in zat`, isMissieVoertuig(wereld(null), auto({ [vlag]: true }), true));
}
check('gewone auto zonder missie: diefstal', !isMissieVoertuig(wereld(null), auto()));
check('geen wereld: geen crash, diefstal', !isMissieVoertuig(null, auto()));
check('heeftVoertuigVlag zonder vlag', !heeftVoertuigVlag(auto()));

// vangnet: bij de missiemarker, tijdens een actieve missie
check('geparkeerde auto bij de marker tijdens de missie: geen diefstal', isMissieVoertuig(wereld(actief()), auto()));
check('net binnen de straal', isMissieVoertuig(wereld(actief(100 + MISSIE_VOERTUIG_M, 50)), auto({ halfLen: 0 })));
check('te ver van de marker: diefstal', !isMissieVoertuig(wereld(actief(100 + MISSIE_VOERTUIG_M + 5, 50)), auto()));
check('missie niet actief (wacht, afkoelen): diefstal', ['idle', 'cooldown', 'armed'].every((phase) => !isMissieVoertuig(wereld({ phase, marker: { x: 100, y: 50 } }), auto())));
check('een voorbijganger reed erin: blijft diefstal', !isMissieVoertuig(wereld(actief()), auto(), true));
check('marker zonder coordinaten: diefstal', !isMissieVoertuig(wereld({ phase: 'active', marker: { x: NaN, y: 0 } }), auto()));
check('marker ontbreekt: diefstal', !isMissieVoertuig(wereld({ phase: 'active' }), auto()));

console.log(bad ? `${bad} van ${n} controles mislukt` : `ok (${n} controles)`);
process.exit(bad ? 1 : 0);
