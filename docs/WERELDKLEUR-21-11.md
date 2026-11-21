# Wereldkleur: een subtiele DS3-kleurtaal voor de 3D-wereld (21-11)

Bij de vraag van de eigenaar (21-11): "Ik zag in de kleuren van de wereld nog weinig terugkomen dat op een subtiele manier aansluit op ons Design System v3. Kunnen we dat doen? Of eventueel via color grading of zo?"
Bouwt voort op [WERELDKLEUREN-21-11.md](WERELDKLEUREN-21-11.md) (de materiaalmenging, `WERELD_DS_MENG`). Naslag voor ADR [0040](../.specs-fire/standards/adr/0040-zomerse-zeefdruk-als-designsysteem.md) en [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md).
Verificatie en draaiboek voor de Electron-sweep: [WERELDKLEUR-VERIFICATIE-21-11.md](WERELDKLEUR-VERIFICATIE-21-11.md).

## 1. Wat er was

- **Materiaalkleuren:** `worldpalette.js` trekt elke kleur op het moment dat hij wordt vastgelegd (gevels, gras, wegdek, water, kaart) een stuk naar de inkten van het designsysteem, met per rol een gewicht (`bouw`, `steen`, `weg`, `donker`, `groen`, `loof`, `water`, `blauw`, `papier`, `geel`, `roze`). Eén globale menging, 0,4.
- **Licht en lucht:** `daynight.js` (`KEYS` per zonshoogte: zon, hemisfeer, zenit, horizon, mist, saturatie, contrast, schaduw- en lichttint, bloom, vignet). Alleen schaduwtint, grondweerkaatsing en dagmist kregen een inkttint.
- **Tonemapping en nabewerking:** `postfx3d.js`. Laag tekent rechtstreeks (ACES in een kleine uitvoerpass); Midden en hoger hebben één grade-pass (ACES, saturatie, contrast, tinten, vignet, helderheid); Hoog en Ultra voegen bloom toe in dezelfde pass. De grade-pass bestond dus al; er is geen nieuwe pass nodig.
- **Wat ontbrak:** het licht zelf was neutraal-wit en daglucht-blauw; geen papiertoon in het licht, geen inkt in de schaduw, geen drukwerk-textuur, en de stand was niet instelbaar.

## 2. Kleurkaart: welke token bij welk wereldelement

| Wereldelement | Token (richting) | Hoe | Reserve |
|---|---|---|---|
| Licht, horizon, mist (dag) | papier `f3ead3` | lichttint en mist/horizon op dezelfde helderheid richting papier | nacht: nauwelijks |
| Schaduw | inktblauwgroen `1f4654` (het water-inkt) | schaduwtint, nooit zwart of kou | altijd zomer: alleen een hint |
| Zenit | inktblauw | op dezelfde helderheid, lucht wordt inktiger, niet bleker | |
| Grondweerkaatsing | papier | warme teruggekaatste straat | |
| Gras, akker, polder | bordgroen gemengd met papier (`bordzacht`) | rol `groen` en `loof` (materiaal) | geel blijft voor droog gras en doelen |
| Water | inktblauwgroen | rol `water`, `blauw` (materiaal) | |
| Asfalt, straten | inkt `1d1b17` | rol `weg` | helderheid blijft: wegen blijven leesbaar |
| Bakstenen, gevels, daken | papier (crème), baksteenrood | rol `bouw`, `roze` | helderheid blijft in lineair licht |
| Voertuigen, NPC's, luifels | levendiger palet | alleen een zachte trek van geel en roze (maximaal 25% en 30%) | accenten blijven accent |
| Doelen en markers | geel (gereserveerd: 'volg dit') | de wereld komt het geel niet dichter | test: geen wereldkleur lijkt erop |
| Gevaar, politie | rood en politieblauw | worden niet getrokken (verzadigd blauw valt buiten de rollen) | |

De kleurplaat met hex per categorie staat in [beeld-21-11/wereldkleur/kleurplaat.html](beeld-21-11/wereldkleur/kleurplaat.html). De dataset van de grading (`GRADE_DAYPARTS`, `GRADE_WEATHER` in `game/js/worldgrade.js`) verwijst naar de tokens (`WERELD_INKTEN`); er staat geen losse hex in (de test bewaakt dat).

## 3. De pijplijn

Alles zit in nieuwe, kleine modules; `scene3d.js` kreeg twee regels (3880 regels, ruim onder 4500).

