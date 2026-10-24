// Samen spelen (#434): een boot bij de gast beweegt glad. De snapshots komen een paar keer per seconde; zonder gladstrijken springt een boot
// een stukje en slingert een lang binnenvaartschip bij elke kleine hoekstap. De positie volgt de gemelde plek met een korte vertraging (en loopt
// die vertraging met de gemelde snelheid weer in); de koers volgt de draaisnelheid van de host, zodat een gestage draai geen achterstand krijgt
// en een heen-en-weer per snapshot uitdooft. Een sprong (verplaatsing of nieuwe boot) zet hem meteen goed.
// Ook: welke boot is de boot van deze gast zelf, de deining in de maat van de romp, en hoelang een groot schip buiten de snapshot mag
// doorvaren (LOD: een containerschip van 92 m verdween anders hard in beeld).
// Pure functies, geen three.js: scripts/coop434_test.mjs en scripts/coopboot_test.mjs.
export const BOOT_TAU_POS = 0.2;   // s
export const BOOT_TAU_HOEK = 0.35; // s (basis; een langere romp krijgt meer)
export const BOOT_SPRONG_M = 12;   // m: verder weg dan dit is een sprong
export const BOOT_GHOST_MIN_LEN = 12;   // m: een boot vanaf deze lengte vaart buiten de snapshot nog even door
export const BOOT_GHOST_S = 8;          // s
const BOOT_TAU_FOUT = 0.9;      // s: kleine koersfout bijsturen (glad)
const BOOT_TAU_MIDDEL = 0.4;     // s: een flinke koersfout vlotter
const BOOT_TAU_SPRONG = 0.12;    // s: een grote koerssprong meteen inhalen
const BOOT_TAU_VERGETEN = 1.5;   // s: zonder nieuwe melding zakt de draaisnelheid weg
const BOOT_W_MAX = 2.0;          // rad/s: ruimer dan de snelste boot van de vloot (speedboot 1,3), tegen onzin
const BOOT_HOEK_SPRONG = 1.0;    // rad: een grotere hoekstap tussen twee meldingen is geen draai maar een nieuwe pose
const BOOT_SNAP_MIN = 1 / 120, BOOT_SNAP_MAX = 0.5; // s: de gemeten tijd tussen twee meldingen
const BOOT_DEINING_LEN = 6;      // m: vanaf deze lengte gaat de deining mee omlaag
const BOOT_GHOST_MIN_SNELHEID = 0.5; // m/s: een stilliggend schip hoeft niet door te varen als het uit de snapshot valt

const wikkel = (d) => Math.atan2(Math.sin(d), Math.cos(d));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// De boot waar deze gast zelf op zit (coopnet.js zet world.coopBoot uit de snapshot): die tekenen we precies waar de host
// hem heeft, zonder gladstrijken en zonder deining. De stoel en de camera van de gast komen uit diezelfde snapshot; een
// boot die een paar tienden achterloopt schuift anders onder de speler weg (#436).
export function eigenBoot(coopBoot, x, y) {
  if (!coopBoot || !Number.isFinite(coopBoot.x) || !Number.isFinite(coopBoot.y) || !Number.isFinite(x) || !Number.isFinite(y)) return false;
  return Math.hypot(x - coopBoot.x, y - coopBoot.y) < 0.5;
}

// Welke boot van de snapshot is de boot van deze gast? Eerst die bij world.coopBoot (coopnet.js); ontbreekt die, dan de boot
// waar zijn lichaam binnen de romp ligt (een gast die zelf vaart of net instapte heeft soms nog geen coopBoot). Zo blijft de
// eigen boot ook stabiel als twee boten langszij liggen.
export function kiesEigenBoot(coopBoot, voertuigen, speler) {
  const lijst = Array.isArray(voertuigen) ? voertuigen : [];
  if (coopBoot && Number.isFinite(coopBoot.x) && Number.isFinite(coopBoot.y)) {
    for (const v of lijst) { if (v && eigenBoot(coopBoot, v.x, v.y)) return v.id; }
  }
  if (!speler || !Number.isFinite(speler.x) || !Number.isFinite(speler.y)) return null;
  let best = null, bestD = Infinity;
  for (const v of lijst) {
    if (!v || v.soort !== 'boot' || !Number.isFinite(v.x) || !Number.isFinite(v.y)) continue;
    const a = Number.isFinite(v.angle) ? v.angle : 0, dx = speler.x - v.x, dy = speler.y - v.y;
    const lx = dx * Math.cos(a) + dy * Math.sin(a), ly = -dx * Math.sin(a) + dy * Math.cos(a);
    if (Math.abs(lx) > (v.len || 0) / 2 + 1.5 || Math.abs(ly) > (v.wid || 0) / 2 + 1.5) continue;
    const d = Math.hypot(dx, dy);
    if (d < bestD) { bestD = d; best = v.id; }
  }
  return best;
}

