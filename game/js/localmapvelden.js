// De lokale kaarten van het veld (voetbal), de baan (padel) en het circuit (kartbaan) voor de minimap (24-11, localmap.js).
// Puur: de aanmelders in voetbal.js, padel.js en kartbaan.js geven hun stand mee, dit bestand maakt er de beschrijving van
// (vak, vaste laag, stippen). Elke maker bewaart zijn beschrijving en vult hem bij elke beurt opnieuw, zonder nieuwe objecten per beeld.
// De kleuren komen uit de DS3-tokens (kaartkleuren.js dsKleur) en de kaartinkt (mapstyle.js); alleen de clubkleuren komen van de club.
import { dsKleur } from './kaartkleuren.js';
import { INK, MINI_PALETTE as MINI } from './mapstyle.js';
import { maakStippen, zetStip, kleurCss } from './localmap.js';

const inkt = () => dsKleur('ink-inkt');
const gras = () => dsKleur('ink-bord');
const lijn = () => INK.cream;
const papier = () => MINI.meadow;

// Het vak met papier erbuiten, het speelvlak erin en een inktrand: de basis van elke lokale kaart.
function vlak(g, hw, hh, bx, by, vul) {
  g.fillStyle = papier();
  g.fillRect(-hw, -hh, 2 * hw, 2 * hh);
  g.fillStyle = vul;
  g.fillRect(-bx, -by, 2 * bx, 2 * by);
  g.lineWidth = 0.55;
  g.strokeStyle = inkt();
  g.strokeRect(-bx - 0.28, -by - 0.28, 2 * bx + 0.56, 2 * by + 0.56);
}
const streep = (g, x0, y0, x1, y1) => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };

// ------------------------------------------------------------------ voetbal
// Het veld in eigen ruimte: x dwars (lx = -fx van het spel), y in de lengte (fy). Team 0 verdedigt y = -L/2 en valt aan naar +y.
// Draaiing: de eigen aanvalsrichting wijst omhoog, zoals bij sportgames (en zoals de wedstrijdcamera kijkt); een speler in team 1
// (derby) heeft het veld dus omgekeerd. Het veld draait niet mee met jouw loop: de kaart van een sportspel moet stil staan.
export function maakVoetbalKaart() {
  const stip = maakStippen(32);
  const d = { id: 'voetbal', key: '', cx: 0, cy: 0, ax: 0, hw: 20, hh: 30, up: 0, paint: null, dots: stip.dots, n: 0 };
  let pitch = null;
  d.paint = (g) => {
    const P = pitch, bx = P.B / 2, by = P.L / 2;
    vlak(g, d.hw, d.hh, bx, by, gras());
    // maaistroken: een zachte afwisseling, geen nieuwe kleur
    g.fillStyle = 'rgba(255, 255, 255, 0.05)';
    const stroken = Math.max(4, Math.round(P.L / 7));
    for (let i = 0; i < stroken; i += 2) g.fillRect(-bx, -by + (i * P.L) / stroken, P.B, P.L / stroken);
    g.strokeStyle = lijn(); g.lineWidth = 0.34; g.lineJoin = 'miter';
    g.strokeRect(-bx, -by, P.B, P.L);
    streep(g, -bx, 0, bx, 0);
    g.beginPath(); g.arc(0, 0, P.cirkel, 0, Math.PI * 2); g.stroke();
    g.fillStyle = lijn(); g.beginPath(); g.arc(0, 0, 0.5, 0, Math.PI * 2); g.fill();
    for (const s of [-1, 1]) {
      const y0 = s * by, y1 = s * (by - P.STRAF_D), yd = s * (by - P.STRAF_D * 0.45);
      g.strokeRect(-P.STRAF_B / 2, Math.min(y0, y1), P.STRAF_B, Math.abs(y0 - y1));
      g.strokeRect(-P.DOEL_B / 2 - 1.2, Math.min(y0, yd), P.DOEL_B + 2.4, Math.abs(y0 - yd));
      g.beginPath(); g.arc(0, s * (by - P.stip), 0.5, 0, Math.PI * 2); g.fill();
      // het doel: een inkt vlak achter de doellijn met een crème rand
      g.fillStyle = inkt(); g.fillRect(-P.DOEL_B / 2, Math.min(y0, y0 + s * P.DIEPTE), P.DOEL_B, P.DIEPTE);
      g.strokeRect(-P.DOEL_B / 2, Math.min(y0, y0 + s * P.DIEPTE), P.DOEL_B, P.DIEPTE);
      g.fillStyle = lijn();
    }
  };
  // sim: de wedstrijd (spelers, bal, teams); o: { site: {x, y, a}, toWorld(fx, fy) -> {x, y}, team (mijn team), eigenId, pitch: PITCH }
  d.zet = (sim, o) => {
    const P = o.pitch, groot = P.L > 60;
    const sleutel = `${P.B}x${P.L}:${o.site.x | 0},${o.site.y | 0},${o.site.a.toFixed(3)}`;
    if (!pitch || pitch.B !== P.B || pitch.L !== P.L) pitch = { B: P.B, L: P.L, DOEL_B: P.DOEL_B, STRAF_B: P.STRAF_B, STRAF_D: P.STRAF_D, DIEPTE: P.DOEL_DIEPTE || 1.3, cirkel: groot ? 9.15 : 3, stip: groot ? 11 : 4.5 };
    d.key = sleutel;
    d.cx = o.site.x; d.cy = o.site.y; d.ax = o.site.a;
    d.hw = P.B / 2 + 2.5; d.hh = P.L / 2 + pitch.DIEPTE + 1.8;
    // "omhoog" = de aanvalsrichting van mijn team: +y voor team 0, -y voor team 1; de y-as van het vak staat op hoek a + pi/2
    d.up = o.site.a + Math.PI / 2 + (o.team === 1 ? Math.PI : 0);
    stip.n = 0;
    const k0 = sim.teams && sim.teams[0] ? sim.teams[0] : {}, k1 = sim.teams && sim.teams[1] ? sim.teams[1] : {};
    const bal = sim.bal;
    for (const p of sim.spelers) {
      if (p.id === o.eigenId) continue;
      const q = o.toWorld(p.x, p.y), k = p.team === 1 ? k1 : k0;
      const keeper = p.rol === 'keeper';
      // jouw ploeg een schijf, de andere ploeg een ruit: de kleur is nooit het enige verschil
      zetStip(stip, q.x, q.y, p.team === o.team ? 'rond' : 'ruit', kleurCss(keeper ? k.keeperShirt : k.shirt), { keeper, groot: keeper ? 1.2 : 1 });
    }
    if (o.eigenId >= 0 && sim.spelers[o.eigenId]) {
      const p = sim.spelers[o.eigenId], q = o.toWorld(p.x, p.y), k = p.team === 1 ? k1 : k0;
      // de hoek van het gezicht (veld) naar de wereld: het veld draait met site.a en lx = -fx
      const f = o.toWorld(p.x + Math.cos(p.face), p.y + Math.sin(p.face));
      zetStip(stip, q.x, q.y, 'pijl', kleurCss(p.rol === 'keeper' ? k.keeperShirt : k.shirt), { eigen: true, hoek: Math.atan2(f.y - q.y, f.x - q.x) });
    }
    if (bal) { const q = o.toWorld(bal.x, bal.y); zetStip(stip, q.x, q.y, 'bal', '#ffffff', {}); }
    d.n = stip.n;
    return d;
  };
  return d;
}

