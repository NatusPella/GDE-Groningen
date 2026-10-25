# YouTube: teaser en hoofdtrailer (voorbereiding, #63)

Voor de nieuwe trailers uit `docs/verhaal/nieuw/TRAILER-SCRIPT.md` (teaser 40 s,
hoofdtrailer 90 s; cuts `teaser` en `hoofd`). Aanvulling op
[kanaal.md](kanaal.md), dat nog over de oude verhaal- en gameplaytrailer gaat.
**Er is niets geüpload of aangemaakt.** Kanaal, uploads en instellingen doet
de eigenaar zelf (constitution 8).

## Opnemen (lokaal)

```bash
cd desktop && npm run stage
node ../scripts/record_trailer.mjs            # droog: toont alleen de commando's
node ../scripts/record_trailer.mjs --run      # teaser en hoofd, 1080p en 4K
node ../scripts/record_trailer.mjs --run --cut=teaser --res=1080p
```

- Het script roept `electron . --trailer=<WxH> --trailer-cut=<teaser|hoofd> --trailer-video=<bestand>` aan, na elkaar (één Electron tegelijk).
- Vaste stap van 1/60 s (60 fps), geen HUD, geen cursor; elk beeld gaat direct naar ffmpeg (H.264, CRF 18, AAC 192k, `+faststart`). Muziek en bestaande stemregels worden meegemixt.
- Resolutie: `1080p` = 1920×1080, `4k` = 3840×2160 (zwaar, veel trager dan real time).
- Uitvoer: standaard `%TEMP%/gde-trailer-opnames/GDE-Groningen-<cut>-<res>.mp4` (eigen map met `--out=`). Nooit in de repo; `trailervideo.js` weigert dat. Een PNG van de luchtopname komt ernaast.
- Wegwerpprofiel (`GDE_TEST_PROFILE=gde-trailer`): geen eigen save of instellingen. Vereist ffmpeg op `PATH`.
- Nieuwe stemregels (Jelle, Tessa, Rikus-slot) bestaan nog niet: opnemen met alleen BEHOUDEN-regels, geen TTS-uitgaven.
- **Niet getest**: het script is alleen droog gedraaid; er is niets opgenomen en geen uitvoer bekeken.

## Beeldbronnen

In [kaarten/](kaarten/): SVG-bron en PNG (1920×1080) van de tekstkaarten uit het script
(`kaart_grunn`, `kaart_frietwagen`, `kaart_plakjes`, `kaart_slagzin`, `kaart_titel`),
de `eindkaart` (datum en downloadlink staan nog als `[datum]` en `[downloadlink]`)
en `thumbnail` (1280×720, "Eén man. Acht plakjes."). Huisstijl uit DESIGN_SYSTEM.md
(`#1e9e56`, `#3fc97a`, donkere groene verloop, enige rood `#d93f3f`).
De PNG's zijn gerenderd met het alternatief Arial Narrow omdat Bebas Neue niet
lokaal staat; render opnieuw met Bebas Neue geïnstalleerd voor het echte beeld.
De thumbnail is bewust tekst en kleur; een eigen beeld uit de opnames
(Tessa en Tammo in de Escapade) kan erachter. Geen lege vitrine, geen kaartje "Tige tank!".

## Metadata

**Titel teaser:** GDE Groningen – Zomer vol misdaad | Teaser
**Titel hoofdtrailer:** GDE Groningen – Zomer vol misdaad | Officiële trailer
(Geen namen van andere games of uitgevers.)

**Beschrijving (hoofdtrailer):**

```
Een frietwagen. Eén standplaats. Eén man met acht plakjes.

Tammo en Tessa willen een thuis op wielen. Daarvoor moet heel Groningen mee: van de Vismarkt en de Martinitoren tot de wierden, de dijk en de Eemshaven. Voor één eierbal.

GDE Groningen – Zomer vol misdaad is een gratis open-wereldgame in een low-poly Groningen: rijden, varen, vliegen, sluipen en een Friese tegenstander met een plan. Alles in het Nederlands, met een flinke scheut Gronings.

▶ Download: (link volgt)

00:00 Grunn
00:06 Een frietwagen, één standplaats
00:24 Eén man, acht plakjes
00:34 Heel Groningen
00:46 Wat je doet
01:04 Tessa en Tammo
01:25 Zomer vol misdaad

Gratis · Windows en Mac · Nederlands · singleplayer · offline.

Credits: gemaakt door NatusPella. Alle beelden zijn opgenomen in de game; muziek en gesproken regels zijn vooraf gemaakt met Google Gemini (geen AI tijdens het spelen), verhaal en dialogen zijn van de maker.
Bronnen: kaartdata © OpenStreetMap-bijdragers (ODbL); gebouwhoogtes uit 3D BAG (TU Delft/3DGI; BAG van het Kadaster en AHN, CC0); three.js (MIT).

GDE staat voor Grootste Diefstal Ever. Een gratis, niet-commerciële parodie, niet gelieerd aan of goedgekeurd door een andere uitgever. Namen, personages, bedrijven en gebeurtenissen zijn verzonnen; echte straten en openbare gebouwen zijn alleen het decor.

#GDEGroningen #Groningen #indiegame
```

