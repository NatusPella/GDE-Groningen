// The new story arc's missions (storyarc_nieuw.js, docs/verhaal/nieuw): its own defs, appended after the
// old ones in the order of MISSION_IDS (append-only: indices live in saves), and how the arc stages the
// defs it shares with the old one.
// Kept out of missions.js so the voice coverage (scripts/voicelines_collect.mjs reads that
// file) does not see their hint texts, which are text only.

import { buildAkte5Defs, applyAkte5 } from './missions_akte5.js';
import { wgsToWorld } from './rdnew.js';
import { ROOSTER } from './heliplan.js';
import { makeStrip } from './planecontrol.js';

// A spot in the province by latitude/longitude plus metres east/south (province roads are not in the city map: no road snapping).
const spotAt = (lat, lon, dx = 0, dy = 0) => { const [x, y] = wgsToWorld(lat, lon); return { x: x + dx, y: y + dy, road: null }; };

// M14: the finish at the sluis of Delfzijl and the start 8 km back along the line to the Eemshaven
const DIJK_SLUIS = spotAt(53.3245, 6.9270);
const DIJK_START = (() => { const e = spotAt(53.4395, 6.8350), L = Math.hypot(e.x - DIJK_SLUIS.x, e.y - DIJK_SLUIS.y), k = 8000 / L; return { x: DIJK_SLUIS.x + (e.x - DIJK_SLUIS.x) * k, y: DIJK_SLUIS.y + (e.y - DIJK_SLUIS.y) * k, road: null }; })();

// M15: the grass strip of Roelfien near Midwolda (Oldambt), pointing at the kermis of Winschoten, and a spot relative to that kermis
const kermisAt = (dx, dy) => { const p = spotAt(53.1444, 7.0356, dx, dy); return { x: p.x, y: p.y }; };
const AIRSTRIP_SPEC = (() => { const a = spotAt(53.1990, 7.0150), k = spotAt(53.1444, 7.0356); return { x: a.x, y: a.y, heading: Math.atan2(k.y - a.y, k.x - a.x), length: 520 }; })();
const AIRSTRIP = makeStrip(AIRSTRIP_SPEC);

// The def pieces: walk(x, y) / drive(x, y) are missions.js's road spots.
import { buildAkte4Defs, applyAkte4 } from './missions_akte4.js';
import { buildAkte2Defs, applyAkte2 } from './missions_akte2.js';

