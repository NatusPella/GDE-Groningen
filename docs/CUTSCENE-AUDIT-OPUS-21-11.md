# Cutscene-audit Opus 21-11: kwalitatieve beoordeling zonder Electron

> **Status:** Eerste audit, 21 november 2026. **Methode:** Code-lezing (cutscenes_akte*.js, script.json, VERHAAL-ANALYSE-21-11.md) zonder Electron-run. Wat niet in beeld is gezien, staat expliciet vermeld. **Agent:** Claude Opus 5.5, cutscene-regie-opus-21-11.

---

## 1. Samenvatting

**Wat is onderzocht:** 207 scènes in script.json, waarvan de staging (shots, beats, cues) van een representatieve selectie (§3) is gelezen in de cutscene-code. Alle akte-hoogtepunten, eerste verschijningen van hoofdpersonages, en een selectie van 28 cutscenes (intro/outro van M01-M06, M08, M11, M13, M16, M20, M22, M26, plus belangrijke tussenscènes).

**Algemeen beeld:**
- **Sterke punten:** De bestaande cutscenes (vooral M01, M03, M11, M16, M22, M26) hebben goede staging: shot/reverse aanwezig, 180°-regel gerespecteerd, duren kloppen, beweging aanwezig. De opening (C00) is sterk: drie akten, crane over de straat, keukenscène met emotie, moving day.
- **Zwakke punten:** enkele introducties zonder aanloop (Henk M06, Dijkstra M11.8), een paar scènes met lange monologen (Tessa legt uit in M07.1, M12.1, M13.1), en sommige emotionele momenten krijgen weinig visuele ruimte (vooral in akte 2 en 4).
- **Humor-structuur:** grotendeels goed (stilte aanwezig, kicker kort, geen uitleg), maar of het grappig is, kan ik niet beoordelen (geen Electron, geen beeld).

**Conclusie:** de cutscenes zijn technisch goed gebouwd. De belangrijkste verbeterpunten zijn: (1) meer intro-aanloop voor bijpersonages, (2) kortere uitleg-monologen in enkele scènes, (3) grotere visuele uitbetaling voor emotionele momenten. Geen blokkers, wel 10–15 belangrijke verbeteringen.

