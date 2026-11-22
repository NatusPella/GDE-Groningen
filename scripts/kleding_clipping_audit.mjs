// Kleding-clipping-audit (22-11): bouwt elke combinatie van personage, lichaamsvorm, kapsel en kledingstuk met de echte modelbouwers
// (three in node, geen Electron, geen browser) en meet hoe diep lagen door het lichaam of door elkaar steken. Methode, drempels en
// de lijst met controles staan in scripts/lib/kleding_clipping.mjs en in docs/KLEDING-CLIPPING-22-11.md.
//
//   node scripts/kleding_clipping_audit.mjs                       alles, tabel op het scherm
//   node scripts/kleding_clipping_audit.mjs --sets=hoofd,jas      alleen die groepen (stuk, hoofd, jas, schoen, hand, sjaal, tas)
//   node scripts/kleding_clipping_audit.mjs --stride=7            elke 7e combinatie (snel)
//   node scripts/kleding_clipping_audit.mjs --json=<bestand>      schrijf de uitkomst als json (voor de vergelijking voor/na)
//   node scripts/kleding_clipping_audit.mjs --voor=<json> --out=docs/KLEDING-CLIPPING-22-11.md   schrijf het rapport met voor en na
//   node scripts/kleding_clipping_audit.mjs --png=<map>           teken van elke controle de slechtste combinatie (zij- en vooraanzicht)
//
// GDE_CLIP_JS=<map met een kopie van game/js> meet een oudere bouw (de uitkomst 'voor'); GDE_VENDOR_CACHE wijst naar de gevendorde three.
// Er draait geen Electron: dit mag naast een fps-meting.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { combos, run, SET_IDS, THRESH, limitFor, buildCase, renderableOf, D } from './lib/kleding_clipping.mjs';

const arg = (name, def = null) => { const a = process.argv.find((x) => x.startsWith(`--${name}=`)); return a ? a.slice(name.length + 3) : def; };
const flag = (name) => process.argv.includes(`--${name}`);
const sets = arg('sets') ? arg('sets').split(',') : null;
const stride = Number(arg('stride', 1)) || 1;

const t0 = Date.now();
const all = combos(sets, stride);
const perSet = {};
const rows = new Map();
const worstCase = new Map();
let violating = 0;
for (const c of all) {
  perSet[c.set] = (perSet[c.set] || 0) + 1;
  const r = run(c);
  if (r.found.length) violating++;
  for (const f of r.found) {
    const k = `${r.set}|${f.check}|${r.key}`;
    const a = rows.get(k) || { set: r.set, check: f.check, key: r.key, slot: r.slot, n: 0, max: 0, worst: null };
    a.n++;
    if (f.depth > a.max) { a.max = f.depth; a.worst = { who: r.spec.who, body: r.spec.body, hair: r.spec.hair || null }; }
    rows.set(k, a);
    const w = worstCase.get(f.check);
    if (!w || f.depth > w.depth) worstCase.set(f.check, { depth: f.depth, spec: r.spec, at: f.at });
  }
}
const ms = Date.now() - t0;
const result = {
  datum: new Date().toISOString().slice(0, 10), combinaties: all.length, perSet, overtredingen: violating, ms,
  rows: [...rows.values()].sort((a, b) => b.max - a.max).map((a) => ({ ...a, max: Math.round(a.max * 1e5) / 1e5 })),
};
const byCheck = {};
for (const a of result.rows) { const c = (byCheck[a.check] ||= { rijen: 0, combos: 0, max: 0 }); c.rijen++; c.combos += a.n; c.max = Math.max(c.max, a.max); }
result.perControle = byCheck;

if (arg('json')) writeFileSync(arg('json'), JSON.stringify(result));

if (arg('png')) {
  const { renderGeometry } = await import('./lib/kleding_clip_png.mjs');
  mkdirSync(arg('png'), { recursive: true });
  for (const [check, w] of worstCase) {
    const c = buildCase(w.spec);
    const head = /hoofd|haar|gezicht|bril|capuchon/.test(check);
    for (const view of ['zij', 'voor']) {
      const box = head ? [-0.3, 1.45, 0.3, 1.95] : [-0.35, 0.8, 0.35, 1.75];
      writeFileSync(`${arg('png')}/${check}_${view}.png`, renderGeometry(renderableOf(c), { view, box, ppm: head ? 1200 : 800 }));
    }
  }
}

