# Showcase-video van 3 minuten: "Een provincie in 34 dagen"

Voor de montage door de trailer-sessie (r48), met de nieuwe trailerbeelden. Dit is het scenario en de tekst; de montage zelf staat hier niet.
De machineleesbare versie is [showcase-video.json](showcase-video.json), de cijfers voor op het scherm staan in [schaal-cijfers.json](schaal-cijfers.json)
(gemaakt door `node scripts/stats/schaal.mjs --overlays=docs/showcase/schaal-cijfers.json`).
De schatting "traditioneel versus met AI" staat in [SCHATTING.md](SCHATTING.md); op het scherm alleen met de bandbreedte en het woord "schatting".

**Niets is opgenomen, gemonteerd of gepubliceerd.** De eigenaar beslist over verspreiding (constitution 8).

## Uitgangspunten

- **Doel:** een publiek van marketeers en digitale communicatiemensen (geen gamers) in drie minuten laten zien wat een klein team met AI heeft gebouwd, en hoe.
- **Lengte:** 180 s, 1920×1080, 60 fps, in dezelfde opnamestijl als de bestaande trailers (`docs/youtube/trailers.md`).
- **Stem en geluid:** geen voice-over en geen TTS. Verhaal en cijfers staan in tekstkaarten en overlays. Muziek: alleen de bestaande speltracks (`docs/MUZIEK.md`, controleer de niet-commerciële licentie vóór gebruik buiten het project). Spelstemmen alleen uit bestaande [BEHOUDEN]-regels, en alleen als het beeld erom vraagt.
- **Taal:** alleen Nederlands. Geen echte merken, bedrijven of personen in beeld of tekst, ook niet de namen van de AI-modellen of van de diensten die we gebruiken: zeg "een projectbord", "AI-sessies", "geautomatiseerde tests".
- **Eerlijk:** elk cijfer komt uit het cijferblad (bron in de JSON). Wat een schatting is, krijgt het woord "schatting" in beeld. Wat niet gemeten is (uren van de opdrachtgever, kosten van de AI), wordt niet genoemd als cijfer.
- **Stijl:** `DESIGN_SYSTEM.md`: donkergroene verloop-achtergrond (`#0c140e` naar `#17301f`), groen accent (`#1e9e56`, `#3fc97a`), de enige rode (`#d93f3f`) voor het woord "schatting". Cijfers groot, in Bebas Neue (of de terugvaller Arial Narrow).

## Cijfer-overlay (voor alle scènes)

Een overlay is een kaart linksonder: het cijfer groot (groen, `tekst` uit de JSON), eronder het label (wit, `label`), een halve seconde laten opkomen, 2,5 s houden, 0,4 s weg.
Meerdere cijfers in één scène kunnen onder elkaar opkomen met 0,6 s tussentijd. De waarde komt altijd uit `schaal-cijfers.json`, niet uit dit document: dan klopt de video na een nieuwe meting.

## Storyboard

