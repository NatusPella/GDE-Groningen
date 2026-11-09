// #824: één compacte, altijd zichtbare bedieningsregel voor de HUD tijdens een missie, bijbaan
// of achtervolging. Puur: de wereld en de speler komen binnen, geen DOM. De HUD zet de regel in
// de bestaande doellijn (zone G), zodat hij nooit een eigen vak naast de rest van de HUD inneemt.
// De eierrit is een gewone missie met een voertuigstap: dezelfde regel geldt daar.
//   node scripts/controlhint_test.mjs
export const HINT_MAX_GROUPS = 4;

// Per context de toetsen en wat ze doen; kort genoeg voor één regel op 1280x720.
const HINTS = {
  foot: [
    { keys: ['w', 'a', 's', 'd'], werk: 'lopen' },
    { keys: ['shift'], werk: 'rennen' },
    { keys: ['e'], werk: 'gebruiken' },
  ],
  vehicle: [
    { keys: ['w', 's'], werk: 'gas en rem' },
    { keys: ['a', 'd'], werk: 'sturen' },
    { keys: ['spatie'], werk: 'handrem' },
    { keys: ['e'], werk: 'uitstappen' },
  ],
  boat: [
    { keys: ['w', 's'], werk: 'gas en rem' },
    { keys: ['a', 'd'], werk: 'sturen' },
    { keys: ['e'], werk: 'uitstappen' },
  ],
  plane: [
    { keys: ['w', 's'], werk: 'gas en rem' },
    { keys: ['a', 'd'], werk: 'rollen' },
    { keys: ['spatie'], werk: 'neus omhoog' },
    { keys: ['e'], werk: 'uitstappen' },
  ],
  heli: [
    { keys: ['w', 's'], werk: 'gas en rem' },
    { keys: ['a', 'd'], werk: 'draaien' },
    { keys: ['spatie'], werk: 'stijgen' },
    { keys: ['e'], werk: 'uitstappen' },
  ],
};

// Alleen tokens die de HUD als toetskap kent; een onbekende token zou een lege kap geven.
export const HINT_TOKENS = ['w', 'a', 's', 'd', 'e', 'shift', 'spatie'];

export const hintContext = (player = null) => {
  const v = player && player.inVehicle;
  if (!v) return 'foot';
  if (v.isBoat) return 'boat';
  if (v.isPlane) return 'plane';
  if (v.isHeli) return 'heli';
  return 'vehicle';
};

// Is er een missie, bijbaan of achtervolging waar de regel bij hoort?
export function hintActive(world) {
  if (!world) return false;
  const m = world.mission, job = world.sideJob;
  return !!((m && m.phase === 'active') || (job && job.active) || (world.wanted | 0) > 0);
}

// { context, groepen: [{ keys, werk }] } of null als er niets loopt.
export function controlHint(world, player = null) {
  if (!hintActive(world)) return null;
  const context = hintContext(player || world.player);
  return { context, groepen: HINTS[context].map((g) => ({ keys: [...g.keys], werk: g.werk })) };
}

// Eén korte regel als platte tekst (tests en de schermnarratie kunnen hem zo voorlezen).
export function hintText(hint, label = (k) => k) {
  if (!hint) return '';
  return hint.groepen.map((g) => `${g.keys.map(label).join('/')} ${g.werk}`).join(' · ');
}
