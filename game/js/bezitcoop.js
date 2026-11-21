// Samen spelen voor Bezit (epic #1095, #1104; ontwerp docs/BEZIT-21-11.md 10, optie A met een zachte claim). Bezit is per speler (#429): in zijn eigen spel koopt iedereen
// wat hij wil. In een lopende sessie meldt een koper zijn perceel (claim) en ziet elke speler het als "van <naam>": het is deze sessie niet meer te koop voor een ander.
// Conflict (twee kopers binnen dezelfde seconde): de claim met de laagste (tijd, speler-id) wint, de ander krijgt zijn geld volledig terug en een melding; nooit verlies.
// Wegvallen: de claims van wie weggaat verdwijnen, zijn eigen bezit blijft van hem. Aansluiten: een gast stuurt zijn ID-verzameling en krijgt die van de anderen terug.
// Meewerken (5.5): de eigenaar krijgt oogst en voortgang, de gast krijgt loon. Puur: geen netwerk, geen DOM, geen klok (scripts/bezitcoop_test.mjs); het verzenden is een haak.

export const CLAIM_MAX = 5000;                     // hoeveel claims van anderen we onthouden (een bovengrens tegen een vol netwerk)
export const PARCEL_RE = /^p[0-9a-f]{12}$/;
export const SPOT_RE = /^sp:[a-z]{2,12}$/;                // een standplaats van de snackwagen (pitch.js claimKey)
export const ID_RE = /^(p[0-9a-f]{12}|sp:[a-z]{2,12})$/;

// De ID-verzameling als 6 byte per perceel in base64 (het netwerk stuurt dit, nooit polygonen).
export function encodeIds(ids) {
  const list = [...new Set(ids)].filter((id) => PARCEL_RE.test(id)).sort();
  let s = '';
  for (const id of list) for (let i = 1; i < 13; i += 2) s += String.fromCharCode(parseInt(id.slice(i, i + 2), 16));
  return typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64');
}
export function decodeIds(str, max = CLAIM_MAX) {
  const out = [];
  if (typeof str !== 'string' || !str) return out;
  let s;
  try { s = typeof atob === 'function' ? atob(str) : Buffer.from(str, 'base64').toString('binary'); } catch (e) { return out; }
  for (let i = 0; i + 6 <= s.length && out.length < max; i += 6) {
    let h = 'p';
    for (let k = 0; k < 6; k++) h += s.charCodeAt(i + k).toString(16).padStart(2, '0');
    out.push(h);
  }
  return out;
}

