# Steam-trailers

Twee trailers voor de winkelpagina, naast de oude YouTube-trailer "Een
zomer in Grunn" (de cut `vol`, die ook de benchmark blijft):

1. **Gameplay** (`--trailer-cut=gameplay`, ~63 s): de eerste trailer op
   Steam. Het logo in de eerste seconden, daarna 2-secondenshots van zo veel
   mogelijk missies en systemen, met de echte HUD en een paar tekstkaarten.
2. **Verhaal** (`--trailer-cut=verhaal`, ~80 s): de tweede trailer. De
   boog van het verhaal tot de kraak, met echte ingesproken regels uit de
   game, naamkaarten en de set pieces, tot het Ontzet op 28 augustus.

Alles staat in `game/js/trailer.js` (de shots, en `CUT_ORDER` met de volgorde
en lengte per cut). Export: zie `docs/ONTWIKKELEN.md` › Trailer mode, en onderaan hier.

## Eisen van Steam

Nagekeken in Steamworks (*Trailers*, 3 oktober 2026):

- **Formaat:** maximaal 1920×1080, bij voorkeur 16:9; `.mp4`, `.mov` of
  `.wmv`. H.264 met AAC-audio, stereo, 44,1 of 48 kHz. 30 of 60 fps.
  Bitrate minimaal 5.000 kbit/s.
  - De export (`--trailer-video`) levert H.264 yuv420p, CRF 18, 60 fps, AAC
    192k, 1920×1080. Dat past. Geen 4K-versie uploaden: Steam schaalt die
    toch terug.
- **Volgorde:** de eerste twee trailers komen vóór de screenshots. Steam
  maakt van de **eerste seconden van de eerste trailer** automatisch een
  microtrailer van 6 seconden (die zie je in lijsten en bij hover). Daarom
  is de gameplay-trailer de eerste, met het logo vanaf 0,5 s.
- **Gameplay eerst:** Steam raadt aan dat de eerste trailer laat zien hoe
  het spel speelt, met de HUD.
- **Thumbnails:** Steam maakt ze zelf (600×380 en 232×130); een eigen frame
  van 1920×1080 mag. `--trailer-video` zet een PNG naast de mp4 (gameplay:
  het logo boven de Martinitoren; verhaal: de luchtfoto).
- Een game kan niet uitkomen terwijl een trailer nog wordt gecodeerd: upload
  hem ruim op tijd.

## Geen spoilers

- **Niet in een trailer:** de lege vitrine, het kaartje "Tige tank!", wie de
  Eierbal meeneemt, H16 ("Tige tank foar de auto"), de chocolade bal en de
  ballon. Dat geldt ook voor de oude cut: shot 11 is nu de Eierbal in zijn
  vitrine.
- **De haak is de geplande kraak:** de Gouden Eierbal ligt nog in de vitrine,
  gloeit, de camera schuift naar binnen, en Tessa zegt "Vannacht. Het museum.
  Geen zaklamp."
- Alles tot het midden van het verhaal alleen als hint. Jelle is de rivaal
  ("Zelfs zijn naam klinkt als een fierljepper"), niet de dader.
- Geen regels waarin "Anita" wordt gezegd (de naam is nu Tessa).

## Shotlijst: gameplay (~63 s)

Steam's eerste trailer. Snel gesneden (meest 2–2,4 s per shot), zo veel
mogelijk verschillende missies, met de echte HUD (`hud: true`: `hud_panel.js`
met het doel van de missie bovenin, `hudcards.js`, `stunthud.js`, de HUD van
`helirun.js`, de telefoon), zonder balken of vignet. Weinig kaarten.