// ------------------------------------------------------------------ padel
// De baan: u dwars (-5..5), v in de lengte (-10..10, de eigen helft is v < 0). Lokaal tekenen we x = -u en y = v, zodat de assen
// rechtshandig staan (x-as op hoek rot - pi/2). De eigen kant staat onderaan, het net in het midden, de tegenstander boven.
export function maakPadelKaart() {
  const stip = maakStippen(8);
  const d = { id: 'padel', key: '', cx: 0, cy: 0, ax: 0, hw: 7, hh: 11.8, up: 0, paint: null, dots: stip.dots, n: 0 };
  d.paint = (g) => {
    const W2 = 5, L2 = 10, SERV = 6.95;
    vlak(g, d.hw, d.hh, W2, L2, dsKleur('ink-bord'));
    g.fillStyle = MINI.waterEdge;
    g.fillRect(-W2, -L2, 2 * W2, 2 * L2);
    g.strokeStyle = lijn(); g.lineWidth = 0.14; g.lineJoin = 'miter';
    g.strokeRect(-W2, -L2, 2 * W2, 2 * L2);
    streep(g, -W2, SERV, W2, SERV); streep(g, -W2, -SERV, W2, -SERV);
    streep(g, 0, -SERV, 0, SERV);
    // de glazen wanden: dikke inkt aan de achterkant en de zijkanten, een crème glansrand erbinnen
    g.strokeStyle = inkt(); g.lineWidth = 0.7;
    g.strokeRect(-W2 - 0.35, -L2 - 0.35, 2 * W2 + 0.7, 2 * L2 + 0.7);
    g.strokeStyle = INK.seaLabel; g.lineWidth = 0.22;
    g.strokeRect(-W2 - 0.05, -L2 - 0.05, 2 * W2 + 0.1, 2 * L2 + 0.1);
    // het net: een inktlijn met twee palen
    g.strokeStyle = inkt(); g.lineWidth = 0.34; g.setLineDash([0.6, 0.35]);
    streep(g, -W2 - 0.3, 0, W2 + 0.3, 0); g.setLineDash([]);
    g.fillStyle = inkt();
    for (const s of [-1, 1]) { g.beginPath(); g.arc(s * (W2 + 0.3), 0, 0.42, 0, Math.PI * 2); g.fill(); }
  };
  // o: { f: { cx, cy, rot }, toMap(u, v) -> {x, y}, team (mijn team: 0 of 1), jij: { u, v, face } | null, anderen: [{ u, v, team }], bal: { u, v } | null }
  d.zet = (o) => {
    d.key = 'padel';
    d.cx = o.f.cx; d.cy = o.f.cy; d.ax = o.f.rot - Math.PI / 2;
    d.up = o.f.rot + (o.team === 1 ? Math.PI : 0); // +v (naar de tegenstander van team 0) is de wereldhoek rot
    stip.n = 0;
    for (let i = 0; i < o.nAnderen; i++) { const a = o.anderen[i], q = o.toMap(a.u, a.v); zetStip(stip, q.x, q.y, a.team === o.team ? 'rond' : 'ruit', a.team === o.team ? INK.greenLight : INK.red, {}); }
    if (o.jij) { const q = o.toMap(o.jij.u, o.jij.v); zetStip(stip, q.x, q.y, 'pijl', INK.greenLight, { eigen: true, hoek: o.f.rot + (o.team === 1 ? Math.PI : 0) }); }
    if (o.bal) { const q = o.toMap(o.bal.u, o.bal.v); zetStip(stip, q.x, q.y, 'bal', '#ffffff', {}); }
    d.n = stip.n;
    return d;
  };
  return d;
}

