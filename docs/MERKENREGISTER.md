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
```

De audit leest alle stringliteralen in `game/js` (commentaar en console-meldingen
niet), tekst en attributen in `game/index.html`, alle strings in
`game/storydata/script.json` en het `[Unreleased]`-deel van het CHANGELOG, en
controleert op echte merken, echte personen, Engels, winter en "de Grunn".

Stand 18 oktober 2026: **0 bevindingen**, 57 toegestane gevallen, elk met een
reden in `scripts/text_audit_allow.json`. Dertien eerdere bevindingen waren
detectielijsten (de lijst met merken die het script zelf zoekt, `CHAINS` en
`BRANDS` in de code), de platformnaam in de trailerkaart en een kermiskraam
"Oliebol"; ze staan nu op de allowlist met reden.

**Wat de audit niet dekt:** ingesproken audio (de tekst erachter staat wel in de
scripts, de opname zelf is niet gecontroleerd op wat er gezegd wordt), beeld
(logo's op texturen worden in de code gemaakt en zijn niet geaudit), namen in
`data/` en in de OSM-kaarttegels (echte plaatsnamen, bedoeld), en de
registercheck van de eigen naam (MERKENCHECK.md).