| # | tijd | s | Shot (id) | Laat zien | Missie / systeem |
|---|---|---|---|---|---|
| 1 | 0:00 | 2,6 | `steamLogo` | het GDE-logo boven de Martinitoren | – |
| 2 | 0:02 | 2,2 | `gpCity` | Stad vanaf de rand. Kaart: *Een hele stad. Een heel Ommeland.* | de kaart |
| 3 | 0:04 | 2,2 | `gH1` | **HUD**: Berends bakkie, *Breng Berends bakkie naar het Boterdiep · geen krassen* | H1 |
| 4 | 0:07 | 2,0 | `gH2` | **HUD**: Tessa rolt de pinautomaat door de Herestraat | H2 |
| 5 | 0:09 | 2,4 | `hudStunt` | **HUD**: stuntavond, parasols om, duiven op, score en combo | H3 |
| 6 | 0:11 | 2,0 | `gH4` | **HUD**: de duif boven Stad, *Kiek het museum van boven* | H4, duivenmodus |
| 7 | 0:13 | 2,2 | `gH5` | **HUD**: de KEI-race op de fiets, *Positie 3/6* | H5 |
| 8 | 0:15 | 2,0 | `vitrine` | de Gouden Eierbal in zijn vitrine, push-in | H6 (de kraak als plan) |
| 9 | 0:17 | 2,0 | `gH7` | **HUD**: *Breng het decor naar Noorderzon* | H7 |
| 10 | 0:19 | 2,2 | `tanker` | de tankwagen slipt, het vet klotst | H8 |
| 11 | 0:21 | 2,2 | `race` | Ring Zuid. Kaart: *18 missies.* | H9 |
| 12 | 0:24 | 2,0 | `night` | de Poelestraat bij nacht, Durk zingt | H11 (kroegentocht) |
| 13 | 0:26 | 2,0 | `gH12` | **HUD**: fatbikes in de straat, *Geschept: 3/8* | H12 |
| 14 | 0:28 | 2,2 | `boat` | de rondvaartboot op de Diepenring | H13, boten |
| 15 | 0:30 | 2,2 | `gH14` | **HUD**: in een sloep achter het skûtsje aan | H14 |
| 16 | 0:32 | 2,4 | `hudHeli` | **HUD**: de heli door de ringen, pijl, hoogtemeter | H15, ballonjacht |
| 17 | 0:34 | 2,2 | `hudChase` | **HUD**: achtervolging met drie sterren | politie |
| 18 | 0:37 | 2,2 | `gH18` | **HUD**: *Achter de trekker-limo aan* | H18 |
| 19 | 0:39 | 2,2 | `kermis` | de kermis. Kaart: *Botsauto's. Padel. Ballonjacht.* | minigames |
| 20 | 0:41 | 1,8 | `gTwins` | Durk & Douwe in een botsauto | botsauto's |
| 21 | 0:43 | 2,4 | `trauma` | de traumaheli stijgt op van het UMCG. Kaart: *Het staat niet in het rooster.* | heli (het donkere veld van de Ommeland-shot toonde niets) |
| 22 | 0:45 | 2,2 | `hudJob` | **HUD**: Hap & Rap bezorgen, de klok loopt | bijbaantjes |
| 23 | 0:47 | 2,4 | `hudPhone` | **HUD**: de telefoon op Ubbo: verhaal, dichtbij, bijbaantjes | telefoon, Te doen |
| 24 | 0:50 | 2,2 | `timelapse` | een dag boven Stad. Kaart: *Dag en nacht.* | dag en nacht |
| 25 | 0:52 | 1,8 | `storm` | onweer boven het Forum | weer |
| 26 | 0:54 | 2,2 | `vismarkt` | terrassen. Kaart: *Toetsenbord of controller.* | besturing |
| 27 | 0:56 | 2,4 | `aerial` | luchtfoto bij zonsondergang | – |
| 28 | 0:58 | 4,0 | `logo` | het logo met *Gratis · Nederlands gesproken* | – |

Muziek: de themesong vanaf 0 s. Geen stemmen.

Niet in beeld, en waarom: H10 (de vlag aan de toren: de duif-shot staat er al
voor H4), H16 (de achtervolging op de Fjord verraadt de gestolen
Escapade), H17 (de snackwedstrijd heeft nog geen losse trailerprops) en
padel (alleen op de kaart). De museumlasers van H6 zijn niet gestaged: H6 is
de Eierbal in de vitrine.

## Shotlijst: verhaal (~80 s)

Toon: zomer, droog, de muziek bouwt op. Drie lijnen lopen door de boog
heen, alleen als hint:

1. **Tammo en Tessa, of ze wel of niet…** Oogcontact, een onafgemaakte zin
   ("Praat straks eens tegen mij." / "…Straks."). De kus en het antwoord
   blijven eruit.
