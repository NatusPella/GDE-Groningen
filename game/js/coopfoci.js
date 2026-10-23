// Samen spelen (#429): spelers mogen uit elkaar. Pure logica, zonder three.js of netwerk.
// De wereld van de host wordt geladen en gesimuleerd rond een lijst foci (interessegebieden): de host en elke groep spelers die ver van
// de host lopen. Het register houdt de plekken van alle spelers bij (gasten en figuren); bouwFoci voegt spelers die dicht bij elkaar
// staan samen tot één focus, begrenst het aantal (FOCI_MAX) en zegt wie er niet meer bij kan (die valt terug op de oude band).
// Standaardgedrag: staan alle spelers bij elkaar, dan is er één focus (de gastheer) en verandert er niets. Er is geen vaste maximale afstand:
// het harde plafond is het totaalbudget. Hoe meer groepen uit elkaar staan, hoe kleiner de detailstraal per groep (tegelStraal, aandeel).

export const FOCI_MAX = 8;          // gastheer plus zeven groepen: zoveel interessegebieden tegelijk; wie er daarbuiten valt krijgt een melding en kan met B naar de groep
export const SAMENVOEG_M = 150;     // spelers dichter dan dit bij een focus delen die focus
export const MAX_AFSTAND = Infinity; // geen vaste maximale afstand tussen spelers
export const TEGEL_RADIUS = 1500;   // m: tegels rond de gastheer (de bestaande straal van tilestore.prefetch)
export const TEGEL_RADIUS_EXTRA = 800; // m: tegels rond een losse groep bij twee foci
// Detailstraal van de tegels rond een losse groep naar het aantal foci (de gastheer houdt zijn eigen straal): het totaal aantal tegels blijft begrensd
export function tegelStraal(n) { return n <= 2 ? TEGEL_RADIUS_EXTRA : n <= 4 ? 600 : 400; }
export const TOTAAL_BEVOLKING = 1.5;   // het verkeer en de voetgangers van alle foci samen: hoogstens anderhalf keer wat één speler krijgt
export const ONGELADEN_S = 10;      // s dat een speler op een plek zonder geladen tegel wacht voor de host hem bij de groep zet

export function maakRegister() { return { plekken: new Map() }; }

export function zetPlek(reg, slot, x, y) {
  if (!reg || !Number.isFinite(x) || !Number.isFinite(y)) return false;
  reg.plekken.set(slot, { x, y });
  return true;
}
export function haalWeg(reg, slot) { return !!reg && reg.plekken.delete(slot); }
export function leegRegister(reg) { if (reg) reg.plekken.clear(); }

// host = { x, y } (slot 0). Geeft { foci: [{ x, y, slots, host }], bediend: Set(slots), buiten: Set(slots) }.
// De gastheer is altijd focus 0; de volgorde van de slots bepaalt wie een eigen focus krijgt als het er meer zijn dan FOCI_MAX.
export function bouwFoci(host, reg, { max = FOCI_MAX, samenvoeg = SAMENVOEG_M, maxAfstand = Infinity } = {}) {
  const foci = [], bediend = new Set(), buiten = new Set();
  if (!host || !Number.isFinite(host.x) || !Number.isFinite(host.y)) return { foci, bediend, buiten };
  const nieuw = (x, y, slot, isHost) => { const f = { x, y, slots: [slot], host: isHost, sx: x, sy: y }; foci.push(f); return f; };
  nieuw(host.x, host.y, 0, true); bediend.add(0);
  const slots = reg ? [...reg.plekken.keys()].filter((s) => s !== 0).sort((a, b) => a - b) : [];
  for (const slot of slots) {
    const p = reg.plekken.get(slot);
    if (Math.hypot(p.x - host.x, p.y - host.y) > maxAfstand) { buiten.add(slot); continue; }
    let best = null, bd = samenvoeg;
    for (const f of foci) { const d = Math.hypot(p.x - f.x, p.y - f.y); if (d <= bd) { bd = d; best = f; } }
    if (!best) {
      if (foci.length >= max) { buiten.add(slot); continue; }
      best = nieuw(p.x, p.y, slot, false);
    } else {
      best.slots.push(slot); best.sx += p.x; best.sy += p.y;
      if (!best.host) { best.x = best.sx / best.slots.length; best.y = best.sy / best.slots.length; } // een losse groep volgt zijn midden; die van de gastheer blijft bij de gastheer
    }
    bediend.add(slot);
  }
  for (const f of foci) { delete f.sx; delete f.sy; }
  return { foci, bediend, buiten };
}

// Het aandeel van verkeer en voetgangers per focus: een speler alleen krijgt alles, meerdere foci delen het totaalbudget
export function aandeel(n) { return n <= 1 ? 1 : Math.min(1, TOTAAL_BEVOLKING / n); }

// Afstand van (x, y) tot de dichtstbijzijnde focus; zonder foci tot terugval
export function minAfstand(foci, x, y, terugval = null) {
  let d = Infinity;
  for (const f of foci || []) d = Math.min(d, Math.hypot(x - f.x, y - f.y));
  return d === Infinity && terugval ? Math.hypot(x - terugval.x, y - terugval.y) : d;
}

// Mag deze speler los van de gastheer lopen? ok = ja, geen terugzetten en geen waarschuwing. wacht = de wereld rond hem is nog niet geladen
// (hij staat stil tot de tegels er zijn). Anders valt hij terug op de oude band van de gastheer (coopnet.js bandFiguren).
export function losBesluit({ aan, slot, bediend, dHost, maxAfstand = MAX_AFSTAND, geladen = true }) {
  if (!aan) return { ok: false, wacht: false, reden: 'uit' };
  if (!bediend || !bediend.has(slot)) return { ok: false, wacht: false, reden: 'geen-focus' };
  if (dHost > maxAfstand) return { ok: false, wacht: false, reden: 'te-ver' };
  if (!geladen) return { ok: true, wacht: true, reden: 'ongeladen' };
  return { ok: true, wacht: false, reden: 'ok' };
}

// De tegels die de store moet houden: de gastheer met zijn eigen straal (door main.js), de losse groepen hier met een kleinere straal.
// Geeft [{ x, y, radius }] voor de losse foci (zonder de gastheer).
export function tegelFoci(foci, { radius = tegelStraal((foci || []).length) } = {}) {
  return (foci || []).filter((f) => !f.host).map((f) => ({ x: f.x, y: f.y, radius }));
}
