# Cutscene-regie-bijbel: GDE Groningen, Zomer vol misdaad

> **Status:** Canon. Dit is de regie-bijbel van dit spel: hoe camera, beelden en verhaal samenwerken zodat een cutscene voelbaar, volgbaar en natuurlijk overkomt. Lees dit voordat je een cutscene schrijft, regisseert of beoordeelt. Bij twijfel wint `AGENTS.md`.

**Voor wie:** mensen, Claude Code agents die cutscenes schrijven of beoordelen, vision-reviewers die renders krijgen, en de eigenaar als checklijst.

**Doel:** zorgen dat elke cutscene qua tekst, camerabeelden en visuele logica klopt zonder dat de eigenaar per scene feedback moet geven.

Dit document geeft:
- De shot-taal (types, wanneer wel/niet, duren, lens, bewegingen)
- De toon (satire, warm, Groningse droogheid, timing)
- Ondertitels (snelheid, blokken, onderbrekingen)
- Introducties van personages
- Emotie-camera mapping
- Continuïteit (tijd, weer, kleding, props)
- Open-wereld-specifieke regels
- Anti-patronen met voorbeelden
- Een toetsbare checklijst (elke regel R-xx)

---

## 1. Waar dit spel over gaat (context voor elke scène)

**Kern:** Twee net afgestudeerde werkloze vrienden willen een frietwagen laten staan op de Vismarkt. Tessa wil een thuis met wielen. Tammo wil bij haar blijven. Een Friese snackbaron die alles opkoopt, staat ertussen.

**Toon:** warm, droog, grappig. Een zomerse openwereldkomedie in een low-poly Groningen: satire op bureaucratie en opschepperij, maar nooit gemeen. Groningse understatement ("Kon minder"), stilte als grap, en hartelijke herkenbaarheid (echte plekken, verzonnen mensen).

**De speler:** je speelt meestal als Tammo, soms als Tessa, in een paar missies als de duif. Cutscenes tonen het duo, behalve waar één van hen elders is (M21: Tessa en de trein, Tammo en de vrienden; dan is het een solo-cutscene).

**Verhaalkanalen:** cutscenes (gesprekken face-to-face), telefoontjes (briefings, hints), radio (Rikus, wereld), stille appjes (Mem aan Tessa). Een cutscene is een gesprek tussen mensen die elkaar zien.

---

## 2. Shot-taal

### 2.1 Shot-types

Elk shot heeft een functie. Geen shot is alleen mooi; elk vertelt iets.

| Type | Wanneer | Voorbeeld | Nooit |
|---|---|---|---|
| **Establishing** (wide) | Eerste shot van een scène: waar zijn we, wie is er. | Opening M01: overzicht Martinikerkhof, Berend bij zijn pickup, Tammo en Tessa naderen. | In een kort gesprek zonder locatiewissel (drie regels in de auto: geen wide). |
| **Medium shot** (MS) | Standaard gesprekshot: hoofd, schouders, bovenlijf. De basis van elke scène. | Twee mensen in gesprek: beiden in beeld, focus op wie praat. | Als "close-up de hele tijd": te weinig variatie. |
| **Close-up** (CU) | Emotioneel moment, reactie, iets belangrijks wordt gezegd. | Tammo's gezicht als Tessa "snackwagen" zegt; Jelles blik als zijn moeder de bal afpakt. | In een neutral-scène (louter uitleg, geen emotie): daar hoort MS. |
| **Insert** | Een prop die de scène uitlegt: de bal, het koopboek, het klembord, de telefoon. | Het logboek met "12 augustus" (M18); de papieren op tafel in de keuken (C00.2). | Als vervanging voor dialoog: de prop moet in dialoog genoemd zijn of vanzelfsprekend zijn. |
| **Over-the-shoulder** (OTS) | Gesprek tussen twee: de schouder van de één, het gezicht van de ander. | Tessa praat tegen Berend; we zien Berend over Tessa's schouder. | Als er niemand tegenover staat (monoloog, radio, telefoon). |
| **Two-shot** | Beiden in beeld, neutraal, vaak begin of eind van een beat. | Tammo en Tessa staan bij de auto; opening M03 (het Loket). | Als er maar één persoon in de scène is. |
| **Reaction shot** | Iemand reageert zonder te praten: gezicht, gebaar, blik. | Tammo's blik als Tessa de kus negeert (M16); Berend's gezicht bij "Goud" (M01). | Op elk woord: te veel reacties verdunnen de echte. |
| **Tracking / dolly** | Camera volgt een lopende persoon of beweegt door de ruimte. | Opening C00.1: crane over de straat; M01: Berend loopt om de pickup. | Als camera sneller beweegt dan mensen lopen: dat is jarring. |
| **POV (point of view)** | Camera is de ogen van een personage. | Eerste persoon tijdens gameplay; duif-POV in duifmissies. | In een cutscene zonder reden: de speler weet al wie hij is. |

**Vuistregel:** begin wide, ga naar medium, zoom in op emotie. Een scène van vijf regels: één wide, drie medium, één close-up. Een scène van twee regels: één medium two-shot en één reaction.

### 2.2 Duren per shot-type

| Type | Duur (sec) | Reden |
|---|---|---|
| Wide establishing | 2–4 s | Genoeg om de plek te lezen, niet zo lang dat het stilstaat. |
| Medium shot | 3–8 s | Een regel of twee per shot. |
| Close-up | 2–5 s | Een emotioneel moment is kort; te lang wordt ongemakkelijk. |
| Insert (prop) | 1–3 s | De speler leest het object; daarna terug naar gezichten. |
| Reaction shot | 1–3 s | Een blik of gebaar; langer wordt stilte. |
| Tracking / dolly | 4–12 s | Volgt een beweging of een regel; stopt als de beweging stopt. |

**Anti-patroon:** een shot van 15+ seconden zonder cut terwijl er drie regels gesproken worden. Dat is statisch. Wissel per één à twee regels van shot (behalve een tracking die één beweging volgt).

### 2.3 Camerahoogte

| Hoogte | Wanneer | Effect |
|---|---|---|
| **Ooghoogte** (1,55–1,65 m) | Standaard, neutraal gesprek. | Gelijkwaardig, natuurlijk. |
| **Licht van onder** (1,2–1,4 m) | Iemand heeft de overhand, of de camera staat laag (kind, zittend). | Kijkt omhoog tegen iemand aan; macht. |
| **Licht van boven** (1,8–2,2 m) | Overzichtsshot, crane, iemand is klein of kwetsbaar. | Overzicht, afstand, kwetsbaarheid. |
| **Extreem laag** (<1 m) | Spannend moment, unieke hoek, duif op de grond. | Drama, ongewoon. |
| **Extreem hoog** (>3 m) | Establishing, luchtshot, landschap. | Context, schaal, isolatie. |

**Vuistregel:** ooghoogte is de basis. Afwijken heeft een reden. Jelle staat lang (1,92 m): de camera voor hem mag iets lager (1,5 m), zodat zijn lengte voelbaar is zonder dat hij de scène domineert.

### 2.4 Lens (FOV, field of view)

| FOV (graden) | Wanneer | Effect |
|---|---|---|
| **Wide (50–60)** | Establishing, landschap, groep mensen, ruimte tonen. | Veel in beeld, context, diepte. |
| **Normaal (35–45)** | Medium shots, standaard gesprek. | Natuurlijk, zoals het oog ziet. |
| **Tele (20–30)** | Close-up, emotie, intiem moment. | Gezicht vult het beeld, ruimte valt weg, focus. |
| **Extreem tele (<20)** | Een zeer intiem moment, één detail (een blik, een traan, een hand). | Intense focus, rest van de wereld verdwijnt. |

