// Akte 2 of the new story, staged (#147, #163): the intros and outros of M08-M11 as cutscript scenes.
// The format is that of cutscenes_akte1.js (SPECS: cast, props, open, beats, shots, wide; the director
// of that file turns a spec and the spoken lines into a scene); cutscenes_akte1.js merges these specs into
// its own table, so missionstory.js asks one place. A beat whose line is not found is skipped.
// Coordinates are local to the player's spot: f forward, s left, h up (m).
//   M08.intro / M08.outro   Oma's call in the Oude Ebbingestraat, her room at the Noorderhaven (the list of five friends)
//   M09.intro / M09.outro   Geesje at the pastorie in Warffum, the church cellar in Usquert (Durk and Douwe too late)
//   M10.intro               Jelle's tractor-limo drives up, the golden case in his hand
//   M11.intro / M11.outro   Klaas on the quay of Zoutkamp; at the end of the night Dijkstra's call

// a rider crossing behind the scene (rider and bike are separate: the bike is a prop on the same path).
// #863: beiden volgen de echte weg (roadPathDef in cutscript.js) en verdwijnen na hun rit.
const rider = (id, look, from, to, t = 0, speed = 5.5) => {
  const face = Math.atan2(to[1] - from[1], to[0] - from[0]) * 180 / Math.PI;
  return {
    cast: { [id]: { key: look, at: [from[0], from[1]], face, anim: 'ride', bg: true, road: id + 'f' } },
    props: { [id + 'f']: { kind: 'fiets', at: [from[0], from[1], 0], face, road: 'cycle' } },
    cues: [{ t, actor: id, walk: [to], speed, ride: true }, { t, prop: id + 'f', path: [from, to], speed }],
  };
};
const merge = (...parts) => ({
  cast: Object.assign({}, ...parts.map((p) => p.cast || {})),
  props: Object.assign({}, ...parts.map((p) => p.props || {})),
  cues: parts.flatMap((p) => p.cues || []),
});

export const SPECS_AKTE2 = {};