| Module | Wat |
|---|---|
| `worldcolormode.js` | De stand (`uit`, `subtiel`, `drukwerk`), de sterkte per stand en het lezen van de opgeslagen stand. Blad. |
| `worldgrade.js` | Pure rekenmodule: het dagprofiel per zonshoogte (middag, ochtend, gouden uur, avond, schemering, nacht), de weermodifiers (bewolkt, mist, onweer), `gradeParams(ctx)` en `gradePixel` (dezelfde wiskunde als de shader, voor tests en benaderde beelden). |
| `worldgrade3d.js` | Past de parameters toe op `computeLighting` (saturatie, contrast, tinten, mist, horizon, zenit, grond) vóór een cutscene-stemming, zodat een cutscene zijn eigen grading houdt. Geen allocaties per beeld. |
| `postfx3d.js` | Twee uniforms (`uRaster`, `uKorrel`) en een korte tak in de bestaande grade-pass. |
| `worldpalette.js` | De menging volgt de stand; geel en roze hebben een maximum; `matchLuma` rekent nu in lineair licht. |

**Per kwaliteitsstand (standaard, alle drie de standen van Wereldkleur):**

| Kwaliteit | Wat | Extra kosten |
|---|---|---|
| Laag | alleen de materiaalkleuren (vast bij het bouwen) | geen: er is geen grade-pass en die komt er niet |
| Midden | + licht, mist, horizon, zenit, schaduw- en lichttint, saturatie en contrast (via de lichtkleuren en de bestaande grade-pass) | geen extra pass, geen extra shaderinstructies: alleen andere uniformwaarden; ongeveer 20 vermenigvuldigingen op de CPU per beeld |
| Hoog en Ultra | + een rasterhint in de schaduw en een lichte papierkorrel | 2 uniforms en ongeveer 12 ALU-instructies in de bestaande grade-pass (1 sin en 1 fract voor de korrel, 2 sinussen voor het raster, 1 smoothstep); de tak wordt overgeslagen als beide 0 zijn |

**Besluit: waarom geen aparte post-pass of LUT.** Een LUT of extra pass kost een volledig-scherm-schrijfbewerking per beeld (op Ultra al de duurste pass met bloom); de gewenste kleurtaal (tint, demping, strakker contrast) is al uit te drukken met de uniforms die de grade-pass kent. Afgewezen: een 3D-LUT (extra textuur en bestand, niet continu per dagdeel en weer zonder tweede LUT en mix), CSS-filters op het canvas (volledig-scherm-compositie, ook op Laag), een aparte raster-pass (extra pass).

**Wat per stand verandert:**

| | Uit | Subtiel (standaard) | Drukwerk |
|---|---|---|---|
| Materiaalmenging | 0 | 0,4 | 0,65 |
| Sterkte van licht en kleur | 0 | 1 | 1,8 |
| Verzadiging (middag) | 1 | 0,96 | 0,93 |
| Raster in de schaduw (Hoog en Ultra, overdag) | 0 | 4% | 7% |
| Korrel (Hoog en Ultra) | 0 | ±1% | ±1,8% |

**Dagdelen** (zonshoogte, vloeiend ertussen): middag 60 graden, ochtend 30, gouden uur 14, avond 6 en 1, schemering -3, nacht -7 tot -25. Het raster hoort bij daglicht en staat in de nacht op 0; de korrel blijft. **Weer** (altijd zomer): bewolkt en regen krijgen warmer papier en iets minder verzadiging in plaats van een koud grijs; mist wordt papierachtig; onweer krijgt iets meer inkt en korrel.

**Toegankelijkheid:** Rustig drukwerk zet raster en korrel uit en begrenst Drukwerk op de sterkte van Subtiel. Een gekozen kleurenblindmodus laat de verzadiging ongemoeid en zet het raster uit. Hoog contrast (ondertitels) raakt de wereld niet. Het raster en de korrel staan stil (niets beweegt), dus Beweging beperken hoeft niets te doen.

**Samen spelen:** de stand is een lokale weergave-instelling per speler (`worldColor` in `gde-settings`); niets wordt gesynchroniseerd, een gast en de host kunnen verschillende standen hebben. Geen snapshot, geen beloning, geen voortgang. Wie wegvalt of later aansluit leest zijn eigen instelling. Een test van de pure kant: `worldgrade_test.mjs`.

**Instelling:** Instellingen, Beeld, `Wereldkleur` (Uit, Subtiel, Drukwerk), direct onder Helderheid. De materiaalkleuren liggen vast bij het bouwen van de wereld: een nieuwe stand werkt daarvoor na een herstart (de rij zegt dat); licht, mist en raster volgen meteen. Een opgeslagen bestand zonder de sleutel valt op Subtiel terug (geen versiesprong in `savemigrate.js` nodig, net als Rustig drukwerk). `?dswereld=` blijft voor het vergelijken.

