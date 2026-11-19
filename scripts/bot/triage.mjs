// Triage en reproduceerbaarheid van de proefspeler (docs/PROEFSPELER.md, "Triage"): van losse detectorbevindingen naar clusters met een
// handtekening, een ernst (frequentie x impact), het bewijs, een REPRO-commando en een issue-voorstel in de stijl van het project.
// De coordinator maakt de issues; dit bestand schrijft alleen voorstellen (bevindingen.json en issues.md).
//   handtekening(b, missie)          missie|stap|type|plek
//   samenvattingBevindingen(...)     bevindingen uit samenvatting en voortgang (niet geslaagd, vast, dode tijd, traag, faalplek)
//   triage(runs)                     clusters over seeds en runs, gesorteerd op score
//   reproVoor(run, c)                het commando (replay of de proef.mjs-regel)
//   issueVoorstel(c)                 { titel, labels, body } in het Nederlands
import { detecteer } from './detect/index.mjs';
import { chaosBevindingen } from './matrix.mjs';
import { goudVergelijk } from './goud.mjs';
import { faalHeatmap } from './voortgang.mjs';

export const IMPACT = { blokkeert: 3, verwarrend: 2, cosmetisch: 1 };
export const IMPACT_LABEL = { 3: 'impact-hoog', 2: 'impact-midden', 1: 'impact-laag' };
const r1 = (v) => Math.round(v * 10) / 10;

const normTekst = (t) => String(t || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 48);
export function plekSleutel(b, cel = 50) {
  if (Array.isArray(b.plek) && Number.isFinite(b.plek[0]) && Number.isFinite(b.plek[1]) && !/^(lees|dom|console|goud|beeld-egaal)/.test(b.type)) return `${Math.floor(b.plek[0] / cel)},${Math.floor(b.plek[1] / cel)}`;
  if (b.type.startsWith('console')) return b.sig || normTekst(b.tekst);
  if (b.type.startsWith('dom')) return (b.bewijs && b.bewijs.sel ? String(b.bewijs.sel).slice(0, 40) : '') + '|' + normTekst(b.tekst).slice(0, 24);
  if (b.type.startsWith('lees')) return normTekst(b.tekst);
  if (b.type.startsWith('goud') || b.type.startsWith('beeld')) return b.bewijs && b.bewijs.sleutel ? b.bewijs.sleutel : (b.shot || '').replace(/-oog\d+/, '');
  return normTekst(b.tekst);
}
// de handtekening: missie, stap, type en plek. Seed en variant staan er bewust niet in: dat is wat samengevoegd wordt
export const handtekening = (b, missie = '') => [missie || b.missie || '', b.stap || '', b.type, plekSleutel(b)].join('|');

// Bevindingen uit samenvatting (proefbundel.mjs) en voortgang (voortgang.mjs): wat de bot zelf als uitkomst heeft
export function samenvattingBevindingen(sam, analyse, { dodeS = 30 } = {}) {
  const uit = [], stap = sam.missie || '', b = (type, ernst, tekst, bewijs, plek = null, t = null) => uit.push({ type, soort: 'voortgang', ernst, stap, plek, t, tekst, bewijs });
  if (!sam.geslaagd) b('voortgang-niet-geslaagd', 'blokkeert', `${sam.missie} niet geslaagd (${sam.uitkomst}${sam.reden ? ': ' + sam.reden : ''})`, { uitkomst: sam.uitkomst, reden: sam.reden, pogingen: sam.pogingen });
  if (sam.cheats > 0) b('voortgang-cheat-nodig', 'blokkeert', `de run had ${sam.cheats} cheat(s) nodig`, { cheats: sam.cheats });
  for (const v of sam.vastgezetMomenten || []) b('voortgang-vast', 'blokkeert', `vast bij ${v.stap || stap}`, { trede: v.trede, stilS: v.stilS, afstand: v.afstand }, [v.x, v.y], v.t);
  if (analyse) {
    for (const d of analyse.dodeTijd) b('voortgang-dode-tijd', d.duurS >= dodeS * 3 ? 'verwarrend' : 'cosmetisch', `${d.duurS} s zonder voortgang (${d.redenen.join(', ')})`, { duurS: d.duurS, redenen: d.redenen, vanT: d.vanT, totT: d.totT }, d.plek, d.vanT);
    if (analyse.oordeel === 'veel langer dan verwacht') b('voortgang-traag', 'verwarrend', `duur ${analyse.duurS} s tegen ${analyse.verwachtS} s verwacht`, { duurS: analyse.duurS, verwachtS: analyse.verwachtS, verhouding: analyse.verhouding });
    for (const f of analyse.mislukkingen) b('voortgang-mislukt', 'verwarrend', `mislukt bij ${f.fase || '?'}: ${f.oorzaak}`, { oorzaak: f.oorzaak, fase: f.fase }, f.plek, f.t);
  }
  if (sam.schermenZonderZichtbaarDoel >= 3) b('voortgang-doel-niet-in-beeld', 'verwarrend', `${sam.schermenZonderZichtbaarDoel} oogmomenten met het doelwaypoint buiten beeld of achter een gebouw`, { nrs: sam.schermenZonderDoelNrs });
  return uit;
}

