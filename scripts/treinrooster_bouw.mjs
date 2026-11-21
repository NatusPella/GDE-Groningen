// Treinrooster bouwen (#1085): filtert de statische GTFS van OVapi tot game/treinrooster.json.
//
//   node scripts/treinrooster_bouw.mjs --gtfs=<map met uitgepakte gtfs-nl.zip> [--uit=game/treinrooster.json]
//        [--werk=20270818 --za=20270821 --zo=20270822]
//
// Alleen bij het BOUWEN (ontwikkeling): het spel haalt de grote GTFS nooit op. Ophalen en uitpakken, in een eigen lege map:
//   curl -H "User-Agent: OpenDataLezer/1" -o gtfs-nl.zip https://gtfs.ovapi.nl/nl/gtfs-nl.zip   (ca. 280 MB, CC0-1.0)
//   unzip gtfs-nl.zip -d <map>
// Er blijft niets persoonlijks achter: het bestand bevat alleen stations, tijden, treinnummers, sporen en bestemmingen.
// De vervoerder komt niet in het bestand (constitutie 2); het rapport telt hem wel, voor docs/TREINEN-LIVE-21-11.md.
// De regels staan in scripts/treinrooster_lib.mjs (test: scripts/treinrooster_test.mjs).
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import {
  STATIONS, DAGSOORTEN, spelLijn, dienstenOp, maakRij, sorteerRijen, valideerRooster,
} from './treinrooster_lib.mjs';

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const MAP = arg('gtfs');
if (!MAP) { console.error('Gebruik: node scripts/treinrooster_bouw.mjs --gtfs=<map met uitgepakte GTFS>'); process.exit(2); }
const UIT = arg('uit', 'game/treinrooster.json');
// een zomerdag in 2027 (woensdag, zaterdag, zondag): het spel kent alleen zomer; het rooster dat de feed voor die dagen bevat
const DATA = { werk: arg('werk', '20270818'), za: arg('za', '20270821'), zo: arg('zo', '20270822') };

