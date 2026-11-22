// Het dagrapport van Bezit als één korte melding (verfijnronde bezit, 22-11): wat bezitlive.dayTick teruggeeft ({ from, to, days, parcels, business, mobile,
// snack, chains, eventMoney, premium, net }) werd nergens getoond, dus het geld veranderde stil. Puur: geen DOM, geen klok. Per speler, lokaal (#429): een
// gast ziet zijn eigen rapport, nooit dat van de host. Alleen tekst, geen TTS.
import { euro } from './geldtekst.js';

const fin = (x) => (Number.isFinite(x) ? Math.round(x) : 0);
export const signed = (n) => (n < 0 ? '-' : '+') + euro(Math.abs(n));
const PARTS = [['parcels', 'percelen'], ['business', 'bedrijven'], ['snack', 'snackwagen'], ['chains', 'ketens'], ['eventMoney', 'bijzonder']];

// De regel voor het rapport of null als er niets te melden valt (geen verandering). moneyAfter: het geld na de dagtik (voor de waarschuwing bij een leeg budget).
export function dayReportLine(rep, moneyAfter = null) {
  if (!rep || typeof rep !== 'object') return null;
  const net = fin(rep.net);
  const parts = PARTS.map(([k, label]) => [label, fin(rep[k])]).filter(([, v]) => v !== 0).map(([label, v]) => `${label} ${signed(v)}`);
  const premium = fin(rep.premium);
  if (premium > 0) parts.push(`verzekering ${signed(-premium)}`);
  if (net === 0 && !parts.length) return null;
  const days = Math.max(1, fin(rep.days) || 1);
  const head = days > 1 ? `Dagrapport, ${days} dagen: ${signed(net)}` : `Dagrapport: ${signed(net)}`;
  const empty = net < 0 && Number.isFinite(moneyAfter) && moneyAfter <= 0 ? ' Je geld is op: de kosten lopen door.' : '';
  return `${head}${parts.length ? ` (${parts.join(', ')})` : ''}.${empty}`;
}

// Het laatste rapport blijft leesbaar in het overzicht van Land en bedrijf (per sessie, nooit bewaard).
let last = null;
export const lastReportLine = () => last;
export const resetLastReport = () => { last = null; };

// Tonen met de bestaande meldingskeuze; één sleutel zodat het rapport van gisteren wordt vervangen. Geeft true als er iets getoond is.
export function deliverDayReport(w, rep) {
  const text = dayReportLine(rep, w && w.money);
  if (text) last = text;
  if (!text || !w || typeof w.addMessage !== 'function') return false;
  w.addMessage(text, 5, { kind: 'geld', key: 'bz-dagrapport' });
  return true;
}
