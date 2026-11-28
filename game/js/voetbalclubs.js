// De clubs van de voetbalcarrière (#1107, epic #1106, ADR 0043): puur, geen DOM en geen THREE (scripts/voetbal_spelers_test.mjs).
// Alle clubs hebben een verzonnen parodienaam; de grappen staan alleen in docs/VOETBAL-CARRIERE-21-11.md (bijlage A), nooit hier of in beeld. Geen voorvoegsels VV, SV, FC, SC of RKSV.
// Drie divisies van acht (Kroonklasse, Terpklasse, Talentenklasse), een pool van lokale clubs (voetbalparken.js) en zestien verzonnen buitenlandse clubs voor de Waddenbeker.
// Een palet heeft een patroon (effen, brede streep, helften, smalle streep) zodat kleur nooit het enige verschil is (ui-taal regel 4).
export const DIVISIONS = ['kroon', 'terp', 'talent'];
export const DIVISION_NAMES = { kroon: 'Kroonklasse', terp: 'Terpklasse', talent: 'Talentenklasse', europa: 'Waddenbeker', pool: 'Lokale clubs' };
export const PATTERNS = ['effen', 'brede-streep', 'helften', 'smalle-streep'];
export const CLUBS_PER_DIVISION = 8;
const HOME_ARENA = 'euroborg';       // de enige echte stadion: de Kroonklasse en de Waddenbeker spelen daar

