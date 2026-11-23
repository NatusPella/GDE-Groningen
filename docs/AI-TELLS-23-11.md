# AI-tells in tekst en UI (23-11)

Aanleiding: bij een publisher werd het spel weggezet om "AI-issues die een mens binnen een seconde ziet". Dit document
legt vast waar lezers, recensenten en publishers AI-tekst aan herkennen, hoe we dat in de speltekst meten en wat er in
deze ronde is rechtgezet. Het beeld en de audio vallen hier buiten; dit gaat over tekst en UI.

Meten: `node scripts/ai_tells_scan.mjs` (telling per kenmerk en per bestand, met voorbeelden;
`--kenmerk=a,b` toont alle treffers, ingesproken regels staan erbij gemarkeerd). Bewaken:
`node scripts/ai_tells_scan_test.mjs` faalt als een kenmerk boven `scripts/ai_tells_baseline.json` komt. De baseline
mag alleen dalen: na een opschoonronde zet `node scripts/ai_tells_scan.mjs --write` hem lager (nooit hoger).

## Wat mensen herkennen

Geen enkel kenmerk bewijst iets; mensen schrijven ook "cruciaal" en zetten ook eens een gedachtestreepje. Het gaat om
dichtheid: veel van dezelfde trucs op een rij leest als een machine. Alle bronnen hieronder zeggen dat ook.

| Kenmerk | Waarom het opvalt | Bron |
|---|---|---|
| Gedachtestreepje (—) midden in een zin | Komt uit het Engels; Nederlanders zetten er een komma, punt of dubbele punt. Voor veel lezers "hét" herkenningsteken van ChatGPT. | Donna van de Ven; Vizibly; Wikipedia: Signs of AI writing |
| "Niet X, maar Y" en "niet alleen ... maar ook" | Negatieve parallel: de vaste contrastformule van modeltekst. | Wikipedia: Signs of AI writing; Welingelichte Kringen |
| Opgeklopte woorden: naadloos, cruciaal, essentieel, optimaal, bovendien, kortom, "speelt een belangrijke rol", "een breed scala" | Woorden die Nederlanders weinig gebruiken en modellen veel. | Vizibly; Welingelichte Kringen; TE-learning |
| Verkooppraat: duik in, ontdek, beleef, episch, ultiem, "jouw reis", "het avontuur wacht", "immerse yourself", "embark on a journey" | Stockfrasen van winkelpagina's en modeltekst. | Wikipedia (puffery); Steam-pagina's met AI-disclosure |
| Regel van drie ("snel, simpel en slim") | Modellen gebruiken drietallen om een oppervlakkige tekst volledig te laten lijken. | Wikipedia: Signs of AI writing; Vizibly |
| Staccato-drietal ("Twee vrienden. Eén zomer. Geen plan.") | De trailer- en taglineformule; als alles zo klinkt, klinkt niets meer als een personage. | Afgeleid van de regel van drie |
| Kort vraagje dat zichzelf beantwoordt ("Het resultaat? Chaos.", "Eerlijk?") | Blogtruc die modellen overnemen. | Vizibly; Blogkracht |
| Nadrukaccent (écht, héél) | Stijlmiddel dat in AI-tekst opvallend vaak terugkomt. | Blogkracht |
| Samenvattende slotzin ("Kortom", "Uiteindelijk draait het om...") | Holle conclusie. | Wikipedia; Welingelichte Kringen |
| Titel met dubbele punt ("Groningen: een reis door de tijd") | Vaste kopvorm van modeltekst. | Wikipedia (section headers) |
| Title Case in het Nederlands ("Nieuw Spel Starten") | Engelse gewoonte; in het Nederlands krijgt alleen het eerste woord en een naam een hoofdletter. | Taaladvies.net; Standaardnederlands.nl; Wikipedia |
| Emoji in tekst en opsommingen | Typisch voor chatbotopmaak. | Wikipedia (emoji bullets) |
| Overdreven enthousiasme en uitroeptekenstapels | Verkooptoon; alles even belangrijk. | Welingelichte Kringen; Wikipedia (promotional tone) |
| Verzonnen statistiek of vage bron ("87% van de spelers", "experts zeggen") | Wezelwoorden en nepcijfers. | Wikipedia (vague attributions) |
| Overal dezelfde zinsbouw en lengte | "AI schrijft consistent: zinnen van 15 tot 25 woorden, keurig afgewisseld." | Vizibly |
| Placeholder- en debugtekst, Engelse resten | Wat een mens in een seconde ziet: TODO, lorem ipsum, "ok", "build", Engelse labels. | Wikipedia (placeholder text); eigen QA |
| Generieke, lege tekst ("low-effort, generic, or meaningless") | De definitie van "AI slop" waar spelers op afhaken. | Notebookcheck; Destructoid; GamesRadar (Vapor World) |
| Losgeschreven samenstellingen ("Politie Boot") | Engelse spatie in een Nederlands woord: leest als vertaald of gegenereerd. | Eigen QA (de "Engelse ziekte" in samenstellingen) |

