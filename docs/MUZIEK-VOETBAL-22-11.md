# Voetbalmuziek (22-11)

Stand: 22 november 2026, branch `voetbalmuziek-22-11`. Opdracht van de eigenaar: eigen muziek voor het voetballen (wedstrijd, training, penalty's, clubscherm), minstens 5 nummers. Alle teksten zijn nieuw en origineel; de clubs zijn verzonnen, de plaatsen echt, geen echte clubs, merken of personen. Altijd zomer. Dit is ontwikkeltijd-audio via Gemini (ADR 0039); de herkomst staat in docs/LICENTIES.md.

## Stand

Zie het kopje "Stand van de productie" onderaan: daar staat per nummer of het echt gemaakt is of alleen als prompt klaarstaat. **Alles moet door de eigenaar beluisterd worden voordat het blijft.**

## De muziekset

| Sleutel | Bestand (`game/audio/voetbal/`) | Wanneer | Karakter |
|---|---|---|---|
| `voetbal_opkomst` | `opkomst.mp3` | intro van de wedstrijd (kleedkamer, opkomst) | opzwepend, 128 bpm, koper en trommels |
| `voetbal_rustig` | `wedstrijd_rustig.mp3` | aftrap, spel en hervatting; ook de penalty's en de training | rustig-spannend lus, 100 bpm |
| `voetbal_tempo` | `wedstrijd_tempo.mp3` | slotfase van de tweede helft (laatste kwart, of laatste helft van de tweede helft bij hooguit een doelpunt verschil) | hoog tempo, 150 bpm |
| `voetbal_club` | `clublied.mp3` | rust, en de terugval voor de winst-sting | clublied met hoefjes en trommels, terpklasse-gevoel |
| `voetbal_troost` | `troost.mp3` | einde na verlies of gelijkspel | warm, weemoedig maar zonnig, troostend |
| `voetbal_ambient` | `club_ambient.mp3` | clubscherm (tabblad Voetbal in het pauzemenu) | zacht en instrumentaal |
| `voetbal_sting_goal` | `sting_doelpunt.mp3` | doelpunt (eenmalig, 4 tot 6 s) | korte juichsting |
| `voetbal_sting_winst` | `sting_winst.mp3` | einde na winst (eenmalig, 8 tot 12 s) | korte feeststing |

Zes volledige nummers en twee stings. Ontbreekt een bestand, dan valt het spel terug (zie `footballmusic.js`): tempo naar rustig, een ontbrekende sting laat de lus gedempt doorspelen, en zonder enig bestand speelt de radio of niets.

## Slotregel voor elke prompt

`Sing in Dutch. An original composition, not imitating any existing song, artist or franchise. Clean mix, moderate loudness, no sudden loud peaks.` Weigert Gemini een prompt, haal dan één woord weg en voeg geen context toe.

## 1. Het veld op (opkomst)

Stijl: `Stadium walk-out and locker room anthem, driving 128 bpm, stomping drums, handclaps, big brass stabs, punchy bass guitar, chanting crowd gang vocals, confident, summery and fun.`

```
[Couplet] Veters strak en shirt in de broek, de terp ligt klaar, het gras is zacht.
Tammo klopt op de kleedkamerdeur, Tessa zegt: kom op, het is zomernacht.
[Refrein] Het veld op, het veld op, de hele terp staat achter ons!
Het veld op, het veld op, de wolken weg, de zon op ons!
[Couplet 2] De supporters zingen over de dijk, de trommel slaat, de vlag gaat mee.
Eén voor allen, allen voor de bal, vandaag spelen we met elkaar.
[Refrein] Het veld op, het veld op, de hele terp staat achter ons!
```

## 2. Rustig aan de bal (wedstrijdlus)

Stijl: `Tense but calm instrumental for a football match, 100 bpm, minor-leaning, pulsing bass, soft snare, muted guitar arpeggios, warm synth pad, slowly building without peaking, loopable.` Instrumentaal, zonder zang; sluit aan op het begin (geen fade-out, geen groot slotakkoord).

## 3. Elke meter telt (slotfase)

Stijl: `Fast, urgent instrumental for the last minutes of a football match, 150 bpm, driving drums, galloping bass, bright guitars, rising strings, relentless energy, loopable.` Instrumentaal, loopbaar, zonder fade-out.

## 4. Terpklasse (clublied)

Stijl: `A warm village-club anthem, 96 bpm, hoofbeat-like percussion (clip-clop wood blocks), big marching bass drum, accordion, brass band, a large friendly choir singing along, proud and sunny.`

```
[Couplet] Op de wierde staat een veld, vierkant en groen als een lap,
met een bankje van hout en een kantine met koffie en een stapel brood.
Tien jongens, twee meiden en een keeper met een hoed,
we zijn niet de beste, maar wel de gezelligste groep.
[Refrein] Terpklasse, Terpklasse, wij houden het land droog en de kop erbij!
Terpklasse, Terpklasse, wie ons wil slaan moet vroeg op, en wij hebben nog tijd!
[Couplet 2] De trekker staat achter het doel, de koe kijkt over de lat,
de scheids is de buurman en fluit alsof het niets is.
Wij winnen, wij verliezen, we zingen er altijd een lied bij,
de dijk is ons stadion, de zomer is van ons.
[Refrein] Terpklasse, Terpklasse, wij houden het land droog en de kop erbij!
```

## 5. Morgen weer (troost)

Stijl: `A gentle, consoling folk-pop ballad, 80 bpm, acoustic guitar, soft piano, brushed drums, warm cello, one warm male and one female voice trading lines, wistful but sunny, hopeful ending.`

```
[Couplet] Het fluitsignaal is lang geleden, de tribune loopt langzaam leeg.
Een sjaal ligt op de bank, de lamp is nog aan, de koffie is nog warm.
Je hoofd hangt laag, maar je veters zitten goed,
er is altijd morgen, en het gras groeit gewoon weer door.
[Refrein] Morgen weer, morgen weer, de bal rolt altijd verder.
Morgen weer, morgen weer, en wij staan er weer bij.
Geen een die het onthoudt, behalve hoe we lachten,
op de terp in de zomer, na een middag vol verlies.
[Couplet 2] Tessa deelt een rondje uit, Tammo houdt de bal bij zich,
de supporters klappen hard voor wie het veld op ging.
[Refrein] Morgen weer, morgen weer, de bal rolt altijd verder.
```

## 6. Kantine (clubscherm, ambient)

Stijl: `Soft, relaxing instrumental ambient for a club lounge scherm, 70 bpm, warm electric piano, light brushed percussion, gentle upright bass, distant crowd murmur as texture, sunny afternoon feel, loopable.` Instrumentaal.

## Stings

**Doelpunt** (4 tot 6 s): `A short, joyful goal sting, 5 seconds, a roaring brass fanfare, big drum hit, rising run and a bright final chord, crowd cheer texture, instrumental.`
**Winst** (8 tot 12 s): `A short victory sting, 10 seconds, triumphant brass band, accordion flourish, clapping crowd, a proud final chord, instrumental.`

## Koppelen en gedrag in het spel

- Code: `game/js/footballmusic.js` (puur: fasekeuze, terugval, demping), aangeroepen door `scenariomusic.js` (`activityMusicKey`) en afgespeeld door de scenario-laag in `game/audio/scenario.js` (zelfde crossfade, lazy laden en loop-scan als de missiesferen). Test: `node scripts/footballmusic_test.mjs`.
- Een bestand toevoegen: `game/audio/voetbal/<bestand>.mp3` neerzetten en de sleutel in `FOOTBALL_AVAILABLE` zetten; de test vergelijkt map en lijst.
- Instellingen, tabblad Geluid: **Voetbalmuziek** (aan of uit, standaard aan) en **Voetbalmuziek, volume** (standaard 80 procent, onder de gewone muziekschuif). Uit: de radio blijft spelen.
- De voetbalmuziek vervangt de radio tijdens de wedstrijd (geen overlap in het stadion). Bij een doelpunt wordt hij gedempt tot 30 procent, rond de fluit en het eindsignaal tot 55 procent, zodat het commentaar en het publiek erdoorheen komen.
- Samen spelen: de muziek is lokaal. Wie meespeelt (host of gast die J koos bij Meedoen) hoort de fasemuziek van zijn eigen scherm, afgeleid van de eigen sim of spiegel (`world.voetbalGame`); wie niet meedoet houdt de radio. Er gaat niets over het netwerk, geen nieuw bericht, geen opslag. Valt iemand weg of sluit hij later aan, dan volgt zijn muziek gewoon de fase van zijn scherm.

## Stand van de productie

Echt gemaakt via Gemini met de Claude-in-Chrome-extensie (verse tab, korte stappen; het vastlopen van de vorige poging kwam niet terug): **5 volledige nummers en 2 stings** (opkomst, wedstrijd rustig, slotfase tempo, troost, clubscherm-ambient, doelpunt-sting, winst-sting), gedownload als mp3, omgezet naar 128 kbps en op circa -12 LUFS gebracht (de stings zijn de eerste 6 en 10 seconden van een langere track, met fade-out).

**Alleen als prompt klaar, niet gemaakt:** nummer 4, Terpklasse (clublied). Gemini antwoordde met een filtermelding (de woorden "slaan" en "jongens/meiden" werden genoemd) en bood aan de tekst aan te passen. Dat is niet gedaan: de melding is niet omzeild en de tekst niet vermomd. Wil je het clublied toch, pas dan zelf de regel "wie ons wil slaan moet vroeg op" aan en plak de prompt in Gemini; zet daarna `clublied.mp3` in de map en `voetbal_club` in `FOOTBALL_AVAILABLE`.

Nummer 2 gaf twee keer een foutmelding op de eerste vorm van de prompt (met zangregels in de tekst); met Zang op Instrumentaal werkte hij direct. De troost-prompt kreeg eerst "generator niet beschikbaar" en werkte bij de tweede poging. De stings waren kort gevraagd maar Gemini levert minuten; ze zijn ingekort.

**Alles moet door de eigenaar beluisterd worden**: geen enkel nummer, geen einde van een lus en geen sting is door een agent gehoord. Let op of de lussen naadloos sluiten, of de stings in de eerste seconden de juiste inzet hebben, of de zang Nederlands is en of een titel of tekst per ongeluk een echte naam of merk noemt. Het niveau is gemeten, niet beoordeeld.

## Herkomst per bestand

Gemaakt in de Gemini-app (Muziek maken, ADR 0039); omgezet naar 128 kbps, 44,1 kHz stereo, zonder tags, circa -12 LUFS zoals de G-Music-nummers. De auteursregel staat in docs/LICENTIES.md (AI-output van Gemini); docs/AUDIO-LICENTIES.md is een gegenereerd bestand voor de Freesound-geluiden en is daarom niet gebruikt.

| Bestand | Gemini-titel | Duur |
|---|---|---|
| `opkomst.mp3` | Het veld op | 3:01 |
| `wedstrijd_rustig.mp3` | Before the Whistle | 2:54 |
| `wedstrijd_tempo.mp3` | The Last Gear | 2:56 |
| `troost.mp3` | Op de terp in de zomer | 2:36 |
| `club_ambient.mp3` | Golden Hour Terrace | 2:46 |
| `sting_doelpunt.mp3` | The Final Whistle Blows (eerste 6 s) | 0:06 |
| `sting_winst.mp3` | Glory Under the Lights (eerste 10 s) | 0:10 |
