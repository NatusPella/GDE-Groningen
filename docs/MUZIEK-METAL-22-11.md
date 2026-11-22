# Metalradio: Veenvuur FM (22-11)

Stand: 22 november 2026, branch `radio-metal-22-11`. Besluit eigenaar: er komt een metalradiostation. Alle namen, teksten en nummers zijn nieuw en verzonnen (ADR 0046, constitution 1 tot 4): geen echte zender, band, merk of persoon, geen echt liedje. Plaatsen zijn echt. Altijd zomer, geen leed.

## De zender

| | |
|---|---|
| Naam | **Veenvuur FM** (id `veenvuur`, frequentie 106,6) |
| DJ | **Zware Dieuwke**, een heel vriendelijke stem die alles zwaar vindt, behalve haar koffie |
| Ondertitel | "Harde gitaren van de veenkolonie" |
| Ident | "Veenvuur FM: harder dan de wind over de Wadden." |
| Zendergezicht | icoon `doodshoofd` (Phosphor `skull`, al gebundeld, DS3) in de kleur van het designtoken `--ds-c-rood` (gloeiend veen; een eigen hex mag niet van de designregels); dezelfde vormgeving in de lijst in Instellingen > Geluid en bij de snelheidsmeter. Zenders zonder `face` houden hun huidige weergave |
| Stijl | `metal` (nieuwe stijltag in `STYLES`, `radiochannels.js`) |
| Programma | `every: 3`, praat: DJ, fragment, DJ; geen jingles van G-Music |
| Pool | 6 nummers (stijl `metal`, station `veenvuur`): de zender is spelbaar. De nummers zijn nog door niemand beluisterd. Met minder dan zes staat hij als **"Binnenkort"** in de lijst en wordt nooit aangevuld met andere nummers; de metalnummers komen nooit op G-Music of Nachtstreek |

### Standaard of ontdekbaar? Besluit: zichtbaar vanaf de start (als "Binnenkort"), spelbaar zodra er zes nummers zijn

