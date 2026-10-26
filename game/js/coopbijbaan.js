// Samen spelen (#452): bijbanen samen doen. Eén kader voor alle banen, met een regel per baantype in BIJBAAN_REGELS.
// De baan draait op de wereld van de host (sidejobs.js); wat elke speler ervan merkt:
//  1. Iedereen kan een bijbaan starten. Een gast staat bij het startpunt en drukt E: dat is een verzoek aan de host, die de baan start
//     (zelfde regels als bij de host zelf: niet met de politie achter je aan, niet midden in een missie, niet twee banen tegelijk).
//  2. Bij het begin van een baan krijgt elke andere speler "Meedoen?" (J of N, 10 seconden). Geen antwoord is nee. Er is geen late instap:
//     wie later komt of na die tijd J zegt, kijkt mee tot de volgende baan. Wie de baan startte doet altijd mee.
//  3. Iedereen ziet het doel, de voortgang en de marker van de baan (de host stuurt ze ongeveer twee keer per seconde mee).
//  4. Een meespeler helpt zinnig, volgens de tabel: passagier in het voertuig (taxi), tweede bezorger die zelf ophaalt en afgeeft
//     (bezorger), helper die kranten gooit (krantenwijk), bijrijder die meerijdt en laadt en lost (vracht). De host blijft de
//     bestuurder van het voertuig van de baan; een bijrijder zit naast hem en bestuurt niet (coopbestuur.js).
//  5. Elke meespelende speler krijgt bij elke afgeronde ronde de VOLLEDIGE beloning in zijn eigen portemonnee en loopbaan, zonder
//     samenwerkingsbonus en zonder te delen. De gebeurtenis heeft een vaste id (coopbeloning.js), dus een bericht dat twee keer
//     aankomt betaalt één keer. Wie wegvalt houdt wat hij al kreeg en krijgt daarna niets meer; er gaat niets verloren.
// De berichten zijn gewone JSON-gebeurtenissen (k 'bijbaan' van de host, k 'bijbaangast' van een gast): PROTO en CODEC_VERSION blijven 2.
// Pure logica waar het kan (scripts/coop/bijbaan_test.mjs); de koppeling met het net staat onderaan, net als in coopwedstrijd.js.
import { gebeurtenisId, maakBoekhouding } from './coopbeloning.js';
import { lichaamVan } from './coopbestuur.js';
import { verbondenGasten, spelerNaam } from './coopwedstrijd.js';
import { hoofdspeler } from './spelersregister.js';

export const UITNODIGING_S = 10;   // seconden om J of N te zeggen
export const ACTIE_WACHT_S = 0.35; // een gast mag hooguit zo vaak een hulpactie (een worp) doen
export const DOEL_S = 0.5;         // zo vaak gaat het doel van de baan naar de anderen
export const MAX_REWARD_PER_RONDE = 100000;

const fin = (x) => Number.isFinite(x);
const tekst = (s, n) => (typeof s === 'string' ? s.replace(/[\u0000-\u001f<>]/g, '').slice(0, n) : '');

// De regel per baantype. rol: wat je bent; hulp: wat je doet (wordt getoond); positie: je plek telt mee bij ophalen en afgeven;
// actie: E doet iets in de baan (de host rekent het uit vanaf jouw plek).
export const BIJBAAN_REGELS = {
  taxi: { rol: 'passagier', hulp: 'Stap met E in de taxi en rijd mee. Elke rit levert jou ook het volle loon op.', positie: false, actie: false },
  bezorger: { rol: 'tweede bezorger', hulp: 'Loop zelf naar de zaak en naar de klant: wie het eerst bij de deur staat, haalt op en geeft af.', positie: true, actie: false },
  krantenwijk: { rol: 'helper', hulp: 'Loop mee en gooi kranten met E naar de brievenbussen. De stapel is gedeeld.', positie: true, actie: true },
  vracht: { rol: 'bijrijder', hulp: 'Rijd mee in de truck van de chauffeur en help met E bij laden en lossen. De chauffeur rijdt.', positie: false, actie: true },
};
export const bijbaanMetCoop = (id) => Object.prototype.hasOwnProperty.call(BIJBAAN_REGELS, id);

