// Clubbezit als tak van Bezit (#1113, epic #1106, ontwerp docs/VOETBAL-CARRIERE-21-11.md hoofdstuk 8 en docs/BEZIT-21-11.md): puur, geen DOM (scripts/voetbal_clubbezit_test.mjs).
// Voetbal bouwt GEEN eigen bezitsopslag: de aandelen staan in het profiel van de speler. Zodra de Bezit-opslag (gde-bezit-v1, #1097) en het Bezit-menu (#1099) op deze tak zijn, verhuist `bezit.clubs` naar `bezit.x.clubs`
// van dat profiel en komt er een subtab Club; tot dan is dit de interface (`ownershipBranch`) met een stub in de test. Dezelfde prijsregels als Bezit: schaalprijs (x (1 + min(aantal, 200) / 100)), verkoop 75%, belasting 0,1% per speldag.
// Rustig passief inkomen: 0,45% van de aankoopprijs per speldag (1,35% per ronde van drie dagen) met een uitslag van plus of min 40% door plek; nooit de snelste geldmachine. Niemand verliest zijn vermogen.
export const SHARES = [0.1, 0.25, 0.51, 1];
export const VALUE = { talent: 30000, terp: 80000, kroon: 250000 };
export const SCALE_CAP = 200, VERKOOP_FACTOR = 0.75, TAX_PER_DAY = 0.001;
export const YIELD_PER_DAY = 0.0045, DAYS_PER_ROUND = 3, SWING = 0.4, RETAIN = 0.25;
export const RESERVE = 0.25;                        // je koopt nooit je spaargeld leeg: de prijs hooguit 75% van je geld
export const TRIBUNES = [{ id: 'klein', naam: 'Kleine tribune', m2: 120, capaciteit: 400 }, { id: 'middel', naam: 'Middelgrote tribune', m2: 300, capaciteit: 1200 }, { id: 'groot', naam: 'Grote tribune', m2: 700, capaciteit: 3000 }];
export const TRIBUNE_PER_M2 = 700;

export const ownershipBranch = { id: 'club', naam: 'Club', tab: 'Club' };   // de interface naar de Bezit-tak
export const newClubBezit = () => ({ clubs: {} });
export const priceOf = (division, share, ownedCount = 0) => Math.round((VALUE[division] || VALUE.talent) * share * (1 + Math.min(ownedCount, SCALE_CAP) / 100));
export const ownedCount = (b) => Object.keys((b && b.clubs) || {}).length;
// Zichtbaar na het eerste aandeel of na B10 (de manager-ontgrendeling): geen voetbalstartgeld en geen gift, een club kopen is een late stap.
export const isVisible = (c) => !!c && (Object.keys((c.bezit && c.bezit.clubs) || {}).length > 0 || !!(c.roles && c.roles.manager) || !!(c.flags && c.flags.shareReady));
export function canBuy(c, clubId, division, share, money) {
  if (!isVisible(c)) return { ok: false, reason: 'Nog niet ontgrendeld' };
  if (!SHARES.includes(share)) return { ok: false, reason: 'Onbekend aandeel' };
  const have = (c.bezit.clubs[clubId] || {}).aandeel || 0;
  if (have + share > 1 + 1e-9) return { ok: false, reason: 'Meer dan de hele club kan niet' };
  const price = priceOf(division, share, ownedCount(c.bezit));
  if (price > money * (1 - RESERVE)) return { ok: false, reason: 'Dat leegt je spaargeld: houd een kwart over', price };
  return { ok: true, price };
}
export function buy(c, clubId, division, share, money, day = 0) {
  const r = canBuy(c, clubId, division, share, money);
  if (!r.ok) return { career: c, ...r };
  const b = JSON.parse(JSON.stringify(c.bezit)), cur = b.clubs[clubId] || { aandeel: 0, sinds: day, prijs: 0 };
  b.clubs[clubId] = { aandeel: Math.round((cur.aandeel + share) * 100) / 100, sinds: cur.sinds, prijs: cur.prijs + r.price };
  return { career: { ...c, bezit: b }, ok: true, price: r.price };
}
export function sell(c, clubId) {
  const h = c.bezit.clubs[clubId];
  if (!h) return { career: c, ok: false, reason: 'Je bezit geen aandeel' };
  const b = JSON.parse(JSON.stringify(c.bezit)); delete b.clubs[clubId];
  return { career: { ...c, bezit: b }, ok: true, price: Math.round(h.prijs * VERKOOP_FACTOR) };
}
// De dividenden van een ronde: de aankoopprijs x 1,35% x (1 plus of min 40% naar de plek: eerste +40%, laatste -40%) minus de belasting over drie speldagen; een deel (25%) blijft in de clubkas.
export const dividendOf = (h, rank, clubs = 8) => {
  const swing = 1 + SWING * ((clubs + 1) / 2 - rank) / ((clubs - 1) / 2);
  const gross = h.prijs * YIELD_PER_DAY * DAYS_PER_ROUND * swing;
  const tax = h.prijs * TAX_PER_DAY * DAYS_PER_ROUND;
  return { gross: Math.round(gross), tax: Math.round(tax), payout: Math.max(0, Math.round(gross * (1 - RETAIN) - tax)), toClub: Math.round(gross * RETAIN) };
};
// De tribune is een verbouwing van het stadionpand: prijs m2 x 700, capaciteit en kaartjesomzet stijgen.
export const tribunePrice = (id) => { const t = TRIBUNES.find((x) => x.id === id); return t ? t.m2 * TRIBUNE_PER_M2 : 0; };
export const capacityOf = (levels = []) => 800 + levels.reduce((s, id) => s + ((TRIBUNES.find((x) => x.id === id) || {}).capaciteit || 0), 0);
// Risico: een negatieve clubkas twee periodes op rij laat de bank het aandeel terugkopen tegen de Bezit-regel (75%). `debtPeriods` komt uit de boekhouding.
export const bankRecall = (h, debtPeriods) => (debtPeriods >= 2 ? { recall: true, payout: Math.round(h.prijs * VERKOOP_FACTOR) } : { recall: false, payout: 0 });
// Samen spelen: een club heeft een eigenaar (de claim): de laagste tijd en daarna het laagste speler-id wint, de ander krijgt zijn geld terug. Een gast ziet de clubnaam en de eigenaar, geen kasboek.
export const claimWinner = (a, b) => (a.time !== b.time ? (a.time < b.time ? a : b) : (String(a.player) <= String(b.player) ? a : b));
