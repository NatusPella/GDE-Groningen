# Review multiplayer en netwerk

Review van de bestaande code op main (HEAD 9d63ab80), gebied Samen spelen/netwerk. Geen diff-review: ik heb de huidige code gelezen, geen tests of spel gedraaid. `node --check` op 13 gelezen bestanden: geen fouten.

## Dekking

Volledig gelezen: alle 21 modules in `game/js/net/` (hub, session, protocol, codec, interp, rtcroom, sigcrypto, pairing, upnp, serverlijst, serverstaat, speelklok, desync, diagnose, diagnoseenv, brokers, netconfig, ipctransport, memtransport, koploos, plus de sessie-module) en `game/js/coopsolo.js`, `sessiekeuze.js`, `onlineconsent.js`, `coopspelersui.js`, `cooppings.js`, `coopplayers.js`, `partnerhud.js`.

Gericht diep gelezen (niet elk bestand volledig): `coopnet.js` (host/client-opzet, tickCoopNet, handleEvent, stopCoopNet, kick/verbod/wachtwoord), `sessionboot.js`, `coopwapen.js` (bericht en aanvalsklok), `coophostwisselnet.js` + `coophostwissel.js` (wisselEvent, stukken), `coopcut.js` (stukken), `coopclient.js` (welkom en snapshot toepassen), `lobbyui.js` (host/gast/aankondiging/lijst/cleanup), `lobby.js` (teksten, naamfilter), `main.js:590-700` (boot en sessie-van-één), `coophold.js`, `settings.js` (toestemming), en de specs `multiplayer.md`, `publicatie.md`, `coding-standards.md`, ADR 0022 en 0024.

Niet of nauwelijks bekeken: `coopglue.js`, `coopgast.js` (volledig), `coopextra*.js`, `coopscene.js`, `coophud.js`, `samenpanel.js` (alleen grep), de MP-delen van `pausemenu.js`/`startscreen.js`, de directe IP-route in `desktop/coopcore.cjs` (TCP/UPnP end-to-end), de aanroepers in `multiplayerhostwisselui.js` en alle tests. Geen runtime- of netwerktest (spec open punt 4: nooit met echte spelers over internet bekeken), dus scenario's hieronder zijn uit de code afgeleid, niet live gereproduceerd.

## Bevindingen (op ernst)