**Beschrijving teaser:** de eerste twee alinea's, de downloadregel, de credits en de disclaimer; geen hoofdstukken (40 s). Als Short (verticaal, ≤ 60 s): `#Shorts` erbij.

**Hoofdstukken:** de tijden volgen de tabel in het script en moeten na de opname worden gecontroleerd (YouTube: 00:00 eerst, minstens drie, elk ≥ 10 s; het laatste hoofdstuk van 5 s bij het vorige voegen).

**Tags:** `GDE Groningen, Zomer vol misdaad, Grootste Diefstal Ever, Groningen, Grunn, Gronings, open wereld, open world, gratis game, Nederlandse game, indie game, parodie, comedy, misdaad, trailer, teaser, Martinitoren, Tammo en Tessa`.

**Credits:** alleen NatusPella. Geen eigen muziek van Claude; als er muziek onder komt, is die van Gemini (zie `docs/MUZIEK.md`). De gesproken regels zijn de bestaande game-regels (Gemini-stemmen, `docs/LICENTIES.md` §4), dus de AI-vermelding blijft in de beschrijving.

**Instellingen:**
- Gemaakt voor kinderen: **Nee**. Categorie Gaming, taal Nederlands, standaardlicentie.
- AI-melding ("veranderde content"): **Nee** (gestileerde game, geen kloon van een echt persoon; zie kanaal.md).
- **Leeftijdsvoorstel:** de game is **18+** (`docs/LEEFTIJD.md`, IARC-antwoorden in `docs/IARC-ANTWOORDEN.md`, #60). kanaal.md zegt nog PEGI 16: verouderd. Het script toont geen bloed of geweld, dus voorstel: de trailers **zonder** YouTube-leeftijdsbeperking, met "18+ game" in de eerste regels van de beschrijving. Staan er na de opname toch geraakte burgers of bloed in beeld, dan de beperking aanzetten.
- Eerst **Privé**, dan Niet vermeld; openbaar pas na akkoord van de eigenaar.

## Speltrailer of verhaaltrailer met Tessa

- **Speltrailer** (script v2: teaser + hoofd): de aankondiging, spoilervrij. Advies: eerst deze.
- **Verhaaltrailer** met Tessa als verteller: dieper op het duo, meer nieuwe stemregels (kosten, #63). Later.

## Checklist voor het uploaden

- [ ] Besluit: speltrailer eerst (advies), verhaaltrailer later of niet.
- [ ] Merkaccount en kanaal aanmaken, telefoonverificatie (voor eigen thumbnails).
- [ ] Kanaalnaam en handle kiezen (advies: GDE Groningen, `@GDEGroningen`; beschikbaarheid controleren).
- [ ] Banner, profielfoto en watermerk uit `docs/youtube/beelden/`; kanaalbeschrijving nalopen.
- [ ] Trailers opnemen (`record_trailer.mjs`) en zelf bekijken: geen spoilers, geen echte merken, geen geometriefouten.
- [ ] Datum en downloadlink invullen in eindkaart en beschrijving, of de regels weglaten.
- [ ] Thumbnail en eindkaart nakijken met Bebas Neue.
- [ ] Privé uploaden, auteursrechtcontrole afwachten, op telefoon en tv bekijken.
- [ ] Hoofdstuktijden controleren tegen de echte opname.
- [ ] Leeftijdsinstelling en AI-melding invullen zoals hierboven.
- [ ] Pas na jouw akkoord: Niet vermeld, dan Openbaar (repo en link kloppen met #37).

## Kanaalafbeeldingen (het kanaal bestaat al)

Bronnen in [kanaalbeelden/](kanaalbeelden/): `avatar.svg` (800×800, Martinitoren met zomerzon, "GDE", leesbaar als klein rondje) en `banner.svg` (2048×1152; naam, "Zomer vol misdaad" en de tagline staan in de veilige zone van 1546×423 in het midden, x 251–1797, y 364–788). Export naar PNG in een scratchmap buiten de repo (headless Chrome of Edge, geen dependencies):

```bash
node scripts/export_kanaalbeelden.mjs            # %TEMP%/gde-kanaalbeelden/avatar.png en banner.png
```

Kanaal-ID en Studio-link staan bewust niet in de repo. Zelf uploaden onder Aanpassen › Branding.
