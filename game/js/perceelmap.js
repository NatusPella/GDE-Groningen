// De kaartlaag 'Percelen' (#415): akkers en weilanden te koop, te huur en van jou, elk met een doel (waypoint) bij het aanklikken.
// Te koop is geel, te huur blauw, van jou groen; een blokje met akkerstrepen. De Zonnehoek ligt waar je eigen perceel gevonden is.
import { getBoerderij } from './boerderijlive.js';
import { perceelLijst, START_PERCEEL, stand, kaartSoort, kaartOnderschrift, perceelDef } from './percelen.js';
import { wgsToWorld } from './rdnew.js';
import { INK, inkA } from './mapstyle.js';
import { veldStatus, KAART_STIJL, GROEI_STANDEN, watNu, machinePlekken, afnemerPlekken } from './farmstatus.js';
import { iconInner } from './icons.js';
import { getBezit } from './bezitlive.js';
import { layerOn } from './mapfilters.js';

const pos = new Map();
const wereld = (p) => { let q = pos.get(p.id); if (!q) { q = wgsToWorld(p.lat, p.lon); pos.set(p.id, q); } return q; };

// #1005: het kaartfilter 'Alleen oogstklaar' (laag oogstklaarAlleen, standaard uit): van de velden en percelen blijft wat nu te oogsten valt, plus je machines en de afnemers (daar ga je heen).
// Aangeboden akkers (te koop, te huur) en velden die nog groeien of een klus wachten verdwijnen, zodat je in één blik ziet waar je moet oogsten. Zuiver; `aan` komt van de laag.
export function alleenOogstklaar(lijst, aan) {
  if (!aan) return lijst;
  return lijst.filter((q) => (q.kind ? q.kind === 'perceel-eigen-rijp' || q.kind === MACHINE_KIND || q.kind === AFNEMER_KIND : q.statusId === 'rijp'));   // spots hebben een kind, de kaartvlakken een statusId
}

export function perceelMapSpots() {
  const b = getBoerderij();
  const out = [];
  for (const p of perceelLijst(b.bedrijf)) {
    const s = stand(b.bedrijf, 'perceel', p.id);
    const [x, y] = p.id === START_PERCEEL && b.perceel ? [b.perceel.x, b.perceel.y] : wereld(p);
    // #985: een veld van jou toont zijn stand (letter, vorm en kleur) en wat nu te doen valt; aangeboden akkers blijven geel of blauw
    const eigen = s.van === 'jou' ? veldStatus(b, p.id) : null;
    out.push({ kind: eigen ? `perceel-eigen-${eigen.statusId}` : kaartSoort(s), x, y, name: p.naam, sub: eigen ? `${eigen.klaar ? 'Oogstklaar' : eigen.status} · nu: ${watNu(eigen, b.schuur.kg || 0).toLowerCase()}` : kaartOnderschrift(s), id: p.id, goal: { kind: 'place', name: p.naam, sub: 'Perceel', x, y } });
  }
  out.push(...bezitKaartSpots(b));   // epic Bezit: de percelen die je in de provincie kocht (op de kaart en de minikaart)
  // #985: je machines in de wereld (trekker, maaidorser, laadmachine) met hun dieselstand
  for (const m of machinePlekken()) out.push({ kind: 'perceel-machine', x: m.x, y: m.y, name: m.naam, sub: `Van jou · diesel ${Math.round(m.diesel * 100)}%${m.diesel <= 0.15 ? ' (bijna leeg)' : ''}`, id: m.uid, goal: { kind: 'place', name: m.naam, sub: 'Machine', x: m.x, y: m.y } });
  // #1005: de afnemers van je oogst, zodra je een veld of machine hebt: dan weet je waar je heen moet nog voor je de aanhanger laadt
  if (out.some((q) => q.kind.startsWith('perceel-eigen') || q.kind === 'perceel-machine')) {
    for (const a of afnemerPlekken()) out.push({ kind: 'perceel-afnemer', x: a.x, y: a.y, name: a.naam, sub: 'Afnemer van je oogst · klik voor een doel', id: 'afnemer-' + a.gewas, goal: { kind: 'place', name: a.naam, sub: 'Afnemer', x: a.x, y: a.y } });
  }
  return alleenOogstklaar(out, layerOn('oogstklaarAlleen'));
}

