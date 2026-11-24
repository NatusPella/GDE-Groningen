// Boten staan alleen waar dat logisch is (boot-spawn 21-11), gemeten op de echte provinciewereld: de audit als regressietest.
// 0 boten op water onder de minimale breedte, 0 op een sloot of vijver, 0 buiten een kade, steiger of vaarweg; de AI-spawn over
// 20 seeds geeft alleen geldige plekken, zonder NaN, deterministisch per seed, en een spawnkeuze kost < 1 ms.
//   node scripts/boot_spawn_test.mjs        (zonder game/world met de provincielaag: SKIP)
import { maakAudit, samenvatting, seeded } from './lib/bootaudit.mjs';

const A = await maakAudit();
if (!A) { console.log('SKIP boot_spawn_test: geen game/world met de provincielaag'); process.exit(0); }

let n = 0, fails = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${naam}${info ? ' (' + info + ')' : ''}`); } };

const race = await A.alle.race();
const missie = await A.alle.missie();
const vast = [...await A.alle.marina(), ...await A.alle.verhuur(), ...await A.alle.bijbaan(), ...race, ...missie];
const ps = samenvatting(vast);
ok(vast.length > 50, 'de vaste plekken zijn gemeten', String(vast.length));
for (const [c, s] of Object.entries(ps)) ok(s.fout === 0, `${c}: geen boot buiten kade, steiger of vaarweg`, s.voorbeelden.join('; '));
ok(vast.every((r) => r.reden !== 'sloot' && r.reden !== 'vijver' && r.reden !== 'smal'), 'geen vaste boot op een sloot, vijver of te smal water');

// de wedstrijdboten (#1083): regatta op de Hoornse Plas, skutsjerace en bruggenrace staan op een vaarweg of open water
ok(race.length >= 15 && race.every((r) => r.reden !== 'overgeslagen'), 'de wedstrijdplekken zijn gemeten', String(race.length));
ok(race.some((r) => r.naam.startsWith('regatta plas')) && race.some((r) => r.naam.startsWith('skutsje')) && race.some((r) => r.naam.startsWith('bruggenrace')), 'regatta, skutsje en bruggenrace zitten er allemaal in');

// de missieboten van akte 2 en 4 (#1083): ook die moeten op geldige plekken staan
ok(missie.length >= 2 && missie.every((r) => r.reden !== 'overgeslagen'), 'de missieboten zijn gemeten', String(missie.length));

// AI over 20 seeds op 12 plekken
const ai = await A.alle.ai({ seeds: 20, posities: 12 });
const pa = samenvatting(ai).ai;
ok(ai.length > 100, 'de AI spawnt boten', String(ai.length));
ok(pa.fout === 0, 'AI-boten alleen op geldige plekken (20 seeds)', pa.voorbeelden.join('; '));
ok(ai.every((r) => Number.isFinite(r.x) && Number.isFinite(r.y) && Number.isFinite(r.breedte)), 'geen NaN in de AI-plekken');
ok(ai.every((r) => r.breedte >= A.B.breedteVan(r.klasse)), 'elke AI-boot ligt op water van minstens zijn minimale breedte');

// determinisme: dezelfde seed, dezelfde plekken
const eerste = (await A.alle.ai({ seeds: 2, posities: 4 })).map((r) => `${r.x},${r.y}`).join('|');
const tweede = (await A.alle.ai({ seeds: 2, posities: 4 })).map((r) => `${r.x},${r.y}`).join('|');
ok(eerste.length > 0 && eerste === tweede, 'zelfde seed, zelfde plekken (Samen spelen: de wereld van de host bepaalt)');

// de decorboten op de maren: elke kandidaat is een sloot, dus de poort laat ze vervallen
const sier = await A.alle.sier({ n: 100 });
ok(sier.filter((r) => r.vervallen).length >= 90, 'de maar-decorboten vervallen (geen boot op een sloot)', String(sier.filter((r) => r.vervallen).length));

// prestaties: een spawnkeuze (de regel voor een kandidaat) < 1 ms, koud en gecachet
const rnd = seeded(5), b = A.W.net.nodes.filter((x) => x.type === 'haven')[3];
await A.W.laadRond(b.x, b.y, 500);
let t0 = performance.now();
for (let i = 0; i < 400; i++) A.B.isBoatSpotValid(A.map, b.x + (rnd() - 0.5) * 300, b.y + (rnd() - 0.5) * 300, 'sloep');
const koud = (performance.now() - t0) / 400;
ok(koud < 1, `isBoatSpotValid koud < 1 ms: ${koud.toFixed(3)} ms`);

console.log(`boot_spawn: ${n - fails}/${n} checks passed (vast ${vast.length}, AI ${ai.length})`);
process.exit(fails ? 1 : 0);
