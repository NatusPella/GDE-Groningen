// Samen spelen (#438): de lijst met openbare sessies. Pure logica, zonder DOM en zonder netwerk: het coderen en lezen van een
// aankondiging, het naamfilter en het bijhouden van de lijst (verlopen, limiet, melden). Het netwerk zit in brokers.js
// (LijstSignaler); de knoppen en teksten in lobby.js en lobbyui.js.
//
// Een host die zijn sessie openbaar maakt, plaatst elke 15 s een korte, onversleutelde aankondiging op een vast onderwerp van
// dezelfde brokers als de kamercode. Wat erin staat: de naam van de sessie, het aantal spelers en het maximum, de versie, de
// kamercode (daarmee sluit een speler aan, via de bestaande versleutelde route), een willekeurig id en een tijdstempel.
// Er staat nooit een IP-adres, wachtwoord of persoonsgegeven in; de naam wordt gefilterd. Een sessie die niet meer aankondigt
// verdwijnt na 45 s uit de lijst.

import { crc16 } from './pairing.js';
import { woordenVan, past } from '../zoektekst.js';

export const LIJST = {
  formaat: 1,
  sleutel: 'serverlijst-v1', // vast onderwerp: topicFor(sleutel) geeft de info_hash van de tracker en het MQTT-onderwerp
  interval: 15000,           // ms tussen twee aankondigingen van een host
  verloop: 45000,            // ms zonder nieuwe aankondiging: weg uit de lijst
  maxNaam: 24,
  maxGetoond: 20,            // paginagrootte van de lijst; de lijst zelf bewaart alles tot maxVolgen
  maxVolgen: 200,            // hoeveel afzenders we hoogstens bijhouden (tegen een vloed)
  versBinnen: 20000,         // ms: "alleen vers" toont aankondigingen die zo recent binnenkwamen
  dimLaatste: 10000,         // ms voor verloop: zo lang is een regel zichtbaar gedimd
  minTussen: 5000,           // ms: een afzender die vaker aankondigt dan dit wordt genegeerd
  nieuwPerMinuut: 60,        // nieuwe afzenders per minuut, daarboven negeren we nieuwe
  maxBytes: 600,             // een grotere aankondiging is geen aankondiging
  scheef: 90000,             // ms: een tijdstempel die verder van onze klok ligt (te oud of te nieuw) tellen we niet
};
export const STANDAARD_NAAM = 'Open spel';

// ---------------------------------------------------------------- leeftijd en de query
// De lijst zelf (hieronder) levert alles wat niet verlopen of gemeld is; dit is de pure stap
// daarbovenop: zoeken, filteren, sorteren en een pagina. Geen DOM en geen opslag, zodat de
// tests het zonder browser kunnen natrekken. De UI (lobby.js) kiest alleen de opties.
export const SORTERINGEN = ['standaard', 'spelers', 'naam', 'gezien'];
export const SORTERING_LABEL = { standaard: 'Aansluitbaar eerst', spelers: 'Spelers', naam: 'Naam', gezien: 'Laatst gezien' };

// "net", "12 s", "2 min", "1 uur": kort genoeg voor één regel naast de naam.
export function leeftijdTekst(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '';
  const s = Math.floor(ms / 1000);
  if (s < 5) return 'net';
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} uur`;
}

// Dezelfde leeftijd in gewone taal, voor een schermlezer (het getal alleen leest raar).
export function leeftijdLang(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '';
  const s = Math.floor(ms / 1000);
  if (s < 5) return 'net gezien';
  if (s < 60) return `${s} seconden geleden`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} ${m === 1 ? 'minuut' : 'minuten'} geleden`;
  const u = Math.floor(m / 60);
  return `${u} uur geleden`;
}

const SORTERING = {
  standaard: (p, q) => (q.kan - p.kan) || (q.gezien - p.gezien) || (p.id < q.id ? -1 : 1),
  spelers: (p, q) => (q.spelers - p.spelers) || (q.kan - p.kan) || p.naam.localeCompare(q.naam, 'nl') || (p.id < q.id ? -1 : 1),
  naam: (p, q) => p.naam.localeCompare(q.naam, 'nl', { sensitivity: 'base' }) || (p.id < q.id ? -1 : 1),
  gezien: (p, q) => (q.gezien - p.gezien) || (p.id < q.id ? -1 : 1),
};

