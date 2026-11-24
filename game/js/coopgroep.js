// Samen spelen (#452): wat de spelers samen beslissen. Alle spelers zijn gelijkwaardig; de host is alleen wie de game host en mag alleen kicken.
// Tijd verspringen (slapen, onderduiken), cheats, pauzeren en reizen zijn dus geen hostrechten. Pure logica, geen DOM, geen netwerk, geen imports:
// de spelmodules (safehuizen.js, home.js, cheats.js, ...) gebruiken dit zonder coopnet.js te importeren; coopnet.js haakt de stemming aan world.coopVraag.
//
// - meerSpelers(world): zit er minstens een tweede speler in de sessie? Met één speler blijft alles zoals het was.
// - Zachte pauze: een scherm dat de wereld alleen voor jou stilzet (afspeel-vooruit-dialoog, snelreis, laadscherm, fotomodus, hulpaanbod). Met meer
//   spelers loopt de wereld door (main.js, coopWereldDoorloop); een filmpje dat iedereen ziet blijft pauzeren (world.uiHard).
// - Stemming: een tijdsprong vraagt akkoord van alle andere spelers (J of N, STEM_SEC seconden, geen antwoord is nee). Wie alleen is, beslist zelf.

export const STEM_SEC = 10;
export const STEM_SOORTEN = ['slapen', 'onderduiken', 'stoppen', 'keuze', 'moeilijkheid', 'laden', 'cheats', 'reizen'];
// Wat elke speler kan voorstellen (24-11, besluit coördinator): geen hostrecht. Een gast stuurt een `stemverzoek`, de host legt het de groep voor.
export const VOORSTEL_SOORTEN = ['slapen', 'onderduiken', 'reizen', 'laden', 'cheats', 'stoppen'];
// Achterwaarts compatibel: een oude client kent de nieuwe soorten niet en negeert dan het hele bericht. Daarom gaat een nieuwe soort over de draad
// als een oude soort (de tekst staat er toch bij) met het echte woord in `wat`; een nieuwe client leest `wat`. Het protocol en CODEC_VERSION blijven gelijk.
export const OUDE_SOORT = { laden: 'stoppen', cheats: 'moeilijkheid', reizen: 'slapen' };

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
// Een voorstel van een gast (#1169, moeilijkheid): `metOpener` laat de opener (plek 0) ook stemmen, en de gast die het vroeg (`vrager`) telt als ja.
export function stemBegin(id, soort, tekst, slots, sec = STEM_SEC, { metOpener = false, vrager = null } = {}) {
  const st = { id, soort, tekst: String(tekst || '').slice(0, 90), rest: sec, keuze: {}, uitslag: null, reden: '' };
  if (metOpener) st.keuze[0] = 'wacht';
  for (const s of slots || []) if (Number.isInteger(s) && s >= 1) st.keuze[s] = s === vrager ? 'ja' : 'wacht';
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
// Wie op dit moment laadt of in een scène zit, kan niet antwoorden en telt niet mee (net als wie wegvalt).
export const isAfwezig = (world) => !!(world && (world.coopCutBezig != null || world.coopLaadt));
export const stemAfwezig = (st, slot) => stemVerval(st, slot);
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
  // #642: iedereen stoppen is ook een gezamenlijke keuze, net als de tijd
  stoppen: (naam) => `${naam} wil het spel voor iedereen stoppen.`,
  // moeilijkheid van de wereld (politie en verkeer) is een gezamenlijke keuze, geen hostrecht
  moeilijkheid: (naam) => `${naam} wil de moeilijkheid van de wereld aanpassen: politie en verkeer.`,
  laden: (naam) => `${naam} wil een ander spel laden. De sessie stopt dan voor iedereen.`,
  cheats: (naam) => `${naam} wil cheats aanzetten voor deze sessie. Iedereen moet ja zeggen.`,
  reizen: (naam) => `${naam} wil reizen. De tijd springt dan voor iedereen vooruit.`,
};
export const stemVraagTekst = (tekst) => `${tekst} Akkoord? J = ja, N = nee (geen antwoord is nee).`;
export const STEM_HOST = {
  wacht: 'Even wachten: de anderen kiezen of de tijd mag verspringen.',
  ja: 'Iedereen is akkoord.',
  nee: 'Niet iedereen is akkoord. De tijd blijft zoals hij is.',
  geenAntwoord: 'Niet iedereen antwoordde. De tijd blijft zoals hij is.',
  bezig: 'Er loopt al een stemming. Even geduld.',
  gast: 'Je voorstel is gedaan. De tijd verspringt alleen als iedereen akkoord is.',
  geenReactie: 'Niemand reageerde op je voorstel. Misschien draait de ander een oudere versie van het spel.',
};
export const stemUitslagTekst = (ok, reden = '', soort = '') => {
  if (soort === 'stoppen') return ok ? 'Iedereen is akkoord: het spel stopt.' : (reden === 'geen antwoord' ? 'Niet iedereen antwoordde; het spel gaat door.' : 'Niet iedereen is akkoord; het spel gaat door.');
  if (soort === 'laden') return ok ? 'Iedereen is akkoord: de sessie stopt zodat er een ander spel geladen kan worden.' : 'Niet iedereen is akkoord; er wordt niets geladen.';
  if (soort === 'cheats') return ok ? 'Iedereen is akkoord: cheats staan aan voor deze sessie.' : 'Niet iedereen is akkoord; cheats blijven uit.';
  if (soort === 'moeilijkheid') return ok ? 'De groep is akkoord: de moeilijkheid van de wereld is aangepast.' : (reden === 'geen antwoord' ? 'Er kwam te weinig antwoord; de moeilijkheid van de wereld blijft zoals hij was.' : 'De groep is het niet eens; de moeilijkheid van de wereld blijft zoals hij was.');
  return ok ? STEM_HOST.ja : reden === 'geen antwoord' ? STEM_HOST.geenAntwoord : STEM_HOST.nee;
};

