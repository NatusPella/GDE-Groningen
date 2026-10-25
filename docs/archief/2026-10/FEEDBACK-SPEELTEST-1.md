> **Archief (oktober 2026).** Dit document is vervangen door de GitHub-issues die eruit volgden (het bord).
> Het staat hier alleen als historie: gebruik het niet als bron en werk het niet bij.

# Speeltest Maus en NatusPella (15 okt 2026): besluiten en issues

De ruwe lijst (83 punten) is verwerkt en verwijderd; het werk staat als issues
op het bord (zie [AGENTS.md](../AGENTS.md)). De volledige oude triage met
prioriteit, release en grootte per punt staat in de geschiedenis van dit
bestand. Dit document bewaart wat besloten is: de regels, de verzonnen
namen en het Tessa-ontwerp.

## Regels die voor alles gelden

1. Geen echte merken, bedrijven, instanties of personen in speltekst, borden of
   modellen. Echte **plaatsen en gebouwen** (Forum, Korenbeurs, Euroborg, Helix,
   Martinitoren, Academiegebouw, pannenkoekenschip, Stadsschouwburg, Kardinge,
   Gruno-park, Bourtange, Woeste Hoeve) mogen met hun echte naam; een echt
   bedrijf of een echte vereniging niet.
2. Gaswinning en aardbevingen alleen als stille, respectvolle zijlijn
   ([PROVINCIE-VERHAAL.md](PROVINCIE-VERHAAL.md) §8): geen grappen over schade of
   slachtoffers, geen schurk die "het gasbedrijf" is.
3. Altijd zomer, alleen Nederlands, 18+ is toegestaan.
4. Wat nieuwe wereld nodig heeft wacht op de tegelwereld.

## Spelnamen (verzonnen vervangers)

| Tester zei | In het spel |
|---|---|
| OOGTV, RTV Noord-busje | streekomroep "Radio Noordkust" met een busje |
| DUO | studiefonds-dienst "StudieStaat" (satire, geen echte instantie) |
| McDonalds | snackketen "Snelle Hap" |
| Swapfiets | fietsabonnement "Wisselwiel" (eigen kleur, niet blauw) |
| Xior | studentenflat "Kamerkoning" |
| ANWB | wandelbond "De Toerbond" |
| NAM | mijnbouwbedrijf "Delfstof Noord" |
| Gasunie-gebouw | "het glazen netbeheerhuis" (gevel herkenbaar, naam niet) |
| Bakker Bart | bakkerij "Bakker Bert" |
| Vindicat | studentencorps "Vigilantia" |
| GemeenteOplossingen | gemeentedienst "Het Loket" |
| iWink | webbureau "Wiebelwerk" (knipoog) |
| KPN-gebouw | "het oude Telefoonhuis" |
| Hanze | hogeschool "Noordhaven" in een Hanze-achtig gebouw |
| Van Mesdag | "Kliniek Van der Meden" |
| Datacenters Zernike | "Wolkenhal" (zelfde naam als Eemshaven) |
| Bernard | verzonnen zwerver "Bernhard met de Karretje"; gelijkenis alleen in stijl, nooit de echte persoon |
| Riepe | straatkrant "De Straatkrant" |
| FEBO | snackautomaat "Muurkroket" (eierballen, kroketten, frikandellen) |

## Besluiten van de eigenaar (15 okt)

- **iWink is een knipoog**: een verzonnen webbureau "Wiebelwerk", geen echt
  logo, merk, kleur of echte mensen.
- **Wraak voor mijnbouwschade mag**, met het verzonnen "Delfstof Noord" en met
  zorg (stille zijlijn, geen grappen over schade of slachtoffers).
- **Tessa die zich onveilig voelt bij het uitgaan mag**, als lichte sociale noot,
  met geverifieerde cijfers (zie hieronder).
- **Bernard** is een verzonnen lookalike; de **jeugdgevangenis** en de
  **studieschuld-satire** blijven erin, in de bestaande lichte toon; de **roze
  kersenbloesem** blijft, ook in een zomerspel.
- **Beroofd worden in bepaalde wijken:** een overval kost alleen een deel van je
  geld, zonder geweld in beeld; gevaarlijke wijken krijgen 's avonds en 's nachts
  een waarschuwing op de kaart; je krijgt het geld terug door de dader te
  achtervolgen (constitution 6).
