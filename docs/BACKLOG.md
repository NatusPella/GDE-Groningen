# Backlog naar de volgende versies (stand 15 okt 2026)

Geprioriteerd op: eerst wat spelers nu raakt en wat de rest ontgrendelt, dan de provincie, dan inhoud, dan afwerking.
Elke versie is een geteste pre-release. Schattingen zijn ruw (agent-dagen, met 3 à 4 agents tegelijk).
Bronnen: `ROADMAP.md`, `docs/PROVINCIE-PLAN.md`, `docs/PROVINCIE-VERHAAL.md`, `docs/verhaal/deel4-f4a.md`, `docs/OPEN_SOURCE_CHECKLIST.md`.

## Gelegend

- **P0** blokkeert of schaadt het spel nu, of ontgrendelt alles hierna.
- **P1** grote waarde, de eerstvolgende versies.
- **P2** belangrijk, maar kan wachten.
- **P3** leuk om te hebben.
- **[eigenaar]** wacht op een beslissing of actie van jou.

## 0.30.0: nieuwe vorm (in uitvoering, af te ronden)

| # | Wat | P | Status |
|---|---|---|---|
| 1 | Nieuwe HUD, laadscherm en opstartscherm | P0 | gebouwd, op main |
| 2 | Nieuwe menu's (rustig, AAA) | P0 | gebouwd, op main |
| 3 | Routes, minimap en kaart per vervoerswijze + toegangsregels | P1 | gebouwd |
| 4 | Arcade-rijden: schakelen, drift, motoren, geschakelde brommer | P1 | gebouwd |
| 5 | Schaalfixes (snelheden, bomen, voertuigen), echte plekken (respawn, winkels, tankstations, parkeren), spelkalender, dorpen en landmarks in het Ommeland | P1 | gebouwd |
| 6 | F0: RD New, tegels, streaming | P0 | gebouwd |
| 7 | Eén volledige verhaaltest over alles + release | P0 | loopt |
| 8 | **Handmatig controleren** wat agents niet in beeld hebben gezien: versnelling/toerental in de HUD, de nieuwe menu's (titelscherm met save, Aanwijzingen, Prestaties, garage met meerdere voertuigen, controllertab, mislukt/opgepakt/dood), nieuwe motormodellen, HUD op 720p en 4K | P0 | **[eigenaar]** speeltest |

## 0.31.0: wegen en wereld kloppen (F1, eerste helft)

| # | Wat | P | Schatting |
|---|---|---|---|
| 1 | Hoogteprofielen per wegennet: bruggen, viaducten, tunnels, verdiepte ligging; één hoogtevraag; vaste ring-check herstellen (viaductrand Julianaplein) | P0 | 6–8 |
| 2 | Rijstrookmodel (de A7 heeft 4 stroken per richting waar er 2 horen), markeringen, pijlen | P0 | 4–6 |
| 3 | Kruispunten en rotondes: voorrang, stoplijnen, verkeerslichten, AI-gedrag | P1 | 5–7 |
| 4 | Automatische controles over het hele wegennet (rijden, breuken, doorrijhoogte) | P0 | 3–4 |
| 5 | Spoor- en waterhoogtes: peil, sluizen, beweegbare bruggen | P1 | 4–6 |
| 6 | Straatdetails: vangrails, lantaarns, borden, bomen en groen op de echte plekken | P1 | 4–6 |
| 7 | Echte gebouwhoogtes en dakvormen uit 3D BAG (95% staat nog op standaardhoogte) | P1 | 4–5 |
| 8 | Hoogtedata (AHN): dijken, wierden, Hondsrug | P2 | 3–4 |
| 9 | Rommel opruimen: JSON-reservekaart (19 MB) weg, bouw naar achtergrondproces verplaatsen (dorpen kosten nu 38% meer hoofdprocessortijd), `roadsurface` per tegel | P1 | 3–4 |

## 0.32.0: de eerste provinciestrook (F1, tweede helft, go/no-go)

| # | Wat | P | Schatting |
|---|---|---|---|
| 1 | Wereldbouwer: één generator voor stad en platteland; stad opnieuw gebouwd via het tegelpad | P0 | 8–10 |
| 2 | Proefstrook Stad → Delfzijl → Eemshaven met alle laagjes | P0 | 6–8 |
| 3 | Trein: alle echte lijnen en stations, rijden als passagier, machinist-minigame | P1 | 5–7 |
| 4 | Buslijnen uit OpenStreetMap, bus-bijbaan, haltes | P1 | 4–5 |
| 5 | Verkeer en voetgangers per regio, in lagen (dichtbij, middenafstand, ver) | P1 | 5–7 |
| 6 | Kaartranden, wereldeinden, waterranden en grensbruggen (zie ontwerp in het plan) | P1 | 3–4 |
| 7 | Dag, nacht en weer over de provincie (altijd zomer) | P2 | 4–5 |
| 8 | Cutscene-LOD: camera-gestuurd laden, geen "poppen" | P1 | 2–3 |
| 9 | **Go/no-go meting:** laadtijd, geheugen, framesnelheid, downloadgrootte; beslis of we doorgaan | P0 | 1 |