// --- M07 Al het vet van Grunn -----------------------------------------------------------------
{
  // behind the wall: the tanker between two guard cars, a queue of the town with empty pans on the street
  SPECS_AKTE2['M07.intro'] = {
    // regieronde #1325: de sprekers van voren over de schouder van de ander (geen achterhoofd, geen as-sprong); het wereldlicht
    coverage: 'ots',
    duo: { tammo: { at: [0, 0.8], face: 0, anim: 'idle' }, tessa: { at: [0.2, -0.7], face: 10, anim: 'idle' } },
    cast: {
      pan1: { key: 'snackbar', at: [-3.2, 6.5], face: 270, anim: 'idle', bg: true, gest: ['shrug', 'idle'] },
      pan2: { key: 'harm', at: [-4.2, 7.6], face: 270, anim: 'idle', bg: true, gest: ['idle', 'point'] },
      pan3: { key: 'student', at: [-2.0, 8.4], face: 260, anim: 'idle', bg: true, gest: ['shake', 'idle'] },
    },
    props: {
      tank: { kind: 'tankwagen', at: [16, 0.5, 0], face: 0 },
      wacht1: { kind: 'auto', at: [14, 4.2, 0], face: 20 },
      wacht2: { kind: 'auto', at: [18.5, -3.2, 0], face: -20 },
      pannen: { kind: 'pan', at: [-3.4, 7.0, 0], face: 0 },
    },
    open: [{ actor: 'tessa', face: 'prop:tank' }, { actor: 'tammo', face: 'prop:tank' }, { actor: 'pan1', walk: [[-3.2, 4.5]], speed: 0.3 }],
    beats: [
      { on: 'Mevrouw. Al het vet', actor: 'tessa', anim: 'phone' },
      { on: 'Mevrouw. Al het vet', dt: 1.6, actor: 'pan2', anim: 'shrug' },
      { on: 'Eén klomp voor een stad', actor: 'tammo', face: 'actor:tessa' },
      { on: 'Zonder vet bakt', actor: 'tessa', anim: 'point' },
      { on: 'En de bal?', actor: 'tammo', face: 'actor:tessa' },
      { on: 'Die zijn we kwijt', actor: 'tessa', face: 'actor:tammo' },
      { on: 'Die zijn we kwijt', dt: 0.3, actor: 'tessa', anim: 'shrug' },
      { on: 'Die zijn we kwijt', dt: 1.8, actor: 'pan3', anim: 'shake' },
      // the plan: peek round the wall, then creep towards the tyres
      { on: 'Banden stuk', actor: 'tessa', anim: 'point' },
      { on: 'Banden stuk', dt: 0.3, actor: 'tessa', face: 'prop:wacht1' },
      { on: 'En de Krolbrug?', actor: 'tammo', anim: 'hips' },
      { on: 'Zie je. Daar kun je', actor: 'tessa', anim: 'laugh' },
      { on: 'Zie je. Daar kun je', dt: 0.6, actor: 'tessa', walk: [[3.2, -1.4]], speed: 1.8 },
      { on: 'Zie je. Daar kun je', dt: 0.6, actor: 'tammo', walk: [[2.8, 0.9]], speed: 1.8 },
    ],
    shots: [],
    wide: { from: [-5.5, 3.6, 3.4], to: [-2.8, 2.6, 2.6], look: 'mid:tank,wacht1@1.2', fov: 52, until: 2 },
  };

  // the Oosterpoort: the snack-bar owners cheer round the tanker, Tessa hides her buzzing phone, Tammo sees it
  SPECS_AKTE2['M07.outro'] = {
    duo: { tammo: { at: [0, 0.8], face: 0, anim: 'idle' }, tessa: { at: [0.2, -0.7], face: 10, anim: 'phone' } },
    cast: {
      snackbar: { key: 'snackbar', at: [3.4, 0.3], face: 185, anim: 'cheer', gest: ['cheer', 'talk', 'cheer'] },
      bar2: { key: 'harm', at: [4.2, 2.4], face: 200, anim: 'cheer', bg: true, gest: ['cheer', 'wave'] },
      bar3: { key: 'toerist', at: [4.6, -2.0], face: 160, anim: 'cheer', bg: true, gest: ['cheer', 'laugh'] },
    },
    props: { tank: { kind: 'tankwagen', at: [9, 0.4, 0], face: 180 }, pannen: { kind: 'pan', at: [3.0, 1.4, 0], face: 0 } },
    open: [{ actor: 'tessa', face: 'actor:snackbar' }, { actor: 'tammo', face: 'actor:snackbar' }, { actor: 'bar2', walk: [[2.6, 1.6]], speed: 1.4 }, { actor: 'bar3', walk: [[2.8, -1.4]], speed: 1.4 }],
    beats: [
      { on: 'Vet! Valt mie nait of', actor: 'snackbar', anim: 'cheer' },
      { on: 'Trede drie', actor: 'tessa', face: 'actor:tammo' },
      { on: 'Trede drie', dt: 0.3, actor: 'tessa', anim: 'point' },
      { on: 'Dit is het eerste', actor: 'tammo', anim: 'shrug' },
      { on: 'Dit is het eerste', dt: 1.5, actor: 'bar2', anim: 'laugh' },
      { on: 'Dit is het eerste', dt: 3.0, actor: 'tessa', anim: 'phone' },
      { on: 'Dit is het eerste', dt: 3.5, actor: 'tammo', face: 'actor:tessa' },
    ],
    shots: [{ on: 'Trede drie', dt: 0.1, shot: 'cut', at: [-1.6, -1.2, 1.5], look: 'mid:tessa,snackbar@1.3', fov: 42 }],
    wide: { from: [-4.4, 4.0, 3.2], to: [-2.2, 3.0, 2.5], look: 'mid:snackbar,tessa@1.3', fov: 50, until: 2 },
  };
}