Overwogen: een geheimpje als ontgrendeling, zoals Ruisradio 108,7 (`ufo`). Afgewezen om drie redenen. (1) Ruisradio is al de ontdekbare zender; een tweede geheime zender maakt de lijst een zoekspel. (2) Een geheimpje is per speler opgeslagen (#429) en Samen spelen moet dan een gast zonder het geheimpje uitleggen waarom hij de zender van de bestuurder niet hoort; dat bestaat al voor Ruisradio en hoeft niet nog een keer. (3) Een metalfan zoekt een metalzender op de wijzerplaat, niet in de wereld. De zender staat dus meteen in de lijst; de status volgt vanzelf uit de poolgrootte (`MIN_POOL` is 6). Wil de eigenaar later toch een ontdekking, dan is het één regel: `unlock: { secret: ... }` bij de zender, zoals bij `ruis`.

### Welke voertuigen en situaties

Nieuwe voertuigsoort `zwaar` in `radiovehicle.js`: vrachtwagen (de Sjouwer en de Bakwagen), bestelbus en kluiswagen (de "zwarte bus"). Voorkeur: Veenvuur FM. Anders dan bij de andere soorten geldt hier **geen G-Music als terugval**: zolang Veenvuur FM niet open is, blijft de wereldradio staan, precies zoals tot nu toe (`soft`, zie de code). De sportwagen en suv blijven bij Nachtjazz Radio, de opgevoerde auto en de fatbike bij Tokkie Beats, de trekker bij Wierde Radio.

Een pick-up bestaat in het spel nog niet als model; de stoere auto's zijn de vrachtwagen en de bus. Een nachtrit: de zender is te kiezen met Shift+N in elk voertuig en wordt per soort onthouden (`radioVehicle`), dus wie 's nachts in de gewone auto Veenvuur FM kiest, krijgt hem de volgende keer weer. Er is geen tijdregel in de tabel gebouwd (de tabel kent het uur niet); de DJ-regels noemen de nachtrit wel.

### DJ-regels en jingles (alles in het Nederlands, met humor)

- "Veenvuur FM. Zware Dieuwke achter de knoppen, de zomer op tien en de bas op elf."
- "Een groet aan de vrachtwagen op de dijk. Ja, we hoorden je al. Het hele Hogeland hoorde je al."
- "Dit is de zwaarste plaat van de provincie. De koeien keken even op en aten daarna gewoon door."
- "Zwart shirt in de zon? Dat heet hier gewoon zomermode. Zet de ramen open."
- "Een nachtrit en een volle tank. Veenvuur houdt je wakker, de koffie doet de rest."
- "Nog een plaat met meer gitaren dan de provincie aankan. Zet je pet vast."

Ident: "Veenvuur FM: harder dan de wind over de Wadden." Korte ID-regels voor de jingle-slots (zelfde mompelstem als de andere DJ's, geen nieuwe opname): "Veenvuur. Het brandt niet, het klinkt zo." en "106,6, waar de klei trilt."

## Samen spelen

- **Wie heeft het:** de zender is van de speler zelf (lokaal, `gde-radio-zender`); er gaat niets over het net behalve de keuze in een gedeeld voertuig.
- **Gedeeld voertuig:** de bestuurder kiest de zender van het voertuig; een passagier volgt hem of kiest voor zichzelf, en kan stemmen (`radiogroup.js`, bericht `zender`, PROTO blijft 2). Een gast hoort wat de bestuurder draait als die zender voor de gast open is; is Veenvuur FM voor de gast "Binnenkort" (de pool komt uit het manifest van de eigen installatie), dan valt hij terug op G-Music. Dat is dezelfde regel als bij de geheime zender, zonder aparte code: `channelById` kent de zender, de gastkant kijkt naar zijn eigen open lijst.
- **Beloning en voortgang:** geen. Er is niets te winnen; luisteren is gratis.
- **Wegvallen of later aansluiten:** een speler die uitstapt of wegvalt neemt zijn stem mee, het voertuig houdt zijn zender, wie later instapt volgt de bestuurder (bestaande regel).
- **Dekking:** `scripts/radiochannels_test.mjs`, `scripts/radiovehicle_test.mjs` en `scripts/radiogroup_test.mjs` (Veenvuur FM in de groepsregel).

## Stand van de nummers

Zie het kopje "Stand van het maken" onderaan: daar staat precies hoeveel nummers echt gemaakt zijn. De code werkt met 0 nummers (Binnenkort) en met elk aantal daarboven.

## Slotregel voor elke prompt

Plak onder de stijlprompt, voor de lyrics: `Sing in Dutch. An original composition, not imitating any existing song, artist or franchise. Clean mix, moderate loudness, no sudden loud peaks.` Houd de lyrics zonder namen van echte artiesten of merken. Weigert Gemini een prompt, haal dan één woord weg en voeg geen context toe. Metal is hard, maar de tekst blijft vrolijk-absurd: geen echt leed, geen geweld, geen echte slachtoffers.

## De nummers (13)

Alle bandnamen zijn verzonnen. Stijl `metal` in `STYLES`; per nummer staat de stijl voor Gemini erbij.

### V1. Veenbrand, door Zware Klei
Stijl: doom/stoner metal, 62 bpm, extreem zware, trage gitaren met veel fuzz, brullende maar duidelijke zang, dreunende bas, een lange, hypnotiserende riff, humoristisch plechtig.

```
[Couplet] De turf ligt in de schuur, de winter is niet hier,
het is zomer, het is zwaar, en de lucht staat in de fik.
Een rij van zwarte kleigrond tot waar het land ophoudt,
de trekker trilt van binnen, en mijn hart is van hout.
[Refrein] Veenbrand, veenbrand, het brandt niet, het klinkt zo,
veenbrand, veenbrand, het hele Hogeland roept: ho!
Veenbrand, veenbrand, de zon staat laag en rood,
ik heb geen haast, ik heb koffie, en dat is meer dan genoeg.
[Brug] Zwaar, zwaar, zwaarder dan een zak aardappelen.
[Refrein] Veenbrand, veenbrand ...
[Outro] Langzaam. Langzamer. Stil.
```

### V2. Zwarte bus naar nergens, door Kleimonster
Stijl: stoner rock/metal, 96 bpm, warme fuzzgitaren, een groovende drum, zwaar maar swingend, zang half gesproken, half geroepen, roadtripgevoel in de zomer.

```
[Couplet] Een zwarte bus, een volle tank, de weg is leeg en breed,
het raam staat wijd, de zon staat hoog, de radio staat op tien.
We rijden naar de dijk en dan nog een stukje verder,
een bord zegt: "Hier niets te zien", en wij zeggen: "Wat een uitzicht."
[Refrein] Zwarte bus naar nergens, nergens is een mooie plek,
zwarte bus naar nergens, en het gaat precies zo hard als het gaat.
Zwarte bus naar nergens, de motor snort als een kat,
en achterin zit niemand, behalve het volume.
[Couplet 2] Een stop bij Zoutkamp, een bakkie en een koek,
de kapitein van de pier zegt: "Jullie zijn ook weer terug."
[Refrein] Zwarte bus naar nergens ...
```

### V3. Over de veenkoloniën, door Terpdonder
Stijl: folk metal, 148 bpm, snelle gitaren, viool en accordeon over zware riffs, meezingbaar refrein met veel mannenstemmen, epische maar vrolijke sfeer, zonnig.

```
[Couplet] Van Veendam naar Stadskanaal een kanaal van water en wind,
daar groeven ze de turf uit en een land dat nooit stilstaat.
De schippers zongen luid, de bruggen gingen open,
elk dorp een rij van huisjes, en iedereen zwaait terug.
[Refrein] Over de veenkoloniën, over de weidse velden,
met een stem als een sirene en een hart als een ketel,
over de veenkoloniën, het land is plat en groot,
en wie hier woont, die weet het: de horizon is van ons.
[Brug] Vioolsolo. Iedereen op de brug stampt mee.
[Refrein] Over de veenkoloniën ...
[Outro] Nog een kanaal, nog een brug, nog een rondje.
```

### V4. Wadlopers van het noorden, door Wadwolven
Stijl: folk metal, 132 bpm, doedelzak-achtige fluit en gitaren, groot koor, epische slag-trommels, verhalend over het waddenlopen, zonnig en energiek.

```
[Couplet] Laag water, laarzen aan, de modder is een spiegel,
de wadloper loopt voorop met een stok en een kompas.
Een schelp in elke zak, een zandkorrel in de schoen,
de zee komt straks weer terug, maar nu is het ons pad.
[Refrein] Wadlopers, wadlopers, we lopen door de zon,
wadlopers, wadlopers, de horizon is een rij van lichtjes.
Zee, wij zijn er eerder, zee, wij gaan weer weg,
mien Grunn is aan de overkant, en iedereen is mee.
[Brug] Alles stil. Het wad ademt. Dan weer: hup.
[Refrein] Wadlopers, wadlopers ...
```

### V5. Stalen stuur, door Stalen Stuur
Stijl: power metal, 170 bpm, razendsnelle gitaren, dubbele basdrum, hoge zang met heldhaftige koren, groot melodisch refrein, filmisch, grappig-episch over een fietsachtervolging.

```
[Couplet] Een fiets, een brug, een bakkie in de hand,
de dief rijdt weg op een step, maar ik ben sneller dan de wind.
Mijn ketting zingt een lied, mijn bel is van metaal,
vandaag ga ik hem pakken, op de Hereweg, in de zon.
[Refrein] Stalen stuur, stalen stuur, ik trap tot aan de top,
stalen stuur, stalen stuur, niemand houdt mij tegen.
Trap, trap, trap, de wereld is een rechte lijn,
en achter mij de stad, en voor mij de brug die opengaat.
[Brug] Rem. Draai. Slip. Nog een keer.
[Refrein] Stalen stuur, stalen stuur ...
[Outro] En hij kreeg zijn bakkie terug. Einde verhaal.
```

### V6. Sprint naar de brug, door Stalen Stuur
Stijl: power metal, 184 bpm, zeer snelle gitaarsolo's, dubbele basdrum, hoge zang, heldhaftig, een volle zomerse sfeer, humoristisch-episch over een achtervolging door de stad.

```
[Couplet] De brug gaat omhoog, de wachter kijkt omlaag,
ik rij vooruit en hoop dat hij nog even wacht.
Een rij van fietsen achter mij, een scooter naast mijn wiel,
we zijn een leger van pedalen, vandaag is het een race.
[Refrein] Sprint naar de brug, sprint naar de brug,
de zon staat op mijn rug en de wind is aan mijn kant!
Sprint naar de brug, sprint naar de brug,
hij is open, hij is dicht, het is een spel van tellen.
[Brug] Gitaarsolo, dan een bel, dan nog een solo.
[Refrein] Sprint naar de brug ...
```

### V7. Ballade van de lege tank, door Ridder Roelof en de Roestbak
Stijl: komisch-epische powerballad, 74 bpm, begint met een piano en een schorre gitaar, groeit uit tot een groot refrein met koor en een lange, overdreven gitaarsolo, zanger zingt met veel gevoel en een knipoog, zonnig.

```
[Couplet] Daar stond hij dan, de ridder, naast zijn roestige koets,
de tank was leeg, de zon stond hoog, het dorp was nog zo ver.
Hij schopte tegen het wiel, hij keek de hemel in,
en zei: "Waarom, o hemel, nu, vlak voor het tankstation?"
[Refrein] O, de tank is leeg, de tank is leeg, mijn hart is ook een beetje leeg,
maar ik ben nog niet verloren, want de pomp is niet zo ver.
O, de tank is leeg, de tank is leeg, zing mee met mij omhoog,
wie ooit een liter tekort kwam, die weet precies wat ik bedoel.
[Brug] De solo duurt vier minuten. De tank blijft leeg. Het is mooi.
[Refrein] O, de tank is leeg ...
[Outro] Hij liep. Het was maar twee kilometer. Hij had er spijt van.
```

### V8. Riff van de Ringweg, door Zware Klei
Stijl: instrumentale riff-sting, 30 seconden tot 1 minuut, zware gitaarriff met een korte drumfill en een afsluitende gong, voor een jingle of een tussenstuk, geen zang.

```
[Instrumentaal] Geen tekst. Een zware riff, vier maten, een fill, een laatste slag.
```

### V9. Trekker van staal, door Kleimonster
Stijl: stoner metal, 88 bpm, zware gitaren met fuzz, een groovende bas, een hypnotiserende riff, zang laag en rustig, een dreunende drum, trots en een beetje grappig, zonnig.

```
[Couplet] Hij komt over de dijk, een trekker van staal,
de banden zo groot als een huis en de motor zo zacht als een kat.
De boer zit op zijn troon, een pet op, een pijp in zijn mond,
en hij rijdt een rij van lijnen, en de akker is een lied.
[Refrein] Trekker van staal, trekker van staal,
hij gromt als de grond en hij glimt als de zon.
Trekker van staal, trekker van staal,
niemand haalt hem in, want niemand heeft zo veel tijd.
[Outro] Rij maar door, rij maar door, rij maar door.
```

### V10. Mijn moeder vindt het mooi, door Mama Metaal
Stijl: komische metal, 142 bpm, snelle gitaren, schreeuwerig refrein, een knipoog in elke zin, zang met veel overdrijving, vrolijk en schreeuwerig, zomers.

```
[Couplet] Ik speel mijn gitaar zo hard dat de koeien omkijken,
mijn moeder staat in de keuken en klopt de tijd op de pan.
Zij zegt: "Jongen, nog even, dan is het eten klaar,
en zet de versterker op drie, want de buurman heeft een jarige."
[Refrein] Mijn moeder vindt het mooi, mijn moeder vindt het mooi,
ik schreeuw het uit mijn longen en zij zegt: "Goed zo, jongen."
Mijn moeder vindt het mooi, mijn moeder vindt het mooi,
en na het laatste akkoord is er altijd nog een koekje.
[Brug] Solo. Moeder klapt. Nog een solo. Moeder klapt harder.
[Refrein] Mijn moeder vindt het mooi ...
```

### Theatrale alt-rock (aanvulling eigenaar, 22-11): V11 tot en met V13

Stijl voor deze drie, in eigen woorden: theatrale, progressieve alt-rock met falsetzang, snelle gebroken-akkoord-gitaarriffs en synthesizer-arpeggio's, een dramatische opbouw naar een groot refrein, een apocalyptisch-romantische sfeer met een knipoog. Er wordt in prompts, titels, teksten en docs geen echte band of artiest genoemd of nagebootst; de artiest is verzonnen (Hemelhoog Hendrik en het Weidse Orkest) en de melodie en tekst zijn origineel. Het onderwerp is bewust de lucht, de dijk en het weer; de eigenaar noemde als voorbeeld ook het gas en de aarde die beeft. Dat laten we weg: gaswinning is een gevoelig onderwerp (constitution 6, alleen met een verzonnen bedrijf en nooit een echt slachtoffer als grap) en een liedje over trillende huizen is dat in een metalzender niet waard. Wil de eigenaar het toch, dan is dat een eigen besluit met een verzonnen bedrijf (Delfstof Noord) en zonder slachtoffers.

### V11. Alle lucht van Groningen, door Hemelhoog Hendrik en het Weidse Orkest
Stijl: theatrale progressieve alt-rock, 126 bpm, falsetzang, snelle gebroken-akkoord-gitaarriffs, synthesizer-arpeggio's, een langzame, dramatische opbouw naar een enorm refrein, apocalyptisch-romantisch maar zonnig.

```
[Couplet] De lucht is hier zo groot dat je er een week in kwijt kunt raken,
een wolk rolt over de akker alsof hij ergens naartoe moet.
Ik sta op de dijk met een thermosfles en een stoel,
en de horizon trekt zijn jas aan en gaat langzaam weg.
[Opbouw] Hoger, hoger, hoger, de synthesizers stijgen mee.
[Refrein] Alle lucht van Groningen, alle lucht is van ons,
het einde van de wereld ligt vlak achter de hoek, het is mooi!
Alle lucht van Groningen, laat de wolken maar komen,
wij zitten op de dijk en we zingen tot de zon opkomt.
[Brug] Stil. Een enkele toon. Dan de hele band tegelijk.
[Refrein] Alle lucht van Groningen ...
```

### V12. De laatste storm op de dijk, door Hemelhoog Hendrik en het Weidse Orkest
Stijl: theatrale progressieve alt-rock, 138 bpm, falsetzang, strakke gebroken akkoorden op de gitaar, snelle synthesizer-arpeggio's, een groot koor in het refrein, dramatisch en romantisch, een zomerstorm die nooit echt komt, met humor.

```
[Couplet] Het wordt vanavond onweer, zegt de buurman met zijn pet,
de lucht wordt grijs en purper, het windje trekt aan mijn mouw.
Ik zet een stoel op de dijk en ik wacht op de ondergang,
maar de storm blijft steken bij Delfzijl en de zon komt weer terug.
[Refrein] Dit is de laatste storm, de allerlaatste storm van de zomer,
zet de gitaren op tien, het is de grootste teleurstelling!
Dit is de laatste storm, wij zingen hem toch maar toe,
en de regen blijft weg, maar het refrein regent door.
[Brug] Een arpeggio, een donderslag van de bas, een stilte.
[Refrein] Dit is de laatste storm ...
```

### V13. Sterrenhemel boven het wad, door Hemelhoog Hendrik en het Weidse Orkest
Stijl: theatrale progressieve alt-rock, 110 bpm, falsetzang, gebroken akkoorden op een heldere gitaar, glinsterende synthesizer-arpeggio's, een traag begin dat groeit tot een groot, hemels refrein, apocalyptisch-romantisch en warm.

```
[Couplet] Laag water, laat licht, de lucht wordt langzaam donker,
een miljoen kleine lampjes boven het wad.
We liggen op een deken, de wereld draait een beetje mee,
en iemand zegt: Zo groot is het, en iemand zegt: Zo stil.
[Opbouw] De synthesizers klimmen, de drums komen binnen.
[Refrein] Sterrenhemel boven het wad, de wereld houdt haar adem in,
sterrenhemel boven het wad, wij zijn heel klein en dat is goed.
Sterrenhemel boven het wad, de ondergang kan wachten,
vannacht is alles mooi, en morgen is het weer zomer.
[Outro] Een laatste toon die langzaam uitdooft.
```

## Koppelen zodra de tracks er zijn (per nummer)

1. Download de mp3 in een eigen lege map, controleer duur (1,5 tot 4 minuten; de riff-sting mag korter) en ruis of pops. Zet om naar 128 kbps met hetzelfde niveau als de bestaande nummers (zelfde werkwijze als de tweede stap van commit `309931c30`: `ffmpeg -i in.mp3 -b:a 128k -af loudnorm=I=-16:TP=-1.5 uit.mp3`, daarna de meting naast een bestaand nummer).
2. Zet hem als `game/audio/gmusic/<Titel_met_underscores>.mp3`.
3. Voeg een regel toe in `game/audio/gmusic/manifest.json`: `{ "file": "...", "stations": ["veenvuur"], "nieuw": true }` (niet `gmusic`: dan komt het tussen de hits).
4. Voeg de bestandsnaam (zonder `.mp3`) toe aan `STYLES` in `game/js/radiochannels.js` met `['metal']`, en de artiest in `GMUSIC_ARTISTS` in `game/js/audio/radio.js`.
5. Werk de tellingen bij (`docs/LICENTIES.md`, `docs/LEGAL-AI-ASSETS.md`, `docs/MUZIEK.md`, `CHANGELOG.md`) en draai `node scripts/spec_check.mjs --write`.
6. Geen dubbele nummers: vergelijk de nieuwe bestanden met de bestaande op duur en hash voordat je koppelt.

## Stand van het maken

Er zijn **13 prompts** klaar (V1 tot en met V13) en **6 nummers echt gemaakt** met Gemini ("Muziek maken", via de Claude-in-Chrome-extensie, eigenaar ingelogd). Alle zes zijn aan Veenvuur FM gekoppeld. Niets is beluisterd; de eigenaar moet ze horen en zo nodig weer uit het manifest halen.

| Prompt | Titel (door Gemini gegeven) | Act in het spel | Duur | Niveau (128 kbps) | sha256 (16) |
|---|---|---|---|---|---|
| V1 Veenbrand | Veenbrand | Zware Klei | 2:40 | -12,3 LUFS | `64b9a38747bd8336` |
| V2 Zwarte bus naar nergens | Zwarte bus naar nergens | Kleimonster | 2:32 | -12,1 LUFS | `f72036c26f91f531` |
| V3 Over de veenkoloniën | Bruggen van turf en wind | Terpdonder | 2:37 | -11,5 LUFS | `7f53d5dc2db3b581` |
| V5 Stalen stuur | Vlucht over de Hereweg | Stalen Stuur | 2:30 | -11,5 LUFS | `37e30aa9316bc6d1` |
| V7 Ballade van de lege tank | Ridder zonder benzine | Ridder Roelof en de Roestbak | 2:33 | -11,5 LUFS | `70edde1ceb5db407` |
| V11 Alle lucht van Groningen | De horizon trekt zijn jas aan | Hemelhoog Hendrik en het Weidse Orkest | 2:51 | -11,7 LUFS | `5538044f463f101e` |

- **Gekoppeld:** in `game/audio/gmusic/` (128 kbps, 44,1 kHz stereo, zonder versterking: de bestaande nummers meten -11,9 tot -12,4 LUFS, deze -11,5 tot -12,3), in `manifest.json` met `"stations": ["veenvuur"]`, in `STYLES` met `['metal']` en in `GMUSIC_ARTISTS`. `MUSIC_STATIONS` (`musicpick.js`) kent nu `veenvuur`: een nummer met dat station staat niet op het station `gmusic` of `nachtstreek`, dus metal komt nooit tussen de G-Music-hits. De ruwe downloads en de omgezette bestanden staan ook in `C:\Users\abuis\gde-metal-22-11\` (`raw\`, `out\`).
- **De grens:** zes is `MIN_POOL`. Haalt de eigenaar één nummer weg, dan is Veenvuur FM weer "Binnenkort" en blijft de wereldradio staan in vrachtwagen, bus en kluiswagen. Liever acht voor afwisseling: V4, V6 tot V10, V12 en V13 staan klaar.
- **Mislukt of niet geprobeerd:** V2 gaf bij de eerste twee pogingen "I seem to be encountering an error" (een generieke Gemini-fout, geen weigering) en lukte bij de derde; V3 en V11 gaven eerst een tekstantwoord of bleven hangen (de pagina was nog niet geladen of de muziekmodus stond niet aan) en lukten bij een nieuwe poging met de modus gecontroleerd. V4 gaf een tekstantwoord ("kan momenteel geen audio genereren") omdat de muziekmodus was weggevallen en is niet herhaald; V6, V8 tot V10, V12 en V13 zijn niet geprobeerd. Niets is omzeild of herschreven om een blokkade te passeren.
- **Auteursregel:** Gemini-muziek heeft geen auteur-handle zoals Freesound; de herkomst is "Google Gemini, muziekgeneratie, eigenaar-account, 22-11-2026, originele tekst en stijlprompt uit dit document". `docs/AUDIO-LICENTIES.md` wordt gegenereerd uit het geluidenmanifest (alleen sfx met Freesound-auteurs) en is hier daarom niet bewerkt; de muziekherkomst staat in `docs/LEGAL-AI-ASSETS.md`.
