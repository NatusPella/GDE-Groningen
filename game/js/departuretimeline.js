// De tijdlijn van het vertrekbord (#1085, 21-11): de eerstvolgende treinen van een station als punten op een tijdas
// van "nu" (de spelklok) naar later. Puur: geen THREE, geen DOM (scripts/departuretimeline_test.mjs). Dit bestand beslist
// ALLE regels van de tijdlijn: volgorde, hoeveel treinen, de positie op de as, de tekstlabels, de toon (kleur) en de vorm
// (altijd vorm en woord naast kleur) en de schermlezertekst. departuretimelineui.js (HUD-bord) en elke andere weergave
// (bijvoorbeeld een canvastextuur op het perron) tekenen alleen wat hier uitkomt.
// De invoer zijn de bordrijen van stationlife.stationView() (Nederlandse veldnamen: richting, lijn, spoor, tijd, plan,
// vertraging, vervallen, live); de uitvoer heeft Engelse veldnamen, de tekst voor de speler is Nederlands.
import { tijdLabel } from './dienstregeling.js';

export const MAX_TRAINS = 5;           // hooguit zoveel treinen op de tijdlijn
export const MIN_HORIZON_S = 900;      // de as is minstens 15 minuten lang (spelklok)
export const MAX_HORIZON_S = 3600;     // en hooguit een uur; wat verder weg is, staat aan het einde van de as
export const HORIZON_STEP_S = 900;     // de as groeit in stappen van 15 minuten
export const HIGH_DELAY_S = 600;       // vanaf 10 minuten is een vertraging "hoog" (rood); eronder alleen een markering
export const NOW_S = 30;               // binnen 30 s: "Vertrekt nu"
export const GRACE_S = 60;             // een trein die tot een minuut geleden vertrok, mag er nog staan

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const minutes = (s) => Math.max(1, Math.round(s / 60));

// "nu", "over 1 min", "over 4 min", "over 1 u 5 min". wait in spelklokseconden.
export function distanceLabel(wait) {
  if (!isNum(wait)) return '';
  if (wait <= NOW_S) return 'nu';
  if (wait < 90) return 'over 1 min';
  const m = minutes(wait);
  if (m < 60) return `over ${m} min`;
  const h = Math.floor(m / 60), rest = m % 60;
  return rest ? `over ${h} u ${rest} min` : `over ${h} u`;
}

// De lengte van de as: de verste trein, naar boven afgerond op HORIZON_STEP_S, tussen MIN en MAX.
export function horizonFor(waits) {
  const far = waits.filter(isNum).reduce((a, b) => Math.max(a, b), 0);
  const h = Math.ceil(far / HORIZON_STEP_S) * HORIZON_STEP_S;
  return Math.min(MAX_HORIZON_S, Math.max(MIN_HORIZON_S, h));
}

// De streepjes op de as: nu, en daarna elke 15 minuten (bij een uur elke 30). pos 0 tot 1.
export function axisFor(horizon) {
  const step = horizon > 1800 ? 1800 : 900;
  const out = [{ pos: 0, label: 'nu' }];
  for (let t = step; t <= horizon; t += step) out.push({ pos: t / horizon, label: `+${t / 60}` });
  return out;
}

// De toon staat vast: board = de eerstvolgende (bordgroen), ink = gewoon, red = alleen "vervalt" of een hoge vertraging.
// Geel komt hier niet voor (geel is gereserveerd voor "volg dit").
export const TONE = { board: 'board', ink: 'ink', red: 'red' };
// De vorm van de markering op de as, naast de kleur: cirkel (op tijd), ruit (vertraagd), kruis (vervalt).
export const SHAPE = { onTime: 'circle', delayed: 'diamond', cancelled: 'cross' };

