# Verhaalcanon 21-11: Tammo en Tessa zijn net afgestudeerd

Besluit van de eigenaar (21-11). Dit document is het canonblad voor alles wat de leeftijd, de relatie en het verleden van Tammo, Tessa en Rikus uitdrukt. Het stelt vast wat nu geldt, loopt de audit door (welke plek zei wat) en houdt de lijst bij van de gesproken regels die opnieuw moeten worden opgenomen. Het feitenblad in [verhaal/STIJLGIDS.md](verhaal/STIJLGIDS.md) verwijst hiernaar.

## 1. Het besluit

Tammo en Tessa zijn **net student af** en trekken de wijde wereld in. Ze waren al vrienden tijdens hun studie in Groningen en zijn nu werkloos: hun eerste klusjes komen uit het spel. Dat vervangt de oude canon: "ze kennen elkaar al twintig jaar sinds de treinreis als kinderen", Tammo is 34, "twaalf jaar verliefd". Blijft staan: Tessa komt van het platteland (boerendochter, dorpsteam, zie [verhaal/OPENING-BIJBEL.md](verhaal/OPENING-BIJBEL.md)), Beppe is Tammo's oma (eerst bezoek, dan overlijden), Rikus is Tammo's jeugdvriend uit Groningen.

## 2. Canonblad (de nieuwe feiten)

| Feit | Waarde |
|---|---|
| Leeftijd | Tammo 24 (*Ik ben vierentwintig, oma*), Tessa 24, Rikus 25. De geboortejaren schrijven we nergens uit. |
| Kennismaking | Tammo en Tessa leerden elkaar kennen in hun **eerste Kiezelweek** (de introductieweek van de studie), vijf jaar geleden. Ze werden vrienden en later huisgenoten. |
| De treinreis naar Delfzijl | Het uitje om naar de zee te kijken ("Er was geen zee. Alleen een dijk.") hoort nu bij die eerste studiejaren. De regel "Weet je nog? Met de trein naar Delfzijl" blijft dus ongewijzigd en klopt. Tessa geloofde Tammo's grap **vijf jaar** lang. |
| Verliefd | Tammo is **al sinds de studie** verliefd op Tessa en zweeg **vijf jaar** (M26.7: "Dat duurde vijf jaar."). Toon en grap van de romance blijven; alleen het getal is kleiner. |
| Studie van Tammo | Tammo had twee valse starts (de grappen "Hier gestudeerd, twee weken" bij het Academiegebouw en "Daar heb ik die drie weken gestudeerd" bij Zernike blijven staan), voor hij een opleiding vond waar hij bleef. Die opleiding noemen we niet. Hij is nu afgestudeerd. |
| Studie van Tessa | Tessa kwam op haar achttiende van het platteland naar Stad voor de studie. De opleiding noemen we niet. Haar boerenkennis, het dorpsteam en de zeven plekken in haar jeugd blijven zoals ze waren. |
| Werk | **Besluit eigenaar 21-11:** beiden zijn werkloos net afgestudeerd. Geen kantoorbaan en geen boerderijbaan; hun eerste klusjes (bijbanen, missies) komen uit het spel zelf. Dat verklaart waarom de bank de frietwagenlening afwees en waarom ze samen "precies genoeg voor een patatje" hebben. Andere docs (voetbal, Bezit) zeggen "eerste klusjes", niet "eerste baantjes". Rikus heeft wel werk: de nachtradio. |
| Rikus | Tammo's **jeugdvriend uit het Oosterpark** (van vóór de studie). Tessa leerde hem tijdens de studie via Tammo kennen. Zijn eerste baan is de nachtradio. |
| Beppe | Tammo's oma (Fries), een ander personage dan Oma Trijntje. Dat Beppe Tessa "voor het eerst ziet" klopt nu des te beter: vijf jaar vrienden, nu eerst een bezoek. Geen tekstwijziging nodig. |
| Oma Trijntje | 92. Tammo is haar kleinzoon (de krentjebrijregel); Tessa kent haar uit de studietijd. |
| Samenwonen | Ongewijzigd: sinds 14 augustus samen in Paddepoel (Pleiadenlaan). |
| Opening in de Oosterparkwijk | Ongewijzigd: de keuken van de opening is het laatste (studenten)huis; Tammo komt uit de buurt. |

## 3. De audit: wat zei de oude canon?

"Voorstel" is wat nu in de repo staat. "Stem" is de sleutel in het voicelines-manifest (`Stem|tekst`) als er een opname aan hangt.

### 3.1 Gesproken regels (veranderd, moeten opnieuw worden opgenomen)

