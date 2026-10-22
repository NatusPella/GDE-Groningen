// Watersport (#197): de regels voor zeilen met wind, de nieuwe bootsoorten
// (roeiboot, zeilboot, speedboot), zwemmen in open water en een regatta op het
// vaarnetwerk. Puur: geen THREE, geen DOM, geen klok. boattypes.js houdt de
// bestaande rompen; hier staan de rijgegevens van de drie nieuwe soorten
// (BOOT_SOORTEN) en de logica die de vaarlaag en de HUD kunnen aanroepen.
// Alles is zomer en zonder leed: omslaan betekent nat worden en opnieuw
// beginnen. Tests: scripts/zeilrules_test.mjs.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const TAU = Math.PI * 2;
export const wrap = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };

// --- bootsoorten --------------------------------------------------------------------------------
// Dezelfde velden als boattypes.js (len, wid, maxSpeed, accel, brake, turnRate). `aandrijving`
// zegt hoe de boot vooruitkomt: 'zeil' (wind), 'riemen' (ritme) of 'motor'.
export const BOOT_SOORTEN = {
  roeiboot: { kind: 'roeiboot', aandrijving: 'riemen', len: 4.4, wid: 1.3, maxSpeed: 3.2, accel: 1.1, brake: 1.8, turnRate: 1.1, color: '#8a5a2c' },
  zeilboot: { kind: 'zeilboot', aandrijving: 'zeil', len: 5.2, wid: 1.9, maxSpeed: 6.5, accel: 0.7, brake: 0.9, turnRate: 0.9, color: '#f2f0ea', cabin: '#1f4f9a' },
  speedboot: { kind: 'speedboot', aandrijving: 'motor', len: 6.2, wid: 2.2, maxSpeed: 17, accel: 4.2, brake: 3.0, turnRate: 1.3, color: '#d8572a', cabin: '#f2f0ea' },
};

// --- wind -----------------------------------------------------------------------------------------
// De wind waait uit richting `dir` (radialen, zoals de wereld: 0 = +x). Rustig en langzaam
// draaiend per dag, nooit storm: zomerbries van 2 tot 9 m/s.
export const WIND = { min: 2, max: 9 };

