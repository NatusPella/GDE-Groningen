// De variatiematrix van de proefspeler (docs/PROEFSPELER.md, "Variatie"). Orthogonaal in plaats van alles op alles:
//   matrixPlan({ missies, modus, ... })   een lijst runs per missie: rook (basis + een paar bewezen verstoringen), pairwise (elk waardepaar van
//                                         twee assen komt minstens een keer voor) of volledig (alle combinaties, begrensd)
//   runArgsVoor(run)                      de run.mjs-opties van een run
//   staatVergelijk(voor, na)              toestandsvergelijking voor save/load midden in een stap (doel, voortgang, geld, gezocht, voertuig)
//   chaosBevindingen(events)              soft-locks en staatbreuken uit de 'chaos'-regels die de page-kant logt
// De page-kant (detect/page.js `chaos`) voert de verstoringen uit; scripts/bot/run.mjs geeft ze door als --klok, --weer, --scherm, --invoer, --chaos.
// Wat alleen in het echte spel te testen is, staat in `echt` per as of waarde: de plan-kant markeert het, de run slaat het niet over.

// as -> { waarden, standaard (de basis), args(waarde) -> run.mjs-opties, waar: 'run' | 'page' | 'echt', echt?: { waarde: reden } }
export const AS = {
  seed: { waarden: [1, 2, 3], standaard: 1, args: (v) => [`--seed=${v}`], waar: 'run' },
  tijd: { waarden: ['dag', 'nacht'], standaard: 'dag', args: (v) => [`--klok=${v === 'nacht' ? 22 : 12}`], waar: 'page' },
  weer: { waarden: ['helder', 'regenbui', 'mist'], standaard: 'helder', args: (v) => (v === 'helder' ? [] : [`--weer=${v}`]), waar: 'page', echt: { mist: 'mist komt uit de weerstand van de provincie; alleen in het echte spel te beoordelen' } },
  voertuig: { waarden: ['standaard', 'quad', 'limo', 'frituur'], standaard: 'standaard', args: (v) => (v === 'standaard' ? [] : [`--stage-vehicle=${v}`]), waar: 'run' },
  scherm: { waarden: ['1280x720', '1920x1080', '800x360'], standaard: '1280x720', args: (v) => [`--scherm=${v}`], waar: 'run', echt: { '800x360': 'alleen de venstergrootte: aanraking en de mobiele indeling zijn alleen op een toestel te beoordelen' } },
  invoer: { waarden: ['toetsenbord', 'controller'], standaard: 'toetsenbord', args: (v) => (v === 'controller' ? ['--invoer=controller'] : []), waar: 'page', echt: { controller: 'de prompts wisselen (pad-active); een echte controller met stickdrift niet' } },
  chaos: { waarden: ['geen', 'sterf', 'voertuig-uit', 'gebied-uit', 'stop-herstart', 'save-load', 'snelreis'], standaard: 'geen', args: (v) => (v === 'geen' ? [] : v === 'stop-herstart' ? ['--annuleer=20'] : [`--chaos=${v}:20`]), waar: 'page', echt: { 'gebied-uit': 'een echte speler loopt weg; de bot springt 600 m weg (een benadering van het gebied verlaten)' } },
};

// Missies waar een as niets zinnigs doet: de run slaat die as over (de standaardwaarde blijft staan).
export const UITSLUIT = {
  M11: ['voertuig', 'chaos:voertuig-uit'],  // skûtsje: geen uitstappen op open water, het voertuig is de boot
  M15: ['voertuig', 'chaos:voertuig-uit', 'chaos:gebied-uit'],   // vliegtuig
  M17: ['voertuig', 'chaos:voertuig-uit'],  // vaarroute
  M01: ['chaos:gebied-uit'],
};

const heeft = (m, as, w) => (UITSLUIT[m] || []).includes(as) || (UITSLUIT[m] || []).includes(`${as}:${w}`);