| Bestand:regel (bron) | Oude tekst | Nieuwe tekst | Oude opname |
|---|---|---|---|
| `docs/verhaal/nieuw/09-script-akte2.md` (M08.3) en `game/js/missionstory.js` (H5/M08-oma-scène) | Ik ben vierendertig, oma. | Ik ben vierentwintig, oma. | `Tammo\|Ik ben vierendertig, oma.` |
| idem | Dan eet je hem al vierendertig jaar te weinig. | Dan eet je hem al vierentwintig jaar te weinig. | `Oma Trijntje\|Dan eet je hem al vierendertig jaar te weinig.` |
| `docs/verhaal/nieuw/09-script-akte2.md` (T1) | Jij zei dat de zee achter de dijk lag. Ik heb het twintig jaar geloofd. | ... Ik heb het vijf jaar geloofd. | `Anita\|Jij zei dat de zee achter de dijk lag. Ik heb het twintig jaar geloofd.` |
| `docs/verhaal/nieuw/09-script-akte5.md` (M26.7) en `game/js/missionstory.js:450` | Mien jong. Dat duurde twaalf jaar. | Mien jong. Dat duurde vijf jaar. | `Anita\|Mien jong. Dat duurde twaalf jaar.` |

Totaal: **4 gesproken regels** (3 stemmen: Tammo 1, Tessa 2, Oma Trijntje 1). Nieuwe Gronings spreektekst staat in `scripts/gronings_spoken.json` ("vijf" wordt "vief"). De nieuwe teksten staan in `scripts/voice_wacht.json` (wacht op opname); de TTS-ronde neemt ze op en leegt de lijst. De oude clips blijven als geschiedenis in de manifesten staan tot de ronde ze overschrijft.

Tot de opname er is, tonen de regels alleen tekst (`textOnly` in `game/storydata/script.json`; de scènes zelf blijven spelen). In `game/js/cutscenes_akte2.js` volgt de gebarenlijst de tekst (`on: 'Ik ben vierentwintig'`).

### 3.2 Alleen tekst (geen opname, veranderd)

| Bestand | Oud | Nieuw |
|---|---|---|
| `game/js/storyarc_nieuw.js` (bio Tammo), `game/js/storyarc_basis.js`, `game/js/characters.js` | Al twaalf jaar verliefd op zijn beste vriendin | Net afgestudeerd en al sinds de studie verliefd op zijn beste vriendin |
| `game/js/storyarc_nieuw.js` (prestatiekaart M26 "Vijf woorden") | Het duurde twaalf jaar. | Het duurde vijf jaar. |
| `game/js/characters.js`, `game/js/storyarc_basis.js` (Rikus) | De derde van het clubje van de stoep in het Oosterpark. | De jeugdvriend van Tammo, van de stoep in het Oosterpark, later ook die van Tessa. |
| `docs/verhaal/nieuw/05-akte5.md` (M22.4, Tammo) | Ik heb twaalf jaar niks gezegd. | Ik heb vijf jaar niks gezegd. (alleen tekst; geen opname) |
| `docs/steam/winkelpagina.md` | Al twaalf jaar niet. | Al sinds de studie niet. |

### 3.3 Documenten (feitenblad en achtergrond)

| Bestand | Wat |
|---|---|
| `docs/verhaal/STIJLGIDS.md` (feitenblad, twee rijen) | leeftijd, kennismaking, verliefd, werkloos, klusjes, Rikus |
| `docs/personages.md` (Tammo, Rikus) | clubje van de stoep, twaalf jaar |
| `docs/verhaal/nieuw/00-OVERZICHT.md`, `01-akte1.md`, `02-akte2.md`, `05-akte5.md` | rolkolom Rikus, romantiek akte 1, oma-scène, openbaring en Tessa's verleden (Stad vanaf haar achttiende) |
| `docs/verhaal/OPENING-BIJBEL.md` (Tessa van het platteland) | "tot haar achtste, voor het Oosterpark" wordt "tot haar achtste op het platteland, vanaf haar achttiende in Stad voor de studie" |
| `docs/verhaal/nieuw/ronde2-besluiten.md`, `docs/verhaal/TESSA-NEDERLANDS.md`, `docs/groningen-memes-onderzoek.md` | verwijzingen naar de oude regels |

### 3.4 Bewust niet aangepast

