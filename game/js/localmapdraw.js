// Het tekenen van de lokale kaart op de minimap-canvas (24-11, localmap.js): de vaste laag één keer op een eigen canvas, per beeld alleen
// die laag neerleggen en de stippen erbovenop, zonder allocaties. De regels (schaal, draaiing, bijsnijden) staan puur in localmap.js.
import { rotatieOmhoog, passendeSchaal, naarKaart, klemOpKaart, vasteMaat, vasteVerouderd } from './localmap.js';
import { naarHoek } from './minimapstyle.js';
import { dsKleur } from './kaartkleuren.js';
import { INK } from './mapstyle.js';

let rot = null, id = '';
let laag = null; // { canvas, g, key, res }
const _p = [0, 0];
const R = 4.2; // straal van een speler in HUD-px op een kaart van 250

function vorm(ctx, v, x, y, r) {
  ctx.beginPath();
  if (v === 'ruit') { r *= 1.3; ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); } else ctx.arc(x, y, r, 0, Math.PI * 2);
}
// Een stip met de drukinkt eromheen: inkt, crème, dan de kleur (leest op elk vlak, ook bij een donkere clubkleur).
function stip(ctx, s, x, y) {
  const r = R * s.groot, inkt = dsKleur('ink-inkt');
  vorm(ctx, s.vorm, x, y, r + 1.7); ctx.fillStyle = inkt; ctx.fill();
  vorm(ctx, s.vorm, x, y, r + 0.8); ctx.fillStyle = INK.cream; ctx.fill();
  vorm(ctx, s.vorm, x, y, r); ctx.fillStyle = s.kleur; ctx.fill();
  if (s.keeper) { ctx.beginPath(); ctx.arc(x, y, r * 0.38, 0, Math.PI * 2); ctx.fillStyle = inkt; ctx.fill(); } // de keeper: een inktpunt in het midden
}
function bal(ctx, x, y) {
  ctx.beginPath(); ctx.arc(x, y, 3.6, 0, Math.PI * 2); ctx.fillStyle = dsKleur('ink-inkt'); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
}

// Stopt de lokale kaart (de wereldkaart komt terug): de volgende keer begint de draaiing opnieuw bij de juiste stand.
export function resetLocalMapDraw() { rot = null; id = ''; }

// ctx: de minimap-canvas, al gewist; dpr: apparaatpixels per HUD-px; maat: de kaart in HUD-px (250); eigen(ctx, x, y, schermhoek): jouw pijl.
export function drawLocalMap(ctx, d, { dt, dpr, maat, beperkt, eigen }) {
  if (id !== d.id) { id = d.id; rot = null; }
  const doel = rotatieOmhoog(d.up);
  rot = naarHoek(rot, doel, dt, beperkt).waarde;
  const schaal = passendeSchaal(d, rot, maat, 10);
  const m = vasteMaat(d, schaal, dpr);
  if (vasteVerouderd(laag, d, m)) {
    const l = laag || (laag = { canvas: document.createElement('canvas'), g: null, key: '', res: 1 });
    l.canvas.width = m.w; l.canvas.height = m.h;
    const g = l.g || (l.g = l.canvas.getContext('2d'));
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, m.w, m.h);
    g.setTransform(m.res, 0, 0, m.res, d.hw * m.res, d.hh * m.res);
    d.paint(g, m.res);
    l.key = d.key; l.res = m.res;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = INK.paper; ctx.fillRect(0, 0, maat, maat);
  ctx.save();
  ctx.translate(maat / 2, maat / 2); ctx.rotate(rot + d.ax); ctx.scale(schaal, schaal);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(laag.canvas, -d.hw, -d.hh, 2 * d.hw, 2 * d.hh);
  ctx.restore();
  const dots = d.dots, n = d.n;
  for (let i = 0; i < n; i++) { const s = dots[i]; if (s.vorm === 'pijl' || s.vorm === 'bal') continue; naarKaart(d, rot, schaal, maat, s.x, s.y, _p); klemOpKaart(_p, maat, 6); stip(ctx, s, _p[0], _p[1]); }
  for (let i = 0; i < n; i++) { const s = dots[i]; if (s.vorm !== 'bal') continue; naarKaart(d, rot, schaal, maat, s.x, s.y, _p); klemOpKaart(_p, maat, 5); bal(ctx, _p[0], _p[1]); }
  for (let i = 0; i < n; i++) { const s = dots[i]; if (s.vorm !== 'pijl') continue; naarKaart(d, rot, schaal, maat, s.x, s.y, _p); klemOpKaart(_p, maat, 12); eigen(ctx, _p[0], _p[1], s.hoek + rot); }
  return { rot, schaal };
}
