# Onboarding: nieuwe spelers en echte controllers testen (#59)

Doel: zien of iemand die de game **niet kent** in de eerste dertig minuten begrijpt wie hij is,
wat het doel is en wat hij nu moet doen — zonder uitleg van de begeleider. En of een echte
controller (Xbox, PlayStation, Steam Deck) werkt zoals de hints beloven. Dit blad is het draaiboek;
de vragenlijst staat in [SPEELTEST.md](SPEELTEST.md), de scenario's per akte en de opnamen in
[PLAYTESTPLAN.md](PLAYTESTPLAN.md), de feedbackweg naar issues in [PLAYTESTPLAN.md](PLAYTESTPLAN.md)
("Van feedback naar issue"). De eigenaar kiest en benadert de testers; er komen **geen echte namen**
in de repo (T1, T2, … per ronde).

## 1. Werving (eigenaar)

- **Zes tot acht testers per ronde**, waarvan minstens vier die de game niet kennen en minstens
  twee die nooit een open-wereldgame spelen. Eén tester die Groningen kent, één die het niet kent.
- Een aparte ronde voor controllers: twee testers met een Xbox-controller, één met een
  PlayStation-controller (DualSense/DualShock) en één op de Steam Deck. Wie het apparaat kent,
  hoeft de controllerronde niet te doen; wie het niet kent, test juist de herkenning.
- Vraag vooraf toestemming voor opnemen (alleen het spelvenster, geen gezicht, geen naam).
- Leg vast: versie (startscherm), platform, grafische stand, toetsenbord/controller, T-nummer, datum.

## 2. Klaarzetten (begeleider)

- Gebruik een **wegwerpprofiel** (`sh scripts/play_local.sh`) of een vrijgegeven pre-release,
  nooit het profiel of de geïnstalleerde app van de eigenaar. Poort 9000 blijft met rust.
- Zet de grafische stand op **Gemiddeld** (tenzij de tester een eigen machine meebrengt) en het
  geluid aan. Start zonder save: het verhaal begint meteen.
- Klaar: notitieblok of het scoreformulier hieronder, timer, en de foutrapport-knop
  (*Instellingen › Foutrapport › Kopieer naar klembord*) binnen handbereik.
- **Geen uitleg vooraf.** Geen toetsen noemen, geen "je moet eerst…". Vragen beantwoord je met
  "wat zou je nu doen?" of "kijk eens rond". Help pas als iemand vijf minuten echt vastzit; schrijf
  op waar en wat je zei.

## 3. Protocol (30-45 minuten)

1. **0-2 min:** startscherm en eerste scène. Kijk waar de ogen naartoe gaan, of de ondertitels
   gelezen worden, of de eerste besturing gevonden wordt.
2. **2-10 min:** eerste opdracht. Noteer of het doel, de pijl/minimap en de telefoon gevonden
   worden. Niet wijzen.
3. **10-20 min:** eerste rit/ missie. Let op: instappen, rijden, camera, kaart openen, Te doen.
4. **20-30 min:** zelf iets kiezen (vrij spelen) of de volgende stap. Let op afhaken: pauzeren,
   telefoon pakken, zuchten, "wat moet ik nu?".
5. **Na 30 min (of eerder bij afhaken):** stop en stel de vragen hieronder. Vraag door op wat je
   zag, niet op wat je hoopt.

Noteer een **tijdlijn** (tijd, plek/missie, wat je zag) en citeer letterlijke zinnen — zonder naam.
Scoor achteraf: *uitgespeeld / afgehaakt na … minuten*, de drie grootste frustraties en de drie
leukste momenten.

## 4. Vragen na de sessie (onboarding)

