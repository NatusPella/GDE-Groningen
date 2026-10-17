# Het nieuwe verhaal: "Alles voor één eierbal" (de provincietour)

Voorstel voor issue [#93](https://github.com/NatusPella/GDE-Groningen/issues/93). Dit is **één verhaal in vijf akten**. Wat er in het oude spel bestaat (de oude delen en het oude plan voor een vervolg) bepaalt de structuur niet; oud materiaal komt alleen terug waar het past (de regels met de tag `[BEHOUDEN]`). Alleen documenten in `docs/verhaal/nieuw/`; er is geen code aangepast, niets opgenomen en geen TTS of netwerk gebruikt. Alles wat ik niet in de repo heb kunnen controleren, staat als **AANNAME**. Alles wat niemand in beeld heeft gezien, is **nog niet bekeken**.

**Bestanden**

| Bestand | Inhoud |
|---|---|
| `00-OVERZICHT.md` | dit document |
| `01-akte1.md` … `05-akte5.md` | per akte: intro en alle 30 missies, met opening en sleutelscène |
| `06-zijmissies-en-minigames.md` | 46 zijmissies en activiteiten, gerangschikt |
| `07-TTS-RAMING.md` | aantallen behouden en nieuwe regels, kostenraming |
| `08-IMPLEMENTATIE.md` | voor een latere bouwronde |
| `09-script-akte1.md` … `09-script-akte5.md` | het volledige script, machineleesbaar (`SPREKER: tekst [BEHOUDEN\|NIEUW]`) |

## 1. Titel, logline, doel en motief

**Titel:** *Alles voor één eierbal* (bestaande arc-naam; het spel heet *GDE Groningen – Zomer vol misdaad*).

**Logline:** Twee Stadjers zonder geld willen een frietwagen laten staan op de enige standplaats van Grunn, en moeten daarvoor de Noordelijke Snackprijs winnen. Een Friese snackbaron koopt plakje voor plakje de hele markt op om dat te voorkomen, en de Gouden Eierbal blijkt allang uit het museum. Over de hele provincie, in twee weken, tegen een jury, een bal en een droge woordenwisseling in.

**Algemeen doel (één zin, hardop in de opening door Tessa):** *"Wij winnen op 28 augustus de Noordelijke Snackprijs, dan krijgen we de enige vrije standplaats, en dan heeft de Fjord Frituur een thuis."*

**Motief (één zin):** Tessa heeft nooit langer dan een paar jaar ergens gewoond en wil een thuis met wielen; Tammo wil bij haar blijven maar zegt het niet; ze kunnen de huur niet betalen en de bank zei "uw plan is sympathiek".

**Tegenstander (één zin):** Jelle Terpstra, Friese snackbaron van *Us Mem Snacks*, wil zijn moeder Gerda de Gouden Eierbal geven die zij in 1953 net miste, en koopt daarvoor met de **salamitactiek** (de "Operaasje Aaibal") alles wat een eierbal nodig heeft op: standplaatsen, vet, eieren, zout, haven, bloem, jury, mosterd en tot slot de bewaarder van de bal. Zijn moeder wil dat helemaal niet.

**Hoe volg je Jelles plan?** In "Wat weten we?" staat een **plakjesbord** met acht plakjes (AANNAME: nieuw, klein). Jelle vertelt zijn eigen plan op de radio (hij is ijdel en belt graag in: dat is "wereld", geen briefing). Tessa noemt het plan in M04 hardop "salamitactiek". Het koopboek (M14) laat de acht plakjes zien.

**De draad in vier zinnen:** (1) De bal staat in het museum en moet in Stad blijven, want de bewaarder zit de jury voor (artikel 4). (2) Tessa en Tammo besluiten hem eerst te pakken, als bewaking. (3) De vitrine is al leeg: "Tige tank! – W." (4) Dan jagen ze Jelle en zijn plakjes door de provincie, terwijl Jelle jaagt op hen, want hij denkt dat zij de bal hebben; in Bourtange blijkt dat **W. staat voor "Wij": Oma Trijntje en Mem Terpstra hebben hem zelf gehaald, met Berends bakkie.**

## 2. Cast

Bestaand = uit `docs/personages.md` en `storyarc.js`; **nieuw** alleen waar nodig (vijf bondgenoten en drie kleine rollen). Stemregels volgen de personagebijbel; elke nieuwe spreker krijgt een naamkaart bij de eerste ontmoeting.

| Wie | Rol | Boog | Stemregels | Hoe en wanneer geïntroduceerd |
|---|---|---|---|---|
| **Tammo** | held, echte Stadjer uit het Oosterpark | van "ik zeg niks" naar vijf woorden: "Ik wil bij jou blijven". Leert de provincie kennen; baalt dat Tessa gelijk heeft; **eigenwijs en vaak fout** ("Dat bedoelde ik ook.") | korte zinnen, understatement, geen speeches, geen Fries | opening (M00, cutscène), naamkaart |
| **Tessa** | heldin, de baas van het duo; **Nederlandse** (niet in Stad geboren; zomers in Ljouwert naast Mem; AANNAME: geboren in Zwolle) die Friezen kent; Tammo vindt dat gek | van "regelen en niks zeggen" naar toegeven dat ze bang is nergens te blijven; **heeft vaak gelijk, soms wat saai**; laat Tammo nieuwe dingen zien en vindt het leuk als hij haar iets laat zien | snel, ad rem, "Rijden, niet praten." | opening |
| **Rikus** | nacht-dj Nachtstreek, jeugdvriend, de radio | blijft vertellen, "ik zeg niks" en zegt het toch: dat kost hen in M23 bijna alles | warm en droog; **radio is alleen wereld** | opening, radio |
| **Jelle Terpstra** | tegenstander, ijdel, nooit gemeen | van "foar mem" naar "ja, mem": geeft alle plakjes terug | Nederlands met Friese woorden; elke zin is reclame | chat (M03), in persoon in M04 |
| **Mem (Gerda) Terpstra** | Jelles moeder; **medeplichtige** met Oma; appt Tessa | wil dat hij ophoudt; haar eierbal was beter | stellig, Fries-getint, altijd ondertiteld | appjes vanaf M08 (stil), stem in M24 |
| **Oma Trijntje** | mentor, 92, bakte in 1953 de beste (volgens haar) | zegt eindelijk: "Gerda. Jouw eierbal was beter." | warm, stellig | M09 (naamkaart); komt daarmee vroeger in beeld dan in het huidige H12 |
| **Durk en Douwe** | Jelles tweeling, "…Hè." | lopen over in M27 | traag, synchroon | M02 |
| **Berend Bos** | Bommen Berend, jurylid; **getaway-chauffeur** van de grannies ("Nul krassen. Op de heenweg.") | stiekem trots | nors, korte zinnen, "Goidag" | M01 |
| **Duivenmelker Bert** | mentor-duif | kijkt toe | zacht, wijs | M05 |
| **Sjabbe, Sjoerd, Henk, Jelmer, Geert, Klaas, Dijkstra** | bestaande bijrollen, ieder met één missie | vast | zoals de bijbel | M02, M06, M07/M26, M03, M17, M12, M14 |
| **De torenwachter** | stem aan de telefoon, "Ik meld alleen." | vast | oud, droog | M03 |
| **Geesje** *(nieuw)* | kosteres, 84, schoolvriendin van Oma; eieren | bondgenoot | warm, nuchter | M10 |
| **Lammert** *(nieuw)* | havenmeester, danste in 1953 met Oma | bondgenoot, schuilplaats | kort, ironisch | M15 |
| **Roelfien** *(nieuw)* | graanboerin en vlieger, Oma's nicht | bondgenoot | vrolijk | M18 |
| **Wubbo** *(nieuw)* | brugwachter | bondgenoot | rustig | M20 |
| **Tinus** *(nieuw)* | trekkertrekker, re-enactor | bondgenoot, lift | joviaal | M23 (in de bus), M26 |
| **Loketbediende, Accountmanager, Jurylid, Buschauffeur** *(nieuw, klein)* | satire-rollen | vast | droog bureaucratisch | M04, M21, M22, bus |

**Geschrapt of samengevoegd:** Femke (H7), Harm (H9), Hilly, Hilje, Boer Roelf. Rotor Roelf blijft een stem in M14.

## 3. De vijf akten

| Akte | Regio | Missies | Reisbeats | Tijd (incl. reizen) | Dagen |
|---|---|---|---|---|---|
| **1 · Moi, Grunn** | Stad | 7 (M01-M07) | 0 | 65 min | vr 14 - ma 17 aug |
| **2 · Het Noorden is groot** | Stad, Hogeland, Waddenzee | 6 (M08-M13) | 2 (trein Winsum, bus Zoutkamp) | 57 min | di 18 - do 20 aug |
| **3 · Aan de Eems** | Eemsdelta, Oldambt, de Dollard | 6 (M14-M19) | 1 (trein Winschoten) | 57 min | vr 21 - zo 23 aug |
| **4 · Zuidwaarts** | Veenkoloniën, Westerwolde (Bourtange) | 6 (M20-M25) | 0 | 62 min | ma 24 - di 25 aug, nacht naar wo 26 |
| **5 · Ontzet** | Westerkwartier, Stad | 5 (M26-M30) | 0 | 47 min | wo 26 - vr 28 aug |
| **Totaal** | **alle 7 regio's + Stad** | **30** | **3** | **288 min = 4:48** (bandbreedte 4:00-5:20) | |

**Schatting:** gemiddeld 7 minuten per missie, plus 1-2 minuten scène per missie, plus 55 minuten gecompresseerde reizen. **AANNAME:** dit is geschat uit de lengte van de bestaande missies; niemand heeft het gespeeld.

**Heldenreis:** gewone wereld en roep (A1: M01-M05), drempel (M07 kraak), beproevingen en bondgenoten (A2-A3), middenpunt (M17: "wij hebben hem niet", en de kus in M19), verdieping (A4), **dieptepunt (M24-M25)**, wederopstanding (M26 knuffel), finale (M30).

### Kalender (STEP_DATES, aangepast)

| Dag | Datum | Missies | Bijzonder |
|---|---|---|---|
| 1 | vr 14 aug | M01 (+ optioneel EIKEA) | KEI-week |
| 2 | za 15 | M02, M03, M04 | marktdag; Loket open tot twaalf |
| 3 | zo 16 | M05, M06 | KEI-race |
| 4 | ma 17 | M07 (nacht) | de kraak |
| 5 | di 18 | M08, M09, trein naar Winsum | |
| 6 | wo 19 | M10, M11 | |
| 7 | do 20 | bus, M12, M13 (nacht) | Noorderzon opent (op de radio) |
| 8 | vr 21 | M14, M15 (nacht) | Zomerkermis opent in Stad (radio) |
| 9 | za 22 | M16, M17, trein | **Kermis in Winschoten (nieuw: za 22 - zo 23; staat nu op di 29 sep)** |
| 10 | zo 23 | M18, M19 | |
| 11 | ma 24 | M20, M21, M22 | |
| 12 | di 25 | M23, M24, M25 (nacht) | **Beleg van Bourtange (nieuw)** |
| 13 | wo 26 | M26 | |
| 14 | do 27 | M27, M28, M29 (nacht) | |
| 15 | **vr 28 aug** | **M30, Gronings Ontzet** | |
| 19 | di 1 sep → | epiloog (twee weken later); daarna loopt de open wereld door | |

**Tegenstrijdigheden uit FLOW-ANALYSE §3.4, opgelost:** (a) `r-avond` ("morgen de rondvaartboot") en H13 stonden op dezelfde dag: beide geschrapt als hoofdstap (H13 wordt een bijbaan). (b) `s-boot` ("vandaag") op ma 24 en H14 op di 25: `s-boot` opgegaan in M12. (c) Jelles ballon "vanavond" terwijl H15 de volgende dag was: de ballon vliegt nu overdag, M14 op dezelfde dag. (d) `r-kermis` "wordt opgebouwd" terwijl de kermis opent: de botsauto's spelen nu op een andere kermis (Winschoten). **Constitutie 3 (altijd zomer):** de epiloog heeft nog "Het is koud." (zie open vraag 7).

## 4. Verhaal en romantiek per onderdeel (de grote tabel)

*Romantiek* en *actie* zijn 1-10. Voertuig/mechaniek wijst op bestaand hergebruik (zie de act-documenten). **Romantiek-trap** (volgorde van de eigenaar): handen (M07) → lange blik (M13) → eerste voorzichtige flirt (M16) → eerste kus (M19) → knuffel en openbaring (M26) → stel, vijf woorden (M30).

| Nr | Akte | Titel | Regio / plaats | Plotbeat (oorzaak en gevolg) | Romantiekbeat (R) | A | Voertuig / mechaniek |
|---|---|---|---|---|---|---|---|
| M00 | 1 | Opening en verhuisdag | Stad, Oosterpark, Paddepoel | het doel wordt hardop gezegd; Rikus noemt de Fries | huisgenoten, "als huisgenoten, Tammo" (1) | 0 | cutscène |
| M01 | 1 | Berend telt de krassen | Stad, Martinikerkhof - Boterdiep | geld voor de Fjord; een Fries met een klomp wilde Berends bakkie | Berend zegt Moi tegen Tessa (2) | 3 | auto, `deliver` |
| M02 | 1 | Even pinnen | Stad, Herestraat, Pand & Poen | Durk en Douwe; Sjabbe: wie hem eerst heeft; de weigering | Tammo's opa (2) | 7 | auto, `escape` |
| M03 | 1 | Iets met de Grote Markt | Stad, Grote Markt | €150 voor de inschrijving; Jelle in de chat | Tammo is jaloers op een chatbericht (3) | 6 | auto, `stunt` |
| M04 | 1 | Het Loket | Stad, Het Loket | inschrijven; **Jelle in persoon**; artikel 4; salamitactiek | Tammo bewondert haar loketkunst (3) | 2 | te voet, loket |
| M05 | 1 | Kieken van boven | Stad, Stationsplein - museum | Jelles trekker bij het museum; hij gaat het doen | "Mijn vriend de duivenkoning" (3) | 4 | duif |
| M06 | 1 | Wind tegen, beide kanten op | Stad, binnenstad | de drie minuten; **besluit: eerst pakken, als bewaking** | **oogcontact** op het kruispunt (5) | 7 | fiets, race |
| M07 | 1 | Het museum stond er al zo | Stad, Groninger Museum | **vitrine leeg: "Tige tank! – W."**; Jelle claimt de bal | **eerste handaanraking** "Voor de grip" (6) | 8 | te voet, `heist` |
| M08 | 2 | Al het vet van Grunn | Stad, Oosterpoort | plakje 2 (vet) gered; Jelle belt in | Mems eerste appje; "Fierljepper zeker." (3) | 8 | tankwagen, `chase` |
| M09 | 2 | Fatbikes tellen niet als fiets | Stad, Noorderhaven (Oma) | 1953, Gerda; **lijstje van vijf vrienden** | "Niet tegen haar." (4) | 4 | te voet, fatbikes |
| B1 | 2 | De trein naar Winsum | Stad → Hogeland | de provincie begint | de zee achter de dijk (4) | 1 | trein (meerijden) |
| M10 | 2 | Heel aankomen is ook een kunst | Hogeland, Warffum - Usquert | plakje 3 (eieren); Geesje | Tessa toont koeien en wierden (4) | 3 | trekker, `deliver` |
| M11 | 2 | Een trekker-limo op de wierde | Hogeland, wierdedorpen | Jelle denkt dat zij de bal hebben; **zijn motief: Mem** | "Voor de grip. Ik heb stuur." (3) | 8 | quad, `escape` |
| B2 | 2 | De streekbus naar Zoutkamp | Hogeland → Waddenzee | reis is inhoud | (3) | 1 | bus (meerijden of zelf) |
| M12 | 2 | Geleend van de Friezen | Waddenzee, Zoutkamp - Lauwersmeer | chocoladebal "Foar mem": een oefenbal | "Iedereen is romantischer dan jij." (5) | 8 | rubberboot, `boatchase` |
| M13 | 2 | Laag water | Waddenzee, kwelder, Noordpolderzijl | plakje 4 (zout); Klaas | **de lange blik**; appje onderbreekt (7) | 3 | sloep en wad |
| M14 | 3 | Het staat niet in het rooster | Lauwersoog → Dollard | het **koopboek**: acht plakjes | "Dank je dat je het vraagt." (5) | 7 | heli, lier |
| M15 | 3 | Het containerlabyrint | Eemshaven | plakje 5 (haven); Lammert | "Je ademt." (4) | 5 | te voet, kraan |
| M16 | 3 | De dijk | Eemshaven - Delfzijl | Jelle verliest de race | **eerste voorzichtige flirt (Tammo)** (6) | 8 | auto, race |
| B3 | 3 | De trein naar Winschoten | Eemsdelta → Oldambt | | (3) | 1 | trein (meerijden) |
| M17 | 3 | Nog eentje dan | Oldambt, Winschoten, kermis | **keerpunt: "De bal hebben wij niet"**; Tessa liegt: "Geen idee." | jaloezie, "Sinds nu." (5) | 3 | te voet |
| M18 | 3 | Laag over het graan | Oldambt | plakje 6 (jury) half; Roelfien | "Jij kijkt, ik stuur." (4) | 6 | vliegtuig (of heli) |
| M19 | 3 | Botsauto's, deel twee | Oldambt, Winschoten, dijk | Durk: "baas gaat naar Veendam" | **eerste kus** (8) | 4 | botsauto, scène |
| M20 | 4 | Open, dicht | Veenkoloniën, Veendam | plakje 7 (mosterd); Wubbo | "Over gisteren." "Welk gisteren?" (5) | 5 | sloep, bruggen |
| M21 | 4 | Wie is W.? | Veenkoloniën, Wiebelwerk | valse piste; pas "T." en gast "G." | Tessa legt een logboek uit (5) | 2 | e-step, kantoor |
| M22 | 4 | Stoom | Veenkoloniën, museumtrein | laatste twee juryleden weg | "Je rijdt als een fietser met een deadline." (4) | 9 | trein (machinist) |
| M23 | 4 | De vestingbus | Westerwolde, Ter Apel-bos - Bourtange | Rikus verklapt Bourtange; Berend weet meer | "Moi" te zacht (4) | 5 | bus |
| M24 | 4 | **Het beleg van Bourtange** | Westerwolde, Vesting Bourtange | **W. = "Wij"**; Jelle krijgt de bal van zijn moeder; Escapade weg | **het dieptepunt**: "Jij zegt nooit iets!" (3) | 8 | te voet, fierljep, `hold` |
| M25 | 4 | Iedereen heeft een rode auto gezien | Bourtange → Westerkwartier | Tessa solo; Mem belt; de Escapade terug | "Sorry. Dat ik nooit wat zeg." (5) | 8 | bakkie, trein achterna |
| M26 | 5 | Een luik erin | Westerkwartier, schuur | de Fjord Frituur krijgt een luik | **knuffel en openbaring** (9) | 3 | garage, trekker |
| M27 | 5 | De colonne | Westerkwartier → Stad | alle bondgenoten rijden mee; D&D lopen over | hand op de pook (6) | 7 | alle voertuigen |
| M28 | 5 | Er hangt iets Fries aan d'Olle Grieze | Stad, Grote Markt | Stad terug; Tammo is held | "Voor de grip?" "Nee. Gewoon." (7) | 5 | duif |
| M29 | 5 | Het bod viel tegen | Stad, Oma's keuken | Jelle ziet zijn moeder; bod afgewezen | Oma: "Ik wilde het één keer horen." (8) | 2 | bakken |
| M30 | 5 | **Ontzet, net als in 1672** | Stad, Grote Markt | alles komt samen: jury, bal, duiven, wagen | **"Ik wil bij jou blijven."** (10) | 10 | alles |
| E | 5 | Epiloog en slot | Stad, Vismarkt | standplaats; plakjes terug | koud/Grunn (9) | 0 | cutscène |

**Tellingen:** 30 hoofdmissies (7, 6, 6, 6, 5), 3 reisbeats, 13 nieuwe missies, 17 bestaande missies in een nieuwe plek en volgorde. 8 vervoertypes: auto, fiets, scooter (e-step, brommer), bus, trein (meerijden en machinist), heli, klein vliegtuig, boot (sloep, rubberboot, skûtsje-achtervolging), trekker en quad, duif.

## 5. Spanningsboog: actie tegen romantiek

```
M01 Berend        actie ███░░░░░░░  3  romantiek ██░░░░░░░░  2
M02 Even pinnen   actie ███████░░░  7  romantiek ██░░░░░░░░  2
M03 Grote Markt   actie ██████░░░░  6  romantiek ███░░░░░░░  3
M04 Het Loket     actie ██░░░░░░░░  2  romantiek ███░░░░░░░  3
M05 Duif          actie ████░░░░░░  4  romantiek ███░░░░░░░  3
M06 Wind tegen    actie ███████░░░  7  romantiek █████░░░░░  5
M07 Museum        actie ████████░░  8  romantiek ██████░░░░  6
M08 Het vet       actie ████████░░  8  romantiek ███░░░░░░░  3
M09 Oma           actie ████░░░░░░  4  romantiek ████░░░░░░  4
M10 Eieren        actie ███░░░░░░░  3  romantiek ████░░░░░░  4
M11 Wierde        actie ████████░░  8  romantiek ███░░░░░░░  3
M12 Skûtsje       actie ████████░░  8  romantiek █████░░░░░  5
M13 Laag water    actie ███░░░░░░░  3  romantiek ███████░░░  7
M14 Heli          actie ███████░░░  7  romantiek █████░░░░░  5
M15 Containers    actie █████░░░░░  5  romantiek ████░░░░░░  4
M16 Dijk          actie ████████░░  8  romantiek ██████░░░░  6
M17 Kermisbar     actie ███░░░░░░░  3  romantiek █████░░░░░  5
M18 Graan         actie ██████░░░░  6  romantiek ████░░░░░░  4
M19 Botsauto+kus  actie ████░░░░░░  4  romantiek ████████░░  8
M20 Open, dicht   actie █████░░░░░  5  romantiek █████░░░░░  5
M21 Wie is W.     actie ██░░░░░░░░  2  romantiek █████░░░░░  5
M22 Stoom         actie █████████░  9  romantiek ████░░░░░░  4
M23 Vestingbus    actie █████░░░░░  5  romantiek ████░░░░░░  4
M24 Het beleg     actie ████████░░  8  romantiek ███░░░░░░░  3
M25 Rode auto     actie ████████░░  8  romantiek █████░░░░░  5
M26 Luik+knuffel  actie ███░░░░░░░  3  romantiek █████████░  9
M27 Colonne       actie ███████░░░  7  romantiek ██████░░░░  6
M28 Vlag          actie █████░░░░░  5  romantiek ███████░░░  7
M29 Het bod       actie ██░░░░░░░░  2  romantiek ████████░░  8
M30 Ontzet        actie ██████████ 10  romantiek ██████████ 10
```

Gemiddelden per akte (actie / romantiek): akte 1 5,3 / 3,4; akte 2 5,7 / 4,3; akte 3 5,5 / 5,3; akte 4 6,2 / 4,3; akte 5 5,4 / 8,0. Totaal 5,6 / 4,9.

**Kritische zelf-review**

1. **Pieken zitten waar ze horen:** de eerste kus (M19) midden in het verhaal, het dieptepunt (M24-M25) laag voor romantiek en hoog voor actie, de knuffel (M26) direct erna als contrast, en de finale (M30) bij 10 en 10.
2. **Akte 4 is te zwaar op actie (gemiddeld 6,2) en te licht op romantiek:** dat past bij het dieptepunt, maar M22 (Stoom, 9) staat vlak vóór drie rustige missies (M23, M24 begin). Risico: actiemoeheid vóór Bourtange. Alternatief: M22 verplaatsen naar vóór M21.
3. **Akte 2 en 3 hebben elk drie missies met actie 8 of meer** (M08, M11, M12 en M16): drie keer "achtervolging" in vier missies. Variatie in voertuig is er (tankwagen, quad, rubberboot), maar het ritme is gelijk. Overweeg M11 korter te maken.
4. **Twee missies met actie 2 staan vlak voor elkaar (M20-M21, en M29 vlak vóór de finale).** M29 is bewust rustig (bakken en de scène met Jelle en zijn moeder). M20-M21 is een zwak punt.
5. **M24 draagt veel:** het beleg (komisch), de fierljep, de onthulling, Jelles bal, de ruzie en de Escapade. Als dat niet in één missie past, splitsen (zie 08 §5).
6. **Tessa's leugen (M17 tot M24) is alleen zichtbaar als de speler de stille appjes leest.** Spelers die dat niet doen, snappen M24 niet meteen. Een gesproken hint is nodig: Tessa zegt "Geen idee." te snel (M17) en "Daar zit hij vast niet" in een autogesprek (nog toe te voegen).
7. **Romantiek ligt in akte 1 laag (3,4):** goed voor "vriendschappelijk beginnen", maar de eerste 40 minuten zijn de meest actiegestuurde; de lage romantiek mag niet saai worden: M04 (Loket) en M05 moeten grappig genoeg zijn.
8. **Het Gouden Eierbal-mysterie is iets ver weg tot M17:** de speler weet bijna niets over wie de bal heeft. M11 (Jelle vraagt wat er op het kaartje stond) is de eerste hint; M17 de bevestiging.

## 6. Oud naar nieuw (stappen H1-H18 en bijstappen)

Het nieuwe verhaal staat op zichzelf. De tabel laat alleen zien welk bestaand materiaal (stappen, scènes, opnames) waar terugkomt, omdat dat geld en werk scheelt. Wat niet in de tabel staat, is niet nodig voor dit verhaal.

| Oud | Nieuw | Wat en waarom |
|---|---|---|
| H1 Berend | M01 | behouden, 3 contextregels erbij |
| `k-eikea` | optioneel (06) | wereldopbouw, geen plot; verplicht maakt akte 1 te traag |
| H2 Even pinnen | M02 | behouden; Sjabbe noemt de Snackprijs niet, dat doet M04 |
| H3 Grote Markt | M03 | behouden; motief nu "€150 voor de inschrijving" |
| **nieuw** | M04 Het Loket | Jelle vroeg in beeld; artikel 4; salamitactiek; het doel wordt hardop |
| H4 Duif | M05 | behouden, verplaatst naar zo 16 |
| `k-fiets` | geschrapt | poortwachter; de fiets is nu Sjoerds startpakket (AANNAME) |
| H5 Fietsrace | M06 | behouden; het besluit "eerst pakken" erbij |
| `k-kraakspullen`, `k-nacht` | in M07 | de wachtscène en Henks zender zitten in de intro |
| H6 Kraak | M07 | behouden; **het kaartje wordt W (was J)**, vier regels opnieuw |
| `r-trein` (hideouts) | reisbeat B1 | de treinscène blijft; ijsje en Hoge der A blijven losse activiteiten in de open wereld |
| H7 Heel aankomen | M10 (mechaniek) | Femke vervalt; eieren door het Hogeland |
| H8 Vet | M08 | behouden in Stad |
| `r-tuning` | M26 | het luik inbouwen, Henk |
| H9 Ring Zuid | M16 (mechaniek) | Harm vervalt; race langs de dijk |
| H10 Vlag | M28 | verplaatst naar akte 5 |
| `r-kermis`, H11 Kroegentocht | M19, M17 | naar de Winschoten-kermis; **het keerpunt zit in M17** |
| H12 Fatbikes | M09 | verplaatst naar akte 2; krijgt het lijstje |
| `r-avond`, H13 Rondvaart | geschrapt/bijbaan | de kus verhuist naar M19; de rondvaart blijft als bijbaan (`sidejob_rondvaart.js`) |
| `s-boot`, H14 Skûtsje | M12 | boot en achtervolging in één, op het Reitdiep |
| `s-proefvlucht`, H15 Heli | M14 | de heli is nu ook het reisalternatief; koffer in plaats van ballon-bal |
| `s-carbid`, `s-padel` | bijactiviteiten | blijven minigames; "de bezigheid" zit in M24 |
| H16 Rode auto | M25 | behouden als dieptepunt; naar het Westerkwartier |
| H17 Het bod | M29 | verplaatst naar Oma's keuken, met Mem erbij |
| H18 Ontzet | M30 | behouden, Jelle is bewaarder die probeert voor te zitten |

**Hergebruikt waar het past:** 17 van de 18 oude hoofdmissies zijn als mechaniek of scène bruikbaar (alleen H13 gaat naar de bijbanen). **Samengevoegd:** 5 bijstappen. **Geschrapt:** 3 (`k-fiets`, `r-avond`, de padelstap). **Nieuw:** 13 missies.

## 7. Reisplan per akte

Afstanden zijn geschat uit algemene kennis (AANNAME) en moeten met de reisplanner van #97 worden gemeten. Als je elke afstand zelf zou rijden (75 km/u gemiddeld) is het totaal ruim 6 uur rijden; het ontwerp gaat daarom uit van **trein, bus, heli, boot of "skip"** bij elke regiosprong, en korte ritten (1-4 minuten) tussen opeenvolgende doelen. Elke reisbeat is een **keuze**: *meerijden* (korte scène of autogesprek), *zelf rijden*, of *skippen*.

| Akte | Regiosprongen (km, schatting) | Totaal km | Reistijd als je alles rijdt | Reistijd in het ontwerp | Keuzes en alternatieven |
|---|---|---|---|---|---|
| 1 | binnen Stad: 1,5 + 0,6 + 0,4 + 0,3 + 2 + 1 + 4 | 10 | 8 min | 8 min | te voet, fiets, scooter |
| 2 | Stad-Winsum 17, Winsum-Warffum 12, Warffum-Usquert 3, Usquert-Uithuizen 6, Uithuizen-Zoutkamp 30, Zoutkamp-Lauwersoog 9, Lauwersoog-Noordpolderzijl 14, plus 5,5 in Stad | 97 | 78 min | 14 min | trein Winsum, streekbus Zoutkamp, Geesjes neef brengt je |
| 3 | Lauwersoog-UMCG 35, UMCG-Dollard 45, Dollard-Eemshaven 40, Eemshaven-Delfzijl 25, Delfzijl-Winschoten 35, +8 | 188 | 150 min | 12 min | heli (Dijkstra), trein Winschoten |
| 4 | Winschoten-Veendam 17, +2, Veendam-Stadskanaal 20, Stadskanaal-Ter Apel 22, Ter Apel-Bourtange 12, Bourtange-Zuidhorn 65 | 138 | 110 min | 15 min | streekbus, Berends bus en bakkie, taxi |
| 5 | Zuidhorn-schuur 3, Zuidhorn-Aduard 12, Aduard-Grote Markt 8, Markt-toren-Oma-Markt 6 | 29 | 23 min | 20 min (de colonne is een missie) | Skip met scène |
| **Totaal** | | **ca. 465** | **ca. 6 uur** | **ca. 70 min** | |

**Regels (uit #97):** één regio per akte (Stad is begin en eind); 1-3 minuten tussen opeenvolgende doelen, nooit meer dan 5 minuten zonder gesprek, event of keuze; reizen is inhoud (autogesprekken, radio, kleine events); de missie geeft het voertuig; bij falen respawn je bij het doel of het laatste checkpoint, niet in Stad; ETA en route op de missiekaart; de dag eindigt in de regio waar je bent (een verhaaldag dekt de reis).

## 8. Communicatiekanalen (strikt gescheiden)

| Kanaal | Mag | Mag niet |
|---|---|---|
| **Radio (Nachtstreek)** | de wereld: nieuws, peilingen, rubrieken (fietstunnel, storing, torenwachter), Jelle die zijn plan aankondigt, Mem die belt | de briefing van een missie herhalen; praten tijdens een missie of gesprek (de radio **dimt zodra een missie of gesprek begint**) |
| **Autogesprek** | de relatie en de directe situatie: plagen, de provincie, "alweer gelijk" | de briefing herhalen; nieuwe plot-informatie die niet al gesproken is |
| **Appjes en sms** | alleen tekst, **stil**, geen stem | context die alleen via een appje komt: de speler hoort wat telt in de gesproken tekst; appjes zijn bijzaak (Mems appjes zijn dramatische ironie) |
| **Pop-ups** | alleen knoptips ("E om aan te spreken") | verhaal, doel of motief |

Alle scènes volgen dezelfde regel: **context in de gesproken tekst** (wie, waar, waarom nu, wat net gebeurde, wat nu), één ding per zin, eerst noemen en dan verwijzen, personages noemen elkaar bij naam, het doel wordt hardop gezegd, elke scène haakt aan bij de vorige, de grap na de uitleg. In `09` begint elke missie met die uitleg, bijvoorbeeld "We staan bij Het Loket, Tammo. Om twaalf uur sluit de inschrijving."

## 9. Wat is nieuw voor ervaren spelers

Wie het spel al kent, ziet bekende regels en mechaniek op nieuwe plekken in één nieuw verhaal. Dat levert op:

1. **De hele provincie in plaats van de stad:** 7 regio's, 18 van de 30 missies spelen buiten Stad. Bekende beats keren terug op andere plekken.
2. **Een nieuw doel en een plan dat je volgt:** het plakjesbord en het koopboek; Jelle heeft nu een motief en vertelt zelf wat hij doet.
3. **Een nieuw mysterie en een keerpunt:** de W op het kaartje; het "wij hebben hem niet" in M17; in M24 de onthulling.
4. **Een dieptepunt vlak voor de finale** (M24-M25): de ruzie en Jelles bal.
5. **Een romantische boog in zes zichtbare stappen** in plaats van één kus.
6. **13 nieuwe missies** op bestaande mechaniek (Het Loket, de brugrace, de trein, de containerkraan, de colonne) en nieuwe voertuigen (klein vliegtuig, quad, trekker, rubberboot als speedboat).
7. **Bekende regels op onverwachte plekken:** de duifvlag aan de toren in de laatste akte, de kroegentocht op een provinciekermis, de rondvaartkus op een dijk, de heli met een koffer.
8. **Een tweede doorloop (voor later):** het plakjesbord is een bron voor speedrunmedailles; "nieuw spel plus" blijft een eigen besluit.

Voor het testen van nieuwe missies zonder het verhaal te herspelen: dev-paneel (F9, `--dev`) en `--story-test` laten stappen overslaan. Verse spelers zijn nodig voor de **luistertest** (wie, waar, waarom, wat nu): wie het verhaal kent, ziet geen ontbrekende context.

## 10. Hoe de eisen worden gehaald

| Eis | Waar |
|---|---|
| 4+ uur speelduur | §3: 4:48, bandbreedte 4:00-5:20 |
| doel en motief vanaf minuut één | opening (M00), `09-script-akte1.md` |
| oorzaak en gevolg | §4, kolom plotbeat |
| vroege antagonist | Rikus in minuut 2, Jelle in persoon in M04 |
| echt dieptepunt kort voor de finale | M24-M25 (di 25 aug, finale vr 28) |
| climax die alles samenbrengt | M30 (jury, bal, duiven, wagen, bondgenoten) |
| groeiboog | Tammo (zwijgen naar zeggen), Tessa (regelen naar blijven), Jelle (foar mem naar ja mem) |
| hele provincie | Stad, Hogeland, Eemsdelta, Waddenzee, Westerkwartier, Oldambt, Veenkoloniën, Westerwolde incl. Bourtange, Dollard |
| bestaande voertuigen | auto, fiets, scooter, bus, trein (meerijden en rijden), heli, klein vliegtuig, boten, trekker |
| de bal blijft centraal; "de bal is Grunn" | M09, M29, M30; Oma, Mem |
| toon | droog en kort: Tammo's understatement, "…Hè.", "Ik meld alleen." |
| Moffel-en-Piertje-ritme (eigenwijs en vaak fout, tegenover vaak gelijk en soms saai) | `09` autogesprekken per akte; "Alweer gelijk." / "Dat bedoelde ik ook." |
| romantiek in stappen | §4, de trap |
| GTA-principes, knipoog naar deel zes | de trailer-regel ("deel zes van een serie die niet bestaat"), twee onhandige crimineeltjes op de vlucht, Sikkom-schermen |
| indie en hergebruik | 08-IMPLEMENTATIE: 17 missies op bestaande defs, 13 nieuwe op bestaande mechaniek, 3 zware features optioneel |
| kanaalscheiding | §8 |

## 11. Open vragen aan de eigenaar (8)

1. **Deel 1-3 volledig vervangen en Deel 4 (Ubbo, de Ommelander Ronde) als vrij spel of later vervolg?** A) ja: dit verhaal vervangt Deel 1-3; Deel 4 wordt later een vrij-spel-uitbreiding (de patatbaron in een Rikus-regel voorgezaaid). B) nee: Deel 4 blijft het vervolg ná dit verhaal zoals het plan nu is (dan overlapt de provincie).
2. **"Tige tank! – W." = "Wij" (Oma en Mem namen de bal)?** A) ja (voorstel; vier J-regels opnieuw opnemen). B) nee, terug naar J (Jelle heeft hem echt; de twist vervalt).
3. **Tessa is Nederlandse (geboren elders, zomers in Ljouwert), niet Groningse?** A) ja, nieuwe regels in standaard Nederlands; bestaande Gronings-getinte regels blijven (zachte afwijking). B) nee, ze blijft Groningse met een Friese oma (dan geldt "kent Friezen" nog steeds).
4. **Eerste kus in akte 3 (M19) of pas in akte 4?** A) akte 3, daarna doen ze alsof het niet gebeurd is (voorstel). B) pas na het dieptepunt (scherpere ruzie, minder warmte).
5. **Klein vliegtuig (M18) als nieuwe vliegtuigmodus, of de heli?** A) vliegtuig (nieuw voertuig, groot bouwwerk). B) heli (geen nieuwe code).
6. **Water in de tegelwereld (Reitdiep, Lauwersmeer, wad) voor M12 en M13?** A) ja, bouwen. B) nee, M12 op bestaand water en M13 als scène.
7. **De epiloog: "Het is koud." (strijdig met constitutie 3) houden?** A) ja, het is een grap van Grunn en de stad is het er niet mee eens. B) nee, vervang door "Het is tweeëntwintig graden." (kost twee regels).
8. **Hoeveel nieuwe opnames?** A) alles nieuw in één ronde (707 regels, ca. 1-2 dollar). B) eerst akte 1 en 5 (grotendeels bestaand), de rest na een speeltest.