// --- M08 Fatbikes tellen niet als fiets -------------------------------------------------------
{
  // fatbikes on the pavement from both sides, two on one (Durk and Douwe)
  const life = merge(
    rider('fb1', 'harm', [-22, -6.2], [40, -6.2], 0.6, 6.5),
    rider('fb2', 'toerist', [44, 6.0], [-22, 6.0], 2.2, 7),
    rider('fb3', 'student', [-26, 5.2], [44, 5.2], 5.5, 6),
  );
  SPECS_AKTE2['M08.intro'] = {
    duo: { tammo: { at: [0, 0.8], face: 0, anim: 'phone' }, tessa: { at: [0.2, -0.7], face: 20, anim: 'idle' } },
    cast: { ...life.cast },
    props: { ...life.props },
    open: [{ actor: 'tessa', face: 'actor:tammo' }, ...life.cues],
    beats: [
      { on: 'Tammo, met je oma', actor: 'tessa', anim: 'point' },
      { on: 'Tammo, met je oma', dt: 0.3, actor: 'tessa', face: 'prop:fb1f' },
      { on: 'Fatbikes tellen niet', actor: 'tammo', anim: 'shrug' },
      { on: 'Loop jij daar', actor: 'tammo', anim: 'phone' },
      { on: 'Loop jij daar', dt: 0.4, actor: 'tessa', anim: 'laugh' },
      { on: 'Zeg dat maar', dt: 0.2, actor: 'tammo', anim: 'shake' },
      { on: 'Zeg dat maar', dt: 1.0, actor: 'tessa', walk: [[2.6, -0.7]], speed: 1.8 },
      { on: 'Zeg dat maar', dt: 1.2, actor: 'tammo', walk: [[2.3, 0.8]], speed: 1.8 },
    ],
    shots: [],
    wide: { from: [-6.5, 4.4, 3.2], to: [-3.6, 3.2, 2.5], look: 'mid:tessa,tammo@1.2', fov: 50, until: 2 },
  };

  SPECS_AKTE2['M08.outro'] = {
    cast: { trijntje: { key: 'trijntje', at: [2.7, 0.2], face: 185, anim: 'idle', gest: ['talk', 'hips', 'point', 'shrug'] } },
    props: {
      foto: { kind: 'fotolijst', at: [4.8, -2.8, 0], face: 180 },
      lijstje: { kind: 'klembord', at: [2.7, 0.2, 1.0] },
      brij: { kind: 'pan', at: [1.6, 0.5, 0.85] },
      // het prikbord waar de vijf namen aan komen (Tessa: "Vijf namen voor het prikbord"); hangt naast de foto van 1953
      prikbord: { kind: 'prikbord', at: [4.8, 1.7, 0], face: 180 },
    },
    // #741: Oma's naamkaart hoort bij haar eerste zichtbare scène (haar kamer, M08.3); de regie van de
  // telefoonscène (M08.1) noemde hem al, maar daar is ze alleen aan de lijn.
  fx: [{ t: 0.4, fx: 'naam', text: 'Oma Trijntje', dur: 2.8 }],
  open: [{ actor: 'trijntje', face: 'actor:tammo' }, { actor: 'trijntje', carry: 'lijstje' }, { actor: 'tessa', face: 'actor:trijntje' }],
    beats: [
      { on: 'Eet je krentjebrij', actor: 'trijntje', face: 'prop:brij' },
      { on: 'Ik ben vierentwintig', actor: 'tammo', anim: 'shrug' },
      { on: 'Dan eet je hem', actor: 'trijntje', face: 'actor:tammo' },
      { on: 'Dan eet je hem', dt: 0.3, actor: 'trijntje', anim: 'hips' },
      // 1953: she looks at the photo on the wall
      { on: '1953. Dat ik won', dt: 2.3, actor: 'trijntje', face: 'prop:foto' },
      { on: '1953. Dat ik won', dt: 0.6, actor: 'trijntje', anim: 'point' },
      { on: '1953. Dat ik won', dt: 5.5, actor: 'trijntje', face: 'actor:tessa' },
      { on: 'Terpstra? Van Jelle', actor: 'tessa', anim: 'look' },
      { on: 'Haar kleinzoon, zeker', actor: 'trijntje', anim: 'shrug' },
      { on: 'Haar kleinzoon, zeker', dt: 3.0, actor: 'trijntje', anim: 'hips' },
      // the list of the five friends goes to Tessa
      { on: 'Het recept van 1953', dt: 0.2, actor: 'trijntje', walk: [[1.3, -0.3]], speed: 0.9 },
      { on: 'Het recept van 1953', dt: 4.4, actor: 'trijntje', drop: 'lijstje' },
      { on: 'Het recept van 1953', dt: 4.6, actor: 'tessa', carry: 'lijstje' },
      { on: 'Dan doen we mee', actor: 'tessa', anim: 'nod' },
      { on: 'Eerst Geesje', actor: 'trijntje', anim: 'point' },
      { on: 'Klaas in Zoutkamp', actor: 'trijntje', anim: 'shrug' },
      { on: 'Vijf namen voor het prikbord', actor: 'tessa', anim: 'nod' },
      { on: 'Die bal is gien geld', actor: 'trijntje', walk: [[1.5, 0.6]], speed: 0.9 },
      { on: 'Die bal is gien geld', dt: 0.5, actor: 'trijntje', face: 'actor:tammo' },
      { on: 'Ik zeg wel wat', actor: 'tammo', anim: 'nod' },
      { on: 'Niet tegen haar', actor: 'tessa', face: 'actor:tammo' },
      { on: 'Niet tegen haar', dt: 0.4, actor: 'tessa', anim: 'look' },
    ],
    shots: [{ on: '1953. Dat ik won', dt: 0.2, shot: 'cut', at: [0.4, 1.1, 1.7], look: 'mid:trijntje,foto@1.2', fov: 46 }],
    wide: { from: [-3.2, 3.8, 3], to: [-1.6, 2.8, 2.3], look: 'mid:trijntje,tessa@1.2', fov: 52, until: 1 },
  };
}

