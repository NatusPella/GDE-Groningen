// De vier toestanden van een gebied op de kaart en de minikaart (20-11), puur en zonder DOM:
//   onzichtbaar  nooit bezocht: een vlak met een fijn raster, geen naam, geen details
//   zichtbaar    bezocht, nog niets gedaan: omlijnd met een stippelrand en een gedempte vulling
//   bezig        al iets gedaan: effen gele rand, een vulling die met de voortgang meegroeit en een voortgangsring
//   veroverd     alles gedaan: volle vulling in de kleur van het gebied, een dikke rand en een vlag
// Nooit alleen met kleur: elke toestand heeft ook een eigen lijnsoort en een eigen icoon (Phosphor, icons.js).
// De veroverde voortgang is per speler (#429, het eigen profiel van gebieden.js) en de kaart is lokaal: de toestand komt
// uit het profiel van deze speler en gaat nooit over het netwerk. Het tekenen staat in gebiedenkaart.js.
import { gebiedKleuren } from './kaartkleuren.js';

export const TOESTANDEN = ['onzichtbaar', 'zichtbaar', 'bezig', 'veroverd'];

// Per toestand de woorden van de legenda, het icoon (betekenisnaam uit iconmap.js) en de lijnsoort in woorden voor de vertelling.
export const TOESTAND_INFO = {
  onzichtbaar: { naam: 'Nog onzichtbaar', uitleg: 'nog nooit bezocht', icoon: 'oog_uit', lijn: 'raster' },
  zichtbaar: { naam: 'Zichtbaar', uitleg: 'bezocht, nog niet veroverd', icoon: 'oog', lijn: 'stippellijn' },
  bezig: { naam: 'Aan het veroveren', uitleg: 'je bent bezig', icoon: 'ronde', lijn: 'doorgetrokken geel met ring' },
  veroverd: { naam: 'Veroverd', uitleg: 'alles gedaan', icoon: 'vlag', lijn: 'dikke rand met vlag' },
};

// Alle gebieden waar de speler geweest is, mét hun ouders (een bezochte buurt maakt zijn wijk, woonplaats, gemeente en
// provincie zichtbaar). `ind` is de indeling van gebieden.js, `bezocht` de lijst buurt-id's uit het profiel.
export function zichtbareGebieden(ind, bezocht) {
  const uit = new Set();
  if (!ind || !ind.gebied || !Array.isArray(bezocht)) return uit;
  for (const id of bezocht) {
    for (let g = ind.gebied.get(id), n = 0; g && !uit.has(g.id) && n < 8; g = g.ouder ? ind.gebied.get(g.ouder) : null, n++) uit.add(g.id);
  }
  return uit;
}

// De toestand van één gebied. r: { gebied: { id }, klaar, voltooid }; zichtbaar: de set van zichtbareGebieden().
// Wat je gedaan hebt telt altijd (ook zonder dat de bezoeklijst het weet): veroverd en bezig gaan voor zichtbaar.
export function toestandVan(r, zichtbaar) {
  if (!r || !r.gebied) return 'onzichtbaar';
  if (r.voltooid) return 'veroverd';
  if (r.klaar > 0) return 'bezig';
  return zichtbaar && zichtbaar.has(r.gebied.id) ? 'zichtbaar' : 'onzichtbaar';
}

// Hoeveel gebieden er in elke toestand zijn (voor de legenda en de test).
export function telToestanden(lijst) {
  const t = { onzichtbaar: 0, zichtbaar: 0, bezig: 0, veroverd: 0 };
  for (const r of lijst || []) if (r && t[r.toestand] !== undefined) t[r.toestand]++;
  return t;
}

// Het uiterlijk per toestand: vul + alpha, lijn (kleur, alpha, breedte in veelvouden van de lijndikte), streep (stippellijn),
// raster (fijn puntraster in de vulling), ring (voortgangsring met het deel) en icoon. `vlag` is de kleur van het niveau.
export function toestandStijl(r, kleurTekst) {
  const k = gebiedKleuren();
  switch (r.toestand) {
    case 'veroverd':
      return { toestand: 'veroverd', vul: r.vlag, alpha: 0.5, lijn: r.vlag, lijnAlpha: 1, breed: 2.4, streep: false, raster: false, ring: null, icoon: 'vlag', rand: k.veroverd.rand };
    case 'bezig':
      return { toestand: 'bezig', vul: k.bezig.vul, alpha: 0.12 + 0.2 * Math.min(1, r.deel || 0), lijn: k.bezig.lijn, lijnAlpha: 1, breed: 1.6, streep: false, raster: false, ring: Math.min(1, r.deel || 0), icoon: 'ronde', rand: k.veroverd.rand };
    case 'zichtbaar':
      return { toestand: 'zichtbaar', vul: k.zichtbaar.vul, alpha: 0.07, lijn: kleurTekst || k.zichtbaar.lijn, lijnAlpha: 0.8, breed: 1, streep: true, raster: false, ring: null, icoon: null, rand: k.veroverd.rand };
    default:
      return { toestand: 'onzichtbaar', vul: k.onzichtbaar.vul, alpha: 0.4, lijn: k.onzichtbaar.lijn, lijnAlpha: 0.22, breed: 0.7, streep: false, raster: true, ring: null, icoon: 'oog_uit', rand: k.veroverd.rand };
  }
}

// De legenda: vier rijen, in vaste volgorde, met woorden voor wie de patronen niet ziet.
export function legendaRijen() {
  return TOESTANDEN.map((id) => ({ id, ...TOESTAND_INFO[id] }));
}

// Het zichtbare gebied is er één als de speler iets gezien heeft: de naam van een onzichtbaar gebied wacht (geen details).
export const toonNaam = (toestand) => toestand !== 'onzichtbaar';