## 12. Hoe te beoordelen (checklist: 10 ja/nee)

Zet een vinkje bij "ja". Een verhaal dat minder dan 8 vinkjes heeft, moet worden herzien voor het wordt gebouwd.

- [ ] Is het doel duidelijk in de eerste 10 minuten (winnen op 28 augustus, een standplaats, de Fjord Frituur)?
- [ ] Weet je na M04 wie de tegenstander is, wat hij wil en hoe hij het doet (de salamitactiek)?
- [ ] Is er een echt dieptepunt vlak voor de finale (M24-M25), waarin Tammo en Tessa echt ruzie hebben en de bal bij Jelle is?
- [ ] Is de finale (M30) een climax die alle draden samenbrengt (jury, bal, duiven, wagen, de bondgenoten, de vijf woorden)?
- [ ] Is er een zichtbare boog voor Tammo (van zwijgen naar zeggen) en voor Tessa (van nergens blijven naar blijven)?
- [ ] Komen alle zeven regio's, Stad en Bourtange voor, zonder dat reizen aanvoelt als tijd zitten uitzitten?
- [ ] Loopt de romantiek in zichtbare stappen (hand, blik, flirt, kus, knuffel, stel) en komt het moment "Ik wil bij jou blijven" verdiend?
- [ ] Is elke scène te volgen op de gesproken tekst alleen (wie, waar, waarom nu, wat nu), zonder contextkaartjes?
- [ ] Houden radio, autogesprek, appjes en pop-ups zich aan hun eigen kanaal?
- [ ] Is er voor spelers die het oude verhaal kennen genoeg nieuws (nieuwe plekken, nieuw mysterie, 13 nieuwe missies)?