- Kleine bedieningsfixes gingen eerst in 0.30.1, de rest schoof door.
- Nog niet besloten: de toon van de ontgroeningsparodie en een ontsnapping uit
  een inrichting voor F4a (#24, #26).

## Mapping naar issues

| Onderwerp uit de speeltest | Issue |
|---|---|
| Viaducthoogtes, fietstunnels bij de ring | #8 (en #78 echte straathoogtes) |
| Bruggen kapot bij aanvaringen met schepen | #9 |
| Binnenvaartschepen en jachthavens | #7 |
| Water dieper, sloten, kades | #1 |
| 3D BAG, echte gebouwhoogtes | #2 |
| Bomen: soorten en hoogtes | #2 en #68 (regionale details) |
| Open-wereldleven batch 3 (skateboarders, ontgroening, bezorgers, wijkprofielen) | #24 |
| Roeiende studenten, coach op de fiets | #28 |
| NPC's in auto's, uitstappen om te vechten | #49, #44 |
| Minigames (discgolf, Meerstad, Pieterpad, pannenkoekenschip) | #25 |
| Missies uit de speeltest (DUO, rechtbank, academiegebouw, busmuseum, Vindicat, Van Mesdag, GemeenteOplossingen, Helix, Niemeyer) | #26 |
| Iconische plekken per wijk en interieurs (Forum, kerken, Korenbeurs) | #23, #22, #21 |
| Tessa-commentaar met geverifieerde cijfers | #39 |
| Bussen op echte routes | #80 |
| Handmatige speeltests door Maus | #74 |
| Menu- en HUD-fixes (knopstijl, hintbron, laadscherm, wijkcutscenes) | #34, #33 |

Kleine fixes uit de speeltest die al zijn gebouwd (bijvoorbeeld de boetes voor
mobiel en fietslicht, telefoons bij NPC-fietsers, Esc in een minigame) staan
als gesloten issues op het bord (#27, #29 e.a.).

## Tessa en onveilig uitgaan: feitenblok en ontwerp

(Verwezen vanuit [TESSA-CIJFERS.md](TESSA-CIJFERS.md); werk: #39 en F4a.)

### Feitenblok

Alleen controleerbare cijfers, met bron en jaar in de speltekst. De gecontroleerde
cijfers staan in [TESSA-CIJFERS.md](TESSA-CIJFERS.md); de bronnen zijn:

| Onderwerp | Bron |
|---|---|
| Aandeel vrouwen dat zich weleens onveilig voelt in het uitgaansleven of de openbare ruimte | CBS Veiligheidsmonitor (nieuwste jaar) |
| Aandeel vrouwen dat in het afgelopen jaar op straat is lastiggevallen | CBS Veiligheidsmonitor, rapport over seksuele intimidatie |
| Verschil tussen vrouwen en mannen, en tussen jongere en oudere vrouwen | zelfde monitor, uitsplitsing |
| ~~Aantal aangiften van seksuele intimidatie~~ | Niet te verifiëren; weglaten (zie TESSA-CIJFERS.md) |

De speltekst noemt één getal met bron en jaar, niet meer. Zonder geverifieerd
cijfer zegt de regel alleen: "Veel vrouwen kennen dit gevoel; het CBS meet het
elk jaar."

### Ontwerp in het spel

- **Scene (F4a, Stad, nacht):** kort en overslaanbaar (hold-to-skip). Tessa loopt
  tussen twee uitgaansplekken; twee mannen roepen naar haar en lopen een stuk
  achter haar aan. Geen aanraking, geen geweld. Tammo (of jij) kiest: tussenkomen
  met een droge zin, of rustig naast haar komen lopen. Beide keuzes zijn goed;
  Tessa beslist zelf en wordt nergens "gered".
- **Systeem:** een zachte "Tessa-comfortmeter" op nachten dat ze meegaat: hoog als
  je dichtbij blijft, een taxi regelt of drukke straten kiest, lager bij donkere
  stegen. Bij hoge meter praat ze meer en geeft ze tips; bij lage wil ze naar huis
  (korte tijd, geen straf, geen game over).
- **Toon:** serieus, niet grappig, nooit expliciet.
- **Slotregel:** één feit als Kiekdoar-nieuwsbericht of laadschermregel, met
  een geverifieerd cijfer.
- **Release:** F4a, nachtstreek (`deel4-f4a.md` §8); de berovingskans in wijken is
  een apart, klein systeem.
