// Zeilvaren in de open wereld (#197): een boot met model.zeil (zeilboot) vaart op de wind uit
// zeilrules.js. De wind komt uit de dag en het uur (geen klok van buiten), Q haalt het zeil aan,
// Z viert het. De boot laat de gewone vaarlaag het werk doen (v.sailTop is de snelheid die de
// wind toelaat, zoals bij het skûtsje) en wordt hier alleen vooruit getrokken tot die snelheid.
// Onderaan staat de vaardienst (#444): een rondvaart of veerboot die bij elke halte aanlegt,
// met een dienstregeling, voortgang en een uitslag met medaille.
// Regels getest in scripts/zeilvaren_test.mjs en scripts/vaardienst_test.mjs.
import { windOp, windHoek, polair, trimRendement, BOOT_SOORTEN, WIND, standTekst, roeiSlag } from './zeilrules.js';
import { maakDienst, stapDienst, dienstVoortgang, dienstUitslag, dienstStand } from './simdienst.js';
import { invoerVan } from './coopbestuur.js'; // de invoer van een gast die zelf een boot bestuurt (#436)

export const TRIM_RATE = 0.5;      // per seconde, zoals stepZeil
export const OMSLAG_S = 3;        // s drijven na het omslaan
export const TEKST_GAP_S = 7;      // s tussen twee korte stand-teksten

// De snelheid die de wind aan een boot met deze koers en schoot geeft.
export function windSnelheid(heading, trim, wind, soort = BOOT_SOORTEN.zeilboot) {
  const hoek = windHoek(heading, wind);
  return soort.maxSpeed * (wind.speed / WIND.max) * polair(hoek) * trimRendement(trim, hoek);
}

// Eén stap voor een zeilende boot: trim bijwerken, sailTop zetten, snelheid naar de wind toe trekken.
export function zeilStap(v, wind, inp, dt, soort = BOOT_SOORTEN.zeilboot) {
  if (v.omgeslagen > 0) { // net omgeslagen (nat, geen leed): even drijven, dan weer overeind
    v.omgeslagen = Math.max(0, v.omgeslagen - dt);
    v.helling = (v.helling || 0) * Math.max(0, 1 - 2 * dt);
    v.sailTop = 0;
    v.speed = (v.speed || 0) * Math.max(0, 1 - 2 * dt);
    return 0;
  }
  v.zeilTrim = Math.max(0, Math.min(1, (v.zeilTrim ?? 0.6) + (inp.trim || 0) * TRIM_RATE * dt));
  v.sailTop = windSnelheid(v.angle, v.zeilTrim, wind, soort);
  // kanteling zoals stepZeil: veel wind, strakke schoot en dwars op de wind geeft een nat pak
  const hoek = windHoek(v.angle, wind);
  const kracht = (wind.speed / WIND.max) * Math.sin(Math.abs(hoek)) * v.zeilTrim;
  v.helling = (v.helling || 0) + (kracht * 0.6 * Math.sign(hoek || 1) - (v.helling || 0)) * Math.min(1, 3 * dt);
  if (Math.abs(v.helling) > 0.55 && wind.speed > 7.5 && v.zeilTrim > 0.85) { v.omgeslagen = OMSLAG_S; v.apart = (v.apart || 0) + 1; v.sailTop = 0; return 0; }
  if ((v.speed || 0) < v.sailTop) v.speed = Math.min(v.sailTop, (v.speed || 0) + soort.accel * dt);
  return v.sailTop;
}

// Roeien als ritme (#197): elke tik op W/pijl-omhoog is een slag. Goed ritme (0,9 tot 1,6 s) bouwt
// de topsnelheid op (v.sailTop, de vaarlaag trekt de boot er naartoe), te snel of te laat levert weinig.
export const ROEI_DEMPING = 0.3;   // per seconde: de topsnelheid zakt zonder slagen
export const ROEI_STOOT = 1.1;     // m/s topsnelheid per goede slag (x kracht)
export const ROEI_HAPER = 0.75;    // de topsnelheid na een te snelle tik
export function roeiStap(v, tik, nu, dt, soort = BOOT_SOORTEN.roeiboot) {
  v.roeiSt = v.roeiSt || {};
  v.roeiTop = Math.max(0, (v.roeiTop || 0) * Math.max(0, 1 - ROEI_DEMPING * dt));
  let slag = null;
  if (tik) {
    slag = roeiSlag(v.roeiSt, nu);
    v.roeiTop = Math.min(soort.maxSpeed, v.roeiTop + ROEI_STOOT * slag.kracht);
    if (slag.kracht === 0) v.roeiTop *= ROEI_HAPER; // te snel getikt: de riemen haperen
    v.speed = Math.min(soort.maxSpeed, (v.speed || 0) + 0.35 * slag.kracht);
  }
  v.sailTop = v.roeiTop;
  // de boot volgt de topsnelheid die het ritme geeft, zoals zeilStap dat met de wind doet: zonder dit bleef hij na een
  // tik van 120 ms op W zo goed als stilstaan (in beeld gemeten: 0,5 m/s bij een top van 2,5)
  if ((v.speed || 0) < v.sailTop) v.speed = Math.min(v.sailTop, (v.speed || 0) + soort.accel * dt);
  return slag;
}

