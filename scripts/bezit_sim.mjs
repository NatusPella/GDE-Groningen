// Economiesim van Bezit (epic #1095, #1105; docs/BEZIT-21-11.md 8): over 30 speldagen (een speldag is 24 minuten spelen: 12 speluren) en verder, voor een speler die
// actief werkt (netto 1.100 per uur, docs/BALANS-21-11.md) en zijn geld in percelen en panden steekt. Controleert de balans met de echte modules:
//   - tijd tot het eerste perceel ongeveer twee uur;
//   - geen exploit-lus: kopen en direct verkopen kost altijd geld, pacht (0,9%) blijft onder huur (1,2%), schaalprijs en afnemende beheeropbrengst remmen;
//   - de schaalcurve: het passieve inkomen per uur van 10, 100 en 1.000 percelen blijft binnen een factor 3 van de actieve speler.
//   node scripts/bezit_sim.mjs [--days 30] [--index <map met bezit-percelen.json>]
// Puur en deterministisch: geen klok, geen Math.random; zonder index een vaste synthetische prijslijst.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as P from '../game/js/bezitprijs.js';
import { mgmtFactor } from '../game/js/farmstaff.js';
import { createParcelIndex } from '../game/js/parcelindex.js';
import { streekAt } from '../game/js/regioleven.js';
import * as BZ from '../game/js/business.js';
import * as SN from '../game/js/snackvan.js';
import * as SP from '../game/js/pitch.js';

export const ACTIVE_PER_HOUR = 1100;          // netto per speluur, actief werk (BALANS-21-11)
export const START_MONEY = 0;                 // de Duizendpoot-bonus komt na ongeveer twee uur en zit in het actieve tempo
export const HOURS_PER_DAY = 0.4;             // een speldag is 24 minuten
export const SELL_FACTOR = 0.75;

// De prijslijst: de echte index als die er is (basisprijs per perceel), anders een vaste lijst die de verdeling nabootst (mediaan 11.850).
export function priceList(indexDir) {
  const dir = indexDir || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../game/world');
  const f = path.join(dir, 'bezit-percelen.json');
  if (fs.existsSync(f)) {
    const ix = createParcelIndex(JSON.parse(fs.readFileSync(f, 'utf8')));
    const l = ix.all().filter(P.isForSale).map((p) => P.basePrice(p, streekAt(p.x, p.y))).sort((a, b) => a - b);
    return { prices: l, bron: 'index' };
  }
  const l = [];
  for (let i = 0; i < 4000; i++) { const u = (i + 0.5) / 4000; l.push(Math.max(2400, Math.round((2400 * Math.exp(4.6 * u ** 1.6 * 1.6)) / 50) * 50)); }
  return { prices: l, bron: 'synthetisch' };
}

// De opbrengst per speldag van een geleaset perceel dat zoveel kostte, bij n beheerde percelen.
export const leaseDay = (paid, managed) => Math.round(P.leaseOutPerDay(paid) * mgmtFactor(managed));

// Eén speler: elke speldag komt er actief geld bij (alleen als hij actief speelt: activeShare), de passieve opbrengst loopt altijd, en hij koopt wat hij kan.
// strategy 'cheap': altijd het goedkoopste perceel; 'value': het perceel met de beste opbrengst per euro.
export function simulate({ days = 30, activeShare = 1, strategy = 'cheap', prices = priceList().prices, startMoney = START_MONEY } = {}) {
  let money = startMoney, owned = 0, passive = 0, invested = 0, firstHour = null, hours = 0;
  const log = [];
  const leasedPaid = [];
  for (let d = 1; d <= days; d++) {
    hours += HOURS_PER_DAY;
    money += ACTIVE_PER_HOUR * HOURS_PER_DAY * activeShare;
    const inc = P.compressPassive(leasedPaid.reduce((s, p) => s + leaseDay(p, leasedPaid.length), 0) * P.difficultyFactor('income'));
    passive += inc; money += inc;
    // kopen: zolang het goedkoopste beschikbare perceel (met schaalprijs) betaalbaar is
    let guard = 0;
    while (guard++ < 500) {
      const base = strategy === 'cheap' ? prices[Math.min(prices.length - 1, owned)] : prices[Math.min(prices.length - 1, Math.floor(owned * 1.6))];
      const price = Math.round((base * P.scaleFactor(owned) * P.difficultyFactor('price')) / 50) * 50;
      if (money < price) break;
      money -= price; owned++; invested += price; leasedPaid.push(price);
      if (firstHour === null) firstHour = hours;
    }
    if (d % 5 === 0 || d === days) log.push({ day: d, hours: Math.round(hours * 10) / 10, owned, money: Math.round(money), passivePerHour: Math.round(inc / HOURS_PER_DAY) });
  }
  const last = P.compressPassive(leasedPaid.reduce((s, p) => s + leaseDay(p, leasedPaid.length), 0));
  return { days, hours, owned, money: Math.round(money), invested, passiveTotal: Math.round(passive), passivePerHour: Math.round(last / HOURS_PER_DAY), firstParcelHours: firstHour, log };
}

