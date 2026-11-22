// Het clubtenue van Tammo en Tessa (22-11, docs/VOETBALKLEDING-22-11.md): koppelt de voetbalcarrière (club, klasse, sponsors, kapitein) aan de kledingstukken van
// clothingkit.js. Puur op de kleding na: geen DOM en geen three; scripts/voetbalkleding_test.mjs. Het tenue is een tijdelijke override (clothing.setKit): de eigen
// outfit blijft bewaard en komt exact terug, ook na een crash, omdat hij nooit wordt aangeraakt en het tenue niet in de save staat.
//
// Samen spelen: het tenue reist als gewone outfit-code mee (clothing.localOutfitCode leest effectiveWorn); er is geen nieuw bericht. Wat alleen lokaal te zien is:
// het rugnummer en het sponsorpaneel (de wedstrijdfiguren tekenen die zelf uit de teamgegevens), de tweede kleur volgt voor een ander uit KIT_PAIR.
import { kitWorn, nearestKitColor, levelOfDivision, levelName, levelOrder, KIT_LEVELS, kitShirtSpec } from './clothingkit.js';
import { divisionOf } from './voetbalseason.js';
import { setKit, kitActive, kitWornOf, kitExtrasOf, effectiveWorn, ownWorn, givePiece, outfitToLook, npcOutfit, parsePiece, pieceLabel } from './clothing.js';

export const VARIANTS = ['thuis', 'uit', 'derde'];
export const VARIANT_NAMES = { thuis: 'Thuis', uit: 'Uit', derde: 'Derde' };
const CHARS = ['tammo', 'anita'];

// De clubkleuren (hex) als paletkleuren. team/club: { shirt, broek, keeper|keeperShirt, patroon }.
export function clubColors(club) {
  const c = club || {};
  const keeper = c.keeper != null ? c.keeper : c.keeperShirt;
  return {
    color: nearestKitColor(c.shirt != null ? c.shirt : 0x888888),
    shorts: nearestKitColor(c.broek != null ? c.broek : (c.shirt != null ? c.shirt : 0x888888)),
    keeperColor: nearestKitColor(keeper != null ? keeper : 0xf0c020),
    pattern: c.patroon || 'effen',
  };
}

// Het kitniveau van de carrière: de klasse van de eigen club (Talentenklasse amateur, Terpklasse semi-prof, Kroonklasse prof); de Waddenbeker is topniveau.
export function careerLevel(c, { kind = 'league' } = {}) {
  if (kind === 'europe') return 'top';
  return levelOfDivision((c && c.world && c.club ? divisionOf(c.world, c.club) : null) || 'talent');
}
export const isCaptain = (c) => !!(c && c.flags && c.flags.captain);

// De keuze van de speler in het Club-scherm: thuis, uit of derde, en een rugnummer; bewaard in de vlaggen van het carrièreprofiel (getallen mogen daar staan).
export function kitChoice(c) {
  const f = (c && c.flags) || {};
  const variant = VARIANTS[Math.max(0, Math.min(2, f.kitVar | 0))] || 'thuis';
  const num = f.kitNum | 0;
  return { variant, number: num >= 1 && num <= 99 ? num : ((c && c.me && c.me.num) | 0) || 10 };
}
export const withKitChoice = (c, { variant, number } = {}) => {
  if (!c) return c;
  const flags = { ...(c.flags || {}) };
  if (variant != null) flags.kitVar = Math.max(0, VARIANTS.indexOf(variant));
  if (number != null) flags.kitNum = Math.max(1, Math.min(99, number | 0));
  return { ...c, flags };
};
// Welke tenues staan open op dit niveau: thuis en uit altijd, derde alleen op topniveau.
export const variantsFor = (level) => (KIT_LEVELS[level] && KIT_LEVELS[level].third ? VARIANTS : VARIANTS.slice(0, 2));

// Het tenue voor een personage in een carrière. opts: { mode ('wedstrijd' | 'training' | 'intro'), kind, role, getClub, variant, number }.
export function careerKit(c, club, opts = {}) {
  const level = opts.level || careerLevel(c, opts);
  const choice = kitChoice(c);
  const cc = clubColors(club);
  const sponsors = c && c.sponsors && Array.isArray(c.sponsors.slots) ? c.sponsors.slots.filter((s) => s.accepted).map((s) => s.naam) : [];
  const k = kitWorn({
    ...cc, level, variant: opts.variant || choice.variant, role: opts.role || 'veld', mode: opts.mode || 'wedstrijd', long: false,
    number: opts.number != null ? opts.number : choice.number, name: !!opts.name, clubId: c ? c.club : '', sponsors, captain: isCaptain(c),
  });
  return k;
}

