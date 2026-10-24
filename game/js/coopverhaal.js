// Samen spelen (#429): wat een verhaalopdracht van de gastheer betekent voor het eigen verhaal van een gast. Pure logica
// (geen DOM, geen opslag): de opgeslagen spel-gegevens gaan erin en een nieuwe versie komt eruit; coopsave.js en savegame.js
// doen het lezen en schrijven.
//
// De regels van de eigenaar (24-10):
//  1. Een verhaalopdracht die een gast meespeelt en die lukt, telt ook in zijn eigen verhaal als gedaan. Had hij hem al gedaan,
//     dan krijgt hij alleen de beloning (die komt los via deelMetGasten).
//  2. Is zijn eigen verhaal nog niet bij die stap, dan mag hij meedoen: zijn verhaal springt mee. De stappen ertussen tellen
//     als overgeslagen (zoals "Sla deze stap over": dezelfde vlaggen, kaarten en uitbetaling), met een spoilerwaarschuwing
//     en een J/N-bevestiging vooraf.
import { STEPS, STEP_BY_ID, PARTS, missionIndexOf, missionCode, stepDone, nextStoryStep, stepAvailable } from './storyarc.js';

// een overgeslagen verhaalmissie betaalt dit deel van zijn beloning, op 5 euro (zoals story.js skipCurrent)
export const SPRONG_DEEL = 0.5;
// wachttijd van een spoiler-bevestiging: bij de gast tot hij zelf "nee" zegt, bij de gastheer (ruimer) als vangnet
export const BEVESTIG_GAST = 30;
export const BEVESTIG_HOST = 40;

const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const lijst = (a) => (Array.isArray(a) ? a : []);
const idx = (stapId) => STEPS.findIndex((s) => s.id === stapId);

// De verhaalstap van een missie-index (de index die het 'missie'-bericht meegeeft), of null voor een bijbaan of andere missie.
export const stapVanMissie = (index) => missionCode(index | 0);
// Een stap-id uit een bericht: alleen een bekende stap, anders null.
export const geldigeStap = (id) => (typeof id === 'string' && STEP_BY_ID.has(id) ? id : null);

// Wat de gast al heeft: de gedane stappen en doorlopen missies in zijn opgeslagen spel.
function stand(data) {
  const s = isObj(data) && isObj(data.story) && data.story.v === 1 ? data.story : {};
  const m = isObj(data) && isObj(data.missions) ? data.missions : {};
  const done = new Set(lijst(s.done).filter((id) => STEP_BY_ID.has(id)));
  const missies = new Set(lijst(m.completed).filter(Number.isInteger));
  const kaarten = new Set(lijst(s.cards).filter((k) => PARTS[k]));
  return { done, missies, kaarten };
}
const doneFn = (st) => (id) => st.done.has(id);
const passedFn = (st) => (i) => st.missies.has(i);
const stapGedaan = (st, k) => stepDone(k, doneFn(st), passedFn(st));

// 'gedaan' (al gedaan: alleen de beloning), 'normaal' (het is de stap waar zijn eigen verhaal nu is) of 'vooruit' (zijn verhaal
// is er nog niet: meedoen laat het meespringen). null: geen verhaalstap, geen opgeslagen spel of een stap die nog niet gebouwd is.
export function verhaalStatus(data, stapId) {
  const k = idx(stapId);
  if (k < 0 || !isObj(data)) return null;
  const st = stand(data);
  if (stapGedaan(st, k)) return 'gedaan';
  if (!stepAvailable(STEPS[k])) return null;
  const nu = nextStoryStep(doneFn(st), passedFn(st), (p) => st.kaarten.has(p));
  return nu && nu.id === stapId ? 'normaal' : 'vooruit';
}

// Welke stappen overgeslagen worden als het verhaal naar stapId springt: alles ervoor wat nog niet gedaan is.
export function overTeSlaan(data, stapId) {
  const k = idx(stapId);
  if (k < 0) return [];
  const st = stand(data);
  const uit = [];
  for (let j = 0; j < k; j++) if (!stapGedaan(st, j)) uit.push(STEPS[j].id);
  return uit;
}

const rondOp5 = (n) => Math.round(n / 5) * 5;
// de uitbetaling van één overgeslagen missie (gelijk aan story.js skipCurrent)
export const sprongLoon = (step) => (step && step.kind === 'mission' ? rondOp5(((step.reward || 0) * SPRONG_DEEL)) : 0);

