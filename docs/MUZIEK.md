# Muziek voor de radio: wat er is en wat erbij kan

Bijgewerkt: 4 oktober 2026, na de speeltest van Maus (0.26.1). De eigenaar
vindt dat de muziek te vaak hetzelfde is. Dit document zegt wat er nu draait
en welke nummers erbij kunnen. Elk voorstel heeft een stijlomschrijving die
je als prompt in Google Gemini kunt plakken, een aantal en het programmablok
of de situatie waar het hoort.

Er is één zender, **G-Music**, met een programma per deel van de
speldag (`PROGRAMMES` in `game/js/musicpick.js`). Er zijn twee pools: de
dagpool (`"stations": ["gmusic"]`) voor de ochtend, de dag en de avond, en de
nachtpool (`"nachtstreek"`) voor Nachtstreek.

## Wat er nu is

| Programmablok | Tijd | Pool | Nummers nu | Praatje na | Jingles |
|---|---|---|---|---|---|
| Proat in de ochtend | 06:00-10:00 | dag | 14 (2 met `"day"`) | elke 2 nummers: Geesje, nieuws, verkeer, weer, reclame, de koeien | ja |
| De hits | 10:00-18:00 | dag | 14 | elke 3 nummers: vooral Kiekdoar-nieuws, soms Geesje | ja |
| Avondproat | 18:00-22:00 | dag | 14 | elke 3 nummers: Geesje, de koeien, Rikus, nieuws | ja |
| Nachtstreek | 22:00-06:00 | nacht | 6 (ook in de dagpool) | elke 2 nummers: Rikus, soms nieuws | nee, wel een oude-radiofilter |