// Windwijzer (HUD): de pijl wijst waar de wind heen waait, gezien vanaf de boot (boeg = boven).
// hoek: windHoek (0 = wind recht van voren), in graden voor CSS rotate (kloksgewijs).
export const windPijlGraden = (hoek) => 180 - (hoek * 180) / Math.PI;

let wijzer = null;
function toonWijzer(v, wind, hoek) {
  if (typeof document === 'undefined') return;
  if (!wijzer) {
    wijzer = document.createElement('div');
    wijzer.id = 'windwijzer';
    wijzer.setAttribute('role', 'img');
    wijzer.innerHTML = '<svg viewBox="-20 -20 40 40" aria-hidden="true"><circle r="18" class="ww-ring"/><path class="ww-pijl" d="M0 -13 L6 5 L0 1 L-6 5 Z"/></svg><b class="ww-snel"></b><span class="ww-trim"><i></i></span><span class="ww-keys"><span class="hud-key">Q</span> aan <span class="hud-key">Z</span> vieren</span>';
    document.body.appendChild(wijzer);
  }
  wijzer.hidden = false;
  wijzer.querySelector('.ww-pijl').style.transform = `rotate(${windPijlGraden(hoek).toFixed(0)}deg)`;
  wijzer.querySelector('.ww-snel').textContent = `${Math.round(wind.speed)} m/s`;
  wijzer.querySelector('.ww-trim i').style.width = `${Math.round((v.zeilTrim ?? 0.6) * 100)}%`;
  wijzer.setAttribute('aria-label', `Wind ${Math.round(wind.speed)} meter per seconde, zeil ${Math.round((v.zeilTrim ?? 0.6) * 100)} procent aangehaald`);
}
function verbergWijzer() { if (wijzer) wijzer.hidden = true; }

let textT = 0;

// De boten die gasten zelf besturen (#436): die liggen in de simulatie van wie het spel opende, dus de
// zeil- en roeiregels moeten daar lopen, met de invoer van de gast. Tot nu toe keek updateZeilvaren alleen
// naar world.player.inVehicle: een gast kon een zeilboot wel sturen, maar niet op de wind varen (hij ging op
// de motortop van het model) en een roeiboot niet roeien. Geeft [{ v, slot, invoer }].
export function gastBoten(world) {
  const rijders = world && world.coopRijders, uit = [];
  if (!rijders) return uit;
  for (const sleutel of Object.keys(rijders)) {
    const r = rijders[sleutel], v = r && r.v;
    if (!v || !v.isBoat || !v.model || v.driver !== 'player' || String(v.coopBestuurder) !== String(sleutel)) continue;
    if (!v.model.zeil && v.model.soort !== 'roeiboot') continue;
    const invoer = invoerVan(world, +sleutel);
    if (invoer) uit.push({ v, slot: +sleutel, invoer });
  }
  return uit;
}

// Een gast stuurt zijn invoer als stick (my omlaag, dus vooruit is my < 0); de eigen speler als toetsen.
const vooruit = (invoer) => !!(invoer && (invoer.isDown
  ? invoer.isDown('w') || invoer.isDown('arrowup')
  : Number(invoer.my) < -0.35));

export function updateZeilvaren(dt, world, dag) {
  const eigen = world && world.player && world.player.inVehicle;
  const boot = eigen && eigen.isBoat ? eigen : null;
  let gedaan = false;
  if (boot) gedaan = stapBoot(dt, world, dag, boot, world && world.input, null) || gedaan;
  for (const gast of gastBoten(world)) if (gast.v !== boot) gedaan = stapBoot(dt, world, dag, gast.v, gast.invoer, gast) || gedaan;
  if (!gedaan) verbergWijzer();
  return gedaan;
}

