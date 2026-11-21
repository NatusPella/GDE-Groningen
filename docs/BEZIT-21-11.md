# Bezit: percelen, bedrijven en een productieketen voor de hele provincie (21-11)

> **Werkdocument (onderzoek, data-audit en ontwerp; geen spelcode).** De regels van boerderij en economie staan in
> [`.specs-fire/standards/mechanica.md`](../.specs-fire/standards/mechanica.md); wereld en tegels in
> [`wereld.md`](../.specs-fire/standards/wereld.md). Dit document is het *hoe* van een nieuwe epic; het *wat* is het bord (epic en
> werkpakketten, zie hoofdstuk 12). Naslag bij [BOERDERIJ.md](BOERDERIJ.md), [BALANS-21-11.md](BALANS-21-11.md) en
> [PERCEELRANDEN-21-11.md](PERCEELRANDEN-21-11.md). Telling: `node scripts/world/percelen_audit.mjs --world <map met index-provincie.json>`.

Aanleiding (eigenaar, letterlijk): "Vraagje: kunnen we ook bijna de hele provincie aan weilanden een soort koopbaar maken voor de
boerderijgame?" Daarna uitgebreid (besluiten 21-11): ook alle panden en winkels koopbaar (Bedrijven), een productieketen van
boerderij naar eigen winkel, AI-personeel dat je ziet werken en medespelers die meewerken, en een rustig tempo.

## 1. Samenvatting en aanbeveling

**Ja, het kan, en het hoort in één epic "Bezit" met een eigen datalaag.** De tegels hebben 25.477 landgebruikvlakken (weide, akker,
boomgaard) die na het aaneenrijgen over de tegelranden **13.883 echte percelen** zijn (115.773 ha, 39% van de provincie); 12.237
daarvan zijn bereikbaar en dus koopbaar. En 370.144 panden (plus ongeveer 52.000 in de stadslaag), 2.183 winkelplekken en 9.653
voorzieningen voor Bedrijven. Een stabiel ID is te maken zonder iets uit de bouwvolgorde (percelen: hash van soort, laagste hoekpunt en
een binnenpunt; panden: het OSM-id dat de tegel al bewaart).

Wat de eigenaar misschien niet verwacht: **weilanden zijn maar 2.691 van de percelen (8.469 ha, 7%)**. De OSM-landgebruikvlakken zijn
vooral akkers (11.105 percelen, 107.211 ha). Veel grasland is in OSM niet als `meadow` getekend. "Bijna de hele provincie aan
weilanden" is dus met de bestaande data "bijna alle gemapte landbouwgrond"; echte graslanden erbij vragen een aparte bron
(zie hoofdstuk 11, open vraag).

**Aanbevelingen in vijf zinnen:**
1. Eén Bezit-opslag per speler (`gde-bezit-v1`) met een compacte ID-verzameling en een kleine toestand per perceel, nooit polygonen;
   de boerderij (`gde-boerderij-v1`) blijft de bron van de veldtoestanden (migratie: De Zonnehoek wordt het eerste bezit).
2. Een prijsmodel dat bij het bestaande past (Sauwerd Weide €2.400 blijft ongeveer het goedkoopste; eerste perceel na ongeveer twee
   uur spelen), met een **schaalprijs** en **afnemende beheeropbrengst** zodat onbeperkt bezit nooit onbeperkt geld geeft.
3. Handwerk blijft het leukst en levert per handeling het meest; AI-personeel dat je in de wereld ziet werken is het tweede pad,
   medespelers die meewerken het derde. Het zichtbare werk is een weergave van een rekenschema, geen aparte simulatie.
4. De productieketen (grondstof, verwerking, verkooppunt) koppelt Percelen aan Bedrijven en geeft de extra marge die eigenaar zijn
   waard maakt; één beheerscherm laat de hele keten zien.
5. Eerste speelbare slice (hoofdstuk 12): **een perceel kopen, zelf bewerken, de oogst verkopen aan één eigen winkel**.

## 2. Data-audit: wat de tegels hebben (percelen)

Bron: `index-provincie.json` (2.978 tegels van 1 km, RD New), sectie PARCELS (OSM `landuse` farmland, meadow, orchard; de bouwer neemt
vlakken vanaf 2.000 m2, `worldbuilder.js` `PARCEL_USE`). Gemeten met `scripts/world/percelen_audit.mjs` (4 tot 8 s, alleen lezen).

**Belangrijkste vondst: de tegels knippen elk vlak op de kilometerlijn.** Een stuk in een tegel is dus geen perceel, en het `gid` van een
stuk is een bouwtelling, geen stabiel kenmerk. Het script rijgt stukken van dezelfde soort aaneen waar ze een deel van een tegelrand
delen (13.361 verbindingen): 25.477 stukken worden 13.883 percelen, waarvan 7.781 over meerdere tegels liggen.

| Meting | Waarde |
|---|---:|
| stukken in de tegels | 25.477 (416.742 hoekpunten) |
| percelen na aaneenrijgen | **13.883** (115.773 ha) |
| binnen de provincie (echte gemeentegrens) | 13.376 (111.620 ha); erbuiten 507 (4.153 ha) |
| weide | 2.691 (8.469 ha, mediaan 1,9 ha) |
| akker | 11.105 (107.211 ha, mediaan 6,0 ha) |
| boomgaard | 88 (94 ha, mediaan 0,5 ha) |
| vlakken die dubbel in OSM staan | 1 (zelfde ID, dezelfde oppervlakte: telt een keer) |
| overlap met een ander perceel (een binnenpunt ligt in een ander) | 6 |

### 2.1 Verdeling van de oppervlakte

| Klasse | Percelen | Hectare |
|---|---:|---:|
| tot 0,2 ha | 28 | 1 |
| 0,2 tot 0,5 | 459 | 159 |
| 0,5 tot 1 | 874 | 660 |
| 1 tot 2 | 1.931 | 2.887 |
| 2 tot 5 | 3.748 | 12.605 |
| 5 tot 10 | 3.465 | 24.856 |
| 10 tot 20 | 2.161 | 30.317 |
| 20 tot 50 | 1.037 | 30.017 |
| 50 ha en meer | 181 | 14.271 |

Kwantielen: p10 1,0 ha, p25 2,1, mediaan 4,9, p75 9,8, p90 18,7, p99 56,4, grootste 248,5 ha.

### 2.2 Per gemeente (echte grenzen, `game/grenzen.json`) en per streek

| Gemeente | Percelen | Hectare | Bereikbaar | Mediaan ha |
|---|---:|---:|---:|---:|
| Het Hogeland | 3.786 | 26.210 | 75,5% | 5,3 |
| Westerwolde | 1.785 | 17.863 | 84,6% | 6,4 |
| Midden-Groningen | 1.393 | 14.344 | 82,2% | 6,2 |
| Eemsdelta | 1.536 | 13.942 | 82,9% | 6,4 |
| Oldambt | 624 | 13.307 | 90,7% | 13,1 |
| Westerkwartier | 2.026 | 7.590 | 69,0% | 2,3 |
| Stadskanaal | 808 | 7.088 | 88,7% | 4,9 |
| Veendam | 344 | 4.984 | 86,6% | 7,8 |
| Groningen | 808 | 3.191 | 66,2% | 2,6 |
| Pekela | 267 | 3.102 | 84,3% | 7,1 |

Per streek (`regioleven.js`, binnen het bereik van een streekhart; "overig" is wat daarbuiten ligt): Westerwolde 1.949 percelen
(18.102 ha), Hogeland 2.024 (16.284), Veenkoloniën 1.313 (16.255), Oldambt 887 (12.648), Lauwerskust 1.387 (11.072), Eemsdelta 931
(7.706), Hunsingo 1.740 (7.290), Westerkwartier 923 (2.185), overig 2.223 (20.078). Kleine kavels in het Westerkwartier en bij Groningen
(mediaan 1,8 tot 2,6 ha), grote in Oldambt (13 ha).

### 2.3 Bereikbaar, en wat het perceel raakt

Bereikbaar = de rand ligt binnen 12 m van een autoweg (hoofd-, normale of kleine weg, geen brug of tunnel) of van een fiets- of
voetpad (landbouwpad). Tot 60 m is "nabij".

| Klasse | Percelen |
|---|---:|
| aan een autoweg (12 m) | 10.500 |
| aan een pad | 399 |
| autoweg nabij (tot 60 m) | 1.279 |
| pad nabij | 60 |
| geen toegang (verder dan 60 m) | 1.646 |

**Bereikbaar (weg of pad): 10.899 percelen, 78,5%, 100.502 ha.** Met "nabij" erbij zijn 12.237 percelen koopbaar (88%); de 1.646 zonder
toegang blijven buiten de verkoop (een aanleg-optie kan later). Verder: 5.129 raken water (sloot langs de rand: normaal), 133 raken
spoor, 4.393 raken een gebouw (de boerderij of schuur ernaast), 236 hebben water erin, 696 een gebouw erin (een erf: kan later een
erfpremie zijn), 227 een weg erdoor, 1 spoor. Raken en doorsnijden zijn dus geen uitsluitreden, wel een waarschuwing op de kaart
(spoor: "gevaarlijk perceel", de bestaande spoorregels gelden).

Buren (gedeeld hoekpunt): 2.197 percelen hebben geen buur, mediaan 2 buren; 11.241 hebben een buur van dezelfde soort (de velden
liggen in blokken: dat is het "buren"-gegeven voor de perceelkaart en voor samenvoegen).

### 2.4 Te klein, te groot

* **Te klein (onder 0,5 ha): 487 percelen** (3,5%), waarvan 223 een buur van dezelfde soort hebben. Voorstel: samenvoegen met de
  grootste gelijke buur bij het bouwen van de index (de bouwer heeft al een ondergrens van 0,2 ha); wat overblijft (264) is een
  "perceeltje" met minimumprijs en alleen handwerk.