// Alle bevindingen van één run: detectoren, chaos, goud, en de uitkomst van de run zelf. run: { missie, seed, naam, dir, events, sam, analyse, goudRoot }
export function bevindingenVoorRun(run, { goudRoot = null } = {}) {
  const lijst = [];
  const d = detecteer(run.events, { map: run.dir || null });
  lijst.push(...d.bevindingen, ...chaosBevindingen(run.events));
  if (goudRoot && run.dir) { try { lijst.push(...goudVergelijk(run.dir, run.events, goudRoot, { missie: run.missie })); } catch (e) { /* geen goud */ } }
  if (run.sam) lijst.push(...samenvattingBevindingen(run.sam, run.analyse || null));
  return lijst.map((b, i) => ({ ...b, missie: run.missie, seed: run.seed, run: run.naam || '', _i: i }));
}

// De drie soorten regels waar een bevinding op wijst: het beeld, de eventregel (tijd en soort) en de plek
function bewijsVan(b, run) {
  const regel = b.t != null ? run.events.find((e) => Number.isFinite(e.t) && Math.abs(e.t - b.t) < 0.6 && e.type !== 'oog') : null;
  return { beeld: b.shot || '', eventTijd: b.t ?? null, eventType: regel ? regel.type : (b.soort || ''), seed: run.seed, run: run.naam || '', plek: b.plek || null };
}

export function reproVoor(run, c = {}) {
  const dir = run.dir ? run.dir.replace(/\\/g, '/') : '<out>/' + run.missie;
  const regel = ['node scripts/bot/proef.mjs', `--missies=${run.missie}`, `--seeds=${run.seed ?? 1}`, '--out=.scr/proef/repro', ...(run.args || []), '--slot'].join(' ');
  if (run.replay) return { replay: `node scripts/bot/run.mjs --replay=${dir}/replay.jsonl --out=.scr/proef/repro-replay`, proef: regel, noot: 'de replay speelt alleen de invoer terug (zelfde seed); de wereld is niet volledig seed-vast, dus de bevinding kan een tweede keer anders vallen' };
  return { replay: null, proef: regel, noot: 'geen replay.jsonl in deze run: gebruik de proef-regel (zelfde missie, seed en perturbaties)' };
}