export function buildNieuwDefs({ map, walk, drive, models = {} }) {
  const list = [];
  // Het Loket is het Stadhuis aan de Grote Markt (een echt loket in een kantoor; het Goudkantoor ernaast is een restaurant, #335):
  // de rij loopt buiten, voor de westgevel op het plein tussen het Goudkantoor en het Stadhuis. Vaste punten, op begaanbare grond gezet.
  const LOKET = { rij: [108, 108], A: [108, 96], C: [114, 122] };
  const loketAt = (dx, dy) => walk(LOKET.rij[0] + dx, LOKET.rij[1] + dy);
  const loket = (key, label) => ({ at: LOKET[key], snap: 'walk', label });
  list.push(
    {
      // M03 Het Loket: a queue puzzle on foot. Jelle bought the queue, so from his scene on the clock runs faster.
      type: 'stages',
      label: 'Het Loket',
      intro: ['Het Loket in het Stadhuis aan de Grote Markt: om twaalf uur sluit de inschrijving voor de Noordelijke Snackprijs, en het loket neemt alleen contant.', 'De rij staat buiten, voor de gevel. Trek een wachtnummer, haal formulier 7B en de stempel, en schrijf in. Voor twaalf uur.'],
      outro: 'Ingeschreven voor de Noordelijke Snackprijs. Jelle wil de Gouden Eierbal: pak hem eerst. Nieuw doel: naar Bert op het Stationsplein.',
      timeLimit: 180,
      costRow: ['Inschrijfgeld', '-€150, contant betaald'],
      timeUp: 'het Loket is dicht. Om twaalf uur sloot de inschrijving',
      reward: 0,
      onFoot: true,
      start: loketAt(-10, 14),
      stages: [
        { kind: 'goto', target: loket('rij', 'Het Loket: wachtnummer'), mode: 'foot', radius: 5, stop: 0.8, label: 'Trek een wachtnummer', say: 'Nummer 4117. Op het scherm staat 4093.' },
        // a beat of waiting, so the queue is felt before Jelle buys it (timing instead of only walking)
        { kind: 'hold', target: loket('rij', 'Het Loket: wachtrij'), radius: 6, time: 5, ticks: ['Scherm: 4101. Nog zestien nummers.', 'Scherm: 4109. Bijna aan de beurt.'], label: 'Wacht in de rij tot je nummer komt', say: 'Blijf in de rij staan tot 4117 wordt omgeroepen.' },
        {
          kind: 'scene', label: 'Jelle', kicker: 'Het Loket', script: { ids: ['M03.2'] }, clock: 3,
          cast: [{ key: 'jelle', pose: 'hold', at: [2.6, 0.8] }, { key: 'bewaarder', pose: 'hips', at: [3.6, -1.2] }],
        },
        {
          kind: 'goto', target: loket('A', 'Loket A: formulier 7B'), mode: 'foot', radius: 5, stop: 0.8,
          label: 'Haal formulier 7B bij loket A', say: 'Formulier 7B, in drievoud. Niet vouwen.', talk: { ids: ['M03.3'], from: 0, to: 4, delay: 1.2 },
        },
        {
          kind: 'goto', target: loket('C', 'Loket C: de zijdeur van het Stadhuis'), mode: 'foot', radius: 5, stop: 0.8,
          label: 'Haal de stempel bij loket C', say: 'Loket C heeft een zijdeur, naast de kopieermachine die iemand buiten heeft gezet.', talk: { ids: ['M03.3'], from: 4, to: 7, delay: 1.2 },
        },
        {
          kind: 'goto', target: loket('rij', 'Het Loket: inschrijven'), mode: 'foot', radius: 5, stop: 0.8,
          label: 'Schrijf in bij de balie', say: 'Alles bij elkaar: nu inschrijven, honderdvijftig euro contant.', pay: 150, paid: 'Inschrijving Noordelijke Snackprijs', payShort: ' Tessa legt de rest bij.',
        },
      ],
    },
    {
      // M01 Nul krassen, vijftienhonderd punten: the stunt on the Grote Markt in Berend's bakkie, then the delivery (scratches count over both parts)
      type: 'deliver',
      label: 'Nul krassen, vijftienhonderd punten',
      triggerRadius: 6,
      intro: ['Je hebt uiterlijk morgen honderdvijftig euro nodig voor de inschrijving van de Noordelijke Snackprijs. Een streamer betaalt honderdvijftig voor stunts. Berend Bos betaalt vijftig voor zijn bakkie.', 'Doel: haal vijftienhonderd stuntpunten op de Grote Markt. Parasols en kliko\'s geven punten; mensen en krassen kosten je. Breng het bakkie daarna heel naar het Boterdiep.'],
      outro: 'Honderdvijftig op de pas, vijftig van Berend. Nieuw doel: morgenochtend pinnen en inschrijven bij Het Loket.',
      timeLimit: 240,
      timeUp: 'tijd op. Jelmers chat is al naar een kattenfilmpje en Berend wacht nog',
      vehicleFail: { gone: 'Berends bakkie is foetsie', wrecked: 'Berends bakkie is afgeschreven. Hij telde nul krassen, nu telt hij niks meer', left: 'je liet Berends bakkie staan. Hij telde nul krassen, geen parkeerbonnen' },
      reward: 200,
      scratchFine: 0.5,
      vehicleName: 'Berends bakkie',
      destName: 'het Boterdiep',
      stunt: { center: { x: 168.69, y: 70.04 }, radius: 46, target: 1500 },
      handBack: { how: 'drive', say: 'Berend pakt zijn sleutels terug en rijdt weg. Wij lopen, Tessa.' },
      start: drive(223.17, -30.52),
      dest: drive(-22.92, -491.56),
      say: 'Eerst de Grote Markt: vijftienhonderd stuntpunten, zonder krassen. Daarna het Boterdiep.',
    },
    {
      // M13 Het containerlabyrint: a sneak between the wind blades, cable drums and containers of the Eemshaven quay on the heist watchers;
      // the crane cabin is a place to keep still, no crane to drive. The places are guesses until the Eemshaven tiles are seen.
      type: 'stages',
      label: 'Het containerlabyrint',
      intro: ["De Eemshaven, vannacht. Lammert, de havenmeester, wacht aan de kade, tussen de windmolenbladen en kabelrollen.", "Doel: zoek container 4471 onder de kabelrollen. Sluip langs de bewakers en camera's, verwissel de papieren en ga weg voordat het schip om zes uur vertrekt."],
      outro: 'De papieren zijn verwisseld. Het schip van Jelle vaart leeg weg.',
      timeLimit: 480,
      timeUp: 'het schip van zes uur is vertrokken, met container 4471 vol. Lammert schudt zijn hoofd',
      costRow: ['Gewonnen', 'Het schip van Jelle vaart leeg weg'],
      reward: 900,
      onFoot: true,
      heist: { bare: true },
      start: spotAt(53.4440, 6.8560),
      stages: [
        { kind: 'goto', watch: { guards: 1, cameras: 1 }, target: { ...spotAt(53.4440, 6.8560, 120, -55), label: 'De kraan aan de kade' }, mode: 'foot', radius: 7,
          label: 'Sluip naar de kraan aan de kade', say: "Eerst de kraan: daarvan zien we welke container blauw is. Blijf uit de lichtbundels en de camera's." },
        { kind: 'hold', target: { ...spotAt(53.4440, 6.8560, 120, -55), label: 'De kraankooi' }, radius: 8, time: 9, mode: 'foot', ticks: ['Het eerste piepje. Niet bewegen.', 'Het tweede piepje. De bewaker kijkt omhoog.'],
          label: 'Blijf stil in de kraankooi tot de bewaker wegloopt', say: 'In de kooi van de kraan. Lammert belt: de bewaker kijkt bij het tweede piepje omhoog. Niet bewegen.', talk: { ids: ['M13.2'], delay: 1.5 } },
        { kind: 'goto', watch: { guards: 2, cameras: 1 }, target: { ...spotAt(53.4440, 6.8560, 260, 40), label: 'Container 4471' }, mode: 'foot', radius: 6,
          label: 'Zoek container 4471, de blauwe naast de rode', say: 'Van boven zag je hem: de blauwe, naast de rode. Container 4471.' },
        { kind: 'hold', target: { ...spotAt(53.4440, 6.8560, 260, 40), label: 'Container 4471' }, radius: 6, time: 6, mode: 'foot', ticks: ['De oude papieren eruit.', 'De nieuwe erin, naar het adres van Lammert.'],
          label: 'Verwissel de papieren van container 4471', say: 'Papieren eruit, papieren erin. Even rustig staan.' },
        { kind: 'goto', watch: { guards: 1, cameras: 0 }, target: { ...spotAt(53.4440, 6.8560, 10, 5), label: 'Lammert, aan de kade' }, mode: 'foot', radius: 7,
          label: 'Terug naar Lammert aan de kade', say: 'Klaar. Terug naar de kade, voor het schip vertrekt.' },
      ],
    },
    {
      // M14 De dijk: a race to the sluis of Delfzijl against Jelle's trekker-limo (with the deurwaarder). The limo follows the roads
      // like a chase vehicle (missions.js updateChaseRace); the places are guesses until the Eemsdelta tiles are seen.
      type: 'stages',
      label: 'De dijk',
      intro: ["Zaterdag, zonsopgang. Om acht uur legt Jelles deurwaarder beslag op de ligplaats van Lammerts woonschip in Delfzijl, met al het vet, de eieren en het zout van de vrienden van Oma erin.", "Wees eerder bij de sluis van Delfzijl dan de trekker-limo met de deurwaarder. De dijk is lang en er staan schapen op de weg."],
      outro: 'Wij waren eerst bij de sluis van Delfzijl. Het beslag mislukt: de voorraden zijn veilig.',
      timeLimit: null,
      reward: 1000,
      vehicle: 'car',
      snapStart: true,
      vehicleName: 'de auto van Lammert',
      handBack: { how: 'park', say: 'De auto blijft bij de sluis, Lammert regelt de rest. Wij gaan te voet verder.' },
      vehicleFail: { gone: 'de auto van Lammert is foetsie, en de limo rijdt door', wrecked: 'de auto van Lammert is afgeschreven. De dijk is lang als je loopt', left: 'je liet de auto staan. Lopend haal je de sluis niet voor acht uur' },
      costRow: ['Gered', 'De voorraden van de vrienden van Oma blijven in Delfzijl'],
      start: DIJK_START,
      stages: [
        { kind: 'board', label: 'Stap in de auto naast de trekker-limo', say: 'Instappen. De trekker-limo van Jelle staat al te ronken.' },
        {
          kind: 'chase', race: true, label: 'Wees eerder bij de sluis van Delfzijl dan Jelles deurwaarder',
          say: 'Naar de sluis van Delfzijl, over de dijk. Eerste aan de sluis houdt de voorraden. Let op de zijwind en de schapen.',
          finish: { ...DIJK_SLUIS, label: 'De sluis van Delfzijl' }, flee: [DIJK_SLUIS.x, DIJK_SLUIS.y], radius: 18, rivalRadius: 45,
          name: 'Jelles trekker-limo', lead: 30, cruise: 24, health: 400,
          vehicle: { name: 'trekkerlimo', len: 5.6, wid: 2.0, maxSpeed: 27, accel: 5, brake: 12, turnRate: 1.5, color: '#141414' },
          talk: { ids: ['M14.2'], delay: 8 },
          won: 'Eerst bij de sluis! De deurwaarder staat met zijn map in de wind.',
          lost: 'Jelles deurwaarder was eerder bij de sluis. Het beslag is gelegd',
        },
      ],
    },
    {
      // M15 Laag over het graan: Roelfien's gewasspuiter (the plane of planeflight.js) on a strip in the Oldambt; low gates over the
      // kermis of Winschoten with the banner behind it (planestage.js). The strip near Oostwold is a guess until it is checked in OSM
      // (aeroway=aerodrome); no airfield is invented, the plane stands on a grass strip like Kist Kees at Eelde.
      type: 'stages',
      label: 'Laag over het graan',
      intro: ["Roelfien wacht bij haar graanveld bij Midwolda. Jelle geeft de juryleden op de kermis een gratis proeverij, en zo wil hij ze kopen.", "Doel: vlieg Roelfiens vliegtuigje laag over het graan en pik het spandoek op. Sleep het over de kermis. Houd de molen rechts en trek de neus pas omhoog na de kermis."],
      outro: 'Het spandoek hing boven de kermis. Twee juryleden stapten uit.',
      timeLimit: null,
      reward: 900,
      onFoot: true,
      start: { x: AIRSTRIP.point(24, 14).x, y: AIRSTRIP.point(24, 14).y, road: null },
      stages: [
        { kind: 'plane', strip: AIRSTRIP_SPEC, label: 'Stap in het vliegtuig van Roelfien', say: 'Roelfiens rode gewasspuiter staat op de strook. Instappen, Tessa stuurt.' },
        {
          kind: 'airgates', label: 'Laag over het graan, het spandoek over de kermis', banner: 'JELLE KOOPT DE JURY. LEVENSLANG EIERBALLEN',
          say: 'Opstijgen en laag over het graan. Eerst het spandoek aan de paal oppikken, dan naar de kermis van Winschoten.',
          high: 'te hoog: niemand ziet het spandoek', low: 'te laag: het spandoek en de wielen zitten in het graan', wide: 'de poort gemist: zo ziet de kermis het spandoek niet',
          crashed: 'het vliegtuig is neergestort. Roelfien is niet blij', talk: { ids: ['M15.2'], delay: 6 },
          gates: [
            { ...AIRSTRIP.point(430), r: 30, lo: 3, hi: 24, banner: true, label: 'De paal met het spandoek', say: 'Spandoek opgepikt! Laag blijven, naar de kermis.' },
            { ...kermisAt(-120, -420), r: 45, lo: 15, hi: 75, label: 'Over de molen, hou hem rechts' },
            { ...kermisAt(-40, -60), r: 40, lo: 14, hi: 48, label: 'Over de kermis', say: 'Ze lezen het! Door de rij kramen.' },
            { ...kermisAt(70, 70), r: 40, lo: 14, hi: 48, label: 'Door de rij kramen' },
            { ...kermisAt(260, 260), r: 55, lo: 18, hi: 140, label: 'Trek op na de kermis', say: 'Voorbij de kermis. Nu terug naar de strook.' },
          ],
        },
        { kind: 'landplane', label: 'Land op de strook bij Roelfien', say: 'Terug naar de strook. Gas eraf, neus iets omlaag, en rem met Shift als je staat.', crashed: 'het vliegtuig is neergestort. Roelfien is niet blij' },
      ],
    },
  );
  // akte 4 (missions_akte4.js): bruggen, wiebelwerk, stoom, beleg, in the order of NEW_MISSION_IDS
  list.push(...buildAkte4Defs());
  list.push(...buildAkte5Defs({ map, walk, drive }));
  // akte 2 (missions_akte2.js): eieren, wierde, after the ids of acts 3 to 5 in NEW_MISSION_IDS
  list.push(...buildAkte2Defs({ models }));
  return list;
}

