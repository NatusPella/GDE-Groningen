// De kaartlaag 'Percelen' (#415): akkers en weilanden te koop, te huur en van jou, elk met een doel (waypoint) bij het aanklikken.
// Te koop is geel, te huur blauw, van jou groen; een blokje met akkerstrepen. De Zonnehoek ligt waar je eigen perceel gevonden is.
import { getBoerderij } from './boerderijlive.js';
import { PERCELEN, START_PERCEEL, stand, kaartSoort, kaartOnderschrift, perceelVlak } from './percelen.js';
import { wgsToWorld } from './rdnew.js';
import { INK } from './mapstyle.js';

const pos = new Map();
const wereld = (p) => { let q = pos.get(p.id); if (!q) { q = wgsToWorld(p.lat, p.lon); pos.set(p.id, q); } return q; };

export function perceelMapSpots() {
  const b = getBoerderij();
  const out = [];
  for (const p of PERCELEN) {
    const s = stand(b.bedrijf, 'perceel', p.id);
    const [x, y] = p.id === START_PERCEEL && b.perceel ? [b.perceel.x, b.perceel.y] : wereld(p);
    out.push({ kind: kaartSoort(s), x, y, name: p.naam, sub: kaartOnderschrift(s), id: p.id, goal: { kind: 'place', name: p.naam, sub: 'Perceel', x, y } });
  }
  return out;
}

const KLEUR = { 'perceel-koop': INK.yellow, 'perceel-huur': INK.policeBlue, 'perceel-eigen': INK.greenLight };

// #972: de percelen die van jou zijn, als vlak met een duidelijke omtrek op de grote kaart.
// Alleen eigen grond: aangeboden akkers blijven een pictogram, anders wordt de kaart vol.
export function eigenPerceelVlakken() {
  const b = getBoerderij();
  const out = [];
  for (const p of PERCELEN) {
    const s = stand(b.bedrijf, 'perceel', p.id);
    if (s.van !== 'jou') continue;
    const [x, y] = p.id === START_PERCEEL && b.perceel ? [b.perceel.x, b.perceel.y] : wereld(p);
    const punten = perceelVlak(p, { x, y }, p.id === START_PERCEEL && b.perceel && Number.isFinite(b.perceel.a) ? b.perceel.a : null);
    if (punten.length < 4) continue;
    out.push({
      id: p.id, naam: p.naam, soort: p.soort, ha: p.ha, bodem: p.bodem, punten, x, y,
      sub: `${p.soort === 'weiland' ? 'Weiland' : 'Akker'} · ${p.ha} ha · jouw perceel`,
    });
  }
  return out;
}

// Tekent het pictogram (hud_panel.js geeft de schaal s); geeft false voor een andere soort.
export function drawPerceelMapIcon(ctx, kind, s) {
  const kleur = KLEUR[kind];
  if (!kleur) return false;
  ctx.beginPath();
  ctx.rect(-4.6 * s, -3.6 * s, 9.2 * s, 7.2 * s);
  ctx.fillStyle = kleur;
  ctx.fill();
  ctx.lineWidth = 1.2 * s;
  ctx.strokeStyle = INK.dark;
  ctx.stroke();
  ctx.beginPath();
  for (const dx of [-2.3, 0, 2.3]) { ctx.moveTo(dx * s, -3 * s); ctx.lineTo(dx * s, 3 * s); }
  ctx.lineWidth = 0.9 * s;
  ctx.stroke();
  return true;
}
