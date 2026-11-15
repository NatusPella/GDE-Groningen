// #946: langere dagen en kortere nachten (zomerse daglichtcyclus). De klok
// blijft 24 uur en de kalender (zonsdeclinatie per dag) blijft zoals hij is;
// alleen de nacht is korter. Alle zonvolgers (hoogte, richting, schemering,
// straatlantaarns, muziek, berovingen) gebruiken hetzelfde zonne-uur.
//   node scripts/summerday_test.mjs
import './node3d.mjs';
const S = await import('../game/js/sunrules.js');
const D = await import('../game/js/daynight.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

// 1. het zonne-uur: middernacht en middag staan vast, de randen schuiven naar de dag
ok(S.solarHour(12) === 12, 'middag blijft 12 uur');
ok(Math.abs(S.solarHour(0)) < 1e-9 || Math.abs(S.solarHour(24) - 24) < 1e-9, 'middernacht blijft middernacht');
ok(S.solarHour(21) < 21 && S.solarHour(3) > 3, 'avond en vroege ochtend schuiven naar de dag', `${S.solarHour(21).toFixed(2)} / ${S.solarHour(3).toFixed(2)}`);
let monotone = true;
for (let h = 0; h < 23.9; h += 0.1) if (!(S.solarHour(h + 0.1) > S.solarHour(h))) monotone = false;
ok(monotone, 'het zonne-uur loopt op met de klok');

// 2. de nacht is kort, ook op de late zomerdatum (declinatie 9, eind augustus)
const dusk = (dec) => { S.setSunDeclination(dec); for (let h = 12; h < 24; h += 0.01) if (S.isNightAtHour(h)) return h; return 24; };
const dawn = (dec) => { S.setSunDeclination(dec); for (let h = 12; h > 0; h -= 0.01) if (S.isNightAtHour(h)) return h; return 0; };
const nightLen = (dec) => (24 - dusk(dec)) + dawn(dec);
for (const dec of [9, 14, 20.5]) {
  ok(dusk(dec) > 20.4 && dawn(dec) < 4, `declinatie ${dec}: avond laat, ochtend vroeg`, `${dusk(dec).toFixed(2)} - ${dawn(dec).toFixed(2)}`);
  ok(nightLen(dec) < 7.1, `declinatie ${dec}: de nacht is korter dan 7 uur`, nightLen(dec).toFixed(2));
}
// de vroege zomer (declinatie 20,5) heeft de kortste nacht, de nazomer de langste
ok(nightLen(20.5) < nightLen(14) && nightLen(14) < nightLen(9), 'de nacht groeit richting nazomer', `${nightLen(20.5).toFixed(2)} < ${nightLen(14).toFixed(2)} < ${nightLen(9).toFixed(2)}`);

// 3. de zon komt hoger dan de kale astronomische curve op hetzelfde klokuur
S.setSunDeclination(14);
const plain = (h) => {
  const lat = 53.2 * Math.PI / 180, dec = 14 * Math.PI / 180, ha = (h - 12) * 15 * Math.PI / 180;
  return Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha)) * 180 / Math.PI;
};
ok(S.sunElevationDeg(21) > plain(21) + 2, 'om 21:00 staat de zon hoger dan de kale curve', `${S.sunElevationDeg(21).toFixed(1)} > ${plain(21).toFixed(1)}`);
ok(S.sunElevationDeg(3) > plain(3) + 2, 'om 03:00 idem', `${S.sunElevationDeg(3).toFixed(1)} > ${plain(3).toFixed(1)}`);

// 4. daynight volgt hetzelfde zonne-uur: de avondzon zakt langs de eigen boog
S.setSunDeclination(14);
D.refreshDayNight({ clock: 21 });
const a = D.computeLighting(21), b = D.computeLighting(19);
ok(a.sunDir.y < b.sunDir.y, 'de avondzon zakt tussen 19:00 en 21:00', `${a.sunDir.y.toFixed(3)} < ${b.sunDir.y.toFixed(3)}`);
const dn = { clock: 20 };
D.refreshDayNight(dn);
ok(dn.dayNight.night < 0.5, 'om 20:00 is het in de zomer nog dag', String(dn.dayNight.night.toFixed(2)));
const dn3 = { clock: 3.5 };
D.refreshDayNight(dn3);
ok(dn3.dayNight.night < 0.5, 'om 03:30 is het in de zomer alweer dag', String(dn3.dayNight.night.toFixed(2)));
// middernacht is wel nacht
const dn0 = { clock: 0 };
D.refreshDayNight(dn0);
ok(dn0.dayNight.night > 0.5, 'middernacht is nacht', String(dn0.dayNight.night.toFixed(2)));

// 5. de nachtregels (straatlantaarns, muziek) hangen aan dezelfde zon
S.setSunDeclination(14);
ok(S.isNightAtHour(20) === false && S.isNightAtHour(0) === true, 'de straatlantaarnregel volgt de zomerse nacht');

console.log(`${n - fails}/${n} summerday`);
process.exit(fails ? 1 : 0);
