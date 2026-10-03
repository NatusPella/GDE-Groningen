# Checklist: de repo publiek maken

Voor rond 1.0. Alles hieronder is een voorstel: de eigenaar vinkt af en
voert uit. Niets hiervan is al gedaan. Achtergrond in
[LICENTIES.md](LICENTIES.md).

Volgorde: eerst opruimen en de historie herschrijven (stap 1-4), dan pas
pushen en de zichtbaarheid wijzigen (stap 7). Een herschreven historie
verandert alle commit-hashes; doe het één keer, vóór iemand anders kloont.

## 1. Secrets

Gecontroleerd op 3 okt 2026 (alle 547 commits, alle branches):

- [x] Geen API-sleutels in de historie. Gezocht op OpenRouter
      (`sk-or-v1-…`), Google (`AIza…`), Anthropic (`sk-ant-…`), GitHub
      (`ghp_…`, `github_pat_…`), Slack-tokens en private keys. Niets.
- [x] Nooit een `.env`, `.pem`, `.key` of `*secret*`-bestand toegevoegd.
- [x] `scripts/gemini_tts.py` leest `OPENROUTER_API_KEY` uit `.env`;
      `.gitignore` sluit `.env` en `.env.*` uit.
- [ ] Vlak vóór publicatie nog een keer scannen met een echte tool, bijv.:
      `gitleaks detect --source . --log-opts="--all"` of
      `trufflehog git file://. --only-verified`.
- [ ] Voor de zekerheid de OpenRouter-sleutel roteren (die heeft lokaal en
      in sessies rondgegaan).
- [ ] Controleren dat `.claude/` (lokale agent-instellingen en
      worktrees) niet getrackt is: `git ls-files .claude` moet leeg zijn
      (nu: leeg). Eventueel `.claude/` aan `.gitignore` toevoegen.

## 2. Auteur-e-mail vervangen in de historie

Nu: 545 commits met `5644798+NatusPella@users.noreply.github.com` (werkadres), 3 met
`5644798+NatusPella@users.noreply.github.com`. Doel: alles op het
noreply-adres. Het werkadres staat verder nergens in de bestanden of in
commitberichten (gecontroleerd).