// Clusters over runs: gelijke handtekening = een bevinding. frequentie = aandeel runs van die missie waarin hij voorkwam.
export function triage(runs, o = {}) {
  const perMissieRuns = {};
  for (const r of runs) perMissieRuns[r.missie] = (perMissieRuns[r.missie] || 0) + 1;
  const m = new Map();
  for (const r of runs) {
    const lijst = r.bevindingen || bevindingenVoorRun(r, o);
    for (const b of lijst) {
      const k = handtekening(b, r.missie);
      if (!m.has(k)) m.set(k, { id: '', handtekening: k, missie: r.missie, stap: b.stap || '', type: b.type, soort: b.soort, plek: b.plek || null, tekst: b.tekst || '', items: [], runs: new Set(), seeds: new Set(), ernstMax: 0, run: r });
      const c = m.get(k);
      c.items.push({ b, bewijs: bewijsVan(b, r) }); c.runs.add(r.naam || `seed-${r.seed}`); c.seeds.add(r.seed);
      c.ernstMax = Math.max(c.ernstMax, IMPACT[b.ernst] || 1);
      if (!c.run.dir && r.dir) c.run = r;
    }
  }
  const uit = [...m.values()].map((c) => {
    const van = perMissieRuns[c.missie] || 1, freq = c.runs.size / van;
    const score = r1(c.ernstMax * 10 * (0.4 + 0.6 * freq) + Math.min(5, Math.log2(c.items.length + 1)));
    return {
      id: '', handtekening: c.handtekening, missie: c.missie, stap: c.stap, type: c.type, soort: c.soort, plek: c.plek, tekst: c.tekst,
      impact: c.ernstMax, ernst: Object.keys(IMPACT).find((k) => IMPACT[k] === c.ernstMax), frequentie: { runs: c.runs.size, van, aandeel: Math.round(freq * 100) / 100, seeds: [...c.seeds], aantal: c.items.length },
      score, prioriteit: score >= 28 ? 'P1' : score >= 16 ? 'P2' : 'P3',
      bewijs: c.items.slice(0, 5).map((i) => ({ ...i.bewijs, bewijs: i.b.bewijs })),
      repro: reproVoor(c.run, c),
    };
  }).sort((a, b) => b.score - a.score || a.handtekening.localeCompare(b.handtekening));
  uit.forEach((c, i) => { c.id = `B${String(i + 1).padStart(3, '0')}`; c.issue = issueVoorstel(c); });
  return uit;
}

// --- issue-voorstellen ----------------------------------------------------------------------------------------------

