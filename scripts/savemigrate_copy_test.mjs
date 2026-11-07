// #655: een save die al op de nieuwste versie staat wordt niet meer gediepcopieerd.
// node scripts/savemigrate_copy_test.mjs
import { runMigrations } from '../game/js/savemigrate.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const migrations = { 1: (d) => ({ ...d, oud: true }) };
// al bij: dezelfde objectidentiteit terug, geen stappen, geen deep copy
const now = { v: 3, data: { x: 1 } };
const same = runMigrations(now, migrations, 3);
ok(same && same.data === now, 'huidige save: hetzelfde object terug (geen deep copy)');
ok(same && same.steps.length === 0 && same.from === 3, 'huidige save: geen migratiestappen');
// ouder: wel op een kopie, met de stappen
const oud = { v: 1, data: { x: 1 } };
const mig = runMigrations(oud, migrations, 3);
ok(mig && mig.data !== oud && mig.data.v === 3, 'oudere save: gemigreerd op een kopie');
ok(mig && mig.steps.join() === '1->2,2->3', 'de stappen staan erbij', mig && mig.steps.join());
ok(oud.v === 1, 'de invoer blijft ongemoeid');
ok(runMigrations({ v: 4 }, migrations, 3) === null, 'nieuwere save wordt niet gemigreerd');
ok(runMigrations(null, migrations, 3) === null, 'geen object: niets');
console.log(`#655 meting: huidige save -> 0 deep copies (was altijd JSON.parse(JSON.stringify)), oudere save migreert nog`);
console.log(`${n - fails}/${n} savemigratecopy`);
process.exit(fails ? 1 : 0);