export const BIJBAAN_TEKST = {
  wacht: (naam, label) => `${naam} wil ${label} starten. Je vraagt de ander de baan te starten.`,
  gevraagd: (label) => `Je vraagt ${label} te starten.`,
  bezig: 'Er loopt al een bijbaan.',
  nietGedeeld: 'Deze bijbaan doe je alleen in je eigen spel.',
  hostStart: (naam, label) => `${naam} begon ${label}. Doe je mee? J = ja, N = nee.`,
  hostNee: 'Je doet niet mee: je krijgt geen loon voor deze baan.',
  wedstrijd: 'Er loopt al een wedstrijd. Wacht of doe mee.',
  nee: 'Je doet niet mee: je kijkt mee tot de volgende baan.',
  ja: (label, hulp) => `Je doet mee met ${label}. ${hulp}`,
  laat: (label) => `${label} loopt al, de volgende doe je mee.`,
  eindOk: 'De baan is klaar.',
  eindStop: 'De baan is gestopt.',
};

// ---------------------------------------------------------------- de toestand bij de host (pure functies)

export function maakBijbaan() {
  return { id: null, label: '', teller: 0, ronde: 0, keuze: {}, rest: 0, gesloten: true, weg: {}, wie: '', boek: maakBoekhouding(), sessie: Math.random().toString(36).slice(2, 8), tDoel: 0, laatsteDoel: '', laatsteActie: {} };
}
export const actief = (st) => !!st && !!st.id;

// Een baan begint. gasten = de verbonden gasten (plekken), starter = de gast die erom vroeg (of null: de host begon). Geeft de uitnodigingen
// [{ slot }] terug voor wie nog moet antwoorden; de starter doet altijd mee.
export function beginBijbaan(st, id, label, gasten, starter = null, wie = '') {
  st.id = id; st.label = tekst(label, 60); st.teller++; st.ronde = 0; st.keuze = {}; st.weg = {}; st.wie = tekst(wie, 24); st.laatsteActie = {};
  st.gesloten = false; st.rest = UITNODIGING_S;
  const uit = [];
  for (const s of gasten) {
    if (!(s >= 1)) continue;
    if (s === starter) { st.keuze[s] = 'ja'; continue; }
    st.keuze[s] = 'wacht'; uit.push({ slot: s });
  }
  if (starter != null) st.keuze[0] = 'wacht'; // een gast startte de baan: ook de host kiest of hij meedoet (J of N; geen antwoord is nee)
  if (!Object.values(st.keuze).includes('wacht')) st.gesloten = true;
  return uit;
}
// Doet de host mee? Bij een baan die hij zelf startte altijd; bij het verzoek van een gast alleen als hij J zei. Wie niet meedoet krijgt
// geen loon en geen loopbaanpunten; de baan draait wel op zijn wereld (bestuurder van de taxi, het spoor van de bezorger: dat blijft zijn lichaam).
export const hostMeeBijbaan = (st) => !actief(st) || st.keuze[0] === undefined || st.keuze[0] === 'ja';
export function eindeBijbaan(st) { st.id = null; st.label = ''; st.keuze = {}; st.weg = {}; st.gesloten = true; st.rest = 0; st.wie = ''; st.laatsteDoel = ''; }