// Welke assen mee doen, en hun waarden na de uitsluitingen van deze missie
export function assenVoor(missie, { assen = null, seeds = null } = {}) {
  const uit = {};
  for (const [naam, a] of Object.entries(AS)) {
    if (assen && !assen.includes(naam)) continue;
    let w = [...a.waarden];
    if (naam === 'seed' && seeds && seeds.length) w = seeds.map(Number);
    w = w.filter((x) => !heeft(missie, naam, x) || x === a.standaard);
    if (w.length > 1 || naam === 'seed') uit[naam] = w;
  }
  return uit;
}

// pairwise: een gretig algoritme (AETG-achtig): kies steeds de combinatie die de meeste nog niet gedekte paren dekt, tot alle paren gedekt zijn.
// Deterministisch: kandidaten komen in vaste volgorde, gelijke stand wint de eerste. Voor <= 8 assen met <= 7 waarden snel genoeg.
export function pairwise(assen) {
  const namen = Object.keys(assen);
  if (namen.length < 2) return namen.length ? assen[namen[0]].map((v) => ({ [namen[0]]: v })) : [{}];
  const open = new Set();
  for (let i = 0; i < namen.length; i++) for (let j = i + 1; j < namen.length; j++) for (const a of assen[namen[i]]) for (const b of assen[namen[j]]) open.add(`${namen[i]}=${a}|${namen[j]}=${b}`);
  const rijen = [];
  const winst = (r) => { let n = 0; for (let i = 0; i < namen.length; i++) for (let j = i + 1; j < namen.length; j++) if (open.has(`${namen[i]}=${r[namen[i]]}|${namen[j]}=${r[namen[j]]}`)) n++; return n; };
  while (open.size) {
    // begin bij het eerste open paar en vul de overige assen gretig aan
    const [eerste] = open; const [pa, pb] = eerste.split('|').map((x) => x.split('='));
    const r = {}; const waardeVan = (naam, s) => assen[naam].find((v) => String(v) === s);
    r[pa[0]] = waardeVan(pa[0], pa[1]); r[pb[0]] = waardeVan(pb[0], pb[1]);
    for (const naam of namen) {
      if (naam in r) continue;
      let beste = assen[naam][0], bw = -1;
      for (const v of assen[naam]) { const w = winst({ ...r, [naam]: v, ...Object.fromEntries(namen.filter((n) => !(n in r) && n !== naam).map((n) => [n, assen[n][0]])) }); if (w > bw) { bw = w; beste = v; } }
      r[naam] = beste;
    }
    for (let i = 0; i < namen.length; i++) for (let j = i + 1; j < namen.length; j++) open.delete(`${namen[i]}=${r[namen[i]]}|${namen[j]}=${r[namen[j]]}`);
    rijen.push(Object.fromEntries(namen.map((n) => [n, r[n]])));
  }
  return rijen;
}

export function volledig(assen, max = 500) {
  let rijen = [{}];
  for (const [naam, w] of Object.entries(assen)) { rijen = rijen.flatMap((r) => w.map((v) => ({ ...r, [naam]: v }))); if (rijen.length > max) throw new Error(`volledige matrix te groot (${rijen.length} > ${max}); gebruik --matrix=pairwise`); }
  return rijen;
}

// Rook: de basis, dan per as met een bewezen soft-lock-risico een run (nacht, save-load, sterf), elk met standaardwaarden voor de rest.
export const ROOK = [{ tijd: 'nacht' }, { chaos: 'save-load' }, { chaos: 'sterf' }];

export const MODI = ['rook', 'pairwise', 'volledig'];