// Het passieve inkomen per uur van een speler met n percelen van gemiddelde prijs (met de schaalprijs bij het kopen), voor de schaalcurve.
export function passivePerHourAt(n, avgBase = 11850) {
  let sum = 0;
  for (let i = 0; i < n; i++) sum += Math.round((avgBase * P.scaleFactor(i)) / 50) * 50;
  const paidAvg = sum / Math.max(1, n);
  return Math.round(P.compressPassive(n * leaseDay(paidAvg, n)) / HOURS_PER_DAY);
}

// Exploits: elke lus moet geld kosten of begrensd zijn.
export function exploitChecks() {
  const out = {};
  out.buySell = (paid) => paid - Math.round((paid * SELL_FACTOR) / 5) * 5;                       // kopen en direct verkopen: verlies
  out.leaseVsRent = { lease: P.LEASE_OUT_RATE, rent: 0.012 };                                   // pacht onder huur
  out.maxScale = P.scaleFactor(10000);                                                         // schaalprijs begrensd op x3
  out.mgmt = [10, 40, 100, 400, 1000].map((n) => [n, mgmtFactor(n)]);                           // afnemende beheeropbrengst
  out.shopRoi = (price) => Math.round(BZ.baseRevenue('supermarkt', Math.round(price / 900 / 1.4)) / Math.max(1, price) * 1000) / 1000;
  return out;
}

