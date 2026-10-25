# Merkenregister: namen in en rond GDE Groningen (#62)

Stand: 18 oktober 2026. Dit register hoort bij de constitution in
[AGENTS.md](../AGENTS.md) (punt 2: geen echte merken, bedrijven of personen in
speltekst of beeld). Het is een werkdocument en **geen juridisch advies**. De
check of de eigen naam vrij is in de merkenregisters (EUIPO, TMview, BOIP) staat
apart, en staat nog open: zie [MERKENCHECK.md](MERKENCHECK.md).

## 1. De naam van het spel

| Naam | Wat | Status |
|---|---|---|
| **GDE Groningen – Zomer vol misdaad** | volledige titel (venster, menu, store, credits) | alle rechten voorbehouden ([LICENSE-CONTENT.md](../LICENSE-CONTENT.md#naam-en-logo)); forks gebruiken een eigen naam |
| **GDE** | de reeksnaam; staat voor *Grootste Diefstal Ever* | idem; registercheck open (MERKENCHECK.md) |
| *Grootste Diefstal Ever* | uitgeschreven betekenis van GDE | beschrijvende zin, weinig onderscheidend |
| *Grand Theft Eierbal* | **vroegere werktitel**, een parodie op een bestaande gamereeks | hernoemd; moet niet meer zichtbaar zijn. `GTA` en `Grand Theft Auto` komen alleen voor in de disclaimer (zie 4) |

De disclaimer (NOTICE.md, README, `game/js/credits.js`) zegt dat GDE een
gratis fanparodie is en niet gelieerd aan of goedgekeurd door een uitgever.

## 2. Verzonnen namen in het spel (selectie)

Alles hieronder is verzonnen. Ze staan niet allemaal in het spel op dezelfde
plek, maar mogen nergens samenvallen met een bestaand merk; het ontbreken van
een treffer in een merkenregister is niet nagegaan (MERKENCHECK.md).

| Groep | Namen |
|---|---|
| Hoofdpersonen en bijrollen | Tammo, Tessa, Jelle Terpstra, Mem Terpstra, Durk & Douwe, Berend Bos, Rikus, Oma Trijntje, Kapitein Klaas, Dokter Dijkstra, Rotor Roelf, Schipper Wiebe, Duivenmelker Bert, Aaltje & Grietje (koeien); volledige lijst: [personages.md](personages.md) |
| Bedrijven | **Delfstof Noord** (verzonnen delfstofbedrijf; gevoelig onderwerp, zie constitution 6), **Wiebelwerk** (het Wiebelwerk-universum), **Fjord Frituur** (Tessa's frietwagen), **Harm Occasions**, **Poen Express** (waardetransport), **Pakkie Nou** (pakketdienst), **Noord-Nieuws** (verslaggeversbus), **Us Mem Vet** |
| Media | **Kiekdoar** (nieuwssite), **Radio Proat** (radio), **G-Music** (muziekzender), **Pompeblêd** (blad) |
| Automerken en modellen | verzonnen merken naar Groninger streekwoorden: Dollard, Eemsmond, Hunze, Wadden, Reitdiep, Oldambt, Eemshaven, Ommelander, Wierde, Terpstra, Tweetakt; held-auto *Fjord Escapade* (zie `game/js/vehiclenames.js`) |
| Winkels en horeca | echte ketens uit OpenStreetMap worden herkend (`CHAINS` in `game/js/shopbind.js`, ruim gekozen) en krijgen een verzonnen naam; echte caféeigenaars krijgen een verzonnen café (`CAFE_NAMES` in `game/js/horeca.js`, zie [LICENTIES.md](LICENTIES.md)) |
| Grappen met een knipoog | *Albert Hijgt* (woordspeling, geen merk), *Henk van Garage*, *Femke van Noorderzon*, *Sjoerd van de KEI-commissie* (staan op de allowlist van de audit, met reden) |

## 3. Echte merken die bewust niet voorkomen

De audit (`scripts/text_audit.mjs`, zie 5) zoekt woordgrenzen-vast naar deze
categorieën en laat het op `exit 1` vallen bij een treffer buiten de allowlist:

- **auto**: Volkswagen, Mercedes, BMW, Audi, Toyota, Tesla, Ford, Fiat, Honda, Porsche, Ferrari, Volvo en andere;
- **tech en media**: Google, Apple, Microsoft, Facebook, Instagram, Netflix, Spotify, YouTube, WhatsApp, TikTok, Amazon, Bol.com, Marktplaats, Thuisbezorgd, PlayStation, Xbox, Nintendo, Steam en andere;
- **eten, winkels, kleding**: Coca-Cola, Heineken, Grolsch, McDonald's, Burger King, KFC, Starbucks, Albert Heijn, Jumbo, Lidl, Aldi, Ikea, Hema, Kruidvat, Nike, Adidas en andere;
- **banken en betalen**: Rabobank, ABN AMRO, ING, PayPal, iDEAL, Tikkie, Visa, Mastercard en andere;
- **vervoer, energie, bedrijven**: NS, ProRail, Arriva, PostNL, DHL, Shell, Gasunie, Eneco, Philips, KLM, Rijkswaterstaat en andere;
- **spelreeksen en media**: GTA, Grand Theft Auto, Minecraft, Pokémon, Disney, Star Wars, Lego, regionale en landelijke kranten en omroepen;
- **personen**: bekende politici, sporters, artiesten en leden van het koningshuis (lijst `PEOPLE` in het script), plus eerste-naam-met-achternaam-patronen die op een echt persoon kunnen wijzen.

De lijsten zijn een vangnet, geen uitputtende opsomming van wat er bestaat.

## 4. Echte namen die er wel in staan (bewust)

- **Plaatsen en gebouwen** mogen: straten, bruggen, de Martinitoren, de
  Diepenring, dorpen, stations, de UMCG-gebouwen en andere herkenbare plekken
  uit OpenStreetMap. Voorbeeld op de allowlist: *Gerrit Krolbrug* (een brug,
  geen persoon).
- **Winkelnamen uit OSM** staan alleen in de bronbestanden in `data/`
  (ODbL). In het spel zelf worden ketens vervangen (zie 2).
- **Credits en licenties** noemen derden feitelijk: OpenStreetMap, 3DBAG
  (TU Delft/3DGI), three.js, Bebas Neue, Big Shoulders Display, Electron,
  Google Gemini, OpenRouter en Claude Design. Dat is bronvermelding, geen
  speltekst.
- **De disclaimer** noemt GTA, Rockstar Games en Take-Two Interactive om te
  zeggen dat er *geen* verband is. Dit staat op de allowlist.
- **Platformnamen** (Windows, Mac) staan in de eindkaart van de trailer en in de
  README om te zeggen waar het spel draait.
- Het festival **Noorderzon** (bij het personage Femke) is een echt evenement
  in Groningen; het personage is verzonnen. Dit is een aandachtspunt voor de
  eigenaar: laat het zo, of vervang door een verzonnen festivalnaam.

## 5. Audit

```bash
node scripts/text_audit.mjs          # bevindingen buiten de allowlist (exit 1 bij een treffer)
node scripts/text_audit.mjs --all    # ook de toegestane, met reden
node scripts/text_audit_test.mjs
node scripts/merkenregister_check.mjs   # sectie 6 klopt met de code (namen, winkelketens, automerken)
```

De audit leest alle stringliteralen in `game/js` (commentaar en console-meldingen
niet), tekst en attributen in `game/index.html`, alle strings in
`game/storydata/script.json` en het `[Unreleased]`-deel van het CHANGELOG, en
controleert op echte merken, echte personen, Engels, winter en "de Grunn".

Stand 20 oktober 2026 (ronde 2, #150): de lijsten zijn uitgebreid met ruim 200 extra merken
(telecom, winkels, kleding, drank, merken van elektronica, jeugdreeksen en tv-programma's),
sporters, politici, artiesten en festivals, extra winterwoorden (dooi, gladheid, gevroren, sleeën),
meer Engelse leenwoorden (respawn, achievements, tutorial, quest) en een nieuwe regel voor
**persoonsgegevens en webadressen** (e-mail, telefoonnummer, IBAN, `http(s)://`, `www.`), ook
in teksten die geen proza zijn. **0 bevindingen**, 105 toegestane gevallen met reden.

Oudere stand 18 oktober 2026: 0 bevindingen, 57 toegestane gevallen, elk met een
reden in `scripts/text_audit_allow.json`. Dertien eerdere bevindingen waren
detectielijsten (de lijst met merken die het script zelf zoekt, `CHAINS` en
`BRANDS` in de code), de platformnaam in de trailerkaart en een kermiskraam
"Oliebol"; ze staan nu op de allowlist met reden.

**Wat de audit niet dekt:** ingesproken audio (de tekst erachter staat wel in de
scripts, de opname zelf is niet gecontroleerd op wat er gezegd wordt), beeld
(logo's op texturen worden in de code gemaakt en zijn niet geaudit), namen in
`data/` en in de OSM-kaarttegels (echte plaatsnamen, bedoeld), en de
registercheck van de eigen naam (MERKENCHECK.md).

## 6. Register met bron en beoordeling

Een rij per verzonnen of op een echte naam lijkende naam die de speler kan zien.
Kolom *Bron* is het bestand waar de naam in staat; `node scripts/merkenregister_check.mjs`
controleert dat elke naam daar nog staat en dat elke winkelketen en elk automerk uit de
code in dit register voorkomt. Kolom *Lijkt op* noemt een echt merk alleen als klank of
woordspeling dat doet. Beoordeling: **ok** (geen gelijkenis), **let op** (klankgelijkenis
met een echt merk; bewuste parodie, op de allowlist, de eigenaar kan kiezen te hernoemen),
**besluit** (echt evenement of echte plek in de speltekst; eigenaarsbesluit, zie 4).

| Naam | Soort | Bron | Lijkt op | Beoordeling |
|---|---|---|---|---|
| Pang & Zo | winkelketen, wapens | `game/js/shopdata.js` | niets | ok |
| Pand & Poen | winkelketen, pandjeshuis | `game/js/shopdata.js` | niets | ok |
| Stoer & Stads | winkelketen, kleding | `game/js/shopdata.js` | niets | ok |
| Knip & Kuif | winkelketen, kapper | `game/js/shopdata.js` | niets | ok |
| Rook & Geluk | winkelketen, tabak en loterij | `game/js/shopdata.js` | niets | ok |
| Nait Duur | winkelketen, avondwinkel | `game/js/shopdata.js` | niets | ok |
| Frituur Vet & Lekker | winkelketen, snackbar | `game/js/shopdata.js` | niets | ok |
| Trap & Toeter | winkelketen, fietsen | `game/js/shopdata.js` | niets | ok |
| Spaak & Band | winkelketen, fietsenmaker | `game/js/shopdata.js` | niets | ok |
| Ome Harm Occasions | autodealer | `game/js/shopdata.js` | niets | ok |
| Knal & Kolder Tuning | tuningwinkel | `game/js/shopdata.js` | niets | ok |
| Bootje Huren | botenverhuur | `game/js/shopdata.js` | niets | ok |
| Spuit & Klaar | spuiterij | `game/js/shopdata.js` | niets | ok |
| EIKEA | woonwarenhuis ("Zweeds? Nee, Gronings") | `game/js/shopdata.js` | IKEA (één letter erbij, bewuste woordgrap) | let op |
| Rotor Roelf | helikopterdealer | `game/js/shops.js` | niets | ok |
| Poen Express | waardetransport (kluiswagen) | `game/js/cashvan.js` | niets | ok |
| Pakkie Nou | pakketdienst | `game/js/vehiclenames.js` | pakketbezorgers in het algemeen | ok |
| Noord-Nieuws | verslaggeversbus | `game/js/vehiclenames.js` | niets | ok |
| Fjord Frituur | frietwagen van Tessa | `game/js/characters.js` | niets | ok |
| Escapade | held-auto "Fjord Escapade" (Tammo) | `game/js/vehiclenames.js` | klank van "Fjord"/"Escapade" lijkt op een bekend automerk en model | let op |
| Dollard | automerk | `game/js/vehiclenames.js` | de Dollard (baai); geen merk | ok |
| Eemsmond | automerk | `game/js/vehiclenames.js` | gebied; geen merk | ok |
| Hunze | automerk | `game/js/vehiclenames.js` | rivier; geen merk | ok |
| Wadden | automerk | `game/js/vehiclenames.js` | gebied; geen merk | ok |
| Reitdiep | automerk | `game/js/vehiclenames.js` | rivier; geen merk | ok |
| Oldambt | automerk | `game/js/vehiclenames.js` | gebied; geen merk | ok |
| Eemshaven | automerk | `game/js/vehiclenames.js` | haven; geen merk | ok |
| Tweetakt | brommermerk | `game/js/vehiclenames.js` | beschrijvend woord | ok |
| Albert Hijgt | supermarktbord in Paddepoel | `game/js/paddepoel3d.js` | sterke klankgelijkenis met de grootste supermarktketen van het land | let op |
| Stadsloterij | lot bij Rook & Geluk | `game/js/shops.js` | de landelijke loterij (klank) | let op |
| Grunneger Gokje | kraskaart | `game/js/shops.js` | niets | ok |
| Duivenkraslot | kraskaart | `game/js/shops.js` | niets | ok |
| Zomerzoet | ijssalon | `game/js/vrachtmarkt.js` | niets | ok |
| Delfstof Noord | verzonnen delfstofbedrijf | `game/js/stadmissies.js` | geen echt bedrijf; gevoelig onderwerp, zie constitution 6 | ok |
| Wiebelwerk | het Wiebelwerk-universum | `game/js/interieurplan.js` | niets | ok |
| Us Mem Vet | bedrijf/winkel | `game/js/missions.js` | niets | ok |
| Kiekdoar | nieuwssite | `game/js/attention.js` | niets | ok |
| Radio Proat | radio | `game/js/radio.js` | niets | ok |
| G-Music | muziekzender | `game/js/radio.js` | generieke naam; registercheck in MERKENCHECK.md | ok |
| Pompeblêd | blad | `game/js/missionstory.js` | Fries woord voor waterleliebladeren | ok |
| Lichtje Tjoek | lamp bij EIKEA | `game/js/furniture.js` | niets | ok |
| Noorderzon | festival en jas (Femke, kalender, uitrusting) | `game/js/calendar.js` | het echte festival in Groningen | besluit |
| Kiezelweek | verzonnen introductieweek in de kalender (verving de echte KEI-week, #489) | `game/js/calendar.js` | de echte introductieweek | ok |
| Gerrit Krolbrug | brug | `game/js/flavour.js` | echte brug (plaats), vernoemd naar een persoon; staat op de allowlist | besluit |
| Qbuzz | alleen in een codecommentaar bij de stadsbuskleur, nooit in beeld | `game/js/vehicle.js` | echte busmaatschappij | ok (commentaar) |

Vaste namen van huisstijl en personages staan in [personages.md](personages.md). Cafénamen
(`CAFE_NAMES` in `game/js/horeca.js`) en horecanamen (`HORECA_NAMES` in `game/js/shopbind.js`)
zijn losse woorden en zinnetjes ("De Lallende Koe", "de Dorstige Wierde") zonder merk;
de tekstaudit toetst ze mee.