export function matrixPlan({ missies = [], modus = 'rook', assen = null, seeds = null, max = 500 } = {}) {
  if (!MODI.includes(modus)) throw new Error(`onbekende matrixmodus: ${modus} (kies ${MODI.join(', ')})`);
  const uit = [];
  for (const missie of missies) {
    const a = assenVoor(missie, { assen, seeds });
    const basis = Object.fromEntries(Object.entries(AS).map(([n, d]) => [n, n === 'seed' ? (a.seed || [d.standaard])[0] : d.standaard]));
    let rijen;
    if (modus === 'rook') rijen = [{}, ...ROOK.filter((r) => Object.entries(r).every(([n, v]) => a[n] && a[n].includes(v)))];
    else if (modus === 'pairwise') rijen = pairwise(a);
    else rijen = volledig(a, max);
    // dubbele rijen weg (na samenvoegen met de basis)
    const gezien = new Set();
    for (const r of rijen) {
      const p = { ...basis, ...r }, sleutel = JSON.stringify(p);
      if (gezien.has(sleutel)) continue; gezien.add(sleutel);
      const echt = Object.entries(p).filter(([n, v]) => AS[n].echt && AS[n].echt[v]).map(([n, v]) => ({ as: n, waarde: v, reden: AS[n].echt[v] }));
      const afwijking = Object.entries(p).filter(([n, v]) => v !== basis[n] || (n === 'seed' && v !== AS.seed.standaard)).map(([n, v]) => `${n}-${v}`);
      uit.push({ missie, nr: uit.filter((q) => q.missie === missie).length + 1, perturbaties: p, naam: afwijking.length ? afwijking.join('_') : 'basis', echt });
    }
  }
  return uit.map((r) => ({ ...r, args: runArgsVoor(r), page: Object.entries(r.perturbaties).filter(([n, v]) => AS[n].waar === 'page' && v !== AS[n].standaard).map(([n]) => n) }));
}

export function runArgsVoor(run) {
  const uit = [];
  for (const [n, v] of Object.entries(run.perturbaties)) uit.push(...(AS[n].args(v) || []));
  return uit;
}

// Alle waardeparen die het plan dekt (voor de test en voor 'wat is gedekt' in de index)
export function gedekteParen(rijen, namen = null) {
  const s = new Set(), n = namen || Object.keys(rijen[0] || {});
  for (const r of rijen) for (let i = 0; i < n.length; i++) for (let j = i + 1; j < n.length; j++) s.add(`${n[i]}=${r[n[i]]}|${n[j]}=${r[n[j]]}`);
  return s;
}

// --- toestandsvergelijking en chaos-oordeel ---------------------------------------------------------------------

// De toestand die de page-kant opneemt: { stap, fase, doelNaam, doelX, doelY, voortgangDone, voortgangTotal, geld, gezocht, voertuig, missieActief, fails }
// Vergelijkt voor en na (save/load): geld en gezocht moeten gelijk zijn, de stap en het doel idem; het voertuig mag alleen veranderen als de save dat zo bewaarde.
export function staatVergelijk(voor, na, { doelM = 15 } = {}) {
  const v = [], eis = (veld, a, b) => { if (a !== b) v.push({ veld, voor: a, na: b }); };
  if (!voor || !na) return { ok: false, verschillen: [{ veld: 'staat', voor: !!voor, na: !!na }] };
  eis('stap', voor.stap, na.stap);
  eis('fase', voor.fase, na.fase);
  eis('doelNaam', voor.doelNaam || '', na.doelNaam || '');
  if (Number.isFinite(voor.doelX) && Number.isFinite(na.doelX) && Math.hypot(voor.doelX - na.doelX, voor.doelY - na.doelY) > doelM) v.push({ veld: 'doelplek', voor: [voor.doelX, voor.doelY], na: [na.doelX, na.doelY] });
  eis('voortgangDone', voor.voortgangDone, na.voortgangDone);
  eis('voortgangTotal', voor.voortgangTotal, na.voortgangTotal);
  if (Number.isFinite(voor.geld) && Number.isFinite(na.geld) && Math.abs(voor.geld - na.geld) > 0.5) v.push({ veld: 'geld', voor: voor.geld, na: na.geld });
  eis('gezocht', voor.gezocht || 0, na.gezocht || 0);
  eis('voertuig', voor.voertuig || 'te voet', na.voertuig || 'te voet');
  eis('missieActief', !!voor.missieActief, !!na.missieActief);
  return { ok: v.length === 0, verschillen: v };
}

