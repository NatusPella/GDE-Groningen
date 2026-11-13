# Publicatiechecklist (#83, met #37, #62, #72, #57)

> **Naslag.** De regels staan in de canonieke spec [`.specs-fire/standards/publicatie.md`](../.specs-fire/standards/publicatie.md); dit document is uitleg en geschiedenis. Bij verschil wint de spec (en bij twijfel `AGENTS.md`).

Stand: 13 november 2026 (0.60.7; de laatste meting staat in §11). De repo is sinds 13-11-2026 **publiek** en de marketingpagina staat live; de punten hieronder zijn geschiedenis en de eigenaarsbesluiten die nog openstaan. Laatste run op 10 november: `publish_check --history` **4 FAIL** (historie-e-mail,
eigenaarsbesluit #62) en **16 WARN** (handmatige releaseworkflows), `secrets_scan` uit §7,
`merkenregister_check` 45 rijen en 0 afwijkingen, `text_audit` 0 bevindingen, `audio_herkomst`
**4139 clips allemaal gelogd**, `voice_coverage` 2664/2664. Alles in de kolom "Eigenaar" doet of beslist alleen de eigenaar
(AGENTS.md, constitution 8). Context: [PUBLICEREN.md](PUBLICEREN.md).

## 1. Automatische controle (agents mogen dit draaien)

```bash
node scripts/publish_check.mjs --history      # FAIL = oplossen, WARN = eigenaar beslist
node scripts/publish_check.mjs --json         # voor een bord- of issue-comment
node scripts/publish_check_test.mjs           # test van de check zelf
node scripts/text_audit.mjs                   # speltekst: merken, personen, winter, Engels
node scripts/secrets_scan.mjs                 # sleutelpatronen over werkboom en ALLE commits (±1 min)
node scripts/merkenregister_check.mjs         # merkenregister klopt met de code
node scripts/audio_herkomst.mjs               # elke stemclip gelogd met een Gemini-model; telling muziek en stemmen
```

De check scant getrackte bestanden op sleutels, e-mailadressen, thuispaden,
private-only bestandsnamen (nooit `.env` openen), groottes (WARN vanaf 10 MB, FAIL
vanaf 50 MB), verplichte licentie- en beleidsbestanden en workflows die zouden
publiceren. Optioneel: zet namen die nooit in de repo mogen staan in
`.publish-names.local` (één per regel; staat in `.gitignore`). Dit is een
patroonscan en vervangt `gitleaks detect` niet. `secrets_scan.mjs` leest elk
unieke bestand uit de hele geschiedenis één keer (zonder `.env` of sleutelbestanden te
openen) en meldt bestand, patroonnaam en blob, nooit de waarde.

## 2. Beslissingen en handelingen van de eigenaar

| # | Wat | Status |
|---|---|---|
| 1 | Auteursnaam in de historie: laten staan of `--mailmap` herschrijven (alleen met akkoord, eenmalig, vóór anderen klonen) | open |
| 2 | OSM-contactgegevens in `data/*_raw.json` (14 bestanden, zie `publish_check`): laten staan (ODbL, publiek) of tags eruit halen | open |
| 3 | Merkenregisters EUIPO, TMview, BOIP met de hand doorzoeken en invullen in [MERKENCHECK.md](MERKENCHECK.md) (~15 min) | open |
| 4 | Muziekproduct (Gemini-app/Lyria of API, abonnement) vastleggen: tabel in [LICENTIES.md](LICENTIES.md) §4.3 invullen | invultabel klaar |
| 5 | Festival "Noorderzon" (echt evenement): laten of vervangen door een verzonnen naam | open |
| 6 | Interne docs doorlezen op spoilers, plannen, kosten: `docs/3d-model-prompts.md`, `docs/verhaal/*`, memes-docs (102 bronlinks, geciteerd materiaal) | open |
| 7 | Webversie/CDN: three.js en lettertypen meevendoren of CDN laten staan (privacy, [PRIVACY-EN-CREDITS.md](PRIVACY-EN-CREDITS.md)) | open |
| 8 | Websitetekst, About en social preview goedkeuren: [SOCIAL-EN-WEBSITE.md](SOCIAL-EN-WEBSITE.md) | voorstel klaar |
| 9 | IARC-vragenlijst en Steam Content Survey zelf invullen: [IARC-ANTWOORDEN.md](IARC-ANTWOORDEN.md) | concept klaar |
| 10 | Velden van de eigenaar op één blad: [INVULBLAD-EIGENAAR.md](INVULBLAD-EIGENAAR.md) (GitHub-profiel, credits, muziekproduct, registers, nalezer) | blad klaar |
| 11 | Route naar 1.0: issue #65 (het plan zelf staat in `docs/archief/2026-10/PLAN-1.0.md`) | plan klaar |
| 12 | Actions-minuten: de 2000 gratis minuten van deze maand zijn op; platformbuilds (macOS/Linux/Android) pas na de maandelijkse reset of aankoop van extra minuten (Windows lokaal; de platformbijlagen van 0.60.1/0.60.2/0.60.3 staan nog op 0.60.0) | wacht op reset/aankoop |

## 3. Vlak voor Public (volgorde)

1. `git fetch`, schone werkboom op `main`, alle tests groen (coördinator).
2. `node scripts/publish_check.mjs --history` zonder FAIL.
3. `gitleaks detect` (niet geïnstalleerd) en `git log --all --format=%ae | sort -u` (alleen noreply).
4. Tags: `git ls-remote --tags origin` gelijk aan lokaal (geen oude, niet-herschreven commits).
5. README-disclaimer aanwezig (generiek, zonder namen van andere games); About-tekst en topics zonder merknamen van andere games.
6. **Pas dan** zichtbaarheid wijzigen (GitHub-instelling; geen script doet dit).

## 4. Instellingen direct na Public (alleen de eigenaar)

- [ ] Private vulnerability reporting aan (SECURITY.md verwijst ernaar)
- [ ] Secret scanning en push protection aan; Dependabot alerts en security updates aan (`.github/dependabot.yml` bestaat al: wekelijkse npm-check voor `/desktop`)
- [ ] Branch protection op `main`
- [ ] Actions: goedkeuring voor workflows van forks aan; `GITHUB_TOKEN` standaard alleen-lezen (`test.yml` heeft `contents: read`). De vier release-workflows vragen `contents: write`, maar hebben sinds #558 een owner-guard (`github.actor == github.repository_owner`) en het environment `release`: zet daar een verplichte beoordelaar (de eigenaar) op, en overweeg **immutable releases** aan te zetten. Playtesters horen pull-only te zijn; ook dat is een eigenaarsbesluit
- [ ] Social preview uploaden (zie voorstel), About en website-veld invullen
- [ ] Discussions/Wiki bewust aan of uit laten
- [ ] Pages pas na Public: de marketingpagina staat klaar in `website/` met een handmatige workflow (owner-guard, environment `github-pages`; zie `website/README.md`). De game-webversie hosten is een aparte beslissing (#57)

## 5. Bewust niet gedaan

Geen automatische workflow die publiceert, geen Pages-configuratie, geen zichtbaarheids-
wijziging, geen upload, geen post. SHA-256 staat sinds 25-10 in de release: `desktop/release.sh`
schrijft `SHA256SUMS.txt` voor de Windows-build en de wereld en uploadt dat naast de
bestanden (`scripts/release_hashes.mjs`). Opruimen van oude opslagsleutels is nog code-werk
voor later. Wel klaargezet op 13-11 (nog niets geactiveerd): de GitHub Pages-marketingpagina
in `website/` met een handmatige Pages-workflow die alleen de eigenaar kan starten, en
`docs/PERSKIT.md`.

## 6. Lokale controles van 24 oktober (versie 0.47.0, nog niets openbaar gemaakt)

- `node scripts/publish_check.mjs --history`: 0 FAIL, 14 WARN (alleen handmatige workflows met schrijfrechten, `workflow_dispatch`). Bij deze ronde zijn 17 FAIL weggehaald: hardgecodeerde thuispaden in scripts en docs (nu `USERPROFILE`, `LOCALAPPDATA` of `<home>`) en een vals alarm op `token: '...'` in een tegelaanroep (`withTiles`).
- `node scripts/secrets_scan.mjs`: werkboom en alle 4334 commits, 0 sleutelachtige treffers (de ene van deze ronde was het valse alarm hierboven). Geen `.env`, sleutel- of certificaatbestand ooit in de geschiedenis. gitleaks is niet geïnstalleerd: draai het alsnog vlak voor Public.
- Aanvullende historiescan (e-mailadressen, IP's, thuispaden, wachtwoordachtige toewijzingen; alleen soort en bestand): e-mail in de OSM-extracten `data/*_raw.json` en in `desktop/package-lock.json` (auteurs van npm-pakketten); een verwijderd script met een noreply-adres van een co-auteurregel; IP's alleen als testwaarden, SVG-getallen en de SSDP-groep; thuispaden van de eigenaar in 38 bestanden **in de geschiedenis** (in de werkboom nu weggehaald). Wachtwoorden: alleen de woorden in de scanregels en docs zelf.
- `node scripts/text_audit.mjs`: 0 bevindingen; `node scripts/merkenregister_check.mjs`: 45 rijen, 0 afwijkingen.
- Besluit voor de eigenaar: de thuispaden en OSM-contactgegevens staan in de geschiedenis. Openbaar maken zonder herschrijven laat ze zichtbaar; herschrijven mag alleen met akkoord (constitution 8).

## 7. Zevende ronde: 7 november 2026 (0.58.0, release-kandidaat)

Opnieuw gedraaid na de cutscene-/engine- en multiplayer-ronde, op main `4c2103f3`. Er is nog
steeds **niets** openbaar, geüpload of ingesteld.

- `node scripts/publish_check.mjs --history`: **4 FAIL, 16 WARN** (6439 getrackte bestanden).
  - De 4 FAIL zijn alle vier `historie-e-mail`: auteur-e-mailadressen in de git-historie die geen
    noreply-adres zijn. Besluit eigenaar (#62): laten staan of met een mailmap herschrijven.
  - De 16 WARN zijn de handmatige releaseworkflows (`workflow_dispatch`, schrijfrechten); ook een
    eigenaarsbesluit (§4).
  - Opgelost in deze ronde: negen thuispaden in `docs/archief/review-*` zijn geredigeerd naar
    `<repo>`/`<home>`, en de valse e-mailmelding op URL-userinfo (`app://game@evil.com/x` in
    `scripts/externurl_test.mjs`) is een uitzondering in `publish_check` geworden, met een test in
    `scripts/publish_check_test.mjs`.
- `node scripts/secrets_scan.mjs`: 0 treffers (werkboom en 5.583 commits, 20.435 tekstbestanden).
  `gitleaks detect` blijft de handmatige stap vlak vóór Public (niet geïnstalleerd).
- `node scripts/text_audit.mjs`: 0 bevindingen (141 toegestaan). `merkenregister_check`: 45 rijen,
  0 afwijkingen. `publish_check_test`: ok.
- **Nieuw open punt (#62):** `node scripts/audio_herkomst.mjs` meldt 3 stemclips zonder
  `tts.json`-regel: `voicelines/banter/h17-pass-eieren_2_t_645fd3.mp3`,
  `voicelines/lines/douwe/de_kraam_c3e579aa.mp3` en
  `voicelines/lines/tammo/nee_van_de_winter_ook_niet_alvas_db2498c4.mp3`. De clips staan wel in hun
  manifest; alleen de herkomstlog mist. Dat is werk voor de TTS-werkstroom en moet vóór Public klaar
  zijn, anders is de AI-herkomst niet compleet.
- De actuele volgorde en per-issue checklists staan in [1.0-TRACK.md](1.0-TRACK.md).

## 8. Achtste ronde: 9 november 2026 (0.60.1)

Opnieuw gedraaid op main `6e264d85` (release v0.60.1); er is nog steeds **niets** openbaar,
geüpload of ingesteld.

- `node scripts/publish_check.mjs --history`: **4 FAIL, 16 WARN** (7279 getrackte bestanden).
  De 4 FAIL zijn dezelfde historie-e-mail als in §7 (auteur-e-mails die geen noreply zijn;
  eigenaarsbesluit #62: laten staan of met een mailmap herschrijven). De 16 WARN zijn de
  handmatige releaseworkflows (`workflow_dispatch` met schrijfrechten; eigenaarsbesluit §4).
- `node scripts/text_audit.mjs`: **0 bevindingen** (145 toegestaan). `merkenregister_check`:
  45 rijen, 0 afwijkingen. `audio_herkomst`: **4139 stemmen en vaste clips, allemaal in een
  `tts.json`** — de drie ontbrekende herkomstregels uit §7 zijn gedicht. `voice_coverage`:
  **2664/2664** (Nieuw verhaal 1378/1378, 57 alleen tekst).
- **Actions-minuten (nieuw, eigenaar):** de 2000 gratis minuten van deze maand zijn op.
  `v0.60.0` kreeg nog alle vier de platformbijlagen; `v0.60.1` heeft alleen de lokaal gebouwde
  Windows-exe, `gde-world.tgz` en `SHA256SUMS.txt`. De macOS-, Linux- en Android-builds voor
  0.60.1 en verdere releases deze maand kunnen pas na de maandelijkse reset of na aankoop van
  extra minuten. Windows bouwt lokaal door; een Linux-build kan lokaal met
  `npm run release -- current --linux`. Zie [RELEASEN.md](RELEASEN.md) §Kosten.
- **Open en alleen de eigenaar:** de punten uit §2 (historie/mailmap, OSM-contactgegevens,
  merkenregisters, Noorderzon, interne docs, CDN, website, IARC, invulblad, 1.0-route) en de
  Actions-instellingen uit §4 (owner-guard, environment `release`, immutable releases,
  pull-only playtesters), de privacy-URL en het publicatiebesluit. Daar is niets van gedaan.

## 9. Negende ronde: 9 november 2026 (0.60.2)

Opnieuw gedraaid op main `a8623018` (release v0.60.2); er is nog steeds **niets** openbaar,
geüpload of ingesteld.

- `node scripts/publish_check.mjs --history`: **7 FAIL, 16 WARN** (7294 bestanden). Vier FAILs waren
  de bekende historie-e-mail (#62); drie waren thuispaden in `desktop/err2.txt` en `desktop/err3.txt`
  (Electron-logs, per ongeluk meegekomen in 762dac44). Die logbestanden zijn inmiddels uit de repo.
- `text_audit` 0 (145 toegestaan), `merkenregister` 45/0, `audio_herkomst` 4139 clips allemaal
  gelogd, `voice_coverage` 2664/2664.
- **Actions-minuten:** op; `v0.60.2` had alleen de lokaal gebouwde Windows-exe, `gde-world.tgz` en
  `SHA256SUMS.txt`; de platformbijlagen stonden nog op `v0.60.0`.

## 10. Tiende ronde: 10 november 2026 (0.60.3)

Opnieuw gedraaid op main `2a8cb42b` (release v0.60.3 van 9 november); er is nog steeds **niets**
openbaar, geüpload of ingesteld.

- `node scripts/publish_check.mjs --history`: **4 FAIL, 16 WARN** (7301 getrackte bestanden).
  De 4 FAIL zijn de bekende historie-e-mail (#62, eigenaarsbesluit). De 16 WARN zijn de handmatige
  releaseworkflows (§4). De drie thuispad-FAILs van de vorige ronde (`desktop/err2.txt`, `desktop/err3.txt`) zijn
  weg: die logbestanden staan niet meer in de repo.
- `node scripts/text_audit.mjs`: **0 bevindingen** (145 toegestaan). `merkenregister_check`:
  45 rijen, 0 afwijkingen. `audio_herkomst`: **4139 stemmen en vaste clips, allemaal in een
  `tts.json`**. `voice_coverage`: **2664/2664** (Nieuw verhaal 1378/1378, 57 alleen tekst).
- **Actions-minuten:** de 2000 gratis minuten van deze maand zijn op. `v0.60.3` heeft, net als
  0.60.1 en 0.60.2, alleen de lokaal gebouwde Windows-exe, `gde-world.tgz` en `SHA256SUMS.txt`; de
  platformbijlagen (macOS, Linux, Android) staan nog op `v0.60.0` en volgen voor 0.60.1/0.60.2/0.60.3
  pas na de maandelijkse reset of aankoop. Windows bouwt lokaal door; Linux kan desnoods lokaal met
  `npm run release -- current --linux`. Zie [RELEASEN.md](RELEASEN.md) §Kosten.
- **Index:** alle 71 documenten in `docs/` staan in [README.md](README.md); de nieuwe
  `INPUT-LATENTIE.md` en `HERKENNINGSPUNTEN.md` zijn opgenomen. `docs_index_test` is groen.
- **Open en alleen de eigenaar:** de punten uit §2 (historie/mailmap, OSM-contactgegevens,
  merkenregisters, Noorderzon, interne docs, CDN, website, IARC, invulblad, 1.0-route), de
  Actions-instellingen uit §4, de privacy-URL en het publicatiebesluit. Daar is niets van gedaan.

## 11. Elfde ronde: 13 november 2026 (0.60.7, voorbereiding Public)

Op verzoek van de eigenaar klaargezet voor een publieke repo; **er is nog niets openbaar
gemaakt, geactiveerd of gepost**.

- **README** herschreven voor de **openbare playtest** (geen Early Access; elke versie is een
  pre-release) met status, downloadrealiteit, feedbackroute en een pershoek; `docs/PERSKIT.md`
  toegevoegd; de marketingpagina staat klaar in `website/` (handmatige Pages-workflow, nog niet
  geactiveerd). De feitencheck van de README is verwerkt (stemmen, live bussen, foutrapport,
  toegankelijkheid, browsertoetsen, gebouwenaantallen, buildinstructies en releasebijlagen).
- **Merken:** disclaimer in README, NOTICE.md, `game/js/credits.js` en de docs is generiek en
  noemt geen andere games of uitgevers meer; allowlist van `text_audit` opgeschoond; 59 van de
  87 GitHub-releasenotes opgeschoond (back-up in `%TEMP%`); CHANGELOG-historie, codecomments,
  specs/ADR's en `desktop/release.sh` (footer) aangepast. **Blijven:** de `gte-*`-opslagsleutels,
  de `GTE_*`-envvariabelen, `LEGACY_NAME 'GTE VI'` en de audit-blacklist (anders breken saves).
  **Blijven ook:** `docs/ONDERZOEK-REFERENTIEGAMES.md` (onderzoek met bronnen) en
  `docs/archief/` (expliciete historie) — eigenaarsbesluit of die ook weg moeten.
- **Checks (13-11):** `publish_check --history` **0 FAIL** en **20 WARN** (handmatige
  releaseworkflows) nadat de historie-auteursadressen met een mailmap naar het
  noreply-adres zijn herschreven; `secrets_scan` **0 treffers** over werkboom en 6.004
  commits; `gitleaks 8.30.1` gaf 18 heuristische meldingen die alle vier vals-positief
  bleken (API-naam in `steam/achievements.json`, opslagsleutel-constanten in
  `scripts/loopbaan_test.mjs` en `game/js/placeshot.js`), vastgelegd in `.gitleaksignore`
  — een herrun geeft 0 meldingen. `text_audit` **0** (142 toegestaan),
  `merkenregister_check` 45/0, `spec_check` 0 fouten, `docs_index_test`,
  `docs_taal_test`, `logo_taal_test`, `over_menu_test`, `credits_test` en
  `storage_migration_test` groen.
- **Nog te doen (eigenaar):** besluit over de historie-adressen (#62, lokaal al
  opgeschoond), de force push van de herschreven geschiedenis, issues/comments met de
  oude namen (#72/#62/#83 bijwerken of laten), social preview uploaden, repo publiek
  maken (#37), daarna Pages activeren en de marketingpagina controleren.