// --- M09 Heel aankomen is ook een kunst -------------------------------------------------------
{
  const kratten = {
    kratten1: { kind: 'krat', at: [5.4, -3.2, 0], face: 10 },
    kratten2: { kind: 'krat', at: [5.4, -3.9, 0], face: 350 },
    kratten3: { kind: 'krat', at: [5.4, -3.55, 0.45], face: 0 },
  };
  SPECS_AKTE2['M09.intro'] = {
    cast: { geesje: { key: 'geesje', at: [2.7, 0.4], face: 185, anim: 'idle', gest: ['talk', 'hips', 'point', 'shrug'] } },
    props: { trekker: { kind: 'trekker', at: [8.4, 4.4, 0], face: 205 }, ...kratten },
    open: [{ actor: 'geesje', face: 'actor:tessa' }, { actor: 'tammo', face: 'prop:trekker' }],
    beats: [
      { on: 'Jullie zijn van Trijntje', actor: 'geesje', anim: 'wave' },
      { on: 'Moi.', actor: 'tessa', anim: 'nod' },
      { on: 'Jelle Terpstra heeft alle', actor: 'geesje', anim: 'shrug' },
      { on: 'Jelle Terpstra heeft alle', dt: 3.4, actor: 'geesje', anim: 'hips' },
      { on: 'Jullie brengen ze heel', actor: 'geesje', face: 'prop:kratten3' },
      { on: 'Jullie brengen ze heel', dt: 0.3, actor: 'geesje', anim: 'point' },
      { on: 'Mijn vader had kippen', actor: 'tessa', anim: 'shrug' },
      { on: 'Vijf jaar. En dat', actor: 'tammo', face: 'actor:tessa' },
      { on: 'Je vroeg nooit naar', actor: 'tessa', anim: 'laugh' },
      { on: 'Heel, Tammo', actor: 'tessa', face: 'actor:tammo' },
      { on: 'Heel, Tammo', dt: 0.3, actor: 'tessa', anim: 'point' },
      { on: 'Ik rij nooit rap', actor: 'tammo', anim: 'shrug' },
      { on: 'Je hebt twee keer', actor: 'tessa', anim: 'hips' },
      { on: 'Eén keer', actor: 'tammo', anim: 'shake' },
      { on: 'De trekker staat', actor: 'geesje', face: 'prop:trekker' },
      { on: 'De trekker staat', dt: 0.3, actor: 'geesje', anim: 'point' },
      { on: 'De trekker staat', dt: 1.8, actor: 'tammo', walk: [[3.4, 2.4]], speed: 1.4 },
    ],
    shots: [],
    wide: { from: [-5.5, 4.6, 3.2], to: [-3.2, 3.4, 2.6], look: 'mid:geesje,trekker@1.2', fov: 50, until: 1 },
  };

  SPECS_AKTE2['M09.outro'] = {
    cast: {
      geesje: { key: 'geesje', at: [2.8, 0.6], face: 185, anim: 'idle', gest: ['talk', 'hips', 'point', 'shrug'] },
      durk: { key: 'durk', at: [16, 7.5], face: 200, anim: 'walk', gest: ['talk', 'shrug', 'hips'] },
      douwe: { key: 'douwe', at: [16.8, 6.3], face: 200, anim: 'walk', gest: ['shrug', 'idle'] },
    },
    props: {
      ...kratten,
      klomp: { kind: 'klomp', at: [16, 7.5, 1], face: 0 },
    },
    open: [
      { actor: 'geesje', face: 'prop:kratten3' },
      { actor: 'durk', carry: 'klomp' },
      // the twins come in from the churchyard, a little too late
      { t: 0.5, actor: 'durk', walk: [[5.6, 1.6]], speed: 1.15 },
      { t: 0.5, actor: 'douwe', walk: [[6.0, -0.2]], speed: 1.15 },
    ],
    beats: [
      { on: 'De kratten staan heel', actor: 'geesje', anim: 'wave' },
      { on: 'Zes kratten, zestig', actor: 'tessa', anim: 'cheer' },
      { on: 'Dat is meer dan', actor: 'geesje', anim: 'hips' },
      { on: 'Douwe. De eieren zijn weg', actor: 'durk', face: 'prop:kratten1' },
      { on: 'Douwe. De eieren zijn weg', dt: 0.4, actor: 'durk', anim: 'shake' },
      { on: '…weg', actor: 'douwe', face: 'prop:kratten2' },
      { on: 'Ze staan in de kerkkelder', actor: 'geesje', anim: 'point' },
      { on: 'Wij hebben geld', actor: 'durk', anim: 'point' },
      { on: 'Wij hebben geld', dt: 0.3, actor: 'durk', face: 'actor:geesje' },
      { on: 'Dan koopt u een eierkoek', actor: 'geesje', anim: 'hips' },
      { on: '…Hè', actor: 'douwe', anim: 'shrug' },
      { on: '…Hè', dt: 0.8, actor: 'tessa', anim: 'laugh' },
      { on: '…Hè', dt: 1.0, actor: 'tammo', anim: 'laugh' },
    ],
    shots: [{ on: 'Douwe. De eieren zijn weg', dt: 0.1, shot: 'cut', at: [-1.2, -1.6, 1.6], look: 'mid:durk,douwe@1.3', fov: 40 }],
    wide: { from: [-4.2, 4.4, 3.2], to: [-2.2, 3.2, 2.5], look: 'mid:geesje,kratten1@1.1', fov: 50, until: 2 },
  };
}