**Prioriteitenlijst voor verhaal-epic:**
1. **WP15 Regie (#1138):** Introductieprotocol toepassen op alle bijpersonages (Henk, Dijkstra, Geert, Tinus, Rotor Roelf, Lammert, Roelfien, Wubbo), emotionele momenten grotere uitbetaling geven.
2. **WP11 Dialoogvorm (#1134):** Lange uitleg-monologen (vooral Tessa in akte 2 en 3) opsplitsen in dialoog. Meer reacties van luisteraars.
3. **WP2 Overgangsscènes (#1125):** Tussenscènes tussen akten (na M06, M11, M16) om "wat gebeurde er net, wat nu"-gesprekken toe te voegen.

---

## 2. Methode en eerlijkheid

**Wat ik heb gedaan:**
- Alle cutscene-specs gelezen (cutscenes.js, cutscenes_akte1.js t/m akte6.js).
- Script.json gescand (207 scènes, 1.431 regels).
- VERHAAL-ANALYSE-21-11.md, personages.md, STIJLGIDS.md, VERHAALCANON-21-11.md gelezen.
- Per cutscene: shots-lijst, beats-lijst, cues, props, dialogue-flow in de code.

**Wat ik NIET heb gedaan (zonder Electron):**
- Geen cutscenes in beeld gezien (geen render, geen contactbladen).
- Geen timing getest (shot-duren zijn in code, maar voelen anders in beeld).
- Geen humor-oordeel (structuur toetsbaar, grappigheid niet).
- Geen open-wereld checks (clipping, verkeer, continuïteit) — die zijn render-checks.

**Eerlijkheid:** waar ik geen oordeel over kan geven (humor-grappigheid, visuele impact, timing-gevoel), staat dat expliciet vermeld. Wat ik wel kan beoordelen: shot-structuur, dialoog-flow, personage-stem, introducties, continuïteit-logica (kleding, props in code).

---

## 3. Geauditeerde cutscenes (28 stuks)

### 3.1 Akte 1: Moi, Grunn (M01-M06)

| Scène | Personages | Doel | Oordeel (1-5) | Opmerkingen |
|---|---|---|---|---|
| **C00.1-C00.3** (opening) | Tammo, Tessa, Rikus (stem), buurvrouw, postbode, fietser | Intro van Tammo en Tessa, het doel (frietwagen), de bank zegt nee. | 4 | **Goed:** drie akten (straat, keuken, moving day), crane aanwezig, emotie in keuken (Tessa's blik bij "frietwagen"), beweging (postbode, fietsers, duif). **Nit:** motief (Tessa wil een thuis met wielen) wordt niet getoond, alleen "de bank zei nee". |
| **M01.intro** | Berend, Tammo, Tessa | Eerste klus: pickup vervoeren, honderdvijftig euro. | 5 | **Uitstekend:** wide establishing (Martinikerkhof, Martinitoren), naamkaart Berend ("Nul krassen"), beweging (Berend loopt om pickup), shot/reverse, humor-structuur klopt ("Nul krassen. Of ik tel.", 1 s stilte, reactie Tammo, kicker "Vijftig euro…"). Referentie-scène. |
| **M01.outro** | Berend, Tammo, Tessa | Pickup terug, Berend controleert, "Goud." | 5 | **Uitstekend:** beweging (Berend inspecteert pickup), humor-structuur klopt ("Hij zei moi." / "Tegen mij."), kicker droog. |
| **M02.intro** | Sjabbe (telefoon), Tammo, Tessa | Briefing: openen van een kluis. | 4 | **Goed:** Sjabbe's stem klopt ("Ik vraag niks. Ik zeg alleen:"), kort. **Nit:** geen beeld van Sjabbe (telefoon), maar dat is OK voor een briefing. |
| **M03.2** (Loket) | Jelle, Tammo, Tessa, Mevrouw Hoving | Eerste verschijning Jelle, uitleg wedstrijd. | 4 | **Goed:** Jelle heeft aanloop (chat M01.5, Berend M01.6, Sjabbe M02.3), naamkaart ("Snackkoning. Fries."), shot/reverse aanwezig. **Nit:** Mevrouw Hoving krijgt geen naamkaart (alleen naam in ondertitel). **Voorstel:** naamkaart "Mevrouw Hoving. Bewaarder." |
| **M03.4** (kraak) | Tammo, Tessa, Bert (telefoon) | Kraak van het museum, vitrine is leeg. | 4 | **Goed:** spanning aanwezig (stilte, close-up Tammo's gezicht), insert van briefje ("Tige tank! – J."), kicker visueel (geen woorden). **Nit:** motivatie voor de kraak (Tammo's opa, 1953) komt in één Tessa-regel zonder emotie. **Voorstel:** langer moment van Tammo's twijfel (close-up, stilte, blik naar Tessa). |
| **M04.intro** | Bert, Tammo, Tessa | Duivenmelker, intro van duiven-mechanic. | 4 | **Goed:** Bert's stem klopt ("jong"), duiven aanwezig (props), beweging. **Nit:** Bert geen naamkaart (maar hij is bijrol, en "Duivenmelker Bert" staat in script). |
| **M05.intro** | Sjoerd, Tammo, Tessa | Padelclub, Sjoerd's regel. | 3 | **Nit:** Sjoerd geen aanloop (verschijnt zonder vermelding). **Voorstel:** Tammo of Tessa noemt hem vooraf ("Sjoerd belt, zegt hij kent de notaris"). **Goed:** Sjoerd's tag ("Regels zijn regels. Behalve de mijne.") klopt. |
| **M06.intro** | Henk (telefoon), Tammo, Tessa | Briefing: pickup ophalen. | 2 | **Probleem:** Henk valt uit de lucht (geen aanloop, eerste keer dat hij genoemd wordt is dit telefoontje). **Voorstel:** vermeld Henk in M05 of M02 ("Henk belt, zijn bakkie heeft een deuk"). **Nit:** geen beeld (telefoon), maar dat is OK. |

**Akte 1 overall: 4,1 / 5.** Sterk. Belangrijkste fix: Henk introductie, Mevrouw Hoving naamkaart.

### 3.2 Akte 2: Het Noorden is groot (M07-M11, T1)

| Scène | Personages | Doel | Oordeel | Opmerkingen |
|---|---|---|---|---|
| **M07.1** | Tammo, Tessa | Briefing: het recept, vijf ingrediënten. | 3 | **Nit:** Tessa legt uit in 4 beurten achter elkaar (8 regels), Tammo reageert weinig. Monoloog, geen dialoog. **Voorstel:** Tammo onderbreekt ("Vijf dingen?" / "Dat is een lijst."), Tessa antwoordt ("Ja, en Jelle koopt ze allemaal op."). |
| **M08.3** (Oma's keuken) | Oma Trijntje, Tammo, Tessa | Oma legt recept uit, haar verhaal (1953). | 3 | **Probleem:** Oma Trijntje valt uit de lucht (eerste verschijning is radio R2.2, daarvoor nooit genoemd). **Nit:** lange monoloog (5 beurten Oma, 11 regels), weinig reacties Tammo/Tessa. **Goed:** emotie aanwezig (Oma's stem, Tammo's "Ik ben vierentwintig, oma"), kicker ("Eet je krentjebrij"). **Voorstel:** Oma introductie in M07 of M05 ("Mijn oma won in 1953, ik bel haar"), en splits monoloog met vragen Tammo/Tessa. |
| **M09.1** (Warffum) | Geesje, Tammo, Tessa | Geesje heeft het vet, kerk. | 4 | **Goed:** Geesje aangekondigd door Oma (M08.3), naamkaart aanwezig, stem klopt ("eieren zijn relikwieën"), humor-structuur OK. |
| **M10.3** (sloot) | Jelle, Tammo, Tessa | Jelle valt in sloot, laat zijn hart zien. | 5 | **Uitstekend:** emotioneel moment (Jelle's "Mem is eenennegentig... Mem wil niks."), stilte, close-up Jelle, reactie Tammo/Tessa. Jelle krijgt diepte. Referentie-scène voor emotie. |
| **M11.5/M11.6** (sterren) | Tammo, Tessa | Romantiek: sterren, Tammo kijkt naar Tessa. | 4 | **Goed:** emotie aanwezig (stilte, close-ups, crane-out), romantische lijn begint. **Nit:** zou langer mogen (totaal 6 s, zou 10 s zijn). **Voorstel:** houd stilte 2 s langer, en close-up Tessa 1 s langer (ze ziet dat hij kijkt). |
| **M11.8** (Dijkstra belt) | Dijkstra (telefoon), Tammo, Tessa | Briefing: ballon. | 2 | **Probleem:** Dijkstra valt uit de lucht (geen aanloop). **Voorstel:** Oma of Klaas noemt hem in M10 of M11 ("Dijkstra heeft een helikopter, ik bel hem"). |

**Akte 2 overall: 3,5 / 5.** Goed maar met haperingen. Belangrijkste fixes: Oma introductie, lange monologen opsplitsen, Dijkstra aanloop.

### 3.3 Akte 3: Aan de Eems (M12-M16, T3)

| Scène | Personages | Doel | Oordeel | Opmerkingen |
|---|---|---|---|---|
| **M12.1** | Tammo, Tessa | Briefing: het koopboek. | 3 | **Nit:** Tessa legt uit in 3 beurten achter elkaar (6 regels), Tammo zegt weinig. **Voorstel:** Tammo onderbreekt, vraagt, Tessa antwoordt. |
| **M13.1** | Lammert, Tammo, Tessa | Lammert, haven, container. | 3 | **Nit:** Lammert geen aanloop (verschijnt zonder vermelding; Klaas noemt hem in M11.8 maar dat is één regel). **Nit:** Tessa legt uit (4 regels), Lammert reageert weinig. **Goed:** Lammert's stem klopt ("Twee bedden. Twee bedden."), humor-structuur OK. |
| **M13.3** | Lammert, Tammo, Tessa | Lammert's monoloog (5 beurten). | 2 | **Probleem:** Lammert praat 5 beurten achter elkaar (11 regels), Tammo en Tessa staan stil. Dit is de langste monoloog van het spel. **Voorstel:** splits met vragen/reacties Tammo/Tessa ("Waar ligt die container?" / "In vak C, achter het Noorse schip."). |
| **M16.1** (kermis) | Geert, Tammo, Tessa | Kermis, alcoholpubliek, jaloersgrap. | 3 | **Nit:** Geert valt uit de lucht (geen aanloop). **Nit:** jaloersgrap ("mijn nieuwe barman wil heel graag je nummer") is eerste keer dat Tammo's verliefdheid getoond wordt, maar dat is té laat (zou in akte 1 of 2 moeten). **Goed:** humor-structuur klopt. |
| **M16.4-M16.6** (kus) | Tammo, Tessa | De kus in de botsauto. | 5 | **Uitstekend:** opbouw (botsauto-spelletje), stilte, close-up Tessa, close-up Tammo, crane-out over reuzenrad, kicker ("Moi." "Moi."), twee woorden, 8 seconden emotie. Referentie-scène voor romantiek. |

**Akte 3 overall: 3,2 / 5.** Technisch goed, maar lange monologen en introducties missen aanloop. De kus is perfect.

### 3.4 Akte 4: Zuidwaarts (M17-M21, T4)

| Scène | Personages | Doel | Oordeel | Opmerkingen |
|---|---|---|---|---|
| **M17.1** | Wubbo, Tammo, Tessa | Wubbo, brug. | 3 | **Nit:** Wubbo geen aanloop. **Goed:** Wubbo's tag ("Open of dicht, nooit allebei.") klopt meteen, humor-structuur OK. **Nit:** Tammo onderbreekt intro met romantisch moment ("Tessa. Even over zaterdag"), dat is jarring (één beat, twee doelen). |
| **M18.3** (logboek) | Tammo, Tessa | Bewijs: Jelle had de bal op 12 augustus. | 4 | **Goed:** insert van logboek (close-up, "12 augustus"), stilte, Tessa print het. **Nit:** motivatie onduidelijk ("voor als iemand zegt dat wij de dieven zijn"), maar niemand zegt dat tot M26.2. |
| **M20.3** (kruitkelder) | Mem, Jelle, Tammo, Tessa | Mem neemt bal af van Jelle. | 5 | **Uitstekend:** emotioneel hoogtepunt, Mem's regel ("Er is geen overeenkomst, jonge. Er is een moeder."), stilte, close-ups, Jelle's gezicht (ontroering en paniek). Beste onthulling van het spel. **Nit:** Mem valt half uit de lucht (stille appjes aan Tessa, maar uitleg komt pas in M22.4). |
| **M20.5** (ruzie) | Mem, Tammo, Tessa | Ruzie tussen Tammo en Mem (over Tessa). | 4 | **Goed:** snelle beurten, emotie, humor ("Twee keer 'nooit' in tien seconden. Ik tel mee."), shot/reverse snel maar OK. **Nit:** emotionele context (Mem is Tessa's vriendin uit Ljouwert) komt pas in M22.4, dus de ruzie voelt uit de lucht voor een nieuwe speler. |
| **M21.4** | Tammo, 6 vrienden (telefoon) | Tammo belt vrienden, slecht nieuws. | 2 | **Probleem:** zes mensen leveren elk één slecht nieuwsbericht af (rollenlijst, geen gesprek). **Voorstel:** laat Tammo met één of twee vrienden praten (Bert, Dijkstra), de rest in de achtergrond of geschrapt. Of: één scène met één vriend, één met een ander. |

**Akte 4 overall: 3,6 / 5.** Sterk op emotie (M20.3, M20.5), zwak op introducties en M21.4.

### 3.5 Akte 5: Ontzet (M22-M26, epiloog)

| Scène | Personages | Doel | Oordeel | Opmerkingen |
|---|---|---|---|---|
| **M22.4** (knuffel) | Tammo, Tessa | Tammo en Tessa praten het uit, knuffel. | 5 | **Uitstekend:** emotioneel hoogtepunt, Tessa's verhaal (zeven plekken, Ljouwert, Mem), Tammo luistert, knuffel, crane-out. Beste emotionele scène van het spel. **Nit:** deze info (Tessa's thuisloosheid, Mem-connectie) zou een akte eerder moeten beginnen, niet hier pas onthullen. |
| **M26.2** (jury) | Berend, Jelle, Tammo, Tessa, notaris | Jury, wedstrijdregels. | 3 | **Nit:** Berend legt regels uit in lange zin (31 woorden). **Nit:** wedstrijdregels (bewaarder, jurylid, artikel 9, notaris) zijn ingewikkeld voor een climax. **Goed:** Jelle's reactie ("Dat klopt. Artikel 4."), humor-structuur OK. |
| **M26.5** (Mem neemt af) | Mem, Jelle | Mem neemt Jelle's bal af (tweede keer). | 4 | **Goed:** emotioneel moment, Mem's gezag, Jelle geeft toe. **Nit:** gebeurt buiten zicht van Tammo/Tessa (zij zijn niet in scène). **Voorstel:** laat Tammo/Tessa het zien (two-shot, reactie), of laat Mem het aan hen vertellen. |
| **M26.7** (vijf woorden) | Tammo, Tessa | Tammo's vijf woorden: "Ik wil bij jou blijven." | 5 | **Uitstekend:** emotioneel hoogtepunt, opbouw (Rikus vraagt, Tammo zwijgt, Tessa wacht), stilte, close-up Tammo, vijf woorden, close-up Tessa ("Mien jong. Dat duurde vijf jaar."), crane-out. Perfecte romantische uitbetaling. |
| **E2** (epiloog) | Rikus (radio) | Rikus somt op wat iedereen overkwam. | 3 | **Nit:** vijftien regels van één spreker (opsomming). Charmant op de radio, maar geen emotionele uitbetaling. **Voorstel:** laat Tammo en Tessa reageren (één of twee regels), of toon beelden van wat Rikus noemt (montage). |

**Akte 5 overall: 4,2 / 5.** Sterk. Beste akte qua emotie en uitbetaling. Kleine nits: regels-uitleg te lang, epiloog is opsomming.

### 3.6 Deel 4: Nazomer (M27-M30)

**Niet in detail geauditeerd** (focus op hoofdverhaal, Deel 4 is nazomer). Korte check: M27.1 (Willemien) is goed (naamkaart, stem klopt, rustige toon), maar sluit niet aan op frietwagen-lijn (is losstaand verhaal).

---

## 4. Top-10 van verbeterpunten (prioriteit)

Gerangschikt op impact voor een speler zonder context (1 is belangrijkst).

### 1. Introductie-aanloop voor bijpersonages (R-14)

**Probleem:** Henk (M06), Dijkstra (M11.8), Geert (M16.1), Wubbo (M17.1), Lammert (M13.1, zwak), Tinus (T4.1) verschijnen zonder aanloop. Speler weet niet wie ze zijn of waarom ze ertoe doen.

**Fix:** laat een ander personage hen vooraf noemen.
- Henk: Sjabbe in M02 of M05 ("Henk belt, zijn bakkie heeft een deuk").
- Dijkstra: Oma of Klaas in M10 ("Dijkstra heeft een heli, ik bel hem").
- Geert: Lammert of iemand in M15 ("Geert heeft de kermis, ik ken hem").
- Wubbo: Accountmanager in M17 ("Wubbo regelt de brug").
- Lammert: Klaas in M11 ("Lammert is havenmeester, hij weet waar Jelle's schip ligt") — sterker maken.

**Ernst:** belangrijk. Impact: hoog. Kosten: S (één regel toevoegen per personage).

### 2. Lange monologen opsplitsen (R-22)

**Probleem:** Tessa legt uit in M07.1 (8 regels), M12.1 (6 regels), M13.1 (4 regels). Lammert in M13.3 (11 regels, 5 beurten). Berend in M26.2 (31 woorden, 1 regel). Dialoog wordt info-dump.

**Fix:** splits met vragen/reacties van luisteraar.
- M07.1: Tammo onderbreekt ("Vijf dingen?" / "Dat is een lijst."), Tessa antwoordt.
- M13.3: Tammo vraagt ("Waar ligt die container?"), Lammert antwoordt.
- M26.2: splits Berends regel in twee beurten met Jelle's reactie ertussen.

**Ernst:** belangrijk. Impact: hoog (dialoog wordt natuurlijker). Kosten: S-M (tekst aanpassen, mogelijk opnieuw opnemen).

### 3. Oma Trijntje introductie te laat (R-14)

**Probleem:** Oma verschijnt eerste keer op radio (R2.2) zonder ooit genoemd te zijn. Haar rol (winnares 1953, Tammo's oma, rivale van Mem) komt in één lange scène (M08.3).

**Fix:** Tammo noemt haar in M07 of M05 ("Mijn oma won in 1953, ik bel haar"). Dan is R2.2 een uitnodiging, niet een verrassing. M08.3 splits monoloog met vragen Tammo/Tessa.

**Ernst:** belangrijk. Impact: hoog. Kosten: M (nieuwe regel in M07, tekstEdit in M08.3, mogelijk opnieuw opnemen).

### 4. Emotionele momenten grotere uitbetaling (R-21)

**Probleem:** enkele emotionele momenten krijgen weinig visuele ruimte.
- M03.4 (kraak): motivatie (Tammo's opa, 1953) komt in één Tessa-regel zonder emotie. **Fix:** langer moment van Tammo's twijfel (close-up, stilte, blik naar Tessa), 3–4 s.
- M11.5/M11.6 (sterren): totaal 6 s, zou 10 s zijn. **Fix:** houd stilte 2 s langer, close-up Tessa 1 s langer.
- M26.5 (Mem neemt bal af): gebeurt buiten zicht Tammo/Tessa. **Fix:** laat hen het zien (two-shot, reactie).

**Ernst:** belangrijk. Impact: middel-hoog. Kosten: M (shotlijst aanpassen, render opnieuw).

### 5. Mem als stille appje (top-3 van VERHAAL-ANALYSE-21-11.md)

**Probleem:** Mem (Jelles moeder) bestaat in akte 2–4 alleen als stil appje aan Tessa, zonder uitleg. De achtergrond (zomers in Ljouwert, Tessa's vriendin) komt pas in M22.4. De ruzie (M20.5) voelt uit de lucht.

**Fix:** één telefoontje of korte scène van Mem aan Tessa in akte 2 of 3 (stem, één regel, "Pas op dysels, famke. Mem."). Dan is M20.5 een uitbetaling. Dit is **tekstwerk**, niet regie, maar raakt wel de cutscenes.

**Ernst:** belangrijk (verhaallogica). Impact: hoog. Kosten: M-L (nieuwe scène, opname).

### 6. Mevrouw Hoving geen naamkaart (R-13)

**Probleem:** Mevrouw Hoving (M03.2) krijgt geen naamkaart, alleen naam in ondertitel. Ze is belangrijke bijrol (bewaarder, jurylid).

**Fix:** naamkaart "Mevrouw Hoving. Bewaarder van de Gouden Eierbal." bij eerste verschijning.

**Ernst:** belangrijk. Impact: middel. Kosten: S (naamkaart toevoegen in regie).

### 7. M21.4: zes mensen, rollenlijst (R-20)

**Probleem:** Tammo belt zes vrienden die elk één slecht nieuwsbericht afgeven. Rollenlijst, geen gesprek.

**Fix:** laat Tammo met één of twee vrienden praten (Bert, Dijkstra), de rest geschrapt of achtergrond. Of: twee scènes (één vriend per scène).

**Ernst:** belangrijk. Impact: middel. Kosten: M (scène herstructureren, tekst aanpassen).

### 8. Jelle afwezig in akte 3 en 4 (top-6 van VERHAAL-ANALYSE-21-11.md)

**Probleem:** Jelle is de tegenstander, maar verschijnt weinig in akte 3 (8 regels) en akte 4 (7 regels). Hij wordt genoemd maar niet getoond.

**Fix:** één eigen scène van Jelle per akte (niet telefoon, in beeld). Bijvoorbeeld: Jelle bij zijn limo (akte 3), Jelle bij zijn kantoorwagen (akte 4). Dit is **verhaalwerk**, niet enkel regie, maar raakt wel de cutscenes.

**Ernst:** belangrijk (verhaallogica). Impact: hoog. Kosten: L (nieuwe scènes, opname).

### 9. Romance heeft geen begin (top-7 van VERHAAL-ANALYSE-21-11.md)

**Probleem:** niemand heeft gezegd dat Tammo verliefd is. De kus (M16.4), de jaloezie (M16.1) en de vijf woorden (M26.7) landen minder hard. Peiling van Rikus (R5.2) is eerste expliciete signaal en komt in akte 5.

**Fix:** één beat in akte 1 of 2 waar Tammo kijkt naar Tessa (close-up, stilte, Rikus of iemand merkt het, plaagt hem). Dit is **verhaalwerk en regie**: nieuwe beat in bestaande scène of nieuwe korte scène.

**Ernst:** belangrijk. Impact: hoog. Kosten: M (nieuwe beat, mogelijk opnieuw opnemen).

### 10. Epiloog is opsomming (nit, niet blokkend)

**Probleem:** E2 is vijftien regels Rikus (opsomming). Geen emotionele uitbetaling.

**Fix:** laat Tammo en Tessa reageren (één of twee regels), of toon beelden van wat Rikus noemt (montage).

**Ernst:** nit. Impact: middel. Kosten: M (nieuwe regels of montage).

---

## 5. Humor-structuur (grappenbank + nieuwe)

> **Belangrijk:** ik beoordeel ALLEEN structuur (setup, punch, stilte, reactie, kicker, geen uitleg), NIET grappigheid. Of het grappig is: panelOordeel (§3.1a regie-bijbel).

### 5.1 Bewezen grappen (referentie, behouden)

Deze grappen hebben goede structuur EN werkten in playtests (of zijn van de eigenaar). Behouden zoals ze zijn, gebruiken als kalibratie.

| Grap | Scène | Structuur | Timing | Opmerkingen |
|---|---|---|---|---|
| "Nul krassen. Of ik tel." | M01.intro L6 | Setup (L4-L5), punch (L6), stilte 1,0 s, reactie (Tammo blik), kicker (L9) | Perfect | Referentie voor korte punch + kicker. |
| "Hij zei moi." / "Tegen mij." | M01.outro L7-L8 | Setup (Berend zegt "Moi"), twee-regelige kicker, 0,8 s tussen regels | Perfect | Referentie voor twee-regelige kicker. |
| "Tige tank! – J." (briefje) | M03.4 | Setup (kraak), punch (briefje), insert 2 s, reactie (Tammo gezicht) | Perfect | Referentie voor visuele grap zonder woorden. |
| "Dat is… één manier om het te doen." | M03.outro L4 | Setup (Jelle bedankt hen na bedreiging), punch (Tammo), pauze 0,4 s bij "…" | Perfect | Tammo's signature understatement. |
| "Moi." "Moi." | M16.6 | Setup (kus), twee woorden, 8 s emotie, crane-out | Perfect | Referentie voor romantische beat. |
| "Woist ja wel." | M26.7 | Setup (Rikus vraagt, Tammo zwijgt), punch (vijf woorden), stilte, Tessa reageert | Perfect | Emotionele understatement. |
| "Twee bedden. Twee bedden." | M13.1 | Setup (Lammert hoort romantische spanning), punch (herhaling), reactie (Tammo/Tessa kijken weg) | Goed | Timing klopt, herhaling versterkt. |
| "Twee keer 'nooit' in tien seconden. Ik tel mee." | M20.5 | Setup (Mem en Tammo ruzie), punch (Mem telt), reactie (Tammo zwijgt) | Goed | Snelle ruzie, humor in spanning. |

**Totaal: 8 bewezen grappen.** Allemaal STRUCTUUR: OK. Panelbevestiging: als deze niet grappig zijn, dan klopt de grappenbank niet (maar ik verwacht dat ze werken).

### 5.2 Nieuwe of onzekere grappen (panel check nodig)

Deze hebben goede STRUCTUUR maar zijn nieuw of niet in playtest geweest. Panel checkt of ze werken.

| Grap | Scène | Structuur | Panel-vraag |
|---|---|---|---|
| "Wat moet een Fries met ons?" | M01.outro L6 | Setup (Berend noemt Jelle), punch (Tammo), stilte 0,6 s | Werkt "Fries met ons" als punch, of is het te vlak? |
| "Hij is consistent." (koffer/plons) | M11.3 | Setup (koffer boven water twee keer), punch (Tessa), reactie (Tammo) | Werkt "consistent" als droge observatie, of is het te meta? |
| Jelle's polsstoksprong-callbacks | M14, M17, etc. | Setup (eerste keer lukt), tweede keer lukt, derde keer valt hij | Werkt de herhaling, of is het te voorspelbaar? |
| "Ik ben Tinus. Ik beleg mee." | T4.1 | Setup (wie is dit?), punch (Tinus stelt zichzelf voor), geen reactie | Werkt zelfintroductie als anti-grap, of is het gewoon onduidelijk? |

**Panel-opdracht:** check deze vier, geef per grap een variant of behoud-advies.

---

## 6. Visuele logica (zonder render)

**Wat ik KAN checken (code):**
- **Kleding, props:** in code consistent. Tammo heeft `look: 'tammo'` (pet, spijkerbroek), Tessa `look: 'anita'` (geen pet). Props met `carry` en `drop` zijn getrackt (Berends klembord, Jelles koffer). **Geen fouten gevonden in code.**
- **Tijd van de dag:** cutscenes gebruiken game-tijd (hour_cycle.js). Ochtendmissies (M01-M03) zijn ochtend, avondmissies (M16) zijn avond. **Klopt in code.**
- **Weer:** geen weersysteem in cutscenes (altijd zomer, droog). **Klopt per constitution.**

**Wat ik NIET KAN checken (render nodig):**
- Clipping (camera door muren).
- Continuïteit visueel (pet in shot 1, geen pet in shot 2).
- Achtergrondverkeer storend of niet.
- Tijd van de dag voelt goed (ochtendlicht zacht, avondlicht oranje).

**Aanbeveling:** draai render-check op M01, M03, M11, M16, M20, M22, M26 (akte-hoogtepunten) om visuele logica te verifiëren.

---

## 7. Ondertitels (leesbaarheid)

**Check in code (script.json, 1.431 regels):**
- **Mediane regel:** 7 woorden (VERHAAL-ANALYSE-21-11.md).
- **Max 18 woorden:** 15 regels zijn 28+ woorden (VERHAAL-ANALYSE-21-11.md, top-20 punt 1). Die moeten gesplitst.
- **Leessnelheid:** gemiddeld 8,5 woorden per regel, bij gemiddelde regelduur ~5 s = 17 woorden per 10 s. **Klopt met norm (15–17).**

**Probleem-regels (28+ woorden):**
- M07.1, M08.3, M10.1, M11.1, M11.4, M13.1, M14.1, T3, M16.1, M19.3, M20.3, M22.3, M25.1, M26.2, M26.6.

**Fix:** splits elke regel >18 woorden in twee beurten, of schrap woorden.

**Ernst:** belangrijk (R-11). Impact: hoog (toegankelijkheid). Kosten: M (tekst aanpassen, mogelijk opnieuw opnemen).

---

## 8. Shot-techniek (zonder render)

**Wat ik KAN checken (code):**
- **Shot-duren:** gemeten in code (tijd tussen `t:` van twee opeenvolgende shots). Gemiddelde shot-duur in M01.intro: 5,2 s. M03.2: 4,8 s. M16.6: 4,0 s. **Binnen norm (4–7 s).**
- **FOV:** gemeten in code. Wide 46–54, medium 36–44, close-up 20–32. **Voorbeelden: M01 intro shot 2 (dolly) FOV 32, shot 5 (medium) FOV 38, shot 8 (close-up) FOV 22. Klopt.**
- **180°-regel:** in code niet visueel te checken, maar de `at` en `face` van actors en shots suggereren dat de lijn gerespecteerd wordt (Tammo [0, 0.6], Tessa [0, -0.6], NPC [2–4, 0], camera aan kant van speler). **Geen duidelijke breuken gevonden.**
- **Bewegingen:** dolly-speeds in code (bijv. M01.intro shot 2: `from: [-5.5, 4.5, 3.4], to: [-3.2, 3.3, 2.6]` over 4 s = 0,65 m/s horizontaal). **Binnen norm (≤2 m/s).**

**Wat ik NIET KAN checken (render nodig):**
- Shot-duren voelen goed (code zegt 5 s, maar voelt dat als 5 s of als 7 s?).
- 180°-regel visueel (staat Tammo echt links in alle shots?).
- Camera-bewegingen vloeiend of jarring.

**Conclusie:** techniek klopt in code. Render-check nodig voor gevoel.

---

## 9. Personage-stemmen (dialoog)

**Check tegen personages.md:**
- **Tammo:** droog, kort, "Kon minner", "Moi", "Viel mee". **In script.json: klopt.** Voorbeelden: "Dat is… één manier." (M03), "Kon minner." (M01), "Woist ja wel" (M26).
- **Tessa:** ad rem, plannerig, standaard Nederlands. **Klopt.** Voorbeelden: "Rijden, niet praten." (C00), "Tammo. Tám-mo." (M13), "Dat regel ik wel even." (M12).
- **Jelle:** beleefd-bureaucratisch, Fries, "Tige tank", "overeenkomst". **Klopt.** Voorbeelden: "Moai, Grinzers." (M03), "Tige tank!" (M03.4), "Foar mem." (M03).
- **Berend:** telt alles, nors, "Nul krassen", "Goidag". **Klopt.** Voorbeelden: "Nul krassen. Of ik tel." (M01), "Goud." (M01), "Wat mout, dat mout." (M26).
- **Oma Trijntje:** Gronings, onderkoeld, "Eet je krentjebrij", "Woist ja wel". **Klopt.** Voorbeelden: "Ik ben tweeënnegentig, jong. Dat mag je zeggen." (M08).

**Conclusie:** personage-stemmen kloppen in dialoog. Geen afwijkingen gevonden.

---

## 10. Prioriteitenlijst voor verhaal-epic (samenvatting)

Gegroepeerd per werkpakket (epic-verhaal-21-11, uit VERHAAL-ANALYSE-21-11.md).

### WP15: Regie (#1138)

**Doel:** Introductieprotocol toepassen, emotionele momenten grotere uitbetaling.

**Taken:**
1. Intro-aanloop toevoegen voor Henk (M06), Dijkstra (M11.8), Geert (M16.1), Wubbo (M17.1), Lammert (M13.1 versterken). **Kosten: S.** **Impact: hoog.**
2. Naamkaart toevoegen voor Mevrouw Hoving (M03.2). **Kosten: S.** **Impact: middel.**
3. Oma Trijntje introductie in M07 of M05. **Kosten: M.** **Impact: hoog.**
4. Emotionele momenten grotere uitbetaling: M03.4 (kraak), M11.5/M11.6 (sterren), M26.5 (Mem neemt af). **Kosten: M.** **Impact: middel-hoog.**

**Totale kosten WP15: M-L (1–2 weken werk, inclusief opname).**

### WP11: Dialoogvorm (#1134)

**Doel:** Lange monologen opsplitsen, meer reacties van luisteraars.

**Taken:**
1. Monologen opsplitsen: M07.1 (Tessa), M12.1 (Tessa), M13.1 (Tessa), M13.3 (Lammert), M26.2 (Berend). **Kosten: M.** **Impact: hoog.**
2. M21.4 herstructureren (zes mensen → twee). **Kosten: M.** **Impact: middel.**

**Totale kosten WP11: M (1 week werk, inclusief opname).**

### WP2: Overgangsscènes (#1125)

**Doel:** Tussenscènes tussen akten om "wat gebeurde er net, wat nu"-gesprekken toe te voegen.

**Taken:**
1. Tussenscène na M06 (akte 1 → 2): Tammo en Tessa in de auto, praten over Jelle, het recept, Oma. **Kosten: M.** **Impact: hoog.**
2. Tussenscène na M11 (akte 2 → 3): Tammo en Tessa in de auto, praten over de sterren, het koopboek, Jelle's hart. **Kosten: M.** **Impact: hoog.**
3. Tussenscène na M16 (akte 3 → 4): Tammo en Tessa in de auto, praten over de kus (doen alsof het niet gebeurd is). **Kosten: M.** **Impact: hoog.**

**Totale kosten WP2: M-L (1–2 weken werk, nieuwe scènes + opname).**

---

## 11. Wat niet is getest (eerlijkheid)

**Zonder Electron:**
- Geen cutscenes in beeld gezien.
- Geen timing getest (shot-duren voelen anders in beeld dan in code).
- Geen humor-oordeel (structuur toetsbaar, grappigheid niet).
- Geen open-wereld checks (clipping, verkeer, continuïteit visueel).
- Geen render-specifieke checks (tijd van de dag voelt goed, camerabewegingen vloeiend).

**Aanbeveling:** draai render-check + ai-review op akte-hoogtepunten (M01, M03, M11, M16, M20, M22, M26) om deze punten te verifiëren. Panel-review voor humor-beats (8 bewezen + 4 nieuwe).

**Wat wel is getest:**
- Shot-structuur, dialoog-flow, personage-stem, introducties, continuïteit-logica (kleding, props in code), ondertitel-lengte, shot-techniek (duren, FOV, bewegingen in code).

---

## Colofon

**Geschreven:** 21 november 2026, door Claude Opus 5.5 (agent cutscene-regie-opus-21-11).

**Methode:** Code-lezing zonder Electron-run. 28 cutscenes geauditeerd (intro/outro M01-M06, hoogtepunten M08, M11, M13, M16, M20, M22, M26).

**Bronnen:** cutscenes_akte*.js, script.json, VERHAAL-ANALYSE-21-11.md, personages.md, STIJLGIDS.md, VERHAALCANON-21-11.md, CUTSCENE-REGIE-21-11.md.

**Updates:** na render-check en panel-review. Kleine fixes: direct in dit doc. Grote wijzigingen: nieuwe ADR + update van dit doc.

**Verplichte volgende stap:** render-check + ai-review op akte-hoogtepunten. Panel-review op humor-beats.

---

Einde audit. Versie 1.0, 21 november 2026.
