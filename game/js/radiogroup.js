// Samen spelen (22-11, ADR 0046): de radiozender in een gedeeld voertuig. De zender zelf is lokaal per speler (niets over het
// net, net als alle muziek); alleen de keuze van de bestuurder gaat als klein JSON-bericht (k 'zender', PROTO blijft 2) naar wie
// meerijdt, en een stem van een passagier gaat alleen naar de bestuurder. De bestuurder beslist: een stem is nooit een bevel.
// Puur en node-veilig (geen DOM, geen opslag, geen audio); coopnet.js doet het versturen, radio.js het afspelen.
import { channelById, DEFAULT_CHANNEL, channelForPlayer, tallyVotes, voteForChannel, dropVote, CHANNELS } from './radiochannels.js';

export const TUNE_KIND = 'zender';
export const TUNE_COOLDOWN = 1.5; // s tussen twee berichten van dezelfde speler (rate limit aan de hostkant en bij de ontvanger)

// Alleen een bekend zender-id gaat over het net, nooit tekst. Een gast zonder de geheime zender valt terug op G-Music (zie groupChannel).
export function readTune(body) {
  if (!body || typeof body !== 'object' || body.k !== TUNE_KIND) return null;
  if (typeof body.id !== 'string' || body.id.length > 24 || !channelById(body.id)) return null;
  return { id: body.id, stem: body.stem === true };
}
export const tuneEvent = (id, stem = false) => ({ k: TUNE_KIND, id, ...(stem ? { stem: true } : {}) });

// Naar wie gaat het bericht? Bestuurder: naar wie in hetzelfde voertuig zit. Passagier met stem: alleen naar de bestuurder van dat
// voertuig. Te voet: niemand. bezetting: [{ slot, voertuig, bestuurder }] (multiplayergoal.js occupancyOf).
export function tuneRecipients(van, stem, bezetting) {
  const list = (bezetting || []).filter((b) => b && Number.isInteger(b.slot));
  const ik = list.find((b) => b.slot === van);
  if (!ik || ik.voertuig == null) return [];
  const mee = list.filter((b) => b.slot !== van && b.voertuig === ik.voertuig);
  const targets = ik.bestuurder ? (stem ? [] : mee) : (stem ? mee.filter((b) => b.bestuurder) : []);
  return targets.map((b) => b.slot).sort((a, b) => a - b);
}

export const createRadioGroup = () => ({ bestuurder: null, votes: {}, volgt: true, eigen: null, laatste: {} });

// Rate limit per afzender (host bij het doorsturen, ontvanger bij het opnemen); true als dit bericht mag.
export function tunePace(staat, slot, nu) {
  const k = String(slot);
  if (nu - (staat.laatste[k] ?? -1e9) < TUNE_COOLDOWN) return false;
  staat.laatste[k] = nu;
  return true;
}

// Neem een bericht op. afz: { slot, naam }; mag: de afzender is niet gedempt of geblokkeerd; aan: de ontvanger heeft de zinnen aan.
export function receiveTune(staat, body, afz, nu, { mag = true, aan = true, voertuig = null } = {}) {
  const z = readTune(body);
  if (!z) return { toon: false, reden: 'onbekend' };
  if (!aan) return { toon: false, reden: 'uit' };
  if (!mag) return { toon: false, reden: 'geblokkeerd' };
  if (!afz || !Number.isInteger(afz.slot)) return { toon: false, reden: 'onbekend' };
  if (!tunePace(staat, 'in' + afz.slot, nu)) return { toon: false, reden: 'te-snel' };
  const name = afz.naam || 'Een speler';
  const z2 = channelById(z.id);
  if (z.stem) {
    staat.votes = voteForChannel(staat.votes, { player: afz.slot, driver: staat.bestuurder ? staat.bestuurder.slot : null, channel: z.id }, CHANNELS.map((c) => c.id));
    return { toon: true, regel: `${name} stemt op ${z2.name}.` };
  }
  staat.bestuurder = { slot: afz.slot, id: z.id, voertuig, at: nu };
  staat.votes = {}; // een nieuwe keuze van de bestuurder maakt de oude stemmen af
  return { toon: true, regel: `${name} zet ${z2.name} op.` };
}

