# IARC-vragenlijst: antwoorden om te plakken (#60)

Basis: `docs/LEEFTIJD.md` (18+, bloed standaard aan) en de inhoud van de game.
De vragenlijst van IARC (via Google Play Console, Microsoft Store, Nintendo,
enz.) wisselt per afnemer van volgorde en woorden; zoek bij elke vraag het
onderwerp hieronder. Verwacht resultaat: **PEGI 18, USK 18, ESRB Mature 17+**
(IARC rekent ESRB-stijl; PEGI/USK volgen uit dezelfde antwoorden). Steam heeft
een eigen Content Survey (zie `docs/steam/winkelpagina.md`); de antwoorden
hieronder zijn daar ook bruikbaar.

Algemene keuzes:

- **Categorie:** Game (niet "social", "streaming" of "overig").
- **Platform/distributie:** gratis, offline, geen account, geen advertenties.
- **Antwoord altijd het ruimste dat je in de standaardinstelling ziet.** Bloed
  staat standaard aan; de uit-schakelaar verlaagt de leeftijd niet.

## 1. Geweld

| Vraag (globaal) | Antwoord | Plak-toelichting (Engels, voor het vrije veld) |
|---|---|---|
| Bevat de game geweld? | Ja | The player drives stolen cars, runs over and shoots pedestrians and police officers with pistols, SMG, shotgun and melee weapons, and uses explosives. Third-person 3D, realistic human models. |
| Realistisch of cartoonachtig? | Realistisch | Human characters look like real people. |
| Tegen mensen? | Ja | Civilians and police can be killed by cars, trains, weapons and explosions. |
| Tegen onschuldige of weerloze personages? | Ja | The player can attack civilians; it earns wanted stars but is not prevented. |
| Tegen dieren? | Ja | Animals can be run over and die. |
| Bloed? | Ja | Blood splatter, pools and stains on road and cars. Can be disabled in settings; on by default. |
| Gore, verminking, ledematen? | Ja | Body parts fly off on hard hits, explosions and trains. Can be disabled; on by default. |
| Vuurwapens? | Ja | Pistol, SMG, shotgun, scoped hunting rifle. |
| Marteling, seksueel geweld? | Nee | |

## 2. Seks en naakt

| Vraag | Antwoord | Toelichting |
|---|---|---|
| Seksuele inhoud | Nee | |
| Naakt | Nee | |
| Seksueel geweld of misbruik | Nee | |
| Romantiek | Ja, licht | A single kiss between the two main characters. |

## 3. Taalgebruik

| Vraag | Antwoord | Toelichting |
|---|---|---|
| Grof taalgebruik | Ja, licht (kies "mild") | Mild insults in Groningen dialect ("Bist betoeterd?", "Rot op, joh!"). No strong profanity, no sexual words, no slurs. |
| Discriminatie, haatzaaiend taalgebruik | Nee | |
| Grove humor | Ja, licht | Pigeons pooping on people, a student vomiting in a taxi. |

Controle voor het indienen: loop de dialoogbestanden (`game/js/*lines.js`) na
op sterke scheldwoorden. Een steekproef op "kanker", "kut", "klootzak",
"godverdomme", "tering" en "hoer" vond geen treffers in `game/js`. Zodra daar
iets bij komt (stemlijnen in `game/audio`) verandert dit antwoord naar "ja".

## 4. Drugs, alcohol, tabak

| Vraag | Antwoord | Toelichting |
|---|---|---|
| Alcohol | Ja, gebruik en verwijzing | A pub crawl mission (H11), beers in hospitality venues, drunk screen effects; drunk driving is an offence in-game. |
| Drugs | Nee | |
| Tabak | Verwijzing, geen gebruik | A shop named "Tabak & loterij"; no smoking is shown and no tobacco is sold. Kies als IARC alleen "gebruik" vraagt: Nee. |

## 5. Gokken en geld