1. Wie zijn de twee personen die je net zag, en wat willen ze?
2. Wat was je doel in de eerste opdracht? Hoe wist je dat?
3. Waar heb je de kaart, de telefoon en "Te doen" gevonden? Wat was onduidelijk?
4. Wat deed je toen je niet wist wat je moest doen? Hoe lang duurde dat?
5. Hoe voelde het rijden/instappen/uitstappen? Wat verwachtte je dat er zou gebeuren?
6. Is het te druk (tekst, pop-ups, markers)? Wat zou je weghalen?
7. Wat vond je van de toon en de grappen? Wat was te veel of te flauw?
8. Wat wist je niet dat achteraf wel had geholpen (zonder dat je het had willen lezen)?
9. Zou je verder spelen? Waarom wel/niet?
10. Eén ding dat je zou veranderen als je het spel maakte.

Bij de controllerronde daarnaast: welke knop verwachtte je, welke glyph stond er, wat werkte niet
(menu's, kaart, scène overslaan, minigame, boot/vliegtuig/heli)?

## 5. Scoreformulier (kopieer per sessie)

```
Sessie: T_   Datum: ____  Versie: ______  Platform: Windows/Mac  Stand: Laag/Gemiddeld/Hoog
Invoer: toetsenbord / Xbox / PlayStation / Deck   Opname: ja/nee
Uitkomst: uitgespeeld / afgehaakt na __ minuten (bij welke missie/plek: ____)

Tijdlijn
  0:00  ...
  5:00  ...

Drie frustraties                     Drie leuke momenten
1. ...                               1. ...
2. ...                               2. ...
3. ...                               3. ...

Letterlijke zinnen (zonder naam): ...
Techniek (haperen, zwevend, door muren, camera in gebouw, geluid): ...
Foutrapport geplakt: ja/nee
```

## 6. Controllermatrix

| Apparaat | Aansluiten | Let op |
|---|---|---|
| Xbox (kabel/Bluetooth) | Aan vóór het starten, en één keer tijdens het spelen | Herkenning, dode zone, menu's met stick en D-pad, knopsymbolen in de hints |
| PlayStation (DualSense/DualShock) | Kabel of Bluetooth; in de browser en in de app | Andere glyphs (kruisje/rondje/vierkantje/driehoek), touchpad, dode zone, trilling |
| Steam Deck | Steam Input, spel als niet-Steam-app of via de Steam-versie | Standaard lay-out zonder instellen, trackpads in menu's, leesbaarheid op het kleine scherm, slaapstand/hervatten |

Vaste taken per apparaat (noteer **gelukt / geholpen / niet gelukt**): menu's (Esc/Start), auto
besturen, uitstappen, kaart openen, missie starten, scène overslaan, één minigame (discgolf of
carillon), een boot, het vliegtuig of de heli, en terug naar het menu. Ontbrekende of verkeerde
knopsymbolen horen als aparte opmerking in het issue.

## 7. Van sessie naar bord

1. Begeleider schrijft per sessie platte tekst (één opmerking per regel), zonder namen.
2. `node scripts/playtest_feedback.mjs <bestand>` maakt issue-concepten (het script verstuurt niets;
   met `--uit <map>` schrijft het bestanden).
3. Coördinator leest, kiest type/labels en maakt de issues aan; dubbele opmerkingen samenvoegen.
4. Spelerzichtbare fixes komen als Nederlandse regel onder `[Unreleased]` in `CHANGELOG.md`.
5. Terugkoppeling naar de testers loopt via het playtest-issue **#116** (per pre-release een comment
   met de versie; het releasescript doet dat automatisch). Testers maken zelf een issue voor een bug
   of wens, of reageren onder de versie-comment.
6. Alles wat de begeleider niet in beeld zag, staat als **"nog niet bekeken"** in het issue.

## 8. Checklist voor de begeleider

- [ ] Tester kent de game niet (of: controllerronde, apparaat gekozen)
- [ ] Wegwerpprofiel, versie en grafische stand genoteerd
- [ ] Geen uitleg gegeven; vijf-minutenregel toegepast en genoteerd
- [ ] Tijdlijn, citaten, frustraties en leuke momenten ingevuld
- [ ] Controller: alle vaste taken gescoord, glyphs en dode zones genomineerd
- [ ] Foutrapport geplakt (of: niet nodig)
- [ ] Feedback omgezet naar concepten en op het bord gezet; #116-comment gecontroleerd
