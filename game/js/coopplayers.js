// Samen spelen (#95): N spelers. De host (sterntopologie) speelt Tammo, de eerste
// gast Tessa (vaste personages); extra spelers (3e, 4e, ... tot het ingestelde
// maximum) spelen een eigen figuur uit een vaste lijst, zonder hoofdrol in het
// verhaal: ze doen mee in de open wereld en bij de coöp-activiteiten.
// Pure logica: de lijst met spelers (roster), plekken, figuren en kleuren,
// verwijderen, en wat er gebeurt als iemand wegvalt. Geen DOM, geen netwerk.

export const MIN_MAX = 4;   // de online modus laat minimaal 4 spelers toe
export const ABS_MAX = 16;  // bovengrens van het protocol (plekken in de codec); in de praktijk bepaalt de verbinding van de host het
export const DEFAULT_MAX = 8;
export const ADVIES_VANAF = 4; // vanaf dit aantal spelers waarschuwt de lobby voor prestaties en bandbreedte

// De vaste personages van de eerste twee plekken.
export const MAIN_CHARS = [
  { id: 'tammo', naam: 'Tammo', kleur: '#4fb3ff', vorm: 'driehoek' },
  { id: 'anita', naam: 'Tessa', kleur: '#ff7ab8', vorm: 'ruit' }, // 'anita' is het id van Tessa in storyarc
];
// Extra figuren: NPC-achtig, met een eigen uiterlijk (kleur/kleding) en naam. Verzonnen namen (constitution 2).
export const EXTRA_CHARS = [
  { id: 'rik', naam: 'Rik', kleur: '#f2b134', vorm: 'vierkant', kleding: 'geel overhemd', huid: 0xe0b48a, seed: 101, variant: 'male' },
  { id: 'sanne', naam: 'Sanne', kleur: '#5bd6a0', vorm: 'cirkel', kleding: 'groene jas', huid: 0xf1c9a5, seed: 102, variant: 'female' },
  { id: 'bram', naam: 'Bram', kleur: '#b78cff', vorm: 'vijfhoek', kleding: 'paarse trui', huid: 0xc68863, seed: 103, variant: 'male' },
  { id: 'lotte', naam: 'Lotte', kleur: '#ff9a62', vorm: 'ster', kleding: 'oranje regenjas', huid: 0xe0b48a, seed: 104, variant: 'female' },
  { id: 'daan', naam: 'Daan', kleur: '#6fd3e0', vorm: 'plus', kleding: 'lichtblauwe pet', huid: 0x8d5a3b, seed: 105, variant: 'male' },
  { id: 'fenna', naam: 'Fenna', kleur: '#e86a6a', vorm: 'kruis', kleding: 'rode sjaal', huid: 0xf1c9a5, seed: 106, variant: 'female' },
  { id: 'jelmer', naam: 'Jelmer', kleur: '#8fd14f', vorm: 'maan', kleding: 'lichtgroen shirt', huid: 0xc68863, seed: 107, variant: 'male' },
  { id: 'noor', naam: 'Noor', kleur: '#f08bd0', vorm: 'hart', kleding: 'roze hoodie', huid: 0xe0b48a, seed: 108, variant: 'female' },
  { id: 'sem', naam: 'Sem', kleur: '#d9c26a', vorm: 'bliksem', kleding: 'okergele jas', huid: 0xf1c9a5, seed: 109, variant: 'male' },
  { id: 'iris', naam: 'Iris', kleur: '#7a9cf0', vorm: 'druppel', kleding: 'blauwe regenjas', huid: 0x8d5a3b, seed: 110, variant: 'female' },
  { id: 'tijn', naam: 'Tijn', kleur: '#c9774a', vorm: 'blok', kleding: 'bruine werkjas', huid: 0xe0b48a, seed: 111, variant: 'male' },
  { id: 'liv', naam: 'Liv', kleur: '#59c9c0', vorm: 'golf', kleding: 'turquoise trui', huid: 0xc68863, seed: 112, variant: 'female' },
  { id: 'gijs', naam: 'Gijs', kleur: '#a58f7a', vorm: 'schild', kleding: 'beige jas', huid: 0xf1c9a5, seed: 113, variant: 'male' },
  { id: 'maud', naam: 'Maud', kleur: '#e5a0a0', vorm: 'bloem', kleding: 'zachtroze jas', huid: 0xe0b48a, seed: 114, variant: 'female' },
];

