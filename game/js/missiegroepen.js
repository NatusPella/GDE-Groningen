// #492: de keten van een groep. De host houdt per missiegroep een eigen keten naast zijn eigen verhaal:
// een gast die zijn eigen opdracht start, krijgt een keten onder een groepssleutel (`groep:<id>`), zodat
// zijn opdracht niet in de keten van de host begint en de eigen voortgang van de host niet opschuift.
// Puur: de houder (Map sleutel -> keten) komt van buiten (missions.js), net als de bronketen en de index;
// deze module kopieert alleen de staat die een groep nodig heeft en bewaart niets zelf.
export const GROEP_PREFIX = 'groep:';
export const groepSleutel = (id) => (typeof id === 'string' && id ? GROEP_PREFIX + id : null);
export const isGroepSleutel = (sleutel) => typeof sleutel === 'string' && sleutel.startsWith(GROEP_PREFIX);
export const groepIdVanSleutel = (sleutel) => (isGroepSleutel(sleutel) ? sleutel.slice(GROEP_PREFIX.length) : null);

// Een eigen keten voor een groep: dezelfde defs en dezelfde voortgang als de bron (de eigen keten van de
// host), maar met een eigen index, fase, run en checkpointstand. De pub is van deze groep.
export function maakGroepKeten(bron, { index = 0, id = '' } = {}) {
  if (!bron || !Array.isArray(bron.defs) || !bron.defs.length) return null;
  const i = Math.max(0, Math.min(bron.defs.length - 1, Math.floor(Number(index) || 0)));
  return {
    ...bron,
    index: i,
    phase: 'active',
    timeLeft: 0,
    cooldownTimer: 0,
    wpIndex: 0,
    completed: new Set(bron.completed || []),
    seen: new Set(bron.seen || []),
    medalPaid: { ...(bron.medalPaid || {}) },
    checkpoints: new Map(bron.checkpoints || []),
    gastStart: null,
    resume: null,
    grace: null,
    retry: null,
    run: null,
    race: null,
    vehicle: null,
    leftover: null,
    boarded: false,
    bikes: [],
    crowd: [],
    pub: {
      ...(bron.pub || {}),
      id, label: (bron.defs[i] && bron.defs[i].label) || '', phase: 'active', index: i, timeLeft: 0,
      marker: { x: 0, y: 0 }, distanceToMarker: 0, remainingWaypoints: [],
    },
  };
}

// Open (of herpak) de keten van een groep in de houder. Bestaat er al een, dan begint hij opnieuw bij index.
export function openGroepKeten(houder, id, index, bron) {
  const sleutel = groepSleutel(id);
  if (!houder || !sleutel || !bron) return null;
  const st = maakGroepKeten(bron, { index, id });
  if (!st) return null;
  houder.set(sleutel, st);
  return sleutel;
}
export function sluitGroepKeten(houder, id) {
  const sleutel = groepSleutel(id);
  if (!houder || !sleutel) return false;
  return houder.delete(sleutel);
}
export const groepKeten = (houder, id) => (houder && groepSleutel(id) ? houder.get(groepSleutel(id)) || null : null);
// Alle groepsketens in de houder, voor de missielus en het per-groep bericht.
export function groepKetens(houder) {
  const out = [];
  if (!houder) return out;
  for (const [sleutel, st] of houder) if (isGroepSleutel(sleutel) && st) out.push({ id: groepIdVanSleutel(sleutel), sleutel, keten: st });
  return out;
}