## 4. Gevonden en gecorrigeerd tijdens het meten

Twee dingen die de contrastmatrix (`worldgrade_test.mjs`) aan het licht bracht in de eerdere materiaalmenging:

1. **Luma was gemeten op de sRGB-waarden.** Daardoor werd een donkerrode steen bij het mengen tot 30% lichter in echte (lineaire) luminantie en verloor hij contrast tegen lichte markers (3,3 naar 2,5). `matchLuma` rekent nu in lineair licht (de relatieve luminantie van WCAG).
2. **De rollen `geel` en `roze` behielden de helderheid niet,** en bakstenen en fietspaden met verzadiging boven 0,55 vielen daaronder (donkerbaksteen, luifels, parasols, fietspad). Beide rollen houden nu hun helderheid en hebben een maximale trek (geel 25%, roze 30%), ook bij Drukwerk: geel blijft gereserveerd voor 'volg dit'.

## 5. Metingen zonder Electron

`node scripts/worldgrade_test.mjs` (33.730 controles, `--tabel` voor een contrasttabel):

- **Uit en Laag zijn de identiteit** (parameters en pixels).
- **Bereik en continuïteit:** geen NaN; alle parameters begrensd (verzadiging 0,85 tot 1, contrast 1 tot 1,06, tinten binnen 20%); grootste sprong per kwartgraad zonshoogte en per 1% weer onder 0,02; Drukwerk minstens zo sterk als Subtiel op elk dagdeel.
- **Zomer:** het licht blijft warm (rood boven blauw); geen koude tint.
- **Palet:** binnen bereik, de afwijking neemt monotoon toe met de menging (tolerantie 1,5 van 255), de uitkomst is gelijk bij elke aanroepvolgorde en na het legen van de cache (tegels en LOD-niveaus kleuren gelijk, want elke kleur loopt door dezelfde pure functie en de wereldcache bevat geen kleuren van deze bronnen).
- **Contrastmatrix:** 4 markerpaletten (uit en de drie kleurenblindpaletten) maal 8 markers maal alle 66 kleuren van de kleurplaat maal 5 dagdelen maal 3 weersituaties, onder de sterkste grading (Drukwerk, Hoog): het contrast verliest hoogstens 11% (grootste verlies), nergens onder 3:1 wat daar al boven zat; de marge 15% is de grens van de test. Winst tot 18% (markers worden iets duidelijker tegen de gedempte wereld).
- **Kleurenblindsimulatie** (`a11ylogic.js simulate`, dezelfde helper als de minimap-pijltest, Viénot): geen sleutelpaar (ok/danger, mission/missionActive, mission/job, danger/police, user/job) valt onder ΔE 18 als het er voor de grading niet al onder zat; met een gekozen kleurenblindpalet verliest geen paar meer dan 7% afstand; zonder gekozen palet (de grading dempt dan 7% bij Drukwerk) hoogstens 25%, of het blijft boven ΔE 40. Bekende zwakke paar uit de minimap-analyse (mission en job voor deuteranopen in het standaardpalet, ΔE 5,8) wordt niet slechter gemaakt dan in dezelfde marge.
- **Geel gereserveerd:** de dichtste wereldkleur bij het marker-geel staat na de grading op ΔE 28,9 (grens 12); geen enkele komt er dichter bij dan 6 (of blijft ruim boven 40).
- **Rolgrenzen:** een bekende beperking: bij een ongelukkige kleur precies op een rolgrens (bijvoorbeeld een verzadigd magenta) springt de uitkomst tot 70 van 255 bij één niveau verschil in de invoer. De wereldkleuren zijn vaste materiaalwaarden (geen verlopen) en in de kleurplaat komt het niet voor; de test bewaakt een bovengrens van 120. Een vloeiende rolovergang is een mogelijke verbetering.
- **Shader en JS rekenen hetzelfde:** de test controleert de constanten in `postfx3d.js` tegen `worldgrade.js`.