* **Te groot (20 ha en meer): 1.218 percelen**, samen 44.288 ha (38% van alle grond); 181 zijn 50 ha of meer. Voorstel: niet
  splitsen (een splitslijn is een nieuwe, onbetrouwbare vorm), maar een groot perceel *per werkeenheid* laten werken: zie 5.3.
  Alleen als de eigenaar liever kleinere stukken wil, splits in een rooster van 250 m langs de hoofdas (ID `<id>.<n>`); dat is een
  aparte stap en niet nodig voor de eerste slice.

### 2.5 Stabiel ID

`id = 'p' + eerste 12 hex van hash64(soort | laagste hoekpunt op 1 m (niet op een tegelrand) | binnenpunt op 10 m)`; 48 bit.
Gemeten: **0 botsingen op 13.883 percelen**; het eerste voorstel (alleen soort en laagste hoekpunt) gaf 18 botsingen omdat buurpercelen een
hoekpunt delen, en 32 bit zou bij dit aantal ongeveer 7% kans op een botsing hebben. De audit draait de groepering ook met omgekeerde
tegelvolgorde en vergelijkt de ID's en oppervlakten: **identiek (deterministisch)**. Het ID hangt niet af van `gid`, van de
bouwvolgorde of van de speler; wel van de OSM-vorm. Verschuift een toekomstige OSM-opname het laagste hoekpunt, dan raakt de
opslag het perceel kwijt. Daarom bewaart de opslag naast het ID ook het ankerpunt (x, y op 10 m) en herkoppelt een migratie bij
het laden: dichtstbijzijnde perceel van dezelfde soort binnen 50 m en 20% oppervlakteverschil, anders vervalt het perceel met
terugbetaling (nooit verlies, zie 8).

### 2.6 Grootte van de data

| Wat | Grootte |
|---|---:|
| alle tegels (2.978) | 88,5 MB uitgepakt, 47,6 MB als pack |
| perceelsectie in de tegels | 1.973 KB uitgepakt = 77 B per stuk, 4,7 B per hoekpunt, 16,4 hoekpunten per stuk |
| **index "te koop"** (ID, x, y, ha, soort, toegangsklasse) | 531 KB JSON, **230 KB gzip**, 38 B per perceel |
| opslag van een perceel van de speler (ID, fase, gewas, tijd, bodemlog) | 44 B JSON per perceel |

50 percelen zijn 2,2 KB, 500 zijn 22 KB, alle 13.883 zijn 610 KB: ruim onder de opslaggrens. Voor het netwerk (Samen spelen) gaat
alleen een ID-verzameling: 6 byte per perceel binair, 8 tekens base64. De polygonen komen nooit in de opslag of het netwerk: die
staan in de tegels die er al zijn en worden alleen voor wat in beeld is uit de tegel gelezen (zie 9).

## 3. Data-audit: panden en winkels (Bedrijven)

Uit dezelfde tegels (provincielaag) en uit `shopplaces.json` en `facilities.json`:

| Meting | Waarde |
|---|---:|
| panden in de provincielaag | **370.144** (de stadslaag heeft er nog ongeveer 51.700; samen ongeveer 422.000) |
| met OSM-id | 365.195 (98,7%): **stabiel pand-ID** |
| met een naam | 1.535 (0,4%) |
| gemiddeld grondvlak | 122 m2 |
| soort `yes` (niet gespecificeerd) | 174.042 (47%) |
| `house` | 157.800; `detached` 7.469; `semidetached_house` 4.811; `apartments` 3.311 |
| woningen volgens soort | 173.860 (met de helft `yes` ongeveer 350.000: meestal woningen) |
| schuur (`shed`) en garage | 6.524 en 3.449 |
| industrie (`industrial`, `service`, magazijn) | 5.134 |
| handel (`retail`, `commercial`, kantoor, hotel) | 2.071 |
| openbaar (school 185, kerk 229, gemeentehuis, ziekenhuis...) | 522 |
| landbouw (kas, schuur, stal) | 366 |
| winkelplekken (`shopplaces.json`, 15 winkeltypen) | 2.183 |
| voorzieningen (`facilities.json`, 41 soorten, 836 KB) | 9.653 |

Per gemeente zijn er 12.000 tot 55.000 panden (Midden-Groningen 55.436, Westerkwartier 49.765, Het Hogeland 43.500). De data zegt niet
welke panden een bedrijf zijn: een pand krijgt een bedrijfstype door de koppeling die er al is (`shopspots.js`, `shopbind.js`: het
winkeltype van de plek in het pand) en door de pandsoort; alle andere panden zijn woningen of bijgebouwen. Een pand dat OSM als
`yes` geeft en geen plek heeft, is een woning (verhuur).