const h01 = (n) => {
  let h = (Math.imul(Math.floor(n) | 0, 0x9e3779b1) ^ 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};
const smooth = (t) => t * t * (3 - 2 * t);

// Wind op dagnummer `dag` en uur `uur`: glijdt zacht tussen willekeurige waarden per drie uur.
export function windOp(dag, uur) {
  const slot = dag * 8 + Math.floor(uur / 3), t = smooth((uur / 3) % 1);
  const v = (k, salt) => h01(k * 31 + salt);
  const dir = wrap(lerpAngle(v(slot, 1) * TAU, v(slot + 1, 1) * TAU, t));
  const speed = WIND.min + (WIND.max - WIND.min) * (v(slot, 2) * (1 - t) + v(slot + 1, 2) * t);
  return { dir, speed };
}
function lerpAngle(a, b, t) { return a + wrap(b - a) * t; }

// De wind van het weer (world.weather.windAngle, waarheen de regen waait): het skûtsje-sprint (pg_skutsje.js) zeilt
// daarop en kent geen windsterkte. `dir` is hier, net als in windOp, waar de wind vandaan komt; de sterkte is een vaste
// middenwaarde, alleen voor de windaanwijzer op de minikaart (windmini.js).
export const WEER_WIND_SNELHEID = (WIND.min + WIND.max) / 2;
export function weerWindVan(weather) {
  const a = weather && Number.isFinite(weather.windAngle) ? weather.windAngle : 0.4;
  return wrap(a + Math.PI);
}

// Relatieve windhoek van de boot: 0 = wind recht van voren, ±π = recht van achteren.
export const windHoek = (heading, wind) => wrap(wind.dir - heading);

// Poolcurve: rendement (0..1) per windhoek. Op- en neergaand: in de dode hoek (<35°) komt de boot
// niet vooruit, het beste is halve wind (90-110°), voor de wind iets trager.
export function polair(hoek) {
  const a = Math.abs(hoek) * 180 / Math.PI;
  if (a < 35) return 0;
  if (a < 60) return 0.45 * ((a - 35) / 25);
  if (a < 90) return 0.45 + 0.55 * ((a - 60) / 30);
  if (a < 115) return 1;
  if (a < 150) return 1 - 0.25 * ((a - 115) / 35);
  return 0.75 - 0.15 * ((a - 150) / 30);
}

// Zeeltrim: de beste stand van de schoot (0 los .. 1 strak) volgt de windhoek; fout trimmen kost snelheid.
export function besteTrim(hoek) {
  const a = Math.abs(hoek) * 180 / Math.PI;
  return clamp(1 - ((a - 30) / 150) * 0.85, 0.15, 1); // aan de wind strak, voor de wind los
}
export const trimRendement = (trim, hoek) => clamp(1 - Math.abs(trim - besteTrim(hoek)) * 1.1, 0.35, 1);

export function createZeiler(x = 0, y = 0, heading = 0) {
  return { x, y, heading, speed: 0, trim: 0.6, helling: 0, omgeslagen: 0, apart: 0 };
}

// inp: { roer (-1..1), trim (-1..1 per seconde, wijzigt de schoot) }
export function stepZeil(z, inp, wind, dt, soort = BOOT_SOORTEN.zeilboot) {
  if (z.omgeslagen > 0) { // net omgeslagen: even drijven en dan opnieuw
    z.omgeslagen = Math.max(0, z.omgeslagen - dt);
    z.speed *= Math.max(0, 1 - 2 * dt);
    z.helling *= Math.max(0, 1 - 2 * dt);
    return z;
  }
  z.trim = clamp(z.trim + (inp.trim || 0) * 0.5 * dt, 0, 1);
  const hoek = windHoek(z.heading, wind);
  const doel = soort.maxSpeed * (wind.speed / WIND.max) * polair(hoek) * trimRendement(z.trim, hoek);
  const a = doel > z.speed ? soort.accel : soort.brake * 0.6;
  z.speed += clamp(doel - z.speed, -a * dt, a * dt);
  // sturen werkt beter met vaart; stilstaand in de wind draait de boot vanzelf af
  const grip = clamp(z.speed / 1.5, 0.5, 1);
  z.heading = wrap(z.heading + (inp.roer || 0) * soort.turnRate * grip * dt);
  const afdrift = polair(hoek) === 0 ? Math.sign(hoek || 1) * 0.35 * dt : 0;
  z.heading = wrap(z.heading - afdrift);
  z.x += Math.cos(z.heading) * z.speed * dt;
  z.y += Math.sin(z.heading) * z.speed * dt;
  // helling: halve wind en strakke schoot geven een stoere kanteling; te veel levert een nat pak
  const kracht = (wind.speed / WIND.max) * Math.sin(Math.abs(hoek)) * z.trim;
  z.helling += (kracht * 0.6 * Math.sign(hoek || 1) - z.helling) * Math.min(1, 3 * dt);
  if (Math.abs(z.helling) > 0.55 && wind.speed > 7.5 && z.trim > 0.85) { z.omgeslagen = 3; z.apart++; }
  return z;
}

// Voor de HUD: korte tekst over wat de boot doet ("Hoog aan de wind", "Dode hoek").
export function standTekst(z, wind) {
  const a = Math.abs(windHoek(z.heading, wind)) * 180 / Math.PI;
  if (z.omgeslagen > 0) return 'Omgeslagen: even drijven';
  if (a < 35) return 'In de wind: stuur af';
  if (a < 60) return 'Hoog aan de wind';
  if (a < 115) return 'Halve wind';
  if (a < 150) return 'Ruime wind';
  return 'Voor de wind';
}

// --- roeien ---------------------------------------------------------------------------------------
// Ritme: elke slag tussen 0.9 en 1.6 s na de vorige geeft voortstuwing; te laat een zwakke slag, te snel geen
// kracht en de riemen haperen (zie roeiStap): wie op de toets hamert, vaart trager dan wie het ritme houdt (#28, in beeld gemeten:
// hameren gaf een hogere topsnelheid dan het ritme).
export function roeiSlag(st, nu) {
  const gap = st.laatste == null ? 1.2 : nu - st.laatste;
  const goed = gap >= 0.9 && gap <= 1.6;
  const teSnel = gap < 0.9;
  st.laatste = nu;
  st.reeks = goed ? (st.reeks || 0) + 1 : 0;
  const kracht = goed ? 1 + Math.min(st.reeks, 6) * 0.08 : teSnel ? 0 : 0.4;
  return { goed, kracht };
}
export function stepRoei(boot, kracht, dt, soort = BOOT_SOORTEN.roeiboot) {
  boot.speed = clamp(boot.speed + kracht * soort.accel * dt * 4, 0, soort.maxSpeed);
  return boot;
}
export const roeiDemping = (v, dt) => v * Math.max(0, 1 - 0.55 * dt);

// --- zwemmen in open water ---------------------------------------------------------------------------------
export const ZWEM = { snel: 2.0, rustig: 1.1, uithouding: 40, herstel: 9, duikMax: 12, duikLucht: 20 };
export function createZwemmer() { return { uithouding: ZWEM.uithouding, lucht: ZWEM.duikLucht, diepte: 0, moe: false, snakt: false }; }

// inp: { snel, duik }. Snel zwemmen kost uithouding; moe zwemmen gaat rustiger. Duiken kost lucht
// en je komt vanzelf omhoog als de lucht op is: je wordt nooit gestraft behalve met tempo.
export function stepZwem(z, inp, dt) {
  const snel = !!inp.snel && !z.moe;
  const v = snel ? ZWEM.snel : ZWEM.rustig;
  z.uithouding = clamp(z.uithouding + (snel ? -1 : ZWEM.herstel / 5) * dt, 0, ZWEM.uithouding);
  if (z.uithouding <= 0) z.moe = true;
  if (z.moe && z.uithouding >= ZWEM.uithouding * 0.5) z.moe = false;
  if (z.lucht <= 0) z.snakt = true; // eerst op adem komen voor je weer duikt
  if (z.snakt && z.lucht >= ZWEM.duikLucht * 0.5) z.snakt = false;
  if (inp.duik && z.lucht > 0 && !z.snakt) {
    z.diepte = clamp(z.diepte + 1.5 * dt, 0, ZWEM.duikMax);
    z.lucht = Math.max(0, z.lucht - dt);
  } else {
    z.diepte = Math.max(0, z.diepte - 2.5 * dt);
    if (z.diepte === 0) z.lucht = Math.min(ZWEM.duikLucht, z.lucht + 6 * dt);
  }
  return { speed: v * (z.diepte > 0 ? 0.7 : 1), zwemt: true };
}

// --- regatta --------------------------------------------------------------------------------------------
// Een baan van tonnen op het water. Je moet ze in volgorde ronden (binnen `straal`); een ronde is
// alle tonnen. De bot-zeilers volgen dezelfde regels met een eigen vaardigheid.
export const REGATTA = { straal: 20, rondes: 2, medaille: [1.0, 1.25, 1.6] }; // medailles: factor op de richttijd

export function createRegatta(tonnen, { rondes = REGATTA.rondes, richttijd = 240 } = {}) {
  return { tonnen, rondes, richttijd, volgend: 0, ronde: 0, t: 0, klaar: false, tijd: null, gerond: 0 };
}

export function stepRegatta(r, x, y, dt) {
  if (r.klaar) return r;
  r.t += dt;
  const ton = r.tonnen[r.volgend];
  if (Math.hypot(ton.x - x, ton.y - y) <= REGATTA.straal) {
    r.volgend++; r.gerond++;
    if (r.volgend >= r.tonnen.length) {
      r.volgend = 0; r.ronde++;
      if (r.ronde >= r.rondes) { r.klaar = true; r.tijd = r.t; }
    }
  }
  return r;
}
export const regattaMedaille = (r) => {
  if (!r.klaar) return 0;
  const f = r.tijd / r.richttijd, [g, z, b] = REGATTA.medaille;
  return f <= g ? 1 : f <= z ? 2 : f <= b ? 3 : 0;
};
export const regattaVoortgang = (r) => (r.klaar ? 1 : r.gerond / (r.tonnen.length * r.rondes));

// Een baan rond een middelpunt: n tonnen op een cirkel.
export function rondBaan(cx, cy, straal, n = 4, start = 0) {
  return Array.from({ length: n }, (_, i) => ({ x: cx + Math.cos(start + (i / n) * TAU) * straal, y: cy + Math.sin(start + (i / n) * TAU) * straal }));
}

// Eenvoudige tegenstanders: varen op de volgende ton af met een vaardigheidsfactor op de snelheid.
// Ligt de ton te dicht op de wind (minder dan 60°), dan kruist de bot: hij vaart 60° naast de wind en wisselt van boeg
// (ten minste 12 s per slag) als de andere boeg dichter bij de ton ligt.
export function stepBot(bot, ton, wind, dt, vaardigheid = 0.7) {
  const want = Math.atan2(ton.y - bot.y, ton.x - bot.x);
  let koers = want;
  if (polair(windHoek(want, wind)) < 0.45) {
    bot.slagT = (bot.slagT || 0) + dt;
    const koersVoor = (k) => wrap(wind.dir - k * deg50);
    const beste = Math.abs(wrap(koersVoor(1) - want)) <= Math.abs(wrap(koersVoor(-1) - want)) ? 1 : -1;
    // eerst de boeg houden waarop de boot al vaart: over de wind draaien lukt alleen met vaart
    if (bot.slag == null) { bot.slag = Math.sign(windHoek(bot.heading, wind)) || 1; bot.slagT = 0; }
    else if (bot.slag !== beste && bot.slagT > 12 && bot.speed > 2) { bot.slag = beste; bot.slagT = 0; }
    koers = koersVoor(bot.slag);
  } else { bot.slag = null; bot.slagT = 0; }
  const inp = { roer: clamp(wrap(koers - bot.heading) * 2, -1, 1), trim: 0 };
  bot.trim = besteTrim(windHoek(bot.heading, wind));
  stepZeil(bot, inp, wind, dt, { ...BOOT_SOORTEN.zeilboot, maxSpeed: BOOT_SOORTEN.zeilboot.maxSpeed * vaardigheid });
  return bot;
}
const deg50 = (60 * Math.PI) / 180;
