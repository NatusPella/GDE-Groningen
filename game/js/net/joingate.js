// Samen spelen (#583): deelnemen via de openbare lijst zonder de kamercode te publiceren.
//
// De aankondiging in de lijst draagt alleen het vaste sessie-id van de host (net/serverlijst.js).
// Een gast die op een rij klikt, stuurt een eenmalig verzoek met zijn eigen publieke sleutel naar
// het onderwerp van dat id; de host antwoordt op zijn eigen onderwerp met de kamercode, versleuteld
// voor precies die gast (ECDH P-256 → AES-GCM, net/sigcrypto.js). Daarna loopt het bestaande pad:
// de gast vraagt het aanbod op onder de kamercode (net/rtcroom.js) en antwoordt versleuteld.
//
// Waarom dit veilig is: wie alleen de lijst leest, ziet geen sleutel, geen kamercode en geen
// onderwerp van de kamer. Zonder kamercode kan hij het aanbod niet vinden (het onderwerp volgt uit
// de code) en niet ontsleutelen (de sleutel volgt uit de code); in het aanbod staan de ICE-kandidaten,
// dus het publieke IP van de host. Hij kan wél zelf een verzoek sturen, maar dan is hij een deelnemer
// die de host ziet (en kan kicken), geen stille meelezer.
//
// De hostsleutel (#795, vervolg op #777): de aankondiging in de lijst draagt ook de publieke hostsleutel van de
// sessie (net/serverlijst.js, net/hub.js). Het antwoord wordt versleuteld met de gedeelde sleutel van die
// hostsleutel en de sleutel van de gast. Alleen de echte host kan dat antwoord maken: wie het verzoek op het
// openbare onderwerp ziet, kan met zijn eigen paar wél een postvak publiceren, maar de gast ontsleutelt dat niet
// en verwerpt het dus vóór het verbinden. Als tweede slot controleert de gast na het verbinden het welkom
// (sessie-id en naam) tegen de rij waarop hij klikte (lobbyui.js, sessionboot.js). De lijst blijft zelf een
// vindplaats: wie de rij van een derde overneemt, kan daar een eigen sleutel neerzetten (#589). Daarom is een rij
// nooit meer dan de ingang en ziet de host wie er binnenkomt (en kan hij hem kicken).
//
// De host houdt een klein postvak bij (nonce → versleuteld antwoord) en publiceert dat als één tekst,
// omdat de brokers maar één tekst per onderwerp doorgeven (brokers.js: kondig/luister). Elke gast
// haalt zijn eigen nonce eruit. Oude antwoorden verlopen; het postvak is klein en begrensd.
//   node scripts/net_joingate_test.mjs
import { makeRoom, topicFor, maakSleutelpaar, sleutelTekst, sleutelVanTekst, gedeeldeSleutel, versleutelVoor, ontsleutelVoor } from './sigcrypto.js';

export const JOIN = {
  formaat: 2,          // 2: het postvak draagt de hostsleutel en is daarmee aan de host gebonden (#795)
  interval: 2000,      // ms: hoe vaak het verzoek en het postvak opnieuw geplaatst worden
  wacht: 10000,        // ms: een gast wacht hoogstens zo lang op een antwoord
  ttl: 90000,          // ms: een antwoord blijft in het postvak staan
  maxAntwoorden: 6,    // postvakgrootte; klein houden, het is één aankondigingstekst
  minTussen: 400,      // ms: de host antwoordt hoogstens zo vaak (tegen een vloed aan verzoeken)
  scheef: 600000,      // ms: ruime marge (#782): een klokverschil van enkele minuten mag het aansluiten niet
                       // blokkeren; de tijd is alleen een grens tegen zeer oude of herhaalde berichten
  maxBytes: 2400,      // groter is geen verzoek en geen postvak
};

export const ID_RE = /^[a-z0-9]{8,16}$/;
const NONCE_RE = /^[a-f0-9]{16}$/;
const PUB_RE = /^[A-Za-z0-9_-]{86,88}$/;
const KAMER_RE = /^[A-HJ-NP-Z2-9]{10}$/;

