// Eindkaart met impact (wens van de eigenaar 21-11): het gele vlak van "Missie geslaagd" slaat in beeld,
// de losse onderdelen komen gestaffeld binnen, de beloning telt hoorbaar op en een glans sluit af.
// Dit bestand is alleen de pure planning (geen DOM, geen audio): bigmoment.js leest het plan en zet er
// klassen, CSS-variabelen en timers van; de tests staan in scripts/eindkaartimpact_test.mjs.
//
// Design System 3: elke stap duurt hooguit --ds-m-max (250 ms) en elke vertraging is een veelvoud van
// --ds-m-snel (120 ms), dus "Beweging beperken" en Rustig drukwerk (tokens op 0) nemen alles mee. Bij
// die standen maakt de aanroeper geen plan met impact maar laat hij de snelle fade staan (planIntro
// met rustig: true). De hele intro duurt hooguit 1,6 s; overslaan toont direct de eindstand.
//
// Samen spelen (#429): de eindkaart is lokaal per speler (showBigMoment filtert al op gast of
// deelnemer); dit plan wordt alleen gemaakt waar de kaart getoond wordt, dus er speelt niets dubbel.

export const SNEL_MS = 120;        // --ds-m-snel: de maat van de staffeling
export const STAP_MS = 250;        // --ds-m-max: de langste duur van één onderdeel
export const MAX_TOTAAL_MS = 1600; // de hele intro, vlak tot en met de glans
export const TELLER_MS = 600;      // de teller loopt hierover
export const MAX_TIKKEN = 8;       // oplopende tikjes van de teller, nooit een ratel
export const MIN_TIK_MS = 60;      // twee tikjes liggen minstens zo ver uit elkaar

const eenheden = (ms) => Math.round((ms / SNEL_MS) * 100) / 100;

// Teller: [{ t, waarde, tik }] met t in ms vanaf het begin van de teller. Ease-out (kubisch), de laatste
// waarde is altijd het doel, een kleine som krijgt minder stappen, dubbele waarden vallen weg.
export function tellerStappen(doel, duur = TELLER_MS, maxTikken = MAX_TIKKEN) {
  const d = Number.isFinite(doel) ? Math.max(0, Math.round(doel)) : 0;
  if (d === 0) return [];
  const n = Math.max(1, Math.min(maxTikken, d, Math.floor(duur / MIN_TIK_MS)));
  const uit = [];
  for (let i = 1; i <= n; i++) {
    const p = i / n;
    const waarde = i === n ? d : Math.round(d * (1 - Math.pow(1 - p, 3)));
    if (uit.length && uit[uit.length - 1].waarde === waarde) continue;
    uit.push({ t: Math.round(duur * p), waarde, tik: uit.length });
  }
  return uit;
}

// Het plan. opts: { soort: 'geslaagd'|'mislukt', beloning (getal of null), tijd (bool), sterren (0..5 of null),
// rustig (Beweging beperken of Rustig drukwerk) }.
// Geeft { impact, totaal, vlak, onderdelen: [{ naam, at, eenh }], teller, sterren: [{ at, eenh }], glans, schok,
// geluid: [{ at, naam, i? }] } terug; alle tijden in ms vanaf het begin van de intro.
export function planIntro(opts = {}) {
  const soort = opts.soort === 'mislukt' ? 'mislukt' : 'geslaagd';
  const geslaagd = soort === 'geslaagd';
  const beloning = Number.isFinite(opts.beloning) && opts.beloning > 0 ? Math.round(opts.beloning) : 0;
  const nSterren = Number.isFinite(opts.sterren) ? Math.max(0, Math.min(5, Math.round(opts.sterren))) : 0;
  if (opts.rustig) {
    // geen beweging, geen staffeling: de snelle fade van de tokens en één inslag-geluid, direct de eindstand
    return { impact: false, totaal: 0, vlak: { at: 0 }, onderdelen: [], teller: null, sterren: [], glans: null, schok: null, geluid: [{ at: 0, naam: geslaagd ? 'inslag' : 'dof' }] };
  }
  const at = (k) => Math.round(k * SNEL_MS);
  const onderdelen = [];
  let k = 2;
  onderdelen.push({ naam: 'klein', at: at(k) }); k += 1;
  onderdelen.push({ naam: 'kop', at: at(k) }); k += 1;
  onderdelen.push({ naam: 'regel', at: at(k) }); k += 1;
  const metaStart = at(k);
  if (beloning) { onderdelen.push({ naam: 'beloning', at: at(k) }); k += 1; }
  if (opts.tijd) { onderdelen.push({ naam: 'tijd', at: at(k) }); k += 1; }
  const teller = beloning ? { at: metaStart, duur: TELLER_MS, stappen: tellerStappen(beloning) } : null;
  const sterren = [];
  const sterStart = at(k);
  for (let i = 0; i < nSterren; i++) sterren.push({ at: sterStart + i * SNEL_MS });
  const eindeOnderdelen = Math.max(
    onderdelen.length ? onderdelen[onderdelen.length - 1].at + STAP_MS : 0,
    teller ? teller.at + teller.duur : 0,
    sterren.length ? sterren[sterren.length - 1].at + STAP_MS : 0,
    STAP_MS,
  );
  const glansAt = geslaagd ? eindeOnderdelen : null;
  let totaal = glansAt != null ? glansAt + STAP_MS : eindeOnderdelen;
  const schok = { at: 150, duur: SNEL_MS };
  const geluid = [{ at: 0, naam: 'whoosh' }, { at: schok.at, naam: geslaagd ? 'inslag' : 'dof' }];
  if (teller) {
    for (const s of teller.stappen) {
      const kaal = s.tik === teller.stappen.length - 1;
      geluid.push({ at: teller.at + s.t, naam: kaal ? 'munt' : 'tik', i: s.tik });
    }
  }
  sterren.forEach((s, i) => geluid.push({ at: s.at + 100, naam: 'ster', i }));
  if (glansAt != null) geluid.push({ at: glansAt, naam: 'stempel' });
  // te lang (veel sterren)? Dan alles evenredig korter, zodat de grens van 1,6 s hard blijft
  if (totaal > MAX_TOTAAL_MS) {
    const f = MAX_TOTAAL_MS / totaal;
    const kort = (x) => Math.round(x * f);
    for (const o of onderdelen) o.at = kort(o.at);
    for (const s of sterren) s.at = kort(s.at);
    if (teller) { teller.at = kort(teller.at); teller.duur = kort(teller.duur); }
    for (const g of geluid) g.at = kort(g.at);
    totaal = MAX_TOTAAL_MS;
  }
  geluid.sort((a, b) => a.at - b.at);
  for (const o of onderdelen) o.eenh = eenheden(o.at);
  for (const s of sterren) s.eenh = eenheden(s.at);
  return {
    impact: true, totaal, vlak: { at: 0 }, onderdelen, teller, sterren,
    glans: glansAt != null ? { at: Math.min(glansAt, totaal - STAP_MS), eenh: eenheden(Math.min(glansAt, totaal - STAP_MS)) } : null,
    schok: { ...schok, eenh: eenheden(schok.at) }, geluid,
  };
}

// Is dit een toets of aanraking die de intro moet overslaan? Een herhaalde toets (vastgehouden) niet.
export function slaatOver(ev = {}) {
  if (ev.type === 'keydown') return !ev.repeat;
  return ev.type === 'pointerdown' || ev.type === 'mousedown' || ev.type === 'touchstart';
}
