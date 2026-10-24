// Samen spelen (#439): het spel overdragen aan een andere speler. Pure basis: het formaat van de momentopname en de toestandsmachine van
// de overdracht (voorbereiden, aanbieden, accepteren, annuleren, mislukken). Geen netwerk, geen DOM, geen klok: wie het gebruikt geeft
// `nu` (seconden) mee en verstuurt de berichten die terugkomen (JSON-gebeurtenissen met `k`, via Reliable; codec en PROTO veranderen niet).
// Grondregel: tot de nieuwe host zegt dat zijn hub draait (`hw-draait`) blijft de oude host host. Elke fout, time-out of annulering ervoor
// laat de oude sessie ongemoeid. Docs en ontwerp: issue #439. De koppeling met de wereld en het netwerk staat in coophostwisselnet.js.
import { checkHandshake } from './net/protocol.js';

export const MOMENTOPNAME_V = 1;
export const STUK = 800;            // tekens per stuk: ook met veel aanhalingstekens blijft het bericht onder MAX_JSON (2048) van de codec
export const MAX_LEN = 64 * 1024;   // een momentopname is nooit groter dan dit (hoogstens 82 stukken)
export const MAX_STUKKEN = Math.ceil(MAX_LEN / STUK);
export const VENSTER = 16;          // stukken per keer onderweg (Reliable houdt er hoogstens 32 vast)
export const TIJD = { bod: 20, stukken: 30, laden: 15, draait: 15 }; // seconden per fase
const MAX_SPELERS = 16, MAX_KAPOT = 400, MAX_VOERTUIGEN = 16;

// ---- de momentopname -------------------------------------------------------------------------------------------------
const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const tekst = (v, max = 60) => (typeof v === 'string' ? v.slice(0, max) : '');
const r2 = (v) => Math.round(num(v) * 100) / 100;

// Verkeer, voetgangers en dieren zitten er niet in: die ontstaan opnieuw rond de spelers (met `zaad`). Wel: tijd, weer, gezocht,
// de lopende opdracht (met de stand binnen de opdracht, #452), geld en toestand per speler, kapotte objecten en de voertuigen van spelers.
export function maakMomentopname(inv = {}) {
  const t = inv.tijd || {}, o = inv.opdracht || null, w = inv.wanted || {};
  return {
    v: MOMENTOPNAME_V,
    ver: { game: tekst(inv.ver && inv.ver.game), proto: num(inv.ver && inv.ver.proto), version: tekst(inv.ver && inv.ver.version), tiles: tekst(inv.ver && inv.ver.tiles), story: tekst(inv.ver && inv.ver.story) },
    zaad: num(inv.zaad) >>> 0,
    tijd: { dag: Math.max(0, Math.floor(num(t.dag))), uur: Math.min(24, Math.max(0, r2(t.uur))), tempo: r2(t.tempo || 1) },
    weer: tekst(inv.weer, 30),
    weerstaat: inv.weerstaat && typeof inv.weerstaat === 'object' && JSON.stringify(inv.weerstaat).length <= 700 ? JSON.parse(JSON.stringify(inv.weerstaat)) : null, // de weermachine (coopweer.js weerEvent zonder k)
    wanted: { niveau: Math.min(5, Math.max(0, Math.floor(num(w.niveau)))), hitte: r2(w.hitte) },
    opdracht: o ? {
      id: tekst(o.id), stap: Math.max(0, Math.floor(num(o.stap))), staat: tekst(o.staat, 30), t: r2(o.t),
      deel: Math.max(0, Math.floor(num(o.deel))), // de stage in de keten, of het waypoint van een race (#452)
      tijd: Number.isFinite(o.tijd) ? r2(o.tijd) : null, // seconden die nog over waren
    } : null,
    spelers: (inv.spelers || []).slice(0, MAX_SPELERS).map((p) => ({
      slot: Math.max(0, Math.floor(num(p.slot))), naam: tekst(p.naam, 40), char: tekst(p.char, 30), geld: Math.max(0, Math.floor(num(p.geld))),
      health: Math.max(0, Math.round(num(p.health, 100))), x: r2(p.x), y: r2(p.y), z: r2(p.z), voertuig: p.voertuig == null ? null : tekst(String(p.voertuig), 40),
    })),
    kapot: (inv.kapot || []).slice(0, MAX_KAPOT).map((k) => tekst(String(k), 40)),
    voertuigen: (inv.voertuigen || []).slice(0, MAX_VOERTUIGEN).map((v) => ({
      id: tekst(String(v.id), 40), soort: tekst(v.soort, 30), x: r2(v.x), y: r2(v.y), z: r2(v.z), hoek: r2(v.hoek), schade: Math.min(1, Math.max(0, r2(v.schade))),
      // hetzelfde model en dezelfde kleur bij de nieuwe host (#452): geen willekeurige auto op de plek van de oude
      uiterlijk: v.uiterlijk && typeof v.uiterlijk === 'object' ? {
        naam: tekst(v.uiterlijk.naam, 20), kleur: tekst(v.uiterlijk.kleur, 20), streep: tekst(v.uiterlijk.streep, 20), accent: tekst(v.uiterlijk.accent, 20), kajuit: tekst(v.uiterlijk.kajuit, 20),
      } : null,
    })),
  };
}