// Eén bordrij (stationlife.stationView().bord[i]) als punt op de tijdlijn; null als de rij onbruikbaar is.
export function trainPoint(r, now, horizon = MIN_HORIZON_S) {
  if (!r || typeof r !== 'object' || !isNum(r.tijd) || !isNum(now)) return null;
  const plan = isNum(r.plan) ? r.plan : r.tijd;
  const cancelled = !!r.vervallen;
  const delayS = isNum(r.vertraging) && r.vertraging >= 60 ? r.vertraging : 0;
  const wait = r.tijd - now;
  const destination = typeof r.richting === 'string' && r.richting.trim() ? r.richting.trim() : 'Onbekende bestemming';
  const line = typeof r.lijn === 'string' ? r.lijn : '';
  const track = r.spoor !== '' && r.spoor != null ? String(r.spoor) : '';
  const high = cancelled || delayS >= HIGH_DELAY_S;
  const status = cancelled ? 'cancelled' : delayS ? 'delayed' : wait <= NOW_S ? 'now' : 'onTime';
  const badge = r.live ? 'Live' : 'Rooster';
  const distance = cancelled ? 'vervalt' : distanceLabel(wait);
  const delayMin = delayS ? minutes(delayS) : 0;
  const parts = [destination, line, track ? `spoor ${track}` : '', `vertrekt om ${tijdLabel(r.tijd)}`];
  if (cancelled) parts.push('deze trein rijdt niet', `gepland ${tijdLabel(plan)}`);
  else {
    parts.push(distance === 'nu' ? 'vertrekt nu' : distance);
    parts.push(delayS ? `${delayMin} minuten vertraagd, gepland ${tijdLabel(plan)}` : 'op tijd');
  }
  parts.push(badge === 'Live' ? 'bron: live gegevens' : 'bron: rooster');
  return {
    id: `${r.k != null ? r.k : r.nummer != null ? r.nummer : ''}|${line}|${plan}`,
    destination, line, track,
    trackLabel: track ? `sp.${track}` : '',
    time: tijdLabel(r.tijd), plan: tijdLabel(plan),
    shifted: delayS > 0 && !cancelled,           // de tijd is verschoven: plantijd doorgestreept, nieuwe tijd erbij
    wait, distance,
    minutes: cancelled || wait <= NOW_S ? 0 : minutes(wait),
    pos: Math.min(1, Math.max(0, wait / horizon)),
    status, cancelled,
    delay: delayMin,
    delayLabel: delayS && !cancelled ? `+${delayMin}` : '',
    high, tone: high ? TONE.red : TONE.ink,
    shape: cancelled ? SHAPE.cancelled : delayS ? SHAPE.delayed : SHAPE.onTime,
    badge, live: !!r.live,
    first: false,
    aria: parts.filter(Boolean).join(', ') + '.',
  };
}

// De hele tijdlijn. view: stationlife.stationView() ({ name, nu, bord }); met { max } kan het aantal omlaag.
// Geeft { now, nowLabel, name, horizon, horizonMin, axis, items, firstId, empty, emptyText, aria, sig }.
// - gesorteerd op verwachte tijd (stabiel: gelijke tijd blijft in bordvolgorde), maximaal `max` treinen;
// - een rij zonder geldige tijd valt weg; een trein die al meer dan GRACE_S weg is ook;
// - de eerste trein die niet vervalt is de uitgelichte (first); een vervallen trein valt nooit op boven een rijdende;
// - nu over middernacht: de tijden lopen door (86400 +), het label gaat rond.
export function buildTimeline(view, { max = MAX_TRAINS } = {}) {
  const nowOk = !!view && isNum(view.nu);
  const now = nowOk ? view.nu : 0;
  const board = view && Array.isArray(view.bord) ? view.bord : [];
  const n = Math.max(1, Math.min(MAX_TRAINS, Number.isFinite(max) ? Math.floor(max) : MAX_TRAINS));
  const rows = nowOk ? board.map((r, i) => ({ r, i })).filter(({ r }) => r && isNum(r.tijd) && r.tijd - now >= -GRACE_S)
    .sort((a, b) => a.r.tijd - b.r.tijd || a.i - b.i).slice(0, n).map(({ r }) => r) : [];
  const horizon = horizonFor(rows.map((r) => r.tijd - now));
  const items = rows.map((r) => trainPoint(r, now, horizon)).filter(Boolean);
  // twee rijen met dezelfde sleutel (zelfde trein, lijn en plantijd) zouden in het bord één rij delen en er één laten verdwijnen
  const gezien = new Map();
  for (const x of items) {
    const n = (gezien.get(x.id) || 0) + 1;
    gezien.set(x.id, n);
    if (n > 1) x.id = `${x.id}#${n}`;
  }
  const first = items.find((x) => !x.cancelled) || null;
  if (first) { first.first = true; first.tone = first.high ? TONE.red : TONE.board; }
  const empty = items.length === 0;
  const emptyText = !nowOk ? 'Geen vertrekgegevens' : 'Geen treinen meer vandaag';
  const name = view && typeof view.name === 'string' ? view.name : '';
  const nowLabel = nowOk ? tijdLabel(now) : '';
  const aria = empty ? `${emptyText}${name ? ` op ${name}` : ''}.`
    : `Eerstvolgende treinen${name ? ` op ${name}` : ''}, nu ${nowLabel}. ${items.map((x, i) => `${i + 1}. ${x.aria}`).join(' ')}`;
  return {
    now, nowLabel, name, horizon, horizonMin: horizon / 60, axis: axisFor(horizon),
    items, firstId: first ? first.id : null, empty, emptyText, aria,
    sig: empty ? `empty|${emptyText}` : `${nowLabel}|${items.map((x) => `${x.id}:${x.time}:${x.distance}:${x.status}:${x.badge}`).join(';')}`,
  };
}
