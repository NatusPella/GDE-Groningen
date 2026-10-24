# Eigen boerderij: een perceel, gewassen, machines en een kasboek (#415)

Voor wie aan `boerderij.js`, `werkgang.js`, `boerderijlive.js`, `sidejob_boerderij.js` of `boerderijui.js` werkt. Tests: `scripts/boerderij_test.mjs`.
Het vak in de loopbaan is Landbouw ([LOOPBAAN.md](LOOPBAAN.md)); de losse oogstbaan is Bietenoogst (`sidejob_bieten.js`, #393).

## Wat de speler doet

Boerderij De Zonnehoek (verzonnen) is van jou: één akker bij Hoogkerk, in de buurt van Suikerhal Hoogkerk. Het werk gaat in vaste stappen:

1. **Ploegen** (ploeg), 2. **zaaien** (zaai- en strooimachine; je kiest het gewas in Pauzemenu › Boerderij › Gewas en betaalt het zaaigoed),
3. **bemesten** (optioneel, €25 mest, tot +20% opbrengst), 4. het gewas **groeit in speltijd**, 5. **oogsten** (rooier), 6. **afleveren**: laden bij het perceel en
rustig naar de afnemer rijden (Coöperatie Noorderveld voor aardappelen, Suikerhal Hoogkerk voor suikerbieten). Een ronde is daarna weer braak.

Het werk zelf is de bijbaan **Eigen boerderij** (start bij Hoogkerk, zie de kaart): hij kiest zelf de volgende taak uit de stand van het land, rekent
de huur en het zaaigoed af en gaat door met de taak erna tot er niets meer te doen is (bijvoorbeeld omdat het gewas nog groeit). Elke rijtaak is vier
rijen van honderd meter rijden in een snelheidsband (`BAND` in `werkgang.js`) en binnen de rij: te hard werkt slordig (de helft telt), te langzaam of
naast de rij niets, een overgeslagen stuk is gemist. De machine hangt zichtbaar achter de trekker. De afleverrit werkt zoals Suikerbieten: hard remmen
of scherp sturen strooit de kar leeg (de helft van de lading blijft liggen als dat misgaat).

Pauzemenu › **Boerderij** toont de stand van het perceel en de volgende taak (met kosten), het gewas voor het volgende zaaien, de machines (huren per keer of
kopen: dan geen huur en een ruimere rij) en het kasboek.

## Het model

| Gewas | Zaaigoed | Groeitijd | Opbrengst per perceel | Prijs per kg |
|---|---|---|---|---|
| Aardappelen | €40 | 30 speluren | 1800 kg | €0,22 |
| Suikerbieten | €30 | 48 speluren | 4000 kg | €0,10 |

Een speldag is 24 minuten (`DAY_LENGTH_S`): aardappelen zijn na ruim een halve speldag rijp, bieten na twee. De opbrengst is `kgBasis` keer de
kwaliteit van het ploegen (0,6 tot 1), het zaaien (0,5 tot 1) en het bemesten (+20%), keer de oogstfractie van de rijen; de prijs krijgt de kwaliteit
van de afleverrit. Machines: ploeg €15 huur of €300 koop, zaai- en strooimachine €10 of €250, rooier €20 of €600. Een volledige ronde levert ongeveer
€300 tot €350 winst op voor tien minuten werk: dat is in de buurt van een bijbaan (`boerderij_test.mjs` bewaakt de verhouding). De verkoop loopt
via `loopbaanVerdien` met de loonfactor van Landbouw (tot +30%) en het vak krijgt punten per taak.

## Speltijd en groei

`boerderijTijd(world)` (elk beeld in `updateGameplay`, na de dagcyclus) telt de speluren uit `world.clock`: ook over middernacht en na slapen of een
treinreis, niet bij een sprong terug (een lading). De boerderij heeft dus een eigen teller en hangt niet aan de kalenderdag van een savegame
(die schuift mee met het verhaal en hoort bij het opgeslagen spel). Altijd zomer: het groeiseizoen is meerdere rondes, er is geen winter en geen modder.

## Opslag en Samen spelen

- De boerderij is **van de speler** en leeft in zijn eigen opslag onder `gde-boerderij-v1` (`KEYS.boerderij`), nooit in een savegame (net als de
  loopbaan), en geldt voor elk opgeslagen spel op dit apparaat. Het perceel staat vast zodra het gevonden is (`vindAkker` uit `sidejob_bieten.js`).
- Een leeg, oud of kapot profiel geeft een geldige lege boerderij (`normaliseer`); een gezaaid veld zonder gewas of zaaitijd wordt braak; volle of
  geblokkeerde opslag laat het spel gewoon doorlopen.
- **Samen spelen:** iedereen heeft zijn eigen boerderij op zijn eigen apparaat. Een gast draait `updateGameplay` niet en mag geen bijbaan starten
  (docs/COOP-GAST.md): zijn gewassen groeien dus niet terwijl hij in andermans wereld meespeelt, ze wachten op hem. Wat wie het spel opende met een
  verkoop verdient deelt hij zoals alle verdiensten met de gasten.

## Percelen en erven (stap 1 van #415)

- `percelen.js` (pure regels, `scripts/percelen_test.mjs`) heeft de vaste lijst percelen (`PERCELEN`: akker of weiland, ha, bodem 0..1, ligging in graden, koop, huur per dag, verzonnen verhuurder, aanbod koop/huur/beide), de erven (`ERVEN`: huis, schuur, silo, opslag in kg, machineplekken) en de catalogus voor stap 2 (`MACHINE_CATALOGUS`, verzonnen namen). Landgebruiksgegevens van de wereld worden nog niet gebruikt.
- Het bedrijf zit als `bedrijf` in de boerderij (`gde-boerderij-v1`, versie blijft 1): oude opslag zonder `bedrijf` krijgt De Zonnehoek als eerste perceel en erf. Het machinepark (`machines`, `werktuigen`) is leeg tot stap 2.
- Huren: de eerste periode (dag of week, week 15% korting) betaal je meteen; daarna per verlopen periode uit de speluren (`boerderijTijd` > `huurTik`). Lukt het niet, dan staat het open als achterstand; bij `MAX_ACHTERSTAND` (2) gaat het terug en verhuist de erf-opslag naar De Zonnehoek. Gekocht verkoop je voor 75%.
- Bodem: `bodemFactor` (0,6 tot 1,2, De Zonnehoek 1,0) vermenigvuldigt de oogst van het perceel waar je Werk hier koos. De bijbaan zelf werkt nog altijd op het gevonden perceel bij Hoogkerk; de bietenoogst en andere bijbanen blijven loonwerk.
- Kaartlaag `percelen` (`perceelmap.js`): geel te koop, blauw te huur, groen van jou, met een doel naar elk perceel.

## Machines, werktuigen en veldwerk (stap 2 van #415)

Modules: `machines.js` (pure regels voor kopen, huren, diesel, slijtage, onderhoud en de loonwerker; test `machines_test`), `werktuigen.js` (koppelen, aftakas, hef, het veldwerk per cel en de aanhanger; `werktuigen_test`), `boerderijwereld.js` (de wereldkant: erf, voertuigen, koppelen, veld, prompts; `boerderijwereld_test`) en `werktuigen3d.js` (laag-poly meshes). De schermen zitten in `boerderijui.js` (`boerderijui_machines_test`). De maaidorser en de laadmachine hebben een eigen mesh in `models3d_vehicles.js` (aparte functies) en een model in `vehicle.js` (`MACHINE_MODELLEN`, de trekkers zijn varianten van `TRACTOR_MODEL`).

- **Machines** (catalogus in `percelen.js`, verzonnen namen): trekkers, maaidorser en laadmachine staan als regel in `bedrijf.machinepark` met bezit (gekocht of gehuurd per speldag), brandstof (liter), slijtage (0 tot 100) en uren. Kopen kost de nieuwprijs (volle tank), verkopen levert 60% min slijtage op; huren betaal je elke speldag vooruit en bij twee gemiste dagen gaat de machine terug. De opslag blijft versie 1: `normaliseerMachine` (percelen.js) voegt de nieuwe velden toe en zet ontbrekende op een veilige waarde, oude opslag migreert.
- **Diesel en slijtage**: een speluur is een minuut. Het verbruik hangt aan de belasting (stil, rijden, werken met aftakas en werktuig) en stijgt tot +50% met de slijtage; boven 40% slijtage zakt de topsnelheid tot -40%. Bij 100% slijtage of een lege tank kruipt de machine nog (0,6 m/s) naar het erf. Bijtanken doe je in de wereld met R bij het dieselvat van een erf van jou (€1,60 per liter) of bij een pomp (`nearestFacility('fuel')`, €2,05); een onderhoudsbeurt (menu) zet de slijtage op nul.
- **Erf in de wereld**: `boerderijwereld.js` bouwt bij een erf van jou binnen 230 m een grindvlak met huis, schuur, silo en dieselvat, en zet de machines en werktuigen op de machineplekken (rijen ten zuiden van de gebouwen). Een machine die je ergens laat staan blijft daar (in deze spelsessie); ver weg verdwijnt hij uit de wereld en komt op zijn laatste plek terug. De machines zijn gewone voertuigen (`playerOwned`, `farm` = uid): instappen met E, nooit diefstal.
- **Werktuigen** (`WERKTUIG` in werktuigen.js): ploeg (ploegen, hef), cultivator (cultiveren, hef), zaaimachine (zaaien, hef en aftakas), mestverspreider (bemesten, aftakas), spuit (spuiten, aftakas), maaier (oogsten van gras, hef en aftakas) en aanhanger (8000 kg). De maaidorser oogst zelf (maaitafel omlaag, dorsen aan) maar geen gras. **Bediening**: E koppelt een werktuig vlakbij het koppelpunt (in de trekker, of te voet naast het werktuig met een vrije trekker erbij; te voet maakt E een gekoppeld werktuig ook los), X koppelt los, G zet de aftakas aan of uit, T hef omhoog of omlaag, R tankt. Deze toetsen zijn vast en niet herbindbaar; een controller heeft er nog geen knoppen voor (open punt). Het wereldprompt boven de trekker toont de stand (hef, aftakas, diesel, slijtage) en wat nog nodig is; de hint voor de trekker (hintkit) noemt de toetsen.
- **Veldwerk**: per perceel liggen vier rijen van honderd meter, elk in cellen van vijf meter (`CEL`). Met het werktuig op de rij, hef omlaag en aftakas aan als het werktuig dat vraagt, op een snelheid in de band van de taak (`BANDEN`; te hard geeft de helft, te langzaam of naast de rij niets) worden cellen bewerkt, in elke volgorde. Bij 96% bewerkt is de klus klaar en past `rondAf` het perceel aan. Het zaaigoed en de mest worden betaald als het werk begint (een klus die je niet afmaakt kost het materiaal wel); met je eigen machine is er geen huur. De kleur en strepen van het veld volgen de fase (braak, geploegd, gecultiveerd, gezaaid, bemest, gespoten) en per cel terwijl je werkt; de gewassen zijn instanced en groeien mee (zo'n 10% per stap), bij het oogsten verdwijnen ze per cel. Het werk begint op het perceel waar je werktuig staat (de boerderij schakelt `actief` om).
- **Nieuw in het model** (`boerderij.js`): cultiveren (tot +8%) en spuiten (tot +8%) zijn vrije klussen (`TAKEN[..].vrij`, `opties(b, { vrij: true })`): de bijbaan kent ze niet. Graan (akker) en gras (weiland) zijn gewassen met een `soort`; `gewasVoor` past de keuze aan het perceel aan. Elk perceel heeft zijn eigen veldstand (`b.velden`, `syncVeld`), de opbrengst volgt de grootte (ha/1,2) en de uitputting van de grond (`b.bodemlog`: elke oogst +0,04, dezelfde teelt +0,08, ploegen en mest herstellen). De plek van de rijen van een ander perceel dan de Zonnehoek staat in `b.posities` (eenmaal gezocht met `vindAkker` van de bietenbaan).
- **Afleveren met de aanhanger**: laden bij je thuis met E (schuur naar aanhanger), rustig naar de afnemer rijden (een plek op de weg bij Hoogkerk, per gewas verzonnen: Coöperatie Noorderveld, Suikerhal Hoogkerk, Graanzolder Noorderveld, Hooimarkt Reitdiep) en met E lossen: `leverLading` met de loonfactor van Landbouw. Hard remmen en harder dan 9 m/s rijden morsen.
- **Loonwerker** (`LOONWERKER`, verzonnen Loonbedrijf De Ploegschaar): doet een klus op je actieve perceel tegen een bedrag per hectare (`LOONWERK_HA`), netjes maar niet perfect (85%); het materiaal betaal jij. Hij brengt ook de oogst weg (6% van de opbrengst). Menu: Boerderij > Perceel.
- **Economie**: het kasboek (`b.boek`) boekt kosten en omzet per veld en per boekjaar (honderd speldagen, de laatste acht bewaard) met posten (zaaigoed, mest, machines, diesel, onderhoud, huur, loonwerk, rente, aankopen). Bij Bank leent Boerenbank Noordhoek (verzonnen) tot €25.000 tegen 0,08% per speldag; de rente komt bij de schuld (geen beslag, geen afschrijving van je geld) en je lost af wanneer je wilt.
- **Gras en terrein**: de rijen van je percelen houden het gras weg via `map.reservedAt` (`opEenVeld` in boerderijwereld.js, zoals het padel- en kermisterrein) en `wisGrasCellen` (grass.js) gooit de al gemaakte gras-cellen er eenmalig weg. Het erf heeft twee rijen: de machines voorop (negen meter uit elkaar, zodat een trekker zonder botsen kan wegrijden) en de werktuigen daarachter.
- **Samen spelen (stap 3, klein)**: een gast kan een vrije machine van jouw boerderij besturen via de bestaande gast-bestuurder-keten (`coopbestuur.js`: `weigerReden` laat `farm`-machines toe en het telt niet als autodiefstal). Zijn toetsen gaan niet naar jouw wereld, dus voor hem gaan het koppelen, de hef en de aftakas vanzelf: een werktuig vlak achter zijn stilstaande trekker wordt gekoppeld, op het veld gaat de hef omlaag en de aftakas aan (`autoBediening`), zijn meldingen gaan via `coopMeld` naar hem, en een klus die hij afmaakt levert hem via `coopDeel` een deel op (wat de loonwerker zou vragen, met het gastdeel en zijn eigen niveau). Jij tankt zijn machine te voet met R bij het dieselvat. Zijn eigen bedrijf staat in zijn eigen opslag (#429); zijn gewassen groeien niet terwijl hij in jouw wereld speelt. Wat nog ontbreekt: de gast ziet je kasboek of erf niet, en heeft zelf geen toets voor tanken.

## Niet gedaan (de uitbreiding)

Eggen als aparte stap, uien en koolzaad, balenpers, de bijbaan op een gekozen ander perceel dan Hoogkerk (de vrije klussen werken wel op elk perceel), samen spelen (stap 3), een kleine veestapel of weide (koeien, schapen en paarden bestaan als
wereldleven), controllerknoppen voor koppelen, aftakas en hef, en een eigen interieur voor maaidorser en laadmachine (zitplek en cabine: de besturing en interieurs zijn van de voertuigagent). De
tabellen in `boerderij.js` (`GEWASSEN`, `MACHINES`, `TAKEN`) en `BAND` zijn de plekken waar je ze toevoegt.

## Gemeten in Electron (stap 2)

`scripts/qa/boerderij_wereld.mjs` (met het page-script `boerderij_wereld.page.js`) koopt een trekker, werktuigen en een maaidorser, loopt het erf af, stapt in met E, koppelt de ploeg, bedient de hef, ploegt de rijen kinematisch (zoals de speelbot: het stuurgevoel is dus niet gemeten) en oogst met de maaidorser; beelden per fase staan in `shots-*.png`. Gezien: erf met machines en werktuigen, ploegen, zaaien, groei en rijp gewas met strepen, de maaidorser op het veld. Niet door een mens gespeeld.