export const joinTopic = (id) => topicFor('gde-join:' + String(id));
export const antwoordTopic = (id) => topicFor('gde-antwoord:' + String(id));

// Een nonce van 16 hextekens: willekeurig, zodat twee gasten elkaars antwoord niet kunnen raden.
export function maakNonce(rand = Math.random) {
  let s = '';
  if (!rand || rand === Math.random) { const b = globalThis.crypto.getRandomValues(new Uint8Array(8)); for (const x of b) s += x.toString(16).padStart(2, '0'); return s; }
  for (let i = 0; i < 16; i++) s += '0123456789abcdef'[Math.floor(rand() * 16)];
  return s;
}

const geldigTijd = (t, nu) => Number.isFinite(t) && Number.isFinite(nu) && Math.abs(nu - t) <= JOIN.scheef;

// ---------------------------------------------------------------- het verzoek van de gast
// { v, i (sessie-id), n (nonce), p (publieke sleutel), t }. Geen kamer, geen sleutel van de host:
// alles in dit bericht mag de hele wereld zien.
export function maakVraag({ id, nonce, pub, nu }) {
  if (!ID_RE.test(String(id)) || !NONCE_RE.test(String(nonce)) || !PUB_RE.test(String(pub)) || !Number.isFinite(nu)) return null;
  const tekst = JSON.stringify({ v: JOIN.formaat, i: String(id), n: String(nonce), p: String(pub), t: Math.floor(nu) });
  return tekst.length <= JOIN.maxBytes ? tekst : null;
}

export function leesVraag(tekst, { id, nu } = {}) {
  if (typeof tekst !== 'string' || tekst.length > JOIN.maxBytes) return { ok: false, reason: 'groot' };
  let o; try { o = JSON.parse(tekst); } catch (e) { return { ok: false, reason: 'json' }; }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return { ok: false, reason: 'json' };
  if (o.v !== JOIN.formaat || typeof o.i !== 'string' || typeof o.n !== 'string' || typeof o.p !== 'string') return { ok: false, reason: 'velden' };
  if (!ID_RE.test(o.i) || !NONCE_RE.test(o.n) || !PUB_RE.test(o.p) || !geldigTijd(o.t, nu)) return { ok: false, reason: 'velden' };
  if (id != null && o.i !== String(id)) return { ok: false, reason: 'ander-id' };
  return { ok: true, a: { id: o.i, nonce: o.n, pub: o.p, t: o.t } };
}

// ---------------------------------------------------------------- het postvak van de host
// { v, k (publieke hostsleutel van deze sessie), a: { <nonce>: { c (versleutelde kamer), t } } }. Het antwoord
// is versleuteld met de gedeelde sleutel tussen de hostsleutel (net/hub.js) en de sleutel van de gast, met de
// nonce als additional data. Alleen de gast met de bijbehorende privésleutel kan zijn eigen c ontsleutelen, en
// alleen de host met de privéhelft van k kan hem maken: een postvak van iemand anders ontsleutelt niet (#795).
export function maakPostvak(antwoorden, nu, hostKey) {
  if (!PUB_RE.test(String(hostKey)) || !Number.isFinite(nu)) return null;
  const a = {};
  for (const [nonce, x] of antwoorden) {
    if (!NONCE_RE.test(nonce) || !x || typeof x.blob !== 'string' || !Number.isFinite(x.t)) continue;
    a[nonce] = { c: x.blob, t: Math.floor(x.t) };
  }
  const tekst = JSON.stringify({ v: JOIN.formaat, k: String(hostKey), a, t: Math.floor(nu) });
  return tekst.length <= JOIN.maxBytes ? tekst : null;
}

