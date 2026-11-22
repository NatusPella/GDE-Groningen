# UI-fixes 22-11: kaarten en overlays (#1204 t/m #1231)

Uitvoering van de UI-kritiek-issues van dit gebied (rapport: `docs/UI-KRITIEK-22-11-kaarten.md` op de branch
`ui-kritiek-kaarten-22-11`). Branch: `ui-fix-kaarten-22-11`, gebouwd op `origin/main` met `verfijn-ov-reizen-22-11`
lokaal samengevoegd (de NaN-vaste reisregels staan daar). Geen Electron en geen beeldrun: bewijs is een pure test of een
meting op de bron en de CSS. Alles wat in beeld moet worden bekeken staat onderaan als "nog niet bekeken".

Eerlijk over het harnas: een deel van de kritiek kwam door nepdata in `scripts/ui_critic/catalogus.mjs` (knoppen met `id`
in plaats van `action`, een reisrij zonder icoon en met een kaal getal als kosten, een notitie met een andere tekst dan het
spel geeft). De module hoort dat te vangen, dus is die robuustheid hieronder het eigenlijke werk.

## Opgelost

| Issue | Oorzaak | Oplossing | Bewijs |
|---|---|---|---|
| #1214 Reisvraag NaN en dubbele info | Lengte ontbrak: `NaN km`; `gratis` en `€ 0` bij elke optie | `panelState` (reisview.js): geen afstandsregel zonder lengte, een getal (de duur) per optie, winst alleen bij Zelf gaan en alleen als die er is | `reisview_test` (27), `hud_test`, `kaartactie_test` |
| #1215 Reispopup icoon en `Trein12` | Een rij zonder icoonnaam gaf het vraagteken, een getal als kosten stond kaal | `reisHtml` (kaartactieui.js): icoon volgt de vervoerswijze, een getal is een bedrag, spaties tussen label en feiten | `kaartreispopup_test` (39) |
| #1210 Foutmelding | Details en een stroeve zin voor de speler | Korte zin ("Kopieer het foutrapport en stuur het ons."), Details alleen in dev of testrun, Kopieer is de hoofdactie, geen native uitklapdriehoek | `foutbronnen_test` (34), `ds3_schermen_test` |
| #1209 Heist-notitie | Arial cursief, kopje dat de tekst herhaalt | DS3-lettertype; `noteKick` laat het kopje weg als de tekst het al zegt | `heist_hud_test`, `hud_kleuren_test` (bestaande eis aan Arial cursief bewust vervangen) |
| #1220 Verbinding weg | Knoppen met alleen `id` verdwenen stil; donkere glaskaart | `overlayHtml` (coopoverlay.js): `id` geldt als terugval; de kaart is `ds-zeef ds-z-kaart` met DS3-knoppen en de toets in de knop | `coopui_test`, `controller_overlays_test` (46), `ds3_ratel_test` (stand daalt) |
| #1212, #1231 Kaartuitleg LMB | De leestekst (aria-label) zei `LMB` | `leesTekst` en `MUIS_NAMEN` (uitleg.js): "linkermuisknop", ook in de varianten | `uitleg_test` (533, nieuw: geen LMB/RMB/MMB in een leestekst) |
| #1211 Meldingen geel op crème | `icoon()` zet inline `stroke:none`; de CSS-rand (`stroke: ink`) won nooit | `hudcards.css`: inktrand van 1,5 px met `!important` en `non-scaling-stroke` op de 256-iconen | `hudcards_layout_test` (8) |
| #1204, #1205 Missiekaart label en titel | De glans (lichte baan, 45%) lag boven de tekst: dofte de donkere titel; het label klonk tegen de titel | `bigmoment.css`: tekst boven de glans (z-index), lucht onder het label | `bigmoment_test` (nieuwe CSS-eisen) |
| #1206, #1217 Dubbel label | "Opdracht geslaagd" (17 tekens) viel buiten de korte-titelregel | `momentVanBanner`: een titel die alleen de uitkomst zegt is het label al | `bigmoment_test`, `eindkaarten_opening_test` (419) |
| #1208, #1218 Opgepakt | "Boete" drie keer; klein bedrag; stempel over de rand | Chip "Staande gehouden", zin "De agent schrijft een bon uit.", label Boete een keer, bedrag groot, stempel `max-width` binnen de kaart | `bigmoment_test` |
| #1219 Gebiedskaart | Leeg stippelvierkant | Plekicoon in het zegel | `bigmoment_test` |
| #1226 Oude-saves-kaart | Geen gevolg, alleen Doorgaan met toets | Regel "Je oude spel blijft bewaard." (op de kaart en in Opgeslagen spellen); Nieuw spel heeft de toets N in de knop | `legacysave_test` (61) |
| #1227 Moeilijkheidskaart | "ESC standaard" onduidelijk | Hulpregel: "Enter bevestigen, Esc Standaard kiezen" (Esc kiest Standaard) | `difficultycard_test` (82) |
| #1229 Opgeslagen spellen | Paneel van 92% hoog met een kaart | Bij een of twee kaarten krimpt het paneel om zijn inhoud en staat het in het midden | `saveslotsui_test` (11) |
| #1230 Prestatietest | Engelse titel, groepen zonder kop, dubbele voetregel, "30 s" brak | Titel "Prestatietest", koppen Route en Lengte, voetregel weg, chips breken niet | `benchmarkmodel_test` |

Samen spelen: alles hier is lokaal per speler (kaarten, meldingen, het overnemen-scherm toont dezelfde knoppen aan wie de vraag
krijgt). Het Verbinding-weg-scherm en de overnamevraag gebruiken dezelfde `coopoverlay`; er is geen netwerkbericht bij gekomen.

## Niet gedaan, met reden

- #1207 (titel noemt de missie): de perfect-ronde heeft bewust de standaardtitel groot en de missienaam in de regel gezet
  (bestaande tests eisen dat). Een andere indeling is een ontwerpkeuze voor de coordinator.
- #1216 (reisdialogen een component): groot werk (twee paden, ander toetsmodel), vervolgissue.
- #1213 (harnas zonder eigen CSS): hoort bij `ui-kritiek-harnas-22-11`.
- #1221 (Bourtange als monument): ander gebied, branch `bourtange-monument-22-11`.
- #1222 t/m #1225 (Samen-flow): `samen-flow-ux-22-11`.
- #1228 (kaarten onderaan): bewust; `onlineconsent.css` zet de naam- en keuzekaarten onderaan zodat het logo van het laadscherm
  erboven blijft (eigenaarsbesluit). Niet gewijzigd; in de echte app bekijken of het ook voor de afsluitvraag en de oude-saves-kaart
  moet.
- "waypoint" in #1212 en #1231: het woord staat in de knoppen (Zet waypoint), de tests en de uitleg; een Nederlands woord is een
  terminologiebesluit voor alles tegelijk (voorstel: "markering").
- De rij "Benchmark" in het pauzemenu (andere agent) heet nog zo; het scherm erachter heet nu Prestatietest.

## Nog niet bekeken

Geen beeldrun gedaan: de inktrand van de meldingsiconen (#1211), de glans onder de titel (#1204, #1205), het grote bedrag en de
stempel op de bon (#1218), het plekicoon in het zegel (#1219), de DS3-kaart van Verbinding weg (#1220), het krimpende paneel
(#1229) en de koppen op de Prestatietest (#1230) moeten in het spel of met het harnas in beeld worden gecontroleerd.
