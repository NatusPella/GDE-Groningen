# Schatting: traditioneel gebouwd of met AI

**Dit is een schatting, geen meting.** De harde cijfers (commits, regels, issues, wereld) staan in [SCHAAL.md](SCHAAL.md) en komen uit
`node scripts/stats/schaal.mjs`. Dit document zet daar een aanname-gedreven vergelijking naast. Wie het gebruikt (presentatie, video, gesprek)
noemt het een schatting en noemt de bandbreedte, nooit één getal.

## Wat wel en niet te vergelijken is

- **Het product:** een speelbare pre-release (versie 0.38.x) van een open-wereldspel op een provincie-kaart van ~2.955 km², met verhaal, stemmen,
  muziek, voertuigen, bijbanen, coöp en een geautomatiseerd testsysteem. Het is geen gepolijst, uitgebracht spel: zie de kanttekeningen onderaan.
- **"Traditioneel"** betekent hier: een professioneel team dat hetzelfde omvang- en kwaliteitsniveau (speelbare pre-release) met gangbare
  middelen bouwt, zonder AI-code of AI-generatie voor stemmen en muziek. Het team mag een bestaande engine, gekochte assets en vrije kaartdata
  gebruiken (dat doet dit project ook: OpenStreetMap, BAG/3D BAG, three.js).
- **"Met AI"** is hoe dit project is gemaakt: één opdrachtgever die richting geeft, tientallen parallelle AI-sessies, geautomatiseerde tests en
  beeldcontrole, en snelle feedbackrondes met een paar testers.

## Gemeten uitgangspunten (uit het cijferblad)

| Uitgangspunt | Waarde | Bron |
|---|---:|---|
| Regels programmacode in git | ~279.000 | `code.regels_code` |
| Waarvan spelcode (`game/js`) | ~196.000 | `code_per_soort` |
| Waarvan testcode | ~34.000 | `code_per_soort` |
| Commits | 3.572 in 34 kalenderdagen | `git.commits`, `git.kalenderdagen` |
| Verhaal | 31 missies, 185 scènes, 72 cutscenes, ~1.320 regels dialoog | `inhoud.*` |
| Geluid | ~3.050 stemopnames, 20 radiotracks | `inhoud.*` |
| Wereld | 2.901 tegels, ~387.000 gebouwen, ~12.300 km weg en pad | `wereld.*` |
| Testscripts | 409, plus 34 audits | `tests.*` |

## Methode A: regels code (COCOMO, basismodel)

Formule (Boehm, *organic*): inspanning = 2,4 × (KLOC)^1,05 persoonsmaanden. KLOC = 279 geeft ~887 persoonsmaanden, dus **~74 persoonsjaar**.
Met alleen de spelcode (196 KLOC) is het ~51 persoonsjaar. Als de helft van de regels op het conto van breedte, data-achtige tabellen en
uitgebreide commentaren van AI komt (aanname), dan ~36 persoonsjaar.

Let op: COCOMO is voor gewone bedrijfssoftware en overschat een game met veel datatabellen en gegenereerde wereld. Dit is het **hoge** scenario.

## Methode B: werkpakketten (van onder naar boven)

Alle getallen in persoonsmaanden (pm) voor een ervaren professional; de bandbreedte komt uit de aannames, niet uit een meting.

| Werkpakket | Laag | Hoog | Wat erin zit |
|---|---:|---:|---|
| Wereldbouw (OSM, BAG, hoogtekaart naar tegels, streaming, wegen, water, bruggen, spoor) | 36 | 90 | provinciekaart 2.955 km², 2.901 tegels |
| Rendering en prestaties | 30 | 72 | terrein, gebouwen, water, licht, verre weergave |
| Spelsystemen | 48 | 120 | 28 voertuigen, verkeer, politie, wildlife (13 soorten), 38 bijbanen, 17 activiteiten |
| Verhaal, missies en cutscenes | 24 | 60 | 31 missies, 185 scènes, 72 cutscenes, tooling |
| Geluid | 12 | 36 | 3.000+ stemopnames (met acteurs: aparte studio- en castingkosten), muziek |
| UI, kaart, navigatie, opslaan, prestaties | 18 | 42 | 187 prestaties, GPS, menu's, toegankelijkheid |
| Coöp, desktop, web, Android, release | 18 | 48 | Electron, netwerk, builds |
| Testen en QA | 24 | 72 | 409 testscripts, audits, spelbot |
| Projectleiding, ontwerp en documentatie | 12 | 36 | |
| **Totaal** | **222** | **576** | **~18,5 tot ~48 persoonsjaar** |

## Methode C: een kleine ervaren indieploeg (laag scenario)

