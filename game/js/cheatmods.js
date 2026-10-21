// The live effect of the streken (cheats.js sets it each frame), read by
// the few systems they touch. No imports, so any module can read it.
export const MODS = {
  grav: 1, // player, companion and car gravity
  grip: 1, // tyre grip of the player's vehicle
  slow: 1, // extra gameplay time scale (slow-mo after a crash)
  cars: 1, // car traffic target
  bikes: 1, // bike traffic target
  scooters: 1, // scooter traffic target
  motors: 1, // brommer and motorbike traffic target
  look: null, // 3D look of new traffic cars (streekverkeer.js)
  fading: false, // a traffic factor is still on its way (the traffic dies out)
  pigeons: 1, // pigeon limit
  turbo: false, // the Escapade's top speed and acceleration
  bounce: false, // the player's car bounces on landing
  bigHeads: false,
  pedScale: 1, // size of the walkers (Kleine mensjes)
  pigeonScale: 1, // size of the pigeons (Reuzenduif)
  alwaysGreen: false, // every traffic light is green for the cars (Altijd groen)
  gronings: false,
};

// Plat Gronings for the subtitles, word by word (the voice keys keep the
// original text; only what is shown changes).
const GRO = {
  niet: 'nait', een: 'n', geen: 'gain', hallo: 'moi', hoi: 'moi', dag: 'moi', ja: 'jo', jij: 'doe', je: 'je', jou: 'die', jouw: 'dien',
  mijn: 'mien', hij: 'hai', zij: 'zai', wij: 'wie', we: 'wie', huis: 'hoes', uit: 'oet', buiten: 'boeten', goed: 'goud', heel: 'hail',
  klein: 'lutje', kleine: 'lutje', meisje: 'wicht', jongen: 'jong', kijk: 'kiek', kijken: 'kieken', even: 'eefkes', beetje: 'bietje',
  praten: 'proaten', weet: 'wait', met: 'mit', naar: 'noar', maar: 'mor', heb: 'heb', hebben: 'hebben', nu: 'nou', ook: 'ook',
  groningen: 'Grunn', groninger: 'Grunneger', groningers: 'Grunnegers', heerlijk: 'lekker', mooi: 'mooi', jullie: 'joe', zeker: 'vast',
  vandaag: 'vandoage', morgen: 'mörn', avond: 'oavend', water: 'woater', straat: 'stroat', fiets: 'fiets', auto: 'auto', eten: 'eten',
  wat: 'wat', waar: 'woar', daar: 'doar', hier: 'hier', zo: 'zo', schat: 'schat', vriend: 'moat', maat: 'moat', gek: 'mal', raar: 'roar',
};

export function grunnify(text) {
  if (typeof text !== 'string' || !text) return text;
  return text.replace(/[A-Za-zÀ-ÿ]+/g, (w) => {
    const g = GRO[w.toLowerCase()];
    if (!g) return w;
    if (w === w.toUpperCase() && w.length > 1) return g.toUpperCase();
    return w[0] === w[0].toUpperCase() ? g[0].toUpperCase() + g.slice(1) : g;
  });
}