const mm = (m) => (m * 1000).toFixed(1).replace('.', ',');
if (!arg('out')) {
  console.log(`${all.length} combinaties in ${(ms / 1000).toFixed(1)} s, ${violating} met een overtreding; ${rows.size} regels`);
  console.log(`groepen: ${Object.entries(perSet).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  for (const [check, v] of Object.entries(byCheck).sort((a, b) => b[1].max - a[1].max)) console.log(`${check.padEnd(34)} ${String(v.combos).padStart(5)} combinaties, ${String(v.rijen).padStart(4)} regels, max ${mm(v.max)} mm (drempel ${mm(limitFor(check))})`);
  if (flag('regels')) for (const a of result.rows.slice(0, Number(arg('top', 40)))) console.log(`${a.set} | ${a.check} | ${a.key} | ${a.n}x | ${mm(a.max)} mm | ${a.worst.who}/${a.worst.body}${a.worst.hair ? '/' + a.worst.hair : ''}`);
  process.exit(violating ? 1 : 0);
}

// ---------------------------------------------------------------------------------------------------------------- rapport
const voor = arg('voor') ? JSON.parse(readFileSync(arg('voor'), 'utf8')) : null;
const CHECK_TEKST = {
  'hoofddeksel-in-hoofd': 'hoofddeksel zit in het hoofd',
  'haar-door-hoofddeksel': 'haar steekt door het hoofddeksel',
  'gezicht-bedekt-door-hoofddeksel': 'hoofddeksel bedekt oog, neus of mond',
  'gezicht-door-hoofddeksel': 'oor of wenkbrauw steekt door het hoofddeksel',
  'bril-bedekt-door-hoofddeksel': 'hoofddeksel bedekt de bril',
  'bril-door-hoofddeksel': 'bril steekt door het hoofddeksel',
  'capuchon-in-hoofd': 'capuchon zit in het hoofd',
  'chain-in-kleding': 'ketting zit in het shirt', 'pearls-in-kleding': 'parelsnoer zit in het shirt', 'beads-in-kleding': 'kralenketting zit in het shirt', 'pendant-in-kleding': 'hanger zit in het shirt',
  'watch-in-arm': 'horloge zit in de arm of mouw', 'band-in-arm': 'polsbandje zit in de arm of mouw', 'bracelet-in-arm': 'armband zit in de arm of mouw',
  'glove-in-arm': 'handschoen zit in de arm of mouw', 'work-in-arm': 'werkhandschoen zit in de arm of mouw', 'garden-in-arm': 'tuinhandschoen zit in de arm of mouw',
  'tas-in-arm': 'tas zit in de arm',
  'sjaal-in-kleding': 'sjaal zit in het shirt', 'sjaal-zweeft': 'sjaal staat meer dan 4 cm van de romp', 'kraag-door-sjaal': 'kraag steekt door de sjaal', 'revers-door-sjaal': 'revers steekt door de sjaal', 'overhemd-door-sjaal': 'overhemd onder de jas steekt door de sjaal', 'detail-door-sjaal': 'kledingdetail steekt door de sjaal',
  'overhemd-zweeft': 'overhemd onder de jas zweeft voor de jas', 'overhemd-begraven': 'overhemd onder de jas zit in de jas', 'revers-zweeft': 'revers zweeft voor de jas', 'revers-begraven': 'revers zit in de jas',
  'detail-zweeft': 'kledingdetail zweeft voor de romp', 'detail-begraven': 'kledingdetail zit in de romp',
  'been-door-panelen': 'been steekt door rok of jaspand', 'schoen-in-been': 'schoen zit in het been',
};
const tekst = (c) => CHECK_TEKST[c] || (/-verborgen$/.test(c) ? `${c.replace('-verborgen', '')} ligt helemaal onder de kleding` : c);
// Welk stuk veroorzaakt de overtreding? Bij details op de romp en bij de kraag is het de jas (of het shirt), bij een polsstuk het horloge, enz.
const CULPRIT = [[/^(detail|overhemd|revers|kraag)-/, ['outer', 'top']], [/^(watch|band|bracelet)-/, ['wrist']], [/^(chain|pearls|beads|pendant)-/, ['jewel']], [/^tas-/, ['back']], [/^sjaal-/, ['neck']]];
const culprit = (check, key) => {
  const tokens = key.split(' + ');
  for (const [re, slots] of CULPRIT) if (re.test(check)) for (const sl of slots) { const tk = tokens.find((x) => (D.ITEM_BY_ID[x] || {}).slot === sl); if (tk) return tk; }
  return tokens[0];
};
// Voor het rapport: per controle en hoofdstuk (het eerste stuk van de sleutel) de slechtste combinatie, met hoeveel varianten eromheen geraakt zijn.
const groep = (list) => {
  const g = new Map();
  for (const a of list) {
    const stuk = culprit(a.check, a.key);
    const k = `${a.check}|${stuk}`;
    const e = g.get(k) || { check: a.check, stuk, slot: (D.ITEM_BY_ID[stuk] || {}).slot || a.slot, max: 0, worst: null, n: 0, varianten: 0, kapsels: new Set() };
    e.n += a.n; e.varianten++;
    if (a.worst.hair) e.kapsels.add(a.worst.hair);
    if (a.max > e.max) { e.max = a.max; e.worst = a.worst; e.context = a.key; }
    g.set(k, e);
  }
  return [...g.values()].sort((x, y) => y.max - x.max);
};
const regel = (a) => `| ${a.stuk} | ${a.slot} | ${tekst(a.check)} | ${a.worst.who} | ${a.worst.body} | ${a.worst.hair || 'standaard'}${a.kapsels.size > 1 ? ` (en ${a.kapsels.size - 1} andere)` : ''} | ${mm(a.max)} | ${a.n} | ${a.context} |`;
const pct = (v, n) => (n ? `${v} van ${n}` : '0');
const lines = [];
const L = (s = '') => lines.push(s);
L('# Kleding en clipping: audit en reparaties (22-11)');
L();
L('Aanleiding (eigenaar): de nieuwe pet van Tammo clipte tijdens een testbuild door zijn hoofd. Dit document legt vast wat er mis was, hoe het is gemeten, wat er is gerepareerd en hoe de permanente test het bewaakt.');
L('Het rapport komt uit `node scripts/kleding_clipping_audit.mjs --voor=<json> --out=docs/KLEDING-CLIPPING-22-11.md`; de meting zelf zit in `scripts/lib/kleding_clipping.mjs`, de test in `scripts/kleding_clipping_test.mjs`.');
L();
L('## 1. De pet van Tammo: oorzaak');
L();
L('De Stadjerspet (`stadjerspet`, hoofddeksel-soort `tammo`) is een schil over de schedel (`hairCap` in `models3d_people.js`). Drie fouten, elk met een eigen meting:');
L();
L('1. **Het haar zat niet onder de pet.** Het kapsel van Tammo (`short`) en alle andere kapsels zijn schillen en lokken op 1,05 tot 1,3 keer de schedel, de pet ligt op 1,12 keer: het haar stak overal door de kroon. Gemeten: tot 10 mm bij `short`, 30 tot 70 mm bij knot, staart, staartjes, hanenkam en vlecht (die zaten gewoon boven op het hoofd, dwars door de pet).');
L('2. **De onderrand lag op ooghoogte.** De schil stopte op de evenaar van het hoofd (y = HEAD_Y), de klep zat ruim 4 cm hoger: de pet hing over de wenkbrauwen en de oren staken er 7 mm doorheen. Gemeten: 12 mm bedekking van wenkbrauw en oog, 7 mm oor door de schil.');
L('3. **Het plaatje stond los.** Het plaatje van de Stadjer was een vlak blokje onder een hoek van -0,5 rad: de bovenkant leunde van de pet af. Het volgt nu de kromming van de schil.');
L();
L('De hoofd-in-hoofd-meting (`hoofddeksel-in-hoofd`) vond voor het deksel zelf geen doordringing: de pet zit niet in het hoofd, het haar zit niet onder de pet.');
L();
L('## 2. Methode');
L();
L('- **Bouw:** elke combinatie wordt gebouwd met `buildPersonMesh` (dezelfde functie als het spel), op de twee hoofdpersonen zoals `shops.js` ze bouwt (Tammo, Tessa) en op drie NPC\'s zoals `avatarLook` en `npcLook` ze bouwen (man, vrouw, oude man met buik), en op de agent (vaste pet). De bouwer legt met `personProbe.layers` vast welke driehoeken bij welk stuk horen (hoofddeksel, haar, bril, shirt, revers, sjaal, tas, ...). Dat kost niets als het uit staat.');
L('- **Meetruimte:** de rustpose in modelruimte (alle botten recht; een elleboog is na het bouwen 0,12 rad gebogen). Het hoofd is bij elke lichaamsvorm gelijk; romp, armen en benen niet (smal, breed: `build`; lang, kort: groepsschaal). Daarom zijn hoofdcombinaties op `gemiddeld` gemeten en de rest op alle vijf de vormen.');
L('- **Hoofd:** een analytische ellipsoide (`headShape`). Diepte = hoeveel mm een punt er radiaal binnen ligt. Het werkelijke hoofd is een 9x7-veelvlak binnen die ellipsoide, dus de meting is streng.');
L('- **Laag over laag:** raycasting vanuit een middelpunt (hoofd) of een as (romp: verticaal; arm: lijn door de gespreide arm; been: verticaal door de heup) door een punt van de binnenste laag naar de buitenste laag. Diepte = hoeveel mm de binnenste laag buiten de buitenste steekt, of hoeveel mm een kenmerk eronder ligt.');
L('- **Details op de romp** (revers, overhemd in een open jas, zakken): elk los stuk wordt apart gemeten. Het dichtstbijzijnde punt mag hoogstens 1 cm voor de romp liggen (anders zweeft het) en het buitenste punt moet boven het oppervlak uitkomen (anders zit het erin).');
L('- **Drempels:** 2 mm voor alles (de eigenaar: een hoofddeksel dat meer dan 2 mm in het hoofd zit is al te veel). Uitzonderingen met reden: ' + Object.entries(THRESH).filter(([k]) => k !== 'default').map(([k, v]) => `${k} ${mm(v)} mm`).join(', ') + ' (parels en kralen zijn dobbelsteentjes van 2 cm die op de stof rusten; een polsband of handschoen heeft een naad; een sjaal ligt in de kraag).');
L();
L('## 3. Dekking');
L();
L('| Groep | Wat | Combinaties |');
L('|---|---|---:|');
const SET_TEKST = {
  stuk: 'elk van de 67 stukken (63 winkelstukken en 4 rolstukken, 12 slots) op elk van de 5 personages en elke van de 5 lichaamsvormen, in een neutraal basisuitzicht',
  hoofd: 'elk hoofddeksel x elk van de 17 kapsels x 4 personages; hoofddeksel x bril x gezichtsbeharing x kapsel; de agentpet',
  jas: 'jas (5 soorten) x shirt (6) x broek of rok (4) x 5 lichaamsvormen x 3 personages',
  schoen: 'schoen (3 soorten) x broek of rok (4) x 5 lichaamsvormen x 3 personages',
  hand: 'handschoen (3) x horloge x mouw (4 shirts, geen of 3 jassen) x 5 lichaamsvormen x 2 personages',
  sjaal: 'sjaal x jas (geen of 5) x shirt (3) x ketting (geen of 2) x 5 lichaamsvormen x 2 personages',
  tas: 'tas (2 soorten) x jas (geen of 5) x shirt (2) x 5 lichaamsvormen x 2 personages',
};
for (const id of SET_IDS) if (perSet[id]) L(`| ${id} | ${SET_TEKST[id]} | ${perSet[id]} |`);
L(`| **totaal** | | **${all.length}** |`);
L();
L(`Doorlooptijd van de volledige audit: ${(ms / 1000).toFixed(0)} s in gewone node, zonder Electron. De lichte test (\`scripts/kleding_clipping_test.mjs\`) neemt een gelijkmatige steekproef van elke groep.`);
L();
L('## 4. Uitkomst voor en na');
L();
if (voor) {
  L(`Voor: ${voor.combinaties} combinaties, **${voor.overtredingen}** met een overtreding (${(voor.overtredingen / voor.combinaties * 100).toFixed(0)} procent). Na: ${all.length} combinaties, **${violating}** met een overtreding.`);
} else {
  L(`${all.length} combinaties, ${violating} met een overtreding.`);
}
L();
L('| Controle | Voor: combinaties | Voor: max mm | Na: combinaties | Na: max mm | Drempel mm |');
L('|---|---:|---:|---:|---:|---:|');
const checks = new Set([...Object.keys(voor ? voor.perControle : {}), ...Object.keys(byCheck)]);
const sorted = [...checks].sort((a, b) => ((voor && voor.perControle[b] ? voor.perControle[b].max : 0) - (voor && voor.perControle[a] ? voor.perControle[a].max : 0)) || (byCheck[b] ? byCheck[b].max : 0) - (byCheck[a] ? byCheck[a].max : 0));
for (const c of sorted) {
  const v = voor && voor.perControle[c], n = byCheck[c];
  L(`| ${tekst(c)} (\`${c}\`) | ${v ? v.combos : 0} | ${v ? mm(v.max) : '0'} | ${n ? n.combos : 0} | ${n ? mm(n.max) : '0'} | ${mm(limitFor(c))} |`);
}
L();
L('## 5. Wat is gerepareerd');
L();
L('Alle reparaties zitten in de data en de bouwers (`models3d_people.js`, `models3d_hair.js`, `models3d_clothing.js`), per lichaamsvorm waar het kan; geen stijl is geschrapt.');
L();
L('- **Pet, Stadjerspet, platte pet, mutsje:** een tabel `HAT_SHELL` (straal, tilt en onderrand per soort) is de ene bron. De onderrand ligt nu op 0,4 pi in plaats van 0,5 pi (boven ogen en oren; de klep zit op de voorrand). Het plaatje van de Stadjer ligt op de schil.');
L('- **Haar onder het hoofddeksel** (`fitHairUnderHat`): elk haarpunt onder de schil gaat radiaal naar binnen tot onder de binnenwand (met marge voor de facetten van de schil); wat onder de rand uitkomt blijft zoals het was. Kapsels die er niet onder passen krijgen een lage variant: knot in de nek, staart onder de achterrand uit, staartjes op oorhoogte, bij een hanenkam blijft de tondeuse over.');
L('- **Bandjes** (krans, feestoren, sluier, kroontje): de ring groeit mee met het haar op die hoogte (afro, krullen, hoge kam) in plaats van erin te zitten (`bandScale`).');
L('- **Ketting, parels, kralen, hanger:** een pad over het oppervlak van de romp van deze lichaamsvorm (`neckPath`, 24 punten met normaal), niet meer een vlakke ring die aan de zijkanten tot 13 cm in het shirt zat. Kralen liggen erbovenop.');
L('- **Sjaal:** de ringen volgen de romp van de vorm (`ringAt`), zijn zo wijd als de revers en de kraag eronder vragen, en liggen in dezelfde fase als de romp; het hangende eind ligt voor de buik van breed postuur.');
L('- **Horloge, polsbandje, armband, handschoenen:** de armen staan 0,06 rad uit elkaar (`ARM_SPLAY`) maar de losse stukken hingen recht aan de elleboog: de arm stak er tot 14 mm doorheen. Ze draaien nu om de elleboog mee.');
L('- **Schoudertas:** 5 cm dik in plaats van 7 en zo ver naar buiten als de arm van de lichaamsvorm toelaat (tot 1,4 cm in de arm bij breed postuur).');
L('- **Overhemd in een open jas, revers, rits, buidelzak van de hoodie:** vlakke planken die tot 4 cm voor de borst zweefden zijn stroken die het oppervlak van de romp volgen (`surfaceStrip`).');
L();
L('De stijl blijft: dezelfde stukken, kleuren en kapsels, geen stuk is geschrapt. Wat verandert is wat zichtbaar fout was: het haar zit onder de pet, de pet ligt boven de wenkbrauwen en de oren, de ketting en de sjaal volgen de schouders en het overhemd ligt op de borst.');
L();
L('## 6. Overtredingen vóór de reparatie');
L();
if (voor) {
  L(`Per controle en stuk de slechtste combinatie (personage, lichaamsvorm, kapsel, wat eromheen zit). De audit vond ${voor.rows.length} afzonderlijke regels (stuk met alles wat eromheen zit) in ${voor.combinaties} combinaties; hier zijn ze per stuk samengevoegd. Bij 'zweeft' is de diepte het overschot boven 1 cm. Alle andere combinaties waren schoon.`);
  L();
  L('| Stuk | Slot | Controle | Personage | Lichaamsvorm | Kapsel | Diepte mm | Combinaties | Slechtste combinatie |');
  L('|---|---|---|---|---|---|---:|---:|---|');
  for (const a of groep(voor.rows)) L(regel(a));
} else L('(geen voor-uitkomst meegegeven)');
L();
L('## 7. Overtredingen na de reparatie');
L();
if (!result.rows.length) L('Geen: alle combinaties blijven binnen de drempels.');
else {
  L('| Stuk | Slot | Controle | Personage | Lichaamsvorm | Kapsel | Diepte mm | Combinaties | Slechtste combinatie |');
  L('|---|---|---|---|---|---|---:|---:|---|');
  for (const a of groep(result.rows)) L(regel(a));
}
L();
L('## 8. Niet gemeten en niet bekeken');
L();
L('- **Niet in Electron of de testbuild bekeken.** De audit meet geometrie; de beelden zijn met een kleine softwarerenderer (`scripts/lib/kleding_clip_png.mjs`, zij- en vooraanzicht van de rustpose) bekeken, niet met de belichting en schaduw van het spel. De eigenaar moet de pet, het haar eronder, de ketting en de sjaal nog in de testbuild bekijken.');
L('- **Alleen de rustpose.** Tijdens lopen, fietsen, zitten of vechten bewegen armen en hoofd; stukken die aan een bot hangen (horloge, handschoen, ketting) draaien daarin mee met de huid, maar een pose waarin het hoofd ver kantelt is niet gemeten.');
L('- **Haar tegen de capuchon** is niet gemeten (het haar valt in de opening van de capuchon; in de zijkant zag het er goed uit). Evenmin schoenen tegen een wijd broekspijpeinde, handen tegen zakken en de verhaalfiguren met een eigen look (`storycast.js`).');
L('- **Kleuren** zijn niet gevarieerd: de geometrie hangt niet van de kleur af (alleen de vertexkleur).');
L('- **De 2 mm-drempel is streng voor het haar:** de schillen zijn veelvlakken; binnen de drempel kan haar nog net door een facet van de pet prikken (twee sliertjes in de zijkant zijn te zien in de render).');
L();
L('## 9. Samen spelen');
L();
L('Kleding is per speler zichtbaar bij anderen via de outfit-code (`avatar.outfit`): dezelfde geometrie, dezelfde bouwers. Deze wijziging raakt alleen de geometrie die `buildPersonMesh` uit die code bouwt; er is geen netwerkwijziging, geen nieuw bericht en de code zelf (versie 3) is ongewijzigd. Een gast ziet de gerepareerde pet, het haar eronder en de nieuwe ketting dus zonder dat host of gast iets doet.');
L();
writeFileSync(arg('out'), lines.join('\n') + '\n');
console.log(`rapport geschreven: ${arg('out')} (${lines.length} regels, ${all.length} combinaties, ${violating} met overtreding)`);