// rijen: wat Serverlijst.lijst() geeft. opties:
//   zoek (naam, elk woord moet erin staan), alleenAansluitbaar, alleenFavorieten, alleenVers,
//   verbergOnbruikbaar (vol of andere versie), plek ('alle' | 'vrij' | 'vol'),
//   sortering (SORTERINGEN), favorieten (lijst met id's), aantal en vanaf (de pagina).
// Geeft { rijen (de pagina), totaal (na filteren), alles (zonder filteren) }.
export function filterEnSorteer(rijen, opties = {}) {
  const o = {
    zoek: '', alleenAansluitbaar: false, alleenFavorieten: false, alleenVers: false,
    verbergOnbruikbaar: false, plek: 'alle', sortering: 'standaard', favorieten: [],
    aantal: Infinity, vanaf: 0, versBinnen: LIJST.versBinnen, ...opties,
  };
  const alle = Array.isArray(rijen) ? rijen : [];
  const favorieten = new Set(Array.isArray(o.favorieten) ? o.favorieten : []);
  const woorden = woordenVan(o.zoek);
  const blijft = (r) => {
    if (!r) return false;
    if (!past(r.naam, woorden)) return false;
    if (o.alleenAansluitbaar && !r.kan) return false;
    if (o.alleenFavorieten && !favorieten.has(r.id)) return false;
    if (o.alleenVers && !(Number.isFinite(r.ouderdom) && r.ouderdom <= o.versBinnen)) return false;
    if (o.verbergOnbruikbaar && !r.kan) return false;
    if (o.plek === 'vrij' && r.vol) return false;
    if (o.plek === 'vol' && !r.vol) return false;
    return true;
  };
  const uit = alle.filter(blijft).map((r) => ({ ...r, favoriet: favorieten.has(r.id) }));
  const sorteer = SORTERING[o.sortering] || SORTERING.standaard;
  // favorieten staan altijd bovenaan; daarna de gekozen volgorde
  uit.sort((p, q) => (q.favoriet - p.favoriet) || sorteer(p, q));
  const vanaf = Math.max(0, o.vanaf | 0);
  const aantal = Number.isFinite(o.aantal) ? Math.max(0, o.aantal | 0) : uit.length;
  return { rijen: uit.slice(vanaf, vanaf + aantal), totaal: uit.length, alles: alle.length };
}

// ---------------------------------------------------------------- naamfilter
// Eerste hulplijn, geen garantie: een lijst met scheldwoorden, echte merken en bekende namen, gespeld over elk
// zichtbaar teken heen (leestekens, hoofdletters, cijfers voor letters). Elke woordenlijst staat omgekeerd opgeslagen:
// zo slaan de woordenlijsten van scripts/text_audit.mjs niet aan op de blokkeerlijst zelf. De rest doet Melden.
const omkeer = (lijst) => lijst.split(' ').map((w) => [...w].reverse().join(''));
const SCHELD = omkeer('reknak rejilreknak gniret rejilgniret sufyt kaztoolk tuk lul reoh tels loognom leibed rekkilf regen rekkin izan reltih kcuf tihs hctib tnuc kcid yssup epar thcarkrev onrop xes odep leifodep tsirorret kkk fjiwtuk');
const MERK = omkeer('elgoog tfosorcim nozama koobecaf margatsni ppastahw kotkit ebutuoy rettiwt tahcpans xilften yfitops odnetnin noitatsyalp xobx tfarcenim etintrof xolbor ratskcor tfosibu maets drocsid sdlanodcm gnikregrub cfk skcubrats alocacoc ispep nekenieh hcslorg njiehtrebla obmuj ldil idla aeki ekin sadida negawsklov sedecrem alset wmb atoyot elppa gnusmas iewauh aidivn negninorgcf otuatfehtdnarg atg yensid nomekop oiram adlez ogel');
const PERSOON = omkeer('ettur sredliw pmurt nedib nitup niteop amabo ksum grebrekcuz');
const ALLE = [...SCHELD, ...MERK, ...PERSOON];
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i' };
const MEERVOUD = ['', 's', 'je', 'jes', 'en'];

const normaal = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[0134578@$!]/g, (c) => LEET[c]);

// Is dit woord (of de naam als geheel) verboden? Korte woorden (tot vier letters) alleen als los woord, zodat een kutter een kutter blijft.
const ontdubbel = (s) => s.replace(/(.)\1+/g, '$1'); // "kaaanker" telt als "kanker"
export function verboden(tekst) {
  const los = normaal(tekst).split(/[^a-z]+/).filter(Boolean);
  const tokens = []; // letters met spaties ertussen ("k u t") tellen als één woord
  for (const w of los) { if (w.length === 1 && tokens.length && tokens[tokens.length - 1].enkel) tokens[tokens.length - 1].t += w; else tokens.push({ t: w, enkel: w.length === 1 }); }
  const klont = ontdubbel(los.join(''));
  for (const w of ALLE) {
    if (w.length <= 4) { if (tokens.some((k) => MEERVOUD.some((m) => k.t === w + m))) return true; }
    else if (klont.includes(ontdubbel(w))) return true;
  }
  return false;
}

