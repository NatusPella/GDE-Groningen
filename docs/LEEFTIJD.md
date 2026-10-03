# Leeftijdsclassificatie: PEGI 16 / IARC 16

Het doel is PEGI 16, met dezelfde leeftijd bij IARC (Steam, en later
eventueel consoles). Dit document geeft de antwoorden die we verwachten
voor de IARC-vragenlijst en de content survey van Steam. Het beschrijft de
game zoals hij is sinds branch `claude/pegi16` (versie 0.24) en
`claude/geen-gokken` (de kraskaarten en loten zijn weg). Loop het
opnieuw na als er geweld, gokken of alcohol bij komt.

De criteria van PEGI ([pegi.info](https://pegi.info/what-do-the-labels-mean)):

- **16**: geweld dat eruitziet zoals in het echt, of het gebruik van
  tabak, alcohol of drugs.
- **18**: grof geweld, moorden zonder aanleiding, geweld tegen weerloze
  personages, of gesimuleerd gokken "zoals in een casino".

## Wat er veranderd is voor 16

- **Geen bloed en geen ledematen meer.** `gore3d.js` en de instelling
  "Bloed en ledematen" zijn verwijderd. Wie neergaat krijgt een stofwolkje
  en sterretjes boven het hoofd (`knockfx3d.js`).
- **Burgers kunnen niet doodgaan.** Dat geldt voor voetgangers, fietsers,
  bestuurders, mensen op een terras en klanten van bijbaantjes.
  - Door een auto, trein of een ontplofte auto raken ze knock-out. Ze
    liggen een paar seconden met sterretjes, staan suf op, en schelden of
    rennen weg.
  - In het water klimmen ze er weer uit.
- **Wapens zijn niet voor burgers.**
  - Kogels gaan langs burgers heen, en richthulp kiest ze nooit als doel.
  - Een klap met de vuist of een slagwapen is een duw: de burger struikelt,
    scheldt en rent weg.
  - Je eigen carbidbus of vuurpijl blaast ze omver, maar ze raken niet
    knock-out.
  - Elk van deze dingen blijft een misdrijf, met getuigen, een melding en
    sterren.
- **Politie gaat niet dood, maar wordt uitgeschakeld.** Een agent zonder
  gezondheid ligt ongeveer 9 seconden knock-out en doet daarna weer mee.
  Vechten met agenten die terugschieten kan nog steeds. Je krijgt er zoals
  altijd twee sterren voor.
- **Dieren** die je aanrijdt, vallen even om en lopen dan weg. Een vogel
  vliegt op met een paar losse veren.
- **Tellers.** `pedKills` en de andere tellers van doden zijn weg. Daarvoor
  in de plaats komen tellers van knock-outs (`knockouts`, `pedKnockouts`,
  `copKnockouts`, `copCarsWrecked`).
  - Het missietype "rampage" (chaos maken door mensen neer te halen) is
    weg. Het werd door geen enkele missie meer gebruikt.
  - De regel "Kills" in de uitslag van een missie is weg.
  - Er waren geen prestaties voor doden.
- **Geen gokken meer, ook niet gesimuleerd** (`claude/geen-gokken`).
  - De kraskaarten ("Grunneger Gokje", "Duivenkraslot") en het
    Stadsloterij-lot zijn weg, net als de kras-animatie in het winkelmenu.
  - De winkel "Rook & Geluk" (Tabak & loterij) heet nu **"Krant & Kauwgom"**
    (Krant & snoep). Hij verkoopt kranten, strips, ansichtkaarten en snoep;
    geen tabak.
  - In de plaats komt een **spaarkaart**: elke aankoop bij Krant & Kauwgom
    geeft een stempel, en een volle kaart (10 stempels) lever je in voor
    vast €10. Je zet niets in en er zit geen toeval in. De prestatie
    "Stempeltje erbij" hoort erbij.
  - Er waren geen ingesproken regels, Kiekdoar-berichten of prestaties
    over gokken. Ander prijzengeld in de game hangt af van wat je kunt
    (medailles bij de botsauto's, carbidschieten, uitdagingen), nooit van
    toeval.
- **Wat blijft:** de speler kan neergaan (DOOD) of opgepakt worden
  (OPGEPAKT). Dat telt niet als geweld tegen een weerloos personage. Ook de
  maat (Tammo of Tessa) kan aangereden worden; die komt daarna weer
  terug.

## Antwoorden op de IARC-vragenlijst

| Onderwerp | Antwoord | Toelichting |
|---|---|---|
| Geweld | Ja, realistisch | Mensen zien eruit als echte mensen. Er zijn vuurwapens (pistool, uzi, shotgun, jachtgeweer) en slagwapens. Er wordt gevochten met de politie, en die schiet terug. |
| Doelwit van het geweld | Politie (die terugvecht), voertuigen, objecten | Burgers zijn geen doelwit van wapens (zie hierboven). |
| Personages die doodgaan | Nee | Agenten en burgers raken knock-out en staan weer op. Alleen de speler "gaat neer" en begint opnieuw. |
| Bloed | Nee | Geen bloed, geen plassen, geen spetters. Wel een rode rand op het scherm bij schade aan de speler. |
| Gore of verminking | Nee | Weg sinds 0.24. |
| Geweld tegen weerloze of onschuldige personages | Nee, met een voorbehoud | Wapens raken burgers niet. Je kunt wel mensen aanrijden (dan raken ze knock-out met sterretjes) en bestuurders uit hun auto trekken. Dat is slapstick en het levert altijd sterren op. |
| Seksuele inhoud of naakt | Nee | Alleen een kusje tussen de twee hoofdpersonen. |
| Grof taalgebruik | Licht | Scheldwoorden in het Gronings ("Bist betoeterd?", "Rot op, joh!"). Geen vloeken of seksuele woorden. |
| Grove humor | Ja, licht | Duiven die op mensen poepen (duifmodus), een student die in de taxi kotst. |
| Alcohol | Ja, gebruik | Een kroegentocht in missie H11 "Nog eentje dan", biertjes bij de horeca, en dronken effecten (`drunk.js`). Dronken rijden is een overtreding. |
| Tabak | Nee | Er wordt niet gerookt en niets met tabak verkocht. De vroegere tabakswinkel heet nu "Krant & Kauwgom". |
| Drugs | Nee | ("Wiet" is Fries voor "nat".) |
| Misdaad | Ja | Auto's stelen, voor de politie vluchten, de museumkraak (H6) met zakkenrollen bij een bewaker, en een tankwagen kapen (H8). Het is de kern van de game, met humor. |
| Gokken met echt geld | Nee | |
| Gesimuleerd gokken | Nee | Weg sinds `claude/geen-gokken`. Krant & Kauwgom heeft alleen een spaarkaart: vaste prijs na 10 aankopen, zonder inzet en zonder kans. Prijzengeld bij minigames hangt af van je score. |
| Angst of horror | Nee | |
| Discriminatie | Nee | |
| Interactie tussen spelers, online of chat | Nee | Er is alleen offline singleplayer. |
| Aankopen in de game | Nee | Er zijn geen aankopen met echt geld en geen lootboxes. |
| Locatie of persoonsgegevens delen | Nee | |

## Inhoudslabels die we verwachten

- **PEGI 16**: Geweld, Alcohol (en mogelijk Taal).
- **IARC/ESRB-stijl**: Violence, Use of Alcohol, Crude Humor, Mild Language.
  Geen Simulated Gambling meer.
- **USK**: 16, met "Gewalt" en "Alkohol".

## Wat de leeftijd nog boven 16 kan duwen

1. **Mensen aanrijden en carjacken (nu het grootste risico).** Er is
   geen bloed en iedereen staat weer op. Toch kan een beoordelaar het "geweld tegen weerloze personages"
   noemen. Wil je ook dat risico weg, dan kan een aangereden burger alleen
   opzij springen of omvallen, zonder knock-out.
2. **De rode schaderand van de speler** is gewoon een effect op het scherm,
   geen bloed. We noemen hem toch, zodat hij niet als bloed wordt gezien.
3. **De speler gaat dood** (het scherm DOOD). Dat is normaal bij 12 en
   hoger. Het woord kan ook "Uitgeteld" worden als een beoordelaar daarom
   vraagt; nodig is het niet.

Gesimuleerd gokken staat hier niet meer: bij PEGI geeft dat 18, en sinds
juni 2026 tellen ook kraskaarten en loten met geld uit de game mee. Ze zijn
weg (zie hierboven). Komt er ooit iets bij waarbij je inzet en toeval de
prijs bepaalt (een gokkast, een rad van fortuin, weddenschappen of
lootboxes), dan komt dit risico terug.
