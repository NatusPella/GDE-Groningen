# Dedicated server: beheerder en beslissingen (#450)

Een gastheer zonder venster: dezelfde hub, snapshots en regels als een gewone sessie, maar
zonder speler op plek 0. Deze pagina is de **beheerdershandleiding** en legt de bewuste
eigenaarsbeslissingen vast. De code is de waarheid; de regels staan in
[`multiplayer.md`](../.specs-fire/standards/multiplayer.md).

## Snel starten (Node)

```bash
# in de checkout, geen venster en geen gestagede game nodig
node scripts/coop/nodehost.mjs --port=41234 --max=4 --naam=Zomeravond \
  --wachtwoord=geheim --staat=<pad>/serverstaat.json
```

Opties: `--port=<n>` (vast; zonder poort kiest het spel er zelf een), `--max=<n>` (2-16),
`--naam=<tekst>` (openbare naam; leeg = privé), `--wachtwoord=<tekst>` (max 32 tekens),
`--staat=<bestand>` (wereldstaat bewaren en herladen), `--openbaar` (in de openbare lijst),
`--upnp`, `--help`. De poort mag ook uit `PORT`. Zonder `--naam`/`--openbaar` is de sessie
privé en deel je de koppelcode zelf.

De host print de koppelcode (`GDE2-…` met adres en poort) en leest daarna commando's:

| Commando | Wat |
|---|---|
| `status` | koppelcode, poort, spelers, wereldstand en sinds wanneer hij draait |
| `spelers` | wie er is (plek, naam, verbinding) |
| `kick <plek>` | die speler eruit |
| `verbied <plek>` | kicken en het token van die verbinding onthouden (in het geheugen) |
| `wachtwoord <tekst>` / `wachtwoord uit` | de sessie op slot / open |
| `max <aantal>` | maximum aantal spelers |
| `openbaar <naam>` / `openbaar uit` | in de openbare lijst / eruit |
| `stop` | netjes stoppen (ook Ctrl+C en SIGTERM) |

**Wereldstaat.** Met `--staat=<bestand>` bewaart de host elke 30 s en bij het stoppen de
klok, speeltijd, wanted, weer en missiefase; bij de start zet hij die terug. Het schrijven
gaat via een tijdelijk bestand: een half geschreven bestand valt bij de volgende start
terug op een nieuwe wereld in plaats van te crashen (`game/js/net/serverstaat.js`,
`scripts/serverstaat_test.mjs`).

**Poort en netwerk.** De host luistert op `0.0.0.0`; zet de gekozen poort open in de
firewall en, voor spelers buiten het eigen netwerk, in de router (of gebruik `--upnp`).
Een bezette poort geeft een duidelijke melding in plaats van stil een andere poort.

**Wachtwoord.** Het wachtwoord gaat over de TCP-route leesbaar mee (geen TLS); dat is nu
zo. Deel het buiten het spel, nooit in de openbare lijst of een screenshot. Een verkeerd
wachtwoord kun je opnieuw proberen zonder de lobby te verlaten.

## Bewuste eigenaarsbeslissingen (7-11-2026, #450)

1. **Vindbaarheid: direct adres/koppelcode, geen WebRTC-in-Node en geen relay.**
   De lijst is op kamercodes en WebRTC gebouwd; een koploze host heeft alleen TCP. WebRTC
   in Node vraagt een native dependency per platform (macOS, Windows, Linux, Android) en
   een relay raakt constitutie 4 en 10. Daarom: de beheerder deelt de `GDE2`-code buiten
   het spel (Discord, eigen site, LAN) of de host zet zich met `--openbaar` in de lijst
   als vindbaarheid; de rij in de lijst is **niet aanklikbaar** voor een koploze host,
   omdat aanklikken de versleutelde RTC-route gebruikt. Dat staat ook in `COOP-GAST.md`.
   De openbare lijst toont nooit een IP-adres, wachtwoord of persoonsnaam; de broker ziet
   het adres van de host zoals elke website dat van een bezoeker ziet (constitutie 10).
2. **Electron-variant: bewust niet gebouwd.** De ondersteunde headless route is Node met
   `scripts/coop/nodehost.mjs`; de gewone Electron-app host met een speler en heeft geen
   vensterloze modus nodig. Een grafisch beheerscherm in plaats van de CLI is er niet; de
   `status`-uitvoer is de beheerdersweergave. Wie later een Electron-variant wil, kan
   dezelfde `startKoplozeHost` gebruiken.
3. **Soak: bewust niet in deze slice.** De tests dekken vier gasten tegelijk, kicken,
   verbieden, wachtwoord, vaste poort, herstart met wereldstaat en een half geschreven
   bestand (`scripts/nodehost_test.mjs` 9/9, `scripts/serverstaat_test.mjs` 15/15,
   `scripts/coopnet_test.mjs`). Een host die dagen achter elkaar draait en veel gasten
   over tijd is een operationele acceptance-test op echte hardware; dat is een
   eigenaars-/beheerdersstap en geen codeblok dat nu ontbreekt.
4. **Host-failover met een koploze host (slice E) is niet apart getest.** De gewone
   overname (#439, `coophostwissel_test.mjs`) is getest met een host die een speler is;
   dezelfde code werkt met een koploze host, maar de combinatie vraagt een echte
   twee-instanties-test. Dat staat als open punt in het issue, niet als ontbrekende code.

## Wat er is (en waar het staat)

| Onderdeel | Bewijs |
|---|---|
| Koploze wereld (`player`/`companion` null, plek 0 overgeslagen) | `game/js/net/koploos.js`, `nodehost_test.mjs` |
| Vaste poort, adres, naam, nette poortfout | `desktop/coopcore.cjs`, `nodehost_test.mjs` |
| Wachtwoord (host en gast) | `net/session.js`, `lobby.js`, `nodehost_test.mjs` |
| Wereldstaat bewaren/herstellen | `game/js/net/serverstaat.js`, `serverstaat_test.mjs` |
| Beheer/CLI (status, spelers, kick, verbied, max, wachtwoord, openbaar, stop) | `scripts/coop/nodehost.mjs`, `nodehost_test.mjs` |
| Openbare lijst (opt-in) | `net/serverlijst.js`, `nodehost_lijst_test.mjs` |
| Host-failover (gewone host) | `scripts/coophostwissel_test.mjs` |

## Wat een beheerder nog moet weten

- **Waar draait hij?** Een pc of server met Node en de checkout; geen Electron en geen
  scherm. De processor doet het zware werk (snapshots, figuren), dus geen slaapstand.
- **Updaten.** Stoppen (`stop`), checkout bijwerken, opnieuw starten met hetzelfde
  `--staat`-bestand en dezelfde poort; de sessie houdt zijn id en de wereldstand komt
  terug.
- **Gasten.** Zij starten de gewone game, kiezen **Meedoen** en plakken de koppelcode (of
  kiezen de rij in de lijst bij een openbare host; aanklikken daarvan werkt alleen bij een
  host met RTC, dus bij een koploze host deel je de code).
- **Noodgeval.** `stop` sluit netjes af; gasten zien het wachtscherm en kunnen terugkomen
  bij een herstart. Er is geen watchdog die een gecrashte host automatisch herstart; dat
  is bewust buiten scope (en te regelen met systemd/pm2/een taakplanner).
- **Privacy.** Geen IP-adressen, wachtwoorden of persoonsnamen in de lijst of in de
  opgeslagen staat; de staat bevat alleen wereldgegevens (klok, weer, wanted, missie).