Spelers en recensenten zijn er scherp op: bijna de helft van de nieuwe Steam-releases in oktober 2026 meldde AI-inhoud
(Destructoid), AI-gelabelde games verkopen slechter en krijgen slechtere recensies (Joost van Dreunen), en een game met
"AI voices, AI cutscenes, it's not even subtle" zakte naar 25% positief (GamesRadar). Er is ook een keerzijde: games
worden ten onrechte beschuldigd (Shrine's Legacy, Vice). Juist daarom moet tekst die een mens schreef ook zo lezen.

## Wat de scan telt

`scripts/ai_tells_scan.mjs` leest alle speltekst die `text_audit.mjs` verzamelt (game/js, game/index.html,
game/storydata/script.json, desktop, het changelog) plus wat een publisher het eerst ziet: de marketingpagina
(`website/`), de hulppagina's en het Nederlandse deel van `docs/steam/winkelpagina.md`. Opmaak, klassenamen en css
tellen niet. De ondertitels (`subtitles.js`) en het verhaalscript spiegelen regels van elders en tellen bij
"identieke zin" niet dubbel.

Kenmerken: gedachtestreepje, niet-x-maar-y, ai-woord, drietal, staccato-drietal, laten-we, afsluitzin, vraag-antwoord,
nadruk-accent, uitroep-enthousiasme, uitroep-stapel, nep-statistiek, titel-dubbelepunt, title-case, emoji,
engels-woord, dubbele-spatie, drie-puntjes ('...' waar het spel '…' gebruikt), placeholder-debug en identieke-zin.

## Stand 23-11

Gemeten met dezelfde scan op origin/main (voor) en op deze branch (na), 594 en 525 treffers in totaal.

| Kenmerk | Voor | Na | Toelichting |
|---|---:|---:|---|
| identieke-zin | 232 | 233 | vooral code die dezelfde regel op twee plekken draagt (missietitels, dossiers); +1 doordat Durk en Douwe nu overal dezelfde tagline hebben |
| drietal | 91 | 77 | winkel-, voertuig- en personageteksten |
| staccato-drietal | 83 | 74 | taglines; de rest is ingesproken of de stem van een personage |
| drie-puntjes | 44 | 11 | de rest is ingesproken (de tekst is de sleutel van de opname) |
| titel-dubbelepunt | 42 | 42 | scènetitels uit de 09-scripts; zie hieronder |
| engels-woord | 21 | 15 | de rest: Engelse toeristen (ingesproken), een ontwikkelscherm |
| niet-x-maar-y | 19 | 19 | gelezen: gewone spreektaal, geen formule |
| uitroep-stapel | 19 | 19 | bijna alles ingesproken; de radioreclame is een parodie |
| gedachtestreepje | 11 | 8 | de rest: ondertekening (– M.), draaiboekkoppen, één ingesproken regel |
| ai-woord | 7 | 7 | de slogan (besluit eigenaar) en technische termen (Dynamische resolutie, Legendarisch als vissoort) |
| title-case | 7 | 2 | de rest zijn eigennamen |
| uitroep-enthousiasme | 6 | 6 |  |
| dubbele-spatie | 6 | 6 | uitlijning op een schermpje in de wereld en een ontwikkeloverlay |
| laten-we | 3 | 3 | gewone zinnen |
| emoji, nep-statistiek, afsluitzin | 0 | 0 |  |

Ook rechtgezet, buiten de telling: de NL-korte beschrijving op de winkelpagina was 316 tekens (de pagina zei 237, Steam staat er 300 toe), de Engelse winkeltekst zei nog dat Tessa een frietwagen wil, dat Tammo twaalf jaar zwijgt en dat er 239 prestaties zijn (het zijn er 253), en de NL-tekst zei "Singleplayer" en "online co-op" (woordenlijst: Alleen spelen, Samen spelen). Twee prestatienamen waren Engels, waarvan één een echte tv-titel (constitution 2).

## Wat bewust blijft

- **Ingesproken regels** (gemarkeerd met "(ingesproken)" in `--kenmerk`): de tekst is de sleutel van de opname. Die
  zijn niet aangepast; een herschrijving vraagt een nieuwe opname.
- **Engelstalige toeristen** (rondvaart, taxi) praten expres Engels; de radioreclame "Goedkoop! Snel! Schoon!" is een
  parodie op schreeuwreclame; de korte droge zinnen van Tammo, Dijkstra en Jelle zijn hun stem (zie de dossiers).
- **Eigennamen in hoofdletters** (Café De Lallende Koe, Eigen Maaksel als automerk) zijn geen Title Case.
- **Scènetitels "Missie: deel"** in het verhaalscript (bron: de 09-scripts) zijn een gewone draaiboekvorm, geen tell.
- **De slogan "Ontdek jezelf in Grunn."** en de ondertitel "Twee afgestudeerden. Eén zomer. Nog geen plan." zijn een
  besluit van de eigenaar (21-11, VERHAAL-SYNOPSIS). Ze tellen in de scan wel mee (ai-woord, staccato-drietal): het zijn
  de twee herkenbaarste modelformules van het hele spel, en ze staan op de titelkaart, in de trailer en bovenaan de
  winkelpagina. Voorgelegd aan de eigenaar, niet zelf veranderd.

## Bronnen

- Wikipedia, [Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) (WP:AISIGNS) en het artikel [Signs of AI writing](https://en.wikipedia.org/wiki/Signs_of_AI_writing).
- MakeUseOf, [Wikipedia may have built the best AI writing detection guide](https://www.makeuseof.com/wikipedia-best-ai-writing-detection-guide/).
- Vizibly, [AI-tekst herkennen en herschrijven](https://vizibly.nl/ai-tekst-herkennen-en-herschrijven/).
- Welingelichte Kringen, [Zo herken je ChatGPT: deze woorden en zinnen verraden AI](https://www.welingelichtekringen.nl/tech/zo-herken-je-chatgpt-deze-woorden-en-zinnen-verraden-ai).
- Donna van de Ven, [Hoe herken je een tekst die geschreven is door ChatGPT?](https://donnavandeven.nl/blog/ai/herken-tekst-geschreven-door-chatgpt/).
- TE-learning, [Indicaties dat een paper is geschreven met behulp van een AI-toepassing](https://te-learning.nl/indicaties-dat-een-paper-is-geschreven-met-behulp-van-een-ai-toepassing/).
- Blogkracht, [Hoe herken je een AI-tekst?](https://www.blogkracht.nl/hoe-herken-je-een-ai-tekst/).
- Taaladvies.net, [Hoofdletters bij titels van boeken, liedjes, films](https://taaladvies.net/hoofdletters-bij-titels-van-boeken-liedjes-films-ed-algemeen/); Standaardnederlands.nl, [Wanneer schrijf je een hoofdletter](https://standaardnederlands.nl/uitleg/algemeen/spelling-en-schrijfregels/wanneer-schrijf-je-woorden-met-een-hoofdletter/).
- Destructoid, [Nearly 50 percent of all of last month's Steam releases admit to containing AI slop](https://www.destructoid.com/nearly-50-percent-steam-oct-26-admit-ai-slop/).
- GamesRadar, [After 25% positive Steam reviews, Soulslike dev realizes people hate AI slop](https://www.gamesradar.com/games/action/after-25-percent-positive-steam-reviews-soulslike-dev-realizes-people-hate-ai-slop-and-admits-if-it-looks-like-the-effort-is-not-there-that-is-a-fair-reading-of-what-is-on-screen/).
- Notebookcheck, [Steam Next Fest flooded with AI slop and low-effort demos](https://www.notebookcheck.net/Steam-Next-Fest-flooded-with-AI-slop-and-low-effort-demos-users-tell-Valve.1233436.0.html).
- Joost van Dreunen, [Steam's sloponomics](https://superjoost.substack.com/p/steams-sloponomics).
- Vice, [Steam Reviews Have a Serious AI Problem That Needs to Be Fixed](https://www.vice.com/en/article/steam-reviews-have-a-serious-ai-problem-that-needs-to-be-fixed/).
- VGKami, [What "AI Slop" Means in Video Games and How to Judge It](https://vgkami.com/how-to-understand-ai-slop-in-video-games-and-judge-the-claim/).
- Steam-winkelpagina's met een AI-disclosure en de stockfrasen "Immerse yourself" en "Embark on": [Where Winds Meet](https://store.steampowered.com/app/3564740/), The Seven Deadly Sins: Origin.
