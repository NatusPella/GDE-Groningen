# AAA voor de missies van akte 3 en 4: auditkaarten en stand

Hoort bij #955 (aankleding), #956 (binnen spelen), #963 (wachten in een kring) en #1035 (missieplekken). Akte 3 is M12 tot M16 met A2 en T3, akte 4 is M17 tot M21 met T4 (`docs/missies/AAA-UPGRADEPLAN.md` heeft de scoretabel). Akte 1 en 2 doet een andere agent; hun bevindingen staan onderaan alleen als leeswerk.

**Wat is bewezen en wat niet.** Alles hieronder is gebouwd en door pure tests gelopen (`scripts/akte34_beats_test.mjs`, `akte3_aaa_test`, `akte45_aaa_test`, `akte4_test`, `missiedecor_test`, `binnenset_test`, `mission_chain_test`, `wachtprops_test`, `regelkaart_test`, `key_tokens_test`, `text_audit`, `voice_coverage`, en de missieprop-audit op de echte wereld). **Niets is in beeld bekeken**: of het openingsbeeld mooi staat, of de aankleding op de echte plek vrij staat van een muur of een boom, en hoe de beats klinken in tempo, is onbekend. Geen Electron-run in dit venster.

## Wat deze ronde toevoegt (en wat het niet doet)

| Laag | Waar | Wat |
|---|---|---|
| Openingsbeeld | `st.openCam`, `akte34_beats.js` `openingPose` | 3,6 s, camera opzij van de lijn speler-aankleding, 2,1 m hoog, kruip 0,3 m/s, geen pan (pan-budget van `cineshots.js`), zonder letterbox. Alleen voor de hoofdspeler te voet, nooit in een binnenset, nooit als het doel verder dan 60 m ligt. Kiest de kant zonder gebouw (`kiesZij`); staat er aan beide kanten een gebouw, dan geen beeld. |
| Tussenbeats | `st.beats` | `{ na, tekst, sting?, fx? }`: een regel, soms een sting of publieksgeluid, op een tijd in de stap. Geen invloed op klok, stap of beloning. |
| Nasleep | `def.nasleep` | Een of twee regels na de beloning (`toonNasleep` in `missions.js`). |
| Aankleding | `registreerAankleding` | `brugwachter`, `kantoorgevel`, `overweg`, `dijkstart`, `heliplek`. |
| Wachtspullen | `wachtprops.js` | `radio`, `kaartspel`, `landkaart` met eigen idle-clips. |
| Toetsplaatjes | kaarten en `say` | `{H}`, `{E}`, `{W}`, `{S}`, `{SPATIE}`, `{A}`, `{D}` in M12, M15, M17 en M19. |
| Missieplekken | `missionplace.js` `applyPlekFix` | De zes grensgevallen van de audit, zie onderaan. |

Alle nieuwe tekst is alleen te lezen (berichten en kaarten). Er zijn geen nieuwe gesproken regels, dus `docs/verhaal/TTS-ACHTERSTAND-21-11-alleen-tekst.md` hoeft niets te noteren en er is geen audio gegenereerd.

## Auditkaarten

K is kosten (S dagdeel, M een dag of twee). Elke kaart: nu, mist, AAA-versie, K, en wat nu gedaan en bewezen is.

### M12 Het staat niet in het rooster (heli, K S)
- **Nu:** één `heli`-stap, regelkaart, cutscene met koeien bij de landing, Ballonjacht-variant in `helirun.js`.
- **Mist:** een plek bij de start (kale helipad), een beat tijdens de vlucht.
- **AAA:** heliplek met Dijkstra's lunchkisten, een zwaaiende collega, windzak en bord "Dijkstra's lunchservice"; nasleep "warm aangekomen".
- **Gedaan:** aankleding `heliplek`, openingsbeeld (alleen als de speler te voet staat; in de heli blijft de gewone camera), nasleep, toetsplaatjes in de heli-regels. **Niet gedaan:** een beat tijdens de vlucht en de ballonlanding met camera (de heli-stap heeft zijn eigen runner, `helirun.js`/`heli_missie_test`, die ik niet heb aangeraakt). **Bewezen:** data klopt, de heli-test en keten lopen. **Niet bekeken:** of de heliplek op het platform van Eelde vrij van gebouwen staat.