function split(l) {
  const o = []; let c = '', q = false;
  for (let i = 0; i < l.length; i++) {
    const ch = l[i];
    if (q) { if (ch === '"') { if (l[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { o.push(c); c = ''; } else c += ch;
  }
  o.push(c); return o;
}
async function regels(f, cb) {
  const rl = readline.createInterface({ input: fs.createReadStream(path.join(MAP, f)), crlfDelay: Infinity });
  let kop = null;
  for await (const l of rl) {
    if (!l) continue;
    const a = split(l);
    if (!kop) { kop = Object.fromEntries(a.map((k, i) => [k, i])); continue; }
    cb(a, kop);
  }
}

const routes = new Map();     // alleen spoor (route_type 2)
const agentschap = new Map();
await regels('routes.txt', (a, k) => { if (a[k.route_type] === '2') { routes.set(a[k.route_id], { soort: a[k.route_short_name], agency: a[k.agency_id] }); } });
console.log('spoorroutes:', routes.size);

const stops = new Map();      // stop_id -> { naam, spoor, code, zone }
const alleStopNaam = new Map();
const gewenst = new Set(STATIONS);
await regels('stops.txt', (a, k) => {
  alleStopNaam.set(a[k.stop_id], a[k.stop_name]);
  const zone = a[k.zone_id] || '';
  if (gewenst.has(a[k.stop_name]) && zone.startsWith('IFF:') && a[k.location_type] !== '1') stops.set(a[k.stop_id], { naam: a[k.stop_name], spoor: a[k.platform_code] || '', code: zone.slice(4) });
});
console.log('stops van de stations:', stops.size);

const kalender = [];
const wanted = new Set(Object.values(DATA));
await regels('calendar_dates.txt', (a) => { if (wanted.has(a[1])) kalender.push([a[0], a[1], a[2]]); });
const diensten = Object.fromEntries(DAGSOORTEN.map((d) => [d, dienstenOp(kalender, DATA[d])]));
for (const d of DAGSOORTEN) console.log(`diensten ${d} (${DATA[d]}):`, diensten[d].size);

const trips = new Map();      // trip_id -> { soort, agency, nummer, bestemming, dagen: ['werk', ...] }
await regels('trips.txt', (a, k) => {
  const r = routes.get(a[k.route_id]);
  if (!r) return;
  const dagen = DAGSOORTEN.filter((d) => diensten[d].has(a[k.service_id]));
  if (!dagen.length) return;
  trips.set(a[k.trip_id], { soort: r.soort, agency: r.agency, nummer: a[k.trip_short_name], bestemming: a[k.trip_headsign], dagen, eerste: null, laatste: null, stops: [] });
});
console.log('ritten op de drie dagen:', trips.size);

// stop_times: 1,2 GB. Per rit de eerste en laatste halte (herkomst en bestemming), en de tijden op onze stations.
{
  const rl = readline.createInterface({ input: fs.createReadStream(path.join(MAP, 'stop_times.txt')), crlfDelay: Infinity });
  let eerste = true;
  for await (const l of rl) {
    if (eerste) { eerste = false; continue; }
    const i = l.indexOf(',');
    const t = trips.get(l.slice(0, i));
    if (!t) continue;
    const a = l.split(',');     // stop_times heeft geen aanhalingstekens in deze kolommen
    const seq = +a[1];
    if (!t.eerste || seq < t.eerste.seq) t.eerste = { seq, stop: a[2] };
    if (!t.laatste || seq > t.laatste.seq) t.laatste = { seq, stop: a[2] };
    const s = stops.get(a[2]);
    if (s) t.stops.push({ seq, s, arr: a[4], dep: a[5] });
  }
}

const stationIdx = new Map(STATIONS.map((n, i) => [n, i]));
const codes = new Map();
for (const s of stops.values()) codes.set(s.naam, s.code);
const bestemmingen = [], bIdx = new Map();
const lijnen = [], lIdx = new Map();
const idx = (lijst, map, v) => { if (!map.has(v)) { map.set(v, lijst.length); lijst.push(v); } return map.get(v); };
const rit = Object.fromEntries(DAGSOORTEN.map((d) => [d, {}]));
const telling = { agency: {}, lijn: {}, rijen: 0, zonderBestemming: 0 };
for (const t of trips.values()) {
  const laatsteNaam = alleStopNaam.get(t.laatste && t.laatste.stop) || t.bestemming || '';
  const herkomst = alleStopNaam.get(t.eerste && t.eerste.stop) || '';
  const bestemming = t.bestemming || laatsteNaam;
  if (!bestemming) { telling.zonderBestemming++; continue; }
  for (const st of t.stops) {
    if (st.seq === t.laatste.seq) continue;                    // eindstation: geen vertrek
    const lijn = spelLijn({ bestemming, herkomst, soort: t.soort });
    const r = maakRij({ dep: st.dep, arr: st.arr, nummer: t.nummer, spoor: st.s.spoor, bestIdx: idx(bestemmingen, bIdx, bestemming), lijnIdx: idx(lijnen, lIdx, lijn) });
    if (!r) continue;
    const si = stationIdx.get(st.s.naam);
    for (const d of t.dagen) (rit[d][si] = rit[d][si] || []).push(r);
    telling.agency[t.agency] = (telling.agency[t.agency] || 0) + 1;
    telling.lijn[lijn] = (telling.lijn[lijn] || 0) + 1;
    telling.rijen++;
  }
}
for (const d of DAGSOORTEN) for (const si of Object.keys(rit[d])) rit[d][si] = sorteerRijen(rit[d][si]);

const uit = {
  v: 1,
  bron: 'Open OV-gegevens (OVapi, gtfs-nl, CC0-1.0)',
  gebouwd: new Date().toISOString().slice(0, 10),
  basisdagen: DATA,
  stations: STATIONS.map((naam) => ({ naam, code: codes.get(naam) || '' })),
  bestemmingen, lijnen, rit,
};
const fouten = valideerRooster(uit);
if (fouten.length) { console.error('Ongeldig rooster:', fouten.slice(0, 10)); process.exit(1); }
fs.mkdirSync(path.dirname(UIT), { recursive: true });
fs.writeFileSync(UIT, JSON.stringify(uit));
const kb = Math.round(fs.statSync(UIT).size / 1024);
console.log(`geschreven: ${UIT} (${kb} KB), ${telling.rijen} vertrekken (alle ritten x dagsoorten niet meegeteld)`);
console.log('per vervoerder (alleen rapport, niet in het bestand):', telling.agency);
console.log('per spellijn:', telling.lijn);
for (const d of DAGSOORTEN) console.log(d, 'Groningen:', (rit[d][0] || []).length, 'vertrekken');
const zonder = STATIONS.filter((n, i) => !rit.werk[i]);
if (zonder.length) console.log('stations zonder rooster:', zonder.join(', '));
