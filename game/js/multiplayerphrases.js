// Samen spelen (#1159, #451): snelle zinnen en emotes. Een vaste lijst Nederlandse zinnen die je kiest uit een wiel; er is
// GEEN vrije tekst (constitutie 10: tekstchat komt later, opt-in). Over het net gaat alleen het id van de zin, de
// ontvanger zet er zelf de tekst bij: een bericht met een onbekend id of eigen tekst valt weg. Per speler dempen
// (geen zinnen en emotes) en blokkeren (ook geen pings of gedeelde doelen), zonder opslag: alleen in het geheugen,
// op naam, zodat het na een hostwissel (waarbij de plekken opnieuw verdeeld worden) blijft gelden.
// Opt-in: wie `samenZinnen` in de instellingen niet aanzet, verstuurt en ziet geen zinnen.
// Pure logica, geen DOM en geen netwerk (scripts/multiplayerphrases_test.mjs). Het wiel zelf staat in multiplayerphrasesradial.js.

export const PHRASE_KIND = 'zin'; // dezelfde JSON-berichten als de ping: PROTO en CODEC_VERSION blijven 2

// Wat je kunt kiezen. soort: 'zin' (tekst tussen aanhalingstekens), 'emote' (wat iemand doet) of 'doel' (een kaartactie
// die lokaal wordt afgehandeld en niet als zin over het net gaat).
export const PHRASES = [
  { id: 'hallo', soort: 'zin', pagina: 'zinnen', tekst: 'Hallo!', icoon: 'hand' },
  { id: 'dank', soort: 'zin', pagina: 'zinnen', tekst: 'Dank je!', icoon: 'hart' },
  { id: 'kom', soort: 'zin', pagina: 'zinnen', tekst: 'Ik kom eraan', icoon: 'pijl_rechts' },
  { id: 'wacht', soort: 'zin', pagina: 'zinnen', tekst: 'Wacht even', icoon: 'zandloper' },
  { id: 'volg', soort: 'zin', pagina: 'zinnen', tekst: 'Volg mij', icoon: 'pijl_rechts' },
  { id: 'goed', soort: 'zin', pagina: 'zinnen', tekst: 'Goed gedaan!', icoon: 'vinkje' },
  { id: 'sorry', soort: 'zin', pagina: 'zinnen', tekst: 'Sorry!', icoon: 'hand' },
  { id: 'hulp', soort: 'zin', pagina: 'zinnen', tekst: 'Ik heb hulp nodig', icoon: 'waarschuwing' },
  { id: 'zwaai', soort: 'emote', pagina: 'emotes', tekst: 'zwaait', icoon: 'hand' },
  { id: 'duim', soort: 'emote', pagina: 'emotes', tekst: 'steekt de duim op', icoon: 'vinkje' },
  { id: 'lach', soort: 'emote', pagina: 'emotes', tekst: 'lacht', icoon: 'hart' },
  { id: 'klap', soort: 'emote', pagina: 'emotes', tekst: 'klapt', icoon: 'hand' },
  { id: 'schouder', soort: 'emote', pagina: 'emotes', tekst: 'haalt de schouders op', icoon: 'vraag' },
  { id: 'buig', soort: 'emote', pagina: 'emotes', tekst: 'maakt een buiging', icoon: 'hart' },
  { id: 'doel-deel', soort: 'doel', pagina: 'emotes', tekst: 'Deel mijn doel', icoon: 'doel' },
  { id: 'doel-ping', soort: 'doel', pagina: 'emotes', tekst: 'Ping mijn doel', icoon: 'doel' },
];
const PER_ID = new Map(PHRASES.map((z) => [z.id, z]));
export const RADIAL_PAGES = ['zinnen', 'emotes'];
export const PAGE_TITLE = { zinnen: 'Zinnen', emotes: 'Emotes en doel' };

// Ontvangstregels (de host past ze toe voor hij doorstuurt; elke ontvanger nog eens)
export const PHRASE_COOLDOWN = 1.5;  // s tussen twee zinnen van dezelfde speler
export const PHRASE_SPAN = 15;    // s
export const PHRASE_BURST = 5; // zinnen per speler binnen dat venster
export const PHRASE_TTL = 4;         // s dat de regel of bel zichtbaar blijft

export const phraseEvent = (id) => ({ k: PHRASE_KIND, z: id });

// Een binnenkomend bericht: alleen een bekend id van soort zin of emote telt. Eigen tekst, een doel-id of iets anders valt weg.
export function readPhrase(body) {
  if (!body || body.k !== PHRASE_KIND || typeof body.z !== 'string') return null;
  const z = PER_ID.get(body.z);
  return z && z.soort !== 'doel' ? z : null;
}

// De regel voor wie hem ontvangt: `Tessa: "Dank je!"` of `Tessa zwaait.`; zonder bekende naam alleen de zin.
export function phraseLine(zin, naam) {
  if (!zin) return '';
  if (zin.soort === 'emote') return `${naam || 'Een speler'} ${zin.tekst}.`;
  return naam ? `${naam}: "${zin.tekst}"` : `"${zin.tekst}"`;
}

