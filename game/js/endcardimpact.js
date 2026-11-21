// Eindkaart met impact (wens van de eigenaar 21-11): het gele vlak van "Missie geslaagd" slaat in beeld,
// de losse onderdelen komen gestaffeld binnen, de beloning telt hoorbaar op en een glans sluit af.
// Dit bestand is alleen de pure planning (geen DOM, geen audio): bigmoment.js leest het plan en zet er
// klassen, CSS-variabelen en timers van; de tests staan in scripts/endcardimpact_test.mjs.
//
// Design System 3: elke stap duurt hooguit --ds-m-max (250 ms) en elke vertraging is een veelvoud van
// --ds-m-snel (120 ms), dus "Beweging beperken" en Rustig drukwerk (tokens op 0) nemen alles mee. Bij
// die standen maakt de aanroeper geen plan met impact maar laat hij de snelle fade staan (planIntro
// met rustig: true). De hele intro duurt hooguit 1,6 s; overslaan toont direct de eindstand.
//
// Samen spelen (#429): de eindkaart is lokaal per speler (showBigMoment filtert al op gast of
// deelnemer); dit plan wordt alleen gemaakt waar de kaart getoond wordt, dus er speelt niets dubbel.

export const FAST_MS = 120;        // --ds-m-snel: de maat van de staffeling
export const STEP_MS = 250;        // --ds-m-max: de langste duur van één onderdeel
export const MAX_TOTAAL_MS = 1600; // de hele intro, vlak tot en met de glans
const TELLER_MS = 600;      // de teller loopt hierover
export const MAX_TIKKEN = 8;       // oplopende tikjes van de teller, nooit een ratel
const MIN_TIK_MS = 60;      // twee tikjes liggen minstens zo ver uit elkaar

const eenheden = (ms) => Math.round((ms / FAST_MS) * 100) / 100;

// Teller: [{ t, waarde, tik }] met t in ms vanaf het begin van de teller. Ease-out (kubisch), de laatste
// waarde is altijd het doel, een kleine som krijgt minder stappen, dubbele waarden vallen weg.
export function counterSteps(doel, duur = TELLER_MS, maxTikken = MAX_TIKKEN) {
  const d = Number.isFinite(doel) ? Math.max(0, Math.round(doel)) : 0;
  if (d === 0) return [];
  const n = Math.max(1, Math.min(maxTikken, d, Math.floor(duur / MIN_TIK_MS)));
  const uit = [];
  for (let i = 1; i <= n; i++) {
    const p = i / n;
    const value = i === n ? d : Math.round(d * (1 - Math.pow(1 - p, 3)));
    if (uit.length && uit[uit.length - 1].waarde === value) continue;
    uit.push({ t: Math.round(duur * p), waarde: value, tik: uit.length });
  }
  return uit;
}

// Het plan. opts: { soort: 'geslaagd'|'mislukt', beloning (getal of null), tijd (bool), sterren (0..5 of null),
// rustig (Beweging beperken of Rustig drukwerk) }.
// Geeft { impact, totaal, vlak, onderdelen: [{ naam, at, eenh }], teller, sterren: [{ at, eenh }], glans, schok,
// geluid: [{ at, naam, i? }] } terug; alle tijden in ms vanaf het begin van de intro.
export function planIntro(opts = {}) {
  const kind = opts.soort === 'mislukt' ? 'mislukt' : 'geslaagd';
  const passed = kind === 'geslaagd';
  const beloning = Number.isFinite(opts.beloning) && opts.beloning > 0 ? Math.round(opts.beloning) : 0;
  const nSterren = Number.isFinite(opts.sterren) ? Math.max(0, Math.min(5, Math.round(opts.sterren))) : 0;
  if (opts.rustig) {
    // geen beweging, geen staffeling: de snelle fade van de tokens en één inslag-geluid, direct de eindstand
    return { impact: false, totaal: 0, vlak: { at: 0 }, onderdelen: [], teller: null, sterren: [], glans: null, schok: null, geluid: [{ at: 0, naam: passed ? 'inslag' : 'dof' }] };
  }
  const at = (k) => Math.round(k * FAST_MS);
  const parts = [];
  let k = 2;
  parts.push({ naam: 'klein', at: at(k) }); k += 1;
  parts.push({ naam: 'kop', at: at(k) }); k += 1;
  parts.push({ naam: 'regel', at: at(k) }); k += 1;
  const metaFrom = at(k);
  if (beloning) { parts.push({ naam: 'beloning', at: at(k) }); k += 1; }
  if (opts.tijd) { parts.push({ naam: 'tijd', at: at(k) }); k += 1; }
  const teller = beloning ? { at: metaFrom, duur: TELLER_MS, stappen: counterSteps(beloning) } : null;
  const sterren = [];
  const sterFrom = at(k);
  for (let i = 0; i < nSterren; i++) sterren.push({ at: sterFrom + i * FAST_MS });
  const endOfParts = Math.max(
    parts.length ? parts[parts.length - 1].at + STEP_MS : 0,
    teller ? teller.at + teller.duur : 0,
    sterren.length ? sterren[sterren.length - 1].at + STEP_MS : 0,
    STEP_MS,
  );
  const glansAt = passed ? endOfParts : null;
  let totaal = glansAt != null ? glansAt + STEP_MS : endOfParts;
  const schok = { at: 150, duur: FAST_MS };
  const sound = [{ at: 0, naam: 'whoosh' }, { at: schok.at, naam: passed ? 'inslag' : 'dof' }];
  if (teller) {
    for (const s of teller.stappen) {
      const kaal = s.tik === teller.stappen.length - 1;
      sound.push({ at: teller.at + s.t, naam: kaal ? 'munt' : 'tik', i: s.tik });
    }
  }
  sterren.forEach((s, i) => sound.push({ at: s.at + 100, naam: 'ster', i }));
  if (glansAt != null) sound.push({ at: glansAt, naam: 'stempel' });
  // te lang (veel sterren)? Dan alles evenredig korter, zodat de grens van 1,6 s hard blijft
  if (totaal > MAX_TOTAAL_MS) {
    const f = MAX_TOTAAL_MS / totaal;
    const kort = (x) => Math.round(x * f);
    for (const o of parts) o.at = kort(o.at);
    for (const s of sterren) s.at = kort(s.at);
    if (teller) { teller.at = kort(teller.at); teller.duur = kort(teller.duur); }
    for (const g of sound) g.at = kort(g.at);
    totaal = MAX_TOTAAL_MS;
  }
  sound.sort((a, b) => a.at - b.at);
  for (const o of parts) o.eenh = eenheden(o.at);
  for (const s of sterren) s.eenh = eenheden(s.at);
  return {
    impact: true, totaal, vlak: { at: 0 }, onderdelen: parts, teller, sterren,
    glans: glansAt != null ? { at: Math.min(glansAt, totaal - STEP_MS), eenh: eenheden(Math.min(glansAt, totaal - STEP_MS)) } : null,
    schok: { ...schok, eenh: eenheden(schok.at) }, geluid: sound,
  };
}

// Is dit een toets of aanraking die de intro moet overslaan? Een herhaalde toets (vastgehouden) niet.
export function isSkipEvent(ev = {}) {
  if (ev.type === 'keydown') return !ev.repeat;
  return ev.type === 'pointerdown' || ev.type === 'mousedown' || ev.type === 'touchstart';
}
