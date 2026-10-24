// Samen spelen (#452): wat de spelers samen beslissen. Alle spelers zijn gelijkwaardig; de host is alleen wie de game host en mag alleen kicken.
// Tijd verspringen (slapen, onderduiken), cheats, pauzeren en reizen zijn dus geen hostrechten. Pure logica, geen DOM, geen netwerk, geen imports:
// de spelmodules (safehuizen.js, home.js, cheats.js, ...) gebruiken dit zonder coopnet.js te importeren; coopnet.js haakt de stemming aan world.coopVraag.
//
// - meerSpelers(world): zit er minstens een tweede speler in de sessie? Met één speler blijft alles zoals het was.
// - Zachte pauze: een scherm dat de wereld alleen voor jou stilzet (afspeel-vooruit-dialoog, snelreis, laadscherm, fotomodus, hulpaanbod). Met meer
//   spelers loopt de wereld door (main.js, coopWereldDoorloop); een filmpje dat iedereen ziet blijft pauzeren (world.uiHard).
// - Stemming: een tijdsprong vraagt akkoord van alle andere spelers (J of N, STEM_SEC seconden, geen antwoord is nee). Wie alleen is, beslist zelf.

export const STEM_SEC = 10;
export const STEM_SOORTEN = ['slapen', 'onderduiken'];

// ---- wie speelt er mee
// Host: minstens een verbonden gast. Gast: altijd (hij zit in iemands sessie). Zonder sessie: nee.
export function meerSpelers(world) {
  const n = world && world.coopNet;
  if (!n) return false;
  if (n.role === 'client') return true;
  const r = n.hub && n.hub.roster && n.hub.roster.spelers;
  return !!(r && r.filter((p) => p.verbinding !== 'lost').length >= 2);
}
// Je zit zelf als gast in een sessie (de wereld loopt bij een ander).
export const isGast = (world) => !!(world && world.coopNet && world.coopNet.role === 'client');

// ---- zachte pauzes
export function zachtePauze(world, bron, aan) {
  if (!world) return;
  const z = world.uiZacht || (world.uiZacht = {});
  if (aan) z[bron] = true; else delete z[bron];
}
export const zachtAan = (world) => !!(world && world.uiZacht && Object.keys(world.uiZacht).length);
// De pauze is alleen zacht als niets anders (een filmpje, een minigame-scherm) de wereld stilzet.
export const zachtAlleen = (world) => !!(world && world.uiPaused && !world.uiHard && zachtAan(world));

// ---- klok: een tijdsprong die niet gezamenlijk is besloten mag niet. Met meer spelers rijdt een reis zonder de klok te verzetten.
export const klokSprongMag = (world) => !meerSpelers(world);

// ---- stemming (host)
// st: { id, soort, tekst, rest, keuze: { slot: 'wacht'|'ja'|'nee' }, uitslag: null|'ja'|'nee', reden }
export function stemBegin(id, soort, tekst, slots, sec = STEM_SEC) {
  const st = { id, soort, tekst: String(tekst || '').slice(0, 90), rest: sec, keuze: {}, uitslag: null, reden: '' };
  for (const s of slots || []) if (Number.isInteger(s) && s >= 1) st.keuze[s] = 'wacht';
  beoordeel(st);
  return st;
}
function beoordeel(st) {
  if (st.uitslag) return st.uitslag;
  const k = Object.values(st.keuze);
  if (k.includes('nee')) { st.uitslag = 'nee'; st.reden = 'nee'; }
  else if (k.every((x) => x === 'ja')) st.uitslag = 'ja'; // ook als er niemand meer te vragen is
  return st.uitslag;
}
export function stemAntwoord(st, slot, ja) {
  if (!st || st.uitslag || st.keuze[slot] !== 'wacht') return false;
  st.keuze[slot] = ja ? 'ja' : 'nee';
  beoordeel(st);
  return true;
}
// Wie wegvalt of vertrekt tijdens de stemming telt niet meer mee.
export function stemVerval(st, slot) {
  if (!st || st.uitslag || !(slot in st.keuze)) return false;
  delete st.keuze[slot];
  beoordeel(st);
  return true;
}
// Tijd: zonder antwoord is het nee.
export function stemTik(st, dt) {
  if (!st || st.uitslag) return st ? st.uitslag : null;
  st.rest -= dt;
  if (st.rest <= 0) { st.uitslag = 'nee'; st.reden = 'geen antwoord'; }
  return st.uitslag;
}
export const stemWachtOp = (st) => Object.keys(st.keuze).map(Number).filter((s) => st.keuze[s] === 'wacht');