// ---- dempen en blokkeren: per speler, alleen in het geheugen, op naam
export const MUTE_STATES = ['gewoon', 'gedempt', 'geblokkeerd'];
export function createPhraseState() {
  return { laatste: {}, venster: {}, standen: new Map() };
}
// De sleutel van een speler: zijn naam (die blijft gelijk als de plekken na een hostwissel opnieuw verdeeld worden);
// zonder naam alleen de plek, waarmee dempen dan vanzelf vervalt bij een nieuwe verdeling.
export function keyOf(afz) {
  if (!afz) return '';
  const nameText = String(afz.naam || '').trim().toLowerCase();
  return nameText ? `n:${nameText}` : (Number.isInteger(afz.slot) ? `s:${afz.slot}` : '');
}
export function muteStateOf(staat, afz) {
  return (staat && staat.standen.get(keyOf(afz))) || 'gewoon';
}
// Zet een speler op gewoon, gedempt of geblokkeerd; je kunt jezelf niet dempen. Geeft de nieuwe stand terug (of null).
export function setMuteState(staat, afz, stand, ikZelf = false) {
  const k = keyOf(afz);
  if (!staat || !k || ikZelf || !MUTE_STATES.includes(stand)) return null;
  if (stand === 'gewoon') staat.standen.delete(k); else staat.standen.set(k, stand);
  return stand;
}
// De knop wisselt tussen aan en uit voor dezelfde stand ("Dempen" / "Dempen opheffen").
export function toggleMuteState(staat, afz, stand, ikZelf = false) {
  return setMuteState(staat, afz, muteStateOf(staat, afz) === stand ? 'gewoon' : stand, ikZelf);
}
export function clearMuteStates(staat) { if (staat) staat.standen.clear(); }
export const muteButtonText = (stand, nu) => ({
  gedempt: nu === 'gedempt' ? 'Dempen opheffen' : 'Dempen',
  geblokkeerd: nu === 'geblokkeerd' ? 'Blokkeren opheffen' : 'Blokkeren',
}[stand] || '');
export const MUTE_HELP = {
  gedempt: 'Gedempt: je ziet geen zinnen en emotes van deze speler. Pings en doelen blijven.',
  geblokkeerd: 'Geblokkeerd: je ziet geen zinnen, emotes, pings of gedeelde doelen van deze speler.',
};

// Mag dit bericht van deze speler bij mij in beeld? soort: 'zin' | 'emote' | 'ping' | 'doel'.
export function mayReceive(staat, afz, soort) {
  const s = muteStateOf(staat, afz);
  if (s === 'geblokkeerd') return false;
  if (s === 'gedempt') return soort === 'ping' || soort === 'doel';
  return true;
}

// Rate limit per afzender (sleutel = zijn plek bij deze ontvanger): geeft true als dit bericht mag en telt hem mee.
export function allowPhrase(staat, slot, nu) {
  if (!staat) return false;
  const k = String(slot);
  if (nu - (staat.laatste[k] ?? -1e9) < PHRASE_COOLDOWN) return false;
  const rij = (staat.venster[k] || []).filter((t) => nu - t < PHRASE_SPAN);
  if (rij.length >= PHRASE_BURST) { staat.venster[k] = rij; return false; }
  rij.push(nu); staat.venster[k] = rij; staat.laatste[k] = nu;
  return true;
}

// Een speler is weg: zijn ritme telt niet voor de volgende die zijn plek krijgt.
export function forgetSender(staat, slot) {
  if (!staat) return;
  const k = String(slot);
  delete staat.laatste[k]; delete staat.venster[k];
}

// Het hele ontvangstpad op één plek: opt-in, dempen/blokkeren en de rate limit. Geeft { toon, regel, zin, reden }.
// aan: staat de ontvanger zelf op opt-in? afz: { slot, naam }.
export function receivePhrase(staat, body, afz, nu, aan) {
  const zin = readPhrase(body);
  if (!zin) return { toon: false, reden: 'onbekend' };
  if (!aan) return { toon: false, reden: 'uit' };
  if (!mayReceive(staat, afz, zin.soort)) return { toon: false, reden: muteStateOf(staat, afz) };
  if (!allowPhrase(staat, afz && afz.slot, nu)) return { toon: false, reden: 'te-snel' };
  return { toon: true, zin, regel: phraseLine(zin, afz && afz.naam), reden: '' };
}

// ---- het wiel: acht plekken, de toets 1 t/m 8 staat in de knop (keycap) en de stick kiest op richting
export const RADIAL_SLOTS = 8;
export function makeRadial(pagina = 'zinnen') {
  const p = RADIAL_PAGES.includes(pagina) ? pagina : 'zinnen';
  return PHRASES.filter((z) => z.pagina === p).slice(0, RADIAL_SLOTS).map((z, i) => ({ ...z, toets: String(i + 1), hoek: (-90 + i * (360 / RADIAL_SLOTS)) }));
}
export const nextPage = (pagina) => RADIAL_PAGES[(RADIAL_PAGES.indexOf(pagina) + 1) % RADIAL_PAGES.length];
export function radialFromKey(pagina, toets) {
  return makeRadial(pagina).find((w) => w.toets === String(toets)) || null;
}
// De stick: richting naar de plek; binnen de dode zone kies je niets. Plek 1 staat boven, de rest met de klok mee.
export const STICK_MIN = 0.5;
export function radialFromStick(pagina, x, y) {
  const wiel = makeRadial(pagina);
  if (!wiel.length || !Number.isFinite(x) || !Number.isFinite(y) || Math.hypot(x, y) < STICK_MIN) return null;
  const graden = (Math.atan2(y, x) * 180) / Math.PI; // y naar beneden: -90 is boven
  const slice = 360 / wiel.length;
  let beste = null, bd = 1e9;
  for (const w of wiel) {
    let d = Math.abs(((graden - w.hoek + 540) % 360) - 180);
    if (d < bd) { bd = d; beste = w; }
  }
  return bd <= slice / 2 + 1e-9 ? beste : null;
}
