// De conducteursronde in de trein (#492): een gast met de rol conducteur loopt door de wagen en controleert bij een
// zittende reiziger een kaartje. Puur: geen THREE, geen DOM, geen klok en geen opslag, zodat
// scripts/treincontrole_test.mjs de regels kan doorlopen. cooptrein.js koppelt de teller aan het lichaam, de
// meldingen en loopbaanVerdien; de uitkomst hangt alleen aan het zaadje, de wagen en de plek van de reiziger, zodat
// dezelfde reiziger altijd hetzelfde antwoord geeft (zoals kaartjescontrole.js op het perron).
export const CONTROLE_DOEL = 5;    // reizigers per ronde
export const CONTROLE_LOON = 45;   // euro voor een volle ronde
export const CONTROLE_XP = 25;     // punten voor een volle ronde
export const CONTROLE_RUST_S = 300; // na een ronde even geen nieuwe ronde: geen geldmolen (#492)

export const ANTWOORDEN = {
  ok: 'Kaartje in orde, prettige reis.',
  zoeken: 'Even zoeken... zat in zijn jaszak. In orde!',
  automaat: 'Geen kaartje, maar hij koopt er bij de automaat meteen een. Netjes.',
};

// Een klein, vast zaadje per ronde; dezelfde seed geeft dezelfde reeks antwoorden.
function zaad(seed) {
  const s = Number(seed);
  return (Number.isFinite(s) && s > 0 ? Math.floor(s) : 1) >>> 0;
}

// ok, zoeken of automaat: 60% in orde, 30% even zoeken, 10% de automaat.
export function uitkomst(seed, car, i) {
  let h = Math.imul(zaad(seed) ^ 0x9e3779b9, 2654435761) >>> 0;
  h = (h ^ Math.imul((Number(car) | 0) + 1, 40503)) >>> 0;
  h = (h ^ Math.imul((Number(i) | 0) + 1, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489917) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  const k = h % 10;
  return k < 6 ? 'ok' : k < 9 ? 'zoeken' : 'automaat';
}

// De stand van één ronde. `gedaan` onthoudt wie al langs kwam ("wagen:plek"), zodat twee keer E bij dezelfde
// reiziger de teller niet omhoog doet.
export const beginControle = (seed = 1) => ({
  seed: zaad(seed), gedaan: new Set(), n: 0, doel: CONTROLE_DOEL,
  rondes: 0, klaar: false, beloond: false, laatste: null, rustTot: 0,
});

export const klaar = (st) => !!(st && st.klaar);

// Het loon van een volle ronde, eenmalig: de eerste vraag na de vijfde reiziger geeft het, daarna null.
export function beloning(st) {
  if (!st || !st.klaar || st.beloond) return null;
  st.beloond = true;
  return { euro: CONTROLE_LOON, xp: CONTROLE_XP };
}

// E bij reiziger i van wagen car. Geeft { ok, uitkomst, tekst, n, doel, klaar, beloning } terug; bij een herhaling
// of een ongeldige plek doet hij niets. Na de vijfde reiziger begint de volgende ronde meteen.
export function controleer(st, car, i, nu = 0) {
  if (!st || !Number.isInteger(car) || !Number.isInteger(i) || car < 0 || i < 0) return { ok: false, klaar: false, beloning: null };
  if (nu < (st.rustTot || 0)) return { ok: false, rust: true, klaar: false, beloning: null, n: st.n, doel: st.doel };
  const key = car + ':' + i;
  if (st.gedaan.has(key)) return { ok: false, herhaald: true, klaar: false, beloning: null, n: st.n, doel: st.doel };
  st.gedaan.add(key);
  st.n++;
  const uit = uitkomst(st.seed, car, i);
  st.laatste = { car, i, uitkomst: uit };
  st.klaar = false;
  st.beloond = false;
  let bel = null;
  if (st.n >= st.doel) {
    st.klaar = true;
    st.rondes++;
    st.n = 0;
    st.gedaan = new Set();
    st.rustTot = (Number.isFinite(nu) ? nu : 0) + CONTROLE_RUST_S;
    bel = beloning(st);
  }
  return {
    ok: true, uitkomst: uit, tekst: ANTWOORDEN[uit], n: st.klaar ? st.doel : st.n,
    doel: st.doel, klaar: st.klaar, beloning: bel, rondes: st.rondes,
  };
}

// Een nieuwe ronde (of een nieuwe conducteur): dezelfde stand, leeg. Zonder seed houdt hij het oude zaadje.
export function reset(st, seed) {
  const vers = beginControle(seed === undefined ? (st && st.seed) : seed);
  if (st && typeof st === 'object') { Object.assign(st, vers); return st; }
  return vers;
}