const CH_ERNST = { 'save-load': 'blokkeert', sterf: 'blokkeert', 'voertuig-uit': 'verwarrend', 'gebied-uit': 'verwarrend', 'stop-herstart': 'blokkeert', snelreis: 'cosmetisch' };

// Het oordeel over de 'chaos'-regels: { type: 'chaos', soort, t, stap, plek, voor, na, geweigerd?, reden?, ok? } en 'chaos-herstel' ({ soort, t, na }).
//   save-load      staatbreuk als voor en na verschillen
//   sterf          soft-lock als de speler na het sterven niet binnen de tijd weer speelt (geen herstel)
//   voertuig-uit   het doel verdween (geen target na het uitstappen) of de missie liep vast
//   gebied-uit     idem
//   stop-herstart  het 'annuleer'-regel van de bot zegt ok: false
//   snelreis       alleen een bevinding als de reis midden in een missie wel lukte (blockedReason zegt 'Niet tijdens een missie of filmpje')
export function chaosBevindingen(events) {
  const uit = [];
  const klaar = events.filter((e) => e.type === 'chaos-herstel');
  const einde = events.filter((e) => e.type === 'step' && e.event === 'end');
  for (const e of events.filter((q) => q.type === 'chaos')) {
    const basis = { soort: 'chaos', stap: e.stap || (e.voor && e.voor.stap) || '', plek: e.plek || null, t: e.t, tekst: e.tekstDoel || '' };
    const f = (type, ernst, bewijs) => uit.push({ ...basis, type, ernst: ernst || CH_ERNST[e.soort] || 'verwarrend', bewijs: { chaos: e.soort, ...bewijs } });
    if (e.soort === 'save-load') {
      if (e.fout) f('chaos-save-load-mislukt', 'blokkeert', { fout: e.fout });
      else { const r = staatVergelijk(e.voor, e.na); if (!r.ok) f('chaos-staatbreuk', 'blokkeert', { verschillen: r.verschillen }); }
    } else if (e.soort === 'snelreis') {
      if (e.geweigerd === false && e.voor && e.voor.missieActief) f('chaos-snelreis-in-missie', 'verwarrend', { reden: 'de snelreis lukte midden in een actieve missie' });
    } else if (e.soort === 'voertuig-uit' || e.soort === 'gebied-uit') {
      if (e.na && !e.na.doelNaam && e.voor && e.voor.doelNaam && e.na.missieActief) f('chaos-doel-weg', null, { voor: e.voor.doelNaam, uitleg: 'na de verstoring heeft de missie geen doel meer' });
    }
    const herstel = klaar.some((q) => q.soort === e.soort && q.t >= e.t) || einde.some((q) => q.t >= e.t) || e.soort === 'snelreis' || e.soort === 'save-load' && e.fout;
    if (!herstel && e.soort !== 'snelreis') f('chaos-softlock', 'blokkeert', { uitleg: `na '${e.soort}' kwam de stap niet meer vooruit (geen herstel, geen einde van de stap)`, na: e.na || null });
  }
  for (const a of events.filter((q) => q.type === 'annuleer' && q.ok === false)) {
    uit.push({ soort: 'chaos', type: 'chaos-stop-herstart', ernst: 'blokkeert', stap: (a.voor && a.voor.id) || '', plek: null, t: a.t, tekst: '', bewijs: { chaos: 'stop-herstart', voor: a.voor, na: a.na, vraagZichtbaar: a.vraagZichtbaar } });
  }
  return uit;
}