// --- M10 Een trekker-limo op de wierde --------------------------------------------------------
{
  SPECS_AKTE2['M10.intro'] = {
    // regieronde #1325: Jelle komt aan; tegenspraak van voren over de schouder, Durk loopt om de neus van de limo heen; hard zijlicht
    coverage: 'ots',
    light: 'spanning',
    // de drie stappen aan de zijkant van de limo uit (de deuren), niet midden uit de romp (de limo ligt op x 5,8 tot 11,4, y 3 tot 5)
    cast: {
      jelle: { key: 'jelle', at: [7.4, 5.3], face: 200, anim: 'walk', gest: ['talk', 'hips', 'point', 'shrug'], carry: 'koffer' },
      durk: { key: 'durk', at: [6.4, 5.5], face: 200, anim: 'walk', gest: ['idle', 'shrug'] },
      douwe: { key: 'douwe', at: [7.4, 2.7], face: 200, anim: 'walk', gest: ['idle', 'shrug'] },
    },
    props: {
      limo: { kind: 'limo', at: [8.6, 4.0, 0], face: 180 },
      koffer: { kind: 'koffer', at: [7.4, 5.3, 0.9], face: 0 },
    },
    // #741: Durk en Douwe zaten in M02 achter de kast; hun eerste zichtbare optreden is hier (M10.1).
    fx: [{ t: 2.2, fx: 'naam', text: 'Durk & Douwe', dur: 2.8 }],
    open: [
      // out of the limo, to the pair
      { actor: 'jelle', walk: [[5.2, 5.4], [3.4, 0.4]], speed: 1.1 },
      { actor: 'durk', walk: [[5.0, 5.7], [4.8, 1.8]], speed: 1.1 },
      { actor: 'douwe', walk: [[4.9, -1.0]], speed: 1.1 },
      { actor: 'tessa', face: 'actor:jelle' },
    ],
    beats: [
      { on: 'Goedemiddag', actor: 'jelle', anim: 'hips' },
      { on: 'U bent in het museum', actor: 'jelle', anim: 'point' },
      { on: 'En de bal?', actor: 'tessa', anim: 'hips' },
      { on: 'Die is hier', actor: 'jelle', anim: 'point' },
      { on: 'Die is hier', dt: 1.4, actor: 'jelle', face: 'prop:koffer' },
      { on: 'Je hebt hem dus echt', actor: 'tammo', anim: 'shake' },
      { on: 'Juridisch gezegd', actor: 'jelle', anim: 'shrug' },
      { on: 'Juridisch gezegd', dt: 1.6, actor: 'jelle', anim: 'point' },
      { on: 'Juridisch gezegd', dt: 1.6, actor: 'durk', walk: [[2.4, 1.4]], speed: 1.6 },
      { on: 'Juridisch gezegd', dt: 1.6, actor: 'douwe', walk: [[2.5, -0.8]], speed: 1.6 },
      { on: 'Uithuizen heeft een sloot', actor: 'tessa', anim: 'point' },
      { on: 'Uithuizen heeft een sloot', dt: 0.3, actor: 'tessa', walk: [[-2.4, -1.4]], speed: 2.8 },
      { on: 'Uithuizen heeft een sloot', dt: 0.3, actor: 'tammo', walk: [[-2.2, 0.8]], speed: 2.8 },
    ],
    shots: [],
    wide: { from: [-5.6, 4.8, 3.2], to: [-3.0, 3.4, 2.6], look: 'mid:limo,tessa@1.4', endLook: 'mid:tessa,tammo@1.2', fov: 50, until: 1 },
  };
}