// FNV-1a over de tekens: klein, snel en genoeg om een stuk dat kwijt of beschadigd is op te merken (geen beveiliging).
export function controlegetal(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

// Compacte JSON met controlegetal en stukken. null als hij te groot is.
export function codeerMomentopname(m) {
  const json = JSON.stringify(m);
  if (json.length > MAX_LEN) return null;
  const stukken = [];
  for (let i = 0; i < json.length; i += STUK) stukken.push(json.slice(i, i + STUK));
  return { json, len: json.length, sum: controlegetal(json), stukken };
}

// Controleert en leest een momentopname terug (de ontvanger vertrouwt de ander niet). null bij elke fout.
export function leesMomentopname(json) {
  let m;
  try { m = JSON.parse(json); } catch (e) { return null; }
  if (!m || typeof m !== 'object' || m.v !== MOMENTOPNAME_V || !Array.isArray(m.spelers) || !Array.isArray(m.kapot) || !Array.isArray(m.voertuigen)) return null;
  if (!m.ver || !m.tijd || !m.wanted) return null;
  return maakMomentopname(m); // zelfde begrenzing als bij het maken
}

// ---- de berichten (JSON-gebeurtenissen; k begint met 'hw-') -------------------------------------------------------------
export const HW = { PAUZE: 'hw-pauze', BOD: 'hw-bod', STUK: 'hw-stuk', JA: 'hw-ja', NEE: 'hw-nee', GELADEN: 'hw-geladen', DRAAIT: 'hw-draait', VERBIND: 'hw-verbind', ANNULEER: 'hw-annuleer', AANGESLOTEN: 'hw-aangesloten' };
export const HERSTEL = { KOP: 'hw-hk', STUK: 'hw-hs' }; // variant 2: de herstelmomentopname voor als wie het spel opende wegvalt (JSON-gebeurtenissen, PROTO blijft 2)
const KIND = new Set(Object.values(HW));
export const isHostwissel = (b) => !!b && typeof b === 'object' && KIND.has(b.k);
const idOk = (v) => Number.isInteger(v) && v > 0 && v <= 0xffffff;

// ---- de toestandsmachine: wie het spel opende ----------------------------------------------------------------------------
// fase: 'rust' → 'aangeboden' → 'sturen' → 'laden' → 'wacht-draait' → 'klaar' (de oude host is nu gast)
//       en overal vóór 'klaar': 'mislukt' of 'geannuleerd' (de oude host blijft host)
export class OudeHost {
  constructor({ ver, naam = '' } = {}) { this.ver = ver; this.naam = tekst(naam, 40); this.reset(); }
  reset() { this.fase = 'rust'; this.id = 0; this.doel = -1; this.pak = null; this.volgend = 0; this.sinds = 0; this.reden = ''; this.kamer = ''; this.terug = ''; this.genegeerd = 0; }
  get isHost() { return this.fase !== 'klaar'; } // alleen na het bevestigde 'hw-draait' is de oude host geen host meer
  get bezig() { return this.fase === 'aangeboden' || this.fase === 'sturen' || this.fase === 'laden' || this.fase === 'wacht-draait'; }
  _stop(fase, reden, nu, uit) { this.fase = fase; this.reden = reden; this.sinds = nu; if (uit && this.id) uit.push({ k: HW.ANNULEER, id: this.id, reden }); }

  // Voorbereiden en aanbieden in één keer: de momentopname (al gemaakt met maakMomentopname) en de speler die host moet worden.
  // Geeft { uit: [berichten voor `doel`] } of { fout }.
  bied(doelSlot, momentopname, id, nu, terug = '') {
    if (this.bezig || this.fase === 'klaar') return { fout: 'bezig' };
    if (!Number.isInteger(doelSlot) || doelSlot <= 0 || !idOk(id)) return { fout: 'ongeldig' };
    const pak = codeerMomentopname(momentopname);
    if (!pak) { this.fase = 'mislukt'; this.reden = 'te-groot'; return { fout: 'te-groot' }; }
    this.reset(); this.id = id; this.doel = doelSlot; this.pak = pak; this.fase = 'aangeboden'; this.sinds = nu; this.terug = tekst(terug, 64);
    return { uit: [{ k: HW.BOD, id, naam: this.naam, n: pak.stukken.length, len: pak.len, sum: pak.sum, ver: this.ver, ...(this.terug ? { terug: this.terug } : {}) }] };
  }
  // Een bericht van `van` (plek). Geeft { uit: [...] } met wat nu verstuurd moet worden (naar het doel, of 'rest' voor de anderen).
  ontvang(b, van, nu) {
    const uit = [];
    if (!this.bezig || !isHostwissel(b) || b.id !== this.id || van !== this.doel) { this.genegeerd++; return { uit }; }
    if (b.k === HW.NEE && this.fase === 'aangeboden') this._stop('mislukt', tekst(b.reden, 20) || 'geweigerd', nu, null);
    else if (b.k === HW.JA && this.fase === 'aangeboden') { this.fase = 'sturen'; this.sinds = nu; }
    else if (b.k === HW.GELADEN && this.fase === 'laden') {
      if (b.ok === true && b.sum === this.pak.sum) { this.fase = 'wacht-draait'; this.sinds = nu; } else this._stop('mislukt', tekst(b.reden, 20) || 'laden-mislukt', nu, uit);
    } else if (b.k === HW.NEE) this._stop('mislukt', tekst(b.reden, 20) || 'geweigerd', nu, null);
    else if (b.k === HW.DRAAIT && this.fase === 'wacht-draait') {
      const kamer = tekst(b.kamer, 64);
      if (!kamer) { this._stop('mislukt', 'geen-kamer', nu, uit); return { uit }; }
      this.kamer = kamer; this.fase = 'klaar'; this.sinds = nu;
      uit.push({ k: HW.VERBIND, id: this.id, kamer, naam: this.naam, naar: 'rest', ...(this.terug ? { terug: this.terug } : {}) }); // de anderen (en wie het spel opende, nu als gast) verbinden met de nieuwe host
    } else this.genegeerd++;
    return { uit };
  }
  // Elke tik: stukken uitgeven (hoogstens `ruimte` tegelijk, anders wacht het) en time-outs.
  tik(nu, ruimte = VENSTER) {
    const uit = [];
    if (this.fase === 'sturen') {
      const p = this.pak.stukken;
      while (this.volgend < p.length && uit.length < Math.min(ruimte, VENSTER)) { uit.push({ k: HW.STUK, id: this.id, i: this.volgend, d: p[this.volgend] }); this.volgend++; }
      if (this.volgend >= p.length) { this.fase = 'laden'; this.sinds = nu; }
      else if (nu - this.sinds > TIJD.stukken) this._stop('mislukt', 'time-out', nu, uit);
    } else if (this.bezig) {
      const max = this.fase === 'aangeboden' ? TIJD.bod : this.fase === 'laden' ? TIJD.laden : TIJD.draait;
      if (nu - this.sinds > max) this._stop('mislukt', 'time-out', nu, uit);
    }
    return { uit };
  }
  // De speler (of de nieuwe host) breekt af. Na 'klaar' kan dat niet meer.
  annuleer(nu) {
    const uit = [];
    if (this.bezig) this._stop('geannuleerd', 'geannuleerd', nu, uit);
    return { uit };
  }
}

// ---- de toestandsmachine: wie host wordt -------------------------------------------------------------------------------
// fase: 'rust' → 'gevraagd' (melding J/N) → 'ontvangt' → 'geladen' (wereld laden, hub starten) → 'host'; of 'geweigerd', 'mislukt', 'geannuleerd'
export class NieuweHost {
  constructor({ ver } = {}) { this.ver = ver; this.reset(); }
  reset() { this.fase = 'rust'; this.id = 0; this.van = -1; this.naam = ''; this.n = 0; this.len = 0; this.sum = ''; this.terug = ''; this.stukken = new Map(); this.sinds = 0; this.reden = ''; this.momentopname = null; this.genegeerd = 0; }
  get bezig() { return this.fase === 'gevraagd' || this.fase === 'ontvangt' || this.fase === 'geladen'; }
  _nee(reden, nu, uit) { if (this.id) uit.push({ k: HW.NEE, id: this.id, reden }); this.fase = reden === 'geweigerd' ? 'geweigerd' : 'mislukt'; this.reden = reden; this.sinds = nu; }

  ontvang(b, van, nu) {
    const uit = [];
    if (!isHostwissel(b)) { this.genegeerd++; return { uit }; }
    if (b.k === HW.BOD) {
      if (this.bezig) { this.genegeerd++; return { uit: [{ k: HW.NEE, id: b.id, reden: 'bezig' }].filter((x) => idOk(x.id)) }; }
      if (!idOk(b.id) || !Number.isInteger(b.n) || b.n < 1 || b.n > MAX_STUKKEN || !Number.isInteger(b.len) || b.len < 1 || b.len > MAX_LEN || b.len > b.n * STUK || b.len <= (b.n - 1) * STUK || typeof b.sum !== 'string' || b.sum.length !== 8) { this.genegeerd++; return { uit }; }
      this.reset(); this.id = b.id; this.van = van; this.naam = tekst(b.naam, 40); this.n = b.n; this.len = b.len; this.sum = b.sum; this.terug = tekst(b.terug, 64); this.sinds = nu;
      if (!this.ver || !checkHandshake(this.ver, b.ver).ok) { this._nee('versie', nu, uit); return { uit }; }
      this.fase = 'gevraagd';
      return { uit };
    }
    if (b.id !== this.id || van !== this.van) { this.genegeerd++; return { uit }; }
    if (b.k === HW.ANNULEER && this.bezig) { this.fase = 'geannuleerd'; this.reden = 'geannuleerd'; this.sinds = nu; return { uit }; }
    if (b.k === HW.STUK && this.fase === 'ontvangt') {
      const laatste = this.n - 1;
      if (!Number.isInteger(b.i) || b.i < 0 || b.i > laatste || typeof b.d !== 'string' || b.d.length > STUK || (b.i < laatste && b.d.length !== STUK)) { this.genegeerd++; return { uit }; }
      if (!this.stukken.has(b.i)) this.stukken.set(b.i, b.d);
      if (this.stukken.size === this.n) this._klaarMetStukken(nu, uit);
      return { uit };
    }
    this.genegeerd++;
    return { uit };
  }
  _klaarMetStukken(nu, uit) {
    let json = '';
    for (let i = 0; i < this.n; i++) json += this.stukken.get(i);
    const m = json.length === this.len && controlegetal(json) === this.sum ? leesMomentopname(json) : null;
    if (!m) { uit.push({ k: HW.GELADEN, id: this.id, ok: false, reden: 'controle' }); this.fase = 'mislukt'; this.reden = 'controle'; this.sinds = nu; return; }
    this.momentopname = m; this.fase = 'geladen'; this.sinds = nu;
    uit.push({ k: HW.GELADEN, id: this.id, ok: true, sum: this.sum });
  }
  // De speler antwoordt op de melding.
  antwoord(ja, nu) {
    const uit = [];
    if (this.fase !== 'gevraagd') return { uit };
    if (ja) { this.fase = 'ontvangt'; this.sinds = nu; uit.push({ k: HW.JA, id: this.id }); } else this._nee('geweigerd', nu, uit);
    return { uit };
  }
  // De wereld is geladen en de hub draait onder `kamer` (dezelfde signalering/kamer, zonder nieuwe code): nu pas is hij host.
  draait(kamer, nu) {
    const uit = [];
    if (this.fase !== 'geladen' || typeof kamer !== 'string' || !kamer) return { uit };
    this.fase = 'host'; this.sinds = nu; uit.push({ k: HW.DRAAIT, id: this.id, kamer: kamer.slice(0, 64) });
    return { uit };
  }
  // Het laden of de hub starten lukte niet (bijvoorbeeld niet bereikbaar): de oude host blijft host.
  mislukt(reden, nu) {
    const uit = [];
    if (this.bezig) this._nee(tekst(reden, 20) || 'mislukt', nu, uit);
    return { uit };
  }
  tik(nu) {
    const uit = [];
    if (!this.bezig) return { uit };
    const max = this.fase === 'gevraagd' ? TIJD.bod : this.fase === 'ontvangt' ? TIJD.stukken + TIJD.laden : TIJD.laden + TIJD.draait;
    if (nu - this.sinds > max) this._nee('time-out', nu, uit);
    return { uit };
  }
}

// ---- de andere spelers: naar de nieuwe host --------------------------------------------------------------------------------
// Een geldig 'hw-verbind' van de oude host (plek 0) voor de lopende overdracht; anders null. De kamer is dezelfde als de oude: geen nieuwe code.
export function leesVerbind(b, van, verwachtId = 0) {
  if (!b || b.k !== HW.VERBIND || van !== 0 || !idOk(b.id) || (verwachtId && b.id !== verwachtId)) return null;
  const kamer = tekst(b.kamer, 64);
  const terug = tekst(b.terug, 64);
  return kamer ? { id: b.id, kamer, naam: tekst(b.naam, 40), ...(terug ? { terug } : {}) } : null;
}

// ---- variant 2: overname bij wegvallen -------------------------------------------------------------------------------------------
// Wie het spel opende stuurt elke paar seconden een compacte herstelmomentopname naar de gasten (dezelfde momentopname als bij het overdragen,
// plus de rangorde van opvolgers en per opvolger een kamercode die alleen de groep kent). Valt hij weg (12 s niets gehoord, geen BYE), dan kiest
// iedere gast met die lijst dezelfde opvolger: de beste verbinding (laagste ping, bij gelijk de laagste plek). Die opent de kamer en de rest sluit
// daar aan; lukt dat niet binnen een beurt, dan is de volgende aan de beurt.
export const HERSTEL_S = 10;        // s tussen twee herstelmomentopnames (bij meer dan 3 gasten langer: het bandbreedtebudget)
export const STILTE_S = 12;         // s zonder enig bericht van wie het spel opende voor de groep het wegvallen aanneemt
export const BEURT_S = 30;          // s per opvolger om de kamer te openen en de anderen binnen te krijgen
export const MAX_RANG = 8;          // opvolgers in de lijst
export const MAX_HERSTEL_STUKKEN = 12; // een herstelmomentopname groter dan dit (ca. 9,6 KB) gaat niet mee: dan blijft de vorige gelden
const PING_BAK = 20;                // ms: pings binnen dezelfde bak gelden als even goed (dan beslist de plek)
export const herstelInterval = (gasten) => HERSTEL_S + 2.5 * Math.max(0, gasten - 3);
export const beurtIndex = (sinds) => Math.max(0, Math.floor(sinds / BEURT_S));
// Welke beurt is het `sinds` seconden na het begin? Elk lijstitem heeft zijn eigen `duur` (anders BEURT_S); na de laatste: lijst.length.
export function beurtOp(lijst, sinds) {
  let t = Math.max(0, sinds);
  for (let i = 0; i < lijst.length; i++) { const d = lijst[i].duur || BEURT_S; if (t < d) return i; t -= d; }
  return lijst.length;
}
const bak = (ping) => (Number.isFinite(ping) && ping > 0 ? Math.round(ping / PING_BAK) : 9999); // een onbekende ping is de slechtste

// Kandidaten [{ slot, ping (ms), kamer }] op volgorde: laagste ping, bij gelijk de laagste plek. `vorige` (de vorige lijst) houdt de lijst rustig:
// de vorige nummer één blijft eerste zolang hij hooguit één bak slechter is. Zo verschillen de lijsten van twee gasten niet door één meting.
export function rangschik(kandidaten, vorige = []) {
  const lijst = (kandidaten || []).filter((k) => k && Number.isInteger(k.slot) && k.slot >= 1).slice().sort((a, b) => bak(a.ping) - bak(b.ping) || a.slot - b.slot);
  const was = vorige && vorige[0] ? lijst.findIndex((k) => k.slot === vorige[0].slot) : -1;
  if (was > 0 && bak(lijst[was].ping) - bak(lijst[0].ping) <= 1) lijst.unshift(lijst.splice(was, 1)[0]);
  return lijst.slice(0, MAX_RANG);
}

// De herstelmomentopname in één kop en stukken (JSON-gebeurtenissen). null als hij te groot is.
export function maakHerstel(id, m, rang) {
  const pak = codeerMomentopname(m);
  if (!pak || pak.stukken.length > MAX_HERSTEL_STUKKEN || !idOk(id)) return null;
  const kop = { k: HERSTEL.KOP, id, n: pak.stukken.length, len: pak.len, sum: pak.sum, rang: (rang || []).slice(0, MAX_RANG).map((r) => [r.slot, Math.max(0, Math.round(num(r.ping))), tekst(r.kamer, 64)]) };
  return { kop, stukken: pak.stukken.map((d, i) => ({ k: HERSTEL.STUK, id, i, d })) };
}

// De gast die de herstelmomentopnames ontvangt. neem(bericht) geeft { id, m, rang } zodra een nieuwe compleet en geldig is, anders null.
export class HerstelOntvanger {
  constructor() { this.id = 0; this.kop = null; this.stukken = new Map(); this.laatste = 0; }
  neem(b) {
    if (!b || typeof b !== 'object') return null;
    if (b.k === HERSTEL.KOP) {
      if (!idOk(b.id) || b.id <= this.laatste || !Number.isInteger(b.n) || b.n < 1 || b.n > MAX_HERSTEL_STUKKEN || !Number.isInteger(b.len) || b.len < 1 || b.len > b.n * STUK || b.len <= (b.n - 1) * STUK || typeof b.sum !== 'string' || b.sum.length !== 8 || !Array.isArray(b.rang) || b.rang.length > MAX_RANG) return null;
      const rang = [];
      for (const r of b.rang) { if (!Array.isArray(r) || !Number.isInteger(r[0]) || r[0] < 1 || r[0] > 32 || typeof r[2] !== 'string' || !r[2] || r[2].length > 64) return null; rang.push({ slot: r[0], ping: num(r[1]), kamer: r[2] }); }
      if (b.id === this.id) return null;
      this.id = b.id; this.kop = { n: b.n, len: b.len, sum: b.sum, rang }; this.stukken = new Map();
      return null;
    }
    if (b.k !== HERSTEL.STUK || !this.kop || b.id !== this.id) return null;
    const k = this.kop;
    if (!Number.isInteger(b.i) || b.i < 0 || b.i >= k.n || typeof b.d !== 'string' || b.d.length > STUK || (b.i < k.n - 1 && b.d.length !== STUK)) return null;
    if (!this.stukken.has(b.i)) this.stukken.set(b.i, b.d);
    if (this.stukken.size < k.n) return null;
    let json = ''; for (let i = 0; i < k.n; i++) json += this.stukken.get(i);
    const klaar = this.kop; this.kop = null; this.stukken = new Map();
    const m = json.length === klaar.len && controlegetal(json) === klaar.sum ? leesMomentopname(json) : null;
    if (!m) return null;
    this.laatste = this.id;
    return { id: this.id, m, rang: klaar.rang };
  }
}

// ---- teksten voor de spelers (zonder rolnaam, met namen) ---------------------------------------------------------------------
export const vraagWachtTekst = (naam) => `Je vroeg ${naam || 'de ander'} het spel over te nemen. Wachten op het antwoord.`;
export const bodTekst = (naam) => `${naam || 'De ander'} wil het spel aan je overdragen: jij houdt de wereld dan draaiend. J = ja, N = nee.`;
export const pauzeTekst = (naam) => `${naam || 'De ander'} neemt het spel over. Even wachten, het duurt een paar seconden.`;
export const overTekst = (naam) => `${naam || 'De ander'} heeft het spel overgenomen. Je speelt nu mee in dat spel.`;
export const verbindMisluktTekst = 'Verbinden met het nieuwe spel lukte niet. Je speelt weer in je eigen spel.';
// wat de speler leest die het spel zou krijgen (de ander houdt het spel)
export const gemistTekst = (reden) => ({
  geweigerd: 'Je hebt het spel niet overgenomen.',
  'time-out': 'Er kwam geen antwoord of het duurde te lang. De ander houdt het spel.',
  geannuleerd: 'De overdracht is gestopt. De ander houdt het spel.',
  onbereikbaar: 'De anderen kunnen jou niet bereiken, dus het overnemen kan niet. De ander houdt het spel.',
  versie: 'Jullie spelen een andere versie van het spel. De ander houdt het spel.',
}[reden] || 'De overdracht is niet gelukt. De ander houdt het spel.');
export const jijTekst = 'Je hebt het spel overgenomen. De anderen verbinden nu met jou.';
export const mislukTekst = (reden) => ({
  geweigerd: 'De ander wilde het spel niet overnemen. Jij houdt het spel.',
  versie: 'De ander speelt een andere versie van het spel. Jij houdt het spel.',
  'time-out': 'De overdracht duurde te lang. Jij houdt het spel.',
  'te-groot': 'Het spel is nu te groot om over te dragen. Jij houdt het spel.',
  bezig: 'De ander is al met iets anders bezig. Jij houdt het spel.',
  onbereikbaar: 'De ander is voor de anderen niet bereikbaar. Jij houdt het spel.',
  weg: 'De ander is weggevallen. Jij houdt het spel.',
  geannuleerd: 'De overdracht is gestopt. Jij houdt het spel.',
}[reden] || 'De overdracht is mislukt. Jij houdt het spel.');
export const weggevallenTekst = (naam) => `Wie het spel opende is weggevallen. ${naam || 'De ander'} neemt het over. Even wachten.`;
export const jijOvernameTekst = 'Wie het spel opende is weggevallen. Jij neemt het over: de anderen verbinden nu met jou.';
export const sluitAanTekst = (naam) => `${naam || 'De ander'} heeft het spel overgenomen. Je speelt weer mee.`;
export const overnameMisluktTekst = 'Wie het spel opende is weggevallen en niemand kon het overnemen. Je speelt weer in je eigen spel.';
export const terugHostTekst = 'Verbinden met het nieuwe spel lukte niet. Jij houdt het spel weer.';