// ------------------------------------------------------------------ kartbaan
// Alleen het circuit: de lus als asfalt met een inktrand, het start/finishvak en jouw kart en de rivalen. Noord boven en stil:
// een circuit leer je als vorm kennen, dus het draait niet mee met je kart.
const RIVAAL = [INK.red, INK.policeBlue, INK.horeca, INK.yellow];
export function maakKartKaart(track, toW, breedte) {
  const n = track.N;
  const stip = maakStippen(8);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const pts = [];
  for (let i = 0; i < n; i += 2) { const q = toW(track.u[i], track.v[i]); pts.push(q.x, q.y); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
  const rand = breedte / 2 + 4;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const d = { id: 'kartbaan', key: 'kartbaan', cx, cy, ax: 0, hw: (x1 - x0) / 2 + rand, hh: (y1 - y0) / 2 + rand, up: -Math.PI / 2, paint: null, dots: stip.dots, n: 0 };
  d.paint = (g) => {
    g.fillStyle = papier();
    g.fillRect(-d.hw, -d.hh, 2 * d.hw, 2 * d.hh);
    const baan = () => { g.beginPath(); for (let i = 0; i < pts.length; i += 2) { const px = pts[i] - cx, py = pts[i + 1] - cy; if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.closePath(); };
    g.lineJoin = 'round'; g.lineCap = 'round';
    baan(); g.strokeStyle = inkt(); g.lineWidth = breedte + 2.2; g.stroke();
    baan(); g.strokeStyle = MINI.road; g.lineWidth = breedte; g.stroke();
    baan(); g.strokeStyle = 'rgba(240, 237, 228, 0.55)'; g.lineWidth = 0.5; g.setLineDash([2.4, 2.4]); g.stroke(); g.setLineDash([]);
    // start/finish: een dambord over de baan, loodrecht op de looprichting
    const s0 = toW(track.u[0], track.v[0]), s1 = toW(track.u[1], track.v[1]);
    const a = Math.atan2(s1.y - s0.y, s1.x - s0.x);
    g.save(); g.translate(s0.x - cx, s0.y - cy); g.rotate(a);
    const kol = 2, rij = 6, w = breedte / rij;
    for (let r = 0; r < rij; r++) for (let k = 0; k < kol; k++) { g.fillStyle = (r + k) % 2 ? inkt() : lijn(); g.fillRect(k * 1.2 - 1.2, -breedte / 2 + r * w, 1.2, w); }
    g.restore();
  };
  // o: { karts: [{ x, y, a }] (jij eerst) }
  d.zet = (o) => {
    stip.n = 0;
    for (let i = o.karts.length - 1; i >= 1; i--) { const k = o.karts[i]; zetStip(stip, k.x, k.y, 'rond', RIVAAL[(i - 1) % RIVAAL.length], {}); }
    const k = o.karts[0];
    if (k) zetStip(stip, k.x, k.y, 'pijl', INK.greenLight, { eigen: true, hoek: k.a });
    d.n = stip.n;
    return d;
  };
  return d;
}