| Vraag | Antwoord | Toelichting |
|---|---|---|
| Gokken met echt geld | **Nee** | |
| Gesimuleerd gokken | **Ja** | Scratch cards and lottery tickets at a shop ("Rook & Geluk"), paid with in-game money only. In-game money cannot be bought. |
| Loot boxes, betaalde willekeurige items | **Nee** | |
| Aankopen met echt geld (in-app) | **Nee** | No purchases of any kind. |
| Advertenties | Nee | |
| Echt geld winnen | Nee | |

## 6. Interactie, privacy, locatie

Het spel heeft sinds 0.38 (#95, #316-#318) een modus **Samen spelen** (peer-to-peer, tot een
paar spelers, met een kamercode). Er is geen tekstchat, geen spraak, geen publieke
lobby, geen profielen en geen uitwisseling van eigen inhoud; spelers zien elkaar
alleen als figuren in de wereld en delen de voortgang van het verhaal.

| Vraag | Antwoord | Toelichting |
|---|---|---|
| Spelers kunnen met elkaar communiceren (chat, voice, berichten) | Nee | Alleen speltoestand en posities; geen tekst of spraak (`game/js/net/` bevat geen chat- of microfooncode). |
| Gebruikers kunnen elkaar ontmoeten of vinden | Alleen met een kamercode die je zelf deelt | Geen zoekfunctie, geen openbare lijst. |
| Online multiplayer | **Ja, optioneel** (Samen spelen) | Peer-to-peer (WebRTC). Het hele spel werkt ook volledig offline voor één speler. |
| Gebruikersgegenereerde inhoud delen of ontvangen | Nee | |
| Deelt de game gegevens met derden | Alleen na toestemming in het spel | IP-adres naar openbare STUN-servers; versleutelde signalering (kamercode als sleutel) via openbare brokers. Geen account, geen telemetrie. Zie `game/js/net/netconfig.js`, `net/consent.js` en [PRIVACY-EN-CREDITS.md](PRIVACY-EN-CREDITS.md). |
| Deelt de game de **locatie** van de gebruiker | Nee | Geen geolocatie; het IP-adres bij Samen spelen is geen locatiegegeven dat het spel gebruikt. |
| Verzamelt of deelt persoonsgegevens, account, e-mail | Nee | Opslag is lokaal (savegame op het apparaat). |
| Digitale aankopen, abonnement | Nee | |
| Internetverbinding nodig | Alleen voor Samen spelen, en in de **webversie** voor het laden van three.js (CDN) en lettertypen (Google Fonts) | De desktopversie draait zonder internet. Beantwoord een vraag over "verbinding met internet" voor de webversie met Ja. |
| Verwijzingen naar of links naar internet, sociale media | Beperkt | Externe links openen in de systeembrowser (`desktop/main.js`). Vermeld ze als "link naar externe pagina". |

## 7. Overig

| Vraag | Antwoord | Toelichting |
|---|---|---|
| Misdaad / criminaliteit | Ja | The core loop: stealing cars, fleeing police, a museum heist (H6), hijacking a fuel tanker (H8). Played with humour. |
| Angst, horror | Nee | |
| Bedreigende of intimiderende inhoud | Licht | A night scene about a woman feeling unsafe (F4a, nog niet gebouwd): serieus, geen geweld in beeld; voeg dit toe als het er komt. |
| Politieke of religieuze inhoud | Nee | Echte plaatsen en parodie-merken; zie `docs/LICENTIES.md` voor de merkenregel. |
| Echte personen of merken | Parodie | Verzonnen namen en parodieën; geen echte personen. |
| Geld verliezen, beroving | Ja, licht | In een paar wijken 's avonds en 's nachts snaait een dief je portemonnee: je verliest een deel van je spelgeld, niemand wordt geraakt en er is geen geweld in beeld (`muggingrules.js`). Het geld is niet te koop. Zie constitution 6 in AGENTS.md (satire, geen leed). |
| Door AI gemaakte inhoud | Ja, vooraf gemaakt | Alle muziek en alle stemmen zijn vooraf gemaakt met Google Gemini; er zijn geen AI-aanroepen tijdens het spelen. IARC vraagt hier meestal niet naar, Steam wel (AI-melding in `docs/steam/winkelpagina.md`; de herkomst staat in `docs/LICENTIES.md` §2 en §4). |
| Satire, humor | Ja | Een open-wereld-komedie met verzonnen bedrijven en personages; politiek en religie komen niet voor. |