// Uiterlijk voor het model (models3d_people.buildPersonMesh): vaste seed, dus iedereen ziet dezelfde figuur.
const hexInt = (k) => parseInt(String(k).replace('#', ''), 16);
export function figuurLook(id) {
  const c = charInfo(id);
  if (!c) return null;
  if (id === 'tammo' || id === 'anita') return { karakter: id, shirt: hexInt(c.kleur), skin: 0xe0b48a, opts: { character: id } };
  return { karakter: null, shirt: hexInt(c.kleur), skin: c.huid, opts: { seed: c.seed, variant: c.variant } };
}
const ALL = [...MAIN_CHARS, ...EXTRA_CHARS];
export const charInfo = (id) => ALL.find((c) => c.id === id) || null;
// Wie het spel opende (plek 0), met zijn naam: de teksten gebruiken geen rolnaam (docs/WOORDENLIJST.md). begin: aan het begin van een zin ("De ander").
export function openerNaam(lijst, begin = false) {
  const p = (lijst || []).find((x) => x && x.slot === 0);
  const av = p && p.avatar && typeof p.avatar === 'object' ? p.avatar : null; // (#455) de online-avatar gaat voor de naam van de figuur
  const naam = p && ((av && av.naam) || p.naam || (charInfo(p.char) || {}).naam);
  return naam || (begin ? 'De ander' : 'de ander');
}
export const slotChar = (slot) => (slot < MAIN_CHARS.length ? MAIN_CHARS[slot].id : null);

export const clampMax = (n) => Math.min(ABS_MAX, Math.max(MIN_MAX, Number.isInteger(n) ? n : DEFAULT_MAX));

// Nederlands advies in de lobby bij meer dan 4 spelers (prestaties, en voor de host uploadbandbreedte).
export function advies(aantal, rol = 'host') {
  if (aantal <= ADVIES_VANAF) return '';
  const basis = `Met ${aantal} spelers kan het spel trager worden, vooral op wat oudere computers.`;
  return rol === 'host' ? `${basis} Als je het spel hebt geopend stuur je alles naar iedereen; een trage internetverbinding (uploaden) kan het spel laten haperen.` : basis;
}

export function createRoster(max = DEFAULT_MAX) {
  return { max: clampMax(max), spelers: [{ slot: 0, char: 'tammo', rol: 'host', verbinding: 'ok' }] };
}
export const bezet = (r) => r.spelers.map((s) => s.slot);
export const heeftPlek = (r) => r.spelers.length < r.max;
export const speler = (r, slot) => r.spelers.find((s) => s.slot === slot) || null;

// De host kan het maximum veranderen; zit er al meer volk, dan blijft het minstens zo groot als nu.
export function zetMax(r, n) { r.max = Math.max(clampMax(n), r.spelers.length); return r.max; }

// Eerste vrije plek en het personage dat erbij hoort. Plek 1 is altijd Tessa; vanaf plek 2 een figuur
// uit de lijst: de gewenste als die vrij is, anders de eerste vrije. Geeft { slot, char } of null (vol).
export function wijsPlekToe(r, wens = null) {
  if (!heeftPlek(r)) return null;
  const vrij = []; for (let s = 1; s < r.max; s++) if (!bezet(r).includes(s)) vrij.push(s);
  if (!vrij.length) return null;
  const slot = vrij[0];
  if (slot === 1) { r.spelers.push({ slot, char: 'anita', rol: 'gast', verbinding: 'ok' }); return { slot, char: 'anita' }; }
  const genomen = new Set(r.spelers.map((s) => s.char));
  const vrijeFiguren = EXTRA_CHARS.filter((c) => !genomen.has(c.id));
  if (!vrijeFiguren.length) return null;
  const gekozen = vrijeFiguren.find((c) => c.id === wens) || vrijeFiguren[0];
  r.spelers.push({ slot, char: gekozen.id, rol: 'gast', verbinding: 'ok' });
  return { slot, char: gekozen.id };
}
export function verwijder(r, slot) {
  if (slot === 0) return false; // de host gaat nooit uit de lijst
  const i = r.spelers.findIndex((s) => s.slot === slot);
  if (i < 0) return false;
  r.spelers.splice(i, 1); return true;
}
export function zetVerbinding(r, slot, v) { const s = speler(r, slot); if (s) s.verbinding = v; return !!s; }

