// Leaf: blokkeren bij melee (#492). De derde laag na de reeks (meleecombo.js): met een slagwapen in de hand houdt de
// rechtermuisknop een blokstand vast. Die vangt melee-schade op (een vijfde komt er doorheen), kogels gaan er dwars door,
// hij houdt het hoogstens MAX_BLOK_S vol en daarna volgt HERSTEL_S herstel voordat je opnieuw kunt blokkeren. Een nieuwe
// blokstand begint pas met een nieuwe druk: vasthouden na een breuk begint hem niet vanzelf weer.
// Puur: geen DOM, THREE, klok, opslag of Math.random. De stand hoort bij één verdediger; combat.js bewaart die van de
// speler in world.blok en cooppvpwereld.js die van elke gast. Getest in scripts/blockregels_test.mjs.
export const MAX_BLOK_S = 2;      // s: langer dan dit houdt de blokstand het niet vol
export const HERSTEL_S = 0.35;    // s: na loslaten of breken eerst herstellen
export const BLOK_FACTOR = 0.2;   // deel van de melee-schade dat door de blokstand heen komt

// Een verse stand: niet aan het blokkeren, geen herstel, knop niet ingedrukt.
export function nieuweBlok() { return { aan: false, sinds: 0, herstelTot: 0, ingedrukt: false }; }

// Mag deze verdediger nu beginnen? Niet tijdens een lopende blokstand en niet in de herstelperiode.
export function magBlokkeren(st, nu) {
  if (!st || !Number.isFinite(nu)) return false;
  if (st.aan) return false;
  return !(Number.isFinite(st.herstelTot) && st.herstelTot > nu);
}

// Begin de blokstand op `nu`; false als het (nog) niet mag.
export function beginBlok(st, nu) {
  if (!magBlokkeren(st, nu)) return false;
  st.aan = true;
  st.sinds = nu;
  st.ingedrukt = true;
  return true;
}

// Stop met blokkeren en laat het herstel ingaan. Geeft true als er een blokstand liep.
export function herstel(st, nu) {
  if (!st) return false;
  const liep = !!st.aan;
  st.aan = false;
  if (Number.isFinite(nu)) st.herstelTot = nu + HERSTEL_S;
  return liep;
}

// Loopt de blokstand nu nog? Een verlopen blok of een klok die terugloopt telt niet meer.
export function blokActief(st, nu) {
  if (!st || !st.aan || !Number.isFinite(nu) || !Number.isFinite(st.sinds)) return false;
  const d = nu - st.sinds;
  return d >= 0 && d < MAX_BLOK_S;
}

// Eén beeld: `ingedrukt` is de knop nu. Een nieuwe druk begint de blokstand, vasthouden houdt hem tot MAX_BLOK_S,
// loslaten of te lang vasthouden zet het herstel in. Geeft true zolang de blokstand staat.
export function blokkeer(st, nu, ingedrukt = true) {
  if (!st) return false;
  if (!Number.isFinite(nu)) { st.aan = false; st.ingedrukt = false; st.sinds = 0; return false; } // een kapotte klok: geen blok
  const was = !!st.ingedrukt;
  st.ingedrukt = !!ingedrukt;
  if (st.aan) {
    if (!ingedrukt || !blokActief(st, nu)) { herstel(st, nu); return false; }
    return true;
  }
  if (!ingedrukt || was || !magBlokkeren(st, nu)) return false; // in herstel of al vast: geen nieuwe blokstand
  return beginBlok(st, nu);
}

// De schade die door een blokstand heen komt: melee ×0,20, een kogel ongewijzigd. Een bron die geen kogel is telt als
// melee, zodat een nieuwe slagsoort nooit ongezien door de blokstand heen slaat.
export function schadeNaBlok(bedrag, soort = 'melee') {
  const d = Math.max(0, Number(bedrag) || 0);
  return soort === 'kogel' ? d : d * BLOK_FACTOR;
}
