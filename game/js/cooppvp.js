// Samen spelen (#447): de passieve stand en spelers tegen elkaar (PvP), naar het voorbeeld van een passive mode. Pure logica, zonder three.js
// en zonder netwerk; getest in scripts/cooppvp_test.mjs.
// De regels: schade tussen spelers is er alleen als BEIDE spelers bewust niet op passief staan. Iedereen begint op passief, dus zoals
// het was: geen schade tussen spelers. Omschakelen heeft een afkoelperiode (geen heen en weer wisselen midden in een gevecht). Wie door een
// medespeler neergaat staat zonder kosten weer op en is even beschermd (tegen spawnkillen); dood door de wereld blijft zoals het was.
// Wie passief is en door een actieve speler wordt aangevallen, hoort dat één keer per paar seconden (pogingMelden).
// Het gaat over gewone JSON-berichten (geen nieuw formaat, PROTO en CODEC_VERSION blijven 2): de gast vraagt { k: 'passief', a },
// wie het spel opende bewaart het per plek en geeft het aan iedereen door als { k: 'passiefvan', slot, a }. De host beslist.
// Een oudere host of gast negeert die berichten; omdat iedereen op passief begint raakt een oudere speler dus nooit door PvP.

export const PVP = Object.freeze({
  AFKOEL_S: 10,    // s: tussen twee keer omschakelen
  BESCHERM_S: 6,   // s: bescherming na het opstaan (en tot de beschermde zelf iemand aanvalt)
  MAX_SCHADE: 60,  // een treffer van een speler telt nooit meer dan dit
  POGING_S: 5,     // s: tussen twee meldingen "hij wilde je aanvallen" (een salvo kogels is één poging)
});
export const MIN_PVP_SLOT = 0, MAX_PVP_SLOT = 15;

export const PVP_TEKST = {
  passiefAan: 'Passieve stand aan: niemand kan je raken en jij raakt niemand.',
  passiefUit: 'Passieve stand uit: spelers die ook niet op passief staan kunnen je raken.',
  wacht: (s) => `Even wachten: over ${Math.max(1, Math.ceil(s))} s kun je weer wisselen.`,
  neergeslagen: (naam) => `${naam} heeft je neergeslagen. Je staat zonder kosten weer op en bent even beschermd.`,
  poging: (naam) => `${naam} wilde je aanvallen, maar je staat op passief. Er is niets gebeurd.`,
  neergeslagenAnderen: (dader, doel) => `${dader} heeft ${doel} neergeslagen.`,
  knopAan: 'Passieve stand: aan',
  knopUit: 'Passieve stand: uit',
  uitleg: 'Op passief neem je geen schade van spelers en doe je er geen. Spelers kunnen alleen tegen elkaar vechten als beiden op uit staan. Omschakelen kan niet meteen weer. Wie neergaat staat zonder kosten weer op.',
  nietBeschikbaar: 'Dat spel kent de passieve stand nog niet (een oudere versie).',
};

const slotOk = (s) => Number.isInteger(s) && s >= MIN_PVP_SLOT && s <= MAX_PVP_SLOT;

// st: { actief: { slot: true }, vrij: { slot: tijd }, tot: { slot: tijd }, poging: { 'dader>doel': tijd } } (alleen wie bewust op actief staat staat in `actief`)
export const maakPvp = () => ({ actief: {}, vrij: {}, tot: {}, poging: {} });
export const isPassief = (st, slot) => !(st && st.actief && st.actief[slot]);
// Staat er iemand bewust op actief? Dan is "passief" iets dat de anderen zien (kaarticoon grijs); anders is iedereen gewoon passief.
export const pvpInSpel = (st) => !!st && Object.keys(st.actief || {}).length > 0;
export const grijsBijPassief = (st, slot) => pvpInSpel(st) && isPassief(st, slot);

// Zet de stand direct (host: wat de gast vroeg, en een gast: wat de host doorgeeft). Geen afkoeling: die bewaakt wisselPassief.
export function zetPassiefStand(st, slot, passief) {
  if (!st || !slotOk(slot)) return false;
  if (passief) delete st.actief[slot]; else st.actief[slot] = true;
  return true;
}
export const verwijderSpeler = (st, slot) => {
  if (!st) return;
  delete st.actief[slot]; delete st.vrij[slot]; delete st.tot[slot];
  for (const k of Object.keys(st.poging || {})) { const [d, t] = k.split('>').map(Number); if (d === slot || t === slot) delete st.poging[k]; }
};

