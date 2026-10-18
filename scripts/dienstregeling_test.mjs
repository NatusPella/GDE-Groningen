// Dienstregeling, vertrekbord, spoorbomen en omroep (dienstregeling.js, #198). Puur, geen browser.
//   node scripts/dienstregeling_test.mjs
import fs from 'node:fs';
import * as D from '../game/js/dienstregeling.js';

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

// synthetische lijn: drie stations
const lijn = { name: 'Stoptrein Test', stops: [{ name: 'Alpha', s: 0 }, { name: 'Beta', s: 12000 }, { name: 'Gamma', s: 30000 }] };
const rt = D.rijtijden(lijn);
check('rijtijden lopen op', rt[1].aan > rt[0].weg && rt[2].aan > rt[1].weg);
check('12 km duurt rijtijd', Math.abs(rt[1].aan - rt[0].weg - 12000 / D.RIJ.speed) < 1e-9);
check('eindstation heeft geen oponthoud', rt[2].aan === rt[2].weg && rt[2].laatste);
check('terugrichting begint bij het eind', D.rijtijden(lijn, -1)[0].name === 'Gamma');

check('frequentie: spits, dal, laat', D.frequentie(8) === D.RIJ.freqPiek && D.frequentie(12) === D.RIJ.freqDal && D.frequentie(22) === D.RIJ.freqLaat);
const ritA = D.ritten(lijn, 1);
check('ritten beginnen na het eerste uur en eindigen voor het laatste', ritA[0].start >= D.RIJ.eerste * 3600 && ritA.at(-1).start <= D.RIJ.laatste * 3600);
check('ritten oplopend met kleinere tussentijd in de spits', ritA.every((r, i) => i === 0 || r.start > ritA[i - 1].start) && ritA.length > 40);
check('richtingen staan niet gelijk', D.ritten(lijn, -1)[0].start !== ritA[0].start);

// vertraging: klein, deterministisch, meestal nul
let nul = 0, tot = 0, max = 0;
for (let dag = 1; dag <= 40; dag++) for (const r of ritA) { const v = D.vertraging(lijn, r, dag); tot++; if (v === 0) nul++; max = Math.max(max, v); }
check('meestal op tijd', nul / tot > 0.7 && nul / tot < 0.9, nul / tot);
check('nooit meer dan 6 minuten', max <= 360);
check('vertraging deterministisch', D.vertraging(lijn, ritA[3], 5) === D.vertraging(lijn, ritA[3], 5));
check('reden zonder leed', D.VERTRAGING_REDENEN.every((s) => !/dood|gewond|slachtoffer|ongeluk|zelfmoord/i.test(s)));

// spoor
check('spoor 1..4 en richtingen verschillend', [1, -1].every((d) => { const s = D.spoor('Beta', lijn, d); return s >= 1 && s <= 4; }) && D.spoor('Beta', lijn, 1) !== D.spoor('Beta', lijn, -1));

// bord
const nu = 8 * 3600;
const bord = D.vertrekBord([lijn], 'Beta', nu, 3);
check('bord toont zes treinen op volgorde van tijd', bord.length === 6 && bord.every((r, i) => i === 0 || r.tijd >= bord[i - 1].tijd));
check('bord begint bij nu (hooguit een minuut terug)', bord[0].tijd >= nu - 60);
check('bord heeft beide richtingen', new Set(bord.map((r) => r.richting)).size === 2);
check('eindstation: geen vertrek van eindpunt zelf in zijn richting', D.vertrekBord([lijn], 'Gamma', nu, 3).every((r) => r.richting === 'Alpha'));
check('onbekend station geeft leeg bord', D.vertrekBord([lijn], 'Nergens', nu, 3).length === 0);
check('s nachts begint de dag opnieuw met de eerste trein', D.vertrekBord([lijn], 'Alpha', 2 * 3600, 3)[0].tijd >= D.RIJ.eerste * 3600);
check('tijdlabel', D.tijdLabel(8 * 3600 + 5 * 60 + 59) === '08:05' && D.tijdLabel(86400 + 60) === '00:01');

