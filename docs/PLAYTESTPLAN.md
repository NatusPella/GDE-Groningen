# Playtestplan: nieuwe spelers, eerste uur en elke akte (#221)

Doel: zien of een speler die de game niet kent het verhaal volgt, steeds weet wat het doel is en tot het einde van elke akte blijft spelen. Akte 2 tot en met 5 zijn door geen mens gespeeld; dit plan zorgt dat dat gebeurt, en dat de uitkomst als gewone issues op het bord komt.

De vragenlijst staat in [SPEELTEST.md](SPEELTEST.md) en blijft de basis. Dit plan voegt de opzet toe: wie wat doet, scenario's, observatie, opnamen, controllers en de weg van feedback naar een issue. De eigenaar kiest de testers. Er komen **geen echte namen** in de repo: testers heten T1, T2, T3 (per ronde opnieuw genummerd) en in speltekst en issues staat alleen dat nummer.

## Voorbereiden (begeleider)

- Gebruik een gewone vrijgegeven versie of een lokale build en een **wegwerpprofiel** (`sh scripts/play_local.sh`), nooit het eigen profiel of de geïnstalleerde app van de eigenaar. Poort 9000 blijft met rust.
- Noteer per sessie: versie (startscherm), computer, grafische stand (Laag, Gemiddeld, Hoog), toetsenbord of controller, tester-nummer, datum.
- De tester krijgt **geen uitleg**. Vragen beantwoord je met "wat zou je nu doen?". Helpen mag pas als iemand vijf minuten vastzit; dan schrijf je op waar en wat je zei.
- Foutrapport: *Instellingen › Foutrapport › Kopieer naar klembord*, plakken onderaan het formulier.

## Scenario's

Elke sessie is 45 tot 60 minuten. Een tester speelt één scenario; verdeel de scenario's over de testers.

| Scenario | Start | Duur | Wat je wilt weten |
| --- | --- | --- | --- |
| A. Eerste uur | Nieuw spel | 60 min | Opening, M01 tot en met M06: begrijpt men wie Tammo en Tessa zijn, wat het doel is, waar de telefoon, kaart en Te doen zitten? |
| B. Akte 2 | Save aan het begin van akte 2 (M07) | 45 min | M07 tot en met M11: Friesland-lijn, reiskeuze (meerijden, zelf rijden, overslaan), het skûtsje op het water. |
| C. Akte 3 | Save bij M12 | 45 min | Heli-vlucht, containers, de dijk, vliegtuig laag over het graan, kermis Winschoten. |
| D. Akte 4 | Save bij M17 | 45 min | Bruggen, camera's, stoomtrein, het beleg van Bourtange, Anita's solodeel. |
| E. Akte 5 en slot | Save bij M22 | 45 min | Luik, colonne, vlag, bakken, het ontzet en de epiloog. |
| F. Vrij spelen | Nieuw spel, na M06 | 30 min | Wat doet men zonder opdracht: activiteiten, bijbanen, rondrijden, varen. |

Saves voor B tot en met E maak je met het F9-paneel van `?dev` (hoofdstuk kiezen springt naar een stap met het geld en de voortgang die een speler daar zou hebben), of door te spelen; dev-runs gebruiken eigen `gde-dev:`-opslag. Zet ze in het wegwerpprofiel, niet in de repo.

## Observatielijst (invullen tijdens het kijken)

Per sessie een tijdlijn met tijd, plek of missie en wat je zag. Let op:

1. **Afhaken:** pauzeert, pakt de telefoon, zucht, zegt "wat moet ik nu?". Noteer de minuut en de missie.
2. **Doelhelderheid:** weet men wat het doel is zonder te zoeken? Kijkt men op de kaart, in Te doen of op de minimap? Rijdt men de verkeerde kant op en hoe lang?
3. **Verhaal:** lacht men, leest men ondertitels, slaat men cutscenes over (skip-toets)? Snapt men wie Jelle, Oma Trijntje, Lammert is?
4. **Reizen:** kiest men meerijden, zelf rijden of overslaan, en begrijpt men wat dat doet met de klok?
5. **Mislukken:** na een mislukking: opnieuw proberen, opgeven, hulpoptie? Verliest men veel tijd?
6. **Besturing:** zoekt men toetsen, pakt men de verkeerde knop, werkt de controller zoals verwacht?
7. **Techniek:** haperen, zwevende dingen, dingen door muren, camera's in gebouwen, ontbrekend geluid.
8. **Wat men zelf zegt:** schrijf letterlijke zinnen op, zonder naam.

