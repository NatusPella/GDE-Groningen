# Cutscene-animatie (20-11)

Werkdocument bij het idee van de eigenaar (#955, #956): andere games gebruiken mocap, wij niet, maar de missies en vooral de cutscenes kunnen veel meer animatie krijgen, specifiek per missie, zodat de scènes (ook die met de kat) filmischer worden. Dit document is de audit van wat er was, het ontwerp van wat erbij is gekomen en wat nog niet is gezien. Code: `game/js/poseclips.js`, `cuegestures.js`, `cineshots.js`, aanpassingen in `cutscript.js`, `cutscenehost.js` en `cutscenes_akte1.js`. Samen spelen: zie [COOP-GAST.md](COOP-GAST.md).

## 1. Audit: wat bestond er

**Figuren.** `actoranim.js` (de animatielaag van een acteur, puur): 20 standaardnamen (`ANIMS`: idle, walk, run, talk, wave, point, shrug, nod, shake, laugh, carry, lean, hips, phone, cheer, look, ride, zwem, klim, sprong), acht reacties (schrik, lach, schouders, knik, schud, wijs, juich, zwaai: elk een korte, vaste vorm met een envelop), zes gebaren die tijdens praten aan de regeltijd hangen (open, beide, wijs, hakken, knik, schouder), vijf rustpostures en vier vaste houdingen (carry, lean, hips, phone). Alles werkt op de botten van `buildPersonMesh()`: bekken, romp, hoofd, twee armen met elleboog, twee benen met knie. Een acteur heeft een eigen staat met een `dt`, een willekeurige idle-variatie en een zaadje.

**Dieren.** De wereld-AI animeert de kat in `wildlife.js` (`animateQuad`: lopen, zitten, poetsen, aaien) op de botten body, head, tail en vier poten. In een cutscene was de kat alleen een prop: hij stond stil op zijn plek, zonder één beweging (alleen duiven sloegen met hun vleugels). Er is niets voor Sien in de scènes van akte 6.

**Opbouw van een cutscene.** Een scène is data (`cutscript.js`): `actors` (look, plek, richting, anim, zithoogte), `props` (voertuigen en dieren uit de wereld, losse voorwerpen), `cues` (`{ t, actor | prop, walk | anim | face | gaze | carry | drop | sit | show | hide | move | path | spin | bob }`), `shots` (camera: cut, dolly, orbit, follow, close, reaction, ots, insert, tracking, crane, handheld), een binnenset (`set`), een publiek (`crowd`) en effecten (`fx`). Tijden zijn seconden of `L<n>+dt`, relatief aan het begin van gesproken regel n. De gesproken regels komen uit het verhaal (`script.json`, met de opname-duur van de TTS als `at` en `dur`), nooit uit de scène. `cutscenes_akte1.js` `missionScene()` maakt uit een spec (`cast`, `props`, `beats` op regeltekst, `shots`, `wide`) zo'n definitie met automatische dekking: per regel een gebaar uit een lijst, luisteraars die zich omdraaien en knikken, een nieuw camerabeeld bij een nieuwe spreker. `cutscenehost.js` tekent de scène elk beeld uit `scene.sample(t)`. `cinetemplates.js` is, anders dan de naam doet vermoeden, het racesjabloon (start, finish, publiek), geen algemene shotbibliotheek.

**Geluid en ondertitels.** `cutaudio.js` plant het geluid van rijdende voertuigen, fiets en duif uit de definitie; `fx` met `sfx` zet losse geluiden op een regel; de ondertitels en de stem volgen de regeltijd van het verhaal. De camera kent de spreker (`look: 'speaker'`).

## 2. Audit: tellingen voor het werk (108 scènes met een scènebeschrijving)

Alle scènes gesampeld per 0,2 s (`node scripts/cutscenes_anim_audit.mjs`): 108 scènes, samen 4117 s, 17.664 acteur-seconden. Aantallen per mission: M26 heeft er 12, M18 en M23 zes, M30 vijf, de overige 1 tot 4; daarnaast de opening (3 aktes), de kaart, de avond en acht wijkintochten.

| standaardanimatie | acteur-seconden | aandeel | cues |
| --- | --- | --- | --- |
| idle | 5821 | 33,0 % | 1178 |
| nod | 5002 | 28,3 % | 1170 |
| look | 1275 | 7,2 % | 269 |
| shrug | 1171 | 6,6 % | 313 |
| hips | 1086 | 6,1 % | 286 |
| point | 991 | 5,6 % | 275 |
| talk | 806 | 4,6 % | 515 |
| walk | 406 | 2,3 % | 0 |
| carry | 270 | 1,5 % | 1 |
| cheer | 173 | 1,0 % | 47 |
| ride | 169 | 1,0 % | 0 |
| shake | 155 | 0,9 % | 52 |
| phone | 117 | 0,7 % | 23 |
| laugh | 110 | 0,6 % | 30 |
| lean | 77 | 0,4 % | 11 |
| wave | 35 | 0,2 % | 15 |

Bijna twee derde van alle acteurtijd is dus idle of knikken. Dat komt door de automatische dekking: elke luisteraar krijgt op de oneven regels een `nod` en blijft anders idle. Van de 17.664 acteur-seconden is 7903 s (45 %) echt stil: idle, praten of kijken zonder beweging of gebaar. De stilste scènes in absolute zin (seconden stil, met het aandeel): M30.intro (466 s, 51 %), M26.13 (346 s, 51 %), M21.4 (283 s, 59 %), M16.outro (255 s, 53 %), M03.2 (239 s, 38 %), M15.outro (204 s, 70 %), M03.outro, M26.6, M20.outro, M20.3. Het meest stil zijn de grote groepsscènes (veel omstanders die alleen af en toe kijken of knikken) en de lange gesprekken op één plek.

Kat: M27.2, M28.intro, M28.outro en M29.intro hebben een kat als prop. Die bewoog niet.

## 3. Wat er is gebouwd

**Pose-clips (`poseclips.js`).** Een clip is een compacte tabel: per kanaal hoeken per keyframe, op genormeerde tijd `u` 0..1, met easing per keyframe (smooth, lin, in, out, back, step), een duur of periode, `loop`, `hold` (de eindpose blijft tot de volgende clip), een in- en uitrampe, en spiegelen. Kanalen voor een mens: `head`, `chest` (x, y, z), `armL`, `armR` (x zijwaarts, z heffen, e elleboog), `legL`, `legR` (heup, knie), `pelvis` (zakken, zijwaarts, kanteling, draaiing); voor een dier: `body`, `head`, `tail`, `legs`. Een kanaal dat een clip niet noemt, blijft van de basislaag (idle, lopen, praten, zitten): de clip weegt mee volgens zijn rampe en een kanaal wordt per bot naar de clipwaarde toe gemengd (`applyClipsHuman`). Loopt, zit of draagt de acteur iets, dan gebruikt de clip alleen hoofd, romp en armen. Twee clips achter elkaar vloeien in elkaar over (`clipLayers`); een onbekende clip geeft geen laag en dus de basislaag; `anim: 'stop'`, een loopcue of gaan zitten laat een vastgehouden clip los.

**De bibliotheek.** 47 clips voor figuren: wijzen, zwaaien, schouderophalen, rondkijken, omkijken, schrikken, gieren, juichen, verontwaardigd, aarzelen, nadenken, zuchten, opgelucht, duimen, buigen, groeten, wegwuiven, fluisteren, smeken, aanraken, pakken, geven, dooropenen, telefoneren, typen, eten, drinken, proosten, koken, kloppen, tillen, bukken, omhelzen, highfive, handenschudden, applaus, wiegen, dansen, muziekmaken, dirigeren, hurken, knielen, struikelen, omvallen, sprintstart (rennen weg), opstaan en ontspannen (zitten achterover). En 11 voor de kat: kat-staan, kat-lopen, kat-zitten, kat-poetsen, kat-springen, kat-kopje (kopje geven), kat-spinnen, kat-schrikken, kat-slapen, kat-schoot, kat-kijken.

**De cue.** In een cutscript: `{ t, actor, anim: '<clip>', dur, delay, speed, mirror }`, en voor de kat `{ t, prop: 'kat', anim: 'kat-zitten' }`. In een spec van een missie staat hetzelfde in een beat: `{ on: 'Hij wil nergens in', dt: 0.3, prop: 'kat', anim: 'kat-poetsen', dur: 3.5 }`. De clip speelt boven de basisanimatie (praten, idle) en telt voor de validator als leven (geen 'staat stil'). Onbekende namen blijven een fout in de validator (typfouten vallen op); tijdens het spelen valt een verdwenen clip veilig terug op de basislaag.

**Automatische gebaren (`cuegestures.js`).** Bij elke regel kiest `missionScene()` een clip die bij de tekst past: een vraag een open hand, een uitroep een vinger of verontwaardiging, een aarzeling (…) een zucht, een lange regel een wijsgebaar of een gegeven; luisteraars nadenken, zuchten of rondkijken bij ongeveer twee van de vijf regels. Deterministisch uit tekst, personage en regelnummer, dus host en gast kiezen hetzelfde. Een beat die de auteur rond die regel voor die acteur schreef, wint; een vastgehouden clip wordt niet overschreven; `noClips: true` in een spec zet de laag uit.

**Regie (`cineshots.js`, shot `push`).** Tien sjablonen die de bestaande shotgrammatica gebruiken en de figuren zelf volgen (dus zonder maten): tweeshot, shotReverse (schouder-tegenschouder), closeGezicht, closeHanden, insertProp, trackIn, lageHoek, schrikNadering (kwadratisch naar voren met trilling), langzameZoom (de lens loopt dicht bij emotie) en wachtOpReactie. Het nieuwe shot `push` (afstand, lens en hoogte van A naar B, om een acteur of voorwerp) draagt die sjablonen. De camera blijft 1,5 m van elk figuur; close-ups komen dus van een lange lens. In een spec: `cuts: [{ on: 'Zeven mensen', tpl: 'langzameZoom', target: 'tessa', hold: 4 }]`; de sjablonen vervangen de automatische dekking in hun bereik en de cuts vallen op de regeltijd (en dus op de TTS-duur).

**Samen spelen.** Gedeeld, zonder extra netwerkverkeer: de clips zijn een vaste functie van de scènetijd (geen `dt`, geen willekeur) en staan als cues in de scènebeschrijving die de gast al krijgt (`coopcut.js`). Een gast die later aansluit speelt verder vanaf de scènetijd. Beloning en voortgang veranderen niet. Het scenepakket groeit: de grootste scène is nu 22.700 van 32.000 tekens (`node scripts/cutscenes_pakket_test.mjs` bewaakt dat voor elke scène).

**Kosten.** Alles procedureel op de bestaande botten: geen assets, geen nieuw shaderprogramma, geen licht, geen extra geometrie. Twaalf acteurs met een clip kosten 0,063 ms per beeld (5 us per acteur, `node scripts/poseclips_bench.mjs`). De kat krijgt een stille staart (`kat-staan`) als er niets gecued is; dat is één bot-update per beeld.

## 4. Toegepast

- **Opening** (`cutscenes.js`): de buurvrouw telefoneert lopend, de postbode zwaait echt, in de keuken krijgen Tessa en Tammo per regel een eigen gebaar (nadenken, schouderophalen, wijzen, duimen, zuchten, verontwaardigd, rondkijken, aarzelen, geven; de inhoud en de camera blijven zoals de eigenaar ze kende), op verhuisdag verontwaardigd, wijzen, zuchten en opgelucht.
- **Akte 1:** M01.intro (Berend): track-in op zijn gips, schouder-tegenschouder met Tammo bij "Niet zo hard", langzame zoom bij "Nul krassen", close-up bij Tammo's antwoord; M02.intro: track-in op Tessa en een schrikkende nadering bij de politieauto; M03.intro: nog niets vervangen, de rest van de scènes (alle 108) krijgt de automatische gebaren.
- **Sien en de kat (akte 6):** M27.2 (de kat zit en weigert, Tammo knielt erbij, de kat poetst, geeft kopjes en spint), M28.intro en M28.outro (kijken, zitten, poetsen, spinnen; Willemien en Tammo schudden elkaar de hand), M29.intro (Tessa knielt bij de kat die eerder terug was; hij valt aan het eind in slaap).
- **Slot (M30.intro, iedereen komt samen):** inhoud en regels ongemoeid; bij "Aanvallen." juicht en applaudisseert het hele gezelschap, op getrapte momenten, en bij "Zeven mensen" loopt de lens langzaam dicht op Tessa.

Zo hergebruik je een clip in een andere scène: één beat met `anim: '<naam>'` (en eventueel `dur`, `delay`, `mirror`); een sjabloon met `cuts`; de namen staan bovenaan in `poseclips.js` (`CLIPS`, `CAT_CLIPS`) en in `cineshots.js` (`SHOT_TEMPLATES`).

## 5. Na de audit: de cijfers

Met de automatische gebaren en de clips (zelfde meting): 3686 acteur-seconden hebben een clip (met `nadenken` te lang vastgehouden; na de reparatie 2253 s), de stille seconden dalen van 7903 naar ongeveer 6800. `idle` en `nod` blijven de basis, omdat korte regels (onder de 24 tekens) en omstanders bewust rustig blijven. Volgende ronde: omstanders in de groepsscènes (M30, M26, M21) eigen kleine routines geven, en de gesprekken met één figuur (M15.outro, 70 % stil) uitwerken.

## 6. Wat niet is gezien

- De scènes in het echte spel (Electron, echte wereld, echte binnensets en voertuigen) zijn nog niet bekeken: de Electron-run kreeg geen slot (geheugen). Wel gezien, in een los 3D-scherm zonder wereld met de echte figuren, de echte kat en de camera van de scène (`scripts/qa/cutscene_frames.html`, serveer met `scripts/qa/serve_static.mjs`; voertuigen zijn daar blokken, binnensets ontbreken): M27.2 (Tammo knielt bij de kat, de kat zit, poetst en geeft kopjes), M01.intro voor en na (de zijdelingse track-in op Berend), M30.intro (iedereen juicht bij "Aanvallen.", de zoom op Tessa). Het contactblad (`scripts/qa/poseclips_beeld.html`) toont alle 47 mensenclips en 10 katclips op hun middelste moment, van voren en van opzij. Dat leverde een echte fout op: romp en hoofd draaiden de verkeerde kant op (`z` > 0 is achterover); dat is hersteld en opnieuw gezien. Bewegingen als reeks zijn alleen als losse beelden bekeken.
- De camerasjablonen zijn in de test en de audit gecontroleerd (geen camera in een figuur, spreker in beeld) en voor drie scènes in het losse scherm bekeken. Les uit die beelden: de gesprekspartner staat recht voor een gezicht, dus de sjablonen kijken standaard van opzij (45 graden); `angle` kiest de kant (negatief: rechts).
- Knielen en hurken: de voeten kunnen iets in de grond of eroverheen staan; niet gemeten.
- Sien heeft in de wereld geen eigen naam in de code; de scènes noemen "de kat". Een naam in de scènetekst is niet toegevoegd (geen tekstwijziging met TTS-koppeling).
- Geen enkele clip is met een gast (Samen spelen) gespeeld; de gelijkheid volgt uit de test (zelfde scènetijd, zelfde cues).

## 7. Beeld uit het echte spel (Electron met wereld)

Run: `scripts/qa/cutscene_shots.mjs` via de slot-wrapper op de opening (keuken), M01.intro, M02.intro, M03.intro, M27.2 en M30.intro, 98 stills (één per camerastand), cutscenehost.js met de echte wereld, figuren, kat en camera. Het script kreeg drie reparaties om bruikbaar beeld te geven: een profielmap onder de uitvoermap (de %TEMP%-map was niet schrijfbaar), `GDE_NO_THROTTLE` en de achtergrond-vlaggen (zonder die vlaggen waren 76 stills dezelfde afbeelding), en `GDE_EXTRA_FLAGS`. Zes tot acht beelden staan in `docs/beeld-20-11/cutscenes/`.

**Gezien en goed:** Tammo knielt bij de kat terwijl de kat staat of zit (M27.2, het knielen met de echte rig); Tessa met beide armen omhoog bij "Aanvallen." en de omstanders die juichen (M30.intro); de kat als echte wereldmesh met staart en poten; Tessa met een uitgestrekte arm (wijzen). Alle 98 stills zijn verschillend (geen bevroren beeld), 0 NaN-regels en 0 renderer-fouten in de log.

**Gezien en gerepareerd:** het applaus (`applaus`) stond met rechte armen in een T-vorm; nu zitten de ellebogen gebogen en klappen de handen voor de borst (opnieuw gezien in M30.intro).

**Gezien en niet door mij te repareren (voor de eigenaar):**
- Het vaste testpunt van de run (Grote Markt, 200.8 / 45.4) heeft een fietsroutebord en lantaarnpalen die in meerdere standen door of voor een figuur staan (M01, M27.2, M30). Dat is wereldmeubilair op die plek; in het spel staat een scène op de plek van de missie, waar het anker bomen mijdt maar geen bord of paal. Een camera die een paal als "voorgrondobject" krijgt, is een bestaande beperking van `fitAnchor`, geen gevolg van de gebaren.
- De keukenset staat in deze run in de open straat (de deur staat midden op het plein); in het spel staat hij in de flat. De zittende figuren aan tafel (de gebaren van Tessa en Tammo in de keuken) zijn dus niet in de echte keuken gezien.
- Willemiens armen bij een gebaar met beide handen (`geven`, `handenschudden` met `mirror`) kruisen in één stand als twee gelijke stroken; de hoeken kloppen, maar een low-poly mouw leest daar slordig. Geen oplossing zonder eigen beeld per clip.

**Niet gezien:** acteurs in de lucht en clipping van figuren met voertuigen (de scènes in deze run hebben er geen of nauwelijks); hapering bij cuts (geen fps-meting in een beeldrun, die mag niet naast een tweede instantie); het slot-gevoel van de gebaren als beweging (alleen stills).

