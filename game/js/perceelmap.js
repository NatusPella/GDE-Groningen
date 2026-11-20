// De kaartlaag 'Percelen' (#415): akkers en weilanden te koop, te huur en van jou, elk met een doel (waypoint) bij het aanklikken.
// Te koop is geel, te huur blauw, van jou groen; een blokje met akkerstrepen. De Zonnehoek ligt waar je eigen perceel gevonden is.
import { getBoerderij } from './boerderijlive.js';
import { PERCELEN, START_PERCEEL, stand, kaartSoort, kaartOnderschrift, perceelVlak } from './percelen.js';
import { wgsToWorld } from './rdnew.js';
import { INK } from './mapstyle.js';
import { veldStatus, KAART_STIJL, watNu, machinePlekken } from './farmstatus.js';

const pos = new Map();
const wereld = (p) => { let q = pos.get(p.id); if (!q) { q = wgsToWorld(p.lat, p.lon); pos.set(p.id, q); } return q; };

export function perceelMapSpots() {
  const b = getBoerderij();
  const out = [];
  for (const p of PERCELEN) {
    const s = stand(b.bedrijf, 'perceel', p.id);
    const [x, y] = p.id === START_PERCEEL && b.perceel ? [b.perceel.x, b.perceel.y] : wereld(p);
    // #985: een veld van jou toont zijn stand (letter, vorm en kleur) en wat nu te doen valt; aangeboden akkers blijven geel of blauw
    const eigen = s.van === 'jou' ? veldStatus(b, p.id) : null;
    out.push({ kind: eigen ? `perceel-eigen-${eigen.statusId}` : kaartSoort(s), x, y, name: p.naam, sub: eigen ? `${eigen.klaar ? 'Oogstklaar' : eigen.status} · nu: ${watNu(eigen, b.schuur.kg || 0).toLowerCase()}` : kaartOnderschrift(s), id: p.id, goal: { kind: 'place', name: p.naam, sub: 'Perceel', x, y } });
  }
  // #985: je machines in de wereld (trekker, maaidorser, laadmachine) met hun dieselstand
  for (const m of machinePlekken()) out.push({ kind: 'perceel-machine', x: m.x, y: m.y, name: m.naam, sub: `Van jou · diesel ${Math.round(m.diesel * 100)}%${m.diesel <= 0.15 ? ' (bijna leeg)' : ''}`, id: m.uid, goal: { kind: 'place', name: m.naam, sub: 'Machine', x: m.x, y: m.y } });
  return out;
}

const KLEUR = { 'perceel-koop': INK.yellow, 'perceel-huur': INK.policeBlue, 'perceel-eigen': INK.greenLight };
const STATUS_KIND = /^perceel-eigen-([a-z]+)$/;
const MACHINE_KIND = 'perceel-machine';

// #972: de percelen die van jou zijn, als vlak met een duidelijke omtrek op de grote kaart.
// Alleen eigen grond: aangeboden akkers blijven een pictogram, anders wordt de kaart vol.
export function eigenPerceelVlakken() {
  const b = getBoerderij();
  const out = [];
  for (const p of PERCELEN) {
    const s = stand(b.bedrijf, 'perceel', p.id);
    if (s.van !== 'jou') continue;
    const [x, y] = p.id === START_PERCEEL && b.perceel ? [b.perceel.x, b.perceel.y] : wereld(p);
    const st = veldStatus(b, p.id);
    const punten = perceelVlak(p, { x, y }, p.id === START_PERCEEL && b.perceel && Number.isFinite(b.perceel.a) ? b.perceel.a : null);
    if (punten.length < 4) continue;
    out.push({
      id: p.id, naam: p.naam, soort: p.soort, ha: p.ha, bodem: p.bodem, punten, x, y,
      stijl: KAART_STIJL[st.statusId], statusNaam: st.klaar ? 'Oogstklaar' : st.status, statusId: st.statusId,
      sub: `${p.soort === 'weiland' ? 'Weiland' : 'Akker'} · ${p.ha} ha · ${st.klaar ? 'oogstklaar' : st.kort} · nu: ${watNu(st, b.schuur.kg || 0).toLowerCase()}`,
    });
  }
  return out;
}

// Tekent het pictogram (hud_panel.js geeft de schaal s); geeft false voor een andere soort.
export function drawPerceelMapIcon(ctx, kind, s) {
  if (kind === MACHINE_KIND) {   // een ronde schijf met een T van trekker, zodat het geen veld lijkt
    ctx.beginPath(); ctx.arc(0, 0, 4.4 * s, 0, Math.PI * 2); ctx.fillStyle = INK.cream; ctx.fill();
    ctx.lineWidth = 1.2 * s; ctx.strokeStyle = INK.dark; ctx.stroke();
    ctx.font = `700 ${6 * s}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK.dark; ctx.fillText('T', 0, 0.4 * s);
    return true;
  }
  const m = STATUS_KIND.exec(kind);
  const stijl = m ? KAART_STIJL[m[1]] : null;
  const kleur = stijl ? INK[stijl.vul] : KLEUR[m ? 'perceel-eigen' : kind];
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
  if (stijl) {   // de letter van de stand, zodat kleur nooit de enige betekenis is
    ctx.font = `700 ${6 * s}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = INK.dark; ctx.fillText(stijl.letter, 0, 0.4 * s);
  }
  return true;
}