// Wat het Club-scherm toont (clubui.js): het niveau, de omschrijving, het gekozen tenue, het nummer, de sponsor en het shirt (stuk-id) voor het 3D-voorbeeld. null zonder carrière.
export function kitView(c, getClub) {
  if (!c || !c.started) return null;
  const club = getClub ? getClub(c.club) : null;
  if (!club) return null;
  const level = careerLevel(c), choice = kitChoice(c);
  const k = careerKit(c, club, { level, number: choice.number, name: true });
  return {
    level, naam: levelName(level), fabric: KIT_LEVELS[level].fabric, variant: k.variant, variants: variantsFor(level), number: choice.number,
    shirt: k.worn.top, shirtLabel: pieceLabel(k.worn.top), sponsor: k.extras.sponsor, pieces: Object.values(k.worn).map((p) => pieceLabel(p)).filter(Boolean),
  };
}

// Zet het tenue aan voor Tammo en Tessa (elk hun eigen rugnummer; de eigen speler kiest het nummer, de ander krijgt het nummer uit zijn spelersprofiel).
// Zonder carrière (kennismaking, straatvoetbal): een neutrale trainingsset. Geeft de lijst met kits die zijn gezet (voor melding en test).
export function applyKit(c, club, opts = {}) {
  const out = {};
  for (const ch of CHARS) {
    let kit;
    if (!c || !c.started || !club) kit = kitWorn({ level: 'straat', mode: opts.mode || 'wedstrijd', color: 'grijs' });
    else {
      const mine = ch === c.char;
      const number = mine ? kitChoice(c).number : ((c.mate && c.mate.num) | 0) || 11;
      kit = careerKit(c, club, { ...opts, number, name: true });
    }
    setKit(ch, kit);
    out[ch] = kit;
  }
  return out;
}
export function clearKit() { let any = false; for (const ch of CHARS) any = setKit(ch, null) || any; return any; }
export const kitIsOn = () => CHARS.some((ch) => kitActive(ch));

// Het kitniveau waarmee het tenue gekozen wordt voor een wedstrijd, en de melding bij promotie of degradatie. Een nieuw niveau geeft de stukken in de kast.
// Geeft { changed, from, to, given } ; de aanroeper zet de melding (world.addMessage) en slaat de vlag op (flags.kitLvl).
export function levelSync(c, club, { kind = 'league' } = {}) {
  if (!c || !c.started || !club) return { changed: false, to: null };
  const to = careerLevel(c, { kind: 'league' });
  const from = LEVEL_BY_FLAG[(c.flags && c.flags.kitLvl) | 0] || null;
  const changed = from !== to;
  let given = 0;
  if (changed) given = giveKitPieces(c, club, to);
  return { changed, from, to, given, flag: levelOrder(to) + 1 };
}
const LEVEL_BY_FLAG = [null, 'straat', 'amateur', 'semipro', 'pro', 'top'];
export const levelMessage = (level) => `Nieuw tenue: ${levelName(level)}`;
// de stukken van thuis en uit (en derde op topniveau) in de kast van beide personages
export function giveKitPieces(c, club, level) {
  let n = 0;
  for (const variant of variantsFor(level)) {
    const k = careerKit(c, club, { level, variant, mode: 'wedstrijd', number: kitChoice(c).number });
    for (const ch of CHARS) for (const p of Object.values(k.worn)) if (parsePiece(p) && givePiece(ch, p)) n++;
  }
  // het keepersset, het trainingspak en het hesje
  for (const mode of ['intro', 'training']) { const k = careerKit(c, club, { level, mode }); for (const ch of CHARS) for (const p of Object.values(k.worn)) if (parsePiece(p) && givePiece(ch, p)) n++; }
  const kk = careerKit(c, club, { level, role: 'keeper' });
  for (const ch of CHARS) for (const p of Object.values(kk.worn)) if (parsePiece(p) && givePiece(ch, p)) n++;
  return n;
}

// Een teamlid in de wedstrijd (voetbal.js makeActors): kleding uit hetzelfde systeem. team: { shirt, broek, keeperShirt, patroon }; opts: { level, role, number, variant,
// seed, human: { ownWorn }, extras }. Geeft de opties voor buildPersonMesh: { shirt, pants, shoes, look, shirtBands, hair, body, hairStyle }.
export function actorLook(team, opts = {}) {
  const cc = clubColors(team);
  const k = kitWorn({ ...cc, level: opts.level || 'amateur', role: opts.role === 'keeper' ? 'keeper' : 'veld', variant: opts.variant || 'thuis', mode: 'wedstrijd', number: opts.number || 1, name: !!opts.name, clubId: opts.clubId || '', sponsors: opts.sponsors || [], captain: !!opts.captain });
  const worn = { ...k.worn };
  const base = opts.human ? opts.human : npcOutfit(opts.seed || 1, 'voetballer', { hair: true, body: true, level: opts.level, color: cc.color });
  if (base.hair) worn.hair = base.hair;
  if (base.body) worn.body = base.body;
  return { ...outfitToLook(worn, {}, k.extras), kit: k };
}

export { kitWorn, levelName, levelOrder, KIT_LEVELS, kitShirtSpec, kitActive, kitWornOf, kitExtrasOf, effectiveWorn, ownWorn, pieceLabel };
