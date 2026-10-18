// Lijnweergave voor de kaart bij het kiezen van een bestemming (#97). Puur: uit de
// reisopties (ovopties.js) komen tekenprimitieven in wereldcoördinaten. mapview.js
// zet ze om naar het scherm en tekent ze; hier zit geen canvas en geen DOM.
import { KLEUR } from './ovopties.js';

export const WIDTH = { lijn: 6, lopen: 3, gekozen: 1.4 };

function legStyle(leg) {
  if (leg.kind === 'walk') return { color: KLEUR.lopen, width: WIDTH.lopen, dash: [4, 6] };
  if (leg.kind === 'train') return { color: leg.color || KLEUR.trein, width: WIDTH.lijn, dash: null };
  if (leg.kind === 'bus') return { color: leg.color || KLEUR.auto, width: WIDTH.lijn, dash: null };
  if (leg.kind === 'boat') return { color: KLEUR.boot, width: WIDTH.lijn, dash: [10, 5] };
  return { color: KLEUR.auto, width: WIDTH.lijn, dash: null };
}

const kleurVan = (o) => (o.lines[0] && o.lines[0].color) || KLEUR[o.id] || KLEUR.auto;

// Lagen voor de kaart. opts: reisOpties()-uitvoer, gekozen: id van de optie die
// nu is uitgelicht (de rest wordt gedimd, zodat je ze toch naast elkaar ziet).
// Zelf rijden heeft op de kaart al zijn eigen route, die tekent mapview zelf.
export function lijnLagen(opts, gekozen) {
  const paths = [], stops = [], legenda = [];
  for (const o of opts) {
    if (!o.ride) continue;
    const sel = o.id === gekozen;
    const legs = o.legs && o.legs.length ? o.legs : [{ kind: o.id === 'boot' ? 'boat' : o.id, pts: o.pts }];
    for (const leg of legs) {
      if (!leg.pts || leg.pts.length < 2) continue;
      const st = legStyle(leg);
      paths.push({ option: o.id, kind: leg.kind, pts: leg.pts, color: st.color, width: st.width * (sel ? WIDTH.gekozen : 1), dash: st.dash, alpha: sel ? 1 : 0.35, selected: sel });
    }
    for (const s of o.stops) {
      if (!Number.isFinite(s.x) || !Number.isFinite(s.y)) continue;
      stops.push({ option: o.id, x: s.x, y: s.y, name: s.name, kind: s.kind, color: kleurVan(o), big: s.kind === 'overstap', alpha: sel ? 1 : 0.35 });
    }
    legenda.push({ option: o.id, selected: sel, color: kleurVan(o), tekst: o.lines.length ? [...new Set(o.lines.map((l) => l.name))].join(' + ') : o.label });
  }
  // gekozen optie bovenop
  paths.sort((a, b) => a.selected - b.selected);
  stops.sort((a, b) => (a.alpha - b.alpha) || (a.big - b.big));
  return { paths, stops, legenda, bounds: boundsOf(paths) };
}

function boundsOf(paths) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of paths) for (const q of p.pts) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
  return x0 === Infinity ? null : { x0, y0, x1, y1 };
}

// Rijen voor de optielijst bij de bestemming: tekst, toets, kleur, wat de klik doet
export function kaartRijen(opts, optieRegel, gekozen) {
  return opts.map((o, i) => ({
    id: o.id, key: String(i + 1), tekst: optieRegel(o), selected: o.id === gekozen,
    aanbevolen: !!o.aanbevolen, disabled: !o.afford ? 'Te weinig geld' : null,
    color: kleurVan(o),
    actie: o.ride ? 'meerijden' : 'zelf',
  }));
}
