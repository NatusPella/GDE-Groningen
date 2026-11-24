// Voetbalmuziek (voetbalmuziek 22-11, docs/MUZIEK-VOETBAL-22-11.md): welke track hoort bij welke fase van de wedstrijd. Puur, geen DOM en geen imports (scripts/footballmusic_test.mjs).
// scenariomusic.js vraagt per beeld `footballMusicKey(world, settings)`; de scenario-laag (audio/scenario.js) doet het laden, de crossfade en het volume. Wie in de wedstrijd zit hoort de fasemuziek
// van zijn eigen scherm: de fase komt uit de eigen sim of de eigen spiegel (world.voetbalGame), dus er gaat niets over het netwerk. Zonder geleverde bestanden (lege BESCHIKBAAR) is het
// antwoord altijd null en speelt de radio, of stilte als de speler hem uitzette: er wordt niets opgehaald dat er niet is.

// Sleutel -> bestand in game/audio/voetbal/. `oneShot`: een sting die één keer speelt (geen lus).
export const FOOTBALL_TRACKS = {
  voetbal_opkomst: { file: 'opkomst.mp3', oneShot: false },       // opkomst en kleedkamer: opzwepend
  voetbal_rustig: { file: 'wedstrijd_rustig.mp3', oneShot: false }, // de gewone wedstrijdlus: rustig en spannend
  voetbal_tempo: { file: 'wedstrijd_tempo.mp3', oneShot: false },   // de slotfase: hoog tempo
  voetbal_club: { file: 'clublied.mp3', oneShot: false },          // clublied met hoefjes en trommels: rust en clubfeestjes
  voetbal_troost: { file: 'troost.mp3', oneShot: false },          // na verlies of gelijkspel
  voetbal_ambient: { file: 'club_ambient.mp3', oneShot: false },   // het clubscherm
  voetbal_sting_goal: { file: 'sting_doelpunt.mp3', oneShot: true },
  voetbal_sting_winst: { file: 'sting_winst.mp3', oneShot: true },
};
export const FOOTBALL_KEYS = Object.keys(FOOTBALL_TRACKS);

// De lijst die de eigenaar bijhoudt: alleen sleutels waarvan het bestand echt in game/audio/voetbal/ staat (scripts/footballmusic_test.mjs vergelijkt map en lijst).
export const FOOTBALL_AVAILABLE = ['voetbal_opkomst', 'voetbal_rustig', 'voetbal_tempo', 'voetbal_troost', 'voetbal_ambient', 'voetbal_sting_goal', 'voetbal_sting_winst'];

// Terugvallen als een track nog niet geleverd is: de eerstvolgende die er wel is (een ontbrekende sting laat de lus doorspelen, gedempt).
const FALLBACK = {
  voetbal_tempo: ['voetbal_rustig'],
  voetbal_club: ['voetbal_opkomst', 'voetbal_rustig'],
  voetbal_ambient: ['voetbal_club'],
  voetbal_troost: ['voetbal_ambient', 'voetbal_rustig'],
  voetbal_opkomst: ['voetbal_rustig'],
  voetbal_sting_goal: ['voetbal_rustig'],
  voetbal_sting_winst: ['voetbal_club', 'voetbal_rustig'],
};

export const footballTrackAvailable = (key, list = FOOTBALL_AVAILABLE) => list.includes(key);
export function pickAvailable(key, list = FOOTBALL_AVAILABLE) {
  if (!key) return null;
  if (list.includes(key)) return key;
  for (const k of FALLBACK[key] || []) if (list.includes(k)) return k;
  return null;
}

// Aan of uit via Instellingen (standaard aan).
export const footballMusicOn = (settings) => !settings || settings.footballMusic !== false;
// Het volume van de voetbalmuziek (0 tot 1, standaard 0,8); ligt onder de gewone muziekschuif.
export function footballMusicVolume(settings) {
  const v = settings && Number(settings.footballMusicVolume);
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.8;
}