// Het antwoord van een gast. Alleen wie nog moet antwoorden en binnen de tijd; daarna (geen late instap) verandert er niets.
export function antwoordBijbaan(st, slot, ja) {
  if (!actief(st) || st.gesloten || st.keuze[slot] !== 'wacht') return false;
  st.keuze[slot] = ja ? 'ja' : 'nee';
  if (!Object.values(st.keuze).includes('wacht')) st.gesloten = true;
  return true;
}
// Tijd verstrijkt en wie wegvalt telt niet meer mee. Geeft de plekken die nu op nee staan omdat ze niet antwoordden.
export function tikBijbaan(st, dt, verbonden) {
  const af = [];
  if (!actief(st)) return af;
  for (const s of Object.keys(st.keuze).map(Number)) {
    if (s > 0 && !verbonden.has(s)) { verlaatBijbaan(st, s); if (st.keuze[s] === 'wacht') { st.keuze[s] = 'nee'; af.push(s); } }
  }
  if (!st.gesloten) {
    st.rest -= dt;
    if (st.rest <= 0) { st.rest = 0; st.gesloten = true; }
    if (!Object.values(st.keuze).includes('wacht')) st.gesloten = true;
  }
  if (st.gesloten) for (const s of Object.keys(st.keuze).map(Number)) if (st.keuze[s] === 'wacht') { st.keuze[s] = 'nee'; if (s > 0) af.push(s); } // geen antwoord is nee (de host hoort het niet via het net)
  return af;
}
// Een speler valt weg (verbinding kwijt of weg): hij doet voor de rest van deze baan niet meer mee en houdt wat hij al kreeg.
export function verlaatBijbaan(st, slot) { if (actief(st) && st.keuze[slot] === 'ja') { st.weg[slot] = true; return true; } return false; }
// Wie speelt mee: ja gezegd, verbonden en niet weggevallen.
export function deelnemers(st, verbonden) {
  if (!actief(st)) return [];
  return Object.keys(st.keuze).map(Number).filter((s) => st.keuze[s] === 'ja' && !st.weg[s] && verbonden.has(s)).sort((a, b) => a - b);
}
// Een gast sluit aan terwijl de baan loopt: geen late instap, hij kijkt mee. Geeft true als er een baan loopt.
export const laatBijbaan = (st, slot) => { if (!actief(st) || st.keuze[slot] === 'ja' || st.keuze[slot] === 'nee') return false; st.keuze[slot] = 'nee'; return true; };

// De volledige beloning voor één afgeronde ronde: iedereen die meespeelt krijgt het hele bedrag en alle loopbaanpunten.
// Eén id per ronde; dezelfde ronde nogmaals aanbieden geeft niets (host-kant). Geeft [{ slot, geld, xp, vak, id }].
export function beloningBijbaan(st, verbonden, { basis, vak = null, xp = 0, ronde = null } = {}) {
  const geld = Math.min(MAX_REWARD_PER_RONDE, Math.floor(Number(basis) || 0));
  if (!actief(st) || !(geld >= 1)) return [];
  const r = Number.isInteger(ronde) && ronde >= 0 ? ronde : st.ronde;
  const id = gebeurtenisId(st.sessie, 'bb', st.teller * 1000 + r);
  if (!st.boek.claim(id)) return [];
  st.ronde = r + 1;
  return deelnemers(st, verbonden).map((slot) => ({ slot, geld, xp: Math.max(0, Math.round(Number(xp) || 0)), vak: typeof vak === 'string' && vak ? vak.slice(0, 20) : null, id }));
}

// ---------------------------------------------------------------- de berichten

export const uitEvent = (st, rol, hulp) => ({ k: 'bijbaan', f: 'uit', id: st.id, label: st.label, rol, hulp, sec: Math.ceil(st.rest), wie: st.wie });
export const startEvent = (st, rol, hulp) => ({ k: 'bijbaan', f: 'start', id: st.id, label: st.label, rol, hulp });
export const afEvent = () => ({ k: 'bijbaan', f: 'af' });
export const laatEvent = (st) => ({ k: 'bijbaan', f: 'laat', label: st.label });
export const eindEvent = (kind) => ({ k: 'bijbaan', f: 'eind', kind: kind === 'fail' || kind === 'quit' || kind === 'dead' || kind === 'wanted' ? kind : 'ok' });
// Het doel van de baan zoals de host het publiceert (world.sideJob): marker, voortgang, doeltekst en resterende tijd.
export function doelEvent(pub) {
  if (!pub || !pub.active) return null;
  const m = pub.marker && fin(pub.marker.x) && fin(pub.marker.y) ? [Math.round(pub.marker.x * 10) / 10, Math.round(pub.marker.y * 10) / 10] : null;
  return { k: 'bijbaan', f: 'doel', id: tekst(pub.id, 20), label: tekst(pub.label, 60), m, p: tekst(pub.progress, 80), g: pub.goal ? [tekst(pub.goal.label, 80), tekst(pub.goal.desc || '', 100)] : null, t: fin(pub.timeLeft) ? Math.round(pub.timeLeft) : null, c: tekst(pub.color, 9), h: pub.help ? 1 : 0 };
}

