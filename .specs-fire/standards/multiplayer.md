# Spec: Samen spelen (multiplayer)

> Canonieke spec. Vervangt de regelinhoud van `docs/MULTIPLAYER-VISIE.md`,
> `docs/COOP-GAST.md`, `docs/COOP-OPSLAAN.md` en `docs/COOP-OVERDRAGEN.md`;
> die blijven als detailnaslag. `AGENTS.md` wint bij twijfel.

## Doel

Eén wereld, meer spelers: één spel draait de wereld, de anderen tekenen snapshots
en sturen invoer. Eenspeler is een sessie van één. Iedereen houdt zijn eigen geld,
verhaal en bezit; elke nieuwe functie krijgt een regel over Samen spelen.

## De ingang: altijd een sessie
Sinds #528 is Samen spelen de standaard, niet iets wat je erbij doet (ADR 0022).
- **Bij de eerste start** ziet de speler één scherm: zijn naam (die het spel onthoudt)
  en de vraag of hij met andere spelers meedoet. Ja of nee, en die keuze blijft bewaard
  in `gde-settings` als `onlineMeedoen`.
- **Ja** → het spel opent de expliciete lijst met openbare sessies; de speler kiest daar
  zelf. Sluit hij dat scherm zonder sessie, dan zoekt de automatische terugval alsnog een
  passende sessie en host anders zelf **besloten** (#556): geen aankondiging en geen plek
  in de openbare lijst. Openbaar maken doet alleen de host zelf in de lobby, met de
  #438-melding (`hub.zetOpenbaar`); het bootpad gaat nooit ongevraagd naar buiten. De
  volgorde staat in ADR [0026](adr/0026-bootorde.md).
  **Nee** → een besloten sessie van één: niets naar buiten, niets in een lijst,
  niemand komt binnen.
- **Enter in het naamveld is geen toestemming** (#556): typen + Enter zet alleen de
  focus op "Meedoen"; de keuze telt pas bij een knop of een tweede, bewuste Enter.
- **Ontbrekende waarde is geen ja.** Is `onlineMeedoen` niet gezet, dan vraagt het spel
  het één keer en zoekt het intussen geen contact. Een oude installatie wordt nooit
  stil openbaar.
- **Aanpasbaar** bij Instellingen > Samen spelen, samen met naam en kleur. Aanzetten
  opent het tabblad Samen spelen, waar de lobby (#95) host of aansluit; uitzetten maakt
  de sessie besloten (bestaande gasten blijven, nieuwe komen er niet bij, de regel
  verdwijnt uit de lijst). De schakelaar staat bij het profiel op het tabblad Spelers,
  dat er sinds #530 ook zonder sessie is: anders is "Alleen spelen" bij de eerste start
  een doodlopende weg.
- **Ontsnappen via Escape** gaat altijd: naar een besloten sessie, alleen of met
  vrienden via een kamercode, zonder de eigen voortgang te verliezen (#527).
- **De sessie van één is gewoon je eigen spel** (#554, ADR [0024](adr/0024-eenspeler-is-een-sessie-van-een.md)):
  `game/js/coopsolo.js` opent een gewone gastheer-sessie met `SOLO_MAX` 1 en alleen plek 0,
  zonder aankondiging, poort of verbinding (`scripts/coopsolo_test.mjs`). Alles wat van een
  gast afhangt valt terug op alleen spelen: de metgezel volgt de volg-AI omdat er geen
  gast-invoer is (`coop.local` staat in elke sessie op `false`; zonder gasten doet de
  volg-AI het werk, #559), de controller houdt de gewone D-pad-functies (#560), de
  uitlegkaart Samen spelen komt na de eerste missie (#568) en 7/8/9 zet zonder gasten geen
  baken (#567). Wie Samen spelen opent, stopt de sessie van één eerst.
- **De openbare lijst** toont naam, aantal spelers en versie; nooit een adres en nooit
  een wachtwoord.
- **Het bootpad** is `game/js/sessionboot.js` en is de terugval na de expliciete lijst
  (ADR [0026](adr/0026-bootorde.md)): zodra de wereld te besturen is (`coopnet.canJoin`)
  en `magOnline()` waar is, haalt het de lijst op (hooguit 2,5 s, daarna zonder lijst
  verder), laat `sessiekeuze.kies()` beslissen en sluit aan, opent zelf een sessie of
  blijft besloten. Mislukt een verbinding, dan volgt `sessiekeuze.volgende()`; na twee
  pogingen opent het spel zelf een sessie. De wereld speelt intussen door en de `reden`
  staat als korte regel in beeld (`scripts/sessionboot_test.mjs`). De sessie van één
  start pas als `sessionBootDone(world)` waar is en `canBootSession` weigert zolang er
  een sessie of overdracht loopt; er komt nooit een tweede hub.

## Rollen

- **Wie het spel opende** (intern `host`) draait de wereld (tijd, weer, verkeer,
  politie, opdrachten), maar is geen baas: iedereen is gelijkwaardig en de rol kan
  wisselen (#439).
- **Gast** is een dunne client: `updateGameplay` doet niets bij
  `coopRole === 'client'`.
- **Lokaal is iedereen de hoofdpersoon** van zijn eigen verhaal en ziet de anderen
  als online-avatar; geen rol per plek (#455).
- **Enige extra recht:** kicken en de wachtkamer van zijn sessie.
- **Pauzeren is voor jezelf (#687).** Het pauzemenu, de kaart en een winkel zetten
  alleen de invoer van wie ze opent stil; de wereld (en dus de klok en de andere
  spelers) loopt door (`coopnet.js` `coopWereldDoorloop`, `main.js`). Een film die
  iedereen ziet en het wachtscherm pauzeren wél hard (`world.uiHard`, `coopHold`).
- **Starten en stoppen zijn gezamenlijk (#642).** Elke speler start de wachtkamer
  (een gast vraagt het de opener: `vraagStart`/`startverzoek`) en elke speler mag
  "iedereen stoppen" voorstellen; de opener legt dat als stemming aan de groep
  voor (`vraagStop`/`stopverzoek`, J/N, net als de tijd). Een filmpje voor
  iedereen overslaan blijft de gedocumenteerde uitzondering van de opener; een
  gast slaat zijn eigen weergave over (ADR 0007).
- **Een verhaal-keuze is een stemming van de groep (#686).** De gastheer opent de
  stemming, elke speler (opener op plek 0 en elke gast) stemt met het nummer van
  zijn optie; de meerderheid wint, een gelijkspel beslist de stem van de opener en
  wie niet antwoordt telt niet mee. Zonder stemmen valt de keuze terug op de
  standaardkeuze van de ronde (`coopgroep.js` `stemKeuze`, `stagechoice.js`
  `stemStap`). Berichten `stem` (met `opties`), `stemantwoord` (met `keuze`) en
  `stemuitslag` (met `keuze`); dezelfde JSON-berichten als de tijdstemming, dus
  `PROTO` en `CODEC_VERSION` blijven 2. De gast leest "Jullie kiezen samen" en
  "Stem mee"; de stap en het gevolg blijven van de wereld van de opener.

## Opdrachtstand per groep

- Elke opdracht heeft een id (`<index>|<label>`); stand en deelnemers staan per id
  in `coopmissie.js`, zodat groepen elkaar niet overschrijven. De host stuurt de id
  mee in `missie`; een gast kent alleen zijn eigen id en keuze.
- Een groep heeft een `leider`: de starter, anders de eerste deelnemer. De host kan
  groepen ook buiten de missie boekhouden (`coopGroepStart`/`coopGroepZet`/`coopGroepEind`),
  maar **een groep ontstaat pas bij de start van een activiteit**: zonder activiteit of
  zonder deelnemer maakt de host geen groep, en na afloop verdwijnt ze. De host simuleert,
  maar is inhoudelijk niet de leider. De doelen gaan per slot naar de eigen groep.
- Een gast die een eigen activiteit doet (hengelen, pannenkoeken bakken, de beiaard, boeren)
  is een **groep van één** met hem als leider (`bezig|<plek>|<activiteit>`). Die groep staat
  naast een missiegroep van de host en verdwijnt als hij stopt. Twee door de host
  gesimuleerde missies of bijbanen naast elkaar kunnen nog niet: dat vraagt een keten of
  ctx per groep (open, #492).
- **Meedoen?**: J of N, 10 s, **geen antwoord is nee** (toeschouwer); verplicht bij
  `presence 'beide'`/`needsTwo`; een spoilerwaarschuwing vraagt een eigen J; geen
  late instap bij race, kluisklus of timer (een J later dan 15 s telt niet).
- Meedoen geeft de volledige beloning en de eigen verhaalstap; nee of wegvallen
  geeft niets.
- **1+1=3** (ADR 0020): elke extra deelnemer geeft elk lid 50% meer loon, tot 3× per
  persoon (`GROEPSBONUS_PER_SPELER` 0,5 en `GROEPSBONUS_MAX` 3,
  `game/js/groepsbonus.js:11-12`); daarboven groeit alleen het totaal. Het aantal spelers
  is niet cap-based begrensd; de host en de verbinding bepalen de praktische grens. Solo
  blijft factor 1.

## Overdracht

- Elke speler kan gevraagd worden (20 s, J/N); de momentopname gaat in stukken van
  800 tekens over de sessie. Bij mislukken houdt de oude host het spel
  (terugvalkamer, 30 s); bij wegvallen neemt de opvolger (`rangschik`) over na 12 s
  stilte. De aansluittijd is 40 s.
- Mee: klok, dag, weer, gezocht, opdracht met stage en tijd, kapotte objecten,
  bezette voertuigen (model, kleur, schade), zaad en plek. Niet mee: verkeer,
  voetgangers en dieren, geld en voortgang per speler, het verhaal van de nieuwe
  host.
- Elke melding zegt wat er gebeurde, wie het spel heeft en wat de lezer doet.

## Passive mode en PvP

- Iedereen begint passief; schade tussen spelers alleen als beiden actief staan,
  met 10 s afkoel. Een kogel gaat door een passieve speler; wie weggaat is weer
  passief.
- Neergaan door een speler kost niets (volle gezondheid, zelfde plek, 6 s
  bescherming); dood door de wereld blijft zoals hij was.
- PvP alleen buiten passief; bloed en gore mogen daar (constitutie 6) maar worden
  nog niet getekend. Een aanval op een passieve speler meldt dat één keer per 5 s.
- Arena (#454): 2–8 niet-passieve spelers, 2,5 minuut, geen late instap of
  teamwissel.

## Beloningen en bewaren

- Beloning per gebeurtenis met een id, nooit dubbel; `coopbeloning.js` keert het volle
  bedrag één keer per deelnemer uit (`BONUS_FACTOR` 1, `game/js/coopbeloning.js:7`), want
  de oude samenwerkingsbonus bestaat daar niet meer. De 1+1=3-factor is een tweede,
  aparte laag uit `game/js/groepsbonus.js:16` en gaat op de betaalhaak over het bedrag
  van die speler; wedstrijden belonen per plek.
- Iedere speler schrijft zijn eigen save: elke 60 s, na een gelukte opdracht, bij
  binnenkomst en bij het einde van de sessie. Alleen in een echte sessie: Alleen
  spelen (de sessie van één, #554) houdt zijn eigen save-momenten en schrijft geen
  checkpoint en geen extra verrekening aan het eind (#569).
- Geld, loopbaan, gebieden, prestaties en de eigen verhaalstap gaan naar de eigen
  save; wereld en klok van de wereld. Van de voertuigen gaat alleen de eigen schade
  mee: de gastheerauto uit de momentopname (`shops.hero`) niet (#566). Niets te
  bewaren is een geslaagde opslag (#579), en een gast ziet in de bevestiging dat
  alleen zijn verdiensten bewaard zijn (#606).

## Wat een gast wel en niet kan

**Wel:** lopen, ook los van de groep (buiten 150 m krijg je een eigen interessegebied;
B haalt je bij de groep), winkelen, eten, bijrijden (E), stuur doorgeven (Y), een vrij
voertuig besturen (niet bus, trein, heli of vliegtuig), hengelen, boeren, wapen uit eigen
save, taxi/bezorgen/krant samen, vracht als bijrijder (E helpt laden en lossen), wedstrijd
of opdracht aanvragen met E, passief/PvP, roepen.

De snapshot stuurt per speler echte gezondheid en een `down`-vlag (ragdoll) naast
`alive` (dood of gepakt). Tab-lijst, marker en figuur lezen die, zodat een
neergeslagen gastheer of Tessa overal zichtbaar is (#369); `down` laat een opdracht
niet falen.

**Niet:** voertuigen, wapens of tuning voor de wereld kopen, gesprekken met
personages, spuiten en gooien, minigames die een lichaam of voertuig in de wereld
zetten, heli besturen, een filmpje voor iedereen overslaan (wel de eigen weergave),
snelreizen via de kaart (het safehouse-anker wel), de tijd verzetten, cheats of
testmenu, en de hostrol.

Een "nee" is geen dood spoor (#684): de melding noemt wat wél kan ("Dit kan alleen in je
eigen spel; samen kan hengelen en boeren."), de wachtkamer en het samen-scherm tonen de
volledige positieve lijst uit het register (`coopstatus.js` `SAMEN_KAN_REGEL`), naast de
eerste "Meedoen?" komt één keer een korte kaart (`samenplan.js` `meldSamenKan`) en bij een
host-only-activiteit krijgt de gast eenmalig de "eigen plan"-kaart met de vier lokale
activiteiten en hun plek (`toonEigenPlan`; de haak zet `main.js`, zodat de netcode geen
HUD laadt).

De figuren van plek 2 en 3 gebruiken dezelfde botsing, water- en terrainregel als
Tessa; een nieuwe of uitgestapte figuur komt op een droge vrije plek of in de boot.
De afstandsregel is er één: spelers binnen 150 m van elkaar delen een focus
(`SAMENVOEG_M`, `game/js/coopfoci.js:9`). Zit een figuur in de groep van de gastheer zelf,
dan geldt de band van 110 m — waarschuwen boven 80 m, na 4 s terug bij de groep
(`FIGUUR_BAND`, `FIGUUR_WAARSCHUWING`, `FIGUUR_TERUG_S`, `game/js/coopnet.js:73-77`).
Hoort hij bij een losse groep (buiten 150 m van de gastheer), dan is de wereld rond die
groep geladen en loopt hij vrij; alleen bij 300 m zegt het spel één keer dat B hem bij de
groep brengt (`LOS_MELD_M`, `game/js/coopnet.js:614`). Er is geen vaste maximale afstand
tussen spelers (`MAX_AFSTAND` oneindig, `game/js/coopfoci.js:10`); het plafond is het
aantal foci (8) en het tegelbudget (#366, #429).

## Bestanden

Net: `net/hub|session|brokers|codec|protocol|interp.js`, `coopnet.js`,
`coopfoci.js`, `coopextra*.js`. Regels:
`coopmeedoen|missie|gast|gastlokaal|bestuur|gezocht|wapen|pvp|pvpwereld|wedstrijd*|bijbaan|status|hostwissel*|beloning|deel|checkpoint|save|bezit|samenplan.js`,
`spelersregister.js`, `players.js`, `pvparena.js`. Schermen: `lobby.js`, `lobbyui.js`,
`samenpanel.js`, `coopgate.js`, `coopspelersui.js`, `coopscene.js`, `coophold.js`.

De eigen speler lees je via `players.js` (`hoofdspeler`, `isGast`, `medespelers`,
`elkeSpeler`, `spelerMetId`); `world.player` blijft de opslag van het eigen lichaam.
`scripts/player_singleton_audit.mjs` (lichte fase en CI) blokkeert groei van directe
`world.player`-verwijzingen; zie ADR [0018](adr/0018-een-ingang-voor-de-speler.md).

## Tests

Puur (`scripts/*_test.mjs`): per module hierboven, plus `net_*`, `coop_scenarios`,
`coopregressie`, `vrijdag`, `coopduur`, `coopwedstrijd_padel`. `coopsolo_test` dekt de
sessie van één (ADR 0024) en wat daarvan afhangt: metgezel, baken en de overgang naar een
echte sessie; `coopbestuur_test` de bestuurinvoer van de gastheer en de gast;
`onboarding_test` en `gamepad_live_test` de uitlegkaart en de controllerindeling in
alleen spelen; `coopstatus_test` en `samenplan_test` de positieve "samen kan"-lijst, de
concrete tips en de bedrading van de eigen-plan-kaart. De hele stroom van een
gast in een voertuig (instappen, meerijden, uitstappen, weer instappen; auto, meerijden
bij de gastheer en boot) staat in `coopbestuurflow_test`. Electron
(`scripts/coop/testbank.mjs`): `basis`, `net`, `opening`, `gastkant`, `bestuur`,
`wedstrijd`, `uitelkaar`, `gastkant_443`, `gastkant_434`; avondscenario
`playtest_sim.mjs`.

## Open punten (met issue)

1. **Opgelost (#642):** starten kan elke speler (een gast vraagt het de opener;
   `vraagStart`) en "iedereen stoppen" is een stemming over de groep
   (`vraagStop`). Een filmpje voor iedereen overslaan blijft als uitzondering bij
   de opener (ADR 0007); een gast slaat zijn eigen weergave over.
2. Opdrachtstand per groep gaat nog niet mee bij overdracht (#452); bloed in PvP:
   regel zegt mag, code niet.
3. Gastenkant arena, chat/voice (#451) en dedicated servers (#450) staan open.
4. Niets met echte spelers op meerdere computers over internet bekeken.
