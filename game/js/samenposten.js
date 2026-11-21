// Samen spelen (#983, #429, #439): posten die tegelijk bezet moeten worden. Een verhaalstap met meerdere plekken (de drie bolwerken
// van het proefbeleg bij Bourtange) wordt met meer spelers verdeeld: elke speler neemt een eigen post en de klok van elke post loopt
// door zolang er iemand staat. Alleen is het precies de oude volgorde (één post per keer): dezelfde tijd per post, dezelfde
// afname buiten de kring (de helft van de oploopsnelheid, zoals bij een `hold`-stap). Puur: geen three.js, geen wereld, geen netwerk
// (scripts/samenposten_test.mjs). De koppeling met de stappen staat in missionposts.js.

export const POST_AFNAME = 0.5;      // buiten de kring zakt de klok half zo snel als hij loopt (zoals missions.js bij `hold`)
const POST_MAX = 6;           // een groep heeft hoogstens zes posten
const POST_RADIUS = 9;        // standaardkring in meters

const fin = (x) => Number.isFinite(x);

// lijst: [{ id, x, y, r, time, label }]; ongeldige posten vallen weg. De staat is gewoon een object (kopieerbaar).
export function maakPosten(lijst = []) {
  const posten = (Array.isArray(lijst) ? lijst : [])
    .filter((p) => p && fin(p.x) && fin(p.y) && fin(p.time) && p.time > 0)
    .slice(0, POST_MAX)
    .map((p, i) => ({ id: p.id == null ? i : p.id, x: p.x, y: p.y, r: fin(p.r) && p.r > 0 ? p.r : POST_RADIUS, time: p.time, label: typeof p.label === 'string' ? p.label : `Post ${i + 1}`, t: 0, klaar: false }));
  return { posten, actief: false, rollen: [], klaar: false, n: 0 };
}

export const aantalKlaar = (st) => st.posten.filter((p) => p.klaar).length;
export const nogOpen = (st) => st.posten.filter((p) => !p.klaar);
export const voortgangVan = (st, i) => { const p = st.posten[i]; return p ? Math.min(1, p.t / p.time) : 0; };

// Wie neemt welke post? Elke speler de dichtstbijzijnde nog open post die nog niemand heeft (kortste afstand eerst, bij gelijke afstand
// de laagste plek); met meer spelers dan open posten delen de laatsten de dichtstbijzijnde. Geeft [{ slot, post }] op volgorde van plek.
// spelers: [{ slot, x, y }].
export function verdeel(st, spelers = []) {
  const open = st.posten.map((p, i) => ({ p, i })).filter((q) => !q.p.klaar);
  const lijst = (spelers || []).filter((s) => s && Number.isInteger(s.slot) && fin(s.x) && fin(s.y));
  const uit = [];
  if (!open.length || !lijst.length) return uit;
  const vrij = new Set(open.map((q) => q.i));
  const rest = lijst.slice().sort((a, b) => a.slot - b.slot);
  const paren = [];
  for (const s of rest) for (const q of open) paren.push({ s, i: q.i, d: Math.hypot(s.x - q.p.x, s.y - q.p.y) });
  paren.sort((a, b) => a.d - b.d || a.s.slot - b.s.slot || a.i - b.i);
  const gedaan = new Set();
  for (const e of paren) {
    if (gedaan.has(e.s.slot) || !vrij.has(e.i)) continue;
    gedaan.add(e.s.slot); vrij.delete(e.i); uit.push({ slot: e.s.slot, post: e.i });
  }
  // wie overblijft (meer spelers dan posten) helpt bij de dichtstbijzijnde open post
  for (const s of rest) {
    if (gedaan.has(s.slot)) continue;
    let best = open[0].i, bd = Infinity;
    for (const q of open) { const d = Math.hypot(s.x - q.p.x, s.y - q.p.y); if (d < bd) { bd = d; best = q.i; } }
    uit.push({ slot: s.slot, post: best });
  }
  return uit.sort((a, b) => a.slot - b.slot);
}

// De uitleg per speler: één korte zin met zijn post. Zonder namen blijft het bij "Jij".
export function rolTekst(st, rol) {
  const p = st.posten[rol.post];
  return p ? `Jij neemt ${p.label.charAt(0).toLowerCase()}${p.label.slice(1)}. Blijf staan tot de klok vol is.` : '';
}

// Zet de groep aan (met meer dan één speler) en geeft de rollen per speler. Eén keer; daarna blijft de groep aan, ook als iemand wegvalt.
export function activeer(st, spelers = []) {
  if (st.actief) return st.rollen;
  st.actief = true;
  st.rollen = verdeel(st, spelers);
  return st.rollen;
}

// Eén stap van de klok. spelers: [{ slot, x, y, ok }] (ok: telt mee, bijvoorbeeld te voet). Een post met minstens één speler in de kring loopt op;
// een open post zonder speler zakt. Een klare post blijft klaar. Geeft de gebeurtenissen: { type: 'post', i } per nieuw klare post en
// één keer { type: 'alles' } als elke post klaar is.
export function tik(st, spelers = [], dt = 0) {
  const ev = [];
  if (!st || st.klaar || !(dt > 0)) return ev;
  const lijst = (spelers || []).filter((s) => s && s.ok !== false && fin(s.x) && fin(s.y));
  st.posten.forEach((p, i) => {
    if (p.klaar) return;
    const bezet = lijst.some((s) => Math.hypot(s.x - p.x, s.y - p.y) <= p.r);
    p.t = bezet ? Math.min(p.time, p.t + dt) : Math.max(0, p.t - dt * POST_AFNAME);
    if (p.t >= p.time) { p.klaar = true; p.t = p.time; st.n++; ev.push({ type: 'post', i }); }
  });
  if (!st.klaar && st.posten.length && st.posten.every((p) => p.klaar)) { st.klaar = true; ev.push({ type: 'alles' }); }
  return ev;
}

// Schaalbaarheid: hoeveel tijd kost de hele groep minimaal? Alleen is het de som, met meer spelers (tot het aantal posten) de langste post.
export function minimaleTijd(st, aantalSpelers = 1) {
  const tijden = st.posten.map((p) => p.time).sort((a, b) => b - a);
  const n = Math.max(1, Math.min(tijden.length, aantalSpelers | 0));
  const kolommen = Array.from({ length: n }, () => 0);
  for (const t of tijden) { kolommen.sort((a, b) => a - b); kolommen[0] += t; }
  return Math.max(...kolommen);
}