// Hoe zacht de koers volgt: een romp van 50 m versterkt elke rimpeling van de meldingen, dus een schip krijgt een langere tau.
export const bootDraaiTau = (len) => BOOT_TAU_HOEK + clamp(((Number(len) || 0) - BOOT_DEINING_LEN) * 0.015, 0, 0.8);

// st: het geheugen per boot ({} bij de eerste keer); geeft { x, y, angle }.
// x, y, angle, snelheid: uit de snapshot; dt: frame; lengte: de romplengte (voor de koersdemping).
export function gladBoot(st, x, y, angle, snelheid, dt, lengte = 0) {
  if (!st || !Number.isFinite(x) || !Number.isFinite(y)) return { x, y, angle };
  const a = Number.isFinite(angle) ? angle : 0, v = Number.isFinite(snelheid) ? snelheid : 0;
  const tx = x + Math.cos(a) * v * BOOT_TAU_POS, ty = y + Math.sin(a) * v * BOOT_TAU_POS; // waar de boot over de vertraging heen is
  if (!st.klaar || !(dt > 0) || Math.hypot(x - st.x, y - st.y) > BOOT_SPRONG_M) {
    st.klaar = true; st.x = x; st.y = y; st.a = a; st.ruw = a; st.w = 0; st.wacht = 0;
    return { x, y, angle: a };
  }
  const kp = 1 - Math.exp(-dt / BOOT_TAU_POS);
  st.x += (tx - st.x) * kp; st.y += (ty - st.y) * kp;
  const tau = bootDraaiTau(lengte);
  st.wacht = (st.wacht || 0) + dt;
  if (a !== st.ruw) { // een nieuwe hoek: de draaisnelheid sinds de vorige melding, gedempt
    const draai = wikkel(a - st.ruw), dtM = clamp(st.wacht, BOOT_SNAP_MIN, BOOT_SNAP_MAX);
    st.ruw = a; st.wacht = 0;
    if (Math.abs(draai) > BOOT_HOEK_SPRONG) { st.a = a; st.w = 0; return { x: st.x, y: st.y, angle: st.a }; } // nieuwe pose (adem, sluis, herstel)
    const ruw = clamp(draai / dtM, -BOOT_W_MAX, BOOT_W_MAX);
    st.w = (st.w || 0) + (ruw - (st.w || 0)) * (1 - Math.exp(-dtM / tau));
  } else {
    st.w = (st.w || 0) * Math.exp(-dt / BOOT_TAU_VERGETEN);
  }
  // De getekende hoek telt de draaisnelheid op (een gestage draai volgt zo zonder achterstand) en wordt bijgestuurd
  // naar de gemelde hoek: klein verschil zacht (geen rimpeling per snapshot), een groot verschil snel.
  const voor = st.a + (st.w || 0) * dt, fout = wikkel(a - voor), af = Math.abs(fout);
  const tauFout = af > 0.25 ? BOOT_TAU_SPRONG : af > 0.05 ? BOOT_TAU_MIDDEL : BOOT_TAU_FOUT;
  st.a = voor + fout * (1 - Math.exp(-dt / tauFout));
  return { x: st.x, y: st.y, angle: st.a };
}

// De rustige deining van een boot: in de maat van de romp. Een sloep van 5,5 m wiegt zoals altijd; een binnenvaartschip
// van 50 m of een containerschip van 92 m deint nauwelijks en traag, anders lijkt zo'n schip te slingeren (#434).
export function deiningBoot(len, t, id = 0) {
  const L = Number.isFinite(len) && len > 0 ? len : 5.5, tt = Number.isFinite(t) ? t : 0;
  const maat = Math.min(1, 3.2 / L + 0.2), traag = 1 / (1 + L / 60);
  const f = tt * 1.3 * traag + (Number(id) || 0) * 1.7;
  return { pitch: Math.sin(f * 0.8 + 1) * 0.01 * maat, roll: Math.sin(f) * 0.012 * maat, heave: Math.sin(f * 0.9) * 0.025 * maat };
}

// Mag een boot die niet meer in de snapshot staat, nog even doorvaren? Alleen een groot schip dat vaart: dat is van verre te zien en
// verdween anders met een harde sprong in beeld als de host het uit zijn bereik liet vallen (#434). Een stilgevallen schip (Wrak, haven)
// gaat meteen weg, zodat een gezonken schip niet doorvaart.
export const bootBlijft = (len, sinds, snelheid = 0) =>
  (Number(len) || 0) >= BOOT_GHOST_MIN_LEN && Math.abs(Number(snelheid) || 0) >= BOOT_GHOST_MIN_SNELHEID &&
  Number.isFinite(sinds) && sinds >= 0 && sinds <= BOOT_GHOST_S;
