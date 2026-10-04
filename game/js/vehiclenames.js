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
  midibus: [['Stadsbus', 'Wijkhopper']],
  suv: [['Wadden', 'Landjonker'], ['Hunze', 'Borgheer']],
  taxi: [['Taxi', 'Stadstaxi 050'], ['Taxi', 'Nachtbraker']],
  cashvan: [['Poen Express', 'Kluiswagen']],
  foodtruck: [['Fjord', 'Frituur']],
  truck: [['Oldambt', 'Bakwagen'], ['Eemshaven', 'Sjouwer']],
  ambulance: [['Ambulance', 'Spoedrit']],
  scooter: [['E-step', 'Zoemzoem'], ['Deelstep', 'Stadswesp']],
  boat: [['Sloep', 'Nait Soezen'], ['Sloep', 'Grachtengast']],
  heli: [['Rotor Roelf', 'Wieken Wubbo']],
};
const BOATS = {
  rondvaart: [['Rondvaartboot', 'Diepenring'], ['Rondvaartboot', 'Stadjer']],
  kano: [['Kano', 'Peddelpiet'], ['Kano', 'Reitdiepper']],
  kajak: [['Kajak', 'Waterjuffer']],
  sup: [['SUP', 'Rechtop Roelie'], ['SUP', 'Plankgast']],
  waterfiets: [['Waterfiets', 'Trapkoppel'], ['Waterfiets', 'Zwaantje']],
  rubberboot: [['Rubberboot', 'Stuiterbal'], ['Rubberboot', 'Zeehond']],
  dinghy: [['Bijbootje', 'Woonbootje'], ['Roeiboot', 'Kleine Jan']],
  skutsje: [['Skûtsje', 'Us Heit'], ['Skûtsje', 'Snackkening']],
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
  if (v.isBoat && BOATS[v.model.kind]) {
    const [make, model] = pick(BOATS[v.model.kind], v.id);
    return { make, model };
  }
  if (v.isAmbulance) return { make: 'Ambulance', model: 'Spoedrit' };
  if (name === 'hatch' && v.model.rusty) return { make: 'Dollard', model: 'Roestbak' };
  if (name === 'van' && v.model.livery === 'pakket') return { make: 'Pakkie Nou', model: 'Bezorgbus' };
  if (name === 'scooter' && v.model.moped) return { make: 'Snorscooter', model: 'Brommie' };
  if (name === 'trekkerlimo') return { make: 'Terpstra', model: 'Trekker-limo' };
  if (name === 'tractor') return { make: 'Ommelander', model: 'Trekker' };
  if (name === 'truck' && v.model.tank) return { make: 'Us Mem Vet', model: 'Tankwagen' };
  if (name === 'bike' && v.model.cargo) return { make: 'Bakfiets', model: 'Kroost-Karretje' };
  if (name === 'bike' && v.model.old) return { make: 'Fiets', model: 'Studentenbarrel' };
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