// ---- teksten (alleen Nederlands)
export const STEM_TEKST = {
  slapen: (naam) => `${naam} wil slapen. De tijd springt dan voor iedereen vooruit.`,
  onderduiken: (naam) => `${naam} wil onderduiken. De tijd springt dan voor iedereen vooruit.`,
};
export const stemVraagTekst = (tekst) => `${tekst} Akkoord? J = ja, N = nee (geen antwoord is nee).`;
export const STEM_HOST = {
  wacht: 'Even wachten: de anderen kiezen of de tijd mag verspringen.',
  ja: 'Iedereen is akkoord.',
  nee: 'Niet iedereen is akkoord. De tijd blijft zoals hij is.',
  geenAntwoord: 'Niet iedereen antwoordde. De tijd blijft zoals hij is.',
  bezig: 'Er loopt al een stemming. Even geduld.',
  gast: 'De tijd verspringt alleen als iedereen akkoord is. Vraag het aan wie het spel opende, of speel in je eigen spel.',
};
export const stemUitslagTekst = (ok, reden = '') => (ok ? STEM_HOST.ja : reden === 'geen antwoord' ? STEM_HOST.geenAntwoord : STEM_HOST.nee);

// ---- het bericht naar de gasten en hun antwoord (gecontroleerd bij ontvangst)
export const stemEvent = (st) => ({ k: 'stem', id: st.id, soort: st.soort, tekst: st.tekst, sec: Math.max(1, Math.ceil(st.rest)) });
export function leesStemEvent(b) {
  if (!b || b.k !== 'stem' || !Number.isInteger(b.id) || !STEM_SOORTEN.includes(b.soort) || typeof b.tekst !== 'string') return null;
  return { id: b.id, soort: b.soort, tekst: b.tekst.slice(0, 90), rest: Number.isFinite(b.sec) ? Math.min(30, Math.max(1, b.sec)) : STEM_SEC };
}
export const stemAntwoordEvent = (id, ja) => ({ k: 'stemantwoord', id, ja: !!ja });
export function leesStemAntwoord(b) { return b && b.k === 'stemantwoord' && Number.isInteger(b.id) ? { id: b.id, ja: !!b.ja } : null; }
export const stemUitslagEvent = (id, ok, reden = '') => ({ k: 'stemuitslag', id, ok: !!ok, reden: reden === 'geen antwoord' ? 'geen antwoord' : '' });
export function leesStemUitslag(b) { return b && b.k === 'stemuitslag' && Number.isInteger(b.id) ? { id: b.id, ok: !!b.ok, reden: b.reden === 'geen antwoord' ? 'geen antwoord' : '' } : null; }

// ---- de spelmodules vragen akkoord: groepAkkoord(world, 'slapen', 'Tammo', naAkkoord)
// Alleen (of geen sessie): naAkkoord meteen, true. Host met anderen: stemming, naAkkoord alleen bij ja; true = de vraag loopt.
// Gast: kan de tijd niet verzetten (de wereld loopt bij een ander): een melding, false.
export function groepAkkoord(world, soort, naam, naAkkoord, naNee = null) {
  if (!meerSpelers(world)) { naAkkoord(); return true; }
  if (isGast(world) || typeof world.coopVraag !== 'function') {
    if (world.addMessage) world.addMessage(STEM_HOST.gast, 5);
    return false;
  }
  const tekst = (STEM_TEKST[soort] || STEM_TEKST.slapen)(naam || 'De ander');
  return world.coopVraag(soort, tekst, naAkkoord, naNee);
}

// ---- cheats en testmenu: uit in een sessie met meer spelers
export const CHEATS_UIT_TEKST = 'Cheats en het testmenu staan uit zolang je Samen spelen met anderen speelt.';
export const cheatsUit = (world) => meerSpelers(world);
