# Beelden voor feedback: menu's en schermen na 0.64.0 (21-11)

Gemaakt met `scripts/qa/menufoto.mjs` (page-script `menufoto.page.js`, boot-pre-script `menufoto.boot.js`) op de merge van
`integratie-21-11-b`, de kaartlagen-branch (Zo werkt de kaart, markerkleuren) en het escape-menu zonder tellers.
Echte Electron, wegwerpprofiel, wereld uit een eerdere build (GDE_PREBUILT_WORLD), vaste klok 13:00 en helder weer.
Niets is door een mens gespeeld; alleen deze beelden zijn bekeken. Bestandsnaam: `<nummer>-<scherm>-<breedte>.png` (1920 = 1920x1080, 1280 = 1280x720).

Wereldkleur-vergelijking (punt 9): zie `docs/beeld-21-11/wereldkleur/overzicht.png` (staat in de hoofdmap van de repo, niet in deze worktree opnieuw gemaakt).

## Wat NIET gelukt is (eerlijk)

- **Samen spelen met sessie (lobby/wachtkamer host, spelerslijst, gast, Spelers-hint rechtsonder)**: de nagebootste sessie uit
  `scripts/ui/spelers_scenes.js` geeft in deze build "Er ging iets mis: Cannot convert undefined or null to object" en toont dan
  alleen Spel > Overzicht. Die beelden zijn verwijderd. Alleen `30` (keuzescherm zonder sessie) is goed. De mock moet bijgewerkt worden
  (of een echte twee-instanties-test) voor die schermen.
- **Laadscherm tijdens laden (stappen 1 tot 4 van het opslag/reis-laadscherm)**: de kopie van het scherm kwam niet in beeld (de beelden
  toonden de gewone wereld); verwijderd. Wel is het opstartscherm vastgelegd (`90`, `91`); in deze testrun is het plan 3 stappen
  ("Stap 3 van 3"), de acht stappen van een echte start (kaart, wereld, systemen, buurt, shaders, geluid, beeld) zijn niet gezien.
- **Benchmark lopend (`41`)**: alleen een zwart beeld met "Benchmark stoppen" en ondertitel; de render is in dit pad zwart.
  `42` en `43` (resultaat) staan over een duif-HUD omdat de run daarvoor de duivenmissie deed: kies liever opnieuw zonder duif.
- **Treinrit 14 s (`68`)** is bijna leeg (zwart, 24 kB).
- `18` (Veroverd 1280), controller-sweep, `33`, `36`, `37`, `70..75` zijn niet opgeslagen.
- Tweemaal 1280x720 is alleen voor Loopbanen, Spullen, Boerderij en het hele kaartblok gedaan.

## Beelden