// type-voorvoegsel -> hoe het in het Nederlands heet, wat de speler verwacht, bug of wens en de geschatte kosten
const TYPEN = [
  [/^voortgang-niet-geslaagd/, { titel: 'wordt niet gehaald door de proefspeler', verwacht: 'Een speler zonder cheat kan de missie halen.', soort: 'bug', kosten: 'kosten-M' }],
  [/^voortgang-vast/, { titel: 'speler zit vast', verwacht: 'Een speler komt altijd uit zo een plek, ook zonder cheat.', soort: 'bug', kosten: 'kosten-M' }],
  [/^voortgang-dode-tijd/, { titel: 'lange tijd zonder voortgang of zichtbaar doel', verwacht: 'Er is steeds iets te doen of te zien.', soort: 'wens', kosten: 'kosten-S' }],
  [/^voortgang-traag/, { titel: 'duurt veel langer dan bedoeld', verwacht: 'De duur ligt in de buurt van de verwachte duur.', soort: 'wens', kosten: 'kosten-M' }],
  [/^voortgang-mislukt/, { titel: 'mislukt telkens op dezelfde plek', verwacht: 'Het is duidelijk waarom de missie mislukte en de plek is niet oneerlijk.', soort: 'bug', kosten: 'kosten-M' }],
  [/^voortgang-doel-niet-in-beeld/, { titel: 'het doel staat vaak buiten beeld', verwacht: 'Het doel is te zien of de speler wordt er met een pijl heen gewezen.', soort: 'wens', kosten: 'kosten-S' }],
  [/^voortgang-cheat-nodig/, { titel: 'is alleen met een cheat te halen', verwacht: 'Geen cheat nodig.', soort: 'bug', kosten: 'kosten-M' }],
  [/^dom-afgekapt/, { titel: 'tekst is afgekapt', verwacht: 'Alle tekst is helemaal te lezen.', soort: 'bug', kosten: 'kosten-S' }],
  [/^dom-beletselteken/, { titel: 'tekst met een beletselteken (…)', verwacht: 'Geen afgebroken zinnen in beeld.', soort: 'bug', kosten: 'kosten-S' }],
  [/^dom-buiten-beeld/, { titel: 'tekst valt buiten het scherm', verwacht: 'Alle tekst staat binnen het beeld.', soort: 'bug', kosten: 'kosten-S' }],
  [/^dom-overlap/, { titel: 'twee teksten staan over elkaar', verwacht: 'Teksten overlappen elkaar niet.', soort: 'bug', kosten: 'kosten-S' }],
  [/^dom-lettergrootte/, { titel: 'letters zijn te klein', verwacht: 'Minstens 13 px (12 px als uitzondering), zie ui-taal.md.', soort: 'bug', kosten: 'kosten-S' }],
  [/^dom-contrast/, { titel: 'tekst heeft te weinig contrast', verwacht: 'Contrast van minstens 4,5 op 1 (3 op 1 voor grote tekst).', soort: 'bug', kosten: 'kosten-S' }],
  [/^beeld-zwart/, { titel: 'beeld is zwart', verwacht: 'De speler ziet de wereld.', soort: 'bug', kosten: 'kosten-M' }],
  [/^beeld-(blanco|mistig)/, { titel: 'beeld is (bijna) blanco of mistig', verwacht: 'De speler ziet de wereld.', soort: 'bug', kosten: 'kosten-M' }],
  [/^beeld-egaal-vlak/, { titel: 'groot egaal vlak voor de camera', verwacht: 'De camera kijkt niet in een muur of de lucht.', soort: 'bug', kosten: 'kosten-S' }],
  [/^beeld-flikkering/, { titel: 'flikkering bij een stilstaande camera', verwacht: 'Vlakken flikkeren niet (z-fighting of een LOD-wissel).', soort: 'bug', kosten: 'kosten-M' }],
  [/^console-/, { titel: 'foutmelding in de console', verwacht: 'Geen fouten of waarschuwingen tijdens normaal spelen.', soort: 'bug', kosten: 'kosten-S' }],
  [/^frame-hitch/, { titel: 'het spel hapert op een plek', verwacht: 'Geen haperingen boven 50 ms.', soort: 'bug', kosten: 'kosten-M' }],
  [/^lees-te-snel|^lees-onleesbaar/, { titel: 'tekst staat te kort in beeld', verwacht: 'Ondertitels blijven minstens woorden / 3 seconden staan (feedback #975).', soort: 'bug', kosten: 'kosten-S' }],
  [/^lees-herhaling/, { titel: 'dezelfde zin komt vaker voor', verwacht: 'Elke zin komt in het verhaal een keer voor.', soort: 'wens', kosten: 'kosten-S' }],
  [/^lees-kaart/, { titel: 'uitlegkaart blijft te lang staan', verwacht: 'Een uitleg verdwijnt als hij is gelezen of gedaan.', soort: 'wens', kosten: 'kosten-S' }],
  [/^wereld-/, { titel: 'de tekst past niet bij de plek', verwacht: 'De scène speelt op een plek die bij de tekst past.', soort: 'bug', kosten: 'kosten-M' }],
  [/^bereik-doel-in-water|^bereik-doel-in-gebouw|^bereik-doel-onbereikbaar/, { titel: 'het doel is niet te bereiken', verwacht: 'Het doel ligt op een plek waar de speler kan komen.', soort: 'bug', kosten: 'kosten-S' }],
  [/^bereik-geen-route/, { titel: 'geen route naar het doel', verwacht: 'De routeplanner vindt een route.', soort: 'bug', kosten: 'kosten-M' }],
  [/^bereik-omweg/, { titel: 'de route naar het doel is een grote omweg', verwacht: 'De route is geen veelvoud van de afstand.', soort: 'wens', kosten: 'kosten-M' }],
  [/^eerlijk-/, { titel: 'tegenstander voelt oneerlijk', verwacht: 'Tegenstanders spelen eerlijk en passen zich niet aan de speler aan.', soort: 'wens', kosten: 'kosten-M' }],
  [/^chaos-staatbreuk/, { titel: 'opslaan en laden midden in de stap verandert de toestand', verwacht: 'Na laden is alles zoals bij het opslaan (doel, voortgang, geld, gezocht, voertuig).', soort: 'bug', kosten: 'kosten-M' }],
  [/^chaos-softlock|^chaos-stop-herstart|^chaos-save-load-mislukt/, { titel: 'de stap loopt vast na een verstoring', verwacht: 'De stap kan na elke gewone speleractie verder.', soort: 'bug', kosten: 'kosten-M' }],
  [/^chaos-/, { titel: 'raar gedrag na een verstoring', verwacht: 'Het spel herstelt netjes.', soort: 'bug', kosten: 'kosten-M' }],
  [/^duidelijkheid-/, { titel: 'een nieuwe speler snapt niet wat hij moet doen', verwacht: 'De doelregel en wat in beeld staat maken duidelijk wat de speler nu moet doen.', soort: 'bug', kosten: 'kosten-S' }],
  [/^goud-/, { titel: 'het beeld wijkt af van het referentiebeeld', verwacht: 'Het beeld lijkt op de vorige goede run (of het goud wordt bewust vernieuwd).', soort: 'wens', kosten: 'kosten-S' }],
];
export const typeInfo = (type) => (TYPEN.find(([re]) => re.test(type)) || [null, { titel: type, verwacht: 'Zoals bedoeld.', soort: 'bug', kosten: 'kosten-M' }])[1];