**Anti-patroon:** een wide lens (55) voor een close-up: het gezicht is klein en de ruimte eromheen is afleidend. Een tele lens (25) voor een wide shot: je ziet niets. Match de lens aan het shot-type.

**In dit spel:** standaard FOV voor medium shots is 36–44; close-ups 24–32; wide 46–54 (zie cutscenes_akte1.js). Eerste persoon: FOV 75 (gameplay). Duif-POV: FOV ~50–60 (wijder omdat een vogel perifeer ziet).

### 2.5 Camerabewegingen

| Beweging | Wanneer | Snelheid |
|---|---|---|
| **Statisch** (geen beweging) | Neutraal gesprek, korte regel, reactie. | — |
| **Pan** (horizontaal draaien) | Volgen van beweging binnen een shot; van persoon A naar B. | Langzaam (10–20°/s), vloeiend. |
| **Tilt** (verticaal draaien) | Van gezicht naar object; van laag naar hoog (Martinitoren). | Langzaam, één richting per shot. |
| **Dolly** (camera rijdt) | In- of uitzoomen door de ruimte; volgen van een lopend persoon. | Menselijke loopsnelheid (~1,2–1,8 m/s). |
| **Crane** (omhoog/omlaag) | Establishing die over een menigte of gebouw gaat; dramatisch einde. | Langzaam, vloeiend; 0,2–0,6 m/s verticaal. |
| **Orbit** (draait om een punt) | Rond een auto, rond twee mensen; einde van een scène. | 15–30°/s, één richting. |
| **Tracking** (volgt personage) | Personage loopt, camera volgt zijdelings of van achteren. | Exact dezelfde snelheid als het personage. |

**Anti-patroon:** camera beweegt sneller dan 2 m/s horizontaal of 0,8 m/s verticaal zonder reden (explosie, achtervolging): dat is jarring. Geen zigzag-bewegingen (links-rechts-links): kies één richting per shot.

**Vuistregel:** statisch voor korte regels, dolly voor beweging, crane voor begin of eind. Een scène van acht regels: twee statisch, drie dolly, twee statisch, één crane-out.

### 2.6 180°-regel en lijn van actie

**De regel:** trek een denkbeeldige lijn tussen twee sprekende mensen. De camera blijft aan één kant van die lijn. Zo blijft helder wie links en wie rechts staat.

**Voorbeeld goed:** Tammo staat links, Tessa rechts. Shot 1: over Tammo's linkerschouder naar Tessa. Shot 2: over Tessa's rechterschouder naar Tammo. Shot 3: beiden in beeld, Tammo nog steeds links.

**Voorbeeld fout:** shot 1 toont Tammo links, Tessa rechts. Shot 2 springt over de lijn: nu staat Tessa links, Tammo rechts. De speler raakt de weg kwijt.

**Wanneer mag je de lijn kruisen:**
1. Met een neutral shot ertussen (wide two-shot, insert, een derde persoon).
2. Als een personage echt van plaats wisselt (loopt rond de tafel, gaat zitten).
3. Als de scène opzettelijk verwarrend moet zijn (dronken, droom, chaos) — maar dat gebeurt zelden.

**In dit spel:** Tammo staat meestal links (s +0.6), Tessa rechts (s -0.6) in de standaard twee-persoons-setup (DUO in cutscenes_akte1.js). Een NPC staat tegenover hen (f +2 tot +4 m). De lijn loopt tussen hen, en de camera blijft aan de kant van de speler.

**Anti-patroon:** drie shots achter elkaar die de lijn kruisen zonder neutral ertussen. De speler weet niet meer waar iedereen staat.

### 2.7 Shot/reverse-shot

**De formule:** shot van persoon A (wie praat), dan shot van persoon B (wie luistert of antwoordt), heen en weer. De basis van elk gesprek.

**Vuistregel:**
- Shot 1: A praat (over-the-shoulder vanaf B, of medium shot A).
- Shot 2: B reageert (over-the-shoulder vanaf A, of medium shot B).
- Shot 3: terug naar A, of naar een two-shot als de beat eindigt.

**Lengteverhouding:** als A een lange regel heeft (12+ woorden), blijf op A. Als B één woord zegt ("Goud"), cut naar B voor die ene reactie, dan terug.

**Anti-patroon:** wissel niet per half woord. "Tammo, luister." — cut tijdens "Tammo" naar Tammo, terug tijdens "luister" naar Tessa = té druk. Wissel bij het einde van een zin of bij een pauze.

**In dit spel:** de meeste gesprekken zijn Tammo-Tessa (shot/reverse), Tammo-NPC (shot/reverse met NPC tegenover), of Tessa-NPC. Een derde persoon die binnenkomt breekt het patroon: twee shots op het duo, dan cut naar de derde.

### 2.8 Reactieshots

**Wanneer:** iemand hoort iets belangrijks, verbazingwekkends, grappigs, pijnlijks en reageert zonder woorden. Gezicht, blik, schouderophalen, zuchten.

**Duur:** 1–3 seconden. Lang genoeg om de reactie te lezen, kort genoeg om de flow niet te breken.

**Vuistregel:** maximaal twee reactieshots per scène van tien regels. Meer verdunt de impact. Tammo's droge blik na "Tige tank!" is grappiger als het niet elke keer gebeurt.

**Anti-patroon:** na elke regel een reactieshot van de ander. Dat is ping-pong zonder progressie. Reacties zijn voor momenten die ertoe doen.

**In dit spel:** Tammo reageert vaak met een droge blik (anim: 'look' of 'shake'), Tessa met handen in de zij (anim: 'hips') of lachen (anim: 'laugh'). Berend met een schouderophalen (anim: 'shrug'). Zie personages.md en de gesture-library (cuegestures.js).

### 2.9 Inserts

**Wanneer:** een object is belangrijk voor de scène en moet getoond worden. De bal, het koopboek, het logboek, een telefoon die zoemt, een kaart, een krant.

**Duur:** 1–3 seconden. Net genoeg om te lezen.

**Vuistregel:** maximaal twee inserts per scène. Eén om iets te introduceren (het koopboek), één om een detail te tonen (een plakje met "Foar mem"). Meer is een slideshow.

**Anti-patroon:** een insert van iets dat niemand noemt. Als de bal niet ter sprake komt, toon hem dan niet. Dialoog en beeld werken samen.

**In dit spel:** inserts zijn props in de cutscene-def (kind: 'klembord', 'telefoon', 'koffer', etc.). De camera kijkt naar de prop (look: 'prop:koffer') in een shot van 1,5–2 s. Daarna terug naar gezichten.

---

## 3. Toon: satire, warm, Groningse droogheid

### 3.1 Komisch timing (structuur, niet humor-oordeel)

> **Belangrijk:** Tools en reviewers toetsen alleen de STRUCTUUR rond humor (setup, punchline, ruimte voor de kicker, geen uitleg), NOOIT "is dit grappig". Humor-oordelen zijn per definitie subjectief en gaan naar het review-panel (zie §12), niet naar één persoon.

**Stilte is de grap.** Het grappigste moment is vaak niet wat iemand zegt, maar de stilte erna. Tammo's droge "Kon minder" werkt door de pauze ervoor.

**Vuistregel (toetsbaar):** na een potentiële punchline, een beat van 0,5–1,5 seconden stilte. Dan pas de volgende regel of een reaction shot.