Een team van 4 tot 6 mensen met een bestaande engine, gekochte assets en voor-gemaakte kaartdata, dat het spel kleiner houdt (minder aktes,
minder cutscenes, geen eigen stemopnames, geen gedetailleerde provincie): **~8 tot 12 persoonsjaar**. Dat is dan een kleiner product dan hier gemaakt.

## Samenvatting

| Scenario | Persoonsjaren | Doorlooptijd bij team van 6 tot 10 | Kosten bij 90 tot 130 k€ per persoonsjaar |
|---|---:|---|---|
| Laag (kleiner spel, bestaande engine en assets) | ~8 tot 12 | ~1 tot 2 jaar | ~0,7 tot 1,6 M€ |
| Midden (werkpakketten, onderkant van de bandbreedte tot midden) | ~18 tot 30 | ~2 tot 4 jaar | ~1,6 tot 3,9 M€ |
| Hoog (COCOMO op regels) | ~36 tot 74 | ~4 tot 8 jaar | ~3,2 tot 9,6 M€ |

**Eerlijke bandbreedte voor de presentatie: grofweg 10 tot 40 persoonsjaar, ongeveer 1,5 tot 4 jaar met een ploeg van 6 tot 10 mensen.**
Het middenscenario (~20 persoonsjaar) is het meest verdedigbaar; de uitersten zijn aannames die je kunt aanpassen.

### Aannames die je kunt aanpassen

- Productiviteit: 4.000 tot 10.000 opgeleverde regels per persoonsjaar voor een volledig, geteste speelbare pre-release (inclusief ontwerp, testen en herstel).
- Ploeggrootte 6 tot 10, zonder wachttijd op besluiten, zonder financiering of uitgever.
- Kosten per persoonsjaar (volledig belast): 90 tot 130 k€. Stemacteurs, studio en muziekrechten staan **niet** in het lage en middelste scenario; die komen erbij.
- Geen rekening gehouden met marketing, uitgeverskosten, licenties van derden of platformcertificering.

## Met AI: wat gemeten is en wat niet

| Onderdeel | Stand |
|---|---|
| Doorlooptijd | **gemeten:** 34 kalenderdagen van eerste commit (18 september) tot nu, 19 dagen met commits |
| Aantal sessies | **gemeten, ondergrens:** zie `sessies.branches_sessies` in het cijferblad (ruim 380 sessie-branches, tientallen tegelijk actief) |
| Uren van de opdrachtgever | **niet bijgehouden.** Een eerlijke vergelijking vraagt die uren; vul ze in voor je een factor noemt |
| Kosten van de AI-modellen | **niet gemeten** in de repo (zit in de gebruiksoverzichten van de leverancier) |
| Uren van de testers | **niet bijgehouden** |

### Wat dat zegt over versnelling (alleen de doorlooptijd, want dat is gemeten)

1,5 tot 4 jaar (ploeg van 6 tot 10) tegenover 34 dagen: **ongeveer 15 tot 45 keer korter in kalendertijd.** Dat is geen productiviteitsfactor per
persoon: het aantal mensen was veel kleiner (de opdrachtgever en een paar testers), en het ontbreken van hun uren maakt een factor per uur onmogelijk.
Het kosten- en urenplaatje met AI hoort in de presentatie als open vraag, niet als geschatte uitkomst.

## Kanttekeningen (waar de vergelijking mank gaat)

- Het product is een **pre-release**: niet uitgebracht, niet ondertekend, niet op alle apparaten getest. Een traditionele schatting voor een gepolijst, uitgebracht spel ligt hoger.
- Veel stukken hebben **geen menselijk oordeel** gehad: stemmen en muziek zijn met AI gemaakt en niet door een professioneel regisseur beoordeeld; beelden zijn deels automatisch gecontroleerd (zwart beeld, lege wereld, overlap) en zijn niet allemaal door een mens bekeken. Zie `docs/PLAYTESTPLAN.md` en de testrapporten.
- Een AI bouwt snel **veel regels**; regels zijn geen waarde. Een deel van het werk is opruimen, herschrijven en testen: over alle commits zijn ~346.000 regels code toegevoegd en ~67.000 weer verwijderd (zie `git.regels_toegevoegd` en `git.regels_verwijderd`): ongeveer 1 op de 5 toegevoegde regels is later weggehaald of herschreven.
- **Smaak, toon, gevoel van het rijden, de balans van de missies** en de keuze wat er niet in moet: dat blijft bij mensen.
- Er is **geen echte hardware** getest (Android-toestellen, controllers, Steam Deck) en geen langere speelsessies door vreemden buiten de testers.
- Een traditioneel team had een deel van deze keuzes eerder gemaakt (een ontwerpdocument vooraf); de AI-aanpak werkt met snelle iteraties en weggooien.
