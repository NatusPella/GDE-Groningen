> **Archief (oktober 2026).** Dit document is vervangen door `.specs-fire/standards/mechanica.md`.
> Het staat hier alleen als historie: gebruik het niet als bron en werk het niet bij.

# Onboarding: de eerste 10 minuten

Doel (ROADMAP 0.25): een nieuwe speler snapt de eerste 10 minuten zonder
uitleg van buiten de game. Korte, droge teksten, één ding tegelijk, en nooit
een tutorial die het spelen tegenhoudt.

Dit document heeft drie delen: wat een nieuwe speler nu ziet (de audit), wat
er in 0.25 is veranderd, en wat er nog openstaat.

## 1. Audit: van Nieuw spel tot de eerste activiteit

Gedaan op 3 okt (0.24 plus `claude/v025`): de code gelezen (startscreen.js,
intromontage.js, cinematics.js, story.js en storyarc.js voor H1 tot k-fiets,
prompts.js, hud_panel.js, hudcards.js, narrative.js en home.js), plus één
headless run van een vers profiel: Nieuw spel, de montage overgeslagen en
daarna de HUD elke twee seconden uitgelezen.

Wat de run liet zien, voor een speler die na de opening niets aanraakt:
de doelregel staat er meteen ("Berend telt de krassen · Volg de gele route
naar de marker"), dan een korte scène (de wissel naar Tessa), na 10 s de
eerste toetshints, van 12 tot 28 s Bel Rikus op de radio, en dan Tammo's
bericht ("Berend, bij het Martinikerkhof. Jij rijdt, zegt hij"). Daarna was
het stil: geen foutmeldingen, maar ook niets meer over de telefoon, de kaart
of wat er verder kan.

### Wat er al goed gaat

| Moment | Wat de speler ziet | Oordeel |
|---|---|---|
| Startscherm | Alleen spelen en Samen spelen, daaronder Wat is er nieuw, Instellingen, Over. Alleen spelen opent Opgeslagen spellen: bovenaan Doorgaan (het laatst gespeelde spel), als eerste kaart Nieuw spel ("Moi! Stap in en rij"). Zonder opgeslagen spel start Alleen spelen meteen een nieuw spel. | Duidelijk. |
| Opening | De montage (trailerparodie, de keukentafel, de verhuisdag) met "Houd SPATIE ingedrukt om over te slaan" rechtsonder. | Goed, al is hij lang voor iemand die meteen wil spelen. Overslaan staat in beeld. |
| Na de opening | De doelregel bovenin: "Berend telt de krassen · Volg de gele route naar de marker", met de gele route op de minimap en een label in de wereld. | Het belangrijkste is er: wat en waarheen. |
| Besturing | Toetshints linksonder komen één voor één binnen (lopen, rondkijken, rennen, springen, bukken); in de auto gas, handrem, toeter, radio, filmcamera. Bij de Escapade: "Jouw ouwe Escapade · Loop erheen, dan E". | Te veel: WASD en de muis snapt iedereen (de maker: "daar hoeven niet meer controls uitgelegd te worden"). Ze nemen de plek in van wat wél uitleg nodig heeft. |
| Het verhaal | Bel Rikus op Radio Nachtstreek vertelt de klus, de tekst van de stap komt als bericht op de telefoon, de partner zegt iets. De narrative-planner (narrative.js) zorgt dat dit na elkaar komt. | Rustig en in volgorde. |
| Thuis | "Jullie nieuwe flat! Bed: slapen en opslaan. Koelkast: eierbal. Kast: je kleren." | Goed, één kaart. |
| Eerste aankoop (k-fiets) | "Voor het verhaal: …" als kaart, de route naar Trap & Toeter, "Voor het verhaal: loop naar binnen (E)" op de doelregel, en een voorschot van Sjoerd als je geld tekortkomt. | Goed: niemand komt vast te zitten. |
| Vastlopen | Overslaan van een stap na een tijd, Zet me vrij, Missie stoppen (met een vraag vooraf). | Goed. |

### Wat ontbrak

1. **De telefoon werd nergens uitgelegd.** Berichten komen als toast binnen,
   maar dat je ze met T terugleest en dat er contacten en Kiekdoar in zitten,
   zag je alleen als de Telefoon-hint linksonder aan de beurt kwam. Dat is de
   laatste rij van de lijst (na lopen, kijken, rennen, springen, bukken), dus
   meestal pas na minuten, en als icoon zonder tekst.
2. **De kaart idem.** M staat in het pauzemenu naast "Kaart", maar dat je er
   zelf een doel mee zet ("klik, en de route gaat erheen, het verhaal wacht")
   staat alleen in de voettekst van de kaart zelf.
3. **Te doen** (alles wat openstaat, en er een doel van maken) zit in het
   pauzemenu en werd nergens genoemd. Een nieuwe speler weet na H1 niet dat
   er meer is dan de gele route.
4. **Geld en winkels:** het saldo staat rechtsboven, maar dat je geld
   verdient met missies en bijbaantjes, en dat je een winkel binnenloopt en
   E drukt, kwam alleen terloops ("Voor het verhaal: loop naar binnen (E)").
5. **Opslaan:** dat het spel zelf opslaat, zag je alleen aan het vinkje
   "Opgeslagen" linksonder; nergens stond dat je niets hoeft te doen.
6. **Geen manier om de uitleg over te slaan** voor wie dit soort games kent,
   behalve de toetshints helemaal uitzetten.
7. Niet veranderd, wel genoteerd: de opening duurt een paar minuten. Overslaan
   kan, en dat staat in beeld; een kortere versie voor een tweede keer
   spelen kan later.

## 2. Wat er in 0.25 is veranderd

**Toetshints alleen voor wat niet vanzelf spreekt** (`prompts.js`). Weg:
lopen, rondkijken, rennen, springen, bukken, zwemmen, en in voertuigen gas en
sturen, handrem, toeter, radio, filmcamera en achterom. Over blijven: in- en
uitstappen (E), eruit klimmen (E), de telefoon (T), de kaart (M), het
pauzemenu (Esc, nieuw), kusjes na H13, wapens zodra je er een draagt, en de
eigen besturing van de helikopter en de trein. Met een controller tonen
dezelfde rijen de knoppen van je controller.

`game/js/onboarding.js`: vier korte uitlegkaartjes (HUD-kaarten van het soort
tip, met kicker "Uitleg") over doelen en waar je heen moet, niet over
toetsen; elk één keer, op het moment dat ze nuttig zijn:

| Kaartje | Wanneer | Tekst (kort) |
|---|---|---|
| Je eerste klus | 12 s spelen na de opening, als alles stil is, er is een verhaalstap met een route, nog geen missie gehaald | "Bovenin staat je doel. Volg de gele route op de minimap tot in de gele marker. Ken je dit soort games? Esc › Instellingen › Weergave zet de uitleg uit." |
| Geld en winkels | de verhaalstap is een aankoop (k-fiets) | "Geld verdien je met missies en bijbaantjes; je saldo staat rechtsboven. Een winkel staat op de kaart: loop naar binnen en druk [E]." |
| Zelf kiezen | 30 s na Je eerste klus, als je de kaart nog nooit opende | "Liever iets anders eerst? Kies op de kaart ([M]) een plek of missie en de gele route gaat erheen. Het verhaal wacht zolang." |
| Te doen | de eerste missie die je in deze sessie haalt, 8 s na afloop | "Missie binnen, en het spel heeft opgeslagen. Alles wat nog openstaat staat onder Esc › Te doen: kies iets en de route gaat erheen." |

De regels:

- **Eén tegelijk.** Een kaartje start alleen als de narrative-planner een
  kaart toelaat (`mayStart('card')`), er geen scène, gesprek of radio speelt
  (`narrativeBusy`), je niet midden in een missie, bijbaantje, minigame,
  achtervolging of respawn zit, en het vorige kaartje 30 s oud is. Het is een
  gewone HUD-kaart: niets pauzeert, niets wacht op een klik.
- **Elk één keer, per apparaat** (`gte-uitleg`, net als de toetshints). Een
  tweede playthrough krijgt geen uitleg meer.
- **Wie het al weet, krijgt het niet:** heb je de kaart al geopend (de teller
  van prompts.js, `hintUses`), dan telt dat kaartje als gezien.
- **Overslaan:** Instellingen › Weergave › "Uitleg voor nieuwe spelers" zet
  ze uit. Het eerste kaartje zegt dat in één zin. De toetshints hebben hun
  eigen schakelaar (Toetshints) en blijven zoals ze waren.
- Toetsen in de tekst volgen je eigen indeling (Besturing › Toetsenbord).
- Geen stemmen: de kaartjes worden niet voorgelezen (`voice: false`), zodat
  ze nooit door een gesprek heen praten.

## 3. Nog open

- **Toetsen met echte nieuwe spelers** (ROADMAP 0.25). Drie of vier mensen
  die de game niet kennen, zonder uitleg vooraf, de eerste 10 minuten.
  Vragen achteraf:
  1. Wist je na de opening waar je heen moest? Hoe?
  2. Heb je je telefoon geopend? Wist je wat erin zat?
  3. Heb je de kaart of Te doen gebruikt om zelf iets te kiezen?
  4. Was er een moment dat je niet wist wat je moest doen? Wanneer?
  5. Waren er te veel kaartjes of meldingen tegelijk?
  En kijk mee: hoe lang tot de eerste marker, en of ze de fiets kopen
  zonder te zoeken.
- Een kortere opening voor wie de game al eens begon (nu: overslaan).
- ~~Controllerspelers: de kaartjes noemen toetsen.~~ Gedaan: de toetsen op
  de kaartjes volgen je laatste invoer, de controllerknop of je eigen
  toetsindeling (`claude/opruimen`).