export function leesPostvak(tekst, nu) {
  if (typeof tekst !== 'string' || tekst.length > JOIN.maxBytes) return { ok: false, reason: 'groot' };
  let o; try { o = JSON.parse(tekst); } catch (e) { return { ok: false, reason: 'json' }; }
  if (!o || typeof o !== 'object' || Array.isArray(o) || o.v !== JOIN.formaat) return { ok: false, reason: 'velden' };
  if (typeof o.k !== 'string' || !PUB_RE.test(o.k)) return { ok: false, reason: 'velden' };
  if (!o.a || typeof o.a !== 'object' || Array.isArray(o.a)) return { ok: false, reason: 'velden' };
  if (!Number.isFinite(o.t) || !Number.isFinite(nu) || Math.abs(nu - o.t) > JOIN.scheef) return { ok: false, reason: 'tijd' };
  const a = {};
  for (const [nonce, x] of Object.entries(o.a)) {
    if (!NONCE_RE.test(nonce) || !x || typeof x !== 'object') continue;
    if (typeof x.c !== 'string' || x.c.length > 400) continue;
    if (!geldigTijd(x.t, nu)) continue;
    a[nonce] = { blob: x.c, t: x.t };
  }
  return { ok: true, hostKey: o.k, a };
}

// ---------------------------------------------------------------- de host
// opts: { id, hostKeyPair (het sessiepaar uit net/hub.js, #795), maakSignaler() -> kondig+luister-achtig
//         (net/brokers.js LijstSignaler), onKamer(room) -> Promise (zet de kamer klaar: hostRoom + addGuest),
//         mag() -> bool (is er nog plek?), nu(), rand }.
// Geeft { stop(), antwoorden, tekst() } of null als er niets te bedienen valt (zonder hostsleutel geen poort).
export function bedienKamer({ id, hostKeyPair, maakSignaler, onKamer, mag = () => true, nu = () => Date.now(), rand = null } = {}) {
  if (typeof maakSignaler !== 'function' || !ID_RE.test(String(id)) || !hostKeyPair) return null;
  const antwoorden = new Map(), gezien = new Map();
  let gestopt = false, laatste = 0, luis = null, zender = null, hostKeyText = '';

  const prune = (nuT) => {
    for (const [nonce, x] of antwoorden) if (nuT - x.t > JOIN.ttl) antwoorden.delete(nonce);
    for (const [nonce, t] of gezien) if (nuT - t > JOIN.ttl) gezien.delete(nonce);
  };
  const tekst = () => { const nuT = nu(); prune(nuT); return hostKeyText ? maakPostvak(antwoorden, nuT, hostKeyText) : null; };

  async function beantwoord(bericht) {
    if (gestopt) return;
    const nuT = nu();
    prune(nuT);
    const r = leesVraag(bericht, { id, nu: nuT });
    if (!r.ok || !mag()) return;
    const nonce = r.a.nonce;
    if (gezien.has(nonce)) return; // hetzelfde verzoek (de gast herhaalt het): één keer antwoorden
    if (nuT - laatste < JOIN.minTussen) return; // te snel na het vorige antwoord
    if (antwoorden.size >= JOIN.maxAntwoorden) {
      const oudste = [...antwoorden.entries()].sort((a, b) => a[1].t - b[1].t)[0];
      if (oudste) antwoorden.delete(oudste[0]); else return;
    }
    laatste = nuT;
    // #783: meteen onthouden dat dit verzoek in behandeling is. De gast herhaalt zijn verzoek elke 2 s;
    // duurt onKamer (hostRoom met ICE) langer, dan zet het tweede, identieke verzoek anders een tweede
    // kamer op die niemand gebruikt. Mislukt de behandeling echt, dan mag de gast het opnieuw proberen.
    gezien.set(nonce, nuT);
    try {
      // #795: het antwoord wordt gemaakt met de hostsleutel van deze sessie, niet met een eenmalig paar:
      // alleen deze host kan het maken en de gast herkent hem aan de sleutel uit de aankondiging.
      const peer = await sleutelVanTekst(r.a.pub);
      const sleutel = await gedeeldeSleutel(hostKeyPair, peer);
      const room = rand ? makeRoom(rand) : makeRoom(); // een nieuwe, eenmalige kamer per gast
      const blob = await versleutelVoor(sleutel, JSON.stringify({ room, id: String(id) }), nonce);
      if (gestopt) return;
      if (onKamer) await onKamer(room); // eerst de kamer klaarzetten, dan pas de sleutel geven
      if (gestopt) return;
      antwoorden.set(nonce, { blob, t: nuT });
    } catch (e) { gezien.delete(nonce); /* kapot of geknoeid verzoek: negeren; een echte gast mag het opnieuw proberen */ }
  }

  Promise.all([sleutelTekst(hostKeyPair), joinTopic(id), antwoordTopic(id)]).then(([hostKey, tv, ta]) => {
    if (gestopt || !hostKey) return; // zonder publieke hostsleutel publiceert deze poort niets
    hostKeyText = hostKey;
    luis = maakSignaler();
    zender = maakSignaler();
    luis.luister(tv, (bericht) => { beantwoord(bericht).catch(() => {}); });
    // Het postvak wordt elke interval opnieuw geplaatst; de tekst wordt pas bij het plaatsen
    // gemaakt, dus een antwoord dat er later bij komt gaat mee met de volgende ronde.
    zender.kondig(ta, () => tekst());
  }, () => {});

  return {
    antwoorden,
    tekst,
    stop() {
      gestopt = true;
      for (const s of [luis, zender]) { try { if (s) s.close(); } catch (e) { /* al weg */ } }
      luis = null; zender = null;
    },
  };
}

