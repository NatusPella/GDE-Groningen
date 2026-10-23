// Made-up makes and models (no real brands), with a Grunn wink.
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
  motor: [['Wadden', 'Stormvogel']],
  boat: [['Sloep', 'Nait Soezen'], ['Sloep', 'Grachtengast']],
  heli: [['Rotor Roelf', 'Wieken Wubbo']],
};
const BOATS = {
  rondvaart: [['Rondvaartboot', 'Diepenring'], ['Rondvaartboot', 'Stadjer']],
  kano: [['Kano', 'Peddelpiet'], ['Kano', 'Reitdiepper']],
  kajak: [['Kajak', 'Waterjuffer']],
  sup: [['SUP', 'Rechtop Roelie'], ['SUP', 'Plankgast']],
  skiff: [['Skiff', 'Eenpitter'], ['Skiff', 'Natte Mouwen']],
  acht: [['Acht', 'Vigilante Acht'], ['Acht', 'Slagroeier']],
  waterfiets: [['Waterfiets', 'Trapkoppel'], ['Waterfiets', 'Zwaantje']],
  rubberboot: [['Rubberboot', 'Stuiterbal'], ['Rubberboot', 'Zeehond']],
  dinghy: [['Bijbootje', 'Woonbootje'], ['Roeiboot', 'Kleine Jan']],
  skutsje: [['Skûtsje', 'Us Heit'], ['Skûtsje', 'Snackkening']],
};
const ZEILBOTEN = [['Zeilboot', 'Lekker Lijwaarts'], ['Zeilboot', 'Hoog aan de Wind']];
const ROEIBOTEN = [['Roeiboot', 'Krabbenlap'], ['Roeiboot', 'Natte Rug']];
// elektrisch en opgevoerd (de tokkie-auto), twee soorten uit het verkeer
const EV_NAMES = [['Wadden', 'Stroomer'], ['Hunze', 'Zoemer'], ['Reitdiep', 'Voltje']];
const TOKKIE_NAMES = [['Dollard', 'Dreunbak'], ['Eemshaven', 'Knalpot'], ['Hunze', 'Bonkerd']];
const HORSES = ['Bles', 'Dappere Dodo', 'Ome Willem', 'Bolle Berend'];
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
  if (v._mount === 'horse') return { make: 'Politiepaard', model: pick(HORSES, v.id) };
  if (v.isPolice) return { make: 'Politie', model: 'Achtervolger' };
  const name = v.model && v.model.name;
  // zeil- en roeiboot (#197) hebben een eigen naam, ook al delen ze de bijboot-romp
  if (v.isBoat && v.model.zeil) { const [make, model] = pick(ZEILBOTEN, v.id); return { make, model }; }
  if (v.isBoat && v.model.kind === 'skiff' && v.model.soort === 'roeiboot') { const [make, model] = pick(ROEIBOTEN, v.id); return { make, model }; }
  if (v.isBoat && BOATS[v.model.kind]) {
    const [make, model] = pick(BOATS[v.model.kind], v.id);
    return { make, model };
  }
  if (v.isAmbulance) return { make: 'Ambulance', model: 'Spoedrit' };
  if (name === 'hatch' && v.model.electric) {
    const [make, model] = pick(EV_NAMES, v.id);
    return { make, model };
  }
  if (name === 'hatch' && v.model.tokkie) {
    const [make, model] = pick(TOKKIE_NAMES, v.id);
    return { make, model };
  }
  if (name === 'hatch' && v.model.rusty) return { make: 'Dollard', model: 'Roestbak' };
  if (name === 'van' && v.model.livery === 'nieuws') return { make: 'Noord-Nieuws', model: 'Verslaggeversbus' };
  if (name === 'van' && v.model.livery === 'pakket') return { make: 'Pakkie Nou', model: 'Bezorgbus' };
  if (name === 'scooter' && v.model.geared) return { make: 'Tweetakt', model: 'Pruttelaar' };
  if (name === 'motor') {
    const k = v.model.motorbike;
    return k === 'naked' ? { make: 'Hunze', model: 'Knetter' } : k === 'old' ? { make: 'Dollard', model: 'Klassieker' } : { make: 'Wadden', model: 'Stormvogel' };
  }
  if (name === 'scooter' && v.model.moped) return { make: 'Snorscooter', model: 'Brommie' };
  if (name === 'trekkerlimo') return { make: 'Terpstra', model: 'Trekker-limo' };
  if (name === 'tractor') return { make: 'Ommelander', model: 'Trekker' };
  if (name === 'quad') return { make: 'Wierde', model: 'Quad' };
  if (name === 'truck' && v.model.tank) return { make: 'Us Mem Vet', model: 'Tankwagen' };
  if (name === 'bike' && v.model.cargo) return { make: 'Bakfiets', model: 'Kroost-Karretje' };
  if (name === 'bike' && v.model.old) return { make: 'Fiets', model: v.model.student && v.model.student.blauw ? 'Blauwbandige leenfiets' : 'Studentenbarrel' };
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