// De slotfase: tweede helft en minder dan een kwart van de helft over, of een knappe stand (hooguit een doelpunt verschil) in de laatste helft van de tweede helft.
const FINAL_PHASE_SHARE = 0.25;
export function isFinalPhase(sim) {
  if (!sim || sim.helft !== 2) return false;
  const duur = Number(sim.duurHelft) || 0, klok = Number(sim.klok);
  if (!(duur > 0) || !Number.isFinite(klok)) return false;
  if (klok <= duur * FINAL_PHASE_SHARE) return true;
  const s = sim.score || [0, 0];
  return klok <= duur * 0.5 && Math.abs((s[0] | 0) - (s[1] | 0)) <= 1;
}

// Het team van de speler van dit scherm (0 of 1) in de sim of de spiegel.
export function ownTeamOf(sim) {
  if (!sim || !Array.isArray(sim.mensen)) return 0;
  const slot = sim.mijnSlot != null ? sim.mijnSlot : 0;
  const m = sim.mensen.find((x) => x.slot === slot) || sim.mensen[0];
  return m && m.team === 1 ? 1 : 0;
}
// 'winst', 'verlies' of 'gelijk' vanuit het eigen team.
export function outcomeFor(sim) {
  const s = (sim && sim.score) || [0, 0], t = ownTeamOf(sim);
  const gf = s[t] | 0, ga = s[1 - t] | 0;
  return gf > ga ? 'winst' : gf < ga ? 'verlies' : 'gelijk';
}

// De gewenste track (ongefilterd op wat er is) voor een wedstrijdfase, of null (stilte voor de muziek: het commentaar en het publiek hebben het podium).
export function matchPhaseKey(sim) {
  if (!sim) return null;
  switch (sim.fase) {
    case 'intro': return 'voetbal_opkomst';
    case 'aftrap': case 'spel': case 'hervat': return isFinalPhase(sim) ? 'voetbal_tempo' : 'voetbal_rustig';
    case 'goal': return 'voetbal_sting_goal';
    case 'rust': return 'voetbal_club';
    case 'eind': case 'klaar': return outcomeFor(sim) === 'winst' ? 'voetbal_sting_winst' : 'voetbal_troost';
    default: return null;
  }
}

// De demping (1 = niets) die de scenario-laag over de voetbalmuziek legt: bij een doelpunt en rond het fluitsignaal moeten het commentaar en het publiek erdoorheen.
export const DUCK_GOAL = 0.3;
export const DUCK_WHISTLE = 0.55;
export function footballDucking(world) {
  const g = world && world.voetbalGame, sim = g && g.sim;
  if (!sim) return 1;
  if (sim.fase === 'goal') return DUCK_GOAL;
  if ((sim.fase === 'aftrap' || sim.fase === 'hervat') && sim.hervat && sim.hervat.t < (sim.hervat.pauze || 0)) return DUCK_WHISTLE; // de scheids fluit en de spelers staan klaar
  if (sim.fase === 'eind') return DUCK_WHISTLE;
  return 1;
}

// De hoofdvraag: welke voetbal-sleutel hoort nu, of null. `clubScreen` = het pauzemenu staat open op het voetbal- of clubtabblad.
export function footballMusicKey(world, settings, { clubScreen = false, list = FOOTBALL_AVAILABLE } = {}) {
  if (!world || !footballMusicOn(settings) || !list.length) return null;
  const g = world.voetbalGame;
  if (g && g.sim) return pickAvailable(matchPhaseKey(g.sim), list);
  if (world.activityGame === 'penalty') return pickAvailable('voetbal_rustig', list);          // rustig en spannend
  if (world.activityGame === 'voetbaltraining') return pickAvailable('voetbal_rustig', list);
  if (clubScreen) return pickAvailable('voetbal_ambient', list);
  return null;
}