// ---------------------------------------------------------------- de gast
// Vraagt de kamercode van een sessie uit de lijst. Geeft de kamer (10 tekens) of gooit een fout.
// opts: { id, hostKey (de publieke hostsleutel uit de aankondiging, verplicht sinds #795), maakSignaler(),
//         wacht (ms), nu(), rand }.
// Alleen een antwoord dat met de hostsleutel van de rij is versleuteld, ontsleutelt hier: een postvak van een
// niet-host valt af vóór er verbonden wordt (#777). Zonder hostsleutel kan er niets gecontroleerd worden en
// gaat de functie meteen met een fout terug.
export async function vraagKamer({ id, hostKey, maakSignaler, wacht = JOIN.wacht, nu = () => Date.now(), rand = null } = {}) {
  if (typeof maakSignaler !== 'function' || !ID_RE.test(String(id))) throw new Error('Onbekende sessie.');
  if (!PUB_RE.test(String(hostKey))) throw new Error('Deze sessie is niet bereikbaar.');
  const paar = await maakSleutelpaar();
  const pub = await sleutelTekst(paar);
  const nonce = maakNonce(rand || Math.random);
  const vraag = maakVraag({ id, nonce, pub, nu: nu() });
  if (!vraag) throw new Error('Deze sessie is niet bereikbaar.');
  // De gedeelde sleutel met de host uit de aankondiging: alleen de host kan het antwoord daarmee maken.
  const sleutel = await gedeeldeSleutel(paar, await sleutelVanTekst(String(hostKey)));
  const [tv, ta] = await Promise.all([joinTopic(id), antwoordTopic(id)]);
  return new Promise((resolve, reject) => {
    let klaar = false, timer = null, luis = null, zender = null;
    const stop = () => {
      if (klaar) return;
      klaar = true;
      clearTimeout(timer);
      for (const s of [luis, zender]) { try { if (s) s.close(); } catch (e) { /* al weg */ } }
    };
    timer = setTimeout(() => { stop(); reject(new Error('Deze sessie antwoordt niet.')); }, Math.max(1, wacht));
    luis = maakSignaler();
    luis.luister(ta, (bericht) => {
      if (klaar) return;
      const p = leesPostvak(bericht, nu());
      // #795: een postvak van iemand met een andere sleutel is niet van deze host: negeren, ook als het wel
      // voor onze nonce versleuteld lijkt. Pas daarna ontsleutelen en de kamer controleeren.
      if (!p.ok || p.hostKey !== String(hostKey) || !p.a[nonce]) return;
      (async () => {
        try {
          const tekst = await ontsleutelVoor(sleutel, p.a[nonce].blob, nonce);
          const o = tekst ? JSON.parse(tekst) : null;
          if (!o || o.id !== String(id) || !KAMER_RE.test(String(o.room))) return; // niet ons antwoord of geknoeid
          stop();
          resolve(o.room);
        } catch (e) { /* geknoeid antwoord: negeren */ }
      })();
    });
    zender = maakSignaler();
    zender.kondig(tv, () => vraag); // de gast herhaalt zijn verzoek tot er antwoord komt
  });
}
