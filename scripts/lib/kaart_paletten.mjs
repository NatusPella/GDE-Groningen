// De drie kandidaatpaletten van de zeefdruk-kaart (22-11, #1009): alle drie komen uit de ds-tokens (kaartkleuren.js dsKleur,
// meng) en het ene grachtwater. A is gekozen en staat als enige in game/js/kaartkleuren.js; B en C staan hier en in
// docs/KAART-PALETTEN-22-11.md als alternatief, voor het vergelijkbeeld (scripts/kaart_ds3_beeld.mjs) en de test.
import { dsKleur, meng, hexA, WATER_BLAUW } from '../../game/js/kaartkleuren.js';

const T = () => {
  const k = dsKleur;
  return { P: k('papier'), P2: k('papier-2'), W0: k('wit'), I: k('ink-inkt'), IZ: k('inkt-zacht'), B: k('ink-bord'), R: k('ink-roze'), G: k('ink-geel'), WA: WATER_BLAUW };
};

// A: crème papier en inktlijnen, één of twee vlakkleuren per categorie (zeefdruk met twee overdrukken: bordgroen en grachtwater).
function A(t) {
  const { P, P2, I, IZ, B, R, WA } = t;
  const kaart = {
    meadow: meng(P, P2, 0.35), park: meng(P, B, 0.16), forest: meng(P, B, 0.32), tree: meng(P, B, 0.45), allot: meng(P, B, 0.1), sports: meng(P, B, 0.2),
    village: meng(P2, P, 0.3), business: meng(P2, IZ, 0.16),
    water: meng(P, WA, 0.5), ditch: meng(P, WA, 0.8), waterEdge: meng(WA, I, 0.15),
    road: IZ, major: I, minor: meng(IZ, P, 0.3), cycle: meng(R, I, 0.12), foot: meng(IZ, P, 0.35), rail: I, railTie: P, turbine: I,
    building: hexA(meng(P2, IZ, 0.5), 0.92), church: hexA(meng(R, P2, 0.45), 0.95),
  };
  const mini = { ...kaart, meadow: meng(P, P2, 0.2), road: meng(IZ, I, 0.4), minor: meng(IZ, P, 0.2), foot: meng(IZ, P, 0.34),
    building: meng(P2, IZ, 0.4), buildings: [meng(P2, IZ, 0.4), meng(P2, IZ, 0.48), meng(P2, R, 0.3), meng(P2, WA, 0.25), meng(P2, B, 0.25)], church: meng(R, P2, 0.45) };
  return { kaart, mini, label: { tekst: I, halo: P } };
}

// B: zachter, met tonen: lagere lijncontrasten, meer tint in het groen en het water, gebouwen als warme vlakken.
function B(t) {
  const { P, P2, I, IZ, B: BO, R, WA } = t;
  const kaart = {
    meadow: meng(P, P2, 0.5), park: meng(P, BO, 0.2), forest: meng(P, BO, 0.38), tree: meng(P, BO, 0.5), allot: meng(P, BO, 0.14), sports: meng(P, BO, 0.26),
    village: meng(P2, P, 0.5), business: meng(P2, IZ, 0.1),
    water: meng(P, WA, 0.42), ditch: meng(P, WA, 0.7), waterEdge: meng(WA, P, 0.2),
    road: meng(IZ, P, 0.18), major: meng(I, P, 0.08), minor: meng(IZ, P, 0.38), cycle: meng(R, IZ, 0.2), foot: meng(IZ, P, 0.5), rail: meng(IZ, P, 0.05), railTie: P, turbine: IZ,
    building: hexA(meng(P2, R, 0.25), 0.9), church: hexA(meng(R, P2, 0.55), 0.95),
  };
  const mini = { ...kaart, building: meng(P2, R, 0.25), buildings: [meng(P2, R, 0.25), meng(P2, IZ, 0.3), meng(P2, R, 0.4), meng(P2, WA, 0.25), meng(P2, BO, 0.25)], church: meng(R, P2, 0.55) };
  return { kaart, mini, label: { tekst: IZ, halo: P } };
}

// C: contrastrijk voor kleurenblinden: het onderscheid zit in helderheid (water donkerder dan groen, groen donkerder dan land),
// niet in tint; alle lijnen inkt, gebouwen donkere inktvlakken.
function C(t) {
  const { P, W0, I, IZ, B: BO, R, WA } = t;
  const L = meng(P, W0, 0.45);
  const kaart = {
    meadow: L, park: meng(L, BO, 0.24), forest: meng(L, BO, 0.5), tree: meng(L, BO, 0.6), allot: meng(L, BO, 0.14), sports: meng(L, BO, 0.3),
    village: meng(L, IZ, 0.08), business: meng(L, IZ, 0.2),
    water: meng(L, WA, 0.72), ditch: WA, waterEdge: meng(WA, I, 0.35),
    road: IZ, major: I, minor: IZ, cycle: meng(R, I, 0.3), foot: meng(IZ, L, 0.3), rail: I, railTie: L, turbine: I,
    building: hexA(meng(L, IZ, 0.5), 0.95), church: hexA(meng(R, I, 0.35), 0.98),
  };
  const mini = { ...kaart, building: meng(L, IZ, 0.5), buildings: [meng(L, IZ, 0.5), meng(L, IZ, 0.58), meng(L, R, 0.45), meng(L, WA, 0.45), meng(L, BO, 0.45)], church: meng(R, I, 0.35) };
  return { kaart, mini, label: { tekst: I, halo: L } };
}

export const KANDIDATEN = { A, B, C };
export const kandidaat = (id) => KANDIDATEN[id](T());