const platTekst = (t, n = 100) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, n);

export function issueVoorstel(c) {
  const info = typeInfo(c.type), tekst = platTekst(c.tekst, 70);
  const titel = `${c.missie}${c.stap && c.stap !== c.missie ? ' (' + c.stap + ')' : ''}: ${info.titel}${tekst && !/^(voortgang|console|frame)/.test(c.type) ? ` ("${tekst}")` : ''}`.slice(0, 140);
  const labels = [info.soort, IMPACT_LABEL[c.impact], info.kosten];
  const plek = c.plek ? `plek (${c.plek[0]}, ${c.plek[1]})` : 'geen vaste plek';
  const b = c.bewijs[0] || {};
  const body = [
    `**Wat:** ${info.titel}${tekst ? `: "${tekst}"` : ''}.`,
    `**Waar:** missie ${c.missie}, stap ${c.stap || '?'}, ${plek}.`,
    `**Hoe vaak:** ${c.frequentie.runs} van ${c.frequentie.van} run(s) (seeds ${c.frequentie.seeds.join(', ')}), ${c.frequentie.aantal}x gemeten. Ernst: ${c.ernst} (${c.prioriteit}, score ${c.score}).`,
    `**Verwacht:** ${info.verwacht}`,
    `**Bewijs:** ${c.bewijs.map((x) => `${x.beeld ? 'beeld ' + x.beeld + ', ' : ''}t=${x.eventTijd ?? '?'} s (${x.eventType || 'regel'}), seed ${x.seed}${x.run ? ', run ' + x.run : ''}`).join('; ')}.`,
    b.bewijs ? `**Meting:** \`${JSON.stringify(b.bewijs).slice(0, 300)}\`` : '',
    '**Reproduceren:**', '```', c.repro.replay || c.repro.proef, '```', c.repro.noot ? `_${c.repro.noot}_` : '',
    '',
    '_Gevonden door de proefspeler (docs/PROEFSPELER.md). Een automatische bevinding: nog niet door een mens bekeken. De coordinator controleert en labelt._',
  ].filter((x) => x !== '').join('\n');
  return { titel, labels, body };
}

export function bevindingenJson(runs, clusters, { gemaakt = new Date().toISOString() } = {}) {
  return {
    versie: 1, gemaakt,
    runs: runs.map((r) => ({ missie: r.missie, seed: r.seed, run: r.naam || '', dir: r.dir || '', geslaagd: r.sam ? r.sam.geslaagd : null, replay: !!r.replay })),
    totaal: { clusters: clusters.length, p1: clusters.filter((c) => c.prioriteit === 'P1').length, p2: clusters.filter((c) => c.prioriteit === 'P2').length, p3: clusters.filter((c) => c.prioriteit === 'P3').length },
    clusters,
  };
}

export function issuesMd(clusters, { max = 40 } = {}) {
  const k = ['# Issue-voorstellen van de proefspeler', '', 'De coordinator maakt hier issues van (een bevinding is automatisch gevonden en nog niet door een mens bekeken). Gesorteerd op score.', ''];
  for (const c of clusters.slice(0, max)) {
    k.push(`## ${c.id} [${c.prioriteit}] ${c.issue.titel}`, '', `Labels: ${c.issue.labels.join(', ')}`, '', c.issue.body, '');
  }
  if (clusters.length > max) k.push(`_(${clusters.length - max} clusters met een lagere score staan alleen in bevindingen.json)_`, '');
  return k.join('\n');
}

export function heatmapVoor(runs) {
  return faalHeatmap(runs.filter((r) => r.analyse).map((r) => ({ missie: r.missie, seed: r.seed, mislukkingen: r.analyse.mislukkingen })));
}
