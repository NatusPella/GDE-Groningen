# Publicatiechecklist (#83, met #37, #62, #72, #57)

Stand: 19 oktober 2026. De repo is **privé**; niets hieronder is gedaan of
aangezet. Alles in de kolom "Eigenaar" doet of beslist alleen de eigenaar
(AGENTS.md, constitution 8). Context: [PUBLICEREN.md](PUBLICEREN.md).

## 1. Automatische controle (agents mogen dit draaien)

```bash
node scripts/publish_check.mjs --history      # FAIL = oplossen, WARN = eigenaar beslist
node scripts/publish_check.mjs --json         # voor een bord- of issue-comment
node scripts/publish_check_test.mjs           # test van de check zelf
node scripts/text_audit.mjs                   # speltekst: merken, personen, winter, Engels
```

De check scant getrackte bestanden op sleutels, e-mailadressen, thuispaden,
private-only bestandsnamen (nooit `.env` openen), groottes (WARN vanaf 10 MB, FAIL
vanaf 50 MB), verplichte licentie- en beleidsbestanden en workflows die zouden
publiceren. Optioneel: zet namen die nooit in de repo mogen staan in
`.publish-names.local` (één per regel; staat in `.gitignore`). Dit is een
patroonscan en vervangt `gitleaks detect` niet.

## 2. Beslissingen en handelingen van de eigenaar

| # | Wat | Status |
|---|---|---|
| 1 | Auteursnaam in de historie: laten staan of `--mailmap` herschrijven (alleen met akkoord, eenmalig, vóór anderen klonen) | open |
| 2 | OSM-contactgegevens in `data/*_raw.json` (14 bestanden, zie `publish_check`): laten staan (ODbL, publiek) of tags eruit halen | open |
| 3 | Merkenregisters EUIPO, TMview, BOIP met de hand doorzoeken en invullen in [MERKENCHECK.md](MERKENCHECK.md) (~15 min) | open |
| 4 | Muziekproduct (Gemini-app/Lyria of API, abonnement) vastleggen: tabel in [LICENTIES.md](LICENTIES.md) §4.3 invullen | invultabel klaar |
| 5 | Festival "Noorderzon" (echt evenement): laten of vervangen door een verzonnen naam | open |
| 6 | Interne docs doorlezen op spoilers, plannen, kosten: `docs/3d-model-prompts.md`, `docs/verhaal/*`, `docs/verhaal-voorstel.md`, memes-docs (102 bronlinks, geciteerd materiaal) | open |
| 7 | Webversie/CDN: three.js en lettertypen meevendoren of CDN laten staan (privacy, [PRIVACY-EN-CREDITS.md](PRIVACY-EN-CREDITS.md)) | open |
| 8 | Websitetekst, About en social preview goedkeuren: [SOCIAL-EN-WEBSITE.md](SOCIAL-EN-WEBSITE.md) | voorstel klaar |
| 9 | IARC-vragenlijst en Steam Content Survey zelf invullen: [IARC-ANTWOORDEN.md](IARC-ANTWOORDEN.md) | concept klaar |
| 10 | Velden van de eigenaar op één blad: [INVULBLAD-EIGENAAR.md](INVULBLAD-EIGENAAR.md) (GitHub-profiel, credits, muziekproduct, registers, nalezer) | blad klaar |
| 11 | Route naar 1.0: [PLAN-1.0.md](PLAN-1.0.md) | plan klaar |

## 3. Vlak voor Public (volgorde)

1. `git fetch`, schone werkboom op `main`, alle tests groen (coördinator).
2. `node scripts/publish_check.mjs --history` zonder FAIL.
3. `gitleaks detect` (niet geïnstalleerd) en `git log --all --format=%ae | sort -u` (alleen noreply).
4. Tags: `git ls-remote --tags origin` gelijk aan lokaal (geen oude, niet-herschreven commits).
5. README-disclaimer aanwezig; About-tekst en topics zonder merknamen van andere games.
6. **Pas dan** zichtbaarheid wijzigen (GitHub-instelling; geen script doet dit).

## 4. Instellingen direct na Public (alleen de eigenaar)

- [ ] Private vulnerability reporting aan (SECURITY.md verwijst ernaar)
- [ ] Secret scanning en push protection aan; Dependabot alerts en security updates aan (`.github/dependabot.yml` bestaat al: wekelijkse npm-check voor `/desktop`)
- [ ] Branch protection op `main`
- [ ] Actions: goedkeuring voor workflows van forks aan; `GITHUB_TOKEN` standaard alleen-lezen (`test.yml` heeft `contents: read`)
- [ ] Social preview uploaden (zie voorstel), About en website-veld invullen
- [ ] Discussions/Wiki bewust aan of uit laten
- [ ] Pages **niet** aanzetten zonder aparte beslissing over de webversie (#57)

## 5. Bewust niet gedaan

Geen workflow die publiceert, geen Pages-configuratie, geen zichtbaarheids-
wijziging, geen upload, geen post. SHA-256 in de releasenotes
(`desktop/release.sh`) en opruimen van oude opslagsleutels zijn code-werk voor later.