## 0.33.0: heel de provincie (F2)

| # | Wat | P | Schatting |
|---|---|---|---|
| 1 | Alle tegels van de hele provincie; oude Ommeland-lagen verwijderd | P0 | 20–26 |
| 2 | Landmarks: 500–600 kerken, molens, torens en borgen, de 30 bekendste met de hand | P1 | 8–10 |
| 3 | Plaatsnamen, wijken, bewegwijzering, kaart op provincieschaal | P1 | 4–5 |
| 4 | Echte voorzieningen provinciebreed (ziekenhuizen, politie, tankstations, winkels) | P1 | 3–4 |
| 5 | Prestaties: streaming-stresstest (heli 60 m/s, trein, teleports), downloadbudget ~1 GB | P0 | 4–5 |

## 0.34.0 en verder: de provincie leeft (F3)

- **Voertuigen:** vrachtwagens met opleggers en leveringen naar Eemshaven en Delfzijl, bus-simulator, vliegtuig met landingsbanen, rondvluchten, sproeivliegen, veerboten (P1).
- **Steden:** Delfzijl, Appingedam, Veendam, Winschoten, Hoogezand-Sappemeer, Leek, Uithuizen en andere met winkels, garages, schuilplaats, bijbaantjes en races (P1).
- **Open wereld:** zomerevenementen op echte data (Gronings Ontzet, kermis, oogst), toevalsontmoetingen, verzamelen en geheimen per regio (P2).
- **Bezit:** een snackbar-keten door de provincie (P2).

## Verhaal: Deel 4 "Nazomer" (F4, in drie delen)

| Deel | Regio's | Status |
|---|---|---|
| F4a | Stad, Hogeland, Eemsdelta | script af (`docs/verhaal/deel4-f4a.md`); bouwen kan na 0.32.0 (proefstrook); stemmen opnemen kost ~$1–1,50 |
| F4b | Wadden, Westerkwartier | scripts nog te schrijven |
| F4c | Oldambt, Veenkoloniën, Westerwolde + finale in Vesting Bourtange | scripts nog te schrijven |

Scripts F4a, F4b en F4c staan alle drie in `docs/verhaal/`. **Kalenderfout om recht te zetten voor het bouwen:** F4a zet 15 september op een maandag en de voorrondes op zaterdag 20 en 27 september; in 2026 zijn dat een dinsdag en twee zondagen. Zeven voorrondes passen bovendien niet in 15 tot en met 27 september. Eén gezamenlijke kalenderronde over F4a, F4b en F4c (`STEP_DATES` in `calendar.js`), met F4c die verder loopt dan 27 september of voorrondes die dichter op elkaar liggen, en O10 verplaatst naar 21 september.

Openstaand rond Deel 4: Groningse spelling laten nalezen door een echte Gronings-spreker **[eigenaar]**; de gaswinning-zijlijn alleen met zorg (geen grappen over de schade); winterinhoud en natuurijs uit `PROVINCIE-VERHAAL.md` halen (het is altijd zomer).

## Open source en publiceren (parallel, bijna klaar)

| # | Wat | P |
|---|---|---|
| 1 | OpenRouter-sleutel vervangen | P0 **[eigenaar]** |
| 2 | Beslissen of en wanneer de repo publiek gaat; private vulnerability reporting dan aanzetten | P0 **[eigenaar]** |
| 3 | Juridisch nalezen: AI-stemmen en muziek onder CC BY-NC-SA, voorwaarden van Gemini en OpenRouter | P1 **[eigenaar]** |
| 4 | Social-preview-plaatje en eventueel de website invullen op GitHub | P3 **[eigenaar]** |
| 5 | Credits: tweede Rockstar/Take-Two-vermelding samenvoegen met de disclaimer; releasetekst over de oude naam laten staan of weghalen | P3 **[eigenaar]** |
| 6 | 3D BAG in de bronvermelding zodra het gebruikt wordt | P1 |

## Tegoed en kwaliteit, doorlopend

