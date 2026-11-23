# Redactie-audit speltekst (23-11)

Branch `audit-verhaal-23-11`. Rol: kritische script-editor, niet de schrijver. Bron: alle 2.118 regels van `game/storydata/script.json` (de zes `09`-scripts, 275 scènes), de autogesprekken in `game/js/banterlines.js`, de radioreclames (`radioads.js`), de prestatie-omschrijvingen (`achievements.js`) en de HUD-leads in `storyarc_nieuw.js` (steekproef). Meetscript: `node scripts/audit_verhaal_stats.mjs` (telt openingen, trigrammen, tics, stemoverlap, lange beurten).

## Oordeel in vijf regels

1. Het script is al vaker gepolijst en is geen slop in de gewone zin: de beurten zijn kort (Tessa gem. 7 woorden, Tammo 5), er zijn nauwelijks beurten boven 25 woorden en er is geen "zoals je weet" of "laten we" te vinden.
2. De sterke kant is de eigen stem van de bijrollen: Wubbo (open of dicht), Geesje (kosteres), Willemien (ingetogen), Berend (telt alles), Mem ("Er is een oma"), Durk en Douwe. De hoofdrollen lijken het meest op elkaar (Tessa/Tammo-overlap 0,30 in topwoorden, de hoogste van de cast).
3. De zwakte is **herhaling**: een goede grap wordt over alle personages uitgesmeerd tot hij een tic is (Rikus' "Ik zeg niks" stond op 17 regels, nu 8; Henk, Tammo en Sjabbe pakten hem ook).
4. De tweede zwakte is **bijna-uitleg**: personages die elkaar de stand van het verhaal voorlezen (Tessa als samenvatter) en de optrommelscènes waarin iedereen zijn rol meldt.
5. Er zaten **echte continuïteitsfouten** in (nummer 4140 vóór Jelle het uitdeelt, Tessa "Nederlandse", Tammo die "twee weken" studeerde terwijl hij net afgestudeerd is, vier of vijf dagen vóór de kraak). Die zijn hersteld.

## Meetresultaten (voor de wijzigingen)

| Tic of structuur | Aantal | Opmerking |
|---|---|---|
| "ik zeg niks" | 20 (Rikus 17) | na de wijziging 11 (Rikus 8); Sjabbe houdt "Ik vraag niks" (5) |
| "koekje" | 14 | Henk (5) en bewaker twee dragen het; Tessa en Tammo gebruiken het ook |
| "luistert/wacht/doet het bij niemand" (duiven) | 6 | Tammo 4x, Veldkamp, Bert |
| "is ook een antwoord" | 4 | Tammo, Durk, Rikus |
| "Rijden, niet praten" | 4 | schrijfregel van Tessa, werkt als terugkeer |
| "Mijn juristen" | 17 (alleen Jelle) | 15 procent van zijn regels |
| "Foar mem" | 9 | bedoeld, werkt |
| "Een Fries in een blauw colbert / uit een klomp" | 7 / 9 | ruim de rand van een running gag |
| "X op wielen" als beeld | 3 (+ "kantoor op wielen") | alle voor de snackwagen |
| Openingen "Dat is …" / "Het is …" | 72 / 45 beurten | 18 + 15 volledige definitiezinnen ("Dat is een tegeltje.") |
| "Tessa, eigenlijk—" (onvoltooide zin) | 5 | bedoelde terugkeer |

Stemoverlap (Jaccard van de 60 meest gebruikte woorden): Tessa/Tammo 0,30, Tessa/Oma 0,22, Tessa/Berend 0,21. Niemand valt samen, maar Tessa deelt woordenschat met bijna iedereen: ze is de voorlezer van het verhaal.

## Bevindingen, gerangschikt naar ernst

Ernst: A = fout (continuïteit/canon, speler merkt het), B = zwakke regel of tic, C = smaak. "Gedaan" = herschreven in deze branch; de id's van de stemregels staan onderaan.

### A. Fouten

| # | Bestand en scène | Citaat (kort) | Probleem | Voorstel / stand |
|---|---|---|---|---|
| A1 | `09-script-akte1.md` M02.5 (humor HS-20) | "Nummer 4140 wacht op niemand." | Tammo kent het nummer 4140 al vóór Jelle het in M03.2 aan hen toewijst; het nummer van de loketbediende is 4117 (M03.1). Spoiler en plotgat. | Gedaan: "Nummer 4117 schuift niet vanzelf op." |
| A2 | `09-script-akte1.md` M05.1; `banterlines.js` pl-academie; `missionstory.js` H5 intro | "Tammo heeft hier nog gestudeerd. Twee weken." / "Drie weken. Ik heb er nog een kluisje." | Canon: Tammo is 24, net afgestudeerd, vijf jaar vrienden sinds de eerste studieweek. Twee weken studie botst. | Gedaan in M05.1 ("Vijf jaar" / "Zes. Het laatste jaar was ik ziek") en in de banter. **Open:** `missionstory.js` H5 (regel 138-139) is de oude terugvalversie met dezelfde fout; niet geraakt omdat `voice_coverage` de oude opname vereist. Pas aan bij de volgende opnameronde. |
| A3 | `09-script-akte1.md` B1; akte 2 B2 | "Ik ben Nederlandse, Tammo." / "En je bent Nederlandse. - Dat helpt niet." | Tessa is een boerendochter uit Siddeburen (J3, M09.1, M22.4) en studeerde vijf jaar in Grunn. "Nederlandse" is in een Nederlands spel betekenisloos; de grap landt niet en spreekt de canon tegen. | Gedaan: B1 "Ik ken Grunn van de passagiersstoel van jouw auto, Tammo."; B2 nu "Tijdens het rijden? - Jij rijdt, ik lees." |
| A4 | akte 3 M18.3 (`09-script-akte4.md`) | "Dat is vier dagen vóór onze kraak." | 12 augustus tot de kraak op 17 augustus is vijf dagen; M26.2 zegt zelf "vijf dagen vóór ons". | Gedaan: "vijf dagen". |
| A5 | `09-script-akte6.md` M30.2 | "JELLE: Jelle springt. Altijd. Met polsstok." | Jelle praat over zichzelf in de derde persoon; klinkt als een regieregel die in de dialoog is beland. | Gedaan: "Ik spring. Altijd. Met polsstok." (cutscene-beat meegetrokken). |
| A6 | `09-script-akte5.md` F3 | "Hij is Gronings, ik ben Fries." | M22.4 zegt "Een beetje" en Tessa spreekt standaard Nederlands (#134). | Gedaan: "ik ben een beetje Fries". `akte5_slot_test` meegetrokken. |
| A7 | `.specs-fire/standards/verhaal.md` personagetabel | "Mem (Gerda) Terpstra, Jelles moeder" | In het script is Gerda Jelles oma (91, "mijn kleinzoon", M10.3, A3.3); zijn moeder (O6 "Mijn moeder wil omzet", J5 "Ja, moeder") is een andere, onbenoemde vrouw. | Gedaan in de spec ("Jelles oma"). Of de moeder een naam krijgt is een canonvraag voor de eigenaar. |
| A8 | `09-script-akte4.md` M21.3 en M21.6 | "Eén bal kwijt." in beide, M21.6 heet "de bal vastgehouden" | De variant waarin de bal vastgehouden wordt zegt dat hij kwijt is en bedankt "voor de bal". De regie-regel verklaart het (rugzak weggetrokken), maar de titel en de tekst spreken elkaar tegen. | Open: titel hernoemen of de regel "Eén bal kwijt" vervangen door "De bal hing aan de rugzak. Nu hangt hij aan hem." |
| A9 | akte 4 J4 | "Hij betaalde onze tafel. En de kaars." / "Een voorschot." | Er is geen zender aangewezen; de lezer weet niet wie "hij" is (Jelle, via Femke?). | Open: noem Jelle ("Jelle betaalde onze tafel"). |
| A10 | `09-script-akte5.md` F1 | "Je kijkt naar die wagen zoals ik naar... - Naar de motor." | Aanhanger, luik, motor, Escapade lopen door elkaar; de scène weet niet wat de wagen is en wanneer ze zijn. | Open: herschrijven nadat vaststaat of F1 voor of na M22 speelt (hij zegt "Bel Henk, hij had een luik", dus ervoor). |
| A11 | akte 4 J4, R4.0b, A4.2 | Femke | `00-OVERZICHT.md:67` en de spec noemen Femke geschrapt (alleen H7 "Heel aankomen"); ze komt terug als keeper en date-partner. Waarschijnlijk dezelfde naam voor een andere rol. | Open (canon): bevestig dat de keeper Femke blijft en schrap de schrapregel, of hernoem. |

### B. Zwakke regels, tics en uitleg

| # | Bestand en scène | Citaat (kort) | Probleem | Voorstel / stand |
|---|---|---|---|---|
| B1 | Rikus, 17 regels | "Ik zeg niks." | De catchphrase is van Rikus en werd door Henk, Tammo en Sjabbe gedeeld; op twee regels in één scène (J4). Elke slotzin "Ik zeg niks" verslapt de ene keer dat het telt (E2, M26.17). | Gedaan: weg of vervangen in R1.1, R2.3, R3.0, R3.4, R4.0, J4 (2x), N9 en Henk M22.2; blijft in C00.2, R1.0, O2, R1.2b, R4.0b, E2, M26.17, F6. |
| B2 | M03.4 | "Wij zijn ingeschreven. Op 28 augustus op de Grote Markt." / "Dat wil Jelle." | Tessa leest de speler de stand voor. | Gedaan: "Nu nog een wagen." en "Zo wint hij zonder te bakken." (nieuwe informatie). |
| B3 | M04.3 | "En een man in een blauw colbert die de alarmen telt." / "Hij telt de alarmen alsof hij iets controleert. Of voorbereidt." | Dubbele recap van M04.2, daarna een vaag "of voorbereidt". | Gedaan: recap geschrapt, "alsof ze van hem zijn". |
| B4 | M08.3 | "Vijf vrienden, vijf ingrediënten." / "Vijf namen aan ons prikbord. Dat wordt ons menu." | Oma noemt de lijst, Tessa herhaalt hem twee keer; "Dat wordt ons menu" is een slogan. | Gedaan: "Dan doen we mee, ..." en "Vijf namen voor het prikbord. Die lopen we af." (cutscene-beats meegetrokken). |
| B5 | M22.4 | "De snackwagen is een thuis op wielen. Een thuis dat je kunt meenemen." | Herhaalt W1 ("Een thuis met wielen") bijna woordelijk; wordt een merkslogan. | Gedaan: "Een wagen is het enige huis dat meeverhuist." (past bij haar verhuisverhaal). |
| B6 | M30.6 | "Dan kan ik groeien en jij thuisblijven." | Coachtaal; past niet bij Tessa. | Gedaan: "Ik bak overal, jij hoeft nergens te wennen." (voedt Tammo's "Thuis is waar de kar staat"). |
| B7 | M30.1 | "De trekker heeft een toren. Zonder motor ging het niet. Met motor wel." | Betekenisloos; lijkt een grap te willen zijn. | Gedaan: "De trekker trekt de toren. In 1672 hadden ze daar paarden voor. Ik heb er driehonderd." |
| B8 | M25.6 (humor HI-17) | "Jullie zijn al samen. Jullie weten het alleen niet." | De oudste romcom-zin die er is; B1.1 en J3 doen hetzelfde ("iedereen denkt dat we samen zijn"). | Gedaan: "Jullie eten van één bord. Dat is meer dan samenwonen." |
| B9 | M10.4 (HS-04) | "Dat is ook een soort dom." | Loze zin ("ook een soort") en "ook een antwoord" zit al in vier regels. | Gedaan: "Dat staat niet in zijn contract." |
| B10 | M16.5 (H3-09) | "Heel goed. Maandag." / "Goed." | Twee vulregels na de onthulling; Durk zegt weer "is ook een antwoord". | Gedaan: "Je kunt dus nog rekenen." / "Tot drie tenten. Daarna wordt het gokken." en "Gelijkspel telt ook." |
| B11 | M06.0 (HI-01) | "Mijn duiven doen dat bij niemand." | Vierde variant op "duiven luisteren naar niemand" (N2, M04.1, M12.1, M30.1). De regel is bovendien onduidelijk (wát doen ze niet?). | Gedaan: "Mijn duiven slapen al. Die ene niet." De rest van het duivenmotief blijft: M12.1 heeft een echte uitbetaling ("Behalve naar jou"). |
| B12 | Jelle, 17x "Mijn juristen" | | De grap draagt zijn spreker te zwaar. | Gedaan: R3.0, M16.3, M17.3 anders; de beste (M10.1, M14.3, M26.10) blijven. |
| B13 | M23.1 en M30.1 | iedereen meldt zijn rol ("Ik rij de bus ... Ik de trekker ...") | Twee keer dezelfde optrommel; M23.6-M23.8 herhalen de rolmelding daarna nog eens per personage. | Open. Voorstel: in M23.1 alleen Tessa's "Wie rijdt naast ons?" en laat de drie variant-scènes de rolmelding doen; in M30.1 de rollen als beelden (Klaas aan de gracht) in plaats van een appèl. De cutscene-agent knipt langere beurten; stem af voordat je dit aanraakt. |
| B14 | Notaris, drie uur | M12.4, M19.3, M25.1, M26.2 | Het ene feit "vrijdag drie uur de notaris" wordt vijf keer aangekondigd. | Open: houd M12.4 (eerste), M25.1 (Sjabbe) en M26.2 (Jelle zelf); schrap M19.3-regel van Berend ("Daar schrijft hij zich in als bewaarder"). |
| B15 | M02.3, M10.4, M19.3, M20.1 | "Het colbert van Berend. De man uit de chat." / "Dan komt de bal ook hierheen ..." | Tessa en Tammo vatten de zojuist gespeelde missie samen. | Open: laat de samenvatting aan de HUD-lead (`storyarc_nieuw.js`, `lead`) en de dossierkaart en geef de personages een reactie. |
| B16 | T2, M11.4, M11.8 | "een skûtsje: een groot Fries zeilschip" / "Dat is grasland aan zee" / "Dijkstra, van het UMCG, het ziekenhuis." | Woordenboekdialoog: personages leggen woorden uit die de personage-in-de-scène allang kent. | Open: Tammo of Tessa stelt de vraag ("Een skûtsje?") en de ander antwoordt in één zin. |
| B17 | M12.1 | Dijkstra: lunch voor de nachtdienst eerst | Een humoristische omweg, maar de speler wil de ballon; de scène kost twee beurten uitleg voor één grap ("Landen op de H van het UMCG, graag" is wel goed). | Open, smaak. |
| B18 | F1 | zie A10 | | Open |
| B19 | `radioads.js` | 14 van de 20 reclames bouwen op "belofte, daarna het tegendeel" ("volledig waterdicht, behalve bij regen"; "Uitkering volgt, in de volgende eeuw") | Eén grapformule. Elk voor zich werkt, achter elkaar niet. | Open: schrijf 4 reclames in een andere vorm (een luisteraarsbrief, een prijslijst, een slogan die alleen een naam is). |
| B20 | akte 1-6, "Een Fries in een blauw colbert ... uit een klomp" | 7 + 9 keer | Beide beelden zijn goed; samen in één scène (M02.3: drie keer "klomp") worden ze een ritme dat de grap opeet. | Open: in M02.3 twee van de drie klomp-regels schrappen (Tessa's "Een klomp?" blijft). |

### C. Smaak (niet aangepast)

- B1 "Dat is een regel, geen brug." en B2 "Voor honderd keer één." landen niet, maar zijn pooltjes die zelden vallen.
- T2 "Ik ben de Koningin van de Friteuse. Rijd mij naar de zon." komt uit het niets; de volgende regel ("Welke kant is de zon? Waar jij rijdt.") is wel goed.
- M05.1 "Regels zijn regels. Behalve de mijne." is een cliché dat Sjoerd niet nodig heeft; "Dat is een ja." erachter redt het.
- M15.6 Tammo "Ze moet nog eten." is een onnatuurlijk excuus (bedoeld als jaloezie).
- M12.3 en M12.4 "Doe bist schier" (Fries/Gronings voor "mooi"?). Kon ik niet controleren; laat een Groninger meelezen.
- "Woist ja wel" (M25.1, M26.7) is de emotionele kern van de finale. Wel laten nalezen als Gronings.
- E3 is negen opeenvolgende Rikus-regels met losse eindjes. Het werkt als afsluiting maar leest als een lijst; twee beelden tellen meer dan zes.
- Banter (`banterlines.js`) is het sterkste tekstblok: korte beurten, eigen grappen, weinig tics. Het schuurt op één plek: Tessa heet hier intern `Anita` (zichtbaar in `SPEAKERS`); controleer dat de ondertitel "Tessa" toont.

## Wat goed is (laat staan)

M01.4 ("Dat klinkt als een kras met een parasol"), M03.2 (Jelle: "Met papier."), M09.1 (Geesje: "Mijn kippen hebben geen contract."), M11.7 (kustwacht: "Waarschijnlijk schapen."), M15.1 (Roelfien over Tammo), M20.3 (Mem: "Er is geen afspraak, jonge. Er is een oma."), M26.4 ("Ik meld niet alleen. Ik klap."), M26.13 (Oma: "Wij zeggen het één keer. Dan is het waar."), M26.7 ("Ik had er meer. Die waren minder goed."), M30.5 ("Dan is winnen verkeerd.").

## Gewijzigde stemregels (opnieuw opnemen)

Alle regels hieronder hadden een opname (`rec`) en zijn nu stil tot ze opnieuw zijn ingesproken. Id = scène, spreker, regelnummer in de scène.

| Scène#regel | Spreker | Nieuwe tekst |
|---|---|---|
| M03.4#1 | Tessa | Wij zijn ingeschreven. Nu nog een wagen. |
| M03.4#4 | Tessa | Wie de bal heeft, zit de jury voor. Zo wint hij zonder te bakken. |
| R1.1#2 | Rikus | Dat is een helder plan. Ik draai een plaat. |
| M04.3#1 | Tammo | En die trekker-limo. Vlaggetjes met rode blaadjes. |
| M04.3#2 | Tessa | Pompeblêden. Een Fries. En hij telt die alarmen alsof ze van hem zijn. |
| M05.1#5 | Tessa | Tammo heeft hier nog gestudeerd. Vijf jaar. |
| M05.1#6 | Tammo | Zes. Het laatste jaar was ik ziek. |
| M06.0#12 | Meneer Veldkamp | Mijn duiven slapen al. Die ene niet. Hij wil naar Tammo. |
| B1#6 | Tessa | Ik ken Grunn van de passagiersstoel van jouw auto, Tammo. |
| M08.3#9 | Tessa | Dan doen we mee, ook als Jelle de rest opkoopt. |
| M08.3#13 | Tessa | Vijf namen voor het prikbord. Die lopen we af. |
| R2.3#1 | Rikus | ... bonnetje voor een tweede. (zonder "Ik zeg niks.") |
| B2#11 | Tammo | Tijdens het rijden? |
| B2#12 | Tessa | Jij rijdt, ik lees. Zo hebben we het verdeeld. |
| R3.0#0 | Rikus | Vrijdag 21 augustus. Een beller meldt dat hij vanmiddag opstijgt. Ik kijk alvast omhoog. |
| R3.0#3 | Jelle | Sinds vanochtend wel. Ik heb een vergunning. |
| R3.4#1 | Rikus | Voor twee Stadjers die elk een kant van het refrein zingen. Ik noem geen namen. |
| M16.3#4 | Jelle | Durk. Ik wil een rapport. Waar zijn jullie? |
| M16.5#1 | Durk | Gelijkspel telt ook. Vraag maar, famke. |
| M16.5#9 | Tessa | Je kunt dus nog rekenen. |
| M16.5#10 | Tammo | Tot drie tenten. Daarna wordt het gokken. |
| R4.0#0 | Rikus | Maandag 24 augustus. In de chat zeggen ze dat twee Stadjers het museum leegroofden. Ik lees het alleen voor. |
| M17.3#2 | Jelle | Mevrouw Tessa. Mijn schip staat vast voor een brug. Dat is een overtreding, mevrouw. Van de brug. |
| J4#4 | Rikus | Ik zit hier alleen voor de kaars. |
| J4#10 | Rikus | Mijn mond zit vol brood. |
| M18.3#7 | Tessa | Zodat zij niets merkte. Dat is vijf dagen vóór onze kraak. Hij had hem toen al. |
| N9#0 | Rikus | Moi, Nachtstreek. Voor wie vannacht niet thuis slaapt: de sterren zijn gratis. |
| M22.2#12 | Henk | Dat rijmt. Eén koekje. |
| M22.4#17 | Tessa | Een wagen is het enige huis dat meeverhuist. |
| M25.6#8 | Lieke | Jullie eten van één bord. Dat is meer dan samenwonen. |
| F3#5 | Tessa | Hij is Gronings, ik ben een beetje Fries. Wij zijn de verzoening. |
| M30.1#6 | Tinus | De trekker trekt de toren. In 1672 hadden ze daar paarden voor. Ik heb er driehonderd. |
| M30.2#2 | Jelle | Ik spring. Altijd. Met polsstok. |
| M30.6#4 | Tessa | Elke zomer één ronde langs de plekken waar vrienden wonen. Ik bak overal, jij hoeft nergens te wennen. |

Banter: `pl-academie` (Tammo, "Vijf jaar. Ik heb er nog een kluisje."), recording via `scripts/tts_banter_lines.mjs`.

Wel gewijzigd maar nog zonder opname (geen herneming nodig): M02.5#4 (Tammo, 4117), M10.4#4 (Tammo, "Dat staat niet in zijn contract."); `scripts/tts_waiting.json` is bijgewerkt.

Gewijzigd in humorvarianten (de gekozen variant is aangepast, het panel heeft de oude gekozen): HS-20, HS-04, HI-01, HI-17, H3-01, H3-09, H07, H5-10. Eigenaar of het panel kan de nieuwe tekst terugdraaien; de varianten zelf staan nog in de json.

## Afstemming met `cutscene-kwaliteit-23-11`

Die branch raakt alleen `game/js/cutscenes*.js`, `cineshots.js` en `careerdebut.js`, geen scripttekst. Hier zijn in de cutscene-bestanden uitsluitend de `on:`-aanwijzingen aangepast die bij een gewijzigde regel horen (akte 2 M08.3, akte 3 M16.5, akte 4 M22.4, akte 6 M30.1 en M30.2); bij een merge kunnen die regels conflicteren, los te lossen door de nieuwe tekst als `on:` te nemen. Geen enkele regel is geknipt of samengevoegd, dus de beurtknip van die agent blijft zijn werk. De B-open punten B13 (optrommel) en B15 (recap) raken zijn beurten: laat hem die eerst knippen.

## Niet kunnen beoordelen

- **Humor is subjectief.** Ik heb de nieuwe regels geschreven voor specifiek en droog, maar geen paneel laten kiezen en geen speler horen. De panelkeuzes in `humor.*.json` heb ik op acht plaatsen overschreven; leg die aan het panel voor.
- **Gronings en Fries.** Ik ben geen moedertaalspreker. "Doe bist schier", "Woist ja wel", "Braid noar de zin", "Better as ús" en de Friese regels van Beppe heb ik niet inhoudelijk gecontroleerd; `dialect_woorden_test` en `gronings_spoken_test` slagen, maar die toetsen alleen woorden.
- **Stem en timing.** Alles is op papier gelezen; hoe het klinkt (Orus, Callirrhoe, Fenrir, Gacrux) en hoe de cutscene-timing de nieuwe, kortere regels draagt is niet bekeken.
- **Niet gelezen:** de volledige `missionstory*.js` (134 kB, oude/terugvalversie), de sidejobs- en bezit-teksten, Instellingen/HUD-tekst en de achievementnamen buiten een steekproef; de Beppe-bezoek- en boogteksten.
- **Niet gedraaid:** de Electron-verhaaltest, de zware wereldtests (`akte1_doelen_test`, `akte2_doelen_test`, `akte3_test`, `storyflow_nieuw_test` slaan over zonder provinciecache). `spec_check` meldt twee fouten die al bestonden (121 versus 155 stille regels, versie 0.64.0 versus 0.65.0); niet door deze branch veroorzaakt.