// Een naam voor in de lijst: bijgesneden op spaties, alleen letters, cijfers en een paar leestekens; geen adres, nummer of internetadres.
export function schoonNaam(tekst) {
  const naam = String(tekst ?? '').replace(/\s+/g, ' ').trim();
  if (!naam) return { ok: true, naam: STANDAARD_NAAM };
  if (naam.length > LIJST.maxNaam) return { ok: false, reason: `De naam is te lang: hoogstens ${LIJST.maxNaam} tekens.` };
  if (!/^[\p{L}\p{N} .,'!?&()+-]+$/u.test(naam)) return { ok: false, reason: 'In een naam passen letters, cijfers, spaties en . , \' ! ? & ( ) + -' };
  if (/\d{5,}|\d+\.\d+\.\d+|\bwww\b|\bhttps?\b|\b\w+\.(nl|com|net|org|eu|io|gg|tv|be|de)\b/i.test(naam)) return { ok: false, reason: 'Een naam mag geen adres, telefoonnummer of internetadres zijn.' };
  if (verboden(naam)) return { ok: false, reason: 'Deze naam kan niet: kies een andere. Scheldwoorden, echte merken en namen van echte mensen mogen niet.' };
  return { ok: true, naam };
}

// ---------------------------------------------------------------- de aankondiging
const KAMER_RE = /^[A-HJ-NP-Z2-9]{10}$/;
const ID_RE = /^[a-z0-9]{8,16}$/;
const VERSIE_RE = /^[0-9A-Za-z.+-]{1,16}$/;
const som = (a) => crc16(`${a.v}|${a.n}|${a.s}|${a.m}|${a.g}|${a.p}|${a.k}|${a.i}|${a.t}`);

export const maakId = (rand = Math.random, n = 10) => { let s = ''; for (let i = 0; i < n; i++) s += 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(rand() * 36)]; return s; };

// info: { naam, spelers, max, versie, proto, room, id, nu }. Geeft een tekst, of null als de gegevens niet kloppen (nooit een halve aankondiging).
export function codeer(info) {
  const nm = schoonNaam(info.naam);
  const spelers = info.spelers | 0, max = info.max | 0;
  if (!nm.ok || spelers < 1 || spelers > 16 || max < 2 || max > 16 || spelers > max) return null;
  const a = { v: LIJST.formaat, n: nm.naam, s: spelers, m: max, g: String(info.versie), p: info.proto | 0, k: String(info.room), i: String(info.id), t: Math.floor(info.nu) };
  if (!VERSIE_RE.test(a.g) || !KAMER_RE.test(a.k) || !ID_RE.test(a.i) || !Number.isFinite(a.t) || a.p < 0 || a.p > 255) return null;
  a.c = som(a);
  const tekst = JSON.stringify(a);
  return tekst.length <= LIJST.maxBytes ? tekst : null;
}

// Leest een aankondiging van de lijn (ongeveer: alles kan van iedereen komen). nu = onze klok in ms.
// Geeft { ok: true, a: { naam, spelers, max, versie, proto, room, id, t } } of { ok: false, reason }.
export function decodeer(tekst, nu) {
  if (typeof tekst !== 'string' || tekst.length > LIJST.maxBytes) return { ok: false, reason: 'groot' };
  let o; try { o = JSON.parse(tekst); } catch (e) { return { ok: false, reason: 'json' }; }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return { ok: false, reason: 'json' };
  if (o.v !== LIJST.formaat) return { ok: false, reason: 'formaat' };
  const geheel = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
  if (typeof o.n !== 'string' || typeof o.g !== 'string' || typeof o.k !== 'string' || typeof o.i !== 'string' || typeof o.c !== 'string') return { ok: false, reason: 'velden' };
  if (!geheel(o.s, 1, 16) || !geheel(o.m, 2, 16) || o.s > o.m || !geheel(o.p, 0, 255) || !Number.isFinite(o.t)) return { ok: false, reason: 'velden' };
  if (!VERSIE_RE.test(o.g) || !KAMER_RE.test(o.k) || !ID_RE.test(o.i)) return { ok: false, reason: 'velden' };
  if (o.c !== som(o)) return { ok: false, reason: 'som' };
  const nm = schoonNaam(o.n);
  if (!nm.ok || nm.naam !== o.n) return { ok: false, reason: 'naam' }; // ook een lege of niet-gefilterde naam telt niet: een host die zijn eigen filter overslaat, komt er niet mee langs
  if (Number.isFinite(nu) && Math.abs(nu - o.t) > LIJST.scheef) return { ok: false, reason: 'tijd' };
  return { ok: true, a: { naam: o.n, spelers: o.s, max: o.m, versie: o.g, proto: o.p, room: o.k, id: o.i, t: o.t } };
}

