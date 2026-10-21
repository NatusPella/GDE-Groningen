// Inventory per channel of the one attention planner (#104, input for #92): what asks for the
// player's eyes or ears, on which scale, with which rationing, who calls it and whether it goes
// through hudbus. Reads the tables of game/js/hudbus.js (SURFACES) and counts the callers in the source.
//   node scripts/hudbus_inventory.mjs          the tables and the surfaces on the console
//   node scripts/hudbus_inventory.mjs --md     writes docs/KANALEN.md (the input for #92)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const B = await import('../game/js/hudbus.js');

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsDir = path.join(root, 'game', 'js');
const files = fs.readdirSync(jsDir).filter((f) => f.endsWith('.js'));
const src = Object.fromEntries(files.map((f) => [f, fs.readFileSync(path.join(jsDir, f), 'utf8')]));

// --- what each surface is: the words for the document ------------------------------------------
// api: the call other modules use to put something on it (null: the module decides itself).
// what: what the player sees or hears, and where. suggest: what could merge or go for #92 (a proposal).
const INFO = {
  kaart: {
    api: { re: /\baddMessage\(/g, names: ['showCard'], from: 'hudcards.js', skip: ['world.js'] },
    what: 'Het berichtkaartje links boven (zone A, een tegelijk, met een korte wachtrij): missie, bijbaan, geld, politie, gevaar, tip. Ook de nieuwsticker, de reiskaart en de kaartmeldingen komen hier.',
    suggest: 'Blijft de ene tekstkaart. Alles wat nu een eigen tekstkaartje is (Opgeslagen, prestatietoast) kan hier als soort in; dat scheelt twee eigen DOM-elementen.',
  },
  prestatie: {
    api: { names: ['unlockAchievement'], from: 'achievements.js' },
    what: 'De prestatietoast (zone E, links midden). Wacht op de resultaatkaart, het keuzepaneel en een duelbalk.',
    suggest: 'Samen met kaart: de soort prestatie bestaat al in KINDS (zone E). Een kaart met een medaille-icoon in plaats van een tweede element.',
  },
  bel: {
    api: { names: ['startCall'], from: 'phonefeed.js' },
    what: 'Het belscherm van de telefoon (zone A, P1); houdt het spraakkanaal als klasse call.',
    suggest: 'Samen met radio: twee telefoonschermen (phonefeed en storycontact) voor hetzelfde gesprek; één telefoonpaneel met een portret en een regel.',
  },
  bericht: {
    api: { names: ['notifyPhone'], from: 'phonefeed.js' },
    what: 'Telefoonberichten (verhaaltekst, sms, nieuws, bank) als kaartje in zone A; sommige worden voorgelezen (ratio per soort).',
    suggest: 'Samen met kaart voor wat niet verhaal is (bank, nieuws, app): dezelfde zone, dezelfde rang, nu twee stromen. Voorlezen: alleen verhaal.',
  },
  radio: {
    api: { names: ['queueStoryContact'], from: 'storycontact.js' },
    what: 'De verhaalradio en de beltelefoon van een personage (rechts, onder het statusblok): portret, regel, golfvorm.',
    suggest: 'Samen met bel (zie daar). Het portret en de ondertitelregel zijn het enige dat de speler echt nodig heeft.',
  },
  opmerking: {
    api: null,
    what: 'De opmerking van de metgezel als een stap begint: een spraakballon boven het personage.',
    suggest: 'Samen met autopraat en ballon: een praatkanaal, dat als ondertitel of als ballon laat zien, nooit allebei.',
  },
  autopraat: {
    api: { names: ['banterAfter'], from: 'banter.js' },
    what: 'Gesprek tijdens het rijden: ondertitelregel onderaan (zone G); wacht langer dan al het andere verhaal.',
    suggest: 'Samen met opmerking en ballon (zie daar). De 8 s wachttijd na verhaal blijft.',
  },
  ondertitel: {
    api: { names: ['setDualText'], from: 'subtitles.js' },
    what: 'Ondertitels en dubbeltekst (Fries/Gronings met Nederlandse regel) onderaan (zone G); het doel dimt eronder.',
    suggest: 'Blijft. setDualText is een tekstmaker, geen kanaal: meerdere modules bouwen er hun eigen regel mee; de plaatsing hoort bij het ene ondertitelblok.',
  },
  scene: {
    api: { names: ['playCinematic'], from: 'cinematics.js' },
    what: 'Tussenfilmpjes en intro (hele scherm); niets anders start zolang er een scene loopt (alleen bekeken, nooit geremd).',
    suggest: 'Blijft.',
  },
  moment: {
    api: null,
    what: 'Gerantsoeneerde filmische momenten: nieuwe wijk, bezienswaardigheid, Ommelanden, crash-herhaling, vijf sterren. Vragen aan attention.js.',
    suggest: 'wijk en landmark kunnen samen met de plaatsnaam: het vlucht-shot is dezelfde boodschap als de naam. Minder momenten, meer plaatsnaam.',
  },
  banner: {
    api: { names: ['showBanner'], from: 'cinematics.js' },
    what: 'De resultaatkaart midden (Missie geslaagd / mislukt, bijbaan, minigame), met stats. Houdt personagenaam, plaatsnaam, prestatie en duelbalk tegen.',
    suggest: 'Blijft de ene resultaatkaart. Veel minigame- en bijbaanmodules roepen hem apart aan; één gedeeld resultaat via minigamekit scheelt herhaling.',
  },
  naamkaart: {
    api: { names: ['showNameCard'], from: 'namecard.js' },
    what: 'De naamkaart bij het eerste ontmoeten van een personage (groot, links onder, boven de ondertitel).',
    suggest: 'Samen met ondertitel: de naam staat al als sprekerlabel in de regel; de grote kaart alleen voor het eerste ontmoeten.',
  },
  plaatsnaam: {
    api: null,
    what: 'De naam van de plek waar je binnenkomt (zone B, bovenaan midden), met het Opgeslagen-vinkje ernaast.',
    suggest: 'Samen met moment (wijk, landmark) en opgeslagen: een plaatsblok.',
  },
  keuze: {
    api: { names: ['createChoicePanel'], from: 'choicepanel.js' },
    what: 'Het keuzepaneel van een tekstbijbaan of verhaalkeuze (bovenaan midden, antwoorden met nummertoetsen).',
    suggest: 'Samen met bord en activiteit: een activiteitenpaneel bovenaan (kop, regels, toetsen). Het keuzepaneel en het minigamebord zijn dezelfde familie.',
  },
  bord: {
    api: { names: ['createBoard'], from: 'minigamekit.js' },
    what: 'Het minigamebord (bovenaan midden): titel, stand, toetsen. Houdt prestatietoast en plaatsnaam tegen.',
    suggest: 'Samen met keuze en activiteit (zie daar).',
  },
  ballon: {
    api: { re: /\bspeechText\s*=/g },
    what: 'Spraakballonnen boven voetgangers, bemanning, zwemmers en de metgezel; spreken een opname uit op de ambient-klasse.',
    suggest: 'Samen met opmerking en autopraat (zie daar). Achtergrondballonnen van voorbijgangers blijven eigen, ze zijn sfeer.',
  },
  spraak: {
    api: { names: ['playLineVoice', 'playStoryVoice', 'playBubbleVoice'], from: 'audio.js' },
    what: 'Het ene stemkanaal: een regel tegelijk, hogere klasse snijdt lagere af (speech.js, nu regels in hudbus).',
    suggest: 'Blijft. Zie ook #110 (voicebank).',
  },
  status: {
    api: null,
    what: 'De vaste HUD: sterren, geld, wapen, klok, kaart, balken, voertuig, doel, GPS (zones B, C, F, G). decideHud in hudrules.js zet ze neer.',
    suggest: 'Blijft; dit is de vaste laag. decideHud blijft in hudrules (zonelayout), de tabellen zijn die van hudbus.',
  },
  opgeslagen: {
    api: null,
    what: 'Het kleine Opgeslagen-vinkje links onder, bij de plaatsnaam.',
    suggest: 'Weg als eigen element: een pictogram in het plaatsblok, of een kaart van de soort tip.',
  },
  toetsen: {
    api: { re: /export function \w*Prompt\b/g },
    what: 'De toetstips onderaan rechts (zone H, maximaal twee): wat E, Spatie en de rest hier doen.',
    suggest: 'Blijft. Veel modules leveren een toetstip aan; geen planner nodig, de ruimte is vast (twee regels).',
  },
  activiteit: {
    api: null,
    what: 'Het eigen paneel van een activiteit (stuntscore, heistpanelen, tekstbijbaan, bakronde, padel, kermis en andere): rechts of bovenaan, alleen tijdens de activiteit.',
    suggest: 'Samen met keuze en bord: een gedeeld activiteitenpaneel (createBoard) voor titel, stand en toetsen. Veel eigen CSS-strings verdwijnen.',
  },
  voertuighud: {
    api: null,
    what: 'Voertuig-HUD buiten de auto: de heli-HUD (vervangt de snelheidsmeter), de vliegtuigkaart en het busbord.',
    suggest: 'Samen: een voertuigblok per voertuigsoort via hudlook (welke meters per voertuig staat er al).',
  },
  samen: {
    api: null,
    what: 'Samen spelen: de fade bij binnenkomst en de spelerslijst bij Tab (nooit permanent in beeld; de lijst met acties staat in het pauzemenu).',
    suggest: 'Blijft; klein en alleen op verzoek van de speler.',
  },
  menu: {
    api: null,
    what: 'Pauzemenu, kaart, telefoon, overzicht, garage, winkel, startscherm, profiel: de speler opent ze zelf; modaal.',
    suggest: 'Blijft; buiten dit probleem (de speler vraagt erom).',
  },
  invoer: {
    api: null,
    what: 'Invoer en richtkruis: aanraakknoppen, toetsenbordhulp, het richtkruis.',
    suggest: 'Blijft; vraagt geen aandacht.',
  },
  dev: {
    api: null,
    what: 'Ontwikkel- en promohulpen (testmenu, trailer, verhaaltest): niet voor de speler.',
    suggest: 'Blijft; hoort niet in het kritieke pad (zie #109).',
  },
  effect: {
    api: { names: ['flashScreen'], from: 'postfx3d.js' },
    what: 'Schermeffecten zonder tekst: flits (trailer, dorpsuitje, verhaal), kleur van de dronken speler.',
    suggest: 'Blijft; geen informatie, geen kanaal.',
  },
};

const ownFiles = (s) => new Set(s.files);
// callers: modules that import one of the names from the owner module (and call it), or match a pattern
function callersOf(id) {
  const api = INFO[id] && INFO[id].api;
  if (!api) return null;
  const mods = {};
  const own = ownFiles(B.SURFACES[id]);
  for (const f of files) {
    if (own.has(f) || (api.skip || []).includes(f)) continue;
    let calls = 0;
    if (api.re) calls += (src[f].match(new RegExp(api.re.source, 'g')) || []).length;
    for (const name of api.names || []) {
      const imp = new RegExp(`import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*'\\./${api.from.replace('.', '\\.')}'`);
      if (imp.test(src[f])) calls += (src[f].match(new RegExp(`\\b${name}\\(`, 'g')) || []).length;
    }
    if (calls) mods[f] = calls;
  }
  return { modules: Object.keys(mods).length, calls: Object.values(mods).reduce((a, b) => a + b, 0) };
}

const pLabel = (id) => {
  const s = B.SURFACES[id];
  if (s.kinds) {
    const ps = s.kinds.map((k) => B.KINDS[k].p);
    const lo = Math.min(...ps), hi = Math.max(...ps);
    return lo === hi ? `P${lo}` : `P${lo} tot P${hi} per soort`;
  }
  return s.p === undefined ? 'n.v.t.' : `P${s.p}`;
};
const zLabel = (id) => B.surfaceZone(id) || '-';
const gateLabel = (id) => {
  const s = B.SURFACES[id];
  if (!s.gates) return 'nee: ' + s.own;
  const by = {};
  for (const [c, k] of s.gates) (by[c] ||= []).push(k);
  return 'ja: ' + Object.entries(by).map(([c, ks]) => `${c}${ks.filter(Boolean).length ? ' (' + ks.filter(Boolean).join(', ') + ')' : ''}`).join(', ');
};

// --- the console -------------------------------------------------------------------------------
function consoleOut() {
  console.log('Kanaal hud (kaarten op de P-schaal, zone A berichten, E prestatie/radio):');
  for (const [k, v] of Object.entries(B.KINDS)) console.log(`  ${k.padEnd(10)} P${v.p}  zone ${v.zone}  ${v.level ? 'niveau ' + v.level + ' (' + B.LEVEL[v.level] + ')' : 'niet op de aandachtsschaal'}`);
  console.log('Kanaal narrative (verhaal, praat, toasts; een tegelijk):');
  console.log(`  praat: ${B.NARRATIVE.TALK.join(', ')}  (tussenruimte ${B.NARRATIVE.GAP} s, na een scene ${B.NARRATIVE.AFTER_SCENE} s, banter ${B.NARRATIVE.BANTER_GAP} s)`);
  console.log(`  toasts: ${B.NARRATIVE.TOASTS.join(', ')}  (na een scene ${B.NARRATIVE.TOAST_AFTER_SCENE} s, tussenruimte ${B.NARRATIVE.TOAST_GAP} s)`);
  console.log('Kanaal moment (filmische momenten, gerantsoeneerd):');
  for (const [k, m] of Object.entries(B.MOMENTS)) console.log(`  ${k.padEnd(11)} niveau ${m.level}  groep ${m.group}  afkoeling ${m.cooldown} s  ${m.fast ? 'ook bij hoge snelheid' : 'niet boven ' + Math.round(B.RATION.FAST * 3.6) + ' km/u'}`);
  console.log(`  tussen twee onderbrekingen ${B.RATION.GLOBAL_GAP} s, een lager niveau wacht na een hoger nog ${B.RATION.AFTER_HIGHER} s`);
  console.log(`Kanaal tip: een per ${B.RATION.TIP_GAP} s`);
  console.log('Kanaal voice (telefoonberichten voorgelezen): ' + Object.entries(B.VOICE_GAP).map(([k, s]) => `${k} om de ${s} s`).join(', ') + '; een personage altijd');
  console.log('Kanaal overlay (volledig-scherm kaarten houden kleine tegen):');
  for (const [a, list] of Object.entries(B.OVERLAY_HOLDS)) console.log(`  ${a.padEnd(9)} rang ${B.OVERLAY_RANK[a]}  houdt tegen: ${list.join(', ')}`);
  console.log('Kanaal speech (stemklassen, laag naar hoog en de pauze erna): ' + Object.entries(B.SPEECH_PRIO).map(([k, p]) => `${k} ${p} (${B.SPEECH_GAP[k]} s)`).join(', '));
  console.log('Oppervlakken (SURFACES): kanaal, module, P, zone, poort, aanroepers');
  for (const id of Object.keys(B.SURFACES)) {
    const c = callersOf(id);
    console.log(`  ${id.padEnd(12)} ${B.SURFACES[id].files.join(', ')}  ${pLabel(id)}  zone ${zLabel(id)}  ${gateLabel(id)}${c ? `  aanroepers: ${c.modules} modules, ${c.calls} aanroepen` : ''}`);
  }
}

// --- the document ------------------------------------------------------------------------------
function markdown() {
  const ids = Object.keys(B.SURFACES);
  const gated = ids.filter((i) => B.SURFACES[i].gates);
  const own = ids.filter((i) => !B.SURFACES[i].gates);
  const out = [];
  out.push('# Kanalen: alles wat de aandacht van de speler vraagt');
  out.push('');
  out.push('Input voor #92 (minder ruis, meer visuele communicatie), uit #104 (één planner). Dit bestand wordt gemaakt door `node scripts/hudbus_inventory.mjs --md` uit de tabel `SURFACES` in `game/js/hudbus.js`; pas die tabel of de teksten in het script aan, niet dit bestand. Het getal bij de aanroepers komt uit de broncode van het moment van schrijven. De kolom "Voorstel" is een voorstel voor #92, geen besluit. Niets hiervan is in beeld bekeken.');
  out.push('');
  out.push('## Hoe het nu gepland wordt');
  out.push('');
  out.push('Eén vraag, `mayShow(kanaal, ctx)` in `hudbus.js`. De tabellen en regels staan daar; de oude modules houden hun toestand (klok, probes, laatste tijd) en vragen het antwoord:');
  out.push('');
  out.push('| Poort | Regel in hudbus | Toestand blijft in | Wat het beslist |');
  out.push('|---|---|---|---|');
  out.push('| `hud` | `mayShowP` | `hudrules.js` | P0 tot P3: bij drukte of dialoog wacht P3 (en P2 in zone A) |');
  out.push('| `narrative` | `decideStart` | `narrative.js` | verhaal, praat en toasts, een tegelijk, met pauzes |');
  out.push('| `moment` | `decideMoment` | `attention.js` | filmische momenten: afkoeling, snelheid, rang na een hoger moment |');
  out.push('| `tip` | `decideTip` | `attention.js` | een tip per 20 s |');
  out.push('| `voice` | `decideVoice` | `attention.js` | telefoonberichten voorlezen: personage altijd, nieuws en app om de 45 en 30 s |');
  out.push('| `overlay` | `decideOverlay` | `overlayhold.js` | een volledig-scherm kaart houdt kleine kaarten tegen |');
  out.push('| `speech` | `decideSpeak` | `speech.js` | een stem tegelijk, een hogere klasse snijdt een lagere af |');
  out.push('');
  out.push('Daarnaast: de kaartenwachtrij (`enqueueCard`, `hudcards.js`) en de zonelayout (`decideHud`, `hudrules.js`). Een nieuwe module die zelf iets op het scherm zet moet in `SURFACES` staan (`scripts/hudbus_surfaces_test.mjs`), met een poort of met de reden waarom niet.');
  out.push('');
  out.push('## Per kanaal');
  out.push('');
  out.push('| Kanaal | Module | Aanroepers | Prioriteit | Zone | Via hudbus | Voorstel #92 |');
  out.push('|---|---|---|---|---|---|---|');
  for (const id of [...gated, ...own]) {
    const s = B.SURFACES[id];
    const c = callersOf(id);
    const mods = s.files.length > 3 ? s.files.slice(0, 3).join(', ') + ` en ${s.files.length - 3} andere` : s.files.join(', ');
    const call = c ? `${c.modules} ${c.modules === 1 ? 'module' : 'modules'}, ${c.calls} ${c.calls === 1 ? 'aanroep' : 'aanroepen'}` : 'beslist zelf';
    out.push(`| ${id} | ${mods} | ${call} | ${pLabel(id)} | ${zLabel(id)} | ${gateLabel(id)} | ${INFO[id]?.suggest || ''} |`);
  }
  out.push('');
  out.push('## Wat de speler ziet');
  out.push('');
  for (const id of ids) out.push(`- **${id}**: ${INFO[id]?.what || ''}`);
  out.push('');
  out.push('## Voor #92: wat kan samen, wat kan weg');
  out.push('');
  out.push('Zes groepen die nu apart zijn gebouwd en voor de speler grotendeels hetzelfde zijn:');
  out.push('');
  out.push('1. **Eén tekstkaart** (zone A): `kaart`, `bericht` (wat geen verhaal is), `prestatie` en `opgeslagen` worden één stroom van kaartjes met een icoon per soort. Dat haalt twee eigen DOM-elementen weg en maakt de rang duidelijk.');
  out.push('2. **Eén telefoon**: `bel` en `radio` zijn twee schermen voor hetzelfde gesprek (portret, een regel, geluid).');
  out.push('3. **Eén praatkanaal**: `opmerking`, `autopraat` en `ballon` laten een personage praten; kies per moment ondertitel of ballon, nooit beide.');
  out.push('4. **Eén activiteitenpaneel** bovenaan: `keuze`, `bord` en `activiteit` (stuntscore, heist, tekstbijbaan en de panelen van padel, kermis en bakronde) zijn dezelfde familie en delen nu elk hun CSS-string.');
  out.push('5. **Eén plaatsblok**: `plaatsnaam`, `moment` (wijk, landmark) en `opgeslagen`.');
  out.push('6. **Eén voertuigblok**: `voertuighud` per voertuigsoort, via `hudlook`.');
  out.push('');
  out.push('Bewust niet aan een poort gekoppeld (`own` in de tabel): `status` en `toetsen` worden door `decideHud` neergezet, `activiteit`, `voertuighud` en `samen` horen bij een activiteit of voertuig dat de rest al wegzet (`playerBusy`), `menu`, `invoer`, `dev` en `effect` vragen niet om aandacht. Een poort erbij zou de beslissing veranderen, niet vastleggen.');
  out.push('');
  out.push('Blijven zoals ze zijn: `status`, `toetsen`, `ondertitel`, `scene`, `banner`, `spraak`, `samen`, `menu`, `invoer`, `dev`, `effect`.');
  out.push('');
  out.push('Vuistregel voor de omzetting: eerst de planner (die is er), dan per groep de kanalen samenvoegen en de rij uit `SURFACES` halen; de test houdt bij dat er geen nieuw kanaal naast komt.');
  out.push('');
  return out.join('\n');
}

if (process.argv.includes('--md')) {
  fs.writeFileSync(path.join(root, 'docs', 'KANALEN.md'), markdown());
  console.log('docs/KANALEN.md geschreven: ' + Object.keys(B.SURFACES).length + ' kanalen');
} else {
  consoleOut();
}

// every channel of CHANNELS answers a boolean for a plausible context
const quiet = { isOn: () => false, pending: () => false, since: () => 99, sinceAny: () => 99, toastAgo: 99 };
const probe = { kind: 'wijk', cls: 'react', name: 'naamkaart', p: 3, active: [], now: 100, last: -Infinity, voicedAt: {}, view: quiet, busy: false, callOn: false, narrativeBusy: false, speed: 0 };
probe.last = { any: -Infinity, level: 0, groups: {} };
const bad = Object.values(B.CHANNELS).filter((c) => typeof B.mayShow(c, c === 'tip' ? { now: 100, last: -Infinity } : probe) !== 'boolean');
if (bad.length) { console.log('kanalen zonder antwoord: ' + bad.join(', ')); process.exit(1); }
if (!process.argv.includes('--md')) console.log(`${Object.keys(B.CHANNELS).length} poorten, ${Object.keys(B.SURFACES).length} kanalen, ${Object.keys(B.KINDS).length} soorten kaarten, ${Object.keys(B.MOMENTS).length} momenten`);