const KLEUR = { 'perceel-koop': INK.yellow, 'perceel-huur': INK.laagTekoop, 'perceel-eigen': INK.laagEigen };
const STATUS_KIND = /^perceel-eigen-([a-z]+)$/;
const MACHINE_KIND = 'perceel-machine';
const AFNEMER_KIND = 'perceel-afnemer';

// De vulling van een veld op de kaart: een leeg veld rustig, een groeiend gewas steeds voller, oogstklaar het volst (het doel).
export function vulAlpha(st) {
  if (!GROEI_STANDEN.includes(st.statusId)) return 0.14;
  return st.statusId === 'rijp' ? 0.36 : 0.16 + 0.16 * Math.max(0, Math.min(1, st.groei || 0));
}

const ikonPaden = new Map();
// Een Phosphor-icoon (icons.js, bold) gecentreerd op (x, y) met zijde `maat` in canvaspixels; zonder Path2D (node, tests) gebeurt er niets.
function tekenPhosphor(ctx, naam, x, y, maat, kleur) {
  if (typeof Path2D === 'undefined' || !naam) return;
  let lijst = ikonPaden.get(naam);
  if (!lijst) { lijst = [...iconInner(naam, true).matchAll(/ d="([^"]+)"/g)].map((m) => new Path2D(m[1])); ikonPaden.set(naam, lijst); }
  const k = maat / 256;
  ctx.save();
  ctx.translate(x - 128 * k, y - 128 * k); ctx.scale(k, k);
  ctx.fillStyle = kleur;
  for (const q of lijst) ctx.fill(q);
  ctx.restore();
}
// Het statusicoon (Phosphor, icons.js) in een schijf met, bij een gewas dat groeit, een voortgangsring: ring vol = oogstklaar. Alleen canvas;
// zonder Path2D (node, tests) blijft het bij de schijf en de ring. r is de straal in schermpixels, groei 0..1 of null.
export function tekenVeldBadge(ctx, x, y, r, v) {
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = INK.dark; ctx.globalAlpha = 0.82; ctx.fill(); ctx.globalAlpha = 1;
  const stijl = v.stijl || {};
  if (v.groei != null) {
    ctx.lineWidth = Math.max(2, r * 0.28); ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.strokeStyle = INK.cream; ctx.globalAlpha = 0.3; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.03, Math.min(1, v.groei))); ctx.strokeStyle = INK[stijl.vul] || INK.greenLight; ctx.stroke();
  } else {
    ctx.lineWidth = Math.max(1.5, r * 0.16); ctx.setLineDash(stijl.dash || []); ctx.strokeStyle = INK[stijl.rand] || INK.cream;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }
  tekenPhosphor(ctx, v.icoon, x, y, r * 1.15, INK.cream);
  ctx.restore();
}

// #972, #1092: de percelen die van jou zijn, met stand en label op de grote kaart; er is geen getekend vlak of omtrek (die hebben de catalogusvelden niet uit kaartdata).
// Alleen eigen grond: aangeboden akkers blijven een pictogram, anders wordt de kaart vol.
export function eigenPerceelVlakken() {
  const b = getBoerderij();
  const out = [];
  for (const p of perceelLijst(b.bedrijf)) {
    const s = stand(b.bedrijf, 'perceel', p.id);
    if (s.van !== 'jou') continue;
    const [x, y] = p.id === START_PERCEEL && b.perceel ? [b.perceel.x, b.perceel.y] : wereld(p);
    const st = veldStatus(b, p.id);
    out.push({
      id: p.id, naam: p.naam, soort: p.soort, ha: p.ha, bodem: p.bodem, x, y,
      stijl: KAART_STIJL[st.statusId], statusNaam: st.klaar ? 'Oogstklaar' : st.status, statusId: st.statusId,
      // de vulling groeit met het gewas mee (zoals bij een gebied dat je aan het veroveren bent); ring en icoon staan in tekenVeldBadge
      icoon: st.icoon, groei: GROEI_STANDEN.includes(st.statusId) ? st.groei : null, alpha: vulAlpha(st),
      sub: `${p.soort === 'weiland' ? 'Weiland' : 'Akker'} · ${p.ha} ha · ${st.klaar ? 'oogstklaar' : st.kort} · nu: ${watNu(st, b.schuur.kg || 0).toLowerCase()}`,
    });
  }
  return alleenOogstklaar(out, layerOn('oogstklaarAlleen'));
}