| Nr | Bestand | Wat te zien | Verandering t.o.v. 0.64.0 | Eigen opmerking |
|---|---|---|---|---|
| 01 | 01-escape-overzicht-1920 | Spel > Overzicht met rail in groepen Spel, Doen, Bezit, Voortgang, Systeem | rail zonder aantallen (alleen "2" bij Verhaal en een stip) | Bij Verhaal staat nog het getal 2, terwijl de opdracht "zonder tellers" was; "Spel" heeft rechts een lege kopregel ("Spel / Doorgaan, samen...") |
| 02..03 | 02-escape-verhaal, 03-escape-activiteiten | Verhaal en Activiteiten | nieuwe rail | niet nader beoordeeld |
| 04 | 04-escape-loopbanen (1920 en 1280) | Loopbanen | nieuwe kopteksten/rail | op 1280 beoordelen op afkap |
| 06 | 06-escape-spullen (1920 en 1280) | Spullen | nieuwe rail | op 1280 beoordelen op afkap |
| 07, 09..11 | 07-garage, 09-veroverd, 10-prestaties, 11-fotos | tabbladen | nieuwe rail | niet nader beoordeeld |
| 08 | 08-escape-boerderij (1920 en 1280) | Boerderij | farmkaarten | op 1280 beoordelen op afkap |
| 12 | 12-escape-instellingen-beeld | Instellingen > Beeld | tabs Beeld, Geluid, Spelregels, Besturing, Camera, Interface, Hints, Toegankelijkheid | |
| 13 | 13-escape-instellingen-camera-terugkeerscene | Instellingen > Camera met optie Terugkeerscène | nieuwe optie | |
| 14 | 14-escape-cheats | Cheats | | |
| 15..17 | 15-besturing-toetsen, 16-toetsenoverzicht, 17-controller | Besturing met toetsplaatjes | toetsplaatjes i.p.v. ruwe letters | beoordeel zelf of er nog ruwe toetsnamen staan |
| 20..22 | 20/21/22-kaart-zoom-1/3/6 (1920 en 1280) | grote kaart in drie zoomstanden, in het centrum | nieuwe kleuren (glasgroen land, crème wegen), vijf markerkleuren | bij zoom 3 (21) en 6 zijn veel groene eten-markers (vork en mes) dominant en dicht op elkaar; bij zoom 1 ligt het Lagen-paneel (open) over de kaart |
| 23 | 23-kaart-lagenpaneel | Paneel "Op de kaart", Altijd/Te doen/Diensten/Onderweg | | paneel staat open in alle kaartbeelden en bedekt de rechterkant; Klussen staat uit |
| 24, 25 | 24-kaart-zo-werkt-de-kaart-open, 25-...-gesloten | uitleg met knop Begrepen, daarna gesloten | altijd te sluiten | uitleg is gezien en sluit (Begrepen); de uitleg ligt over de kaart in het midden |
| 26 | 26-minikaart-hud | HUD met minikaart, duivenmissie-hint | | de "Fluit een duif"-kaart en kiekdoar-melding hangen er tegelijk |
| 30 | 30-samen-keuze-zonder-sessie | Spel > Samen spelen: Waar speel je (Meedoen, Zelf een sessie openen, Besloten spelen) | 3-stappenhub | het kader wordt onderaan afgekapt (Besloten spelen half zichtbaar; scrollen nodig) |
| 40 | 40-benchmark-start-in-instellingen-beeld | Instellingen > Beeld met "Benchmark draaien" | | een ondertitel ("Tessa: ...") ligt over de knop Kopieer technische info; duif-stoptekst-banner staat ook over het scherm (artefact van de duivenrun) |
| 41 | 41-benchmark-lopend | zwart, "Benchmark stoppen" met ESC-plaatje | | beeld is zwart (mislukt, niet representatief) |
| 42, 43 | 42/43-benchmark-resultaat | resultaatkaart: fps, categorieen, advies Midden, knoppen Toepassen, Nog een keer, Instellingen, Technische info kopiëren, Terug | synthetische frametijden (niet gemeten), iconen bij de toetsen | **knop "Technische info kopiëren" en "Terug" worden overlapt door een ondertitel**; onderkant is niet gescrold (zelfde beeld) |
| 50 | 50-hud-te-voet | HUD te voet: opdrachtbalk, Fluit een duif, telefoonkaart, minikaart | | veel tegelijk linksboven; wel leesbaar |
| 51 | 51-hud-rijden-compacte-snelheidsmeter | in de klusbus: routehint "Over 40 m linksaf", voertuigplaat | compacte snelheidsmeter | snelheidsmeter zelf niet zichtbaar (staat stil; v.speed wordt hier niet getoond) |
| 52 | 52-hud-rijden-politie-wanted-minikaartlabel | 3 sterren, minikaart met schild-label "6 3/5", snelheidsmeter "2 km/u" rechtsonder, hints met toetsplaatjes | minikaart-label | bij de toetsen rechtsonder (E/M/ESC) staan alleen plaatjes zonder werkwoord op de ESC-regel |
| 53 | 53-hud-te-voet-politie-wanted | te voet, drie sterren, hint "Pak een bak en smeer hem" met WASD, Shift, E | toetsplaatjes | |
| 54 | 54-hud-telefoon-nieuws-lange-kop | Kiekdoar-melding met lange kop | lange kop volledig zichtbaar | gezien (kop "AALTJE: SIRENES" bij een vorige melding; lange tekst afgekapt niet gezien in dit beeld) |
| 55 | 55-hud-kaarten-tip-missie-geld | kaart "Geld" zichtbaar; tip en missie waren al weg (camera in muur) | | alleen de geldkaart kwam in beeld: lettergroottevergelijking is niet gelukt |
| 56 | 56-hud-toetshints-instappen | HUD te voet bij stilstaand voertuig | | camera staat in een muur; geen instaphint in beeld |
| 60, 61 | 60/61-kaart-reisopties-taxi | kaartkaart "Reis erheen" met opties Trein, Bus, Taxi (aanbevolen), Zelf gaan, knop "Reis nu" | Taxi-optie | **60 (uitgeschakeld met reden) is niet gelukt**: beide beelden tonen de taxi als aanbevolen en bruikbaar; de zin "Niet tijdens een achtervolging" is niet in beeld. Bovenkant van de kaart is afgesneden boven het scherm |
| 62..64 | 62/63/64-taxirit | taxi-ritkaart: "Met de taxi, Naar Winsum, nog ± 14 min", voortgangsbalk, C of Y camera, SPATIE overslaan | echte rit-scene | ritkaart is klein; toetsplaatje "C of Y" is een gewone pil, "overslaan (of tik op het scherm)" staat laag op de kaart |
| 66..68 | 66/67/68-treinrit | treinrit: "Met de trein, Naar Delfzijl, nog ± 43 min" | | 68 bijna leeg/zwart |
| 80, 81 | 80/81-duivenspot-hud | duif boven station/museum: "Gespot 0 van 7", kolommen, naamplaten, toetsplaatjes WASD, Spatie, Shift, F, E, Q, X | Duivenspot-HUD | **veel overlap**: "Je bent de duif"-kaart, Spotopdracht, hoogte, ondertitel en naamplaten staan over elkaar heen en over het beeld |
| 90, 91 | 90/91-laadscherm-boot | opstartscherm met logo, balk met stappen, "Stap 3 van 3", 18-pictogram | stapteller | in deze run slechts 3 van 3 stappen |

Reproduceren: `bash desktop/build/run_menufoto.sh <slotnaam> 900 node scripts/qa/menufoto.mjs --out=docs/beeld-21-11/feedback-menus --size=1920x1080 --sets=esc,kaart,samen,hud,laad,reis,duif,bench [--boot]` (de wrapper staat niet in git).