### M13 Het containerlabyrint (K S)
- **Nu:** kaart per stap, haven-aankleding, twee wachtstappen met figuur, kraan en container op geldige plekken (merge van `worktree-agent-af37c3f4143b6023d`, #1035; audit: kraan 16 m van het water, geen afwijkers).
- **Mist:** het wachten in de kraankooi was alleen een bewaker met koffie; geen spanning.
- **AAA:** radio bij de bewaker die vals meezingt, landkaart bij de container, een tweede beat met voetstappen, nasleep met Lammert.
- **Gedaan:** wachtspullen `radio` en `landkaart`, twee beats per wachtstap (met sting `bijna`), openingsbeeld op de kade, nasleep. **Niet gedaan:** camera-cue bij het wegdraaien van de bewaker. **Bewezen:** `akte3_aaa_test`, `akte34_beats_test`. **Niet bekeken.**

### M14 De dijk (K S)
- **Nu:** race met deurwaarder (`chase`), regelkaart, racedecor.
- **Mist:** een startplek met een gezicht, een moment halverwege.
- **AAA:** startlijn "Beslag op de dijk" met de deurwaarder, een kudde schapen na 14 s en de dossiermap uit het raam na 55 s; nasleep met de leeg gegeten map.
- **Gedaan:** `dijkstart`, openingsbeeld bij de start, twee beats, nasleep, finish uit het sluiswater (grensgeval, 3 m). **Niet gedaan:** een afstandsmeter tot de deurwaarder. **Bewezen:** audit nul grensgevallen, tests. **Niet bekeken.**

### M15 Laag over het graan (K S)
- **Nu:** regelkaarten, strook met Roelfien en trekker, publiek van tien bij de landing (#940 getest op papier).
- **Mist:** een moment tijdens de vlucht.
- **AAA:** kermisgangers zwaaien met suikerspinnen bij de poorten (met publieksgeluid); nasleep met het spandoek.
- **Gedaan:** een beat bij de poorten, nasleep, toetsplaatje bij het gas. **Bewezen:** data en tests. **Niet bekeken:** het harnas vliegt niet, de vlucht is nog steeds niet in beeld gezien.

### M16 Nog eentje dan (K S)
- **Nu:** kaart per tent, kroegset voor de toast (de kamer past nu overal volgens #955-fix; alleen Winschoten gemeten).
- **AAA:** nasleep "revanche".
- **Gedaan:** alleen nasleep (de missie heeft geen stappen, dus geen stapbeats). **Niet gedaan:** beat per tent. **Niet bekeken.**

### M17 Open, dicht (K M)
- **Nu:** kaart per brugdeel, stings, boot met `goto`-stappen; start stond in het water (grensgeval).
- **Mist:** Wubbo en de fanfare zijn nergens te zien; de brugwacht-regel is tekst.
- **AAA:** brugwachter aan de kade bij de start (Wubbo zwaait, twee fanfareleden), beat bij de fluit, de eend, en bij de laatste brug de limo die niet door mag; nasleep met het vastzittende mosterdschip.
- **Gedaan:** `brugwachter` op de kade (start 8 m naar vaste grond), openingsbeeld, drie beats, nasleep, toetsplaatje bij de toeter. **Niet gedaan:** Wubbo als figuur op elke brug (geen vaste oever-plek per brug) en een ritme-aanduiding. **Niet bekeken.**

### M18 Wie draaide de camera's uit? (K S)
- **Nu:** kantoorset (#950, #956), serverkamer, kaarten, QTE's zacht.
- **Mist:** de buitenkant; de eerste stap is bij de start al gehaald, dus de speler stond nooit "aan de gevel".
- **AAA:** gevel van Wiebelwerk bij het naar-buiten-moment, beat in de gang en bij de printer, nasleep met de offerte voor een chatbot.
- **Gedaan:** `kantoorgevel` bij de laatste stap, twee beats, nasleep, start 3 m uit de gevel. **Niet gedaan:** de SFX (printer, ventilatoren). **Niet bekeken.**

### M19 Stoom (K S)
- **Nu:** perron met reizigers en fotograaf, bediening, aankomst met treinhoorn.
- **AAA:** twee beats in de rit, nasleep. **Gedaan:** beats (salonwagen met eierballen, fotograaf), nasleep, toetsplaatjes voor gas, rem, fluit en instappen; start 6 m van de weg. **Niet gedaan:** een eigen stoomfluit-klank. **Niet bekeken.**

### M20 Het beleg van Bourtange (K M)
- **Nu:** naspeling-aankleding, kaarten, wachtfiguren bij zes `hold`-stappen, binnenset `kruitkelder`.
- **AAA:** kaartspel bij de wacht, beats met kartonnen kogel, kloppen en Mem; nasleep met Berends flyers.
- **Gedaan:** `kaartspel`, vier beats, openingsbeeld bij de wallen, nasleep. **Niet bekeken.**

### M21 Iedereen heeft een rode auto gezien (K M)
- **Nu:** kaart per deel, stings; de overweg is een kale `goto`.
- **AAA:** overweg met bareel, bord en twee buurtbewoners; een beat als de trein wordt aangekondigd; nasleep met de rode sticker.
- **Gedaan:** `overweg`, beat, nasleep. **Niet gedaan:** treincamera bij de overweg. **Niet bekeken.**

### A2, T3, T4 (bijbanen en reizen)
Niet aangeraakt in deze ronde (A2 en T3 hebben hun regelkaart en uitslag al; T4 niet). Voorstel: de reiskaart van T1 hergebruiken voor T3 en T4 (S).

## De zes grensgevallen van de missieprop-audit (#1035)

`node scripts/world/mission_prop_audit.mjs` op de echte wereld gaf 6 grensgevallen en 0 afwijkers; nu 0 en 0. Elke fix is gemeten met `nearestClearSpot` (1 m ruimte, stap 1 m) en staat als tabel `PLEK_FIX` in `game/js/missionplace.js` (een punt binnen 2 m van `van` gaat naar `naar`).

| Missie | Soort | Wat was het | Verschuiving |
|---|---|---|---|
| De dijk | finish | in het sluiswater | 3 m (`DIJK_SLUIS` in `missions_nieuw.js`) |
| Open, dicht | start | de speler stond in het water | 8 m naar de kade |
| Wie draaide de camera's uit? | start | in de gevel | 1 m |
| Stoom | start | op de weg | 3 m |
| Inpakken | start | op de weg voor het huis | 4 m |
| Terug | start | op de weg voor het erf | 4 m |

Inpakken en Terug zijn akte 6 en vielen onder dezelfde audit; de fix is klein en staat los van de akte-6-defs.

## Wat buiten dit venster viel (alleen gelezen)

- **Fatbikes ontwijken (M08, akte 2):** niet aangeraakt, het is een akte-2-missie van een andere agent. Stand uit de code: regelkaart en Oma Trijntje aan de kade zijn er; de route-fix #1027 staat in de integratietak. Voorstel voor een echte uitdaging, K M: een ontwijk-teller op de kaart ("nog 5 fatbikes"), fatbikes die kruisen op de Ebbingebrug en een tijdsdruk van 160 s met een beat halverwege.
- **Kist Kees en Ballonjacht** (vliegveld Eelde, `helirun.js`, `planeflight.js`): vallen onder de iconen-agent en de heli-runner; niet aangeraakt.
- **Duivenspot, museum (M06), loket (M03):** akte 1, niet aangeraakt.

## Volgende stappen

1. Één Electron-run met beeld voor/na van M13, M14, M17, M18 en M20 (het openingsbeeld en de aankleding bekijken, de kant van de camera controleren in een straat met gebouwen).
2. De heli-stap van M12 een beat geven in `helirun.js` (K S).
3. Wubbo per brug in M17 (K M, vraagt een vaste oever-plek per brug uit de brugdata).