| # | Tijd | Beeld | Tekstkaart (Nederlands) | Cijfer-overlay (id uit de JSON) | Opname |
|---|---|---|---|---|---|
| 1 | 0:00 tot 0:10 | Zonsopgang boven d'Olle Grieze, fietsers, een meeuw; langzaam uitzoomen tot de provinciekaart | **Een spel van een hele provincie.** daarna **In 34 dagen.** | | bestaand: opening van de teaser (0 tot 4 s) en de luchtopname van de trailer |
| 2 | 0:10 tot 0:25 | De Vismarkt met terrassen en de Martinitoren | **De opdracht:** “Maak een grappig open-wereldspel in het echte Groningen.” | | bestaand: beeld uit de hoofdtrailer (Vismarkt) |
| 3 | 0:25 tot 0:55 | Snelle tour: de binnenstad, de ringweg, de dijk, de Eemshaven, een dorp bij avondlicht, een trein langs de dijk; tussendoor de overzichtskaart van het spel | **Een hele provincie. Op ware grootte.** | `wereld.oppervlak_km2`, `wereld.gebouwen`, `wereld.wegen_km`, `wereld.stations` | bestaand: provinciebeelden uit de hoofdtrailer (34 tot 46 s); kaart uit `game/world/provmap` |
| 4 | 0:55 tot 1:20 | Wat je doet: sluipen, boot, helikopter, kermis, achtervolging, de duif, een bijbaan; één korte cutscene met Tessa en Tammo | **Missies, voertuigen, bijbanen, stemmen.** | `inhoud.verhaalmissies`, `inhoud.voertuigmodellen`, `inhoud.bijbanen`, `inhoud.stemopnames` | bestaand: hoofdtrailer 46 tot 64 s en de cutscene-beelden van de trailer-sessie |
| 5 | 1:20 tot 1:50 | Een bewegende grafiek van commits per dag (uit `tijdlijnen.commitsPerDag`) die opbouwt tot de piek van 18 oktober; daaronder wordt de rij sessie-branches langer | **Eén opdrachtgever. Tientallen AI-sessies tegelijk.** daarna **Elke sessie een eigen werkmap.** | `git.commits`, `sessies.branches_sessies`, `issues.totaal`, `releases.aantal` | nieuw: motion graphic (geen opname van een bord of van namen) |
| 6 | 1:50 tot 2:15 | De spelbot speelt een missie; een testrapport met groene regels en één rode; een beeldcontrole die een zwart beeld afkeurt | **Een test weet niet wat leuk is.** daarna **Maar hij kijkt wel mee.** | `tests.testscripts`, `tests.rapport_pass` | nieuw: opname van de spelbot (`scripts/bot/run.mjs`) en een nagebouwd rapportbeeld; geen echt rapport met paden of namen tonen |
| 7 | 2:15 tot 2:35 | Rustig beeld: Tessa en Tammo bij de lege standplaats | **Het is een pre-release. Het is niet af.** daarna **Smaak, toon en risico blijven mensenwerk.** | `issues.open` | bestaand: slotbeeld van de trailer |
| 8 | 2:35 tot 2:50 | Twee balken: een lange (“Traditioneel: 10 tot 40 persoonsjaar”) en een korte (“Met AI: 34 dagen”) | **Schatting, geen meting.** | `git.kalenderdagen` | nieuw: motion graphic; de balk "traditioneel" is gemerkt met het woord schatting in rood |
| 9 | 2:50 tot 3:00 | De rode Escapade remt scheef op de lege standplaats; zwart; titel | **GDE Groningen: Zomer vol misdaad** met eronder *Heel Groningen. Voor één eierbal.* daarna klein: **Gemaakt met AI. Gestuurd door mensen.** | | bestaand: slot van de hoofdtrailer; geen link of datum |

De kolom Opname noemt de tijden uit `docs/verhaal/nieuw/TRAILER-SCRIPT.md`; de definitieve opnames komen van de trailer-sessie (r48).

Totaal 180 s. Schuif niets uit scène 5 en 6 weg om tijd te winnen: die twee laten het proces zien en zijn de reden van de video.

## Teksten (alle tekstkaarten op een rij, Nederlands)

1. Een spel van een hele provincie.
2. In 34 dagen.
3. De opdracht: “Maak een grappig open-wereldspel in het echte Groningen.”
4. Een hele provincie. Op ware grootte.
5. Missies, voertuigen, bijbanen, stemmen.
6. Eén opdrachtgever. Tientallen AI-sessies tegelijk.
7. Elke sessie een eigen werkmap.
8. Een test weet niet wat leuk is.
9. Maar hij kijkt wel mee.
10. Het is een pre-release. Het is niet af.
11. Smaak, toon en risico blijven mensenwerk.
12. Schatting, geen meting.
13. GDE Groningen: Zomer vol misdaad
14. Heel Groningen. Voor één eierbal.
15. Gemaakt met AI. Gestuurd door mensen.

Let op bij tekst 9 en 15: "elke nacht" en "gecontroleerd door mensen" zijn bewust niet gebruikt. Of de nachtelijke testronde echt elke nacht draait is niet gemeten, en menselijke controle geldt voor richting, keuzes en speeltests, niet voor alle beelden en geluiden (zie de kanttekeningen in SCHATTING.md).

## Open punten (voor r48 en de eigenaar)

- **[NIET GEMETEN]** of de nachtelijke testronde elke nacht draait: de repo heeft rapporten van losse rondes, geen schema. Daarom staat er "Maar hij kijkt wel mee."
- **[CHECK r48]** welke beelden uit de bestaande trailer-opnames beschikbaar zijn (teaser en hoofdcut), en of de overzichtskaart als beeld (PNG uit `game/world/provmap`, 512 px) scherp genoeg is op 1080p; zo niet, render de kaart opnieuw met een hogere resolutie.
- **[CHECK r48]** de spelbotbeelden: opnemen met één Electron en het slotprotocol (`gde-locks`), wegwerpprofiel; laat geen paden, gebruikersnamen of sleutels in beeld komen.
- **[EIGENAAR]** of de video buiten het project wordt getoond; en of het woord "AI" in de slotkaart past bij de afspraken over het spel.
- De cijfers in de video komen van `schaal-cijfers.json` (peildatum en commit staan erin). Draai het script opnieuw vlak voor de definitieve montage.

## Overlay-cijfers op dit moment

Zie [schaal-cijfers.json](schaal-cijfers.json); de lijst `cijfers` heeft per rij `id`, `waarde`, `tekst`, `label`, `bron` en een eventueel voorbehoud (`let_op`).
