# Verhaalcanon 21-11: Tammo en Tessa zijn net afgestudeerd

Besluit van de eigenaar (21-11). Dit document is het canonblad voor alles wat de leeftijd, de relatie en het verleden van Tammo, Tessa en Rikus uitdrukt. Het stelt vast wat nu geldt, loopt de audit door (welke plek zei wat) en houdt de lijst bij van de gesproken regels die opnieuw moeten worden opgenomen. Het feitenblad in [verhaal/STIJLGIDS.md](verhaal/STIJLGIDS.md) verwijst hiernaar.

## 1. Het besluit

Tammo en Tessa zijn **net student af** en trekken de wijde wereld in. Ze waren al vrienden tijdens hun studie in Groningen en hebben nu hun eerste volwassen baantjes. Dat vervangt de oude canon: "ze kennen elkaar al twintig jaar sinds de treinreis als kinderen", Tammo is 34, "twaalf jaar verliefd". Blijft staan: Tessa komt van het platteland (boerendochter, dorpsteam, zie [verhaal/OPENING-BIJBEL.md](verhaal/OPENING-BIJBEL.md)), Beppe is Tammo's oma (eerst bezoek, dan overlijden), Rikus is Tammo's jeugdvriend uit Groningen.

## 2. Canonblad (de nieuwe feiten)

| Feit | Waarde |
|---|---|
| Leeftijd | Tammo 24 (*Ik ben vierentwintig, oma*), Tessa 24, Rikus 25. De geboortejaren schrijven we nergens uit. |
| Kennismaking | Tammo en Tessa leerden elkaar kennen in hun **eerste Kiezelweek** (de introductieweek van de studie), vijf jaar geleden. Ze werden vrienden en later huisgenoten. |
| De treinreis naar Delfzijl | Het uitje om naar de zee te kijken ("Er was geen zee. Alleen een dijk.") hoort nu bij die eerste studiejaren. De regel "Weet je nog? Met de trein naar Delfzijl" blijft dus ongewijzigd en klopt. Tessa geloofde Tammo's grap **vijf jaar** lang. |
| Verliefd | Tammo is **al sinds de studie** verliefd op Tessa en zweeg **vijf jaar** (M26.7: "Dat duurde vijf jaar."). Toon en grap van de romance blijven; alleen het getal is kleiner. |
| Studie van Tammo | Tammo had twee valse starts (de grappen "Hier gestudeerd, twee weken" bij het Academiegebouw en "Daar heb ik die drie weken gestudeerd" bij Zernike blijven staan), voor hij een opleiding vond waar hij bleef. Die opleiding noemen we niet. Hij is nu afgestudeerd. |
| Studie van Tessa | Tessa kwam op haar achttiende van het platteland naar Stad voor de studie. De opleiding noemen we niet. Haar boerenkennis, het dorpsteam en de zeven plekken in haar jeugd blijven zoals ze waren. |
| Eerste baantjes | AANNAME, nog niet in speltekst: Tammo heeft een kleine, vaak wisselende baan en kan "nooit iets betalen"; Tessa heeft haar eerste baan zonder vast contract. Dat verklaart waarom haar bank de frietwagenlening afwees ("uw plan is sympathiek") en waarom ze samen "precies genoeg voor een patatje" hebben. Het spel noemt geen werkgever (geen echte merken, geen echte bedrijven). |
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
| `docs/verhaal/STIJLGIDS.md` (feitenblad, twee rijen) | leeftijd, kennismaking, verliefd, baantjes, Rikus |
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
| Trailer en Steam "Twee Stadjers. Eén frietwagen. Geen plek." (`intromontage.js:847`, test `verhaal_onthulling_test.mjs:84`, `winkelpagina.md:37`) | Tessa komt van het platteland, maar woont nu in Stad; "Stadjers" blijft verdedigbaar. Optie voor de eigenaar: "Twee afgestudeerden." |
| Archief (`docs/archief/**`), WITTE-RUIS-rapporten, gegenereerde lijsten | Historie, niet aanpassen. |
| `lines`-opname "Dan eet jij het op. Dat doe je al twaalf jaar, mijn restjes." (alleen in manifest en archief) | Geen bron in code of scripts; oud en ongebruikt. Alleen opruimen als iemand hem wil terugbrengen (dan "al vijf jaar"). |
| "Ik heb op zeven plekken gewoond voor ik tien was" (M22) en de zomers in Ljouwert | Blijft staan; botst zacht met "boerderij tot haar achtste", maar dat is al zo sinds de aanvulling van 21-11 (OPENING-BIJBEL). |
| `docs/VOETBAL-CARRIERE-21-11.md` hoofdstuk 2b (botsingenlijst) | Stond niet op `origin/main` en de branch `voetbal-carriere-plan-21-11` is niet aangetroffen op origin; die lijst is dus niet naast deze audit gelegd. |

## 4. Wat onzeker is (voor de eigenaar)

1. **Vijf jaar** voor "geloofd", "zweeg" en "verliefd" is een keuze (eerste Kiezelweek tot nu). Wil je het kleiner of vager ("al die jaren"), dan veranderen de vier regels weer.
2. **Gronings "vief"** (vijf) in de spreektekst van Tessa: controleer bij de TTS-ronde.
3. **Tammo's baan en Tessa's baan** staan alleen in dit blad, niet in speltekst.
4. **Tessa's verleden** ("zeven plekken", Ljouwert, boerderij, Stad vanaf haar achttiende) is nu consistent genoeg voor de speler, maar niet strak; een nette versie vraagt een besluit van jou.
5. **"Twee Stadjers"** in trailer, Steam en een test (zie 3.4).
6. **Stemtag van Tammo** (`scripts/tts_cast.mjs`, `docs/personages.md`): "man in his thirties". Niet gewijzigd, omdat een andere tag de stem van de nieuwe opnames kan laten afwijken van de honderden bestaande clips; de TTS-agent kan beoordelen of "in his twenties" past.
7. De oude clips blijven tot de TTS-ronde in de manifesten; de regels zijn tot dan alleen tekst.