// Online-avatar per speler (#455): een eigen figuur, naam en kleur, los van de
// verhaalrol. De speler vult de naam zelf in bij Samen spelen; het filter zelf
// (verboden woorden, geen echte personen) staat in coopspeler.avatarVan en
// net/serverlijst.schoonNaam. Hier bewaren we alleen wat veilig door het net kan.
export function zetAvatar(r, slot, avatar = {}) {
  const s = speler(r, slot);
  if (!s || !avatar || typeof avatar !== 'object') return null;
  const c = charInfo(avatar.char);
  const char = c && !MAIN_CHARS.some((m) => m.id === c.id) ? c.id : null;
  const naam = typeof avatar.naam === 'string' && avatar.naam.trim() ? avatar.naam.trim().slice(0, 24) : null;
  const kleur = /^#[0-9a-f]{6}$/i.test(avatar.kleur || '') ? avatar.kleur : null;
  s.avatar = { ...(s.avatar || {}), ...(char ? { char } : {}), ...(naam ? { naam } : {}), ...(kleur ? { kleur } : {}) };
  return s.avatar;
}

// Wat de ander ziet: naam, kleur, vorm per speler (de volgorde is de slotvolgorde).
// Een eigen online-avatar gaat voor de naam en kleur van de figuur (#455).
export function lijst(r) {
  return [...r.spelers].sort((a, b) => a.slot - b.slot).map((s) => {
    const c = charInfo(s.char) || {};
    const av = s.avatar || {};
    return { slot: s.slot, char: av.char || s.char, naam: av.naam || c.naam || '?', kleur: av.kleur || c.kleur || '#cccccc', vorm: c.vorm || 'cirkel', rol: s.rol, verbinding: s.verbinding, hoofdrol: false, avatar: s.avatar || null };
  });
}
// Kort bericht met de lijst voor alle spelers (reliable event); de ontvanger controleert het.
export const lijstEvent = (r) => ({ k: 'spelers', max: r.max, lijst: lijst(r).map(({ slot, char, rol, verbinding, avatar }) => ({ slot, char, rol, verbinding, ...(avatar ? { avatar } : {}) })) });
export function leesLijstEvent(b) {
  if (!b || b.k !== 'spelers' || !Array.isArray(b.lijst) || b.lijst.length > ABS_MAX) return null;
  const seen = new Set(); const out = [];
  for (const s of b.lijst) {
    if (!s || !Number.isInteger(s.slot) || s.slot < 0 || s.slot >= ABS_MAX || seen.has(s.slot) || !charInfo(s.char)) return null;
    if (s.avatar !== undefined && (!s.avatar || typeof s.avatar !== 'object')) return null;
    const av = s.avatar && typeof s.avatar === 'object' ? s.avatar : null;
    seen.add(s.slot); out.push({ slot: s.slot, char: s.char, rol: s.rol === 'host' ? 'host' : 'gast', verbinding: ['ok', 'lag', 'lost'].includes(s.verbinding) ? s.verbinding : 'ok', ...(av ? { avatar: { ...(charInfo(av.char) && !MAIN_CHARS.some((m) => m.id === av.char) ? { char: av.char } : {}), ...(typeof av.naam === 'string' ? { naam: av.naam.slice(0, 24) } : {}), ...(/^#[0-9a-f]{6}$/i.test(av.kleur || '') ? { kleur: av.kleur } : {}) } } : {}) });
  }
  return { max: clampMax(b.max), spelers: out };
}

// Pauze bij wegvallen, per speler (#452): alle spelers zijn gelijkwaardig, dus een weggevallen speler houdt de rest niet op.
// De rest speelt door en de speler kan terugkomen. Alleen als de lopende opdracht of activiteit hem echt nodig heeft pauzeert het spel.
// ctx: { vereist: [slots die de huidige missie of activiteit nodig heeft] }
export function holdBeleid(slot, ctx = {}) {
  if (slot >= 1 && (ctx.vereist || []).includes(slot)) return { pauze: true, reden: 'De opdracht kan niet zonder deze speler.' };
  return { pauze: false, reden: slot >= 1 ? 'Het spel gaat door; de speler kan terugkomen.' : '' };
}
// Wie heeft de lopende opdracht echt nodig? De gast-hoofdrol (plek 1) als de stap beide spelers vraagt (coopRule presence 'beide' of needsTwo),
// plus wat de opdracht zelf meegeeft (world.coopVereist). Zonder lopende opdracht is niemand nodig.
export function vereistVoor(opdrachtActief, regel, extra = []) {
  const v = new Set((extra || []).filter((s) => Number.isInteger(s) && s >= 1));
  if (opdrachtActief && regel && (regel.presence === 'beide' || regel.needsTwo)) v.add(1);
  return [...v];
}

// Rol van een speler in het hoofdverhaal (#455): iedereen is lokaal de hoofdpersoon
// van zijn eigen verhaal, dus er zijn geen bijrollen of plekken met een eigen rol meer.
export const verhaalRol = () => 'hoofdrol';