## Verwacht label

- IARC / ESRB-stijl: Mature 17+; Blood and Gore, Intense Violence, Simulated
  Gambling, Use of Alcohol, Crude Humor, Mild Language.
- PEGI 18: Geweld, Gokken, Alcohol (taal mogelijk).
- USK 18: Gewalt, Glücksspielelemente, Alkohol.
- Als IARC "Users Interact: Nee" en "Shares Location: Nee" toont, is dat juist.

## Waar op te letten

1. De uitkomst die IARC toont kan lager zijn dan 18 (bijvoorbeeld Mature 17+ in
   de VS); dat is geen fout. PEGI 18 komt uit "gesimuleerd gokken" of "grof
   geweld tegen weerloze personages".
2. Antwoorden wijzigen bij nieuwe inhoud (F4a nachtscene, nieuwe wapens,
   drugsverwijzingen): `docs/LEEFTIJD.md` bijwerken en de vragenlijst opnieuw
   invullen.
3. Een eigen IARC-account is nodig via een afnemer (bijvoorbeeld Google Play
   Console). Dat vraagt een account en e-mailadres; dat doet de eigenaar zelf.
4. Verstuur het certificaat nooit zonder de eigenaar; deze notitie vult niets in.

## Gecontroleerd tegen de code (21 okt 2026, herhaald op `main` na 0.38.1)

Zoekopdrachten in `game/js`, `game/index.html` en `game/storydata/script.json`
(stand `main`, niets gestart of ingevuld):

- sterke scheldwoorden (kut, klootzak, godverdomme, tering, kanker, hoer, neuk, lul,
  flikker, mongool, debiel): **0 treffers**;
- drugswoorden (wiet, hasj, cocaïne, heroïne, xtc, drugs, coke, lsd, paddo): **0 treffers**
  (alleen "Wiet" in `fierljep.js` en `subtitles.js`: Fries voor "nat", een uitroep van een falende polsstokspringer; leg dit zo uit als een tekstscan erover struikelt);
- chat, emoji, spraak, microfoon in `game/js/net/` en `game/js/coop*.js`: **0 treffers** (het veld `voice` in `coopcut.js` is de verwijzing naar een opgenomen stemlijn, geen microfoon);
- gokken: alleen kraskaarten en loten voor spelgeld in `shops.js`/`shopmodels3d.js`;
- alcohol: horeca, kroegmissie, dronken-effect (`drunk.js`);
- wapens (`weapons.js`): vuisten, knuppel, hockeystick, bezem, fietspomp, klomp, polsstok, pistool, uzi, waterpistool (onschadelijk), shotgun, jachtgeweer, carbidbus en vuurwerk; geen nieuwe soort sinds de eerste versie van dit blad;
- Samen spelen staat sinds 0.38.0 in de releases (CHANGELOG `[0.38.1]`); de antwoorden in §6 gelden dus voor wat spelers nu downloaden;
- beroving: `muggingrules.js` (deel van het geld, niemand geraakt, geen geweld in beeld);
- angst/horror: de schaapontvoering door een ufo (#333) is slapstick (een straal en een schaap dat omhoog zweeft), geen horror.

Niet nagegaan: de ingesproken audio (`game/audio`) zelf; de tekst erachter is wel
doorzocht via de scripts. De eigenaar luistert steekproefsgewijs op sterke taal
voordat hij het formulier indient. Het formulier invullen blijft aan de eigenaar.