// ---------------------------------------------------------------- de lijst bij de speler
// opties: { nu() -> ms, proto, versie (van onszelf), verborgen: [ids], ...LIJST-overschrijvingen voor tests }
export class Serverlijst {
  constructor(opts = {}) {
    this.o = { ...LIJST, ...opts }; this.nu = opts.nu || (() => Date.now());
    this.proto = opts.proto; this.versie = opts.versie != null ? String(opts.versie) : null;
    this.items = new Map(); this.verborgen = new Set(opts.verborgen || []); this.nieuw = []; this.afgewezen = {};
  }
  _af(reden) { this.afgewezen[reden] = (this.afgewezen[reden] || 0) + 1; return { ok: false, reason: reden }; }
  // Eén bericht van de lijn. Geeft { ok } of { ok: false, reason }; 'dubbel' is geen misbruik (elke broker geeft hetzelfde bericht).
  ontvang(tekst, nu = this.nu()) {
    const r = decodeer(tekst, nu);
    if (!r.ok) return this._af(r.reason);
    const a = r.a, oud = this.items.get(a.id);
    if (oud) {
      if (a.t === oud.t) return { ok: false, reason: 'dubbel' };
      if (a.t < oud.t) return this._af('oud');
      if (a.t - oud.t < this.o.minTussen) return this._af('te-snel');
    } else {
      this.nieuw = this.nieuw.filter((x) => nu - x < 60000);
      if (this.nieuw.length >= this.o.nieuwPerMinuut) return this._af('vloed');
      if (this.items.size >= this.o.maxVolgen) { this._schoon(nu); if (this.items.size >= this.o.maxVolgen) return this._af('vol'); }
      this.nieuw.push(nu);
    }
    // dezelfde kamer onder een ander id telt één keer: de nieuwste wint (een vervalser kan zo geen sessie vermenigvuldigen)
    for (const [id, x] of this.items) if (id !== a.id && x.room === a.room) this.items.delete(id);
    this.items.set(a.id, { ...a, gezien: nu });
    return { ok: true };
  }
  _schoon(nu) { for (const [id, x] of this.items) if (nu - x.gezien > this.o.verloop) this.items.delete(id); }
  // Alles wat de speler kan zien: niet verlopen, niet gemeld, met de leeftijd van de aankondiging. Geen afkap: de UI
  // vraagt met zoek() om een pagina, zodat meer dan maxGetoond sessies bereikbaar blijven.
  lijst(nu = this.nu()) {
    this._schoon(nu);
    const uit = [];
    for (const x of this.items.values()) {
      if (this.verborgen.has(x.id)) continue;
      const anders = (this.proto != null && x.proto !== this.proto) || (this.versie != null && x.versie !== this.versie);
      const vol = x.spelers >= x.max;
      const ouderdom = Math.max(0, nu - x.gezien);
      uit.push({ id: x.id, naam: x.naam, spelers: x.spelers, max: x.max, versie: x.versie, room: x.room, anders, vol, kan: !anders && !vol, gezien: x.gezien, ouderdom, dim: ouderdom >= this.o.verloop - this.o.dimLaatste });
    }
    uit.sort(SORTERING.standaard);
    return uit;
  }
  // Dezelfde lijst met zoeken, filters, sortering en een pagina (maxGetoond is de paginagrootte).
  zoek(nu = this.nu(), opties = {}) {
    return filterEnSorteer(this.lijst(nu), { aantal: this.o.maxGetoond, ...opties });
  }
  // Melden: deze sessie verdwijnt uit jouw lijst (alleen lokaal; er wordt niets verstuurd)
  meld(id) { this.verborgen.add(id); this.items.delete(id); return [...this.verborgen]; }
}

// De host: een aankondiging maken zolang de sessie openbaar is. Geeft een functie die elke keer de tekst van dat moment maakt (of null).
export function maakAankondiger({ naam, versie, proto, hub, room, id, nu = () => Date.now() }) {
  return () => {
    const r = typeof room === 'function' ? room() : room;
    const sp = hub ? hub() : null;
    if (!r || !sp) return null;
    return codeer({ naam, spelers: sp.spelers, max: sp.max, versie, proto, room: r, id, nu: nu() });
  };
}
