# YouTube-uploadpakket GDE Groningen (issue #63)

Alles staat klaar om te uploaden. **Er is niets geüpload, aangemaakt of gepubliceerd.**
Alles hieronder doe jij zelf; ik heb niets met je Google-account gedaan.

## Wat erin zit

| Map / bestand | Inhoud |
|---|---|
| `video/GDE-Groningen-gameplaytrailer-1080p60.mp4` | Gameplaytrailer, ~63 s, 1920×1080, 60 fps, H.264 + AAC (muziek), met de echte HUD |
| `video/GDE-Groningen-verhaaltrailer-1080p60.mp4` | Verhaaltrailer met Tessa en Tammo, ~80 s, 1920×1080, 60 fps, met stemmen, muziek en ondertitels in beeld |
| `thumbnails/` | Per trailer twee thumbnails van 1280×720 (JPG, onder 2 MB), uit in-game beelden met "GDE Groningen – Zomer vol misdaad" |
| `teksten/gameplaytrailer.txt` | Titel, beschrijving (met hoofdstukken), tags en instellingen |
| `teksten/verhaaltrailer.txt` | Idem |
| `teksten/kanaal.txt` | Kanaalnaam, kanaalbeschrijving, links, bannertekst |
| `kanaal/` | `profielfoto.png` (800×800), `banner.jpg` (2560×1440), `watermerk.png` (150×150) |
| `controle/` | Wat ik bekeken heb: contactbladen per seconde en een tekstrapport per video (zwart beeld, stilte, luidheid) |

## Wat ik gecontroleerd heb (en wat niet)

Zie ook `controle/RAPPORT.md`. Kort: beide video's zijn met het oog doorgelopen (één beeld per seconde
met tijdstempel, plus close-ups bij twijfel), de audio is met ffmpeg gemeten (geen stilte, luidheid -16 en -14 LUFS), en wat fout was is hersteld en opnieuw opgenomen. **Nog niet gedaan:** op een
telefoon, tv of in YouTube zelf bekijken, en de echte auteursrechtcontrole van YouTube
(Content ID, vooral op de Gemini-muziek). Dat kan pas bij het uploaden.

## Stappenplan (ongeveer 45 minuten, alles als Privé)

### A. Kanaal (eenmalig)
1. Ga in YouTube naar je profielfoto › *Een kanaal maken* en maak een **Merkaccount** (geen persoonlijk kanaal). Naam: **GDE Groningen**. Handle: `@GDEGroningen` (is die bezet, kies `@GDEGroningenGame`).
2. Verifieer het kanaal met je telefoonnummer (YouTube Studio › Instellingen › Kanaal › Functiebeoordeling). Zonder dit kun je geen eigen thumbnails uploaden.
3. **Aanpassen › Branding:** upload `kanaal/profielfoto.png`, `kanaal/banner.jpg` en `kanaal/watermerk.png` (watermerk: "Einde van video").
   Let op: de eigenaar vond eerder dat de kanaal-SVG's er anders uitzien dan de rest van de art. Deze set komt uit dezelfde in-game beelden en hetzelfde woordmerk als Steam; kijk of je hem mooi vindt voordat je uploadt. Zo niet: sla deze stap over, de video's hebben het niet nodig.
4. **Aanpassen › Basisinformatie:** plak de beschrijving uit `teksten/kanaal.txt`; laat links leeg tot er een echte link is.

### B. Gameplaytrailer uploaden
1. Studio › *Maken › Video's uploaden* › kies `video/GDE-Groningen-gameplaytrailer-1080p60.mp4`.
2. Plak **titel** en **beschrijving** uit `teksten/gameplaytrailer.txt`. De regel "▶ Downloaden: (link volgt)" laat je staan of haal je weg, tot er een link is.
3. **Thumbnail:** upload `thumbnails/thumbnail_gameplaytrailer.jpg`.
4. Afspeellijst: nieuwe lijst **Trailers**.
5. Publiek: **Nee, deze video is niet gemaakt voor kinderen.**
6. *Meer opties*: tags uit het tekstbestand, taal Nederlands, categorie Gaming, licentie standaard, opmerkingen aan (ongepaste vasthouden), **Veranderde content: Nee**.
7. Leeftijdsbeperking (zie "Leeftijd" hieronder): standaard geen.
8. Zichtbaarheid: **Privé** › Opslaan.