// How the new arc stages the defs it shares with the old one: which script scene is said where,
// the hints that named people who are not in this story, and what the story has dropped.
// Stage fields: script { ids, from, to } = the lines of a stage scene; talk { ids, from, to, delay } =
// subtitle talk while the stage runs (storytalk.js); radioScript = a radio fragment (storytext.js).
export function applyNieuw(list) {
  const by = (label) => list.find((d) => d.label === label);
  applyAkte4(list);
  applyAkte2(list);
  const stageOf = (def, kind, n = 0) => def.stages.filter((q) => q.kind === kind)[n];
  const pin = by('Even pinnen');
  if (pin) {
    pin.stages[1].talk = { ids: ['M02.2'], delay: 1.5 };
    // the goal said aloud (#93): shake the police, then deliver
    pin.stages[1].label = 'Schud de politie af: rij een garage in';
    pin.stages[2].label = 'Breng de automaat naar Sjabbe (Pand & Poen)';
  }
  const duif = by('Kieken van boven');
  if (duif) {
    duif.stages[0].talk = { ids: ['M04.2'], delay: 6 };
    // the goal said aloud, and the fuse box too (09-script: three cameras, two guards, a fuse box)
    duif.stages[0].label = 'Fotografeer 3 camera\'s, 2 bewakers en de stroomkast';
    duif.stages[0].targets.push({ landmark: 'Groninger Museum', off: [-29, -38], label: 'De stroomkast achter de fietsenstalling' });
    duif.timeLimit = 230;
    duif.timeUp = 'tijd op. Bert fluit de duif terug naar de duiventil';
  }
  const kei = by('Wind tegen, beide kanten op');
  // what each mission leaves you with, on the success card (#147): the clue or the consequence
  if (duif) duif.costRow = ['Ontdekt', 'Bewaker twee krijgt een eierbal voor zijn koekje'];
  if (kei) kei.costRow = ['Tip van Sjoerd', 'Om twaalf uur gaan de camera\'s drie minuten uit'];
  if (pin) pin.costRow = ['Ontdekt', 'De reuzen werken voor Jelle Terpstra'];
  const kraak = by('Het museum stond er al zo');
  if (kraak) kraak.costRow = ['Gevolg', 'De politie zoekt twee mensen in het zwart'];
  if (kei) kei.timeUp = 'tijd op. De eerstejaars zitten al aan de bar';
  if (pin) pin.vehicleFail = { gone: 'de auto met de automaat is foetsie, en de pas ook', wrecked: 'de auto met de automaat is afgeschreven. Sjabbe kan alleen openen wat heel is', left: 'je liet de automaat staan. Zonder automaat geen pas' };
  if (kei) kei.say = 'Podium in de Kiezelrace, dan vertelt Sjoerd over het museum. Altijd tegenwind, op een eigen fiets.';
  if (kei) kei.moment = { at: 3, text: kei.moment.text, talk: { ids: ['M05.2'] } };
  const vet = by('Al het vet van Grunn');
  if (vet) {
    vet.stages = vet.stages.filter((q) => q.kind !== 'vault');
    vet.stages[0].say = 'Instappen. De tankwagen staat bij de groothandel.';
    vet.stages[1].go = 'Ze zien ons! Daar gaat hij. Erin springen, of de banden plat. Schieten mag, rammen mag.';
    vet.stages[1].stopped = 'Pang! Banden plat. De bewakers rennen weg, Durk en Douwe fietsen achter hun baas aan.';
    vet.stages[1].hijack = 'Gekaapt! De bewakers rennen weg. Het vet is van ons.';
    const to = stageOf(vet, 'goto', 0);
    to.talk = { ids: ['M07.2'], delay: 3 };
    vet.outro = 'Het vet is terug in Grunn. Plakje twee is gered.';
    vet.costRow = ['Gered', 'Plakje twee: het vet blijft in Grunn'];
    vet.vehicleFail = { gone: 'Femkes auto is foetsie, en de tankwagen rijdt door', wrecked: 'de auto is afgeschreven. Femke wil hem niet zo terug', left: 'je liet de auto staan. Zonder auto geen tankwagen' };
  }
  applyAkte5(list);
  // M12 Het staat niet in het rooster: Dijkstra picks them up at Lauwersoog; the flight is the 'rooster' variant of helirun.js
  const rooster = by('Het staat niet in het rooster');
  if (rooster) {
    const L = ROOSTER.lauwersoog;
    rooster.intro = ['Dokter Dijkstra landt in Lauwersoog met Rotor Roelfs heli. De nachtdienst heeft honger, en Jelle vliegt met zijn koopboek boven de Dollard.', 'Doel: eerst de lunch naar het UMCG, dan achter de ballon aan. Houd de heli stil naast de mand, dan pakt Tammo de aktetas met het koopboek.'];
    rooster.outro = 'Tammo knipte de aktetas los. Het koopboek van Jelle: acht plakjes.';
    rooster.start = { x: L.x - 7, y: L.y + 5, road: null };
    delete rooster.startSpot;
    rooster.stages = [{ kind: 'heli', variant: 'rooster', target: { x: L.x, y: L.y, label: 'Terrein bij de visafslag, Lauwersoog' }, hint: 'Naar het terrein bij de visafslag in Lauwersoog: Dokter Dijkstra wacht.',
      label: 'Vlieg Dijkstra\'s lunch naar het UMCG, haal dan de aktetas met Jelles koopboek uit de ballon boven de Dollard', say: 'Instappen bij Dijkstra. Spatie omhoog, W vooruit, A/D draaien. Dijkstra vliegt de lange stukken, jij houdt de heli stil naast de mand.', lost: 'de ballon is ontsnapt over de Dollard' }];
    rooster.costRow = ['Ontdekt', 'Plakje acht: notaris, 28 augustus'];
  }
  // M16 Nog eentje dan: the kroegentocht moves to the kermis of Winschoten (Sat 22 Aug): three tents on foot
  const kerm = by('Nog eentje dan');
  if (kerm) {
    const W = (dx, dy) => spotAt(53.1444, 7.0356, dx, dy);
    const via = (dx, dy) => ({ ...W(dx, dy), via: true });
    const tent = (name, dx, dy, toast) => ({ ...W(dx, dy), name, toast });
    kerm.intro = ['De kermis van Winschoten, zaterdagavond. Geert heeft drie tenten, en Durk en Douwe zingen aan zijn bar.', 'Doel: volg Durk en Douwe langs drie tenten en win in de botsauto\'s hun geheim. Elke tent een drankje; de dronken menigte duwt je zo omver.'];
    kerm.outro = 'Drie tenten gehaald. Durk en Douwe zijn moe genoeg voor de botsauto\'s.';
    kerm.say = 'Loop langs drie tenten en drink in elke tent mee. De menigte duwt, dus blijf overeind en wees binnen de honderd seconden klaar.';
    kerm.timeLimit = 100;
    kerm.timeUp = 'tijd op. De tenten sluiten, Durk en Douwe zingen door zonder jullie';
    kerm.checkpointBonus = 25;
    kerm.drunk = 0.25;
    kerm.crowds = [W(-20, 25), W(20, 10), W(60, 30), W(63, 3), W(25, -45)];
    kerm.start = W(-55, 45);
    kerm.waypoints = [
      via(-20, 30),
      tent('Tent De Gouden Aar', 15, 8, { glass: 'beer', variant: 0, lines: [['A', 'Proost!']] }),
      via(45, 28),
      tent('Tent Het Scheve Rad', 85, 40, { glass: 'wine', variant: 1, lines: [['student', 'Proost! Nog ééntje dan!'], ['A', 'Wie is dat?'], ['T', 'Een eerstejaars. Ze zijn overal.'], ['student', 'Ik hou van jullie allemaal!'], ['T', 'Dat geloof ik.']] }),
      via(72, -12),
      tent('Tent De Laatste Zweefmolen', 35, -55, { glass: 'jenever', variant: 2, lines: [] }),
    ];
    kerm.costRow = ['Ontdekt', 'Durk en Douwe zijn moe genoeg voor een rit'];
  }
  const mus = by('Het museum stond er al zo');
  if (mus) {
    // the black clothes and the boat are in the intro now (08 §2): only the dark is needed, and the call from home
    mus.requires = ['night'];
    stageOf(mus, 'scene').script = { ids: ['M06.3'], from: 0, to: 4 };
    stageOf(mus, 'scene').lines = [];
    const esc = stageOf(mus, 'escape');
    esc.radio = undefined;
    esc.radioScript = { ids: ['M06.3'], from: 4, to: 9, caller: 'Een beller uit Ljouwert' };
    esc.talk = { ids: ['M06.3'], from: 9, to: 17, delay: 5 };
  }
}

