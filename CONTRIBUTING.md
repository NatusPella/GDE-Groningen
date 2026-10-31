# Meedoen aan GDE Groningen

Leuk dat je wilt helpen! Bugs melden, ideeën, verbeteringen aan de code,
de kaart of de teksten: alles is welkom. Dit is een hobbyproject, dus een
antwoord kan even duren.

## Een bug of idee melden

Open een [issue](../../issues/new/choose) en kies het sjabloon voor een bug
of een idee. Bij een bug helpen vooral: de versie (zie het startscherm),
je systeem (macOS, Windows, Linux of browser), wat je deed en wat er
gebeurde. Het foutrapport uit het spel (**Instellingen › Foutrapport ›
Kopiëren**) is goud waard; het bevat geen persoonlijke gegevens.

Een beveiligingsprobleem? Meld dat **niet** in een issue, maar volg
[SECURITY.md](SECURITY.md).

## Aan de slag

```bash
git clone https://github.com/NatusPella/GDE-Groningen.git
cd GDE-Groningen
python3 scripts/devserver.py 8765 game     # open http://localhost:8765
```

De desktopapp: `cd desktop && npm install && npm start`. Meer (builds, de
webversie, meetscripts, de kaart opnieuw bouwen) staat in
[docs/ONTWIKKELEN.md](docs/ONTWIKKELEN.md); hoe de code in elkaar zit in
[ARCHITECTURE.md](ARCHITECTURE.md).

Handige schakelaars: `?dev` opent met F9 een paneel om naar elke
verhaalstap te springen, zonder je echte save aan te raken.

## Tests

Gewone Node.js-scripts, zonder testframework:

```bash
node scripts/save_migration_test.mjs      # oude saves blijven laden
node scripts/storage_migration_test.mjs   # opslagsleutels en de userData-map
node scripts/voice_coverage.mjs --quiet   # elke ondertitel heeft een opname
cd desktop && npm run stage && cd ..      # eenmalig, voor de 3D-tests
for t in scripts/*_test.mjs; do node "$t" || echo "FAIL $t"; done
```

Draai `node --check` op JavaScript dat je aanpast.

## Afspraken

- **Codestijl**: sluit aan bij de code eromheen. Gewone ES-modules, geen
  bundler, geen nieuwe npm-pakketten in het spel. Commentaar alleen waar
  het iets uitlegt wat de code zelf niet zegt.
- **Taal**: alles wat een speler ziet of hoort is Nederlands; de stemmen
  spreken Gronings (de gesproken spelling staat in
  `scripts/gronings_spoken.json`). Code, commentaar en commitberichten mogen
  Engels.
- **Geen echte merken, bedrijven of personen.** Verzin een eigen naam
  (zoals Kiekdoar, Radio Proat of de Fjord Escapade). Echte straten en
  openbare gebouwen als decor mogen wel. Zie
  [docs/LICENTIES.md](docs/LICENTIES.md) §6.
- **Saves blijven werken.** Verander je wat er in een save staat, voeg dan
  een migratie toe in `game/js/savemigrate.js` en een fixture in
  `scripts/fixtures/saves/`. Nieuwe opslagsleutels komen in
  `game/js/storagekeys.js`.
- **Nieuwe gesproken tekst** heeft een opname nodig; zeg in je pull request
  als die er nog niet is, dan regelen we dat.
- **Kaartdata** komt uit OpenStreetMap (ODbL). Verbeter liever OSM zelf en
  bouw de kaart opnieuw dan de JSON met de hand aan te passen.

## Pull requests

Maak een branch, houd de wijziging klein en gericht, en beschrijf wat je
veranderde en hoe je het testte (het sjabloon helpt daarbij).

### Licentie van je bijdrage

Je houdt het auteursrecht op je bijdrage. Door een bijdrage in te sturen:

1. geef je haar vrij onder de licenties van het project: code onder de
   **GPL-3.0-or-later** ([LICENSE](LICENSE)), inhoud (teksten, audio,
   beelden, modellen) onder **CC BY-NC-SA 4.0**
   ([LICENSE-CONTENT.md](LICENSE-CONTENT.md));
2. geef je **NatusPella** daarnaast een wereldwijde, eeuwigdurende,
   onherroepelijke, niet-exclusieve en kosteloze licentie om je bijdrage te
   gebruiken, aan te passen, te verspreiden, onder een andere licentie uit
   te brengen en te verkopen, **ook commercieel** (bijvoorbeeld in een
   betaalde Steam-versie), en om die rechten door te geven;
3. verklaar je dat je dat mag: het is je eigen werk, of je hebt het recht
   om het zo in te sturen, zoals beschreven in het
   [Developer Certificate of Origin 1.1](https://developercertificate.org/).

Bevestig dit met een regel `Signed-off-by: Naam <e-mail>` onder elke
commit; `git commit -s` zet hem er vanzelf onder. Een vaste bijnaam en het
noreply-adres van GitHub zijn prima. Pull requests zonder die regel nemen
we niet over.

De naam GDE en het logo vallen niet onder de licenties van het project.

We houden ons aan de [gedragscode](CODE_OF_CONDUCT.md).

## Vóór je een bijdrage indient: wat niet mag

- **Geen echte merken, bedrijven of personen** in speltekst of beeld; verzin ze
  (register: [docs/MERKENREGISTER.md](docs/MERKENREGISTER.md)). Echte plaatsen en gebouwen mogen.
- **Geen geheimen of persoonsgegevens** in commits: geen sleutels, `.env`, thuispaden
  of e-mailadressen. Controleer met `node scripts/publish_check.mjs`, of zet de
  git-haak aan met `node scripts/install_hooks.mjs`: die weigert een commit waarin
  `scripts/secrets_scan.mjs` een sleutel vindt.
- **Geen auteursrechtelijk materiaal van derden** (muziek, beeld, lettertypen, modellen)
  zonder vermelding van licentie in [NOTICE.md](NOTICE.md) en `licenses/`.
- **Alleen Nederlands** in alles wat een speler ziet of hoort (`node scripts/text_audit.mjs`).
- **Altijd zomer.** Geen winter, sneeuw of natuurijs.
- Privacy en credits: [docs/PRIVACY-EN-CREDITS.md](docs/PRIVACY-EN-CREDITS.md). Op de
  eigenaar na gebruik je in credits geen echte naam: kies een bijnaam.
