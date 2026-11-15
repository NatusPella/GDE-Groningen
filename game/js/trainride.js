// De treinreis in de reisscène (#926): de kaart bracht je met de trein naar een
// station, maar de scène toonde alleen een balk en een skipknop. Hier staat de
// pure kant van het beeld: welke van de drie opnamen (perron, raam, aankomst)
// loopt, hoe ver het landschap al voorbij is en waar de trein en de perrons
// staan. reisrit.js tekent het op een canvas; dit bestand blijft vrij van DOM en
// THREE, zodat de reis in een test te volgen is (scripts/treinreis_test.mjs).
import { shotAt } from './meerijden.js';

// Het landschap schuift in de hele scène door; in het raamshot gaat het sneller
// (je zit immers in de trein in plaats van ernaar te kijken).
export const TREIN_SCROLL = 3.4;
export const RAAM_SCROLL = 6.2;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const stationNaam = (stops, i) => (stops && stops[i] && stops[i].name) || '';

// De stand van de scène op tijd t (seconden sinds de start van de reis).
//   p       0..1 door de scène
//   shot    'perron' | 'raam' | 'aankomst'
//   scroll  hoeveel schermbreedtes landschap al voorbij zijn
//   trein   0..1 horizontaal in beeld (0,5 = midden)
//   perron  staat er een perron met bord in beeld?
//   bord    de naam op dat bord (vertrek bij het perron, aankomst bij aankomst)
//   van/naar de eerste en de laatste halte van de rit
export function treinReis(plan, t) {
  const playS = Number.isFinite(plan && plan.playS) && plan.playS > 0 ? plan.playS : 1;
  const p = clamp01((Number.isFinite(t) ? t : 0) / playS);
  const shot = plan && plan.shots ? shotAt(plan, p * playS).name : 'raam';
  const stops = (plan && plan.stops) || [];
  const van = stationNaam(stops, 0);
  const naar = stationNaam(stops, stops.length - 1);
  const raam = shot === 'raam';
  const perron = shot === 'perron' || shot === 'aankomst';
  // De trein rijdt het eerste perron uit en het laatste perron in; in het
  // raamshot blijft hij in het midden van het beeld (de camera reist mee).
  let trein = 0.5;
  if (shot === 'perron') trein = -0.35 + clamp01(p / 0.2) * 0.85;
  else if (shot === 'aankomst') trein = 0.5 + clamp01((p - 0.8) / 0.2) * 0.06;
  const bord = shot === 'aankomst' ? naar : van;
  // het landschap loopt door over de shotwissels heen: geen sprong bij de knip
  const scroll = p * (raam ? RAAM_SCROLL : TREIN_SCROLL);
  return { p, shot, scroll, trein, perron, raam, bord, van, naar };
}

// Waar de zon staat (0..1 over de breedte) en hoe hoog de bomen langs de lijn
// staan: alleen voor de tekening, maar wel vast per tijd, zodat een test hem
// kan volgen en het beeld niet flikkert tussen twee beelden.
export function treinLucht(plan, t) {
  const s = treinReis(plan, t);
  return { zon: 0.18 + s.p * 0.24, wolk: (s.scroll * 0.06) % 1, schemer: s.p > 0.9 ? (s.p - 0.9) / 0.1 : 0 };
}
