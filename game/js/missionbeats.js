// AAA akte 1 en 2 (docs/MISSIE-AAA-AKTE1-2.md, #955): de tussen-beat en de nasleep van een missie, puur data.
//
//   tussenBeats(label)   de korte gebeurtenissen halverwege (een zin met een sprekende bijfiguur, alleen beeld)
//   slotRij(label)       de nasleep na de uitslag: een rij [wie, wat] onder de beloning op de uitslagkaart
//   beatDue(...)         welke beats nu aan de beurt zijn (de runner toont ze via world.addMessage)
//
// Een beat verandert nooit iets aan de missie: geen doel, geen tijd, geen geld, geen kans op mislukken. Hij is een zin
// die de wereld laat leven, op een moment dat de speler daar de ruimte voor heeft (nooit in een cutscene).
// Trigger: `stage: k` (de stap met die index is bereikt), `wp: n` (checkpoint n gehaald) of `tijd: s` (seconden na de start
// van de missie); `na` is het uitstel in seconden na die trigger.
//
// Samen spelen: lokaal beeld bij de speler die de missie draait; er gaat niets over het net, in de beloning of de voortgang
// (per speler, #429). Een gast die meedoet ziet dezelfde beats via zijn eigen start; wie wegvalt of later aansluit mist alleen
// een zin. Alle namen zijn verzonnen.
const eindig = (v) => typeof v === 'number' && Number.isFinite(v);

// Per missie (sleutel: het label van de def). `wie` is de spreker; de tekst blijft onder de 12 woorden (hud-budget).
export const BEATS = {
  'Nul krassen, vijftienhonderd punten': { // M01
    tussen: [{ id: 'm01-duif', tijd: 75, wie: 'Jelmer', tekst: 'Chat: "Nul krassen? Een duif zat net op je spiegel."', secs: 4.5 }],
    slot: ['Berend', 'Nul krassen, zei ik. Ik tel thuis nog even na.'],
  },
  'Even pinnen': { // M02
    tussen: [{ id: 'm02-piep', stage: 1, na: 5, wie: 'Pinautomaat', tekst: 'Uw pas is veilig. Hij is nu van mij.', secs: 4 }],
    slot: ['Sjabbe', 'Nieuwe kleur, zelfde automaat. Ik heb hem nooit gezien.'],
  },
  'Het Loket': { // M03
    tussen: [{ id: 'm03-zucht', stage: 3, na: 3, wie: 'Man in de rij', tekst: 'Formulier 7B? Daar zijn er altijd zeven te weinig van.', secs: 4.5 }],
    slot: ['Loketbeambte', 'Uw stempel is gezet. Het scherm piept eens, voor u.'],
  },
  'Kieken van boven': { // M04
    tussen: [{ id: 'm04-meeuw', tijd: 50, wie: 'Meeuw', tekst: 'Je hebt geen brood bij je. Hij kijkt je lang aan.', secs: 4 }],
    slot: ['Bert', 'Mevrouw Pieper heeft het goed gedaan. Ze eet vanavond twee keer.'],
  },
  'Wind tegen, beide kanten op': { // M05
    tussen: [{ id: 'm05-paaltje', wp: 3, na: 1, wie: 'Eerstejaars', tekst: 'Een eerstejaars fietst tegen een paaltje. "Ik zag hem wel!"', secs: 4 }],
    slot: ['Sjoerd', 'Podium is podium. De taart gaat in de Kiezelweek.'],
  },
  'Het museum stond er al zo': { // M06
    tussen: [{ id: 'm06-bel', tijd: 100, wie: 'Museum', tekst: 'Ergens in het gebouw gaat een telefoon. Niemand neemt op.', secs: 4.5 }],
    slot: ['Tammo', 'Een sirene op afstand. Waarschijnlijk voor iets anders.'],
  },
  'Al het vet van Grunn': { // M07
    tussen: [{ id: 'm07-durk', stage: 1, na: 20, wie: 'Durk', tekst: 'Dat is niet jouw vet! Douwe: "Het is van Grunn!"', secs: 4.5 }],
    slot: ['Oosterpoort-publiek', 'Iemand vraagt of het vet gratis is. Niemand antwoordt.'],
  },
  'Fatbikes tellen niet als fiets': { // M08
    tussen: [{ id: 'm08-meloen', tijd: 45, wie: 'Fatbiker', tekst: 'Een fatbike scheurt langs, met een meloen op het stuur.', secs: 4 }],
    slot: ['Oma Trijntje', 'Je loopt als een echte Ommelander: rechtdoor, zonder te kijken.'],
  },
  'Heel aankomen is ook een kunst': { // M09
    tussen: [{ id: 'm09-geesje', stage: 2, na: 3, wie: 'Geesje', tekst: 'Eén ei is geen ei. Zestig is een ontbijt.', secs: 4 }],
    slot: ['Koster', 'Hij telt de eieren twee keer, voor de zekerheid.'],
  },
  'Een trekker-limo op de wierde': { // M10
    tussen: [{ id: 'm10-toeter', stage: 2, na: 6, wie: 'Chauffeur', tekst: 'De limo toetert en zwaait vriendelijk. Dat is het engste.', secs: 4.5 }],
    slot: ['Jelle', 'Hij zwaait vanaf de sloot. Je zwaait niet terug.'],
  },
  'Geleend van de Friezen': { // M11
    tussen: [{ id: 'm11-zeehond', stage: 3, na: 4, wie: 'Zeehond', tekst: 'Een zeehond kijkt alsof jij op zijn plek staat.', secs: 4 }],
    slot: ['Klaas', 'Geleend is niet gestolen. Hooguit lang gebruikt.'],
  },
};

export const tussenBeats = (label) => (BEATS[label] && BEATS[label].tussen) || [];
export function slotRij(label) {
  const b = BEATS[label];
  return b && Array.isArray(b.slot) && b.slot.length === 2 ? [b.slot[0], b.slot[1]] : null;
}

// De zin zoals de speler hem leest.
export const beatTekst = (b) => `${b.wie}: ${b.tekst}`;

// Welke beats nu moeten klinken. `staat`: { gezien: {id: tijdstip}, getoond: Set } wordt hier bijgewerkt; ctx: { t, stageIndex, wpIndex }
// (t = seconden sinds de start van de missie). Geeft de lijst terug (meestal leeg); de aanroeper toont ze.
export function beatDue(label, staat, ctx) {
  const uit = [];
  for (const b of tussenBeats(label)) {
    if (staat.getoond.has(b.id)) continue;
    let bereikt = false;
    if (eindig(b.stage)) bereikt = eindig(ctx.stageIndex) && ctx.stageIndex >= b.stage;
    else if (eindig(b.wp)) bereikt = eindig(ctx.wpIndex) && ctx.wpIndex >= b.wp;
    else if (eindig(b.tijd)) bereikt = ctx.t >= b.tijd;
    if (!bereikt) continue;
    if (staat.gezien[b.id] === undefined) staat.gezien[b.id] = ctx.t;
    if (ctx.t - staat.gezien[b.id] >= (b.na || 0)) { staat.getoond.add(b.id); uit.push(b); }
  }
  return uit;
}