| Plek | Reden |
|---|---|
| "Hier gestudeerd, twee weken" (M05.1) en "drie weken gestudeerd" (banter, Zernike) | Sluiten aan op de nieuwe canon (valse starts). Geen wijziging. |
| "Weet je nog? Met de trein naar Delfzijl, om naar de zee te kijken." (T1) | Klopt als studie-uitje. Geen wijziging, dus de opname blijft. |
| Beppe-teksten (`beppe_*texts.js`) | "Jullie zijn vrienden", "ziet Tessa voor het eerst": klopt. |
| Trailer, Steam en test: de slogan is vervangen (zie 5). | Besluit eigenaar 21-11. |
| Archief (`docs/archief/**`), WITTE-RUIS-rapporten, gegenereerde lijsten | Historie, niet aanpassen. |
| `lines`-opname "Dan eet jij het op. Dat doe je al twaalf jaar, mijn restjes." (alleen in manifest en archief) | Geen bron in code of scripts; oud en ongebruikt. Alleen opruimen als iemand hem wil terugbrengen (dan "al vijf jaar"). |
| "Ik heb op zeven plekken gewoond voor ik tien was" (M22) en de zomers in Ljouwert | Blijft staan; botst zacht met "boerderij tot haar achtste", maar dat is al zo sinds de aanvulling van 21-11 (OPENING-BIJBEL). |
| `docs/VOETBAL-CARRIERE-21-11.md` hoofdstuk 2b (botsingenlijst) | Stond niet op `origin/main` en de branch `voetbal-carriere-plan-21-11` is niet aangetroffen op origin; die lijst is dus niet naast deze audit gelegd. |

## 4. Canon-kern: waarom het hoofdverhaal bestaat

Wie wil wat en waarom: **Tessa ontdekt dat ze een frietwagen wil** en vindt het superleuk om dat samen met Tammo te doen. Zijn liefde voor autorijden en haar liefde voor vette snacks komen samen in de snackwagen op de Escapade. Ze zijn net afgestudeerd, werkloos en zonder vast inkomen (de bank zei nee), dus de enige weg is de enige vrije standplaats, en die gaat naar de winnaar van de Snackprijs. Tammo wil vooral bij haar blijven (zijn vijf woorden); Tessa wil een thuis met wielen. Ze ontdekken zichzelf in Grunn: het echte leven begint hier. Jelle wil de markt en de bal. Dit is de motivatie voor elke missie; de logline in 00-OVERZICHT en de Steam-blurb volgen dit.

## 5. Sloganopties (voor de eigenaar)

> **Besloten (23-11, bevestigd 24-11):** de slogan is *Een zomer in Grunn. Kon minder.* De opties hieronder zijn geschiedenis. Ook sectie 4 is bijgesteld door de eigenaar: de snackwagen is een late twist (akte 5); de motor van elke missie is een eigen plekje in de wereld en de carrière-tour, met hun eerste baantjes als volwassenen (zie `verhaal/RUGGENGRAAT.md`).

1. **Twee afgestudeerden. Eén frietwagen. Geen plek.** (voorlopig gekozen: houdt de haak "geen plek" en de drieslag; nu in trailer, Steam-blurb, YouTube-afbeeldingen en test)
2. Net afgestudeerd. Nog geen plan. Wel een frietwagen.
3. Tammo rijdt. Tessa bakt. Samen sta je ergens.
4. Het echte leven begint in Grunn, met friet.
5. Twee studenten gaan het echte leven in. Eén frietwagen helpt.

Alle opties zijn Nederlands, zonder echte merken, met "Grunn" zonder "de". De slogan staat in `game/js/intromontage.js`, `docs/steam/winkelpagina.md`, `scripts/youtube_images.mjs`, `scripts/youtube_thumbnails.mjs` en de test `scripts/verhaal_onthulling_test.mjs`.

## 6. Besluiten van de eigenaar (21-11)

Vijf jaar bevestigd. Werkloos (geen baantjes). Slogan zoals hierboven (voorlopig). Tammo's stemtag blijft "in his thirties" (consistentie met de bestaande clips).

## 7. Wat onzeker is (voor de eigenaar)

1. (Besluit 21-11: vijf jaar bevestigd.)
2. **Gronings "vief"** (vijf) in de spreektekst van Tessa: controleer bij de TTS-ronde.
4. **Tessa's verleden** ("zeven plekken", Ljouwert, boerderij, Stad vanaf haar achttiende) is nu consistent genoeg voor de speler, maar niet strak; een nette versie vraagt een besluit van jou.
5. De slogan (zie 5) is voorlopig; de eigenaar kiest.
6. (Besluit 21-11: stemtag blijft.)
7. De oude clips blijven tot de TTS-ronde in de manifesten; de regels zijn tot dan alleen tekst.