// Omschakelen met afkoeling. Geeft { ok, passief, rest }: rest is de wachttijd in s als het nog niet mag.
export function wisselPassief(st, slot, passief, nu) {
  if (!st || !slotOk(slot) || !Number.isFinite(nu)) return { ok: false, passief: true, rest: 0 };
  const nu_ = isPassief(st, slot);
  if (nu_ === !!passief) return { ok: true, passief: nu_, rest: 0, zelfde: true }; // al zo: niets te wachten
  const vrij = st.vrij[slot] || 0;
  if (nu < vrij) return { ok: false, passief: nu_, rest: vrij - nu };
  zetPassiefStand(st, slot, !!passief);
  st.vrij[slot] = nu + PVP.AFKOEL_S;
  return { ok: true, passief: !!passief, rest: 0 };
}
export const afkoelRest = (st, slot, nu) => Math.max(0, ((st && st.vrij && st.vrij[slot]) || 0) - nu);

// Bescherming na opstaan
export const geefBescherming = (st, slot, nu, s = PVP.BESCHERM_S) => { if (st && slotOk(slot)) st.tot[slot] = nu + s; };
export const beschermd = (st, slot, nu) => !!st && ((st.tot || {})[slot] || 0) > nu;

// De PvP-minigame (#454): alleen een speler buiten de passieve stand doet mee. De arena zelf staat in pvparena.js; dit is de
// enige plek waar de passieve stand en de arena elkaar raken, zodat de regel bij de PvP-laag blijft.
export const arenaToegestaan = (st, slot) => !!st && slotOk(slot) && !isPassief(st, slot);

// Mag `dader` `doel` raken? { ok, reden }. Een beschermde die zelf aanvalt verliest zijn bescherming (dat gebeurt in pvpSchade).
export function pvpMag(st, dader, doel, nu) {
  if (!st || !slotOk(dader) || !slotOk(doel)) return { ok: false, reden: 'onbekend' };
  if (dader === doel) return { ok: false, reden: 'zelf' };
  if (isPassief(st, dader)) return { ok: false, reden: 'dader-passief' };
  if (isPassief(st, doel)) return { ok: false, reden: 'doel-passief' };
  if (beschermd(st, doel, nu)) return { ok: false, reden: 'beschermd' };
  return { ok: true, reden: '' };
}
// De schade die er werkelijk is: { ok, reden, bedrag }.
export function pvpSchade(st, dader, doel, bedrag, nu) {
  const m = pvpMag(st, dader, doel, nu);
  if (!m.ok) return { ok: false, reden: m.reden, bedrag: 0 };
  const b = Math.max(0, Math.min(PVP.MAX_SCHADE, Number(bedrag) || 0));
  if (!(b > 0)) return { ok: false, reden: 'geen', bedrag: 0 };
  if (st.tot) delete st.tot[dader]; // wie beschermd is en zelf aanvalt, is het niet meer
  return { ok: true, reden: '', bedrag: b };
}

// Een passieve speler hoort dat iemand hem wilde raken (één keer per paar seconden: een salvo kogels is één poging).
// Alleen als de dader bewust actief is; twee passieve spelers "proberen" niets. Geeft true als de melding mag.
export function pogingMelden(st, dader, doel, nu) {
  if (!st || !slotOk(dader) || !slotOk(doel) || dader === doel || !Number.isFinite(nu)) return false;
  const pogingen = st.poging || (st.poging = {});
  const sleutel = `${dader}>${doel}`;
  if ((pogingen[sleutel] || 0) > nu) return false;
  pogingen[sleutel] = nu + PVP.POGING_S;
  return true;
}

// ---------------------------------------------------------------- berichten
export const passiefEvent = (passief) => ({ k: 'passief', a: !!passief });
export const leesPassief = (b) => (b && b.k === 'passief' && typeof b.a === 'boolean' ? { passief: b.a } : null);
export const passiefVanEvent = (slot, passief) => ({ k: 'passiefvan', slot: slot | 0, a: !!passief });
export const leesPassiefVan = (b) => (b && b.k === 'passiefvan' && slotOk(b.slot) && typeof b.a === 'boolean' ? { slot: b.slot, passief: b.a } : null);
// Schade van een medespeler aan een gast: de host rekent, de gast past zijn eigen gezondheid aan. `door` is de plek van de dader.
export const pvpSchadeEvent = (bedrag, door) => ({ k: 'schade', n: Math.round(Math.max(0, Math.min(PVP.MAX_SCHADE, Number(bedrag) || 0))), door: door | 0 });
export const leesPvpSchade = (b) => (b && b.k === 'schade' && slotOk(b.door) && Number.isFinite(b.n) ? { n: Math.max(0, Math.min(PVP.MAX_SCHADE, b.n)), door: b.door } : null);
// De gast is door een medespeler neergegaan en staat weer op: de host geeft hem bescherming en vertelt het de anderen.
export const pvpDoodEvent = (door) => ({ k: 'pvpdood', door: door | 0 });
export const leesPvpDood = (b) => (b && b.k === 'pvpdood' && slotOk(b.door) ? { door: b.door } : null);
