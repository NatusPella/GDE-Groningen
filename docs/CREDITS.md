# Credits: iedereen die meehielp, op volgorde van bijdrage

> **Voorstel, 13 november 2026.** De eigenaar wil credits voor iedereen die
> meehielp en niemand vergeten. Deze pagina legt vast wie er in de credits
> staat, hoe de volgorde is bepaald en wat de bron van die inschatting is.
> De regels staan in [.specs-fire/standards/publicatie.md](../.specs-fire/standards/publicatie.md)
> en `AGENTS.md` (constitution 4: op de eigenaar na geen echte namen; gebruik
> GitHub-handles of een rolnaam). De eigenaar controleert en vult aan.
>
> **AI is geen credit.** AI-assistenten (Claude, OpenHands, chat1/agent,
> DeepSeek V4.1 Flash via DeepSeek Harness, Google Gemini voor stemmen en
> muziek, Claude Design voor het Martinitoren-model) staan onderaan bij de
> tech-stack, niet in de creditslijst. Dat is het besluit van de eigenaar
> (13-11-2026).

## Waarom deze volgorde

Niemand wordt overgeslagen, maar de credits zetten bovenaan wie het meest
bijdroeg. De volgorde is gebaseerd op **zichtbaar bewijs in de repo**:

- **commits** (auteur en `Co-authored-by`-trailers in de git-geschiedenis);
- **issues, comments en pull requests** per GitHub-account;
- **toegang**: iedereen die als collaborator toegang had, staat erin, ook als
  er geen enkele commit of issue van die persoon zichtbaar is;
- **bronnen en hulpmiddelen** waarvan de vermelding verplicht of netjes is.

Dat is een eerlijke maar geen exacte maatstaf: iemand die alleen lokaal heeft
meegespeeld zonder issue of commit is niet in die cijfers te zien. Daarom
staan alle negen mensen met toegang er ook bij, met de aantekening dat hun
bijdrage niet in de repo zichtbaar is. Laat het weten als je er niet in wilt,
dan halen we je eruit.

## De credits, van groot naar klein (mensen)

| # | Wie | Rol | Bewijs / effort |
|---|---|---|---|
| 1 | **NatusPella** | maker: idee, verhaal, regie, code, alles daartussen | 5.964 commits; eigenaar en schrijver van het verhaal |
| 2 | **astnagrath** | tester en meedenker | 23 issues en 12 comments |
| 3 | **pixel-maus** | tester en meedenker | 5 issues |
| 4 | **alexkramer98** | tester en meedenker | 1 issue en 1 pull request |
| 5 | **Teungritter** | tester en meedenker | 1 issue |
| 6 | **MathijsG** | had toegang tot de repo en hielp als tester | collaborator; geen commit of issue zichtbaar |
| 7 | **ArmEagle** | had toegang tot de repo en hielp als tester | collaborator; geen commit of issue zichtbaar |
| 8 | **wisskid** | had toegang tot de repo en hielp als tester | collaborator; geen commit of issue zichtbaar |
| 9 | **Agnilor** | had toegang tot de repo en hielp als tester | collaborator; geen commit of issue zichtbaar |
| 10 | **jonathanbuist** | had toegang tot de repo en hielp als tester | collaborator; geen commit of issue zichtbaar |
| 11 | **de playtesters** | alle spelers die builds uitprobeerden en feedback gaven | anonieme testrondes, zonder namen in de repo |

## Tech-stack en AI (vermelding, geen credits)

| Wie/wat | Rol | Waarom hier |
|---|---|---|
| **Claude (Sonnet 5.5 en Opus 5.5)** | code, tests, review en documentatie | AI-assistent; 3.408 commits met `Co-authored-by: Claude…` |
| **OpenHands** | code, tests en reviewrondes | AI-agent; 14 eigen commits + 19 co-auteurschappen |
| **chat1 en agent** | test- en meetrondes | AI-hulpen; 15 + 7 commits |
| **DeepSeek V4.1 Flash via DeepSeek Harness** | deze opschoon- en publicatieronde | AI-assistent van 13-11-2026 |
| **Google Gemini** | stemmen en muziek | AI-generatie; herkomst staat in [LICENTIES.md](LICENTIES.md) |
| **Claude Design** | het Martinitoren-model | model gemaakt met AI-hulp |
| **OpenStreetMap, 3DBAG, AHN, Kadaster/CBS, three.js, Electron, Freesound, lettertypen** | kaartdata, software en geluid | zie [NOTICE.md](../NOTICE.md) en [LICENTIES.md](LICENTIES.md) |

De in-game credits (Over, en na de aftiteling) gebruiken dezelfde splitsing:
**Met dank aan** (de mensen, 1–11) en **Software en lettertypes** (de
tech-stack, met de AI-assistenten als vermelding).

## Wat er in de code staat

- `game/js/credits.js` bevat de lijst `CONTRIBUTORS` (mensen), de lijst
  `AI_ASSISTENTS` (tech-stack, geen credits) en de sectie **Met dank aan** in
  `CREDITS_HTML`; de aftiteling gebruikt `THIRD_PARTY_CARDS`.
- De volgorde in de code is dezelfde als de tabel hierboven.
- Echte namen van anderen dan de eigenaar komen er niet in; GitHub-handles en
  rolnamen wel. De eigenaar staat als **NatusPella**.
- `scripts/credits_test.mjs` bewaakt dat de lijst niet leeg is, dat alle
  namen uit deze pagina in de code staan en dat er geen merknamen van andere
  games in de credits sluipen.

## Nog te doen door de eigenaar

- [ ] De volgorde en de rolomschrijvingen goedkeuren of aanpassen.
- [ ] Bepalen of de vijf mensen zonder zichtbare commits in de credits mogen
      blijven staan; zo niet, dan halen we ze eruit.
- [ ] Aanvullen wie er nog meer meehielp en nu niet in deze tabel staat.
- [ ] De tech-stackregel (Claude, OpenHands, chat1/agent, DeepSeek, Gemini,
      Claude Design) goedkeuren; AI staat bewust niet bij de credits.