### [Hoog] Openbare lijst publiceert de kamercode, en daarmee is het IP-adres van de host door iedereen te ontsleutelen
- **Waar:** `game/js/net/serverlijst.js:154` (kamercode in de onversleutelde aankondiging), `game/js/lobbyui.js:281-284` en `game/js/sessionboot.js:213-215` (aankondiging met `room`), `game/js/net/sigcrypto.js:35-40,60-63` (sleutel en onderwerp uit de kamercode), `game/js/net/rtcroom.js:71-74` (SDP-aanbod versleuteld met de kamercode en op de broker gezet). Tekst die het tegendeel belooft: `game/js/lobby.js:42-43`, `game/js/net/brokers.js:1-5`.
- **Scenario:** de host maakt zijn sessie openbaar (of host automatisch bij de start, #556). Een willekeurige derde leest het vaste openbare lijstonderwerp (`LIJST.sleutel`, `serverlijst.js:14-16`), ziet per sessie de kamercode, leidt met `topicFor(room)` het brokeronderwerp af, haalt daar het vastgehouden/verspreide aanbod op en ontsleutelt dat met PBKDF2(kamercode). In de SDP staan de ICE-kandidaten: het publieke IP van de host en zijn lokale adressen. Er wordt geen verbinding gemaakt en de host merkt niets.
- **Impact:** schending van constitutie 10 (IP alleen voor medespelers/STUN/brokers) en van de eigen teksten ("Je IP-adres staat er niet bij"); de speler stemt in met "openbaar in de lijst", niet met "mijn IP is voor iedere lezer te halen". Het maakt ook gerichte scans/DoS op die host mogelijk. Al gemeld: #556 dekt dat de startsessie standaard openbaar wordt; dit mechanisme (IP via de kamercode) staat daar los van en mist erin.
- **Fix:** publiceer geen sleutelmateriaal: kondig een opaque sessie-id aan en laat deelnemen via een aparte uitnodigingstoken die niet in de lijst staat, of publiceer een join-token waaruit geen decryptiesleutel volgt. Minimaal: conditie in de spec/consenttekst rechtzetten en de kamercode alleen aan een daadwerkelijke deelnemer geven.
- **Zekerheid:** zeker (codepad); niet live getest.

### [Midden] Kicken is niet blijvend: geen verbod, en de vrijgegeven verbinding neemt zo weer een HELLO aan
- **Waar:** `game/js/coopnet.js:1545-1549` (`removeGuest`), `:1564-1574` (`verbiedGast`, heeft volgens grep nul aanroepers), `game/js/net/hub.js:144-149` (kick), `game/js/net/session.js:148-152` (`_release` laat `link.onmessage` staan en sluit niet), `:96-131` (`_hello` wijst na release zonder tokencontrole een nieuwe plek toe). Aanroepers: `coopspelersui.js:185`, `samenpanel.js:122`, `coophold.js:44`.
- **Scenario:** de host zet een gast eruit. Na 0,5 s release blijft de DataChannel open en `link.onmessage` wijst nog naar de HostSession. Een aangepaste client negeert `weg`/BYE en stuurt op dezelfde verbinding een geldige HELLO; omdat `this.guest` null is, worden alle tokencontroles overgeslagen en geeft `cfg.assign` een nieuwe plek. Ook een verse verbinding met de kamercode komt er weer in: het token is nooit in `hub.cfg.verboden` gezet, want de UI roept `verbiedGast` nooit aan. De reden `verbod` ("Je bent uit deze sessie verwijderd. Je kunt niet terugkomen.", `game/js/net/protocol.js:34`) is daarmee dode code.
- **Impact:** het enige extra recht van de host (kicken, constitutie/spec "Enige extra recht") is voor een kwaadwillende niet afdwingbaar; een griefer is binnen een seconde terug.
- **Fix:** koppel "eruit zetten" aan `verbiedGast` (of ban bij herhaald kicken), markeer de HostSession als gesloten zodat een late HELLO geweigerd wordt, en sluit de verbinding in `_release` na het afscheidsbericht.
- **Zekerheid:** zeker (codepad).

### [Midden] De openbare lijst is niet authentiek: CRC16 is geen handtekening, rijen zijn te vervalsen en te kapen
- **Waar:** `game/js/net/serverlijst.js:145` (CRC16 als enige controle), `:150-159`/`:163-177` (codeer/decodeer), `:189-207` (ontvang, met op `:203-204` "zelfde kamer onder ander id telt één keer"), `game/js/net/brokers.js:95-111,176-184` (vaste, wereldwijd gedeelde topics, geen auth).
- **Scenario:** iedereen die op de vaste topics kan publiceren (onderwerp staat in de bron) maakt een geldige aankondiging: CRC16 rekent hij zelf uit. Hij kopieert een zichtbaar id en stuurt hetzelfde id met een nieuwere `t` (≥ oud + 5 s), andere naam/spelers/kamercode: elke kijker vervangt de rij en wie erop klikt, sluit aan bij de kamer van de aanvaller. Of hij kondigt dezelfde kamer onder een nieuw id aan, waardoor `ontvang` de echte rij bij alle kijkers verwijdert. De remmen (60 nieuwe afzenders/min, 200 gevolgd, 5 s per id) begrenzen de hoeveelheid, niet één vervalste rij.
- **Impact:** lijstvervuiling en het kapen/verbergen van sessies bij alle spelers tegelijk (de topic is voor alle installaties dezelfde); sociale gevolgen, geen code-uitvoering.
- **Fix:** onderteken aankondigingen met een per sessie gemaakte sleutel (het sessie-id gaat mee in de join-route) of accepteer in elk geval nooit een gewijzigde kamer bij een bestaand id; en documenteer het trustmodel expliciet.
- **Zekerheid:** zeker (codepad); impact waarschijnlijk.

### [Midden] Geen maximale berichtgrootte vóór JSON.parse/TextDecoder/decryptie: één groot bericht raakt elke lijstkijker
- **Waar:** `game/js/net/brokers.js:73,84,99,107` (`JSON.parse` op rauwe brokerdata), `:110,164,183` (onbegrensde strings naar de aanroeper), `:141` (`td.decode` van een MQTT-payload), `game/js/net/sigcrypto.js:51-56` (`unb64u` vóór elke lengtecontrole), `game/js/net/rtcroom.js:74-78` (decryptie vóór de `MAX_SDP`-controle van `readSdp`), `game/js/net/serverlijst.js:164` (600-byte-grens pas ná parse), `game/js/sessionboot.js:79-100` (elke speler met toestemming haalt bij de start de lijst op).
- **Scenario:** wie op het vaste lijstonderwerp publiceert (geen auth, zie vorige bevinding) of op het kameronderwerp van een openbare sessie (kamercode staat in de lijst, zie eerste bevinding) stuurt één bericht van meerdere MB. Elke client die de lijst ophaalt (de startzoektocht doet dat voor iedereen die "ja" zei) parseert eerst de hele string/TextDecoder-output en pas daarna wordt de 600-byte-grens toegepast; een verbindende gast ontsleutelt een willekeurig grote base64-blob vóór `readSdp` hem op 20.000 tekens afkapt.
- **Impact:** remote geheugen-/CPU-DoS en hapering (OOM op zwakke apparaten mogelijk), zonder account of spelersverbinding.
- **Fix:** begrens in `Backend` de frame-/payloadgrootte (bijv. 16 KB) vóór `JSON.parse`/`TextDecoder`, en begrens bloblengte vóór `unb64u`/`decryptBlob`; gooi te grote berichten stil weg.
- **Zekerheid:** zeker (geen grens in de code); impact waarschijnlijk.

### [Midden] Transports (WebRTC-datachannel, IPC/TCP) worden bij einde sessie, vertrek of kick nooit gesloten
- **Waar:** `game/js/net/session.js:148-152` en `:327` (`_release`/`leave` sluiten de link niet), `game/js/net/hub.js:144-158` (kick/closeAll versturen alleen berichten; `link.close` staat alleen op `:90`/`:130`/`:156`), `game/js/coopnet.js:1598-1609` (`stopCoopNet`), `game/js/net/rtcroom.js:31-43` (`wrapChannel.close` bestaat maar wordt niet aangeroepen), `game/js/net/ipctransport.js:16`; `lobbyui.js:369-378` cancelt de signalering, maar `rtcroom.js:60` sluit de pc alleen als het kanaal nog niet open is.
- **Scenario:** host of gast kiest Stoppen, of de host kickt: beide kanten sturen BYE en laten hun objecten los, maar roepen nergens `transport.close()` aan. De RTCPeerConnection met open datachannel blijft bestaan tot de garbage collector hem opruimt (of nooit, als de browser hem vasthoudt); op de directe route blijft de TCP-verbinding in het main-proces open. Bij elke volgende sessie komt er één bij.
- **Impact:** verbindings- en geheugenlek; verkeer/backpressure blijft hangen; in Electron stapelen de sockets zich op. Geen exploit, wel "opruimen bij disconnect" dat de review expliciet vraagt.
- **Fix:** sluit de transport in `_release`/`leave` en in `stopCoopNet` voor beide rollen, na een korte flush van het afscheidsbericht; laat de testbank controleren dat `isOpen()` daarna false is.
- **Zekerheid:** zeker dat het niet gebeurt; impact waarschijnlijk.

### [Laag] `HostSession.rejected` groeit onbegrensd en elke HELLO levert een WELCOME-antwoord
- **Waar:** `game/js/net/session.js:76` (init), `:100,104,106,119,120,123` (push), `:99-124` (elk antwoord via `encodeJson`), `game/js/net/hub.js:111` (host leest `rejected` nooit; alleen `ClientSession.rejected` wordt gelezen). Na het eerste bericht is `link.onmessage` de HostSession (`_attach`, `session.js:36`), dus latere HELLO's gaan rechtstreeks naar `_hello`.
- **Scenario:** een verbonden gast (of een verbinding die nog in `pending` staat) blijft geldige JSON-HELLO's sturen, bijvoorbeeld zonder token na de eerste invoer: elke keer `rejected.push('vol')` en een WELCOME-antwoord. Er is geen rate limit en na de eerste kennismaking geen "negeren" meer.
- **Impact:** onbegrensde array op de host plus CPU/bandbreedte per bericht, gratis te misbruiken door iemand die je toch al host (en die je volgens de vorige bevinding niet eens kunt kicken).
- **Fix:** cap of verwijder `rejected` (het is op de host dood), negeer HELLO's na een geslaagde kennismaking en sluit na N ongeldige pogingen.
- **Zekerheid:** zeker.

### [Laag] De gast bepaalt zelf zijn wapens en patronen; `n: -1` betekent oneindig
- **Waar:** `game/js/coopwapen.js:45-51` (`leesWapen`: negatieve `n` → `Infinity`, bovengrens 9999), `:122-128` (`zetWapen` neemt dat over), `game/js/coopnet.js:1150` (host verwerkt `{k:'wapen'}`).
- **Scenario:** een aangepaste gast stuurt `{k:'wapen', w:'<geweer>', n:-1}`. De host gelooft het aantal patronen en simuleert de schoten; de gast schiet onbeperkt en kan elk wapen claimen, ook een dat niet in zijn eigen save zit (de host kan dat niet controleren).
- **Impact:** cheat in PvP (geen blijvend verlies, dus beperkt), maar het ondermijnt de regel "de gast houdt zijn eigen voorraad" en de host-autoriteit over schade.
- **Fix:** laat de host alleen het schietintentie-signaal (buttons) vertrouwen en de patronen zelf bijhouden vanaf een bij binnenkomst gemelde stand; klem `n` op een redelijk maximum en behandel alleen slagwapens als oneindig.
- **Zekerheid:** zeker.

### [Laag] Betrouwbare gebeurtenissen worden stil weggegooid als de wachtrij vol zit
- **Waar:** `game/js/net/protocol.js:52-58` (`send` geeft false bij ≥32 pending), `game/js/net/session.js:185`, `game/js/net/hub.js:140-143` (resultaat wordt een boolean), `game/js/coopnet.js:1103-1124` (alle `announce`-resultaten genegeerd, geen log).
- **Scenario:** een gast die even niet ackt (tab op de achtergrond, kanaal hapert) krijgt 32 gebeurtenissen in de wachtrij; een `missie`-, `scene`- of `klok`-gebeurtenis die daarna komt wordt niet in de wachtrij gezet en nooit opnieuw geprobeerd. De hash-desync ziet maar een deel van de gedeelde staat, dus de gast kan met een verouderde missie/scène blijven zitten zonder dat iemand het merkt.
- **Impact:** stil falen en blijvende afwijking bij trage verbindingen; precies het soort fout dat in het veld niet te herleiden is.
- **Fix:** tel/log weggegooide gebeurtenissen, en herstel missie/scène bij de volgende snapshot of via een volledige hersync als de wachtrij vol blijft; of verbreek de sessie als de wachtrij structureel vol zit.
- **Zekerheid:** waarschijnlijk (overloop is zeker; hoe vaak hij optreedt is niet gemeten).

## In orde (steekproef)

- **Toestemming is echt streng.** `magOnline()` is `=== true` (`settings.js:173,239`), een ontbrekende waarde blijft `null` en vraagt het spel één keer (`onlineconsent.js:12`). `canBootSession` en `bootSession` keren zonder toestemming direct terug (`sessionboot.js:67-74,275`), en de sessie van één start zonder uitnodiging en zonder aankondiging (`coopsolo.js:19-25`, `coopnet.js:307-418`): met "nee" of een onbekende waarde gaat er niets naar buiten. De volgorde in `main.js:641-648` laat de startzoektocht eerst, daarna pas de solo-sessie — dat is consistent met #554/ADR 0024.
- **De codec en de assemblers zijn goed gehard.** `readHeader` controleert magic/versie/type, snapshots en EXTRA hebben exacte lengtecontrole, caps op spelers (16), entiteiten (64) en looks (4), `Number.isFinite` op coördinaten en een try/catch die `null` geeft (`codec.js:30-37,167-212,223-232`). De betrouwbare laag is begrensd (32 pending, 32 ahead, tijdperken; `protocol.js:42-88`) en de chunkverzamelaars van cut en hostwissel hebben harde maxima (`coopcut.js:11-13,71-78`; `coophostwissel.js:9-12,157-177,271-284`). De gevonden gaten zitten in de oudere hub/session-laag en in de brokers, niet in het binaire formaat.
- **Privacy in de eigen hulpmiddelen klopt.** Diagnose en verbindingslog maskeren IP-adressen, kamercodes en koppelcodes vóór opslag en rapport (`diagnose.js:73-79,86,102`); pings zijn begrensd (1,5 s per afzender, max 2 per speler, max 16 totaal; `partnerhud.js:14-16,57-69`); de aankondiging is op 600 bytes en de naamfilter begrensd; er gaan geen adressen of namen in protocolberichten. Het probleem blijft de combinatie lijst + kamercode hierboven.