// ---- stemming over een verhaal-keuze (#686)
// Een keuze-stap (stagechoice.js) is van de wereld van de opener, maar de keuze is van de groep. De host
// opent een stemming met de opties; elke speler (opener op plek 0 en elke gast) stemt op één optie.
// Meerderheid wint; bij een gelijkspel beslist de stem van de opener; wie niet antwoordt telt niet mee.
// Zonder enige stem is er geen meerderheid en valt de stemming terug op de standaardkeuze van de ronde
// (fallback, dezelfde als de tijdslimiet van de stap: round.timeoutPick of de laatste optie).
export const KEUZE_SEC = 6;
export const KEUZE_TEKST = {
  stem: (naam, opties) => `${naam} laat de groep kiezen: ${(opties || []).map((o, i) => `${i + 1} ${o}`).join(' · ')}.`,
  wacht: 'Jullie kiezen samen. Even wachten op de anderen.',
  uitslag: (optie) => `Jullie kozen: ${optie}.`,
};
export function stemKeuzeBegin(id, opties, slots, { sec = KEUZE_SEC, fallback = -1, tekst = '' } = {}) {
  const opt = (Array.isArray(opties) ? opties : []).map((o) => String(o).slice(0, 80)).filter(Boolean).slice(0, 6);
  const st = { id, soort: 'keuze', opties: opt, tekst: String(tekst || '').slice(0, 90), keuze: {}, uitslag: null, rest: sec, fallback: Number.isInteger(fallback) ? fallback : -1 };
  for (const s of slots || []) if (Number.isInteger(s) && s >= 0) st.keuze[s] = 'wacht';
  if (!opt.length) st.uitslag = -1;
  return st;
}
export function stemKeuzeAntwoord(st, slot, index) {
  if (!st || !st.opties || st.uitslag != null || !(slot in st.keuze) || st.keuze[slot] !== 'wacht') return false;
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= st.opties.length) return false;
  st.keuze[slot] = i;
  return true;
}
// Wie er nog moet stemmen.
export const stemKeuzeWacht = (st) => (st ? Object.keys(st.keuze).map(Number).filter((s) => st.keuze[s] === 'wacht') : []);
// De uitslag zonder te tikken: de optie met de meeste stemmen; gelijkspel → de stem van de opener (plek 0),
// en anders de laagste optie die bovenaan staat. Geen stemmen: de fallback van de ronde.
export function stemKeuzeUitslag(st) {
  if (!st || !st.opties || !st.opties.length) return -1;
  const telling = new Array(st.opties.length).fill(0);
  for (const v of Object.values(st.keuze)) if (Number.isInteger(v) && v >= 0 && v < telling.length) telling[v]++;
  const hoog = Math.max(0, ...telling);
  if (hoog === 0) return st.fallback >= 0 && st.fallback < st.opties.length ? st.fallback : st.opties.length - 1;
  const top = telling.map((n, i) => (n === hoog ? i : -1)).filter((i) => i >= 0);
  const eigen = st.keuze[0];
  return top.includes(eigen) ? eigen : top[0];
}
// Eén beeld van de stemming: klaar als iedereen stemde of de tijd om is. Geeft de uitslag of null.
export function stemKeuzeTik(st, dt) {
  if (!st || st.uitslag != null) return st ? st.uitslag : null;
  if (!stemKeuzeWacht(st).length) { st.uitslag = stemKeuzeUitslag(st); return st.uitslag; }
  st.rest -= dt;
  if (st.rest <= 0) { st.uitslag = stemKeuzeUitslag(st); }
  return st.uitslag;
}
// Een gast die wegvalt of vertrekt telt niet meer mee.
export function stemKeuzeVerval(st, slot) {
  if (!st || st.uitslag != null || !(slot in st.keuze)) return false;
  delete st.keuze[slot];
  return true;
}


