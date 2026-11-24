// De lokale kaart van de minimap (24-11, wens van de eigenaar: "binnen een voetbalwedstrijd toont de minimap het veld, bij padel de baan,
// bij karten alleen het circuit"). Puur: geen DOM en geen canvas-API behalve het ctx dat een activiteit zelf meekrijgt, zodat
// scripts/localmap_test.mjs de regels natrekt; hud_panel.js tekent ermee. Zie docs/ontwerp/MINIMAP-CONTEXT-24-11.md.
//
// Eén mechanisme voor alle afgebakende speelplekken: een activiteit meldt zich één keer aan met registerLocalMap(id, (world) => ...)
// en geeft elke tekenbeurt zijn beschrijving terug zolang hij actief is, anders null. De minimap vraagt het elke tekenbeurt
// opnieuw (activeLocalMap): er is geen vlag die kan blijven hangen. Eindigt de activiteit op welke manier ook (afgebroken, dood,
// verbinding weg, laden, een nieuwe host), dan geeft zijn aanmelder null en staat de wereldkaart er meteen weer.
//
// De beschrijving (door de activiteit zelf bewaard en per beurt bijgewerkt, zonder nieuwe objecten per beeld):
//   id        'voetbal' | 'padel' | 'kartbaan' | ...
//   key       tekst: verandert als de vaste laag opnieuw getekend moet worden (ander veld, andere clubkleuren)
//   cx, cy    het midden van het getoonde vak, in wereldmeters
//   ax        de hoek (rad, wereld) van de x-as van het vak: het vak is lokaal x in [-hw, hw], y in [-hh, hh] (y naar beneden)
//   hw, hh    de halve maten van het getoonde vak in meters (het veld plus een kleine marge)
//   up        de wereldhoek die op het scherm omhoog moet wijzen (bij sport: de eigen aanvalsrichting; bij het circuit: noord)
//   paint     (g, res) tekent de vaste laag in vak-meters (oorsprong in het midden); g is al geschaald met res px per meter
//   dots      vooraf gemaakte lijst { x, y (wereld), vorm, kleur, rand, hoek, groot, keeper, eigen } en n (hoeveel er gelden)

const registry = new Map();
export function registerLocalMap(id, fn) { if (typeof fn === 'function') registry.set(id, fn); }
export function unregisterLocalMap(id) { registry.delete(id); }
export const localMapIds = () => [...registry.keys()];

// De beschrijving van de plek waar de speler nu actief is, of null (dan blijft de wereldkaart). Eerste aanmelder die iets geeft wint;
// een fout in een aanmelder laat de wereldkaart staan.
export function activeLocalMap(world) {
  if (typeof window !== 'undefined' && window.__geenLokaleKaart) return null; // debug en beeldvergelijking: altijd de wereldkaart
  for (const fn of registry.values()) {
    let d = null;
    try { d = fn(world); } catch (e) { d = null; }
    if (d && Number.isFinite(d.cx) && Number.isFinite(d.cy) && d.hw > 0 && d.hh > 0) return d;
  }
  return null;
}

// ------------------------------------------------------------------ de transformatie
// Draaiing van wereld naar scherm zodat de wereldhoek `up` omhoog wijst (zelfde conventie als de wereldkaart: schermx = dx cos - dy sin).
export const rotatieOmhoog = (up) => -Math.PI / 2 - (Number.isFinite(up) ? up : -Math.PI / 2);

// De schaal (px per meter) waarop het gedraaide vak precies in een vierkant van `maat` px past, met `rand` px lucht.
export function passendeSchaal(d, rot, maat, rand = 8) {
  const h = rot + d.ax; // de hoek van de vak-x-as op het scherm
  const c = Math.abs(Math.cos(h)), s = Math.abs(Math.sin(h));
  const ex = d.hw * c + d.hh * s, ey = d.hw * s + d.hh * c; // halve schermmaat van het gedraaide vak, in meters
  return Math.max(1e-6, (maat / 2 - rand) / Math.max(ex, ey, 1e-6));
}

// Wereldpunt naar schermpunt (px in een vierkant van `maat`), zonder een array per punt: het resultaat komt in out[0], out[1].
export function naarKaart(d, rot, schaal, maat, x, y, out) {
  const dx = x - d.cx, dy = y - d.cy, c = Math.cos(rot), s = Math.sin(rot);
  out[0] = maat / 2 + (dx * c - dy * s) * schaal;
  out[1] = maat / 2 + (dx * s + dy * c) * schaal;
  return out;
}

// Een punt binnen het vierkant houden (een bal die het veld uit vliegt blijft aan de rand zichtbaar). Geeft terug of hij binnen lag.
export function klemOpKaart(out, maat, rand = 4) {
  const lo = rand, hi = maat - rand;
  const bin = out[0] >= lo && out[0] <= hi && out[1] >= lo && out[1] <= hi;
  if (out[0] < lo) out[0] = lo; else if (out[0] > hi) out[0] = hi;
  if (out[1] < lo) out[1] = lo; else if (out[1] > hi) out[1] = hi;
  return bin;
}

// De vaste laag: hoeveel apparaatpixels per meter, zodat hij scherp blijft op de schaal waarop hij getekend wordt, en nooit te groot.
export const VAST_MAX_PX = 1536;
export function vasteMaat(d, schaal, dpr) {
  const res = Math.min(Math.max(schaal * dpr, 1) * 1.25, VAST_MAX_PX / (2 * Math.max(d.hw, d.hh)));
  return { res, w: Math.max(1, Math.ceil(2 * d.hw * res)), h: Math.max(1, Math.ceil(2 * d.hh * res)) };
}
// Moet de vaste laag opnieuw? c: { key, res } van de laatst getekende; m: de gewenste maat.
export const vasteVerouderd = (c, d, m) => !c || c.key !== d.key || Math.abs(Math.log(m.res / c.res)) > 0.18;

// ------------------------------------------------------------------ hoek-easing en de stippen
export const TWEE_PI = Math.PI * 2;
export function kortsteHoek(van, naar) { let d = naar - van; d -= Math.round(d / TWEE_PI) * TWEE_PI; return d; }

// Een lege stippenlijst met vaste plekken (de activiteit vult die elke beurt; geen allocatie per beeld).
export function maakStippen(max) {
  const dots = Array.from({ length: max }, () => ({ x: 0, y: 0, vorm: 'rond', kleur: '#ffffff', rand: null, hoek: 0, groot: 1, keeper: false, eigen: false }));
  return { dots, n: 0, max };
}
// Zet de volgende vrije stip neer en geef hem terug, of null als de lijst vol is.
export function zetStip(lijst, x, y, vorm, kleur, o) {
  if (lijst.n >= lijst.max) return null;
  const s = lijst.dots[lijst.n++];
  s.x = x; s.y = y; s.vorm = vorm; s.kleur = kleur;
  s.rand = o && o.rand || null; s.hoek = o && o.hoek || 0; s.groot = o && o.groot || 1; s.keeper = !!(o && o.keeper); s.eigen = !!(o && o.eigen);
  return s;
}

// Een clubkleur (getal 0xRRGGBB of tekst '#rrggbb') als tekst voor een canvas.
export function kleurCss(k, terug = '#ffffff') {
  if (typeof k === 'number' && Number.isFinite(k)) return '#' + (k & 0xffffff).toString(16).padStart(6, '0');
  return typeof k === 'string' && /^#[0-9a-fA-F]{6}$/.test(k) ? k : terug;
}