**Voorbeeld goed (structuur):**
- Jelle: "Tige tank!" (bedankt de mensen die hij net heeft beroofd)
- [1,2 s stilte, Tammo's gezicht in close-up]
- Tammo: "Dat is… één manier."
→ Setup, punchline, stilte, kicker. STRUCTUUR klopt. Of het grappig is: panelOordeel.

**Voorbeeld fout (structuur):**
- Jelle: "Tige tank!"
- Tammo (direct, geen pauze): "Dat is… één manier."
→ De STRUCTUUR faalt: geen ruimte voor de beat. Dit is toetsbaar zonder humor-oordeel.

**In dit spel:** stilte zit in de timing van shots en beats. `{ on: 'Tige tank', dt: 1.2, ...}` is een beat 1,2 s na de regel begint. `{ t: 'L5+0.8', shot: 'cut', ... }` is een cut 0,8 s na regel 5 start.

### 3.1a Bewezen grappen (grappenbank)

**Regel:** bestaande grappen die in playtests werkten, of die de eigenaar zelf schreef, worden NIET herschreven. Ze gaan in de grappenbank als referentie en kalibratie.

**Grappenbank (voorbeelden, work in progress):**
- "Nul krassen. Of ik tel." (Berend M01) — de setup én de punchline. Timing: 2 s tussen setup en punch, 1 s stilte na punch.
- "Hij zei moi." / "Tegen mij." (M01 outro) — twee-regelige kicker. Timing: 0,8 s tussen regels.
- "Tige tank! – J." (M03.4, briefje op lege vitrine) — visuele grap zonder woorden. Shot-patroon: insert van briefje, 2 s, cut naar Tammo's gezicht (reaction).
- "Dat is… één manier om het te doen." (Tammo's signature understatement) — callback-grap. Timing: pauze van 0,4 s bij "…".
- "Moi." "Moi." (M16.6, de kus) — twee woorden, 8 seconden. Shot-patroon: close-up Tessa, close-up Tammo, crane-out.
- "Woist ja wel." (Tammo, erfenis van zijn opa) — emotionele understatement. Timing: gezegd zacht, gevolgd door stilte of action, nooit uitleg.

**Voor nieuwe grappen (§12):** geen enkele variant voorstellen, maar drie met verschillende timing/toon, voor het panel (of de eigenaar indien nodig) om uit te kiezen.

**Ernst-categorie 'smaak':** humor-oordelen krijgen label `smaak` in reviews. Betekent: panelOordeel (3 reviewers), niet één persoon. Structuur-fouten (geen stilte, punchline uitgelegd) blijven `belangrijk` of `blokkerend`.

### 3.2 Understatement

**Gronings:** het grootste compliment is "Kon minder". Het ergste oordeel is stilte. Niemand overdrijft, behalve Jelle (en dat is de grap).

**Vuistregel:** als iets groots gebeurt (explosie, overwinning, een kus), laat de personages het klein houden. "Viel mee." "Klopt." "Ging wel." De camera mag groot zijn (crane-out, wide shot), maar de woorden blijven klein.

**Anti-patroon:** "Dit is het beste moment van mijn leven!" na een overwinning. Dat is niet Tammo. Hij zou zeggen: "Goud." of "Dat is… goed gegaan." De emotie zit in zijn gezicht en de camera, niet in zijn woorden.

### 3.3 De kicker

**Definitie:** de laatste regel van een scène die de toon zet of een grap afrondt. Vaak droog, soms ontroerend, nooit uitgelegd.

**Voorbeelden:**
- M01 outro: "Hij zei moi." / "Tegen mij." — de grap is dat het een compliment is.
- M16 (kus): "…Moi." / "Moi." — twee woorden, acht seconden emotie.
- M03.4 (lege vitrine): "Tige tank! – J." — het briefje is de kicker.

**Vuistregel:** de laatste regel is kort (max 7 woorden), en de camera heeft ruimte: een crane-out, een fade, een cut naar black.

**Anti-patroon:** een lange uitleg na een emotioneel moment. "En toen wisten we dat…" — nee. Laat de scène eindigen bij het moment zelf.

---

## 4. Ondertitels

### 4.1 Leessnelheid

**Norm:** 15–17 woorden per 10 seconden voor een volwassen lezer (Nederlandse norm voor films, NDR). Dit spel gebruikt max 18 woorden per ondertitelblok.

**Vuistregel voor een regel:**
- 7 woorden → 4 seconden op scherm
- 12 woorden → 7 seconden
- 18 woorden → 10–11 seconden

**Anti-patroon:** een regel van 25 woorden in 8 seconden. De speler leest half, mist de helft. Split lange regels in twee beurten of schrap woorden.

**In dit spel:** de mediaan regel is 7 woorden (VERHAAL-ANALYSE-21-11.md). Regels van 28+ woorden zijn zeldzaam en moeten worden gesplitst (zie verboden zinsbouw in STIJLGIDS.md).

### 4.2 Blokgrootte

**Vuistregel:** maximaal 2 regels per ondertitelblok. Drie regels mag alleen als elke regel kort is (<5 woorden).

**Anti-patroon:** een blok van vier regels. De speler ziet de ondertiteling als een muur.

**In dit spel:** ondertitels zijn per gesproken regel (subtitles.js). Een regel met 18+ woorden wordt automatisch opgesplitst in twee blokken (subtitles.js, SPLIT_LONG_LINES).

### 4.3 Wie praat tegen wie

**Regel:** de naam van de spreker staat bij het ondertitelblok (zie DESIGN_SYSTEM.md, sprekerskleuren). Tammo = groen, Tessa = oranje, Jelle = blauw, etc.

**Anti-patroon:** drie mensen praten, ondertitels hebben geen naam: de speler weet niet wie wat zegt. Dit spel heeft names (storytext.js, SPEAKERS), dus dit is opgelost.

### 4.4 Onderbrekingen en overlap

**Situatie:** twee mensen praten door elkaar (Tammo onderbreekt Tessa, Jelle praat tegelijk met Mem). Hoe toon je dat?

**Oplossing:**
1. **Dialoog:** de tweede persoon begint voordat de eerste klaar is. `{ on: 'L5+2.0', speaker: 'Tammo' }` = Tammo begint 2 s na L5 start, terwijl L5 (Tessa) nog loopt.
2. **Ondertitel:** beide blokken kort op scherm, overlap van 0,5–1 s is leesbaar.
3. **Camera:** cut naar degene die overneemt, of two-shot als beide spreken.

**Anti-patroon:** twee lange regels tegelijk op scherm. Niemand kan beide lezen. Houd overlap onder 2 seconden en maak minstens één regel kort.

**In dit spel:** dit is zeldzaam. M20.5 (de ruzie tussen Tammo en Mem) heeft korte, snelle beurten; geen echte overlap. Als je overlap nodig hebt, gebruik `dt` in de beat om de tweede regel vroeg te starten.

---

## 5. Introducties van personages

### 5.1 Het introductieprotocol

**Vuistregel:** elk personage dat voor het eerst in beeld komt, krijgt:
1. **Aanloop** (optioneel maar sterk): een ander personage noemt hem vooraf. "Berend belt, zegt hij." (M01) of "Jelle koopt alles op" (chat M01.5, Berend M01.6, Sjabbe M02.3).
2. **Eerste verschijning** in beeld: de persoon is zichtbaar, de camera introduceert hem (wide shot, tracking in).
3. **Naamkaart:** naam + één droge regel die zijn rol/trek samenvat ("Nul krassen" voor Berend). Zie CHARACTERS in storyarc_nieuw.js en namecard.js.
4. **Tag:** de ene eigenschap die blijft hangen. Berend telt alles. Jelle is beleefd. Rikus "zegt niks". Zie personages.md.

**Voorbeeld goed (Jelle, M03.2):**
- Aanloop: chat (M01.5), Berend (M01.6 "een Fries met een blauw colbert"), Sjabbe (M02.3 "een klomp met contant geld").
- Eerste verschijning: wide shot van het Loket, lange man in blauw colbert stapt uit een zwarte trekker.
- Naamkaart: "Jelle Terpstra. Snackkoning. Fries. Heel tevreden met zichzelf."
- Tag: "Alles is een overeenkomst." "Foar mem."

**Voorbeeld fout (Henk, M06.0 in de oude versie):**
- Geen aanloop: hij belt in zonder ooit genoemd te zijn.
- Eerste verschijning: stem op de telefoon, geen beeld.
- Geen naamkaart (alleen een naam in de ondertitel).
- Geen tag: hij is "iemand die belt over een deuk".

**Fix:** vermeld Henk in M05 ("Henk belt, zijn bakkie heeft een deuk") of in M02 (Sjabbe: "Henk zoekt iemand die een bakkie kan halen"). Dan is M06 geen verrassing maar een uitnodiging.

### 5.2 Introducties via een ander personage

**Sterkste vorm:** A vertelt B over C, voordat C in beeld komt. Zo weet de speler al iets (verwachting) en is de verschijning een uitbetaling.

**Voorbeelden:**
- Oma Trijntje introduceert Geesje, Klaas, Dijkstra, Bert: "Geesje is kosteres in Warffum, ze heeft het vet nog." De speler verwacht een oudere vrouw in een kerk, en dat krijgt hij.
- Klaas introduceert Lammert: "Lammert is havenmeester, hij weet waar Jelle's schip ligt." De speler verwacht een man in een haven, en dat krijgt hij.

**Anti-patroon:** C verschijnt zonder vermelding, stelt zichzelf voor ("Ik ben Tinus. Ik beleg mee."), en verdwijnt. Dat is een namedrop, geen introductie. De speler onthoudt de naam niet.

**Fix:** laat A of B Tinus noemen voordat hij komt. "Tinus heeft een schuur bij Veendam, ik bel hem wel." Dan is Tinus' verschijning logisch.

### 5.3 Eerste verschijning: shot-keuze

**Vuistregel:** begin met een shot dat de persoon in zijn context toont.
- **Berend:** wide shot, hij staat bij zijn pickup op het Martinikerkhof, klembord in de hand. Context: auto, stad, controle.
- **Jelle:** wide shot, lange man stapt uit een trekker-limousine bij het Loket. Context: groot, duur, Fries.
- **Geesje:** medium shot, ze staat in een kerk met een mand eieren. Context: kerk, oudere vrouw, zorgzaam.

**Anti-patroon:** eerste shot is een close-up van het gezicht. De speler ziet geen context, alleen een gezicht. Dat is voor emotie, niet voor introductie.

**In dit spel:** de eerste scène van een nieuw personage heeft `wide: { from, to, look, fov, until }` (cutscenes_akte1.js). Dat is het establishing shot. Daarna medium en close-ups.

---

## 6. Emotie-camera mapping

### 6.1 Welke emotie, welke shot

| Emotie | Shot-type | Lens (FOV) | Duur | Voorbeeld |
|---|---|---|---|---|
| **Neutraal** (uitleg, info) | Medium shot, two-shot | 36–44 | 4–6 s | Tessa legt het plan uit aan Tammo. |
| **Blij** (overwinning, opwinding) | Medium, crane-out op einde | 38–46 | 5–8 s | Tessa juicht na de eerste klus (M01). |
| **Verdrietig** (rouw, verlies) | Close-up, statisch of langzaam in | 24–30 | 4–8 s | Tammo bij Beppe's huis na haar overlijden (wordt nog gebouwd, Beppe-huis-21-11). |
| **Bang** (spanning, dreiging) | Low angle, wide of medium, handheld shake | 40–50 | 3–6 s | Politieachtervolging (wanted systeem, geen cutscene). |
| **Boos** (conflict, ruzie) | Close-up, shot/reverse snel | 28–36 | 2–4 s per shot | Mem en Tammo in M20.5 (de ruzie over Tessa's rol). |
| **Romantisch** (liefde, intimiteit) | Close-up, twee close-ups na elkaar, crane-out op einde | 24–32 | 6–12 s totaal | De kus op de kermis (M16); "Ik wil bij jou blijven" (M26.7). |
| **Verbaasd** (shock, ontdekking) | Reaction shot, close-up gezicht | 26–32 | 2–4 s | Tammo's gezicht als de vitrine leeg is (M03.4). |
| **Droog / understatement** (Groningse humor) | Medium, statisch, geen beweging | 34–40 | 3–5 s | Tammo na "Tige tank!": "Dat is… één manier." |

**Anti-patroon:** een emotioneel moment met een wide shot. De emotie zit in het gezicht; een wide shot maakt afstand. Omgekeerd: een neutrale uitleg met alleen close-ups is té intens.

### 6.2 Progressie binnen een scène

**Vuistregel:** begin neutraal, ga naar emotie. Een scène van tien regels:
1. Regels 1–3: medium shots, info, opbouw.
2. Regels 4–6: shot/reverse, close-ups, emotie stijgt.
3. Regels 7–9: close-ups, reacties, climax.
4. Regel 10: crane-out of fade, resolutie.

**Voorbeeld (M01 intro):**
- Wide: Martinikerkhof, Berend bij zijn pickup.
- Medium: Tammo en Tessa naderen, Berend legt uit (nul krassen).
- Close-up: Tessa's gezicht als ze zegt "Vijftig euro, we doen het."
- Medium: Berend knikt, geeft sleutels.
- Crane-out: de pickup rijdt weg, einde.

**Anti-patroon:** begin met close-up (te intens), blijf op medium (geen progressie), of spring van close-up naar wide zonder reden (breekt de flow).

---

## 7. Continuïteit

### 7.1 Tijd van de dag

**Regel:** de zon staat waar hij hoort volgens de tijd in het spel. M01 is vrijdagochtend (08:00), dus ochtendlicht. M16 is zaterdagavond (kermis, 20:00), dus avondlicht. M26 is vrijdagmiddag (Gronings Ontzet, 15:00), dus middaglicht.

**Anti-patroon:** M01 heeft avondzon (oranje, lange schaduwen). Dat is visueel mooi maar klopt niet met "ochtend".

**In dit spel:** tijd van de dag is gekoppeld aan de missie (calendar.js, dag 1 = vr 14 aug). Cutscenes gebruiken de tijd van de game-tijd op dat moment (hour_cycle.js). Geen eigen verlichting per cutscene: de wereld heeft één zon.

**Uitzondering:** de opening (C00.2, keuken) is "de ochtend vóór het begin" en heeft zachte ochtendgloed. Dat is stilistisch en hoort bij de stille, intieme toon van die scène.

### 7.2 Weer

**Regel:** altijd zomer, droog, blauw of licht bewolkt. Geen regen in cutscenes, geen onweer, geen mist (behalve de lichte atmospheric haze in de verte). Geen winter, sneeuw, kale bomen.

**Anti-patroon:** M11 (de zandplaat) heeft zware bewolking en wind. Dat is dramatisch maar breekt de "altijd zomer"-regel.

**In dit spel:** het weer is vast: zomer, droog, blauwe lucht met lichte wolken. Zie AGENTS.md, constitutie 3. Geen weersysteem in cutscenes.

### 7.3 Kleding

**Regel:** personages dragen dezelfde kleding als in gameplay. Tammo: spijkerbroek, T-shirt (vaak groen), pet. Tessa: broek, shirt, geen pet. Jelle: blauw colbert, wit overhemd, das. Berend: werkkleding. Zie personages.md en de look-definities (storytext.js, SPEAKERS).

**Continuïteit binnen een scène:** als iemand een jas aantrekt, zit die er in het volgende shot nog. Als Tammo zijn pet afzet, blijft hij af.

**Anti-patroon:** Tammo heeft een pet in shot 1, geen pet in shot 2 (van dezelfde scène), en een pet in shot 3. Dat is discontinuïteit.

**In dit spel:** kleding is per NPC een fixed look (look-def in cutscript.js). Tammo en Tessa hebben elk één outfit (tammo-look, anita-look in scene3d.js). Geen kleding-wissels binnen een scène.

### 7.4 Props

**Regel:** een object dat in shot 1 op de tafel ligt, ligt er in shot 2 nog. Als iemand een telefoon oppakt, is zijn hand niet leeg in het volgende shot.

**Vuistregel:** track props met `carry` en `drop` in de beats (cutscript.js). `{ actor: 'berend', carry: 'kladblok' }` = Berend draagt het klembord. `{ actor: 'berend', drop: 'kladblok' }` = hij legt het neer.

**Anti-patroon:** een koffer verschijnt in shot 3 zonder dat iemand hem neerzette. Of: een koffer die in shot 1 op de grond staat, is in shot 2 weg zonder dat iemand hem oppakte.

**In dit spel:** props zijn gedeclareerd in de cutscene-spec (`props: { kladblok: { kind: 'klembord', at: [...] } }`). Carry en drop zijn expliciete acties. Geen props die verschijnen of verdwijnen zonder reden.

---

## 8. Open-wereld-specifieke regels

### 8.1 Camera in de open wereld

**Probleem:** cutscenes spelen in de open wereld, niet in een afgesloten set. Dat betekent: gebouwen, terrein, verkeer, voetgangers, bomen kunnen in beeld zijn.

**Vuistregel:** kies een plek en een framing die de rommel minimaliseert.
1. **Vóór een landmark:** Martinitoren, Aa-kerk, stadhuis. Die zijn mooi en herkenbaar.
2. **In een rustige hoek:** een plein zonder verkeer, een gracht zonder boten, een park.
3. **Met de rug naar de chaos:** camera kijkt weg van de drukke weg naar een rustig stuk groen of water.

**Anti-patroon:** cutscene midden op de Ring, met vijf auto's die door het beeld rijden. Of: camera kijkt dwars door een gebouw (clipping). Of: NPC staat half in een muur.

**In dit spel:** cutscenes hebben een designated spot (missionstory.js, cutscene-def met `at: { x, y, h }` of `road: true`). Die plek is gekozen om rommel te vermijden. Bijvoorbeeld: M01 op het Martinikerkhof (open plein, Martinitoren op de achtergrond). M03 bij het Academiegebouw (landmark). M16 op de kermis (speciaal event, geen verkeer).

### 8.2 Verkeer en voetgangers

**Probleem:** NPC's lopen door de scène, auto's rijden langs. Dat is levend maar kan afleidend zijn.

**Oplossing:**
1. **Achtergrondverkeer:** een enkele fietser of wandelaar op de achtergrond (z > 10 m) is oké. Hij mag door het beeld lopen, maar niet tussen de camera en de hoofdrolspelers.
2. **Staged verkeer:** een fietser die op cue langsrijdt (cyclist() in cutscenes_akte1.js), of een auto die parkeert. Dat is geregisseerd en voorspelbaar.
3. **Geen verkeer:** een scène op een rustig moment of plek (zondag, park).

**Anti-patroon:** een auto rijdt tussen de camera en Tammo tijdens een emotioneel moment. Of: drie NPC's lopen tegelijk door de scène, en de speler kijkt naar hen in plaats van naar de hoofdrolspelers.

**In dit spel:** cutscenes hebben optionele achtergrond-NPC's (cyclist, passer in cutscenes_akte1.js). Die zijn gedeclareerd in de spec en lopen op vaste paden. Wild verkeer (gameplay-NPC's) is uitgeschakeld tijdens cutscenes (cutscenehost.js, pauseWorld).

### 8.3 Clipping (camera door muren/objecten)

**Probleem:** de camera kan door gebouwen, bomen, terrein heen kijken als de shot-positie niet klopt.

**Oplossing:**
1. **Clearance:** houd de camera minstens 0,5 m van muren, 1 m van bomen.
2. **Look-at:** kijk naar een plek in open ruimte, niet door een gebouw.
3. **Test in het spel:** check elk shot in de game. Als de camera door een muur kijkt, verplaats het shot.

**Anti-patroon:** een shot van binnen een gebouw (café, kerk, huis) waar de camera buiten staat en door de muur kijkt. Of: een boom staat tussen camera en personage, en de helft van het gezicht is verborgen.

**In dit spel:** cutscenes hebben een z-coordinaat (hoogte, h in meters). De camera staat op ooghoogte (1,5–1,65 m) of hoger (crane). Gebouwen en bomen worden gedetecteerd (occlusionCheck in scene3d.js), maar dat is voor gameplay-camera. Cutscene-shots zijn hand-made: elk shot is getest in de game tijdens de bouw.

### 8.4 Continuïteit: waar sta je

**Probleem:** in gameplay staat de speler ergens. Dan begint een cutscene. Waar staat hij nu?

**Oplossing:**
1. **Intro:** cutscene begint waar de speler stopte (of dichtbij). Bijvoorbeeld: je loopt naar Berend, cutscene begint met Tammo en Tessa die naderen.
2. **Outro:** cutscene eindigt met de speler op een logische plek (bij de auto, bij de missie-eindlocatie).
3. **Teleport:** als de scène ergens anders speelt (akte-overgang, tijdsprong), fade to black, dan fade in op de nieuwe plek.

**Anti-patroon:** je staat bij de Martinitoren, cutscene begint, en plots sta je 500 m verderop bij het station zonder verklaring. De speler raakt gedesoriënteerd.

**In dit spel:** cutscenes beginnen `at` een vaste plek (missionstory.js, cutscene-def `at: { x, y }`). Gameplay-positie wordt opgeslagen, cutscene speelt, dan teruggeplaatst (of naar een nieuwe locatie als de missie dat vraagt). Zie cutscenehost.js, begin/einde-logica.

---

## 9. Anti-patronen (wat NIET te doen)

### 9.1 Statische scènes (geen beweging)

**Patroon:** twee mensen staan stil, camera staat stil, ondertitels lopen. Tien regels lang.

**Waarom fout:** het is een radio-show met plaatjes. Geen film.

**Fix:** voeg beweging toe. Iemand loopt, iemand pakt iets op, camera dolly's in, crane-out op einde. Of: split de scène in twee locaties (binnen/buiten, auto/straat).

**Voorbeeld goed:** M01 intro: Berend loopt om de pickup, checkt de lak, komt terug. Tessa en Tammo naderen. Camera volgt beweging.

**Voorbeeld fout:** M03.2 (oude versie): drie mensen staan bij het Loket, camera statisch, acht regels dialoog.

### 9.2 Te veel close-ups

**Patroon:** elk shot is een close-up van een gezicht. Geen context, geen ruimte, geen wide shots.

**Waarom fout:** de speler voelt opgesloten. Hij weet niet waar ze zijn of wie er nog meer is. Emotionele momenten verliezen impact omdat alles even intens is.

**Fix:** begin met wide (context), ga naar medium (gesprek), sluit af met close-up (emotie). Wissel af.

**Vuistregel:** maximaal 40% van de shots in een scène zijn close-ups. De rest is wide en medium.

### 9.3 Te lange shots

**Patroon:** één shot van 20+ seconden, terwijl er vier regels gesproken worden.

**Waarom fout:** geen visuele progressie. De scène voelt traag.

**Fix:** wissel per 1–2 regels van shot. Een regel = medium, volgende regel = shot/reverse, derde regel = close-up.

**Vuistregel:** gemiddelde shot-duur 4–7 seconden. Korter mag (1–3 s voor reacties), langer alleen bij een tracking die één beweging volgt.

### 9.4 Gebroken 180°-regel

**Patroon:** Tammo staat links in shot 1, rechts in shot 2, links in shot 3. De speler weet niet meer waar hij staat.

**Waarom fout:** ruimtelijke verwarring. De scène voelt chaotisch.

**Fix:** kies één kant van de lijn en blijf daar. Als je moet wisselen, doe het met een neutral shot (wide, insert) ertussen.

### 9.5 Ondertitels te snel

**Patroon:** 20 woorden in 6 seconden.

**Waarom fout:** de speler leest half, mist de helft. Toegankelijkheid (dyslexie, niet-moedertaalsprekers) faalt.

**Fix:** split in twee regels, of schrap woorden. 15 woorden per 10 seconden is de norm.

### 9.6 Geen inserts waar nodig

**Patroon:** "Kijk, het koopboek!" maar de camera toont het koopboek niet. Of: insert van iets dat niemand noemt.

**Waarom fout:** dialoog en beeld werken niet samen. De speler hoort over een object maar ziet het niet, of ziet een object dat niet ter zake doet.

**Fix:** dialoog noemt object → insert toont object → terug naar gezichten. Of: schrap de insert als hij niet in dialoog genoemd wordt.

### 9.7 Mensen vallen uit de lucht

**Patroon:** een nieuw personage verschijnt zonder aanloop, zegt twee regels, verdwijnt. Geen naamkaart, geen tag.

**Waarom fout:** de speler onthoudt de naam niet, weet niet waarom dit personage ertoe doet.

**Fix:** vermeld het personage vooraf via een ander personage, of geef een naamkaart + tag bij eerste verschijning. Zie "Introductieprotocol" hierboven.

### 9.8 Kleurloze reacties

**Patroon:** A zegt iets belangrijks. B reageert niet, of reagt met "Oké." Camera blijft op A.

**Waarom fout:** emotionele momenten betalen niet uit. De speler ziet geen impact.

**Fix:** een reaction shot van B. Close-up, 2 seconden, gezicht of gebaar. Dan pas verder.

**Voorbeeld:** Jelle zegt "Tige tank!" na een bedreiging. Cut naar Tammo's gezicht (droge blik), 1,5 s stilte. Dan Tammo: "Dat is… één manier."

### 9.9 Te veel mensen tegelijk

**Patroon:** vijf mensen in één scène, allemaal zeggen ze iets. Camera springt rond, speler raakt de draad kwijt.

**Waarom fout:** geen focus. De scène is druk, niet rijk.

**Fix:** maximaal drie sprekende mensen per scène. Als er meer zijn, laat de rest zwijgen of op de achtergrond staan. Focus op twee, maximaal drie.

**Voorbeeld fout:** M21.4 (oude versie): Tammo praat met zes vrienden die elk één regel zeggen. Het is een lijst, geen gesprek.

**Fix:** laat Tammo met één of twee vrienden praten, en de rest in de achtergrond. Of: split in twee scènes (Tammo + Bert, Tammo + Dijkstra).

### 9.10 Geen emotionele climax

**Patroon:** een scène met emotioneel gewicht (kus, ruzie, overwinning) heeft geen visuele uitbetaling. Geen close-up, geen stilte, geen crane-out. Gewoon door naar de volgende regel.

**Waarom fout:** het moment voelt niet belangrijk. De speler mist de impact.

**Fix:** geef het moment ruimte. Close-up, stilte (1–2 s), crane-out of fade. Laat het moment ademen.

**Voorbeeld goed:** M16.6 (kus): close-up Tessa, close-up Tammo, crane-out over het reuzenrad. Drie shots, 8 seconden totaal, twee woorden ("Moi." "Moi."). Het moment krijgt alle ruimte.

---

## 10. Checklist per cutscene (toetsbare regels)

Elk regel heeft een ID (R-xx) zodat linters, reviewers en de eigenaar ernaar kunnen verwijzen. Ernst: **blokkerend** (mag niet in het spel), **belangrijk** (moet worden gefixed voor release), **nit** (mooier maar niet cruciaal).

Toetsbaar door: **linter** (statische check van de cutscene-code), **render** (visuele check van een rendered video), **ai** (vision-review van contactbladen + script).

| ID | Regel | Ernst | Toetsbaar door |
|---|---|---|---|
| **R-01** | Elke scène begint met een establishing shot (wide, 2–4 s) of heeft een goede reden om het over te slaan (vervolg van vorige scène, twee regels). | belangrijk | render, ai |
| **R-02** | Shot-duur 1–12 s, gemiddeld 4–7 s. Geen shots >15 s tenzij tracking van één beweging. | belangrijk | linter, render |
| **R-03** | Wissel van shot per 1–2 regels dialoog. Geen 4+ regels in één statisch shot. | belangrijk | linter, ai |
| **R-04** | 180°-regel: blijf aan één kant van de lijn tussen sprekende personen, behalve met neutral shot ertussen of bewuste plaatswissel. | blokkerend | render, ai |
| **R-05** | Lens (FOV) matcht shot-type: wide 46–54, medium 36–44, close-up 20–32. | belangrijk | linter |
| **R-06** | Camerahoogte is ooghoogte (1,55–1,65 m) voor neutraal gesprek; afwijken heeft reden (macht, kwetsbaarheid, crane). | belangrijk | linter, render |
| **R-07** | Camerabewegingen zijn menselijk-tempo: dolly ≤2 m/s horizontaal, crane ≤0,8 m/s verticaal. Geen zigzag. | blokkerend | linter, render |
| **R-08** | Na een punchline of emotioneel moment: 0,5–1,5 s stilte voordat de volgende regel of een reaction shot. | belangrijk | ai |
| **R-09** | Maximaal 2 inserts per scène. Insert toont een prop die in dialoog genoemd wordt. Duur 1–3 s. | belangrijk | linter, ai |
| **R-10** | Maximaal 2 reaction shots per scène van 10 regels. Reacties zijn voor momenten die ertoe doen. | nit | ai |
| **R-11** | Ondertitels: max 18 woorden per regel, 15–17 woorden per 10 seconden. Lange regels splitsen. | blokkerend | linter |
| **R-12** | Ondertitels: max 2 regels per blok. 3 regels alleen als elke regel <5 woorden. | belangrijk | linter |
| **R-13** | Elk personage heeft bij eerste verschijning een naamkaart (naam + 1 droge regel) of een goede reden om het over te slaan (stem op radio, terugkerende bijrol). | blokkerend | ai |
| **R-14** | Nieuw personage heeft bij voorkeur aanloop (ander personage noemt hem vooraf) of wordt geïntroduceerd via establishing shot + naamkaart. | belangrijk | ai |
| **R-15** | Kleding, props, tijd van de dag zijn consistent binnen een scène. Geen props die verschijnen/verdwijnen zonder reden. | blokkerend | render, ai |
| **R-16** | Tijd van de dag matcht de missie-tijd (ochtend = ochtendlicht, avond = avondlicht). Geen avondzon in een ochtendmissie. | belangrijk | render, ai |
| **R-17** | Weer is altijd zomer, droog, blauw/licht bewolkt. Geen regen, onweer, mist, sneeuw. | blokkerend | render, ai |
| **R-18** | Geen clipping: camera staat niet in/door gebouwen, bomen, terrein. Clearance ≥0,5 m van muren. | blokkerend | render |
| **R-19** | Achtergrondverkeer (fietsers, wandelaars) mag, maar niet tussen camera en hoofdrolspelers tijdens emotionele momenten. | belangrijk | render, ai |
| **R-20** | Maximaal 3 sprekende mensen per scène. Meer: laat de rest zwijgen of split de scène. | belangrijk | ai |
| **R-21** | Een emotioneel moment (kus, ruzie, overwinning, verlies) heeft visuele uitbetaling: close-up, stilte, crane-out of fade. | belangrijk | ai |
| **R-22** | Geen lange uitleg door één mond. Dialoog is ping-pong, geen monoloog. Max 3 beurten achter elkaar. | belangrijk | ai |
| **R-23** | Reactie van de luisteraar: gezicht, blik, gebaar. Geen twee lange regels zonder reactie-shot ertussen. | nit | ai |
| **R-24** | Toon-check: understatement, droog, warm. Laatste regel (kicker) is kort (max 7 woorden) en zet de toon. | nit | ai |
| **R-25** | Geen shot/reverse sneller dan 2 seconden per shot tenzij snelle ruzie. Gemiddeld 3–5 s per shot in dialoog. | belangrijk | linter, render |
| **R-26** | Eerste persoon-shots (POV) alleen met reden (duif-modus, specifiek verhaalmoment). Niet standaard. | belangrijk | ai |
| **R-27** | Geen personages die tegen de camera praten (breaking the fourth wall) tenzij radio (Rikus), telefoon of specifieke gag. | blokkerend | ai |
| **R-28** | Voertuigen: als een auto in beeld is, staat hij logisch (geparkeerd, rijdt langs, rijd weg). Geen zwevende auto's. | blokkerend | render |
| **R-29** | Gebouwen op de achtergrond zijn herkenbare landmarks (Martinitoren, Aa-kerk) of generic low-poly gebouwen. Geen clipping-artefacten. | belangrijk | render |
| **R-30** | Intro en outro van een scène sluiten aan: als intro eindigt met "naar de auto lopen", begint de outro niet midden in de auto. | belangrijk | ai |

**Totaal: 30 regels.** Blokkerend: 9. Belangrijk: 18. Nit: 3.

---

## 11. Voorbeeldscènes (goed en fout)

### 11.1 Voorbeeld goed: M01.intro (Berend bij zijn pickup)

**Wat werkt:**
- **Establishing:** wide shot van het Martinikerkhof, Martinitoren op de achtergrond, Berend bij zijn pickup. Context is duidelijk.
- **Beweging:** Berend loopt om de pickup, checkt de lak. Tessa en Tammo naderen. Geen statische scène.
- **Shot/reverse:** Berend praat, cut naar Tammo en Tessa, terug naar Berend. Helder wie waar staat.
- **Tag:** "Nul krassen. Of ik tel." Berend's tag is meteen duidelijk.
- **Timing:** de grap ("Hij zei moi." / "Tegen mij.") heeft ruimte: 1 s stilte, reaction shot Tammo, dan Tessa's antwoord.
- **Kicker:** laatste regel ("Vijftig euro. Dat is… precies genoeg voor een patatje.") is droog en zet de toon.

**Structuur:**
- Wide (4 s) → medium shots (5×, elk 4–6 s) → close-up Tessa (3 s) → crane-out (5 s).
- Totaal 10 regels, 8 shots, 42 seconden. Gemiddelde shot-duur 5,25 s.

**Lessen:** dit is het template. Volg deze structuur voor intro-scènes van een nieuwe locatie met een nieuw personage.

### 11.2 Voorbeeld fout (hypothetisch): M03.2 zonder regie

**Wat fout zou zijn als er geen regie was:**
- Drie mensen (Tammo, Tessa, Jelle) staan bij het Loket.
- Camera statisch, medium two-shot, 18 regels lang (1 minuut).
- Geen inserts van de bal, het koopboek, Jelles koffer.
- Geen close-ups, geen reacties, geen beweging.
- Jelle stelt zichzelf voor ("Ik ben Jelle Terpstra"), geen aanloop.
- Laatste regel is uitleg, geen kicker.

**Waarom fout:**
- Statisch (R-03), geen visuele progressie.
- Te lang in één shot (R-02).
- Geen introductie-protocol voor Jelle (R-14): hij valt uit de lucht.
- Geen inserts (R-09): de bal en het koopboek worden genoemd maar niet getoond.
- Geen emotionele uitbetaling (R-21): de ontdekking dat Jelle de bal al heeft, voelt niet belangrijk.

**Fix (wat de echte M03.2 doet):**
- Wide establishing van het Loket (landmark).
- Jelle stapt uit zijn trekker (movement, insert van de trekker).
- Shot/reverse tussen Tammo-Tessa en Jelle.
- Insert van de bal (close-up, 2 s).
- Close-up Jelle's gezicht als hij zegt "Foar mem."
- Reaction shot Tammo (verbaasd).
- Crane-out als Jelle wegrijdt.

### 11.3 Voorbeeld goed: M16.6 (de kus op de kermis)

**Wat werkt:**
- **Opbouw:** de scène begint rustig (Tessa en Tammo in botsauto's, spelletje).
- **Stilte:** de kus gebeurt zonder woorden. Close-up Tessa (2 s), close-up Tammo (2 s), crane-out over het reuzenrad (4 s).
- **Kicker:** "Moi." (Tessa) "Moi." (Tammo). Twee woorden, 8 seconden emotie.
- **Visuele uitbetaling:** crane-out, het reuzenrad draait, muziek zwelt, fade.

**Structuur:**
- Medium shot (botsauto's) → close-up Tessa → close-up Tammo → crane-out → fade.
- Totaal 4 shots, 16 seconden voor de kus + kicker.

**Lessen:** romantische momenten hebben ruimte nodig. Geen haast, geen uitleg. Close-ups, stilte, muziek, crane-out.

---

## 12. Werkwijze: panel-review en rol van de eigenaar

> **Doel:** de eigenaar is GEEN bottleneck. Vrijwel alles wordt automatisch opgelost door tools en een review-panel. De eigenaar krijgt alleen een veto-lijst en beslist over canon/constitution-vragen.

### 12.1 Wat je niet meer hoeft te doen (vrijwel alles)

1. **Technische regels:** shot-duren, FOV, 180°-regel, ondertitel-snelheid, clipping, continuïteit. De linter + render-check doen dat.
2. **Visuele logica:** tijd van de dag, weer, kleding, props. De render-reviewer checkt dat.
3. **Introductieprotocol:** naamkaarten, aanloop, eerste verschijning. De ai-reviewer checkt dat tegen R-13, R-14.
4. **Humor-structuur:** setup, punchline, stilte-ruimte, geen uitleg van de grap, reactieshot, geen dubbele grap. De linter + ai-reviewer checken dat. Of het GRAPPIG is: het panel beslist (zie §12.2).
5. **Tekst-kwaliteit:** natuurlijkheid, leesbaarheid, verboden zinsbouw, woordkeus. De ai-reviewer checkt dat tegen STIJLGIDS.md en verhaal.md.
6. **Shot-keuzes (standaard):** shot-type, lens, camerahoogte, bewegingen, shot/reverse-patronen. De ai-reviewer checkt dat tegen deze bijbel.

### 12.2 De panel-werkwijze voor komische beats

**Probleem:** humor-oordelen ("is dit grappig") zijn subjectief en kunnen niet door één tool of persoon. Maar ze kunnen wel door drie onafhankelijke reviewers, waarvan de meerderheid beslist.

**Oplossing (panel):**
1. **Drie reviewers** (Claude Opus 5.5, GPT-4o, Gemini 2.0 Flash Thinking, of drie afzonderlijke Claude Opus-runs) krijgen dezelfde cutscene: contactbladen, script, grappenbank (§3.1a), regie-bijbel.
2. **Opdracht:** beoordeel elke komische beat (gelabeld als `humor-review` in de code) op:
   - **Timing:** pauzes, stilte, ruimte voor kicker (toetsbaar, maar ook gevoel).
   - **Personage-eigen toon:** zou Tammo/Tessa/Jelle dit zeggen? Past het bij hun stem (personages.md)?
   - **Groningse droogheid:** understatement, geen overdrijving (tenzij Jelle), stilte als grap.
   - **Geen uitleg:** de grap legt zichzelf niet uit, geen "snap je hem?".
   - **Kicker/stilte:** laatste regel is kort en zet de toon, daarna ruimte.
   - **Afstemming op grappenbank:** lijkt het op een bewezen grap (structuur, timing), of is het nieuw?
3. **Voor bestaande grappen:** scoren op een schaal 1–5 (1 = breekt de structuur, 5 = perfect zoals hij is). Meerderheid <3 = markeer voor aanpassing. Meerderheid ≥3 = behoud.
4. **Voor nieuwe grappen:** elk reviewer stelt 1 variant voor (totaal 3 varianten), met timing, shotlijst, en reden. Panel kiest beste variant (meerderheid), of alle drie gaan naar de eigenaar indien geen meerderheid.
5. **Zekerheid:** elk oordeel krijgt een zekerheid (hoog / middel / laag). Lage zekerheid (geen meerderheid, of alle drie verschillend) gaat naar de eigenaar als veto-vraag.

**Uitvoer panel:** JSON met per komische beat:
- ID (scène + regelnummer)
- Meerderheids-oordeel (behoud / vervang / 3 varianten)
- Reden (kort, 1–2 zinnen)
- Zekerheid (hoog / middel / laag)
- Stemmen (reviewer 1, 2, 3)

**Veto-lijst voor eigenaar:** alleen beats met lage zekerheid (<60% akkoord), of gevoelige canon/constitution-vragen (echte persoon genoemd, satire over gevoelig onderwerp). Typisch 5–10% van de beats, niet 100%.

### 12.3 De flow (volledig)

1. **Agent schrijft cutscene:** tekst (dialoog) in script.json, staging (shots, beats) in cutscenes_akteN.js. Komische beats krijgen label `humor-review` in een comment.
2. **Linter draait:** `node scripts/cutscene_lint.mjs` checkt R-01 t/m R-30 (technisch toetsbaar). Rood = blokkeer, geel = waarschuwing.
3. **Render draait:** `node scripts/cutscene_render.mjs --scene=M01.intro` maakt video + contactbladen (elke 2 s een frame).
4. **Ai-reviewer draait:** contactbladen + script → vision-reviewer → JSON met bevindingen per shot (technisch, structuur, niet humor).
5. **Panel draait (alleen voor humor-beats):** 3 reviewers → meerderheids-oordeel → JSON met behoud/vervang/varianten.
6. **Eigenaar krijgt:**
   - **Veto-lijst:** beats met lage zekerheid + gevoelige vragen. Kort (5–15 items per akte), met gekozen variant, reden, zekerheid.
   - **Optioneel:** volledige render + JSON als hij het wil bekijken.
   - **Actie:** veto (zeg welke beats anders moeten), of akkoord (alles gaat door).

**Typisch:** eigenaar krijgt 5–10 veto-vragen per akte (niet 50 cutscenes). Hij beslist in 10–20 minuten, niet 3 uur.

### 12.4 Wat jouw enige taken zijn

1. **Canon/constitution-vragen:** "Klopt deze plek met het verhaal?" "Zou Tammo dit zeggen?" "Breekt deze grap een constitution-regel?" Jij kent de wereld en de personages het beste, en jij bent de enige die dat kan beoordelen.
2. **Optioneel veto:** lees de veto-lijst, zeg welke beats anders moeten. Alles met hoge zekerheid (meerderheid panel) gaat automatisch door, tenzij jij veto roept.
3. **Prioriteit (één keer per epic):** "Deze akte is cruciaal, die mag meer tijd kosten." "Deze bijscène mag 'goed genoeg' zijn." Dat zeg je vóór het werk begint, niet per cutscene.

**Wat je NIET doet:**
- Elk shot beoordelen (tools doen dat).
- Elk humor-moment beoordelen (panel doet dat).
- Technische regels checken (linter doet dat).
- Render bekijken tenzij je het wil (veto-lijst is genoeg).

**Vuistregel:** als een scène door linter + render + panel komt, en jij hebt geen veto, dan is hij klaar. Jouw rol is creative director die knopen doorhakt, niet kwaliteitscontrole die alles naloopt.

### 12.5 Humor-keuzepakketten (bundels per akte)

**Probleem:** als nieuwe grappen één voor één naar de eigenaar gaan, is dat alsnog druppelsgewijs werk.

**Oplossing:** alle nieuwe komische beats van één akte (of één epic) worden gebundeld als één keuze-document:
- Per beat: 3 varianten (timing, tekst, shotlijst), met panel-scores.
- Eigenaar kiest in één sessie (10–20 minuten) zijn voorkeuren.
- Veilige neutrale versie als terugval (geen grap, gewoon uitleg) staat altijd als optie 4.

**Voorbeeld (hypothetisch, M07 nieuwe intro):**
```
Beat 7.3: Tessa reageert op Jelle's telefoontje
Variant A (panel: 2/3 stem): "Dat is… tige tank voor hem." [1,2 s stilte, reaction Tammo]
Variant B (panel: 1/3 stem): "Beleefd tot in z'n paniek." [0,8 s stilte, crane-out]
Variant C (panel: 0/3 stem): "Hij bedankt ons. Hij. Bedankt. Ons." [geen stilte, twee shots]
Variant D (neutraal): "Oké. We gaan erheen." [geen grap]
Jouw keuze: [ A | B | C | D | Eigen voorstel: ______ ]
```

**Timing:** één bundel per akte (5–10 beats), niet per cutscene (50+ beats). Eigenaar kiest één keer per akte, niet dertig keer per week.

### 12.6 Eerlijkheid: waar geen oordeel over humor

**Agents zijn eerlijk:** in de audit of het review-document staat expliciet:
- "Structuur klopt (stilte, kicker, geen uitleg). Of het grappig is: panelOordeel, niet door mij beoordeeld."
- "Beat X is nieuw (niet in grappenbank). Panel kiest uit 3 varianten."
- "Beat Y is bewezen (M01, werkte in playtest). Behouden tenzij eigenaar-veto."

**Geen valse zekerheid:** nergens staat "deze grap is grappig" of "dit werkt" als dat niet is getoetst. Wat staat: "structuur klopt, panel koos A met 2/3 stem, zekerheid middel."

---

## Colofon

**Geschreven:** 21 november 2026, door Claude Opus 5.5 (agent cutscene-regie-opus-21-11).

**Bronnen:** AGENTS.md, DESIGN_SYSTEM.md, VERHAALCANON-21-11.md, VERHAAL-ANALYSE-21-11.md, verhaal.md, STIJLGIDS.md, personages.md, cutscenes_akte1.js t/m cutscenes_akte6.js, cameranear.js, intromontage.js, cineshots.js, cutscript.js, storytext.js.

**Updates:** bij grote veranderingen in de regie-stijl of nieuwe inzichten uit playtests. Kleine fixes: direct in dit doc. Grote wijzigingen: nieuwe ADR + update van dit doc.

**Testen:** `scripts/cutscene_lint.mjs` implementeert R-01 t/m R-30 (waar automatisch te checken). `scripts/release/prompts/cutscene-review.md` gebruikt deze bijbel als rubric voor vision-reviews. `scripts/release/data/cutscene-kalibratie.json` heeft goede en foute voorbeelden voor calibratie.

**Verplichte leeslijst voor wie cutscenes maakt:** dit doc, STIJLGIDS.md (voor de stemmen), personages.md (voor de karakters), de bestaande cutscenes_akteN.js (voor de techniek).

---

Einde regie-bijbel. Versie 1.0, 21 november 2026.

## Samen spelen

Cutscenes zijn van wie het spel opende: een scène met een scriptbeschrijving gaat als data naar de gasten en speelt daar lokaal na, de overige filmpjes (eigen camerabaan) zijn alleen bij de host en geven de gast een regel tekst. Een gast slaat zijn eigen weergave over zonder dat het de scène van de host stopt. De regels van deze bijbel (ritme, introductie, humor) gelden voor beide kanten; de linter kijkt niet naar het netwerk. De details staan in [COOP-GAST.md](COOP-GAST.md) (Filmpjes zonder script) en worden bewaakt door `scripts/cutgast_test.mjs` en `scripts/coopcut_test.mjs`.