// ---- een voorstel van een gast: elke speler kan een gezamenlijke keuze voorstellen (geen hostrecht)
export const stemVerzoekEvent = (soort, p = {}) => ({ k: 'stemverzoek', soort, ...(Number.isFinite(p.uur) ? { uur: p.uur } : {}), ...(Number.isFinite(p.uren) ? { uren: p.uren } : {}) });
export function leesStemVerzoek(b) {
  if (!b || b.k !== 'stemverzoek' || !VOORSTEL_SOORTEN.includes(b.soort)) return null;
  const uur = Number.isFinite(b.uur) ? ((b.uur % 24) + 24) % 24 : null, uren = Number.isFinite(b.uren) ? Math.min(24, Math.max(0, b.uren)) : null;
  return { soort: b.soort, uur, uren };
}

// ---- het bericht naar de gasten en hun antwoord (gecontroleerd bij ontvangst)
export const stemEvent = (st, ik = false) => ({ k: 'stem', ...(ik ? { ik: true } : {}), id: st.id, soort: OUDE_SOORT[st.soort] || st.soort, ...(OUDE_SOORT[st.soort] ? { wat: st.soort } : {}), tekst: st.tekst, sec: Math.max(1, Math.ceil(st.rest)), ...(st.soort === 'keuze' ? { opties: st.opties } : {}) });
export function leesStemEvent(b) {
  if (!b || b.k !== 'stem' || !Number.isInteger(b.id) || !STEM_SOORTEN.includes(b.soort)) return null;
  if (b.soort === 'keuze') { // #686: een keuze-stemming draagt de opties mee in plaats van een ja/nee-tekst
    if (!Array.isArray(b.opties) || !b.opties.length) return null;
    const opties = b.opties.slice(0, 6).map((o) => String(o).slice(0, 80)).filter(Boolean);
    if (!opties.length) return null;
    return { id: b.id, soort: 'keuze', opties, tekst: typeof b.tekst === 'string' ? b.tekst.slice(0, 90) : '', rest: Number.isFinite(b.sec) ? Math.min(30, Math.max(1, b.sec)) : KEUZE_SEC };
  }
  if (typeof b.tekst !== 'string') return null;
  return { ik: b.ik === true, id: b.id, soort: STEM_SOORTEN.includes(b.wat) && OUDE_SOORT[b.wat] === b.soort ? b.wat : b.soort, tekst: b.tekst.slice(0, 90), rest: Number.isFinite(b.sec) ? Math.min(30, Math.max(1, b.sec)) : STEM_SEC };
}
export const stemAntwoordEvent = (id, ja, keuze = null, afwezig = false) => ({ k: 'stemantwoord', id, ja: !!ja, ...(afwezig ? { afwezig: true } : {}), ...(Number.isInteger(keuze) && keuze >= 0 ? { keuze } : {}) });
export function leesStemAntwoord(b) { return b && b.k === 'stemantwoord' && Number.isInteger(b.id) ? { id: b.id, ja: !!b.ja, afwezig: b.afwezig === true, ...(Number.isInteger(b.keuze) && b.keuze >= 0 ? { keuze: b.keuze } : {}) } : null; }
export const stemUitslagEvent = (id, ok, reden = '', keuze = null) => ({ k: 'stemuitslag', id, ok: !!ok, reden: reden === 'geen antwoord' ? 'geen antwoord' : '', ...(Number.isInteger(keuze) && keuze >= 0 ? { keuze } : {}) });
export function leesStemUitslag(b) { return b && b.k === 'stemuitslag' && Number.isInteger(b.id) ? { id: b.id, ok: !!b.ok, reden: b.reden === 'geen antwoord' ? 'geen antwoord' : '', ...(Number.isInteger(b.keuze) && b.keuze >= 0 ? { keuze: b.keuze } : {}) } : null; }

