# Verfijnronde 22-11: Loopbaan, Prestaties, Veroverd en Foto's

Eigenaarsopdracht: geen nieuwe functies, maar verfijnen wat er is (QoL, QA, UX, leesbaarheid). Dit document legt per
onderdeel vast welke wrijving is gevonden, wat er is gedaan en waar het bewijs staat. Branch
`verfijn-loopbaan-prestaties-22-11`, alle bewijs in `scripts/verfijn_loopbaan_prestaties_test.mjs` (19 groepen, met fuzz en een
simulatie van 20.000 loopbaangebeurtenissen) tenzij anders vermeld.

Samen spelen (algemene regel voor deze ronde): prestaties, loopbaan, Veroverd-stand en galerij zijn per speler en lokaal
(#429); niets in deze ronde verandert wat een gast of host ziet of ontvangt. De fotomodus houdt tijd en weer vast zodra er
meer spelers zijn (bestaand gedrag, #452).

## Wrijving, oplossing en bewijs

| # | Onderdeel | Wrijving | Oplossing | Bewijs |
|---|-----------|----------|-----------|--------|
| 1 | Prestaties | 108+ prestaties en geen manier om er één te vinden | Zoekveld boven de lijst: alle woorden in titel, omschrijving of categorie; werkt in elk tabblad; Esc wist eerst de opdracht, sluit pas daarna het menu | `achZoek`, test "zoeken in Prestaties" |
| 2 | Prestaties | Zoeken mag geen geheime prestatie verklappen | Geheime prestaties zijn nooit vindbaar; de lege staat legt uit waarom | test "zoeken" en "overzicht, samenvatting en lijst" |
| 3 | Prestaties | Hero en rij toonden "100%" terwijl er nog één ontbrak (99,6 werd 100) | `eerlijkPct`: naar beneden afgerond, 100 alleen als alles klaar is; ook in categorie, rij, Loopbaan en Veroverd | test "eerlijkPct", "de kaart zegt alleen 100%" |
| 4 | Prestaties | Een kapotte stand (NaN, min) kon "NaN" of "-3" op het scherm zetten | `achFmt` valt terug op 0 | fuzz "achFmt" |
| 5 | Prestaties | Datums ouder dan een week zonder jaar ("12 nov."): na een jaar dubbelzinnig | Vanaf 300 dagen staat het jaartal erbij | test "achWhen" |
| 6 | Prestaties | Bijna binnen en Behaald sprongen bij gelijke stand (onstabiele volgorde) | Tweede sleutel: titel | test "gelijke stand" |
| 7 | Prestaties | Geheime rij las een schermlezer voor als "???" | Eigen naam "Geheime prestatie" | bedradingstest |
| 8 | Prestaties | Overzicht, samenvatting en categorietellers konden uiteenlopen zonder dat iets het merkte | Invariant-test: lijst, hero-totaal en categorieën tellen hetzelfde; Steam-lijst volgt `ACHIEVEMENTS` (bestaande `steam_test.mjs`) | test "overzicht, samenvatting en lijst" |
| 9 | Loopbaan | Kaart en balk zeiden 100% terwijl er nog 1 punt was (afronding) | Naar beneden afgerond; 100% alleen op het hoogste niveau | test "de kaart zegt alleen 100%" |
| 10 | Loopbaan | "Nog 1 punten tot niveau 2" | Enkelvoud in de stap en de eis | test "1 punt" |
| 11 | Loopbaan | "1 klussen", "1 oogsten", "1 activiteiten" in de teller | De teller gebruikt dezelfde enkelvoudslijst als de stap | test "tellerTekst" |
| 12 | Loopbaan | Met een volle lijst plekken (120) gaf dezelfde plek elke keer opnieuw punten | Punten alleen als de plek ook onthouden wordt | test "een nieuwe plek geeft één keer punten" |
| 13 | Loopbaan | Geen enkele test op rare opslag of lange speelduur | Fuzz op `normaliseer` en `voegSamen` (groeit alleen, idempotent, schrijven en terugles gelijk) en 20.000 willekeurige gebeurtenissen (niveau daalt nooit, loon nooit onder basis) | test "opslag fuzz", "simulatie" |
| 14 | Veroverd | "100% van Grunn" in de kop voordat alles veroverd was; "Stand 100%" bij een gebied met nog één taak | Zelfde `eerlijkPct` | test "eerlijkPct" |
| 15 | Veroverd | Na een koop in de Beleidswinkel deed een klik op het gekozen gebied niets (stale keuze) en sprong de scrolstand naar boven | De keuze wordt bij elke nieuwe tekening gewist, de scrolstand blijft | bedradingstest "Veroverd" |
| 16 | Veroverd | "Zet als doel" gaf alleen een melding bovenin | De knop zegt zelf "Doel staat op de kaart" | bedradingstest |
| 17 | Foto's | Een kapotte stand (NaN) in camera, tijd of galerij bleef hangen | `clampPhoto`, `stepFreeCam` en `hourLabel` vangen niet-getallen af | fuzz "clampPhoto en stepFreeCam" |
| 18 | Foto's | Galerij uit opslag werd niet gecontroleerd; een voorbeeld met aanhalingstekens kwam in een `src` | `schoonLijst` en een strenge voorbeeldcontrole (alleen echte base64-afbeelding), unieke ids, maximum | test "kapotte of vreemde opslag" |
| 19 | Foto's | Nummering keek alleen naar de bovenste foto: na weghalen van de nieuwste kreeg een nieuwe foto dezelfde bestandsnaam | `volgendNummer` kijkt naar alle nummers | test "weghalen is terug te draaien en een nieuwe foto..." |
| 20 | Foto's | Weghalen was definitief | "Ongedaan maken" zet de foto op zijn plek terug zolang het scherm open blijft | `haalWeg` en `zetTerug` |
| 21 | Foto's | "Nu even niet: wacht tot het rustig is" zei nooit waarom | De reden: geen speler, ga eerst staan, filmpje of scène, menu open | `startReden` |
| 22 | Foto's | Een mislukte bestandsopslag was stil terwijl de melding "Opgeslagen" had gezegd | Een eerlijke melding erachter | bedradingstest |
| 23 | Foto's | De sluiter gaf geen terugkoppeling | Korte witte flits na de foto; weg bij Beweging beperken en Rustig drukwerk | bedradingstest (niet in beeld bekeken) |
| 24 | Foto's | De tekst bij de galerij sprak van "wijs er een aan"; de knop staat op elke kaart | Tekst klopt en noemt terugdraaien; alt-tekst noemt ook het uur | bedradingstest |

## Bewust niet

- Een "Wat is er nieuw behaald"-melding bij het openen van Prestaties: er is al "nieuw" op de rij en een glans.
- Foto's delen of naar het klembord kopiëren: nieuwe functie en een netwerk- of toestemmingsvraag (constitution 4).
- Foto's in een eigen map kiezen of een hoge resolutie (4K) kiezen: nieuwe functie, hoort bij de fotomodus-epic.
- Sorteren van de galerij: bij maximaal 24 foto's geen winst.
- Een derde taalvariant van titels bij zoeken (de dubbele titels, `dualHtml`): de zoekopdracht kijkt naar de gewone tekst.
- Een "dichtstbijzijnde niveau"-regel bovenaan Loopbaan: het scherm heeft al een tekstdieet (DS3) en de volgende stap staat per vak.
- De zinnen "39 van de 47 bijbanen, 50 minigame-plekken" op het Veroverd-scherm blijven vaste tekst (een test borgt ze, #676); automatisch afleiden uit de bron is een eigen klus.

## Alleen in beeld of met een echte speler te bekijken (nog niet bekeken)

- Het zoekveld in Prestaties: stijl op 720p en 1080p, de focus en cursor tijdens het typen, Esc (sluit het menu soms eerst, afhankelijk van de volgorde van de toetsafhandeling) en of letters als Q en E in het veld de tabbladen niet wisselen.
- De flits van de fotomodus: sterkte en duur, en dat hij niet in het bestand terechtkomt (hij komt na het maken van de kopie).
- "Ongedaan maken" in Foto's: plaatsing van de strook onder de kop.
- De knop "Doel staat op de kaart" in Veroverd.
- Gevoel van de ronde percentages: een speler op 99% ziet nu langer 99%.
- Geen Electron-run in deze ronde (twee runs van andere agents liepen).