De dagpool duurt ongeveer 37 minuten, de nachtpool ongeveer 16 minuten
(De Geest van Oosterpark, Suikerbuiken in de nacht, Onder de Martinitoren,
Oosterpark is m'n droom, Wie stoan nait stil, Kleur in de Wind, en de drillnummers Geen stoplicht houdt ons tegen en Goud in de Nacht, en de punk van Hatchback op de Ring en de eurodance van Zomerse droom in de Stad en de Grunneger boerenrock van Trots op mien grond en de dark trap van Koplampen in de Mist). Daarnaast:
4 jingles (station_id, nummerovergang, rij_knipoog, hoge_wanted, 2 tot 4 s)
en 2 scenario-loops voor race en achtervolging (`audio/scenario/`). De
praatjes zijn bestaande opnames: Geesje van Radio Proat, de Kiekdoar-clips
uit `audio/nieuws/`, de verkeersinformatie, de koeien en Rikus.

De indeling van Nachtstreek is gekozen op de titels, niet op het geluid.
Luister ze even na en zet `stations` en `time` in `manifest.json` goed als
een nummer daar niet past.

**Waarom het snel gaat herhalen.** 14 nummers van gemiddeld 2:40 zijn samen
37 minuten. Wie een uur rijdt, hoort alles minstens één keer opnieuw. De
praatjes rekken dat wat op, maar 's nachts is de nachtpool al na een
kwartier rond. Tot 0.26.1 kwam er ook
tussen elk nummer een van drie jingles, dus die hoorde je elke paar minuten.

**Wat de radio nu doet** (`game/js/musicpick.js`):
- Een nummer uit de laatste ~60% van de pool komt niet terug: 8 nummers op
  de dagpool en 3 in de nachtpool. De geschiedenis geldt voor beide pools
  samen en blijft bewaard tussen sessies.
- Een nummer dat langer niet speelde, weegt zwaarder. Een nummer van
  dezelfde act als het vorige weegt lichter.
- Nummers met `"time": "night"` draaien vaker tussen 22:00 en 06:00 in het
  spel. Nummers met `"day"` draaien juist overdag vaker.
- Er zit nog maar in 60% van de overgangen een jingle, en nooit twee keer
  dezelfde jingle achter elkaar.
- Elk programmablok draait uit zijn eigen pool (`stations` in
  `manifest.json`). Een pool met minder dan 6 eigen nummers leent de rest,
  maar draait die minder vaak.

Het echte probleem is het aantal nummers. Het doel voor 1.0, per
programmablok:

| Programmablok | Doel | Waarvan | Nu |
|---|---|---|---|
| Proat in de ochtend | 10 nummers met `"time": "day"` in de dagpool | vrolijk en vlot: blaskapel, shanty, indie | 2 |
| De hits | 40 nummers in de dagpool (ongeveer 1 uur 45) | alles wat niet alleen 's nachts past | 14 |
| Avondproat | 8 nummers met `"time": "night"` in de dagpool | gabber, drill, de stevigere nummers | 2 |
| Nachtstreek | 20 nummers in de nachtpool (ongeveer 55 minuten) | levenslied, streektaal, lo-fi | 6 |
| Jingles | 10 voor de dagblokken, 4 stings voor Nachtstreek | | 4 en 0 |

De ochtend, de dag en de avond delen de dagpool; `"time"` stuurt welke
nummers er 's ochtends en 's avonds vaker tussen zitten.

## Algemene regels voor nieuwe nummers

- **Alles origineel.** Geen covers, geen bestaande melodieën en geen namen
  of teksten van echte artiesten (zie `docs/LICENTIES.md`). "In de stijl
  van" betekent het genre en de sfeer, nooit een herkenbaar nummer.
- **Lengte** van 2 tot 3,5 minuten. Een korte intro en een echt einde, geen
  fade van een halve minuut. De radio stemt soms halverwege in.
- **Teksten** in het Nederlands of het Gronings, over Stad en Ommeland,
  zomer, fietsen, de Grote Markt, de ring, het water en geld tekortkomen.
  Houd het luchtig en spot met de stad, net als het spel. Geen echte namen
  van mensen of bedrijven.
- **Mixen** rond -14 LUFS, zodat het ene nummer niet veel harder is dan het
  andere. Lever mp3 met 192 kbps of meer.
- **Bestandsnaam** is de titel, met `_` voor spaties. Zet het nummer in
  `manifest.json` met de goede `stations` (`gmusic` = de dagpool,
  `nachtstreek` = de nachtpool) en `time`, en geef het een
  verzonnen act in `GMUSIC_ARTISTS` in `audio.js`. Doe je dat niet, dan
  kiest het spel er zelf een.

## Voorstellen

Elke prompt is in het Engels, want daar luisteren muziekmodellen het beste
naar. De tekst van het nummer zelf blijft Nederlands of Gronings.

### 1. Gronings levenslied / smartlap
- **Blok:** Nachtstreek (`"stations": ["nachtstreek"]`, `"time": "night"`),
  en 2 ervan ook op G-Music.
- **Aantal:** 6
- **Situatie:** 's nachts door het Ommeland rijden, na een mislukte missie,
  rond de kroegen in de Poelestraat.
- **Prompt:** *Dutch levenslied / smartlap ballad, sung in Gronings dialect
  by a warm, slightly rough male or female voice, accordion and Hammond
  organ, brushed drums, walking bass, 3/4 or slow 4/4 at 80-95 BPM,
  melancholic but warm, about leaving the city, rent you can't pay and a
  summer night by the canal, singalong chorus, recorded like a 1970s
  regional radio session, original melody.*

### 2. Nederpop in de geest van de streektaalzangers
- **Blok:** Nachtstreek, en 3 ervan ook op G-Music.
- **Aantal:** 6
- **Situatie:** zonsondergang op de Hondsrug of bij het Zernike, rustige
  stukken tussen missies.
- **Prompt:** *Original Dutch singer-songwriter folk-pop in Gronings dialect,
  acoustic guitar, harmonica, light piano, upright bass, gentle brushed
  drums, 90-105 BPM, poetic and nostalgic lyrics about the flat land, wide
  skies, wind and an old farm, intimate male vocal close to the mic,
  1980s regional pop warmth, no resemblance to any existing song.*
- Let op: geen nummer of tekst van Ede Staal namaken. Dit is alleen het
  genre: streektaal, akoestisch en weemoedig.

### 3. Gabber / hardstyle voor de ring
- **Blok:** G-Music (`"time": "night"`). Kan ook als race-loop in
  `audio/scenario/` (instrumentaal, met een naadloze loop).
- **Aantal:** 4 nummers en 1 instrumentale race-loop
- **Situatie:** races op de ring, achtervolgingen, de Ring Zuid 's nachts.
- **Prompt:** *Original Dutch gabber / early hardstyle track, 170-180 BPM
  distorted kick, hoover synth lead, rave stabs, short shouted Gronings
  vocal chops ("Stad!", "Hol nait op!"), 1990s Rotterdam-style energy but
  playful not aggressive, build-ups and drops every 32 bars, made for
  driving fast on a ring road at night.*
- Voor de loop: *same style, instrumental, 60-90 seconds, seamless loop
  with no intro or outro.*

### 4. Shanty / zeemansliederen voor het water
- **Blok:** G-Music. Ook geschikt als muziek bij de rondvaart-bijbaan.
- **Aantal:** 4
- **Situatie:** varen door de grachten en het Reitdiep, de skûtsjerace,
  de rondvaartboot.
- **Prompt:** *Original Dutch sea shanty sung by a small group of male and
  female voices in call-and-response, accordion, fiddle, stomping and
  clapping, 100-115 BPM, lyrics about canal boats, the Reitdiep, bridges
  that won't open and a skipper who is always late, pub-singalong feel,
  slightly rough harbour recording.*

### 5. Blaskapel en kermismuziek
- **Blok:** G-Music (`"time": "day"`). Ook als achtergrond op de kermis
  naast het draaiorgel uit `kermis.js`.
- **Aantal:** 3
- **Situatie:** de kermis op de Grote Markt, de Gronings Ontzet-dagen,
  feest in de dorpen.
- **Prompt:** *Original Dutch brass band / blaskapel party music, tuba,
  trumpets, trombone, clarinet, snare and bass drum, 120-130 BPM oom-pah
  rhythm, cheerful kermis atmosphere, short Dutch singalong chorus about
  the fair, poffertjes and the bumper cars, live outdoor recording feel.*

### 6. Lo-fi voor de nacht
- **Blok:** Nachtstreek (`"time": "night"`), instrumentaal.
- **Aantal:** 6
- **Situatie:** laat rondrijden of -lopen, regen, het wachten tussen
  missies, de duivenmodus 's nachts.
- **Prompt:** *Instrumental lo-fi hip hop, 70-85 BPM, dusty vinyl crackle,
  mellow Rhodes chords, soft boom-bap drums, warm bass, distant rain and
  bicycle bells as texture, a hint of accordion or church bell to place it
  in a Dutch northern city at night, calm and slightly melancholic,
  2-3 minutes with a clean ending.*

### 7. Friese folk voor Jelle
- **Blok:** G-Music, en ook op Nachtstreek. Kan ook als motief in de
  missies met Jelle en het fierljeppen.
- **Aantal:** 3
- **Situatie:** de Friese missies, fierljeppen, het skûtsje, Jelle's
  telefoontjes en het einde van zijn verhaal.
- **Prompt:** *Original Frisian folk song sung in West Frisian by a clear
  voice, fiddle, acoustic guitar, accordion and bodhran, 95-110 BPM, proud
  and a little stubborn, about wide polders, a canal-jumping pole and not
  giving in to the big city, folk-rock build in the last chorus.*
- Laat de Friese tekst nalezen door iemand die Fries spreekt.

### 8. Jingles per programmablok
- **Blok:** de dagblokken hebben nu 4 G-Music-jingles. Nachtstreek heeft er
  geen, en de praatjes van Radio Proat beginnen met Geesje's gesproken
  idents.
- **Aantal:** G-Music 6 extra (dan 10), Nachtstreek 4 stings, Radio Proat 3
  korte tunes onder de gesproken idents.
- **Prompt G-Music:** *3-second radio station jingle for a fictional
  Groningen hit station called "G-Music", punchy synth stab, short sung
  station name by a bright vocal group, modern pop sheen, ends on a clear
  hit.*
- **Prompt Nachtstreek:** *4-second late-night radio sting for a fictional
  regional night show called "Nachtstreek", warm Hammond organ swell and
  a soft vibraphone motif, sleepy and intimate, like an old AM radio after
  midnight.*
- **Prompt Radio Proat:** *2-second talk radio bumper, upbeat acoustic
  guitar strum and a short xylophone ending, friendly and local, leaves
  room for a voice over the top.*
- Jingles komen als `.wav` in `audio/gmusic/jingles/`. Voor een eigen set
  per blok moet `AMBIENT_JINGLE_KEYS` in `audio.js` per programma worden, en
  Nachtstreek `jingles: true` krijgen in `PROGRAMMES`. Dat is een kleine
  aanpassing.

### Extra, als er ruimte is
- **Gronings carnaval / après-ski-feest** (2, G-Music, overdag): *Dutch
  party schlager, 128 BPM, four-on-the-floor, brass hits, a singalong
  chorus in Gronings.*
- **Indie-gitaarpop over studeren in Stad** (3, G-Music): *original Dutch
  indie guitar pop, jangly guitars, 120 BPM, lyrics about student life,
  the KEI-week and bikes in the canal.*
- **Drill / Nederhop met een knipoog** (3, G-Music, `"time": "night"`).
  Dit sluit aan op wat er nu het meest is: *Dutch drill with comedic
  Gronings lyrics, sliding 808s, dark piano, 140 BPM half-time, boastful
  about cheap things such as a bicycle and kapsalon.*

## Samengevat

| Genre | Aantal | Blok | Tijd |
|---|---|---|---|
| Gronings levenslied | 6 | Nachtstreek (+2 G-Music) | nacht |
| Nederpop in streektaal | 6 | Nachtstreek (+3 G-Music) | elk moment |
| Gabber/hardstyle | 4 en 1 loop | G-Music, race | nacht |
| Shanty | 4 | G-Music | elk moment |
| Blaskapel/kermis | 3 | G-Music | dag |
| Lo-fi | 6 | Nachtstreek | nacht |
| Friese folk | 3 | G-Music en Nachtstreek | elk moment |
| Jingles | 13 | per blok | - |
| Extra | 8 | G-Music | gemengd |

In de tabellen hierboven betekent "G-Music" de dagpool (de ochtend, de dag
en de avond) en "Nachtstreek" de nachtpool. Met alles erbij heeft de
dagpool 41 nummers (zo'n 1 uur 50) en de nachtpool 27 (zo'n 1 uur 10). De
no-repeat-regel houdt dan de laatste 24 nummers overdag en de laatste 16 's
nachts buiten de keuze.

## Zelfgemaakte nummers: verwijderd

De zeven nummers die het spel zelf synthetiseerde (`synthmusic.js`) zijn weg:
de eigenaar besloot op 18 oktober 2026 (#66) dat muziek niet door Claude
wordt gemaakt. Nieuwe muziek komt via Gemini op verzoek van de eigenaar; zie
`docs/MUZIEK-OPRUIMING.md` en het wensenlijstje voor Gemini.
