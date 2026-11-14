// Hulp- en uitlegpagina's voor de marketingpagina (#37). Eén bron voor de inhoud; build.mjs
// zet ze met de gedeelde header/footer in website/_site/help/. Alles Nederlands, 18+,
// geen externe laadbronnen (de linkjes naar GitHub/YouTube openen pas na een klik).
export const HELP_PAGES = [
  {
    slug: 'index',
    titel: 'Hulp en veelgestelde vragen',
    beschrijving: 'Hulp bij GDE Groningen: installeren, systeemeisen, spelen, samen spelen en problemen melden.',
    intro: 'Iets kwijt of iets stuk? Hieronder staan de antwoorden op de meestgestelde vragen. Kom je er niet uit, open dan een issue op GitHub; dan kijken we mee.',
    body: `
      <div class="help-grid">
        <a class="help-card" href="installeren.html"><strong>Installeren</strong><span>Windows, macOS, Linux en Android, en wat je doet bij de waarschuwing van je systeem.</span></a>
        <a class="help-card" href="systeemeisen.html"><strong>Systeemeisen</strong><span>Wat je nodig hebt: WebGL 2, geheugen, schijfruimte en de downloadgroottes.</span></a>
        <a class="help-card" href="spelen.html"><strong>Spelen en besturing</strong><span>Toetsen, controller, aanraking, opslaan, instellingen en toegankelijkheid.</span></a>
        <a class="help-card" href="samen-spelen.html"><strong>Samen spelen</strong><span>Een kamercode, toestemming, eigen voortgang en wat er met je IP-adres gebeurt.</span></a>
        <a class="help-card" href="problemen.html"><strong>Problemen en fouten melden</strong><span>Crash, geen geluid, haperingen of een vastloper: dit kun je zelf proberen.</span></a>
      </div>
      <h2>Snelle antwoorden</h2>
      <ul>
        <li><strong>Wat kost het?</strong> Niets. Geen advertenties, geen account, geen aankopen.</li>
        <li><strong>Hoe oud moet ik zijn?</strong> Het spel is bedoeld voor spelers van 18 jaar en ouder.</li>
        <li><strong>Is het spel af?</strong> Nee, dit is een openbare playtest. Elke versie is een pre-release; ruwe randen horen erbij.</li>
        <li><strong>Waar zijn de downloads?</strong> Kies de bovenste pre-release bij de <a href="https://github.com/NatusPella/GDE-Groningen/releases">releases op GitHub</a>; daar staan de bestanden voor alle platformen.</li>
        <li><strong>Is er een online versie?</strong> Nog niet. De marketingpagina is er wel, maar de speelbare webversie volgt later.</li>
        <li><strong>Kan ik op Android samen spelen?</strong> Nee. De Android-app heeft geen internetrechten; solo spelen kan wel.</li>
        <li><strong>Blijft mijn save werken na een update?</strong> Niet gegarandeerd vóór 1.0. Maak eerst een export via het pauzemenu; zie <a href="spelen.html">Spelen en besturing</a>.</li>
      </ul>
      <h2>Nog steeds vast?</h2>
      <p>Open een issue op <a href="https://github.com/NatusPella/GDE-Groningen/issues">GitHub</a> met je versie, platform en wat je deed. Een foutrapport uit het spel helpt enorm; dat staat onder <strong>Over › Problemen</strong> in het pauzemenu.</p>
      <p class="help-terug"><a href="../">← Terug naar de marketingpagina</a></p>
    `,
  },
  {
    slug: 'installeren',
    titel: 'Installeren',
    beschrijving: 'GDE Groningen installeren op Windows, macOS, Linux en Android, inclusief de waarschuwing voor niet-ondertekende builds.',
    intro: 'De builds zijn gratis pre-releases en niet ondertekend. Daarom waarschuwt je systeem de eerste keer. Hieronder staat per platform wat je doet.',
    body: `
      <p>Kies de bovenste pre-release bij de <a href="https://github.com/NatusPella/GDE-Groningen/releases">releases</a>. Daar staan de bestanden voor alle platformen en een <code>SHA256SUMS.txt</code>; welke bestanden er precies bij zitten, staat in de release zelf. Twijfel je of je systeem het aankan? Bekijk de <a href="systeemeisen.html">systeemeisen</a>.</p>
      <h2>Windows</h2>
      <ol>
        <li>Download <code>GDE-Groningen-&lt;versie&gt;-windows-portable.exe</code> (ongeveer 450 MB).</li>
        <li>Dubbelklik; installeren is niet nodig.</li>
        <li>Zegt Windows "Windows heeft uw pc beveiligd"? Klik op <strong>Meer info</strong> en dan op <strong>Toch uitvoeren</strong>. Dat komt doordat de app niet ondertekend is.</li>
      </ol>
      <h2>macOS</h2>
      <ol>
        <li>Download <code>GDE-Groningen-&lt;versie&gt;-mac.dmg</code> en open hem.</li>
        <li>Sleep GDE Groningen naar <strong>Programma's</strong> en start de app.</li>
        <li>Bij de melding klik je <strong>Gereed</strong>. Ga daarna naar <strong>Systeeminstellingen › Privacy en beveiliging</strong> en klik onderaan op <strong>Open toch</strong>.</li>
      </ol>
      <h2>Linux en Steam Deck</h2>
      <ol>
        <li>Download de <code>.AppImage</code> of de <code>.tar.gz</code>.</li>
        <li>Maak de AppImage uitvoerbaar (<code>chmod +x GDE-Groningen-*.AppImage</code>) en start hem. Of pak de tar uit en start <code>gde-groningen</code>.</li>
        <li>Op de Steam Deck: download in de bureaubladmodus en voeg de app toe met <strong>Aan Steam toevoegen</strong>.</li>
      </ol>
      <h2>Android (debug-APK)</h2>
      <ol>
        <li>Download <code>GDE-Groningen-&lt;versie&gt;-android-debug.apk</code> (ongeveer 225 MB) op een toestel met <strong>Android 7.0 of nieuwer</strong>.</li>
        <li>Sta eenmalig installatie uit onbekende bronnen toe; Play Protect kan waarschuwen omdat dit een debug-build is. Alleen installeren als je de bron vertrouwt.</li>
        <li>De app is vooral op de emulator getest; op een echt toestel kan het minder soepel lopen.</li>
      </ol>
      <p><strong>Let op:</strong> de Android-app heeft geen internetrechten. Solo spelen kan wel, maar <a href="samen-spelen.html">Samen spelen</a> werkt daar niet.</p>
      <h2>Vanaf de broncode</h2>
      <p>Dat kan ook. Kloon de repo en pak de wereld uit een release:</p>
      <ol>
        <li><code>git clone https://github.com/NatusPella/GDE-Groningen.git</code></li>
        <li>Download <code>gde-world.tgz</code> uit de bovenste release en pak hem uit naar <code>game/world</code>.</li>
        <li>Start <code>python3 scripts/devserver.py 8765 game</code> en open <code>http://localhost:8765</code>.</li>
      </ol>
      <p>De browser laadt three.js en de lettertypen van internet; de desktop- en web-builds hebben die bestanden lokaal. Zie <a href="https://github.com/NatusPella/GDE-Groningen/blob/main/docs/ONTWIKKELEN.md">docs/ONTWIKKELEN.md</a> voor alle opties.</p>
      <p class="help-terug"><a href="./">← Terug naar de hulpindex</a></p>
    `,
  },
  {
    slug: 'systeemeisen',
    titel: 'Systeemeisen',
    beschrijving: 'Systeemeisen van GDE Groningen voor Windows, macOS, Linux/Steam Deck en Android, inclusief WebGL 2 en schijfruimte.',
    intro: 'Het spel draait op WebGL 2. Zonder WebGL 2 start het niet. Reken op minstens 1 GB vrije schijfruimte; de download is per platform een paar honderd MB en uitgepakt ruim 500 MB.',
    body: `
      <p>Dit zijn de richtlijnen waarop het spel is getest. Op een langzamere laptop kan het met de preset <strong>Laag</strong> vaak nog prima; probeer het en zet de kwaliteit lager als het hapert.</p>
      <h2>Windows</h2>
      <table>
        <thead><tr><th></th><th>Minimum</th><th>Aanbevolen</th></tr></thead>
        <tbody>
          <tr><td>Besturingssysteem</td><td>Windows 10 64-bit</td><td>Windows 11 64-bit</td></tr>
          <tr><td>Processor</td><td>4 kernen (bijv. Intel Core i5-8250U)</td><td>6 kernen (bijv. Intel Core i5-10400)</td></tr>
          <tr><td>Geheugen</td><td>8 GB RAM</td><td>16 GB RAM</td></tr>
          <tr><td>Videokaart</td><td>Geïntegreerd met WebGL 2, preset Laag, 1280×720</td><td>NVIDIA GTX 1060 / AMD RX 580 of beter, preset Hoog</td></tr>
          <tr><td>Opslag</td><td>1 GB vrij</td><td>1 GB vrij (SSD)</td></tr>
        </tbody>
      </table>
      <h2>macOS</h2>
      <table>
        <thead><tr><th></th><th>Minimum</th><th>Aanbevolen</th></tr></thead>
        <tbody>
          <tr><td>Besturingssysteem</td><td>macOS 12 Monterey</td><td>macOS 14 of nieuwer</td></tr>
          <tr><td>Processor</td><td>Apple M1 of Intel Core i5 (2018+)</td><td>Apple M1 Pro / M2 of nieuwer</td></tr>
          <tr><td>Geheugen</td><td>8 GB RAM</td><td>16 GB RAM</td></tr>
          <tr><td>Videokaart</td><td>Apple M1 / Intel Iris Plus, preset Laag</td><td>Apple M1 Pro of beter, preset Hoog</td></tr>
          <tr><td>Opslag</td><td>1 GB vrij</td><td>1 GB vrij</td></tr>
        </tbody>
      </table>
      <h2>Linux en Steam Deck</h2>
      <table>
        <thead><tr><th></th><th>Minimum</th><th>Aanbevolen</th></tr></thead>
        <tbody>
          <tr><td>Besturingssysteem</td><td>SteamOS 3 of Ubuntu 22.04 64-bit</td><td>Idem</td></tr>
          <tr><td>Processor</td><td>Steam Deck (AMD Zen 2, 4 kernen)</td><td>6 kernen</td></tr>
          <tr><td>Geheugen</td><td>8 GB RAM</td><td>16 GB RAM</td></tr>
          <tr><td>Videokaart</td><td>Steam Deck-GPU of driver met WebGL 2, preset Laag, 1280×800</td><td>GTX 1060 / RX 580, preset Hoog</td></tr>
          <tr><td>Opslag</td><td>1 GB vrij</td><td>1 GB vrij</td></tr>
        </tbody>
      </table>
      <p class="fineprint">Eerlijk: de Linux- en Steam Deck-builds zijn nog niet op een echt toestel getest. Werkt het bij jou niet, meld het dan; dat helpt om de volgende versie beter te maken.</p>
      <h2>Android</h2>
      <ul>
        <li>Android 7.0 of nieuwer; de APK is ongeveer 225 MB.</li>
        <li>Een debug-build die vooral op de emulator is getest; op oudere toestellen kan het minder soepel lopen.</li>
        <li>Geen internetrechten: <a href="samen-spelen.html">Samen spelen</a> kan niet op Android.</li>
      </ul>
      <h2>In de browser</h2>
      <p>Een recente Chrome, Edge of Firefox met WebGL 2 en hardwareversnelling. De browser-versie vanaf de broncode heeft internet nodig voor three.js en de lettertypen. Er is nog geen online versie van het spel.</p>
      <p class="help-terug"><a href="./">← Terug naar de hulpindex</a></p>
    `,
  },
  {
    slug: 'spelen',
    titel: 'Spelen en besturing',
    beschrijving: 'Besturing, controller, aanraking, opslaan, save-overzetting, instellingen en toegankelijkheid van GDE Groningen.',
    intro: 'Dit is een open-wereldgame in het echte Groningen. Hieronder staat hoe je loopt, rijdt, vaart en vliegt, hoe je je voortgang bewaart en wat de instellingen doen.',
    body: `
      <h2>Toetsen</h2>
      <div class="table-wrap">
        <table>
          <caption class="sr-only">Besturing van GDE Groningen: toetsen te voet en in een voertuig.</caption>
          <thead><tr><th scope="col">Toets</th><th scope="col">Lopend</th><th scope="col">In een voertuig</th></tr></thead>
          <tbody>
            <tr><td>W A S D of pijltjes</td><td>lopen (Shift: rennen)</td><td>gas, achteruit, sturen</td></tr>
            <tr><td>Spatie</td><td>springen</td><td>remmen</td></tr>
            <tr><td>Ctrl (browser: C)</td><td>bukken</td><td></td></tr>
            <tr><td>E of F</td><td>instappen, winkel of klus gebruiken</td><td>uitstappen</td></tr>
            <tr><td>Muis</td><td>camera draaien</td><td>camera draaien</td></tr>
            <tr><td>Linkermuisknop</td><td>aanvallen of schieten</td><td>uit het raam schieten</td></tr>
            <tr><td>Rechtermuisknop</td><td>richten</td><td></td></tr>
            <tr><td>1 – 4, muiswiel</td><td>wapen kiezen</td><td></td></tr>
            <tr><td>H / L / Q</td><td></td><td>toeter / lichten en sirene / achterom kijken</td></tr>
            <tr><td>M</td><td>kaart (klik: route zetten)</td><td>kaart</td></tr>
            <tr><td>Esc</td><td>menu met telefoon, spullen en instellingen</td><td></td></tr>
          </tbody>
        </table>
      </div>
      <p>Een controller (Xbox, PlayStation, Steam Deck) werkt ook, in het spel en in de menu's. Toetsen en knoppen pas je aan onder <strong>Instellingen › Besturing</strong>. Op Android bestuur je met de aanraakbesturing op het scherm.</p>
      <h2>Opslaan en save-overzetting</h2>
      <p>Het spel slaat vanzelf op, en met <strong>Opslaan</strong> in het pauzemenu. Je save staat op je eigen apparaat. Vóór 1.0 kan een savegame bij een nieuwe versie breken; maak daarom vóór een update een export:</p>
      <ol>
        <li>Open het pauzemenu en ga naar <strong>Spel › Opgeslagen spellen</strong>.</li>
        <li>Kies bij je save de knop <strong>…</strong> en daarna <strong>Spel exporteren</strong>. Bewaar het bestand buiten de spelmap.</li>
        <li>Na de update importeer je het bestand terug via de importregel onderaan het scherm <strong>Opgeslagen spellen</strong>.</li>
      </ol>
      <h2>Toegankelijkheid</h2>
      <p>Onder <strong>Instellingen › Toegankelijkheid</strong> vind je kleurenblindmodi, de grootte van de interface en "Beweging beperken". De grootte van de ondertitels staat onder <strong>Geluid &amp; ondertitels</strong>.</p>
      <h2>Privacy</h2>
      <p>Er is geen account, geen tracking en geen statistiek. De desktopapp speelt offline, met twee uitzonderingen: <strong>Samen spelen</strong> (alleen na jouw toestemming) en de <strong>live busposities</strong> (staan standaard aan en zijn in Instellingen uit te zetten). Op Android staat Samen spelen uit. Zie <a href="https://github.com/NatusPella/GDE-Groningen/blob/main/docs/PRIVACY-EN-CREDITS.md">docs/PRIVACY-EN-CREDITS.md</a>.</p>
      <p class="help-terug"><a href="./">← Terug naar de hulpindex</a></p>
    `,
  },
  {
    slug: 'samen-spelen',
    titel: 'Samen spelen',
    beschrijving: 'Samen spelen in GDE Groningen: kamercode, toestemming, eigen voortgang, privacy en verbindingsproblemen.',
    intro: 'Samen spelen kan met een kamercode. Geen account, geen server van ons: je verbindt rechtstreeks met je medespeler. Hieronder staat hoe het werkt en wat je van je verbinding kunt verwachten.',
    body: `
      <h2>Zo werkt het</h2>
      <ol>
        <li>Kies <strong>Samen spelen</strong> in het hoofdmenu of onder <strong>Esc</strong>.</li>
        <li>Eén speler kiest <strong>Een spel openen</strong> en deelt de kamercode.</li>
        <li>De anderen kiezen <strong>Meedoen</strong> en typen of plakken de code.</li>
        <li>Je naam vul je bij de eerste start verplicht in; daarna zoekt het spel automatisch een sessie of opent er zelf een (ook als je alleen speelt).</li>
      </ol>
      <p>Er kunnen tot <strong>16 spelers</strong> meedoen, inclusief wie het spel opende. Op Android werkt Samen spelen niet, omdat de app geen internetrechten heeft.</p>
      <h2>Wat je deelt en wat je houdt</h2>
      <ul>
        <li>Iedere speler houdt eigen geld, eigen voortgang en eigen bezit; speel je later alleen, dan staat je eigen spel er nog.</li>
        <li>Wie het spel opende kan spelers verwijderen en kan het stokje overdragen. Verder is iedereen gelijk: tijd, reizen en pauzeren zijn gezamenlijke keuzes.</li>
        <li>Spelers kunnen elkaar alleen te lijf als beiden niet op de <strong>passieve stand</strong> staan. Dood door een medespeler kost je geen geld of voortgang.</li>
      </ul>
      <h2>Privacy en verbinding</h2>
      <p>Omdat het spel altijd online speelt, gaat je IP-adres naar een openbare STUN-server; speel je met anderen, dan gaat het ook naar je medespeler. De versleutelde signaleringsberichten lopen via openbare brokers. Maakt de host de sessie openbaar, dan staat alleen de sessienaam, het aantal spelers en de versie in de openbare lijst; je IP-adres en de kamercode staan daar niet in. Maakt de host de sessie openbaar, dan staat alleen de sessienaam, het aantal spelers en de versie in de openbare lijst; je IP-adres en de kamercode staan daar niet in. De live busposities staan los daarvan standaard aan en zijn in Instellingen uit te zetten. Zie <a href="https://github.com/NatusPella/GDE-Groningen/blob/main/docs/PRIVACY-EN-CREDITS.md">docs/PRIVACY-EN-CREDITS.md</a>.</p>
      <p>Werkt de verbinding niet? Kies in het Samen spelen-scherm <strong>Verbinding testen</strong>; daar staat in gewone taal wat er mis is. Controleer ook je firewall en of jullie dezelfde versie spelen.</p>
      <p class="help-terug"><a href="./">← Terug naar de hulpindex</a></p>
    `,
  },
  {
    slug: 'problemen',
    titel: 'Problemen en fouten melden',
    beschrijving: 'Wat je kunt doen bij een crash, geen geluid, haperingen of een fout in GDE Groningen, en hoe je een issue meldt.',
    intro: 'Loopt het spel vast, hoor je niets of ziet het er niet uit? Probeer eerst deze stappen. Kom je er niet uit, meld het dan; daar wordt het spel beter van.',
    body: `
      <h2>Eerst proberen</h2>
      <ul>
        <li><strong>Vastgelopen of klem?</strong> Ga naar het pauzemenu en kies onder <strong>Overzicht</strong> de knop <strong>Vastgelopen? Zet me vrij</strong>. Tijdens een missie kun je daar ook <strong>Missie stoppen</strong> kiezen.</li>
        <li><strong>Start het spel opnieuw</strong> en controleer of je de nieuwste release gebruikt.</li>
        <li><strong>Geen geluid?</strong> Controleer de volumemixer van je systeem en druk op <strong>U</strong> of <strong>N</strong>; misschien staat het geluid in het spel gewoon uit.</li>
        <li><strong>Grafische instellingen</strong>: zet de kwaliteit lager (Instellingen › Beeld) of zet hardwareversnelling aan in je browser.</li>
        <li><strong>Haperingen?</strong> Sluit andere zware programma's en probeer de voorinstelling Gemiddeld of Laag; bekijk ook de <a href="systeemeisen.html">systeemeisen</a>.</li>
        <li><strong>Besturing?</strong> Sluit je controller opnieuw aan of kies een andere controllerindeling onder Instellingen › Besturing.</li>
      </ul>
      <h2>Foutrapport</h2>
      <p>In het pauzemenu staat onder <strong>Over › Problemen</strong> het foutrapport met <strong>Kopieer het rapport</strong>. Dat logboek blijft op je eigen apparaat; het wordt nergens naartoe gestuurd. Plak het in je issue, dan is de oorzaak vaak sneller te vinden.</p>
      <h2>Een issue melden</h2>
      <p>Open een issue op <a href="https://github.com/NatusPella/GDE-Groningen/issues">GitHub</a> en noem:</p>
      <ul>
        <li>de versie (staat op het startscherm en in de releasenaam);</li>
        <li>je platform (Windows, macOS, Linux/Steam Deck, Android of browser);</li>
        <li>wat je deed toen het misging, en wat je verwachtte;</li>
        <li>het foutrapport uit <strong>Over › Problemen</strong>.</li>
      </ul>
      <p>Geen echte namen of persoonsgegevens in issues, screenshots of opnamen, graag. Gebruik een tester-nummer of een beschrijving van de plek.</p>
      <h2>Bekende eigenaardigheden</h2>
      <ul>
        <li><strong>Waarschuwing bij de eerste start</strong>: de builds zijn niet ondertekend. Zie <a href="installeren.html">Installeren</a>.</li>
        <li><strong>Geen online versie</strong>: er is nog geen webversie; speel de download of draai het spel vanaf de broncode.</li>
        <li><strong>Android en Samen spelen</strong>: de APK heeft geen internetrechten, dus samen spelen kan daar niet. Solo spelen kan wel.</li>
        <li><strong>Samen spelen-verbinding</strong>: kies <strong>Verbinding testen</strong> in het Samen spelen-scherm; daar staat wat er mis is.</li>
      </ul>
      <p class="help-terug"><a href="./">← Terug naar de hulpindex</a></p>
    `,
  },
];

