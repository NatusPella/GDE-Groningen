// Meerijden (#97): een korte reisscène in plaats van een wachtscherm. Puur: de
// opbouw van de scène (shots in de regietaal van de cutscenes), de tijd, het
// skippen met spatie en wat er bij aankomst gebeurt. De wereld-laag (camera,
// fade, laadscherm) roept dit per beeld aan.
import { CAP } from './reistijd.js';

export const SKIP_KEY = ' ';            // spatie
export const SKIP_GUARD_S = 0.6;        // eerste momenten niet skippen: per ongeluk ingedrukt
export const SKIPPED_S = 1.4;           // ingekorte reis: korte aankomstshot na de fade
export const PLAYED_ARRIVAL_S = 2.4;

const SHOT_NAMES = {
  trein: ['perron', 'raam', 'aankomst'],
  bus: ['halte', 'raam', 'aankomst'],
  boot: ['kade', 'dek', 'aankomst'],
  auto: ['instappen', 'weg', 'aankomst'],
};

// De aanlegplaats van een bootreis (#438): het laatste punt van het laatste vaarstuk,
// dat is de kade bij het doel. De kaart zet de speler daar neer in plaats van 400 m verderop.
export function bootHaven(optie) {
  const legs = (optie && optie.legs) || [];
  for (let i = legs.length - 1; i >= 0; i--) {
    const l = legs[i];
    if (!l || l.kind !== 'boat' || !Array.isArray(l.pts) || !l.pts.length) continue;
    const q = l.pts[l.pts.length - 1];
    if (Array.isArray(q) && Number.isFinite(q[0]) && Number.isFinite(q[1])) return { x: q[0], y: q[1] };
  }
  return null;
}

// Scène voor een gekozen optie (uit ovopties.reisOpties). Duur is de echte reistijd
// ingekort tot CAP.meerijden; de klok loopt de echte tijd door (clockS).
export function ritPlan(optie) {
  const mode = SHOT_NAMES[optie.id] ? optie.id : 'auto';
  const playS = Math.max(6, Math.min(optie.etaS, CAP.meerijden));
  const names = SHOT_NAMES[mode];
  // eerste en laatste shot kort, het middenstuk neemt de rest
  const first = Math.min(5, playS * 0.2), last = Math.min(4, playS * 0.15);
  const dur = [first, playS - first - last, last];
  return {
    mode, playS, clockS: optie.etaS, price: optie.price || 0,
    shots: names.map((name, i) => ({ name, duur: dur[i], from: dur.slice(0, i).reduce((a, b) => a + b, 0) })),
    lines: (optie.lines || []).map((l) => l.name),
    stops: optie.stops || [],
    haven: mode === 'boot' ? bootHaven(optie) : null,
  };
}

export const startRit = (plan) => ({ plan, t: 0, skipped: false, done: false });

// Welke shot hoort bij tijd t?
export function shotAt(plan, t) {
  for (let i = plan.shots.length - 1; i >= 0; i--) if (t >= plan.shots[i].from) return plan.shots[i];
  return plan.shots[0];
}

// Mag er nu geskipt worden?
export const canSkip = (rit) => !rit.done && !rit.skipped && rit.t >= SKIP_GUARD_S;

// Eén beeld. input: { skip: bool } (spatie ingedrukt dit beeld). `done` zodra de
// scène uitgelopen of geskipt is.
export function stepRit(rit, dt, input = {}) {
  if (rit.done) return rit;
  if (input.skip && canSkip(rit)) { rit.skipped = true; rit.t = rit.plan.playS; }
  else rit.t += dt;
  rit.done = rit.skipped || rit.t >= rit.plan.playS;
  return rit;
}

// Hoeveel van de scène is gespeeld, 0..1 (voor een voortgangsstreepje)
export const voortgang = (rit) => Math.max(0, Math.min(1, rit.t / rit.plan.playS));

// Wat er bij aankomst gebeurt; overslaan verandert alleen de duur van de scène:
// dezelfde klok, dezelfde prijs, dezelfde plek. Te weinig geld: null.
// Met de boot kom je aan bij de aanlegplaats van de route (#438) in plaats van
// ergens binnen 400 m van het doel; de kaart zoekt daar de kade bij.
export function aankomst(rit, dest, geld) {
  const p = rit.plan;
  if (geld < p.price) return null;
  const min = Math.max(1, Math.round(p.clockS / 60));
  const haven = p.mode === 'boot' ? (p.haven || [...(p.stops || [])].reverse().find((s) => s && Number.isFinite(s.x) && Number.isFinite(s.y))) : null;
  return {
    x: haven ? haven.x : dest.x, y: haven ? haven.y : dest.y, naam: dest.name || '',
    prijs: p.price, klokMinuten: min,
    skipped: rit.skipped, aankomstS: rit.skipped ? SKIPPED_S : PLAYED_ARRIVAL_S,
    bericht: `Aangekomen${dest.name ? ` in ${dest.name}` : ''}. Reistijd ${min} minuten${p.price ? `, € ${p.price} armer` : ''}.`,
  };
}

// De witte toetsknop-hint voor de HUD (alleen als skippen kan)
export function skipHint(rit) {
  return canSkip(rit) ? { toets: 'Spatie', tekst: 'overslaan' } : null;
}

// Ondertitel bij de scène (alleen tekst): wat je nu doet, aan de hand van de
// haltes van de optie en hoe ver de scène is.
export function ondertitel(rit) {
  const p = rit.plan;
  const shot = shotAt(p, rit.t).name;
  const stops = p.stops || [];
  const lijn = p.lines[0] ? `${p.lines[0]} · ` : '';
  const first = stops[0], last = stops[stops.length - 1];
  // een boot heeft geen halte maar een aanlegplaats (#438); de rest houdt het bij haltes
  const plek = p.mode === 'boot' ? 'aanlegplaats' : 'halte';
  if (shot === 'aankomst') return last ? `Volgende ${plek}: ${last.name}` : 'Bijna daar';
  if (stops.length > 2 && shot !== p.shots[0].name) {
    const mid = stops.slice(1, -1);
    const k = Math.min(mid.length - 1, Math.floor(voortgang(rit) * mid.length));
    return `${lijn}${mid[k].kind === 'overstap' ? 'Overstappen op' : 'Via'} ${mid[k].name}`;
  }
  if (shot === p.shots[0].name) return first ? `${lijn}${p.mode === 'boot' ? 'Aan boord bij' : 'Instappen bij'} ${first.name}` : p.mode === 'boot' ? 'Aan boord' : 'Instappen';
  return `${lijn}Onderweg${last ? ` naar ${last.name}` : ''}`;
}