// De naam van wie het vraagt: de speler op plek 0 in de lijst (coopplayers.js lijst), anders 'Een speler'.
export function eigenNaam(world) {
  const p = ((world && world.coopRoster) || []).find((x) => x && x.slot === 0);
  return (p && typeof p.naam === 'string' && p.naam) || 'Een speler';
}

// ---- de spelmodules vragen akkoord: groepAkkoord(world, 'slapen', 'Tammo', naAkkoord)
// Alleen (of geen sessie): naAkkoord meteen, true. Host met anderen: stemming, naAkkoord alleen bij ja; true = de vraag loopt.
// Gast: kan de tijd niet verzetten (de wereld loopt bij een ander): een melding, false.
export function groepAkkoord(world, soort, naam, naAkkoord, naNee = null, params = {}) {
  if (!meerSpelers(world)) { naAkkoord(); return true; }
  if (isGast(world) && typeof world.coopStemVerzoek === 'function') return world.coopStemVerzoek(soort, naAkkoord, naNee, params); // een gast stelt het zelf voor
  if (isGast(world) || typeof world.coopVraag !== 'function') {
    if (world.addMessage) world.addMessage(STEM_HOST.gast, 5);
    return false;
  }
  const tekst = (STEM_TEKST[soort] || STEM_TEKST.slapen)(naam || eigenNaam(world));
  return world.coopVraag(soort, tekst, naAkkoord, naNee);
}

// ---- cheats en testmenu: uit in een sessie met meer spelers
export const CHEATS_UIT_TEKST = 'Cheats en het testmenu staan uit zolang je Samen spelen met anderen speelt. Stel voor ze aan te zetten: dan moet iedereen ja zeggen.';
export const cheatsUit = (world) => meerSpelers(world) && !(world && world.coopCheatsOk); // aan alleen na een eenstemmig ja van de groep (soort 'cheats')
