// Transfers, AI-clubs en de clubkas van de voetbalcarrière (#1111, epic #1106, docs/VOETBAL-CARRIERE-21-11.md hoofdstukken 6 en 7): puur, geen DOM (scripts/voetbal_transfers_test.mjs).
// Eenmaal per seizoenspauze doorloopt een deterministische routine alle AI-clubs, gesorteerd op (kas, id): elke club bepaalt zijn zwakste positie en koopt de beste transfervrije speler binnen budget.
// Geen Math.random: alleen makeRng/hashSeed. Behoud: een speler zit in precies één selectie (een transfervrije speler is van niemand tot hij gekocht is); de som van de clubkassen verandert alleen door de
// vaste bronnen en putten (omzet, salarissen, de transactiebelasting en wat naar de spelersmarkt gaat). Een koop-verkoopcyclus geeft altijd verlies (verkoop hooguit 80% binnen een seizoen, 10% belasting).
// De clubkas is gescheiden van het eigen geld van de speler (de manager beheert alleen de kas van zijn club).
import { makeRng } from './minigamekit.js';
import { makePlayer, hashSeed, playerRating, ROLES, SQUAD_SHAPE, inventName } from './voetbalspelers.js';

export const SELL_FACTOR = 0.8, TAX = 0.1;
export const REVENUE_RATE = 0.06;            // de omzet per seizoen als deel van de kas bij de start van het seizoen (kaartjes, sponsors)
export const SALARY_RATE = 0.1;              // salaris per seizoen als deel van de prijs van een speler
export const MARKET_SIZE = 14;
export const CONTRACT_MIN = 1, CONTRACT_MAX = 3;
// De prijs van een speler: stijgt snel met de rating (een amateur kost een paar duizend euro, een topspeler een paar ton).
export const priceOf = (p) => { const r = playerRating(p); return Math.round(((r / 10) ** 3) * 40 / 10) * 10; };
export const salaryOf = (p) => Math.round(priceOf(p) * SALARY_RATE);
const clone = (o) => JSON.parse(JSON.stringify(o));

export const emptyMarket = () => ({ cash: {}, imports: {}, gone: {}, pool: [], sinks: 0, nr: 0 });
// De transfervrije spelers van dit seizoen: deterministisch uit het zaad, rating 30 tot 75, verspreid over de rollen.
export function freeAgents(seed, nr, n = MARKET_SIZE) {
  const rng = makeRng(hashSeed('agents', seed, nr));
  const out = [];
  for (let i = 0; i < n; i++) {
    const role = ROLES[1 + Math.floor(rng() * 3)] || 'middenvelder';
    const level = 30 + Math.floor(rng() * 46);
    const p = makePlayer(rng, { club: null, role: i % 7 === 0 ? 'keeper' : role, level, name: inventName(rng), talentChance: 0.2 });
    p.id = `fa${nr}:${i}`;
    out.push(p);
  }
  return out;
}
export const cashOf = (m, club) => (m.cash[club.id] != null ? m.cash[club.id] : club.budget);
export const totalCash = (m, clubs) => clubs.reduce((s, c) => s + cashOf(m, c), 0);

// De selectie van een club met de overdrachten erin: de basisselectie (de aanroeper geeft hem) zonder wie vertrok, plus wie kwam.
export function rosterOf(m, clubId, base) {
  const gone = new Set(m.gone[clubId] || []);
  return [...base.filter((p) => !gone.has(p.id)), ...(m.imports[clubId] || [])];
}
// De zwakste positie van een selectie: de rol met de laagste rating van de beste spelers t.o.v. de vorm (2 keepers, 6 verdedigers, 6 middenvelders, 4 aanvallers).
export function weakestRole(roster) {
  let worst = null, score = Infinity;
  for (const r of ROLES) {
    const list = roster.filter((p) => p.role === r).map((p) => playerRating(p)).sort((a, b) => b - a);
    const need = Math.min(SQUAD_SHAPE[r], r === 'keeper' ? 1 : 3);
    const missing = Math.max(0, SQUAD_SHAPE[r] - list.length);
    const avg = list.slice(0, need).reduce((s, x) => s + x, 0) / Math.max(1, need) - missing * 20;
    if (avg < score) { score = avg; worst = r; }
  }
  return worst;
}