- **P0** Eén volledige verhaaltest vóór elke release; node-tests, `ring_probe`, `seat_audit`, `voice_coverage`.
- **P1** Handmatige speeltests (Maus): de dingen die nog nooit met de hand zijn gespeeld; achteruitkijken en GPS in het Ommeland, stotteren bij "Heel ver", de padelmissie, bootupgrades, Gronings stemmen.
- **P1** Meer radiomuziek: donkere drill, post-punk, hardstyle, phonk, levenslied, smooth R&B en een zomerhit; minder vrolijk.
- **P2** De groene pixel die Maus soms ziet: gpu, besturingssysteem, grafische stand en schermresolutie navragen.
- **P2** Resterende kleinigheden: de HUD op 720p en 4K opnieuw bekijken; de schakel- en driftteksten in de besturingslijst; AI-motoren in het verkeer; ghost-replay voor drift; fietspadregel voor brommers.
- **P3** Nieuwe prestaties voor drift, trein en vliegen; meer cutscenes met beweging.

## Speeltest Mathijs & Alexander (15 okt)

79 punten, volledig getrieerd in `docs/FEEDBACK-MATHIJS.md` (categorie, P, release, grootte, verzonnen namen, besloten en open vragen). Samenvatting:

| Categorie | Aantal | Waar het landt |
|---|---|---|
| Bug en UX-fix | 3 | 0.30.1 (Herestraat, viaducthoogte bijstellen, schepen slopen bruggen niet) |
| Meta en UI | 7 | 0.30.1 (wachtrij-teller, plaatsnaam minimap, dubbele melding, knopstijl, hintbron-instelling, laadscherm, fietsen Grote Markt) |
| World-fidelity | 8 | 0.31 (samengevoegd met hoogteprofielen, waterhoogtes, 3D BAG, straatdetails), 0.32 (fietsstromen, schepen) |
| Open-wereldleven | 19 | 0.31 (bezorgers, verhuizers, fietsendiefstal, berovingen), 0.32 en later |
| Minigame | 8 | 0.32 (karten, boot te water), rest F3 |
| Missie en verhaalhaak | 19 | F4a (Stad, Hogeland), Bourtange in F4c |
| Landmark en iconisch | 11 | 0.31 (lijst per wijk), 0.32 en 0.33 (bouw, kerken van binnen) |
| Event en weer | 4 | 0.31 (Duitsers, vuurwerk), F3 (aardbeving stil, blauwalg) |

**Besloten door de eigenaar:** iWink als knipoog (verzonnen webbureau, geen echt merk); wraak op een verzonnen mijnbouwbedrijf met zorg; Tessa onveilig bij uitgaan als lichte sociale noot met geverifieerde cijfers (CBS Veiligheidsmonitor, cijfers nog te verifiëren).
**Regel:** geen echte merken, bedrijven of personen in speltekst; echte plaatsen en gebouwen mogen.

Quick wins 0.30.1 (details en bestanden in het triagedocument):
1. "+N in de wacht" weghalen (`hudcards.js`). 2. Plaatsnaam naast minimap uitlijnen (`hud_panel.css`). 3. Dubbele "missie geslaagd" (`cinematics.js`, `missionstory.js`). 4. Eén witte knopstijl. 5. Hintbron Auto/Toetsenbord/Controller (`settings.js`, `pausemenu.js`). 6. Laadscherm één regel. 7. Hint fietsen Grote Markt (`roadaccess.js`). 8. Herestraat dichtheid. 9. Viaducten omhoog (`roadstructures3d.js`). 10. Schepen slopen bruggen niet (`breakables.js`). 11. Boetes mobiel en fietslicht (`trafficlaw.js`). 12. Stedum-grap. 13. Politiepaarden. 14. Merknamen controleren. 15. Meer fietsen in het centrum.

## Beslissingen van de eigenaar (15 okt 2026)

1. De zonnetijd mag zo blijven (zonsondergang 28 augustus rond 18:50).
2. De zelfbedachte feestdagen in de kalender blijven (bloemetjesmarkt 12 sep, suikercampagne 15 sep, laatste zomerdag 22 sep).
3. Rottumeroog en Rottumerplaat als verboden natuur, Schiermonnikoog als cutscene.
4. **De hele provincie in één keer**: na 0.32.0 (go/no-go) niet eerst stad en proefstrook afronden, maar direct door met F2 (alle tegels, alle landmarks) en F3/F4 daarna; releases tussendoor blijven wel geteste pre-releases.
5. NatusPella, niet je echte naam, op alle laatste plekken (credits, Steam, docs).
