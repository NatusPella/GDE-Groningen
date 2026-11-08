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
// De host houdt een klein postvak bij (nonce → versleuteld antwoord) en publiceert dat als één tekst,
// omdat de brokers maar één tekst per onderwerp doorgeven (brokers.js: kondig/luister). Elke gast
// haalt zijn eigen nonce eruit. Oude antwoorden verlopen; het postvak is klein en begrensd.
//   node scripts/net_joingate_test.mjs
import { makeRoom, topicFor, maakSleutelpaar, sleutelTekst, sleutelVanTekst, gedeeldeSleutel, versleutelVoor, ontsleutelVoor } from './sigcrypto.js';

export const JOIN = {
  formaat: 1,
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
// { v, a: { <nonce>: { p (hostsleutel), c (versleutelde kamer), t } } }. Alleen de gast met de
// bijbehorende privésleutel kan zijn eigen c ontsleutelen; de rest ziet ruis.
export function maakPostvak(antwoorden, nu) {
  const a = {};
  for (const [nonce, x] of antwoorden) {
    if (!NONCE_RE.test(nonce) || !x || !PUB_RE.test(String(x.pub)) || typeof x.blob !== 'string' || !Number.isFinite(x.t)) continue;
    a[nonce] = { p: x.pub, c: x.blob, t: Math.floor(x.t) };
  }
  const tekst = JSON.stringify({ v: JOIN.formaat, a, t: Math.floor(nu) });
  return tekst.length <= JOIN.maxBytes ? tekst : null;
}

export function leesPostvak(tekst, nu) {
  if (typeof tekst !== 'string' || tekst.length > JOIN.maxBytes) return { ok: false, reason: 'groot' };
  let o; try { o = JSON.parse(tekst); } catch (e) { return { ok: false, reason: 'json' }; }
  if (!o || typeof o !== 'object' || Array.isArray(o) || o.v !== JOIN.formaat) return { ok: false, reason: 'velden' };
  if (!o.a || typeof o.a !== 'object' || Array.isArray(o.a)) return { ok: false, reason: 'velden' };
  if (!Number.isFinite(o.t) || !Number.isFinite(nu) || Math.abs(nu - o.t) > JOIN.scheef) return { ok: false, reason: 'tijd' };
  const a = {};
  for (const [nonce, x] of Object.entries(o.a)) {
    if (!NONCE_RE.test(nonce) || !x || typeof x !== 'object') continue;
    if (!PUB_RE.test(String(x.p)) || typeof x.c !== 'string' || x.c.length > 400) continue;
    if (!geldigTijd(x.t, nu)) continue;
    a[nonce] = { pub: x.p, blob: x.c, t: x.t };
  }
  return { ok: true, a };
}

// ---------------------------------------------------------------- de host
// opts: { id, maakSignaler() -> kondig+luister-achtig (net/brokers.js LijstSignaler), onKamer(room)
//         -> Promise (zet de kamer klaar: hostRoom + addGuest), mag() -> bool (is er nog plek?),
//         nu(), rand }.
// Geeft { stop(), antwoorden, tekst() } of null als er niets te bedienen valt.
export function bedienKamer({ id, maakSignaler, onKamer, mag = () => true, nu = () => Date.now(), rand = null } = {}) {
  if (typeof maakSignaler !== 'function' || !ID_RE.test(String(id))) return null;
  const antwoorden = new Map(), gezien = new Map();
  let gestopt = false, laatste = 0, luis = null, zender = null;

  const prune = (nuT) => {
    for (const [nonce, x] of antwoorden) if (nuT - x.t > JOIN.ttl) antwoorden.delete(nonce);
    for (const [nonce, t] of gezien) if (nuT - t > JOIN.ttl) gezien.delete(nonce);
  };
  const tekst = () => { const nuT = nu(); prune(nuT); return maakPostvak(antwoorden, nuT); };

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
      const paar = await maakSleutelpaar();
      const peer = await sleutelVanTekst(r.a.pub);
      const sleutel = await gedeeldeSleutel(paar, peer);
      const room = rand ? makeRoom(rand) : makeRoom(); // een nieuwe, eenmalige kamer per gast
      const blob = await versleutelVoor(sleutel, JSON.stringify({ room, id: String(id) }), nonce);
      if (gestopt) return;
      if (onKamer) await onKamer(room); // eerst de kamer klaarzetten, dan pas de sleutel geven
      if (gestopt) return;
      antwoorden.set(nonce, { pub: await sleutelTekst(paar), blob, t: nuT });
    } catch (e) { gezien.delete(nonce); /* kapot of geknoeid verzoek: negeren; een echte gast mag het opnieuw proberen */ }
  }

  Promise.all([joinTopic(id), antwoordTopic(id)]).then(([tv, ta]) => {
    if (gestopt) return;
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
// opts: { id, maakSignaler(), wacht (ms), nu(), rand }.
export async function vraagKamer({ id, maakSignaler, wacht = JOIN.wacht, nu = () => Date.now(), rand = null } = {}) {
  if (typeof maakSignaler !== 'function' || !ID_RE.test(String(id))) throw new Error('Onbekende sessie.');
  const paar = await maakSleutelpaar();
  const pub = await sleutelTekst(paar);
  const nonce = maakNonce(rand || Math.random);
  const vraag = maakVraag({ id, nonce, pub, nu: nu() });
  if (!vraag) throw new Error('Deze sessie is niet bereikbaar.');
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
      if (!p.ok || !p.a[nonce]) return;
      (async () => {
        try {
          const peer = await sleutelVanTekst(p.a[nonce].pub);
          const sleutel = await gedeeldeSleutel(paar, peer);
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