// De transfers van de AI-clubs in een pauze. clubs = de AI-clubs (zonder jouw club), baseOf(clubId) geeft hun basisselectie. Geeft een nieuwe markt en een log. De volgorde is vast: (kas, id).
export function aiRound(market, clubs, baseOf, seed) {
  const m = clone(market);
  const nr = m.nr + 1;
  const agents = freeAgents(seed, nr);
  const log = [];
  const order = clubs.slice().sort((a, b) => cashOf(m, a) - cashOf(m, b) || (a.id < b.id ? -1 : 1));
  for (const club of order) {
    const roster = rosterOf(m, club.id, baseOf(club.id));
    const role = weakestRole(roster);
    const cash = cashOf(m, club);
    const options = agents.filter((p) => p.role === role && priceOf(p) <= cash * 0.25).sort((a, b) => playerRating(b) - playerRating(a) || (a.id < b.id ? -1 : 1));
    const pick = options[0];
    if (!pick) continue;
    const worst = roster.filter((p) => p.role === role).sort((a, b) => playerRating(a) - playerRating(b))[0];
    if (worst && playerRating(worst) >= playerRating(pick)) continue;       // geen verbetering: niet kopen
    const price = priceOf(pick);
    m.cash[club.id] = cash - price;
    m.sinks += price;
    agents.splice(agents.indexOf(pick), 1);
    const p = { ...pick, club: club.id };
    (m.imports[club.id] = m.imports[club.id] || []).push(p);
    if (worst) (m.gone[club.id] = m.gone[club.id] || []).push(worst.id);        // de zwakste van de rol vertrekt zonder opbrengst (naar de amateurs)
    log.push({ club: club.id, bought: p.id, role, price });
  }
  m.nr = nr;
  return { market: m, log };
}
// De boekhouding van het seizoen: omzet erbij en salarissen eraf voor elke club (jouw club inbegrepen). Geeft de nieuwe markt en per club { revenue, salaries }.
export function settleSeason(market, clubs, rosterFor) {
  const m = clone(market);
  const rep = {};
  for (const club of clubs) {
    const cash = cashOf(m, club);
    const revenue = Math.round(club.budget * REVENUE_RATE);
    const salaries = Math.round(rosterFor(club.id).reduce((s, p) => s + salaryOf(p), 0) * 0.25);
    m.cash[club.id] = Math.max(0, cash + revenue - salaries);
    rep[club.id] = { revenue, salaries, paid: cash + revenue - salaries >= 0 };
  }
  return { market: m, report: rep };
}

// ---- de manager: jouw club (de kas is van de club, niet van de speler) ----
export const inBreak = (c) => !!c && c.started && c.evDone >= c.cal.length;                 // de pauze tussen de seizoenen
export function buyPlayer(market, club, player, roster) {
  const price = priceOf(player), cash = cashOf(market, club);
  if (player.club) return { ok: false, reason: 'Die speler heeft al een club' };
  if (price > cash) return { ok: false, reason: 'De clubkas is te klein' };
  if (roster.length >= 22) return { ok: false, reason: 'De selectie zit vol' };
  const m = clone(market);
  m.cash[club.id] = cash - price; m.sinks += price;
  (m.imports[club.id] = m.imports[club.id] || []).push({ ...player, club: club.id, boughtFor: price, boughtNr: m.nr });
  m.pool = m.pool.filter((x) => x.id !== player.id);
  return { ok: true, market: m, price };
}
// Verkopen: hooguit 80% van de aankoopprijs, 10% belasting; wat je niet kocht is er geen aankoopprijs voor (dan 80% van de waarde).
export function sellPrice(player) { const base = player.boughtFor != null ? player.boughtFor : priceOf(player); return Math.round(base * SELL_FACTOR * (1 - TAX)); }
export function sellPlayer(market, club, player) {
  const m = clone(market), price = sellPrice(player);
  m.cash[club.id] = cashOf(m, club) + price;
  m.imports[club.id] = (m.imports[club.id] || []).filter((x) => x.id !== player.id);
  if ((player.id || '').startsWith(`${club.id}:`)) (m.gone[club.id] = m.gone[club.id] || []).push(player.id);
  m.sinks -= price;
  return { ok: true, market: m, price };
}
// Een bod aan de speler (B6): een club een klasse hoger met een sterkere selectie biedt een contract (1 tot 3 seizoenen); alleen vanaf seizoen 2 en bij een goede rating, geen druk.
export function offerFor(c, clubsOf, getClub) {
  if (!c || !c.started || c.seasonNr < 2) return null;
  const order = ['talent', 'terp', 'kroon'];
  const cur = order.findIndex((d) => c.world[d].includes(c.club));
  if (cur < 0 || cur >= 2) return null;
  const list = c.world[order[cur + 1]].map((id) => getClub(id)).filter(Boolean).sort((a, b) => a.sterkte - b.sterkte || (a.id < b.id ? -1 : 1));
  const mine = getClub(c.club);
  const target = list.find((k) => k.sterkte > (mine ? mine.sterkte : 0));
  const rating = playerRating(c.me);
  if (!target || rating < Math.max(40, target.sterkte - 18)) return null;
  const seasons = CONTRACT_MIN + (hashSeed('offer', c.seasonNr, target.id) % (CONTRACT_MAX - CONTRACT_MIN + 1));
  return { club: target.id, seasons, salaryBonus: Math.round(target.sterkte * 1.5) };
}