// De nieuwe opgeslagen gegevens nadat de gast stapId meespeelde en het lukte. Geeft { save, status, overgeslagen, bonus, missies } terug,
// of null als er niets te schrijven is (al gedaan, onbekende stap, geen opgeslagen spel): dubbel toepassen verandert dus niets.
// bonus = het geld van de overgeslagen missies; de beloning van de opdracht zelf komt apart als zijn deel.
// missies = de missie-indexen die er in zijn eigen save bij kwamen (voor zijn eigen prestaties, #429).
export function pasVerhaalToe(data, stapId) {
  const status = verhaalStatus(data, stapId);
  if (status !== 'normaal' && status !== 'vooruit') return null;
  const k = idx(stapId);
  const over = overTeSlaan(data, stapId);
  const s0 = isObj(data.story) && data.story.v === 1 ? data.story : {};
  const m0 = isObj(data.missions) ? data.missions : {};
  const done = new Set(lijst(s0.done).filter((id) => STEP_BY_ID.has(id)));
  const skipped = new Set(lijst(s0.skipped).filter((id) => STEP_BY_ID.has(id)));
  const flags = new Set(lijst(s0.flags).filter((f) => typeof f === 'string'));
  const kaarten = new Set(lijst(s0.cards).filter((c) => PARTS[c]));
  const fails = {};
  for (const [id, n] of Object.entries(isObj(s0.fails) ? s0.fails : {})) if (STEP_BY_ID.has(id) && Number.isFinite(n)) fails[id] = n;
  const completed = new Set(lijst(m0.completed).filter(Number.isInteger));
  const seen = new Set(lijst(m0.seen).filter(Number.isInteger));
  let bonus = 0;
  const missies = [];
  const klaar = (step) => {
    done.add(step.id); delete fails[step.id];
    if (step.unlocks) flags.add(step.unlocks);
    const i = step.kind === 'mission' ? missionIndexOf(step.mission) : -1;
    if (i >= 0 && !completed.has(i)) missies.push(i);
    if (i >= 0) { completed.add(i); seen.add(i); }
  };
  for (const id of over) { const step = STEP_BY_ID.get(id); skipped.add(id); klaar(step); bonus += sprongLoon(step); }
  klaar(STEPS[k]);
  // een sprong in een deel dat pas na een eindkaart begint (Deel 4): de kaart van het deel ervoor heeft gespeeld
  const deel = PARTS[STEPS[k].part];
  if (deel && deel.after) kaarten.add(deel.after);
  // de volgende openstaande missie van het verhaal (zoals missions.js nextOpenMission)
  const volgende = STEPS.find((s) => s.kind === 'mission' && missionIndexOf(s.mission) >= 0 && !completed.has(missionIndexOf(s.mission)));
  const index = volgende ? missionIndexOf(volgende.mission) : (Number.isInteger(m0.index) ? m0.index : 0);
  const save = {
    ...data,
    story: { ...s0, v: 1, done: [...done], skipped: [...skipped], fails, waived: lijst(s0.waived).filter((x) => typeof x === 'string'), voorschot: lijst(s0.voorschot).filter((id) => STEP_BY_ID.has(id)), cards: [...kaarten], flags: [...flags] },
    missions: { ...m0, index, completed: [...completed], seen: [...seen], medals: isObj(m0.medals) ? { ...m0.medals } : {} },
  };
  return { save, status, overgeslagen: over, bonus, missies };
}

// De tekst die de gast ziet bij een verhaalopdracht (vooruit: spoilerwaarschuwing en bevestiging).
export function statusTekst(status, label, rest = 10) {
  if (status === 'gedaan') return `Meedoen met ${label}? Die heb je in je eigen verhaal al gedaan: je krijgt alleen de beloning. J = ja, N = nee (anders doe je over ${Math.ceil(rest)} seconden mee).`;
  if (status === 'vooruit') return `Spoilerwaarschuwing: ${label} komt in jouw eigen verhaal pas later. Doe je mee, dan springt jouw verhaal mee naar deze stap en slaat het de stappen ertussen over. Meedoen? J = ja, N = nee (zonder antwoord doe je niet mee, nog ${Math.ceil(rest)} seconden).`;
  return null;
}
// De melding bij een gelukte opdracht, voor wie hem meespeelde.
export function uitslagTekst(status, label, n = 0, bonus = 0) {
  if (status === 'gedaan') return `Je had ${label} in je eigen verhaal al gedaan: je krijgt alleen de beloning.`;
  if (status === 'vooruit') return `Jouw eigen verhaal is meegesprongen naar ${label}.${n > 0 ? ` ${n} ${n === 1 ? 'stap' : 'stappen'} ervoor ${n === 1 ? 'is' : 'zijn'} overgeslagen${bonus > 0 ? ` (+€${bonus})` : ''}.` : ''}`;
  return `${label} staat nu ook in jouw eigen verhaal als gedaan.`;
}
