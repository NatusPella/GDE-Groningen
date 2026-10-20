// Schaapontvoering (#333): af en toe, diep in de nacht op het platteland, daalt een schotel neer boven een
// grazend schaap, richt een straal op het dier en trekt het omhoog. Het schaap verdwijnt in de schotel en de
// schotel schiet weg. Satire, geen leed: het schaap draait vrolijk rond, er is niets te zien behalve licht,
// en de boer telt de volgende ochtend gewoon een schaap minder.
// Puur en Node-safe: geen THREE, geen wereld (schaapontvoeringrt.js tekent en koppelt het aan wildlife.js).
// Eén gebeurtenis is een kleine toestandsmachine: aanvlucht -> straal -> optillen -> weg. De straal loopt altijd
// van de onderkant van de schotel naar het schaap, dus hij eindigt bij het ruimteschip (geen losse lichtbundel).

export const NACHT = { van: 22, tot: 4.5 };           // uren waarin het kan (het schaap staat er dan nog, het is donker genoeg)
export const TIJD = { aanvlucht: 7, straal: 2.2, optillen: 7, weg: 4 };   // seconden per fase
export const HOOGTE = 34;                              // m: zo hoog hangt de schotel boven het schaap
export const SCHOTEL_R = 6;                            // m: straal van de schotel
export const STRAAL_R = 4.4;                           // m: straal van de straal bij het schaap
export const STRAAL_TOP = 2.4;                         // m: en bij de schotel (smaller: een trechter)
export const AANVLUCHT_M = 240;                        // m horizontaal en
export const AANVLUCHT_Z = 150;                        // m hoog waar de schotel vandaan komt
export const BEREIK = [35, 150];                       // m van de speler: ver genoeg om te zien, dichtbij genoeg om te horen
export const KANS_PER_NACHT = 0.45;                    // kans dat het in een nacht met een passend schaap gebeurt
export const CHECK_S = 12;                             // s tussen twee kansrondes
export const FASEN = ['aanvlucht', 'straal', 'optillen', 'weg'];
export const REGELS = [
  'Een schotel hangt boven de wei. Het schaap kijkt omhoog en kauwt door.',
  'Licht uit de lucht. Het schaap lijkt het wel te vinden.',
  'Boven de wei draait een schaap rond, op weg naar boven. Niemand die het wil geloven.',
];
export const NIEUWS = 'KIEKDOAR: Boer mist een schaap, vindt een rond plekje gras. Hij telt het liever niet na.';

// Het klokuur (0..24) van world.clock.
export const uurVan = (clock) => ((clock % 24) + 24) % 24;
export const isNacht = (clock) => { const h = uurVan(clock); return h >= NACHT.van || h < NACHT.tot; };
// Nachtnummer: loopt van de middag tot de volgende middag, zodat 23:30 en 01:00 dezelfde nacht zijn.
export const nachtNr = (clock) => Math.floor((clock - 12) / 24);

const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const lerp = (a, b, t) => a + (b - a) * t;

// Is dit schaap een goede kandidaat? Een levend schaap op het land, niet al onderweg, binnen bereik van de speler.
export function geschikt(a, player) {
  if (!a || a.kind !== 'sheep' || a.dead || a.gone || a.lift || a.ontvoerd) return false;
  if (typeof a.x !== 'number' || typeof a.y !== 'number') return false;
  const d = Math.hypot(a.x - player.x, a.y - player.y);
  return d >= BEREIK[0] && d <= BEREIK[1];
}

// Kiest een schaap uit de lijst (of null). roll in [0,1): welke van de geschikte.
export function kiesSchaap(list, player, roll) {
  const ok = (list || []).filter((a) => geschikt(a, player));
  if (!ok.length) return null;
  return ok[Math.min(ok.length - 1, Math.floor(roll * ok.length))];
}

// Begin een ontvoering van dit schaap. hoek: waar de schotel vandaan komt (radialen).
export function begin(schaap, hoek = 0, nacht = 0) {
  return {
    fase: 'aanvlucht', t: 0, nacht, hoek,
    x: schaap.x, y: schaap.y,          // de plek onder de schotel (het schaap loopt niet meer weg)
    ufo: { x: schaap.x + Math.cos(hoek) * AANVLUCHT_M, y: schaap.y + Math.sin(hoek) * AANVLUCHT_M, z: AANVLUCHT_Z },
    lift: 0, draai: 0, straal: 0, klaar: false, schaapWeg: false,
  };
}

// Eén stap vooruit. Geeft dezelfde toestand terug (muteert niet de invoer van buiten):
//   ufo {x, y, z}  de schotel in wereldmeters (z = hoogte)
//   straal 0..1    hoe sterk de straal is (0 = uit)
//   lift           m dat het schaap boven de grond hangt; draai: hoek van het schaap om zijn as
//   schaapWeg      het schaap is in de schotel verdwenen (verwijder het dier)
//   klaar          de schotel is weg
export function stap(st, dt) {
  if (st.klaar) return st;
  st.t += dt;
  const T = TIJD[st.fase];
  const u = ease(st.t / T);
  if (st.fase === 'aanvlucht') {
    st.ufo.x = lerp(st.x + Math.cos(st.hoek) * AANVLUCHT_M, st.x, u);
    st.ufo.y = lerp(st.y + Math.sin(st.hoek) * AANVLUCHT_M, st.y, u);
    st.ufo.z = lerp(AANVLUCHT_Z, HOOGTE, u);
    st.straal = 0;
  } else if (st.fase === 'straal') {
    st.ufo.x = st.x; st.ufo.y = st.y; st.ufo.z = HOOGTE;
    st.straal = u;
  } else if (st.fase === 'optillen') {
    st.straal = 1;
    st.lift = u * (HOOGTE - 2.4);   // het schaap eindigt vlak onder de schotel
    st.draai += dt * (0.8 + 3.2 * u);
    st.ufo.x = st.x; st.ufo.y = st.y; st.ufo.z = HOOGTE;
  } else {
    // weg: het schaap is binnen, de straal dooft en de schotel schiet schuin omhoog en weg
    st.schaapWeg = true;
    st.straal = Math.max(0, 1 - st.t / (T * 0.3));
    st.ufo.x = st.x - Math.cos(st.hoek) * AANVLUCHT_M * u * u;
    st.ufo.y = st.y - Math.sin(st.hoek) * AANVLUCHT_M * u * u;
    st.ufo.z = HOOGTE + (AANVLUCHT_Z * 3) * u * u;
  }
  if (st.t >= T) {
    const i = FASEN.indexOf(st.fase);
    if (i === FASEN.length - 1) st.klaar = true;
    else { st.fase = FASEN[i + 1]; st.t = 0; if (st.fase === 'weg') st.schaapWeg = true; }
  }
  return st;
}

// Waar de straal loopt: van de onderkant van de schotel (z - 0.9) naar het schaap (de straal omsluit het dier: lift - 0.3), met de
// stralen van de bovenkant en de onderkant. null als de straal uit is.
export function straalVan(st) {
  if (!st || st.straal <= 0.001) return null;
  const top = st.ufo.z - 0.9;
  const bodem = st.fase === 'weg' ? top - 0.5 : st.lift - 0.3;
  return { x: st.ufo.x, y: st.ufo.y, top, bodem, lengte: Math.max(0.1, top - bodem), rTop: STRAAL_TOP, rBodem: STRAAL_R, sterkte: st.straal };
}