// Wie uitstapt of wegvalt: zijn stem gaat mee; het voertuig houdt zijn zender (staat.bestuurder blijft staan tot een nieuwe
// bestuurder kiest). Geeft de staat terug.
export function groupLeave(staat, slot) {
  staat.votes = dropVote(staat.votes, slot);
  return staat;
}

// Wat hoort deze speler te horen? null = geen reden om zijn eigen zender te laten (te voet, zelf aan het stuur of geen keuze voor
// dit voertuig). ik: eigen slot. bezetting: zie hierboven. open: de zender-id's die deze speler mag kiezen (een geheime zender die
// hij niet heeft valt terug op G-Music). Het voertuig houdt zijn zender ook als de bestuurder wegvalt of uitstapt.
export function groupChannel(staat, ik, bezetting, open) {
  const b = staat && staat.bestuurder;
  if (!b) return null;
  const mij = (bezetting || []).find((x) => x && x.slot === ik);
  if (!mij || mij.voertuig == null || mij.bestuurder) return null;
  if (b.voertuig == null) b.voertuig = mij.voertuig; // het bericht was er eerder dan de eigen stoel in het beeld: bind aan het voertuig waar je nu zit
  if (b.voertuig !== mij.voertuig) return null;
  const pick = channelForPlayer({ driverChannel: b.id, follows: staat.volgt, own: staat.eigen });
  return open.includes(pick) ? pick : DEFAULT_CHANNEL;
}

export const FOOT_GRACE = 3; // s: een keuze die net binnenkwam blijft staan, de eigen stoel kan nog onderweg zijn in het beeld
// Te voet: de keuze van het vorige voertuig geldt niet meer en de stemmen zijn weg.
export function groupFootReset(staat, ik, bezetting, nu = Infinity) {
  const mij = (bezetting || []).find((x) => x && x.slot === ik);
  if (mij && mij.voertuig != null && !mij.bestuurder) return false;
  if (staat.bestuurder && Number.isFinite(staat.bestuurder.at) && nu - staat.bestuurder.at < FOOT_GRACE) return false;
  if (!staat.bestuurder && !Object.keys(staat.votes).length) return false;
  staat.bestuurder = null; staat.votes = {}; staat.eigen = null; staat.volgt = true;
  return true;
}

// Host: wie later instapt volgt de bestuurder. laatste: { bestuurderSlot: id } (wat elke bestuurder het laatst koos); gemeld: wat elke
// passagier al hoorde ({ slot: { van, id, voertuig } }). Geeft de berichten die nog moeten ({ naar, van, id }) en werkt gemeld bij.
export function tuneAfterBoarding(bezetting, laatste, gemeld) {
  const list = (bezetting || []).filter((x) => x && Number.isInteger(x.slot));
  const uit = [];
  for (const p of list) {
    if (p.voertuig == null || p.bestuurder) { delete gemeld[p.slot]; continue; }
    const d = list.find((x) => x.bestuurder && x.voertuig === p.voertuig && x.slot !== p.slot);
    const id = d && laatste[d.slot];
    if (!d || !id) continue;
    const g = gemeld[p.slot];
    if (g && g.van === d.slot && g.id === id && g.voertuig === p.voertuig) continue;
    gemeld[p.slot] = { van: d.slot, id, voertuig: p.voertuig };
    uit.push({ naar: p.slot, van: d.slot, id });
  }
  return uit;
}

// De stem die nu de meeste voorkeur heeft (een suggestie voor de bestuurder, nooit een bevel).
export const groupSuggestion = (staat, open) => tallyVotes(staat.votes, open).suggestion;