// Eén boot de zeil- of roeiregels laten volgen. gast: null voor de eigen speler, anders { slot } van de gast
// (diens invoer komt als stick binnen en zijn meldingen gaan naar hem, niet naar het scherm van de host).
function stapBoot(dt, world, dag, v, invoer, gast) {
  if (!v || !v.isBoat || !v.model) return false;
  const meld = (tekst, seconden) => {
    if (gast) { if (world.coopMeld) world.coopMeld(gast.slot, tekst); }
    else if (world.addMessage) world.addMessage(tekst, seconden);
  };
  if (v.model.soort === 'roeiboot' && v.driver === 'player') {
    if (world.paused) return true;
    const aan = vooruit(invoer);
    const tik = aan && !v.roeiWasAan;
    v.roeiWasAan = aan;
    const slag = roeiStap(v, tik, world.time || 0, dt);
    if (slag && !slag.goed && (v.roeiSt.reeks || 0) === 0 && (v.roeiTekstT = (v.roeiTekstT || 0) - 1) <= 0) { v.roeiTekstT = 4; meld('Roei in een rustig ritme: tik W ongeveer elke seconde', 2.5); }
    verbergWijzer();
    return true;
  }
  if (!v.model.zeil || v.driver !== 'player') { if (v.model.zeil) v.sailTop = null; return false; }
  if (world.paused) return true;
  const uur = ((world.clock % 24) + 24) % 24;
  const wind = windOp(dag, uur);
  world.wind = wind;
  // De gast heeft geen Q en Z in zijn invoer: zijn schoot blijft staan zoals hij hem aantrof (standaard 0,6).
  const inp = gast ? { trim: 0 } : { trim: (invoer && invoer.isDown('q') ? 1 : 0) - (invoer && invoer.isDown('z') ? 1 : 0) };
  const was = v.omgeslagen > 0;
  zeilStap(v, wind, inp, dt);
  if (!was && v.omgeslagen > 0) meld('Omgeslagen! Een nat pak, verder niets. Vier het zeil (Z) en vaar door', 4);
  if (gast) return true; // de windwijzer is van de eigen speler; een gast heeft die HUD niet
  toonWijzer(v, wind, windHoek(v.angle, wind));
  textT -= dt;
  if (textT <= 0) {
    textT = TEKST_GAP_S;
    world.addMessage(`${standTekst({ heading: v.angle, omgeslagen: 0 }, wind)} · wind ${Math.round(wind.speed)} m/s`, 2.5);
  }
  return true;
}

// --- vaardienst (#444): de rondvaart of veerboot met aanleggen ---------------------------
// De regels: vaar de halten in volgorde langs, leg bij elke halte aan (binnen aanlegR, zachter
// dan aanlegV) en blijf een paar seconden liggen voor de reizigers. Te hard voorbij varen laat de
// halte liggen; de klok loopt door. Omslaan kost alleen tijd (een nat pak, geen leed).
export const VAART = {
  aanlegR: 18,    // m: zo dicht bij de kade
  aanlegV: 1.2,   // m/s: zachter dan dit om aan te leggen
  aanlegS: 3,     // s: zo lang blijf je liggen voor de halte telt
  vmax: 5.5,      // m/s: harder dan dit telt als te hard varen
};

// halten: [{ x, y, naam? }]; opties: naam van de dienst, maxTijd en een eigen kade.
export function maakVaardienst({ halten = [], naam = 'Rondvaart', maxTijd = null, aanlegR = VAART.aanlegR, aanlegV = VAART.aanlegV, aanlegS = VAART.aanlegS } = {}) {
  return maakDienst({
    vervoer: 'schip', naam, maxTijd,
    halten: halten.map((h) => ({
      ...h, stopR: h.stopR != null ? h.stopR : aanlegR, stopV: h.stopV != null ? h.stopV : aanlegV,
      stopS: h.stopS != null ? h.stopS : aanlegS, wacht: h.wacht != null ? h.wacht : 6,
    })),
  });
}

// Eén beeld: v is de boot van de vaarlaag (x, y, speed). Geeft de gebeurtenissen van de dienst.
export function vaarStap(d, v, { dt = 0 } = {}) {
  if (!v) return [];
  return stapDienst(d, { x: v.x, y: v.y, v: Math.abs(v.speed || 0), dt, stil: true });
}

export const vaarVoortgang = dienstVoortgang;
export const vaarStand = dienstStand;
export function vaarUitslag(d) { return dienstUitslag(d); }