**Niet uitgevoerd.** Procedure met
[git filter-repo](https://github.com/newren/git-filter-repo):

```bash
# 0. alle branches die bewaard moeten blijven eerst mergen of lokaal hebben;
#    worktrees opruimen (git worktree list / git worktree remove …)
# 1. verse, losse kloon als werkkopie (filter-repo wil dat)
git clone --no-local /pad/naar/grand-theft-eierbal-vi /tmp/gte-rewrite
cd /tmp/gte-rewrite

# 2. mailmap: <nieuw> <oud>
cat > ../mailmap.txt <<'EOF'
NatusPella <5644798+NatusPella@users.noreply.github.com> <5644798+NatusPella@users.noreply.github.com>
EOF

# 3. herschrijven (author én committer)
git filter-repo --mailmap ../mailmap.txt

# 4. controleren
git log --all --format='%ae %ce' | sort | uniq -c   # alleen noreply
git log --all --format='%B' | grep -i iwink          # leeg

# 5. desgewenst tegelijk de Esri-foto uit de historie halen (stap 3):
git filter-repo --invert-paths --path data/satellite_reference.jpg
```

Daarna:

- [ ] `git config user.email 5644798+NatusPella@users.noreply.github.com`
      in deze repo (en globaal of per map, zodat nieuwe commits goed gaan).
- [ ] De herschreven kloon wordt de nieuwe bron: remote `origin` opnieuw
      instellen (filter-repo verwijdert die) en **force-pushen** naar
      GitHub. Oude kloons, worktrees en open branches daarna weggooien en
      opnieuw klonen; anders komt de oude historie terug bij een merge.
- [ ] GitHub bewaart oude commits nog een tijd (via oude PR's, forks en
      caches). Als het werkadres echt weg moet: na de force-push GitHub
      Support vragen om cached views/oude refs te verwijderen.
- [ ] Release-tags (`v0.x.y`) worden mee herschreven; bestaande GitHub
      Releases wijzen dan naar oude commits. Releases opnieuw koppelen of
      verwijderen en opnieuw maken.
- [ ] `desktop/package.json` noemt `"author": "NatusPella"` en
      `copyright: © 2026 NatusPella`: bewust zo laten of aanpassen.

## 3. Bestanden die niet publiek mogen of horen

- [ ] **`data/satellite_reference.jpg`** (6,4 MB, Esri World Imagery-
      export): mag niet herverspreid worden. Verwijderen uit de repo **en**
      de historie (zie stap 2.5). `scripts/extract_palette.py` documenteert
      hoe je hem opnieuw exporteert; de afgeleide kleuren in de code mogen
      blijven.
- [ ] Interne documenten doorlezen (`docs/`): ze zijn in principe
      publiceerbaar, maar bevatten plannen, prompts en kosten:
  - `docs/3d-model-prompts.md` (Claude Design-prompts, creditverbruik);
  - `docs/verhaal/*` en `docs/verhaal-voorstel.md` (spoilers; ok of in
    een aparte map "ontwerp");
  - `docs/groningen-memes*.md` (onderzoek naar memes: controleer op
    namen van echte personen en geciteerd materiaal van derden);

    regel is goed bedoeld, maar overweeg die regel neutraler te maken);
  - `ARCHITECTURE.md`, `DESIGN_SYSTEM.md` (vermelden "GTA-style" en "GTA
    poster": prima intern, maar lees ze met het oog op §6 van LICENTIES).
- [ ] Commitberichten met bedragen of kosten (bijv. "$0.04 spent"): geen
      probleem, wel bewust van zijn.
- [ ] `docs/LICENTIES.md` en deze checklist: houden of naar een wiki.

## 4. Grote bestanden

Packgrootte nu ~236 MB, werkboom: `game/audio` 152 MB, `data/` 54 MB.
Geen grote bestanden die al verwijderd zijn maar nog in de historie
zitten. Grootste blobs:

| MB | Bestand |
|---:|---|
| 32,5 | `data/groningen_raw.json` (Overpass-cache, kan weg of gz) |
| 11,2 | `game/citymap.json` (meerdere versies in de historie) |
| 6,4 | `data/satellite_reference.jpg` (moet weg, zie 3) |
| 2,9-4,2 | 14 G-Music-mp3's, 2 scenario-mp3's, titelnummer |
| 3,0 | `data/ommeland_raw.json.gz` |
| — | ~3.400 kleine voiceline-wav's (samen het grootste deel van 152 MB) |

GitHub weigert bestanden > 100 MB en waarschuwt boven 50 MB: niets
hiervan komt erboven. Opties (keuze eigenaar):

- [ ] Zo laten (eenvoudig, repo wordt ~250 MB bij klonen).
- [ ] `data/*_raw.json` niet meer committen (regenereerbaar met de
      scripts; de ODbL eist dat de manier om de data te maken beschikbaar
      is, en dat zijn de scripts).
- [ ] Audio naar Git LFS (let op: LFS-opslag en bandbreedte zijn beperkt
      op een gratis account; GitHub Pages serveert geen LFS-bestanden).
- [ ] Wav-clips naar ogg/opus omzetten (veel kleiner; aparte klus).

## 5. Licentie en vermeldingen

- [ ] Licentie kiezen (LICENTIES.md §7) en `LICENSE` toevoegen.
- [x] `NOTICE.md` en `licenses/` (three.js MIT, Bebas Neue OFL).
- [x] Disclaimer en OSM-vermelding in README en in het spel.
- [ ] Naam en logo omzetten naar "GDE Groningen – Zomer vol misdaad"
      (LICENTIES.md §8.2) vóór de repo publiek gaat, zodat de publieke
      historie niet begint met een GTA-achtige naam? (De oude naam blijft
      in de historie staan; dat is te accepteren.)

## 6. GitHub-instellingen (later)

- [ ] **Dependabot**: alerts en security updates aanzetten (Settings →
      Code security). Er zijn alleen devDependencies in `desktop/`
      (electron, electron-builder); dependabot.yml met
      `package-ecosystem: npm`, `directory: /desktop`, wekelijks.
      Electron-updates zijn belangrijk (Chromium-beveiligingsfixes).
- [ ] **Secret scanning** en **push protection** aanzetten (gratis voor
      publieke repo's).
- [ ] **Branch protection** op `main`: geen force-push na de eenmalige
      herschrijving; eventueel PR verplicht.
- [ ] **Actions**: nu niet in gebruik (releases worden lokaal gebouwd).
      Als je ze aanzet: Settings → Actions → "Allow only actions created
      by GitHub" of een allowlist; `GITHUB_TOKEN` standaard alleen-lezen;
      geen secrets nodig voor een Pages-build.
- [ ] **GitHub Pages** (browserversie): bron "GitHub Actions" met een
      workflow die `game/` publiceert. Advies: three.js en Bebas Neue mee
      vendoren (zoals `desktop/build.mjs`), zodat de pagina geen CDN's
      gebruikt (privacy, zie LICENTIES.md §5). Let op de grootte: Pages-
      sites mogen max. 1 GB zijn, ~150 MB audio past.
- [ ] Issues/Discussions aan of uit; `SECURITY.md` en een korte
      `CONTRIBUTING.md` (bijdragen onder dezelfde licentie).
- [ ] Repo-beschrijving en topics zonder "GTA" (merk), bijv. "Groningen
      open-world parody game, three.js".
- [ ] Releases: de unsigned-builds-tekst staat al in de release notes;
      SHA-256 van de downloads erbij zetten.
- [x] Linux-build (AppImage en tar.gz, voor de Steam Deck): optioneel met
      `npm run release -- <bump> --linux`; staat dan ook in de release
      notes, met dezelfde "niet ondertekend"-waarschuwing.
- [ ] De webzip (`--web`) wordt alleen lokaal gemaakt. Waar hij komt
      (itch.io of GitHub Pages) is nog niet besloten; tot dan uploadt het
      releasescript hem nergens heen.
- [ ] Steam: `steam/` heeft de SteamPipe-sjablonen en een kopieerscript
      (zie `steam/README.md`). Pas na de keuze voor Steam en met een app-id;
      gebruik voor `steamcmd` een apart Steam-account met alleen
      buildrechten.

## 7. Publiceren

- [ ] Stap 1-6 afgevinkt.
- [ ] Laatste controle: `git log --all --format='%ae' | sort -u`,
      gitleaks, en de README-disclaimer.
- [ ] Zichtbaarheid naar Public (Settings → General → Danger zone).
