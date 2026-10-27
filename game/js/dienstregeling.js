// Treinen en stations (#198): de dienstregeling, het vertrekbord, de spoorbomen
// en de omroep als tekst. Puur: geen THREE, geen wereld, geen klok. De lijnen
// komen als data binnen (railway.getRoutes(): { name, stops: [{ name, s }] }),
// de vervoerder is verzonnen ("Noorderspoor"). De tijd is de spelklok in uren
// (0..24) plus het dagnummer; een trein rijdt volgens het rooster, ook als
// niemand kijkt. Het vertrekbord in het spel volgt echter de treinen die echt rijden
// (bordUitTreinen); het rooster is de terugval en de basis voor de overwegen.
// Vertraging is klein en deterministisch per dag, lijn en rit (geen echte
// storingen of gewonden). Tests: scripts/dienstregeling_test.mjs.

export const VERVOERDER = 'Noorderspoor';

export const RIJ = {
  speed: 24,          // m/s gemiddeld tussen stations (optrekken en remmen inbegrepen)
  dwell: 40,          // s oponthoud op een tussenstation
  eerste: 5.5,        // uur van de eerste vertrektijd vanaf het beginstation
  laatste: 23.75,     // uur van de laatste vertrektijd
  piek: [[7, 9.5], [16, 18.5]],
  freqPiek: 15 * 60,  // s tussen twee treinen in de spits
  freqDal: 30 * 60,
  freqLaat: 60 * 60,  // na 21:00
};

