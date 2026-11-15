// Bietencampagne met vrachtwagen en oplegger (#976): de suikerbietenrit rijdt sinds deze
// wijziging met een truck en een zichtbare bietenoplegger, en de bietenhoop groeit en
// slinkt mee met laden en morsen. De module leunt op three (via de vendor-cache) en op de
// bestaande sidejobkit; deze test controleert het voertuig en de vulregel.
//   node scripts/bieten_truck_test.mjs
import './node3d.mjs';

const S = await import('../game/js/sidejob_stad.js');
// let op: properties via de namespace lezen (destructuring van deze namespace gaf in Node 24
// soms undefined terwijl S.BEET_TRUCK wel gevuld was; dat is een loader-eigenaardigheid, geen spelregel)
const BIET_TRUCK = S.BEET_TRUCK;
const BIET_TRAILER = S.BEET_TRAILER;
const bietenVulling = S.bietenVulling;
const STAD_JOBS = S.STAD_JOBS;

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ` (${info})` : ''}`); } };

// De vrachtwagen: een echte truck, geen bestelbusje
ok(BIET_TRUCK.name === 'truck', 'de bietenrit rijdt met een truckmodel', BIET_TRUCK.name);
ok(BIET_TRUCK.len >= 6.5 && BIET_TRUCK.wid >= 2.4, 'de truck is lang en breed', `${BIET_TRUCK.len}x${BIET_TRUCK.wid}`);
ok(BIET_TRUCK.maxSpeed <= 20 && BIET_TRUCK.accel <= 4 && BIET_TRUCK.turnRate <= 1.5, 'zwaar en traag: geen bestelbusgevoel');
ok(!/van/i.test(BIET_TRUCK.name), 'geen busmodel meer voor de bieten');

// De oplegger: groot genoeg voor een berg bieten en achter de truck
ok(BIET_TRAILER.len >= 7.5 && BIET_TRAILER.wid >= 2.4 && BIET_TRAILER.hoog >= 1.4, 'de oplegger is een flinke kipper', JSON.stringify(BIET_TRAILER));
ok(BIET_TRAILER.gap > 0 && BIET_TRAILER.gap < 2, 'de oplegger hangt met een kleine kier achter de truck');

// De hoop: tijdens het laden de laadstand, daarna wat er nog op de kar ligt
ok(bietenVulling('laden', 0, 100) === 0 && bietenVulling('laden', 0.5, 100) === 0.5 && bietenVulling('laden', 1, 100) === 1, 'de hoop groeit bij het laden');
ok(bietenVulling('rijden', 1, 100) === 1 && bietenVulling('rijden', 1, 45) === 0.45 && bietenVulling('rijden', 1, 0) === 0, 'de hoop slinkt als er bieten wegrollen');
ok(bietenVulling('rijden', 1, NaN) === 0 && bietenVulling('laden', -1, 0) === 0 && bietenVulling('laden', 9, 100) === 1, 'de vulstand blijft tussen 0 en 1');

// De rit hangt aan de bestaande zijmissie en heeft een eigen startpunt
const job = STAD_JOBS.find((j) => j.id === 'suikerbieten');
ok(!!job && job.id === 'suikerbieten', 'de suikerbietenrit staat in STAD_JOBS');
ok(typeof job.start === 'function' && typeof job.update === 'function' && typeof job.stop === 'function', 'de rit heeft start, update en stop');

console.log(fails ? `${fails} of ${n} failed` : `bieten_truck_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);