**Opslag van bezit bij onbeperkte schaal:** een verzameling OSM-id's als gesorteerde delta's in varint-base64 is naar schatting 2,7
byte per pand (de ID's liggen ongeveer 2.700 uit elkaar): 1.000 panden zijn 2,7 KB, 100.000 panden 270 KB. Dezelfde ID's als gewone
JSON zijn 10 byte per pand (100.000 panden is 1 MB), dus de gecomprimeerde vorm is de enige die onbeperkt schaalt.

## 4. Ontwerp: het bezit van de speler

### 4.1 Eén opslag per speler

Nieuw: `game/js/bezit.js` (puur: geen DOM, geen THREE, geen klok; test `bezit_test.mjs`) en opslagsleutel `gde-bezit-v1`
(`storagekeys.js`). Het is van de speler en niet van een savegame (zoals `gde-boerderij-v1`, `gde-loopbaan-*`): elk apparaat,
elk opgeslagen spel, per speler (#429).

```
{ v: 1,
  percelen: { <id>: { a: [x10, y10], s: 'g|w|b', t: <speldag gekocht>, p: <prijs>, w: 0..3 (beheerniveau),
                      f: fase, g: gewas, z: zaaitijd, u: uitputting }, ... },   // 44 B per perceel
  panden:   'AAEC...' (gesorteerde delta-varint base64 van de OSM-id's),  pandstaat: { <osmId>: { ... } } alleen als afwijkend
  schuld: 0, kas: {...}, schaal: { n: <aantal>, ... } }
```

**Het bezit is een verzameling ID's plus een kleine toestand, nooit een polygoon.** Toestand die voor alle panden gelijk is (verhuurd,
normale voorraad, niet verwaarloosd) staat niet in de opslag: alleen wat afwijkt (eigen prijs, personeel, onderhoud, verbouwing).

**Migratie en savecompatibiliteit.** `gde-save-v1` verandert niet. `gde-boerderij-v1` blijft de bron van de veldtoestanden en het
kasboek van de boerderij (de percelen die er al in staan, `b.bedrijf.percelen`, blijven werken); `bezit.js` leest ze mee: de 12
verzonnen percelen uit `percelen.js` (De Zonnehoek, Wierdeakker...) blijven bestaan als hand-gezette percelen met hun eigen ID
(`zonnehoek-akker` enz.), zodat niets in een bestaand profiel van betekenis verandert. Nieuwe percelen uit de provincie krijgen een
ID uit de index en landen in `gde-bezit-v1`, hun veldtoestand in de boerderij onder hetzelfde ID. Een leeg, oud of kapot profiel
geeft een leeg bezit (zoals `normaliseer` in de boerderij); een bezit dat naar een niet meer bestaand ID wijst, wordt
teruggedraaid met terugbetaling, nooit stil gewist.

### 4.2 Wat een perceel is in het spel

Een perceel uit de index heeft: ID, verzonnen naam (4.5), soort, oppervlakte, bodem (streekgemiddelde plus ruis uit het ID: 4.3),
toegangsklasse, het binnenpunt (voor de markering en het doel op de kaart) en de buren. De vorm komt uit de tegel.

### 4.3 Prijsmodel (voorstel; getallen zijn te tunen in werkpakket 2 en 10)

`prijs = ha x grond[soort] x streekfactor x (0,7 + 0,6 x bodem) x ligging x maat`, op €50 afgerond, ten minste €1.200.

* grond per ha: weide €1.500, akker €2.300, boomgaard €3.200 (de weide en akker staan al zo in `percelen.js`: Sauwerd Weide 1,6 ha is €2.400).
* streekfactor: Hogeland, Hunsingo, Oldambt (zeeklei) 1,15; Eemsdelta 1,10; Lauwerskust 1,0; Westerkwartier 0,90; Veenkoloniën 0,85; Westerwolde 0,80.
* bodem (0 tot 1): streekgemiddelde (klei 0,85 tot 0,9; Veenkoloniën 0,5; Westerwolde 0,45) plus een vaste ruis van plus of min 0,1 uit het ID.
  Dit hergebruikt `bodemFactor` voor de oogst (0,6 tot 1,2). Een bodemlaag uit hoogtedata kan later; niet nodig voor de eerste slice.
* ligging: aan een weg 1,0; aan een pad 0,92; weg nabij 0,85; pad nabij 0,78; geen toegang: niet te koop.
* maat: tot 5 ha 1,0; tot 20 ha 0,95; daarboven 0,85 (grootverbruikskorting).
* **schaalprijs:** `x (1 + min(eigen aantal, 200) / 100)`: wie veel heeft betaalt voor het volgende perceel tot driemaal zoveel
  (grondprijsdruk: het land raakt op). Dit is de rem die onbeperkt bezit betaalbaar houdt voor beginners en uitdagend voor
  grootgrondbezitters.

Gemeten op de 12.237 koopbare percelen (zonder schaalprijs): goedkoopste €1.200, p10 €1.950, p25 €4.700, **mediaan €11.850**, p75 €24.800,
p90 €44.750, p99 €124.650, duurste €571.400, **totaal €241,8 miljoen**; weide mediaan €3.350, akker €14.950, boomgaard €1.850.
**1.543 percelen kosten €2.400 of minder.**

Tempo (netto ongeveer €1.100 per uur, [BALANS-21-11.md](BALANS-21-11.md)): een perceel van €2.400 is na 2,2 uur te betalen (met de
Duizendpoot-bonus van €2.000 en het startgeld ongeveer na twee uur: dat is de gewenste "eerste perceel na ongeveer twee uur"),
het p10-perceel kost 1,8 uur, de mediaan 10,8 uur. Daarna versnelt het door de opbrengst (hoofdstuk 5). Het totale aanbod van
€242 miljoen is ongeveer 220.000 speeluren: de provincie leeg kopen kan niet, en dat is de bedoeling.

### 4.4 Eigendom op de kaart en in de wereld

Zie hoofdstuk 7 (UI) en 9 (prestaties). Eén regel: **je koopt het perceel, niet de tegel**: er verandert niets aan de wereld, alleen
een laag erbovenop. Geen tegelherbouw bij kopen.

### 4.5 Namen (constitution 2 en 4)

Percelen krijgen verzonnen namen en nummers uit streek en plaats; **nooit** een echte eigenaar, kadasternummer of BRP-gegeven.
`naam = <soortwoord> <bij|in> <woonplaats> (K<3 cijfers uit het ID>)`; de woonplaats is de dichtstbijzijnde van `grenzen.json` (een
echte plaats mag); het soortwoord komt uit een lijst per soort en bodem (weide: Wei, Dijkweide, Polderwei, Terpweide; akker: Kleistuk,
Zandkamp, Dalgrondakker, Wierdeakker; boomgaard: Bongerd, Fruitkamp) en wordt gekozen door het ID. De verkoper is een verzonnen
bedrijf: `<Maatschap|Veehouderij|Akkerbouwbedrijf|Familiebedrijf|Landbouwbedrijf> <landschapswoord>` (Hoek, Kamp, Wierde, Klei,
Polder, Dijk, Zand...): geen achternamen, geen persoonsnamen. Een panden-naam is het winkelnaam-systeem dat er al is (`winkelNaam`,
verzonnen); woningen heten `<woningsoort> aan <straatnaam uit de tegel> (W<4 cijfers>)` zonder huisnummer. **Test (`bezitnamen_test`):**
alle 13.883 namen door de merkenlijst en de regelaudit, geen woord uit een persoonsnamenlijst, uniek per ID.

## 5. Wat een gekocht perceel doet

### 5.1 Hergebruik wat er is

De toestanden van een veld (kaal, bewerkt, gezaaid, groeit, rijp, geoogst: `farmstatus.js`/`farmmodel.js`), de rooier- en
aflever-flow, het kasboek, het teeltplan per perceel (`b.plan`), de loonwerker (`LOONWERKER`, 85% netjes), huur (`percelen.js`:
de huurregels blijven voor wie huurt) en de dagmarkt (`gewasmarkt.js`) gelden voor elk perceel van de index. Een perceel uit de index
is een `bedrijf.percelen`-regel met dezelfde velden als De Zonnehoek; de index levert alleen naam, ha, bodem en ligging in plaats van
de vaste lijst van twaalf.

### 5.2 Drie manieren om te werken (spelgevoel, eigenaar 21-11)

1. **Zelf (handwerk):** alles zelf doen met je eigen trekker en werktuigen: ploegen, zaaien, bemesten, oogsten, afleveren (bestaand).
   Levert **per handeling het meeste** (100%, plus de karakterbonus als Tessa).
2. **AI-personeel:** je huurt een landarbeider (verzonnen naam, loon per speldag, vaardigheid 1 tot 3) en zet hem op een perceel met
   een teeltplan; hij doet de cyclus zelf met jouw machines (of een loonbedrijf-trekker tegen vergoeding) tegen 80 tot 90% van de
   opbrengst van handwerk en de kosten van zijn loon en diesel. **Je ziet hem werken in de wereld:** een gedragen figuur op een trekker
   die rijen rijdt, het veld verandert per cel.
3. **Medespelers:** een gast werkt op jouw perceel (5.5).

Alles wat je verder niet aanraakt, kun je **verpachten** (pacht per speldag, 0,9% van de koopprijs: lager dan wat een huurder je
vraagt, 1,2%, zodat huren en verpachten geen geldmachine wordt) of braak laten liggen.

**De zichtbare AI is een weergave, geen aparte simulatie.** Het beheerschema (5.4) rekent per speldag uit wat het personeel doet en
oplevert. Binnen de streamstraal van het perceel (de 230 m van `boerderijwereld.js`) speelt de wereld dat schema na: een figuur en
een voertuig volgen de rijen van de cyclus, het veld krijgt cellen per fase. Buiten die straal gebeurt er alleen het cijfer.
Daardoor zijn visuele en rekenuitkomst nooit verschillend, kost vol bezit niets extra in beeld, en blijft Samen spelen
deterministisch. Het aantal zichtbare werkers is begrensd (hoogstens 4 tegelijk, de dichtstbijzijnde); de rest werkt "achter de
heuvel".

### 5.3 Schaalbaarheid: wat bij 50 of 500 percelen

Alles met de hand werkt tot ongeveer 5 percelen. Daarna:
* **Beheerscherm (Bezit > Overzicht):** één lijst van al je percelen en panden met stand, wat nu te doen valt, opbrengst per dag en
  aandachtspunten; sorteren (rijp eerst), filteren (streek, soort, beheerniveau), selectie en **bulkacties** (zaai alles, oogst alles,
  zet op verpacht, kies gewas voor een streek).
* **Regels ("teeltplan per streek"):** een regel zet een gewas voor alle percelen van een streek en soort ("alle akkers in Oldambt: graan").
* **Personeel met capaciteit:** een landarbeider regelt hoogstens 20 ha per speldag; meer land vraagt meer mensen of een loonbedrijf
  (de loonwerker uit de boerderij, `LOONWERK_HA`). Een voorman (vaardigheid 3) bundelt drie arbeiders.
* **Afnemende beheeropbrengst:** de opbrengst van beheerd of verpacht land wordt `x 1 / (1 + n / 40)` met n het totaal aantal
  beheerde percelen: de eerste 40 tellen vrijwel volledig, de 400e levert een tiende. Het houdt het geld in de hand zonder iets
  te verbieden.
* **Werkeenheid:** een groot perceel werkt in eenheden van 1,2 ha (`HA_REF`): handwerk bewerkt per ronde **één werkveld** van
  vier rijen (de bestaande rijen), meer ha vraagt meer rondes of personeel. Dit is ook de oplossing voor een bestaande
  scheefheid: nu volgt de opbrengst de grootte tot x4 terwijl de arbeid vast is (vier rijen van 100 m), zodat een groot perceel
  veel te veel oplevert per minuut. Voorstel: de rijlengte of het aantal rondes schaalt mee met `sqrt(ha / 1,2)` tot 3, zodat de
  opbrengst per minuut werk ongeveer gelijk blijft. Dit is het eerste punt van werkpakket 10.

### 5.4 Soorten bezit

* **Gewassen:** de vijf bestaande (aardappelen, suikerbieten, graan, gras, uien) plus boomgaardfruit (nieuw gewas, `PRIJS_KG`);
  altijd zomer: korte groeicycli (de bestaande: 20 tot 48 speluren, dat is 0,8 tot 2 speldagen), nooit winter of sneeuw.
* **Vee (weide en deels akker):** melkvee, schapen en kippen. Lichte sim: een perceel heeft een bezetting (aantal per ha: melkvee
  2,5, schapen 10, kippen een hok van 200), voeren met eigen gras of hooi, melk of eieren per speldag in de schuur of opslag, melken
  automatisch (melkrobot als machine) of zelf als korte handeling. In de wereld tonen we de bestaande kudde-generatie
  (`countryside.js`, `pg_koe.js`) met hoogstens twaalf dieren per perceel als zichtbare afspiegeling van het aantal. Ziekte is een
  event (5.8). Dit vult het gat in `BOERDERIJ.md` ("een kleine veestapel of weide").
* **Machines en trekkers:** het eigen wagenpark dat je ook zelf bestuurt: het bestaande `machines.js`/`werktuigen.js`/`boerderijwereld.js`
  (gewone voertuigen, `playerOwned`, `farm` = uid). Personeel gebruikt ze zonder dat je erin zit.
* **Opslag en verwerking:** de silo en schuur van een erf (bestaand, `opslagKg`), en nieuw **verwerkers**: melkfabriek, kaasmakerij,
  frietfabriek (voor de aardappelen; de Fjord Frituur is het verhaal van Tessa), meelmolen en bakkerij, en **verkooppunten**
  (boerderijwinkel, markt, eigen supermarkt). Een verwerker is een pand uit Bedrijven met een rol, geen apart gebouwtype.

### 5.5 Samen spelen: werken op andermans perceel

Een gast kan meewerken op het perceel van de eigenaar (de gast-bestuurder-keten van `coopbestuur.js` is er al, en `coopDeel` voor
de verdeling). **Regel:** de eigenaar krijgt de **oogst en de voortgang** (de oogst gaat naar zijn schuur, zijn veldtoestand,
zijn prestatie, zijn Landbouw-niveau); de **gast krijgt loon**: het loonwerktarief van het perceel (`LOONWERK_HA`) via `coopDeel`, plus
zijn eigen Landbouw-punten en zijn eigen "gewerkte hectares"-teller in zijn eigen opslag (#429). Het loon is nieuw geld (zoals
`coopDeel` nu al is), niet af te trekken van de eigenaar, zodat meewerken nooit een last is en de eigenaar geen reden heeft het te
weigeren. Valt de gast weg tijdens een klus, dan blijft het veld staan zoals het is (de cellen zijn eigenaarstoestand) en de eigenaar
of een ander kan afmaken. Een gast die het perceel zelf óók in zijn eigen progress heeft, werkt in beide werelden aan het zijne.

### 5.6 Productieketen: grondstof, verwerking, verkooppunt

De keten koppelt Percelen aan Bedrijven en is het antwoord op "wat levert meer op dan gewoon leveren": **een eigen keten geeft extra
marge.**

```
 melk (melkvee) ---> melkfabriek / kaasmakerij ---> kaas ---> supermarkt, winkel, markt
 aardappelen    ---> frietfabriek --------------> friet --> snackbar, horeca  (de snackwagen)
 graan          ---> meelmolen ---> bakkerij ---> brood --> bakker, supermarkt
 eieren (kippen)------------------------------------------> supermarkt, horeca
 gras           ---> hooi ---> eigen vee   (interne schakel, geen verkoop)
 bieten         ---> Suikerhal Hoogkerk (bestaande afnemer)
```

* Elke schakel heeft **voorraad** (buffer in kg, de opslag van een erf of pand) en een **doorvoer per speldag**. Wat de volgende schakel
  niet kan opnemen, blijft staan (silo vol: de oogst stokt, een waarschuwing in het beheerscherm).
* **Logistiek:** vrachtwagens met AI-chauffeur (verzonnen naam, loon) rijden tussen schakels; binnen de streamstraal zichtbaar (bestaande
  vrachtvoertuigen en de AI-verkeersvoorzieningen in `trafficfleet.js`), anders alleen de doorlooptijd (afstand / 15 m/s plus laden).
  De speler kan er zelf in stappen en de rit doen; dat levert een kleine bonus op (zoals de afleverrit nu).
* **Extra marge:** elke schakel die van jou is voegt marge toe (eigen verwerker +15%, eigen verkooppunt +15%, beide +35% in plaats
  van 30: een kleine bonus voor de gesloten keten), begrensd door het vraagplafond van het verkooppunt (zie 6.3).
* **Eén beheerscherm** (Bezit > Overzicht, tab "Ketens"): per keten de schakels als een rij met voorraadbalken, doorvoer, marge en de
  zwakste schakel in beeld; klik op een schakel om te ingrijpen (prijs, personeel, extra wagen).

### 5.7 Verkoop en dynamische prijzen

* **Eigen verkoop** via je winkels (hoogste marge); daarnaast de afnemers die er al zijn (Coöperatie Noorderveld enz.).
* **Dynamische prijs per streek per dag:** `prijs = basis x (1 + 0,2 x (vraag - aanbod) / referentie)`, begrensd op 0,7 tot 1,4
  (de bestaande dagmarkt zit op 0,8 tot 1,2). De **vraag** komt uit een deterministische hash van streek, dag en product (geen
  `Math.random`), de **aanbod** is wat jij en je medespelers die dag in die streek leveren. Verzadiging: elke 1.000 kg die je in een streek
  levert drukt de prijs daar 3%, herstel 25% per dag. Dat dwingt tot spreiden over streken en is de rem tegen een enkel product.
* **Events:** veilingdag (plus 25% op één product, een dag), landbouwbeurs (kortingsbonnen op machines).
* **Samen spelen:** de dag komt uit de gedeelde spelkalender (`calendar.js`), niet uit `b.uren` (nu rekent `gewasmarkt.js` met de
  boerderijuren van de eigen speler: dat blijft zo voor de basisprijzen, maar de streekprijs gebruikt de kalender zodat medespelers
  dezelfde prijs zien).

### 5.8 Events (altijd zomer)

Pure regels in dezelfde stijl als `eventrules.js`, afspeelcode in `worldevents.js`; alle namen en regels verzonnen.
* **Weer en natuur:** droogte (op zandgrond meer: opbrengst min 15 tot 35%), hagelbui (een gezaaid perceel verliest 30%; verzekering
  optioneel), mierenplaag, wespen op de boomgaard. Geen winter, sneeuw of natuurijs.
* **Pech:** machine kapot (kans stijgt boven 70% slijtage, de bestaande slijtage), ziek vee (quarantaine, dierenarts kost geld),
  inspectie door de verzonnen **Inspectiedienst Noordrand** (boete of lof), storing in de koeling.
* **Verhalend:** eigenaardige buren en Gronings gekibbel (kleine meldingen met een keuze), kermis en dorpsfeest.
  **Gevoelige onderwerpen** (aardbevingsclaims, gaswinning) alleen met zorg: alleen via de verzonnen **Delfstof Noord**, controleerbare
  cijfers, nooit een echt slachtoffer als grap (constitution 6). Voorstel: niet in de eerste ronde.
* **Wedstrijden:** trekkertrek (minigame met je eigen trekker), veiling, landbouwbeurs. Bestaande regioevents (`regioleven.js`) en
  de bestaande minigame-opzet worden hergebruikt.

### 5.9 Tessa

Boeren doe je als Tessa (`karakterVoorActiviteit('farm')`, de karakterwissel zoals bij voetbal): het handwerk op het veld loopt
daarom via de bestaande karakterbonus (15% sneller netjes-band, +5% oogst). De beheerschermen, het kopen en het personeel zijn geen
veldwerk en gaan niet via de wissel. Nieuwe **boerenpersona-regels** (`TESSA_REGELS`, alleen tekst; geen TTS: het besluit van 20-10 en
de achterstandslijst gelden): een korte, af en toe getoonde regel bij het eerste perceel per streek ("Klei blijft aan je laarzen, zand
niet. Dit ruikt naar thuis."), bij de eerste oogst van een nieuw gewas, bij het eerste vee en bij het eerste personeel ("Eerst
leren we het zelf, dan pas een ander."). Kans en cooldown zoals de bestaande persona-regels.

## 6. Ontwerp: Bedrijven (vastgoed en winkels)

### 6.1 Wat er te koop is

**Alles is koopbaar** (besluit eigenaar), behalve wat het verhaal of een spelregel breekt. De standaard is dus "te koop", met een
**uitsluitlijst die ik expliciet voorstel**, elk met reden:

| Niet te koop (of pas later) | Reden |
|---|---|
| ziekenhuis, ambulancepost, politiebureau, brandweerkazerne | het spel heeft respawn, aanhouding en hulp op deze plekken; een eigenaar zou ze kunnen sluiten of tegen jezelf draaien |
| treinstations, busstations en de haltes | reisbeats T1 tot T5 en de rit-flow hangen eraan |
| het huidige missiedoel en het pand van elke opdracht die nu actief of nog te komen is | de opdracht moet kunnen; het pand **komt vrij** na het slot van de akte waarin het speelt (voorstel) |
| je eigen safehouse en je huis (`safehuisplek`) | is al van jou |
| De Zonnehoek en andere verhaalplekken met een eigen eigenaar in de tekst | de tekst noemt de eigenaar; een koop moet de lijn niet breken |
| monumenten en landmarks (kerken, gemeentehuizen, de bekende torens) | Voorstel: **wel** te koop, maar alleen als "Beheer" (geen sloop, geen aanbouw, altijd toegankelijk). De eigenaar zei "alles"; dit is een zachte grens. |

Een pand dat niet te koop is toont "Niet te koop" met de reden op de kaart (geen stille weigering). De lijst is data
(`BEZIT_UITSLUITING`, een tabel per soort en een lijst van ID's) en een test keurt dat elk missiedoel erop staat of door de regel
"komt vrij" gedekt is.

### 6.2 Prijs en opbrengst per pand

* **Woning:** `woonoppervlak (grondvlak x verdiepingen uit de hoogte) x €300 per m2 x gemeentefactor (stad 1,3, platteland 0,9)`:
  een gemiddelde woning (110 m2) kost ongeveer €33.000 (zeer duur voor het begin: dat is bedoeld, het is een latere stap),
  een schuur of garage €1.500 tot €4.000. **Verhuur:** 0,25% van de prijs per speldag (terugverdientijd 400 speldagen = 160 speeluren);
  huurders zijn een kans op achterstand (kleine kans, de huurder "verhuist", nooit een uitzetting als beeld: geen leed).
* **Winkel, horeca en dienst:** prijs `m2 x €900 x typefactor` (supermarkt 1,4, bakker 1,0, snackbar 0,8, kapper 0,7...), **omzet
  per speldag** `= basis(type, m2) x klantendruk(woonplaats) x prijsstand x voorraadstand x personeelsstand x verzadiging`.
* **Industrie en verwerkers:** prijs `m2 x €700`; een verwerker (5.6) draait grondstof om in product.

### 6.3 Passief plus beheer

Omzet loopt per speldag, passief (je hoeft er niet te zijn). **Sturen** doe je via vier knoppen in de winkel (de beheerknop, zie
6.4): **prijs** (laag trekt meer klanten, lage marge; hoog andersom: een omgekeerde U met een optimum), **voorraad** (inkoopbudget:
te weinig is lege schappen en gemiste omzet, te veel is bederf), **personeel** (uren en vaardigheid) en **openingstijd**.
Het resultaat is één getal per dag met de reden ("Brood uitverkocht om 14:00: meer voorraad").

**Klantenstroom (verzadiging, de anti-exploit):** per woonplaats een vaste klantenpot, evenredig met het aantal woningen (gemeten uit
de tegels: de 370.144 panden zijn de bevolking). Elke extra winkel van hetzelfde type in dezelfde plaats deelt die pot
(`1 / (1 + k)`). Een tweede supermarkt in een dorp van 300 huizen verdubbelt niets.

**Belasting, onderhoud, events:** vastgoedbelasting 0,1% van de waarde per speldag (progressief voor wie veel bezit), onderhoud
(0 tot 100, zakt langzaam, renovatie herstelt; verwaarloosd verlaagt omzet en waarde), en events: **inspectie** (boete of lof),
**staking** (een dag dicht, satire, geen leed), **storing**, **overval** niet (geen leed: constitution 6), **veiling** (een
koopje).

### 6.4 Bestaande NPC's worden je personeel

De kassiers en winkeliers die er al staan blijven en worden **jouw personeel** zodra je het pand koopt: zelfde figuren, zelfde
gedrag, nu met een **beheerknop in de winkel** (E bij de toonbank of een prompt). Je kiest of de NPC blijft (kost loon) of dat je
iemand anders aanstelt. **Klanten verklaren de omzet:** zichtbaar meer wandelaars die de winkel in- en uitlopen naarmate de omzet
hoger is, begrensd op hoogstens 6 per winkel in beeld (de bestaande voetgangers: `pedestrians.js`).

### 6.5 Schaal onbeperkt (monopoliespel)

Panden zijn een compacte ID-set (3.). Alles wat niet in beeld is, is een cijfer in het dagschema; alleen wat de speler ziet (in
een straal van de speler) wordt een figuur of een bordje. Het beheerscherm (5.3) is de manier om duizenden panden te beheren:
overzicht, automatische afhandeling (regel: "koop voorraad tot 70% bij elk van mijn supermarkten"), regels voor omzetafvlakking
(afnemende beheeropbrengst, 5.3, verzadiging, 6.3), belasting en onderhoud als geldrem. De schaalprijs (4.3) geldt ook voor panden.

### 6.6 Start: de akte

Bezit ontgrendelt **na akte 1** (het einde van "Moi, Grunn", vr 14 aug) met een korte scène: een verzonnen notariskantoor (**Notariaat
De Zegelhoek**) stuurt een berichtje "Uw eerste akte ligt klaar" (een knipoog naar de vijf akten van het verhaal). De eerste koop
opent de Bezit-categorie volledig. De boerderij blijft zoals nu toegankelijk (er verandert niets voor wie al boert); Bezit voegt het
kopen buiten De Zonnehoek toe. Reden: dit past bij het tempo (de Duizendpoot-bonus komt na ongeveer twee uur) en breekt het verhaal
niet.

## 7. UI

Alles in het ontwerpsysteem DS3 (zomerse zeefdruk, [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md), ADR 0040), alleen ds-tokens, Phosphor-icoon
(ADR 0041), met de kleurtaal van de bestaande kaartlagen. **Kleurtaal voor Te koop:** geel is al het doel/oogstklaar (`INK.yellow`,
farmmodel: "één gele knop per scherm") en wordt hier **niet** gebruikt. Voorstel: te koop = `INK.policeBlue`-streeplijn met een
prijskaartje, van jou = `INK.greenLight`, medespeler = de eigen spelerkleur uit `players.js`, niet te koop = grijs met slotje.
Nooit alleen kleur: elke stand heeft een lijnpatroon en een vorm (zoals de veldstanden: letter en patroon).

* **Kaartlaag "Te koop"** (`kaartlagen`/`mapview`, naast de bestaande "Percelen"): toont alleen wat in beeld is, op zoomniveau
  vlakken met een prijs per hectare als kleurstap (tot 4 stappen), dicht bij het kaartbord met naam en prijs. De bestaande laag
  "Percelen" (twaalf vaste percelen, geel voor te koop) wordt hierdoor vervangen: de twaalf worden gewone percelen uit het
  bezit en geel verdwijnt voor te koop.
* **Perceelkaart bij aanklikken:** naam, soort, oppervlakte, bodem (woord en balk), ligging, toegang, buren (ook van medespelers),
  verwachte opbrengst (de bestaande `verwachtingKg`), prijs, schaalprijs-opmerking, **Koop** (met bevestiging), **Doel** (waypoint)
  en, bij bezit: Beheer, Verpacht, Verkoop (75%, de bestaande `VERKOOP_FACTOR`).
* **Bezit-overzicht** (menu, 7.1): lijst en kaart met filters, de ketens, het kasboek.
* **Minimap:** eigen percelen als omtrek in groen, aangekochte panden als een puntje, medespelers in hun kleur; geen vlakken van de
  hele provincie (alleen de tegel in beeld).
* **Wereld:** een paaltje met bord (naam en stand, op de hoek van het perceel; hergebruik `farmmarker3d.js`), de grenslijn uit de
  kaartranden van [PERCEELRANDEN-21-11.md](PERCEELRANDEN-21-11.md) (**alleen waar de kaart een rand heeft**; een perceel zonder rand
  krijgt geen getekende grens, alleen de paaltjes op de hoeken) en voor panden een bordje met de eigenaarsnaam in zeefdrukstijl op de gevel
  (`shopsigns3d.js`), het uiterlijk van `shopsign.js`. Klanten (6.4) verklaren de omzet.
* **Prestaties en kasboek:** nieuwe prestaties (eerste perceel, tien percelen, eerste winkel, eerste volledige keten, tien streken
  bezit) in `achievements.js`; de bezitposten (aankoop, belasting, onderhoud, loon, huur) komen als posten in het bestaande kasboek.

### 7.1 Menu: de categorie Bezit

De rail heeft al een groep **Bezit** (`RAIL_GROUPS`: Spullen, Garage, Boerderij). Voorstel: de groep blijft, en **Boerderij wordt het
onderdeel "Land en bedrijf"** (id `bezit`) met subtabs **Overzicht | Boerderij | Bedrijven | Te koop** (de bestaande `SUBTABS`-vorm,
zoals Verhaal). De huidige sectie `boerderij` blijft als inhoud van de subtab Boerderij: `renderBoerderijPanel` wordt dus niet
gewijzigd, alleen ingehangen. Migratie: `enterSection('boerderij')`, `data-goto="boerderij"`, de zoekregel `a-farm` en de toetsenhint
(`HINTS.boerderij`) verwijzen door naar Bezit > Boerderij (de oude ID's blijven werken, zodat geen bestaande verwijzing breekt); er
verandert niets in opslag. Alternatief (afgewezen): Spullen en Garage ook onder Bezit als subtabs; te veel herbouw van een rail die
net is herzien (#911) en de garage-diepkoppelingen. Test: de bestaande pausemenutests plus een nieuwe `bezitmenu_test` voor de
doorverwijzing.

## 8. Economie en exploits

* **Geen oneindig geld:** (1) schaalprijs en afnemende beheeropbrengst (4.3, 5.3), (2) verzadiging per streek (5.7), per woonplaats
  (6.3), (3) belasting en onderhoud (6.3), (4) personeelsloon en diesel, (5) kopen en direct verkopen kost 25% (`VERKOOP_FACTOR`),
  (6) pacht 0,9% tegen huur 1,2%: nooit een lus. Een **economiesim** (`scripts/lib/economiesim.mjs`, de bestaande
  `economie_sim_test`) krijgt een bezitsprofiel van 10, 100 en 1.000 percelen en panden, en keurt dat het netto inkomen per uur
  van een speler met 1.000 percelen binnen een factor 3 van de actieve speler blijft.
* **Verhouding tot De Duizendpoot en de bijbanen:** actief werk levert €1.100 per uur netto; handwerk op een perceel gaat daar in de
  buurt (de bestaande balans tot ongeveer €1.584 per uur bruto voor boerderij). Het eerste perceel is na ongeveer twee uur, de
  mediaan na ongeveer elf uur; passieve opbrengst begint klein (verpacht 0,9% per speldag van de prijs: het mediaan-perceel levert
  ongeveer €107 per speldag, €267 per speeluur: een kwart van het actieve inkomen) en wordt door de rem hierboven niet groter dan het
  actieve werk, zodat het spel een spel blijft. Het tempo versnelt na de eerste uren (de eerste percelen betalen terug in ongeveer
  tien uur bij handwerk, nog te meten, en ongeveer vierenveertig bij pacht).
* **Schuld en hypotheek:** optioneel, in de bank die er is (Boerenbank Noordhoek, 0,08% per speldag, tot €25.000); voorstel voor
  de eerste slice: **niet**, later een hypotheekregel tot 60% van de waarde met dezelfde rente, zonder beslag of afschrijving
  van je geld (bestaand principe: geen verlies).
* **Prestaties zonder grind:** de prestatie "eerste perceel" mag niet met een cheat of een Samen-spelen-gift behaald worden zonder
  geld uit te geven; de cheats (`cheats.js`) blijven apart gemarkeerd.

## 9. Prestaties: streamen en geheugen

* **Alleen percelen in beeld:** de index (230 KB gzip) is eenmalig in het geheugen; de vorm van een perceel wordt alleen gelezen uit
  de tegel die al in het geheugen staat (`parcels` in de tegelrijen). Een markering voor een eigen perceel is een paaltje plus een
  lijn; **geen tegelherbouw bij kopen** (de wereld is data, alleen een laag erbovenop).
* **Kaartlaag:** tekent alleen de percelen in het beeldvenster; bij uitzoomen een telling per gemeente in plaats van vlakken.
* **Geheugenbudget (voorstel):** index 0,5 MB (JSON) tot 2 MB (typed arrays); bezit 3 MB bij 100.000 panden; visuele markeringen
  hoogstens 200 zichtbare paaltjes en 64 zichtbare werkers/klanten tegelijk; de rest is cijfer.
* **Tijd per beeld:** het dagschema (5.2, 6.3) loopt per speldag, niet per beeld; zichtbare werkers en klanten volgen een vooraf
  uitgerekend pad, geen botsingsberekening buiten de streamstraal.
* **Meten:** `perf`-run met 1.000 percelen en 5.000 panden in de opslag; de hoofdlus mag niet meer dan 0,2 ms per beeld kosten.

## 10. Samen spelen

**Het uitgangspunt is #429: bezit is per speler in zijn eigen progress.** Drie opties, met voor en nadelen:

| Optie | Idee | Voordeel | Nadeel |
|---|---|---|---|
| **A (voorkeur)** | Elke speler koopt in zijn eigen progress; de wereld is van wie het spel opende, maar het bezit niet; een medespeler ziet jouw percelen en panden als gekleurde omtrek met naam | past bij #429 en het gelijkwaardige-spelers-uitgangspunt; niets te synchroniseren behalve een ID-verzameling; geen host-recht | twee spelers kunnen buiten een sessie hetzelfde perceel bezitten (zoals twee spelers elk een eigen boerderij hebben) |
| B | Gedeeld eigendom in de wereldstand van de host | één waarheid | maakt de host de baas van de wereld (strijdig met de visie), valt weg bij host-wissel (#439), tast bezit aan bij wegvallen |
| C | Eerste koper wint (arbitrage) | geen dubbel bezit | vergt een bemiddelaar met ontvangstvolgorde, onrechtvaardig bij vertraging, harde regel waar #429 geen hard conflict wil |

**Keuze: A, met een zachte claim.** In een lopende sessie stuurt een koper een EXTRA-bericht (`coopextra.js`) met `{id, speler}`; elke
speler markeert dat ID als "van <naam>" en kan het deze sessie niet kopen. **Conflict** (twee spelers kopen binnen dezelfde
seconde): de claim met de laagste (tijd, speler-id) wint, de ander krijgt het geld terug en een melding; **nooit verlies**. Buiten een sessie
is er geen claim: in je eigen spel is het van jou. Een gast die later aansluit stuurt zijn ID-verzameling (6 byte per perceel,
tot een paar duizend) en krijgt die van de anderen terug. Wat een gast ziet: de omtrek en naam van andermans bezit en de winkels met
de naam van de eigenaar; hij ziet geen kasboek of beheerscherm van een ander. Wie de omzet van een winkel krijgt waar een gast
werkt: de eigenaar (5.5: loon voor de gast). **Welke test:** pure `bezitcoop_test` (claim, conflict, aansluiten, wegvallen) en een
testbankstap met drie instanties. Regel voor `docs/COOP-GAST.md` en de changelog: zie werkpakket 9.

## 11. Constitution, risico's en open vragen

* **Constitution 2 en 4:** alle namen verzonnen, geen echte kadaster- of BRP-gegevens (4.5), geen persoonsnamen, de echte plaatsen en
  panden als vorm; Notariaat De Zegelhoek, Inspectiedienst Noordrand en Delfstof Noord zijn verzonnen. Geen externe diensten.
* **Constitution 3:** altijd zomer; events zijn droogte, hagel en plagen, geen winter of ijs. **Constitution 6:** geen getoond geweld,
  geen overval, geen echt slachtoffer als grap, aardbevingsclaims alleen met zorg en niet in de eerste ronde.
* **Risico 1 (scheve balans):** opbrengst per minuut handwerk stijgt nu met de perceelgrootte (5.3): werkpakket 10 corrigeert dit **voor** de
  releases van de kaartlaag.
* **Risico 2 (data):** de stukken moeten bij de bouw aaneengeregen en gededupliceerd worden; het ID hangt van de OSM-vorm af (2.5). Test:
  determinisme en geen botsing in de audit; opnieuw bouwen bij een nieuwe extract geeft een herkoppelrapport.
* **Risico 3 (weiland):** zie de open vraag (1).
* **Risico 4 (omvang):** onbeperkt bezit plus zichtbaar personeel is veel; de eerste slice (12) is klein; de rest ontgrendelt
  stap voor stap.

**Open vragen aan de eigenaar:** (1) weiland is maar 7% van de gemapte percelen; mogen we ook akkers als "weiland-achtig" laten telen
(gras) en de naam "Percelen" houden (aanbevolen), of zoeken we een bron voor grasland? (2) De zachte grens voor monumenten (6.1) en de
koppeling "pand komt vrij na de akte" voor opdrachtgebouwen. (3) Mag handwerk een kleine bonus houden (+25%) boven personeel
(besluit "levert meer op per handeling" is zo vertaald: 100% tegen 80 tot 90%)? (4) De hypotheek: eerste slice of later?

## 12. Stappenplan (FIRE-stijl): epic "Bezit" met werkpakketten

Elk werkpakket heeft een issue (`Refs #n`), een mode (autopilot, confirm of validate, `docs/SPECS-FIRE.md`), kosten en tests. Volgorde en
afhankelijkheid staan in de laatste kolom. **Eerste speelbare slice = werkpakketten 1, 2, 3 (kaartlaag en kopen, eenvoudig), 4 (menu, klein) en het
eerste stuk van 6 en 7: "een perceel kopen, zelf bewerken, de oogst verkopen aan één eigen winkel".** Alles daarna is opbouw.

| # | Werkpakket | Kosten | Mode | Hoofdtests | Na |
|---|---|---|---|---|---|
| 1 (#1096) | **Data en ID's**: `scripts/world/bezit_index.mjs` bouwt `bezit-percelen` (aaneenrijgen, samenvoegen onder 0,5 ha, ID, toegang) en de pand-index; audit in de releasegate | M | confirm | `percelen_audit` (deterministisch, geen botsing), `bezit_index_test` | |
| 2 (#1097) | **Bezit-opslag en prijsmodel**: `bezit.js` (compacte verzameling, migratie van De Zonnehoek, prijsmodel, schaalprijs, namen) | M | validate | `bezit_test`, `bezitnamen_test`, savecompatibiliteit | 1 |
| 3 (#1098) | **Kaartlaag "Te koop" en perceelkaart**: laag, klik, koopflow met bevestiging, doel (DS3) | L | confirm | pure kaartmodeltest, `perceelkaart_test`, beeldrun | 1, 2 |
| 4 (#1099) | **Menu Bezit en start**: Land en bedrijf met subtabs, doorverwijzing, de akte-scène, Mijn bezit | S | autopilot | pausemenutests, `bezitmenu_test` | 2 |
| 5 (#1100) | **Wereldmarkering en minimap**: paaltje, bord, grenslijn uit de kaartranden, eigenaarsnaam op panden, streamen | M | confirm | `bezitmarker_test`, geometrie-NaN, perf | 1, 3 |
| 6 (#1101) | **Tak Percelen: gebruik en schaal**: perceel uit index werkt als het bestaande veld, werkeenheid, verpachten, **AI-personeel** (zichtbaar), vee, boomgaard, beheerscherm en bulkacties, Tessa-regels | L | validate | `boerderij_test` uitgebreid, `personeel_test`, `vee_test`, `bezitbeheer_test` | 2 |
| 7 (#1102) | **Tak Bedrijven: omzet, personeel, beheer, klanten**: pand-model, uitsluitlijst, prijs en omzet, bestaande NPC's als personeel, beheerknop, klanten in beeld, verhuur | L | validate | `bedrijf_test`, `bezituitsluiting_test` | 2, 4 |
| 8 (#1103) | **Productieketen en markt**: schakels, voorraad, logistiek (AI-chauffeurs), dynamische prijzen, events, één beheerscherm Ketens | L | validate | `keten_test`, `streekmarkt_test`, `bezitevents_test` | 6, 7 |
| 9 (#1104) | **Samen spelen**: claim-bericht, omtrek van medespelers, werken op andermans perceel (loon), aansluiten en wegvallen | M | validate | `bezitcoop_test`, testbankstap, `docs/COOP-GAST.md` | 2, 6 |
| 10 (#1105) | **Balans, exploits en prestaties**: arbeid per ha (5.3), economiesim met bezit, prestaties, perf-run met 1.000 percelen | M | validate | `economie_sim_test` uitgebreid, perf, `rules_audit` | 6, 7, 8 |

Volgorde: 1, 2, dan 3 en 4 (parallel), 5; 6 en 7 (parallel, andere bestanden); 8; 9 (kan na 6); 10 loopt mee met 6 tot 8 en sluit af.
Tussen 5 en 6 is er een releasepunt: de kaart toont wat er te koop is en je kunt kopen en bewerken, zonder personeel of bedrijven.

**Risico's per pakket:** 1 het ID bij een nieuwe OSM-extract (herkoppelrapport); 2 migratie van het bestaande profiel (de test voert
een oude opslag door); 3 grote kaartlaag in beeld (alleen wat zichtbaar is); 5 grenslijn alleen waar de kaart een lijn heeft (geen
afgeleide rand: PERCEELRANDEN); 6 schaal en visuele werkers (hoogstens 4); 7 de uitsluitlijst en het pand dat een missie nodig heeft;
8 de keten is een grote graaf (klein beginnen met één keten: melk of aardappel); 9 de claim bij een host-wissel.

## 13. Wat niet bekeken is

Er is geen spel gestart, geen Electron en niets in beeld gezien. De audit is gemeten op de bestaande bouw van de eigenaar
(`game/world`, tegels van 20-11) en geeft geen speelervaring. Alle getallen van prijs, rendement en tempo zijn rekenmodel (de
economiesim, geen speeltest); de spelbot of een speler moet bevestigen dat het eerste perceel na ongeveer twee uur komt. Het schatten
van de opslag van pand-ID's (2,7 byte) is een berekening, geen meting.

## 14. Besluiten van de eigenaar (21-11, na het ontwerp)

Deze besluiten vervangen of verduidelijken de open vragen van hoofdstuk 11 en wat hierboven anders staat:

1. **Weide en akker zijn aparte typen** met eigen prijzen (`GROUND_PER_HA` per soort) en eigen regels: een weide is voor vee en gras (melkvee, schapen, kippen; geen akkergewassen), een akker voor gewassen (geen vee). Het vee van 5.4 staat dus alleen op weide; `gewasVoor` houdt gewassen en soort bij elkaar.
2. **Monumenten en bijzondere gebouwen zijn niet koopbaar** (monumenten, landmarks, kerken, musea, gemeentehuizen en wat al op de uitsluitlijst staat: ziekenhuis, politie, verhaalgebouwen). De zachte "Beheer"-grens van 6.1 vervalt; `businessexclusion.js` (`isMonument`) sluit ze altijd uit, met reden op de kaart.
3. **Handwerk levert 25% meer dan personeel**: de beste arbeider haalt 80% van handwerk (`SKILL_RATIO` 70, 75 en 80%), handwerk blijft per handeling het meest.
4. **Hypotheek en lening komen later.** Het prijs- en kasboekmodel houdt ruimte vrij: `bezit.debt` bestaat al in de opslag, het kasboek van de boerderij kent de post `rente`, en niets in de kooplogica gaat uit van een schuldvrij bezit. Geen lening in de eerste slices.
5. **Woningen: een telling per plaats en gesynthetiseerde panden (werkpakket 1103, gemeten 21-11).** De pandindex blijft zonder gewone woningen (ruim 200.000 rijen zouden hem tienvoudig maken). `scripts/world/bezit_index.mjs` telt de woonpanden (type `yes`, `house`, `detached`, `semidetached_house`, `terrace` of `apartments`, grondvlak 40 tot 400 m2) bij de dichtstbijzijnde woonplaats binnen 4 km en schrijft het vierde veld `places[i] = [naam, x, y, woningen]` in `bezit-percelen.json` (+1 KB gzip van 319 KB; 202.375 woningen in 615 plaatsen; Veendam 5.957, Stadskanaal 5.642, Winsum 2.989). `parcelindex.js` leest het (`housesAt`, `placeNear`; `placeAt` blijft); `bezitlive.js` gebruikt het voor klantendruk en woningprijs (terugval 1.500 voor een oude bouw). **Gat:** de stad Groningen staat niet in de provincietegels (binnen 3 km van het centrum geen enkel pand): zij telt als een grote stad met 50.000 woningen (`CITY_HOMES_ESTIMATE`, een schatting). Een woning om te kopen is een gesynthetiseerd pand-ID (`housing.js`): 2^33 plus plaatsnummer maal 10.000 plus een volgnummer kleiner dan het aantal woningen van de plaats (nooit meer woningen te koop dan er staan), met een vast grondvlak (45 tot 150 m2) en een plek tot 400 m2 van de plaats; het blijft een gewoon pand in `bezit.buildings` (cls `rent`, type `woning`) met de verhuur, leegstand (`MOVE_CHANCE`) en het onderhoud van `business.js`. Afgewezen: een woningsectie in `bezit-panden.json` (naar schatting meer dan 2 MB gzip, niet gemeten) en een raster van 100 m met tellingen (naar schatting ruim 100 KB gzip en nog steeds zonder echte panden). Verhuur is automatisch; een knop zelf bewonen is er niet.

6. **De grenslijn is een eigendomsmarkering, geen kaartrand** (#1100). PERCEELRANDEN-21-11 besloot dat het spel geen heg, hek, draad of berm meer afleidt uit een perceelpolygoon: een
   rand bestaat alleen waar de kaart een lijn heeft. De getekende omtrek van een gekocht perceel is daar geen uitzondering op maar iets anders: een platte, dunne lijn op de grond (`LineSegments`,
   geen botsing, geen model, geen proptype, niet in `edgeclasses.js`), alleen om te laten zien wat van jou is, en alleen voor wat van jou of van een medespeler is. Hij hoort bij het spelersbezit, niet
   bij de wereld: een perceel dat je niet bezit krijgt geen lijn. De vorm komt uit `bezit-vormen.json` (omtrek van het grootste stuk, Douglas-Peucker 8 m, 5 m afgerond, delta-gecodeerd, hoogstens 24
   punten), niet uit de tegel; het verschil met de kaart is dus dat de lijn de vereenvoudigde vorm van het perceel is en niet de echte rand van het landgebruik. Dezelfde omtrek tekent de kaartlaag Te
   koop. Gemeten: 13.650 vormen, 793 KB (311 KB gzip, ruim binnen de 1 MB), 119 ms bouwtijd.

7. **Panden en bedrijven zijn altijd open (besluit 21-11).** Openingstijden zijn nooit een toegangsbeperking. De knop `hr` (`business.js`) en de openingsuren van de snackwagen beïnvloeden alleen omzet
   en personeelskosten; een staking, inspectie, pechdag of "geen openingsuren" is een dag-event dat de omzet raakt ("Vandaag geen omzet", "een dag zonder verkoop"), nooit een gesloten deur of een
   geweigerde toegang. Het rapportveld `open` betekent: draait het bedrijf vandaag een omzet. Nachtwerking mag hooguit cosmetisch zijn (licht, drukte). Bewaakt door `scripts/bezitopen_test.mjs`
   (de rekenmodules kennen geen toegangsbegrip; `hr` 0 is omzet nul en niets anders).

## 15. Snackwagen en Usmem Snacks (eindgame, #1102; canon-update van de eigenaar 21-11)

De **snackwagen** is het eind-voertuig van Bezit en een bedrijf-light-sim als endgame: een mobiel bedrijf dat per speldag veel meer oplevert dan een winkel of perceel, maar actief beheerd
wordt (menu, plek, voorraad) en tegen een concurrent opboxt: **Usmem Snacks** van Jelle Terpstra (verzonnen; Jelle is een verhaalpersonage, vriendelijk-venijnig). De id `frietwagen` blijft in
de opslag (compatibiliteit met bestaande saves en de verhaal-vlaggen); wat de speler leest heet Snackwagen.

### 15.1 Besluiten

1. **Eén wagen, twee lagen.** De bestaande kleine wagen (7.500, `business.js`) is de eerste snackwagen en blijft precies zoals hij was zolang je geen standplaats hebt (geen verandering voor
   bestaande spelers). Zodra je een vergunning hebt rekent `snackvan.js` hem af en niet meer `business.stepDay`. De kleine wagen groeit via drie stappen (klein, groot, XL) en bedrijfsbrede
   upgrades (koeling, eigen merk-sauzen "Terpsaus", dubbele frituurpan).
2. **Poort.** Het tabblad Snackwagen opent via de gedeelde verhaalpoort: `registerGateWorld({ id: 'snackwagen', part: 'ontzet', by: 'Tessa' })` (akte 5), `bezitgate.branchOpen('snack')`.
   Bij een dichte poort staat er uitleg van Tessa (nooit een leeg scherm). De stubpoort (zonder gedeelde poort) laat de legacy-regel de eindgame niet openen; de gedeelde poort (`worldOpen`)
   volgt zijn eigen migratieregel (bestaande saves houden alles).
3. **Standplaatsen** (`pitch.js`, puur): zestien plekken met verzonnen namen bij echte plaatsen (Hoek van de Grote Markt, Martinikerkhof, Stationsplein, Oosterpoort, Reitdiephaven,
   Noorderplantsoen, voetbalstadion, kermisterrein, Haren, Winsum, Leek, Veendam, Delfzijl, Zoutkamp, Lauwersoog, Eemshaven), ligging uit lat/lon via `wgsToWorld`. Vraag per dag =
   `260 x druk x weekeffect x gebeurtenis x uurvenster x winkeldichtheid x ruis`. Het uurvenster volgt een profiel per soort plek (dag, spits, avond, haven, club, event); de kermis en de
   thuiswedstrijd (elke 14 dagen op zaterdag) tellen alleen op de dag zelf. Concurrentie per plek (vast) en 3% per Usmem-plek in hetzelfde cluster (max 15%); een goede naam drukt het.
   **Vergunning:** `6.000 x druk^1,6` (markt ca. 12.700, dorp ca. 1.700), 40 speldagen geldig, vanzelf verlengd voor 25% zolang er geld is (anders vervalt de plek), 15% duurder per vergunning die je
   al hebt (max x3).
4. **Het beste plekje is het eerste doel, en het is van Usmem.** Hij begint met markt, station, Oosterpoort en stadion. Jij pakt eerst vrije plekken en neemt daarna over (vraagprijs
   2,4x tot 1,6x de vergunning, naar je naam). Overnemen maakt hem gemener (stemming +25, meer kans op sabotage). Hij breidt elke 9 tot 14 speldagen uit tot ongeveer 40% van de plekken en
   komt elke 18 tot 25 dagen met een bod op je beste plek (1,8x tot 2,2x); verkopen mag, weigeren geeft een goede naam.
5. **Sabotage is satire** (constitution 6): storing aan de frituurpan, pechdag, valse recensie, prijzenoorlog, een verkoper die hij wegkoopt. Nooit geweld. Het standaardgevolg treedt meteen in
   (je kunt het nog verbeteren met een antwoord dat geld kost); niet antwoorden is nooit fataal. Kans 5% tot 22% per dag (stemming, voorsprong; bescherming door pan en naam).
6. **Reputatie 0 tot 100 per speler**: goede dagen bouwen op, een lege wagen kost 2,5 per dag, een prijs boven 125% kost; factor op de vraag 0,8 tot 1,2.
7. **Menu en keten.** Acht producten (vier basis, kaassoufflé erbij, burger/milkshake/softijs vragen koeling), per wagen 4/6/8 plekken. Een eigen keten (`bezitchain`: verwerker van jou en bron
   die levert) maakt het inkopen tot de helft goedkoper en geeft tot 6% extra klanten. Het verbruik wordt NIET van de keten afgetrokken (zie 15.4).
8. **Voorraad = actief beheer.** De wagen die je zelf runt verkoopt alleen als er voorraad is (vul aan voor 5 dagen, 40 euro per rit); zonder voorraad 15% van de capaciteit en een slechte naam.
9. **Medewerkers-wagens** (extra wagens, 12.000 + 10% per wagen, max 11): loon (90 + 0,6 x vaardigheid per dag) of 30% aandeel; zonder jou op 85% en 15% aanvoerkosten; ze kiezen zelf het
   beste uurvenster. Zichtbaar in de wereld (`snackvans3d.js`).
10. **Eindscore Snackimperium** (0 tot 100): aandeel plekken tegenover Usmem (60), wagens (15), eigen ketens (10), naam (10), het beste plekje (5); elf doelen; prestaties `bz_snack_eerste`,
    `bz_snack_tien` (tien standplaatsen tegelijk) en `bz_usmem` (acht plekken en 75% aandeel).

### 15.2 Balans (afspraak; `node scripts/bezit_sim.mjs`, `snackbalans_test`)

De snackwagen mag **meer geven dan winkels en percelen** omdat het actief beheerd werk is, maar blijft begrensd. Gemeten met de echte modules (40 speldagen, zonder Usmem):

| profiel | winst per speldag | investering | rendement per speldag |
|---|---|---|---|
| start: kleine wagen op het dorp | 249 (0,57x actief) | 9.150 | 2,7% |
| mid: grote wagen + koeling in het park | 538 (1,22x) | 30.150 | 1,8% |
| best: groot, alle upgrades, zes producten op de markt | 854 (1,94x) | 50.250 | 1,7% |
| imperium: best + zes medewerkers-wagens | 1.752 (3,98x) | 165.400 | 1,06% |

Ter vergelijking: pacht 0,9%, huur 1,2%, winkel ongeveer 0,55% per speldag. Met Usmem en sabotage (de speler geeft het goedkoopste antwoord) zakt de opbrengst met 3% tot 6%.

* **De eigen wagen** heeft een eigen zacht plafond (`compressOwn`, 1.800 per speldag): in de praktijk hoogstens 2x wat actief werk per speldag oplevert (440). Dat is meer dan de rem op passief; de
  reden is dat hij voorraad en aandacht vraagt (besluit 8).
* **Wat medewerkers verdienen** gaat vóór de bestaande rem `compressPassive` (plafond 3x actief, gedeeld met al het andere passieve inkomen): passief blijft binnen 3x.
* **Totaal** van een groot imperium (eigen wagen + zes wagens) is ongeveer 4x actief (getest tot 4,25x). Dat is bewust hoger dan de 3x passief omdat de eigen wagen actief werk is; stel bij door
  `OWN_CAP_DAY`, `STAFF_AUTO` of `FLEET_PRICE` in `snackvan.js`.
* **Geen exploit:** wagen kopen en verkopen kost 40%, elke upgrade is eenmalig, vergunningen worden duurder per stuk (max x3), er komt geen geld uit het niets (alle kosten lopen via de aanroeper).

### 15.3 Samen spelen

Regel (ook in `COOP-GAST.md`): **elke speler heeft zijn eigen imperium, zijn eigen Usmem en zijn eigen voortgang (#429); niets hiervan zit in een savegame of snapshot.** Alleen de claims op
standplaatsen zijn gedeeld: `bezitcoop.createClaims` kent naast `p<12 hex>` ook `sp:<plek>` (`SPOT_RE`); wat een medespeler in deze sessie heeft is voor jou niet te koop of over te nemen, en
je ziet het op de kaartlaag Standplaatsen als "van <naam>" in zijn kleur. Conflict: de laagste (tijd, speler-id) wint, zoals bij percelen. Wegvallen: zijn claims verdwijnen (`drop`), zijn eigen
bezit blijft van hem. Aansluiten: `snapshotSpots` en `adoptSpots` (kommalijst). Meewerken: een gast achter het luik krijgt via `bezitcoop.snackShare` uurloon (14 per uur) of een kwart van de
dagwinst (aandeel) naar rato van zijn uren; de eigenaar houdt zijn winst en voortgang. Een vervallen vergunning geeft de claim vrij. Gast-meewerken in de UI is nog niet aangesloten (15.4).

### 15.4 Open gaten

* De 3D-wagens zijn het bestaande foodtruck-model in een eigen kleur met een nieuw bord; de verkoper staat naast het luik. De plekken komen uit lat/lon en kunnen net in een gevel of op een
  stoep vallen; in beeld controleren (zie `BEZIT-VERIFICATIE-21-11.md`).
* Opgelost in de tweede ronde: het menuverbruik van friet en kaas gaat van de voorraad van je eigen verwerker af (alleen als die van jou is en voorraad heeft; zonder voorraad geen korting);
  de prijzenoorlog drukt ook de streekprijs van friet en kaas bij de ketenleveringen (`snackvan.warPriceMult` als factor op `areamarket` eventMult); meewerken heeft een knop (`snackui`:
  Meewerken bij een medespeler) en `snacklive.meewerken` / `ontvangWerk` met de haak `setSnackWorkSend` (het netwerkbericht `{ type: 'snack-work', spot, hours }` koppelt de bouwer).
* Melk en vlees: melk telt via de bron van de kaasketen (geen stock om af te trekken), vlees heeft geen eigen keten (geen vleesvee): altijd 0.
* De winkeldichtheid (`densityFactor`) staat in de logica maar is niet aangesloten op `shopspots.js`; de ruis per dag en het uurvenster doen het werk.
* De balans is een sim, geen speeltest.

### 15.5 De strijd om standplaatsen (eigenaar-besluit): bureaucratie en omkoping tegen oprechte interesse

Jelle (Usmem Snacks) speelt met bureaucratie, omkoping, slimmigheid en sabotage; Tammo en Tessa winnen met oprechte interesse, behulpzaamheid en liefde. Alles satire (constitution 6): de enveloppe gaat
naar de verzonnen **Gemeentelijke Vergunningsdienst Noord** (nooit een echte instantie of persoon), er is nooit geweld.

* **Jelle's trucs** (`rival.js`): vergunningsgedoe (een extra formulier of een vergunning "ter beoordeling", deadline 5 dagen, in die tijd 70% verkoop), een enveloppe (een derde van de geschillen),
  prijsdrukken (de prijzenoorlog, ook op de ketenprijzen) en de bestaande sabotage (storing, pechdag, valse recensie, verkoper weggekocht). Hij heeft zelf een naam (`rival.rep`, start 60).
* **Jouw positieve hefbomen** (`goodwill.js`, in `bezit.x.snack.gw`, per speler):
  * *Klanttevredenheid* (0 tot 100 per wagen en dag uit voorraad, wachttijd, menu en prijs; lopend gemiddelde): vraag x0,9 tot x1,1.
  * *Vaste klanten per plek* (0 tot 100): groeien bij tevredenheid vanaf 60 tot een plafond van 40, dat 10 punten per hulpactie stijgt; tot +15% vraag en een afscherming tegen prijsdrukken
    (bij 100 verlies je 40% van wat je anders verloor in een prijzenoorlog).
  * *Hulp aan de buurt*: gratis portie voor het buurthuis (250), schoonmaakdag (150), buurtavond (600); goodwill erbij, rust per soort en plek; goodwill zakt 0,4 per dag.
  * *Bondgenoten*: de derde hulpactie in een gebied (stad, noord, west, oost, zuid) maakt dat gebied een bondgenoot (verzonnen verenigingen); een eenvoudige teller in `gw` (er is geen bestaande
    voortgang die hierop past).
* **Het geschil** (`rival.resolveDispute`): jouw sterkte = 35% goodwill + 25% vaste klanten op die plek + 8 per bondgenoot (max 4) + 20 als je ze om steun vraagt + 15% van je naam + vaste ruis;
  zijn sterkte = 45 + 15% van zijn stemming + 25 voor een geslaagde enveloppe. **Een omkoping kan mislukken** (30% plus je goodwill en bondgenoten, tot 90%): de dienst weigert, jij wint, Jelle verliest 15
  naam (goedkoper over te nemen: tot -20% op de vraagprijs, en minder kans op sabotage). Verliezen kost 300 leges en drie dagen halve verkoop; de plek blijft van jou. Nooit fataal.
* **Balans** (`scripts/goodwill_test.mjs`, 500 dagen met een Jelle die steeds boos is, drie plekken): zonder hefbomen 0 geschillen gewonnen en 6 verloren, netto 397.575; met hefbomen 6 gewonnen en
  0 verloren, 2 mislukte omkopingen, netto 423.765 na 19.350 aan hulp (+6,6%), Jelle's naam 0 tegen 72. Elk blok van 50 dagen blijft winstgevend en alle vergunningen en wagens blijven van jou.
* **UI** (`snackui.js`): het blok "Buurt en klanten" (tevredenheid, goodwill, geschillen, naam van Usmem, bondgenoten, vaste klanten per plek met hulpknoppen met bevestiging, Meewerken); het geschil
  staat als gebeurtenis bovenaan met de antwoorden Bondgenoten om steun vragen, In beroep gaan en De leges betalen.

### 15.6 Moeilijkheid

`bezitdifficulty.js` is een dunne adapter: zonder de moeilijkheidsmodule (#800, branch `moeilijkheid-21-11`, `difficulty.js`, nog niet in deze branch) is alles neutraal. `bezitprijs.difficultyFactor(kind)`
(`income`, `price`, `cost`) is begrensd op plus of min 25% en schaalt de aankoopprijzen (percelen, panden, vergunningen, wagens) en de inkomsten in de dagtik (alleen wat binnenkomt, kosten niet). De
bouwer koppelt later `difficulty.js` met `setBezitDifficultyProvider(kind => factor)` of `setBezitDifficultyMode('ontspannen' | 'standaard' | 'uitdagend')`; de lokale tabel is ontspannen 1,15 / 0,9,
uitdagend 0,85 / 1,1. Uitkomsten van `scripts/bezitdifficulty_test.mjs` (met `bezit_sim`): eerste perceel na 2,0 (ontspannen), 2,4 (standaard), 2,8 uur (uitdagend); schaal 1.000 percelen 3.300 per uur (3x
actief) in alle standen; beste eigen snackwagen 2,18x / 1,98x / 1,72x actief; groot imperium 4,40x / 4,05x / 3,58x. Kopen en verkopen blijft verlies bij elke stand.
