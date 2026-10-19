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

| Vraag | Antwoord |
|---|---|
| Spelers kunnen met elkaar communiceren (chat, voice, berichten) | Nee |
| Gebruikersgegenereerde inhoud delen of ontvangen | Nee |
| Online multiplayer | Nee (alleen offline singleplayer) |
| Gebruikers kunnen elkaar ontmoeten of vinden | Nee |
| Deelt de game de **locatie** van de gebruiker | Nee |
| Verzamelt of deelt persoonsgegevens, account, e-mail | Nee. Opslag is lokaal (savegame op het apparaat). |
| Digitale aankopen, abonnement | Nee |
| Bevat verwijzingen naar of links naar internet, sociale media | Nee in het spel (controleer: de website- of GitHub-link in het menu, indien aanwezig, vermelden als "link naar externe pagina") |

## 7. Overig

| Vraag | Antwoord | Toelichting |
|---|---|---|
| Misdaad / criminaliteit | Ja | The core loop: stealing cars, fleeing police, a museum heist (H6), hijacking a fuel tanker (H8). Played with humour. |
| Angst, horror | Nee | |
| Bedreigende of intimiderende inhoud | Licht | A night scene about a woman feeling unsafe (F4a, nog niet gebouwd): serieus, geen geweld in beeld; voeg dit toe als het er komt. |
| Politieke of religieuze inhoud | Nee | Echte plaatsen en parodie-merken; zie `docs/LICENTIES.md` voor de merkenregel. |
| Echte personen of merken | Parodie | Verzonnen namen en parodieën; geen echte personen. |

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

## Aanvulling na samen spelen (#95, 18 okt 2026)

De tabellen hierboven stammen van vóór de modus samen spelen. Voor de vragen over
online functies geldt nu (eigenaar vult aan bij het invullen):

| Vraag (globaal) | Antwoord | Toelichting |
|---|---|---|
| Online interactie tussen gebruikers / chat | Beperkt: samen spelen met een kamercode, geen tekstchat, geen publieke lobby | Peer-to-peer (WebRTC) tussen spelers die de code delen |
| Deelt gegevens met derden | Alleen na toestemming van de speler: IP-adres naar openbare STUN-servers; versleutelde signalering via openbare brokers | `game/js/net/netconfig.js`, `net/consent.js`, [PRIVACY-EN-CREDITS.md](PRIVACY-EN-CREDITS.md) |
| Gebruikers kunnen content delen (UGC) | Nee | |
| Internetverbinding nodig | Alleen voor samen spelen (en de webversie, zie het CDN-punt) | |

Controleer in het echte formulier of "interactieve elementen" (users interact,
shares info) aangevinkt moet worden; kies bij twijfel het ruimste antwoord. De
overige stappen staan in [PUBLICATIECHECKLIST.md](PUBLICATIECHECKLIST.md).