// De kortste afstand van een punt tot wie de baan speelt: de host en, bij een baan met een tweede bezorger of helper, de meespelende gasten
// (world.coopHelpers). Zonder samen spelen is dit gewoon de afstand tot de speler.
export function afstandNaast(world, x, y) {
  const p = hoofdspeler(world);
  let best = Math.hypot(x - p.x, y - p.y);
  const hulp = typeof world.coopHelpers === 'function' ? world.coopHelpers() : null;
  if (hulp) for (const h of hulp) best = Math.min(best, Math.hypot(x - h.x, y - h.y));
  return best;
}

// Wat een gast leest: alles wordt gecontroleerd, onbekende soorten geven null.
export function leesBijbaan(b) {
  if (!b || b.k !== 'bijbaan' || typeof b.f !== 'string') return null;
  if (b.f === 'uit') return typeof b.id === 'string' && typeof b.label === 'string' ? { f: 'uit', id: tekst(b.id, 20), label: tekst(b.label, 60), rol: tekst(b.rol, 30), hulp: tekst(b.hulp, 160), wie: tekst(b.wie, 24), sec: fin(b.sec) ? Math.max(1, Math.min(30, b.sec)) : UITNODIGING_S } : null;
  if (b.f === 'start') return typeof b.id === 'string' ? { f: 'start', id: tekst(b.id, 20), label: tekst(b.label, 60), rol: tekst(b.rol, 30), hulp: tekst(b.hulp, 160) } : null;
  if (b.f === 'af') return { f: 'af' };
  if (b.f === 'laat') return { f: 'laat', label: tekst(b.label, 60) };
  if (b.f === 'eind') return { f: 'eind', kind: ['ok', 'fail', 'quit', 'dead', 'wanted'].includes(b.kind) ? b.kind : 'ok' };
  if (b.f === 'doel') {
    const m = Array.isArray(b.m) && b.m.length === 2 && fin(b.m[0]) && fin(b.m[1]) ? { x: b.m[0], y: b.m[1] } : null;
    const g = Array.isArray(b.g) && typeof b.g[0] === 'string' ? { label: tekst(b.g[0], 80), desc: tekst(b.g[1], 100) } : null;
    return { f: 'doel', id: tekst(b.id, 20), label: tekst(b.label, 60), marker: m, progress: tekst(b.p, 80), goal: g, timeLeft: fin(b.t) ? Math.max(0, b.t) : null, color: /^#[0-9a-f]{3,8}$/i.test(b.c) ? b.c : '#ff9a3c', help: b.h === 1 };
  }
  return null;
}
// Wat de host van een gast leest.
export function leesGast(b) {
  if (!b || b.k !== 'bijbaangast' || !['ja', 'nee', 'start', 'actie'].includes(b.a)) return null;
  if (b.a === 'start') return typeof b.id === 'string' && bijbaanMetCoop(b.id) ? { a: 'start', id: b.id } : null;
  return { a: b.a };
}

// ---------------------------------------------------------------- de host: koppeling met het net

// Haken die coopnet.js zet (het betalen gaat via payGuest en de melding via world.coopMeld).
const haken = { betaalGast: null };
export function zetBijbaanHaken(h) { Object.assign(haken, h || {}); }

export const bijbaanStaat = (n) => n.bijbaan || (n.bijbaan = maakBijbaan());
const rosterVan = (world) => { const n = world.coopNet; return n && n.hub && n.hub.roster ? n.hub.roster.spelers : []; };
const naamVan = (world, slot) => spelerNaam(rosterVan(world).find((s) => s.slot === slot));
const verbondenSet = (world) => new Set(verbondenGasten(world).map((s) => s.slot));
const meldGast = (world, slot, t) => { if (world.coopMeld) world.coopMeld(slot, t); };
const meldHost = (world, t) => { if (world.addMessage) world.addMessage(t, 4); };

// De host heeft een baan gestart (sidejobs.js startJob). Alleen banen uit de tabel worden gedeeld; een andere baan blijft zoals hij was.
// Geeft true als de baan gedeeld wordt. starter = de plek van de gast die erom vroeg (of null).
export function bijbaanStart(world, id, label, starter = null) {
  const n = world.coopNet;
  if (!n || n.role !== 'host' || !n.hub || !bijbaanMetCoop(id)) return false;
  const st = bijbaanStaat(n), regel = BIJBAAN_REGELS[id];
  const gasten = verbondenGasten(world).map((s) => s.slot);
  const wie = starter != null ? naamVan(world, starter) : naamVan(world, 0);
  const uit = beginBijbaan(st, id, label, gasten, starter, wie);
  if (starter != null) { meldHost(world, BIJBAAN_TEKST.hostStart(wie, label)); n.hub.announce(startEvent(st, regel.rol, regel.hulp), starter); }
  for (const u of uit) n.hub.announce(uitEvent(st, regel.rol, regel.hulp), u.slot);
  if (uit.length) meldHost(world, `Uitnodiging voor ${label} verstuurd.`);
  return true;
}

// Een ronde is afgerond (sidejobs.js completeRound): elke meespeler krijgt het volle bedrag. Geeft true als de baan gedeeld wordt
// (ook zonder meespelers: dan blijft het oude delen buiten beeld, want de host kreeg alles al), anders false.
export function bijbaanBeloning(world, id, basis, vak = null, xp = 0, ronde = null) {
  const n = world.coopNet;
  if (!n || n.role !== 'host' || !n.hub || !bijbaanMetCoop(id)) return false;
  const st = bijbaanStaat(n);
  if (!actief(st) || st.id !== id) return false;
  for (const b of beloningBijbaan(st, verbondenSet(world), { basis, vak, xp, ronde })) if (haken.betaalGast) haken.betaalGast(world, b.slot, b.geld, b.vak ? { vak: b.vak, xp: b.xp } : null, b.id);
  return true;
}

// De baan is voorbij (afgerond, mislukt of gestopt): iedereen hoort het en de toestand wordt opgeruimd.
export function bijbaanEind(world, kind = 'ok') {
  const n = world.coopNet;
  if (!n || n.role !== 'host' || !n.hub || !n.bijbaan || !actief(n.bijbaan)) return false;
  for (const s of verbondenGasten(world)) n.hub.announce(eindEvent(kind), s.slot);
  eindeBijbaan(n.bijbaan);
  return true;
}

// Een gast sluit aan terwijl een baan loopt: geen late instap, een melding, hij kijkt mee.
export function bijbaanLaat(world, slot) {
  const n = world.coopNet, st = n && n.bijbaan;
  if (!n || n.role !== 'host' || !actief(st) || !laatBijbaan(st, slot)) return false;
  n.hub.announce(laatEvent(st), slot);
  return true;
}
// Een gast viel weg of ging weg.
export function bijbaanWeg(world, slot) { const n = world.coopNet; return !!n && !!n.bijbaan && verlaatBijbaan(n.bijbaan, slot); }

// Waar de meespelers staan (host): voor het ophalen en afgeven te voet. Alleen banen met positie: true, en alleen wie meespeelt.
export function bijbaanHelpers(world) {
  const n = world.coopNet, st = n && n.bijbaan;
  if (!n || n.role !== 'host' || !actief(st) || !BIJBAAN_REGELS[st.id] || !BIJBAAN_REGELS[st.id].positie) return [];
  const uit = [];
  for (const slot of deelnemers(st, verbondenSet(world))) {
    const l = lichaamVan(world, slot); if (!l) continue;
    const p = l.inVehicle && fin(l.inVehicle.x) && fin(l.inVehicle.y) ? l.inVehicle : l;
    if (fin(p.x) && fin(p.y)) uit.push({ slot, x: p.x, y: p.y });
  }
  return uit;
}

// De host antwoordt op Meedoen? bij een baan die een gast startte (J of N). Geeft true als het antwoord telde.
export function bijbaanHostAntwoord(world, ja) {
  const n = world.coopNet, st = n && n.role === 'host' && n.bijbaan;
  if (!st || !antwoordBijbaan(st, 0, ja)) return false;
  if (!ja) meldHost(world, BIJBAAN_TEKST.hostNee);
  return true;
}
// Doet de host mee met de lopende baan? (sidejobs.js: zonder dit krijgt hij geen loon)
export function bijbaanHostMee(world) { const n = world.coopNet; return !n || n.role !== 'host' || !n.bijbaan || hostMeeBijbaan(n.bijbaan); }

// Elke frame bij de host (coopnet.js tickCoopNet): de uitnodiging telt af, wie niet antwoordt kijkt mee, het doel gaat naar de anderen.
export function bijbaanHostTik(world, dt) {
  const n = world.coopNet; if (!n || n.role !== 'host' || !n.bijbaan) return false;
  const st = n.bijbaan; if (!actief(st)) return false;
  if (st.keuze[0] === 'wacht') { // de host zelf: J of N
    const inp = world.input;
    const toets = (k) => !!(inp && inp.wasPressed && !world.paused && !world.uiPaused && inp.wasPressed(k));
    if (toets('j')) bijbaanHostAntwoord(world, true); else if (toets('n')) bijbaanHostAntwoord(world, false);
  }
  for (const s of tikBijbaan(st, dt, verbondenSet(world))) n.hub.announce(afEvent(), s); // geen antwoord is nee
  st.tDoel += dt;
  if (st.tDoel >= DOEL_S) {
    st.tDoel = 0;
    const e = doelEvent(world.sideJob);
    if (e) {
      const sig = JSON.stringify({ ...e, t: e.t == null ? null : Math.floor(e.t / 2) }); // een tikkende klok stuurt niet elke halve seconde
      if (sig !== st.laatsteDoel) { st.laatsteDoel = sig; for (const s of verbondenGasten(world)) n.hub.announce(e, s.slot); }
    }
  }
  return true;
}

// Een nieuwe gast ziet meteen waar de baan staat.
export function bijbaanVoorNieuwe(world, slot) {
  const n = world.coopNet, st = n && n.bijbaan; if (!n || n.role !== 'host' || !actief(st)) return false;
  const e = doelEvent(world.sideJob); if (e) n.hub.announce(e, slot);
  return bijbaanLaat(world, slot);
}

// Een bericht van een gast bij de host.
export function bijbaanHandleGast(world, body, van) {
  const n = world.coopNet, b = leesGast(body);
  if (!n || n.role !== 'host' || !b || !(van >= 1)) return false;
  const st = bijbaanStaat(n), acties = world.sideJobActions;
  if (b.a === 'ja' || b.a === 'nee') {
    const regel = BIJBAAN_REGELS[st.id];
    const ok = antwoordBijbaan(st, van, b.a === 'ja');
    if (ok && regel) n.hub.announce(b.a === 'ja' ? startEvent(st, regel.rol, regel.hulp) : afEvent(), van);
    return ok;
  }
  if (b.a === 'start') { // een gast vraagt de baan te starten
    if (!acties || !acties.startVoor) return false;
    if (actief(st)) { meldGast(world, van, BIJBAAN_TEKST.bezig); return false; }
    const W = n.wed; if (W && (W.r || W.sc || W.lv || W.u)) { meldGast(world, van, BIJBAAN_TEKST.wedstrijd); return false; } // een wedstrijd loopt (of wordt gevraagd)
    const r = acties.startVoor(b.id, van);
    if (!r || !r.ok) { meldGast(world, van, (r && r.reden) || BIJBAAN_TEKST.nietGedeeld); return false; }
    return true;
  }
  if (b.a === 'actie') { // een hulpactie (een krant gooien, bij de vracht laden of lossen) vanaf de plek van de gast zelf
    const regel = BIJBAAN_REGELS[st.id];
    if (!actief(st) || !regel || !regel.actie || !acties || !acties.helperActie) return false;
    if (!deelnemers(st, verbondenSet(world)).includes(van)) return false;
    const nu = Number.isFinite(world.time) ? world.time : Date.now() / 1000;
    if (nu - (st.laatsteActie[van] || -99) < ACTIE_WACHT_S) return false;
    st.laatsteActie[van] = nu;
    const l = lichaamVan(world, van); if (!l) return false;
    const p = l.inVehicle && fin(l.inVehicle.x) ? l.inVehicle : l;
    return !!acties.helperActie(van, p.x, p.y);
  }
  return false;
}

// ---------------------------------------------------------------- de gast: berichten van de host en het scherm

export const gastStaat = (world) => world.coopBijbaanGast || (world.coopBijbaanGast = { uitn: null, deelt: false, id: null, label: '', rol: '', hulp: '', laat: null, actieT: -99 });

export function bijbaanHandleHost(world, body) {
  const n = world.coopNet, b = leesBijbaan(body);
  if (!n || n.role !== 'client' || !b) return false;
  const G = gastStaat(world);
  switch (b.f) {
    case 'uit': G.uitn = { id: b.id, label: b.label, rol: b.rol, hulp: b.hulp, wie: b.wie, rest: b.sec }; G.deelt = false; G.id = b.id; G.label = b.label; G.laat = null; return true;
    case 'start': G.uitn = null; G.deelt = true; G.id = b.id; G.label = b.label; G.rol = b.rol; G.hulp = b.hulp; G.laat = null; if (world.addMessage) world.addMessage(BIJBAAN_TEKST.ja(b.label, b.hulp), 5); return true;
    case 'af': G.uitn = null; G.deelt = false; if (world.addMessage) world.addMessage(BIJBAAN_TEKST.nee, 4); return true;
    case 'laat': G.uitn = null; G.deelt = false; G.laat = b.label; if (world.addMessage) world.addMessage(BIJBAAN_TEKST.laat(b.label), 5); return true;
    case 'doel': {
      const sj = world.sideJob || (world.sideJob = {});
      Object.assign(sj, { active: true, id: b.id, label: b.label, color: b.color, marker: b.marker, dots: [], progress: b.progress, timeLeft: b.timeLeft, goal: b.goal, bus: null, help: !!b.help });
      G.id = b.id; if (!G.label) G.label = b.label;
      return true;
    }
    case 'eind': {
      wisDoel(world);
      if (world.addMessage && (G.deelt || G.uitn)) world.addMessage(b.kind === 'ok' ? BIJBAAN_TEKST.eindOk : BIJBAAN_TEKST.eindStop, 4);
      G.uitn = null; G.deelt = false; G.id = null; G.label = ''; G.laat = null;
      return true;
    }
    default: return false;
  }
}
function wisDoel(world) {
  const sj = world.sideJob;
  if (sj && sj.active) Object.assign(sj, { active: false, id: null, label: '', marker: null, dots: [], progress: '', timeLeft: null, goal: null, bus: null, help: false });
}
// Het scherm van de gast ruimt op (de verbinding is weg of de host stopte).
export function bijbaanGastReset(world) {
  const G = world.coopBijbaanGast; if (!G) return;
  if (G.id || G.deelt || G.uitn) wisDoel(world);
  G.uitn = null; G.deelt = false; G.id = null; G.label = ''; G.laat = null;
}

// De gast antwoordt op de uitnodiging.
export function bijbaanGastStuur(world, a) {
  const n = world.coopNet, G = gastStaat(world);
  if (!n || n.role !== 'client' || !n.session || !leesGast({ k: 'bijbaangast', a, id: 'taxi' })) return false;
  if ((a === 'ja' || a === 'nee') && !G.uitn) return false;
  if (a === 'ja' || a === 'nee') G.uitn = null;
  return n.session.sendEvent({ k: 'bijbaangast', a });
}
// E bij een gast: een baan starten (bij een startpunt) of een hulpactie doen (tijdens een baan met actie). Geeft true als E hiervoor was.
// Een actie-rol zonder positie (vracht) helpt vanuit het voertuig van de host: zit de gast daar nog niet in, dan is E om in te stappen
// (coopgastlokaal.js gastGebruik) en niet voor de baan, zodat een bijrijder altijd eerst kan instappen. Een helper te voet (krantenwijk,
// positie true) doet zijn actie gewoon vanaf zijn eigen plek.
const actieVanuitVoertuig = (regel) => !!regel && regel.actie && !regel.positie;
export function bijbaanGastE(world) {
  const n = world.coopNet, G = world.coopBijbaanGast;
  if (!n || n.role !== 'client' || !n.joined || !n.session || world.paused) return false;
  const regel = G && G.id ? BIJBAAN_REGELS[G.id] : null;
  const acties = world.sideJobActions;
  // Een actie-rol vanuit het voertuig (vracht) claimt E alleen als de host-publicatie zegt dat er
  // nu iets te helpen is; anders blijft E gewoon uitstappen, ook tijdens het koppelen en de rit (#492).
  const hulpNu = !!(world.sideJob && world.sideJob.help);
  if (G && G.deelt && regel && regel.actie && (!actieVanuitVoertuig(regel) || (world.coopInVoertuig && hulpNu))) {
    const nu = Number.isFinite(world.time) ? world.time : Date.now() / 1000;
    if (nu - G.actieT < ACTIE_WACHT_S) return true;
    G.actieT = nu;
    n.session.sendEvent({ k: 'bijbaangast', a: 'actie' });
    return true;
  }
  const p = hoofdspeler(world);
  if (!p || world.coopInVoertuig || !acties || !acties.spotBij) return false;
  const spot = acties.spotBij(p.x, p.y);
  if (!spot) return false;
  if (!bijbaanMetCoop(spot.id)) return false; // een andere bijbaan: de gewone melding
  if (G && (G.id || G.uitn)) { if (world.addMessage) world.addMessage(BIJBAAN_TEKST.bezig, 3); return true; }
  if (world.addMessage) world.addMessage(BIJBAAN_TEKST.gevraagd(spot.name), 3);
  n.session.sendEvent({ k: 'bijbaangast', a: 'start', id: spot.id });
  return true;
}

// Het kaartje: de uitnodiging bij een gast, wie al antwoordde bij de host. Zelfde vorm als coopwedstrijd3d.js kaartModel.
export function bijbaanKaartModel(world) {
  const n = world.coopNet; if (!n) return null;
  if (n.role === 'host') {
    const st = n.bijbaan; if (!actief(st) || st.gesloten || !Object.values(st.keuze).includes('wacht')) return null;
    if (st.keuze[0] === 'wacht') return { soort: 'uitnodiging', titel: 'Meedoen?', regels: [`${st.wie || 'Een speler'} begon ${st.label}.`], voet: `J = ja, N = nee (zonder antwoord doe je niet mee en krijg je geen loon). Nog ${Math.ceil(st.rest)} seconden.` };
    const regels = Object.keys(st.keuze).map(Number).map((s) => `${naamVan(world, s)}: ${st.keuze[s] === 'ja' ? 'doet mee' : st.keuze[s] === 'nee' ? 'doet niet mee' : 'kiest nog'}`);
    return { soort: 'uitnodiging', titel: `${st.label}: uitnodiging verstuurd`, regels, voet: `Nog ${Math.ceil(st.rest)} seconden.` };
  }
  const G = world.coopBijbaanGast; if (!G || !G.uitn) return null;
  const u = G.uitn;
  return { soort: 'uitnodiging', titel: 'Meedoen?', regels: [`${u.wie || 'De ander'} begint ${u.label}. Jij bent ${u.rol}. ${u.hulp}`, 'J = ja, N = nee (zonder antwoord kijk je mee).'], voet: `Nog ${Math.ceil(u.rest)} seconden. Wie meedoet krijgt bij elke ronde de volledige beloning.` };
}

// Elke frame bij elke speler (coopnet.js tickCoopNet): bij een gast J en N en het aftellen van de uitnodiging, de resterende tijd van de baan tikt mee.
export function bijbaanGastTik(world, dt) {
  const n = world.coopNet, G = world.coopBijbaanGast; if (!n || n.role !== 'client' || !G) return false;
  const inp = world.input;
  const toets = (k) => !!(inp && inp.wasPressed && !world.paused && !world.uiPaused && inp.wasPressed(k));
  if (G.uitn) {
    G.uitn.rest -= dt;
    if (G.uitn.rest <= 0) G.uitn = null; // zonder antwoord kijk je mee; de host rekent dat zelf ook zo
    else if (toets('j')) bijbaanGastStuur(world, 'ja');
    else if (toets('n')) bijbaanGastStuur(world, 'nee');
  }
  const sj = world.sideJob;
  if (G.id && sj && sj.active && Number.isFinite(sj.timeLeft)) sj.timeLeft = Math.max(0, sj.timeLeft - dt);
  return true;
}