// ---- de snackwagen (eindgame, docs/BEZIT-21-11.md "Snackwagen en Us Mem Snacks") ----
// Vier profielen over `days` speldagen met een speler die de wagen elke dag van voorraad voorziet (de beste wagenhouder). quiet: zonder dat Us Mem ingrijpt;
// anders mét zijn uitbreiding, zijn bod en sabotage en een speler die elk antwoord gratis geeft (het goedkoopste). Geeft per profiel de winst per speldag
// (eigen wagen met compressOwn, medewerkers met compressPassive), de investering en het rendement per speldag, tegenover de actieve speler (440 per speldag).
const wkd = (cd) => { const wd = (cd + 4) % 7; return wd === 6 || wd === 0; };
const FRIETWAGEN_PRICE = BZ.MOBILE_TYPES.frietwagen.price;
export function snackProfile({ days = 40, quiet = true } = {}) {
  const give = (S, ids) => { for (const id of ids) S.permits[id] = { until: 1e7, paid: SP.permitPrice(id, Object.keys(S.permits).length) }; };
  const full = (S) => { S.up = ['koeling', 'sauzen', 'pan']; S.own.tier = 'groot'; S.own.menu = ['friet', 'frikandel', 'kroket', 'burger', 'milkshake', 'softy']; };
  const mk = (id) => {
    const S = SN.newSnack();
    let invest = FRIETWAGEN_PRICE;
    const buyUp = (u) => { S.up.push(u); invest += SN.UPGRADES[u].price; };
    if (id === 'start') { give(S, ['dorp']); S.own.spot = 'dorp'; invest += SP.permitPrice('dorp', 0); }
    if (id === 'mid') { give(S, ['park']); S.own.spot = 'park'; S.own.tier = 'groot'; invest += SN.TIERS.groot.up + SP.permitPrice('park', 0); buyUp('koeling'); S.own.menu = ['friet', 'frikandel', 'kroket', 'burger', 'milkshake']; }
    if (id === 'best' || id === 'imperium') {
      give(S, ['markt']); S.own.spot = 'markt'; invest += SP.permitPrice('markt', 0) + SN.TIERS.groot.up; full(S);
      for (const u of SN.UPGRADE_IDS) invest += SN.UPGRADES[u].price;
    }
    if (id === 'imperium') {
      const spots = ['martini', 'park', 'reitdiep', 'haren', 'dorp', 'leek'];
      give(S, spots);
      for (const sp of spots) { invest += SP.permitPrice(sp, 0); const b = SN.buyFleetWagon(S, sp, 1, 1e9); invest += b.cost; }
    }
    if (quiet) { S.rival.spots = []; S.rival.mood = 5; S.rival.lastEvent = 1e7; S.rival.lastOffer = 1e7; }
    return { S, invest };
  };
  const out = {};
  for (const id of ['start', 'mid', 'best', 'imperium']) {
    const { S, invest } = mk(id);
    let own = 0, fleet = 0, fixed = 0;
    for (let d = 2; d < 2 + days; d++) {
      S.own.stockDays = 5;
      for (const k of Object.keys(S.permits)) S.permits[k].until = 1e7;
      if (SN.pendingEvent(S)) SN.answerEvent(S, SN.pendingEvent(S).choices.find((c) => c.def).id, d, 1e9);
      const r = SN.settleDay(S, { day: d, weekend: wkd(d), money: 1e9, ownWagon: true, ownQ: 100, kermisAt: (s) => s === 'kermis' && d % 12 < 3, chainOwn: () => 0 });
      own += r.ownNet; fleet += r.fleetNet; fixed += r.fixed;
    }
    const fi = P.difficultyFactor('income'), ownDay = (own / days) * fi, fleetDay = (fleet / days) * fi;
    const ownC = SN.compressOwn(ownDay), passiveC = P.compressPassive(fleetDay);
    const perDay = ownC + passiveC;
    out[id] = { ownDay: Math.round(ownDay), ownC, fleetDay: Math.round(fleetDay), passiveC, perDay, invest: Math.round(invest), roiPerDay: Math.round((perDay / invest) * 10000) / 10000, vsActive: Math.round((perDay / P.ACTIVE_PER_DAY) * 100) / 100, ownVsActive: Math.round((ownC / P.ACTIVE_PER_DAY) * 100) / 100, rep: S.rep, wagons: (S.own.spot ? 1 : 0) + S.fleet.length };
  }
  return out;
}
// Het rendement per speldag van wat er al was, voor de vergelijking: pacht 0,9%, huur 1,2%, een winkel ongeveer 0,5% van de prijs.
export const BASELINE_ROI = { pacht: P.LEASE_OUT_RATE, huur: 0.012, winkel: 0.0055 };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
  const pl = priceList(a('--index', null));
  const days = Number(a('--days', 30));
  const r = simulate({ days, prices: pl.prices });
  console.log(`bezit_sim (${pl.bron}, ${pl.prices.length} prijzen): ${days} speldagen = ${r.hours.toFixed(1)} speluren`);
  console.log(`  eerste perceel na ${r.firstParcelHours === null ? 'nooit' : r.firstParcelHours.toFixed(1) + ' uur'}; ${r.owned} percelen, passief ${r.passivePerHour} per uur (actief ${ACTIVE_PER_HOUR})`);
  for (const n of [10, 100, 1000]) console.log(`  schaal ${n} percelen: passief ${passivePerHourAt(n)} per uur`);
  console.log(`  beheeropbrengst: ${exploitChecks().mgmt.map(([n, f]) => `${n}:${f}`).join(' ')}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const quiet of [true, false]) {
    const sp = snackProfile({ days: 40, quiet });
    console.log(`  snackwagen (${quiet ? 'zonder Us Mem' : 'met Us Mem en sabotage'}, 40 speldagen):`);
    for (const [k, v] of Object.entries(sp)) console.log(`    ${k.padEnd(9)} per dag ${String(v.perDay).padStart(5)} (eigen ${v.ownC}, medewerkers ${v.passiveC}) = ${v.vsActive}x actief, ${v.wagons} wagen(s), investering ${v.invest}, rendement ${(v.roiPerDay * 100).toFixed(2)}% per speldag`);
  }
}