### C. Verhaaltrailer uploaden
Hetzelfde met `video/GDE-Groningen-verhaaltrailer-1080p60.mp4` en `teksten/verhaaltrailer.txt`, afspeellijst Trailers (tweede), thumbnail `thumbnails/thumbnail_verhaaltrailer.jpg`.

### D. Controleren in Studio (voordat iets zichtbaar wordt)
1. Wacht tot de controles klaar zijn (kan een paar minuten tot een uur). Staat er een **auteursrechtclaim** (de Gemini-muziek kan in zeldzame gevallen aanslaan), kijk dan welk stuk het is en zeg het me; niet betwisten zonder overleg.
2. Open de privévideo op **telefoon en tv** en kijk naar: stemmen hoorbaar, ondertitels leesbaar, de thumbnail op klein formaat, de banner (die ziet er op tv anders uit dan op mobiel).
3. Controleer de **hoofdstukken** in de beschrijving: ze moeten er als lijst met tijden uitzien (00:00 eerst, minstens drie, elk ≥ 10 s). De tijden komen uit de shotlijst; klopt iets niet met wat je ziet, pas de tijd aan.
4. Controleer dat er niets in beeld staat dat niet mag (echte merken, echte personen, een lege vitrine, het briefje "Tige tank!"). Ik heb daar op gelet, maar jij beslist.

### E. Publiceren: alleen na jouw akkoord
- Eerst **Niet vermeld** en de link aan een paar mensen laten zien.
- Dan **Openbaar** (eventueel met Planning, bijv. vrijdag 17:00). Doe dit pas als de repo en de downloadlink kloppen met je besluit over #37 en de Steam-pagina. Vul dan de link in de beschrijving in.
- Daarna: verhaaltrailer als **kanaaltrailer voor niet-abonnees** (Aanpassen › Indeling).

## Leeftijd (jouw keuze)

De game is 18+ (zie `docs/LEEFTIJD.md`, IARC-voorbereiding `docs/IARC-ANTWOORDEN.md`: geweld met bloed en
gore, burgers en agenten kunnen sneuvelen, alcohol, gesimuleerd gokken). Beide beschrijvingen openen daarom met
**"18+ · Bevat geweld (met bloed, in de instellingen uit te zetten), alcohol en gesimuleerd gokken met spelgeld. Niet voor kinderen."**
De trailers zelf tonen geen bloed en geen geraakte burgers (gecontroleerd), dus **mijn advies: de YouTube-leeftijdsbeperking niet aanzetten**.
Zet je hem wel aan (Studio › Leeftijdsbeperking › Ja), dan zie je minder bereik en geen advertenties; verder kost het niets.

## Muziek en credits

Alle muziek en stemmen komen uit de game en zijn gemaakt met Google Gemini (`game/audio/theme`, `game/audio/voicelines`);
de effecten in de trailers zijn eigen synthese. Geen losse Claude-muziek, geen nieuwe TTS. Credits: alleen NatusPella.
De beschrijvingen vermelden de Gemini-herkomst (zoals in LICENTIES, NOTICE en op Steam). De AI-melding in Studio
("Veranderde content") staat op **Nee**: gestileerde gameplay, geen realistische beelden, geen echte persoon nagebootst.

## Opnieuw opnemen of aanpassen

Het pakket is gemaakt met `scripts/record_trailer.mjs`, `scripts/video_check.mjs` en `scripts/youtube_thumbnails.mjs`
(beschreven in `docs/youtube/pakket.md` in de repo, branch `claude/y12-uploadpakket`). Wil je een andere thumbnail of
een korter filmpje (bijv. een Short), vraag het dan; de tooling staat klaar.
