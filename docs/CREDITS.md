# Credits: iedereen die meehielp, op volgorde van bijdrage

> **Voorstel, 13 november 2026.** De eigenaar wil credits voor iedereen die
> meehielp en niemand vergeten. Deze pagina legt vast wie er in de credits
> staat, hoe de volgorde is bepaald en wat de bron van die inschatting is.
> De regels staan in [.specs-fire/standards/publicatie.md](../.specs-fire/standards/publicatie.md)
> en `AGENTS.md` (constitution 4: op de eigenaar na geen echte namen; gebruik
> GitHub-handles of een rolnaam). De eigenaar controleert en vult aan.

## Waarom deze volgorde

Niemand wordt overgeslagen, maar de credits zetten bovenaan wie het meest
bijdroeg. De volgorde is gebaseerd op **zichtbaar bewijs in de repo**:

- **commits** (auteur en `Co-authored-by`-trailers in de git-geschiedenis);
- **issues, comments en pull requests** per GitHub-account;
- **AI-hulp** die in de commits of documentatie als zodoende staat vermeld;
- **bronnen en hulpmiddelen** waarvan de vermelding verplicht of netjes is.

Dat is een eerlijke maar geen exacte maatstaf: iemand die alleen lokaal heeft
meegespeeld zonder issue of commit is niet in die cijfers te zien. Daarom staan
de namen die wel als collaborator bekend zijn er ook bij, met de aantekening
dat hun bijdrage niet in de repo zichtbaar is. Laat het weten als je er niet
in wilt, dan halen we je eruit.

## De credits, van groot naar klein

| # | Wie | Rol | Bewijs / effort |
|---|---|---|---|
| 1 | **NatusPella** | maker: idee, verhaal, regie, code, alles daartussen | 5.964 commits; eigenaar en schrijver van het verhaal |
| 2 | **Claude (Sonnet 5.5 en Opus 5.5)** | AI-copiloot: code, tests, review en documentatie | 3.408 commits met `Co-authored-by: Claude…` (2.525 Sonnet 5.5, 850 Opus 5.5, 33 Sonnet 5) |
| 3 | **OpenHands** | AI-agent: code, tests en reviewrondes | 14 eigen commits + 19 co-auteurschappen |
| 4 | **chat1 en agent** | AI-hulpen: test- en meetrondes | 15 + 7 commits |
| 5 | **astnagrath** | tester en meedenker | 23 issues en 12 comments |
| 6 | **pixel-maus** | tester en meedenker | 5 issues |
| 7 | **alexkramer98** | tester en meedenker | 1 issue en 1 pull request |
| 8 | **Teungritter** | tester en meedenker | 1 issue |
| 9 | **MathijsG, ArmEagle, wisskid, Agnilor, jonathanbuist** | vrienden en testers van het project | als collaborator bekend; bijdrage niet zichtbaar in de repo (laat het weten als je meespeelde of eruit wilt) |
| 10 | **de playtesters** | alle spelers die builds uitprobeerden en feedback gaven | anonieme testrondes, zonder namen in de repo |
| 11 | **Google Gemini** | muziek en alle stemmen | 4.139 audioclips, 2.664 ingesproken stemregels |
| 12 | **Claude Design** | het Martinitoren-model | in `NOTICE.md` en de aftiteling |
| — | **OpenStreetMap, 3DBAG, AHN, Kadaster/CBS, three.js, Electron, Freesound, lettertypen** | kaartdata, software en geluid | zie [NOTICE.md](../NOTICE.md) en [LICENSIES.md](LICENTIES.md) |

De in-game credits (Over, en na de aftiteling) gebruiken dezelfde volgorde in
twee lagen: **Met dank aan** (1–10) en **Kaart / Muziek en stemmen / Software**
(11–12 en de bronnen hierboven).

## Wat er in de code staat

- `game/js/credits.js` bevat de lijst `CONTRIBUTORS` en de sectie **Met dank
  aan** in `CREDITS_HTML`; de aftiteling gebruikt `THIRD_PARTY_CARDS`.
- De volgorde in de code is dezelfde als de tabel hierboven.
- Echte namen van anderen dan de eigenaar komen er niet in; GitHub-handles en
  rolnamen wel. De eigenaar staat als **NatusPella**.
- `scripts/credits_test.mjs` bewaakt dat de lijst niet leeg is, dat alle
  namen uit deze pagina in de code staan en dat er geen merknamen van andere
  games in de credits sluipen.

## Nog te doen door de eigenaar

- [ ] De volgorde en de rolomschrijvingen goedkeuren of aanpassen.
- [ ] Bepalen of de namen van de vijf "vrienden en testers" (regel 9) in de
      credits mogen blijven staan; zo niet, dan halen we ze eruit.
- [ ] Aanvullen wie er nog meer meehielp en nu niet in deze tabel staat.
- [ ] De AI-modellen precies zo noemen als je wilt (Claude-versies, OpenHands,
      chat1/agent); nu staat het zoals het in de commits en docs staat.