// --- M11 Geleend van de Friezen ---------------------------------------------------------------
{
  SPECS_AKTE2['M11.intro'] = {
    // as-sprongen hersteld (180-gradenregel): deze shots vervangen de gegenereerde (missionScene, spec.shotFix)
    shotFix: [
      { t: 'L8', shot: 'cut', at: [0.77, 1.41, 1.55], look: 'speaker', fov: 38 },
      { t: 'L13', shot: 'cut', at: [1.03, 2.05, 1.55], look: 'speaker', fov: 38 },
    ],
    cast: { klaas: { key: 'klaas', at: [2.8, 0.7], face: 185, anim: 'idle', gest: ['talk', 'hips', 'point', 'shrug'] } },
    props: {
      fiets: { kind: 'fiets', at: [4.4, 3.4, 0], face: 250 },
      vesten: { kind: 'hesjes', at: [3.6, -2.6, 0], face: 30 },
    },
    open: [{ actor: 'klaas', face: 'actor:tessa' }, { actor: 'tessa', face: 'actor:klaas' }],
    beats: [
      { on: 'Van Trijntje, hè', actor: 'klaas', anim: 'wave' },
      { on: 'Twee.', actor: 'tammo', anim: 'shrug' },
      { on: 'Dertig jaar viste', actor: 'klaas', face: 'prop:fiets' },
      { on: 'Dertig jaar viste', dt: 2.8, actor: 'klaas', anim: 'point' },
      { on: 'Jelle vaart met een skûtsje', actor: 'klaas', face: 'actor:tammo' },
      { on: 'Dat is een val', actor: 'tessa', anim: 'hips' },
      { on: 'Natuurlijk.', actor: 'klaas', anim: 'shrug' },
      { on: 'Hier. Een snelle boot', actor: 'klaas', anim: 'point' },
      { on: 'Hier. Een snelle boot', dt: 0.3, actor: 'klaas', face: 'prop:vesten' },
      { on: 'Hier. Een snelle boot', dt: 0.9, actor: 'klaas', walk: [[3.7, -1.9]], speed: 0.9 },
      { on: 'Praat tegen je boot', dt: 0.1, actor: 'klaas', walk: [[1.9, 0.5]], speed: 0.9 },
      { on: 'Springen. Van een boot', actor: 'tammo', anim: 'shake' },
      { on: 'Jij stuurt, ik zeg', actor: 'tessa', anim: 'point' },
      { on: 'Praat tegen je boot', actor: 'klaas', face: 'actor:tammo' },
      { on: 'Praat tegen je boot', dt: 0.3, actor: 'klaas', anim: 'hips' },
      { on: 'Hij luistert niet', actor: 'tammo', anim: 'shrug' },
      { on: 'Hij luistert wel', actor: 'klaas', anim: 'nod' },
      { on: 'Hij luistert wel', dt: 1.0, actor: 'tessa', anim: 'laugh' },
    ],
    shots: [],
    wide: { from: [-4.6, 4.2, 3.0], to: [-2.4, 3.0, 2.4], look: 'mid:klaas,tessa@1.2', fov: 50, until: 1 },
  };

  SPECS_AKTE2['M11.outro'] = {
    cast: { klaas: { key: 'klaas', at: [2.7, 0.5], face: 185, anim: 'idle', gest: ['talk', 'hips', 'shrug'] } },
    props: { zak: { kind: 'tas', at: [1.8, -0.9, 0.2], face: 0 } },
    open: [{ actor: 'klaas', face: 'actor:tessa' }, { actor: 'tessa', carry: 'zak' }],
    beats: [
      { on: 'Dat zout is van Oma', actor: 'klaas', anim: 'hips' },
      { on: 'Dat zout is van Oma', dt: 2.4, actor: 'tessa', anim: 'cheer' },
      { on: 'Dijkstra, van het UMCG', actor: 'tammo', anim: 'phone' },
      { on: 'Dijkstra, van het UMCG', dt: 0.4, actor: 'tessa', face: 'actor:tammo' },
      { on: 'Een koopboek met alles', actor: 'tessa', anim: 'look' },
      { on: 'En daarna naar de Eemshaven', actor: 'klaas', anim: 'point' },
      { on: 'En daarna naar de Eemshaven', dt: 1.6, actor: 'klaas', anim: 'shrug' },
      { on: 'Dat zout is van Oma', dt: 0.4, actor: 'klaas', walk: [[2.2, 0.2]], speed: 0.8 },
      { on: 'Een koopboek met alles', dt: 0.3, actor: 'tessa', walk: [[1.2, -0.9]], speed: 1.4 },
    ],
    shots: [],
    wide: { from: [-3.4, 3.8, 2.9], to: [-1.8, 2.8, 2.3], look: 'mid:klaas,tessa@1.2', fov: 50, until: 1 },
  };
}