const c = (id, naam, kort, division, sterkte, budget, shirt, broek, keeper, patroon, accent, extra = {}) => ({ id, naam, kort, division, sterkte, budget, shirt, broek, keeper, patroon, accent, ...extra });
// sterkte: het gemiddelde ratingniveau van de selectie (1 tot 100); budget: de clubkas in euro bij de start.
export const CLUBS = [
  // Kroonklasse (de top; thuis in de Euroborg)
  c('stadjers', 'De Stadjers', 'Stadjers', 'kroon', 72, 900000, 0x2f9e5b, 0xf4f1e8, 0xf0c020, 'brede-streep', 0xf4f1e8, { stadion: HOME_ARENA }),
  c('hunebedders', 'De Hunebedders', 'Hunebedders', 'kroon', 66, 600000, 0xc0482b, 0x3a3a3a, 0x4aa3d8, 'effen', 0xf4f1e8, { stadion: HOME_ARENA }),
  c('veenpiraten', 'De Veenpiraten', 'Veenpiraten', 'kroon', 70, 800000, 0x2a2f36, 0xe8e0c0, 0xff9a3c, 'helften', 0xe8e0c0, { stadion: HOME_ARENA }),
  c('grachtenhelden', 'De Grachtenhelden', 'Grachtenhelden', 'kroon', 78, 2400000, 0xd8d8d0, 0xd8d8d0, 0x6fcf6a, 'brede-streep', 0xb03030, { stadion: HOME_ARENA }),
  c('gloeipeertjes', 'De Gloeipeertjes', 'Gloeipeertjes', 'kroon', 76, 1900000, 0xc22f2f, 0xf4f1e8, 0x2a2f36, 'effen', 0xf4f1e8, { stadion: HOME_ARENA }),
  c('kuipvaarders', 'De Kuipvaarders', 'Kuipvaarders', 'kroon', 74, 1300000, 0xe8e0c0, 0x2a2f36, 0xc0482b, 'helften', 0x2a2f36, { stadion: HOME_ARENA }),
  c('kaasdragers', 'De Kaasdragers', 'Kaasdragers', 'kroon', 71, 1000000, 0xd9302f, 0xf4f1e8, 0x2f6fb5, 'effen', 0xf0c020, { stadion: HOME_ARENA }),
  c('noorderlichters', 'De Noorderlichters', 'Noorderlichters', 'kroon', 67, 700000, 0x3a2f7a, 0xe0e0e0, 0x4aa3d8, 'smalle-streep', 0x4fd1b0, { stadion: HOME_ARENA }),   // de verhaalclub van de Euroborg (bijbel 01, 28-11); vervangt de zwakste Kroonklasse-club, het aantal blijft 16
  // Terpklasse (streek; de sportparken van de grotere plaatsen)
  c('wadlopers', 'De Wadlopers', 'Wadlopers', 'terp', 58, 220000, 0x2f6fb5, 0xf4f1e8, 0xe8e0c0, 'effen', 0xf4f1e8),
  c('ommelanders', 'De Ommelanders', 'Ommelanders', 'terp', 54, 200000, 0x8a4ab5, 0xe8c93a, 0x6fcf6a, 'smalle-streep', 0xe8c93a),
  c('kleibijters', 'De Kleibijters', 'Kleibijters', 'terp', 52, 180000, 0xd9a23a, 0x2a3a5a, 0xc0482b, 'effen', 0x2a3a5a),
  c('palingtrappers', 'De Palingtrappers', 'Palingtrappers', 'terp', 56, 210000, 0xe0742a, 0x2a2f36, 0x4aa3d8, 'brede-streep', 0x2a2f36),
  c('polderpitten', 'De Polderpitten', 'Polderpitten', 'terp', 50, 160000, 0xe8c93a, 0xe8c93a, 0x2a2f36, 'helften', 0x2a2f36),
  c('spartelaars', 'De Spartelaars', 'Spartelaars', 'terp', 55, 190000, 0xb03030, 0xf4f1e8, 0x2a2f36, 'helften', 0xf4f1e8),
  c('fortuinzitters', 'De Fortuinzitters', 'Fortuinzitters', 'terp', 51, 170000, 0x1f8f5a, 0xf4f1e8, 0xe8c93a, 'smalle-streep', 0xf4f1e8),
  c('doorgaanse-arenden', 'De Doorgaanse Arenden', 'Arenden', 'terp', 53, 190000, 0xe0d020, 0x2a3a5a, 0xc0482b, 'effen', 0x2a3a5a),
];
// De zestien verzonnen buitenlandse clubs van de Waddenbeker (A.3): alleen een naam, een sterkte en een palet; thuis en uit op de Euroborg.
const e = (id, naam, sterkte, shirt, broek, patroon) => ({ id, naam, kort: naam.replace(/^De /, ''), division: 'europa', sterkte, budget: 0, shirt, broek, keeper: 0x6fcf6a, patroon, accent: 0xf4f1e8, stadion: HOME_ARENA });
export const EUROPE_CLUBS = [
  e('koninklijke-matadors', 'De Koninklijke Matadors', 88, 0xe8e8f0, 0xe8e8f0, 'effen'), e('blauwgranaten', 'De Blauwgranaten', 86, 0x2a3f8f, 0x8f2a3a, 'brede-streep'),
  e('beierse-bierbazen', 'De Beierse Bierbazen', 85, 0xc22f2f, 0xc22f2f, 'effen'), e('oudere-dames', 'De Oudere Dames', 80, 0xf0f0f0, 0x2a2f36, 'brede-streep'),
  e('duivelsmilanezen', 'De Duivelsmilanezen', 79, 0xc22f2f, 0x2a2f36, 'brede-streep'), e('zwartblauwe-slangen', 'De Zwartblauwe Slangen', 81, 0x2a3f8f, 0x2a2f36, 'brede-streep'),
  e('mancheester-eenheid', 'Mancheester Eenheid', 83, 0xd02f2f, 0xf4f1e8, 'effen'), e('leverbaders', 'De Leverbaders', 82, 0xc22f2f, 0xc22f2f, 'effen'),
  e('wapenopslag', 'De Wapenopslag', 80, 0xd02f2f, 0xf4f1e8, 'helften'), e('chelzeeers', 'De Chelzeeërs', 78, 0x2a4fb5, 0x2a4fb5, 'effen'),
  e('heilige-parijzenaars', 'De Heilige Parijzenaars', 79, 0x1f2f5a, 0x1f2f5a, 'smalle-streep'), e('matrassenmakers', 'De Matrassenmakers', 77, 0xc22f2f, 0xf4f1e8, 'brede-streep'),
  e('gele-muurbloempjes', 'De Gele Muurbloempjes', 75, 0xf0d020, 0x2a2f36, 'effen'), e('rode-adelaars', 'De Rode Adelaars van Lissabon', 72, 0xd02f2f, 0xf4f1e8, 'effen'),
  e('groene-klaverknechten', 'De Groene Klaverknechten', 68, 0x2f9e5b, 0x2f9e5b, 'brede-streep'), e('gala-tafelrondes', 'De Gala Tafelrondes', 70, 0xc22f2f, 0xf0c020, 'helften'),
];

const ALL = new Map([...CLUBS, ...EUROPE_CLUBS].map((x) => [x.id, x]));
export const clubById = (id) => ALL.get(id) || null;
export const clubName = (id) => (ALL.get(id) || { naam: String(id) }).naam;
export const clubsOf = (division) => CLUBS.filter((x) => x.division === division);
// Een club als wedstrijdteam voor makeMatch (dezelfde vorm als TEAMS in voetbalrules.js); onbekend geeft null.
export const teamFor = (club) => (club ? { id: club.id, naam: club.naam, kort: club.kort, shirt: club.shirt, broek: club.broek, keeperShirt: club.keeper, patroon: club.patroon, accent: club.accent } : null);
