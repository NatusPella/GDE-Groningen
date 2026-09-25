// Made-up makes and models (no real brands), GTA-style, with a Grunn wink.
// A vehicle keeps the same name for its lifetime: picked by its id.

const NAMES = {
  hatch: [['Dollard', 'Knakker'], ['Eemsmond', 'Pienter'], ['Hunze', 'Mug']],
  sedan: [['Wadden', 'Statig'], ['Hunze', 'Kanselier'], ['Reitdiep', 'Regent']],
  wagon: [['Reitdiep', 'Koopman'], ['Dollard', 'Stationair']],
  van: [['Oldambt', 'Klusbus'], ['Hunze', 'Pakezel']],
  sport: [['Wadden', 'Wervelwind'], ['Eemshaven', 'Raket']],
  police: [['Politie', 'Achtervolger']],
  bus: [['Stadsbus', 'Diepenrinkel']],
  scooter: [['Brommer', 'Zoemzoem'], ['Snorscooter', 'Stadswesp']],
  boat: [['Sloep', 'Nait Soezen'], ['Sloep', 'Grachtengast']],
};
const BIKES = [['Fiets', 'Omafiets'], ['Fiets', 'Transportfiets'], ['Fiets', 'Stadsfiets']];

function pick(list, id) {
  const n = Math.abs(Math.floor(Number(id) || 0));
  return list[n % list.length];
}

// { make, model } for the HUD; make may be '' for one-line names
export function vehicleDisplayName(v) {
  if (!v) return { make: '', model: 'Voertuig' };
  if (v.isHeroCar) return { make: 'Fjord', model: 'Escapade' };
  if (v.isPolice && v.isBoat) return { make: 'Politie', model: 'Boot' };
  if (v.isPolice) return { make: 'Politie', model: 'Achtervolger' };
  const name = v.model && v.model.name;
  if (name === 'bike') return v.model.fat ? { make: 'Fatbike', model: 'Dikke Tinus' } : { make: pick(BIKES, v.id)[0], model: pick(BIKES, v.id)[1] };
  const list = NAMES[name];
  if (!list) return { make: '', model: 'Voertuig' };
  const [make, model] = pick(list, v.id);
  return { make, model };
}

export function vehicleDisplayLabel(v) {
  const { make, model } = vehicleDisplayName(v);
  return make ? `${make} ${model}` : model;
}