**Benaderde voor-en-na-beelden** (`node scripts/world/wereldkleur_grading.mjs`, uitvoer [beeld-21-11/wereldkleur-grading/](beeld-21-11/wereldkleur-grading/)): per beeld drie kolommen (oud, Subtiel, Drukwerk), uit de bestaande spelbeelden `beeld-21-11/wereldkleur/*-m0.png`: dezelfde wiskunde op de pixel. **Dit is een benadering:** het palet werkt in het spel op de materiaalkleur voor het licht (hier op de pixel na het licht), tonemapping en bloom zijn niet nagebootst, de HUD van het bronbeeld wordt mee gegradeerd (in het spel niet), en het raster en de korrel staan hier driemaal zo groot. Eerlijk oordeel op de vier beelden (dag, avond, regen, Ommeland): Subtiel is naast het oude beeld pas te zien als je ze vergelijkt (iets warmere gevels en stoep, iets gedempter loof, een crèmere lucht); Drukwerk is zichtbaar en nog ordelijk, de wereld blijft leesbaar (straat, schaduwen, terras, borden), de lucht wordt inktiger. Nog niet bekeken in het echte spel.

## 6. Perf-inschatting (niet gemeten)

- **Laag en Midden:** geen extra pass, geen extra drawcall, geen extra shaderinstructies. Midden: alleen andere waarden in bestaande uniforms; CPU: ongeveer 20 vermenigvuldigingen en 4 kleurovergangen per beeld (verwaarloosbaar naast `computeLighting`). Verwachting: binnen de ruis.
- **Hoog en Ultra:** de grade-pass is een volledig-scherm-pass die al bestaat; de tak voegt ongeveer 12 ALU-instructies per pixel toe (1 sin en 1 fract, 2 sinussen, 1 smoothstep, enkele vermenigvuldigingen). Dat is een fractie van de ACES, de bloomsamenstelling en de helderheidscurve die er al in staan. Verwachting: minder dan 0,1 ms op een discrete GPU, enkele tienden van een ms op een iGPU bij 1080p; te bevestigen met de A/B uit de verificatie. De tak wordt overgeslagen als beide uniforms 0 zijn (Uit, Rustig drukwerk, kleurenblind, nacht zonder korrel is niet 0); een uniform-vertakking is voor alle pixels gelijk en dus goedkoop, maar de A/B moet bevestigen dat Uit echt gelijk is aan de oude frametijd.
- **Geheugen:** geen nieuwe textuur, geen nieuwe rendertarget.

## 7. Besluiten

| Besluit | Reden |
|---|---|
| Geen extra pass of LUT; grading in de bestaande grade-pass en in de lichtkleuren | geen frametijdregressie; continu in dagdeel en weer; geen bestanden |
| Standaard Subtiel (0,4 en sterkte 1); Drukwerk is de sterkere variant op verzoek | de eigenaar vroeg om subtiel; Drukwerk geeft ruimte voor wie het meer wil zien |
| Laag alleen materiaal, Midden + licht, Hoog en Ultra + raster en korrel | zoals gevraagd; de lichtkant is gratis, de textuur is het enige met GPU-kosten |
| De wereld mag het gele accent niet gebruiken | geel is 'volg dit' (DS3); `max` op de rol geel en een test op afstand tot het marker-geel |
| Het raster hoort bij daglicht, de korrel blijft 's nachts | het raster op een donkere nachtlucht zou overal verschijnen; een lichte korrel is nachtvriendelijk |
| De rollen zijn de categorieën (gras, water, asfalt, gebouwen, accenten) met elk een eigen gewicht; de menging per stand schaalt ze allemaal | één getal per categorie bestond al als `w`; een tweede tabel zou dubbel zijn. Per categorie afstemmen = `w` aanpassen; voertuigen hebben geen eigen rol omdat een verfkleur geen aanroeper kent die het onderscheid maakt (alle verfkleuren lopen door `auto`) |
| Standwissel werkt voor materialen na een herstart | de kleuren zitten in gebouwde geometrie en materialen; opnieuw bouwen zou de hele wereld herladen. De rij zegt het |
| Raster en korrel staan stil | geen beweging: niets om te beperken, geen shimmer in het beeld |
| Minimap en kaart (`kaartkleuren.js`) volgen dezelfde menging via `dsWereldCss` | `worldpalette_test` en `kaartkleuren_test` blijven groen (895 en 180 controles) |

## 8. Niet gedaan en niet gezien

- Niet in Electron bekeken en geen frametijd gemeten (opdracht: geen Electron). De echte beoordeling staat in [WERELDKLEUR-VERIFICATIE-21-11.md](WERELDKLEUR-VERIFICATIE-21-11.md).
- De voorgerenderde provinciepiramide heeft nog het oude land (zoals in [WERELDKLEUREN-21-11.md](WERELDKLEUREN-21-11.md) §3).
- Een fotomodus-filter, de film en trailer-look (`postfx.look`) en de heli-grade (`heligrade.js`) liggen bovenop of naast deze grading en zijn niet afgestemd; zie de verificatie.