const hash = (...a) => {
  let h = 2166136261;
  for (const v of a) {
    const s = String(v);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    h ^= 124; h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
};
const unit = (...a) => hash(...a) / 4294967296;

// Tussen hoeveel seconden twee treinen rijden op een uur van de dag.
export function frequentie(uur) {
  if (uur >= 21 || uur < RIJ.eerste) return RIJ.freqLaat;
  for (const [a, b] of RIJ.piek) if (uur >= a && uur < b) return RIJ.freqPiek;
  return RIJ.freqDal;
}

// Rijtijden per lijn vanaf het beginstation (dir +1) of eindstation (dir -1), in seconden:
// [{ name, s, aan, weg }]. De lijnlengte komt uit de stopafstanden.
export function rijtijden(route, dir = 1) {
  const stops = dir > 0 ? route.stops : [...route.stops].reverse();
  const rows = [];
  let t = 0, prev = null;
  stops.forEach((st, i) => {
    if (prev) t += Math.abs(st.s - prev.s) / RIJ.speed;
    const aan = t;
    const weg = i === stops.length - 1 ? t : t + RIJ.dwell;
    rows.push({ name: st.name, s: st.s, aan, weg, laatste: i === stops.length - 1, offmap: !!st.offmap });
    t = weg; prev = st;
  });
  return rows;
}

// Het vertrekuur (in seconden na middernacht) van alle ritten van een lijn in één richting vanaf
// het beginstation. De richtingen krijgen een kleine verschuiving zodat ze niet gelijk staan.
export function ritten(route, dir = 1) {
  const out = [];
  const start = RIJ.eerste * 3600 + (dir > 0 ? 0 : 7 * 60) + Math.floor(unit(route.name, 'offset') * 5) * 60;
  const eind = RIJ.laatste * 3600;
  let t = start, k = 0;
  while (t <= eind) {
    out.push({ lijn: route.name, dir, k, start: t });
    t += frequentie(t / 3600);
    k++;
  }
  return out;
}

// Vertraging van een rit in seconden: meestal 0, soms een paar minuten, nooit meer dan 6.
// De uitleg is zonder echte storingen.
export function vertraging(route, rit, dag) {
  const u = unit(route.name, rit.dir, rit.k, dag);
  if (u < 0.78) return 0;
  if (u < 0.93) return 60;
  if (u < 0.98) return 180;
  return 360;
}

export const VERTRAGING_REDENEN = [
  'Door de warmte in de wissels rijdt deze trein iets bedachtzamer',
  'Een koe op het spoor heeft even een vergadering',
  'Wachten op een tegenligger',
  'Extra lang oponthoud: de machinist neemt een bakkie',
];
export const redenVoor = (route, rit, dag) => VERTRAGING_REDENEN[hash(route.name, rit.k, dag) % VERTRAGING_REDENEN.length];

// --- het rooster van de machinist (#492) ------------------------------------------------------
// De machinist rijdt een dienst uit het rooster: per lijn, richting en speldag dezelfde halten met
// dezelfde vertrektijden. De ritten zijn de bestaande ritten() en de halten komen uit rijtijden();
// er is geen tweede rooster. De vertraging per lijn, rit en dag is de bestaande vertraging().
// Puur en deterministisch: dezelfde dag geeft altijd dezelfde dienst.

// Eén dienst: de halten in rijrichting met aankomst (aan) en vertrek (weg) in seconden na
// middernacht, de vertraging van die dag erin. `start` is het vertrek vanaf het beginstation.
export function dienstVanRit(route, dir, dag, rit) {
  const verw = vertraging(route, rit, dag);
  const halten = rijtijden(route, dir).map((r) => ({
    name: r.name, s: r.s, aan: rit.start + r.aan + verw, weg: rit.start + r.weg + verw,
    laatste: r.laatste, offmap: r.offmap,
  }));
  return {
    lijn: route.name, dir, k: rit.k, dag, start: rit.start + verw, vertraging: verw,
    reden: verw ? redenVoor(route, rit, dag) : '',
    van: halten[0].name, naar: halten[halten.length - 1].name, halten,
  };
}

// Het hele rooster van een lijn en richting op één speldag, op tijd gesorteerd (zoals ritten()).
export function roosterVoor(route, dir = 1, dag = 1) {
  return ritten(route, dir).map((rit) => dienstVanRit(route, dir, dag, rit));
}

// De eerstvolgende dienst die op halte `vanaf` vertrekt op of na `nu` (beide in seconden na
// middernacht; `marge` is de speling voor een trein die net weg is). Zonder `vanaf` telt het
// vertrek vanaf het beginstation. Is de dag op, dan null: de machinist rijdt dan zonder rooster.
// De dienst krijgt `vanaf` en `vertrek` (de tijd op die halte) mee.
export function dienstVoor(route, dir = 1, dag = 1, nu = 0, { vanaf = null, marge = 60 } = {}) {
  const eerste = dir > 0 ? route.stops[0] : route.stops[route.stops.length - 1];
  const naam = vanaf || (eerste && eerste.name) || null;
  if (!naam) return null;
  for (const d of roosterVoor(route, dir, dag)) {
    const h = d.halten.find((x) => x.name === naam);
    if (!h) return null;
    const tijd = h.laatste ? h.aan : h.weg; // op het eindstation is aankomst het laatste wat de dienst doet
    if (tijd >= nu - marge) return { ...d, vanaf: naam, vertrek: tijd };
  }
  return null;
}

// De roostertijd op de plek van de trein (booglengte c) in seconden na middernacht: tussen twee
// halten lineair, zoals doorgangenOverweg. De machinist rekent daarmee de halten van het rooster
// om naar de klok van zijn dienst: de verschillen uit het rooster, niet het instapmoment.
export function roostertijdOp(dienst, c, dir = null) {
  const h = dienst && dienst.halten;
  if (!h || !h.length) return null;
  const d = dir == null ? (dienst.dir || 1) : dir;
  if (h.length === 1) return h[0].weg;
  for (let i = 0; i < h.length - 1; i++) {
    const a = h[i], b = h[i + 1];
    const lo = Math.min(a.s, b.s), hi = Math.max(a.s, b.s);
    if (hi === lo || c < lo || c > hi) continue;
    // op de perronmarkering telt het vertrek, niet de aankomst: de trein staat er al
    if (Math.abs(c - b.s) < 0.5) return b.weg;
    return a.weg + (Math.abs(c - a.s) / Math.abs(b.s - a.s)) * (b.aan - a.weg);
  }
  const eerste = h[0], laatste = h[h.length - 1];
  return (c - eerste.s) * d < 0 ? eerste.weg : laatste.aan;
}

// De halte waar de machinist instapt: de dichtstbijzijnde halte achter de trein in rijrichting
// (hij staat er nog of is er net weg). Zonder halte daar de eerstvolgende halte voor de trein;
// halten buiten de kaart tellen niet mee. Null zonder halten.
export function instapHalte(route, c, dir = 1) {
  const stops = (route && route.stops) || [];
  let achter = null, voor = null, achterD = Infinity, voorD = -Infinity;
  for (const st of stops) {
    if (st.offmap) continue;
    // d > 0: de halte ligt achter de neus in de rijrichting; d < 0: ervoor
    const d = (c - st.s) * dir;
    if (d >= -5) {
      if (d < achterD) { achter = st; achterD = d; }
    } else if (d > voorD) { voor = st; voorD = d; }
  }
  return achter || voor || null;
}

// De dienst als één regel voor het bord van de machinist: lijn, richting en vertrektijd.
export function dienstTekst(d) {
  if (!d) return '';
  return `${d.lijn} naar ${d.naar}, vertrek ${tijdLabel(d.vertrek != null ? d.vertrek : d.start)}`;
}

// Spoor op een station: per station en richting stabiel, 1..4; richtingen delen geen spoor.
export function spoor(stationNaam, route, dir) {
  const basis = hash(stationNaam, route.name) % 2; // 0 of 1
  return (dir > 0 ? 1 : 2) + 2 * basis;
}

// Alle rijdende en wachtende treinen op een station: een rij {tijd (s na middernacht), lijn, richting,
// spoor, vertraging, aankomst, laatste}. Gesorteerd op vertrektijd, vanaf `nu` (s na middernacht).
export function vertrekBord(routes, stationNaam, nu, dag = 1, { aantal = 6, terug = 60 } = {}) {
  const rijen = [];
  for (const route of routes) {
    for (const dir of [1, -1]) {
      const rt = rijtijden(route, dir);
      const idx = rt.findIndex((r) => r.name === stationNaam);
      if (idx < 0) continue;
      const stop = rt[idx];
      const bestemming = rt[rt.length - 1].name;
      if (bestemming === stationNaam && !stop.laatste) continue;
      for (const rit of ritten(route, dir)) {
        const verw = vertraging(route, rit, dag);
        const plan = rit.start + stop.weg;
        if (plan + verw < nu - terug) continue;
        if (stop.laatste) continue; // eindstation: geen vertrek
        rijen.push({
          lijn: route.name, richting: bestemming, dir, k: rit.k, spoor: spoor(stationNaam, route, dir),
          plan, tijd: plan + verw, vertraging: verw, reden: verw ? redenVoor(route, rit, dag) : '',
          aankomst: rit.start + stop.aan + verw,
        });
      }
    }
  }
  rijen.sort((a, b) => a.tijd - b.tijd || a.lijn.localeCompare(b.lijn));
  return rijen.filter((r) => r.tijd >= nu - terug).slice(0, aantal);
}

// Het bord uit de treinen die echt rijden (railway.getTrains()), zodat bord, omroep en zichtbare
// trein overeenkomen. treinen: [{ route, c, dir, v, state ('dwell' | 'run'), target, timer, vmax }].
// De verwachte aankomst telt afstand over de stops (met keren aan de uiteinden) bij een gemiddelde
// snelheid van 0,8 vmax plus het oponthoud per halte; `schaal` zet echte seconden om in spelklok-
// seconden (86400 / DAY_LENGTH_S). Per trein de eerste `bezoeken` keer dat hij op dit station staat.
// Rijen als vertrekBord: { lijn, richting, dir, k, spoor, plan, tijd, vertraging: 0, reden: '', aankomst }.
export const OPONTHOUD = { halte: 25, eind: 35, buiten: 100 };
export function bordUitTreinen(treinen, stationNaam, nu, { aantal = 6, bezoeken = 2, schaal = 60 } = {}) {
  const rijen = [];
  for (const t of treinen) {
    if (t.state !== 'dwell' && t.state !== 'run') continue;
    const stops = t.route.stops;
    const j = stops.findIndex((st) => st.name === stationNaam);
    if (j < 0 || stops[j].offmap) continue;
    const vgem = Math.max(1, (t.vmax || 22) * 0.8);
    const last = stops.length - 1;
    let dir = t.dir, idx = t.target, tijd = 0, visit = 0;
    // op weg naar t.target, of wachtend op t.target
    if (t.state === 'run') tijd = Math.abs(stops[idx].s - t.c) / vgem;
    for (let guard = 0; guard < 4 * stops.length + 4 && visit < bezoeken; guard++) {
      const eerste = guard === 0;
      const aan = tijd;
      const wacht = eerste && t.state === 'dwell' ? Math.max(0, t.timer || 0) : (stops[idx].offmap ? OPONTHOUD.buiten : idx === 0 || idx === last ? OPONTHOUD.eind : OPONTHOUD.halte);
      const weg = (eerste && t.state === 'dwell' ? 0 : aan) + wacht;
      if (idx === 0) dir = 1; else if (idx === last) dir = -1;
      if (idx === j) {
        const bestemming = stops[dir > 0 ? last : 0].name;
        rijen.push({
          lijn: t.route.name, richting: bestemming, dir, k: visit, spoor: spoor(stationNaam, t.route, dir),
          plan: nu + weg * schaal, tijd: nu + weg * schaal, vertraging: 0, reden: '', aankomst: nu + (eerste && t.state === 'dwell' ? 0 : aan) * schaal, echt: true,
        });
        visit++;
      }
      const next = idx + dir;
      if (next < 0 || next > last) break;
      tijd = weg + Math.abs(stops[next].s - stops[idx].s) / vgem;
      idx = next;
    }
  }
  rijen.sort((a, b) => a.tijd - b.tijd || a.lijn.localeCompare(b.lijn));
  return rijen.slice(0, aantal);
}

export function tijdLabel(s) {
  const m = Math.floor((((s % 86400) + 86400) % 86400) / 60);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// De omroep als tekst: kort, vriendelijk, zonder echte merken.
export function omroep(rij, nu) {
  const wacht = rij.tijd - nu;
  const wat = `${VERVOERDER}-trein naar ${rij.richting}`;
  if (rij.vertraging >= 60) return `Let op: de ${wat} van ${tijdLabel(rij.plan)} vertrekt ongeveer ${Math.round(rij.vertraging / 60)} minuten later van spoor ${rij.spoor}. ${rij.reden}.`;
  if (wacht <= 0) return `De ${wat} van spoor ${rij.spoor} vertrekt nu. Deuren sluiten.`;
  if (wacht <= 90) return `De ${wat} staat klaar op spoor ${rij.spoor}. Vertrek over ${Math.max(1, Math.round(wacht / 60))} minuut.`;
  return `Op spoor ${rij.spoor} vertrekt om ${tijdLabel(rij.tijd)} de ${wat}.`;
}

// Hoeveel reizigers staan er op het perron? Een station met veel lijnen is drukker, de spits ook;
// vlak voor een vertrek vult het perron zich. Geeft een geheel aantal 0..max.
export function perronDrukte(aantalLijnen, uur, wachtSeconden, { max = 14 } = {}) {
  const spits = RIJ.piek.some(([a, b]) => uur >= a && uur < b) ? 1 : uur >= 21 || uur < 6 ? 0.15 : 0.5;
  const naderend = wachtSeconden < 0 ? 0.3 : Math.max(0.4, Math.min(1, 1.2 - wachtSeconden / 600));
  return Math.max(0, Math.min(max, Math.round((1 + Math.min(aantalLijnen, 4)) * 1.6 * spits * naderend)));
}

// --- spoorbomen -----------------------------------------------------------------------------------

export const BOOM = { voor: 28, na: 8, dicht: 5 }; // s: sluiten voor de trein, openen na de trein, hoeveel s draaien duurt

// Staat van een overweg: de komende doorgangstijden (s na middernacht) van treinen op dit punt.
// Geeft { dicht (0..1 hoe ver de boom is), sein ('rood' | 'uit'), bel } en is deterministisch.
export function boomStand(doorgangen, nu) {
  let dicht = 0;
  for (const t of doorgangen) {
    const sluit = t - BOOM.voor, open = t + BOOM.na;
    if (nu < sluit || nu > open + BOOM.dicht) continue;
    const dalen = Math.min(1, (nu - sluit) / BOOM.dicht);
    const stijgen = nu > open ? 1 - Math.min(1, (nu - open) / BOOM.dicht) : 1;
    dicht = Math.max(dicht, Math.min(dalen, stijgen));
  }
  return { dicht, sein: dicht > 0 ? 'rood' : 'uit', bel: dicht > 0 };
}

// Doorgangen over een overweg op afstand `s` van het begin van de lijn voor één dag.
export function doorgangenOverweg(route, s, dag, vanaf = 0, tot = 86400) {
  const out = [];
  for (const dir of [1, -1]) {
    const rt = rijtijden(route, dir);
    // tijd vanaf het beginstation tot s (lineair tussen de stations)
    let off = null;
    for (let i = 1; i < rt.length; i++) {
      const a = rt[i - 1], b = rt[i];
      const lo = Math.min(a.s, b.s), hi = Math.max(a.s, b.s);
      if (s >= lo && s <= hi && hi > lo) { off = a.weg + ((s - a.s) / (b.s - a.s)) * (b.aan - a.weg); break; }
    }
    if (off === null) continue;
    for (const rit of ritten(route, dir)) {
      const t = rit.start + off + vertraging(route, rit, dag);
      if (t >= vanaf - BOOM.voor && t <= tot + BOOM.na) out.push(t);
    }
  }
  return out.sort((a, b) => a - b);
}