Scoor achteraf per sessie: *afgehaakt na ... minuten* of *uitgespeeld*, en de drie grootste frustraties en de drie leukste momenten.

## Extra vragen per akte

Stel na de basisvragen uit SPEELTEST.md:

- **Akte 1:** Wist je na de opening wat er gestolen moest worden en waarom? Wat dacht je dat Tessa wil?
- **Akte 2:** Snapte je waarom Jelle plakjes Grunn koopt? Was de reiskeuze duidelijk?
- **Akte 3:** Was de heli-vlucht te moeilijk of te saai? Was te zien waar je het vliegtuig moest laten landen?
- **Akte 4:** Was het beleg van Bourtange spannend of verwarrend? Voelde Anita's solodeel anders?
- **Akte 5:** Was duidelijk wat je moest doen bij de blokkade? Bevredigde het slot?

## Opnamen met OBS

Alleen met uitdrukkelijke toestemming van de tester, en alleen het speelvenster; geen gezicht, geen naam in beeld of in de bestandsnaam.

1. Bron: *Vensteropname* of *Schermopname* van het spelvenster. 1080p, 30 fps, MP4 (of MKV en daarna remuxen) is genoeg.
2. Audio: alleen spelgeluid. Een microfoon alleen als de tester hardop wil denken; vraag het vooraf.
3. Bestandsnaam: `playtest-<datum>-<scenario>-T<n>.mp4` (bijv. `playtest-2026-10-20-A-T2.mp4`).
4. Opnamen blijven **buiten de repo** en worden niet geüpload of gedeeld zonder akkoord van de eigenaar (constitution 8). Bewaar ze lokaal en verwijder ze na het verwerken.
5. Fragmenten voor een issue: noteer alleen tijdstempel en bestandsnaam in het issue ("T2, scenario A, 12:30").

## Controllertests

De tester krijgt het apparaat in de hand zonder uitleg; wie het apparaat kent hoeft het niet te zien. Noteer per punt gelukt, geholpen of niet gelukt. Daarna de lijst uit #151.

| Apparaat | Hoe testen | Let op |
| --- | --- | --- |
| Xbox-controller (kabel of Bluetooth) | Windows- of Mac-app, controller aan vóór het opstarten en ook tijdens het spelen | Herkenning, dode zone, menu's met stick en D-pad, knopsymbolen in hints |
| Switch Pro-controller | Via Bluetooth of USB; in de browser en in de app | Lay-out A/B en X/Y omgewisseld, glyphs, dode zone |
| Steam Controller / Steam Deck | Via Steam Input of de Steam Deck-modus | Standaard lay-out werkt zonder instellen, trackpads in menu's, tekstgrootte op het kleine scherm |

Voor elk apparaat de vaste taken: menu's door (Esc/Start), een auto besturen, uitstappen, de kaart openen, een missie starten, een scène overslaan, een minigame (bijv. discgolf of de carillon), een boot, het vliegtuig of de heli, en weer terug naar het menu. Noteer ontbrekende of verkeerde knopsymbolen apart.

## Van feedback naar issue

1. De begeleider verzamelt per sessie opmerkingen als platte tekst (één opmerking per regel of alinea), zonder namen.
2. `node scripts/playtest_feedback.mjs <bestand>` zet die om in issue-concepten (type bug of wens, impact, kosten, titel, beschrijving). Het script verstuurt niets; het schrijft Markdown naar het scherm of met `--uit <map>` naar bestanden.
3. De coördinator leest de concepten, verbetert type en labels en maakt de issues aan (`gh issue create`, labels `bug` of `wens`, één impact- en één kostenlabel). Dubbele opmerkingen worden samengevoegd.
4. Spelerzichtbare fixes krijgen een regel in de changelog; terugkoppeling naar de testers loopt via het playtest-issue (#116), zonder echte namen.
5. Tester-nummers staan alleen in de aantekeningen van de begeleider, niet in issues of commits. Alles wat een agent of een mens niet in beeld heeft gezien staat als "nog niet bekeken" in het issue.

## Na de ronde

- Tel: hoeveel testers haakten af en waar, welke missie het vaakst vastzet, welke grap het vaakst werd genoemd.
- Maak een issue per terugkerend probleem (liefst met de tijdstempel van een opname) en koppel ze aan de epic "Afwerking en menu's" of de milestone die past.
- Noteer in #221 wat gedaan is en welke scenario's nog niet gespeeld zijn.