// --- M11.3: aan boord van het skûtsje, geen bal maar een broodtrommel met een briefje van Mem ----------------------------
SPECS_AKTE2['M11.3'] = {
  cast: {},
  props: {
    trommel: { kind: 'broodtrommel', at: [1.4, 0.2, 0.55], face: 0 },
    briefje: { kind: 'briefje', at: [1.4, -0.12, 0.6], face: 20 },
  },
  open: [{ actor: 'tessa', face: 'prop:trommel' }, { actor: 'tammo', face: 'prop:trommel' }],
  beats: [
    { on: 'Een broodtrommel. Geen bal', actor: 'tammo', anim: 'look' },
    { on: 'Er zit een briefje bij', actor: 'tessa', carry: 'briefje' },
    { on: 'Zijn oma pakt nog', actor: 'tammo', anim: 'shrug' },
    { on: '…Dat doen oma', actor: 'tessa', anim: 'look' },
    { on: 'Je kijkt raar', actor: 'tammo', face: 'actor:tessa' },
    { on: 'Het schommelt', actor: 'tessa', anim: 'shrug' },
    { on: 'Geen bal. Dan halen', actor: 'tessa', anim: 'point' },
  ],
  shots: [
    // sleutelmoment: Tessa kijkt te lang naar het briefje; de camera blijft bij haar gezicht
    { on: '…Dat doen oma', dt: 0.1, shot: 'close', target: 'tessa', dist: 1.3, side: -0.2, fov: 28 },
  ],
  wide: { from: [-4.2, 3.6, 3.0], to: [-2.4, 2.8, 2.2], look: 'mid:tammo,tessa@1.1', fov: 50, until: 1 },
};