2. **Van "wij" naar "Grunn".** Eerst geld en de Fjord Frituur ("Iemand moet
   de Fjord Frituur betalen"), aan het eind Oma Trijntje: "Die bal is gien
   geld, jong. Die bal is Grunn."
3. **Jelle Terpstra.** Rivaal, snackkoning, ijdel ("Zelfs zijn naam klinkt
   als een fierljepper"), en er zit meer achter: "Foar mem." Niet wie mem
   is, niet 1953, niet hoe het afloopt.

Alle stemmen zijn bestaande opnames (`audio/voicelines/`), geen nieuwe TTS.

| # | tijd | s | Shot | Regel (bron) | Kaart |
|---|---|---|---|---|---|
| 1 | 0:00 | 4,0 | Radio, zwart | **Rikus:** "Augustus. In Grunn heet dat zomer." (`trailer/rikus_augustus`) | *Radio Nachtstreek 06:12* |
| 2 | 0:04 | 3,6 | Zonsopgang bij de Martinitoren | – | *Grunn.* |
| 3 | 0:07 | 3,4 | Terrassen op de Vismarkt | **Tammo:** "Oogcontact. Dat zei Sjoerd." (banter H5) | *Een zomer.* |
| 4 | 0:11 | 3,0 | Naamkaart Tessa (pinautomaat) | – | **TESSA** |
| 5 | 0:14 | 3,0 | Naamkaart Tammo (deur) | – | **TAMMO** |
| 6 | 0:17 | 4,6 | Noorderplantsoen | **Tessa:** "De Fjord Frituur. Blauw, met een meeuw erop." (banter `id-fjord-meeuw`) | – |
| 7 | 0:21 | 3,6 | De Escapade in de Herestraat | **Tessa:** "Iemand moet de Fjord Frituur betalen." (banter `st-bijbaan`) | – |
| 8 | 0:25 | 6,0 | **De Gouden Eierbal in de vitrine**, gloeiend, langzame push-in | **Tammo:** "Achttien karaat. Hoeveel eierballen is dat?" (H2) · **Tessa:** "Vannacht. Het museum. Geen zaklamp." (vóór H6) | *De Gouden Eierbal.* / *Groninger Museum* |
| 9 | 0:31 | 5,4 | Naamkaart Jelle Terpstra (trekker-limo) | **Tessa:** "Jelle Terpstra. Zelfs zijn naam klinkt als een fierljepper." (banter `id-fierljeppen`) | **JELLE TERPSTRA** |
| 10 | 0:36 | 3,8 | Duif langs de Martinitoren | **Jelle:** "Moai, Grinzers! Kijk eens omhoog. Foar mem." (H10) | *Kieken van boven.* |
| 11 | 0:40 | 3,2 | Naamkaart Durk & Douwe (botsauto) | – | **DURK & DOUWE** |
| 12 | 0:43 | 4,0 | Achtervolging met zwaailichten | – | *Lange avonden.* |
| 13 | 0:47 | 3,6 | Ringrace | – | *Ring Zuid. Laatste fase.* |
| 14 | 0:51 | 3,6 | De tankwagen op de Europaweg | – | *Al het vet van Grunn.* |
| 15 | 0:54 | 4,2 | Rondvaartboot, Tammo en Tessa aan de reling | **Tessa:** "Praat straks eens tegen mij." · **Tammo:** "…Straks." | – |
| 16 | 0:59 | 4,0 | Kermis bij nacht | **Rikus:** "Achtentwintig augustus. Gronings Ontzet. In 1672 hield Stad een bisschop buiten." (radio, loopt door in 17) | *28 augustus.* |
| 17 | 1:03 | 3,6 | Traumaheli boven het UMCG | (Rikus) | – |
| 18 | 1:06 | 5,8 | Luchtfoto bij zonsondergang | **Oma Trijntje:** "Die bal is gien geld, jong. Die bal is Grunn. En Grunn geeft nooit op." | – |
| 19 | 1:12 | 5,0 | Logo (*Zomer vol misdaad* in het woordmerk) | – | *Een zomer in Grunn* |
| 20 | 1:17 | 3,0 | Berend en de kras | **Berend:** "…Kon minder." | – |

De themesong zakt onder elke regel iets weg (in de export; live alleen
onder de boot).

## Wat er in de oude cut is veranderd

- Shot 11 is nu **de Gouden Eierbal in zijn vitrine** (gloed, push-in),
  zonder kaartje: geen spoiler meer, ook niet in de benchmark.
- De druppels van de tankwagen zijn groter en de camera staat dichterbij.
- Durk in de Poelestraat staat onder een warme terraslamp, en de camera rijdt
  tot vlak voor hem.
- Ondertitels en naamkaartregels zijn groter (ongeveer 44 en 48 px bij
  1080p).
- De zwarte overlay (in- en uitfaden) volgt de trailerklok in plaats van een
  CSS-transitie, dus de fades staan nu ook in de export. CSS-animaties in de
  HUD lopen in een opname ook op de trailerklok.

## Export

Eén export tegelijk, onder `nice`, alleen als de game niet speelt:

```
cd desktop && npm run stage
nice -n 10 npx electron . --trailer-cut=gameplay --trailer-video=~/Downloads/GDE-Groningen-trailer-gameplay.mp4
nice -n 10 npx electron . --trailer-cut=verhaal --trailer-video=~/Downloads/GDE-Groningen-trailer-verhaal.mp4
```

Een opname die met beeld begint (gameplay) laadt eerst ~2,5 s achter
zwart, zodat de eerste frames meteen scherp zijn.

## Checklist voor de upload

- [ ] Gameplay-trailer als eerste, verhaal-trailer als tweede.
- [ ] Opnieuw exporteren vanaf main (1920×1080, 60 fps).
- [ ] Eigen thumbnail (de PNG naast de mp4).
- [ ] Titels op Steam: "Gameplay" en "Een zomer in Grunn" (geen andere
      merknamen; "trailerparodie" is een interne notitie).
