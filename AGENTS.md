# AGENTS.md: werkafspraken en constitution

Voor iedereen die in deze repo werkt: mensen, Claude Code en andere agents.
Lees eerst [README.md](README.md), [ARCHITECTURE.md](ARCHITECTURE.md) en [CONTRIBUTING.md](CONTRIBUTING.md).
`CLAUDE.md` verwijst naar dit bestand.

GDE Groningen – Zomer vol misdaad: een open-wereld-komedie in een low-poly Groningen
(Three.js + Electron, met een webversie). Eigen verhaal, eigen personages, echte plekken.

## Constitution (onaantastbaar)

1. **Alleen Nederlands** in alles wat een speler ziet of hoort. Gronings en Fries alleen met zorg; "Grunn", nooit "de Grunn".
2. **Geen echte merken, bedrijven of personen** in speltekst of beeld. Echte plaatsen en gebouwen mogen. Parodieën hebben verzonnen namen. Personages en bedrijven zijn verzonnen (Tammo, Tessa, Delfstof Noord, Wiebelwerk).
3. **Altijd zomer.** Geen winter, sneeuw of natuurijs. De zonnetijd en de verzonnen kalenderdagen blijven zoals ze zijn.
4. **Geen echte persoonsgegevens** in de repo, speltekst of tests, en niets sturen naar externe diensten, behalve de coöp-uitzondering die de eigenaar heeft goedgekeurd: openbare STUN-servers, signalering via openbare brokers met end-to-end versleutelde berichten en een toestemmingsmelding voor de speler (zie #95), en een openbare sessielijst op dezelfde brokers (naam, aantal spelers en versie, zonder IP-adres of wachtwoord) alleen als de host die sessie zelf openbaar maakt (zie #438; goedgekeurd door de eigenaar op 23-10). Verder mag het spel openbare gegevens alleen OPHALEN (een gewone leesopvraag zonder spelergegevens, zonder account of kenmerk van de speler), zoals de live buslocaties van #395, met een uitzetter in Instellingen en een terugval op de eigen dienst als de bron niet bereikbaar is (goedgekeurd door de eigenaar op 24-10). Op de eigenaar na schrijft niemand een echte naam in credits: gebruik NatusPella.
5. **Geheimen blijven geheim.** Nooit `.env` lezen, printen of committen. De OpenRouter-sleutel is alleen voor de TTS-scripts.
6. **Satire, geen leed.** Berovingen kosten een deel van je geld, zonder getoond geweld. Gevoelige onderwerpen (gaswinning, veiligheid) alleen met zorg: een verzonnen bedrijf, controleerbare cijfers, nooit een echt slachtoffer als grap.
7. **Eén bron voor de roadmap: GitHub.** Wensen en bugs zijn issues op het bord, zonder roadmap-markdown in git. Zie "Werkwijze".
8. **Niets openbaar zonder akkoord van de eigenaar:** zichtbaarheid van de repo, GitHub Pages, posts, uploads, geschiedenisherschrijving, force push.
9. **Beveiliging van de eigenaar:** raak poort 9000 en de geïnstalleerde app niet aan; test met wegwerpprofielen.

## Werkwijze

**Prioriteit:** eerst alles met het label `bug`; daarna wensen op hoge impact en lage kosten (`impact-*`, `kosten-S/M/L`).
Elk issue is een `bug` of een `wens`, met één impact- en één kostenlabel. Verder alleen `eigenaar` (wacht op de eigenaar).

**Bord** (project 5 van NatusPella): kolommen Bugs, Wensen, Bezig, Review, Klaar. Epics zijn milestones (geen versienummers).

**Issue bijwerken:** als je iets met een issue doet (starten, commit, merge, besluit), werk je het issue en het bord bij:
commit met `Closes #n`, een comment bij wat niet lukte, de kolom bijwerken.

**Releases** zijn pre-releases van wat in Klaar staat: `cd desktop && npm run release -- minor|patch` (macOS en Windows; Linux staat voorlopig uit, voeg `--linux` toe als het nodig is).
Daarvoor is een `## [X.Y.Z]`-sectie in `CHANGELOG.md` nodig en een schone werkboom. Het script vermeldt alle medewerkers (@, ook de eigenaar als playtester) alleen in een comment op issue #116 (het playtest-issue), niet in de releasenotities, zodat zij een melding krijgen. Spelerzichtbare wijzigingen komen als Nederlandse regels onder `[Unreleased]`.
Release een geteste versie ruim voor de limiet van het gebruik, niet pas op het eind.
Lokaal: Windows-exe en wereld (`--world`). In Actions, na de release met `node scripts/release_builds.mjs`: macOS-dmg, Linux (AppImage en tar.gz) en Android-debug-APK, alleen met `workflow_dispatch` (ca. 55 tot 105 van de 2000 gratis minuten per release). Zie [docs/RELEASEN.md](docs/RELEASEN.md).

**Agents:** werk in een eigen worktree en branch, in kleine commits. Test alleen wat bij je eigen wijziging hoort (`node --check` plus de paar tests die die code dekken); de volledige suite, `province_test`, de zware audits en de Electron-verhaaltest draait de coördinator bij het maken van een release, niet de agent. Geen push, merge, tag of release door agents; dat doet de coördinator na de tests.
Alleen één Electron-instantie tegelijk en geen nieuwe agents tijdens een releasebouw. Houd de schijf vrij.

## Testen

- Alles in één keer, met rapport: `node scripts/test_all.mjs --fase=licht|zwaar|electron|alles` (zie [docs/TESTEN.md](docs/TESTEN.md)).
- Vóór elke merge: `node --check` op gewijzigde JS, `node scripts/voice_coverage.mjs --quiet`, en alle `scripts/*_test.mjs` met gewone `node` (macOS en Windows hebben geen `timeout`).
- Vóór elke release: één Electron-verhaaltest (`--story-test=<dir>`). NaN-waarschuwingen in geometrie laten die falen.
- Zware wereldchecks: `ring_probe`, `seat_audit`, `scripts/world/prop_conflict_audit.mjs --strict` (weilandranden en vee tegen spoor, weg, water en huis), `scripts/perf/geocheck.sh`, `drive_audit`, `junction_sim_test`, `network_drive_test`, spoor- en wateraudits.
- Tests schrijven nooit naar echte opslag: blokkeer `localStorage` voor `gde-save-v1`, `gde-settings`, `gde-prestaties-v1`. Een synthetische `keydown` wordt altijd gevolgd door een `keyup`.
- Gebruik voor het spel nooit het ingebouwde browservenster van de app; draai headless of Electron en sluit het weer.
- Zeg eerlijk wat niet is getest. Alles wat een agent niet in beeld heeft gezien, staat als "nog niet bekeken" in het issue.

## Code

- Eén generator voor stad en platteland (`worldbuilder.js`); één hoogtevraag per net (`surfaceAt`); tegels in `.gdt`-formaat, RD New (EPSG:28992) als projectie.
- Zelfde streaming-pad in Electron en web; de wereld is data (`game/world/` wordt bij het bouwen gemaakt en staat niet in git).
- Opslagsleutels heten `gde-*` (met migratie van oude `gte-*`); laat saves nooit stuk gaan.
- Pas bestaande stijl toe: naamgeving, commentaardichtheid en idioom van de omliggende code. Geen refactors buiten de opdracht.
- Low-poly beeldstijl, maar herkenbare plekken. Zie [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).
- **Multiplayer bij ontwerp:** elke nieuwe missie, bijbaan, minigame of functie krijgt een regel over Samen spelen voordat hij af is: is het van wie het spel opende (de wereld), doet een gast mee (J of N bij Meedoen?) of doet iedereen het lokaal in zijn eigen spel? Wat ziet een gast (snapshot, EXTRA-bericht), wie krijgt de beloning en de voortgang (per speler, zie #429), wat gebeurt er als iemand wegvalt of later aansluit, en welke test dekt het (pure coöp-test of een testbankstap)? Zet die regel in de changelog of het issue (en in docs/COOP-GAST.md als het een nieuwe regel is). De 611 verwijzingen naar world.player zijn de reden: nieuwe code moet niet nog een enkelspeler-aanname toevoegen.