// --- #742: de nacht op de zandplaat (M11.5 de Melkweg, M11.6 de lange blik) ----------------------
// De camera blijft laag, zodat de sterrenhemel boven de twee staat; geen generieke deckCam-drift meer.
SPECS_AKTE2['M11.5'] = {
  cast: { klaas: { key: 'klaas', at: [3.2, 0.8], face: 185, anim: 'idle', gest: ['talk', 'point', 'hips'] } },
  props: {},
  open: [{ actor: 'tessa', face: 'actor:klaas' }, { actor: 'tammo', face: 'actor:klaas' }, { t: 0.2, actor: 'tessa', walk: [[1.0, -0.5]], speed: 0.7 }],
  beats: [
    { on: 'Wij zitten vast', actor: 'klaas', anim: 'shrug' },
    { on: 'Kijk omhoog', actor: 'klaas', anim: 'point' },
    { on: 'Dat is de Melkweg', actor: 'tessa', anim: 'look' },
    { on: 'Ik dacht dat dat een vlek was', actor: 'tammo', anim: 'shrug' },
    { on: 'Het is een vlek van driehonderd miljard', actor: 'tessa', anim: 'point' },
    { on: '…Groter dan een vlek', actor: 'tammo', anim: 'look' },
  ],
  shots: [
    { on: 'Dat is de Melkweg', dt: 0.3, shot: 'dolly', from: [-2.0, -2.6, 0.95], to: [-0.8, -1.4, 1.05], look: 'tessa@1.45', fov: 46 },
    { on: 'Het is een vlek van driehonderd miljard', dt: 0.2, shot: 'cut', at: [-1.4, 2.2, 1.0], look: 'tammo@1.4', fov: 40 },
    // sleutelscène (#1138, R-21): Tammo's gezicht onder de sterren op de zin die ertoe doet
    { on: '…Groter dan een vlek', dt: 0.1, shot: 'close', target: 'tammo', dist: 1.3, side: -0.2, fov: 28 },
  ],
  wide: { from: [-4.8, 4.0, 3.2], to: [-2.8, 3.0, 2.4], look: 'mid:tammo,tessa@1.1', fov: 50, until: 1 },
};

SPECS_AKTE2['M11.6'] = {
  // regieronde #1325: de lange blik; van voren over de schouder van de ander, avondlicht dat warmer wordt bij de sterren
  coverage: 'ots',
  light: 'avond-buiten',
  lights: [{ on: 'Je kijkt naar mij', light: 'gouden-uur' }, { on: 'Kijk naar de sterren', light: 'warm-intiem' }],
  cast: {},
  props: {},
  open: [{ actor: 'tessa', face: 'actor:tammo' }, { actor: 'tammo', face: 'actor:tessa' }, { t: 0.2, actor: 'tammo', walk: [[1.8, 0.6]], speed: 0.7 }],
  beats: [
    { on: 'Hier zat ik vroeger', actor: 'tammo', anim: 'look' },
    { on: 'Alleen?', actor: 'tessa', anim: 'look' },
    { on: 'Met een zakje friet', actor: 'tammo', anim: 'shrug' },
    { on: 'Je kijkt naar mij', actor: 'tessa', anim: 'hips' },
    { on: 'Die gaan toch niet onder', actor: 'tammo', anim: 'look' },
    { on: 'Kijk naar de sterren', actor: 'tessa', anim: 'point' },
  ],
  shots: [
    { on: 'Je kijkt naar mij', dt: 0.3, shot: 'dolly', from: [1.8, -2.2, 1.0], to: [0.9, -1.2, 1.1], look: 'tessa@1.4', fov: 40 },
    { on: 'Kijk naar de sterren', dt: 0.2, shot: 'cut', at: [-1.6, 1.8, 0.95], look: 'tammo@1.35', fov: 42 },
  ],
  wide: { from: [-4.2, 3.6, 3.0], to: [-2.4, 2.8, 2.2], look: 'mid:tammo,tessa@1.1', fov: 50, until: 1 },
};


