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

// echte lijnen uit stad.json (4 stoplijnen; de rest komt uit de provinciedata)
const { loadStadData } = await import('./lib/loadworld.mjs');
const map = await loadStadData();
const echte = (map.railRoutes || []).filter((r) => r.stops && r.stops.length >= 2);
check('stad.json heeft spoorlijnen met stations', echte.length >= 1);
for (const r of echte) {
  const steden = r.stops.map((s) => s.name);
  check(`${r.name}: unieke stationsnamen en oplopende afstand`, new Set(steden).size === steden.length && r.stops.every((s, i, a) => i === 0 || s.s >= a[i - 1].s));
  const dagBord = D.vertrekBord([r], r.stops[0].name, 9 * 3600, 5, { aantal: 3 });
  check(`${r.name}: bord vanaf het beginstation`, dagBord.length === 3 && dagBord.every((x) => x.richting === r.stops[r.stops.length - 1].name));
  const tot = D.rijtijden(r).at(-1).aan;
  check(`${r.name}: totale rijtijd plausibel (1..120 min)`, tot > 60 && tot < 7200, tot);
}


// --- het bord uit de echte treinen (bordUitTreinen)
{
  const route = { name: 'Testlijn', stops: [{ name: 'A', s: 0 }, { name: 'B', s: 10000 }, { name: 'C', s: 20000 }] };
  const trein = (o) => ({ route, c: 0, dir: 1, v: 0, state: 'dwell', target: 0, timer: 0, vmax: 20, ...o });
  const nu = 8 * 3600;
  // wachtend in B: vertrekt over de timer, aankomst nu, richting C
  const a = D.bordUitTreinen([trein({ c: 10000, target: 1, timer: 20 })], 'B', nu, { schaal: 1 });
  check('trein die staat te wachten: vertrek over de timer', a.length >= 1 && a[0].tijd === nu + 20 && a[0].aankomst === nu && a[0].richting === 'C' && a[0].echt);
  // onderweg naar B over 5000 m bij 16 m/s: ~312 s, plus 25 s oponthoud
  const b = D.bordUitTreinen([trein({ c: 5000, target: 1, state: 'run', v: 18 })], 'B', nu, { schaal: 1 });
  check('trein onderweg: aankomst uit afstand', Math.abs(b[0].aankomst - (nu + 5000 / 16)) < 1 && Math.abs(b[0].tijd - b[0].aankomst - 25) < 1);
  // een station vóór de trein (A ligt achter hem): pas na keren aan het eind
  const c = D.bordUitTreinen([trein({ c: 15000, target: 2, state: 'run' })], 'A', nu, { schaal: 1 });
  check('station achter de trein: eerst keren aan het eindstation', c.length >= 1 && c[0].aankomst > nu + (5000 + 20000) / 16 && c[0].richting === 'C');
  // spelklok: schaal 60 maakt van 1 echte seconde een spelminuut
  const d = D.bordUitTreinen([trein({ c: 10000, target: 1, timer: 20 })], 'B', nu, { schaal: 60 });
  check('schaal zet echte om in spelklokseconden', d[0].tijd === nu + 1200);
  check('speler- en parkeerstand tellen niet mee', D.bordUitTreinen([trein({ state: 'player' }), trein({ state: 'parked' })], 'B', nu).length === 0);
  check('onbekend station geeft niets', D.bordUitTreinen([trein()], 'Z', nu).length === 0);
  const e = D.bordUitTreinen([trein({ c: 20000, target: 2, timer: 10 })], 'B', nu, { schaal: 1 });
  check('vanaf het eindstation gaat hij terug naar A', e[0].richting === 'A' && e[0].dir === -1);
  check('bord is gesorteerd', (() => { const r = D.bordUitTreinen([trein({ c: 5000, target: 1, state: 'run' }), trein({ c: 10000, target: 1, timer: 5 })], 'B', nu, { schaal: 1 }); return r.every((x, i) => i === 0 || x.tijd >= r[i - 1].tijd); })());
}
// --- het rooster van de machinist (#492): vast per lijn, richting en speldag
{
  const dag = 7;
  const rood = D.roosterVoor(lijn, 1, dag);
  const nog = D.roosterVoor(lijn, 1, dag);
  check('rooster: alle ritten van de dag', rood.length === D.ritten(lijn, 1).length && rood.length > 40);
  check('rooster: dezelfde dag geeft dezelfde dienst', JSON.stringify(rood) === JSON.stringify(nog));
  check('rooster: halten in rijrichting met oplopende tijden', rood.every((d) => d.halten.length === lijn.stops.length && d.halten.every((h, i, a) => i === 0 || h.aan >= a[i - 1].weg)));
  check('rooster: de halten zijn de halten van de lijn', rood[0].halten.map((h) => h.name).join() === 'Alpha,Beta,Gamma' && rood[0].van === 'Alpha' && rood[0].naar === 'Gamma');
  check('rooster: de terugrichting begint bij het eind', D.roosterVoor(lijn, -1, dag)[0].halten[0].name === 'Gamma' && D.roosterVoor(lijn, -1, dag)[0].naar === 'Alpha');
  check('rooster: een andere dag geeft een ander rooster', JSON.stringify(rood) !== JSON.stringify(D.roosterVoor(lijn, 1, dag + 1)));

  // de dienst op een halte: de eerstvolgende vanaf de klok, dezelfde keuze bij dezelfde klok
  const nu = 8 * 3600;
  const eersteDienst = D.dienstVoor(lijn, 1, dag);
  check('dienst: zonder klok de eerste dienst van de dag', !!eersteDienst && eersteDienst.k === 0 && eersteDienst.start === rood[0].start && eersteDienst.vertrek === rood[0].halten[0].weg);
  const a = D.dienstVoor(lijn, 1, dag, nu, { vanaf: 'Beta' });
  const b = D.dienstVoor(lijn, 1, dag, nu, { vanaf: 'Beta' });
  check('dienst: dezelfde klok geeft dezelfde dienst', !!a && a.k === b.k && a.vertrek === b.vertrek);
  check('dienst: vertrekt vanaf de halte op of na nu', a.vertrek >= nu - 60 && a.lijn === 'Stoptrein Test' && a.naar === 'Gamma' && a.vanaf === 'Beta');
  check('dienst: de halten van de dienst zijn de halten van de lijn', a.halten.map((h) => h.name).join() === 'Alpha,Beta,Gamma');
  // een gemiste dienst: de volgende is kiesbaar
  const later = D.dienstVoor(lijn, 1, dag, a.vertrek + 300, { vanaf: 'Beta' });
  check('dienst: na een gemiste dienst komt de volgende', !!later && later.k > a.k && later.vertrek > a.vertrek);
  // de dag is op: geen dienst meer (de machinist rijdt dan zonder rooster)
  const laatsteBeta = D.roosterVoor(lijn, 1, dag).at(-1).halten[1].weg;
  check('dienst: na de laatste trein niets', D.dienstVoor(lijn, 1, dag, laatsteBeta + 61, { vanaf: 'Beta' }) === null);
  check('dienst: onbekende halte geeft niets', D.dienstVoor(lijn, 1, dag, nu, { vanaf: 'Nergens' }) === null);
  // beide richtingen: de terugrichting is een eigen dienst met eigen tijden
  const terug = D.dienstVoor(lijn, -1, dag, nu, { vanaf: 'Beta' });
  check('dienst: de terugrichting rijdt naar Alpha', terug.naar === 'Alpha' && terug.dir === -1 && terug.vertrek !== a.vertrek);

  // de roostertijd op de trein: tussen twee halten lineair
  const d0 = D.roosterVoor(lijn, 1, 1)[0];
  check('roostertijd op de halte', Math.abs(D.roostertijdOp(d0, 12000, 1) - d0.halten[1].weg) < 1e-6);
  const half = D.roostertijdOp(d0, 6000, 1);
  check('roostertijd tussen twee halten', half > d0.halten[0].weg && half < d0.halten[1].aan);
  check('roostertijd voor het begin en na het eind', D.roostertijdOp(d0, -500, 1) === d0.halten[0].weg && D.roostertijdOp(d0, 99999, 1) === d0.halten.at(-1).aan);
  check('roostertijd zonder dienst', D.roostertijdOp(null, 0) === null);

  // de instaphalte: de halte waar de trein staat of net weg is
  check('instaphalte op de halte', D.instapHalte(lijn, 12000, 1).name === 'Beta');
  check('instaphalte net voorbij de halte', D.instapHalte(lijn, 12300, 1).name === 'Beta');
  check('instaphalte tussen twee halten per richting', D.instapHalte(lijn, 20000, 1).name === 'Beta' && D.instapHalte(lijn, 20000, -1).name === 'Gamma');
  check('instaphalte zonder halten', D.instapHalte({ stops: [] }, 0, 1) === null);

  // een lange lijn: de dichtstbijzijnde halte achter de trein, niet het begin van de lijn
  const vijf = { name: 'Vijflijn', stops: [{ name: 'A', s: 0 }, { name: 'B', s: 10000 }, { name: 'C', s: 20000 }, { name: 'D', s: 30000 }, { name: 'E', s: 40000 }] };
  check('instaphalte +1 kiest de dichtstbijzijnde halte achter', D.instapHalte(vijf, 15000, 1).name === 'B');
  check('instaphalte -1 kiest de dichtstbijzijnde halte achter', D.instapHalte(vijf, 15000, -1).name === 'C');
  check('instaphalte -1 voor de eerste halte kiest de eerstvolgende', D.instapHalte(vijf, 5000, -1).name === 'B');
  check('instaphalte +1 voor de eerste halte kiest de eerstvolgende', D.instapHalte(vijf, -500, 1).name === 'A');

  // de tekst op het bord: lijn, richting en vertrektijd
  check('diensttekst noemt lijn, richting en tijd', D.dienstTekst(a).includes('Stoptrein Test') && D.dienstTekst(a).includes('Gamma') && D.dienstTekst(a).includes(D.tijdLabel(a.vertrek)) && D.dienstTekst(null) === '');
}

console.log(bad ? `${bad} van ${n} mislukt` : `dienstregeling_test ok (${n} checks)`);
process.exit(bad ? 1 : 0);
