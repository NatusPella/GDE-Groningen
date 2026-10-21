# Leeftijdsclassificatie: PEGI 18 / USK 18

De game is **18+**. De eigenaar heeft besloten dat dat mag, en daarmee zijn
de beperkingen voor PEGI 16 (versie 0.24, branches `claude/pegi16` en
`claude/geen-gokken`) teruggedraaid in branch `claude/pegi18`. Dit document
geeft de antwoorden die we verwachten voor de IARC-vragenlijst en de
content survey van Steam, met de leeftijd en de inhoudslabels die daaruit
komen. Loop het opnieuw na als er geweld, gokken, seks of drugs bij komt.

De criteria van PEGI ([pegi.info](https://pegi.info/what-do-the-labels-mean)):

- **16**: geweld dat eruitziet zoals in het echt, of het gebruik van
  tabak, alcohol of drugs.
- **18**: grof geweld, moorden zonder aanleiding, geweld tegen weerloze
  personages, of gesimuleerd gokken "zoals in een casino".

De game haalt 18 op drie punten tegelijk: bloed en rondvliegende
ledematen, het doden van weerloze burgers, en kraskaarten en loten met
geld uit de game. Elk punt alleen is al genoeg.

## Wat er terug is sinds 18+

- **Bloed en ledematen** (`gore3d.js`). Wie hard genoeg wordt geraakt,
  spat Carmageddon-stijl uiteen in lichaamsdelen; bloed spuit, er komen
  plassen en vlekken op de weg en op de auto. Dieren die je aanrijdt gaan
  dood. De instelling **"Bloed en ledematen"** staat standaard aan; uit
  vallen mensen gewoon om, zonder bloed of losse delen.
- **Burgers gaan dood** door een auto, een trein, wapens en explosies.
- **Wapens raken iedereen.** Kogels, slagwapens, carbidbussen en vuurpijlen
  raken burgers, en de richthulp kiest burgers als doel. Het blijft een
  misdrijf, met getuigen, een melding en sterren.
- **Agenten gaan dood** en tellen als `copKills` (plus twee sterren).
- **Tellers**: `kills`, `pedKills` en `copKills`. De regel "Kills" staat
  weer in de uitslag van een missie. Saves met de knock-outtellers van 0.24
  tot 0.27 worden omgezet (`savemigrate.js`).
- **Kraskaarten en loten** bij **Rook & Geluk** (Tabak & loterij):
  "Grunneger Gokje", "Duivenkraslot" en het Stadsloterij-lot, met de
  kras-animatie in het winkelmenu. De spaarkaart van 0.24 blijft als extra.
- **Wat bewust non-letaal blijft:** de stuntavond van H3. Wie je daar
  raakt, valt alleen om: een slapstickmoment met een stofwolkje en sterretjes
  (`knockfx3d.js`), en het kost je punten. Het verhaal wil dat zo.

## Antwoorden op de IARC-vragenlijst

| Onderwerp | Antwoord | Toelichting |
|---|---|---|
| Geweld | Ja, realistisch en grof | Mensen zien eruit als echte mensen. Er zijn vuurwapens (pistool, uzi, shotgun, jachtgeweer met kijker) en slagwapens. |
| Doelwit van het geweld | Iedereen | Burgers, politie, dieren, voertuigen en objecten. |
| Personages die doodgaan | Ja | Burgers en agenten gaan dood; lichamen blijven even liggen. |
| Bloed | Ja | Spetters, plassen en vlekken op de weg en op auto's. Uit te zetten. |
| Gore of verminking | Ja | Lichaamsdelen vliegen rond bij harde klappen, explosies en de trein. Uit te zetten met "Bloed en ledematen". |
| Geweld tegen weerloze of onschuldige personages | Ja | Je kunt voetgangers neerschieten, aanrijden en opblazen. Het levert sterren op, maar de game houdt je niet tegen. |
| Seksuele inhoud of naakt | Nee | Alleen een kusje tussen de twee hoofdpersonen. |
| Grof taalgebruik | Licht | Scheldwoorden in het Gronings ("Bist betoeterd?", "Rot op, joh!"). Geen vloeken of seksuele woorden. |
| Grove humor | Ja, licht | Duiven die op mensen poepen (duifmodus), een student die in de taxi kotst. |
| Alcohol | Ja, gebruik | Een kroegentocht in missie H11 "Nog eentje dan", biertjes bij de horeca, en dronken effecten (`drunk.js`). Dronken rijden is een overtreding. |
| Tabak | Verwijzing | De winkel heet "Tabak & loterij", maar er wordt niet gerookt en geen tabak verkocht. |
| Drugs | Nee | ("Wiet" is Fries voor "nat".) |
| Misdaad | Ja | Auto's stelen, voor de politie vluchten, de museumkraak (H6) met zakkenrollen bij een bewaker, en een tankwagen kapen (H8). Het is de kern van de game, met humor. |
| Gokken met echt geld | Nee | |
| Gesimuleerd gokken | Ja | Kraskaarten en loten bij Rook & Geluk, met geld uit de game. Geen echt geld, geen lootboxes. |
| Angst of horror | Nee | |
| Discriminatie | Nee | |
| Interactie tussen spelers, online of chat | Beperkt | Singleplayer is offline. Samen spelen (#95, sinds 0.38) gaat met een kamercode, zonder tekstchat, spraak en openbare lobby; zie §6 van `docs/IARC-ANTWOORDEN.md`. |
| Geld verliezen (beroving) | Ja, licht | Een dief snaait je portemonnee en je verliest een deel van je spelgeld; niemand wordt geraakt (`muggingrules.js`). |
| Door AI gemaakte inhoud | Ja, vooraf gemaakt | Muziek en stemmen komen van Google Gemini; tijdens het spelen is er geen AI. Alleen relevant voor de Steam-melding (`docs/steam/winkelpagina.md`). |
| Aankopen in de game | Nee | Er zijn geen aankopen met echt geld en geen lootboxes. |
| Locatie of persoonsgegevens delen | Nee | |

## Leeftijd en inhoudslabels die we verwachten

- **PEGI 18**: Geweld, Gokken, Alcohol (en mogelijk Taal).
- **USK 18**: "Gewalt", "Glücksspielelemente", "Alkohol".
- **IARC/ESRB-stijl** (Mature 17+): Blood and Gore, Intense Violence,
  Simulated Gambling, Use of Alcohol, Crude Humor, Mild Language.
- **Steam Content Survey**: "Frequent Violence or Gore" en "General Mature
  Content" (zie `docs/steam/winkelpagina.md`).

## Waar het oplet

1. **De instelling "Bloed en ledematen" verlaagt de leeftijd niet.** De
   beoordeling gaat uit van de standaard (aan), en ook zonder bloed blijft
   het doden van burgers en het gokken 18.
2. **Gokken met echt geld of lootboxes** komen er niet in. Kraskaarten en
   loten gebruiken alleen geld uit de game, en dat geld is niet te kopen.
3. **Echte merken.** De loterij heet "Stadsloterij" en de kraskaarten
   hebben verzonnen namen; zo blijven ze parodieën (`docs/LICENTIES.md`).
