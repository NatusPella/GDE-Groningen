// Samen spelen voor Bezit (epic #1095, #1104; ontwerp docs/BEZIT-21-11.md 10, optie A met een zachte claim). Bezit is per speler (#429): in zijn eigen spel koopt iedereen
// wat hij wil. In een lopende sessie meldt een koper zijn perceel (claim) en ziet elke speler het als "van <naam>": het is deze sessie niet meer te koop voor een ander.
// Conflict (twee kopers binnen dezelfde seconde): de claim met de laagste (tijd, speler-id) wint, de ander krijgt zijn geld volledig terug en een melding; nooit verlies.
// Wegvallen: de claims van wie weggaat verdwijnen, zijn eigen bezit blijft van hem. Aansluiten: een gast stuurt zijn ID-verzameling en krijgt die van de anderen terug.
// Meewerken (5.5): de eigenaar krijgt oogst en voortgang, de gast krijgt loon. Puur: geen netwerk, geen DOM, geen klok (scripts/bezitcoop_test.mjs); het verzenden is een haak.

export const CLAIM_MAX = 5000;                     // hoeveel claims van anderen we onthouden (een bovengrens tegen een vol netwerk)
export const ID_RE = /^p[0-9a-f]{12}$/;

// De ID-verzameling als 6 byte per perceel in base64 (het netwerk stuurt dit, nooit polygonen).
export function encodeIds(ids) {
  const list = [...new Set(ids)].filter((id) => ID_RE.test(id)).sort();
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
      const nieuw = { from: msg.from, name: String(msg.name || 'Medespeler').slice(0, 24), color: typeof msg.color === 'string' ? msg.color.slice(0, 9) : null, t };
      const oud = claims.get(msg.id);
      if (!oud) {
        if (claims.size >= CLAIM_MAX) return { ok: false, ignored: 'vol' };
        claims.set(msg.id, nieuw); return { ok: true };
      }
      if (oud.from === nieuw.from) { claims.set(msg.id, nieuw); return { ok: true }; }
      if (wins(nieuw, oud)) {
        claims.set(msg.id, nieuw);
        return { ok: true, lost: oud.from === selfId, replaced: oud.from };
      }
      return { ok: false, ignored: 'verloren', took: nieuw.from !== selfId ? false : true, lost: nieuw.from === selfId };
    },
    // Wegvallen: de claims van deze speler verdwijnen (zijn eigen bezit blijft van hem, in zijn eigen spel).
    drop(playerId) { let n = 0; for (const [id, c] of claims) if (c.from === playerId) { claims.delete(id); n++; } return n; },
    // De claim van een ander op dit perceel (voor de kaartlaag en de koopknop), of null. Onze eigen claim telt hier niet: dat is gewoon van jou.
    lookup(id) { const c = claims.get(id); return c && c.from !== selfId ? { name: c.name, color: c.color, playerId: c.from } : null; },
    has: (id) => claims.has(id),
    // Voor de palen in de wereld: de claims van anderen als { id, name, color }.
    list() { const out = []; for (const [id, c] of claims) if (c.from !== selfId) out.push({ id, name: c.name, color: c.color }); return out; },
    // Aansluiten: wat wij sturen (onze eigen claims als verzameling) en wat we terugkrijgen (de verzameling van een ander, als claims van hem).
    snapshot() { const mine = []; for (const [id, c] of claims) if (c.from === selfId) mine.push(id); return encodeIds(mine); },
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