// omroep
const r0 = { ...bord[0], vertraging: 0, plan: bord[0].tijd };
check('omroep nu', /vertrekt nu/.test(D.omroep(r0, r0.tijd)));
check('omroep klaar', /staat klaar/.test(D.omroep(r0, r0.tijd - 60)));
check('omroep later noemt tijd en spoor', D.omroep(r0, r0.tijd - 1000).includes(D.tijdLabel(r0.tijd)) && D.omroep(r0, r0.tijd - 1000).includes(`spoor ${r0.spoor}`));
const laat = { ...r0, vertraging: 180, reden: 'Wachten op een tegenligger' };
check('omroep vertraging noemt minuten en reden', /3 minuten/.test(D.omroep(laat, r0.tijd - 500)) && /tegenligger/.test(D.omroep(laat, 0)));
check('omroep noemt verzonnen vervoerder', D.omroep(r0, 0).includes(D.VERVOERDER) && D.VERVOERDER === 'Noorderspoor');

// perron
check('drukker in de spits dan s nachts', D.perronDrukte(3, 8, 120) > D.perronDrukte(3, 2, 120));
check('drukker vlak voor vertrek', D.perronDrukte(3, 12, 60) >= D.perronDrukte(3, 12, 900));
check('drukte binnen grenzen', [0, 1, 4, 9].every((l) => { const p = D.perronDrukte(l, 8, 30); return Number.isInteger(p) && p >= 0 && p <= 14; }));

// spoorbomen
const t0 = 10000;
check('boom open ver voor de trein', D.boomStand([t0], t0 - D.BOOM.voor - 1).dicht === 0);
check('boom dicht vlak voor de trein', D.boomStand([t0], t0 - 5).dicht === 1 && D.boomStand([t0], t0 - 5).sein === 'rood');
check('boom sluit geleidelijk', (() => { const x = D.boomStand([t0], t0 - D.BOOM.voor + 2).dicht; return x > 0 && x < 1; })());
check('boom blijft dicht tot kort na de trein, dan open', D.boomStand([t0], t0 + 3).dicht === 1 && D.boomStand([t0], t0 + D.BOOM.na + D.BOOM.dicht + 1).dicht === 0);
check('twee treinen vlak na elkaar: boom blijft dicht', D.boomStand([t0, t0 + 20], t0 + 12).dicht === 1);
check('bel gaat samen met de boom', D.boomStand([t0], t0).bel && !D.boomStand([t0], t0 - 100).bel);
const door = D.doorgangenOverweg(lijn, 6000, 3);
check('doorgangen over een overweg: beide richtingen, oplopend', door.length > 80 && door.every((t, i) => i === 0 || t >= door[i - 1]));
check('overweg buiten de lijn geeft niets', D.doorgangenOverweg(lijn, 99999, 3).length === 0);
const mid = door.find((t) => t > 9 * 3600);
check('boom is dicht als er om 9 uur een trein komt', D.boomStand(door, mid - 3).dicht === 1);

// echte lijnen uit citymap.json (4 stoplijnen; de rest komt uit de provinciedata)
const map = JSON.parse(fs.readFileSync(new URL('../game/citymap.json', import.meta.url), 'utf8'));
const echte = (map.railRoutes || []).filter((r) => r.stops && r.stops.length >= 2);
check('citymap heeft spoorlijnen met stations', echte.length >= 1);
for (const r of echte) {
  const steden = r.stops.map((s) => s.name);
  check(`${r.name}: unieke stationsnamen en oplopende afstand`, new Set(steden).size === steden.length && r.stops.every((s, i, a) => i === 0 || s.s >= a[i - 1].s));
  const dagBord = D.vertrekBord([r], r.stops[0].name, 9 * 3600, 5, { aantal: 3 });
  check(`${r.name}: bord vanaf het beginstation`, dagBord.length === 3 && dagBord.every((x) => x.richting === r.stops[r.stops.length - 1].name));
  const tot = D.rijtijden(r).at(-1).aan;
  check(`${r.name}: totale rijtijd plausibel (1..120 min)`, tot > 60 && tot < 7200, tot);
}

console.log(bad ? `${bad} van ${n} mislukt` : `dienstregeling_test ok (${n} checks)`);
process.exit(bad ? 1 : 0);