// Tekent het pictogram (hud_panel.js geeft de schaal s); geeft false voor een andere soort.
export function drawPerceelMapIcon(ctx, kind, s) {
  if (kind === MACHINE_KIND) {   // een ronde schijf met een T van trekker, zodat het geen veld lijkt
    ctx.beginPath(); ctx.arc(0, 0, 4.4 * s, 0, Math.PI * 2); ctx.fillStyle = INK.cream; ctx.fill();
    ctx.lineWidth = 1.2 * s; ctx.strokeStyle = INK.dark; ctx.stroke();
    ctx.font = `700 ${6 * s}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK.dark; ctx.fillText('T', 0, 0.4 * s);
    return true;
  }
  if (kind === AFNEMER_KIND) {   // een vierkante schijf met een A: het afleverpunt, een andere vorm dan veld (rond) en machine (T)
    ctx.beginPath(); ctx.rect(-4.6 * s, -4.6 * s, 9.2 * s, 9.2 * s); ctx.fillStyle = INK.policeBlue; ctx.fill();
    ctx.lineWidth = 1.2 * s; ctx.strokeStyle = INK.cream; ctx.stroke();
    ctx.font = `700 ${6 * s}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK.cream; ctx.fillText('A', 0, 0.4 * s);
    return true;
  }
  const m = STATUS_KIND.exec(kind);
  const stijl = m ? KAART_STIJL[m[1]] : null;
  if (stijl) {   // je veld: een schijf met een schuur (Phosphor) in de kleur van de stand, de rand in het lijnpatroon van de stand en de letter van de stand (20-11)
    const r = 5 * s;
    ctx.save(); ctx.shadowColor = inkA('dark', 0.6); ctx.shadowBlur = 3 * s; ctx.shadowOffsetY = 0.8 * s;   // witte rand en schaduw: de pin valt op tussen andere pictogrammen
    ctx.beginPath(); ctx.arc(0, 0, r + 1.3 * s, 0, Math.PI * 2); ctx.fillStyle = INK.white; ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = INK[stijl.vul] || INK.greenLight; ctx.fill();
    ctx.lineWidth = 1.5 * s; ctx.strokeStyle = INK.dark; ctx.setLineDash((stijl.dash || []).map((d) => d * s * 0.45)); ctx.stroke(); ctx.setLineDash([]);
    tekenPhosphor(ctx, 'boerderij', 0, -0.4 * s, 6.6 * s, stijl.vul === 'green' ? INK.cream : INK.dark);
    ctx.beginPath(); ctx.arc(3.7 * s, 3.7 * s, 2.5 * s, 0, Math.PI * 2); ctx.fillStyle = INK.dark; ctx.fill();
    ctx.font = `700 ${3.8 * s}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK.cream; ctx.fillText(stijl.letter, 3.7 * s, 3.9 * s);
    return true;
  }
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

// Epic Bezit (#1100): je gekochte percelen als pin met hun stand (zoals de vaste velden); hoogstens 300 en hooguit twee keer per seconde opnieuw berekend, ook bij duizend percelen.
let spotsMemo = { t: 0, lijst: [] };
function bezitKaartSpots(b) {
  const nu = typeof performance !== 'undefined' ? performance.now() : 0;
  if (spotsMemo.lijst.length && nu - spotsMemo.t < 500) return spotsMemo.lijst;
  const lijst = [];
  const bz = getBezit();
  for (const id of Object.keys(bz.parcels)) {
    const r = bz.parcels[id];
    if (r.lg || !r.c || lijst.length >= 300) continue;
    const d = perceelDef(id);
    if (!d) continue;
    const st = veldStatus(b, id);
    lijst.push({ kind: `perceel-eigen-${st.statusId}`, x: r.c[0], y: r.c[1], name: d.naam, sub: `${st.klaar ? 'Oogstklaar' : st.status} · van jou`, id, goal: { kind: 'place', name: d.naam, sub: 'Van jou', x: r.c[0], y: r.c[1] } });
  }
  spotsMemo = { t: nu, lijst };
  return lijst;
}
