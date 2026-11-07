# Beveiliging

## Een probleem melden

Heb je een beveiligingsprobleem gevonden, bijvoorbeeld in de desktopapp
(Electron), het releasescript of de webversie? Meld het **privé** via
GitHub: ga naar het tabblad **Security** van deze repo en kies **Report a
vulnerability** ([direct](../../security/advisories/new)). Zet het niet in
een gewoon issue.

Beschrijf wat je vond, in welke versie, en hoe het na te doen is. Dit is
een hobbyproject: we reageren zo snel als het lukt, meestal binnen een paar
weken, en laten je weten wat we ermee doen.

## Welke versies

Alleen de nieuwste release krijgt fixes.

## Goed om te weten

- Het spel heeft geen account en geen telemetrie. Saves en instellingen staan alleen
  op je eigen apparaat. Alleen bij samen spelen (na jouw toestemming) gaat je IP-adres
  naar een openbare STUN-server en gaat versleutelde signalering via openbare brokers;
  zet je de live busposities aan, dan is dat een openbare leesopvraag zonder gegevens
  van jou (wel ziet die dienst je IP-adres, zoals bij elke webopvraag);
  zie [docs/PRIVACY-EN-CREDITS.md](docs/PRIVACY-EN-CREDITS.md).
- De builds zijn niet ondertekend (zie de README). Download ze alleen van
  de Releases van deze repo.