// De claims van deze sessie. selfId is de speler van dit apparaat. Alle claims (ook de eigen) staan in één Map: id -> { from, name, color, t }.
export function createClaims(selfId) {
  const claims = new Map();
  const wins = (a, b) => (a.t < b.t || (a.t === b.t && String(a.from) < String(b.from)));   // a wint van b
  const api = {
    selfId,
    // Een claim of loslating uit het netwerk (of van onszelf). msg: { id, action: 'claim' | 'release', from, name, color, t }.
    // Geeft { ok, lost?: true (onze eigen claim verloor: terugbetalen), took?: true (wij wonnen van een ander), ignored?: reden }.
    apply(msg) {
      if (!msg || !ID_RE.test(msg.id) || msg.from === undefined || msg.from === null) return { ok: false, ignored: 'ongeldig' };
      if (msg.action === 'release') {
        const c = claims.get(msg.id);
        if (c && c.from === msg.from) { claims.delete(msg.id); return { ok: true }; }
        return { ok: false, ignored: 'niet-van-hem' };
      }
      if (msg.action !== 'claim') return { ok: false, ignored: 'onbekend' };
      const t = Number.isFinite(msg.t) ? msg.t : 0;
      const incoming = { from: msg.from, name: String(msg.name || 'Medespeler').slice(0, 24), color: typeof msg.color === 'string' ? msg.color.slice(0, 9) : null, t };
      const oud = claims.get(msg.id);
      if (!oud) {
        if (claims.size >= CLAIM_MAX) return { ok: false, ignored: 'vol' };
        claims.set(msg.id, incoming); return { ok: true };
      }
      if (oud.from === incoming.from) { claims.set(msg.id, incoming); return { ok: true }; }
      if (wins(incoming, oud)) {
        claims.set(msg.id, incoming);
        return { ok: true, lost: oud.from === selfId, replaced: oud.from };
      }
      return { ok: false, ignored: 'verloren', took: incoming.from !== selfId ? false : true, lost: incoming.from === selfId };
    },
    // Wegvallen: de claims van deze speler verdwijnen (zijn eigen bezit blijft van hem, in zijn eigen spel).
    drop(playerId) { let n = 0; for (const [id, c] of claims) if (c.from === playerId) { claims.delete(id); n++; } return n; },
    // De claim van een ander op dit perceel (voor de kaartlaag en de koopknop), of null. Onze eigen claim telt hier niet: dat is gewoon van jou.
    lookup(id) { const c = claims.get(id); return c && c.from !== selfId ? { name: c.name, color: c.color, playerId: c.from } : null; },
    // alle claims (ook de eigen) met de afzender, voor het doorgeven aan een gast die aansluit
    listAll() { const out = []; for (const [id, c] of claims) out.push({ id, from: c.from, name: c.name, color: c.color }); return out; },
    has: (id) => claims.has(id),
    // Voor de palen in de wereld: de claims van anderen als { id, name, color }.
    list() { const out = []; for (const [id, c] of claims) if (c.from !== selfId && PARCEL_RE.test(id)) out.push({ id, name: c.name, color: c.color }); return out; },
    // De standplaatsen van anderen als { spot, name, color } (alleen sp:-claims); mine(): de eigen.
    listSpots() { const out = []; for (const [id, c] of claims) if (c.from !== selfId && SPOT_RE.test(id)) out.push({ spot: id.slice(3), name: c.name, color: c.color }); return out; },
    mineSpots() { const out = []; for (const [id, c] of claims) if (c.from === selfId && SPOT_RE.test(id)) out.push(id.slice(3)); return out; },
    // Aansluiten: wat wij sturen (onze eigen claims als verzameling) en wat we terugkrijgen (de verzameling van een ander, als claims van hem).
    snapshot() { const mine = []; for (const [id, c] of claims) if (c.from === selfId && PARCEL_RE.test(id)) mine.push(id); return encodeIds(mine); },
    // Aansluiten voor standplaatsen: een kommalijst van de eigen sp:-claims (hoogstens 16) en wat we van een ander overnemen.
    snapshotSpots() { return api.mineSpots().slice(0, 16).join(','); },
    adoptSpots(playerId, name, color, str, t = 0) { let k = 0; for (const s of String(str || '').split(',').slice(0, 16)) if (api.apply({ id: 'sp:' + s, action: 'claim', from: playerId, name, color, t }).ok) k++; return k; },
    adopt(playerId, name, color, str, t = 0) { let n = 0; for (const id of decodeIds(str)) if (api.apply({ id, action: 'claim', from: playerId, name, color, t }).ok) n++; return n; },
    size: () => claims.size,
    clear() { claims.clear(); },
  };
  return api;
}

// Meewerken op andermans perceel (5.5): de verdeling van wat een klus oplevert. De eigenaar krijgt de oogst en de voortgang (veldtoestand, prestatie, Landbouw-punten),
// de gast krijgt loon: het loonwerktarief van het perceel (nieuw geld, niet van de eigenaar af) en zijn eigen punten en teller "gewerkte hectares".
export function workShare({ ha, wagePerHa = 85, harvestKg = 0 }) {
  const h = Math.max(0, Number(ha) || 0);
  return {
    owner: { harvestKg: Math.max(0, Math.round(harvestKg)), progress: true },
    guest: { wage: Math.round(h * Math.max(0, wagePerHa)), hectares: Math.round(h * 100) / 100, points: Math.round(h * 5) },
  };
}

// Meewerken in de snackwagen (Snackimperium, #1102): de eigenaar houdt de winst van zijn wagen en zijn voortgang; een gast achter het luik krijgt loon per uur
// (nieuw geld, niet van de eigenaar af) of, bij een wagen op aandeel, een kwart van de dagwinst naar rato van zijn uren; de gast telt zijn eigen verkochte porties.
export function snackShare({ net = 0, hours = 0, portions = 0, mode = 'loon', wagePerHour = 14 }) {
  const h = Math.max(0, Math.min(14, Number(hours) || 0));
  const wage = mode === 'aandeel' ? Math.round(Math.max(0, Number(net) || 0) * 0.25 * Math.min(1, h / 10)) : Math.round(h * Math.max(0, wagePerHour));
  return { owner: { net: Math.round(Number(net) || 0), progress: true }, guest: { wage, portions: Math.max(0, Math.round(portions)), points: Math.round(h * 4) } };
}
